import pytest
from unittest.mock import patch, MagicMock

from recyclic_api.core.config import settings

# Aligné sur API_V1_STR (souvent /v1), pas /api/v1 codé en dur.
_V1 = settings.API_V1_STR.rstrip("/")

@pytest.fixture
def mock_redis():
    """Mock Redis fixture for infrastructure tests."""
    # health v1 importe get_redis au chargement du module : il faut aussi patcher ce nom.
    with (
        patch("recyclic_api.core.redis.get_redis") as mock_get_redis,
        patch("recyclic_api.api.api_v1.endpoints.health.get_redis") as mock_get_redis_v1,
    ):
        mock_redis_instance = MagicMock()
        mock_redis_instance.ping.return_value = True
        mock_get_redis.return_value = mock_redis_instance
        mock_get_redis_v1.return_value = mock_redis_instance
        yield mock_redis_instance

def test_root_endpoint(client):
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "Bienvenue sur l'API Recyclic" in data["message"]

def test_health_endpoint(client, mock_redis):
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "database" in data
    assert "redis" in data

def test_api_v1_health(client, mock_redis):
    """Test API v1 health endpoint"""
    response = client.get(f"{_V1}/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "v1"

def test_database_connection(client):
    """Test database connection"""
    response = client.get(f"{_V1}/users")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_cors_headers(client):
    """Test CORS headers"""
    response = client.options(
        f"{_V1}/users",
        headers={
            "Origin": "http://localhost:4444",
            "Access-Control-Request-Method": "GET"
        }
    )
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers

def test_api_documentation(client):
    """Test API documentation endpoints"""
    response = client.get("/docs")
    assert response.status_code == 200
    
    response = client.get(f"{_V1}/openapi.json")
    assert response.status_code == 200
    data = response.json()
    assert "openapi" in data
    assert data["info"]["title"] == "Recyclic API"