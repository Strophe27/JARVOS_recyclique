"""
Endpoints admin : assignation des groupes utilisateur (PUT /users/{id}/groups).

Hors credentials (groupes uniquement).
Préfixe routeur : /admin.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status as http_status
from sqlalchemy.orm import Session
from slowapi import Limiter

from recyclic_api.core.audit import log_admin_access
from recyclic_api.core.auth import require_admin_role
from recyclic_api.core.user_identity import username_for_audit
from recyclic_api.core.database import get_db
from recyclic_api.models.user import User
from recyclic_api.schemas.admin import AdminResponse
from recyclic_api.schemas.permission import UserGroupUpdateRequest
from recyclic_api.services.admin_user_groups_assignment_service import (
    GroupNotFoundForAssignment,
    InvalidGroupIdForAssignment,
    UserNotFoundForAssignment,
    update_user_groups_assignment,
)

logger = logging.getLogger(__name__)


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
            # Ordre inchangé : journal d'accès succès avant toute logique métier
            log_admin_access(
                user_id=str(current_user.id),
                username=username_for_audit(current_user.username),
                endpoint="/admin/users/{user_id}/groups",
                success=True,
            )

            try:
                return update_user_groups_assignment(
                    db,
                    user_id=user_id,
                    group_update=group_update,
                    admin_user=current_user,
                )
            except UserNotFoundForAssignment:
                log_admin_access(
                    user_id=str(current_user.id),
                    username=username_for_audit(current_user.username),
                    endpoint="/admin/users/{user_id}/groups",
                    success=False,
                    error_message="Utilisateur non trouvé",
                )
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Utilisateur non trouvé",
                )
            except GroupNotFoundForAssignment as exc:
                log_admin_access(
                    user_id=str(current_user.id),
                    username=username_for_audit(current_user.username),
                    endpoint="/admin/users/{user_id}/groups",
                    success=False,
                    error_message=f"Groupe non trouvé: {exc.group_id}",
                )
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail=f"Groupe non trouvé: {exc.group_id}",
                )
            except InvalidGroupIdForAssignment as exc:
                log_admin_access(
                    user_id=str(current_user.id),
                    username=username_for_audit(current_user.username),
                    endpoint="/admin/users/{user_id}/groups",
                    success=False,
                    error_message=f"ID de groupe invalide: {exc.group_id}",
                )
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail=f"ID de groupe invalide: {exc.group_id}",
                )

        except HTTPException:
            raise
        except Exception:
            logger.exception(
                "Erreur inattendue lors de la mise à jour des groupes (admin)",
            )
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erreur lors de la mise à jour des groupes",
            )
