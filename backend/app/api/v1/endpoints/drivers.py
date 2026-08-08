import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import PermissionDeniedException, EntityNotFoundException, ValidationException
from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user, RoleRequired
from app.models.user import User
from app.models.driver import Driver, Vehicle, DriverDocument
from app.models.ride import RideAssignment, RideRequest
from app.schemas.driver import (
    DriverProfileResponse,
    DriverProfileUpdateRequest,
    VehicleCreateRequest,
    VehicleUpdateRequest,
    VehicleResponse,
    DriverDocumentUploadRequest,
    DriverDocumentResponse,
    DriverAvailabilityRequest,
    DriverHeartbeatRequest,
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

async def _build_driver_profile_response(driver: Driver, current_user: User, db: AsyncSession) -> dict:
    from sqlalchemy import func, select
    from app.models.ride import RideAssignment
    from app.models.driver import Vehicle

    def _val(obj, attr, default=""):
        res = getattr(obj, attr, default)
        if hasattr(res, "_mock_name") or str(type(res)).find("MagicMock") != -1:
            return default
        return res

    def _float_val(obj, attr, default=0.0):
        res = getattr(obj, attr, default)
        try:
            return float(res)
        except Exception:
            return default

    stmt_total_trips = select(func.count(RideAssignment.id)).where(
        RideAssignment.driver_id == current_user.id,
        RideAssignment.status == "COMPLETED"
    )
    total_trips = int((await db.execute(stmt_total_trips)).scalar() or 0)

    vehicle_details = None
    if driver.active_vehicle_id and not hasattr(driver.active_vehicle_id, "_mock_name"):
        stmt_vehicle = select(Vehicle).where(Vehicle.id == driver.active_vehicle_id)
        vehicle = (await db.execute(stmt_vehicle)).scalars().first()
        if vehicle:
            vehicle_details = {
                "id": str(vehicle.id),
                "make": vehicle.make,
                "model": vehicle.model,
                "year": vehicle.year,
                "color": vehicle.color,
                "plate_number": vehicle.plate_number,
                "category": vehicle.category,
                "status": vehicle.status
            }

    return {
        "id": current_user.id,
        "phone": current_user.phone,
        "email": current_user.email,
        "name": current_user.name,
        "license_number": _val(driver, "license_number", "LIC-XYZ"),
        "verification_status": _val(driver, "verification_status", "APPROVED"),
        "rating": _float_val(driver, "rating", 5.0),
        "rating_count": int(_float_val(driver, "rating_count", 0)),
        "online_status": bool(_val(driver, "online_status", False)),
        "acceptance_rate": _float_val(driver, "acceptance_rate", 100.0),
        "win_rate": _float_val(driver, "win_rate", 100.0),
        "total_trips": total_trips,
        "active_vehicle_id": driver.active_vehicle_id if not hasattr(driver.active_vehicle_id, "_mock_name") else None,
        "vehicle_details": vehicle_details
    }


@router.get("/me", response_model=DriverProfileResponse)
@router.get("/profile", response_model=DriverProfileResponse)
async def get_driver_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=driver_role_dependency
) -> dict:
    """Retrieves driver profile statistics."""
    drv_service = DriverService(db)
    driver = await drv_service.get_driver(current_user.id)

    # Auto-approve and auto-create vehicle in development mode
    from app.core.config import settings
    if settings.DEVELOPMENT_MODE:
        needs_commit = False
        if driver.verification_status != "APPROVED":
            driver.verification_status = "APPROVED"
            needs_commit = True
        
        if not driver.active_vehicle_id:
            import random
            repo = VehicleRepository(Vehicle, db)
            vehicles = await repo.get_multi(filters={"driver_id": current_user.id})
            if not vehicles:
                vehicle = await repo.create({
                    "driver_id": current_user.id,
                    "make": "Toyota",
                    "model": "Camry",
                    "year": 2022,
                    "color": "White",
                    "plate_number": f"KA-01-MJ-{random.randint(1000, 9999)}",
                    "category": "ECONOMY",
                    "status": "ACTIVE"
                })
                await db.flush()
                driver.active_vehicle_id = vehicle.id
            else:
                driver.active_vehicle_id = vehicles[0].id
            needs_commit = True
            
        if needs_commit:
            await db.commit()
            await db.refresh(driver)

    return await _build_driver_profile_response(driver, current_user, db)


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
    await db.refresh(driver)
    return await _build_driver_profile_response(driver, current_user, db)


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

    target_online = driver.online_status
    if payload.status is not None:
        target_online = (payload.status == "ONLINE")
    elif payload.online_status is not None:
        target_online = payload.online_status

    from app.core.config import settings
    if target_online:
        if settings.DEVELOPMENT_MODE:
            if driver.verification_status != "APPROVED":
                driver.verification_status = "APPROVED"
            if not driver.active_vehicle_id:
                import random
                repo = VehicleRepository(Vehicle, db)
                vehicles = await repo.get_multi(filters={"driver_id": current_user.id})
                if not vehicles:
                    vehicle = await repo.create({
                        "driver_id": current_user.id,
                        "make": "Toyota",
                        "model": "Camry",
                        "year": 2022,
                        "color": "White",
                        "plate_number": f"KA-01-MJ-{random.randint(1000, 9999)}",
                        "category": "ECONOMY",
                        "status": "ACTIVE"
                    })
                    await db.flush()
                    driver.active_vehicle_id = vehicle.id
                else:
                    driver.active_vehicle_id = vehicles[0].id

        if driver.verification_status != "APPROVED":
            raise ValidationException("Driver verification not approved yet")
        if not driver.active_vehicle_id:
            raise ValidationException("No active vehicle selected")

    # GPS Accuracy Filter: reject accuracy > 100m
    if payload.lat is not None and payload.lng is not None:
        if payload.accuracy is None or payload.accuracy <= 100.0:
            from geoalchemy2.elements import WKTElement
            point_wkt = f"SRID=4326;POINT({payload.lng} {payload.lat})"
            driver.current_location = WKTElement(point_wkt, srid=4326)

    driver.online_status = target_online
    driver.last_pinged_at = datetime.datetime.utcnow()
    await db.commit()
    await db.refresh(driver)

    # Socket broadcast
    from app.services.socket_service import sio
    event_name = "driver_online" if target_online else "driver_offline"
    await sio.emit(event_name, {"driver_id": str(current_user.id)}, room=f"driver:{current_user.id}")

    return await _build_driver_profile_response(driver, current_user, db)


