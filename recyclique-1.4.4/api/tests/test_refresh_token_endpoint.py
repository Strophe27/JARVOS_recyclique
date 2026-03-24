"""
Tests e2e pour l'endpoint /v1/auth/refresh
Story B42-P2: Backend – Refresh token & réémission glissante
"""
import pytest
import time
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.main import app
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.core.security import hash_password
from recyclic_api.services.activity_service import ActivityService
from recyclic_api.schemas.auth import RefreshTokenResponse


class TestRefreshTokenEndpoint:
    """Tests e2e pour l'endpoint POST /v1/auth/refresh."""

    def test_refresh_token_success(self, client: TestClient, db_session: Session):
        """Test de refresh token réussi."""
        # Créer un utilisateur de test
        hashed_password = hash_password("testpassword123")
        test_user = User(
            username="test_refresh_user",
            hashed_password=hashed_password,
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(test_user)
        db_session.commit()
        db_session.refresh(test_user)

        # Login pour obtenir un refresh token
        login_response = client.post(
            "/v1/auth/login",
            json={
                "username": "test_refresh_user",
                "password": "testpassword123",
            },
        )

        assert login_response.status_code == 200
        login_data = login_response.json()
        assert "refresh_token" in login_data
        refresh_token = login_data["refresh_token"]

        # Enregistrer une activité récente
        activity_service = ActivityService(db_session)
        activity_service.record_user_activity(str(test_user.id))

        # Utiliser le refresh token pour obtenir un nouveau access token
        refresh_response = client.post(
            "/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert refresh_response.status_code == 200
        refresh_data = refresh_response.json()

        # Validation du schéma Pydantic
        try:
            validated_response = RefreshTokenResponse(**refresh_data)
            assert validated_response.access_token is not None
            assert validated_response.refresh_token is not None
            assert validated_response.token_type == "bearer"
            assert validated_response.expires_in > 0
            # Le nouveau refresh token doit être différent
            assert validated_response.refresh_token != refresh_token
        except Exception as e:
            pytest.fail(f"Validation Pydantic échouée: {e}")

    def test_refresh_token_invalid(self, client: TestClient):
        """Test de refresh avec un token invalide."""
        response = client.post(
            "/v1/auth/refresh",
            json={"refresh_token": "invalid_token_12345"},
        )

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "invalide" in data["detail"].lower()

    def test_refresh_token_missing(self, client: TestClient):
        """Test de refresh sans token."""
        response = client.post(
            "/v1/auth/refresh",
            json={},
        )

        assert response.status_code == 422  # Validation error

    def test_refresh_token_reused_after_rotation(self, client: TestClient, db_session: Session):
        """Test que l'ancien refresh token ne peut pas être réutilisé après rotation."""
        # Créer un utilisateur de test
        hashed_password = hash_password("testpassword123")
        test_user = User(
            username="test_reuse_user",
            hashed_password=hashed_password,
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(test_user)
        db_session.commit()
        db_session.refresh(test_user)

        # Login
        login_response = client.post(
            "/v1/auth/login",
            json={
                "username": "test_reuse_user",
                "password": "testpassword123",
            },
        )

        assert login_response.status_code == 200
        refresh_token = login_response.json()["refresh_token"]

        # Enregistrer une activité
        activity_service = ActivityService(db_session)
        activity_service.record_user_activity(str(test_user.id))

        # Premier refresh (rotation)
        refresh_response1 = client.post(
            "/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert refresh_response1.status_code == 200
        new_refresh_token = refresh_response1.json()["refresh_token"]

        # Tenter de réutiliser l'ancien refresh token
        refresh_response2 = client.post(
            "/v1/auth/refresh",
            json={"refresh_token": refresh_token},  # Ancien token
        )

        assert refresh_response2.status_code == 401
        data = refresh_response2.json()
        assert "invalide" in data["detail"].lower() or "révoqué" in data["detail"].lower()

        # Le nouveau refresh token doit fonctionner
        activity_service.record_user_activity(str(test_user.id))
        refresh_response3 = client.post(
            "/v1/auth/refresh",
            json={"refresh_token": new_refresh_token},
        )

        assert refresh_response3.status_code == 200

    def test_refresh_token_after_logout(self, client: TestClient, db_session: Session):
        """Test que le refresh token est révoqué après logout."""
        # Créer un utilisateur de test
        hashed_password = hash_password("testpassword123")
        test_user = User(
            username="test_logout_user",
            hashed_password=hashed_password,
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(test_user)
        db_session.commit()
        db_session.refresh(test_user)

        # Login
        login_response = client.post(
            "/v1/auth/login",
            json={
                "username": "test_logout_user",
                "password": "testpassword123",
            },
        )

        assert login_response.status_code == 200
        login_data = login_response.json()
        access_token = login_data["access_token"]
        refresh_token = login_data["refresh_token"]

        # Logout
        logout_response = client.post(
            "/v1/auth/logout",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert logout_response.status_code == 200

        # Tenter de réutiliser le refresh token après logout
        activity_service = ActivityService(db_session)
        activity_service.record_user_activity(str(test_user.id))

        refresh_response = client.post(
            "/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert refresh_response.status_code == 401
        data = refresh_response.json()
        assert "invalide" in data["detail"].lower() or "révoqué" in data["detail"].lower()

    def test_refresh_token_inactive_user(self, client: TestClient, db_session: Session):
        """Test que le refresh est refusé si l'utilisateur est inactif trop longtemps."""
        # Créer un utilisateur de test
        hashed_password = hash_password("testpassword123")
        test_user = User(
            username="test_inactive_refresh_user",
            hashed_password=hashed_password,
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(test_user)
        db_session.commit()
        db_session.refresh(test_user)

        # Login
        login_response = client.post(
            "/v1/auth/login",
            json={
                "username": "test_inactive_refresh_user",
                "password": "testpassword123",
            },
        )

        assert login_response.status_code == 200
        refresh_token = login_response.json()["refresh_token"]

        # Ne pas enregistrer d'activité (ou attendre que l'activité expire)
        # ActivityService retournera None si pas d'activité

        # Tenter de refresh sans activité récente
        refresh_response = client.post(
            "/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert refresh_response.status_code == 403  # Forbidden (inactivité)
        data = refresh_response.json()
        assert "inactivité" in data["detail"].lower() or "expirée" in data["detail"].lower()

    def test_login_returns_refresh_token(self, client: TestClient, db_session: Session):
        """Test que le login retourne un refresh token."""
        # Créer un utilisateur de test
        hashed_password = hash_password("testpassword123")
        test_user = User(
            username="test_login_refresh_user",
            hashed_password=hashed_password,
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(test_user)
        db_session.commit()

        # Login
        login_response = client.post(
            "/v1/auth/login",
            json={
                "username": "test_login_refresh_user",
                "password": "testpassword123",
            },
        )

        assert login_response.status_code == 200
        data = login_response.json()

        # Vérifier que refresh_token est présent
        assert "refresh_token" in data
        assert data["refresh_token"] is not None
        assert "expires_in" in data
        assert data["expires_in"] > 0

