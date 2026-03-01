# Story 17.8 — Modèle EmailLog pour logs email admin.

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID

from api.models.base import Base


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sent_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    recipient = Column(String(255), nullable=False)
    subject = Column(String(512), nullable=False)
    status = Column(String(32), nullable=False)
    event_type = Column(String(64), nullable=True)
    error_message = Column(Text, nullable=True)

    __table_args__ = (
        Index("idx_email_logs_sent_at", "sent_at"),
        Index("idx_email_logs_recipient", "recipient"),
        Index("idx_email_logs_status", "status"),
    )
