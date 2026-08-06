import uuid
from typing import Optional
from pydantic import BaseModel, Field, EmailStr


class OtpSendRequest(BaseModel):
    phone: str = Field(..., pattern=r"^\+[1-9]\d{1,14}$", description="E.164 phone number standard")


class OtpSendResponse(BaseModel):
    status: str = "success"
    session_id: uuid.UUID


class OtpVerifyRequest(BaseModel):
    session_id: uuid.UUID
    code: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$")


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class UserMeResponse(BaseModel):
    id: uuid.UUID
    phone: str
    email: Optional[EmailStr] = None
    name: str
    role: str

    class Config:
        from_attributes = True


class DevLoginRequest(BaseModel):
    """Development-mode login. Only accepted when DEVELOPMENT_MODE=true."""
    phone: str = Field(..., description="Indian mobile number, e.g. 9876543210")
    role: str = Field(..., pattern="^(PASSENGER|DRIVER|ADMIN)$")
    password: Optional[str] = Field(None, description="Required for ADMIN role")


class DevLoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserMeResponse


class SendOtpRequest(BaseModel):
    """Frontend-facing OTP entry point payload.

    In development mode `phone` may be a raw Indian mobile number and `role`
    selects the demo account to auto-authenticate (password only for ADMIN).
    """
    phone: str = Field(..., description="Indian mobile number (e.g. 9876543210) or E.164")
    role: Optional[str] = Field(None, pattern="^(PASSENGER|DRIVER|ADMIN)$")
    password: Optional[str] = Field(None, description="Required for ADMIN role in dev mode")


class VerifyOtpRequest(BaseModel):
    """Frontend-facing OTP verification payload."""
    phone: str
    otp: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$")
    name: Optional[str] = None
    role: Optional[str] = Field(None, pattern="^(PASSENGER|DRIVER|ADMIN)$")


class DevSendOtpResponse(BaseModel):
    """Returned by /auth/send-otp when DEVELOPMENT_MODE=true (OTP bypassed)."""
    success: bool = True
    development_mode: bool = True
    message: str = "OTP bypassed"
    token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserMeResponse


class FirebaseLoginRequest(BaseModel):
    firebase_token: str
    name: Optional[str] = None
    role: Optional[str] = Field(None, pattern="^(PASSENGER|DRIVER|ADMIN)$")


import datetime

class UserSettingsResponse(BaseModel):
    id: uuid.UUID
    theme: str
    language: str
    notification_email: bool
    notification_sms: bool
    notification_push: bool
    map_provider: str
    default_payment_method: str
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    preferred_ride_type: str
    privacy_share_location: bool
    last_login: Optional[datetime.datetime] = None
    driver_vehicle_model: Optional[str] = None
    driver_vehicle_plate: Optional[str] = None
    driver_ride_pref_auto_accept: bool
    driver_wallet_payout_bank: Optional[str] = None

    class Config:
        from_attributes = True


class UserSettingsUpdateRequest(BaseModel):
    theme: Optional[str] = None
    language: Optional[str] = None
    notification_email: Optional[bool] = None
    notification_sms: Optional[bool] = None
    notification_push: Optional[bool] = None
    map_provider: Optional[str] = None
    default_payment_method: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    preferred_ride_type: Optional[str] = None
    privacy_share_location: Optional[bool] = None
    driver_vehicle_model: Optional[str] = None
    driver_vehicle_plate: Optional[str] = None
    driver_ride_pref_auto_accept: Optional[bool] = None
    driver_wallet_payout_bank: Optional[str] = None


