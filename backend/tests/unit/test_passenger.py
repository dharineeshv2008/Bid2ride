import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from app.core.exceptions import ValidationException, EntityNotFoundException
from app.models.user import User
from app.models.ride import SavedPlace, RideRequest, DriverBid, RideAssignment
from app.dependencies.auth import get_current_user
from app.main import app

client = TestClient(app, headers={"Authorization": "Bearer test-passenger-token"})

from app.dependencies.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

# Helper mock user dependency
mock_user = User(id=uuid.uuid4(), phone="+15550199", name="Passenger Joe", role="PASSENGER", email="joe@test.com")

async def override_get_current_user() -> User:
    return mock_user

async def override_get_db():
    mock_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_result.scalars.return_value.first.return_value = None
    mock_session.execute.return_value = mock_result
    yield mock_session

@pytest.fixture(autouse=True)
def override_dependencies():
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()



# =====================================================================
# 1. PROFILE TESTS
# =====================================================================

@patch("app.api.v1.endpoints.passengers.PassengerService", autospec=True)
def test_get_passenger_profile(mock_service_class: MagicMock) -> None:
    """Verifies that profile endpoint returns ratings and passenger fields."""
    mock_instance = mock_service_class.return_value
    mock_passenger = MagicMock()
    mock_passenger.rating = 4.85
    mock_passenger.rating_count = 12
    mock_instance.get_passenger = AsyncMock(return_value=mock_passenger)

    response = client.get("/api/v1/passenger/profile")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["name"] == "Passenger Joe"
    assert json_data["rating"] == 4.85
    assert json_data["rating_count"] == 12


# =====================================================================
# 2. SAVED PLACES CRUD TESTS
# =====================================================================

@patch("app.api.v1.endpoints.passengers.SavedPlaceService", autospec=True)
def test_create_saved_place_api(mock_service_class: MagicMock) -> None:
    """Verifies that post saved-place calls service and parses coordinates."""
    mock_instance = mock_service_class.return_value
    mock_place = MagicMock(spec=SavedPlace)
    mock_place.id = uuid.uuid4()
    mock_place.label = "Work"
    mock_place.address = "456 Broadway Ave"
    
    # Mocking geometry shape return
    from geoalchemy2.elements import WKTElement
    mock_place.location = WKTElement("SRID=4326;POINT(-122.4014 37.7891)", srid=4326)
    mock_instance.create_saved_place = AsyncMock(return_value=mock_place)

    payload = {
        "label": "Work",
        "address": "456 Broadway Ave",
        "lat": 37.7891,
        "lng": -122.4014
    }
    response = client.post("/api/v1/passenger/saved-places", json=payload)
    assert response.status_code == 201
    json_data = response.json()
    assert json_data["label"] == "Work"
    assert json_data["lat"] == 37.7891
    assert json_data["lng"] == -122.4014


# =====================================================================
# 3. RIDE CREATION TESTS
# =====================================================================

@patch("app.services.socket_service.broadcast_new_ride_request")
@patch("app.api.v1.endpoints.passengers.RideService")
def test_create_ride_request_api(mock_service_class: MagicMock, mock_broadcast: MagicMock) -> None:
    """Verifies ride request API creates a ride object."""
    mock_broadcast.return_value = AsyncMock()
    mock_instance = mock_service_class.return_value
    mock_ride = MagicMock(spec=RideRequest)
    mock_ride.id = uuid.uuid4()
    mock_ride.pickup_address = "123 Main St"
    mock_ride.dropoff_address = "456 Broadway Ave"
    mock_ride.budget = 15.00
    mock_ride.category = "ECONOMY"
    mock_ride.status = "PENDING_BIDS"
    mock_ride.created_at = "2026-07-28T14:44:00Z"
    
    mock_instance.create_ride_request = AsyncMock(return_value=mock_ride)

    payload = {
        "pickup_address": "123 Main St",
        "pickup_lat": 37.7749,
        "pickup_lng": -122.4194,
        "dropoff_address": "456 Broadway Ave",
        "dropoff_lat": 37.7891,
        "dropoff_lng": -122.4014,
        "budget": 15.00,
        "category": "ECONOMY"
    }
    response = client.post("/api/v1/passenger/rides", json=payload)
    assert response.status_code == 201
    json_data = response.json()
    assert json_data["status"] == "PENDING_BIDS"
    assert json_data["budget"] == 15.00


# =====================================================================
# 4. BID ACCEPTANCE TESTS
# =====================================================================

@patch("app.api.v1.endpoints.passengers.RideAssignmentService", autospec=True)
def test_accept_driver_bid_api(mock_service_class: MagicMock) -> None:
    """Verifies that bid acceptance endpoints assign rides and return OTPs."""
    mock_instance = mock_service_class.return_value
    mock_assignment = MagicMock(spec=RideAssignment)
    mock_assignment.id = uuid.uuid4()
    mock_assignment.otp = "8492"
    mock_assignment.price_charged = 15.00
    mock_instance.accept_bid = AsyncMock(return_value=mock_assignment)

    ride_id = uuid.uuid4()
    bid_id = uuid.uuid4()
    response = client.post(f"/api/v1/passenger/rides/{ride_id}/accept-bid?bid_id={bid_id}")
    
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "success"
    assert json_data["data"]["otp"] == "8492"
    assert json_data["data"]["price"] == 15.00



