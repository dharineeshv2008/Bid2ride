import uuid
import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr


class DriverProfileResponse(BaseModel):
    id: uuid.UUID
    phone: str
    email: Optional[EmailStr] = None
    name: str
    license_number: str
    verification_status: str
    rating: float
    rating_count: int
    online_status: bool
    acceptance_rate: float
    win_rate: float

    class Config:
        from_attributes = True


class DriverProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None


class VehicleCreateRequest(BaseModel):
    make: str = Field(..., min_length=1, max_length=50)
    model: str = Field(..., min_length=1, max_length=50)
    year: int = Field(..., ge=2000, le=2028)
    color: str = Field(..., min_length=1, max_length=30)
    plate_number: str = Field(..., pattern=r"^[A-Z0-9\-]{2,20}$")
    category: str = Field(..., pattern="^(ECONOMY|COMFORT|XL)$")


class VehicleUpdateRequest(BaseModel):
    make: Optional[str] = Field(None, min_length=1, max_length=50)
    model: Optional[str] = Field(None, min_length=1, max_length=50)
    year: Optional[int] = Field(None, ge=2000, le=2028)
    color: Optional[str] = Field(None, min_length=1, max_length=30)
    plate_number: Optional[str] = Field(None, pattern=r"^[A-Z0-9\-]{2,20}$")
    category: Optional[str] = Field(None, pattern="^(ECONOMY|COMFORT|XL)$")


class VehicleResponse(BaseModel):
    id: uuid.UUID
    make: str
    model: str
    year: int
    color: str
    plate_number: str
    category: str
    status: str

    class Config:
        from_attributes = True


class DriverDocumentUploadRequest(BaseModel):
    document_type: str = Field(..., pattern="^(DRIVERS_LICENSE|VEHICLE_REGISTRATION|INSURANCE)$")
    file_url: str = Field(..., min_length=10)
    expires_at: datetime.datetime


class DriverDocumentResponse(BaseModel):
    id: uuid.UUID
    document_type: str
    file_url: str
    status: str
    expires_at: datetime.datetime

    class Config:
        from_attributes = True


class DriverAvailabilityRequest(BaseModel):
    online_status: bool


class DriverDashboardResponse(BaseModel):
    online_status: bool
    rating: float
    acceptance_rate: float
    wallet_balance: float
    active_assignment: Optional[dict] = None


class DriverRideHistoryResponse(BaseModel):
    total_count: int
    items: List[dict]
