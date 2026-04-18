"""
Story 6.6 — encaissements actions sociales via POST /v1/sales/ (social_action_kind).
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
from recyclic_api.models.sale import SocialActionKind
from tests.caisse_sale_eligibility import (
    grant_user_caisse_sale_eligibility,
    grant_user_caisse_social_encaissement_permission,
)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def story66_fixtures(db_session):
    site_id = uuid.uuid4()
    op_id = uuid.uuid4()
    sess_id = uuid.uuid4()

    site = Site(
        id=site_id,
        name="S66",
        address="a",
        city="c",
        postal_code="75000",
        country="FR",
    )
    user = User(
        id=op_id,
        username="cashier_s66",
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
    grant_user_caisse_social_encaissement_permission(db_session, user)

    token = create_access_token(data={"sub": str(op_id)})
    return {
        "token": token,
        "session_id": str(sess_id),
        "headers": {"Authorization": f"Bearer {token}"},
    }


def _post_sale(client: TestClient, headers: dict, body: dict):
    return client.post("/v1/sales/", json=body, headers=headers)


@pytest.mark.parametrize("kind", [k.value for k in SocialActionKind])
def test_social_lot1_each_kind_ok(client: TestClient, story66_fixtures, kind: str):
    """Story 6.6 — un happy path API par valeur du lot 1 (enum figé)."""
    h = story66_fixtures["headers"]
    sid = story66_fixtures["session_id"]
    r = _post_sale(
        client,
        h,
        {
            "cash_session_id": sid,
            "items": [],
            "total_amount": 4.0,
            "social_action_kind": kind,
            "payment_method": "cash",
        },
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["social_action_kind"] == kind
    assert data["special_encaissement_kind"] is None
    assert data["items"] == []


def test_social_don_libre_with_note_ok(client: TestClient, story66_fixtures):
    h = story66_fixtures["headers"]
    sid = story66_fixtures["session_id"]
    r = _post_sale(
        client,
        h,
        {
            "cash_session_id": sid,
            "items": [],
            "total_amount": 12.5,
            "social_action_kind": "DON_LIBRE",
            "payment_method": "cash",
            "note": "Merci",
        },
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["social_action_kind"] == "DON_LIBRE"
    assert data["total_amount"] == 12.5


def test_social_zero_refused(client: TestClient, story66_fixtures):
    h = story66_fixtures["headers"]
    sid = story66_fixtures["session_id"]
    r = _post_sale(
        client,
        h,
        {
            "cash_session_id": sid,
            "items": [],
            "total_amount": 0,
            "social_action_kind": "DON_LIBRE",
        },
    )
    assert r.status_code == 400
    assert "strictement positif" in r.json().get("detail", "")


def test_social_with_items_refused(client: TestClient, story66_fixtures):
    h = story66_fixtures["headers"]
    sid = story66_fixtures["session_id"]
    r = _post_sale(
        client,
        h,
        {
            "cash_session_id": sid,
            "items": [
                {
                    "category": "x",
                    "quantity": 1,
                    "weight": 1.0,
                    "unit_price": 1.0,
                    "total_price": 1.0,
                }
            ],
            "total_amount": 5.0,
            "social_action_kind": "DON_LIBRE",
        },
    )
    assert r.status_code == 400


def test_social_without_permission_forbidden(client: TestClient, db_session):
    """Utilisateur caisse sans caisse.social_encaissement."""
    site_id = uuid.uuid4()
    op_id = uuid.uuid4()
    sess_id = uuid.uuid4()
    site = Site(
        id=site_id,
        name="S66b",
        address="a",
        city="c",
        postal_code="75000",
        country="FR",
    )
    user = User(
        id=op_id,
        username="cashier_s66_noperm",
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

    token = create_access_token(data={"sub": str(op_id)})
    headers = {"Authorization": f"Bearer {token}"}
    r = _post_sale(
        client,
        headers,
        {
            "cash_session_id": str(sess_id),
            "items": [],
            "total_amount": 5.0,
            "social_action_kind": "KIT_INSTALLATION_ETUDIANT",
        },
    )
    assert r.status_code == 403
    assert "caisse.social_encaissement" in r.json().get("detail", "")


def test_social_and_special_mutually_exclusive(client: TestClient, story66_fixtures):
    h = story66_fixtures["headers"]
    sid = story66_fixtures["session_id"]
    r = _post_sale(
        client,
        h,
        {
            "cash_session_id": sid,
            "items": [],
            "total_amount": 5.0,
            "social_action_kind": "DON_LIBRE",
            "special_encaissement_kind": "DON_SANS_ARTICLE",
        },
    )
    assert r.status_code == 422
