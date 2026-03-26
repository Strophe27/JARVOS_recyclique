"""
Tests pour POST {API_V1_STR}/users/link-telegram — flux Telegram retiré (410 Gone).
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.core.security import hash_password
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.services.telegram_link_service import TELEGRAM_LINK_DISABLED_DETAIL

_LINK_TELEGRAM_PATH = f"{settings.API_V1_STR.rstrip('/')}/users/link-telegram"


class TestTelegramLinkEndpoint:
    """POST .../users/link-telegram renvoie toujours 410 ; pas d'écriture DB."""

    def test_link_telegram_returns_410_with_stable_detail(self, client: TestClient, db_session: Session):
        hashed_password = hash_password("testpassword123")
        test_user = User(
            username="testuser_telegram",
            hashed_password=hashed_password,
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True,
        )
        db_session.add(test_user)
        db_session.commit()
        db_session.refresh(test_user)

        response = client.post(
            _LINK_TELEGRAM_PATH,
            json={
                "username": "testuser_telegram",
                "password": "testpassword123",
                "telegram_id": "123456789",
            },
        )

        assert response.status_code == 410
        assert response.json()["detail"] == TELEGRAM_LINK_DISABLED_DETAIL

        updated_user = db_session.query(User).filter(User.id == test_user.id).first()
        assert updated_user.telegram_id is None

    def test_link_telegram_does_not_touch_db_even_if_payload_valid(self, client: TestClient, db_session: Session):
        """Même avec des identifiants valides, aucune mise à jour telegram_id."""
        hashed_password = hash_password("password2")
        user = User(
            username="user2",
            hashed_password=hashed_password,
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()

        response = client.post(
            _LINK_TELEGRAM_PATH,
            json={
                "username": "user2",
                "password": "password2",
                "telegram_id": "999888777",
            },
        )

        assert response.status_code == 410
        db_session.refresh(user)
        assert user.telegram_id is None

    def test_link_telegram_validation_error_missing_fields(self, client: TestClient):
        response = client.post(
            _LINK_TELEGRAM_PATH,
            json={"username": "testuser"},
        )

        assert response.status_code == 422
        assert "detail" in response.json()

    def test_link_telegram_empty_string_fields_still_410(self, client: TestClient):
        """Champs présents mais vides : validation OK, puis 410 (plus d'auth métier)."""
        response = client.post(
            _LINK_TELEGRAM_PATH,
            json={
                "username": "",
                "password": "",
                "telegram_id": "",
            },
        )

        assert response.status_code == 410
        assert response.json()["detail"] == TELEGRAM_LINK_DISABLED_DETAIL

    def test_openapi_documents_410_for_link_telegram(self, client: TestClient, openapi_schema):
        post_def = openapi_schema["paths"][_LINK_TELEGRAM_PATH]["post"]
        assert "410" in post_def.get("responses", {})
