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
    total_trips: int = 0
    active_vehicle_id: Optional[uuid.UUID] = None
    vehicle_details: Optional[dict] = None

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
    online_status: Optional[bool] = None
    status: Optional[str] = Field(None, pattern="^(ONLINE|OFFLINE|BUSY|ON_BREAK)$")
    lat: Optional[float] = Field(None, ge=-90.0, le=90.0)
    lng: Optional[float] = Field(None, ge=-180.0, le=180.0)
    heading: Optional[float] = None
    speed: Optional[float] = None
    accuracy: Optional[float] = None


class DriverHeartbeatRequest(BaseModel):
    lat: Optional[float] = Field(None, ge=-90.0, le=90.0)
    lng: Optional[float] = Field(None, ge=-180.0, le=180.0)
    heading: Optional[float] = None
    speed: Optional[float] = None
    accuracy: Optional[float] = None


class DriverDashboardResponse(BaseModel):
    online_status: bool
    rating: float
    acceptance_rate: float
    wallet_balance: float
    active_assignment: Optional[dict] = None
    today_earnings: float = 0.0
    weekly_earnings: float = 0.0
    monthly_earnings: float = 0.0
    completed_trips: int = 0
    cancelled_trips: int = 0
    pending_ride_requests: int = 0
    win_rate: float = 0.0
    trip_distance: float = 0.0
    hours_online: float = 0.0
    weekly_performance: List[dict] = []
    vehicle_details: Optional[dict] = None


class DriverRideHistoryResponse(BaseModel):
    total_count: int
    items: List[dict]
