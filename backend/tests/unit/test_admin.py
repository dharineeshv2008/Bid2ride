import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from app.core.exceptions import EntityNotFoundException
from app.models.user import User
from app.models.driver import Driver
from app.models.admin import SystemSetting
from app.dependencies.auth import get_current_user
from app.main import app

client = TestClient(app, headers={"Authorization": "Bearer test-admin-token"})

from app.dependencies.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

# Helper mock user dependency with ADMIN role
mock_admin_user = User(id=uuid.uuid4(), phone="+15550000", name="Admin Boss", role="ADMIN", email="admin@test.com")

async def override_get_current_user() -> User:
    return mock_admin_user

async def override_get_db():
    mock_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_result.scalars.return_value.first.return_value = None
    mock_result.scalar.return_value = 0
    mock_session.execute.return_value = mock_result
    yield mock_session

@pytest.fixture(autouse=True)
def override_dependencies():
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()



# =====================================================================
# 1. ADMIN DASHBOARD OVERVIEW TESTS
# =====================================================================

def test_get_dashboard_overview_api() -> None:
    """Verifies that the admin dashboard overview endpoint returns aggregations."""
    response = client.get("/api/v1/admin/dashboard")
    assert response.status_code == 200
    json_data = response.json()
    assert "metrics" in json_data
    assert "total_users" in json_data["metrics"]


def test_get_system_health_api() -> None:
    """Verifies system diagnostics check health parameters."""
    response = client.get("/api/v1/admin/system-health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["database_connected"] is True
    assert json_data["redis_connected"] is True


# =====================================================================
# 2. DRIVER VERIFICATION & AUDIT LOGS TESTS
# =====================================================================

@patch("app.api.v1.endpoints.admin.DriverRepository", autospec=True)
@patch("app.api.v1.endpoints.admin._add_admin_audit_log", autospec=True)
def test_approve_driver_verification_api(
    mock_audit: MagicMock,
    mock_drv_repo_class: MagicMock
) -> None:
    """Verifies that driver approvals update status to APPROVED and write audit logs."""
    mock_drv_repo = mock_drv_repo_class.return_value
    
    mock_driver = MagicMock(spec=Driver)
    mock_driver.id = uuid.uuid4()
    mock_driver.verification_status = "PENDING"
    mock_drv_repo.get = AsyncMock(return_value=mock_driver)

    mock_audit.return_value = AsyncMock()

    response = client.put(f"/api/v1/admin/drivers/{mock_driver.id}/approve")
    
    assert response.status_code == 200
    assert response.json()["verification_status"] == "APPROVED"
    assert mock_audit.call_count == 1  # Audit log created


# =====================================================================
# 3. SETTINGS & SYSTEM CONFIGURATION TESTS
# =====================================================================

@patch("app.api.v1.endpoints.admin.SystemSettingsService", autospec=True)
@patch("app.api.v1.endpoints.admin._add_admin_audit_log", autospec=True)
def test_update_system_setting_api(
    mock_audit: MagicMock,
    mock_settings_service_class: MagicMock
) -> None:
    """Verifies that updating system settings updates the value and writes audit logs."""
    mock_service = mock_settings_service_class.return_value
    
    mock_setting = MagicMock(spec=SystemSetting)
    mock_setting.key = "commission_rate"
    mock_setting.value = "0.20"
    mock_setting.description = "Commission rate for platform"
    mock_service.update_setting = AsyncMock(return_value=mock_setting)

    mock_audit.return_value = AsyncMock()

    response = client.put("/api/v1/admin/settings/commission_rate", json={"value": "0.20"})
    
    assert response.status_code == 200
    assert response.json()["value"] == "0.20"
    assert mock_audit.call_count == 1



