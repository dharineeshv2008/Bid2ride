import uuid
from typing import List, Optional, Tuple
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.functions import ST_Distance, ST_DWithin
from geoalchemy2.elements import WKTElement

from app.repositories.base import BaseRepository
from app.models.driver import Passenger, Driver, Vehicle, DriverDocument


class PassengerRepository(BaseRepository[Passenger]):
    def __init__(self, *args, **kwargs) -> None:
        session = args[1] if len(args) >= 2 else (args[0] if len(args) == 1 else kwargs.get("session"))
        super().__init__(Passenger, session)


class DriverRepository(BaseRepository[Driver]):
    def __init__(self, *args, **kwargs) -> None:
        session = args[1] if len(args) >= 2 else (args[0] if len(args) == 1 else kwargs.get("session"))
        super().__init__(Driver, session)

    async def get_by_license(self, license_number: str) -> Optional[Driver]:
        """Retrieves a driver by their driver license number."""
        stmt = select(Driver).where(Driver.license_number == license_number)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def find_nearby_online_drivers(
        self,
        lat: float,
        lng: float,
        radius_meters: float = 50000.0
    ) -> List[Tuple[Driver, float]]:
        """Queries Redis using GEORADIUS to find online drivers in a specified radius."""
        from app.core.redis import redis_manager
        
        if not redis_manager.client:
            return []

        # Find drivers in Redis
        # Returns: [[b'driver_id', b'distance'], ...]
        try:
            results = await redis_manager.client.execute_command(
                "GEORADIUS", "driver_locations", lng, lat, radius_meters, "m", "WITHDIST", "ASC"
            )
        except Exception as e:
            return []

        if not results:
            return []
            
        driver_id_map = {}
        for row in results:
            driver_id_str = row[0].decode('utf-8') if isinstance(row[0], bytes) else row[0]
            distance = float(row[1])
            driver_id_map[uuid.UUID(driver_id_str)] = distance

        driver_ids = list(driver_id_map.keys())
        if not driver_ids:
            return []

        # Fetch active drivers from DB
        from app.models.ride import RideAssignment
        from sqlalchemy import exists, select
        from sqlalchemy.orm import selectinload

        active_assign_exists = exists().where(
            RideAssignment.driver_id == Driver.id,
            RideAssignment.status.in_(["ACCEPTED", "ARRIVED", "IN_PROGRESS"])
        )

        stmt = (
            select(Driver)
            .options(selectinload(Driver.active_vehicle))
            .where(
                Driver.id.in_(driver_ids),
                Driver.online_status == True,
                Driver.verification_status == "APPROVED",
                ~active_assign_exists
            )
        )
        
        db_result = await self.session.execute(stmt)
        drivers = list(db_result.scalars().all())

        # Combine and sort
        combined = []
        for d in drivers:
            dist = driver_id_map.get(d.id, 0.0)
            combined.append((d, dist))

        # Priority sorting: distance (asc), rating (desc), acceptance_rate (desc)
        def sort_key(row):
            driver = row[0]
            dist = row[1]
            rating = float(getattr(driver, "rating", 5.0) or 5.0)
            acc_rate = float(getattr(driver, "acceptance_rate", 100.0) or 100.0)
            return (dist, -rating, -acc_rate)
            
        combined.sort(key=sort_key)
        return combined


class VehicleRepository(BaseRepository[Vehicle]):
    def __init__(self, *args, **kwargs) -> None:
        session = args[1] if len(args) >= 2 else (args[0] if len(args) == 1 else kwargs.get("session"))
        super().__init__(Vehicle, session)

    async def get_by_plate(self, plate_number: str) -> Optional[Vehicle]:
        """Retrieves vehicle record by plate number."""
        stmt = select(Vehicle).where(Vehicle.plate_number == plate_number)
        result = await self.session.execute(stmt)
        return result.scalars().first()


class DriverDocumentRepository(BaseRepository[DriverDocument]):
    def __init__(self, *args, **kwargs) -> None:
        session = args[1] if len(args) >= 2 else (args[0] if len(args) == 1 else kwargs.get("session"))
        super().__init__(DriverDocument, session)

    async def get_driver_doc(self, driver_id: uuid.UUID, doc_type: str) -> Optional[DriverDocument]:
        """Retrieves a specific document type for a driver."""
        stmt = select(DriverDocument).where(
            DriverDocument.driver_id == driver_id,
            DriverDocument.document_type == doc_type
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()
