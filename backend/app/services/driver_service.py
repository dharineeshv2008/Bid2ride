import datetime
import uuid
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.elements import WKTElement

from app.core.exceptions import EntityNotFoundException, ValidationException
from app.services.base import BaseService
from app.models.driver import Passenger, Driver, Vehicle, DriverDocument
from app.models.ride import SavedPlace
from app.repositories.driver_repository import (
    PassengerRepository,
    DriverRepository,
    VehicleRepository,
    DriverDocumentRepository,
)
from app.repositories.ride_repository import SavedPlaceRepository


class SavedPlaceService(BaseService):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self.repo = SavedPlaceRepository(session)

    async def create_saved_place(
        self, passenger_id: uuid.UUID, label: str, address: str, lat: float, lng: float
    ) -> SavedPlace:
        existing = await self.repo.get_by_passenger_and_label(passenger_id, label)
        if existing:
            raise ValidationException("A saved place with this label already exists")
        point_wkt = f"SRID=4326;POINT({lng} {lat})"
        place = await self.repo.create({
            "passenger_id": passenger_id,
            "label": label,
            "address": address,
            "location": WKTElement(point_wkt, srid=4326)
        })
        await self.commit()
        return place


class PassengerService(BaseService):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self.repo = PassengerRepository(session)

    async def get_passenger(self, passenger_id: uuid.UUID) -> Passenger:
        passenger = await self.repo.get(passenger_id)
        if not passenger:
            raise EntityNotFoundException("Passenger profile not found")
        return passenger


class DriverService(BaseService):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self.repo = DriverRepository(session)

    async def get_driver(self, driver_id: uuid.UUID) -> Driver:
        driver = await self.repo.get(driver_id)
        if not driver:
            raise EntityNotFoundException("Driver profile not found")
        return driver

    async def toggle_online_status(self, driver_id: uuid.UUID, status: bool) -> Driver:
        driver = await self.get_driver(driver_id)
        if status and driver.verification_status != "APPROVED":
            raise ValidationException("Driver account must be approved before going online")
        
        if not status:
            # CHECK ACTIVE ASSIGNMENT: Lock offline if driver is currently on an active ride
            from app.repositories.ride_repository import RideAssignmentRepository
            from app.models.ride import RideAssignment
            assign_repo = RideAssignmentRepository(RideAssignment, self.session)
            active = await assign_repo.get_active_driver_assignment(driver_id)
            if active:
                raise ValidationException("Cannot go offline while on an active ride assignment")

        driver.online_status = status
        if not status:
            driver.current_location = None
        driver.last_pinged_at = datetime.datetime.utcnow()
        await self.commit()
        return driver

    async def update_location(self, driver_id: uuid.UUID, lat: float, lng: float, heading: Optional[float] = None) -> Driver:
        driver = await self.get_driver(driver_id)
        if not driver.online_status:
            raise ValidationException("Cannot update location when offline")
        
        point_wkt = f"SRID=4326;POINT({lng} {lat})"
        driver.current_location = WKTElement(point_wkt, srid=4326)
        driver.last_pinged_at = datetime.datetime.utcnow()
        await self.commit()
        return driver

    async def find_nearby_drivers(self, lat: float, lng: float, radius: float = 3000.0) -> List[Tuple[Driver, float]]:
        return await self.repo.find_nearby_online_drivers(lat, lng, radius)

    async def cleanup_stale_heartbeats(self, timeout_seconds: int = 15) -> int:
        """Sets online_status = False for drivers with last_pinged_at older than timeout_seconds."""
        from sqlalchemy import update
        threshold = datetime.datetime.utcnow() - datetime.timedelta(seconds=timeout_seconds)
        stmt = (
            update(Driver)
            .where(
                Driver.online_status == True,
                Driver.last_pinged_at < threshold
            )
            .values(online_status=False)
        )
        res = await self.session.execute(stmt)
        await self.commit()
        return res.rowcount



class VehicleService(BaseService):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self.repo = VehicleRepository(session)
        self.driver_repo = DriverRepository(session)

    async def register_vehicle(self, driver_id: uuid.UUID, vehicle_data: dict) -> Vehicle:
        # Verify driver exists
        driver = await self.driver_repo.get(driver_id)
        if not driver:
            raise EntityNotFoundException("Driver profile not found")

        # Verify plate unique constraint
        existing = await self.repo.get_by_plate(vehicle_data.get("plate_number", ""))
        if existing:
            raise ValidationException("Vehicle with this plate number already registered")

        vehicle_data["driver_id"] = driver_id
        vehicle = await self.repo.create(vehicle_data)
        await self.commit()
        return vehicle

    async def set_active_vehicle(self, driver_id: uuid.UUID, vehicle_id: uuid.UUID) -> Driver:
        driver = await self.driver_repo.get(driver_id)
        if not driver:
            raise EntityNotFoundException("Driver profile not found")

        vehicle = await self.repo.get(vehicle_id)
        if not vehicle or vehicle.driver_id != driver_id:
            raise EntityNotFoundException("Vehicle not found for this driver")

        driver.active_vehicle_id = vehicle_id
        await self.commit()
        return driver


class DriverDocumentService(BaseService):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self.repo = DriverDocumentRepository(session)

    async def upload_document(
        self,
        driver_id: uuid.UUID,
        doc_type: str,
        file_url: str,
        expires_at: datetime.datetime
    ) -> DriverDocument:
        # Enforce expiry constraints
        if expires_at.replace(tzinfo=None) < datetime.datetime.utcnow() + datetime.timedelta(days=30):
            raise ValidationException("Document must be valid for at least 30 days")

        existing = await self.repo.get_driver_doc(driver_id, doc_type)
        if existing:
            # Update existing document
            existing.file_url = file_url
            existing.status = "PENDING"
            existing.expires_at = expires_at
            existing.verified_at = None
            doc = existing
        else:
            doc = await self.repo.create({
                "driver_id": driver_id,
                "document_type": doc_type,
                "file_url": file_url,
                "expires_at": expires_at
            })
        
        await self.commit()
        return doc
