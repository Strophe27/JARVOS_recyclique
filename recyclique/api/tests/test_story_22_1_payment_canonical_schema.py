from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from recyclic_api.core.exceptions import ValidationError
from recyclic_api.core.security import create_access_token
from recyclic_api.models.cash_register import CashRegister
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.payment_method import PaymentMethodDefinition, PaymentMethodKind
from recyclic_api.models.payment_transaction import (
    PaymentTransaction,
    PaymentTransactionDirection,
    PaymentTransactionNature,
)
from recyclic_api.models.sale import PaymentMethod, Sale, SaleLifecycleStatus
from recyclic_api.models.sale_item import SaleItem
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.schemas.sale import PaymentCreate, SaleCorrectionFinalizeFieldsPayload
from recyclic_api.services.sale_service import SaleService
from tests.caisse_sale_eligibility import (
    grant_user_caisse_sale_eligibility,
    grant_user_caisse_special_encaissement_permission,
)


def _seed_cash_runtime(db_session):
    site = Site(
        id=uuid.uuid4(),
        name="Story 22.1 Site",
        address="1 rue test",
        city="Paris",
        postal_code="75000",
        country="FR",
    )
    cashier = User(
        id=uuid.uuid4(),
        username="story22_cashier",
        hashed_password="x",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
        site_id=site.id,
    )
    register = CashRegister(
        id=uuid.uuid4(),
        name="Story 22.1 Register",
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
        opened_at=datetime.utcnow(),
    )
    db_session.add_all([site, cashier, register, session])
    db_session.commit()
    grant_user_caisse_sale_eligibility(db_session, cashier, site.id)
    grant_user_caisse_special_encaissement_permission(db_session, cashier)
    return cashier, session


def _seed_super_admin_open_session(db_session):
    """Session ouverte + super-admin (correction vente Story 6.8 / alignement paiements 22.1)."""
    site = Site(
        id=uuid.uuid4(),
        name="Story 22.1 SA Site",
        address="2 rue test",
        city="Paris",
        postal_code="75000",
        country="FR",
    )
    super_admin = User(
        id=uuid.uuid4(),
        username=f"story22_sa_{uuid.uuid4().hex[:8]}",
        hashed_password="x",
        role=UserRole.SUPER_ADMIN,
        status=UserStatus.ACTIVE,
        is_active=True,
        site_id=site.id,
    )
    register = CashRegister(
        id=uuid.uuid4(),
        name="Story 22.1 SA Register",
        location="Accueil",
        site_id=site.id,
        is_active=True,
    )
    session = CashSession(
        id=uuid.uuid4(),
        operator_id=super_admin.id,
        site_id=site.id,
        register_id=register.id,
        initial_amount=50.0,
        current_amount=62.0,
        total_sales=12.0,
        total_items=1,
        status=CashSessionStatus.OPEN,
        opened_at=datetime.utcnow(),
    )
    db_session.add_all([site, super_admin, register, session])
    db_session.commit()
    return super_admin, session


def _seed_payment_methods(db_session):
    db_session.add_all(
        [
            PaymentMethodDefinition(
                id=uuid.uuid4(),
                code="cash",
                label="Espèces",
                active=True,
                kind=PaymentMethodKind.CASH,
                paheko_debit_account="530",
                paheko_refund_credit_account="530",
                display_order=10,
            ),
            PaymentMethodDefinition(
                id=uuid.uuid4(),
                code="check",
                label="Chèque",
                active=True,
                kind=PaymentMethodKind.BANK,
                paheko_debit_account="5112",
                paheko_refund_credit_account="5112",
                display_order=20,
            ),
            PaymentMethodDefinition(
                id=uuid.uuid4(),
                code="card",
                label="Carte",
                active=True,
                kind=PaymentMethodKind.BANK,
                paheko_debit_account="511",
                paheko_refund_credit_account="511",
                display_order=30,
            ),
        ]
    )
    db_session.commit()


def test_create_sale_returns_canonical_payment_fields(client, db_session):
    cashier, session = _seed_cash_runtime(db_session)
    _seed_payment_methods(db_session)
    token = create_access_token(data={"sub": str(cashier.id)})

    response = client.post(
        "/v1/sales/",
        json={
            "cash_session_id": str(session.id),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 1.0,
                    "unit_price": 12.0,
                    "total_price": 12.0,
                }
            ],
            "total_amount": 12.0,
            "payments": [
                {"payment_method": "cash", "amount": 5.0},
                {"payment_method": "check", "amount": 7.0},
            ],
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert len(data["payments"]) == 2
    for payment in data["payments"]:
        assert payment["nature"] == "sale_payment"
        assert payment["direction"] == "inflow"
        assert payment["payment_method_id"] is not None
        assert payment["payment_method_code"] in {"cash", "check"}


