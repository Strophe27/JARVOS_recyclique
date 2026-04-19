"""Story 24.9 — tags métier ticket/ligne, cohérence legacy, reporting agrégé."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.core.security import create_access_token, hash_password
from recyclic_api.main import app
from recyclic_api.models.cash_register import CashRegister
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.site import Site
from recyclic_api.models.sale import SpecialEncaissementKind
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.schemas.sale import SaleCreate, SaleItemCreate
from recyclic_api.services.business_tag_resolution import BusinessTagKind
from recyclic_api.services.sale_service import SaleService
from recyclic_api.services.stats_service import StatsService
from tests.caisse_sale_eligibility import (
    grant_user_caisse_sale_eligibility,
    grant_user_caisse_special_encaissement_permission,
)

_V1 = settings.API_V1_STR.rstrip("/")


def _open_session_bundle(db_session: Session) -> tuple[User, CashSession, str]:
    site = Site(
        id=uuid.uuid4(),
        name="Site 24-9",
        address="x",
        city="y",
        postal_code="00000",
        country="FR",
    )
    uid = uuid.uuid4()
    user = User(
        id=uid,
        username="cashier_249@example.com",
        hashed_password=hash_password("secret"),
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
        site_id=site.id,
    )
    reg = CashRegister(
        id=uuid.uuid4(),
        name="R1",
        location="L",
        site_id=site.id,
        is_active=True,
    )
    cs = CashSession(
        id=uuid.uuid4(),
        operator_id=user.id,
        site_id=site.id,
        register_id=reg.id,
        initial_amount=100.0,
        current_amount=100.0,
        status=CashSessionStatus.OPEN,
        opened_at=datetime.now(timezone.utc),
    )
    db_session.add_all([site, user, reg, cs])
    db_session.commit()
    grant_user_caisse_sale_eligibility(db_session, user, site.id)
    token = create_access_token(data={"sub": str(uid)})
    return user, cs, token


def test_story_24_9_line_tag_overrides_ticket_on_get(client: TestClient, db_session: Session) -> None:
    _, cs, token = _open_session_bundle(db_session)
    body = {
        "cash_session_id": str(cs.id),
        "items": [
            {
                "category": "EEE-1",
                "quantity": 1,
                "weight": 2.0,
                "unit_price": 5.0,
                "total_price": 5.0,
                "business_tag_kind": "CAMPAGNE_SOCIALE",
            },
        ],
        "total_amount": 5.0,
        "donation": 0,
        "payment_method": "cash",
        "business_tag_kind": "GRATIFERIA",
    }
    r = client.post(f"{_V1}/sales/", json=body, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200, r.text
    sale_id = r.json()["id"]
    g = client.get(f"{_V1}/sales/{sale_id}", headers={"Authorization": f"Bearer {token}"})
    assert g.status_code == 200
    js = g.json()
    assert js["effective_business_tag"] == "GRATIFERIA"
    assert js["items"][0]["effective_business_tag"] == "CAMPAGNE_SOCIALE"


def test_story_24_9_zero_total_free_payment_with_tag(client: TestClient, db_session: Session) -> None:
    _, cs, token = _open_session_bundle(db_session)
    body = {
        "cash_session_id": str(cs.id),
        "items": [
            {
                "category": "EEE-1",
                "quantity": 1,
                "weight": 1.0,
                "unit_price": 0.0,
                "total_price": 0.0,
                "business_tag_kind": "GRATIFERIA",
            },
        ],
        "total_amount": 0.0,
        "donation": 0,
        "payment_method": "free",
        "business_tag_kind": "GRATIFERIA",
    }
    r = client.post(f"{_V1}/sales/", json=body, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200, r.text


def test_story_24_9_legacy_explicit_mismatch_rejected(db_session: Session) -> None:
    user, cs, _ = _open_session_bundle(db_session)
    grant_user_caisse_special_encaissement_permission(db_session, user)
    svc = SaleService(db_session)
    sale_data = SaleCreate(
        cash_session_id=cs.id,
        items=[],
        total_amount=10.0,
        payment_method="cash",
        special_encaissement_kind=SpecialEncaissementKind.DON_SANS_ARTICLE,
        business_tag_kind=BusinessTagKind.GRATIFERIA,
    )
    from recyclic_api.core.exceptions import ValidationError

    with pytest.raises(ValidationError, match="Incohérence"):
        svc.create_sale(sale_data, str(cs.operator_id))


def test_story_24_9_stats_service_and_endpoint(admin_client, db_session: Session) -> None:
    user, cs, _ = _open_session_bundle(db_session)
    svc = SaleService(db_session)
    svc.create_sale(
        SaleCreate(
            cash_session_id=cs.id,
            items=[
                SaleItemCreate(
                    category="EEE-1",
                    quantity=1,
                    weight=3.0,
                    unit_price=1.0,
                    total_price=1.0,
                    business_tag_kind=BusinessTagKind.GRATIFERIA,
                ),
            ],
            total_amount=1.0,
            payment_method="cash",
        ),
        str(user.id),
    )
    stats = StatsService(db_session)
    rows = stats.get_sales_by_business_tag_and_category()
    keys = {(r.business_tag_key, r.category_name) for r in rows}
    assert any(t[0] == "GRATIFERIA" and t[1] == "EEE-1" for t in keys)

    r = admin_client.get(f"{_V1}/stats/sales/by-business-tag-and-category")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
