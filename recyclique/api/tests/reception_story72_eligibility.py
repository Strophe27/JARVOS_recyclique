"""
Story 7.2 — prérequis tests réception (site + permission ``reception.access``).
"""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from recyclic_api.models.permission import Group, Permission
from recyclic_api.models.user import User

RECEPTION_ACCESS_PERMISSION = "reception.access"


def grant_user_reception_eligibility(db: Session, user: User, site_id: uuid.UUID) -> None:
    """Affecte le site et rattache l'utilisateur à un groupe portant ``reception.access``."""
    user.site_id = site_id
    db.add(user)
    perm = db.query(Permission).filter(Permission.name == RECEPTION_ACCESS_PERMISSION).first()
    if not perm:
        perm = Permission(name=RECEPTION_ACCESS_PERMISSION, description="Accès réception (tests 7.2)")
        db.add(perm)
        db.flush()

    gkey = f"story72-reception-{user.id}"
    existing = db.query(Group).filter(Group.key == gkey).first()
    if existing:
        if not any(u.id == user.id for u in existing.users):
            existing.users.append(user)
        db.commit()
        db.refresh(user)
        return

    group = Group(
        name=gkey,
        key=gkey,
        description="Groupe test Story 7.2 réception",
        site_id=None,
    )
    group.permissions.append(perm)
    db.add(group)
    db.flush()
    group.users.append(user)
    db.commit()
    db.refresh(user)
