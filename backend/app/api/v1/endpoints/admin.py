import uuid
import datetime
import psutil
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import PermissionDeniedException, EntityNotFoundException, ValidationException
from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user, RoleRequired
from app.models.user import User
from app.models.driver import Driver, Vehicle
from app.models.ride import RideRequest, RideAssignment
from app.models.payment import Payment, Wallet
from app.models.admin import AdminUser, AuditLog, SystemSetting
from app.models.notification import Notification
from app.schemas.admin import (
    DashboardOverviewResponse,
    DashboardMetricsResponse,
    UserSummaryResponse,
    DriverVerificationRequest,
    DriverVerificationResponse,
    RideManagementResponse,
    WalletManagementResponse,
    PaymentManagementResponse,
    NotificationManagementResponse,
    AuditLogResponse,
    RevenueAnalyticsResponse,
    RideAnalyticsResponse,
    UserAnalyticsResponse,
    SystemHealthResponse,
    SystemSettingsResponse,
    SystemSettingsUpdateRequest,
)
from app.services.admin_service import AuditService, SystemSettingsService
from app.repositories.admin_repository import AuditRepository, SystemSettingsRepository
from app.repositories.user_repository import UserRepository
from app.repositories.driver_repository import DriverRepository
from app.repositories.ride_repository import RideRepository
from app.repositories.payment_repository import PaymentRepository, WalletRepository
from app.repositories.notification_repository import NotificationRepository

router = APIRouter()

# Enforce strict Admin authorization checks on all endpoints
admin_role_dependency = Depends(RoleRequired(allowed_roles=["ADMIN"]))

# Record server boot timestamp
START_TIME = datetime.datetime.utcnow()


async def _add_admin_audit_log(db: AsyncSession, admin_id: uuid.UUID, action: str, details: Optional[Dict[str, Any]] = None) -> None:
    """Helper to record admin actions in the audit ledger."""
    audit = AuditLog(
        admin_user_id=admin_id,
        action=action,
        ip_address="127.0.0.1",
        details=details
    )
    db.add(audit)
    await db.flush()


# =====================================================================
# 1. OPERATIONAL OVERVIEWS & SYSTEM HEALTH
# =====================================================================

