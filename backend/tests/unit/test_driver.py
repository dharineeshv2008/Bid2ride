import uuid
import datetime
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from app.core.exceptions import ValidationException
from app.models.user import User
from app.models.driver import Driver, Vehicle, DriverDocument
from app.models.payment import Wallet
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
# 1. DRIVER PROFILE TESTS
# =====================================================================

@patch("app.api.v1.endpoints.drivers.DriverService", autospec=True)
def test_get_driver_profile(mock_service_class: MagicMock) -> None:
    """Verifies profile endpoints returns driver properties and ratings."""
    mock_instance = mock_service_class.return_value
    mock_driver = MagicMock(spec=Driver)
    mock_driver.license_number = "LIC-XYZ"
    mock_driver.verification_status = "APPROVED"
    mock_driver.rating = 4.90
    mock_driver.rating_count = 150
    mock_driver.online_status = False
    mock_driver.acceptance_rate = 95.00
    mock_driver.win_rate = 80.00
    
    mock_instance.get_driver = AsyncMock(return_value=mock_driver)

    response = client.get("/api/v1/driver/profile")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["license_number"] == "LIC-XYZ"
    assert json_data["rating"] == 4.90
    assert json_data["online_status"] is False


# =====================================================================
# 2. VEHICLE CRUD TESTS
# =====================================================================

@patch("app.api.v1.endpoints.drivers.VehicleService", autospec=True)
@patch("app.api.v1.endpoints.drivers.DriverService", autospec=True)
def test_register_vehicle_api(mock_drv_service_class: MagicMock, mock_veh_service_class: MagicMock) -> None:
    """Verifies post vehicle endpoint calls registrar and sets active configurations."""
    mock_veh_instance = mock_veh_service_class.return_value
    mock_drv_instance = mock_drv_service_class.return_value

    mock_vehicle = MagicMock(spec=Vehicle)
    mock_vehicle.id = uuid.uuid4()
    mock_vehicle.make = "Ford"
    mock_vehicle.model = "Mustang"
    mock_vehicle.year = 2022
    mock_vehicle.color = "Black"
    mock_vehicle.plate_number = "CAR-999"
    mock_vehicle.category = "COMFORT"
    mock_vehicle.status = "ACTIVE"
    mock_veh_instance.register_vehicle = AsyncMock(return_value=mock_vehicle)

    # Driver has no active vehicle initially
    mock_driver = MagicMock(spec=Driver)
    mock_driver.active_vehicle_id = None
    mock_drv_instance.get_driver = AsyncMock(return_value=mock_driver)

    payload = {
        "make": "Ford",
        "model": "Mustang",
        "year": 2022,
        "color": "Black",
        "plate_number": "CAR-999",
        "category": "COMFORT"
    }
    response = client.post("/api/v1/driver/vehicles", json=payload)
    assert response.status_code == 201
    json_data = response.json()
    assert json_data["plate_number"] == "CAR-999"
    assert json_data["category"] == "COMFORT"
    assert mock_veh_instance.set_active_vehicle.call_count == 1


# =====================================================================
# 3. AVAILABILITY TRANSITION CONSTRAINT TESTS
# =====================================================================

@patch("app.api.v1.endpoints.drivers.settings.DEVELOPMENT_MODE", False)
@patch("app.api.v1.endpoints.drivers.DriverService", autospec=True)
def test_toggle_online_availability_denied_if_unverified(mock_service_class: MagicMock) -> None:
    """Verifies that unverified drivers are blocked from going online."""
    mock_instance = mock_service_class.return_value
    
    mock_driver = MagicMock(spec=Driver)
    mock_driver.verification_status = "PENDING"
    mock_driver.active_vehicle_id = uuid.uuid4()
    mock_instance.get_driver = AsyncMock(return_value=mock_driver)

    response = client.put("/api/v1/driver/availability", json={"online_status": True})
    assert response.status_code in (400, 422)
    assert "verification" in response.text.lower()


@patch("app.api.v1.endpoints.drivers.DriverService", autospec=True)
def test_toggle_online_availability_denied_if_no_active_vehicle(mock_service_class: MagicMock) -> None:
    """Verifies that drivers without selected active vehicle are blocked from going online."""
    mock_instance = mock_service_class.return_value
    
    mock_driver = MagicMock(spec=Driver)
    mock_driver.verification_status = "APPROVED"
    mock_driver.active_vehicle_id = None
    mock_instance.get_driver = AsyncMock(return_value=mock_driver)

    response = client.put("/api/v1/driver/availability", json={"online_status": True})
    assert response.status_code in (400, 422)
    assert "vehicle" in response.text.lower()


# =====================================================================
# 4. DASHBOARD RETRIEVAL TESTS
# =====================================================================

@patch("app.api.v1.endpoints.drivers.DriverService", autospec=True)
@patch("app.api.v1.endpoints.drivers.WalletService", autospec=True)
@patch("app.api.v1.endpoints.drivers.RideAssignmentRepository", autospec=True)
def test_get_driver_dashboard_api(
    mock_assign_repo_class: MagicMock,
    mock_wallet_service_class: MagicMock,
    mock_drv_service_class: MagicMock
) -> None:
    """Verifies driver dashboard queries balance, rating, status, and active assignment summary."""
    mock_drv_instance = mock_drv_service_class.return_value
    mock_wallet_instance = mock_wallet_service_class.return_value
    mock_assign_repo = mock_assign_repo_class.return_value

    # Mock driver profile
    mock_driver = MagicMock(spec=Driver)
    mock_driver.online_status = True
    mock_driver.rating = 4.88
    mock_driver.acceptance_rate = 94.50
    mock_drv_instance.get_driver = AsyncMock(return_value=mock_driver)

    # Mock wallet balance
    mock_wallet = MagicMock(spec=Wallet)
    mock_wallet.balance = 120.50
    mock_wallet_instance.get_wallet = AsyncMock(return_value=mock_wallet)

    # Mock no active assignment
    mock_assign_repo.get_active_driver_assignment = AsyncMock(return_value=None)

    response = client.get("/api/v1/driver/dashboard")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["online_status"] is True
    assert json_data["rating"] == 4.88
    assert json_data["wallet_balance"] == 120.50
    assert json_data["active_assignment"] is None



