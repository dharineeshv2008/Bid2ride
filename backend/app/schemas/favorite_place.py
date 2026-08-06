import uuid
import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class FavoritePlaceCreateRequest(BaseModel):
    place_type: str = Field(..., description="HOME, WORK, AIRPORT, OTHER")
    place_name: str = Field(..., min_length=1, max_length=100, description="e.g. My Home, Downtown Office")
    full_address: str = Field(..., min_length=3, description="Full formatted address string")
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    landmark: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    is_default: bool = Field(False, description="Set as default favorite place")

    @field_validator("place_type")
    @classmethod
    def validate_place_type(cls, v: str) -> str:
        upper = v.upper().strip()
        allowed = {"HOME", "WORK", "AIRPORT", "OTHER"}
        if upper not in allowed:
            raise ValueError(f"place_type must be one of: {', '.join(allowed)}")
        return upper


class FavoritePlaceUpdateRequest(BaseModel):
    place_type: Optional[str] = Field(None, description="HOME, WORK, AIRPORT, OTHER")
    place_name: Optional[str] = Field(None, min_length=1, max_length=100)
    full_address: Optional[str] = Field(None, min_length=3)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    landmark: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    is_default: Optional[bool] = None

    @field_validator("place_type")
    @classmethod
    def validate_place_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        upper = v.upper().strip()
        allowed = {"HOME", "WORK", "AIRPORT", "OTHER"}
        if upper not in allowed:
            raise ValueError(f"place_type must be one of: {', '.join(allowed)}")
        return upper


class FavoritePlaceResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    place_type: str
    place_name: str
    full_address: str
    latitude: float
    longitude: float
    landmark: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    is_default: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


class SetDefaultFavoritePlaceRequest(BaseModel):
    place_id: uuid.UUID
