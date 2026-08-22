import uuid
import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class RideAssignmentResponse(BaseModel):
    id: Optional[uuid.UUID] = None
    request_id: uuid.UUID
    driver_id: Optional[uuid.UUID] = None
    status: str
    price: Optional[float] = None
    created_at: datetime.datetime
    pickup_address: Optional[str] = None
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    dropoff_address: Optional[str] = None
    dropoff_lat: Optional[float] = None
    dropoff_lng: Optional[float] = None
    otp: Optional[str] = None

    class Config:
        from_attributes = True


class DriverArrivalRequest(BaseModel):
    pass


class RideStartRequest(BaseModel):
    otp: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$")


class RideCompletionRequest(BaseModel):
    distance_miles: Optional[float] = Field(None, ge=0.0)
    duration_seconds: Optional[int] = Field(None, ge=0)


class DriverLocationUpdateRequest(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    speed: Optional[float] = Field(None, ge=0.0)
    heading: Optional[float] = Field(None, ge=-360.0, le=360.0)


class PassengerLiveLocationResponse(BaseModel):
    lat: float
    lng: float
    updated_at: datetime.datetime


class DriverLiveLocationResponse(BaseModel):
    lat: float
    lng: float
    speed: Optional[float] = None
    heading: Optional[float] = None
    updated_at: datetime.datetime


class RideTimelineItem(BaseModel):
    id: uuid.UUID
    old_status: Optional[str] = None
    new_status: str
    created_at: datetime.datetime
    comment: Optional[str] = None


class RideTimelineResponse(BaseModel):
    ride_id: uuid.UUID
    timeline: List[RideTimelineItem]


class RideStatusResponse(BaseModel):
    ride_id: uuid.UUID
    status: str
    updated_at: datetime.datetime
