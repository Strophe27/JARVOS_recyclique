"""Tests API auth et users/me — Story 3.1, 3.3. Login, refresh, logout, signup, pin, /users/me. Pas de secrets en dur."""

import json
import uuid
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient
from jose import JWTError
from sqlalchemy.orm import Session

from api.models import User, Group, Permission, user_groups, group_permissions, AuditEvent
from api.config import get_settings
from api.services.auth import AuthService
from api.services.auth import OidcDependencyUnavailableError
from tests.conftest import TestingSessionLocal


@pytest.fixture
def active_user(db_session: Session):
    """Utilisateur actif avec mot de passe connu (pour tests login)."""
    auth = AuthService(db_session)
    user = User(
        id=uuid.uuid4(),
        username="testoperator",
        email="test@example.com",
        password_hash=auth.hash_password("secret123"),
        first_name="Test",
        last_name="User",
        role="operator",
        status="active",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def active_user_with_pin(db_session: Session):
    """Utilisateur actif avec PIN, SANS permission caisse (Story 3.3 : POST /pin → 403)."""
    auth = AuthService(db_session)
    user = User(
        id=uuid.uuid4(),
        username="pinuser",
        email="pin@example.com",
        password_hash=auth.hash_password("pass"),
        first_name="Pin",
        last_name="User",
        role="operator",
        status="active",
        pin_hash=auth.hash_pin("1234"),
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def active_user_with_pin_and_caisse(db_session: Session):
    """Utilisateur actif avec PIN et permission caisse.access (Story 3.3 : POST /pin → 200)."""
    auth = AuthService(db_session)
    user = User(
        id=uuid.uuid4(),
        username="caissepin",
        email="caissepin@example.com",
        password_hash=auth.hash_password("pass"),
        first_name="Caisse",
        last_name="Pin",
        role="operator",
        status="active",
        pin_hash=auth.hash_pin("1234"),
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    perm = Permission(code="caisse.access", label="Accès caisse")
    db_session.add(perm)
    db_session.commit()
    db_session.refresh(perm)
    group = Group(name="caisse_ops", description="Opérateurs caisse")
    db_session.add(group)
    db_session.commit()
    db_session.refresh(group)
    db_session.execute(group_permissions.insert().values(group_id=group.id, permission_id=perm.id))
    db_session.execute(user_groups.insert().values(user_id=user.id, group_id=group.id))
    db_session.commit()
    return user


def test_login_success(client: TestClient, active_user):
    """POST /v1/auth/login avec identifiants valides retourne 200, access_token, refresh_token, user."""
    resp = client.post(
        "/v1/auth/login",
        json={"username": "testoperator", "password": "secret123"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "testoperator"
    assert data["user"]["email"] == "test@example.com"
    assert data["user"]["status"] == "active"


def test_login_invalid_password(client: TestClient, active_user):
    """POST /v1/auth/login avec mauvais mot de passe retourne 401."""
    resp = client.post(
        "/v1/auth/login",
        json={"username": "testoperator", "password": "wrong"},
    )
    assert resp.status_code == 401
    assert "detail" in resp.json()


def test_login_invalid_username(client: TestClient):
    """POST /v1/auth/login avec utilisateur inexistant retourne 401."""
    resp = client.post(
        "/v1/auth/login",
        json={"username": "nobody", "password": "any"},
    )
    assert resp.status_code == 401


def test_refresh_success(client: TestClient, active_user):
    """POST /v1/auth/refresh avec refresh_token valide retourne nouveaux tokens."""
    login_resp = client.post(
        "/v1/auth/login",
        json={"username": "testoperator", "password": "secret123"},
    )
    assert login_resp.status_code == 200
    refresh_token = login_resp.json()["refresh_token"]
    resp = client.post("/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["refresh_token"] != refresh_token


def test_refresh_invalid(client: TestClient):
    """POST /v1/auth/refresh avec token invalide retourne 401."""
    resp = client.post("/v1/auth/refresh", json={"refresh_token": "invalid-token"})
    assert resp.status_code == 401


def test_logout(client: TestClient, active_user):
    """POST /v1/auth/logout avec refresh_token invalide la session (204)."""
    login_resp = client.post(
        "/v1/auth/login",
        json={"username": "testoperator", "password": "secret123"},
    )
    refresh_token = login_resp.json()["refresh_token"]
    resp = client.post("/v1/auth/logout", json={"refresh_token": refresh_token})
    assert resp.status_code == 204
    # Après logout, le refresh ne doit plus marcher
    ref_resp = client.post("/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert ref_resp.status_code == 401


def test_get_me_unauthorized(client: TestClient):
    """GET /v1/users/me sans token retourne 401."""
    resp = client.get("/v1/users/me")
    assert resp.status_code == 401


def test_get_me_success(client: TestClient, active_user):
    """GET /v1/users/me avec Bearer token retourne 200 et profil."""
    login_resp = client.post(
        "/v1/auth/login",
        json={"username": "testoperator", "password": "secret123"},
    )
    token = login_resp.json()["access_token"]
    resp = client.get("/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "testoperator"
    assert data["email"] == "test@example.com"
    assert data["status"] == "active"
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_put_me_success(client: TestClient, active_user):
    """PUT /v1/users/me met à jour first_name, last_name, email."""
    login_resp = client.post(
        "/v1/auth/login",
        json={"username": "testoperator", "password": "secret123"},
    )
    token = login_resp.json()["access_token"]
    resp = client.put(
        "/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"first_name": "Updated", "last_name": "Name", "email": "new@example.com"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["first_name"] == "Updated"
    assert data["last_name"] == "Name"
    assert data["email"] == "new@example.com"


def test_put_me_email_already_taken_400(client: TestClient, active_user, db_session: Session):
    """PUT /v1/users/me avec email déjà utilisé par un autre user retourne 400."""
    auth = AuthService(db_session)
    other = User(
        id=uuid.uuid4(),
        username="otheruser",
        email="other@example.com",
        password_hash=auth.hash_password("x"),
        role="operator",
        status="active",
    )
    db_session.add(other)
    db_session.commit()
    login_resp = client.post(
        "/v1/auth/login",
        json={"username": "testoperator", "password": "secret123"},
    )
    token = login_resp.json()["access_token"]
    resp = client.put(
        "/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"email": "other@example.com"},
    )
    assert resp.status_code == 400
    assert "already" in resp.json().get("detail", "").lower()


def test_put_me_password_success(client: TestClient, active_user):
    """PUT /v1/users/me/password change le mot de passe."""
    login_resp = client.post(
        "/v1/auth/login",
        json={"username": "testoperator", "password": "secret123"},
    )
    token = login_resp.json()["access_token"]
    resp = client.put(
        "/v1/users/me/password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "secret123", "new_password": "newsecret456"},
    )
    assert resp.status_code == 204
    # Ancien MDP ne marche plus
    bad = client.post(
        "/v1/auth/login",
        json={"username": "testoperator", "password": "secret123"},
    )
    assert bad.status_code == 401
    # Nouveau MDP marche
    good = client.post(
        "/v1/auth/login",
        json={"username": "testoperator", "password": "newsecret456"},
    )
    assert good.status_code == 200


def test_put_me_pin_success(client: TestClient, active_user_with_pin_and_caisse):
    """PUT /v1/users/me/pin définit un PIN ; POST /v1/auth/pin avec ce PIN (permission caisse) → 200."""
    login_resp = client.post(
        "/v1/auth/login",
        json={"username": "caissepin", "password": "pass"},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    resp = client.put(
        "/v1/users/me/pin",
        headers={"Authorization": f"Bearer {token}"},
        json={"new_pin": "5678"},
    )
    assert resp.status_code == 204
    pin_resp = client.post("/v1/auth/pin", json={"pin": "5678"})
    assert pin_resp.status_code == 200
    assert pin_resp.json()["user"]["username"] == "caissepin"


def test_signup_201(client: TestClient):
    """POST /v1/auth/signup crée une registration_request et retourne 201."""
    resp = client.post(
        "/v1/auth/signup",
        json={
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "password123",
            "first_name": "New",
            "last_name": "User",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "message" in data
    assert "approval" in data["message"].lower() or "submitted" in data["message"].lower()


def test_signup_duplicate_username(client: TestClient, active_user):
    """POST /v1/auth/signup avec username existant retourne 400."""
    resp = client.post(
        "/v1/auth/signup",
        json={
            "username": "testoperator",
            "email": "other@example.com",
            "password": "password123",
        },
    )
    assert resp.status_code == 400
    assert "detail" in resp.json()


def test_pin_login_success(client: TestClient, active_user_with_pin_and_caisse):
    """POST /v1/auth/pin avec PIN valide et permission caisse retourne 200 et tokens (Story 3.3)."""
    resp = client.post("/v1/auth/pin", json={"pin": "1234"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["username"] == "caissepin"
    assert "pin" not in data.get("user", {})
    assert "pin" not in data


def test_pin_login_403_without_caisse_permission(client: TestClient, active_user_with_pin):
    """POST /v1/auth/pin avec utilisateur sans permission caisse retourne 403 (Story 3.3)."""
    resp = client.post("/v1/auth/pin", json={"pin": "1234"})
    assert resp.status_code == 403
    data = resp.json()
    assert "detail" in data


def test_pin_login_invalid(client: TestClient, active_user_with_pin_and_caisse):
    """POST /v1/auth/pin avec mauvais PIN retourne 401."""
    resp = client.post("/v1/auth/pin", json={"pin": "9999"})
    assert resp.status_code == 401
    data = resp.json()
    assert "detail" in data
    assert "pin" not in data


def test_pin_login_creates_audit_event(
    client: TestClient, active_user_with_pin_and_caisse, db_session: Session
):
    """POST /v1/auth/pin réussi enregistre un événement audit session_unlocked (Story 3.3)."""
    resp = client.post("/v1/auth/pin", json={"pin": "1234"})
    assert resp.status_code == 200
    from sqlalchemy import select
    events = db_session.execute(
        select(AuditEvent).where(AuditEvent.action == "session_unlocked")
    ).scalars().all()
    assert len(events) >= 1
    assert events[0].user_id == active_user_with_pin_and_caisse.id


def test_forgot_password_200(client: TestClient):
    """POST /v1/auth/forgot-password accepte et retourne 200 (stub)."""
    resp = client.post("/v1/auth/forgot-password", json={"email": "any@example.com"})
    assert resp.status_code == 200


def test_error_format_has_detail(client: TestClient):
    """Les erreurs auth renvoient un champ detail (convention API)."""
    resp = client.post("/v1/auth/login", json={"username": "x", "password": "y"})
    assert resp.status_code == 401
    data = resp.json()
    assert "detail" in data


def test_get_session_with_cookie_returns_authenticated(
    client: TestClient, active_user_with_pin_and_caisse, db_session: Session
):
    """GET /v1/auth/session retourne authenticated=true si cookie session BFF valide."""
    auth = AuthService(db_session)
    _, session_token = auth.create_bff_session(active_user_with_pin_and_caisse.id)
    client.cookies.set(auth.settings.auth_session_cookie_name, session_token)
    resp = client.get("/v1/auth/session")
    assert resp.status_code == 200
    data = resp.json()
    assert data["authenticated"] is True
    assert data["user"]["username"] == "caissepin"
    assert "permissions" in data


def test_get_session_invalid_cookie_fail_closed(
    client: TestClient,
):
    """GET /v1/auth/session avec cookie invalide retourne authenticated=false."""
    client.cookies.set("recyclique_session", "invalid-cookie")
    resp = client.get("/v1/auth/session")
    assert resp.status_code == 200
    data = resp.json()
    assert data["authenticated"] is False
    assert data["user"] is None


def test_logout_without_body_clears_bff_cookie_session(
    client: TestClient, active_user_with_pin_and_caisse, db_session: Session
):
    """POST /v1/auth/logout sans body invalide la session BFF par cookie."""
    auth = AuthService(db_session)
    _, session_token = auth.create_bff_session(active_user_with_pin_and_caisse.id)
    client.cookies.set(auth.settings.auth_session_cookie_name, session_token)
    logout_resp = client.post("/v1/auth/logout")
    assert logout_resp.status_code == 204
    session_resp = client.get("/v1/auth/session")
    assert session_resp.status_code == 200
    assert session_resp.json()["authenticated"] is False


def test_validate_oidc_claims_requires_role_and_tenant(db_session: Session):
    """Validation OIDC fail-closed si claims role/tenant manquants."""
    auth = AuthService(db_session)
    now_plus = 9999999999
    ok, reason = auth.validate_oidc_claims(
        {
            "iss": auth.settings.oidc_issuer,
            "aud": auth.settings.oidc_audience or auth.settings.oidc_client_id,
            "exp": now_plus,
            "sub": "sub-123",
        }
    )
    assert ok is False
    assert reason in {"missing_role", "missing_tenant"}


def test_sso_start_disabled_returns_503(client: TestClient):
    """GET /v1/auth/sso/start retourne 503 si OIDC désactivé."""
    resp = client.get("/v1/auth/sso/start")
    assert resp.status_code == 503


def test_sso_start_fail_closed_when_runtime_config_incomplete(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
):
    """GET /v1/auth/sso/start retourne 503 si config OIDC runtime incomplète."""
    get_settings.cache_clear()
    monkeypatch.setenv("OIDC_ENABLED", "true")
    monkeypatch.setenv("OIDC_ISSUER", "https://idp.test")
    monkeypatch.setenv("OIDC_CLIENT_ID", "recyclique-client")
    monkeypatch.setenv("OIDC_REDIRECT_URI", "http://testserver/v1/auth/sso/callback")
    monkeypatch.setenv("OIDC_CLIENT_SECRET", "")
    try:
        resp = client.get("/v1/auth/sso/start")
        assert resp.status_code == 503
        assert resp.json()["detail"] == "OIDC runtime configuration incomplete"
    finally:
        get_settings.cache_clear()


def test_sso_callback_invalid_state_returns_400(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
):
    """GET /v1/auth/sso/callback retourne 400 si state inconnu (fail-closed)."""
    get_settings.cache_clear()
    monkeypatch.setenv("OIDC_ENABLED", "true")
    try:
        resp = client.get("/v1/auth/sso/callback", params={"code": "dummy", "state": "missing"})
        assert resp.status_code == 400
    finally:
        get_settings.cache_clear()


def test_sso_callback_nominal_sets_bff_cookie_and_redirects(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
):
    """Callback OIDC nominal: session BFF créée + redirection sans exposition de token."""
    get_settings.cache_clear()
    monkeypatch.setenv("OIDC_ENABLED", "true")
    monkeypatch.setenv("OIDC_ISSUER", "https://idp.test")
    monkeypatch.setenv("OIDC_CLIENT_ID", "recyclique-client")
    monkeypatch.setenv("OIDC_REDIRECT_URI", "http://testserver/v1/auth/sso/callback")
    try:
        async def fake_exchange(self, code: str, code_verifier: str):
            return {"id_token": "fake-id-token"}

        async def fake_decode(self, id_token: str, nonce: str):
            return {
                "iss": "https://idp.test",
                "aud": "recyclique-client",
                "exp": 9999999999,
                "sub": "test_reception",
                "role": "operator",
                "tenant": "tenant-a",
                "email": "test@reception.local",
                "nonce": nonce,
            }

        monkeypatch.setattr(AuthService, "exchange_oidc_code", fake_exchange)
        monkeypatch.setattr(AuthService, "decode_and_validate_oidc_id_token", fake_decode)

        start_resp = client.get("/v1/auth/sso/start", params={"next": "/admin"}, follow_redirects=False)
        assert start_resp.status_code == 302
        state = parse_qs(urlparse(start_resp.headers["location"]).query)["state"][0]

        callback_resp = client.get(
            "/v1/auth/sso/callback",
            params={"code": "code-123", "state": state},
            follow_redirects=False,
        )
        assert callback_resp.status_code == 302
        assert callback_resp.headers["location"] == "/admin"
        start_set_cookie = start_resp.headers.get("set-cookie", "").lower()
        assert "recyclique_session_oidc_state=" in start_set_cookie
        set_cookie = callback_resp.headers.get("set-cookie", "").lower()
        assert "recyclique_session=" in set_cookie
        assert "httponly" in set_cookie
    finally:
        get_settings.cache_clear()


def test_sso_callback_does_not_log_sensitive_details_on_failure(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
):
    """Les logs callback OIDC n'exposent pas de secret si une erreur interne contient des données sensibles."""
    get_settings.cache_clear()
    monkeypatch.setenv("OIDC_ENABLED", "true")
    monkeypatch.setenv("OIDC_ISSUER", "https://idp.test")
    monkeypatch.setenv("OIDC_CLIENT_ID", "recyclique-client")
    monkeypatch.setenv("OIDC_REDIRECT_URI", "http://testserver/v1/auth/sso/callback")
    try:
        async def fake_exchange(self, code: str, code_verifier: str):
            return {"id_token": "fake-id-token"}

        async def fake_decode(self, id_token: str, nonce: str):
            raise RuntimeError("secret-token-should-never-appear")

        monkeypatch.setattr(AuthService, "exchange_oidc_code", fake_exchange)
        monkeypatch.setattr(AuthService, "decode_and_validate_oidc_id_token", fake_decode)

        start_resp = client.get("/v1/auth/sso/start", follow_redirects=False)
        state = parse_qs(urlparse(start_resp.headers["location"]).query)["state"][0]

        with caplog.at_level("INFO"):
            callback_resp = client.get(
                "/v1/auth/sso/callback",
                params={"code": "code-123", "state": state},
                follow_redirects=False,
            )
        assert callback_resp.status_code == 401
        assert "secret-token-should-never-appear" not in caplog.text
        assert "oidc_callback_failed" in caplog.text
    finally:
        get_settings.cache_clear()


def test_sso_callback_returns_503_when_idp_dependency_unavailable(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
):
    """GET /v1/auth/sso/callback retourne 503 deterministe si dependance IdP indisponible."""
    get_settings.cache_clear()
    monkeypatch.setenv("OIDC_ENABLED", "true")
    monkeypatch.setenv("OIDC_ISSUER", "https://idp.test")
    monkeypatch.setenv("OIDC_CLIENT_ID", "recyclique-client")
    monkeypatch.setenv("OIDC_REDIRECT_URI", "http://testserver/v1/auth/sso/callback")
    try:
        async def fake_exchange(self, code: str, code_verifier: str):
            raise OidcDependencyUnavailableError("oidc_token_exchange_unavailable")

        monkeypatch.setattr(AuthService, "exchange_oidc_code", fake_exchange)

        start_resp = client.get("/v1/auth/sso/start", follow_redirects=False)
        state = parse_qs(urlparse(start_resp.headers["location"]).query)["state"][0]
        callback_resp = client.get(
            "/v1/auth/sso/callback",
            params={"code": "code-123", "state": state},
            headers={"X-Request-Id": "req-oidc-idp-unavailable"},
            follow_redirects=False,
        )
        assert callback_resp.status_code == 503
        assert callback_resp.json()["detail"] == "Service d'authentification temporairement indisponible"
        from sqlalchemy import select
        db = TestingSessionLocal()
        try:
            evt = (
                db.execute(
                    select(AuditEvent)
                    .where(AuditEvent.action == "FAIL_CLOSED_TRIGGERED")
                    .where(AuditEvent.resource_id == "req-oidc-idp-unavailable")
                    .order_by(AuditEvent.timestamp.desc())
                )
                .scalars()
                .first()
            )
            assert evt is not None
            details = json.loads(evt.details or "{}")
            assert details["request_id"] == "req-oidc-idp-unavailable"
            assert details["reason"] == "oidc_dependency_unavailable"
            assert details["status_code"] == 503
        finally:
            db.close()
    finally:
        get_settings.cache_clear()


@pytest.mark.parametrize("token_error", ["invalid_iss", "invalid_aud"])
def test_sso_callback_rejects_claims_mismatch(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    token_error: str,
):
    """GET /v1/auth/sso/callback retourne 401 en mismatch claims aud/iss (fail-closed)."""
    get_settings.cache_clear()
    monkeypatch.setenv("OIDC_ENABLED", "true")
    monkeypatch.setenv("OIDC_ISSUER", "https://idp.test")
    monkeypatch.setenv("OIDC_CLIENT_ID", "recyclique-client")
    monkeypatch.setenv("OIDC_CLIENT_SECRET", "test-secret")
    monkeypatch.setenv("OIDC_REDIRECT_URI", "http://testserver/v1/auth/sso/callback")
    try:
        async def fake_exchange(self, code: str, code_verifier: str):
            return {"id_token": "fake-id-token"}

        async def fake_decode(self, id_token: str, nonce: str):
            raise JWTError(token_error)

        monkeypatch.setattr(AuthService, "exchange_oidc_code", fake_exchange)
        monkeypatch.setattr(AuthService, "decode_and_validate_oidc_id_token", fake_decode)

        start_resp = client.get("/v1/auth/sso/start", follow_redirects=False)
        state = parse_qs(urlparse(start_resp.headers["location"]).query)["state"][0]
        request_id = f"req-oidc-claims-{token_error}"
        callback_resp = client.get(
            "/v1/auth/sso/callback",
            params={"code": "code-123", "state": state},
            headers={"X-Request-Id": request_id},
            follow_redirects=False,
        )
        assert callback_resp.status_code == 401
        assert callback_resp.json()["detail"] == "OIDC callback failed"
        from sqlalchemy import select
        db = TestingSessionLocal()
        try:
            evt = (
                db.execute(
                    select(AuditEvent)
                    .where(AuditEvent.action == "FAIL_CLOSED_TRIGGERED")
                    .where(AuditEvent.resource_id == request_id)
                    .order_by(AuditEvent.timestamp.desc())
                )
                .scalars()
                .first()
            )
            assert evt is not None
            details = json.loads(evt.details or "{}")
            assert details["request_id"] == request_id
            assert details["reason"] == token_error
            assert details["status_code"] == 401
        finally:
            db.close()
    finally:
        get_settings.cache_clear()


def test_sso_callback_rejects_state_without_browser_binding_cookie(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
):
    """Le callback OIDC echoue en fail-closed si le cookie de liaison state->navigateur manque."""
    get_settings.cache_clear()
    monkeypatch.setenv("OIDC_ENABLED", "true")
    monkeypatch.setenv("OIDC_ISSUER", "https://idp.test")
    monkeypatch.setenv("OIDC_CLIENT_ID", "recyclique-client")
    monkeypatch.setenv("OIDC_REDIRECT_URI", "http://testserver/v1/auth/sso/callback")
    try:
        async def fake_exchange(self, code: str, code_verifier: str):
            return {"id_token": "fake-id-token"}

        async def fake_decode(self, id_token: str, nonce: str):
            return {
                "iss": "https://idp.test",
                "aud": "recyclique-client",
                "exp": 9999999999,
                "sub": "test_reception",
                "role": "operator",
                "tenant": "tenant-a",
                "email": "test@reception.local",
                "nonce": nonce,
            }

        monkeypatch.setattr(AuthService, "exchange_oidc_code", fake_exchange)
        monkeypatch.setattr(AuthService, "decode_and_validate_oidc_id_token", fake_decode)

        start_resp = client.get("/v1/auth/sso/start", params={"next": "/admin"}, follow_redirects=False)
        state = parse_qs(urlparse(start_resp.headers["location"]).query)["state"][0]
        client.cookies.pop("recyclique_session_oidc_state", None)

        callback_resp = client.get(
            "/v1/auth/sso/callback",
            params={"code": "code-123", "state": state},
            headers={"X-Request-Id": "req-oidc-missing-state-binding"},
            follow_redirects=False,
        )
        assert callback_resp.status_code == 400
        assert callback_resp.json()["detail"] == "Invalid state"
    finally:
        get_settings.cache_clear()


def test_sso_callback_user_mapping_failed_writes_fail_closed_audit(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
):
    """Si mapping user echoue, callback retourne 403 et persiste un audit fail-closed structure."""
    get_settings.cache_clear()
    monkeypatch.setenv("OIDC_ENABLED", "true")
    monkeypatch.setenv("OIDC_ISSUER", "https://idp.test")
    monkeypatch.setenv("OIDC_CLIENT_ID", "recyclique-client")
    monkeypatch.setenv("OIDC_REDIRECT_URI", "http://testserver/v1/auth/sso/callback")
    try:
        async def fake_exchange(self, code: str, code_verifier: str):
            return {"id_token": "fake-id-token"}

        async def fake_decode(self, id_token: str, nonce: str):
            return {
                "iss": "https://idp.test",
                "aud": "recyclique-client",
                "exp": 9999999999,
                "sub": "unknown-user",
                "role": "operator",
                "tenant": "tenant-a",
                "nonce": nonce,
            }

        monkeypatch.setattr(AuthService, "exchange_oidc_code", fake_exchange)
        monkeypatch.setattr(AuthService, "decode_and_validate_oidc_id_token", fake_decode)
        monkeypatch.setattr(AuthService, "resolve_user_from_oidc_claims", lambda self, claims: None)

        start_resp = client.get("/v1/auth/sso/start", follow_redirects=False)
        state = parse_qs(urlparse(start_resp.headers["location"]).query)["state"][0]
        request_id = "req-oidc-user-mapping-failed"
        callback_resp = client.get(
            "/v1/auth/sso/callback",
            params={"code": "code-123", "state": state},
            headers={"X-Request-Id": request_id},
            follow_redirects=False,
        )
        assert callback_resp.status_code == 403
        assert callback_resp.json()["detail"] == "Access denied"

        from sqlalchemy import select
        db = TestingSessionLocal()
        try:
            evt = (
                db.execute(
                    select(AuditEvent)
                    .where(AuditEvent.action == "FAIL_CLOSED_TRIGGERED")
                    .where(AuditEvent.resource_id == request_id)
                    .order_by(AuditEvent.timestamp.desc())
                )
                .scalars()
                .first()
            )
            assert evt is not None
            details = json.loads(evt.details or "{}")
            assert details["request_id"] == request_id
            assert details["dependency"] == "idp"
            assert details["decision"] == "deny"
            assert details["reason"] == "user_mapping_failed"
            assert details["timestamp"]
        finally:
            db.close()
    finally:
        get_settings.cache_clear()


def test_validate_oidc_claims_rejects_invalid_issuer():
    """Validation OIDC fail-closed si claim iss ne correspond pas à l'issuer attendu."""
    db = TestingSessionLocal()
    try:
        auth = AuthService(db)
        settings = auth.settings
        previous_issuer = settings.oidc_issuer
        previous_client_id = settings.oidc_client_id
        settings.oidc_issuer = "https://idp.expected"
        settings.oidc_client_id = "recyclique-client"
        ok, reason = auth.validate_oidc_claims(
            {
                "iss": "https://idp.other",
                "aud": "recyclique-client",
                "exp": 9999999999,
                "sub": "sub-123",
                "role": "operator",
                "tenant": "tenant-a",
            }
        )
        assert ok is False
        assert reason == "invalid_iss"
        settings.oidc_issuer = previous_issuer
        settings.oidc_client_id = previous_client_id
    finally:
        db.close()


def test_validate_oidc_claims_rejects_invalid_audience():
    """Validation OIDC fail-closed si claim aud ne correspond pas au client attendu."""
    db = TestingSessionLocal()
    try:
        auth = AuthService(db)
        settings = auth.settings
        previous_issuer = settings.oidc_issuer
        previous_client_id = settings.oidc_client_id
        previous_audience = settings.oidc_audience
        settings.oidc_issuer = "https://idp.expected"
        settings.oidc_client_id = "recyclique-client"
        settings.oidc_audience = "recyclique-audience"
        ok, reason = auth.validate_oidc_claims(
            {
                "iss": "https://idp.expected",
                "aud": "unexpected-audience",
                "exp": 9999999999,
                "sub": "sub-123",
                "role": "operator",
                "tenant": "tenant-a",
            }
        )
        assert ok is False
        assert reason == "invalid_aud"
        settings.oidc_issuer = previous_issuer
        settings.oidc_client_id = previous_client_id
        settings.oidc_audience = previous_audience
    finally:
        db.close()


def test_logout_triggers_federated_logout_when_idp_endpoint_configured(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
):
    """Logout local + déclenchement logout fédéré IdP si endpoint disponible."""
    get_settings.cache_clear()
    settings = get_settings()
    settings.oidc_enabled = True
    settings.oidc_end_session_endpoint = "https://idp.test/logout"
    monkeypatch.setattr("api.services.auth.get_settings", lambda: settings)
    called = {"value": False}
    try:
        def fake_trigger(self, *, request_id: str, post_logout_redirect_uri=None, logout_hint=None):
            called["value"] = True
            assert request_id
            return True

        monkeypatch.setattr(AuthService, "trigger_oidc_federated_logout", fake_trigger)
        logout_resp = client.post("/v1/auth/logout")
        assert logout_resp.status_code == 204
        assert called["value"] is True
    finally:
        get_settings.cache_clear()
