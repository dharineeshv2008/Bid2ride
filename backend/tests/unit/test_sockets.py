import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from socketio.exceptions import ConnectionRefusedError

from app.core.exceptions import AuthenticationException
from app.services.socket_service import (
    connect,
    disconnect,
    join_ride_room,
    submit_bid,
    withdraw_bid,
    broadcast_new_ride_request,
    broadcast_bid_acceptance,
    sio,
)


# =====================================================================
# 1. JWT SOCKET AUTHENTICATION TESTS
# =====================================================================

@pytest.mark.asyncio
async def test_connect_missing_token() -> None:
    """Verifies that connect raises ConnectionRefusedError if JWT token is missing."""
    with pytest.raises(ConnectionRefusedError) as exc_info:
        await connect("sid_123", {}, auth={})
    assert "token is required" in str(exc_info.value)


@pytest.mark.asyncio
@patch("app.services.socket_service.decode_token", new_callable=MagicMock)
async def test_connect_invalid_token(mock_decode: MagicMock) -> None:
    """Verifies that connect raises ConnectionRefusedError if JWT is invalid."""
    mock_decode.side_effect = ValueError("Invalid token")
    with pytest.raises(ConnectionRefusedError) as exc_info:
        await connect("sid_123", {}, auth={"token": "invalid_jwt"})
    assert "Invalid or expired" in str(exc_info.value)


# =====================================================================
# 2. ROOM ASSIGNMENTS TESTS
# =====================================================================

@pytest.mark.asyncio
@patch("app.services.socket_service.decode_token", new_callable=MagicMock)
@patch("app.services.socket_service.UserRepository", autospec=True)
@patch("app.services.socket_service.sio", autospec=True)
async def test_connect_passenger_room(
    mock_sio: MagicMock,
    mock_user_repo_class: MagicMock,
    mock_decode: MagicMock
) -> None:
    """Verifies that authenticated passengers join the passenger-specific room."""
    user_id = uuid.uuid4()
    mock_decode.return_value = {"sub": str(user_id), "role": "PASSENGER"}

    # Mock user exists
    mock_user_repo = mock_user_repo_class.return_value
    mock_user = MagicMock()
    mock_user.is_active = True
    mock_user_repo.get_by_id = AsyncMock(return_value=mock_user)

    await connect("sid_passenger", {}, auth={"token": "valid_passenger_jwt"})

    # Should save session and join room
    mock_sio.save_session.assert_called_once()
    mock_sio.enter_room.assert_called_with("sid_passenger", f"passenger:{user_id}")


# =====================================================================
# 3. BID SUBMISSIONS & BROADCAST TESTS
# =====================================================================

@pytest.mark.asyncio
@patch("app.services.socket_service.BidService", autospec=True)
@patch("app.services.socket_service.DriverService", autospec=True)
@patch("app.services.socket_service.sio", autospec=True)
async def test_submit_bid_socket_event(
    mock_sio: MagicMock,
    mock_drv_service_class: MagicMock,
    mock_bid_service_class: MagicMock
) -> None:
    """Verifies that submit_bid triggers database service and broadcasts bid_received."""
    driver_id = uuid.uuid4()
    ride_id = uuid.uuid4()
    bid_id = uuid.uuid4()

    # Mock socket session context
    mock_sio.get_session = AsyncMock(return_value={"user_id": str(driver_id), "role": "DRIVER"})

    # Mock BidService returning bid
    mock_bid_service = mock_bid_service_class.return_value
    mock_bid = MagicMock()
    mock_bid.id = bid_id
    mock_bid.amount = 15.00
    mock_bid.eta_minutes = 5
    mock_bid_service.submit_bid = AsyncMock(return_value=mock_bid)

    # Mock Driver details
    mock_drv_service = mock_drv_service_class.return_value
    mock_driver = MagicMock()
    mock_driver.rating = 4.90
    mock_driver.user.name = "Driver Joe"
    mock_driver.active_vehicle = None
    mock_drv_service.get_driver = AsyncMock(return_value=mock_driver)

    payload = {
        "ride_id": str(ride_id),
        "amount": 15.00,
        "eta_minutes": 5
    }

    await submit_bid("sid_driver", payload)

    # Verifies submit_bid service was called
    mock_bid_service.submit_bid.assert_called_once_with(
        driver_id=driver_id,
        request_id=ride_id,
        amount=15.00,
        eta_minutes=5
    )

    # Verifies broadcasting of bid details to passenger room
    mock_sio.emit.assert_called_with(
        "bid_received",
        {
            "bid_id": str(bid_id),
            "driver_name": "Driver Joe",
            "driver_rating": 4.90,
            "vehicle_details": "Standard Vehicle",
            "amount": 15.00,
            "eta_minutes": 5
        },
        room=f"ride:{ride_id}"
    )


