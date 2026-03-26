"""
Endpoints admin : mutations compte utilisateur (rôle, is_active / historique, profil).

Hors Telegram et hors credentials (reset / force mot de passe, reset PIN).
Préfixe routeur : /admin.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status as http_status
from sqlalchemy.orm import Session
from slowapi import Limiter

from recyclic_api.core.audit import log_admin_access, log_role_change
from recyclic_api.core.auth import require_admin_role
from recyclic_api.core.database import get_db
from recyclic_api.core.user_identity import username_or_telegram_id
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.user_status_history import UserStatusHistory
from recyclic_api.schemas.admin import AdminResponse, UserProfileUpdate, UserRoleUpdate
from recyclic_api.schemas.user import UserStatusUpdate


def register_admin_users_mutations_routes(router: APIRouter, limiter: Limiter) -> None:
    """Enregistre PUT /users/{id}/role, PUT /users/{id}/status, PUT /users/{id}."""
    _ = limiter  # API alignée sur les autres register_admin_* ; pas de rate limit sur ces PUT actuellement.

    @router.put(
        "/users/{user_id}/role",
        response_model=AdminResponse,
        summary="Modifier le rôle d'un utilisateur (Admin)",
        description="Met à jour le rôle d'un utilisateur spécifique",
    )
    def update_user_role(
        user_id: str,
        role_update: UserRoleUpdate,
        current_user: User = Depends(require_admin_role),
        db: Session = Depends(get_db),
    ):
        """Met à jour le rôle d'un utilisateur"""
        try:
            log_admin_access(
                user_id=str(current_user.id),
                username=username_or_telegram_id(current_user.username, current_user.telegram_id),
                endpoint="/admin/users/{user_id}/role",
                success=True,
            )

            try:
                user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
                user = db.query(User).filter(User.id == user_uuid).first()
            except ValueError:
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Utilisateur non trouvé",
                )
            if not user:
                log_admin_access(
                    user_id=str(current_user.id),
                    username=username_or_telegram_id(current_user.username, current_user.telegram_id),
                    endpoint="/admin/users/{user_id}/role",
                    success=False,
                    error_message="Utilisateur non trouvé",
                )
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Utilisateur non trouvé",
                )

            if str(user.id) == str(current_user.id):
                admin_roles = [UserRole.SUPER_ADMIN, UserRole.ADMIN]
                if current_user.role in admin_roles and role_update.role not in admin_roles:
                    raise HTTPException(
                        status_code=http_status.HTTP_403_FORBIDDEN,
                        detail="Un administrateur ne peut pas se dégrader lui-même",
                    )

            old_role = user.role
            user.role = role_update.role
            db.commit()
            db.refresh(user)

            log_role_change(
                admin_user_id=str(current_user.id),
                admin_username=current_user.username or current_user.telegram_id,
                target_user_id=str(user.id),
                target_username=user.username or user.telegram_id,
                old_role=old_role.value,
                new_role=user.role.value,
                success=True,
                db=db,
            )

            full_name = (
                f"{user.first_name} {user.last_name}"
                if user.first_name and user.last_name
                else user.first_name or user.last_name
            )

            return AdminResponse(
                data={
                    "user_id": str(user.id),
                    "role": user.role.value,
                    "previous_role": old_role.value,
                },
                message=(
                    f"Rôle de l'utilisateur {full_name or user.username} mis à jour "
                    f"de {old_role.value} vers {user.role.value}"
                ),
                success=True,
            )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la mise à jour du rôle: {str(e)}",
            )

    @router.put(
        "/users/{user_id}/status",
        response_model=AdminResponse,
        summary="Modifier le statut actif d'un utilisateur (Admin)",
        description="Met à jour le statut is_active d'un utilisateur et enregistre l'historique",
    )
    def update_user_status(
        user_id: str,
        status_update: UserStatusUpdate,
        current_user: User = Depends(require_admin_role),
        db: Session = Depends(get_db),
    ):
        """Met à jour le statut is_active d'un utilisateur et enregistre l'historique"""
        try:
            log_admin_access(
                user_id=str(current_user.id),
                username=username_or_telegram_id(current_user.username, current_user.telegram_id),
                endpoint="/admin/users/{user_id}/status",
                success=True,
            )

            try:
                user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
                user = db.query(User).filter(User.id == user_uuid).first()
            except ValueError:
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Utilisateur non trouvé",
                )

            if not user:
                log_admin_access(
                    user_id=str(current_user.id),
                    username=username_or_telegram_id(current_user.username, current_user.telegram_id),
                    endpoint="/admin/users/{user_id}/status",
                    success=False,
                    error_message="Utilisateur non trouvé",
                )
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Utilisateur non trouvé",
                )

            if str(user.id) == str(current_user.id) and not status_update.is_active:
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="Un administrateur ne peut pas se désactiver lui-même",
                )

            old_status = user.is_active

            user.is_active = status_update.is_active
            db.commit()
            db.refresh(user)

            status_history = UserStatusHistory(
                user_id=user.id,
                changed_by_admin_id=current_user.id,
                old_status=old_status,
                new_status=status_update.is_active,
                reason=status_update.reason,
            )
            db.add(status_history)
            db.commit()

            log_role_change(
                admin_user_id=str(current_user.id),
                admin_username=current_user.username or current_user.telegram_id,
                target_user_id=str(user.id),
                target_username=user.username or user.telegram_id,
                old_role=f"is_active={old_status}",
                new_role=f"is_active={status_update.is_active}",
                success=True,
                db=db,
            )

            full_name = (
                f"{user.first_name} {user.last_name}"
                if user.first_name and user.last_name
                else user.first_name or user.last_name
            )
            status_text = "activé" if status_update.is_active else "désactivé"

            return AdminResponse(
                data={
                    "user_id": str(user.id),
                    "is_active": user.is_active,
                    "previous_status": old_status,
                    "reason": status_update.reason,
                },
                message=f"Utilisateur {full_name or user.username} {status_text} avec succès",
                success=True,
            )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la mise à jour du statut: {str(e)}",
            )

    @router.put(
        "/users/{user_id}",
        response_model=AdminResponse,
        summary="Mettre à jour le profil d'un utilisateur (Admin)",
        description="Met à jour les informations de base du profil utilisateur",
    )
    def update_user_profile(
        user_id: str,
        profile_update: UserProfileUpdate,
        current_user: User = Depends(require_admin_role),
        db: Session = Depends(get_db),
    ):
        """Met à jour les informations du profil utilisateur"""
        try:
            log_admin_access(
                user_id=str(current_user.id),
                username=username_or_telegram_id(current_user.username, current_user.telegram_id),
                endpoint="/admin/users/{user_id}",
                success=True,
            )

            try:
                user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
                user = db.query(User).filter(User.id == user_uuid).first()
            except ValueError:
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Utilisateur non trouvé",
                )

            if not user:
                log_admin_access(
                    user_id=str(current_user.id),
                    username=username_or_telegram_id(current_user.username, current_user.telegram_id),
                    endpoint="/admin/users/{user_id}",
                    success=False,
                    error_message="Utilisateur non trouvé",
                )
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Utilisateur non trouvé",
                )

            updated_fields = []
            update_data = profile_update.model_dump(exclude_unset=True)

            if "username" in update_data and update_data["username"] != user.username:
                existing_user = db.query(User).filter(User.username == update_data["username"]).first()
                if existing_user:
                    raise HTTPException(
                        status_code=http_status.HTTP_409_CONFLICT,
                        detail="Ce nom d'utilisateur est déjà pris",
                    )

            if (
                "email" in update_data
                and update_data["email"] is not None
                and update_data["email"] != user.email
            ):
                existing_email_user = (
                    db.query(User)
                    .filter(User.email == update_data["email"], User.id != user.id)
                    .first()
                )
                if existing_email_user:
                    raise HTTPException(
                        status_code=http_status.HTTP_409_CONFLICT,
                        detail="Un compte avec cet email existe déjà",
                    )

            for field, value in update_data.items():
                if hasattr(user, field):
                    setattr(user, field, value)
                    updated_fields.append(field)

            if not updated_fields:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail="Aucun champ à mettre à jour fourni",
                )

            db.commit()
            db.refresh(user)

            log_role_change(
                admin_user_id=str(current_user.id),
                admin_username=current_user.username or current_user.telegram_id,
                target_user_id=str(user.id),
                target_username=user.username or user.telegram_id,
                old_role="profile_update",
                new_role=f"updated_fields={','.join(updated_fields)}",
                success=True,
                db=db,
            )

            full_name = (
                f"{user.first_name} {user.last_name}"
                if user.first_name and user.last_name
                else user.first_name or user.last_name
            )

            return AdminResponse(
                data={
                    "user_id": str(user.id),
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "username": user.username,
                    "role": user.role,
                    "status": user.status,
                    "updated_fields": updated_fields,
                },
                message=f"Profil de l'utilisateur {full_name or user.username} mis à jour avec succès",
                success=True,
            )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la mise à jour du profil: {str(e)}",
            )
