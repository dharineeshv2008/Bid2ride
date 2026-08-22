import json
import uuid
import datetime
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.shape import to_shape

from app.core.exceptions import (
    PermissionDeniedException,
    EntityNotFoundException,
    ValidationException,
)
from app.core.redis import redis_manager
from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.ride import RideAssignment, RideRequest, RideStatusHistory, RideTracking
from app.schemas.ride import (
    RideAssignmentResponse,
    DriverArrivalRequest,
    RideStartRequest,
    RideCompletionRequest,
    DriverLocationUpdateRequest,
    DriverLiveLocationResponse,
    RideTimelineResponse,
    RideStatusResponse,
)
from app.services.ride_service import RideAssignmentService, RideTrackingService
from app.repositories.ride_repository import RideAssignmentRepository, RideRepository
from app.services.socket_service import sio

router = APIRouter()
logger = logging.getLogger(__name__)


async def _verify_assignment_role_ownership(assignment_id: uuid.UUID, user: User, db: AsyncSession, expected_role: Optional[str] = None) -> RideAssignment:
    """Helper to verify user belongs to the target assignment and checks roles limits."""
    repo = RideAssignmentRepository(RideAssignment, db)
    assignment = await repo.get(assignment_id)
    if not assignment:
        # Fallback to search assignment by ride_id (request_id)
        from sqlalchemy import select
        stmt = select(RideAssignment).where(RideAssignment.request_id == assignment_id)
        res = await db.execute(stmt)
        assignment = res.scalars().first()
        if assignment:
            logger.info(f"[RIDE LOOKUP] Found assignment {assignment.id} using request_id {assignment_id}")

    if not assignment:
        raise EntityNotFoundException("Ride assignment not found")

    # If role-based checks are specified
    if expected_role:
        logger.info(f"[AUTH DEBUG] Ride ownership role check: User: {user.id}, role: {user.role}, expected: {expected_role}")
        if str(user.role).upper() != str(expected_role).upper():
            logger.warning(f"[AUTH DEBUG] Ride ownership role mismatch: User {user.id} has role {user.role} but expected {expected_role}")
            raise PermissionDeniedException(f"Action restricted to {expected_role} role only")

    # Check user ownership bounds
    ride_repo = RideRepository(RideRequest, db)
    ride = await ride_repo.get(assignment.request_id)
    
    if user.id != assignment.driver_id and user.id != ride.passenger_id:
        raise PermissionDeniedException("Access denied. User does not own this assignment.")

    return assignment


async def _add_status_history(db: AsyncSession, ride_request_id: uuid.UUID, old: Optional[str], new: str, user_id: uuid.UUID, comment: Optional[str] = None) -> None:
    """Inserts a state change audit record in database."""
    history = RideStatusHistory(
        ride_request_id=ride_request_id,
        old_status=old,
        new_status=new,
        changed_by_id=user_id,
        comment=comment
    )
    db.add(history)
    await db.flush()


# =====================================================================
# RIDE LIFECYCLE API CONTROLLERS
# =====================================================================

