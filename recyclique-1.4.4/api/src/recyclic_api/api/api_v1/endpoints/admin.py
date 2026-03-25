from fastapi import APIRouter, Depends, HTTPException, status as http_status, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging
import io
from pathlib import Path
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from uuid import UUID

from recyclic_api.core.database import get_db
from recyclic_api.core.auth import get_current_user, require_admin_role, require_admin_role_strict, require_role_strict, require_super_admin_role
from recyclic_api.core.audit import log_role_change, log_admin_access, log_audit, AuditActionType
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.user_status_history import UserStatusHistory
from recyclic_api.services.telegram_service import telegram_service
from recyclic_api.schemas.admin import (
    AdminUserList,
    AdminUser,
    UserRoleUpdate,
    AdminResponse,
    AdminErrorResponse,
    PaginationInfo,
    PendingUserResponse,
    UserApprovalRequest,
    UserRejectionRequest,
    UserProfileUpdate,
    UserHistoryResponse,
    UserStatusesResponse,
    ForcePasswordRequest
)
from recyclic_api.schemas.permission import UserGroupUpdateRequest
from recyclic_api.schemas.user import UserStatusUpdate
from recyclic_api.services.user_history_service import UserHistoryService
from recyclic_api.core.auth import send_reset_password_email
from recyclic_api.services.activity_service import ActivityService
from .admin_activity_threshold import register_admin_activity_threshold_routes
from .admin_health import register_admin_health_routes
from .admin_observability import register_admin_observability_routes

router = APIRouter(tags=["admin"])
logger = logging.getLogger(__name__)

# Configuration du rate limiting
limiter = Limiter(key_func=get_remote_address)

register_admin_health_routes(router, limiter)
register_admin_observability_routes(router, limiter)
register_admin_activity_threshold_routes(router, limiter)

# La fonction require_admin_role est maintenant import├®e depuis core.auth

@router.get(
    "/users",
    response_model=List[AdminUser],
    summary="Liste des utilisateurs (Admin)",
    description="R├®cup├¿re la liste des utilisateurs avec filtres optionnels"
)
@limiter.limit("30/minute")
def get_users(
    request: Request,
    skip: int = Query(0, ge=0, description="Nombre d'├®l├®ments ├á ignorer"),
    limit: int = Query(20, ge=1, le=100, description="Nombre d'├®l├®ments par page"),
    role: Optional[UserRole] = Query(None, description="Filtrer par r├┤le"),
    user_status: Optional[UserStatus] = Query(None, description="Filtrer par statut"),
    current_user: User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """R├®cup├¿re la liste des utilisateurs avec filtres"""
    try:
        # Log de l'acc├¿s admin
        log_admin_access(
            user_id=str(current_user.id),
            username=current_user.username or current_user.telegram_id,
            endpoint="/admin/users",
            success=True
        )

        query = db.query(User)

        # Application des filtres
        if role:
            query = query.filter(User.role == role)
        if user_status:
            query = query.filter(User.status == user_status)

        users = query.offset(skip).limit(limit).all()

        # Conversion en AdminUser
        admin_users = []
        for user in users:
            full_name = f"{user.first_name} {user.last_name}" if user.first_name and user.last_name else user.first_name or user.last_name
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
                updated_at=user.updated_at
            )
            admin_users.append(admin_user)

        return admin_users

    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la r├®cup├®ration des utilisateurs: {str(e)}"
        )

