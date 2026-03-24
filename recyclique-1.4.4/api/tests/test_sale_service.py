"""
Tests ciblés pour SaleService.create_sale (ARCH-04).
"""

import uuid
from datetime import datetime

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from recyclic_api.models.cash_register import CashRegister
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.sale import PaymentMethod
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.schemas.sale import PaymentCreate, SaleCreate, SaleItemCreate
from recyclic_api.services.sale_service import SaleService


def _seed_session(db_session: Session) -> tuple[User, CashSession]:
    uid = uuid.uuid4()
    site_id = uuid.uuid4()
    reg_id = uuid.uuid4()
    sess_id = uuid.uuid4()

    user = User(
        id=uid,
        username="svc_sale_test",
        hashed_password="x",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
    )
    site = Site(
        id=site_id,
        name="S",
        address="a",
        city="c",
        postal_code="1",
        country="FR",
    )
    reg = CashRegister(id=reg_id, name="R", location="L", site_id=site_id, is_active=True)
    session = CashSession(
        id=sess_id,
        operator_id=uid,
        site_id=site_id,
        register_id=reg_id,
        initial_amount=0.0,
        current_amount=0.0,
        status=CashSessionStatus.OPEN,
        opened_at=datetime.utcnow(),
    )
    db_session.add_all([user, site, reg, session])
    db_session.commit()
    return user, session


def test_sale_service_insufficient_payments_400(db_session: Session):
    user, session = _seed_session(db_session)
    sale_data = SaleCreate(
        cash_session_id=session.id,
        items=[
            SaleItemCreate(
                category="EEE-1",
                quantity=1,
                weight=1.0,
                unit_price=50.0,
                total_price=50.0,
            )
        ],
        total_amount=50.0,
        donation=0.0,
        payments=[
            PaymentCreate(payment_method=PaymentMethod.CASH, amount=25.0),
            PaymentCreate(payment_method=PaymentMethod.CHECK, amount=15.0),
        ],
    )
    with pytest.raises(HTTPException) as exc_info:
        SaleService(db_session).create_sale(sale_data, str(user.id))
    assert exc_info.value.status_code == 400
    assert "paiements" in exc_info.value.detail.lower()


def test_sale_service_creates_sale_and_payments(db_session: Session):
    user, session = _seed_session(db_session)
    sale_data = SaleCreate(
        cash_session_id=session.id,
        items=[
            SaleItemCreate(
                category="EEE-1",
                quantity=1,
                weight=1.0,
                unit_price=30.0,
                total_price=30.0,
            )
        ],
        total_amount=30.0,
        donation=0.0,
        payments=[
            PaymentCreate(payment_method=PaymentMethod.CASH, amount=15.0),
            PaymentCreate(payment_method=PaymentMethod.CHECK, amount=15.0),
        ],
    )
    sale = SaleService(db_session).create_sale(sale_data, str(user.id))
    assert sale.total_amount == 30.0
    assert len(sale.items) == 1
    assert len(sale.payments) == 2
    db_session.refresh(session)
    assert session.total_sales >= 30.0
