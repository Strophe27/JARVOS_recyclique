"""
Service métier : assignation des groupes d'un utilisateur (contexte admin).

Centralise les requêtes ORM, la validation des identifiants et la persistance
(commit / refresh), ainsi que le journal d'audit de changement de rôles/groupes.
Les routes FastAPI restent responsables de `log_admin_access` (point d'entrée)
et de la traduction des erreurs métier en réponses HTTP.
"""

from __future__ import annotations

import uuid
from typing import List

from sqlalchemy.orm import Session

from recyclic_api.core.audit import log_role_change
from recyclic_api.core.user_identity import username_for_audit
from recyclic_api.models.permission import Group
from recyclic_api.models.user import User
from recyclic_api.schemas.admin import AdminResponse
from recyclic_api.schemas.permission import UserGroupUpdateRequest


class UserNotFoundForAssignment(Exception):
    """Aucun utilisateur ne correspond à l'identifiant fourni (ou UUID invalide)."""


class GroupNotFoundForAssignment(Exception):
    """Un groupe référencé n'existe pas."""

    def __init__(self, group_id: str) -> None:
        self.group_id = group_id
        super().__init__(group_id)


class InvalidGroupIdForAssignment(Exception):
    """Identifiant de groupe fourni n'est pas un UUID valide."""

    def __init__(self, group_id: str) -> None:
        self.group_id = group_id
        super().__init__(group_id)


def update_user_groups_assignment(
    db: Session,
    *,
    user_id: str,
    group_update: UserGroupUpdateRequest,
    admin_user: User,
) -> AdminResponse:
    """
    Met à jour les groupes associés à un utilisateur et retourne la réponse admin.

    :param db: session SQLAlchemy (sync)
    :param user_id: identifiant utilisateur cible (UUID string)
    :param group_update: liste des ids de groupes à appliquer
    :param admin_user: utilisateur authentifié admin (pour l'audit)
    :raises UserNotFoundForAssignment: utilisateur introuvable ou user_id invalide
    :raises GroupNotFoundForAssignment: groupe inexistant
    :raises InvalidGroupIdForAssignment: id de groupe mal formé
    """
    try:
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    except (ValueError, TypeError):
        raise UserNotFoundForAssignment from None

    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise UserNotFoundForAssignment

    # Une requête `Group` : valider les UUID puis charger tous les groupes en un `IN`.
    parsed_pairs: List[tuple[str, uuid.UUID]] = []
    for group_id in group_update.group_ids:
        try:
            parsed_pairs.append((group_id, uuid.UUID(group_id)))
        except ValueError:
            raise InvalidGroupIdForAssignment(group_id) from None

    if not parsed_pairs:
        existing_groups = []
    else:
        uuids_in_order = [u for _, u in parsed_pairs]
        unique_for_query = list(dict.fromkeys(uuids_in_order))
        groups_map = {
            g.id: g
            for g in db.query(Group).filter(Group.id.in_(unique_for_query)).all()
        }
        for orig_id, u in parsed_pairs:
            if u not in groups_map:
                raise GroupNotFoundForAssignment(orig_id)
        unique_ordered = list(dict.fromkeys(uuids_in_order))
        existing_groups = [groups_map[u] for u in unique_ordered]
    previous_group_names = [g.name for g in user.groups]

    user.groups = existing_groups
    db.commit()
    db.refresh(user)

    log_role_change(
        admin_user_id=str(admin_user.id),
        admin_username=username_for_audit(admin_user.username) or "",
        target_user_id=str(user.id),
        target_username=username_for_audit(user.username),
        old_role=f"groups={previous_group_names}",
        new_role=f"groups={[g.name for g in existing_groups]}",
        success=True,
        db=db,
    )

    full_name = (
        f"{user.first_name} {user.last_name}"
        if user.first_name and user.last_name
        else user.first_name or user.last_name
    )
    group_names = [group.name for group in existing_groups]
    display = full_name or username_for_audit(user.username)
    msg = (
        f"Groupes de l'utilisateur {display} mis à jour avec succès"
        if display
        else "Groupes de l'utilisateur mis à jour avec succès"
    )

    return AdminResponse(
        data={
            "user_id": str(user.id),
            "group_ids": group_update.group_ids,
            "group_names": group_names,
        },
        message=msg,
        success=True,
    )
