import uuid
from typing import Any, Dict, Optional, List
import socketio
from socketio.exceptions import ConnectionRefusedError
from app.core.database import SessionLocal as async_session_maker
from app.core.logging import logger
from app.core.security import decode_token
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.repositories.driver_repository import DriverRepository
from app.services.driver_service import DriverService
from app.services.ride_service import BidService, RideAssignmentService
from app.repositories.ride_repository import BidRepository

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")


@sio.event
async def connect(sid: str, environ: Dict[str, Any], auth: Optional[Dict[str, Any]] = None) -> None:
    """Authenticates socket connections using JWT and assigns room categories by role."""
    if not auth or "token" not in auth:
        logger.error("Connection refused: missing auth token", sid=sid)
        raise ConnectionRefusedError("Authentication token is required")

    token = auth["token"]
    try:
        payload = decode_token(token)
    except ValueError as e:
        logger.error("Connection refused: invalid JWT signature", sid=sid, error=str(e))
        raise ConnectionRefusedError("Invalid or expired authentication token")

    sub = payload.get("sub")
    role = payload.get("role")
    if not sub or not role:
        raise ConnectionRefusedError("Invalid token claims")

    user_id = uuid.UUID(sub)

    # Verify user profile in database
    async with async_session_maker() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            raise ConnectionRefusedError("User account is inactive or not found")

        # Save session context variables
        await sio.save_session(sid, {"user_id": str(user_id), "role": role})

        # Route connections into respective room namespaces
        if role == "PASSENGER":
            await sio.enter_room(sid, f"passenger:{user_id}")
            logger.info("Passenger connected", sid=sid, passenger_id=user_id)
        elif role == "DRIVER":
            await sio.enter_room(sid, f"driver:{user_id}")
            
            # Check online status from driver profile
            driver_service = DriverService(session)
            driver = await driver_service.get_driver(user_id)
            if driver.online_status:
                await sio.enter_room(sid, "online_drivers")
                logger.info("Online driver connected", sid=sid, driver_id=user_id)
            else:
                logger.info("Offline driver connected", sid=sid, driver_id=user_id)


@sio.event
async def disconnect(sid: str) -> None:
    """Performs session cleanup on socket disconnection."""
    session = await sio.get_session(sid)
    if session:
        user_id = session.get("user_id")
        role = session.get("role")
        logger.info("Socket disconnected", sid=sid, user_id=user_id, role=role)


# =====================================================================
# RIDE ROOM MANAGEMENT & EVENT CHANNELS
# =====================================================================

@sio.event
async def join_ride_room(sid: str, data: Dict[str, Any]) -> None:
    """Enables passengers and drivers to track ride updates on a specific channel."""
    ride_id = data.get("ride_id")
    if not ride_id:
        await sio.emit("error", {"message": "ride_id is required"}, to=sid)
        return

    session = await sio.get_session(sid)
    user_id = session.get("user_id")
    
    await sio.enter_room(sid, f"ride:{ride_id}")
    logger.info("Socket joined ride room", sid=sid, user_id=user_id, ride_id=ride_id)


@sio.event
async def submit_bid(sid: str, data: Dict[str, Any]) -> None:
    """Allows online verified pilots to submit or update bid values."""
    session = await sio.get_session(sid)
    role = session.get("role")
    driver_id_str = session.get("user_id")

    if role != "DRIVER" or not driver_id_str:
        await sio.emit("error", {"message": "Unauthorized. Driver role required."}, to=sid)
        return

    ride_id_str = data.get("ride_id")
    amount = data.get("amount")
    eta_minutes = data.get("eta_minutes")

    if not ride_id_str or amount is None or eta_minutes is None:
        await sio.emit("error", {"message": "Invalid bid parameters"}, to=sid)
        return

    driver_id = uuid.UUID(driver_id_str)
    ride_id = uuid.UUID(ride_id_str)

    async with async_session_maker() as db_session:
        try:
            bid_service = BidService(db_session)
            bid = await bid_service.submit_bid(
                driver_id=driver_id,
                request_id=ride_id,
                amount=float(amount),
                eta_minutes=int(eta_minutes)
            )

            # Load driver details for passenger updates
            driver_service = DriverService(db_session)
            driver = await driver_service.get_driver(driver_id)
            driver_user = driver.user
            vehicle_desc = "Standard Vehicle"
            if driver.active_vehicle:
                v = driver.active_vehicle
                vehicle_desc = f"{v.make} {v.model} ({v.color} - {v.plate_number})"

            # Broadcast new bid details to the passenger ride room
            payload = {
                "bid_id": str(bid.id),
                "driver_name": driver_user.name,
                "driver_rating": float(driver.rating),
                "vehicle_details": vehicle_desc,
                "amount": float(bid.amount),
                "eta_minutes": bid.eta_minutes
            }
            await sio.emit("bid_received", payload, room=f"ride:{ride_id}")
            logger.info("Driver bid broadcast completed", ride_id=ride_id, driver_id=driver_id, amount=amount)

        except Exception as e:
            await sio.emit("error", {"message": str(e)}, to=sid)


