from fastapi import APIRouter, Depends, HTTPException, status as http_status, Request
from sqlalchemy.orm import Session
import uuid
import logging
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from recyclic_api.core.database import get_db
from recyclic_api.core.auth import require_admin_role, require_admin_role_strict
from recyclic_api.core.audit import log_role_change, log_admin_access
from recyclic_api.models.user import User, UserStatus
from recyclic_api.schemas.admin import (
    AdminResponse,
    AdminErrorResponse,
    PaginationInfo,
    UserApprovalRequest,
    UserRejectionRequest,
)
from .admin_activity_threshold import register_admin_activity_threshold_routes
from .admin_health import register_admin_health_routes
from .admin_observability import register_admin_observability_routes
from .admin_users_read import register_admin_users_read_routes
from .admin_users_history import register_admin_users_history_routes
from .admin_users_mutations import register_admin_users_mutations_routes
from .admin_users_groups import register_admin_users_groups_routes
from .admin_users_credentials import register_admin_users_credentials_routes
from .admin_cash_sessions_maintenance import register_admin_cash_sessions_maintenance_routes
from .admin_templates_offline import register_admin_templates_offline_routes

router = APIRouter(tags=["admin"])
logger = logging.getLogger(__name__)

# Configuration du rate limiting
limiter = Limiter(key_func=get_remote_address)

register_admin_health_routes(router, limiter)
register_admin_observability_routes(router, limiter)
register_admin_activity_threshold_routes(router, limiter)
register_admin_users_read_routes(router, limiter)
register_admin_users_history_routes(router, limiter)
register_admin_users_mutations_routes(router, limiter)
register_admin_users_groups_routes(router, limiter)
register_admin_users_credentials_routes(router, limiter)
register_admin_cash_sessions_maintenance_routes(router, limiter)
register_admin_templates_offline_routes(router, limiter)

# La fonction require_admin_role est maintenant importée depuis core.auth

@router.post(
    "/users/{user_id}/approve",
    response_model=AdminResponse,
    summary="Approuver un utilisateur (Admin)",
    description="Approuve un utilisateur en attente (sans notification sortante Telegram)"
)
async def approve_user(
    user_id: str,
    approval_request: UserApprovalRequest = None,
    current_user: User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """Approuve un utilisateur en attente"""
    try:
        # Log de l'acc├¿s admin
        log_admin_access(
            user_id=str(current_user.id),
            username=current_user.username or current_user.telegram_id,
            endpoint="/admin/users/{user_id}/approve",
            success=True
        )

        # Recherche de l'utilisateur
        try:
            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
            user = db.query(User).filter(User.id == user_uuid).first()
        except ValueError:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouv├®"
            )

        if not user:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouv├®"
            )

        if user.status != UserStatus.PENDING:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="L'utilisateur n'est pas en attente d'approbation"
            )

        # Approuver l'utilisateur
        user.status = UserStatus.APPROVED
        db.commit()
        db.refresh(user)

        # Log de l'approbation
        log_role_change(
            admin_user_id=str(current_user.id),
            admin_username=current_user.username or current_user.telegram_id,
            target_user_id=str(user.id),
            target_username=user.username or user.telegram_id,
            old_role="pending",
            new_role="approved",
            success=True,
            db=db
        )

        full_name = f"{user.first_name} {user.last_name}" if user.first_name and user.last_name else user.first_name or user.last_name

        return AdminResponse(
            data={
                "user_id": str(user.id),
                "status": user.status.value,
                "telegram_id": user.telegram_id
            },
            message=f"Utilisateur {full_name or user.username} approuv├® avec succ├¿s",
            success=True
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'approbation: {str(e)}"
        )

@router.post(
    "/users/{user_id}/reject",
    response_model=AdminResponse,
    summary="Rejeter un utilisateur (Admin)",
    description="Rejette un utilisateur en attente"
)
async def reject_user(
    user_id: str,
    rejection_request: UserRejectionRequest = None,
    current_user: User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """Rejette un utilisateur en attente"""
    try:
        # Log de l'acc├¿s admin
        log_admin_access(
            user_id=str(current_user.id),
            username=current_user.username or current_user.telegram_id,
            endpoint="/admin/users/{user_id}/reject",
            success=True
        )

        # Recherche de l'utilisateur
        try:
            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
            user = db.query(User).filter(User.id == user_uuid).first()
        except ValueError:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouv├®"
            )

        if not user:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouv├®"
            )

        if user.status != UserStatus.PENDING:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="L'utilisateur n'est pas en attente d'approbation"
            )

        # Rejeter l'utilisateur
        user.status = UserStatus.REJECTED
        db.commit()
        db.refresh(user)

        # Log du rejet
        log_role_change(
            admin_user_id=str(current_user.id),
            admin_username=current_user.username or current_user.telegram_id,
            target_user_id=str(user.id),
            target_username=user.username or user.telegram_id,
            old_role="pending",
            new_role="rejected",
            success=True,
            db=db
        )

        full_name = f"{user.first_name} {user.last_name}" if user.first_name and user.last_name else user.first_name or user.last_name
        reason = rejection_request.reason if rejection_request and rejection_request.reason else "Aucune raison sp├®cifi├®e"

        return AdminResponse(
            data={
                "user_id": str(user.id),
                "status": user.status.value,
                "reason": reason
            },
            message=f"Utilisateur {full_name or user.username} rejet├® avec succ├¿s",
            success=True
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du rejet: {str(e)}"
        )

@router.post(
    "/health/test-notifications",
    summary="Test des notifications (retiré)",
    description=(
        "Ne déclenche plus d'envoi. Le test de notification sortante via Telegram / bot a été retiré "
        "du périmètre administrateur (cohérent avec le retrait du canal sortant)."
    ),
)
@limiter.limit("5/minute")
async def test_notifications(
    request: Request,
    current_user: User = Depends(require_admin_role_strict())
):
    """Ancien envoi de test vers le bot — désactivé ; réponse informative uniquement."""
    logger.info(
        "POST /admin/health/test-notifications : aucun envoi (canal Telegram / bot retiré pour ce flux admin)"
    )
    return {
        "status": "unavailable",
        "message": (
            "Ce point de terminaison ne déclenche plus d'envoi vers le bot Telegram. "
            "Les tests de notification sortante admin ont été retirés du périmètre API."
        ),
    }