def test_free_zero_special_sale_stays_non_financial(client, db_session):
    cashier, session = _seed_cash_runtime(db_session)
    _seed_payment_methods(db_session)
    token = create_access_token(data={"sub": str(cashier.id)})

    response = client.post(
        "/v1/sales/",
        json={
            "cash_session_id": str(session.id),
            "items": [],
            "total_amount": 0.0,
            "special_encaissement_kind": "DON_SANS_ARTICLE",
            "payment_method": "free",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["payment_method"] == "free"
    assert data["payments"] == []

    db_payments = db_session.query(PaymentTransaction).filter(
        PaymentTransaction.sale_id == uuid.UUID(data["id"])
    ).all()
    assert db_payments == []


def test_create_sale_rejects_free_in_explicit_payments(client, db_session):
    cashier, session = _seed_cash_runtime(db_session)
    _seed_payment_methods(db_session)
    token = create_access_token(data={"sub": str(cashier.id)})

    response = client.post(
        "/v1/sales/",
        json={
            "cash_session_id": str(session.id),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 1.0,
                    "unit_price": 12.0,
                    "total_price": 12.0,
                }
            ],
            "total_amount": 12.0,
            "payments": [
                {"payment_method": "free", "amount": 12.0},
            ],
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 422, response.text
    assert "free" in response.text


def test_finalize_held_sale_rejects_free_in_explicit_payments(client, db_session):
    cashier, session = _seed_cash_runtime(db_session)
    _seed_payment_methods(db_session)
    token = create_access_token(data={"sub": str(cashier.id)})
    headers = {"Authorization": f"Bearer {token}"}

    hold_response = client.post(
        "/v1/sales/hold",
        json={
            "cash_session_id": str(session.id),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 1.0,
                    "unit_price": 12.0,
                    "total_price": 12.0,
                }
            ],
            "total_amount": 12.0,
        },
        headers=headers,
    )
    assert hold_response.status_code == 200, hold_response.text
    sale_id = hold_response.json()["id"]

    finalize_response = client.post(
        f"/v1/sales/{sale_id}/finalize-held",
        json={
            "payments": [
                {"payment_method": "free", "amount": 12.0},
            ]
        },
        headers=headers,
    )

    assert finalize_response.status_code == 422, finalize_response.text
    assert "free" in finalize_response.text


def test_sale_correction_payment_method_aligns_single_payment_transaction(db_session):
    """CR B1 : correction du moyen de paiement aligne la ligne PaymentTransaction canonique."""
    super_admin, session = _seed_super_admin_open_session(db_session)
    _seed_payment_methods(db_session)
    cash_def = (
        db_session.query(PaymentMethodDefinition)
        .filter(PaymentMethodDefinition.code == "cash")
        .first()
    )
    card_def = (
        db_session.query(PaymentMethodDefinition)
        .filter(PaymentMethodDefinition.code == "card")
        .first()
    )
    assert cash_def is not None and card_def is not None

    sale = Sale(
        cash_session_id=session.id,
        operator_id=super_admin.id,
        total_amount=12.0,
        donation=0.0,
        payment_method=PaymentMethod.CASH,
        sale_date=datetime.now(timezone.utc),
        lifecycle_status=SaleLifecycleStatus.COMPLETED,
    )
    db_session.add(sale)
    db_session.flush()
    db_session.add(
        SaleItem(
            sale_id=sale.id,
            category="EEE-1",
            quantity=1,
            weight=1.0,
            unit_price=12.0,
            total_price=12.0,
        )
    )
    db_session.add(
        PaymentTransaction(
            sale_id=sale.id,
            payment_method=PaymentMethod.CASH,
            payment_method_id=cash_def.id,
            nature=PaymentTransactionNature.SALE_PAYMENT,
            direction=PaymentTransactionDirection.INFLOW,
            amount=12.0,
        )
    )
    db_session.commit()

    payload = SaleCorrectionFinalizeFieldsPayload(
        kind="finalize_fields",
        payment_method=PaymentMethod.CARD,
        reason="Erreur de moyen",
    )
    SaleService(db_session).apply_sensitive_sale_correction(str(sale.id), payload, super_admin)
    db_session.expire_all()

    row = db_session.query(PaymentTransaction).filter(PaymentTransaction.sale_id == sale.id).one()
    assert row.payment_method == PaymentMethod.CARD
    assert row.payment_method_id == card_def.id
    sale_row = db_session.query(Sale).filter(Sale.id == sale.id).one()
    assert sale_row.payment_method == PaymentMethod.CARD


