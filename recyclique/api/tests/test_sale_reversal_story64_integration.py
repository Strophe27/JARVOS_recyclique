"""
Story 6.4 — remboursements / reversals (intégration API + agrégats session).
"""

from __future__ import annotations

import uuid
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from recyclic_api.main import app
from recyclic_api.models.cash_session import CashSession
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.core.security import create_access_token
from recyclic_api.services.cash_session_service import CashSessionService
from recyclic_api.services.cash_session_response_enrichment import enrich_session_response
from tests.caisse_sale_eligibility import (
    grant_user_caisse_refund_permission,
    grant_user_caisse_sale_eligibility,
)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def story64_fixtures(db_session):
    site_id = uuid.uuid4()
    op_id = uuid.uuid4()
    sess_id = uuid.uuid4()

    site = Site(
        id=site_id,
        name="S64",
        address="a",
        city="c",
        postal_code="75000",
        country="FR",
    )
    user = User(
        id=op_id,
        username="cashier_s64",
        hashed_password="x",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
        site_id=site_id,
    )
    session = CashSession(
        id=sess_id,
        operator_id=op_id,
        site_id=site_id,
        register_id=None,
        initial_amount=100.0,
        current_amount=100.0,
        status="open",
        opened_at=datetime.utcnow(),
    )
    db_session.add_all([site, user, session])
    db_session.commit()
    grant_user_caisse_sale_eligibility(db_session, user, site_id)
    grant_user_caisse_refund_permission(db_session, user)

    token = create_access_token(data={"sub": str(op_id)})
    return {
        "token": token,
        "session_id": str(sess_id),
        "headers": {"Authorization": f"Bearer {token}"},
        "op_id": str(op_id),
    }


