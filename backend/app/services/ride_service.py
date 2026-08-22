import datetime
import random
import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_DWithin

from app.core.logging import logger
from app.core.exceptions import EntityNotFoundException, ValidationException, GeofenceException
from app.services.base import BaseService
from app.models.ride import SavedPlace, RideRequest, DriverBid, RideAssignment, RideTracking
from app.repositories.ride_repository import (
    SavedPlaceRepository,
    RideRepository,
    BidRepository,
    RideAssignmentRepository,
    RideTrackingRepository,
)
from app.repositories.driver_repository import DriverRepository


VALID_STATE_TRANSITIONS = {
    "PENDING_BIDS": ["MATCHED", "ACCEPTED", "EXPIRED", "CANCELLED"],
    "MATCHED": ["ACCEPTED", "DRIVER_ACCEPTED", "CANCELLED"],
    "ACCEPTED": ["DRIVER_ACCEPTED", "DRIVER_ARRIVED", "ARRIVED", "CANCELLED"],
    "DRIVER_ACCEPTED": ["DRIVER_ARRIVED", "ARRIVED", "CANCELLED"],
    "ARRIVED": ["IN_PROGRESS", "CANCELLED"],
    "DRIVER_ARRIVED": ["IN_PROGRESS", "CANCELLED"],
    "IN_PROGRESS": ["COMPLETED"],
    "COMPLETED": [],
    "CANCELLED": [],
    "EXPIRED": [],
}


def validate_ride_state_transition(current_status: str, new_status: str) -> None:
    """Enforces strict state machine transitions across ride lifecycle."""
    if current_status == new_status:
        return  # Idempotent same-state update
    allowed = VALID_STATE_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        logger.warning(f"[STATE MACHINE VIOLATION] Rejected transition: {current_status} -> {new_status}")
        raise ValidationException(f"Invalid state transition from '{current_status}' to '{new_status}'")



class SavedPlaceService(BaseService):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self.repo = SavedPlaceRepository(session)

    async def create_saved_place(
        self,
        passenger_id: uuid.UUID,
        label: str,
        address: str,
        lat: float,
        lng: float
    ) -> SavedPlace:
        existing = await self.repo.get_by_passenger_and_label(passenger_id, label)
        point_wkt = f"SRID=4326;POINT({lng} {lat})"
        
        if existing:
            existing.address = address
            existing.location = WKTElement(point_wkt, srid=4326)
            place = existing
        else:
            place = await self.repo.create({
                "passenger_id": passenger_id,
                "label": label,
                "address": address,
                "location": WKTElement(point_wkt, srid=4326)
            })
        await self.commit()
        return place


class RideService(BaseService):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self.repo = RideRepository(session)

    async def create_ride_request(self, passenger_id: uuid.UUID, data: dict) -> RideRequest:
        # Check active requests to prevent concurrent bookings
        active = await self.repo.get_active_passenger_ride(passenger_id)
        if active:
            raise ValidationException("Passenger already has an active ride request")

        # Surge pricing multiplier calculation
        from sqlalchemy import func, select
        from app.models.driver import Driver
        from app.models.ride import RideRequest as RideRequestModel

        active_reqs_stmt = select(func.count(RideRequestModel.id)).where(RideRequestModel.status == "PENDING_BIDS")
        active_reqs_count = (await self.session.execute(active_reqs_stmt)).scalar() or 0

        online_drivers_stmt = select(func.count(Driver.id)).where(Driver.online_status == True)
        online_drivers_count = (await self.session.execute(online_drivers_stmt)).scalar() or 0

        surge_multiplier = 1.0
        if online_drivers_count == 0:
            if active_reqs_count > 0:
                surge_multiplier = 1.5
        else:
            ratio = active_reqs_count / online_drivers_count
            if ratio > 1.0:
                surge_multiplier = round(min(2.5, 1.0 + (ratio - 1.0) * 0.3), 2)

        original_budget = float(data["budget"])
        surged_budget = original_budget * surge_multiplier
        logger.info(f"[SURGE PRICING] Active: {active_reqs_count}, Online Drivers: {online_drivers_count}, Multiplier: {surge_multiplier}x, Original: {original_budget}, Surged: {surged_budget}")

        pickup_wkt = f"SRID=4326;POINT({data['pickup_lng']} {data['pickup_lat']})"
        dropoff_wkt = f"SRID=4326;POINT({data['dropoff_lng']} {data['dropoff_lat']})"

        ride = await self.repo.create({
            "passenger_id": passenger_id,
            "pickup_location": WKTElement(pickup_wkt, srid=4326),
            "pickup_address": data["pickup_address"],
            "dropoff_location": WKTElement(dropoff_wkt, srid=4326),
            "dropoff_address": data["dropoff_address"],
            "budget": surged_budget,
            "category": data["category"],
            "status": "PENDING_BIDS"
        })
        await self.commit()
        return ride


