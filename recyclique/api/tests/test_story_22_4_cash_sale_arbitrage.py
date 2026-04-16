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
from recyclic_api.services.cash_session_service import CashSessionService
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


def test_finalize_held_voluntary_donation_recomputes_total_for_mixed_payments(client, db_session):
    """Don saisi à la finalisation : total encaissement = net marchand + don (bug 400 si total_amount restait au hold)."""
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
            "donation": 4.0,
            "payments": [
                {"payment_method": "cash", "amount": 10.0},
                {"payment_method": "check", "amount": 6.0},
            ],
        },
        headers=headers,
    )
    assert fin.status_code == 200, fin.text
    data = fin.json()
    assert data["total_amount"] == pytest.approx(16.0)
    assert data["donation"] == pytest.approx(4.0)
    kinds = {p["nature"] for p in data["payments"]}
    assert kinds == {"sale_payment"}


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


def test_session_rollups_separate_net_sales_donation_and_gross_current_amount(client, db_session):
    """``total_amount`` = encaissement ; ``donation`` = ventilation sur ticket : total_sales net, current_amount = fond + brut."""
    cashier, session = _seed(db_session)
    token = create_access_token(data={"sub": str(cashier.id)})
    r = client.post(
        "/v1/sales/",
        json={
            "cash_session_id": str(session.id),
            "items": [_item_block()],
            "total_amount": 15.0,
            "donation": 2.0,
            "payments": [
                {"payment_method": "cash", "amount": 5.0},
                {"payment_method": "check", "amount": 10.0},
            ],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    db_session.refresh(session)
    init = float(session.initial_amount or 0.0)
    assert session.total_sales == pytest.approx(13.0)
    assert session.current_amount == pytest.approx(init + 15.0)

    svc = CashSessionService(db_session)
    preview = svc.get_closing_preview(session, 0.0)
    assert preview["total_donations"] == pytest.approx(2.0)
    assert preview["theoretical_amount"] == pytest.approx(init + 15.0)