@router.get(
    "/users/statuses",
    response_model=UserStatusesResponse,
    summary="Statuts des utilisateurs (Admin)",
    description="R├®cup├¿re les statuts en ligne/hors ligne de tous les utilisateurs"
)
@limiter.limit("30/minute")
def get_users_statuses(
    request: Request,
    current_user: User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """R├®cup├¿re les statuts en ligne/hors ligne de tous les utilisateurs"""
    try:
        # Journalise l'acces admin pour l'endpoint
        log_admin_access(
            user_id=str(current_user.id),
            username=current_user.username or current_user.telegram_id,
            endpoint="/admin/users/statuses",
            success=True
        )

        activity_service = ActivityService(db)
        return activity_service.get_user_statuses_response()

    except Exception as e:
        # Log de l'├®chec
        log_admin_access(
            user_id=str(current_user.id),
            username=current_user.username or current_user.telegram_id,
            endpoint="/admin/users/statuses",
            success=False,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la r├®cup├®ration des statuts: {str(e)}"
        )

@router.put(
    "/users/{user_id}/role",
    response_model=AdminResponse,
    summary="Modifier le r├┤le d'un utilisateur (Admin)",
    description="Met ├á jour le r├┤le d'un utilisateur sp├®cifique"
)
def update_user_role(
    user_id: str,
    role_update: UserRoleUpdate,
    current_user: User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """Met ├á jour le r├┤le d'un utilisateur"""
    try:
        # Log de l'acc├¿s admin
        log_admin_access(
            user_id=str(current_user.id),
            username=current_user.username or current_user.telegram_id,
            endpoint="/admin/users/{user_id}/role",
            success=True
        )

        # Recherche de l'utilisateur - conversion UUID
        try:
            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
            user = db.query(User).filter(User.id == user_uuid).first()
        except ValueError:
            # user_id n'est pas un UUID valide
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouv├®"
            )
        if not user:
            # Log de l'├®chec
            log_admin_access(
                user_id=str(current_user.id),
                username=current_user.username or current_user.telegram_id,
                endpoint="/admin/users/{user_id}/role",
                success=False,
                error_message="Utilisateur non trouv├®"
            )
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouv├®"
            )

        # V├®rifier que l'admin ne se d├®grade pas lui-m├¬me
        if str(user.id) == str(current_user.id):
            # Emp├¬cher la r├®trogradation (admin -> role inf├®rieur)
            admin_roles = [UserRole.SUPER_ADMIN, UserRole.ADMIN]
            if (current_user.role in admin_roles and
                role_update.role not in admin_roles):
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="Un administrateur ne peut pas se d├®grader lui-m├¬me"
                )

        # Mise ├á jour du r├┤le
        old_role = user.role
        user.role = role_update.role
        db.commit()
        db.refresh(user)

        # Log de la modification de r├┤le
        log_role_change(
            admin_user_id=str(current_user.id),
            admin_username=current_user.username or current_user.telegram_id,
            target_user_id=str(user.id),
            target_username=user.username or user.telegram_id,
            old_role=old_role.value,
            new_role=user.role.value,
            success=True,
            db=db
        )

        full_name = f"{user.first_name} {user.last_name}" if user.first_name and user.last_name else user.first_name or user.last_name

        return AdminResponse(
            data={
                "user_id": str(user.id),
                "role": user.role.value,
                "previous_role": old_role.value
            },
            message=f"R├┤le de l'utilisateur {full_name or user.username} mis ├á jour de {old_role.value} vers {user.role.value}",
            success=True
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la mise ├á jour du r├┤le: {str(e)}"
        )

@router.get(
    "/users/pending",
    response_model=List[PendingUserResponse],
    summary="Liste des utilisateurs en attente (Admin)",
    description="R├®cup├¿re la liste des utilisateurs avec le statut 'pending'"
)
def get_pending_users(
    current_user: User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """R├®cup├¿re la liste des utilisateurs en attente d'approbation"""
    try:
        # Log de l'acc├¿s admin
        log_admin_access(
            user_id=str(current_user.id),
            username=current_user.username or current_user.telegram_id,
            endpoint="/admin/users/pending",
            success=True
        )

        # R├®cup├®rer les utilisateurs en attente
        pending_users = db.query(User).filter(User.status == UserStatus.PENDING).all()

        # Conversion en PendingUserResponse
        pending_responses = []
        for user in pending_users:
            full_name = f"{user.first_name} {user.last_name}" if user.first_name and user.last_name else user.first_name or user.last_name
            pending_response = PendingUserResponse(
                id=str(user.id),
                telegram_id=int(user.telegram_id),
                username=user.username,
                first_name=user.first_name,
                last_name=user.last_name,
                full_name=full_name,
                role=user.role,
                status=user.status,
                created_at=user.created_at
            )
            pending_responses.append(pending_response)

        return pending_responses

    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la r├®cup├®ration des utilisateurs en attente: {str(e)}"
        )

