"""Story 24.5 — endpoint remboursement exceptionnel sans ticket (step-up + idempotence)."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from recyclic_api.core.auth import create_access_token
from recyclic_api.core.security import hash_password
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.exceptional_refund import ExceptionalRefund
from recyclic_api.models.payment_transaction import PaymentTransaction, PaymentTransactionDirection, PaymentTransactionNature
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from tests.caisse_sale_eligibility import (
    grant_user_caisse_sale_eligibility,
    grant_user_exceptional_refund_permission,
)
from tests.memory_redis_for_tests import MemoryRedisForTests

_V1 = "/v1"
_PIN = "1234"


@pytest.fixture
def memory_redis(monkeypatch):
    from recyclic_api.core import redis as redis_core

    mr = MemoryRedisForTests()
    monkeypatch.setattr(redis_core, "redis_client", mr)
    return mr


@pytest.fixture
def site(db_session):
    s = Site(
        name="Site Refund",
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
def operator_user(db_session, site):
    u = User(
        id=uuid.uuid4(),
        username=f"refund_{uuid.uuid4().hex[:6]}",
        email=f"refund_{uuid.uuid4().hex[:6]}@example.com",
        hashed_password=hash_password("Password123!"),
        hashed_pin=hash_password(_PIN),
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
        site_id=site.id,
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


@pytest.fixture
def open_session(db_session, operator_user, site):
    sess = CashSession(
        operator_id=operator_user.id,
        site_id=site.id,
        initial_amount=50.0,
        current_amount=50.0,
        status=CashSessionStatus.OPEN,
        total_sales=0.0,
        total_items=0,
    )
    db_session.add(sess)
    db_session.commit()
    db_session.refresh(sess)
    return sess


def _auth_headers(user: User, *, pin: str | None = None, idempotency_key: str | None = None) -> dict:
    headers = {"Authorization": f"Bearer {create_access_token(data={'sub': str(user.id)})}"}
    if pin is not None:
        headers["X-Step-Up-Pin"] = pin
    if idempotency_key is not None:
        headers["Idempotency-Key"] = idempotency_key
    return headers


def test_exceptional_refund_requires_permission(
    client: TestClient,
    db_session,
    memory_redis,
    operator_user,
    open_session,
):
    grant_user_caisse_sale_eligibility(db_session, operator_user, open_session.site_id)
    payload = {
        "amount": 12.5,
        "refund_payment_method": "cash",
        "reason_code": "ERREUR_SAISIE",
        "justification": "Erreur de caisse.",
        "detail": None,
    }
    r = client.post(
        f"{_V1}/cash-sessions/{open_session.id}/exceptional-refunds",
        json=payload,
        headers=_auth_headers(operator_user, pin=_PIN, idempotency_key="idem-perm"),
    )
    assert r.status_code == 403


def test_exceptional_refund_requires_step_up_pin(
    client: TestClient,
    db_session,
    memory_redis,
    operator_user,
    open_session,
):
    grant_user_caisse_sale_eligibility(db_session, operator_user, open_session.site_id)
    grant_user_exceptional_refund_permission(db_session, operator_user)
    payload = {
        "amount": 8.0,
        "refund_payment_method": "cash",
        "reason_code": "ERREUR_SAISIE",
        "justification": "PIN requis.",
        "detail": None,
    }
    r = client.post(
        f"{_V1}/cash-sessions/{open_session.id}/exceptional-refunds",
        json=payload,
        headers=_auth_headers(operator_user, pin=None, idempotency_key="idem-no-pin"),
    )
    assert r.status_code == 403
    assert r.json()["code"] == "STEP_UP_PIN_REQUIRED"


def test_exceptional_refund_happy_path_idempotent(
    client: TestClient,
    db_session,
    memory_redis,
    operator_user,
    open_session,
):
    grant_user_caisse_sale_eligibility(db_session, operator_user, open_session.site_id)
    grant_user_exceptional_refund_permission(db_session, operator_user)

    payload = {
        "amount": 19.9,
        "refund_payment_method": "cash",
        "reason_code": "ANNULATION_CLIENT",
        "justification": "Client parti sans ticket.",
        "detail": None,
    }
    idem = "idem-exceptional-refund"
    url = f"{_V1}/cash-sessions/{open_session.id}/exceptional-refunds"

    r1 = client.post(url, json=payload, headers=_auth_headers(operator_user, pin=_PIN, idempotency_key=idem))
    assert r1.status_code == 201
    data1 = r1.json()
    assert data1["amount"] == pytest.approx(19.9)
    assert data1["reason_code"] == "ANNULATION_CLIENT"

    r2 = client.post(url, json=payload, headers=_auth_headers(operator_user, pin=_PIN, idempotency_key=idem))
    assert r2.status_code == 201
    data2 = r2.json()
    assert data2["id"] == data1["id"]

    refunds = db_session.query(ExceptionalRefund).all()
    assert len(refunds) == 1
    refund = refunds[0]
    tx = db_session.query(PaymentTransaction).filter(PaymentTransaction.sale_id == refund.sale_id).first()
    assert tx is not None
    assert tx.nature == PaymentTransactionNature.REFUND_PAYMENT
    assert tx.direction == PaymentTransactionDirection.OUTFLOW
    assert tx.amount == pytest.approx(19.9)
    db_session.refresh(open_session)
    assert open_session.current_amount == pytest.approx(50.0 - 19.9)


def test_exceptional_refund_rejects_amount_over_cash_balance(
    client: TestClient,
    db_session,
    memory_redis,
    operator_user,
    open_session,
):
    grant_user_caisse_sale_eligibility(db_session, operator_user, open_session.site_id)
    grant_user_exceptional_refund_permission(db_session, operator_user)

    payload = {
        "amount": open_session.current_amount + 0.01,
        "refund_payment_method": "cash",
        "reason_code": "ERREUR_SAISIE",
        "justification": "Trop élevé.",
        "detail": None,
    }
    r = client.post(
        f"{_V1}/cash-sessions/{open_session.id}/exceptional-refunds",
        json=payload,
        headers=_auth_headers(operator_user, pin=_PIN, idempotency_key="idem-over"),
    )
    # ``_EXCEPTIONAL_REFUND_DOMAIN_HTTP`` : ValidationError → 422 (Story 24.10 / schéma P3).
    assert r.status_code == 422


def test_exceptional_refund_requires_idempotency_key(
    client: TestClient,
    db_session,
    memory_redis,
    operator_user,
    open_session,
):
    grant_user_caisse_sale_eligibility(db_session, operator_user, open_session.site_id)
    grant_user_exceptional_refund_permission(db_session, operator_user)

    payload = {
        "amount": 9.0,
        "refund_payment_method": "cash",
        "reason_code": "RETOUR_ARTICLE",
        "justification": "Erreur produit.",
        "detail": None,
    }
    r = client.post(
        f"{_V1}/cash-sessions/{open_session.id}/exceptional-refunds",
        json=payload,
        headers=_auth_headers(operator_user, pin=_PIN, idempotency_key=None),
    )
    assert r.status_code == 400
