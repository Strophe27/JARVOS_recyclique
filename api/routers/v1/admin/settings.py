# Story 8.4, 17.6 — GET/PUT /v1/admin/settings (persistance BDD).

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.core.deps import require_permissions
from api.db import get_db
from api.models import User
from api.services import admin_settings as admin_settings_service

router = APIRouter(prefix="/settings", tags=["admin-settings"])
_SuperAdmin = Depends(require_permissions("super_admin"))


class SettingsResponse(BaseModel):
    """Paramètres opérationnels (lecture)."""
    alert_thresholds: dict | None = None
    session: dict | None = None
    email: dict | None = None
    activity_threshold: float | None = None


class SettingsUpdateBody(BaseModel):
    """Body partiel pour PUT /v1/admin/settings."""
    alert_thresholds: dict | None = None
    session: dict | None = None
    email: dict | None = None
    activity_threshold: float | None = None


@router.get("", response_model=SettingsResponse)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = _SuperAdmin,
) -> SettingsResponse:
    """GET /v1/admin/settings — lecture paramètres depuis BDD."""
    data = admin_settings_service.get_settings(db)
    return SettingsResponse(
        alert_thresholds=data.get("alert_thresholds") or {},
        session=data.get("session") or {},
        email=data.get("email") or {},
        activity_threshold=data.get("activity_threshold"),
    )


@router.put("", response_model=SettingsResponse)
def put_settings(
    body: SettingsUpdateBody,
    db: Session = Depends(get_db),
    current_user: User = _SuperAdmin,
) -> SettingsResponse:
    """PUT /v1/admin/settings — mise à jour et persistance en BDD."""
    payload = body.model_dump(exclude_unset=True)
    if not payload:
        data = admin_settings_service.get_settings(db)
    else:
        data = admin_settings_service.put_settings(db, payload)
    return SettingsResponse(
        alert_thresholds=data.get("alert_thresholds") or {},
        session=data.get("session") or {},
        email=data.get("email") or {},
        activity_threshold=data.get("activity_threshold"),
    )


@router.post("/email/test")
def post_settings_email_test(
    db: Session = Depends(get_db),
    current_user: User = _SuperAdmin,
) -> dict:
    """POST /v1/admin/settings/email/test — envoi email de test selon config admin."""
    from api.services.email_test import send_test_email

    return send_test_email(db)
