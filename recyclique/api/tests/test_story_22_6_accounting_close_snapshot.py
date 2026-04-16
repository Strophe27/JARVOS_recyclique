"""Story 22.6 — snapshot comptable figé + payload outbox ``accounting_close_snapshot_frozen``."""

from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from sqlalchemy import select
from sqlalchemy.orm import noload

from recyclic_api.core.exceptions import ConflictError
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.paheko_outbox import PahekoOutboxItem
from recyclic_api.models.payment_transaction import (
    PaymentTransaction,
    PaymentTransactionDirection,
    PaymentTransactionNature,
)
from recyclic_api.models.sale import PaymentMethod, Sale, SaleLifecycleStatus
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.services.cash_session_service import CashSessionService
from tests.paheko_8x_test_utils import seed_default_paheko_close_mapping


@pytest.fixture
def snapshot_close_fixtures(db_session):
    site = Site(
        name="S226 snap",
        address="1 rue T",
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
        username=f"u226_{uid.hex[:10]}@t.com",
        hashed_password="pw",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
        site_id=site.id,
    )
    db_session.add(user)
    cs = CashSession(
        operator_id=user.id,
        site_id=site.id,
        initial_amount=10.0,
        current_amount=35.0,
        status=CashSessionStatus.OPEN,
        total_sales=25.0,
        total_items=1,
    )
    db_session.add(cs)
    db_session.flush()
    sale = Sale(
        cash_session_id=cs.id,
        operator_id=user.id,
        total_amount=25.0,
        donation=0.0,
        payment_method=PaymentMethod.CASH,
        lifecycle_status=SaleLifecycleStatus.COMPLETED,
    )
    db_session.add(sale)
    db_session.flush()
    db_session.add(
        PaymentTransaction(
            sale_id=sale.id,
            payment_method=PaymentMethod.CASH,
            nature=PaymentTransactionNature.SALE_PAYMENT,
            direction=PaymentTransactionDirection.INFLOW,
            amount=25.0,
        )
    )
    db_session.commit()
    cs = db_session.execute(
        select(CashSession).where(CashSession.id == cs.id).options(noload(CashSession.register))
    ).scalar_one()
    return site, user, cs


def test_close_persists_snapshot_and_outbox_frozen_payload(db_session, snapshot_close_fixtures):
    site, _user, cs = snapshot_close_fixtures
    seed_default_paheko_close_mapping(db_session, site.id)

    corr = "corr-22-6-snapshot"
    svc = CashSessionService(db_session)
    closed = svc.close_session_with_amounts(str(cs.id), 35.0, None, sync_correlation_id=corr)

    assert closed is not None
    db_session.refresh(closed)
    assert closed.accounting_close_snapshot is not None
    snap = closed.accounting_close_snapshot
    assert snap["schema_version"] == 1
    assert snap["correction_policy"] == "append_only_v1"
    assert snap["sync_correlation_id"] == corr
    assert snap["totals"]["payment_transaction_line_count"] == 1
    assert snap["totals"]["cash_signed_net_from_journal"] == 25.0
    assert snap["closing"]["theoretical_cash_amount"] == 35.0
    assert snap["closing"]["actual_cash_amount"] == 35.0

    row = (
        db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one_or_none()
    )
    assert row is not None
    assert "accounting_close_snapshot_frozen" in row.payload
    assert row.payload["accounting_close_snapshot_frozen"]["schema_version"] == 1


def test_prefilled_snapshot_on_open_session_raises_conflict(db_session, snapshot_close_fixtures):
    """Immuabilité 22.6 : une session encore ouverte ne doit pas être re-clôturée si un snapshot existe déjà."""
    site, _user, cs = snapshot_close_fixtures
    seed_default_paheko_close_mapping(db_session, site.id)
    cs.accounting_close_snapshot = {"schema_version": 1, "seed": "conflict-test"}
    db_session.commit()
    svc = CashSessionService(db_session)
    with pytest.raises(ConflictError, match="Snapshot comptable de clôture déjà présent"):
        svc.close_session_with_amounts(str(cs.id), 35.0, None, sync_correlation_id="corr-immut")


@patch(
    "recyclic_api.services.paheko_outbox_service.enqueue_cash_session_close_outbox",
    side_effect=RuntimeError("simulated outbox failure"),
)
def test_close_does_not_commit_when_outbox_enqueue_raises(_mock_enqueue, db_session, snapshot_close_fixtures):
    """Atomicité 22.6 / 8.1 : ``commit`` métier est après l'enqueue — pas de ``commit`` si l'enqueue échoue."""
    site, _user, cs = snapshot_close_fixtures
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    with patch.object(db_session, "commit") as mock_commit:
        with pytest.raises(RuntimeError, match="simulated outbox failure"):
            svc.close_session_with_amounts(str(cs.id), 35.0, None, sync_correlation_id="corr-atomic")
    mock_commit.assert_not_called()


@pytest.fixture
def snapshot_close_fixtures_multi_pt(db_session):
    """Session + vente avec deux lignes ``payment_transactions`` (caisse + carte)."""
    site = Site(
        name="S226 multi",
        address="2 rue T",
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
        username=f"u226m_{uid.hex[:10]}@t.com",
        hashed_password="pw",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
        site_id=site.id,
    )
    db_session.add(user)
    cs = CashSession(
        operator_id=user.id,
        site_id=site.id,
        initial_amount=10.0,
        current_amount=35.0,
        status=CashSessionStatus.OPEN,
        total_sales=35.0,
        total_items=1,
    )
    db_session.add(cs)
    db_session.flush()
    sale = Sale(
        cash_session_id=cs.id,
        operator_id=user.id,
        total_amount=35.0,
        donation=0.0,
        payment_method=PaymentMethod.CASH,
        lifecycle_status=SaleLifecycleStatus.COMPLETED,
    )
    db_session.add(sale)
    db_session.flush()
    db_session.add(
        PaymentTransaction(
            sale_id=sale.id,
            payment_method=PaymentMethod.CASH,
            nature=PaymentTransactionNature.SALE_PAYMENT,
            direction=PaymentTransactionDirection.INFLOW,
            amount=25.0,
        )
    )
    db_session.add(
        PaymentTransaction(
            sale_id=sale.id,
            payment_method=PaymentMethod.CARD,
            nature=PaymentTransactionNature.SALE_PAYMENT,
            direction=PaymentTransactionDirection.INFLOW,
            amount=10.0,
        )
    )
    db_session.commit()
    cs = db_session.execute(
        select(CashSession).where(CashSession.id == cs.id).options(noload(CashSession.register))
    ).scalar_one()
    return site, user, cs


def test_snapshot_reflects_multiple_journal_lines(db_session, snapshot_close_fixtures_multi_pt):
    """Le snapshot agrège bien tout le journal ``payment_transactions`` de la session."""
    site, _user, cs = snapshot_close_fixtures_multi_pt
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    # Théorique caisse = 10 + 25 (cash journal) = 35 — aligné avec le détail espèces physiques.
    closed = svc.close_session_with_amounts(str(cs.id), 35.0, None, sync_correlation_id="corr-multi")
    assert closed is not None
    db_session.refresh(closed)
    snap = closed.accounting_close_snapshot
    assert snap["totals"]["payment_transaction_line_count"] == 2
    assert snap["totals"]["cash_signed_net_from_journal"] == 25.0
    assert snap["totals"]["by_payment_method_signed"]["cash"] == 25.0
    assert snap["totals"]["by_payment_method_signed"]["card"] == 10.0
    assert snap["closing"]["theoretical_cash_amount"] == 35.0
    assert snap["closing"]["actual_cash_amount"] == 35.0
