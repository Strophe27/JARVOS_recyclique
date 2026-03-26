"""
Endpoints admin : assignation des groupes utilisateur (PUT /users/{id}/groups).

Hors Telegram et hors credentials.
Préfixe routeur : /admin.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status as http_status
from sqlalchemy.orm import Session
from slowapi import Limiter

from recyclic_api.core.audit import log_admin_access, log_role_change
from recyclic_api.core.auth import require_admin_role
from recyclic_api.core.user_identity import username_or_telegram_id
from recyclic_api.core.database import get_db
from recyclic_api.models.user import User
from recyclic_api.schemas.admin import AdminResponse
from recyclic_api.schemas.permission import UserGroupUpdateRequest


def register_admin_users_groups_routes(router: APIRouter, limiter: Limiter) -> None:
    """Enregistre PUT /users/{user_id}/groups."""
    _ = limiter

    @router.put(
        "/users/{user_id}/groups",
        response_model=AdminResponse,
        summary="Mettre à jour les groupes d'un utilisateur (Admin)",
        description="Met à jour l'assignation des groupes pour un utilisateur spécifique",
    )
    def update_user_groups(
        user_id: str,
        group_update: UserGroupUpdateRequest,
        current_user: User = Depends(require_admin_role),
        db: Session = Depends(get_db),
    ):
        """Met à jour les groupes d'un utilisateur."""
        try:
            # Log de l'accès admin
            log_admin_access(
                user_id=str(current_user.id),
                username=username_or_telegram_id(current_user.username, None),
                endpoint="/admin/users/{user_id}/groups",
                success=True,
            )

            # Recherche de l'utilisateur
            try:
                user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
                user = db.query(User).filter(User.id == user_uuid).first()
            except ValueError:
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Utilisateur non trouvé",
                )

            if not user:
                # Log de l'échec
                log_admin_access(
                    user_id=str(current_user.id),
                    username=username_or_telegram_id(current_user.username, None),
                    endpoint="/admin/users/{user_id}/groups",
                    success=False,
                    error_message="Utilisateur non trouvé",
                )
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Utilisateur non trouvé",
                )

            # Importer le modèle Group
            from recyclic_api.models.permission import Group

            # Valider que tous les groupes existent
            group_uuids = []
            for group_id in group_update.group_ids:
                try:
                    group_uuid = uuid.UUID(group_id)
                    group = db.query(Group).filter(Group.id == group_uuid).first()
                    if not group:
                        raise HTTPException(
                            status_code=http_status.HTTP_404_NOT_FOUND,
                            detail=f"Groupe non trouvé: {group_id}",
                        )
                    group_uuids.append(group_uuid)
                except ValueError:
                    raise HTTPException(
                        status_code=http_status.HTTP_400_BAD_REQUEST,
                        detail=f"ID de groupe invalide: {group_id}",
                    )

            # Récupérer les groupes existants
            existing_groups = db.query(Group).filter(Group.id.in_(group_uuids)).all()

            # État des groupes avant mutation (après commit/refresh, user.groups = nouvel état)
            previous_group_names = [g.name for g in user.groups]

            # Mettre à jour les groupes de l'utilisateur
            user.groups = existing_groups
            db.commit()
            db.refresh(user)

            # Log de la modification des groupes
            log_role_change(
                admin_user_id=str(current_user.id),
                admin_username=username_or_telegram_id(current_user.username, None) or "",
                target_user_id=str(user.id),
                target_username=username_or_telegram_id(user.username, None),
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
            display = full_name or username_or_telegram_id(user.username, None)
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

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la mise à jour des groupes: {str(e)}",
            )
