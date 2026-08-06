import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from app.core.exceptions import ValidationException, PermissionDeniedException
from app.models.user import User
from app.models.ride import RideAssignment, RideRequest
from app.models.payment import Wallet, Payment
from app.dependencies.auth import get_current_user
from app.main import app

client = TestClient(app, headers={"Authorization": "Bearer test-user-token"})

from app.dependencies.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

# Helper mock user dependency with PASSENGER role
mock_user = User(id=uuid.uuid4(), phone="+15550199", name="Joe Traveler", role="PASSENGER", email="joe@test.com")

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
# 1. WALLET OPERATIONS TESTS
# =====================================================================

@patch("app.api.v1.endpoints.wallet.WalletService", autospec=True)
def test_get_wallet_balance_api(mock_service_class: MagicMock) -> None:
    """Verifies that balance endpoints return wallet balance parameters."""
    mock_instance = mock_service_class.return_value
    mock_wallet = MagicMock(spec=Wallet)
    mock_wallet.balance = 50.00
    mock_wallet.currency = "USD"
    mock_instance.get_wallet = AsyncMock(return_value=mock_wallet)

    response = client.get("/api/v1/wallet/balance")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["balance"] == 50.00
    assert json_data["currency"] == "USD"


@patch("app.api.v1.endpoints.wallet.WalletService", autospec=True)
def test_topup_wallet_api(mock_service_class: MagicMock) -> None:
    """Verifies top-up posts add balance and return updated objects."""
    mock_instance = mock_service_class.return_value
    mock_wallet = MagicMock(spec=Wallet)
    mock_wallet.id = uuid.uuid4()
    mock_wallet.user_id = mock_user.id
    mock_wallet.balance = 75.00
    mock_wallet.currency = "USD"
    mock_wallet.updated_at = "2026-07-28T14:56:00Z"
    mock_instance.topup_balance = AsyncMock(return_value=mock_wallet)

    response = client.post("/api/v1/wallet/topup", json={"amount": 25.00})
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["balance"] == 75.00


# =====================================================================
# 2. SETTLE RIDE PAYMENT & IDEMPOTENCY TESTS
# =====================================================================

@patch("app.api.v1.endpoints.payments.redis_manager")
@patch("app.api.v1.endpoints.payments.PaymentService", autospec=True)
def test_settle_ride_payment_concurrency_lock(
    mock_payment_service_class: MagicMock,
    mock_redis: MagicMock
) -> None:
    """Verifies that duplicate payments get blocked by Redis concurrency locks."""
    # Mock Redis lock failure
    mock_redis.client.set = AsyncMock(return_value=False)

    ride_id = uuid.uuid4()
    payload = {"idempotency_key": "some-random-idempotency-key"}
    response = client.post(f"/api/v1/payments/rides/{ride_id}", json=payload)
    
    assert response.status_code in (400, 422)
    assert "Concurrent payment" in response.text


# =====================================================================
# 3. REFUNDS EXEC PRIVILEGES TESTS
# =====================================================================

def test_refund_denied_if_not_admin() -> None:
    """Verifies that non-admin accounts are blocked from processing refunds."""
    payload = {
        "payment_id": str(uuid.uuid4()),
        "reason": "Trip cancelled",
        "idempotency_key": "some-refund-key"
    }
    response = client.post("/api/v1/payments/refund", json=payload)
    assert response.status_code == 403  # Access denied