def test_sale_correction_payment_method_and_total_align_payment_transaction(db_session):
    """Correction combinée total + moyen : la ligne unique reflète les deux."""
    super_admin, session = _seed_super_admin_open_session(db_session)
    _seed_payment_methods(db_session)
    cash_def = (
        db_session.query(PaymentMethodDefinition)
        .filter(PaymentMethodDefinition.code == "cash")
        .first()
    )
    check_def = (
        db_session.query(PaymentMethodDefinition)
        .filter(PaymentMethodDefinition.code == "check")
        .first()
    )
    assert cash_def is not None and check_def is not None

    sale = Sale(
        cash_session_id=session.id,
        operator_id=super_admin.id,
        total_amount=12.0,
        donation=0.0,
        payment_method=PaymentMethod.CASH,
        sale_date=datetime.now(timezone.utc),
        lifecycle_status=SaleLifecycleStatus.COMPLETED,
    )
    db_session.add(sale)
    db_session.flush()
    db_session.add(
        SaleItem(
            sale_id=sale.id,
            category="EEE-1",
            quantity=1,
            weight=1.0,
            unit_price=10.0,
            total_price=10.0,
        )
    )
    db_session.add(
        PaymentTransaction(
            sale_id=sale.id,
            payment_method=PaymentMethod.CASH,
            payment_method_id=cash_def.id,
            nature=PaymentTransactionNature.SALE_PAYMENT,
            direction=PaymentTransactionDirection.INFLOW,
            amount=12.0,
        )
    )
    db_session.commit()

    payload = SaleCorrectionFinalizeFieldsPayload(
        kind="finalize_fields",
        total_amount=10.0,
        payment_method=PaymentMethod.CHECK,
        reason="Ajustement",
    )
    SaleService(db_session).apply_sensitive_sale_correction(str(sale.id), payload, super_admin)
    db_session.expire_all()

    row = db_session.query(PaymentTransaction).filter(PaymentTransaction.sale_id == sale.id).one()
    assert row.amount == 10.0
    assert row.payment_method == PaymentMethod.CHECK
    assert row.payment_method_id == check_def.id


def test_sale_correction_payments_array_replaces_multi_sale_payment_rows(db_session):
    """Correction sensible : ``payments[]`` remplace les lignes sale_payment multi-moyens + total cohérent."""
    super_admin, session = _seed_super_admin_open_session(db_session)
    _seed_payment_methods(db_session)
    cash_def = (
        db_session.query(PaymentMethodDefinition)
        .filter(PaymentMethodDefinition.code == "cash")
        .first()
    )
    check_def = (
        db_session.query(PaymentMethodDefinition)
        .filter(PaymentMethodDefinition.code == "check")
        .first()
    )
    card_def = (
        db_session.query(PaymentMethodDefinition)
        .filter(PaymentMethodDefinition.code == "card")
        .first()
    )
    assert cash_def is not None and check_def is not None and card_def is not None

    sale = Sale(
        cash_session_id=session.id,
        operator_id=super_admin.id,
        total_amount=15.0,
        donation=2.0,
        payment_method=PaymentMethod.CASH,
        sale_date=datetime.now(timezone.utc),
        lifecycle_status=SaleLifecycleStatus.COMPLETED,
    )
    db_session.add(sale)
    db_session.flush()
    db_session.add(
        SaleItem(
            sale_id=sale.id,
            category="EEE-1",
            quantity=1,
            weight=1.0,
            unit_price=13.0,
            total_price=13.0,
        )
    )
    db_session.add_all(
        [
            PaymentTransaction(
                sale_id=sale.id,
                payment_method=PaymentMethod.CASH,
                payment_method_id=cash_def.id,
                nature=PaymentTransactionNature.SALE_PAYMENT,
                direction=PaymentTransactionDirection.INFLOW,
                amount=7.0,
            ),
            PaymentTransaction(
                sale_id=sale.id,
                payment_method=PaymentMethod.CHECK,
                payment_method_id=check_def.id,
                nature=PaymentTransactionNature.SALE_PAYMENT,
                direction=PaymentTransactionDirection.INFLOW,
                amount=4.0,
            ),
            PaymentTransaction(
                sale_id=sale.id,
                payment_method=PaymentMethod.CARD,
                payment_method_id=card_def.id,
                nature=PaymentTransactionNature.SALE_PAYMENT,
                direction=PaymentTransactionDirection.INFLOW,
                amount=4.0,
            ),
        ]
    )
    db_session.commit()

    payload = SaleCorrectionFinalizeFieldsPayload(
        kind="finalize_fields",
        total_amount=15.0,
        donation=2.0,
        payments=[
            PaymentCreate(payment_method="cash", amount=8.0),
            PaymentCreate(payment_method="check", amount=4.0),
            PaymentCreate(payment_method="card", amount=3.0),
        ],
        reason="Répartition caisse corrigée",
    )
    SaleService(db_session).apply_sensitive_sale_correction(str(sale.id), payload, super_admin)
    db_session.expire_all()

    rows = (
        db_session.query(PaymentTransaction)
        .filter(
            PaymentTransaction.sale_id == sale.id,
            PaymentTransaction.nature == PaymentTransactionNature.SALE_PAYMENT,
        )
        .order_by(PaymentTransaction.created_at.asc())
        .all()
    )
    assert len(rows) == 3
    assert [float(r.amount) for r in rows] == [8.0, 4.0, 3.0]
    assert rows[0].payment_method == PaymentMethod.CASH