@router.post(
    "/users/{user_id}/approve",
    response_model=AdminResponse,
    summary="Approuver un utilisateur (Admin)",
    description="Approuve un utilisateur en attente et envoie une notification"
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

        # Envoyer notification Telegram ├á l'utilisateur
        try:
            user_name = user.first_name or user.username or f"User {user.telegram_id}"
            custom_message = approval_request.message if approval_request else None
            await telegram_service.send_user_approval_notification(
                telegram_id=user.telegram_id,
                user_name=user_name,
                message=custom_message
            )
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi de notification d'approbation: {e}")

        # Notifier les autres admins
        try:
            await telegram_service.notify_admins_user_processed(
                admin_user_id=str(current_user.id),
                target_user_name=user_name,
                action="approved"
            )
        except Exception as e:
            logger.error(f"Erreur lors de la notification admin: {e}")

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

        # Envoyer notification Telegram ├á l'utilisateur
        try:
            user_name = user.first_name or user.username or f"User {user.telegram_id}"
            reason = rejection_request.reason if rejection_request and rejection_request.reason else "Aucune raison sp├®cifi├®e"
            await telegram_service.send_user_rejection_notification(
                telegram_id=user.telegram_id,
                user_name=user_name,
                reason=reason
            )
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi de notification de rejet: {e}")

        # Notifier les autres admins
        try:
            await telegram_service.notify_admins_user_processed(
                admin_user_id=str(current_user.id),
                target_user_name=user_name,
                action="rejected"
            )
        except Exception as e:
            logger.error(f"Erreur lors de la notification admin: {e}")

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

@router.put(
    "/users/{user_id}/status",
    response_model=AdminResponse,
    summary="Modifier le statut actif d'un utilisateur (Admin)",
    description="Met ├á jour le statut is_active d'un utilisateur et enregistre l'historique"
)
def update_user_status(
    user_id: str,
    status_update: UserStatusUpdate,
    current_user: User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """Met ├á jour le statut is_active d'un utilisateur et enregistre l'historique"""
    try:
        # Log de l'acc├¿s admin
        log_admin_access(
            user_id=str(current_user.id),
            username=current_user.username or current_user.telegram_id,
            endpoint="/admin/users/{user_id}/status",
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
            # Log de l'├®chec
            log_admin_access(
                user_id=str(current_user.id),
                username=current_user.username or current_user.telegram_id,
                endpoint="/admin/users/{user_id}/status",
                success=False,
                error_message="Utilisateur non trouv├®"
            )
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouv├®"
            )

        # V├®rifier que l'admin ne se d├®sactive pas lui-m├¬me
        if str(user.id) == str(current_user.id) and not status_update.is_active:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Un administrateur ne peut pas se d├®sactiver lui-m├¬me"
            )

        # Enregistrer l'ancien statut
        old_status = user.is_active

        # Mettre ├á jour le statut de l'utilisateur
        user.is_active = status_update.is_active
        db.commit()
        db.refresh(user)

        # Cr├®er une entr├®e dans l'historique
        status_history = UserStatusHistory(
            user_id=user.id,
            changed_by_admin_id=current_user.id,
            old_status=old_status,
            new_status=status_update.is_active,
            reason=status_update.reason
        )
        db.add(status_history)
        db.commit()

        # Log de la modification de statut
        log_role_change(
            admin_user_id=str(current_user.id),
            admin_username=current_user.username or current_user.telegram_id,
            target_user_id=str(user.id),
            target_username=user.username or user.telegram_id,
            old_role=f"is_active={old_status}",
            new_role=f"is_active={status_update.is_active}",
            success=True,
            db=db
        )

        full_name = f"{user.first_name} {user.last_name}" if user.first_name and user.last_name else user.first_name or user.last_name
        status_text = "activ├®" if status_update.is_active else "d├®sactiv├®"

        return AdminResponse(
            data={
                "user_id": str(user.id),
                "is_active": user.is_active,
                "previous_status": old_status,
                "reason": status_update.reason
            },
            message=f"Utilisateur {full_name or user.username} {status_text} avec succ├¿s",
            success=True
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la mise ├á jour du statut: {str(e)}"
        )

@router.put(
    "/users/{user_id}",
    response_model=AdminResponse,
    summary="Mettre ├á jour le profil d'un utilisateur (Admin)",
    description="Met ├á jour les informations de base du profil utilisateur"
)
def update_user_profile(
    user_id: str,
    profile_update: UserProfileUpdate,
    current_user: User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """Met ├á jour les informations du profil utilisateur"""
    try:
        # Log de l'acc├¿s admin
        log_admin_access(
            user_id=str(current_user.id),
            username=current_user.username or current_user.telegram_id,
            endpoint="/admin/users/{user_id}",
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
            # Log de l'├®chec
            log_admin_access(
                user_id=str(current_user.id),
                username=current_user.username or current_user.telegram_id,
                endpoint="/admin/users/{user_id}",
                success=False,
                error_message="Utilisateur non trouv├®"
            )
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouv├®"
            )

        # Mettre ├á jour les champs fournis
        updated_fields = []
        update_data = profile_update.model_dump(exclude_unset=True)

        # V├®rifier l'unicit├® du nom d'utilisateur si modifi├®
        if 'username' in update_data and update_data['username'] != user.username:
            existing_user = db.query(User).filter(User.username == update_data['username']).first()
            if existing_user:
                raise HTTPException(
                    status_code=http_status.HTTP_409_CONFLICT,
                    detail="Ce nom d'utilisateur est d├®j├á pris"
                )

        # V├®rifier l'unicit├® de l'email si modifi├®
        if 'email' in update_data and update_data['email'] is not None and update_data['email'] != user.email:
            existing_email_user = db.query(User).filter(
                User.email == update_data['email'],
                User.id != user.id
            ).first()
            if existing_email_user:
                raise HTTPException(
                    status_code=http_status.HTTP_409_CONFLICT,
                    detail="Un compte avec cet email existe d├®j├á"
                )

        for field, value in update_data.items():
            if hasattr(user, field):
                setattr(user, field, value)
                updated_fields.append(field)

        if not updated_fields:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Aucun champ ├á mettre ├á jour fourni"
            )

        db.commit()
        db.refresh(user)

        # Log de la modification de profil
        log_role_change(
            admin_user_id=str(current_user.id),
            admin_username=current_user.username or current_user.telegram_id,
            target_user_id=str(user.id),
            target_username=user.username or user.telegram_id,
            old_role="profile_update",
            new_role=f"updated_fields={','.join(updated_fields)}",
            success=True,
            db=db
        )

        full_name = f"{user.first_name} {user.last_name}" if user.first_name and user.last_name else user.first_name or user.last_name

        return AdminResponse(
            data={
                "user_id": str(user.id),
                "first_name": user.first_name,
                "last_name": user.last_name,
                "username": user.username,
                "role": user.role,
                "status": user.status,
                "updated_fields": updated_fields
            },
            message=f"Profil de l'utilisateur {full_name or user.username} mis ├á jour avec succ├¿s",
            success=True
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la mise ├á jour du profil: {str(e)}"
        )

@router.post(
    "/users/{user_id}/reset-password",
    response_model=AdminResponse,
    summary="D├®clencher la r├®initialisation du mot de passe (Admin)",
    description="Envoie un e-mail de r├®initialisation de mot de passe ├á l'utilisateur sp├®cifi├®."
)
async def trigger_reset_password(
    user_id: str,
    current_user: User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """D├®clenche l'envoi d'un e-mail de r├®initialisation de mot de passe."""
    try:
        user_uuid = UUID(user_id)
        user = db.query(User).filter(User.id == user_uuid).first()

        if not user:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouv├®"
            )

        if not user.email:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="L'utilisateur n'a pas d'adresse e-mail configur├®e."
            )

        await send_reset_password_email(user.email, db)

        # Log audit for password reset trigger
        log_audit(
            action_type=AuditActionType.PASSWORD_RESET,
            actor=current_user,
            target_id=user.id,
            target_type="user",
            details={
                "target_username": user.username or user.telegram_id,
                "target_email": user.email,
                "admin_username": current_user.username or current_user.telegram_id
            },
            description=f"R├®initialisation de mot de passe d├®clench├®e pour {user.username or user.telegram_id} par {current_user.username or current_user.telegram_id}",
            db=db
        )

        return AdminResponse(
            message=f"E-mail de r├®initialisation de mot de passe envoy├® ├á {user.email}",
            success=True
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'envoi de l'e-mail de r├®initialisation: {str(e)}"
        )