class BidService(BaseService):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self.repo = BidRepository(session)
        self.ride_repo = RideRepository(session)

    async def submit_bid(self, driver_id: uuid.UUID, request_id: uuid.UUID, amount: float, eta_minutes: int) -> DriverBid:
        # Check active assignment to prevent bidding when already assigned
        from app.repositories.ride_repository import RideAssignmentRepository
        from app.models.ride import RideAssignment
        assign_repo = RideAssignmentRepository(RideAssignment, self.session)
        active_assignment = await assign_repo.get_active_driver_assignment(driver_id)
        if active_assignment:
            raise ValidationException("Driver is already assigned to another active ride")

        ride = await self.ride_repo.get(request_id)
        if not ride or ride.status != "PENDING_BIDS":
            raise ValidationException("Bidding is closed for this ride request")

        # Business Constraint: Validate bid is within -10% to +50% of budget
        min_bid = float(ride.budget) * 0.9
        max_bid = float(ride.budget) * 1.5
        if float(amount) < min_bid or float(amount) > max_bid:
            raise ValidationException(
                f"Bid must be within range ${min_bid:.2f} - ${max_bid:.2f} based on passenger budget"
            )

        existing = await self.repo.get_by_request_and_driver(request_id, driver_id)
        if existing:
            existing.amount = amount
            existing.eta_minutes = eta_minutes
            existing.status = "SUBMITTED"
            bid = existing
        else:
            bid = await self.repo.create({
                "request_id": request_id,
                "driver_id": driver_id,
                "amount": amount,
                "eta_minutes": eta_minutes,
                "status": "SUBMITTED"
            })
        
        await self.commit()
        return bid


