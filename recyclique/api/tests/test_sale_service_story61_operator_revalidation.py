"""
Story 6.1 — revalidation opérateur sur create_sale (sans schéma DB complet).
"""

import uuid
from unittest.mock import MagicMock

import pytest

from recyclic_api.core.exceptions import AuthorizationError
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.sale import PaymentMethod
from recyclic_api.models.user import User, UserRole
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

    def _query_side_effect(model):
        chain = MagicMock()
        chain.filter.return_value = chain
        if model is CashSession:
            chain.first.return_value = cash_session
        elif model is User:
            intruder_row = MagicMock()
            intruder_row.role = UserRole.USER
            chain.first.return_value = intruder_row
        else:
            chain.first.return_value = None
        return chain

    db.query.side_effect = _query_side_effect

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
