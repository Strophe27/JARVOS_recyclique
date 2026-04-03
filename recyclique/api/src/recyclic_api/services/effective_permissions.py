"""
Calcul additif unique des permissions effectives (Story 2.3).

Union des permissions des groupes dans le périmètre actif (site / scope) + raccourcis
rôle ADMIN / SUPER_ADMIN. Une seule implémentation : `get_user_permissions` et
`user_has_permission` dans `core/auth` délèguent ici.
"""

from __future__ import annotations

import uuid
from typing import List, Optional, Set

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from recyclic_api.models.permission import Group, Permission
from recyclic_api.models.user import User, UserRole


def group_in_active_scope(group: Group, user_site_id: Optional[uuid.UUID]) -> bool:
    """
    Périmètre autorisé pour l'union (spec isolation sites).

    - Groupe global (site_id NULL) : toujours inclus.
    - Groupe rattaché à un site : inclus seulement si l'utilisateur a le même site_id.
    - Utilisateur sans site : pas d'inclusion des groupes « site-scoped » (pas d'élargissement
      silencieux hors îlot).
    """
    if group.site_id is None:
        return True
    if user_site_id is None:
        return False
    return group.site_id == user_site_id


def compute_effective_permission_keys(user: User, db: Session) -> List[str]:
    """
    Liste triée des clés de permission effectives (`Permission.name` = clé stable).

    - ADMIN / SUPER_ADMIN : union de toutes les permissions persistées (additif rôle).
    - USER : union des permissions des groupes dont l'adhésion est dans le périmètre actif.
    """
    if user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        stmt = select(Permission)
        rows = db.execute(stmt).scalars().all()
        return sorted({p.name for p in rows})

    stmt = (
        select(User)
        .options(selectinload(User.groups).selectinload(Group.permissions))
        .where(User.id == user.id)
    )
    user_loaded = db.execute(stmt).scalar_one_or_none()
    if not user_loaded or not user_loaded.groups:
        return []

    keys: Set[str] = set()
    active_site = user_loaded.site_id
    for group in user_loaded.groups:
        if not group_in_active_scope(group, active_site):
            continue
        for perm in group.permissions:
            keys.add(perm.name)
    return sorted(keys)


def user_has_effective_permission(user: User, permission_name: str, db: Session) -> bool:
    """Même règles que `compute_effective_permission_keys` pour une clé unique."""
    if user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        return True

    stmt = (
        select(User)
        .options(selectinload(User.groups).selectinload(Group.permissions))
        .where(User.id == user.id)
    )
    user_loaded = db.execute(stmt).scalar_one_or_none()
    if not user_loaded or not user_loaded.groups:
        return False

    active_site = user_loaded.site_id
    for group in user_loaded.groups:
        if not group_in_active_scope(group, active_site):
            continue
        for perm in group.permissions:
            if perm.name == permission_name:
                return True
    return False
