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
        radius_meters: float = 3000.0
    ) -> List[Tuple[Driver, float]]:
        """Queries the database using PostGIS to find online drivers in a specified radius."""
        point = f"SRID=4326;POINT({lng} {lat})"
        geom_wkt = WKTElement(point, srid=4326)

        # Query drivers within radius
        stmt = (
            select(
                Driver,
                ST_Distance(Driver.current_location, geom_wkt).label("distance")
            )
            .options(selectinload(Driver.active_vehicle))
            .where(
                Driver.online_status == True,
                Driver.verification_status == "APPROVED",
                ST_DWithin(Driver.current_location, geom_wkt, radius_meters)
            )
            .order_by(text("distance ASC"))
        )
        
        result = await self.session.execute(stmt)
        rows = result.all()
        return [(row[0], float(row[1])) for row in rows]


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
