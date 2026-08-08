import datetime
import random
import re
import uuid
from abc import ABC, abstractmethod
from typing import Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthenticationException, EntityNotFoundException
from app.core.logging import logger
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_token,
    decode_token,
    verify_firebase_token,
)
from app.models.user import User, OtpSession
from app.repositories.user_repository import UserRepository, RefreshTokenRepository

# Indian mobile number regex: 10 digits starting with 6-9
INDIAN_PHONE_PATTERN = re.compile(r"^[6-9][0-9]{9}$")

# Default demo profiles used by development-mode auto-login.
DEV_DEMO_ACCOUNTS = {
    "9876543210": {"name": "Demo Passenger", "role": "PASSENGER"},
    "9876543211": {"name": "Demo Driver", "role": "DRIVER"},
    "9999999999": {"name": "Admin Console", "role": "ADMIN"},
}


class SmsProvider(ABC):
    @abstractmethod
    async def send_sms(self, phone: str, message: str) -> bool:
        pass


class MockSmsProvider(SmsProvider):
    async def send_sms(self, phone: str, message: str) -> bool:
        logger.info("[SMS Mock Dispatcher]", phone=phone, message=message)
        return True


class TwilioSmsProvider(SmsProvider):
    """Production Twilio SMS Client Wrapper (Mocked in development)."""
    async def send_sms(self, phone: str, message: str) -> bool:
        # Abstracted/Mocked for development compliance
        logger.info("[SMS Twilio Client]", phone=phone, message=message)
        return True


