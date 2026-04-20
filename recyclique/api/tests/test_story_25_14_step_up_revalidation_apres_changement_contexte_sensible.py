"""Story 25.14 — step-up / revalidation après changement de contexte sensible (ADR 25-2, 25.8, 25.13).

Les scénarios pytest privilégient les flux **remboursement exceptionnel** / cashflow alignés matrice ;
les autres routes step-up restent couvertes par la matrice documentée et les tests hors ce fichier.
"""

from __future__ import annotations

import logging
import uuid

import pytest
from fastapi.testclient import TestClient

from recyclic_api.core.auth import create_access_token
from recyclic_api.core.context_binding_guard import (
    CONTEXT_STALE_CODE,
    HEADER_CONTEXT_CASH_SESSION_ID,
    HEADER_CONTEXT_SITE_ID,
)
from recyclic_api.core.security import hash_password
from recyclic_api.core.step_up import STEP_UP_PROOF_SERVER_OPERATOR_PIN
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
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
        name="Site 2514",
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
        username=f"s2514_{uuid.uuid4().hex[:6]}",
        email=f"s2514_{uuid.uuid4().hex[:6]}@example.com",
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


def _aligned_context_headers(operator_user: User, open_session: CashSession) -> dict[str, str]:
    return {
        HEADER_CONTEXT_SITE_ID: str(operator_user.site_id),
        HEADER_CONTEXT_CASH_SESSION_ID: str(open_session.id),
    }


def test_matrice_ligne_contexte_aligne_sans_pin_refus_403_default_deny(
    client: TestClient,
    db_session,
    memory_redis,
    operator_user,
    open_session,
):
    """Matrice : après enveloppe alignée, mutation sensible sans preuve → 403 (pas de continuation silencieuse)."""
    grant_user_caisse_sale_eligibility(db_session, operator_user, open_session.site_id)
    grant_user_exceptional_refund_permission(db_session, operator_user)

    payload = {
        "amount": 5.0,
        "refund_payment_method": "cash",
        "reason_code": "ERREUR_SAISIE",
        "justification": "Sans PIN malgré contexte aligné.",
        "detail": None,
    }
    headers = {
        "Authorization": f"Bearer {create_access_token(data={'sub': str(operator_user.id)})}",
        "Idempotency-Key": "idem-2514-no-pin",
        **_aligned_context_headers(operator_user, open_session),
    }
    r = client.post(
        f"{_V1}/cash-sessions/{open_session.id}/exceptional-refunds",
        json=payload,
        headers=headers,
    )
    assert r.status_code == 403
    assert r.json()["code"] == "STEP_UP_PIN_REQUIRED"


def test_matrice_ligne_contexte_stale_avant_step_up_409_malgre_pin(
    client: TestClient,
    db_session,
    memory_redis,
    operator_user,
    open_session,
):
    """Matrice / 25.8 : désalignement site → 409 avant toute logique step-up (PIN présent mais non décisif)."""
    grant_user_caisse_sale_eligibility(db_session, operator_user, open_session.site_id)
    grant_user_exceptional_refund_permission(db_session, operator_user)
    alien_site_id = uuid.uuid4()

    payload = {
        "amount": 4.0,
        "refund_payment_method": "cash",
        "reason_code": "ERREUR_SAISIE",
        "justification": "Site désaligné.",
        "detail": None,
    }
    headers = {
        "Authorization": f"Bearer {create_access_token(data={'sub': str(operator_user.id)})}",
        "X-Step-Up-Pin": _PIN,
        "Idempotency-Key": "idem-2514-stale",
        HEADER_CONTEXT_SITE_ID: str(alien_site_id),
    }
    r = client.post(
        f"{_V1}/cash-sessions/{open_session.id}/exceptional-refunds",
        json=payload,
        headers=headers,
    )
    assert r.status_code == 409
    body = r.json()
    assert body["code"] == CONTEXT_STALE_CODE


