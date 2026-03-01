# Fixtures partagees pour tests routers (cash_sessions, sales, admin db).
# test_user, test_site, test_register, test_preset, open_cash_session.

import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy.orm import Session

from api.models import (
    CashRegister,
    CashSession,
    Category,
    PresetButton,
    Sale,
    SaleItem,
    PaymentTransaction,
)
from api.tests.conftest import FAKE_SITE_ID, FAKE_USER_ID, TestingSessionLocal


@pytest.fixture
def test_site(_db_with_user):
    """Site de test (deja cree par _db_with_user)."""
    db = TestingSessionLocal()
    from api.models import Site
    site = db.get(Site, FAKE_SITE_ID)
    db.close()
    assert site is not None
    return site


@pytest.fixture
def test_user(_db_with_user):
    """User de test (deja cree par _db_with_user)."""
    db = TestingSessionLocal()
    from api.models import User
    user = db.get(User, FAKE_USER_ID)
    db.close()
    assert user is not None
    return user


@pytest.fixture
def test_register(client, test_site):
    """CashRegister de test."""
    db = TestingSessionLocal()
    reg = CashRegister(
        id=uuid.uuid4(),
        site_id=test_site.id,
        name="Test Register",
        is_active=True,
    )
    db.add(reg)
    db.commit()
    db.refresh(reg)
    reg_id = reg.id
    db.close()
    db2 = TestingSessionLocal()
    reg = db2.get(CashRegister, reg_id)
    db2.close()
    return reg


@pytest.fixture
def test_preset(client, test_site):
    """PresetButton de test."""
    db = TestingSessionLocal()
    cat = Category(
        id=uuid.uuid4(),
        name="Test Cat",
        is_visible_sale=True,
        is_visible_reception=True,
    )
    db.add(cat)
    db.flush()
    preset = PresetButton(
        id=uuid.uuid4(),
        name="Test Preset",
        category_id=cat.id,
        preset_price=100,
        button_type="test",
    )
    db.add(preset)
    db.commit()
    db.refresh(preset)
    preset_id = preset.id
    db.close()
    db2 = TestingSessionLocal()
    preset = db2.get(PresetButton, preset_id)
    db2.close()
    return preset


@pytest.fixture
def open_cash_session(client, auth_headers, test_user, test_site, test_register):
    """Session caisse ouverte creee via API."""
    r = client.post(
        "/v1/cash-sessions",
        json={
            "initial_amount": 0,
            "register_id": str(test_register.id),
            "session_type": "real",
        },
        headers=auth_headers,
    )
    assert r.status_code == 201
    data = r.json()
    session_id = uuid.UUID(data["id"])
    db = TestingSessionLocal()
    session = db.get(CashSession, session_id)
    db.close()
    return session


@pytest.fixture
def db_with_transactions(client, open_cash_session, test_preset, auth_headers):
    """
    Cree Sale + SaleItem + PaymentTransaction via API pour test purge.
    Necessite open_cash_session et test_preset.
    """
    sale_body = {
        "cash_session_id": str(open_cash_session.id),
        "items": [
            {
                "preset_id": str(test_preset.id),
                "quantity": 1,
                "unit_price": test_preset.preset_price,
                "total_price": test_preset.preset_price,
            }
        ],
        "payments": [{"payment_method": "especes", "amount": test_preset.preset_price}],
    }
    r = client.post("/v1/sales", json=sale_body, headers=auth_headers)
    assert r.status_code == 201, r.json()
    return None  # pas de retour, les donnees sont en BDD
