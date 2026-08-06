import uuid
import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class UserProfileCreateRequest(BaseModel):
    avatar_url: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=255)
    gender: Optional[str] = Field(None, max_length=20)
    dob: Optional[str] = Field(None, max_length=20)
    secondary_phone: Optional[str] = Field(None, max_length=20)
    secondary_email: Optional[str] = Field(None, max_length=100)
    address_line1: Optional[str] = Field(None, max_length=255)
    address_line2: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    emergency_contact_name: Optional[str] = Field(None, max_length=100)
    emergency_contact_phone: Optional[str] = Field(None, max_length=20)
    emergency_contact_relationship: Optional[str] = Field(None, max_length=50)
    default_payment_method: Optional[str] = Field("CASH", max_length=20)
    upi_id: Optional[str] = Field(None, max_length=100)
    preferred_language: Optional[str] = Field("en", max_length=20)
    theme: Optional[str] = Field("light", max_length=20)

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        upper = v.upper().strip()
        allowed = {"MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"}
        if upper not in allowed:
            raise ValueError(f"gender must be one of: {', '.join(allowed)}")
        return upper


class UserProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=255)
    gender: Optional[str] = Field(None, max_length=20)
    dob: Optional[str] = Field(None, max_length=20)
    secondary_phone: Optional[str] = Field(None, max_length=20)
    secondary_email: Optional[str] = Field(None, max_length=100)
    address_line1: Optional[str] = Field(None, max_length=255)
    address_line2: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    emergency_contact_name: Optional[str] = Field(None, max_length=100)
    emergency_contact_phone: Optional[str] = Field(None, max_length=20)
    emergency_contact_relationship: Optional[str] = Field(None, max_length=50)
    default_payment_method: Optional[str] = Field(None, max_length=20)
    upi_id: Optional[str] = Field(None, max_length=100)
    preferred_language: Optional[str] = Field(None, max_length=20)
    theme: Optional[str] = Field(None, max_length=20)

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        upper = v.upper().strip()
        allowed = {"MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"}
        if upper not in allowed:
            raise ValueError(f"gender must be one of: {', '.join(allowed)}")
        return upper


class ProfilePhotoUploadRequest(BaseModel):
    photo_base64: str = Field(..., description="Base64 encoded image string or data URL")


class UserProfileResponse(BaseModel):
    id: uuid.UUID
    name: Optional[str] = None
    avatar_url: Optional[str] = None

    bio: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    secondary_phone: Optional[str] = None
    secondary_email: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    default_payment_method: str = "CASH"
    upi_id: Optional[str] = None
    preferred_language: str = "en"
    theme: str = "light"
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True
