"""Story 2.4 — step-up PIN, idempotence et corrélation sur POST .../cash-sessions/{id}/close."""

from __future__ import annotations

import os
import uuid
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from recyclic_api.core.auth import create_access_token
from recyclic_api.core.config import settings
from recyclic_api.core.security import hash_password
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus

_V1 = settings.API_V1_STR.rstrip("/")
_TEST_PIN = "1234"


@pytest.fixture
def user_with_pin(db_session):
    u = User(
        id=uuid.uuid4(),
        username=f"stepup_{uuid.uuid4().hex[:8]}",
        email="stepup@example.com",
        hashed_password=hash_password("Password123!"),
        hashed_pin=hash_password(_TEST_PIN),
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


@pytest.fixture
def user_without_pin(db_session):
    u = User(
        id=uuid.uuid4(),
        username=f"nopin_{uuid.uuid4().hex[:8]}",
        email=f"nopin_{uuid.uuid4().hex[:8]}@example.com",
        hashed_password=hash_password("Password123!"),
        hashed_pin=None,
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


@pytest.fixture
def site(db_session):
    s = Site(
        name="Step-up Site",
        address="1 rue",
        city="Paris",
        postal_code="75001",
        country="FR",
        is_active=True,
    )
    db_session.add(s)
    db_session.commit()
    db_session.refresh(s)
    return s


@pytest.fixture
def open_session(db_session, user_with_pin, site):
    sess = CashSession(
        operator_id=user_with_pin.id,
        site_id=site.id,
        initial_amount=50.0,
        current_amount=75.0,
        status=CashSessionStatus.OPEN,
        total_sales=25.0,
        total_items=3,
    )
    db_session.add(sess)
    db_session.flush()
    sid = str(sess.id)
    db_session.commit()
    return sid


@pytest.fixture
def report_environment(monkeypatch, tmp_path):
    report_dir = tmp_path / "reports"
    monkeypatch.setattr(settings, "CASH_SESSION_REPORT_DIR", str(report_dir))
    monkeypatch.setattr(settings, "CASH_SESSION_REPORT_RECIPIENT", "reports@example.com")
    report_dir.mkdir(parents=True, exist_ok=True)

    def _fake_generate(db_session, cash_session, reports_dir=None):
        target_dir = Path(reports_dir) if reports_dir else report_dir
        target_dir.mkdir(parents=True, exist_ok=True)
        file_path = target_dir / f"{cash_session.id}.csv"
        file_path.write_text("session_id\n", encoding="utf-8")
        return file_path

    fake_email_service = MagicMock()
    fake_email_service.send_email.return_value = True
    fake_email_service.report_dir = report_dir

    monkeypatch.setattr(
        "recyclic_api.api.api_v1.endpoints.cash_sessions.generate_cash_session_report",
        _fake_generate,
    )
    monkeypatch.setattr(
        "recyclic_api.api.api_v1.endpoints.cash_sessions.get_email_service",
        lambda: fake_email_service,
    )


def _auth_pin_headers(user_id) -> dict:
    return {
        "Authorization": f"Bearer {create_access_token(data={'sub': str(user_id)})}",
        "X-Step-Up-Pin": _TEST_PIN,
    }


def test_close_without_step_up_pin_forbidden(client, open_session, user_with_pin):
    r = client.post(
        f"{_V1}/cash-sessions/{open_session}/close",
        json={"actual_amount": 75.0, "variance_comment": None},
        headers={"Authorization": f"Bearer {create_access_token(data={'sub': str(user_with_pin.id)})}"},
    )
    assert r.status_code == 403
    assert r.json()["code"] == "STEP_UP_PIN_REQUIRED"


def test_close_with_invalid_step_up_pin_forbidden(client, open_session, user_with_pin):
    r = client.post(
        f"{_V1}/cash-sessions/{open_session}/close",
        json={"actual_amount": 75.0, "variance_comment": None},
        headers={
            "Authorization": f"Bearer {create_access_token(data={'sub': str(user_with_pin.id)})}",
            "X-Step-Up-Pin": "9999",
        },
    )
    assert r.status_code == 403
    assert r.json()["code"] == "STEP_UP_PIN_INVALID"


def test_close_pin_not_configured_forbidden(client, db_session, user_without_pin, site):
    sess = CashSession(
        operator_id=user_without_pin.id,
        site_id=site.id,
        initial_amount=50.0,
        current_amount=75.0,
        status=CashSessionStatus.OPEN,
        total_sales=25.0,
        total_items=3,
    )
    db_session.add(sess)
    db_session.flush()
    sid = str(sess.id)
    db_session.commit()
    r = client.post(
        f"{_V1}/cash-sessions/{sid}/close",
        json={"actual_amount": 75.0, "variance_comment": None},
        headers={
            "Authorization": f"Bearer {create_access_token(data={'sub': str(user_without_pin.id)})}",
            "X-Step-Up-Pin": _TEST_PIN,
        },
    )
    assert r.status_code == 403
    assert r.json()["code"] == "STEP_UP_PIN_NOT_CONFIGURED"


def test_close_step_up_locked_too_many_requests(
    client, open_session, user_with_pin, monkeypatch
):
    monkeypatch.setattr(
        "recyclic_api.core.step_up._is_locked_out",
        lambda _redis, _uid: True,
    )
    r = client.post(
        f"{_V1}/cash-sessions/{open_session}/close",
        json={"actual_amount": 75.0, "variance_comment": None},
        headers=_auth_pin_headers(user_with_pin.id),
    )
    assert r.status_code == 429
    assert r.json()["code"] == "STEP_UP_LOCKED"


@pytest.mark.skipif(
    os.getenv("TEST_DATABASE_URL", "").startswith("sqlite"),
    reason="Fermeture caisse complète (join cash_registers) : exécuter sous PostgreSQL",
)
def test_idempotency_replays_response(
    client,
    db_session,
    user_with_pin,
    site,
    report_environment,
):
    """Deux requêtes identiques avec la même Idempotency-Key → même corps (sans double fermeture)."""
    sess = CashSession(
        operator_id=user_with_pin.id,
        site_id=site.id,
        initial_amount=40.0,
        current_amount=90.0,
        status=CashSessionStatus.OPEN,
        total_sales=50.0,
        total_items=2,
    )
    db_session.add(sess)
    db_session.flush()
    sid = str(sess.id)
    db_session.commit()

    body = {"actual_amount": 90.0, "variance_comment": None}
    headers = {
        **_auth_pin_headers(user_with_pin.id),
        "Idempotency-Key": "idem-test-key-001",
    }
    r1 = client.post(
        f"{_V1}/cash-sessions/{sid}/close",
        json=body,
        headers=headers,
    )
    assert r1.status_code == 200
    j1 = r1.json()

    r2 = client.post(
        f"{_V1}/cash-sessions/{sid}/close",
        json=body,
        headers=headers,
    )
    assert r2.status_code == 200
    assert r2.json() == j1


@pytest.mark.skipif(
    os.getenv("TEST_DATABASE_URL", "").startswith("sqlite"),
    reason="Fermeture caisse complète (join cash_registers) : exécuter sous PostgreSQL",
)
def test_idempotency_conflict_different_body(
    client,
    db_session,
    user_with_pin,
    site,
    report_environment,
):
    sess = CashSession(
        operator_id=user_with_pin.id,
        site_id=site.id,
        initial_amount=10.0,
        current_amount=60.0,
        status=CashSessionStatus.OPEN,
        total_sales=50.0,
        total_items=1,
    )
    db_session.add(sess)
    db_session.flush()
    sid = str(sess.id)
    db_session.commit()

    key = "idem-conflict-002"
    h = {**_auth_pin_headers(user_with_pin.id), "Idempotency-Key": key}
    r1 = client.post(
        f"{_V1}/cash-sessions/{sid}/close",
        json={"actual_amount": 60.0, "variance_comment": None},
        headers=h,
    )
    assert r1.status_code == 200

    r2 = client.post(
        f"{_V1}/cash-sessions/{sid}/close",
        json={"actual_amount": 61.0, "variance_comment": "autre"},
        headers=h,
    )
    assert r2.status_code == 409
    assert r2.json()["code"] == "IDEMPOTENCY_KEY_CONFLICT"


def test_x_request_id_echo_on_response(client):
    r = client.get("/health", headers={"X-Request-Id": "trace-from-client-99"})
    assert r.headers.get("X-Request-Id") == "trace-from-client-99"


@pytest.mark.skipif(
    os.getenv("TEST_DATABASE_URL", "").startswith("sqlite"),
    reason="Fermeture caisse complète (join cash_registers) : exécuter sous PostgreSQL",
)
def test_x_request_id_echo_on_close_response(
    client,
    db_session,
    user_with_pin,
    site,
    report_environment,
):
    sess = CashSession(
        operator_id=user_with_pin.id,
        site_id=site.id,
        initial_amount=40.0,
        current_amount=90.0,
        status=CashSessionStatus.OPEN,
        total_sales=50.0,
        total_items=2,
    )
    db_session.add(sess)
    db_session.flush()
    sid = str(sess.id)
    db_session.commit()
    rid = "trace-close-session-42"
    r = client.post(
        f"{_V1}/cash-sessions/{sid}/close",
        json={"actual_amount": 90.0, "variance_comment": None},
        headers={**_auth_pin_headers(user_with_pin.id), "X-Request-Id": rid},
    )
    assert r.status_code == 200
    assert r.headers.get("X-Request-Id") == rid
