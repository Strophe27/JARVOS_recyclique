"""
Story 6.3 — tickets en attente : hold, liste, finalisation, abandon (intégration API).
"""

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
    CAISSE_DEFERRED_ACCESS_PERMISSION,
    CAISSE_VIRTUAL_ACCESS_PERMISSION,
    grant_user_caisse_sale_eligibility,
    grant_user_caisse_sale_mode_eligibility,
)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def story63_fixtures(db_session):
    site_id = uuid.uuid4()
    op_id = uuid.uuid4()
    sess_id = uuid.uuid4()

    site = Site(
        id=site_id,
        name="S63",
        address="a",
        city="c",
        postal_code="75000",
        country="FR",
    )
    user = User(
        id=op_id,
        username="cashier_s63",
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
        initial_amount=50.0,
        current_amount=50.0,
        status="open",
        opened_at=datetime.utcnow(),
    )
    db_session.add_all([site, user, session])
    db_session.commit()
    grant_user_caisse_sale_eligibility(db_session, user, site_id)

    token = create_access_token(data={"sub": str(op_id)})
    return {
        "token": token,
        "session_id": str(sess_id),
        "headers": {"Authorization": f"Bearer {token}"},
    }


def test_hold_list_finalize_abandon_flow(client: TestClient, db_session, story63_fixtures):
    h = story63_fixtures["headers"]
    sid = story63_fixtures["session_id"]

    hold_body = {
        "cash_session_id": sid,
        "items": [
            {
                "category": "EEE-1",
                "quantity": 1,
                "weight": 1.0,
                "unit_price": 3.0,
                "total_price": 3.0,
            }
        ],
        "total_amount": 3.0,
        "donation": 0,
    }
    r_hold = client.post("/v1/sales/hold", json=hold_body, headers=h)
    assert r_hold.status_code == 200, r_hold.text
    held = r_hold.json()
    assert held.get("lifecycle_status") == "held"
    sale_id = held["id"]

    r_list = client.get(f"/v1/sales/held?cash_session_id={sid}&limit=10", headers=h)
    assert r_list.status_code == 200
    listed = r_list.json()
    assert any(x["id"] == sale_id for x in listed)

    r_fin = client.post(
        f"/v1/sales/{sale_id}/finalize-held",
        json={"payment_method": "cash"},
        headers=h,
    )
    assert r_fin.status_code == 200, r_fin.text
    done = r_fin.json()
    assert done.get("lifecycle_status") == "completed"
    assert len(done.get("payments") or []) >= 1

    hold_body2 = dict(hold_body)
    r_hold2 = client.post("/v1/sales/hold", json=hold_body2, headers=h)
    assert r_hold2.status_code == 200
    sale_id2 = r_hold2.json()["id"]

    r_ab = client.post(f"/v1/sales/{sale_id2}/abandon-held", headers=h)
    assert r_ab.status_code == 200
    assert r_ab.json().get("lifecycle_status") == "abandoned"

    r_get = client.get(f"/v1/sales/{sale_id2}", headers=h)
    assert r_get.status_code == 404


def test_patch_item_on_held_rejected(client: TestClient, db_session, story63_fixtures):
    h = story63_fixtures["headers"]
    sid = story63_fixtures["session_id"]

    r_hold = client.post(
        "/v1/sales/hold",
        json={
            "cash_session_id": sid,
            "items": [
                {
                    "category": "X",
                    "quantity": 1,
                    "weight": 1.0,
                    "unit_price": 2.0,
                    "total_price": 2.0,
                }
            ],
            "total_amount": 2.0,
        },
        headers=h,
    )
    assert r_hold.status_code == 200
    sale_id = r_hold.json()["id"]
    item_id = r_hold.json()["items"][0]["id"]

    r_patch = client.patch(
        f"/v1/sales/{sale_id}/items/{item_id}",
        json={"quantity": 2},
        headers=h,
    )
    assert r_patch.status_code == 422


@pytest.mark.parametrize("permission_name", [CAISSE_VIRTUAL_ACCESS_PERMISSION, CAISSE_DEFERRED_ACCESS_PERMISSION])
def test_hold_sale_accepts_virtual_or_deferred_cash_mode_permission(
    client: TestClient,
    db_session,
    permission_name: str,
):
    site_id = uuid.uuid4()
    op_id = uuid.uuid4()
    sess_id = uuid.uuid4()

    site = Site(
        id=site_id,
        name="S63-modes",
        address="a",
        city="c",
        postal_code="75000",
        country="FR",
    )
    user = User(
        id=op_id,
        username=f"cashier_{permission_name.replace('.', '_')}",
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
        initial_amount=50.0,
        current_amount=50.0,
        status="open",
        opened_at=datetime.utcnow(),
    )
    db_session.add_all([site, user, session])
    db_session.commit()
    grant_user_caisse_sale_mode_eligibility(db_session, user, site_id, permission_name)

    token = create_access_token(data={"sub": str(op_id)})
    headers = {"Authorization": f"Bearer {token}"}

    r_hold = client.post(
        "/v1/sales/hold",
        json={
            "cash_session_id": str(sess_id),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 1.0,
                    "unit_price": 3.0,
                    "total_price": 3.0,
                }
            ],
            "total_amount": 3.0,
            "donation": 0,
        },
        headers=headers,
    )
    assert r_hold.status_code == 200, r_hold.text
