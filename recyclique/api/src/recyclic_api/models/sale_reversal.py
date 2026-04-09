"""Story 6.4 — remboursement / reversal lié à une vente ``completed`` (document séparé, vente source intacte)."""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from recyclic_api.core.database import Base


class RefundReasonCode(str, enum.Enum):
    """Codes motif remboursement (énumération API fermée, Story 6.4)."""

    ERREUR_SAISIE = "ERREUR_SAISIE"
    RETOUR_ARTICLE = "RETOUR_ARTICLE"
    ANNULATION_CLIENT = "ANNULATION_CLIENT"
    AUTRE = "AUTRE"


class SaleReversal(Base):
    """
    Avoir / reversal total lié à une vente source ``completed``.

    Hypothèses résiduelles (VS 6.4) : montant algébrique négatif = sortie de caisse ;
    un seul enregistrement actif par ``source_sale_id`` (contrainte unique).
    """

    __tablename__ = "sale_reversals"
    __table_args__ = (
        UniqueConstraint("source_sale_id", name="uq_sale_reversals_source_sale_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_sale_id = Column(UUID(as_uuid=True), ForeignKey("sales.id"), nullable=False)
    cash_session_id = Column(UUID(as_uuid=True), ForeignKey("cash_sessions.id"), nullable=False)
    operator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    # Somme algébrique négative (ex. -12.50 pour un remboursement de 12,50 €).
    amount_signed = Column(Float, nullable=False)
    reason_code = Column(String(64), nullable=False)
    detail = Column(Text, nullable=True)
    idempotency_key = Column(String(128), nullable=True, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    source_sale = relationship("Sale", foreign_keys=[source_sale_id])
    cash_session = relationship("CashSession", foreign_keys=[cash_session_id])
    operator = relationship("User", foreign_keys=[operator_id])

    def __repr__(self) -> str:
        return f"<SaleReversal(id={self.id}, source_sale_id={self.source_sale_id}, amount_signed={self.amount_signed})>"
