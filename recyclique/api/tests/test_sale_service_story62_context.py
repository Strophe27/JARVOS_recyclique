"""
Story 6.2 — refus create_sale si site / permission caisse incohérents (mocks DB, sans schéma complet).
"""

import uuid
from unittest.mock import MagicMock, patch

import pytest

from recyclic_api.core.exceptions import AuthorizationError
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.sale import PaymentMethod
from recyclic_api.models.user import User, UserRole
from recyclic_api.schemas.sale import SaleCreate, SaleItemCreate
from recyclic_api.services.sale_service import SaleService


def _sale_create(session_id) -> SaleCreate:
    return SaleCreate(
        cash_session_id=session_id,
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


def _db_chain_for_cash_session_and_user(cash_session, operator_user):
    """Deux appels query : CashSession puis User."""

    def query_side(model):
        m = MagicMock()
        chain = MagicMock()
        m.filter.return_value = chain
        if model is CashSession:
            chain.first.return_value = cash_session
        else:
            chain.first.return_value = operator_user
        return m

    db = MagicMock()
    db.query.side_effect = query_side
    return db


def test_create_sale_rejects_site_mismatch_with_mock_db():
    op_uuid = uuid.uuid4()
    session_uuid = uuid.uuid4()
    site_session = uuid.uuid4()
    site_user = uuid.uuid4()

    cash_session = MagicMock(spec=CashSession)
    cash_session.id = session_uuid
    cash_session.operator_id = op_uuid
    cash_session.site_id = site_session
    cash_session.status = CashSessionStatus.OPEN
    cash_session.register_id = uuid.uuid4()

    operator_user = MagicMock(spec=User)
    operator_user.id = op_uuid
    operator_user.role = UserRole.USER
    operator_user.site_id = site_user

    db = _db_chain_for_cash_session_and_user(cash_session, operator_user)

    with patch("recyclic_api.services.sale_service.user_has_permission", return_value=True):
        with pytest.raises(AuthorizationError, match="site"):
            SaleService(db).create_sale(_sale_create(session_uuid), str(op_uuid))


def test_create_sale_rejects_without_caisse_permission_mock():
    op_uuid = uuid.uuid4()
    session_uuid = uuid.uuid4()
    site_id = uuid.uuid4()

    cash_session = MagicMock(spec=CashSession)
    cash_session.id = session_uuid
    cash_session.operator_id = op_uuid
    cash_session.site_id = site_id
    cash_session.status = CashSessionStatus.OPEN

    operator_user = MagicMock(spec=User)
    operator_user.id = op_uuid
    operator_user.role = UserRole.USER
    operator_user.site_id = site_id

    db = _db_chain_for_cash_session_and_user(cash_session, operator_user)

    with patch("recyclic_api.services.sale_service.user_has_permission", return_value=False):
        with pytest.raises(AuthorizationError, match="au moins une des permissions"):
            SaleService(db).create_sale(_sale_create(session_uuid), str(op_uuid))


@pytest.mark.parametrize(
    "permission_results",
    [
        [False, True, False],
        [False, False, True],
    ],
)
def test_load_cash_session_operator_user_accepts_virtual_or_deferred_permission_mock(permission_results):
    op_uuid = uuid.uuid4()
    session_uuid = uuid.uuid4()
    site_id = uuid.uuid4()

    cash_session = MagicMock(spec=CashSession)
    cash_session.id = session_uuid
    cash_session.operator_id = op_uuid
    cash_session.site_id = site_id
    cash_session.status = CashSessionStatus.OPEN

    operator_user = MagicMock(spec=User)
    operator_user.id = op_uuid
    operator_user.role = UserRole.USER
    operator_user.site_id = site_id

    db = _db_chain_for_cash_session_and_user(cash_session, operator_user)

    with patch("recyclic_api.services.sale_service.user_has_permission", side_effect=permission_results):
        resolved_session, resolved_user, resolved_uuid = SaleService(db)._load_cash_session_operator_user(
            session_uuid,
            str(op_uuid),
        )
    assert resolved_session is cash_session
    assert resolved_user is operator_user
    assert resolved_uuid == op_uuid
