"""Story 24.6 — conteneur métier échange matière ; partie monétaire via vente / reversal liés."""

from __future__ import annotations

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from recyclic_api.core.database import Base


class MaterialExchange(Base):
    """
    Enregistrement explicite d'un échange : trace matière (JSON) et delta financier.
    Si delta != 0, un ``Sale`` (complément) ou un ``SaleReversal`` (remboursement total source) est lié.
    """

    __tablename__ = "material_exchanges"
    __table_args__ = (
        UniqueConstraint("cash_session_id", "idempotency_key", name="uq_material_exchanges_session_idempotency"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cash_session_id = Column(UUID(as_uuid=True), ForeignKey("cash_sessions.id"), nullable=False, index=True)
    operator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    # Positif = client paie un complément ; négatif = remboursement au client (croisement avec reversal).
    delta_amount_cents = Column(Integer, nullable=False)
    material_trace = Column(JSON, nullable=False)
    complement_sale_id = Column(UUID(as_uuid=True), ForeignKey("sales.id"), nullable=True)
    sale_reversal_id = Column(UUID(as_uuid=True), ForeignKey("sale_reversals.id"), nullable=True)
    idempotency_key = Column(String(128), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    cash_session = relationship("CashSession", foreign_keys=[cash_session_id])
    operator = relationship("User", foreign_keys=[operator_id])
    complement_sale = relationship("Sale", foreign_keys=[complement_sale_id])
    sale_reversal = relationship("SaleReversal", foreign_keys=[sale_reversal_id])
