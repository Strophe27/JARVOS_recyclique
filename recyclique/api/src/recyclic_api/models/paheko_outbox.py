"""Outbox durable vers Paheko (Epic 8, Story 8.1) — slice clôture session caisse."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from recyclic_api.core.database import Base


class PahekoOutboxOperationType(str, enum.Enum):
    """Types d'opération outbox (extensible 8.2+)."""

    CASH_SESSION_CLOSE = "cash_session_close"


class PahekoOutboxStatus(str, enum.Enum):
    """Cycle de vie technique outbox (distinct du SyncStateCore exposé API)."""

    pending = "pending"
    processing = "processing"
    delivered = "delivered"
    failed = "failed"


class PahekoOutboxItem(Base):
    """
    Ligne outbox PostgreSQL (AR11) : écrite dans la même transaction que la clôture locale
    pour le slice « cash_session_close ».
    """

    __tablename__ = "paheko_outbox_items"
    __table_args__ = (UniqueConstraint("idempotency_key", name="uq_paheko_outbox_idempotency_key"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    operation_type = Column(String(64), nullable=False, index=True)
    idempotency_key = Column(String(256), nullable=False)

    cash_session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("cash_sessions.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    cash_session = relationship("CashSession", backref="paheko_outbox_items")

    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.id", ondelete="SET NULL"), nullable=True, index=True)

    payload = Column(JSON, nullable=False, default=lambda: {})

    outbox_status = Column(String(32), nullable=False, default=PahekoOutboxStatus.pending.value, index=True)

    # Noyau FR24 — aligné contrat OpenAPI / Story 1.5
    sync_state_core = Column(String(32), nullable=False, default="a_reessayer", index=True)

    correlation_id = Column(String(128), nullable=False, index=True)

    attempt_count = Column(Integer, nullable=False, default=0)
    last_attempt_at = Column(DateTime(timezone=True), nullable=True)
    last_http_status = Column(Integer, nullable=True)
    last_error = Column(Text, nullable=True)
    last_response_snippet = Column(Text, nullable=True)

    next_retry_at = Column(DateTime(timezone=True), nullable=True, index=True)
    rejection_reason = Column(Text, nullable=True)
    # Story 8.3 — échec **avant** HTTP (pas confondre avec erreur Paheko distante).
    mapping_resolution_error = Column(String(64), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def touch_attempt(self) -> None:
        self.last_attempt_at = datetime.now(timezone.utc)
        self.attempt_count = (self.attempt_count or 0) + 1
