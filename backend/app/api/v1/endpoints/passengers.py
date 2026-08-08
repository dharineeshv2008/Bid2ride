import uuid
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.shape import to_shape

from app.core.exceptions import PermissionDeniedException, EntityNotFoundException
from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user, RoleRequired
from app.models.user import User
from app.models.ride import SavedPlace, RideRequest, DriverBid
from app.schemas.passenger import (
    PassengerProfileResponse,
    PassengerProfileUpdateRequest,
    SavedPlaceCreateRequest,
    SavedPlaceUpdateRequest,
    SavedPlaceResponse,
    RideRequestCreateRequest,
    RideRequestResponse,
    RideHistoryResponse,
    BidResponse,
    RideCancellationRequest,
)
from app.services.driver_service import PassengerService, SavedPlaceService
from app.services.ride_service import RideService, BidService, RideAssignmentService
from app.repositories.ride_repository import SavedPlaceRepository, BidRepository

router = APIRouter()

# Enforce RBAC validation for Passenger roles
passenger_role_dependency = Depends(RoleRequired(allowed_roles=["PASSENGER"]))


def _geom_to_coords(geom: Any) -> tuple[float, float]:
    """Helper to safely extract lat/lng floats from GeoAlchemy2 geometries."""
    if geom is None:
        return 0.0, 0.0
    try:
        shape = to_shape(geom)
        return float(shape.y), float(shape.x)
    except Exception:
        pass

    try:
        str_val = str(geom)
        if "POINT" in str_val:
            point_part = str_val.split("POINT")[1]
            coords_str = point_part.strip().lstrip("(").rstrip(")").rstrip("'").rstrip('"').split()
            return float(coords_str[1]), float(coords_str[0])
    except Exception:
        pass
    return 0.0, 0.0


# =====================================================================
# 1. PROFILE ENDPOINTS
# =====================================================================

@router.get("/profile", response_model=PassengerProfileResponse)
async def get_passenger_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=passenger_role_dependency
) -> dict:
    """Retrieves passenger ratings and profile attributes."""
    psg_service = PassengerService(db)
    passenger = await psg_service.get_passenger(current_user.id)
    return {
        "id": current_user.id,
        "phone": current_user.phone,
        "email": current_user.email,
        "name": current_user.name,
        "rating": float(passenger.rating),
        "rating_count": passenger.rating_count
    }


@router.put("/profile", response_model=PassengerProfileResponse)
async def update_passenger_profile(
    payload: PassengerProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=passenger_role_dependency
) -> dict:
    """Updates passenger profile details."""
    psg_service = PassengerService(db)
    passenger = await psg_service.get_passenger(current_user.id)

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
        "rating": float(passenger.rating),
        "rating_count": passenger.rating_count
    }


# =====================================================================
# 2. SAVED PLACES ENDPOINTS
# =====================================================================

@router.get("/saved-places", response_model=List[SavedPlaceResponse])
async def list_saved_places(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=passenger_role_dependency
) -> List[dict]:
    """Lists saved locations for the passenger."""
    repo = SavedPlaceRepository(SavedPlace, db)
    places = await repo.get_multi(filters={"passenger_id": current_user.id})
    
    response = []
    for place in places:
        lat, lng = _geom_to_coords(place.location)
        response.append({
            "id": place.id,
            "label": place.label,
            "address": place.address,
            "lat": lat,
            "lng": lng
        })
    return response


