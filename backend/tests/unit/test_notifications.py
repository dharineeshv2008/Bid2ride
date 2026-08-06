import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from app.core.exceptions import PermissionDeniedException
from app.models.user import User
from app.models.notification import Notification
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
# 1. NOTIFICATIONS LIST & MARK READ TESTS
# =====================================================================

@patch("app.api.v1.endpoints.notifications.NotificationService", autospec=True)
def test_list_unread_notifications_api(mock_service_class: MagicMock) -> None:
    """Verifies unread notifications endpoints retrieve unread items."""
    mock_instance = mock_service_class.return_value
    mock_notification = MagicMock(spec=Notification)
    mock_notification.id = uuid.uuid4()
    mock_notification.user_id = mock_user.id
    mock_notification.title = "New Bid"
    mock_notification.body = "A driver bid $15"
    mock_notification.status = "UNREAD"
    mock_notification.created_at = "2026-07-28T14:58:00Z"
    
    mock_instance.get_unread_notifications = AsyncMock(return_value=[mock_notification])

    response = client.get("/api/v1/notifications/unread")
    assert response.status_code == 200
    json_data = response.json()
    assert len(json_data) == 1
    assert json_data[0]["title"] == "New Bid"


# =====================================================================
# 2. PREFERENCES (REDIS DYNAMICS) TESTS
# =====================================================================

@patch("app.api.v1.endpoints.notifications.NotificationService", autospec=True)
def test_get_preferences_api(mock_service_class: MagicMock) -> None:
    """Verifies user can read their notification preferences configurations."""
    mock_instance = mock_service_class.return_value
    mock_instance.get_preferences = AsyncMock(return_value={
        "email_enabled": True,
        "sms_enabled": False,
        "push_enabled": True,
        "in_app_enabled": True
    })

    response = client.get("/api/v1/notifications/preferences")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["email_enabled"] is True
    assert json_data["sms_enabled"] is False


# =====================================================================
# 3. ADMIN BROADCAST COMPLIANCE TESTS
# =====================================================================

def test_broadcast_forbidden_for_passengers() -> None:
    """Verifies that passengers get 403 Forbidden when trying to trigger broadcasts."""
    payload = {
        "title": "System Alert",
        "body": "Scheduled database updates in progress tonight."
    }
    response = client.post("/api/v1/notifications/broadcast", json=payload)
    assert response.status_code == 403