@router.get(
    "/users/{user_id}/history",
    response_model=UserHistoryResponse,
    summary="Historique d'activit├® d'un utilisateur (Admin)",
    description="R├®cup├¿re la chronologie compl├¿te et filtrable de l'activit├® d'un utilisateur"
)
def get_user_history(
    user_id: str,
    date_from: Optional[datetime] = Query(None, description="Date de d├®but du filtre (format ISO)"),
    date_to: Optional[datetime] = Query(None, description="Date de fin du filtre (format ISO)"),
    event_type: Optional[str] = Query(None, description="Type d'├®v├®nement ├á filtrer (ADMINISTRATION, SESSION CAISSE, VENTE, DEPOT)"),
    skip: int = Query(0, ge=0, description="Nombre d'├®l├®ments ├á ignorer"),
    limit: int = Query(20, ge=1, le=100, description="Nombre d'├®l├®ments par page"),
    current_user: User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """R├®cup├¿re l'historique complet d'activit├® d'un utilisateur"""
    try:
        # Log de l'acc├¿s admin
        log_admin_access(
            user_id=str(current_user.id),
            username=current_user.username or current_user.telegram_id,
            endpoint=f"/admin/users/{user_id}/history",
            success=True
        )

        # R├®cup├®rer le nom de l'utilisateur cible pour une description plus lisible
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


        # Cr├®er le service d'historique
        history_service = UserHistoryService(db)

        # R├®cup├®rer l'historique
        history_response = history_service.get_user_activity_history(
            user_id=user_id,
            date_from=date_from,
            date_to=date_to,
            event_type=event_type,
            skip=skip,
            limit=limit
        )

        return history_response

    except ValueError as e:
        # Log de l'├®chec
        log_admin_access(
            user_id=str(current_user.id),
            username=current_user.username or current_user.telegram_id,
            endpoint=f"/admin/users/{user_id}/history",
            success=False,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        # Log de l'├®chec
        log_admin_access(
            user_id=str(current_user.id),
            username=current_user.username or current_user.telegram_id,
            endpoint=f"/admin/users/{user_id}/history",
            success=False,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la r├®cup├®ration de l'historique: {str(e)}"
        )


@router.post(
    "/health/test-notifications",
    summary="Test des notifications",
    description="Envoie une notification de test pour v├®rifier le syst├¿me de notifications"
)
@limiter.limit("5/minute")
async def test_notifications(
    request: Request,
    current_user: User = Depends(require_admin_role_strict())
):
    """Envoie une notification de test"""
    try:
        await telegram_service.notify_sync_failure(
            file_path="system-test",
            remote_path="notification-test",
            error_message="[TEST] Notification de test du syst├¿me de monitoring - Si vous recevez ce message, le syst├¿me fonctionne correctement !"
        )

        return {
            "status": "success",
            "message": "Notification de test envoy├®e avec succ├¿s"
        }

    except Exception as e:
        logger.error(f"Erreur lors de l'envoi de la notification de test: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'envoi de la notification: {str(e)}"
        )


@router.post(
    "/users/{user_id}/force-password",
    response_model=AdminResponse,
    summary="Forcer un nouveau mot de passe (Super Admin uniquement)",
    description="Force un nouveau mot de passe pour un utilisateur. R├®serv├® aux Super Administrateurs uniquement."
)
@limiter.limit("5/minute")
async def force_user_password(
    user_id: str,
    force_request: ForcePasswordRequest,
    request: Request,
    current_user: User = Depends(require_admin_role_strict()),
    db: Session = Depends(get_db)
):
    """Force un nouveau mot de passe pour un utilisateur (Super Admin uniquement)"""
    try:
        # V├®rifier que l'utilisateur actuel est un Super Admin
        if current_user.role != UserRole.SUPER_ADMIN:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Cette action est r├®serv├®e aux Super Administrateurs uniquement"
            )

        # Log de l'acc├¿s admin
        log_admin_access(
            user_id=str(current_user.id),
            username=current_user.username or current_user.telegram_id,
            endpoint=f"/admin/users/{user_id}/force-password",
            success=True
        )

        # Recherche de l'utilisateur cible
        try:
            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
            target_user = db.query(User).filter(User.id == user_uuid).first()
        except ValueError:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouv├®"
            )

        if not target_user:
            # Log de l'├®chec
            log_admin_access(
                user_id=str(current_user.id),
                username=current_user.username or current_user.telegram_id,
                endpoint=f"/admin/users/{user_id}/force-password",
                success=False,
                error_message="Utilisateur non trouv├®"
            )
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouv├®"
            )

        # Valider la force du nouveau mot de passe
        from recyclic_api.core.security import validate_password_strength
        is_valid, errors = validate_password_strength(force_request.new_password)
        if not is_valid:
            # Translate common English messages to French keywords expected by tests
            translations = {
                "Password must be at least 8 characters long": "Le mot de passe doit contenir au moins 8 caract├¿res",
                "Password must contain at least one uppercase letter": "Le mot de passe doit contenir au moins une lettre majuscule",
                "Password must contain at least one lowercase letter": "Le mot de passe doit contenir au moins une lettre minuscule",
                "Password must contain at least one digit": "Le mot de passe doit contenir au moins un chiffre",
                "Password must contain at least one special character": "Le mot de passe doit contenir au moins un caract├¿re sp├®cial",
            }
            fr_errors = [translations.get(e, e) for e in errors]
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Mot de passe invalide: {' '.join(fr_errors)}",
            )

        # Hasher le nouveau mot de passe
        from recyclic_api.core.security import hash_password
        new_hashed_password = hash_password(force_request.new_password)

        # Sauvegarder l'ancien mot de passe pour l'audit
        old_password_hash = target_user.hashed_password

        # Mettre ├á jour le mot de passe
        target_user.hashed_password = new_hashed_password
        db.commit()
        db.refresh(target_user)

        # Log de l'action de for├ºage de mot de passe
        log_role_change(
            admin_user_id=str(current_user.id),
            admin_username=current_user.username or current_user.telegram_id,
            target_user_id=str(target_user.id),
            target_username=target_user.username or target_user.telegram_id,
            old_role="password_forced",
            new_role=f"new_password_set_by_super_admin",
            success=True,
            db=db
        )

        # Enregistrer l'action dans l'historique utilisateur
        from recyclic_api.models.user_status_history import UserStatusHistory
        password_force_history = UserStatusHistory(
            user_id=target_user.id,
            changed_by_admin_id=current_user.id,
            old_status=True,  # L'utilisateur ├®tait actif
            new_status=True,  # L'utilisateur reste actif
            reason=f"Mot de passe forc├® par Super Admin. Raison: {force_request.reason or 'Non sp├®cifi├®e'}"
        )
        db.add(password_force_history)
        db.commit()

        # Log audit pour le for├ºage de mot de passe
        log_audit(
            action_type=AuditActionType.PASSWORD_FORCED,
            actor=current_user,
            target_id=target_user.id,
            target_type="user",
            details={
                "target_username": target_user.username,
                "target_telegram_id": target_user.telegram_id,
                "reason": force_request.reason,
                "admin_username": current_user.username or current_user.telegram_id
            },
            description=f"Mot de passe forc├® pour l'utilisateur {target_user.username} par Super Admin {current_user.username or current_user.telegram_id}",
            db=db
        )

        full_name = f"{target_user.first_name} {target_user.last_name}" if target_user.first_name and target_user.last_name else target_user.first_name or target_user.last_name

        return AdminResponse(
            data={
                "user_id": str(target_user.id),
                "action": "password_forced",
                "reason": force_request.reason,
                "forced_by": str(current_user.id),
                "forced_at": datetime.now(timezone.utc).isoformat()
            },
            message=f"Mot de passe forc├® avec succ├¿s pour l'utilisateur {full_name or target_user.username}",
            success=True
        )

    except HTTPException:
        raise
    except Exception as e:
        # Log de l'├®chec
        log_admin_access(
            user_id=str(current_user.id),
            username=current_user.username or current_user.telegram_id,
            endpoint=f"/admin/users/{user_id}/force-password",
            success=False,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du for├ºage du mot de passe: {str(e)}"
        )