def _create_completed_sale(client: TestClient, headers: dict, session_id: str, total: float = 25.0) -> str:
    body = {
        "cash_session_id": session_id,
        "items": [
            {
                "category": "EEE-1",
                "quantity": 1,
                "weight": 1.0,
                "unit_price": total,
                "total_price": total,
            }
        ],
        "total_amount": total,
        "donation": 0,
        "payment_method": "cash",
    }
    r = client.post("/v1/sales/", json=body, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_reversal_happy_path_and_totals(client: TestClient, db_session, story64_fixtures):
    h = story64_fixtures["headers"]
    sid = story64_fixtures["session_id"]

    sale_id = _create_completed_sale(client, h, sid, 30.0)

    r = client.post(
        "/v1/sales/reversals",
        json={"source_sale_id": sale_id, "reason_code": "RETOUR_ARTICLE"},
        headers=h,
    )
    assert r.status_code == 200, r.text
    rev = r.json()
    assert rev["source_sale_id"] == sale_id
    assert rev["amount_signed"] == -30.0
    assert rev["reason_code"] == "RETOUR_ARTICLE"

    sess = db_session.query(CashSession).filter(CashSession.id == uuid.UUID(sid)).first()
    svc = CashSessionService(db_session)
    enriched = enrich_session_response(sess, svc)
    assert enriched.totals is not None
    assert enriched.totals.sales_completed == 30.0
    assert enriched.totals.refunds == -30.0
    assert enriched.totals.net == 0.0


def test_reversal_requires_refund_permission(client: TestClient, db_session, story64_fixtures):
    """Utilisateur avec caisse.access mais sans caisse.refund : 403."""
    site_id = uuid.uuid4()
    op2 = uuid.uuid4()
    sess_id = uuid.uuid4()
    site = Site(
        id=site_id,
        name="S64b",
        address="a",
        city="c",
        postal_code="75000",
        country="FR",
    )
    user = User(
        id=op2,
        username="cashier_s64b",
        hashed_password="x",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
        site_id=site_id,
    )
    session = CashSession(
        id=sess_id,
        operator_id=op2,
        site_id=site_id,
        register_id=None,
        initial_amount=10.0,
        current_amount=10.0,
        status="open",
        opened_at=datetime.utcnow(),
    )
    db_session.add_all([site, user, session])
    db_session.commit()
    grant_user_caisse_sale_eligibility(db_session, user, site_id)
    # pas grant_user_caisse_refund_permission

    token = create_access_token(data={"sub": str(op2)})
    headers = {"Authorization": f"Bearer {token}"}
    sale_id = _create_completed_sale(client, headers, str(sess_id), 5.0)

    r = client.post(
        "/v1/sales/reversals",
        json={"source_sale_id": sale_id, "reason_code": "ERREUR_SAISIE"},
        headers=headers,
    )
    assert r.status_code == 403
    assert "caisse.refund" in r.json().get("detail", "")


def test_reversal_double_blocked(client: TestClient, story64_fixtures):
    h = story64_fixtures["headers"]
    sid = story64_fixtures["session_id"]
    sale_id = _create_completed_sale(client, h, sid, 12.0)

    r1 = client.post(
        "/v1/sales/reversals",
        json={"source_sale_id": sale_id, "reason_code": "ANNULATION_CLIENT"},
        headers=h,
    )
    assert r1.status_code == 200
    r2 = client.post(
        "/v1/sales/reversals",
        json={"source_sale_id": sale_id, "reason_code": "ANNULATION_CLIENT"},
        headers=h,
    )
    assert r2.status_code == 409


def test_reversal_held_sale_rejected(client: TestClient, story64_fixtures):
    h = story64_fixtures["headers"]
    sid = story64_fixtures["session_id"]
    r_hold = client.post(
        "/v1/sales/hold",
        json={
            "cash_session_id": sid,
            "items": [
                {
                    "category": "X",
                    "quantity": 1,
                    "weight": 1.0,
                    "unit_price": 4.0,
                    "total_price": 4.0,
                }
            ],
            "total_amount": 4.0,
        },
        headers=h,
    )
    assert r_hold.status_code == 200
    held_id = r_hold.json()["id"]

    r = client.post(
        "/v1/sales/reversals",
        json={"source_sale_id": held_id, "reason_code": "ERREUR_SAISIE"},
        headers=h,
    )
    assert r.status_code == 409


def test_reversal_autre_requires_detail(client: TestClient, story64_fixtures):
    h = story64_fixtures["headers"]
    sid = story64_fixtures["session_id"]
    sale_id = _create_completed_sale(client, h, sid, 1.0)

    r = client.post(
        "/v1/sales/reversals",
        json={"source_sale_id": sale_id, "reason_code": "AUTRE"},
        headers=h,
    )
    assert r.status_code == 422

    r_ok = client.post(
        "/v1/sales/reversals",
        json={"source_sale_id": sale_id, "reason_code": "AUTRE", "detail": "Précision terrain obligatoire"},
        headers=h,
    )
    assert r_ok.status_code == 200


def test_reversal_idempotency(client: TestClient, story64_fixtures):
    h = story64_fixtures["headers"]
    sid = story64_fixtures["session_id"]
    sale_id = _create_completed_sale(client, h, sid, 7.0)
    body = {
        "source_sale_id": sale_id,
        "reason_code": "ERREUR_SAISIE",
        "idempotency_key": "idem-story64-1",
    }
    r1 = client.post("/v1/sales/reversals", json=body, headers=h)
    r2 = client.post("/v1/sales/reversals", json=body, headers=h)
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["id"] == r2.json()["id"]


def test_get_reversal(client: TestClient, story64_fixtures):
    h = story64_fixtures["headers"]
    sid = story64_fixtures["session_id"]
    sale_id = _create_completed_sale(client, h, sid, 3.0)
    r = client.post(
        "/v1/sales/reversals",
        json={"source_sale_id": sale_id, "reason_code": "RETOUR_ARTICLE"},
        headers=h,
    )
    rid = r.json()["id"]
    g = client.get(f"/v1/sales/reversals/{rid}", headers=h)
    assert g.status_code == 200
    assert g.json()["id"] == rid
