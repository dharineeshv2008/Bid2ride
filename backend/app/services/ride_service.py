import datetime
import random
import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_DWithin

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

        pickup_wkt = f"SRID=4326;POINT({data['pickup_lng']} {data['pickup_lat']})"
        dropoff_wkt = f"SRID=4326;POINT({data['dropoff_lng']} {data['dropoff_lat']})"

        ride = await self.repo.create({
            "passenger_id": passenger_id,
            "pickup_location": WKTElement(pickup_wkt, srid=4326),
            "pickup_address": data["pickup_address"],
            "dropoff_location": WKTElement(dropoff_wkt, srid=4326),
            "dropoff_address": data["dropoff_address"],
            "budget": data["budget"],
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
        ride = await self.ride_repo.get(request_id)
        if not ride or ride.passenger_id != passenger_id or ride.status != "PENDING_BIDS":
            raise ValidationException("Ride request not eligible for assignment")

        bid = await self.bid_repo.get(bid_id)
        if not bid or bid.request_id != request_id or bid.status != "SUBMITTED":
            raise ValidationException("Selected driver bid is invalid or expired")

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

    async def verify_pickup_otp(self, driver_id: uuid.UUID, assignment_id: uuid.UUID, otp: str) -> RideAssignment:
        assignment = await self.repo.get(assignment_id)
        if not assignment or assignment.driver_id != driver_id:
            raise EntityNotFoundException("Ride assignment not found")

        if assignment.status not in ["ACCEPTED", "DRIVER_ACCEPTED", "ARRIVED", "DRIVER_ARRIVED"]:
            raise ValidationException("Ride cannot be started from the current state")

        # Geofencing check: Enforce driver is within 100 meters
        driver = await self.driver_repo.get(driver_id)
        ride = await self.ride_repo.get(assignment.request_id)
        
        # Build geofence validation select
        geofence_stmt = select(ST_DWithin(driver.current_location, ride.pickup_location, 100.0))
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

    async def complete_ride(self, driver_id: uuid.UUID, assignment_id: uuid.UUID) -> RideAssignment:
        assignment = await self.repo.get(assignment_id)
        if not assignment or assignment.driver_id != driver_id or assignment.status != "IN_PROGRESS":
            raise ValidationException("Assignment is not currently in progress")

        # Update assignment and request states
        assignment.status = "COMPLETED"
        assignment.ended_at = datetime.datetime.utcnow()
        
        ride = await self.ride_repo.get(assignment.request_id)
        ride.status = "COMPLETED"

        await self.commit()
        return assignment


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