@router.get("/drivers/nearby", response_model=List[dict])
async def list_nearby_online_drivers(
    lat: float = 12.9716,
    lng: float = 77.5946,
    radius: float = 50000.0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=passenger_role_dependency
) -> List[dict]:
    """Queries 50 KM PostGIS spatial radius for online approved drivers."""
    from sqlalchemy import select
    from geoalchemy2.elements import WKTElement
    from geoalchemy2.functions import ST_DWithin
    from sqlalchemy.orm import selectinload
    from app.models.driver import Driver
    import datetime

    point = f"SRID=4326;POINT({lng} {lat})"
    geom_wkt = WKTElement(point, srid=4326)

    stmt = (
        select(Driver)
        .options(selectinload(Driver.active_vehicle), selectinload(Driver.user))
        .where(
            Driver.online_status == True,
            Driver.verification_status == "APPROVED",
            Driver.current_location.isnot(None),
            ST_DWithin(Driver.current_location, geom_wkt, radius)
        )
        .order_by(Driver.rating.desc())
        .limit(50)
    )

    result = await db.execute(stmt)
    drivers = result.scalars().all()

    response = []
    for d in drivers:
        d_lat, d_lng = _geom_to_coords(d.current_location)
        if d_lat == 0.0 and d_lng == 0.0:
            continue

        vehicle_desc = "Standard Vehicle"
        if d.active_vehicle:
            v = d.active_vehicle
            vehicle_desc = f"{v.color} {v.make} {v.model} ({v.plate_number})"

        response.append({
            "driver_id": str(d.id),
            "name": d.user.name if d.user else "Driver Pilot",
            "rating": float(d.rating),
            "rating_count": d.rating_count,
            "lat": d_lat,
            "lng": d_lng,
            "vehicle_details": vehicle_desc,
            "category": d.active_vehicle.category if d.active_vehicle else "ECONOMY",
            "online_status": d.online_status
        })

    return response


@router.post("/saved-places", response_model=SavedPlaceResponse, status_code=status.HTTP_201_CREATED)
async def create_saved_place(
    payload: SavedPlaceCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=passenger_role_dependency
) -> dict:
    """Creates a new saved place."""
    place_service = SavedPlaceService(db)
    place = await place_service.create_saved_place(
        passenger_id=current_user.id,
        label=payload.label,
        address=payload.address,
        lat=payload.lat,
        lng=payload.lng
    )
    lat, lng = _geom_to_coords(place.location)
    return {
        "id": place.id,
        "label": place.label,
        "address": place.address,
        "lat": lat,
        "lng": lng
    }


@router.put("/saved-places/{id}", response_model=SavedPlaceResponse)
async def update_saved_place(
    id: uuid.UUID,
    payload: SavedPlaceUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=passenger_role_dependency
) -> dict:
    """Updates coordinates or labels of a saved place."""
    repo = SavedPlaceRepository(SavedPlace, db)
    place = await repo.get(id)
    
    if not place or place.passenger_id != current_user.id:
        raise EntityNotFoundException("Saved place not found")

    update_data = {}
    if payload.label is not None:
        update_data["label"] = payload.label
    if payload.address is not None:
        update_data["address"] = payload.address
    if payload.lat is not None and payload.lng is not None:
        from geoalchemy2.elements import WKTElement
        update_data["location"] = WKTElement(f"SRID=4326;POINT({payload.lng} {payload.lat})", srid=4326)

    await repo.update(place, update_data)
    await db.commit()
    
    lat, lng = _geom_to_coords(place.location)
    return {
        "id": place.id,
        "label": place.label,
        "address": place.address,
        "lat": lat,
        "lng": lng
    }


@router.delete("/saved-places/{id}", status_code=status.HTTP_200_OK)
async def delete_saved_place(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=passenger_role_dependency
) -> dict:
    """Deletes a saved place."""
    repo = SavedPlaceRepository(SavedPlace, db)
    place = await repo.get(id)
    
    if not place or place.passenger_id != current_user.id:
        raise EntityNotFoundException("Saved place not found")

    await repo.delete(id)
    await db.commit()
    return {"status": "success", "message": "Saved place deleted successfully"}


# =====================================================================
# 3. RIDE REQUESTS & AUCTIONS ENDPOINTS
# =====================================================================

