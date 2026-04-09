import os
import uuid

import pytest
from sqlalchemy import select

from fastapi.testclient import TestClient

from recyclic_api.core.database import SessionLocal
from recyclic_api.main import app
from recyclic_api.models.user import User, UserRole

from tests.memory_redis_for_tests import MemoryRedisForTests


@pytest.fixture(autouse=True)
def _stub_redis_for_health(monkeypatch):
    """Le lifespan appelle GET /health ; ``ping()`` Redis sans serveur peut bloquer indéfiniment."""
    from recyclic_api.core import redis as redis_core

    monkeypatch.setattr(redis_core, "redis_client", MemoryRedisForTests())


def test_super_admin_created_on_startup_when_env_set_with_username(db_session):
    # Arrange
    unique_username = f"first_super_{uuid.uuid4().hex[:8]}"
    os.environ["FIRST_SUPER_ADMIN_USERNAME"] = unique_username
    os.environ["FIRST_SUPER_ADMIN_PASSWORD"] = "StrongPassw0rd!"

    # Act: le lifespan (bootstrap super-admin) ne s'exécute qu'avec ``with TestClient(app)`` ;
    # un simple GET sans context manager ne déclenche pas le lifespan (Starlette / httpx).
    with TestClient(app) as client:
        resp = client.get("/health")
    assert resp.status_code in (200, 503)

    # Assert: db_session voit le snapshot de la transaction conftest ; startup commit ailleurs → session fraîche.
    with SessionLocal() as read_db:
        result = read_db.execute(select(User).where(User.username == unique_username))
        user = result.scalar_one_or_none()
    assert user is not None
    assert user.role == UserRole.SUPER_ADMIN


def test_super_admin_bootstrap_is_idempotent(db_session):
    unique_username = f"first_super_{uuid.uuid4().hex[:8]}"
    os.environ["FIRST_SUPER_ADMIN_USERNAME"] = unique_username
    os.environ["FIRST_SUPER_ADMIN_PASSWORD"] = "StrongPassw0rd!"

    # Deux cycles lifespan = deux « démarrages » ; la création super-admin doit rester idempotente.
    with TestClient(app) as client:
        client.get("/health")
    with TestClient(app) as client:
        client.get("/health")

    with SessionLocal() as read_db:
        users = read_db.execute(select(User).where(User.username == unique_username)).scalars().all()
    assert len(users) == 1
