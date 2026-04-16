"""Story 22.4 — arbitrage caisse : mix, don surplus explicite, gratuité, refus surpaiement implicite."""

from __future__ import annotations

import uuid

import pytest
from recyclic_api.core.security import create_access_token
from recyclic_api.models.cash_register import CashRegister
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.payment_method import PaymentMethodDefinition, PaymentMethodKind
from recyclic_api.models.payment_transaction import PaymentTransaction, PaymentTransactionNature
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from tests.caisse_sale_eligibility import grant_user_caisse_sale_eligibility


def _seed(db_session):
    site = Site(
        id=uuid.uuid4(),
        name="S22.4 site",
        address="x",
        city="Paris",
        postal_code="75000",
        country="FR",
    )
    cashier = User(
        id=uuid.uuid4(),
        username="s224_cashier",
        hashed_password="x",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
        site_id=site.id,
    )
    register = CashRegister(
        id=uuid.uuid4(),
        name="Reg",
        location="Accueil",
        site_id=site.id,
        is_active=True,
    )
    session = CashSession(
        id=uuid.uuid4(),
        operator_id=cashier.id,
        site_id=site.id,
        register_id=register.id,
        initial_amount=50.0,
        current_amount=50.0,
        status=CashSessionStatus.OPEN,
    )
    db_session.add_all([site, cashier, register, session])
    db_session.commit()
    grant_user_caisse_sale_eligibility(db_session, cashier, site.id)
    for code, order in (("cash", 10), ("check", 20), ("card", 30)):
        db_session.add(
            PaymentMethodDefinition(
                id=uuid.uuid4(),
                code=code,
                label=code,
                active=True,
                kind=PaymentMethodKind.CASH if code == "cash" else PaymentMethodKind.BANK,
                paheko_debit_account="530",
                paheko_refund_credit_account="530",
                display_order=order,
            )
        )
    db_session.commit()
    return cashier, session


def _item_block():
    return {
        "category": "EEE-1",
        "quantity": 1,
        "weight": 1.0,
        "unit_price": 12.0,
        "total_price": 12.0,
    }


