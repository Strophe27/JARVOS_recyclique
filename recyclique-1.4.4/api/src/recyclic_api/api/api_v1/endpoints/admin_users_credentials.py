"""
Endpoints admin : credentials utilisateur (reset e-mail, forçage mot de passe, reset PIN).

Hors Telegram et hors approve/reject. Préfixe routeur : /admin.
"""

import logging
import uuid
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status as http_status
from sqlalchemy.orm import Session
from slowapi import Limiter

from recyclic_api.core.audit import AuditActionType, log_admin_access, log_audit, log_role_change
from recyclic_api.core.auth import require_admin_role, require_admin_role_strict, send_reset_password_email
from recyclic_api.core.database import get_db
from recyclic_api.core.user_identity import username_or_telegram_id
from recyclic_api.models.user import User, UserRole
from recyclic_api.models.user_status_history import UserStatusHistory
from recyclic_api.schemas.admin import AdminResponse, ForcePasswordRequest

logger = logging.getLogger(__name__)


def register_admin_users_credentials_routes(router: APIRouter, limiter: Limiter) -> None:
    """Enregistre reset-password, force-password, reset-pin."""

    @router.post(
        "/users/{user_id}/reset-password",
        response_model=AdminResponse,
        summary="Déclencher la réinitialisation du mot de passe (Admin)",
        description="Envoie un e-mail de réinitialisation de mot de passe à l'utilisateur spécifié.",
    )
    async def trigger_reset_password(
        user_id: str,
        current_user: User = Depends(require_admin_role),
        db: Session = Depends(get_db),
    ):
        """Déclenche l'envoi d'un e-mail de réinitialisation de mot de passe."""
        try:
            try:
                user_uuid = UUID(user_id)
            except ValueError:
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Utilisateur non trouvé",
                )
            user = db.query(User).filter(User.id == user_uuid).first()

            if not user:
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Utilisateur non trouvé",
                )

            if not user.email:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail="L'utilisateur n'a pas d'adresse e-mail configurée.",
                )

            await send_reset_password_email(user.email, db)

            target_u = username_or_telegram_id(user.username, None)
            admin_u = username_or_telegram_id(current_user.username, None)
            log_audit(
                action_type=AuditActionType.PASSWORD_RESET,
                actor=current_user,
                target_id=user.id,
                target_type="user",
                details={
                    "target_username": target_u,
                    "target_email": user.email,
                    "admin_username": admin_u,
                },
                description=(
                    f"Réinitialisation de mot de passe déclenchée pour "
                    f"{target_u or str(user.id)} par "
                    f"{admin_u or str(current_user.id)}"
                ),
                db=db,
            )

            return AdminResponse(
                message=f"E-mail de réinitialisation de mot de passe envoyé à {user.email}",
                success=True,
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de l'envoi de l'e-mail de réinitialisation: {str(e)}",
            )

    @router.post(
        "/users/{user_id}/force-password",
        response_model=AdminResponse,
        summary="Forcer un nouveau mot de passe (Super Admin uniquement)",
        description="Force un nouveau mot de passe pour un utilisateur. Réservé aux Super Administrateurs uniquement.",
    )
    @limiter.limit("5/minute")
    async def force_user_password(
        user_id: str,
        force_request: ForcePasswordRequest,
        request: Request,
        current_user: User = Depends(require_admin_role_strict()),
        db: Session = Depends(get_db),
    ):
        """Force un nouveau mot de passe pour un utilisateur (Super Admin uniquement)"""
        try:
            if current_user.role != UserRole.SUPER_ADMIN:
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="Cette action est réservée aux Super Administrateurs uniquement",
                )

            log_admin_access(
                user_id=str(current_user.id),
                username=username_or_telegram_id(current_user.username, None),
                endpoint=f"/admin/users/{user_id}/force-password",
                success=True,
            )

            try:
                user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
                target_user = db.query(User).filter(User.id == user_uuid).first()
            except ValueError:
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Utilisateur non trouvé",
                )

            if not target_user:
                log_admin_access(
                    user_id=str(current_user.id),
                    username=username_or_telegram_id(current_user.username, None),
                    endpoint=f"/admin/users/{user_id}/force-password",
                    success=False,
                    error_message="Utilisateur non trouvé",
                )
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Utilisateur non trouvé",
                )

            from recyclic_api.core.security import validate_password_strength

            is_valid, errors = validate_password_strength(force_request.new_password)
            if not is_valid:
                translations = {
                    "Password must be at least 8 characters long": "Le mot de passe doit contenir au moins 8 caractères",
                    "Password must contain at least one uppercase letter": "Le mot de passe doit contenir au moins une lettre majuscule",
                    "Password must contain at least one lowercase letter": "Le mot de passe doit contenir au moins une lettre minuscule",
                    "Password must contain at least one digit": "Le mot de passe doit contenir au moins un chiffre",
                    "Password must contain at least one special character": "Le mot de passe doit contenir au moins un caractère spécial",
                }
                fr_errors = [translations.get(e, e) for e in errors]
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Mot de passe invalide: {' '.join(fr_errors)}",
                )

            from recyclic_api.core.security import hash_password

            new_hashed_password = hash_password(force_request.new_password)
            target_user.hashed_password = new_hashed_password
            db.commit()
            db.refresh(target_user)

            log_role_change(
                admin_user_id=str(current_user.id),
                admin_username=username_or_telegram_id(current_user.username, None) or "",
                target_user_id=str(target_user.id),
                target_username=username_or_telegram_id(target_user.username, None),
                old_role="password_forced",
                new_role="new_password_set_by_super_admin",
                success=True,
                db=db,
            )

            password_force_history = UserStatusHistory(
                user_id=target_user.id,
                changed_by_admin_id=current_user.id,
                old_status=True,
                new_status=True,
                reason=(
                    f"Mot de passe forcé par Super Admin. Raison: "
                    f"{force_request.reason or 'Non spécifiée'}"
                ),
            )
            db.add(password_force_history)
            db.commit()

            target_u = username_or_telegram_id(target_user.username, None)
            admin_u = username_or_telegram_id(current_user.username, None)
            log_audit(
                action_type=AuditActionType.PASSWORD_FORCED,
                actor=current_user,
                target_id=target_user.id,
                target_type="user",
                details={
                    "target_username": target_u,
                    "reason": force_request.reason,
                    "admin_username": admin_u,
                },
                description=(
                    f"Mot de passe forcé pour l'utilisateur "
                    f"{target_u or str(target_user.id)} "
                    f"par Super Admin {admin_u or str(current_user.id)}"
                ),
                db=db,
            )

            full_name = (
                f"{target_user.first_name} {target_user.last_name}"
                if target_user.first_name and target_user.last_name
                else target_user.first_name or target_user.last_name
            )
            display = full_name or target_u
            pwd_msg = (
                f"Mot de passe forcé avec succès pour l'utilisateur {display}"
                if display
                else "Mot de passe forcé avec succès pour l'utilisateur"
            )

            return AdminResponse(
                data={
                    "user_id": str(target_user.id),
                    "action": "password_forced",
                    "reason": force_request.reason,
                    "forced_by": str(current_user.id),
                    "forced_at": datetime.now(timezone.utc).isoformat(),
                },
                message=pwd_msg,
                success=True,
            )

        except HTTPException:
            raise
        except Exception as e:
            log_admin_access(
                user_id=str(current_user.id),
                username=username_or_telegram_id(current_user.username, None),
                endpoint=f"/admin/users/{user_id}/force-password",
                success=False,
                error_message=str(e),
            )
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors du forçage du mot de passe: {str(e)}",
            )

    @router.post(
        "/users/{user_id}/reset-pin",
        response_model=dict,
        summary="Réinitialiser le PIN d'un utilisateur",
        description="Efface le PIN d'un utilisateur, le forçant à en créer un nouveau",
    )
    @limiter.limit("10/minute")
    def reset_user_pin(
        request: Request,
        user_id: str,
        current_user: User = Depends(require_admin_role),
        db: Session = Depends(get_db),
    ):
        """Réinitialise le PIN d'un utilisateur (Admin uniquement)"""
        try:
            log_admin_access(
                user_id=str(current_user.id),
                username=username_or_telegram_id(current_user.username, None),
                endpoint=f"/admin/users/{user_id}/reset-pin",
                success=True,
            )

            try:
                user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
                target_user = db.query(User).filter(User.id == user_uuid).first()
            except ValueError:
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Utilisateur non trouvé",
                )

            if not target_user:
                log_admin_access(
                    user_id=str(current_user.id),
                    username=username_or_telegram_id(current_user.username, None),
                    endpoint=f"/admin/users/{user_id}/reset-pin",
                    success=False,
                    error_message="Utilisateur non trouvé",
                )
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Utilisateur non trouvé",
                )

            target_user.hashed_pin = None
            db.commit()

            target_u = username_or_telegram_id(target_user.username, None)
            admin_u = username_or_telegram_id(current_user.username, None)
            log_audit(
                action_type=AuditActionType.PIN_RESET,
                actor=current_user,
                target_id=target_user.id,
                target_type="user",
                details={
                    "target_username": target_u,
                    "admin_username": admin_u,
                },
                description=(
                    f"PIN réinitialisé pour l'utilisateur {target_u or str(target_user.id)} "
                    f"par Admin {admin_u or str(current_user.id)}"
                ),
                db=db,
            )

            full_name = (
                f"{target_user.first_name} {target_user.last_name}".strip()
                if target_user.first_name and target_user.last_name
                else target_user.first_name or target_user.last_name
            )
            display = full_name or target_u
            logger.info(
                f"PIN reset for user {target_user.id} by admin {current_user.id}",
                extra={
                    "target_user_id": str(target_user.id),
                    "target_username": target_u,
                    "admin_user_id": str(current_user.id),
                    "admin_username": admin_u,
                    "action": "pin_reset",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            )

            pin_msg = (
                f"PIN réinitialisé avec succès pour l'utilisateur {display}"
                if display
                else "PIN réinitialisé avec succès pour l'utilisateur"
            )
            return {
                "message": pin_msg,
                "user_id": str(target_user.id),
                "username": target_user.username,
            }

        except HTTPException:
            raise
        except Exception as e:
            log_admin_access(
                user_id=str(current_user.id),
                username=username_or_telegram_id(current_user.username, None),
                endpoint=f"/admin/users/{user_id}/reset-pin",
                success=False,
                error_message=str(e),
            )
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la réinitialisation du PIN: {str(e)}",
            )
