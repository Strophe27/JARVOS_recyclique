"""Agrégat journal : deux moyens BANK distincts via ``payment_method_id`` (codes expert), sans fusion legacy."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.orm import noload, selectinload

from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.payment_method import PaymentMethodDefinition, PaymentMethodKind
from recyclic_api.models.payment_transaction import (
    PaymentTransaction,
    PaymentTransactionDirection,
    PaymentTransactionNature,
)
from recyclic_api.models.sale import PaymentMethod, Sale, SaleLifecycleStatus
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.schemas.cash_session import SaleDetail
from recyclic_api.services.cash_session_journal_snapshot import compute_payment_journal_aggregates


@pytest.fixture
def session_sale_two_bank_fk_and_cash(db_session):
    """Session avec espèces + virement + carte : FK ``payment_method_id`` sur chaque ligne."""
    site = Site(
        name="JdualB site",
        address="1 rue J",
        city="V",
        postal_code="75000",
        country="FR",
        is_active=True,
    )
    db_session.add(site)
    db_session.flush()
    uid = uuid.uuid4()
    user = User(
        id=uid,
        username=f"ujdb_{uid.hex[:10]}@t.com",
        hashed_password="pw",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
        site_id=site.id,
    )
    db_session.add(user)
    pm_cash = PaymentMethodDefinition(
        id=uuid.uuid4(),
        code="cash",
        label="Espèces",
        active=True,
        kind=PaymentMethodKind.CASH,
        paheko_debit_account="530",
        paheko_refund_credit_account="530",
        display_order=10,
    )
    pm_transfer = PaymentMethodDefinition(
        id=uuid.uuid4(),
        code="transfer",
        label="Virement",
        active=True,
        kind=PaymentMethodKind.BANK,
        paheko_debit_account="5121",
        paheko_refund_credit_account="5121",
        display_order=20,
    )
    pm_card = PaymentMethodDefinition(
        id=uuid.uuid4(),
        code="card",
        label="Carte",
        active=True,
        kind=PaymentMethodKind.BANK,
        paheko_debit_account="512",
        paheko_refund_credit_account="512",
        display_order=30,
    )
    db_session.add_all([pm_cash, pm_transfer, pm_card])
    cs = CashSession(
        operator_id=user.id,
        site_id=site.id,
        initial_amount=0.0,
        current_amount=10.0,
        status=CashSessionStatus.OPEN,
        total_sales=75.0,
        total_items=1,
    )
    db_session.add(cs)
    db_session.flush()
    sale = Sale(
        cash_session_id=cs.id,
        operator_id=user.id,
        total_amount=75.0,
        donation=0.0,
        payment_method=PaymentMethod.CASH,
        lifecycle_status=SaleLifecycleStatus.COMPLETED,
    )
    db_session.add(sale)
    db_session.flush()
    # Legacy VARCHAR identique « card » sur les deux lignes BANK : sans FK, tout irait vers la clé « card ».
    db_session.add_all(
        [
            PaymentTransaction(
                sale_id=sale.id,
                payment_method=PaymentMethod.CASH,
                payment_method_id=pm_cash.id,
                nature=PaymentTransactionNature.SALE_PAYMENT,
                direction=PaymentTransactionDirection.INFLOW,
                amount=10.0,
            ),
            PaymentTransaction(
                sale_id=sale.id,
                payment_method=PaymentMethod.CARD,
                payment_method_id=pm_transfer.id,
                nature=PaymentTransactionNature.SALE_PAYMENT,
                direction=PaymentTransactionDirection.INFLOW,
                amount=40.0,
            ),
            PaymentTransaction(
                sale_id=sale.id,
                payment_method=PaymentMethod.CARD,
                payment_method_id=pm_card.id,
                nature=PaymentTransactionNature.SALE_PAYMENT,
                direction=PaymentTransactionDirection.INFLOW,
                amount=25.0,
            ),
        ]
    )
    db_session.commit()
    cs = db_session.execute(
        select(CashSession).where(CashSession.id == cs.id).options(noload(CashSession.register))
    ).scalar_one()
    return cs


def test_compute_payment_journal_aggregates_two_bank_codes_via_fk(
    db_session, session_sale_two_bank_fk_and_cash
):
    cs = session_sale_two_bank_fk_and_cash
    totals = compute_payment_journal_aggregates(
        db_session,
        cash_session_id=cs.id,
        use_legacy_preview_if_no_journal=False,
    )
    by_pm = totals.by_payment_method_signed
    assert by_pm.get("cash") == pytest.approx(10.0)
    assert by_pm.get("transfer") == pytest.approx(40.0)
    assert by_pm.get("card") == pytest.approx(25.0)
    assert totals.payment_transaction_line_count == 3
    # Uniquement les lignes kind=cash (FK), pas les montants BANK.
    assert totals.cash_signed_net_from_journal == pytest.approx(10.0)


def test_compute_payment_journal_refunds_by_expert_pm_current_and_prior(
    db_session, session_sale_two_bank_fk_and_cash
):
    """P2 — remboursements ventilés par code expert (courant vs N-1 clos), alignés scalaires."""
    cs = session_sale_two_bank_fk_and_cash
    sale = db_session.execute(select(Sale).where(Sale.cash_session_id == cs.id)).scalar_one()
    pm_transfer = db_session.execute(
        select(PaymentMethodDefinition).where(PaymentMethodDefinition.code == "transfer")
    ).scalar_one()
    pm_card = db_session.execute(
        select(PaymentMethodDefinition).where(PaymentMethodDefinition.code == "card")
    ).scalar_one()
    db_session.add_all(
        [
            PaymentTransaction(
                sale_id=sale.id,
                payment_method=PaymentMethod.CARD,
                payment_method_id=pm_transfer.id,
                nature=PaymentTransactionNature.REFUND_PAYMENT,
                direction=PaymentTransactionDirection.OUTFLOW,
                amount=6.0,
                is_prior_year_special_case=False,
            ),
            PaymentTransaction(
                sale_id=sale.id,
                payment_method=PaymentMethod.CARD,
                payment_method_id=pm_card.id,
                nature=PaymentTransactionNature.REFUND_PAYMENT,
                direction=PaymentTransactionDirection.OUTFLOW,
                amount=2.5,
                is_prior_year_special_case=True,
            ),
        ]
    )
    db_session.commit()

    totals = compute_payment_journal_aggregates(
        db_session,
        cash_session_id=cs.id,
        use_legacy_preview_if_no_journal=False,
    )
    assert totals.refunds_current_fiscal_total == pytest.approx(6.0)
    assert totals.refunds_prior_closed_fiscal_total == pytest.approx(2.5)
    assert totals.refunds_current_fiscal_by_payment_method.get("transfer") == pytest.approx(6.0)
    assert totals.refunds_prior_closed_fiscal_by_payment_method.get("card") == pytest.approx(2.5)


def test_compute_payment_journal_aggregates_bank_only_no_cash_in_cash_net(db_session):
    """Deux BANK FK sans espèces : ``cash_signed_net_from_journal`` reste nul."""
    site = Site(
        name="JdualB bank-only",
        address="2 rue J",
        city="V",
        postal_code="75000",
        country="FR",
        is_active=True,
    )
    db_session.add(site)
    db_session.flush()
    uid = uuid.uuid4()
    user = User(
        id=uid,
        username=f"ujbo_{uid.hex[:10]}@t.com",
        hashed_password="pw",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
        site_id=site.id,
    )
    db_session.add(user)
    pm_transfer = PaymentMethodDefinition(
        id=uuid.uuid4(),
        code="transfer",
        label="Virement",
        active=True,
        kind=PaymentMethodKind.BANK,
        paheko_debit_account="5121",
        paheko_refund_credit_account="5121",
        display_order=10,
    )
    pm_card = PaymentMethodDefinition(
        id=uuid.uuid4(),
        code="card",
        label="Carte",
        active=True,
        kind=PaymentMethodKind.BANK,
        paheko_debit_account="512",
        paheko_refund_credit_account="512",
        display_order=20,
    )
    db_session.add_all([pm_transfer, pm_card])
    cs = CashSession(
        operator_id=user.id,
        site_id=site.id,
        initial_amount=0.0,
        current_amount=0.0,
        status=CashSessionStatus.OPEN,
        total_sales=15.0,
        total_items=1,
    )
    db_session.add(cs)
    db_session.flush()
    sale = Sale(
        cash_session_id=cs.id,
        operator_id=user.id,
        total_amount=15.0,
        donation=0.0,
        payment_method=PaymentMethod.CARD,
        lifecycle_status=SaleLifecycleStatus.COMPLETED,
    )
    db_session.add(sale)
    db_session.flush()
    db_session.add_all(
        [
            PaymentTransaction(
                sale_id=sale.id,
                payment_method=PaymentMethod.CARD,
                payment_method_id=pm_transfer.id,
                nature=PaymentTransactionNature.SALE_PAYMENT,
                direction=PaymentTransactionDirection.INFLOW,
                amount=7.0,
            ),
            PaymentTransaction(
                sale_id=sale.id,
                payment_method=PaymentMethod.CARD,
                payment_method_id=pm_card.id,
                nature=PaymentTransactionNature.SALE_PAYMENT,
                direction=PaymentTransactionDirection.INFLOW,
                amount=8.0,
            ),
        ]
    )
    db_session.commit()

    totals = compute_payment_journal_aggregates(
        db_session,
        cash_session_id=cs.id,
        use_legacy_preview_if_no_journal=False,
    )
    assert totals.by_payment_method_signed["transfer"] == pytest.approx(7.0)
    assert totals.by_payment_method_signed["card"] == pytest.approx(8.0)
    assert totals.cash_signed_net_from_journal == pytest.approx(0.0)


def test_compute_payment_journal_donation_from_sale_without_donation_surplus_rows(db_session):
    """P1 : ``sale.donation`` sans lignes ``DONATION_SURPLUS`` → total dons aligné pour Paheko."""
    site = Site(
        name="Jdon site",
        address="1 rue D",
        city="V",
        postal_code="75000",
        country="FR",
        is_active=True,
    )
    db_session.add(site)
    db_session.flush()
    uid = uuid.uuid4()
    user = User(
        id=uid,
        username=f"ujdon_{uid.hex[:10]}@t.com",
        hashed_password="pw",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
        site_id=site.id,
    )
    db_session.add(user)
    pm_card = PaymentMethodDefinition(
        id=uuid.uuid4(),
        code="card",
        label="Carte",
        active=True,
        kind=PaymentMethodKind.BANK,
        paheko_debit_account="512",
        paheko_refund_credit_account="512",
        display_order=10,
    )
    db_session.add(pm_card)
    cs = CashSession(
        operator_id=user.id,
        site_id=site.id,
        initial_amount=0.0,
        current_amount=10.0,
        status=CashSessionStatus.OPEN,
        total_sales=7.0,
        total_items=1,
    )
    db_session.add(cs)
    db_session.flush()
    sale = Sale(
        cash_session_id=cs.id,
        operator_id=user.id,
        total_amount=10.0,
        donation=3.0,
        payment_method=PaymentMethod.CARD,
        lifecycle_status=SaleLifecycleStatus.COMPLETED,
    )
    db_session.add(sale)
    db_session.flush()
    db_session.add(
        PaymentTransaction(
            sale_id=sale.id,
            payment_method=PaymentMethod.CARD,
            payment_method_id=pm_card.id,
            nature=PaymentTransactionNature.SALE_PAYMENT,
            direction=PaymentTransactionDirection.INFLOW,
            amount=10.0,
        )
    )
    db_session.commit()

    totals = compute_payment_journal_aggregates(
        db_session,
        cash_session_id=cs.id,
        use_legacy_preview_if_no_journal=False,
    )
    assert totals.by_payment_method_signed.get("card") == pytest.approx(10.0)
    assert totals.donation_surplus_total == pytest.approx(3.0)


def test_sale_detail_payment_exposes_expert_code_not_only_legacy_card(db_session, session_sale_two_bank_fk_and_cash):
    """GET détail session : ``PaymentDetail`` doit exposer ``payment_method_code`` (transfer/card), pas seulement legacy."""
    cs = session_sale_two_bank_fk_and_cash
    sale = (
        db_session.query(Sale)
        .options(selectinload(Sale.payments).selectinload(PaymentTransaction.payment_method_ref))
        .filter(Sale.cash_session_id == cs.id)
        .first()
    )
    assert sale is not None
    sd = SaleDetail.model_validate(sale)
    assert sd.payments
    codes = {p.payment_method_code for p in sd.payments if p.payment_method_code}
    assert codes == {"cash", "transfer", "card"}
    for p in sd.payments:
        if p.payment_method_code in ("transfer", "card"):
            assert p.payment_method == "card"
