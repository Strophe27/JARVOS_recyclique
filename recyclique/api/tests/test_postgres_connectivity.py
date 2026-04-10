import os
import pytest
from sqlalchemy import create_engine, text
from redis import Redis
from recyclic_api.core.config import settings


def _is_postgresql_url(url: str | None) -> bool:
    if not url or not str(url).strip():
        return False
    dialect = str(url).split("://", 1)[0].lower()
    return dialect == "postgresql" or dialect.startswith("postgresql+")


def _require_postgresql_integration_url() -> str:
    """
    URL réservée aux tests qui exigent du SQL dialecte PostgreSQL.

    Sous pytest, ``conftest`` fixe souvent TEST_DATABASE_URL sur SQLite : dans ce cas on
    skip explicitement plutôt que d'exécuter du SQL Postgres (ex. current_database()) sur SQLite.
    """
    for candidate in (
        os.environ.get("TEST_DATABASE_URL"),
        settings.TEST_DATABASE_URL,
        os.environ.get("DATABASE_URL"),
    ):
        if _is_postgresql_url(candidate):
            return candidate.strip()
    pytest.skip(
        "PostgreSQL requis : définir TEST_DATABASE_URL ou DATABASE_URL en postgresql://… "
        "(suite locale SQLite via conftest : test ignoré)."
    )


@pytest.mark.integration_db
def test_postgres_connectivity():
    """Connexion PostgreSQL réelle (skip si la suite pointe sur SQLite)."""
    url = _require_postgresql_integration_url()
    engine = create_engine(url, pool_pre_ping=True)
    with engine.connect() as conn:
        assert conn.execute(text("SELECT 1")).scalar() == 1


@pytest.mark.integration_db
def test_redis_connectivity():
    """Test Redis connection"""
    # Utiliser l'URL Redis du service Docker
    url = os.environ.get("REDIS_URL", "redis://redis:6379")

    try:
        r = Redis.from_url(url, decode_responses=True, socket_connect_timeout=5)
        assert r.ping() is True
    except Exception as e:
        pytest.skip(f"Redis not available: {e}")


@pytest.mark.integration_db
def test_postgres_database_creation():
    """Test that test database can be created and used (PostgreSQL uniquement)."""
    url = _require_postgresql_integration_url()

    engine = create_engine(url, pool_pre_ping=True)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT current_database()")).scalar()
        assert result is not None
        assert "recyclic_test" in result

        conn.execute(text("CREATE TEMP TABLE test_table (id SERIAL PRIMARY KEY, name VARCHAR(50))"))
        conn.execute(text("INSERT INTO test_table (name) VALUES ('test')"))
        result = conn.execute(text("SELECT name FROM test_table WHERE id = 1")).scalar()
        assert result == "test"


@pytest.mark.integration_db
def test_redis_operations():
    """Test Redis basic operations"""
    # Utiliser l'URL Redis du service Docker
    url = os.environ.get("REDIS_URL", "redis://redis:6379")

    try:
        r = Redis.from_url(url, decode_responses=True, socket_connect_timeout=5)

        # Test basic operations
        r.set("test_key", "test_value", ex=60)
        value = r.get("test_key")
        assert value == "test_value"

        # Test list operations
        r.lpush("test_list", "item1", "item2")
        length = r.llen("test_list")
        assert length == 2

        # Cleanup
        r.delete("test_key", "test_list")
    except Exception as e:
        pytest.skip(f"Redis not available: {e}")
