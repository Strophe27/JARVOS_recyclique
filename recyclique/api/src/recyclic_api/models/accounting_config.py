"""Story 22.3 — paramétrage comptable expert : révision publiée et comptes globaux."""

from __future__ import annotations

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from recyclic_api.core.database import Base

# Singleton logique (une ligne) — identifiant stable pour les tests et migrations.
GLOBAL_ACCOUNTING_SETTINGS_ROW_ID = uuid.UUID("00000000-0000-4000-8000-000000000001")


class GlobalAccountingSettings(Base):
    """Comptes globaux Paheko (hors référentiel des moyens de paiement)."""

    __tablename__ = "global_accounting_settings"

    # String PK : SQLite peut mal typer les UUID dialect (tests Story 22.3).
    id = Column(String(36), primary_key=True, default=lambda: str(GLOBAL_ACCOUNTING_SETTINGS_ROW_ID))
    default_sales_account = Column(String(32), nullable=False)
    default_donation_account = Column(String(32), nullable=False)
    prior_year_refund_account = Column(String(32), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class AccountingConfigRevision(Base):
    """Révision comptable publiée — snapshot immuable pour clôture (22.6) et session figée à l'ouverture."""

    __tablename__ = "accounting_config_revisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    revision_seq = Column(Integer, nullable=False, unique=True, index=True)
    published_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actor_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    actor = relationship("User", foreign_keys=[actor_user_id])
    # Texte JSON (SQLite + PG) — évite les bind JSON dialectes hétérogènes en tests.
    snapshot_json = Column("snapshot", Text, nullable=False)
    note = Column(Text, nullable=True)
