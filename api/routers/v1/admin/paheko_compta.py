# Story 8.6 — GET /v1/admin/paheko-compta-url (URL admin Paheko pour compta, admin only).

from datetime import datetime
from uuid import UUID
from uuid import uuid4
from urllib.parse import urlparse, urlunparse

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from api.config.settings import get_settings
from api.core.deps import get_current_user, require_permissions
from api.db import get_db
from api.models import User
from api.services.auth import AuthService
from api.services.permissions import get_user_permission_codes_from_user
from api.services.paheko_access import PahekoAccessDecision, PahekoAccessService

router = APIRouter(tags=["admin-paheko-compta"])
_Admin = Depends(require_permissions("admin", "super_admin"))
_EXCEPTION_MANAGERS = {"admin", "super_admin"}


class PahekoComptaUrlResponse(BaseModel):
    """URL de l'interface d'administration Paheko (section Comptabilité)."""
    url: str


class PahekoAccessDecisionResponse(BaseModel):
    allowed: bool
    reason: str
    exception_id: UUID | None = None


class PahekoAccessExceptionGrantRequest(BaseModel):
    user_id: UUID
    requested_by_user_id: UUID
    reason: str = Field(..., min_length=3, max_length=1000)
    expires_at: datetime


class PahekoAccessExceptionRevokeRequest(BaseModel):
    revocation_reason: str = Field(..., min_length=3, max_length=1000)


class PahekoAccessExceptionResponse(BaseModel):
    id: UUID
    user_id: UUID
    requested_by_user_id: UUID | None
    approved_by_user_id: UUID | None
    reason: str
    expires_at: datetime
    revoked_at: datetime | None
    revoked_by_user_id: UUID | None
    revocation_reason: str | None
    created_at: datetime


def _paheko_admin_base_url(plugin_url: str | None) -> str | None:
    """Dérive l'URL admin Paheko (origine + /admin/) depuis PAHEKO_PLUGIN_URL."""
    if not plugin_url or not plugin_url.strip():
        return None
    parsed = urlparse(plugin_url)
    # origine = scheme + netloc (sans path)
    base = urlunparse((parsed.scheme, parsed.netloc, "", "", "", ""))
    return f"{base.rstrip('/')}/admin/"


def _request_id_from_request(request: Request) -> str:
    return request.headers.get("x-request-id") or request.headers.get("X-Request-Id") or str(uuid4())


def _decision_to_response(decision: PahekoAccessDecision) -> PahekoAccessDecisionResponse:
    return PahekoAccessDecisionResponse(
        allowed=decision.allowed,
        reason=decision.reason,
        exception_id=decision.exception_id,
    )


def _serialize_exception(row) -> PahekoAccessExceptionResponse:
    return PahekoAccessExceptionResponse(
        id=row.id,
        user_id=row.user_id,
        requested_by_user_id=row.requested_by_user_id,
        approved_by_user_id=row.approved_by_user_id,
        reason=row.reason,
        expires_at=row.expires_at,
        revoked_at=row.revoked_at,
        revoked_by_user_id=row.revoked_by_user_id,
        revocation_reason=row.revocation_reason,
        created_at=row.created_at,
    )


@router.get("/paheko-access", response_model=PahekoAccessDecisionResponse)
def get_paheko_access_decision(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PahekoAccessDecisionResponse:
    """Signal serveur autoritatif pour la decision d'acces Paheko (role + exception active)."""
    request_id = _request_id_from_request(request)
    auth = AuthService(db)
    paheko_access = PahekoAccessService(db)
    raw_codes = get_user_permission_codes_from_user(db, current_user)
    decision = paheko_access.evaluate_access(user=current_user, permission_codes=raw_codes)
    decision_details = {
        "request_id": request_id,
        "role": current_user.role,
        "decision": "allow" if decision.allowed else "deny",
        "reason": decision.reason,
        "path": request.url.path,
    }
    if decision.exception_id is not None:
        decision_details["exception_id"] = str(decision.exception_id)
    auth.log_security_event(
        event="PAHEKO_ACCESS_GRANTED" if decision.allowed else "PAHEKO_ACCESS_DENIED",
        request_id=request_id,
        success=decision.allowed,
        details=decision_details,
    )
    paheko_access.write_audit_event(
        user_id=current_user.id,
        action="paheko_access_decision",
        details=decision_details,
    )
    return _decision_to_response(decision)


@router.get("/paheko-compta-url", response_model=PahekoComptaUrlResponse)
def get_paheko_compta_url(current_user: User = _Admin) -> PahekoComptaUrlResponse:
    """GET /v1/admin/paheko-compta-url — URL pour accéder à l'admin compta Paheko (admin only)."""
    settings = get_settings()
    url = _paheko_admin_base_url(settings.paheko_plugin_url)
    if not url:
        raise HTTPException(status_code=404, detail="Paheko URL not configured")
    return PahekoComptaUrlResponse(url=url)


@router.post(
    "/paheko-access/exceptions",
    response_model=PahekoAccessExceptionResponse,
    status_code=status.HTTP_201_CREATED,
)
def grant_paheko_access_exception(
    payload: PahekoAccessExceptionGrantRequest,
    request: Request,
    current_user: User = _Admin,
    db: Session = Depends(get_db),
) -> PahekoAccessExceptionResponse:
    """Octroie une exception explicite et temporelle d'acces Paheko pour un benevole."""
    if current_user.role not in _EXCEPTION_MANAGERS:
        raise HTTPException(status_code=403, detail="Acces reserve roles autorises")
    service = PahekoAccessService(db)
    request_id = _request_id_from_request(request)
    try:
        row = service.grant_benevole_exception(
            user_id=payload.user_id,
            requested_by_user_id=payload.requested_by_user_id,
            approved_by_user_id=current_user.id,
            reason=payload.reason,
            expires_at=payload.expires_at,
            request_id=request_id,
        )
    except ValueError as exc:
        reason = str(exc)
        if reason == "user_not_found":
            raise HTTPException(status_code=404, detail=reason)
        raise HTTPException(status_code=400, detail=reason)
    return _serialize_exception(row)


@router.post(
    "/paheko-access/exceptions/{exception_id}/revoke",
    response_model=PahekoAccessExceptionResponse,
)
def revoke_paheko_access_exception(
    exception_id: UUID,
    payload: PahekoAccessExceptionRevokeRequest,
    request: Request,
    current_user: User = _Admin,
    db: Session = Depends(get_db),
) -> PahekoAccessExceptionResponse:
    """Revoque explicitement une exception d'acces Paheko."""
    if current_user.role not in _EXCEPTION_MANAGERS:
        raise HTTPException(status_code=403, detail="Acces reserve roles autorises")
    service = PahekoAccessService(db)
    request_id = _request_id_from_request(request)
    try:
        row = service.revoke_exception(
            exception_id=exception_id,
            revoked_by_user_id=current_user.id,
            revocation_reason=payload.revocation_reason,
            request_id=request_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if row is None:
        raise HTTPException(status_code=404, detail="exception_not_found")
    return _serialize_exception(row)
