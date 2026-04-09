"""
Story 6.1 — revalidation opérateur sur create_sale (sans schéma DB complet).
"""

import uuid
from unittest.mock import MagicMock

import pytest

from recyclic_api.core.exceptions import AuthorizationError
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.sale import PaymentMethod
from recyclic_api.schemas.sale import SaleCreate, SaleItemCreate
from recyclic_api.services.sale_service import SaleService


def test_create_sale_raises_when_jwt_operator_not_session_operator():
    operator_uuid = uuid.uuid4()
    intruder_uuid = uuid.uuid4()
    session_uuid = uuid.uuid4()

    cash_session = MagicMock(spec=CashSession)
    cash_session.id = session_uuid
    cash_session.operator_id = operator_uuid
    cash_session.status = CashSessionStatus.OPEN

    db = MagicMock()
    chain = MagicMock()
    db.query.return_value = chain
    chain.filter.return_value = chain
    chain.first.return_value = cash_session

    sale_data = SaleCreate(
        cash_session_id=session_uuid,
        items=[
            SaleItemCreate(
                category="EEE-1",
                quantity=1,
                weight=1.0,
                unit_price=5.0,
                total_price=5.0,
            )
        ],
        total_amount=5.0,
        donation=0.0,
        payment_method=PaymentMethod.CASH,
    )

    with pytest.raises(AuthorizationError, match="opérateur"):
        SaleService(db).create_sale(sale_data, str(intruder_uuid))
