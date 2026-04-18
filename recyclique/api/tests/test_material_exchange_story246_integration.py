"""
Story 24.6 — échange matière : intégration API material-exchanges (delta nul, complément, reversal total).
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
from tests.caisse_sale_eligibility import (
    grant_user_caisse_exchange_permission,
    grant_user_caisse_refund_permission,
    grant_user_caisse_sale_eligibility,
)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def story246_fixtures(db_session):
    site_id = uuid.uuid4()
    op_id = uuid.uuid4()
    sess_id = uuid.uuid4()

    site = Site(
        id=site_id,
        name="S246",
        address="a",
        city="c",
        postal_code="75000",
        country="FR",
    )
    user = User(
        id=op_id,
        username="cashier_s246",
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
    grant_user_caisse_exchange_permission(db_session, user)
    grant_user_caisse_refund_permission(db_session, user)

    token = create_access_token(data={"sub": str(op_id)})
    return {
        "token": token,
        "session_id": str(sess_id),
        "headers": {"Authorization": f"Bearer {token}"},
    }


def _create_completed_sale(client: TestClient, headers: dict, session_id: str, total: float = 18.0) -> str:
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


def test_material_exchange_delta_zero_creates_container(client: TestClient, story246_fixtures):
    h = story246_fixtures["headers"]
    sid = story246_fixtures["session_id"]
    r = client.post(
        f"/v1/cash-sessions/{sid}/material-exchanges",
        json={"delta_amount_cents": 0, "material_trace": {"returned": [], "outgoing": []}},
        headers=h,
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["delta_amount_cents"] == 0
    assert data["complement_sale_id"] is None
    assert data["sale_reversal_id"] is None
    assert data["paheko_accounting_sync_hint"]


def test_material_exchange_positive_complement_sale(client: TestClient, story246_fixtures):
    h = story246_fixtures["headers"]
    sid = story246_fixtures["session_id"]
    r = client.post(
        f"/v1/cash-sessions/{sid}/material-exchanges",
        json={
            "delta_amount_cents": 350,
            "material_trace": {},
            "complement_sale": {
                "cash_session_id": sid,
                "items": [
                    {
                        "category": "ECHANGE_COMPLEMENT",
                        "quantity": 1,
                        "weight": 0,
                        "unit_price": 3.5,
                        "total_price": 3.5,
                    }
                ],
                "total_amount": 3.5,
                "donation": 0,
                "payment_method": "cash",
            },
        },
        headers=h,
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["delta_amount_cents"] == 350
    assert data["complement_sale_id"]
    assert data["sale_reversal_id"] is None


def test_material_exchange_negative_full_reversal(client: TestClient, story246_fixtures):
    h = story246_fixtures["headers"]
    sid = story246_fixtures["session_id"]
    sale_id = _create_completed_sale(client, h, sid, 22.0)
    r = client.post(
        f"/v1/cash-sessions/{sid}/material-exchanges",
        json={
            "delta_amount_cents": -2200,
            "material_trace": {"k": "v"},
            "reversal": {
                "source_sale_id": sale_id,
                "reason_code": "RETOUR_ARTICLE",
                "refund_payment_method": "cash",
            },
        },
        headers=h,
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["delta_amount_cents"] == -2200
    assert data["sale_reversal_id"]
    assert data["complement_sale_id"] is None


def test_material_exchange_unknown_session_returns_404(client: TestClient, story246_fixtures):
    """Session inexistante : NotFoundError mappée en HTTP (pas 500)."""
    missing = str(uuid.uuid4())
    r = client.post(
        f"/v1/cash-sessions/{missing}/material-exchanges",
        json={"delta_amount_cents": 0, "material_trace": {}},
        headers=story246_fixtures["headers"],
    )
    assert r.status_code == 404, r.text


def test_material_exchange_forbidden_without_exchange_permission(client: TestClient, db_session, story246_fixtures):
    """Accès caisse + refund mais sans caisse.exchange : 403 sur le conteneur."""
    site_id = uuid.uuid4()
    op_x = uuid.uuid4()
    sess_id = uuid.uuid4()

    site = Site(
        id=site_id,
        name="Sx246",
        address="a",
        city="c",
        postal_code="75000",
        country="FR",
    )
    user = User(
        id=op_x,
        username="cashier_no_ex",
        hashed_password="x",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
        site_id=site_id,
    )
    session = CashSession(
        id=sess_id,
        operator_id=op_x,
        site_id=site_id,
        register_id=None,
        initial_amount=50.0,
        current_amount=50.0,
        status="open",
        opened_at=datetime.utcnow(),
    )
    db_session.add_all([site, user, session])
    db_session.commit()
    grant_user_caisse_sale_eligibility(db_session, user, site_id)
    grant_user_caisse_refund_permission(db_session, user)

    token = create_access_token(data={"sub": str(op_x)})
    headers = {"Authorization": f"Bearer {token}"}

    r = client.post(
        f"/v1/cash-sessions/{sess_id}/material-exchanges",
        json={"delta_amount_cents": 0, "material_trace": {}},
        headers=headers,
    )
    assert r.status_code == 403, r.text
