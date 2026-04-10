"""Mapping explicite site / caisse → paramètres Paheko pour le slice clôture (Story 8.3)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, JSON, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from recyclic_api.core.database import Base


class PahekoCashSessionCloseMapping(Base):
    """
    Vérité de configuration : (site_id, register_id) → ``destination_params`` fusionnés dans le POST Paheko.
    ``register_id`` NULL = ligne **défaut site** (une seule par site).
    """

    __tablename__ = "paheko_cash_session_close_mappings"
    __table_args__ = (
        Index(
            "uq_paheko_cs_close_map_site_register",
            "site_id",
            "register_id",
            unique=True,
            sqlite_where=text("register_id IS NOT NULL"),
            postgresql_where=text("register_id IS NOT NULL"),
        ),
        Index(
            "uq_paheko_cs_close_map_site_default",
            "site_id",
            unique=True,
            sqlite_where=text("register_id IS NULL"),
            postgresql_where=text("register_id IS NULL"),
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True)
    register_id = Column(
        UUID(as_uuid=True),
        ForeignKey("cash_registers.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    enabled = Column(Boolean, nullable=False, server_default="true")
    destination_params = Column(JSON, nullable=False)
    label = Column(String(255), nullable=True)

    site = relationship("Site", backref="paheko_cash_session_close_mappings")
    cash_register = relationship("CashRegister", backref="paheko_cash_session_close_mappings")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def touch_updated(self) -> None:
        self.updated_at = datetime.now(timezone.utc)
