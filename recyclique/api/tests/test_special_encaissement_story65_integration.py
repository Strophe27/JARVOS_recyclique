"""
Story 6.5 — encaissements spéciaux sans article (don, adhésion) via POST /v1/sales/.
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
    grant_user_caisse_sale_eligibility,
    grant_user_caisse_special_encaissement_permission,
)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def story65_fixtures(db_session):
    site_id = uuid.uuid4()
    op_id = uuid.uuid4()
    sess_id = uuid.uuid4()

    site = Site(
        id=site_id,
        name="S65",
        address="a",
        city="c",
        postal_code="75000",
        country="FR",
    )
    user = User(
        id=op_id,
        username="cashier_s65",
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
    grant_user_caisse_special_encaissement_permission(db_session, user)

    token = create_access_token(data={"sub": str(op_id)})
    return {
        "token": token,
        "session_id": str(sess_id),
        "headers": {"Authorization": f"Bearer {token}"},
    }


def _post_special(client: TestClient, headers: dict, session_id: str, body: dict):
    return client.post("/v1/sales/", json=body, headers=headers)


def test_special_don_zero_ok(client: TestClient, story65_fixtures):
    h = story65_fixtures["headers"]
    sid = story65_fixtures["session_id"]
    r = _post_special(
        client,
        h,
        sid,
        {
            "cash_session_id": sid,
            "items": [],
            "total_amount": 0,
            "special_encaissement_kind": "DON_SANS_ARTICLE",
            "payment_method": "free",
        },
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["special_encaissement_kind"] == "DON_SANS_ARTICLE"
    assert data["total_amount"] == 0
    assert data["items"] == []


def test_special_adhesion_with_reference_ok(client: TestClient, story65_fixtures):
    h = story65_fixtures["headers"]
    sid = story65_fixtures["session_id"]
    r = _post_special(
        client,
        h,
        sid,
        {
            "cash_session_id": sid,
            "items": [],
            "total_amount": 15.0,
            "special_encaissement_kind": "ADHESION_ASSOCIATION",
            "adherent_reference": "Dupont Marie",
            "payment_method": "card",
        },
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["special_encaissement_kind"] == "ADHESION_ASSOCIATION"
    assert data["adherent_reference"] == "Dupont Marie"


def test_special_requires_permission(client: TestClient, db_session):
    site_id = uuid.uuid4()
    op_id = uuid.uuid4()
    sess_id = uuid.uuid4()
    site = Site(
        id=site_id,
        name="S65b",
        address="a",
        city="c",
        postal_code="75000",
        country="FR",
    )
    user = User(
        id=op_id,
        username="cashier_s65b",
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
        initial_amount=10.0,
        current_amount=10.0,
        status="open",
        opened_at=datetime.utcnow(),
    )
    db_session.add_all([site, user, session])
    db_session.commit()
    grant_user_caisse_sale_eligibility(db_session, user, site_id)

    token = create_access_token(data={"sub": str(op_id)})
    headers = {"Authorization": f"Bearer {token}"}
    r = client.post(
        "/v1/sales/",
        json={
            "cash_session_id": str(sess_id),
            "items": [],
            "total_amount": 5.0,
            "special_encaissement_kind": "DON_SANS_ARTICLE",
            "payment_method": "cash",
        },
        headers=headers,
    )
    assert r.status_code == 403
    assert "caisse.special_encaissement" in r.json().get("detail", "")


def test_special_adhesion_total_zero_400(client: TestClient, story65_fixtures):
    h = story65_fixtures["headers"]
    sid = story65_fixtures["session_id"]
    r = _post_special(
        client,
        h,
        sid,
        {
            "cash_session_id": sid,
            "items": [],
            "total_amount": 0,
            "special_encaissement_kind": "ADHESION_ASSOCIATION",
            "payment_method": "cash",
        },
    )
    assert r.status_code == 400


def test_special_with_items_rejected(client: TestClient, story65_fixtures):
    h = story65_fixtures["headers"]
    sid = story65_fixtures["session_id"]
    r = _post_special(
        client,
        h,
        sid,
        {
            "cash_session_id": sid,
            "items": [
                {
                    "category": "X",
                    "quantity": 1,
                    "weight": 1,
                    "unit_price": 1,
                    "total_price": 1,
                }
            ],
            "total_amount": 1,
            "special_encaissement_kind": "DON_SANS_ARTICLE",
            "payment_method": "cash",
        },
    )
    assert r.status_code == 400


def test_nominal_empty_items_rejected(client: TestClient, story65_fixtures):
    h = story65_fixtures["headers"]
    sid = story65_fixtures["session_id"]
    r = _post_special(
        client,
        h,
        sid,
        {
            "cash_session_id": sid,
            "items": [],
            "total_amount": 10,
            "payment_method": "cash",
        },
    )
    assert r.status_code == 400


def test_don_rejects_adherent_reference(client: TestClient, story65_fixtures):
    h = story65_fixtures["headers"]
    sid = story65_fixtures["session_id"]
    r = _post_special(
        client,
        h,
        sid,
        {
            "cash_session_id": sid,
            "items": [],
            "total_amount": 1,
            "special_encaissement_kind": "DON_SANS_ARTICLE",
            "adherent_reference": "x",
            "payment_method": "cash",
        },
    )
    assert r.status_code == 400