# =====================================================================
# 4. RIDE DISCOVERY SPATIAL DISPATCH BROADCASTS
# =====================================================================

@pytest.mark.asyncio
@patch("app.services.socket_service.DriverService", autospec=True)
@patch("app.services.socket_service.sio", autospec=True)
async def test_broadcast_new_ride_request_targets_compatible_drivers(
    mock_sio: MagicMock,
    mock_drv_service_class: MagicMock
) -> None:
    """Verifies that ride request broadcasts target nearby compatible online drivers only."""
    mock_drv_service = mock_drv_service_class.return_value
    
    driver_id = uuid.uuid4()
    mock_driver = MagicMock()
    mock_driver.id = driver_id
    mock_driver.active_vehicle.category = "ECONOMY"
    
    # Mock find_nearby_drivers
    mock_drv_service.find_nearby_drivers = AsyncMock(return_value=[(mock_driver, 1200.5)])

    ride_id = uuid.uuid4()
    await broadcast_new_ride_request(
        ride_request_id=ride_id,
        lat=37.7749,
        lng=-122.4194,
        budget=15.00,
        category="ECONOMY"
    )

    # Verifies ride_available broadcast sent to regional room
    mock_sio.emit.assert_any_call(
        "ride_available",
        {
            "ride_id": str(ride_id),
            "pickup_lat": 37.7749,
            "pickup_lng": -122.4194,
            "budget": 15.00,
            "category": "ECONOMY"
        },
        room="drivers:geohash:9q8yyk"
    )


# =====================================================================
# 5. BID ACCEPTANCE BROADCASTS
# =====================================================================

@pytest.mark.asyncio
@patch("app.services.socket_service.sio", autospec=True)
async def test_broadcast_bid_acceptance(mock_sio: MagicMock) -> None:
    """Verifies that bid acceptance sends events to matched, unmatched drivers, and passenger rooms."""
    ride_id = uuid.uuid4()
    accepted_driver = uuid.uuid4()
    assignment_id = uuid.uuid4()
    rejected_driver = uuid.uuid4()

    await broadcast_bid_acceptance(
        ride_id=ride_id,
        accepted_driver_id=accepted_driver,
        assignment_id=assignment_id,
        otp="8492",
        price=15.00,
        rejected_driver_ids=[rejected_driver]
    )

    # Should notify accepted driver
    mock_sio.emit.assert_any_call(
        "bid_accepted",
        {
            "assignment_id": str(assignment_id),
            "otp": "8492",
            "price": 15.00
        },
        room=f"driver:{accepted_driver}"
    )

    # Should notify rejected drivers
    mock_sio.emit.assert_any_call(
        "bid_rejected",
        {"ride_id": str(ride_id)},
        room=f"driver:{rejected_driver}"
    )

    # Should close bidding room
    mock_sio.emit.assert_any_call(
        "bidding_closed",
        {"ride_id": str(ride_id)},
        room=f"ride:{ride_id}"
    )