@router.post("/{ride_id}/accept-assignment", response_model=RideAssignmentResponse)
async def accept_assignment(
    ride_id: uuid.UUID,  # assignment_id
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Driver accepts assignment, updating pilot state to DRIVER_ACCEPTED."""
    assignment = await _verify_assignment_role_ownership(ride_id, current_user, db, "DRIVER")
    
    if assignment.status != "ACCEPTED":
        raise ValidationException(f"Cannot accept assignment from state {assignment.status}")

    # State update
    old_status = assignment.status
    assignment.status = "DRIVER_ACCEPTED"
    await _add_status_history(db, assignment.request_id, old_status, assignment.status, current_user.id)
    await db.commit()

    # Emit socket alerts to Passenger
    await sio.emit("driver_assigned", {"assignment_id": str(assignment.id)}, room=f"ride:{assignment.request_id}")
    
    return {
        "id": assignment.id,
        "request_id": assignment.request_id,
        "driver_id": assignment.driver_id,
        "status": assignment.status,
        "price": float(assignment.price_charged),
        "created_at": assignment.created_at
    }


@router.post("/{ride_id}/arrived", response_model=RideAssignmentResponse)
async def driver_arrived(
    ride_id: uuid.UUID,  # assignment_id
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Driver marks arrival at pickup location, switching state to DRIVER_ARRIVED."""
    assignment = await _verify_assignment_role_ownership(ride_id, current_user, db, "DRIVER")
    
    if assignment.status not in ["ACCEPTED", "DRIVER_ACCEPTED"]:
        raise ValidationException("Cannot mark arrival before accepting the assignment")

    # State transition
    old_status = assignment.status
    assignment.status = "DRIVER_ARRIVED"
    await _add_status_history(db, assignment.request_id, old_status, assignment.status, current_user.id)
    await db.commit()

    # Alert passenger via socket
    await sio.emit("driver_arrived", {"assignment_id": str(assignment.id)}, room=f"ride:{assignment.request_id}")

    return {
        "id": assignment.id,
        "request_id": assignment.request_id,
        "driver_id": assignment.driver_id,
        "status": assignment.status,
        "price": float(assignment.price_charged),
        "created_at": assignment.created_at
    }


@router.post("/{ride_id}/start", response_model=RideAssignmentResponse)
async def start_ride(
    ride_id: uuid.UUID,  # assignment_id
    payload: RideStartRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Driver verifies passenger OTP code and kicks off trip (IN_PROGRESS)."""
    # Exclude permissions check to call lower service directly
    repo = RideAssignmentRepository(RideAssignment, db)
    assignment = await repo.get(ride_id)
    if not assignment or assignment.driver_id != current_user.id:
        raise PermissionDeniedException("Only the assigned driver can start the ride")

    if assignment.status != "DRIVER_ARRIVED":
        raise ValidationException("Cannot start ride before arriving at pickup point")

    # OTP validation via service layer
    assign_service = RideAssignmentService(db)
    # This automatically verifies geofences and checks code matches
    await assign_service.verify_pickup_otp(
        driver_id=current_user.id,
        assignment_id=ride_id,
        otp=payload.otp
    )

    # State log updates
    await _add_status_history(db, assignment.request_id, "DRIVER_ARRIVED", "IN_PROGRESS", current_user.id)
    
    # Reload assignment state
    await db.refresh(assignment)

    # Notify passenger via Socket
    await sio.emit("ride_started", {"assignment_id": str(assignment.id)}, room=f"ride:{assignment.request_id}")
    await sio.emit("passenger_verified", {"assignment_id": str(assignment.id)}, room=f"driver:{current_user.id}")

    return {
        "id": assignment.id,
        "request_id": assignment.request_id,
        "driver_id": assignment.driver_id,
        "status": assignment.status,
        "price": float(assignment.price_charged),
        "created_at": assignment.created_at
    }


@router.post("/{ride_id}/complete", response_model=RideAssignmentResponse)
async def complete_ride(
    ride_id: uuid.UUID,  # assignment_id
    payload: RideCompletionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Driver registers dropoff coordinates, changing state to RIDE_COMPLETED."""
    repo = RideAssignmentRepository(RideAssignment, db)
    assignment = await repo.get(ride_id)
    if not assignment or assignment.driver_id != current_user.id:
        raise PermissionDeniedException("Only the assigned driver can complete the ride")

    if assignment.status != "IN_PROGRESS":
        raise ValidationException("Cannot complete ride before starting it")

    # Execute completion transactions via service layer
    assign_service = RideAssignmentService(db)
    await assign_service.complete_ride(
        driver_id=current_user.id,
        assignment_id=ride_id
    )

    # Save additional metrics if provided
    if payload.distance_miles is not None:
        assignment.distance_miles = payload.distance_miles
    if payload.duration_seconds is not None:
        assignment.duration_seconds = payload.duration_seconds

    # Audit status history
    await _add_status_history(db, assignment.request_id, "IN_PROGRESS", "COMPLETED", current_user.id)
    await db.commit()

    # Alert passenger via socket
    await sio.emit("ride_completed", {"assignment_id": str(assignment.id)}, room=f"ride:{assignment.request_id}")

    return {
        "id": assignment.id,
        "request_id": assignment.request_id,
        "driver_id": assignment.driver_id,
        "status": assignment.status,
        "price": float(assignment.price_charged),
        "created_at": assignment.created_at
    }

@router.post("/{ride_id}/cancel", response_model=RideAssignmentResponse)
async def driver_cancel_assignment(
    ride_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Driver cancels the ride assignment."""
    if current_user.role != "DRIVER":
        raise PermissionDeniedException("Only drivers can perform this action")

    repo = RideAssignmentRepository(RideAssignment, db)
    # The ride_id could be assignment_id
    assignment = await repo.get(ride_id)
    if not assignment:
        raise EntityNotFoundException("Ride assignment not found")

    if assignment.driver_id != current_user.id:
        raise PermissionDeniedException("Not your assignment")

    if assignment.status not in ["DRIVER_ACCEPTED", "ACCEPTED", "ARRIVED", "DRIVER_ARRIVED"]:
        raise PermissionDeniedException("Cannot cancel from current status")

    assignment.status = "CANCELLED"
    
    # Also cancel the request
    from app.repositories.ride_repository import RideRepository
    req_repo = RideRepository(RideRequest, db)
    request = await req_repo.get(assignment.request_id)
    if request:
        request.status = "CANCELLED"

    await db.commit()
    await db.refresh(assignment)

    from app.services.socket_service import sio
    await sio.emit("ride_cancelled", {"assignment_id": str(assignment.id)}, room=f"passenger:{request.passenger_id}")

    return {
        "id": assignment.id,
        "request_id": assignment.request_id,
        "driver_id": assignment.driver_id,
        "status": assignment.status,
        "price": float(assignment.price_charged),
        "created_at": assignment.created_at
    }


@router.get("/{ride_id}", response_model=RideAssignmentResponse)
async def get_ride_assignment_details(
    ride_id: uuid.UUID,  # assignment_id
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Retrieves current assignment details (verifies passenger/driver participant)."""
    if not ride_id:
        raise EntityNotFoundException("Ride ID cannot be empty")

    from app.repositories.ride_repository import RideRepository
    from app.models.ride import RideRequest

    def get_coords(geom) -> tuple:
        if not geom:
            return 0.0, 0.0
        try:
            str_val = str(geom)
            if "POINT" in str_val:
                point_part = str_val.split("POINT")[1]
                coords_str = point_part.strip().lstrip("(").rstrip(")").split()
                return float(coords_str[1]), float(coords_str[0])
        except Exception:
            pass
        try:
            from geoalchemy2.shape import to_shape
            shape = to_shape(geom)
            return shape.y, shape.x
        except Exception:
            pass
        return 0.0, 0.0

    assignment = None
    try:
        assignment = await _verify_assignment_role_ownership(ride_id, current_user, db)
    except Exception:
        pass

    if assignment:
        ride_repo = RideRepository(RideRequest, db)
        ride = await ride_repo.get(assignment.request_id)
        
        pickup_lat, pickup_lng = get_coords(ride.pickup_location)
        dropoff_lat, dropoff_lng = get_coords(ride.dropoff_location)

        return {
            "id": assignment.id,
            "request_id": assignment.request_id,
            "driver_id": assignment.driver_id,
            "status": assignment.status,
            "price": float(assignment.price_charged) if assignment.price_charged is not None else 0.0,
            "created_at": assignment.created_at,
            "pickup_address": ride.pickup_address,
            "pickup_lat": pickup_lat,
            "pickup_lng": pickup_lng,
            "dropoff_address": ride.dropoff_address,
            "dropoff_lat": dropoff_lat,
            "dropoff_lng": dropoff_lng,
            "otp": assignment.otp
        }

    # Assignment not found. Try to load RideRequest directly
    ride_repo = RideRepository(RideRequest, db)
    ride = await ride_repo.get(ride_id)
    if not ride:
        raise EntityNotFoundException("Ride request or assignment not found")

    if current_user.id != ride.passenger_id:
        # Check if current_user is a driver who submitted a bid on this request
        from app.models.ride import DriverBid
        from sqlalchemy import select
        stmt = select(DriverBid).where(DriverBid.request_id == ride.id, DriverBid.driver_id == current_user.id)
        res = await db.execute(stmt)
        bid = res.scalars().first()
        if not bid and current_user.role != "ADMIN":
            raise PermissionDeniedException("Access denied. User does not own this ride request.")

    pickup_lat, pickup_lng = get_coords(ride.pickup_location)
    dropoff_lat, dropoff_lng = get_coords(ride.dropoff_location)

    return {
        "id": None,
        "request_id": ride.id,
        "driver_id": None,
        "status": ride.status,
        "price": float(ride.budget),
        "created_at": ride.created_at,
        "pickup_address": ride.pickup_address,
        "pickup_lat": pickup_lat,
        "pickup_lng": pickup_lng,
        "dropoff_address": ride.dropoff_address,
        "dropoff_lat": dropoff_lat,
        "dropoff_lng": dropoff_lng,
        "otp": None
    }


@router.get("/{ride_id}/timeline", response_model=RideTimelineResponse)
async def get_ride_timeline(
    ride_id: uuid.UUID,  # assignment_id
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Retrieves chronological state changes timeline logs for an assignment."""
    assignment = await _verify_assignment_role_ownership(ride_id, current_user, db)
    
    stmt = select(RideStatusHistory).where(
        RideStatusHistory.ride_request_id == assignment.request_id
    ).order_by(RideStatusHistory.created_at.asc())
    
    result = await db.execute(stmt)
    history_items = result.scalars().all()
    
    timeline = []
    for h in history_items:
        timeline.append({
            "id": h.id,
            "old_status": h.old_status,
            "new_status": h.new_status,
            "created_at": h.created_at,
            "comment": h.comment
        })
        
    return {"ride_id": assignment.request_id, "timeline": timeline}


# =====================================================================
# LIVE GPS LOCATION TRACKING ENDPOINTS
# =====================================================================

@router.post("/{ride_id}/location", status_code=status.HTTP_200_OK)
async def update_driver_location(
    ride_id: uuid.UUID,  # assignment_id
    payload: DriverLocationUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Driver posts GPS coordinate ping updates, caching in Redis and writing to TimescaleDB."""
    assignment = await _verify_assignment_role_ownership(ride_id, current_user, db, "DRIVER")
    
    # Save location in database tracking history log
    tracking_service = RideTrackingService(db)
    await tracking_service.record_location_ping(
        assignment_id=assignment.id,
        lat=payload.lat,
        lng=payload.lng,
        speed=payload.speed,
        heading=payload.heading
    )

    # Cache coordinates in Redis
    if redis_manager.client:
        try:
            location_data = {
                "lat": payload.lat,
                "lng": payload.lng,
                "speed": payload.speed,
                "heading": payload.heading,
                "updated_at": datetime.datetime.utcnow().isoformat()
            }
            await redis_manager.client.set(f"ride_location:{assignment.id}", json.dumps(location_data), ex=1800)
        except Exception as e:
            logger.warning(f"Failed to cache driver location update in Redis: {e}")

    # Broadcast location update via WebSockets
    await sio.emit("driver_location_updated", {
        "assignment_id": str(assignment.id),
        "lat": payload.lat,
        "lng": payload.lng,
        "speed": payload.speed,
        "heading": payload.heading
    }, room=f"ride:{assignment.request_id}")

    return {"status": "success", "message": "Location updated successfully"}


@router.get("/{ride_id}/live-location", response_model=DriverLiveLocationResponse)
async def get_ride_live_location(
    ride_id: uuid.UUID,  # assignment_id
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Passenger pulls latest driver coordinates from Redis cache."""
    assignment = await _verify_assignment_role_ownership(ride_id, current_user, db)
    
    raw = None
    if redis_manager.client:
        try:
            raw = await redis_manager.client.get(f"ride_location:{assignment.id}")
        except Exception as e:
            logger.warning(f"Failed to fetch driver live location from Redis: {e}")
    if not raw:
        # Fallback to loading the last database ping if cache expired
        stmt = select(RideTracking).where(
            RideTracking.assignment_id == assignment.id
        ).order_by(RideTracking.pinged_at.desc()).limit(1)
        result = await db.execute(stmt)
        last_ping = result.scalars().first()
        
        if not last_ping:
            raise EntityNotFoundException("No tracking locations recorded yet for this ride")
        
        def get_coords(geom) -> tuple:
            if not geom:
                return 0.0, 0.0
            try:
                str_val = str(geom)
                if "POINT" in str_val:
                    point_part = str_val.split("POINT")[1]
                    coords_str = point_part.strip().lstrip("(").rstrip(")").split()
                    return float(coords_str[1]), float(coords_str[0])
            except Exception:
                pass
            try:
                from geoalchemy2.shape import to_shape
                shape = to_shape(geom)
                return shape.y, shape.x
            except Exception:
                pass
            return 0.0, 0.0

        lat, lng = get_coords(last_ping.location)
        return {
            "lat": lat,
            "lng": lng,
            "speed": float(last_ping.speed) if last_ping.speed else None,
            "heading": float(last_ping.heading) if last_ping.heading else None,
            "updated_at": last_ping.pinged_at
        }

    data = json.loads(raw)
    return {
        "lat": data["lat"],
        "lng": data["lng"],
        "speed": data["speed"],
        "heading": data["heading"],
        "updated_at": datetime.datetime.fromisoformat(data["updated_at"])
    }
