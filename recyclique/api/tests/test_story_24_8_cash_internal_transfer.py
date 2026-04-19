"""Story 24.8 — mouvement interne caisse (cash.transfer, nature cash_internal_transfer, distinct décaissement)."""

from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from recyclic_api.core.security import hash_password
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.payment_transaction import PaymentTransaction, PaymentTransactionNature
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.schemas.cash_internal_transfer import CashInternalTransferCreate
from recyclic_api.services.cash_internal_transfer_service import CashInternalTransferService
from fastapi.testclient import TestClient


def _seed_open_session(db_session: Session) -> tuple[Site, User, CashSession]:
    site = Site(
        name="Site 24.8",
        address="1 r",
        city="V",
        postal_code="75000",
        country="FR",
        is_active=True,
    )
    db_session.add(site)
    db_session.flush()
    uid = uuid.uuid4()
    op = User(
        id=uid,
        username=f"op_{uid.hex[:8]}@t.com",
        hashed_password=hash_password("pw"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
        is_active=True,
        site_id=site.id,
    )
    db_session.add(op)
    db_session.flush()
    cs = CashSession(
        operator_id=op.id,
        site_id=site.id,
        initial_amount=100.0,
        current_amount=100.0,
        status=CashSessionStatus.OPEN,
    )
    db_session.add(cs)
    db_session.commit()
    db_session.refresh(cs)
    return site, op, cs


@patch("recyclic_api.services.cash_internal_transfer_service.log_audit", lambda **kwargs: None)
def test_internal_transfer_happy_path_bank_withdrawal(admin_client: TestClient, db_session: Session):
    _site, _op, cs = _seed_open_session(db_session)
    payload = {
        "transfer_type": "bank_withdrawal",
        "session_flow": "inflow",
        "origin_endpoint_label": "Compte courant",
        "destination_endpoint_label": "Caisse séance",
        "motif": "Retrait pour appoint",
        "amount": 15.5,
        "payment_method": "cash",
        "justification_reference": "REF-BW-1",
    }
    res = admin_client.post(
        f"/v1/cash-sessions/{cs.id}/internal-transfers",
        json=payload,
        headers={"Idempotency-Key": str(uuid.uuid4())},
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["transfer_type"] == "bank_withdrawal"
    assert data["session_flow"] == "inflow"
    assert "Mouvement interne" in data.get("paheko_accounting_sync_hint", "")
    db_session.expire_all()
    cs2 = db_session.get(CashSession, cs.id)
    assert cs2 is not None
    assert abs(float(cs2.current_amount) - 115.5) < 0.01
    tx = (
        db_session.execute(
            select(PaymentTransaction).where(PaymentTransaction.nature == PaymentTransactionNature.CASH_INTERNAL_TRANSFER)
        )
        .scalars()
        .first()
    )
    assert tx is not None
    assert tx.nature == PaymentTransactionNature.CASH_INTERNAL_TRANSFER


def test_internal_transfer_rejects_bad_type_flow_combo(db_session: Session):
    _seed_open_session(db_session)
    with pytest.raises(ValidationError):
        CashInternalTransferCreate(
            transfer_type="bank_deposit",
            session_flow="inflow",
            origin_endpoint_label="A",
            destination_endpoint_label="B",
            motif="x",
            amount=10.0,
            justification_reference="r",
        )


def test_internal_transfer_forbidden_without_permission(db_session: Session):
    _site, op, cs = _seed_open_session(db_session)
    service = CashInternalTransferService(db_session)
    payload = CashInternalTransferCreate(
        transfer_type="bank_withdrawal",
        session_flow="inflow",
        origin_endpoint_label="Banque",
        destination_endpoint_label="Caisse",
        motif="test",
        amount=5.0,
        justification_reference="R1",
    )
    with patch("recyclic_api.services.cash_internal_transfer_service.user_has_permission", return_value=False):
        from recyclic_api.core.exceptions import AuthorizationError

        with pytest.raises(AuthorizationError):
            service.create_internal_transfer(
                cash_session_id=str(cs.id),
                payload=payload,
                operator=op,
                idempotency_key="ik-1",
            )


def test_internal_transfer_not_disbursement_nature():
    assert PaymentTransactionNature.CASH_INTERNAL_TRANSFER.value != PaymentTransactionNature.DISBURSEMENT.value
    assert PaymentTransactionNature.CASH_INTERNAL_TRANSFER.value != PaymentTransactionNature.REFUND_PAYMENT.value
