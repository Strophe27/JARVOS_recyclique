"""Persistance configuration module par site (T-MOD-3)."""

from __future__ import annotations

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.sql import func

from recyclic_api.core.database import Base


class SiteModuleConfig(Base):
    __tablename__ = "site_module_configs"
    __table_args__ = (
        UniqueConstraint("site_id", "module_key", name="uq_site_module_configs_site_id_module_key"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False)
    module_key = Column(String(128), nullable=False)
    schema_version = Column(String(32), nullable=False)
    payload = Column(JSON, nullable=False)
    version = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<SiteModuleConfig(site_id={self.site_id}, module_key={self.module_key!r}, "
            f"version={self.version})>"
        )
