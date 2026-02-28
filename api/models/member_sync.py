import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from api.models.base import Base


class PahekoMemberLink(Base):
    __tablename__ = "paheko_member_links"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    paheko_member_id = Column(String(128), nullable=False, unique=True)
    sub = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=False)
    role = Column(String(64), nullable=False)
    tenant = Column(String(128), nullable=False)
    membership_status = Column(String(64), nullable=False)
    source_updated_at = Column(DateTime(timezone=True), nullable=True)
    local_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    local_user = relationship("User", backref="paheko_member_links")

    __table_args__ = (
        Index("idx_paheko_member_links_paheko_member_id", "paheko_member_id", unique=True),
        Index("idx_paheko_member_links_sub", "sub"),
        Index("idx_paheko_member_links_email", "email"),
        Index("idx_paheko_member_links_tenant", "tenant"),
    )


class PahekoMemberSyncState(Base):
    __tablename__ = "paheko_member_sync_state"

    id = Column(Integer, primary_key=True, default=1)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    last_success_at = Column(DateTime(timezone=True), nullable=True)
    last_status = Column(String(32), nullable=False, default="never")
    last_request_id = Column(String(64), nullable=True)
    last_error = Column(Text, nullable=True)
    watermark = Column(DateTime(timezone=True), nullable=True)
    last_cursor = Column(String(128), nullable=True)
    last_created_count = Column(Integer, nullable=False, default=0)
    last_updated_count = Column(Integer, nullable=False, default=0)
    last_deleted_count = Column(Integer, nullable=False, default=0)
    last_error_count = Column(Integer, nullable=False, default=0)
    last_conflict_count = Column(Integer, nullable=False, default=0)
    scheduler_enabled = Column(Boolean, nullable=False, default=False)
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

