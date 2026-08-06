import json
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from app.core.exceptions import ValidationException
from app.models.user import User
from app.models.ride import RideAssignment, RideRequest, RideStatusHistory
from app.dependencies.auth import get_current_user
from app.main import app

client = TestClient(app, headers={"Authorization": "Bearer test-driver-token"})

from app.dependencies.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

# Helper mock user dependency with DRIVER role
mock_driver_user = User(id=uuid.uuid4(), phone="+15550299", name="Driver Joe", role="DRIVER", email="joe-driver@test.com")

async def override_get_current_user() -> User:
    return mock_driver_user

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
# 1. RIDE STATE TRANSITION TESTS
# =====================================================================

@patch("app.api.v1.endpoints.rides._verify_assignment_role_ownership", autospec=True)
@patch("app.api.v1.endpoints.rides._add_status_history", autospec=True)
@patch("app.api.v1.endpoints.rides.sio", autospec=True)
def test_accept_assignment_api(
    mock_sio: MagicMock,
    mock_history: MagicMock,
    mock_verify: MagicMock
) -> None:
    """Verifies that accept-assignment changes status to DRIVER_ACCEPTED and alerts socket."""
    mock_assignment = MagicMock(spec=RideAssignment)
    mock_assignment.id = uuid.uuid4()
    mock_assignment.request_id = uuid.uuid4()
    mock_assignment.driver_id = mock_driver_user.id
    mock_assignment.status = "ACCEPTED"
    mock_assignment.price_charged = 15.00
    mock_assignment.created_at = "2026-07-28T14:53:00Z"
    
    mock_verify.return_value = mock_assignment
    mock_history.return_value = AsyncMock()

    response = client.post(f"/api/v1/rides/{mock_assignment.id}/accept-assignment")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "DRIVER_ACCEPTED"
    assert mock_sio.emit.call_count == 1


@patch("app.api.v1.endpoints.rides._verify_assignment_role_ownership", autospec=True)
def test_accept_assignment_invalid_state_throws(mock_verify: MagicMock) -> None:
    """Verifies that accepting an already started ride throws a ValidationException."""
    mock_assignment = MagicMock(spec=RideAssignment)
    mock_assignment.status = "IN_PROGRESS"
    mock_verify.return_value = mock_assignment

    response = client.post(f"/api/v1/rides/{uuid.uuid4()}/accept-assignment")
    assert response.status_code in (400, 422)
    assert "cannot accept" in response.text.lower()


# =====================================================================
# 2. OTP VERIFICATION & START TESTS
# =====================================================================

@patch("app.api.v1.endpoints.rides.RideAssignmentRepository", autospec=True)
@patch("app.api.v1.endpoints.rides.RideAssignmentService", autospec=True)
@patch("app.api.v1.endpoints.rides._add_status_history", autospec=True)
@patch("app.api.v1.endpoints.rides.sio", autospec=True)
def test_start_ride_with_valid_otp(
    mock_sio: MagicMock,
    mock_history: MagicMock,
    mock_service_class: MagicMock,
    mock_repo_class: MagicMock
) -> None:
    """Verifies that driver entering the passenger's OTP starts the ride."""
    mock_repo = mock_repo_class.return_value
    mock_service = mock_service_class.return_value

    mock_assignment = MagicMock(spec=RideAssignment)
    mock_assignment.id = uuid.uuid4()
    mock_assignment.request_id = uuid.uuid4()
    mock_assignment.driver_id = mock_driver_user.id
    mock_assignment.status = "DRIVER_ARRIVED"
    mock_assignment.price_charged = 15.00
    mock_repo.get = AsyncMock(return_value=mock_assignment)

    mock_service.verify_pickup_otp = AsyncMock()

    payload = {"otp": "8492"}
    response = client.post(f"/api/v1/rides/{mock_assignment.id}/start", json=payload)
    
    assert response.status_code == 200
    assert mock_service.verify_pickup_otp.call_count == 1
    assert mock_sio.emit.call_count == 2  # ride_started + passenger_verified


# =====================================================================
# 3. GPS TRACKING & CACHING TESTS
# =====================================================================

@patch("app.api.v1.endpoints.rides._verify_assignment_role_ownership", autospec=True)
@patch("app.api.v1.endpoints.rides.RideTrackingService", autospec=True)
@patch("app.api.v1.endpoints.rides.redis_manager")
@patch("app.api.v1.endpoints.rides.sio", autospec=True)
def test_update_driver_location_api(
    mock_sio: MagicMock,
    mock_redis: MagicMock,
    mock_tracking_class: MagicMock,
    mock_verify: MagicMock
) -> None:
    """Verifies that driver location updates cache in Redis and broadcast updates."""
    mock_assignment = MagicMock(spec=RideAssignment)
    mock_assignment.id = uuid.uuid4()
    mock_assignment.request_id = uuid.uuid4()
    mock_verify.return_value = mock_assignment

    mock_tracking = mock_tracking_class.return_value
    mock_tracking.record_location_ping = AsyncMock()

    mock_redis.client.set = AsyncMock()

    payload = {
        "lat": 37.7749,
        "lng": -122.4194,
        "speed": 22.5,
        "heading": 180.0
    }
    response = client.post(f"/api/v1/rides/{mock_assignment.id}/location", json=payload)
    
    assert response.status_code == 200
    assert mock_redis.client.set.call_count == 1
    assert mock_sio.emit.call_count == 1