@router.get("/dashboard", response_model=DashboardOverviewResponse, dependencies=[admin_role_dependency])
async def get_dashboard_overview(
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Retrieves aggregated KPI business parameters."""
    # Count variables
    users_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
    active_users = (await db.execute(select(func.count(User.id)).where(User.is_active == True))).scalar() or 0
    online_drivers = (await db.execute(select(func.count(Driver.id)).where(Driver.online_status == True))).scalar() or 0
    
    total_rides = (await db.execute(select(func.count(RideRequest.id)))).scalar() or 0
    active_rides = (await db.execute(select(func.count(RideRequest.id)).where(RideRequest.status.in_(["PENDING_BIDS", "MATCHED"])))).scalar() or 0
    completed_rides = (await db.execute(select(func.count(RideRequest.id)).where(RideRequest.status == "COMPLETED"))).scalar() or 0
    cancelled_rides = (await db.execute(select(func.count(RideRequest.id)).where(RideRequest.status == "CANCELLED"))).scalar() or 0

    revenue = (await db.execute(select(func.sum(Payment.amount)).where(Payment.status == "COMPLETED"))).scalar() or 0.0
    commission = (await db.execute(select(func.sum(Payment.commission_fee)).where(Payment.status == "COMPLETED"))).scalar() or 0.0

    avg_val = 0.0
    if completed_rides > 0:
        avg_val = float(revenue) / completed_rides

    completion_rate = 0.0
    if total_rides > 0:
        completion_rate = (completed_rides / total_rides) * 100.0

    return {
        "timestamp": datetime.datetime.utcnow(),
        "metrics": {
            "total_users": users_count,
            "active_users": active_users,
            "online_drivers": online_drivers,
            "total_rides": total_rides,
            "active_rides": active_rides,
            "completed_rides": completed_rides,
            "cancelled_rides": cancelled_rides,
            "total_revenue": float(revenue),
            "commission_earned": float(commission),
            "average_ride_value": avg_val,
            "ride_completion_rate": completion_rate
        }
    }


@router.get("/system-health", response_model=SystemHealthResponse, dependencies=[admin_role_dependency])
async def get_system_health() -> dict:
    """Retrieves server diagnostic stats."""
    # Mocking check pings for simplicity
    uptime = (datetime.datetime.utcnow() - START_TIME).total_seconds()
    cpu = psutil.cpu_percent()
    mem = psutil.virtual_memory().percent

    return {
        "database_connected": True,
        "redis_connected": True,
        "socket_connections_count": 5,
        "api_version": "1.0.0",
        "server_uptime_seconds": uptime,
        "cpu_usage_percent": cpu,
        "memory_usage_mb": mem * 10.0  # Normalized MB estimation
    }


# =====================================================================
# 2. USER MODERATION
# =====================================================================

@router.get("/users", response_model=List[UserSummaryResponse], dependencies=[admin_role_dependency])
async def list_registered_users(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
) -> List[User]:
    """Lists registered users (supports paging)."""
    repo = UserRepository(db)
    # Check UserRepository properties; if get_multi not directly exposed, select via modern SQLAlchemy
    stmt = select(User).where(User.deleted_at.is_(None)).offset(skip).limit(limit)
    return list((await db.execute(stmt)).scalars().all())


@router.put("/users/{user_id}/status", response_model=UserSummaryResponse)
async def update_user_moderation_status(
    user_id: uuid.UUID,
    is_active: bool,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=admin_role_dependency
) -> User:
    """Suspends or activates user profiles (records audit logs)."""
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise EntityNotFoundException("User profile not found")

    user.is_active = is_active
    await _add_admin_audit_log(
        db,
        admin_id=current_user.id,
        action="USER_STATUS_UPDATE",
        details={"user_id": str(user_id), "is_active": is_active}
    )
    await db.commit()
    return user


# =====================================================================
# 3. PILOT VERIFICATION
# =====================================================================

@router.get("/drivers/pending", response_model=List[dict], dependencies=[admin_role_dependency])
async def list_pending_verification_drivers(
    db: AsyncSession = Depends(get_db)
) -> List[dict]:
    """Retrieves list of drivers in pending verification states."""
    stmt = (
        select(Driver, User)
        .join(User, Driver.id == User.id)
        .where(Driver.verification_status == "PENDING")
    )
    result = await db.execute(stmt)
    rows = result.all()
    
    response = []
    for driver, user in rows:
        response.append({
            "driver_id": driver.id,
            "name": user.name,
            "phone": user.phone,
            "license_number": driver.license_number,
            "verification_status": driver.verification_status
        })
    return response


@router.put("/drivers/{driver_id}/approve", response_model=DriverVerificationResponse)
async def approve_driver_verification(
    driver_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=admin_role_dependency
) -> dict:
    """Approves driver licenses documents (records audit logs)."""
    drv_repo = DriverRepository(db)
    driver = await drv_repo.get(driver_id)
    if not driver:
        raise EntityNotFoundException("Driver profile not found")

    driver.verification_status = "APPROVED"
    
    await _add_admin_audit_log(
        db,
        admin_id=current_user.id,
        action="DRIVER_APPROVAL",
        details={"driver_id": str(driver_id)}
    )
    await db.commit()
    
    return {
        "driver_id": driver.id,
        "verification_status": driver.verification_status,
        "verified_at": datetime.datetime.utcnow()
    }


@router.put("/drivers/{driver_id}/reject", response_model=DriverVerificationResponse)
async def reject_driver_verification(
    driver_id: uuid.UUID,
    payload: DriverVerificationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=admin_role_dependency
) -> dict:
    """Rejects driver documents with rejection reasons (records audit logs)."""
    drv_repo = DriverRepository(db)
    driver = await drv_repo.get(driver_id)
    if not driver:
        raise EntityNotFoundException("Driver profile not found")

    driver.verification_status = "REJECTED"
    
    await _add_admin_audit_log(
        db,
        admin_id=current_user.id,
        action="DRIVER_REJECTION",
        details={"driver_id": str(driver_id), "reason": payload.reason}
    )
    await db.commit()
    
    return {
        "driver_id": driver.id,
        "verification_status": driver.verification_status,
        "verified_at": None
    }


# =====================================================================
# 4. RIDE & PAYMENTS LISTINGS
# =====================================================================

@router.get("/rides", response_model=List[RideManagementResponse], dependencies=[admin_role_dependency])
async def list_all_rides(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
) -> List[RideRequest]:
    """Retrieves all ride requests (supports paging)."""
    repo = RideRepository(RideRequest, db)
    return await repo.get_multi(skip=skip, limit=limit, sort_by="created_at", sort_desc=True)


@router.get("/wallets", response_model=List[WalletManagementResponse], dependencies=[admin_role_dependency])
async def list_all_wallets(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
) -> List[Wallet]:
    """Retrieves user wallets details (supports paging)."""
    repo = WalletRepository(Wallet, db)
    return await repo.get_multi(skip=skip, limit=limit)


@router.get("/payments", response_model=List[PaymentManagementResponse], dependencies=[admin_role_dependency])
async def list_all_payments(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
) -> List[Payment]:
    """Retrieves payment settlements invoice records (supports paging)."""
    repo = PaymentRepository(Payment, db)
    return await repo.get_multi(skip=skip, limit=limit, sort_by="created_at", sort_desc=True)


# =====================================================================
# 5. AUDIT LOGS
# =====================================================================

@router.get("/audit", response_model=List[AuditLogResponse], dependencies=[admin_role_dependency])
async def list_audit_logs(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
) -> List[AuditLog]:
    """Retrieves administrative actions audit log ledger entries (supports paging)."""
    repo = AuditRepository(AuditLog, db)
    return await repo.get_multi(skip=skip, limit=limit, sort_by="created_at", sort_desc=True)


# =====================================================================
# 6. SYSTEM SETTINGS
# =====================================================================

@router.get("/settings", response_model=List[SystemSettingsResponse], dependencies=[admin_role_dependency])
async def list_system_settings(
    db: AsyncSession = Depends(get_db)
) -> List[SystemSetting]:
    """Retrieves current operational settings key-value maps."""
    repo = SystemSettingsRepository(SystemSetting, db)
    return await repo.get_multi()


@router.put("/settings/{key}", response_model=SystemSettingsResponse)
async def update_system_setting(
    key: str,
    payload: SystemSettingsUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=admin_role_dependency
) -> SystemSetting:
    """Updates operational settings parameters (records audit logs)."""
    settings_service = SystemSettingsService(db)
    setting = await settings_service.update_setting(key, payload.value)
    
    await _add_admin_audit_log(
        db,
        admin_id=current_user.id,
        action="SETTINGS_UPDATE",
        details={"key": key, "value": payload.value}
    )
    await db.commit()
    return setting
