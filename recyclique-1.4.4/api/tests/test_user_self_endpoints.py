import pytest
from uuid import uuid4

from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.core.security import hash_password, create_access_token
from recyclic_api.schemas.user import UserResponse


def _auth_headers_for(user_id: str):
    token = create_access_token(data={"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


class TestUserSelfEndpoints:
    def test_get_me_preserves_non_numeric_telegram_id(self, client, db_session):
        """GET /users/me doit sérialiser un telegram_id alphanumérique comme en base, sans erreur 500."""
        telegram_handle = "tg_me_alpha_42"
        username = f"user_me_tg_{uuid4().hex[:12]}"
        user = User(
            id=uuid4(),
            username=username,
            hashed_password=hash_password("StrongP@ssw0rd"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
            telegram_id=telegram_handle,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        client.headers = _auth_headers_for(user.id)
        resp = client.get("/v1/users/me")
        assert resp.status_code == 200, resp.text
        data = resp.json()
        validated = UserResponse.model_validate(data)
        assert validated.telegram_id == telegram_handle
        assert data["telegram_id"] == telegram_handle

    def test_update_me(self, client, db_session):
        user = User(
            id=uuid4(),
            username="john",
            hashed_password=hash_password("StrongP@ssw0rd"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()

        client.headers = _auth_headers_for(user.id)
        resp = client.put("/v1/users/me", json={"first_name": "Jane", "last_name": "Doe"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["first_name"] == "Jane"
        assert data["last_name"] == "Doe"

    def test_change_password(self, client, db_session):
        user = User(
            id=uuid4(),
            username="john",
            hashed_password=hash_password("StrongP@ssw0rd"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()

        client.headers = _auth_headers_for(user.id)
        resp = client.put("/v1/users/me/password", json={"new_password": "AnotherP@ss1", "confirm_password": "AnotherP@ss1"})
        assert resp.status_code == 200
        assert resp.json()["message"]