class AuthService:
    def __init__(self, session: AsyncSession, sms_provider: SmsProvider = MockSmsProvider()) -> None:
        self.session = session
        self.sms_provider = sms_provider
        self.user_repo = UserRepository(session)
        self.token_repo = RefreshTokenRepository(session)

    async def send_otp(self, phone: str) -> uuid.UUID:
        """Generates a 4-digit code, stores OTP session in DB, and dispatches SMS."""
        code = f"{random.randint(1000, 9999)}"
        session_id = uuid.uuid4()
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)

        otp_session = OtpSession(
            phone=phone,
            code=code,
            session_id=session_id,
            expires_at=expires_at
        )
        self.session.add(otp_session)
        await self.session.commit()

        # Dispatch OTP code
        message = f"Your Bid2Ride verification code is: {code}. Expires in 5 minutes."
        await self.sms_provider.send_sms(phone, message)

        return session_id

    async def verify_otp(self, session_id: uuid.UUID, code: str) -> Tuple[str, str]:
        """Validates OTP session, creates user if first login, and generates JWT credentials."""
        stmt = select(OtpSession).where(OtpSession.session_id == session_id)
        result = await self.session.execute(stmt)
        otp_session = result.scalars().first()

        if not otp_session:
            raise AuthenticationException("OTP session not found")
        
        if otp_session.is_verified:
            raise AuthenticationException("OTP session already verified")

        if otp_session.expires_at.replace(tzinfo=None) < datetime.datetime.utcnow():
            raise AuthenticationException("OTP session expired")

        if otp_session.code != code:
            raise AuthenticationException("Invalid OTP code")

        # Mark session verified
        otp_session.is_verified = True

        # Find or create user
        user = await self.user_repo.get_by_phone(otp_session.phone)
        if not user:
            # First-time registration defaults user role to PASSENGER
            user = await self.user_repo.create(
                name=f"Guest_{otp_session.phone[-4:]}",
                phone=otp_session.phone,
                role="PASSENGER"
            )
            await self.session.flush()

        # Generate tokens
        access_token = create_access_token(subject=user.id, role=user.role)
        
        jti = uuid.uuid4()
        refresh_token = create_refresh_token(subject=user.id, jti=jti)
        
        # Save refresh token hash in DB
        hashed = hash_token(refresh_token)
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=7)
        await self.token_repo.create(user_id=user.id, jti=jti, token_hash=hashed, expires_at=expires_at)
        await self._update_last_login(user)
        await self.session.commit()

        return access_token, refresh_token

    async def verify_otp_by_phone(
        self,
        phone: str,
        code: str,
        name: Optional[str] = None,
        role: str = "PASSENGER",
    ) -> Tuple[str, str, User]:
        """Validates the most recent unverified OTP session for a phone number.

        Used by the frontend-facing /auth/verify-otp endpoint. Registers a new
        user on first login and issues standard JWT credentials.
        """
        stmt = (
            select(OtpSession)
            .where(OtpSession.phone == phone, OtpSession.is_verified.is_(False))
            .order_by(OtpSession.created_at.desc())
        )
        result = await self.session.execute(stmt)
        otp_session = result.scalars().first()

        if not otp_session:
            raise AuthenticationException("OTP session not found")
        if otp_session.expires_at.replace(tzinfo=None) < datetime.datetime.utcnow():
            raise AuthenticationException("OTP session expired")
        if otp_session.code != code:
            raise AuthenticationException("Invalid OTP code")

        otp_session.is_verified = True

        user = await self.user_repo.get_by_phone(phone)
        if not user:
            user = await self.user_repo.create(
                name=name or f"Guest_{phone[-4:]}",
                phone=phone,
                role=role,
            )
            await self.session.flush()
        else:
            if role and user.role != role:
                user.role = role
                await self.session.flush()

        await self._ensure_driver_and_wallet_records(user)

        access_token = create_access_token(subject=user.id, role=user.role)

        jti = uuid.uuid4()
        refresh_token = create_refresh_token(subject=user.id, jti=jti)

        hashed = hash_token(refresh_token)
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=7)
        await self.token_repo.create(
            user_id=user.id,
            jti=jti,
            token_hash=hashed,
            expires_at=expires_at,
        )
        await self._update_last_login(user)
        await self.session.commit()

        return access_token, refresh_token, user

    async def dev_login(
        self,
        phone: str,
        role: str = "PASSENGER",
        password: Optional[str] = None,
    ) -> Tuple[str, str, User]:
        """Development-mode auto-login that bypasses OTP/SMS entirely.

        Validates an Indian mobile number, auto-creates (or reuses) the
        corresponding demo user profile, and issues standard JWT credentials.
        Only reachable when settings.DEVELOPMENT_MODE is True.
        """
        if not settings.DEVELOPMENT_MODE:
            raise AuthenticationException(
                "Development login is disabled. Set DEVELOPMENT_MODE=true to enable."
            )

        # Normalize +91 prefix and strip spaces/dashes
        digits = re.sub(r"[^\d]", "", phone)
        if digits.startswith("91") and len(digits) == 12:
            digits = digits[2:]
        if not INDIAN_PHONE_PATTERN.fullmatch(digits):
            raise AuthenticationException(
                "Invalid phone number. Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)."
            )
        normalized_phone = f"+91{digits}"

        # ADMIN role requires the development password
        if role == "ADMIN":
            if password != settings.DEV_ADMIN_PASSWORD:
                raise AuthenticationException("Invalid admin password")

        # Look up or create the user with the target role
        user = await self.user_repo.get_by_phone(normalized_phone)
        if not user:
            demo = DEV_DEMO_ACCOUNTS.get(digits, {})
            name = demo.get("name") or f"Guest_{digits[-4:]}"
            user = await self.user_repo.create(
                name=name,
                phone=normalized_phone,
                role=role,
            )
            await self.session.flush()
        else:
            if role and user.role != role:
                user.role = role
                await self.session.flush()

        await self._ensure_driver_and_wallet_records(user)

        # Issue standard JWT credentials (identical to production flow)
        access_token = create_access_token(subject=user.id, role=user.role)

        jti = uuid.uuid4()
        refresh_token = create_refresh_token(subject=user.id, jti=jti)

        hashed = hash_token(refresh_token)
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=7)
        await self.token_repo.create(
            user_id=user.id,
            jti=jti,
            token_hash=hashed,
            expires_at=expires_at,
        )
        await self._update_last_login(user)
        await self.session.commit()

        return access_token, refresh_token, user

    async def rotate_tokens(self, refresh_token: str) -> Tuple[str, str]:
        """Executes strict Refresh Token Rotation (RTR). Replays trigger complete family revocation."""
        try:
            payload = decode_token(refresh_token)
        except ValueError as e:
            raise AuthenticationException("Invalid refresh token") from e

        jti_str = payload.get("jti")
        sub_str = payload.get("sub")
        
        if not jti_str or not sub_str:
            raise AuthenticationException("Invalid token claims")

        jti = uuid.UUID(jti_str)
        user_id = uuid.UUID(sub_str)

        # Retrieve token record
        token_record = await self.token_repo.get_by_jti(jti)
        if not token_record:
            raise AuthenticationException("Refresh token record not found")

        # Detect reuse replay attack
        if token_record.is_revoked:
            # Revoke all tokens belonging to this user for security compliance
            logger.warn("Replay attack detected. Revoking user refresh tokens.", user_id=user_id)
            stmt = select(RefreshToken).where(RefreshToken.user_id == user_id)
            all_tokens = (await self.session.execute(stmt)).scalars().all()
            for t in all_tokens:
                t.is_revoked = True
            raise AuthenticationException("Token compromise detected. Session terminated.")

        if token_record.expires_at.replace(tzinfo=None) < datetime.datetime.utcnow():
            raise AuthenticationException("Refresh token expired")

        # Retrieve active user
        user = await self.user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            raise AuthenticationException("User is inactive or deleted")

        # Revoke the old token
        token_record.is_revoked = True

        # Issue new pair
        new_access = create_access_token(subject=user.id, role=user.role)
        
        new_jti = uuid.uuid4()
        new_refresh = create_refresh_token(subject=user.id, jti=new_jti)
        new_hashed = hash_token(new_refresh)
        new_expiry = datetime.datetime.utcnow() + datetime.timedelta(days=7)
        
        await self.token_repo.create(user_id=user.id, jti=new_jti, token_hash=new_hashed, expires_at=new_expiry)

        return new_access, new_refresh

    async def logout(self, refresh_token: str) -> None:
        """Revokes a refresh token, logging out the active session."""
        try:
            payload = decode_token(refresh_token)
            jti_str = payload.get("jti")
            if jti_str:
                jti = uuid.UUID(jti_str)
                await self.token_repo.revoke(jti)
        except Exception:
            # Silently absorb format errors to avoid leaking telemetry indicators
            pass

    async def firebase_login(
        self,
        firebase_token: str,
        role: str = "PASSENGER",
        name: Optional[str] = None,
    ) -> Tuple[str, str, User]:
        """Verifies Firebase token, registers user if first login, and generates JWT credentials."""
        try:
            claims = await verify_firebase_token(firebase_token, settings.DEVELOPMENT_MODE)
        except Exception as e:
            raise AuthenticationException(f"Firebase token verification failed: {str(e)}")

        phone = claims.get("phone_number")
        if not phone:
            raise AuthenticationException("Firebase token does not contain a phone number")

        # Find or create user
        user = await self.user_repo.get_by_phone(phone)
        if not user:
            user = await self.user_repo.create(
                name=name or claims.get("name") or f"Guest_{phone[-4:]}",
                phone=phone,
                role=role,
            )
            await self.session.flush()
        else:
            if role and user.role != role:
                user.role = role
                await self.session.flush()

        await self._ensure_driver_and_wallet_records(user)

        # Generate tokens
        access_token = create_access_token(subject=user.id, role=user.role)
        
        jti = uuid.uuid4()
        refresh_token = create_refresh_token(subject=user.id, jti=jti)
        
        # Save refresh token hash in DB
        hashed = hash_token(refresh_token)
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=7)
        await self.token_repo.create(user_id=user.id, jti=jti, token_hash=hashed, expires_at=expires_at)
        await self._update_last_login(user)
        await self.session.commit()

        return access_token, refresh_token, user

    async def _ensure_driver_and_wallet_records(self, user: User) -> None:
        """Ensures Driver and Wallet database records exist for the authenticated user."""
        from app.models.driver import Driver, Vehicle
        from app.models.payment import Wallet
        from app.repositories.payment_repository import WalletRepository
        
        wallet_repo = WalletRepository(self.session)
        wallet = await wallet_repo.get_by_user_id(user.id)
        if not wallet:
            await wallet_repo.create({
                "user_id": user.id,
                "balance": 500.0 if settings.DEVELOPMENT_MODE else 0.0,
                "currency": "INR"
            })
            await self.session.flush()

        if user.role == "DRIVER":
            driver_stmt = select(Driver).where(Driver.id == user.id)
            driver_res = await self.session.execute(driver_stmt)
            driver = driver_res.scalars().first()
            if not driver:
                import random
                driver = Driver(
                    id=user.id,
                    license_number=f"DL-{random.randint(100000, 999999)}",
                    verification_status="APPROVED" if settings.DEVELOPMENT_MODE else "PENDING",
                    rating=5.0,
                    rating_count=0,
                    online_status=False,
                    acceptance_rate=100.0,
                    win_rate=100.0
                )
                self.session.add(driver)
                await self.session.flush()

            if not driver.active_vehicle_id and settings.DEVELOPMENT_MODE:
                import random
                veh_stmt = select(Vehicle).where(Vehicle.driver_id == user.id)
                veh_res = await self.session.execute(veh_stmt)
                vehicles = veh_res.scalars().all()
                if not vehicles:
                    vehicle = Vehicle(
                        driver_id=user.id,
                        make="Toyota",
                        model="Camry",
                        year=2022,
                        color="White",
                        plate_number=f"KA-01-MJ-{random.randint(1000, 9999)}",
                        category="ECONOMY",
                        status="ACTIVE"
                    )
                    self.session.add(vehicle)
                    await self.session.flush()
                    driver.active_vehicle_id = vehicle.id
                else:
                    driver.active_vehicle_id = vehicles[0].id

    async def _update_last_login(self, user: User) -> None:
        from app.models.user import UserSettings
        stmt = select(UserSettings).where(UserSettings.id == user.id)
        res = await self.session.execute(stmt)
        settings = res.scalars().first()
        if not settings:
            settings = UserSettings(id=user.id)
            self.session.add(settings)
        settings.last_login = datetime.datetime.utcnow()
