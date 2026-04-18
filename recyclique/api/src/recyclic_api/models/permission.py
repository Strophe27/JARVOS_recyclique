from sqlalchemy import Column, String, DateTime, Table, ForeignKey, Text, event, text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from recyclic_api.core.database import Base
from recyclic_api.utils.stable_keys import slugify_label_to_key

# Association table for User-Group many-to-many relationship
user_groups = Table(
    'user_groups',
    Base.metadata,
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('group_id', UUID(as_uuid=True), ForeignKey('groups.id', ondelete='CASCADE'), primary_key=True),
    Column('created_at', DateTime(timezone=True), server_default=func.now())
)

# Association table for Group-Permission many-to-many relationship
group_permissions = Table(
    'group_permissions',
    Base.metadata,
    Column('group_id', UUID(as_uuid=True), ForeignKey('groups.id', ondelete='CASCADE'), primary_key=True),
    Column('permission_id', UUID(as_uuid=True), ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True),
    Column('created_at', DateTime(timezone=True), server_default=func.now())
)


class Permission(Base):
    """Permission model for fine-grained access control.

    ``name`` est la clé technique stable (ex. ``caisse.access``) ; ne pas utiliser un libellé
    affiché pour l'autorisation serveur (Story 2.3).
    """
    __tablename__ = "permissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    groups = relationship("Group", secondary=group_permissions, back_populates="permissions")

    def __repr__(self):
        return f"<Permission(id={self.id}, name={self.name})>"


class Group(Base):
    """Group model for managing collections of users with shared permissions.

    `key` : identifiant machine stable (kebab-case), distinct du libellé (`name` / `display_name`).
    `site_id` : périmètre du groupe ; NULL = groupe global (tous sites).
    """
    __tablename__ = "groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    display_name = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    users = relationship("User", secondary=user_groups, back_populates="groups")
    permissions = relationship("Permission", secondary=group_permissions, back_populates="groups")
    site = relationship("Site", back_populates="groups")

    def __repr__(self):
        return f"<Group(id={self.id}, key={self.key}, name={self.name})>"


@event.listens_for(Group, "before_insert", propagate=True)
def _group_before_insert_set_key(mapper, connection, target: "Group") -> None:
    """Génère `key` à partir du libellé si absent (tests / créations ORM sans migration préalable)."""
    if getattr(target, "key", None):
        return
    base = slugify_label_to_key(target.name or "group")
    candidate = base
    suffix = 0
    while True:
        row = connection.execute(
            text("SELECT 1 FROM groups WHERE key = :k LIMIT 1"),
            {"k": candidate},
        ).fetchone()
        if row is None:
            target.key = candidate
            return
        suffix += 1
        candidate = f"{base}-{suffix}"
