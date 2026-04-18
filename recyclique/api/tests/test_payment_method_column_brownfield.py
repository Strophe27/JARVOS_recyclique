"""Régression Epic 22 / s22_7 : ``payment_method`` legacy en base sans ``LookupError`` à l'hydratation ORM."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import text

from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.payment_transaction import (
    PaymentTransaction,
    PaymentTransactionDirection,
    PaymentTransactionNature,
)
from recyclic_api.models.sale import PaymentMethod, PaymentMethodColumn, Sale, SaleLifecycleStatus
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus


@pytest.fixture
def pm_fixtures(db_session):
    site_id = uuid.uuid4()
    op_id = uuid.uuid4()
    sess_id = uuid.uuid4()
    sale_id = uuid.uuid4()
    site = Site(
        id=site_id,
        name="PM",
        address="a",
        city="c",
        postal_code="75000",
        country="FR",
        is_active=True,
    )
    user = User(
        id=op_id,
        username=f"u_pm_{site_id.hex[:8]}@t.com",
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
        initial_amount=0.0,
        current_amount=10.0,
        status=CashSessionStatus.OPEN,
        opened_at=datetime.now(timezone.utc),
    )
    sale = Sale(
        id=sale_id,
        cash_session_id=sess_id,
        operator_id=op_id,
        total_amount=10.0,
        donation=0.0,
        payment_method=PaymentMethod.CASH,
        lifecycle_status=SaleLifecycleStatus.COMPLETED,
    )
    db_session.add_all([site, user, session, sale])
    db_session.flush()
    pt_id = uuid.uuid4()
    db_session.add(
        PaymentTransaction(
            id=pt_id,
            sale_id=sale_id,
            payment_method=PaymentMethod.CASH,
            nature=PaymentTransactionNature.SALE_PAYMENT,
            direction=PaymentTransactionDirection.INFLOW,
            amount=10.0,
        )
    )
    db_session.commit()
    return sale_id, pt_id


def test_sale_loads_after_uppercase_payment_method_raw_sql(db_session, pm_fixtures):
    sale_id, _ = pm_fixtures
    db_session.execute(
        text("UPDATE sales SET payment_method = 'CASH' WHERE id = :id"),
        {"id": str(sale_id)},
    )
    db_session.commit()
    db_session.expire_all()
    row = db_session.get(Sale, sale_id)
    assert row is not None
    assert row.payment_method == PaymentMethod.CASH


def test_payment_method_column_result_uppercase_names():
    col = PaymentMethodColumn(allow_none_result=False)
    assert col.process_result_value("CARD", None) == PaymentMethod.CARD
    assert col.process_result_value("cash", None) == PaymentMethod.CASH
    assert col.process_result_value("FREE", None) == PaymentMethod.FREE


def test_payment_method_column_result_none_respects_allow_flag():
    col_null = PaymentMethodColumn(allow_none_result=True)
    assert col_null.process_result_value(None, None) is None
    col_not = PaymentMethodColumn(allow_none_result=False)
    assert col_not.process_result_value(None, None) == PaymentMethod.CASH
