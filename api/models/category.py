# Modele Category — table categories (RecyClique, Story 2.3).
# Hiérarchie parent/enfant (parent_id self-ref), visibilité caisse/réception, ordre, soft delete.
# Conventions : snake_case, timestamps with timezone.

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from api.models.base import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    parent_id = Column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    official_name = Column(String(512), nullable=True)
    is_visible_sale = Column(Boolean, nullable=False, default=True)
    is_visible_reception = Column(Boolean, nullable=False, default=True)
    display_order = Column(Integer, nullable=False, default=0)
    display_order_entry = Column(Integer, nullable=False, default=0)
    price = Column(Numeric(10, 2), nullable=True)
    max_price = Column(Numeric(10, 2), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    parent = relationship(
        "Category",
        remote_side=[id],
        back_populates="children",
        foreign_keys=[parent_id],
    )
    children = relationship(
        "Category",
        back_populates="parent",
        foreign_keys=[parent_id],
    )

    __table_args__ = (
        Index("idx_categories_parent_id", "parent_id"),
        Index("idx_categories_deleted_at", "deleted_at"),
        Index("idx_categories_is_visible_sale", "is_visible_sale"),
        Index("idx_categories_is_visible_reception", "is_visible_reception"),
    )
