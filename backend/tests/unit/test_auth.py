import datetime
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI, Depends

from app.core.exceptions import AuthenticationException, PermissionDeniedException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token,
    verify_hashed_token,
)
from app.dependencies.auth import get_current_user, RoleRequired
from app.models.user import User, UserRole
from app.schemas.auth import OtpSendRequest, OtpVerifyRequest
from app.services.auth_service import AuthService, MockSmsProvider
from app.main import app

client = TestClient(app)


# =====================================================================
# 1. SECURITY UTILITIES TESTS (JWT & Hashing)
# =====================================================================

def test_jwt_generation_and_decoding() -> None:
    """Verifies that access and refresh tokens generate and parse claims correctly."""
    subject = uuid.uuid4()
    role = "PASSENGER"
    
    access = create_access_token(subject, role)
    payload = decode_token(access)
    
    assert payload["sub"] == str(subject)
    assert payload["role"] == role
    assert payload["type"] == "access"
    assert "exp" in payload

    jti = uuid.uuid4()
    refresh = create_refresh_token(subject, jti)
    refresh_payload = decode_token(refresh)
    
    assert refresh_payload["sub"] == str(subject)
    assert refresh_payload["jti"] == str(jti)
    assert refresh_payload["type"] == "refresh"


def test_token_hashing_and_verification() -> None:
    """Verifies that secure token hashing acts cryptographically equivalent."""
    raw_token = "some-long-refresh-token-string"
    hashed = hash_token(raw_token)
    
    assert hashed != raw_token
    assert len(hashed) == 64  # SHA-256 length hex digest
    assert verify_hashed_token(raw_token, hashed) is True
    assert verify_hashed_token("wrong-token", hashed) is False


# =====================================================================
# 2. RBAC DEPENDENCY TESTS
# =====================================================================

def test_role_required_passes() -> None:
    """Verifies that allowed roles bypass role verification check."""
    checker = RoleRequired(allowed_roles=["ADMIN", "DRIVER"])
    mock_user = MagicMock(spec=User)
    mock_user.role = "DRIVER"
    
    # Should not throw any exception
    assert checker(mock_user) == mock_user


def test_role_required_raises_denied() -> None:
    """Verifies that disallowed roles throw PermissionDeniedException."""
    checker = RoleRequired(allowed_roles=["ADMIN"])
    mock_user = MagicMock(spec=User)
    mock_user.role = "PASSENGER"
    
    with pytest.raises(PermissionDeniedException):
        checker(mock_user)


# =====================================================================
# 3. AUTH SERVICE INTEGRATION TESTS
# =====================================================================

@pytest.mark.asyncio
async def test_send_otp_creates_session() -> None:
    """Verifies that dispatching OTP registers session in DB."""
    mock_session = AsyncMock()
    sms_provider = MockSmsProvider()
    
    auth_service = AuthService(mock_session, sms_provider)
    phone = "+15550199"
    
    session_id = await auth_service.send_otp(phone)
    assert isinstance(session_id, uuid.UUID)
    assert mock_session.add.call_count == 1  # OtpSession registered


# =====================================================================
# 4. REST API E2E ENDPOINTS TESTS
# =====================================================================

@patch("app.api.v1.endpoints.auth.AuthService", autospec=True)
def test_send_otp_api_route(mock_service_class: MagicMock) -> None:
    """Verifies post OTP endpoint calls send service."""
    mock_instance = mock_service_class.return_value
    mock_session_id = uuid.uuid4()
    mock_instance.send_otp = AsyncMock(return_value=mock_session_id)

    response = client.post("/api/v1/auth/otp/send", json={"phone": "+15550199"})
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "success"
    assert json_data["session_id"] == str(mock_session_id)


@patch("app.api.v1.endpoints.auth.AuthService", autospec=True)
def test_verify_otp_api_route(mock_service_class: MagicMock) -> None:
    """Verifies OTP validation returns JWT pair."""
    mock_instance = mock_service_class.return_value
    mock_instance.verify_otp = AsyncMock(return_value=("access-token-123", "refresh-token-456"))

    payload = {
        "session_id": str(uuid.uuid4()),
        "code": "8492"
    }
    response = client.post("/api/v1/auth/otp/verify", json=payload)
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["access_token"] == "access-token-123"
    assert json_data["refresh_token"] == "refresh-token-456"
    assert json_data["token_type"] == "bearer"


@patch("app.api.v1.endpoints.auth.AuthService", autospec=True)
def test_refresh_token_api_route(mock_service_class: MagicMock) -> None:
    """Verifies refresh token rotation route."""
    mock_instance = mock_service_class.return_value
    mock_instance.rotate_tokens = AsyncMock(return_value=("new-access", "new-refresh"))

    response = client.post("/api/v1/auth/refresh", json={"refresh_token": "old-refresh"})
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["access_token"] == "new-access"
    assert json_data["refresh_token"] == "new-refresh"


@patch("app.api.v1.endpoints.auth.AuthService", autospec=True)
def test_logout_api_route(mock_service_class: MagicMock) -> None:
    """Verifies session logout route."""
    mock_instance = mock_service_class.return_value
    mock_instance.logout = AsyncMock()

    response = client.post("/api/v1/auth/logout", json={"refresh_token": "some-refresh"})
    assert response.status_code == 200
    assert response.json()["status"] == "success"


def test_get_current_user_profile_unauthorized() -> None:
    """Verifies that requests without Auth Header raise 401 HTTP credentials errors."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401  # HTTPBearer returns 401 'Not authenticated'


@patch("app.api.v1.endpoints.auth.AuthService", autospec=True)
def test_firebase_login_api_route(mock_service_class: MagicMock) -> None:
    """Verifies Firebase login endpoint returns JWT access/refresh token and user."""
    mock_instance = mock_service_class.return_value
    mock_user = MagicMock(spec=User)
    mock_user.id = uuid.uuid4()
    mock_user.phone = "+919876543210"
    mock_user.name = "Guest_3210"
    mock_user.role = "PASSENGER"
    mock_user.email = None
    
    mock_instance.firebase_login = AsyncMock(return_value=("access-token-789", "refresh-token-012", mock_user))

    payload = {
        "firebase_token": "mock-token-+919876543210",
        "role": "PASSENGER",
        "name": "Guest_3210"
    }
    response = client.post("/api/v1/auth/firebase-login", json=payload)
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["access_token"] == "access-token-789"
    assert json_data["refresh_token"] == "refresh-token-012"
    assert json_data["token_type"] == "bearer"
    assert json_data["user"]["phone"] == "+919876543210"

