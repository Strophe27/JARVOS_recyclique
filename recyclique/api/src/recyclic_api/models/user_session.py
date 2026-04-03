from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import Column, DateTime, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, INET
from sqlalchemy.orm import relationship

from recyclic_api.core.database import Base


class UserSession(Base):
    """Modèle pour les sessions utilisateur avec refresh tokens."""
    
    __tablename__ = "user_sessions"

    id = Column(PG_UUID(as_uuid=True), primary_key=True)
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    refresh_token_hash = Column(String(255), nullable=False, unique=True, index=True)
    access_token_jti = Column(String(255), nullable=True)  # JWT ID pour révocation future
    issued_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    last_used_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    last_ip = Column(String(45), nullable=True)  # IPv4 ou IPv6 (max 45 chars)
    user_agent = Column(Text, nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationship
    user = relationship("User", backref="sessions")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<UserSession id={self.id} user_id={self.user_id} revoked={self.revoked_at is not None}>"

    @property
    def is_active(self) -> bool:
        """Vérifie si la session est active (non révoquée et non expirée)."""
        now = datetime.now(timezone.utc)
        return (
            self.revoked_at is None
            and self.expires_at > now
        )

    @property
    def is_expired(self) -> bool:
        """Vérifie si la session est expirée."""
        return datetime.now(timezone.utc) > self.expires_at