def test_underpayment_rejected(client, db_session):
    cashier, session = _seed(db_session)
    token = create_access_token(data={"sub": str(cashier.id)})
    r = client.post(
        "/v1/sales/",
        json={
            "cash_session_id": str(session.id),
            "items": [_item_block()],
            "total_amount": 12.0,
            "payments": [
                {"payment_method": "cash", "amount": 5.0},
                {"payment_method": "check", "amount": 4.0},
            ],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 400
    assert "insuffisant" in r.json()["detail"].lower() or "couvrir" in r.json()["detail"].lower()


def test_overpayment_single_line_rejected(client, db_session):
    cashier, session = _seed(db_session)
    token = create_access_token(data={"sub": str(cashier.id)})
    r = client.post(
        "/v1/sales/",
        json={
            "cash_session_id": str(session.id),
            "items": [_item_block()],
            "total_amount": 12.0,
            "payments": [{"payment_method": "cash", "amount": 15.0}],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 400
    assert "supérieur au total" in r.json()["detail"].lower() or "réglement" in r.json()["detail"].lower()


def test_overpayment_mixed_lines_without_explicit_donation_rejected(client, db_session):
    """AC 22.4 — sur-règlement implicite même sur plusieurs lignes `sale_payment`."""
    cashier, session = _seed(db_session)
    token = create_access_token(data={"sub": str(cashier.id)})
    r = client.post(
        "/v1/sales/",
        json={
            "cash_session_id": str(session.id),
            "items": [_item_block()],
            "total_amount": 12.0,
            "payments": [
                {"payment_method": "cash", "amount": 8.0},
                {"payment_method": "check", "amount": 5.0},
            ],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 400
    detail = r.json()["detail"].lower()
    assert "supérieur au total" in detail or "réglement" in detail


def test_mixed_ok_multiple_sale_payment_rows(client, db_session):
    cashier, session = _seed(db_session)
    token = create_access_token(data={"sub": str(cashier.id)})
    r = client.post(
        "/v1/sales/",
        json={
            "cash_session_id": str(session.id),
            "items": [_item_block()],
            "total_amount": 12.0,
            "payments": [
                {"payment_method": "cash", "amount": 5.0},
                {"payment_method": "check", "amount": 7.0},
            ],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert len(data["payments"]) == 2
    assert all(p["nature"] == "sale_payment" for p in data["payments"])


def test_donation_surplus_distinct_nature(client, db_session):
    cashier, session = _seed(db_session)
    token = create_access_token(data={"sub": str(cashier.id)})
    r = client.post(
        "/v1/sales/",
        json={
            "cash_session_id": str(session.id),
            "items": [_item_block()],
            "total_amount": 12.0,
            "payments": [{"payment_method": "cash", "amount": 10.0}],
            "donation_surplus": [{"payment_method": "cash", "amount": 2.0}],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    kinds = {p["nature"] for p in data["payments"]}
    assert "sale_payment" in kinds and "donation_surplus" in kinds
    sale_id = uuid.UUID(data["id"])
    rows = db_session.query(PaymentTransaction).filter(PaymentTransaction.sale_id == sale_id).all()
    assert {row.nature for row in rows} == {
        PaymentTransactionNature.SALE_PAYMENT,
        PaymentTransactionNature.DONATION_SURPLUS,
    }


def test_free_nominal_no_financial_lines(client, db_session):
    cashier, session = _seed(db_session)
    token = create_access_token(data={"sub": str(cashier.id)})
    r = client.post(
        "/v1/sales/",
        json={
            "cash_session_id": str(session.id),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 1.0,
                    "unit_price": 0.0,
                    "total_price": 0.0,
                }
            ],
            "total_amount": 0.0,
            "payment_method": "free",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["payments"] == []


def test_free_with_payment_lines_rejected(client, db_session):
    cashier, session = _seed(db_session)
    token = create_access_token(data={"sub": str(cashier.id)})
    r = client.post(
        "/v1/sales/",
        json={
            "cash_session_id": str(session.id),
            "items": [_item_block()],
            "total_amount": 12.0,
            "payment_method": "free",
            "payments": [{"payment_method": "cash", "amount": 12.0}],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 400


@pytest.mark.parametrize(
    "finalize_body",
    [
        {
            "payments": [{"payment_method": "cash", "amount": 5.0}],
        },
        {
            "payments": [{"payment_method": "cash", "amount": 15.0}],
        },
    ],
)
def test_finalize_held_underpay_and_overpay(client, db_session, finalize_body):
    cashier, session = _seed(db_session)
    token = create_access_token(data={"sub": str(cashier.id)})
    headers = {"Authorization": f"Bearer {token}"}
    hold = client.post(
        "/v1/sales/hold",
        json={
            "cash_session_id": str(session.id),
            "items": [_item_block()],
            "total_amount": 12.0,
        },
        headers=headers,
    )
    assert hold.status_code == 200, hold.text
    sale_id = hold.json()["id"]
    fin = client.post(f"/v1/sales/{sale_id}/finalize-held", json=finalize_body, headers=headers)
    assert fin.status_code == 400


def test_finalize_held_donation_surplus_distinct_nature(client, db_session):
    """AC 22.4 — ticket tenu : règlement + don surplus explicite, même persistance que vente directe."""
    cashier, session = _seed(db_session)
    token = create_access_token(data={"sub": str(cashier.id)})
    headers = {"Authorization": f"Bearer {token}"}
    hold = client.post(
        "/v1/sales/hold",
        json={
            "cash_session_id": str(session.id),
            "items": [_item_block()],
            "total_amount": 12.0,
        },
        headers=headers,
    )
    assert hold.status_code == 200, hold.text
    sale_id = hold.json()["id"]
    fin = client.post(
        f"/v1/sales/{sale_id}/finalize-held",
        json={
            "payments": [{"payment_method": "cash", "amount": 10.0}],
            "donation_surplus": [{"payment_method": "cash", "amount": 2.0}],
        },
        headers=headers,
    )
    assert fin.status_code == 200, fin.text
    data = fin.json()
    kinds = {p["nature"] for p in data["payments"]}
    assert "sale_payment" in kinds and "donation_surplus" in kinds
    sid = uuid.UUID(data["id"])
    rows = db_session.query(PaymentTransaction).filter(PaymentTransaction.sale_id == sid).all()
    assert {row.nature for row in rows} == {
        PaymentTransactionNature.SALE_PAYMENT,
        PaymentTransactionNature.DONATION_SURPLUS,
    }


def test_nonpositive_payment_amount_schema_rejected(client, db_session):
    """Montant <= 0 sur une ligne : validation Pydantic explicite (pas filtrage silencieux)."""
    cashier, session = _seed(db_session)
    token = create_access_token(data={"sub": str(cashier.id)})
    r = client.post(
        "/v1/sales/",
        json={
            "cash_session_id": str(session.id),
            "items": [_item_block()],
            "total_amount": 12.0,
            "payments": [
                {"payment_method": "cash", "amount": 6.0},
                {"payment_method": "check", "amount": 0.0},
            ],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 422