def test_matrice_ligne_session_caisse_stale_avant_step_up_409_malgre_pin(
    client: TestClient,
    db_session,
    memory_redis,
    operator_user,
    open_session,
):
    """Matrice / 25.8 : désalignement session caisse dans l'en-tête → 409 avant step-up (PIN présent)."""
    grant_user_caisse_sale_eligibility(db_session, operator_user, open_session.site_id)
    grant_user_exceptional_refund_permission(db_session, operator_user)
    alien_session_id = uuid.uuid4()

    payload = {
        "amount": 4.5,
        "refund_payment_method": "cash",
        "reason_code": "ERREUR_SAISIE",
        "justification": "Session caisse désalignée.",
        "detail": None,
    }
    headers = {
        "Authorization": f"Bearer {create_access_token(data={'sub': str(operator_user.id)})}",
        "X-Step-Up-Pin": _PIN,
        "Idempotency-Key": "idem-2514-stale-session",
        HEADER_CONTEXT_SITE_ID: str(operator_user.site_id),
        HEADER_CONTEXT_CASH_SESSION_ID: str(alien_session_id),
    }
    r = client.post(
        f"{_V1}/cash-sessions/{open_session.id}/exceptional-refunds",
        json=payload,
        headers=headers,
    )
    assert r.status_code == 409
    assert r.json()["code"] == CONTEXT_STALE_CODE


def test_sequence_deux_onglets_stale_puis_frais_sans_pin_encore_403(
    client: TestClient,
    db_session,
    memory_redis,
    operator_user,
    open_session,
):
    """Risque deux onglets : 1) requête avec vieux site → 409 ; 2) requête corrigée sans PIN → 403."""
    grant_user_caisse_sale_eligibility(db_session, operator_user, open_session.site_id)
    grant_user_exceptional_refund_permission(db_session, operator_user)
    alien_site_id = uuid.uuid4()

    payload = {
        "amount": 3.0,
        "refund_payment_method": "cash",
        "reason_code": "ERREUR_SAISIE",
        "justification": "Séquence onglets.",
        "detail": None,
    }
    base = {
        "Authorization": f"Bearer {create_access_token(data={'sub': str(operator_user.id)})}",
        "Idempotency-Key": "idem-2514-seq-a",
        HEADER_CONTEXT_SITE_ID: str(alien_site_id),
    }
    r1 = client.post(
        f"{_V1}/cash-sessions/{open_session.id}/exceptional-refunds",
        json=payload,
        headers=base,
    )
    assert r1.status_code == 409

    headers_ok = {
        "Authorization": f"Bearer {create_access_token(data={'sub': str(operator_user.id)})}",
        "Idempotency-Key": "idem-2514-seq-b",
        **_aligned_context_headers(operator_user, open_session),
    }
    r2 = client.post(
        f"{_V1}/cash-sessions/{open_session.id}/exceptional-refunds",
        json=payload,
        headers=headers_ok,
    )
    assert r2.status_code == 403
    assert r2.json()["code"] == "STEP_UP_PIN_REQUIRED"


def test_logs_step_up_correlation_25_13_operator_and_proof(
    client: TestClient,
    db_session,
    memory_redis,
    operator_user,
    open_session,
    caplog,
):
    """Corrélation 25.13 / 25.14 : log succès step-up avec operator_user_id et proof serveur."""
    grant_user_caisse_sale_eligibility(db_session, operator_user, open_session.site_id)
    grant_user_exceptional_refund_permission(db_session, operator_user)

    payload = {
        "amount": 2.0,
        "refund_payment_method": "cash",
        "reason_code": "ANNULATION_CLIENT",
        "justification": "Log proof.",
        "detail": None,
    }
    headers = {
        "Authorization": f"Bearer {create_access_token(data={'sub': str(operator_user.id)})}",
        "X-Step-Up-Pin": _PIN,
        "Idempotency-Key": "idem-2514-log",
        **_aligned_context_headers(operator_user, open_session),
    }
    with caplog.at_level(logging.INFO, logger="recyclic_api.core.step_up"):
        r = client.post(
            f"{_V1}/cash-sessions/{open_session.id}/exceptional-refunds",
            json=payload,
            headers=headers,
        )
    assert r.status_code == 201
    joined = " ".join(rec.message for rec in caplog.records)
    assert "step_up_pin_ok" in joined
    assert f"operator_user_id={operator_user.id}" in joined
    assert f"proof={STEP_UP_PROOF_SERVER_OPERATOR_PIN}" in joined
