import json
import uuid
import datetime
from abc import ABC, abstractmethod
from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundException, ValidationException
from app.core.logging import logger
from app.core.redis import redis_manager
from app.services.base import BaseService
from app.models.notification import Notification
from app.repositories.notification_repository import NotificationRepository
from app.services.socket_service import sio

# =====================================================================
# COMMUNICATION CHANNEL PROVIDERS INTERFACES
# =====================================================================

class EmailProvider(ABC):
    @abstractmethod
    async def send_email(self, email: str, subject: str, body: str) -> bool:
        pass


class SmsProvider(ABC):
    @abstractmethod
    async def send_sms(self, phone: str, message: str) -> bool:
        pass


class PushProvider(ABC):
    @abstractmethod
    async def send_push(self, device_token: str, title: str, body: str) -> bool:
        pass


# Mock Provider Implementations (Optional external clients default)
class MockEmailProvider(EmailProvider):
    async def send_email(self, email: str, subject: str, body: str) -> bool:
        logger.info("[Email Mock Client Dispatch]", email=email, subject=subject, body=body)
        return True


class MockSmsProvider(SmsProvider):
    async def send_sms(self, phone: str, message: str) -> bool:
        logger.info("[SMS Mock Client Dispatch]", phone=phone, message=message)
        return True


class MockPushProvider(PushProvider):
    async def send_push(self, device_token: str, title: str, body: str) -> bool:
        logger.info("[Push Mock Client Dispatch]", device_token=device_token, title=title, body=body)
        return True


# =====================================================================
# NOTIFICATION ENGINE SERVICE
# =====================================================================

class NotificationService(BaseService):
    def __init__(
        self,
        session: AsyncSession,
        email_provider: EmailProvider = MockEmailProvider(),
        sms_provider: SmsProvider = MockSmsProvider(),
        push_provider: PushProvider = MockPushProvider()
    ) -> None:
        super().__init__(session)
        self.repo = NotificationRepository(session)
        self.email_provider = email_provider
        self.sms_provider = sms_provider
        self.push_provider = push_provider

        # Notification templates placeholder map
        self.templates = {
            "otp_sent": {
                "title": "Your OTP Code",
                "body": "Your Bid2Ride verification code is {code}. Expires in 5 minutes."
            },
            "ride_created": {
                "title": "Ride Requested",
                "body": "Your ride request for category {category} has been submitted successfully."
            },
            "bid_received": {
                "title": "New Bid Received",
                "body": "Driver {driver_name} placed a bid of ${amount:.2f} with {eta} mins ETA."
            },
            "bid_accepted": {
                "title": "Bid Accepted",
                "body": "Your bid for ride {ride_id} has been accepted! OTP: {otp}."
            },
            "driver_arrived": {
                "title": "Driver Arrived",
                "body": "Your driver has arrived at the pickup location."
            },
            "ride_started": {
                "title": "Ride Started",
                "body": "Your trip is in progress. Have a safe journey."
            },
            "ride_completed": {
                "title": "Ride Completed",
                "body": "You have arrived at your destination. Payment processed."
            },
            "wallet_credited": {
                "title": "Wallet Credited",
                "body": "Your wallet has been credited with ${amount:.2f}."
            }
        }

    # =====================================================================
    # PREFERENCES MANAGEMENT
    # =====================================================================

    async def get_preferences(self, user_id: uuid.UUID) -> Dict[str, bool]:
        """Loads user notification preferences (caches in Redis)."""
        key = f"notification_preferences:{user_id}"
        raw = await redis_manager.client.get(key)
        if not raw:
            # Default preferences: all channels enabled
            default_pref = {
                "email_enabled": True,
                "sms_enabled": True,
                "push_enabled": True,
                "in_app_enabled": True
            }
            await redis_manager.client.set(key, json.dumps(default_pref))
            return default_pref
        return json.loads(raw)

    async def update_preferences(self, user_id: uuid.UUID, prefs: Dict[str, bool]) -> Dict[str, bool]:
        """Saves user notification preferences."""
        current = await self.get_preferences(user_id)
        for k, v in prefs.items():
            if k in current and v is not None:
                current[k] = v

        key = f"notification_preferences:{user_id}"
        await redis_manager.client.set(key, json.dumps(current))
        return current

    # =====================================================================
    # NOTIFICATION TRANSMISSIONS & RENDERINGS
    # =====================================================================

    async def dispatch_notification(self, user_id: uuid.UUID, template_name: str, context: dict) -> Notification:
        """Renders templates placeholders, checks user preferences, and dispatches asynchronously."""
        if template_name not in self.templates:
            raise ValidationException("Notification template not found")

        template = self.templates[template_name]
        title = template["title"].format(**context)
        body = template["body"].format(**context)

        # Check preferences
        prefs = await self.get_preferences(user_id)

        # 1. In-App Notification (database log persist)
        notification = None
        if prefs.get("in_app_enabled", True):
            notification = await self.repo.create({
                "user_id": user_id,
                "title": title,
                "body": body,
                "status": "UNREAD"
            })
            await self.commit()

        # 2. Socket.IO broadcast (if online)
        try:
            # Emitting notifications to individual role rooms
            payload = {
                "id": str(notification.id) if notification else str(uuid.uuid4()),
                "title": title,
                "body": body,
                "created_at": datetime.datetime.utcnow().isoformat()
            }
            # Send to both passenger and driver rooms just in case
            await sio.emit("notification_received", payload, room=f"passenger:{user_id}")
            await sio.emit("notification_received", payload, room=f"driver:{user_id}")
        except Exception as e:
            logger.error("Real-time socket notification dispatch failed", error=str(e))

        # 3. Email Provider (Mocked)
        if prefs.get("email_enabled", True):
            await self.email_provider.send_email("user@test.com", title, body)

        # 4. SMS Provider (Mocked)
        if prefs.get("sms_enabled", True):
            await self.sms_provider.send_sms("+15550199", body)

        # 5. Push Notification Provider (Mocked)
        if prefs.get("push_enabled", True):
            await self.push_provider.send_push("device_mock_token_123", title, body)

        return notification or Notification(user_id=user_id, title=title, body=body, status="UNREAD")

    async def mark_as_read(self, notification_id: uuid.UUID) -> Notification:
        notification = await self.repo.get(notification_id)
        if not notification:
            raise EntityNotFoundException("Notification not found")
        notification.status = "READ"
        await self.commit()
        return notification

    async def mark_all_as_read(self, user_id: uuid.UUID) -> None:
        unread = await self.repo.get_unread_user_notifications(user_id)
        for n in unread:
            n.status = "READ"
        await self.commit()

    async def get_unread_notifications(self, user_id: uuid.UUID) -> List[Notification]:
        return await self.repo.get_unread_user_notifications(user_id)
