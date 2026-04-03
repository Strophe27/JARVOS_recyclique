"""
Endpoints admin : seuil d'activité (lecture / mise à jour du paramètre global).

Enregistrés sur le même ``APIRouter`` que ``admin.py`` (préfixe /admin inchangé).
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status as http_status
from sqlalchemy.orm import Session
from slowapi import Limiter

from recyclic_api.core.audit import log_audit, AuditActionType
from recyclic_api.core.auth import require_admin_role
from recyclic_api.core.database import get_db
from recyclic_api.models.setting import Setting
from recyclic_api.models.user import User
from recyclic_api.services.activity_service import (
    ActivityService,
    DEFAULT_ACTIVITY_THRESHOLD_MINUTES,
)

logger = logging.getLogger(__name__)


def register_admin_activity_threshold_routes(router: APIRouter, limiter: Limiter) -> None:
    """Enregistre GET et PUT /settings/activity-threshold."""

    @router.get(
        "/settings/activity-threshold",
        summary="Récupérer le seuil d'activité",
        description="Récupère le seuil d'activité configuré pour déterminer si un utilisateur est en ligne",
    )
    @limiter.limit("30/minute")
    async def get_activity_threshold(
        request: Request,
        current_user: User = Depends(require_admin_role),
        db: Session = Depends(get_db),
    ):
        """Récupère le seuil d'activité configuré"""
        try:
            setting = db.query(Setting).filter(Setting.key == "activity_threshold_minutes").first()

            if setting:
                threshold = int(setting.value)
            else:
                threshold = DEFAULT_ACTIVITY_THRESHOLD_MINUTES

            return {
                "activity_threshold_minutes": threshold,
                "description": "Seuil en minutes pour considérer un utilisateur comme en ligne",
            }

        except Exception as e:
            logger.error(f"Erreur lors de la récupération du seuil d'activité: {str(e)}")
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la récupération du seuil d'activité: {str(e)}",
            )

    @router.put(
        "/settings/activity-threshold",
        summary="Modifier le seuil d'activité",
        description="Modifie le seuil d'activité pour déterminer si un utilisateur est en ligne",
    )
    @limiter.limit("10/minute")
    async def update_activity_threshold(
        request: Request,
        threshold_data: dict,
        current_user: User = Depends(require_admin_role),
        db: Session = Depends(get_db),
    ):
        """Modifie le seuil d'activité configuré"""
        try:
            threshold = threshold_data.get("activity_threshold_minutes")
            if not isinstance(threshold, int) or threshold < 1 or threshold > 1440:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail="Le seuil doit être un entier entre 1 et 1440 minutes",
                )

            setting = (
                db.query(Setting)
                .filter(Setting.key == "activity_threshold_minutes")
                .with_for_update()
                .first()
            )

            previous_value = setting.value if setting else None

            if setting:
                setting.value = str(threshold)
            else:
                setting = Setting(
                    key="activity_threshold_minutes",
                    value=str(threshold),
                )
                db.add(setting)

            db.commit()
            db.refresh(setting)
            ActivityService.refresh_cache(threshold)

            log_audit(
                action_type=AuditActionType.SETTING_UPDATED,
                actor=current_user,
                details={
                    "setting_key": "activity_threshold_minutes",
                    "old_value": previous_value if previous_value is not None else str(DEFAULT_ACTIVITY_THRESHOLD_MINUTES),
                    "new_value": str(threshold),
                },
                description=f"Seuil d'activité modifié à {threshold} minutes",
                ip_address=getattr(request.client, "host", "unknown") if request.client else "unknown",
                user_agent=request.headers.get("user-agent", "unknown"),
                db=db,
            )

            return {
                "message": f"Seuil d'activité mis à jour à {threshold} minutes",
                "activity_threshold_minutes": threshold,
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour du seuil d'activité: {str(e)}")
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la mise à jour du seuil d'activité: {str(e)}",
            )
