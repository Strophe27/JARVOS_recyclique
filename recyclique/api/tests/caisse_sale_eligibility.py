"""
Story 6.2 — prérequis tests pour POST/GET ventes caisse (site affecté + permission ``caisse.access``).
"""

from __future__ import annotations

import uuid

from sqlalchemy import text
from sqlalchemy.orm import Session

from recyclic_api.models.permission import Group, Permission
from recyclic_api.models.user import User

CAISSE_ACCESS_PERMISSION = "caisse.access"
CAISSE_VIRTUAL_ACCESS_PERMISSION = "caisse.virtual.access"
CAISSE_DEFERRED_ACCESS_PERMISSION = "caisse.deferred.access"
CAISSE_REFUND_PERMISSION = "caisse.refund"
CAISSE_EXCEPTIONAL_REFUND_PERMISSION = "refund.exceptional"
ACCOUNTING_PRIOR_YEAR_REFUND_PERMISSION = "accounting.prior_year_refund"
CAISSE_SPECIAL_ENCAISSEMENT_PERMISSION = "caisse.special_encaissement"
CAISSE_SOCIAL_ENCAISSEMENT_PERMISSION = "caisse.social_encaissement"


def grant_user_caisse_sale_eligibility(db: Session, user: User, site_id: uuid.UUID) -> None:
    """
    Affecte le site et rattache l'utilisateur à un groupe global portant ``caisse.access``.
    Idempotent si la permission existe déjà en base.
    """
    user.site_id = site_id
    db.add(user)
    perm = db.query(Permission).filter(Permission.name == CAISSE_ACCESS_PERMISSION).first()
    if not perm:
        perm = Permission(name=CAISSE_ACCESS_PERMISSION, description="Accès caisse (tests 6.2)")
        db.add(perm)
        db.flush()

    gkey = f"story62-caisse-{user.id}"
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
        description="Groupe test Story 6.2",
        site_id=None,
    )
    group.permissions.append(perm)
    db.add(group)
    db.flush()
    group.users.append(user)
    db.commit()
    db.refresh(user)


def grant_user_caisse_sale_mode_eligibility(
    db: Session,
    user: User,
    site_id: uuid.UUID,
    permission_name: str,
) -> None:
    """Affecte le site et rattache l'utilisateur à une permission d'entrée caisse brownfield donnée."""
    user.site_id = site_id
    db.add(user)
    perm = db.query(Permission).filter(Permission.name == permission_name).first()
    if not perm:
        perm = Permission(name=permission_name, description=f"Accès caisse mode {permission_name} (tests Epic 6)")
        db.add(perm)
        db.flush()

    gkey = f"story62-caisse-mode-{permission_name}-{user.id}"
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
        description="Groupe test Story 6.x variantes caisse",
        site_id=None,
    )
    group.permissions.append(perm)
    db.add(group)
    db.flush()
    group.users.append(user)
    db.commit()
    db.refresh(user)


def grant_user_caisse_refund_permission(db: Session, user: User) -> None:
    """Story 6.4 — ajoute ``caisse.refund`` au même groupe de test que l'accès caisse si présent, sinon crée un groupe."""
    perm = db.query(Permission).filter(Permission.name == CAISSE_REFUND_PERMISSION).first()
    if not perm:
        perm = Permission(name=CAISSE_REFUND_PERMISSION, description="Remboursement caisse (tests 6.4)")
        db.add(perm)
        db.flush()

    gkey = f"story62-caisse-{user.id}"
    group = db.query(Group).filter(Group.key == gkey).first()
    if group:
        if not any(p.name == CAISSE_REFUND_PERMISSION for p in group.permissions):
            group.permissions.append(perm)
        db.commit()
        db.refresh(user)
        return

    group = Group(
        name=gkey,
        key=gkey,
        description="Groupe test Story 6.4 refund",
        site_id=None,
    )
    group.permissions.append(perm)
    db.add(group)
    db.flush()
    group.users.append(user)
    db.commit()
    db.refresh(user)


