"""
Tests pour l'endpoint GET /v1/cash-sessions/current
"""
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4

from recyclic_api.core.config import settings
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.site import Site
from recyclic_api.core.security import hash_password

_V1 = settings.API_V1_STR.rstrip("/")
_TEST_DB_URL = os.getenv("TEST_DATABASE_URL", "")


def _postgres_schema_full_cash() -> bool:
    """Le conftest SQLite ne crée pas ``cash_sessions`` ; les tests DB réels passent sous Postgres."""
    return _TEST_DB_URL.startswith("postgresql")


def _minimal_site(db_session: Session) -> Site:
    """Site minimal pour satisfaire ``cash_sessions.site_id`` NOT NULL (FK ``sites``) sous PostgreSQL."""
    site = Site(name="current-endpoint-test-site", is_active=True)
    db_session.add(site)
    db_session.commit()
    db_session.refresh(site)
    return site


class TestCashSessionCurrentEndpoint:
    """Tests pour l'endpoint GET /cash-sessions/current (préfixe API_V1_STR)."""

    @pytest.mark.skipif(
        not _postgres_schema_full_cash(),
        reason="SQLite (conftest) : pas de table cash_sessions — voir test_cash_session_current_arch03 HTTP mock.",
    )
    def test_get_current_cash_session_with_open_session(self, client: TestClient, db_session: Session):
        """Test que l'endpoint retourne la session ouverte avec un statut 200."""
        # Créer un utilisateur de test
        user = User(
            id=uuid4(),
            username="test@example.com",
            hashed_password=hash_password("testpassword"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()

        site = _minimal_site(db_session)
        # Créer une session de caisse ouverte
        cash_session = CashSession(
            id=uuid4(),
            operator_id=user.id,
            site_id=site.id,
            initial_amount=50.0,
            current_amount=50.0,
            status=CashSessionStatus.OPEN
        )
        db_session.add(cash_session)
        db_session.commit()

        # Authentifier l'utilisateur
        login_response = client.post(f"{_V1}/auth/login", json={
            "username": "test@example.com",
            "password": "testpassword"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"

        # Appeler l'endpoint
        response = client.get(f"{_V1}/cash-sessions/current")

        # Vérifications
        assert response.status_code == 200
        data = response.json()
        
        # Vérifier que les données de la session sont présentes
        assert data is not None
        assert data["id"] == str(cash_session.id)
        assert data["operator_id"] == str(user.id)
        assert data["initial_amount"] == 50.0
        assert data["current_amount"] == 50.0
        assert data["status"] == "open"
        assert data["opened_at"] is not None
        assert data["closed_at"] is None

    @pytest.mark.skipif(
        not _postgres_schema_full_cash(),
        reason="SQLite (conftest) : pas de table cash_sessions — voir test_cash_session_current_arch03 HTTP mock.",
    )
    def test_get_current_cash_session_without_open_session(self, client: TestClient, db_session: Session):
        """Test que l'endpoint retourne null avec un statut 200 quand aucune session n'est ouverte."""
        # Créer un utilisateur de test
        user = User(
            id=uuid4(),
            username="test@example.com",
            hashed_password=hash_password("testpassword"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()

        # Authentifier l'utilisateur
        login_response = client.post(f"{_V1}/auth/login", json={
            "username": "test@example.com",
            "password": "testpassword"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"

        # Appeler l'endpoint
        response = client.get(f"{_V1}/cash-sessions/current")

        # Vérifications
        assert response.status_code == 200
        data = response.json()
        assert data is None

    @pytest.mark.skipif(
        not _postgres_schema_full_cash(),
        reason="SQLite (conftest) : pas de table cash_sessions — voir test_cash_session_current_arch03 HTTP mock.",
    )
    def test_get_current_cash_session_with_closed_session(self, client: TestClient, db_session: Session):
        """Test que l'endpoint retourne null quand la session est fermée."""
        # Créer un utilisateur de test
        user = User(
            id=uuid4(),
            username="test@example.com",
            hashed_password=hash_password("testpassword"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()

        site = _minimal_site(db_session)
        # Créer une session de caisse fermée
        cash_session = CashSession(
            id=uuid4(),
            operator_id=user.id,
            site_id=site.id,
            initial_amount=50.0,
            current_amount=100.0,
            status=CashSessionStatus.CLOSED
        )
        db_session.add(cash_session)
        db_session.commit()

        # Authentifier l'utilisateur
        login_response = client.post(f"{_V1}/auth/login", json={
            "username": "test@example.com",
            "password": "testpassword"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"

        # Appeler l'endpoint
        response = client.get(f"{_V1}/cash-sessions/current")

        # Vérifications
        assert response.status_code == 200
        data = response.json()
        assert data is None

    def test_get_current_cash_session_requires_authentication(self, client: TestClient):
        """Sans Bearer : require_role_strict → 403 (pas 401)."""
        response = client.get(f"{_V1}/cash-sessions/current")
        assert response.status_code == 403

    @pytest.mark.skipif(
        not _postgres_schema_full_cash(),
        reason="SQLite (conftest) : pas de table cash_sessions — voir test_cash_session_current_arch03 HTTP mock.",
    )
    def test_get_current_cash_session_with_admin_role(self, client: TestClient, db_session: Session):
        """Test que l'endpoint fonctionne avec un rôle admin."""
        # Créer un utilisateur admin
        admin_user = User(
            id=uuid4(),
            username="admin@example.com",
            hashed_password=hash_password("adminpassword"),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(admin_user)
        db_session.commit()

        site = _minimal_site(db_session)
        # Créer une session de caisse ouverte
        cash_session = CashSession(
            id=uuid4(),
            operator_id=admin_user.id,
            site_id=site.id,
            initial_amount=100.0,
            current_amount=100.0,
            status=CashSessionStatus.OPEN
        )
        db_session.add(cash_session)
        db_session.commit()

        # Authentifier l'admin
        login_response = client.post(f"{_V1}/auth/login", json={
            "username": "admin@example.com",
            "password": "adminpassword"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"

        # Appeler l'endpoint
        response = client.get(f"{_V1}/cash-sessions/current")

        # Vérifications
        assert response.status_code == 200
        data = response.json()
        assert data is not None
        assert data["operator_id"] == str(admin_user.id)
        assert data["status"] == "open"