@sio.event
async def withdraw_bid(sid: str, data: Dict[str, Any]) -> None:
    """Allows drivers to withdraw active bids."""
    session = await sio.get_session(sid)
    driver_id_str = session.get("user_id")
    role = session.get("role")

    if role != "DRIVER" or not driver_id_str:
        await sio.emit("error", {"message": "Unauthorized. Driver role required."}, to=sid)
        return

    ride_id_str = data.get("ride_id")
    if not ride_id_str:
        await sio.emit("error", {"message": "ride_id is required"}, to=sid)
        return

    driver_id = uuid.UUID(driver_id_str)
    ride_id = uuid.UUID(ride_id_str)

    async with async_session_maker() as db_session:
        try:
            bid_repo = BidRepository(db_session)
            existing = await bid_repo.get_by_request_and_driver(ride_id, driver_id)
            
            if not existing or existing.status != "SUBMITTED":
                await sio.emit("error", {"message": "No active bid found to withdraw"}, to=sid)
                return

            # Cancel bid status
            existing.status = "WITHDRAWN"
            await db_session.commit()

            # Broadcast withdrawal to Passenger room
            await sio.emit("bid_removed", {"bid_id": str(existing.id)}, room=f"ride:{ride_id}")
            logger.info("Driver bid withdrawn", ride_id=ride_id, driver_id=driver_id)
        except Exception as e:
            await sio.emit("error", {"message": str(e)}, to=sid)


# =====================================================================
# RIDE DISCOVERY DISPATCH BROADCASTS
# =====================================================================

async def broadcast_new_ride_request(ride_request_id: uuid.UUID, lat: float, lng: float, budget: float, category: str) -> None:
    """Dispatches ride requests targeting nearby online approved drivers only."""
    async with async_session_maker() as db_session:
        driver_service = DriverService(db_session)
        nearby_drivers = await driver_service.find_nearby_drivers(lat=lat, lng=lng, radius=3000.0)

        payload = {
            "ride_id": str(ride_request_id),
            "pickup_lat": lat,
            "pickup_lng": lng,
            "budget": float(budget),
            "category": category
        }

        # Targeted notifications
        for driver, distance in nearby_drivers:
            # Check category compatibility
            if driver.active_vehicle and driver.active_vehicle.category == category:
                await sio.emit("ride_available", payload, room=f"driver:{driver.id}")
                logger.info("Ride requested dispatched to driver", ride_id=ride_request_id, driver_id=driver.id)


async def broadcast_bid_acceptance(
    ride_id: uuid.UUID,
    accepted_driver_id: uuid.UUID,
    assignment_id: uuid.UUID,
    otp: str,
    price: float,
    rejected_driver_ids: List[uuid.UUID]
) -> None:
    """Sends immediate state transition alerts to matched, unmatched drivers, and passenger rooms."""
    # Notify selected driver
    await sio.emit(
        "bid_accepted",
        {
            "assignment_id": str(assignment_id),
            "otp": otp,
            "price": float(price)
        },
        room=f"driver:{accepted_driver_id}"
    )

    # Notify rejected drivers
    for d_id in rejected_driver_ids:
        await sio.emit("bid_rejected", {"ride_id": str(ride_id)}, room=f"driver:{d_id}")

    # Close bidding room
    await sio.emit("bidding_closed", {"ride_id": str(ride_id)}, room=f"ride:{ride_id}")
    logger.info("Bid acceptance broadcasts finished", ride_id=ride_id, assignment_id=assignment_id)
