import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundException, ValidationException, GeofenceException
from app.models.driver import Driver, Vehicle
from app.models.ride import RideRequest, DriverBid, RideAssignment
from app.models.payment import Wallet
from app.repositories.base import BaseRepository
from app.repositories.driver_repository import DriverRepository
from app.services.driver_service import DriverService, VehicleService
from app.services.ride_service import BidService, RideAssignmentService
from app.services.payment_service import WalletService


# =====================================================================
# 1. BASE REPOSITORY GENERIC CRUD TESTS
# =====================================================================

@pytest.mark.asyncio
async def test_base_repository_crud() -> None:
    """Verifies that the generic BaseRepository executes basic CRUD statements."""
    mock_session = AsyncMock(spec=AsyncSession)
    repo = BaseRepository(Vehicle, mock_session)
    
    # Mock create
    params = {"make": "Tesla", "model": "Model 3", "year": 2023, "color": "Red", "plate_number": "XYZ-987", "category": "ECONOMY"}
    vehicle = await repo.create(params)
    assert vehicle.make == "Tesla"
    assert vehicle.model == "Model 3"
    assert mock_session.add.call_count == 1

    # Mock count
    mock_session.execute.return_value.scalar = MagicMock(return_value=5)
    total = await repo.count()
    assert total == 5


# =====================================================================
# 2. SPATIAL GEOPROXIMITY QUERIES TEST
# =====================================================================

@pytest.mark.asyncio
@patch("app.core.redis.redis_manager")
async def test_spatial_proximity_query(mock_redis_manager) -> None:
    """Verifies that DriverRepository executes Redis GEORADIUS."""
    mock_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    
    driver_uuid = uuid.uuid4()
    mock_driver = MagicMock(spec=Driver)
    mock_driver.id = driver_uuid
    mock_driver.rating = 5.0
    mock_driver.acceptance_rate = 100.0
    mock_result.scalars.return_value.all.return_value = [mock_driver]
    mock_session.execute.return_value = mock_result

    # Mock Redis return
    mock_redis_client = AsyncMock()
    mock_redis_client.execute_command.return_value = [[str(driver_uuid).encode(), b"1500.5"]]
    mock_redis_manager.client = mock_redis_client

    repo = DriverRepository(mock_session)
    drivers = await repo.find_nearby_online_drivers(37.7749, -122.4194, 3000.0)
    
    assert len(drivers) == 1
    assert drivers[0][0] == mock_driver
    assert drivers[0][1] == 1500.5
    assert mock_redis_client.execute_command.call_count == 1
    assert mock_session.execute.call_count == 1


# =====================================================================
# 3. WALLET SERVICE METRIC ADJUSTMENTS
# =====================================================================

@pytest.mark.asyncio
@patch("app.services.payment_service.WalletRepository", autospec=True)
@patch("app.services.payment_service.WalletTransactionRepository", autospec=True)
async def test_wallet_topup_service(mock_tx_repo_class: MagicMock, mock_wallet_repo_class: MagicMock) -> None:
    """Verifies that balance topup adds credits and writes to the transaction ledger."""
    mock_session = AsyncMock(spec=AsyncSession)
    mock_wallet_repo = mock_wallet_repo_class.return_value
    mock_tx_repo = mock_tx_repo_class.return_value

    mock_wallet = MagicMock(spec=Wallet)
    mock_wallet.id = uuid.uuid4()
    mock_wallet.balance = 50.00
    mock_wallet_repo.get_by_user_id.return_value = mock_wallet

    service = WalletService(mock_session)
    user_id = uuid.uuid4()
    updated_wallet = await service.topup_balance(user_id, 25.00)

    assert float(updated_wallet.balance) == 75.00
    assert mock_wallet_repo.get_by_user_id.call_count == 1
    assert mock_tx_repo.create.call_count == 1
    assert mock_session.commit.call_count == 1


# =====================================================================
# 4. RIDE BID CONSTRAINTS EXCEPTION VALIDATIONS
# =====================================================================

@pytest.mark.asyncio
@patch("app.services.ride_service.RideRepository", autospec=True)
@patch("app.services.ride_service.BidRepository", autospec=True)
async def test_bid_amount_precondition_limits(mock_bid_repo_class: MagicMock, mock_ride_repo_class: MagicMock) -> None:
    """Verifies that driver bids exceeding passenger budget thresholds throw ValidationExceptions."""
    mock_session = AsyncMock(spec=AsyncSession)
    mock_ride_repo = mock_ride_repo_class.return_value

    mock_ride = MagicMock(spec=RideRequest)
    mock_ride.status = "PENDING_BIDS"
    mock_ride.budget = 15.00
    mock_ride_repo.get.return_value = mock_ride

    service = BidService(mock_session)
    
    # Try bid amount too high ($25.00 is > 1.5 * $15.00 budget)
    with pytest.raises(ValidationException):
         await service.submit_bid(uuid.uuid4(), uuid.uuid4(), 25.00, 5)

    # Try bid amount too low ($10.00 is < 0.9 * $15.00 budget)
    with pytest.raises(ValidationException):
         await service.submit_bid(uuid.uuid4(), uuid.uuid4(), 10.00, 5)


# =====================================================================
# 5. GEOFENCE COMPLIANCE CHECK
# =====================================================================

@pytest.mark.asyncio
@patch("app.services.ride_service.RideAssignmentRepository", autospec=True)
@patch("app.services.ride_service.RideRepository", autospec=True)
@patch("app.services.ride_service.DriverRepository", autospec=True)
async def test_verify_pickup_otp_geofence_out_of_bounds(
    mock_driver_repo_class: MagicMock,
    mock_ride_repo_class: MagicMock,
    mock_assign_repo_class: MagicMock
) -> None:
    """Verifies that starting a ride when driver is outside geofence triggers a GeofenceException."""
    mock_session = AsyncMock(spec=AsyncSession)
    mock_assign_repo = mock_assign_repo_class.return_value
    
    # Mock active assignment
    mock_assignment = MagicMock(spec=RideAssignment)
    mock_assignment.status = "ACCEPTED"
    mock_assignment.driver_id = uuid.uuid4()
    mock_assignment.otp = "8492"
    mock_assign_repo.get.return_value = mock_assignment

    # Mock geofence check failing
    mock_result = MagicMock()
    mock_result.scalar.return_value = False
    mock_session.execute = AsyncMock(return_value=mock_result)

    service = RideAssignmentService(mock_session)
    
    with pytest.raises(GeofenceException):
        await service.verify_pickup_otp(mock_assignment.driver_id, uuid.uuid4(), "8492")
