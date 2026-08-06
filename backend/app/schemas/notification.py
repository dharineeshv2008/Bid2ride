import uuid
import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class NotificationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    body: str
    status: str  # UNREAD, READ
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class NotificationHistoryResponse(BaseModel):
    total_count: int
    items: List[NotificationResponse]


class NotificationPreferenceResponse(BaseModel):
    email_enabled: bool = True
    sms_enabled: bool = True
    push_enabled: bool = True
    in_app_enabled: bool = True


class NotificationPreferenceUpdateRequest(BaseModel):
    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None


class NotificationTemplateResponse(BaseModel):
    name: str
    subject_template: str
    body_template: str


class NotificationDeliveryStatusResponse(BaseModel):
    notification_id: uuid.UUID
    delivered_via: List[str]  # e.g., ["SMS", "IN_APP"]
    status: str  # DELIVERED, FAILED


class BroadcastNotificationRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    body: str = Field(..., min_length=10, max_length=1000)
