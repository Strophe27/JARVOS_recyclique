"""Journal append-only des transitions sync outbox Paheko (Story 8.4, contrat §6)."""

from __future__ import annotations

import uuid
from sqlalchemy import Column, DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from recyclic_api.core.database import Base


class PahekoOutboxSyncTransition(Base):
    """
    Une ligne = une transition significative (système ou action manuelle habilitée).
    Pas de UPDATE/DELETE métier — append-only.
    """

    __tablename__ = "paheko_outbox_sync_transitions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    outbox_item_id = Column(
        UUID(as_uuid=True),
        ForeignKey("paheko_outbox_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    outbox_item = relationship("PahekoOutboxItem", backref="sync_transitions")

    transition_name = Column(String(128), nullable=False, index=True)

    from_sync_state = Column(String(32), nullable=False)
    to_sync_state = Column(String(32), nullable=False)
    from_outbox_status = Column(String(32), nullable=False)
    to_outbox_status = Column(String(32), nullable=False)

    actor_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    occurred_at = Column(DateTime(timezone=True), nullable=False)
    reason = Column(Text, nullable=False)
    correlation_id = Column(String(128), nullable=False, index=True)
    context_json = Column(JSON, nullable=False, default=lambda: {})
