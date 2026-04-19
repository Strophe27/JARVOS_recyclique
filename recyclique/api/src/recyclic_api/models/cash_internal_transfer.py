"""Story 24.8 — mouvement interne de caisse (permission cash.transfer, distinct décaissement / remboursement)."""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from recyclic_api.core.database import Base


class CashInternalTransferType(str, enum.Enum):
    """Types fermés MVP PRD §10.6 (mouvement interne — pas charge structurelle)."""

    CASH_FLOAT_TOPUP = "cash_float_topup"
    CASH_FLOAT_SEED = "cash_float_seed"
    BANK_DEPOSIT = "bank_deposit"
    BANK_WITHDRAWAL = "bank_withdrawal"
    INTER_REGISTER_TRANSFER = "inter_register_transfer"
    VARIANCE_REGULARIZATION = "variance_regularization"


class CashSessionInternalFlow(str, enum.Enum):
    """Sens par rapport à la caisse en session (aligné PaymentTransactionDirection)."""

    INFLOW = "inflow"
    OUTFLOW = "outflow"


class CashInternalTransfer(Base):
    __tablename__ = "cash_internal_transfers"
    __table_args__ = (
        UniqueConstraint(
            "cash_session_id",
            "idempotency_key",
            name="uq_cash_internal_transfers_session_idempotency",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cash_session_id = Column(UUID(as_uuid=True), ForeignKey("cash_sessions.id"), nullable=False, index=True)
    sale_id = Column(UUID(as_uuid=True), ForeignKey("sales.id"), nullable=False)
    amount = Column(Float, nullable=False)
    transfer_type = Column(String(64), nullable=False)
    session_flow = Column(String(16), nullable=False)
    origin_endpoint_label = Column(Text, nullable=False)
    destination_endpoint_label = Column(Text, nullable=False)
    motif = Column(Text, nullable=False)
    payment_method = Column(String(32), nullable=False)
    justification_reference = Column(String(256), nullable=False)
    initiator_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approver_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approved_at = Column(DateTime(timezone=True), nullable=False)
    idempotency_key = Column(String(128), nullable=False)
    request_id = Column(String(128), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    cash_session = relationship("CashSession", foreign_keys=[cash_session_id])
    sale = relationship("Sale", foreign_keys=[sale_id])
    initiator = relationship("User", foreign_keys=[initiator_user_id])
    approver = relationship("User", foreign_keys=[approver_user_id])
