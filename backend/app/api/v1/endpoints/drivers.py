import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import PermissionDeniedException, EntityNotFoundException, ValidationException
from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user, RoleRequired
from app.models.user import User
from app.models.driver import Driver, Vehicle, DriverDocument
from app.models.ride import RideAssignment
from app.schemas.driver import (
    DriverProfileResponse,
    DriverProfileUpdateRequest,
    VehicleCreateRequest,
    VehicleUpdateRequest,
    VehicleResponse,
    DriverDocumentUploadRequest,
    DriverDocumentResponse,
    DriverAvailabilityRequest,
    DriverDashboardResponse,
    DriverRideHistoryResponse,
)
from app.services.driver_service import DriverService, VehicleService, DriverDocumentService
from app.services.payment_service import WalletService
from app.repositories.driver_repository import VehicleRepository, DriverDocumentRepository
from app.repositories.ride_repository import RideAssignmentRepository

router = APIRouter()

# Enforce RBAC validation for Driver roles
driver_role_dependency = Depends(RoleRequired(allowed_roles=["DRIVER"]))


# =====================================================================
# 1. PROFILE ENDPOINTS
# =====================================================================

@router.get("/profile", response_model=DriverProfileResponse)
async def get_driver_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=driver_role_dependency
) -> dict:
    """Retrieves driver profile statistics."""
    drv_service = DriverService(db)
    driver = await drv_service.get_driver(current_user.id)
    return {
        "id": current_user.id,
        "phone": current_user.phone,
        "email": current_user.email,
        "name": current_user.name,
        "license_number": driver.license_number,
        "verification_status": driver.verification_status,
        "rating": float(driver.rating),
        "rating_count": driver.rating_count,
        "online_status": driver.online_status,
        "acceptance_rate": float(driver.acceptance_rate),
        "win_rate": float(driver.win_rate)
    }


@router.put("/profile", response_model=DriverProfileResponse)
async def update_driver_profile(
    payload: DriverProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=driver_role_dependency
) -> dict:
    """Updates driver user account details."""
    drv_service = DriverService(db)
    driver = await drv_service.get_driver(current_user.id)

    if payload.name is not None:
        current_user.name = payload.name
    if payload.email is not None:
        current_user.email = payload.email

    await db.commit()
    return {
        "id": current_user.id,
        "phone": current_user.phone,
        "email": current_user.email,
        "name": current_user.name,
        "license_number": driver.license_number,
        "verification_status": driver.verification_status,
        "rating": float(driver.rating),
        "rating_count": driver.rating_count,
        "online_status": driver.online_status,
        "acceptance_rate": float(driver.acceptance_rate),
        "win_rate": float(driver.win_rate)
    }


# =====================================================================
# 2. VEHICLE ENDPOINTS
# =====================================================================

@router.get("/vehicles", response_model=List[VehicleResponse])
async def list_registered_vehicles(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=driver_role_dependency
) -> List[Vehicle]:
    """Lists registered vehicles for the driver."""
    repo = VehicleRepository(Vehicle, db)
    return await repo.get_multi(filters={"driver_id": current_user.id})


@router.post("/vehicles", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def register_vehicle(
    payload: VehicleCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=driver_role_dependency
) -> Vehicle:
    """Registers a new vehicle for the driver."""
    veh_service = VehicleService(db)
    vehicle = await veh_service.register_vehicle(
        driver_id=current_user.id,
        vehicle_data=payload.model_dump()
    )
    
    # Auto-assign as active vehicle if none exists yet
    drv_service = DriverService(db)
    driver = await drv_service.get_driver(current_user.id)
    if not driver.active_vehicle_id:
        await veh_service.set_active_vehicle(current_user.id, vehicle.id)

    return vehicle


@router.put("/vehicles/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle_details(
    vehicle_id: uuid.UUID,
    payload: VehicleUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=driver_role_dependency
) -> Vehicle:
    """Updates vehicle metadata (verifies ownership)."""
    repo = VehicleRepository(Vehicle, db)
    vehicle = await repo.get(vehicle_id)
    
    if not vehicle or vehicle.driver_id != current_user.id:
        raise EntityNotFoundException("Vehicle not found")

    update_data = payload.model_dump(exclude_unset=True)
    updated = await repo.update(vehicle, update_data)
    await db.commit()
    return updated


@router.delete("/vehicles/{vehicle_id}", status_code=status.HTTP_200_OK)
async def delete_vehicle(
    vehicle_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=driver_role_dependency
) -> dict:
    """Removes a vehicle (verifies ownership and offline status)."""
    repo = VehicleRepository(Vehicle, db)
    vehicle = await repo.get(vehicle_id)
    
    if not vehicle or vehicle.driver_id != current_user.id:
        raise EntityNotFoundException("Vehicle not found")

    drv_service = DriverService(db)
    driver = await drv_service.get_driver(current_user.id)
    
    if driver.online_status and driver.active_vehicle_id == vehicle_id:
        raise ValidationException("Cannot delete active vehicle while online")

    # If deleting the current active vehicle, clear active vehicle ID
    if driver.active_vehicle_id == vehicle_id:
        driver.active_vehicle_id = None
        await db.flush()

    await repo.delete(vehicle_id)
    await db.commit()
    return {"status": "success", "message": "Vehicle deleted successfully"}


# =====================================================================
# 3. DOCUMENTS ENDPOINTS
# =====================================================================

@router.post("/documents", response_model=DriverDocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_verification_document(
    payload: DriverDocumentUploadRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=driver_role_dependency
) -> DriverDocument:
    """Uploads document credentials for admin review and approval verification."""
    doc_service = DriverDocumentService(db)
    return await doc_service.upload_document(
        driver_id=current_user.id,
        doc_type=payload.document_type,
        file_url=payload.file_url,
        expires_at=payload.expires_at
    )


@router.get("/documents", response_model=List[DriverDocumentResponse])
async def list_uploaded_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=driver_role_dependency
) -> List[DriverDocument]:
    """Lists verification documents for the driver."""
    repo = DriverDocumentRepository(DriverDocument, db)
    return await repo.get_multi(filters={"driver_id": current_user.id})


# =====================================================================
# 4. AVAILABILITY & DASHBOARD
# =====================================================================

@router.put("/availability", response_model=DriverProfileResponse)
async def update_online_availability(
    payload: DriverAvailabilityRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=driver_role_dependency
) -> dict:
    """Toggles online state (enforces verification check and active vehicle configuration)."""
    drv_service = DriverService(db)
    driver = await drv_service.get_driver(current_user.id)

    if payload.online_status:
        if driver.verification_status != "APPROVED":
            raise ValidationException("Driver verification not approved yet")
        if not driver.active_vehicle_id:
            raise ValidationException("No active vehicle selected")

    await drv_service.toggle_online_status(current_user.id, payload.online_status)
    return {
        "id": current_user.id,
        "phone": current_user.phone,
        "email": current_user.email,
        "name": current_user.name,
        "license_number": driver.license_number,
        "verification_status": driver.verification_status,
        "rating": float(driver.rating),
        "rating_count": driver.rating_count,
        "online_status": driver.online_status,
        "acceptance_rate": float(driver.acceptance_rate),
        "win_rate": float(driver.win_rate)
    }


@router.get("/dashboard", response_model=DriverDashboardResponse)
async def get_driver_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=driver_role_dependency
) -> dict:
    """Returns active pilot summary statistics and current trip assignment."""
    drv_service = DriverService(db)
    driver = await drv_service.get_driver(current_user.id)

    wallet_service = WalletService(db)
    wallet = await wallet_service.get_wallet(current_user.id)

    # Check for active trip assignment
    assign_repo = RideAssignmentRepository(RideAssignment, db)
    active_assign = await assign_repo.get_active_driver_assignment(current_user.id)
    
    assignment_data = None
    if active_assign:
        assignment_data = {
            "assignment_id": active_assign.id,
            "status": active_assign.status,
            "price": float(active_assign.price_charged)
        }

    return {
        "online_status": driver.online_status,
        "rating": float(driver.rating),
        "acceptance_rate": float(driver.acceptance_rate),
        "wallet_balance": float(wallet.balance),
        "active_assignment": assignment_data
    }