def test_sale_correction_payment_method_rejects_multiple_payment_rows(db_session):
    super_admin, session = _seed_super_admin_open_session(db_session)
    _seed_payment_methods(db_session)
    cash_def = (
        db_session.query(PaymentMethodDefinition)
        .filter(PaymentMethodDefinition.code == "cash")
        .first()
    )
    check_def = (
        db_session.query(PaymentMethodDefinition)
        .filter(PaymentMethodDefinition.code == "check")
        .first()
    )
    assert cash_def is not None and check_def is not None

    sale = Sale(
        cash_session_id=session.id,
        operator_id=super_admin.id,
        total_amount=12.0,
        donation=0.0,
        payment_method=PaymentMethod.CASH,
        sale_date=datetime.now(timezone.utc),
        lifecycle_status=SaleLifecycleStatus.COMPLETED,
    )
    db_session.add(sale)
    db_session.flush()
    db_session.add(
        SaleItem(
            sale_id=sale.id,
            category="EEE-1",
            quantity=1,
            weight=1.0,
            unit_price=12.0,
            total_price=12.0,
        )
    )
    db_session.add_all(
        [
            PaymentTransaction(
                sale_id=sale.id,
                payment_method=PaymentMethod.CASH,
                payment_method_id=cash_def.id,
                nature=PaymentTransactionNature.SALE_PAYMENT,
                direction=PaymentTransactionDirection.INFLOW,
                amount=5.0,
            ),
            PaymentTransaction(
                sale_id=sale.id,
                payment_method=PaymentMethod.CHECK,
                payment_method_id=check_def.id,
                nature=PaymentTransactionNature.SALE_PAYMENT,
                direction=PaymentTransactionDirection.INFLOW,
                amount=7.0,
            ),
        ]
    )
    db_session.commit()

    payload = SaleCorrectionFinalizeFieldsPayload(
        kind="finalize_fields",
        payment_method=PaymentMethod.CARD,
        reason="Impossible",
    )
    with pytest.raises(ValidationError, match="plusieurs lignes de paiement"):
        SaleService(db_session).apply_sensitive_sale_correction(str(sale.id), payload, super_admin)


def test_sale_correction_payment_method_zero_rows_only_updates_legacy_sale_column(db_session):
    """Sans ligne PaymentTransaction : on ne crée pas de ligne ; seul sale.payment_method est mis à jour."""
    super_admin, session = _seed_super_admin_open_session(db_session)
    _seed_payment_methods(db_session)

    sale = Sale(
        cash_session_id=session.id,
        operator_id=super_admin.id,
        total_amount=40.0,
        donation=0.0,
        payment_method=PaymentMethod.CASH,
        sale_date=datetime.now(timezone.utc),
        lifecycle_status=SaleLifecycleStatus.COMPLETED,
    )
    db_session.add(sale)
    db_session.flush()
    db_session.add(
        SaleItem(
            sale_id=sale.id,
            category="EEE-1",
            quantity=1,
            weight=1.0,
            unit_price=40.0,
            total_price=40.0,
        )
    )
    db_session.commit()

    payload = SaleCorrectionFinalizeFieldsPayload(
        kind="finalize_fields",
        payment_method=PaymentMethod.CARD,
        reason="Legacy sans lignes",
    )
    SaleService(db_session).apply_sensitive_sale_correction(str(sale.id), payload, super_admin)
    db_session.expire_all()

    assert db_session.query(PaymentTransaction).filter(PaymentTransaction.sale_id == sale.id).count() == 0
    sale_row = db_session.query(Sale).filter(Sale.id == sale.id).one()
    assert sale_row.payment_method == PaymentMethod.CARD