@router.post("/rides", response_model=RideRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_ride_request(
    payload: RideRequestCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=passenger_role_dependency
) -> dict:
    """Creates a new ride request and triggers driver bidding notifications."""
    from app.repositories.ride_repository import RideRepository
    from app.core.exceptions import ValidationException
    repo = RideRepository(RideRequest, db)
    active = await repo.get_active_passenger_ride(current_user.id)
    if active:
        raise ValidationException("Passenger already has an active ride request in progress.")

    effective_budget = payload.budget if payload.budget is not None else (payload.target_budget if payload.target_budget is not None else 100.0)
    effective_category = payload.category or payload.vehicle_category or "SEDAN"

    ride_service = RideService(db)
    ride = await ride_service.create_ride_request(
        passenger_id=current_user.id,
        data={
            "pickup_address": payload.pickup_address,
            "pickup_lat": payload.pickup_lat,
            "pickup_lng": payload.pickup_lng,
            "dropoff_address": payload.dropoff_address,
            "dropoff_lat": payload.dropoff_lat,
            "dropoff_lng": payload.dropoff_lng,
            "budget": effective_budget,
            "category": effective_category
        }
    )

    # Broadcast to nearby online compatible drivers
    from app.services.socket_service import broadcast_new_ride_request
    await broadcast_new_ride_request(
        ride_request_id=ride.id,
        lat=payload.pickup_lat,
        lng=payload.pickup_lng,
        budget=effective_budget,
        category=effective_category
    )

    pickup_lat, pickup_lng = _geom_to_coords(ride.pickup_location)
    dropoff_lat, dropoff_lng = _geom_to_coords(ride.dropoff_location)
    return {
        "id": ride.id,
        "pickup_address": ride.pickup_address,
        "pickup_lat": pickup_lat,
        "pickup_lng": pickup_lng,
        "dropoff_address": ride.dropoff_address,
        "dropoff_lat": dropoff_lat,
        "dropoff_lng": dropoff_lng,
        "budget": float(ride.budget),
        "category": ride.category,
        "status": ride.status,
        "created_at": ride.created_at
    }



@router.get("/active-ride", response_model=Optional[RideRequestResponse])
async def get_active_ride(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=passenger_role_dependency
) -> Optional[dict]:
    """Retrieves current active ride request for the passenger, if any."""
    from app.repositories.ride_repository import RideRepository
    repo = RideRepository(RideRequest, db)
    active = await repo.get_active_passenger_ride(current_user.id)
    if not active:
        return None

    pickup_lat, pickup_lng = _geom_to_coords(active.pickup_location)
    dropoff_lat, dropoff_lng = _geom_to_coords(active.dropoff_location)
    return {
        "id": active.id,
        "pickup_address": active.pickup_address,
        "pickup_lat": pickup_lat,
        "pickup_lng": pickup_lng,
        "dropoff_address": active.dropoff_address,
        "dropoff_lat": dropoff_lat,
        "dropoff_lng": dropoff_lng,
        "budget": float(active.budget),
        "category": active.category,
        "status": active.status,
        "created_at": active.created_at
    }


@router.get("/rides", response_model=RideHistoryResponse)
async def list_ride_history(
    skip: int = 0,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=passenger_role_dependency
) -> dict:
    """Fetches paginated ride requests for the passenger."""
    from app.repositories.ride_repository import RideRepository
    repo = RideRepository(RideRequest, db)
    
    # Get total count
    filters = {"passenger_id": current_user.id}
    total = await repo.count(filters=filters)
    
    # Get items
    rides = await repo.get_multi(
        skip=skip,
        limit=limit,
        filters=filters,
        sort_by="created_at",
        sort_desc=True
    )
    
    items_response = []
    for r in rides:
        pickup_lat, pickup_lng = _geom_to_coords(r.pickup_location)
        dropoff_lat, dropoff_lng = _geom_to_coords(r.dropoff_location)
        items_response.append({
            "id": r.id,
            "pickup_address": r.pickup_address,
            "pickup_lat": pickup_lat,
            "pickup_lng": pickup_lng,
            "dropoff_address": r.dropoff_address,
            "dropoff_lat": dropoff_lat,
            "dropoff_lng": dropoff_lng,
            "budget": float(r.budget),
            "category": r.category,
            "status": r.status,
            "created_at": r.created_at
        })
    return {"total_count": total, "items": items_response}


@router.get("/rides/{ride_id}", response_model=RideRequestResponse)
async def get_ride_details(
    ride_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=passenger_role_dependency
) -> dict:
    """Fetches details for a specific ride (verifies ownership)."""
    from app.repositories.ride_repository import RideRepository
    repo = RideRepository(RideRequest, db)
    ride = await repo.get(ride_id)
    
    if not ride or ride.passenger_id != current_user.id:
        raise EntityNotFoundException("Ride request not found")

    pickup_lat, pickup_lng = _geom_to_coords(ride.pickup_location)
    dropoff_lat, dropoff_lng = _geom_to_coords(ride.dropoff_location)
    return {
        "id": ride.id,
        "pickup_address": ride.pickup_address,
        "pickup_lat": pickup_lat,
        "pickup_lng": pickup_lng,
        "dropoff_address": ride.dropoff_address,
        "dropoff_lat": dropoff_lat,
        "dropoff_lng": dropoff_lng,
        "budget": float(ride.budget),
        "category": ride.category,
        "status": ride.status,
        "created_at": ride.created_at
    }


@router.get("/rides/{ride_id}/bids", response_model=List[BidResponse])
async def list_ride_bids(
    ride_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=passenger_role_dependency
) -> List[dict]:
    """Fetches active bids for a ride request (verifies ownership)."""
    from app.repositories.ride_repository import RideRepository
    ride_repo = RideRepository(RideRequest, db)
    ride = await ride_repo.get(ride_id)
    
    if not ride or ride.passenger_id != current_user.id:
        raise EntityNotFoundException("Ride request not found")

    bid_repo = BidRepository(db)
    bids = await bid_repo.get_request_bids(ride_id)
    
    response = []
    for bid in bids:
        # Load associated driver/user profiles manually to satisfy DB contract separation
        driver = bid.driver
        driver_user = driver.user
        vehicle_desc = "Standard Vehicle"
        
        # Load active vehicle description
        if driver.active_vehicle:
            v = driver.active_vehicle
            vehicle_desc = f"{v.make} {v.model} ({v.color} - {v.plate_number})"

        response.append({
            "id": bid.id,
            "bid_id": bid.id,
            "driver_name": driver_user.name,
            "driver_rating": float(driver.rating),
            "vehicle_details": vehicle_desc,
            "vehicle_model": vehicle_desc,
            "amount": float(bid.amount),
            "bid_amount": float(bid.amount),
            "eta_minutes": bid.eta_minutes
        })
    return response


@router.post("/rides/{ride_id}/accept-bid", status_code=status.HTTP_200_OK)
async def accept_driver_bid(
    ride_id: uuid.UUID,
    bid_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=passenger_role_dependency
) -> dict:
    """Accepts a driver bid and assigns the trip (locks request and auto-rejects other bids)."""
    # Fetch active bids before committing acceptance to identify rejected drivers
    bid_repo = BidRepository(db)
    bids = await bid_repo.get_request_bids(ride_id)
    rejected_drivers = [b.driver_id for b in bids if b.id != bid_id]

    assign_service = RideAssignmentService(db)
    assignment = await assign_service.accept_bid(
        passenger_id=current_user.id,
        request_id=ride_id,
        bid_id=bid_id
    )

    # Dispatch Socket.IO alerts to chosen and rejected drivers
    from app.services.socket_service import broadcast_bid_acceptance
    await broadcast_bid_acceptance(
        ride_id=ride_id,
        accepted_driver_id=assignment.driver_id,
        assignment_id=assignment.id,
        otp=assignment.otp,
        price=assignment.price_charged,
        rejected_driver_ids=rejected_drivers
    )

    return {
        "status": "success",
        "data": {
            "id": assignment.id,
            "assignment_id": assignment.id,
            "otp": assignment.otp,
            "price": float(assignment.price_charged)
        }
    }


@router.post("/bids/{bid_id}/accept", status_code=status.HTTP_200_OK)
async def accept_bid_direct(
    bid_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=passenger_role_dependency
) -> dict:
    """Direct bid acceptance route by bid_id."""
    from app.models.ride import DriverBid
    from app.repositories.ride_repository import BidRepository
    bid_repo = BidRepository(DriverBid, db)
    bid = await bid_repo.get(bid_id)
    if not bid:
        raise EntityNotFoundException("Bid not found")
    
    return await accept_driver_bid(ride_id=bid.request_id, bid_id=bid_id, current_user=current_user, db=db)



@router.post("/rides/{ride_id}/cancel", status_code=status.HTTP_200_OK)
async def cancel_ride_request(
    ride_id: uuid.UUID,
    payload: RideCancellationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=passenger_role_dependency
) -> dict:
    """Cancels an active ride request (verifies ownership)."""
    from app.repositories.ride_repository import RideRepository
    repo = RideRepository(RideRequest, db)
    ride = await repo.get(ride_id)
    
    if not ride or ride.passenger_id != current_user.id:
        raise EntityNotFoundException("Ride request not found")

    if ride.status not in ["PENDING_BIDS", "MATCHED"]:
        raise PermissionDeniedException("Ride request cannot be cancelled from the current state")

    ride.status = "CANCELLED"
    await db.commit()
    return {"status": "success", "message": "Ride request cancelled successfully"}
