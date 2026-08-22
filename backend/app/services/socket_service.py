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

from app.core.config import settings

_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"
_BASE32_MAP = {c: i for i, c in enumerate(_BASE32)}

def geohash_encode(latitude: float, longitude: float, precision: int = 6) -> str:
    lat_interval = (-90.0, 90.0)
    lon_interval = (-180.0, 180.0)
    geohash = []
    bits = [16, 8, 4, 2, 1]
    bit = 0
    ch = 0
    even = True
    while len(geohash) < precision:
        if even:
            mid = (lon_interval[0] + lon_interval[1]) / 2
            if longitude > mid:
                ch |= bits[bit]
                lon_interval = (mid, lon_interval[1])
            else:
                lon_interval = (lon_interval[0], mid)
        else:
            mid = (lat_interval[0] + lat_interval[1]) / 2
            if latitude > mid:
                ch |= bits[bit]
                lat_interval = (mid, lat_interval[1])
            else:
                lat_interval = (lat_interval[0], mid)
        even = not even
        if bit < 4:
            bit += 1
        else:
            geohash.append(_BASE32[ch])
            bit = 0
            ch = 0
    return "".join(geohash)

def geohash_decode_bbox(geohash: str) -> tuple:
    lat_interval = (-90.0, 90.0)
    lon_interval = (-180.0, 180.0)
    even = True
    for c in geohash:
        cd = _BASE32_MAP[c]
        for mask in [16, 8, 4, 2, 1]:
            if even:
                mid = (lon_interval[0] + lon_interval[1]) / 2
                if cd & mask:
                    lon_interval = (mid, lon_interval[1])
                else:
                    lon_interval = (lon_interval[0], mid)
            else:
                mid = (lat_interval[0] + lat_interval[1]) / 2
                if cd & mask:
                    lat_interval = (mid, lat_interval[1])
                else:
                    lat_interval = (lat_interval[0], mid)
            even = not even
    return lat_interval, lon_interval

redis_mgr = None
if settings.REDIS_URI and not settings.DEVELOPMENT_MODE:
    try:
        redis_mgr = socketio.AsyncRedisManager(settings.REDIS_URI)
    except Exception as e:
        logger.warning(f"Failed to initialize AsyncRedisManager: {e}")

if redis_mgr:
    sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*", client_manager=redis_mgr)
else:
    sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")


def get_geohash_neighbors(lat: float, lng: float, precision: int = 6) -> List[str]:
    gh = geohash_encode(lat, lng, precision=precision)
    lat_interval, lon_interval = geohash_decode_bbox(gh)
    
    lat_height = lat_interval[1] - lat_interval[0]
    lon_width = lon_interval[1] - lon_interval[0]
    
    lat_center = (lat_interval[0] + lat_interval[1]) / 2
    lon_center = (lon_interval[0] + lon_interval[1]) / 2
    
    neighbors = [gh]
    offsets = [
        (lat_height, 0.0),      # n
        (-lat_height, 0.0),     # s
        (0.0, lon_width),       # e
        (0.0, -lon_width),      # w
        (lat_height, lon_width),   # ne
        (lat_height, -lon_width),  # nw
        (-lat_height, lon_width),  # se
        (-lat_height, -lon_width)  # sw
    ]
    for d_lat, d_lon in offsets:
        n_lat = lat_center + d_lat
        n_lon = lon_center + d_lon
        n_lat = max(-90.0, min(90.0, n_lat))
        n_lon = (n_lon + 180.0) % 360.0 - 180.0
        neighbors.append(geohash_encode(n_lat, n_lon, precision=precision))
    return neighbors



async def sync_driver_geo_rooms(driver_id: uuid.UUID, lat: float, lng: float) -> None:
    """Updates the driver's socket room memberships based on their current lat/lng."""
    try:
        gh_rooms = get_geohash_neighbors(lat, lng, precision=6)
        participants = list(sio.manager.get_participants("/", f"driver:{driver_id}"))
        logger.info(f"[GEO ROOM SYNC] Driver {driver_id} has {len(participants)} active socket connections.")
        
        for sid in participants:
            # Leave old geohash rooms - simpler is to just enter the new ones.
            # In a real app we might track previous rooms and leave them.
            for room in gh_rooms:
                await sio.enter_room(sid, f"drivers:geohash:{room}")
            logger.info(f"[GEO ROOM SYNC] Driver {driver_id} (sid: {sid}) joined geohash rooms: {gh_rooms}")
    except Exception as e:
        logger.warning(f"[GEO ROOM SYNC ERROR] Failed to sync rooms for driver {driver_id}: {e}")


@sio.event
async def connect(sid: str, environ: Dict[str, Any], auth: Optional[Dict[str, Any]] = None) -> None:
    """Authenticates socket connections using JWT and assigns room categories by role."""
    if not auth or "token" not in auth:
        logger.error("Connection refused: missing auth token", sid=sid)
        raise ConnectionRefusedError("Authentication token is required")

    token = auth["token"]
    if token.startswith("Bearer "):
        token = token.replace("Bearer ", "", 1)

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
            await sio.enter_room(sid, "online_drivers")
            logger.info("Driver connected to online_drivers room", sid=sid, driver_id=user_id)


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
async def join_room(sid: str, data: Dict[str, Any]) -> None:
    """Enables general client room subscription."""
    room = data.get("room")
    if not room:
        return
    await sio.enter_room(sid, room)
    logger.info("Socket joined room", sid=sid, room=room)


@sio.event
async def leave_room(sid: str, data: Dict[str, Any]) -> None:
    """Enables general client room unsubscription."""
    room = data.get("room")
    if not room:
        return
    await sio.leave_room(sid, room)
    logger.info("Socket left room", sid=sid, room=room)


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
    logger.info(f"[AUTH DEBUG] broadcast_new_ride_request called for ride {ride_request_id} at ({lat}, {lng})")
    async with async_session_maker() as db_session:
        driver_service = DriverService(db_session)
        nearby_drivers = await driver_service.find_nearby_drivers(lat=lat, lng=lng, radius=50000.0)
        logger.info(f"[AUTH DEBUG] Found {len(nearby_drivers)} online drivers within 50KM radius.")

        payload = {
            "ride_id": str(ride_request_id),
            "pickup_lat": lat,
            "pickup_lng": lng,
            "budget": float(budget),
            "category": category
        }

        gh_rooms = get_geohash_neighbors(lat, lng, precision=6)
        for room in gh_rooms:
            await sio.emit("ride_available", payload, room=f"drivers:geohash:{room}")
            await sio.emit("new_ride_request_broadcast", payload, room=f"drivers:geohash:{room}")
            await sio.emit("new_ride_request", payload, room=f"drivers:geohash:{room}")
        
        # Also broadcast to all online drivers
        await sio.emit("ride_available", payload, room="online_drivers")
        await sio.emit("new_ride_request", payload, room="online_drivers")
        logger.info(f"[RIDE BROADCAST] Ride request {ride_request_id} dispatched to geohash rooms and online_drivers room.")


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