@router.get("/rides", response_model=DriverRideHistoryResponse)
async def list_driver_ride_history(
    skip: int = 0,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=driver_role_dependency
) -> dict:
    """Retrieves paginated ride history logs assigned to the driver."""
    repo = RideAssignmentRepository(RideAssignment, db)
    
    filters = {"driver_id": current_user.id}
    total = await repo.count(filters=filters)
    
    assignments = await repo.get_multi(
        skip=skip,
        limit=limit,
        filters=filters,
        sort_by="created_at",
        sort_desc=True
    )
    
    items_response = []
    for a in assignments:
        items_response.append({
            "assignment_id": a.id,
            "status": a.status,
            "price": float(a.price_charged) if a.price_charged else 0.0,
            "created_at": a.created_at
        })
    return {"total_count": total, "items": items_response}


# =====================================================================
# 5. BIDDING ENDPOINTS
# =====================================================================

from pydantic import Field, BaseModel

class DriverBidCreateRequest(BaseModel):
    request_id: uuid.UUID
    amount: float = Field(..., ge=5.00)
    eta_minutes: int = Field(..., ge=1, le=120)

    class Config:
        populate_by_name = True


@router.post("/bids", status_code=status.HTTP_201_CREATED)
async def submit_driver_bid(
    payload: DriverBidCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=driver_role_dependency
) -> dict:
    """Submits a custom bid for an open ride request."""
    from app.repositories.ride_repository import BidRepository
    from app.models.ride import DriverBid, RideRequest

    drv_service = DriverService(db)
    driver = await drv_service.get_driver(current_user.id)
    if driver.verification_status != "APPROVED":
        raise ValidationException("Driver verification not approved yet")
    if not driver.online_status:
        raise ValidationException("Driver must be online to submit bids")

    # Verify ride request exists and is PENDING_BIDS
    from app.repositories.ride_repository import RideRepository
    ride_repo = RideRepository(RideRequest, db)
    ride = await ride_repo.get(payload.request_id)
    if not ride or ride.status != "PENDING_BIDS":
        raise ValidationException("Ride request is not open for bidding")

    bid_repo = BidRepository(DriverBid, db)
    existing_bid = await bid_repo.get_by_request_and_driver(payload.request_id, current_user.id)
    if existing_bid:
        existing_bid.amount = payload.amount
        existing_bid.eta_minutes = payload.eta_minutes
        bid = existing_bid
    else:
        bid = DriverBid(
            request_id=payload.request_id,
            driver_id=current_user.id,
            amount=payload.amount,
            eta_minutes=payload.eta_minutes,
            status="SUBMITTED"
        )
        db.add(bid)

    await db.commit()
    await db.refresh(bid)

    # Emit socket notification to passenger room
    from app.services.socket_service import sio
    await sio.emit(
        "new_bid_received",
        {
            "bid_id": str(bid.id),
            "driver_id": str(current_user.id),
            "amount": float(bid.amount),
            "eta_minutes": bid.eta_minutes
        },
        room=f"ride:{payload.request_id}"
    )

    return {
        "id": bid.id,
        "request_id": bid.request_id,
        "driver_id": bid.driver_id,
        "amount": float(bid.amount),
        "eta_minutes": bid.eta_minutes,
        "status": bid.status,
        "created_at": bid.created_at
    }