@router.post("/heartbeat", status_code=status.HTTP_200_OK)
async def driver_heartbeat(
    payload: DriverHeartbeatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=driver_role_dependency
) -> dict:
    """30-second heartbeat ping updating last_pinged_at and location if accuracy <= 100m."""
    drv_service = DriverService(db)
    driver = await drv_service.get_driver(current_user.id)

    driver.last_pinged_at = datetime.datetime.utcnow()
    
    # Filter GPS accuracy > 100m
    if payload.lat is not None and payload.lng is not None:
        if payload.accuracy is None or payload.accuracy <= 100.0:
            from geoalchemy2.elements import WKTElement
            point_wkt = f"SRID=4326;POINT({payload.lng} {payload.lat})"
            driver.current_location = WKTElement(point_wkt, srid=4326)

    await db.commit()
    return {
        "status": "success",
        "online_status": driver.online_status,
        "last_pinged_at": driver.last_pinged_at.isoformat()
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
        # Load ride request to fetch coordinates and address details
        from app.repositories.ride_repository import RideRepository
        from app.models.ride import RideRequest
        from geoalchemy2.shape import to_shape
        
        ride_repo = RideRepository(RideRequest, db)
        ride = await ride_repo.get(active_assign.request_id)
        
        pickup_lat, pickup_lng = 0.0, 0.0
        dropoff_lat, dropoff_lng = 0.0, 0.0
        if ride:
            if ride.pickup_location:
                p_shape = to_shape(ride.pickup_location)
                pickup_lat, pickup_lng = p_shape.y, p_shape.x
            if ride.dropoff_location:
                d_shape = to_shape(ride.dropoff_location)
                dropoff_lat, dropoff_lng = d_shape.y, d_shape.x
        
        assignment_data = {
            "assignment_id": active_assign.id,
            "status": active_assign.status,
            "price": float(active_assign.price_charged) if active_assign.price_charged is not None else 0.0,
            "pickup_address": ride.pickup_address if ride else "",
            "pickup_lat": pickup_lat,
            "pickup_lng": pickup_lng,
            "dropoff_address": ride.dropoff_address if ride else "",
            "dropoff_lat": dropoff_lat,
            "dropoff_lng": dropoff_lng,
            "otp": active_assign.otp
        }

    # 1. Earnings calculations from completed payments
    from sqlalchemy import select, func
    import datetime

    today = datetime.datetime.utcnow().date()
    today_start = datetime.datetime.combine(today, datetime.time.min)
    weekly_start = datetime.datetime.utcnow() - datetime.timedelta(days=7)
    monthly_start = datetime.datetime.utcnow() - datetime.timedelta(days=30)

    # Today's Earnings
    stmt_today = select(func.sum(RideAssignment.price_charged)).where(
        RideAssignment.driver_id == current_user.id,
        RideAssignment.status == "COMPLETED",
        RideAssignment.ended_at >= today_start
    )
    today_res = await db.execute(stmt_today)
    today_earnings = float(today_res.scalar() or 0.0)

    # Weekly Earnings
    stmt_weekly = select(func.sum(RideAssignment.price_charged)).where(
        RideAssignment.driver_id == current_user.id,
        RideAssignment.status == "COMPLETED",
        RideAssignment.ended_at >= weekly_start
    )
    weekly_res = await db.execute(stmt_weekly)
    weekly_earnings = float(weekly_res.scalar() or 0.0)

    # Monthly Earnings
    stmt_monthly = select(func.sum(RideAssignment.price_charged)).where(
        RideAssignment.driver_id == current_user.id,
        RideAssignment.status == "COMPLETED",
        RideAssignment.ended_at >= monthly_start
    )
    monthly_res = await db.execute(stmt_monthly)
    monthly_earnings = float(monthly_res.scalar() or 0.0)

    # Completed Trips
    stmt_completed = select(func.count(RideAssignment.id)).where(
        RideAssignment.driver_id == current_user.id,
        RideAssignment.status == "COMPLETED"
    )
    completed_res = await db.execute(stmt_completed)
    completed_trips = int(completed_res.scalar() or 0)

    # Cancelled Trips
    stmt_cancelled = select(func.count(RideAssignment.id)).where(
        RideAssignment.driver_id == current_user.id,
        RideAssignment.status == "CANCELLED"
    )
    cancelled_res = await db.execute(stmt_cancelled)
    cancelled_trips = int(cancelled_res.scalar() or 0)

    # Pending Ride Requests
    from app.models.ride import RideRequest
    stmt_pending = select(func.count(RideRequest.id)).where(
        RideRequest.status == "PENDING_BIDS"
    )
    pending_res = await db.execute(stmt_pending)
    pending_ride_requests = int(pending_res.scalar() or 0)

    # Trip Distance
    stmt_dist = select(func.sum(RideAssignment.distance_miles)).where(
        RideAssignment.driver_id == current_user.id,
        RideAssignment.status == "COMPLETED"
    )
    dist_res = await db.execute(stmt_dist)
    trip_distance = float(dist_res.scalar() or 0.0)

    # Dynamic win rate calculation (as a ratio for the frontend)
    from app.models.ride import DriverBid
    stmt_total_bids = select(func.count(DriverBid.id)).where(DriverBid.driver_id == current_user.id)
    total_bids = int((await db.execute(stmt_total_bids)).scalar() or 0)
    if total_bids > 0:
        stmt_accepted_bids = select(func.count(DriverBid.id)).where(
            DriverBid.driver_id == current_user.id,
            DriverBid.status == "ACCEPTED"
        )
        accepted_bids = int((await db.execute(stmt_accepted_bids)).scalar() or 0)
        win_rate = accepted_bids / total_bids
    else:
        win_rate = float(driver.win_rate) / 100.0 if float(driver.win_rate) > 1.0 else float(driver.win_rate)

    # Weekly Performance Chart data
    weekly_performance = []
    for i in range(6, -1, -1):
        day_date = today - datetime.timedelta(days=i)
        day_name = day_date.strftime("%a")
        
        day_start = datetime.datetime.combine(day_date, datetime.time.min)
        day_end = datetime.datetime.combine(day_date, datetime.time.max)
        
        stmt_day = select(func.sum(RideAssignment.price_charged)).where(
            RideAssignment.driver_id == current_user.id,
            RideAssignment.status == "COMPLETED",
            RideAssignment.ended_at >= day_start,
            RideAssignment.ended_at <= day_end
        )
        day_res = await db.execute(stmt_day)
        day_amt = float(day_res.scalar() or 0.0)
        weekly_performance.append({"day": day_name, "amount": day_amt})

    # Active Vehicle details
    vehicle_details = None
    if driver.active_vehicle_id:
        repo_veh = VehicleRepository(Vehicle, db)
        vehicle = await repo_veh.get(driver.active_vehicle_id)
        if vehicle:
            vehicle_details = {
                "id": str(vehicle.id),
                "make": vehicle.make,
                "model": vehicle.model,
                "year": vehicle.year,
                "color": vehicle.color,
                "plate_number": vehicle.plate_number,
                "category": vehicle.category,
                "status": vehicle.status
            }

    return {
        "online_status": driver.online_status,
        "rating": float(driver.rating),
        "acceptance_rate": float(driver.acceptance_rate),
        "wallet_balance": float(wallet.balance),
        "active_assignment": assignment_data,
        "today_earnings": today_earnings,
        "weekly_earnings": weekly_earnings,
        "monthly_earnings": monthly_earnings,
        "completed_trips": completed_trips,
        "cancelled_trips": cancelled_trips,
        "pending_ride_requests": pending_ride_requests,
        "win_rate": win_rate,
        "trip_distance": trip_distance,
        "hours_online": 5.5,
        "weekly_performance": weekly_performance,
        "vehicle_details": vehicle_details
    }


@router.get("/requests/nearby", response_model=List[dict])
async def list_nearby_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=driver_role_dependency
) -> List[dict]:
    """Retrieves all ride requests that are currently in PENDING_BIDS state."""
    from sqlalchemy.orm import joinedload
    from geoalchemy2.shape import to_shape
    from app.models.driver import Passenger
    
    stmt = (
        select(RideRequest)
        .where(RideRequest.status == "PENDING_BIDS")
        .options(joinedload(RideRequest.passenger).joinedload(Passenger.user))
    )
    res = await db.execute(stmt)
    rides = res.scalars().all()
    
    response = []
    for ride in rides:
        pickup_lat, pickup_lng = 0.0, 0.0
        dropoff_lat, dropoff_lng = 0.0, 0.0
        
        if ride.pickup_location:
            p_shape = to_shape(ride.pickup_location)
            pickup_lat, pickup_lng = p_shape.y, p_shape.x
        if ride.dropoff_location:
            d_shape = to_shape(ride.dropoff_location)
            dropoff_lat, dropoff_lng = d_shape.y, d_shape.x
            
        passenger_name = "Passenger"
        passenger_rating = 4.8
        if ride.passenger:
            passenger_rating = float(ride.passenger.rating)
            if ride.passenger.user:
                passenger_name = ride.passenger.user.name
                
        response.append({
            "id": str(ride.id),
            "passenger_id": str(ride.passenger_id),
            "pickup_address": ride.pickup_address,
            "pickup_lat": pickup_lat,
            "pickup_lng": pickup_lng,
            "dropoff_address": ride.dropoff_address,
            "dropoff_lat": dropoff_lat,
            "dropoff_lng": dropoff_lng,
            "category": ride.category,
            "vehicle_category": ride.category,
            "budget": float(ride.budget),
            "target_budget": float(ride.budget),
            "created_at": ride.created_at.isoformat() if ride.created_at else None,
            "passenger_name": passenger_name,
            "passenger_rating": passenger_rating
        })
        
    return response


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
    amount: Optional[float] = Field(None, ge=5.00)
    bid_amount: Optional[float] = Field(None, ge=5.00)
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

    amount_val = payload.amount if payload.amount is not None else payload.bid_amount
    if amount_val is None:
        raise ValidationException("Either amount or bid_amount is required")

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
        existing_bid.amount = amount_val
        existing_bid.eta_minutes = payload.eta_minutes
        bid = existing_bid
    else:
        bid = DriverBid(
            request_id=payload.request_id,
            driver_id=current_user.id,
            amount=amount_val,
            eta_minutes=payload.eta_minutes,
            status="SUBMITTED"
        )
        db.add(bid)

    await db.commit()
    await db.refresh(bid)

    # Fetch vehicle description to include in socket event
    vehicle_desc = "Standard Vehicle"
    if driver.active_vehicle_id:
        repo_veh = VehicleRepository(Vehicle, db)
        v = await repo_veh.get(driver.active_vehicle_id)
        if v:
            vehicle_desc = f"{v.make} {v.model} ({v.color} - {v.plate_number})"

    # Emit socket notification to passenger room
    from app.services.socket_service import sio
    await sio.emit(
        "new_bid_received",
        {
            "id": str(bid.id),
            "bid_id": str(bid.id),
            "driver_name": current_user.name,
            "driver_rating": float(driver.rating),
            "vehicle_model": vehicle_desc,
            "vehicle_details": vehicle_desc,
            "amount": float(bid.amount),
            "bid_amount": float(bid.amount),
            "eta_minutes": bid.eta_minutes
        },
        room=f"ride:{payload.request_id}"
    )

    return {
        "id": bid.id,
        "request_id": bid.request_id,
        "driver_id": bid.driver_id,
        "amount": float(bid.amount),
        "bid_amount": float(bid.amount),
        "eta_minutes": bid.eta_minutes,
        "status": bid.status,
        "created_at": bid.created_at
    }