class RideAssignmentService(BaseService):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self.repo = RideAssignmentRepository(session)
        self.ride_repo = RideRepository(session)
        self.bid_repo = BidRepository(session)
        self.driver_repo = DriverRepository(session)

    async def accept_bid(self, passenger_id: uuid.UUID, request_id: uuid.UUID, bid_id: uuid.UUID) -> RideAssignment:
        try:
            ride = await self.ride_repo.get(request_id, for_update=True)
            if not ride or ride.passenger_id != passenger_id:
                raise ValidationException("Ride request not eligible for assignment")

            # IDEMPOTENCY CHECK: If already matched/accepted, return existing assignment
            if ride.status in ["MATCHED", "ACCEPTED"]:
                stmt = select(RideAssignment).where(RideAssignment.request_id == request_id)
                res = await self.session.execute(stmt)
                existing_assignment = res.scalars().first()
                if existing_assignment:
                    logger.info(f"[IDEMPOTENT ACCEPT] Ride {request_id} already matched/accepted. Returning existing assignment.")
                    return existing_assignment

            validate_ride_state_transition(ride.status, "MATCHED")

            bid = await self.bid_repo.get(bid_id)
            if not bid or bid.request_id != request_id or bid.status != "SUBMITTED":
                raise ValidationException("Selected driver bid is invalid or expired")

            # Check if driver is already busy with an active assignment
            active_assignment = await self.repo.get_active_driver_assignment(bid.driver_id)
            if active_assignment:
                raise ValidationException("Driver is already assigned to another active ride")

            # Generate a random 4-digit OTP code
            otp = f"{random.randint(1000, 9999)}"

            # Close out ride request and accept bid
            ride.status = "MATCHED"
            bid.status = "ACCEPTED"

            # Auto-expire remaining bids
            other_bids = await self.bid_repo.get_request_bids(request_id)
            for b in other_bids:
                if b.id != bid_id:
                    b.status = "EXPIRED"

            assignment = await self.repo.create({
                "request_id": request_id,
                "driver_id": bid.driver_id,
                "chosen_bid_id": bid.id,
                "otp": otp,
                "status": "ACCEPTED",
                "price_charged": bid.amount
            })
            
            await self.commit()
            return assignment
        except Exception as e:
            await self.session.rollback()
            raise e

    async def verify_pickup_otp(self, driver_id: uuid.UUID, assignment_id: uuid.UUID, otp: str) -> RideAssignment:
        try:
            assignment = await self.repo.get(assignment_id)
            if not assignment or assignment.driver_id != driver_id:
                raise EntityNotFoundException("Ride assignment not found")

            validate_ride_state_transition(assignment.status, "IN_PROGRESS")

            # Geofencing check: Enforce driver is within 100 meters
            driver = await self.driver_repo.get(driver_id)
            ride = await self.ride_repo.get(assignment.request_id)
            
            PICKUP_RADIUS = 100.0
            
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

            def get_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
                import math
                R = 6371000.0  # Earth radius in meters
                phi1, phi2 = math.radians(lat1), math.radians(lat2)
                dphi, dlamb = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
                a = (math.sin(dphi / 2.0) ** 2.0 +
                     math.cos(phi1) * math.cos(phi2) * (math.sin(dlamb / 2.0) ** 2.0))
                return R * 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

            driver_lat, driver_lng = get_coords(driver.current_location)
            pickup_lat, pickup_lng = get_coords(ride.pickup_location)

            if (driver_lat != 0.0 or driver_lng != 0.0) and (pickup_lat != 0.0 or pickup_lng != 0.0):
                is_within_geofence = get_distance(driver_lat, driver_lng, pickup_lat, pickup_lng) <= PICKUP_RADIUS
            else:
                from geoalchemy2.functions import ST_DWithin
                from geoalchemy2 import Geography
                from sqlalchemy import cast, select
                geofence_stmt = select(
                    ST_DWithin(
                        cast(driver.current_location, Geography),
                        cast(ride.pickup_location, Geography),
                        PICKUP_RADIUS
                    )
                )
                is_within_geofence = (await self.session.execute(geofence_stmt)).scalar()

            if not is_within_geofence:
                raise GeofenceException("Driver is not within 100 meters pickup geofence")

            if assignment.otp != otp:
                raise ValidationException("Invalid verification OTP code")

            assignment.status = "IN_PROGRESS"
            assignment.started_at = datetime.datetime.utcnow()
            ride.status = "IN_PROGRESS"
            await self.commit()
            return assignment
        except Exception as e:
            await self.session.rollback()
            raise e

    async def complete_ride(self, driver_id: uuid.UUID, assignment_id: uuid.UUID) -> RideAssignment:
        try:
            assignment = await self.repo.get(assignment_id)
            if not assignment or assignment.driver_id != driver_id:
                raise ValidationException("Assignment not found or driver mismatched")

            # IDEMPOTENCY CHECK: If already COMPLETED, return existing completed assignment
            if assignment.status == "COMPLETED":
                logger.info(f"[IDEMPOTENT COMPLETE] Ride assignment {assignment_id} already COMPLETED. Returning record.")
                return assignment

            validate_ride_state_transition(assignment.status, "COMPLETED")

            # Update assignment and request states
            assignment.status = "COMPLETED"
            assignment.ended_at = datetime.datetime.utcnow()
            
            ride = await self.ride_repo.get(assignment.request_id)
            ride.status = "COMPLETED"

            await self.commit()
            return assignment
        except Exception as e:
            await self.session.rollback()
            raise e


class RideTrackingService(BaseService):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self.repo = RideTrackingRepository(session)

    async def record_location_ping(
        self,
        assignment_id: uuid.UUID,
        lat: float,
        lng: float,
        speed: Optional[float] = None,
        heading: Optional[float] = None
    ) -> RideTracking:
        point_wkt = f"SRID=4326;POINT({lng} {lat})"
        
        tracking = await self.repo.create({
            "assignment_id": assignment_id,
            "location": WKTElement(point_wkt, srid=4326),
            "speed": speed,
            "heading": heading
        })
        await self.commit()
        return tracking
