import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_read_root() -> None:
    """Verifies that the index endpoint returns correct server information."""
    response = client.get("/")
    assert response.status_code == 200
    json_data = response.json()
    assert "project" in json_data
    assert json_data["status"] == "online"


@pytest.mark.asyncio
@patch("app.main.check_database_health", new_callable=AsyncMock)
@patch("app.core.redis.redis_manager.ping", new_callable=AsyncMock)
async def test_health_check_healthy(mock_redis_ping: AsyncMock, mock_db_health: AsyncMock) -> None:
    """Verifies the health check output when both datastores are active."""
    mock_db_health.return_value = True
    mock_redis_ping.return_value = True

    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "healthy"
    assert json_data["services"]["database"] == "online"
    assert json_data["services"]["redis"] == "online"


@pytest.mark.asyncio
@patch("app.main.check_database_health", new_callable=AsyncMock)
@patch("app.core.redis.redis_manager.ping", new_callable=AsyncMock)
async def test_health_check_unhealthy(mock_redis_ping: AsyncMock, mock_db_health: AsyncMock) -> None:
    """Verifies the health check output when the database is offline."""
    mock_db_health.return_value = False
    mock_redis_ping.return_value = True

    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "unhealthy"
    assert json_data["services"]["database"] == "offline"
    assert json_data["services"]["redis"] == "online"