@router.post(
    "/users/{user_id}/reset-pin",
    response_model=dict,
    summary="R├®initialiser le PIN d'un utilisateur",
    description="Efface le PIN d'un utilisateur, le for├ºant ├á en cr├®er un nouveau"
)
@limiter.limit("10/minute")
def reset_user_pin(
    request: Request,
    user_id: str,
    current_user: User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """R├®initialise le PIN d'un utilisateur (Admin uniquement)"""
    try:
        # Log de l'acc├¿s admin
        log_admin_access(
            user_id=str(current_user.id),
            username=current_user.username or current_user.telegram_id,
            endpoint=f"/admin/users/{user_id}/reset-pin",
            success=True
        )

        # Recherche de l'utilisateur cible
        try:
            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
            target_user = db.query(User).filter(User.id == user_uuid).first()
        except ValueError:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouv├®"
            )

        if not target_user:
            # Log de l'├®chec
            log_admin_access(
                user_id=str(current_user.id),
                username=current_user.username or current_user.telegram_id,
                endpoint=f"/admin/users/{user_id}/reset-pin",
                success=False,
                error_message="Utilisateur non trouv├®"
            )
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouv├®"
            )

        # Effacer le PIN (mettre ├á NULL)
        target_user.hashed_pin = None
        db.commit()

        # Log audit pour la r├®initialisation de PIN
        log_audit(
            action_type=AuditActionType.PIN_RESET,
            actor=current_user,
            target_id=target_user.id,
            target_type="user",
            details={
                "target_username": target_user.username,
                "target_telegram_id": target_user.telegram_id,
                "admin_username": current_user.username or current_user.telegram_id
            },
            description=f"PIN r├®initialis├® pour l'utilisateur {target_user.username} par Admin {current_user.username or current_user.telegram_id}",
            db=db
        )

        # Log de l'action
        full_name = f"{target_user.first_name} {target_user.last_name}".strip() if target_user.first_name and target_user.last_name else target_user.first_name or target_user.last_name
        logger.info(
            f"PIN reset for user {target_user.id} by admin {current_user.id}",
            extra={
                "target_user_id": str(target_user.id),
                "target_username": target_user.username,
                "admin_user_id": str(current_user.id),
                "admin_username": current_user.username or current_user.telegram_id,
                "action": "pin_reset",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

        return {
            "message": f"PIN r├®initialis├® avec succ├¿s pour l'utilisateur {full_name or target_user.username}",
            "user_id": str(target_user.id),
            "username": target_user.username
        }

    except HTTPException:
        raise
    except Exception as e:
        # Log de l'├®chec
        log_admin_access(
            user_id=str(current_user.id),
            username=current_user.username or current_user.telegram_id,
            endpoint=f"/admin/users/{user_id}/reset-pin",
            success=False,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la r├®initialisation du PIN: {str(e)}"
        )


@router.put(
    "/users/{user_id}/groups",
    response_model=AdminResponse,
    summary="Mettre à jour les groupes d'un utilisateur (Admin)",
    description="Met à jour l'assignation des groupes pour un utilisateur spécifique"
)
def update_user_groups(
    user_id: str,
    group_update: UserGroupUpdateRequest,
    current_user: User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """Met à jour les groupes d'un utilisateur."""
    try:
        # Log de l'accès admin
        log_admin_access(
            user_id=str(current_user.id),
            username=current_user.username or current_user.telegram_id,
            endpoint="/admin/users/{user_id}/groups",
            success=True
        )

        # Recherche de l'utilisateur
        try:
            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
            user = db.query(User).filter(User.id == user_uuid).first()
        except ValueError:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouvé"
            )

        if not user:
            # Log de l'échec
            log_admin_access(
                user_id=str(current_user.id),
                username=current_user.username or current_user.telegram_id,
                endpoint="/admin/users/{user_id}/groups",
                success=False,
                error_message="Utilisateur non trouvé"
            )
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouvé"
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
                        detail=f"Groupe non trouvé: {group_id}"
                    )
                group_uuids.append(group_uuid)
            except ValueError:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail=f"ID de groupe invalide: {group_id}"
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
            admin_username=current_user.username or current_user.telegram_id,
            target_user_id=str(user.id),
            target_username=user.username or user.telegram_id,
            old_role=f"groups={previous_group_names}",
            new_role=f"groups={[g.name for g in existing_groups]}",
            success=True,
            db=db
        )

        full_name = f"{user.first_name} {user.last_name}" if user.first_name and user.last_name else user.first_name or user.last_name
        group_names = [group.name for group in existing_groups]

        return AdminResponse(
            data={
                "user_id": str(user.id),
                "group_ids": group_update.group_ids,
                "group_names": group_names
            },
            message=f"Groupes de l'utilisateur {full_name or user.username} mis à jour avec succès",
            success=True
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la mise à jour des groupes: {str(e)}"
        )


