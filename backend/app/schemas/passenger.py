import uuid
import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr, field_validator


class PassengerProfileResponse(BaseModel):
    id: uuid.UUID
    phone: str
    email: Optional[EmailStr] = None
    name: str
    rating: float
    rating_count: int

    class Config:
        from_attributes = True


class PassengerProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None


class SavedPlaceCreateRequest(BaseModel):
    label: str = Field(..., min_length=1, max_length=50, description="e.g. Home, Work")
    address: str = Field(..., min_length=3, description="Text address representation")
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)


class SavedPlaceUpdateRequest(BaseModel):
    label: Optional[str] = Field(None, min_length=1, max_length=50)
    address: Optional[str] = Field(None, min_length=3)
    lat: Optional[float] = Field(None, ge=-90.0, le=90.0)
    lng: Optional[float] = Field(None, ge=-180.0, le=180.0)


class SavedPlaceResponse(BaseModel):
    id: uuid.UUID
    label: str
    address: str
    lat: float
    lng: float

    class Config:
        from_attributes = True


class RideRequestCreateRequest(BaseModel):
    pickup_address: str = Field(..., min_length=3)
    pickup_lat: float = Field(..., ge=-90.0, le=90.0)
    pickup_lng: float = Field(..., ge=-180.0, le=180.0)
    dropoff_address: str = Field(..., min_length=3)
    dropoff_lat: float = Field(..., ge=-90.0, le=90.0)
    dropoff_lng: float = Field(..., ge=-180.0, le=180.0)
    budget: Optional[float] = Field(None, ge=1.00)
    target_budget: Optional[float] = Field(None, ge=1.00)
    category: Optional[str] = Field(None, pattern="^(SEDAN|SUV|LUXURY|AUTO|ECONOMY|COMFORT|XL)$")
    vehicle_category: Optional[str] = Field(None, pattern="^(SEDAN|SUV|LUXURY|AUTO|ECONOMY|COMFORT|XL)$")


class RideRequestResponse(BaseModel):
    id: uuid.UUID
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    dropoff_address: str
    dropoff_lat: float
    dropoff_lng: float
    budget: float
    category: str
    status: str
    created_at: datetime.datetime
    assignment_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True


class RideHistoryResponse(BaseModel):
    total_count: int
    items: List[RideRequestResponse]


class ActiveRideResponse(BaseModel):
    ride_id: uuid.UUID
    status: str
    driver_name: Optional[str] = None
    vehicle_details: Optional[str] = None
    price: Optional[float] = None
    otp: Optional[str] = None


class BidResponse(BaseModel):
    bid_id: uuid.UUID
    driver_name: str
    driver_rating: float
    vehicle_details: str
    vehicle_model: Optional[str] = None
    amount: float
    bid_amount: Optional[float] = None
    eta_minutes: int


class RideCancellationRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=255)
