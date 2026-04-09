"""
Session web v2 (Epic 2.1) : cookies httpOnly + lecture JWT depuis cookie.
"""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.core.security import hash_password
from recyclic_api.models.user import User, UserRole, UserStatus

_V1 = settings.API_V1_STR.rstrip("/")


class TestWebSessionV2Cookies:
    def test_login_sets_cookies_when_use_web_session_cookies_true(
        self, client: TestClient, db_session: Session
    ):
        username = f"ws_v2_{uuid.uuid4().hex[:12]}"
        db_session.add(
            User(
                username=username,
                hashed_password=hash_password("TestPassword123!"),
                role=UserRole.USER,
                status=UserStatus.APPROVED,
                is_active=True,
            )
        )
        db_session.commit()

        r = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "TestPassword123!",
                "use_web_session_cookies": True,
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("access_token")
        assert settings.WEB_SESSION_ACCESS_COOKIE_NAME in client.cookies

    def test_protected_route_accepts_access_cookie_without_bearer(
        self, client: TestClient, db_session: Session
    ):
        username = f"ws_admin_{uuid.uuid4().hex[:12]}"
        db_session.add(
            User(
                username=username,
                hashed_password=hash_password("TestPassword123!"),
                role=UserRole.ADMIN,
                status=UserStatus.APPROVED,
                is_active=True,
            )
        )
        db_session.commit()

        login = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "TestPassword123!",
                "use_web_session_cookies": True,
            },
        )
        assert login.status_code == 200
        r = client.get(f"{_V1}/admin/users")
        assert r.status_code != 401

    @pytest.fixture
    def requires_redis(self):
        try:
            from recyclic_api.core.redis import get_redis

            get_redis().ping()
        except Exception as e:
            pytest.skip(f"Redis indisponible: {e}")

    def test_refresh_with_cookie_only_rotates_and_sets_cookies(
        self, requires_redis, client: TestClient, db_session: Session
    ):
        username = f"ws_ref_{uuid.uuid4().hex[:12]}"
        db_session.add(
            User(
                username=username,
                hashed_password=hash_password("TestPassword123!"),
                role=UserRole.USER,
                status=UserStatus.ACTIVE,
                is_active=True,
            )
        )
        db_session.commit()

        login = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "TestPassword123!",
                "use_web_session_cookies": True,
            },
        )
        assert login.status_code == 200

        refresh = client.post(f"{_V1}/auth/refresh", json={})
        assert refresh.status_code == 200
        body = refresh.json()
        assert body.get("access_token")
        assert body.get("refresh_token")
        assert settings.WEB_SESSION_ACCESS_COOKIE_NAME in client.cookies

    def test_login_without_web_session_flag_does_not_set_session_cookies(
        self, client: TestClient, db_session: Session
    ):
        username = f"ws_legacy_{uuid.uuid4().hex[:12]}"
        db_session.add(
            User(
                username=username,
                hashed_password=hash_password("TestPassword123!"),
                role=UserRole.USER,
                status=UserStatus.APPROVED,
                is_active=True,
            )
        )
        db_session.commit()

        r = client.post(
            f"{_V1}/auth/login",
            json={"username": username, "password": "TestPassword123!"},
        )
        assert r.status_code == 200
        assert settings.WEB_SESSION_ACCESS_COOKIE_NAME not in client.cookies
        assert settings.WEB_SESSION_REFRESH_COOKIE_NAME not in client.cookies

    def test_bearer_header_takes_priority_over_invalid_access_cookie(
        self, client: TestClient, db_session: Session
    ):
        username = f"ws_bearer_{uuid.uuid4().hex[:12]}"
        db_session.add(
            User(
                username=username,
                hashed_password=hash_password("TestPassword123!"),
                role=UserRole.USER,
                status=UserStatus.APPROVED,
                is_active=True,
            )
        )
        db_session.commit()

        login = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "TestPassword123!",
                "use_web_session_cookies": True,
            },
        )
        assert login.status_code == 200
        token = login.json()["access_token"]
        client.cookies.set(settings.WEB_SESSION_ACCESS_COOKIE_NAME, "invalid.jwt.value")
        me = client.get(
            f"{_V1}/users/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me.status_code == 200
        assert me.json().get("username") == username

    def test_sales_detail_accepts_access_cookie_without_bearer(
        self, client: TestClient, db_session: Session
    ):
        """
        GET /v1/sales/{id} : sans en-tête Bearer, le cookie d'accès web v2 authentifie
        (bearerOrCookie). Vente absente → 404 après auth (pas 401).
        Régression stories 6.5 / 6.6 (POST /sales/ partage la même résolution JWT).
        """
        username = f"ws_sales_{uuid.uuid4().hex[:12]}"
        db_session.add(
            User(
                username=username,
                hashed_password=hash_password("TestPassword123!"),
                role=UserRole.USER,
                status=UserStatus.APPROVED,
                is_active=True,
            )
        )
        db_session.commit()

        login = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "TestPassword123!",
                "use_web_session_cookies": True,
            },
        )
        assert login.status_code == 200
        missing_sale_id = str(uuid.uuid4())
        r = client.get(f"{_V1}/sales/{missing_sale_id}")
        assert r.status_code == 404

        client.cookies.clear()
        r2 = client.get(f"{_V1}/sales/{missing_sale_id}")
        assert r2.status_code == 401
        assert r2.json().get("detail") == "Unauthorized"

    def test_logout_clears_session_and_subsequent_me_is_unauthorized(
        self, client: TestClient, db_session: Session
    ):
        username = f"ws_out_{uuid.uuid4().hex[:12]}"
        db_session.add(
            User(
                username=username,
                hashed_password=hash_password("TestPassword123!"),
                role=UserRole.USER,
                status=UserStatus.APPROVED,
                is_active=True,
            )
        )
        db_session.commit()

        login = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "TestPassword123!",
                "use_web_session_cookies": True,
            },
        )
        assert login.status_code == 200
        lo = client.post(f"{_V1}/auth/logout")
        assert lo.status_code == 200
        me = client.get(f"{_V1}/users/me")
        assert me.status_code == 401

    def test_admin_strict_route_forbids_without_credentials(self, client: TestClient):
        r = client.get(f"{_V1}/admin/health/scheduler")
        assert r.status_code == 403
        assert r.json().get("detail") == "Not authenticated"

    def test_refresh_without_body_or_cookie_returns_422(self, client: TestClient):
        r = client.post(f"{_V1}/auth/refresh", json={})
        assert r.status_code == 422

    def test_pin_auth_does_not_set_web_session_cookies(
        self, client: TestClient, db_session: Session
    ):
        username = f"ws_pin_{uuid.uuid4().hex[:12]}"
        user = User(
            username=username,
            hashed_password=hash_password("TestPassword123!"),
            hashed_pin=hash_password("1234"),
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        r = client.post(
            f"{_V1}/auth/pin",
            json={"user_id": str(user.id), "pin": "1234"},
        )
        assert r.status_code == 200
        assert r.json().get("access_token")
        assert settings.WEB_SESSION_ACCESS_COOKIE_NAME not in client.cookies
        assert settings.WEB_SESSION_REFRESH_COOKIE_NAME not in client.cookies
