"""
Endpoints admin : historique d'activité d'un utilisateur (lecture).

Pas de Telegram : uniquement audit, User et UserHistoryService.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy.orm import Session
from slowapi import Limiter

from recyclic_api.core.audit import log_admin_access
from recyclic_api.core.auth import require_admin_role
from recyclic_api.core.user_identity import username_or_telegram_id
from recyclic_api.core.database import get_db
from recyclic_api.models.user import User
from recyclic_api.schemas.admin import UserHistoryResponse
from recyclic_api.services.user_history_service import UserHistoryService


def register_admin_users_history_routes(router: APIRouter, limiter: Limiter) -> None:
    """Enregistre GET /users/{user_id}/history (préfixe routeur /admin)."""

    @router.get(
        "/users/{user_id}/history",
        response_model=UserHistoryResponse,
        summary="Historique d'activité d'un utilisateur (Admin)",
        description="Récupère la chronologie complète et filtrable de l'activité d'un utilisateur",
    )
    def get_user_history(
        user_id: str,
        date_from: Optional[datetime] = Query(None, description="Date de début du filtre (format ISO)"),
        date_to: Optional[datetime] = Query(None, description="Date de fin du filtre (format ISO)"),
        event_type: Optional[str] = Query(
            None,
            description="Type d'événement à filtrer (ADMINISTRATION, SESSION CAISSE, VENTE, DEPOT)",
        ),
        skip: int = Query(0, ge=0, description="Nombre d'éléments à ignorer"),
        limit: int = Query(20, ge=1, le=100, description="Nombre d'éléments par page"),
        current_user: User = Depends(require_admin_role),
        db: Session = Depends(get_db),
    ):
        """Récupère l'historique complet d'activité d'un utilisateur"""
        try:
            log_admin_access(
                user_id=str(current_user.id),
                username=username_or_telegram_id(
                    current_user.username, current_user.telegram_id
                ),
                endpoint=f"/admin/users/{user_id}/history",
                success=True,
            )

            UUID(user_id)

            # Récupérer le nom de l'utilisateur cible pour une description plus lisible
            target_user = db.query(User).filter(User.id == user_id).first()
            target_name = "utilisateur inconnu"
            if target_user:
                if target_user.first_name and target_user.last_name:
                    target_name = f"{target_user.first_name} {target_user.last_name}"
                elif target_user.first_name:
                    target_name = target_user.first_name
                elif target_user.username:
                    target_name = target_user.username
                elif target_user.telegram_id:
                    target_name = f"@{target_user.telegram_id}"

            history_service = UserHistoryService(db)

            history_response = history_service.get_user_activity_history(
                user_id=user_id,
                date_from=date_from,
                date_to=date_to,
                event_type=event_type,
                skip=skip,
                limit=limit,
            )

            return history_response

        except ValueError as e:
            log_admin_access(
                user_id=str(current_user.id),
                username=username_or_telegram_id(
                    current_user.username, current_user.telegram_id
                ),
                endpoint=f"/admin/users/{user_id}/history",
                success=False,
                error_message=str(e),
            )
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        except Exception as e:
            log_admin_access(
                user_id=str(current_user.id),
                username=username_or_telegram_id(
                    current_user.username, current_user.telegram_id
                ),
                endpoint=f"/admin/users/{user_id}/history",
                success=False,
                error_message=str(e),
            )
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la récupération de l'historique: {str(e)}",
            )
