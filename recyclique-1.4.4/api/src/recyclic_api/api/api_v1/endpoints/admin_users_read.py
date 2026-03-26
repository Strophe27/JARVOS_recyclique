"""
Endpoints admin : consultation des utilisateurs (liste, statuts d'activité, pending).

Historique d'activité chronologique : `admin_users_history`.
Les mutations rôle / statut actif / profil : `admin_users_mutations`.
Credentials (reset / force mot de passe, reset PIN) : `admin_users_credentials`.
Approbation et rejet (sans notification sortante Telegram) : `admin`.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status as http_status
from sqlalchemy.orm import Session
from slowapi import Limiter

from recyclic_api.core.audit import log_admin_access
from recyclic_api.core.auth import require_admin_role
from recyclic_api.core.database import get_db
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.schemas.admin import AdminUser, PendingUserResponse, UserStatusesResponse
from recyclic_api.services.activity_service import ActivityService


def register_admin_users_read_routes(router: APIRouter, limiter: Limiter) -> None:
    """Enregistre GET /users, GET /users/statuses, GET /users/pending (préfixe routeur /admin)."""

    @router.get(
        "/users",
        response_model=List[AdminUser],
        summary="Liste des utilisateurs (Admin)",
        description="Récupère la liste des utilisateurs avec filtres optionnels",
    )
    @limiter.limit("30/minute")
    def get_users(
        request: Request,
        skip: int = Query(0, ge=0, description="Nombre d'éléments à ignorer"),
        limit: int = Query(20, ge=1, le=100, description="Nombre d'éléments par page"),
        role: Optional[UserRole] = Query(None, description="Filtrer par rôle"),
        user_status: Optional[UserStatus] = Query(None, description="Filtrer par statut"),
        current_user: User = Depends(require_admin_role),
        db: Session = Depends(get_db),
    ):
        """Récupère la liste des utilisateurs avec filtres"""
        try:
            log_admin_access(
                user_id=str(current_user.id),
                username=current_user.username or current_user.telegram_id,
                endpoint="/admin/users",
                success=True,
            )

            query = db.query(User)

            if role:
                query = query.filter(User.role == role)
            if user_status:
                query = query.filter(User.status == user_status)

            users = query.offset(skip).limit(limit).all()

            admin_users = []
            for user in users:
                full_name = (
                    f"{user.first_name} {user.last_name}"
                    if user.first_name and user.last_name
                    else user.first_name or user.last_name
                )
                admin_user = AdminUser(
                    id=str(user.id),
                    telegram_id=user.telegram_id,
                    username=user.username,
                    first_name=user.first_name,
                    last_name=user.last_name,
                    full_name=full_name,
                    email=None,
                    role=user.role,
                    status=user.status,
                    is_active=user.is_active,
                    site_id=str(user.site_id) if user.site_id else None,
                    created_at=user.created_at,
                    updated_at=user.updated_at,
                )
                admin_users.append(admin_user)

            return admin_users

        except Exception as e:
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la récupération des utilisateurs: {str(e)}",
            )

    @router.get(
        "/users/statuses",
        response_model=UserStatusesResponse,
        summary="Statuts des utilisateurs (Admin)",
        description="Récupère les statuts en ligne/hors ligne de tous les utilisateurs",
    )
    @limiter.limit("30/minute")
    def get_users_statuses(
        request: Request,
        current_user: User = Depends(require_admin_role),
        db: Session = Depends(get_db),
    ):
        """Récupère les statuts en ligne/hors ligne de tous les utilisateurs"""
        try:
            log_admin_access(
                user_id=str(current_user.id),
                username=current_user.username or current_user.telegram_id,
                endpoint="/admin/users/statuses",
                success=True,
            )

            activity_service = ActivityService(db)
            return activity_service.get_user_statuses_response()

        except Exception as e:
            log_admin_access(
                user_id=str(current_user.id),
                username=current_user.username or current_user.telegram_id,
                endpoint="/admin/users/statuses",
                success=False,
                error_message=str(e),
            )
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la récupération des statuts: {str(e)}",
            )

    @router.get(
        "/users/pending",
        response_model=List[PendingUserResponse],
        summary="Liste des utilisateurs en attente (Admin)",
        description="Récupère la liste des utilisateurs avec le statut 'pending'",
    )
    def get_pending_users(
        current_user: User = Depends(require_admin_role),
        db: Session = Depends(get_db),
    ):
        """Récupère la liste des utilisateurs en attente d'approbation"""
        try:
            log_admin_access(
                user_id=str(current_user.id),
                username=current_user.username or current_user.telegram_id,
                endpoint="/admin/users/pending",
                success=True,
            )

            pending_users = db.query(User).filter(User.status == UserStatus.PENDING).all()

            pending_responses = []
            for user in pending_users:
                full_name = (
                    f"{user.first_name} {user.last_name}"
                    if user.first_name and user.last_name
                    else user.first_name or user.last_name
                )
                pending_response = PendingUserResponse(
                    id=str(user.id),
                    telegram_id=int(user.telegram_id),
                    username=user.username,
                    first_name=user.first_name,
                    last_name=user.last_name,
                    full_name=full_name,
                    role=user.role,
                    status=user.status,
                    created_at=user.created_at,
                )
                pending_responses.append(pending_response)

            return pending_responses

        except Exception as e:
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la récupération des utilisateurs en attente: {str(e)}",
            )
