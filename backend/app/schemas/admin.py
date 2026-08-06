import uuid
import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr


class DashboardMetricsResponse(BaseModel):
    total_users: int
    active_users: int
    online_drivers: int
    total_rides: int
    active_rides: int
    completed_rides: int
    cancelled_rides: int
    total_revenue: float
    commission_earned: float
    average_ride_value: float
    ride_completion_rate: float


class DashboardOverviewResponse(BaseModel):
    timestamp: datetime.datetime
    metrics: DashboardMetricsResponse


class UserSummaryResponse(BaseModel):
    id: uuid.UUID
    phone: str
    email: Optional[EmailStr] = None
    name: str
    role: str
    is_active: bool
    created_at: datetime.datetime


class DriverVerificationRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=255)


class DriverVerificationResponse(BaseModel):
    driver_id: uuid.UUID
    verification_status: str
    verified_at: Optional[datetime.datetime] = None


class RideManagementResponse(BaseModel):
    id: uuid.UUID
    passenger_id: uuid.UUID
    driver_id: Optional[uuid.UUID] = None
    pickup_address: str
    dropoff_address: str
    budget: float
    status: str
    created_at: datetime.datetime


class WalletManagementResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    balance: float
    currency: str
    updated_at: datetime.datetime


class PaymentManagementResponse(BaseModel):
    id: uuid.UUID
    assignment_id: uuid.UUID
    amount: float
    commission_fee: float
    status: str
    method: str
    transaction_id: Optional[str] = None
    created_at: datetime.datetime


class NotificationManagementResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    body: str
    status: str
    created_at: datetime.datetime


class AuditLogResponse(BaseModel):
    id: int
    admin_user_id: uuid.UUID
    action: str
    ip_address: str
    details: Optional[Dict[str, Any]] = None
    created_at: datetime.datetime


class RevenueAnalyticsResponse(BaseModel):
    total_revenue: float
    commission_earned: float
    refund_count: int
    payment_method_breakdown: Dict[str, int]


class RideAnalyticsResponse(BaseModel):
    total_rides: int
    completed_rides: int
    cancelled_rides: int
    ride_completion_rate: float
    average_ride_value: float


class UserAnalyticsResponse(BaseModel):
    total_passengers: int
    total_drivers: int
    online_drivers_count: int
    average_driver_rating: float
    average_passenger_rating: float


class SystemHealthResponse(BaseModel):
    database_connected: bool
    redis_connected: bool
    socket_connections_count: int
    api_version: str
    server_uptime_seconds: float
    cpu_usage_percent: float
    memory_usage_mb: float


class SystemSettingsResponse(BaseModel):
    id: int
    key: str
    value: str
    description: Optional[str] = None
    updated_at: datetime.datetime


class SystemSettingsUpdateRequest(BaseModel):
    value: str = Field(..., min_length=1)
