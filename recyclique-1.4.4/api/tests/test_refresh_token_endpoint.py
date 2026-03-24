"""
Tests e2e pour l'endpoint auth/refresh
Story B42-P2: Backend – Refresh token & réémission glissante
"""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.core.security import hash_password
from recyclic_api.services.activity_service import ActivityService
from recyclic_api.schemas.auth import RefreshTokenResponse

_V1 = settings.API_V1_STR.rstrip("/")


def _unique_username(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


@pytest.fixture
def requires_redis():
    """Le refresh valide l'activité via Redis ; sans serveur, les cas 200/403 inactivité sont non déterministes."""
    try:
        from recyclic_api.core.redis import get_redis

        get_redis().ping()
    except Exception as e:
        pytest.skip(f"Redis indisponible (requis pour ces tests): {e}")


class TestRefreshTokenEndpoint:
    """Tests e2e pour l'endpoint POST .../auth/refresh."""

    def test_refresh_token_success(self, requires_redis, client: TestClient, db_session: Session):
        """Test de refresh token réussi."""
        username = _unique_username("test_refresh_user")
        hashed_password = hash_password("testpassword123")
        test_user = User(
            username=username,
            hashed_password=hashed_password,
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(test_user)
        db_session.commit()
        db_session.refresh(test_user)

        login_response = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "testpassword123",
            },
        )

        assert login_response.status_code == 200
        login_data = login_response.json()
        assert "refresh_token" in login_data
        refresh_token = login_data["refresh_token"]

        refresh_response = client.post(
            f"{_V1}/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert refresh_response.status_code == 200
        refresh_data = refresh_response.json()

        try:
            validated_response = RefreshTokenResponse(**refresh_data)
            assert validated_response.access_token is not None
            assert validated_response.refresh_token is not None
            assert validated_response.token_type == "bearer"
            assert validated_response.expires_in > 0
            assert validated_response.refresh_token != refresh_token
        except Exception as e:
            pytest.fail(f"Validation Pydantic échouée: {e}")

    def test_refresh_token_invalid(self, client: TestClient):
        """Test de refresh avec un token invalide."""
        response = client.post(
            f"{_V1}/auth/refresh",
            json={"refresh_token": "invalid_token_12345"},
        )

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "invalide" in data["detail"].lower()

    def test_refresh_token_missing(self, client: TestClient):
        """Test de refresh sans token."""
        response = client.post(
            f"{_V1}/auth/refresh",
            json={},
        )

        assert response.status_code == 422

    def test_refresh_token_reused_after_rotation(
        self, requires_redis, client: TestClient, db_session: Session
    ):
        """Test que l'ancien refresh token ne peut pas être réutilisé après rotation."""
        username = _unique_username("test_reuse_user")
        hashed_password = hash_password("testpassword123")
        test_user = User(
            username=username,
            hashed_password=hashed_password,
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(test_user)
        db_session.commit()
        db_session.refresh(test_user)

        login_response = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "testpassword123",
            },
        )

        assert login_response.status_code == 200
        refresh_token = login_response.json()["refresh_token"]

        refresh_response1 = client.post(
            f"{_V1}/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert refresh_response1.status_code == 200
        new_refresh_token = refresh_response1.json()["refresh_token"]

        refresh_response2 = client.post(
            f"{_V1}/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert refresh_response2.status_code == 401
        data = refresh_response2.json()
        assert "invalide" in data["detail"].lower() or "révoqué" in data["detail"].lower()

        refresh_response3 = client.post(
            f"{_V1}/auth/refresh",
            json={"refresh_token": new_refresh_token},
        )

        assert refresh_response3.status_code == 200

    def test_refresh_token_after_logout(self, requires_redis, client: TestClient, db_session: Session):
        """Test que le refresh token est révoqué après logout."""
        username = _unique_username("test_logout_user")
        hashed_password = hash_password("testpassword123")
        test_user = User(
            username=username,
            hashed_password=hashed_password,
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(test_user)
        db_session.commit()
        db_session.refresh(test_user)

        login_response = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "testpassword123",
            },
        )

        assert login_response.status_code == 200
        login_data = login_response.json()
        access_token = login_data["access_token"]
        refresh_token = login_data["refresh_token"]

        logout_response = client.post(
            f"{_V1}/auth/logout",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert logout_response.status_code == 200

        activity_service = ActivityService(db_session)
        activity_service.record_user_activity(str(test_user.id))

        refresh_response = client.post(
            f"{_V1}/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert refresh_response.status_code == 401
        data = refresh_response.json()
        assert "invalide" in data["detail"].lower() or "révoqué" in data["detail"].lower()

    def test_refresh_token_inactive_user(self, requires_redis, client: TestClient, db_session: Session):
        """
        Refresh refusé si aucune activité récente n'est connue (Redis).

        Le login enregistre déjà une activité : on la supprime explicitement pour
        reproduire l'absence de marqueur (équivalent clé expirée / nettoyage),
        sans révoquer le refresh token en base.
        """
        username = _unique_username("test_inactive_refresh_user")
        hashed_password = hash_password("testpassword123")
        test_user = User(
            username=username,
            hashed_password=hashed_password,
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(test_user)
        db_session.commit()
        db_session.refresh(test_user)

        login_response = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "testpassword123",
            },
        )

        assert login_response.status_code == 200
        refresh_token = login_response.json()["refresh_token"]

        ActivityService().clear_user_activity(str(test_user.id))

        refresh_response = client.post(
            f"{_V1}/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert refresh_response.status_code == 403
        data = refresh_response.json()
        assert "inactivité" in data["detail"].lower() or "expirée" in data["detail"].lower()

    def test_login_returns_refresh_token(self, client: TestClient, db_session: Session):
        """Test que le login retourne un refresh token."""
        username = _unique_username("test_login_refresh_user")
        hashed_password = hash_password("testpassword123")
        test_user = User(
            username=username,
            hashed_password=hashed_password,
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(test_user)
        db_session.commit()

        login_response = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "testpassword123",
            },
        )

        assert login_response.status_code == 200
        data = login_response.json()

        assert "refresh_token" in data
        assert data["refresh_token"] is not None
        assert "expires_in" in data
        assert data["expires_in"] > 0
