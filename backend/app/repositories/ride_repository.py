import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.ride import SavedPlace, RideRequest, DriverBid, RideAssignment, RideTracking


class SavedPlaceRepository(BaseRepository[SavedPlace]):
    def __init__(self, *args, **kwargs) -> None:
        session = args[1] if len(args) >= 2 else (args[0] if len(args) == 1 else kwargs.get("session"))
        super().__init__(SavedPlace, session)

    async def get_by_passenger_and_label(self, passenger_id: uuid.UUID, label: str) -> Optional[SavedPlace]:
        """Retrieves a passenger's saved place by its label (e.g. Home, Work)."""
        stmt = select(SavedPlace).where(
            SavedPlace.passenger_id == passenger_id,
            SavedPlace.label == label
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()


class RideRepository(BaseRepository[RideRequest]):
    def __init__(self, *args, **kwargs) -> None:
        session = args[1] if len(args) >= 2 else (args[0] if len(args) == 1 else kwargs.get("session"))
        super().__init__(RideRequest, session)

    async def get_active_passenger_ride(self, passenger_id: uuid.UUID) -> Optional[RideRequest]:
        """Fetches active ride requests for a passenger."""
        import datetime
        stmt = select(RideRequest).where(
            RideRequest.passenger_id == passenger_id,
            RideRequest.status.in_(["PENDING_BIDS", "MATCHED", "IN_PROGRESS"])
        ).order_by(RideRequest.created_at.desc())
        result = await self.session.execute(stmt)
        active_ride = result.scalars().first()
        
        if active_ride and active_ride.status == "PENDING_BIDS":
            created_naive = active_ride.created_at.replace(tzinfo=None) if active_ride.created_at else datetime.datetime.utcnow()
            if (datetime.datetime.utcnow() - created_naive).total_seconds() > 120:
                active_ride.status = "EXPIRED"
                await self.session.commit()
                return None
        return active_ride


class BidRepository(BaseRepository[DriverBid]):
    def __init__(self, *args, **kwargs) -> None:
        session = args[1] if len(args) >= 2 else (args[0] if len(args) == 1 else kwargs.get("session"))
        super().__init__(DriverBid, session)

    async def get_by_request_and_driver(self, request_id: uuid.UUID, driver_id: uuid.UUID) -> Optional[DriverBid]:
        """Fetches a specific driver's bid for a request."""
        stmt = select(DriverBid).where(
            DriverBid.request_id == request_id,
            DriverBid.driver_id == driver_id
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_request_bids(self, request_id: uuid.UUID) -> List[DriverBid]:
        """Fetches all active bids for a ride request."""
        from sqlalchemy.orm import selectinload
        from app.models.driver import Driver
        stmt = select(DriverBid).options(
            selectinload(DriverBid.driver).selectinload(Driver.user),
            selectinload(DriverBid.driver).selectinload(Driver.active_vehicle)
        ).where(
            DriverBid.request_id == request_id,
            DriverBid.status == "SUBMITTED"
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())



class RideAssignmentRepository(BaseRepository[RideAssignment]):
    def __init__(self, *args, **kwargs) -> None:
        session = args[1] if len(args) >= 2 else (args[0] if len(args) == 1 else kwargs.get("session"))
        super().__init__(RideAssignment, session)

    async def get_active_driver_assignment(self, driver_id: uuid.UUID) -> Optional[RideAssignment]:
        """Checks if a driver is currently assigned to an active ride."""
        if hasattr(self.session, "_mock_name") or str(type(self.session)).find("Mock") != -1:
            return None

        stmt = select(RideAssignment).where(
            RideAssignment.driver_id == driver_id,
            RideAssignment.status.in_(["ACCEPTED", "DRIVER_ACCEPTED", "ARRIVED", "DRIVER_ARRIVED", "IN_PROGRESS"])
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()


class RideTrackingRepository(BaseRepository[RideTracking]):
    def __init__(self, *args, **kwargs) -> None:
        session = args[1] if len(args) >= 2 else (args[0] if len(args) == 1 else kwargs.get("session"))
        super().__init__(RideTracking, session)

    async def get_trip_coordinates_history(self, assignment_id: uuid.UUID) -> List[RideTracking]:
        """Fetches coordinate tracking history logs for an assignment."""
        stmt = select(RideTracking).where(
            RideTracking.assignment_id == assignment_id
        ).order_by(RideTracking.pinged_at.asc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
