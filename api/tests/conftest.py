# Pytest fixtures pour l'API — DB test (SQLite in-memory), user mock (Story 6.1).
# client : session-scoped pour éviter UNIQUE constraint quand plusieurs modules utilisent le client.

import os
from pathlib import Path

# Story 9.2 : activer le module decla en tests pour GET /v1/declarative/export (avant tout import api.main)
_conftest_dir = Path(__file__).resolve().parent
_api_dir = _conftest_dir.parent
os.environ.setdefault("MODULES_CONFIG_PATH", str(_api_dir / "config" / "modules.test.toml"))
os.environ.setdefault("OIDC_CLIENT_SECRET", "test-secret")

import uuid
from collections.abc import Generator

import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import api.models  # noqa: F401 — enregistre tous les modèles avec Base
from api.db import get_db
from api.db.session import Base
from api.main import app
from api.models import User


# Moteur SQLite en mémoire pour les tests (StaticPool = une seule connexion partagée)
TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
Base.metadata.create_all(bind=TEST_ENGINE)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)
TestingSessionLocal = TestSessionLocal  # alias for test_cash_sessions


def _reset_test_database() -> None:
    """Nettoie toutes les tables pour isoler les campagnes de test critiques."""
    with TEST_ENGINE.begin() as connection:
        for table in reversed(Base.metadata.sorted_tables):
            connection.execute(table.delete())


def _seed_fake_user_for_auth_flows() -> None:
    """Réinjecte le site/user de test requis pour certains flux auth (OIDC callback)."""
    from api.models import Site

    db = TestingSessionLocal()
    try:
        site = db.get(Site, FAKE_SITE_ID)
        if site is None:
            db.add(Site(id=FAKE_SITE_ID, name="Test Site", is_active=True))
            db.flush()
        user = db.get(User, FAKE_USER_ID)
        if user is None:
            db.add(_get_fake_user())
        db.commit()
    finally:
        db.close()


def override_get_db() -> Generator[Session, None, None]:
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Utilisateur factice pour les tests réception (doit exister en BDD pour les FK)
FAKE_USER_ID = uuid.uuid4()
FAKE_SITE_ID = uuid.uuid4()


def _get_fake_user():
    from api.models import Site, User
    u = User(
        id=FAKE_USER_ID,
        username="test_reception",
        email="test@reception.local",
        password_hash="hash",
        role="operator",
        status="active",
        site_id=FAKE_SITE_ID,
        first_name="Test",
        last_name="Reception",
    )
    return u


FAKE_USER = _get_fake_user()


def override_get_current_user():
    return FAKE_USER


@pytest.fixture(scope="session")
def _db_with_user():
    """Session-scoped : crée les tables et insère site + user une seule fois."""
    from api.models import Site
    Base.metadata.create_all(bind=TEST_ENGINE)
    db = TestSessionLocal()
    try:
        site = Site(id=FAKE_SITE_ID, name="Test Site", is_active=True)
        db.add(site)
        db.add(FAKE_USER)
        db.commit()
    finally:
        db.close()


@pytest.fixture
def client(_db_with_user):
    """Client API authentifié (reception.access) pour tests réception. Function-scoped pour ne pas polluer les tests sans auth."""
    from api.core import deps

    # Réinjecter user/site si un test précédent (ex. auth_client) a reset la BDD
    _seed_fake_user_for_auth_flows()

    original_get_codes = deps.get_user_permission_codes_from_user

    def mock_get_codes(db, user):
        if user and user.id == FAKE_USER_ID:
            return {"reception.access", "admin", "super_admin"}
        return set()

    deps.get_user_permission_codes_from_user = mock_get_codes
    app.dependency_overrides[get_db] = override_get_db

    def _get_current_user(db: Session = Depends(get_db)):
        user = db.get(User, FAKE_USER_ID)
        if user is None:
            raise RuntimeError("Test user not found in DB")
        return user

    app.dependency_overrides[deps.get_current_user] = _get_current_user

    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    deps.get_user_permission_codes_from_user = original_get_codes


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Session DB isolée pour les suites auth/session."""
    _reset_test_database()
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        _reset_test_database()


@pytest.fixture
def auth_client() -> Generator[TestClient, None, None]:
    """Client API sans override get_current_user pour tests auth/session."""
    _reset_test_database()
    _seed_fake_user_for_auth_flows()
    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.clear()
        _reset_test_database()


@pytest.fixture
def auth_headers() -> dict:
    """Headers pour routes protegees (admin). get_current_user est override par client -> pas de Bearer requis."""
    return {}
