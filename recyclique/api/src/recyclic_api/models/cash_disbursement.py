"""Story 24.7 — décaissement hors ticket : sous-type obligatoire (pas de catégorie poubelle)."""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from recyclic_api.core.database import Base


class CashDisbursementSubtype(str, enum.Enum):
    """Sous-types fermés PRD §10.5 (MVP)."""

    VOLUNTEER_EXPENSE_REIMBURSEMENT = "volunteer_expense_reimbursement"
    SMALL_OPERATING_EXPENSE = "small_operating_expense"
    VALIDATED_EXCEPTIONAL_OUTFLOW = "validated_exceptional_outflow"
    OTHER_ADMIN_CODED = "other_admin_coded"


class CashDisbursementMotifCode(str, enum.Enum):
    """Motifs codifiés (distinct du sous-type — PRD champs minimaux)."""

    OFFICE_SUPPLIES = "office_supplies"
    POSTAGE = "postage"
    VOLUNTEER_TRAVEL = "volunteer_travel"
    SHORT_EXTERNAL_FEE = "short_external_fee"
    BOARD_APPROVED_OTHER = "board_approved_other"


# Clés d'administration pour « autre codifié » — enum fermée, pas de texte libre seul.
ADMIN_CODED_REASON_KEYS = frozenset(
    {
        "bank_fees",
        "membership_reimbursement",
        "venue_deposit",
    }
)


class CashDisbursement(Base):
    __tablename__ = "cash_disbursements"
    __table_args__ = (
        UniqueConstraint(
            "cash_session_id",
            "idempotency_key",
            name="uq_cash_disbursements_session_idempotency",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cash_session_id = Column(UUID(as_uuid=True), ForeignKey("cash_sessions.id"), nullable=False, index=True)
    sale_id = Column(UUID(as_uuid=True), ForeignKey("sales.id"), nullable=False)
    amount = Column(Float, nullable=False)
    subtype = Column(String(64), nullable=False)
    motif_code = Column(String(64), nullable=False)
    counterparty_label = Column(Text, nullable=False)
    payment_method = Column(String(32), nullable=False)
    free_comment = Column(Text, nullable=True)
    justification_reference = Column(String(256), nullable=False)
    actual_settlement_at = Column(DateTime(timezone=True), nullable=False)
    admin_coded_reason_key = Column(String(64), nullable=True)
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
