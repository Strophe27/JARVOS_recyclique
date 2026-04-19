"""Story 24.5 — remboursement exceptionnel sans ticket (document métier distinct)."""

from __future__ import annotations

import uuid

from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from recyclic_api.core.database import Base


class ExceptionalRefund(Base):
    """Remboursement exceptionnel sans ticket source (journal canonique via PaymentTransaction)."""

    __tablename__ = "exceptional_refunds"
    __table_args__ = (
        UniqueConstraint(
            "cash_session_id",
            "idempotency_key",
            name="uq_exceptional_refunds_session_idempotency",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cash_session_id = Column(UUID(as_uuid=True), ForeignKey("cash_sessions.id"), nullable=False)
    sale_id = Column(UUID(as_uuid=True), ForeignKey("sales.id"), nullable=False)
    amount = Column(Float, nullable=False)
    refund_payment_method = Column(String(32), nullable=False)
    reason_code = Column(String(64), nullable=False)
    justification = Column(Text, nullable=False)
    detail = Column(Text, nullable=True)
    initiator_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approver_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approved_at = Column(DateTime(timezone=True), nullable=False)
    idempotency_key = Column(String(128), nullable=False)
    request_id = Column(String(128), nullable=True)
    # Story 24.10 P3 — preuve structurée D8 + horodatage step-up validateur (distinct initiateur dans l’audit)
    approval_evidence_ref = Column(Text, nullable=True)
    approver_step_up_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    cash_session = relationship("CashSession", foreign_keys=[cash_session_id])
    sale = relationship("Sale", foreign_keys=[sale_id])
    initiator = relationship("User", foreign_keys=[initiator_user_id])
    approver = relationship("User", foreign_keys=[approver_user_id])

    def __repr__(self) -> str:
        return (
            f"<ExceptionalRefund(id={self.id}, cash_session_id={self.cash_session_id}, "
            f"amount={self.amount})>"
        )