def grant_user_accounting_prior_year_refund_permission(db: Session, user: User) -> None:
    """Story 22.5 — ajoute ``accounting.prior_year_refund`` au groupe de test caisse de l'utilisateur."""
    perm = db.query(Permission).filter(Permission.name == ACCOUNTING_PRIOR_YEAR_REFUND_PERMISSION).first()
    if not perm:
        perm = Permission(
            name=ACCOUNTING_PRIOR_YEAR_REFUND_PERMISSION,
            description="Second parcours remboursement N-1 clos (tests 22.5)",
        )
        db.add(perm)
        db.flush()

    gkey = f"story62-caisse-{user.id}"
    # SQL direct : l'association ORM group.permissions.append n'est pas toujours persistée
    # selon l'état de session SQLite des tests (connection partagée / threads TestClient).
    db.execute(
        text(
            "INSERT INTO group_permissions (group_id, permission_id) "
            "SELECT g.id, p.id FROM groups g, permissions p "
            "WHERE g.key = :gk AND p.name = :pn "
            "AND NOT EXISTS ("
            "  SELECT 1 FROM group_permissions x "
            "  WHERE x.group_id = g.id AND x.permission_id = p.id"
            ")"
        ),
        {"gk": gkey, "pn": ACCOUNTING_PRIOR_YEAR_REFUND_PERMISSION},
    )
    db.commit()
    db.refresh(user)


def grant_user_exceptional_refund_permission(db: Session, user: User) -> None:
    """Story 24.5 — ajoute ``refund.exceptional`` au groupe caisse de test."""
    perm = db.query(Permission).filter(Permission.name == CAISSE_EXCEPTIONAL_REFUND_PERMISSION).first()
    if not perm:
        perm = Permission(
            name=CAISSE_EXCEPTIONAL_REFUND_PERMISSION,
            description="Remboursement exceptionnel sans ticket (tests 24.5)",
        )
        db.add(perm)
        db.flush()

    gkey = f"story62-caisse-{user.id}"
    group = db.query(Group).filter(Group.key == gkey).first()
    if group:
        if not any(p.name == CAISSE_EXCEPTIONAL_REFUND_PERMISSION for p in group.permissions):
            group.permissions.append(perm)
        db.commit()
        db.refresh(user)
        return

    group = Group(
        name=gkey,
        key=gkey,
        description="Groupe test Story 24.5 exceptional refund",
        site_id=None,
    )
    group.permissions.append(perm)
    db.add(group)
    db.flush()
    group.users.append(user)
    db.commit()
    db.refresh(user)


def grant_user_caisse_special_encaissement_permission(db: Session, user: User) -> None:
    """Story 6.5 — ajoute ``caisse.special_encaissement`` au groupe caisse de test."""
    perm = db.query(Permission).filter(Permission.name == CAISSE_SPECIAL_ENCAISSEMENT_PERMISSION).first()
    if not perm:
        perm = Permission(
            name=CAISSE_SPECIAL_ENCAISSEMENT_PERMISSION,
            description="Encaissements spéciaux caisse (tests 6.5)",
        )
        db.add(perm)
        db.flush()

    gkey = f"story62-caisse-{user.id}"
    group = db.query(Group).filter(Group.key == gkey).first()
    if group:
        if not any(p.name == CAISSE_SPECIAL_ENCAISSEMENT_PERMISSION for p in group.permissions):
            group.permissions.append(perm)
        db.commit()
        db.refresh(user)
        return

    group = Group(
        name=gkey,
        key=gkey,
        description="Groupe test Story 6.5 special encaissement",
        site_id=None,
    )
    group.permissions.append(perm)
    db.add(group)
    db.flush()
    group.users.append(user)
    db.commit()
    db.refresh(user)


def grant_user_caisse_social_encaissement_permission(db: Session, user: User) -> None:
    """Story 6.6 — ajoute ``caisse.social_encaissement`` au groupe caisse de test."""
    perm = db.query(Permission).filter(Permission.name == CAISSE_SOCIAL_ENCAISSEMENT_PERMISSION).first()
    if not perm:
        perm = Permission(
            name=CAISSE_SOCIAL_ENCAISSEMENT_PERMISSION,
            description="Encaissements actions sociales caisse (tests 6.6)",
        )
        db.add(perm)
        db.flush()

    gkey = f"story62-caisse-{user.id}"
    group = db.query(Group).filter(Group.key == gkey).first()
    if group:
        if not any(p.name == CAISSE_SOCIAL_ENCAISSEMENT_PERMISSION for p in group.permissions):
            group.permissions.append(perm)
        db.commit()
        db.refresh(user)
        return

    group = Group(
        name=gkey,
        key=gkey,
        description="Groupe test Story 6.6 social encaissement",
        site_id=None,
    )
    group.permissions.append(perm)
    db.add(group)
    db.flush()
    group.users.append(user)
    db.commit()
    db.refresh(user)