@router.get(
    "/templates/reception-offline.csv",
    summary="Télécharger le template CSV offline pour les réceptions",
    description="Retourne un fichier CSV modèle vierge pour la saisie manuelle des réceptions en cas de panne réseau. Nécessite ADMIN ou SUPER_ADMIN.",
)
async def download_reception_offline_template(
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Génère et retourne le template CSV offline pour les réceptions.
    
    Le template contient les colonnes suivantes:
    - date: Format ISO 8601 (YYYY-MM-DD)
    - category: Nom exact de la catégorie en base
    - poids_kg: Nombre décimal avec 2 décimales (ex: 12.50)
    - destination: MAGASIN, RECYCLAGE, ou DECHETERIE
    - notes: Texte libre (optionnel)
    
    Le fichier est encodé en UTF-8 avec BOM pour compatibilité Excel.
    """
    try:
        # Importer le script de génération
        import sys
        scripts_path = Path(__file__).parent.parent.parent.parent.parent.parent / "scripts"
        if str(scripts_path) not in sys.path:
            sys.path.insert(0, str(scripts_path))
        
        # Importer et exécuter la fonction de génération
        from generate_offline_template import generate_template_csv
        
        # Générer le contenu CSV
        csv_content = generate_template_csv()
        
        # Nom du fichier
        filename = "template-reception-offline.csv"
        
        # Log de l'accès admin
        log_admin_access(
            str(current_user.id),
            current_user.username or "Unknown",
            "/admin/templates/reception-offline.csv",
            success=True
        )
        
        # Retourner le fichier en streaming
        return StreamingResponse(
            io.BytesIO(csv_content),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except ImportError as e:
        logger.error(f"Erreur lors de l'import du script de génération: {e}", exc_info=True)
        log_admin_access(
            str(current_user.id),
            current_user.username or "Unknown",
            "/admin/templates/reception-offline.csv",
            success=False,
            error_message=f"import_error: {str(e)}"
        )
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la génération du template"
        )
    except Exception as e:
        logger.error(f"Erreur lors de la génération du template: {e}", exc_info=True)
        log_admin_access(
            str(current_user.id),
            current_user.username or "Unknown",
            "/admin/templates/reception-offline.csv",
            success=False,
            error_message=f"generation_error: {str(e)}"
        )
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la génération du template"
        )


@router.post(
    "/cash-sessions/fix-blocked-deferred",
    summary="Corriger les sessions différées bloquées (Super Admin uniquement)",
    description="Ferme ou supprime les sessions différées ouvertes qui sont bloquées (opened_at dans le passé)."
)
async def fix_blocked_deferred_sessions(
    current_user: User = Depends(require_super_admin_role()),
    db: Session = Depends(get_db)
):
    """
    Corrige les sessions différées bloquées en :
    - Fermant les sessions avec transactions (avec montant théorique calculé)
    - Supprimant les sessions vides
    
    Cette opération est sécurisée et ne supprime que les sessions différées ouvertes
    qui sont à plus de 90 jours dans le passé (opened_at < NOW() - 90 jours).
    """
    from recyclic_api.models.cash_session import CashSession, CashSessionStatus
    from recyclic_api.models.sale import Sale
    from sqlalchemy import func
    from datetime import timedelta
    
    try:
        now = datetime.now(timezone.utc)
        # Seuil de 90 jours : identifier les sessions différées créées avec opened_at
        # explicitement défini dans le passé lointain (cohérent avec les autres méthodes)
        threshold = now - timedelta(days=90)
        
        # Récupérer toutes les sessions différées ouvertes (opened_at à plus de 90 jours dans le passé)
        blocked_sessions = db.query(CashSession).filter(
            CashSession.status == CashSessionStatus.OPEN,
            CashSession.opened_at < threshold
        ).all()
        
        fixed_count = 0
        deleted_count = 0
        errors = []
        
        for session in blocked_sessions:
            try:
                # Compter les ventes réelles
                sales_count = db.query(Sale).filter(Sale.cash_session_id == session.id).count()
                
                # Vérifier si la session est vide
                is_empty = (session.total_sales is None or session.total_sales == 0) and \
                          (session.total_items is None or session.total_items == 0) and \
                          sales_count == 0
                
                if is_empty:
                    # Session vide : supprimer
                    db.delete(session)
                    deleted_count += 1
                    logger.info(f"Session {session.id} supprimée (vide)")
                else:
                    # Session avec transactions : fermer avec montant théorique
                    total_donations = db.query(func.coalesce(func.sum(Sale.donation), 0)).filter(
                        Sale.cash_session_id == session.id
                    ).scalar() or 0.0
                    total_donations = float(total_donations)
                    
                    theoretical_amount = (session.initial_amount or 0.0) + (session.total_sales or 0.0) + total_donations
                    
                    session.status = CashSessionStatus.CLOSED
                    session.closed_at = datetime.now(timezone.utc)
                    session.variance = 0.0
                    session.variance_comment = "Fermeture automatique - session différée bloquée"
                    
                    fixed_count += 1
                    logger.info(f"Session {session.id} fermée (montant théorique: {theoretical_amount:.2f}€)")
            except Exception as e:
                error_msg = f"Erreur lors du traitement de la session {session.id}: {str(e)}"
                errors.append(error_msg)
                logger.error(error_msg)
        
        db.commit()
        
        return {
            "status": "success",
            "message": f"Correction terminée: {fixed_count} session(s) fermée(s), {deleted_count} session(s) supprimée(s)",
            "fixed_count": fixed_count,
            "deleted_count": deleted_count,
            "errors": errors if errors else None
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur lors de la correction des sessions bloquées: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la correction: {str(e)}"
        )


@router.post(
    "/cash-sessions/merge-duplicate-deferred",
    response_model=AdminResponse,
    summary="Fusionner les sessions différées dupliquées pour une même date (Super Admin uniquement)",
    description="Ferme les sessions différées dupliquées (même opérateur, même date) en gardant seulement la première. Les ventes sont préservées."
)
async def merge_duplicate_deferred_sessions(
    operator_id: str = Query(..., description="ID de l'opérateur"),
    date: str = Query(..., description="Date au format YYYY-MM-DD"),
    current_user: User = Depends(require_super_admin_role()),
    db: Session = Depends(get_db)
):
    """Fusionne les sessions différées dupliquées pour un opérateur et une date donnés."""
    from datetime import datetime, timezone, timedelta
    from recyclic_api.models.cash_session import CashSession, CashSessionStatus
    from recyclic_api.services.cash_session_service import CashSessionService
    from uuid import UUID
    
    try:
        # Parser la date
        target_date = datetime.strptime(date, "%Y-%m-%d")
        target_date = target_date.replace(tzinfo=timezone.utc)
        
        # Calculer le début et la fin de la journée
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        
        now = datetime.now(timezone.utc)
        operator_uuid = UUID(operator_id)
        
        # Trouver toutes les sessions différées ouvertes pour cette date et cet opérateur
        duplicate_sessions = db.query(CashSession).filter(
            CashSession.operator_id == operator_uuid,
            CashSession.status == CashSessionStatus.OPEN,
            CashSession.opened_at < now,
            CashSession.opened_at >= start_of_day,
            CashSession.opened_at < end_of_day
        ).order_by(CashSession.opened_at).all()
        
        if len(duplicate_sessions) <= 1:
            return {
                "status": "success",
                "message": f"Aucune session dupliquée trouvée pour cette date."
            }
        
        # Garder la première session (la plus ancienne)
        main_session = duplicate_sessions[0]
        sessions_to_close = duplicate_sessions[1:]
        
        service = CashSessionService(db)
        closed_count = 0
        
        for session in sessions_to_close:
            # Fermer la session dupliquée
            if service.is_session_empty(session):
                service.delete_session(str(session.id))
            else:
                service.close_session_with_amounts(
                    str(session.id), 
                    actual_amount=0.0, 
                    variance_comment=f"Fermeture automatique - session dupliquée fusionnée avec session {main_session.id}"
                )
            closed_count += 1
            logger.info(f"Session dupliquée fermée: {session.id} (fusionnée avec {main_session.id})")
        
        db.commit()
        
        return {
            "status": "success",
            "message": f"{closed_count} session(s) dupliquée(s) fermée(s). Session principale conservée: {main_session.id}"
        }
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Format de date invalide. Utilisez YYYY-MM-DD. Erreur: {str(e)}"
        )


