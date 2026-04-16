"""Story 22.5 — instantané local d’autorité sur l’exercice ouvert vs clos (non devinable)."""

from __future__ import annotations

import uuid

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from recyclic_api.core.database import Base

# Ligne singleton : une seule ligne métier pour l’état courant (rafraîchi par job / admin).
_ACCOUNTING_PERIOD_AUTHORITY_ROW_ID = uuid.UUID("00000000-0000-5000-8000-000000000001")


class AccountingPeriodAuthoritySnapshot(Base):
    """
    Source locale versionnée pour trancher « exercice courant » vs « exercice antérieur clos »
    (cf. cash-accounting-paheko-canonical-chain.md §7). Pas d’heuristique UI : lecture structurée uniquement.
    """

    __tablename__ = "accounting_period_authority_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: _ACCOUNTING_PERIOD_AUTHORITY_ROW_ID)
    current_open_fiscal_year = Column(Integer, nullable=False)
    fetched_at = Column(DateTime(timezone=True), nullable=False)
    source = Column(String(32), nullable=False)
    version = Column(Integer, nullable=False, server_default="1")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
