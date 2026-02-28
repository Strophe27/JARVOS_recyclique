# RecyClique API — Dépendances partagées (Story 3.1, 3.2).
# get_current_user : validation JWT et injection User sur routes protégées.
# require_permissions : vérification RBAC (au moins une des permissions listées).

from uuid import UUID, uuid4
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from api.db import get_db
from api.models import User
from api.services.auth import AuthService
from api.services.permissions import get_user_permission_codes_from_user
from api.services.paheko_access import PahekoAccessService
from api.services.resilience import (
    DEPENDENCY_IDP,
    DEPENDENCY_PAHEKO,
    get_resilience_snapshot,
    record_fail_closed_counter,
    write_resilience_audit_event,
)

security = HTTPBearer(auto_error=False)


def _request_id_from_request(request: Request) -> str:
    return (
        (request.headers.get("x-request-id") if request else None)
        or (request.headers.get("X-Request-Id") if request else None)
        or str(uuid4())
    )


def _permission_codes_with_role_implicits(
    base_codes: set[str],
    role: str | None,
) -> set[str]:
    role_norm = (role or "").strip()
    enriched = set(base_codes)
    if role_norm == "super_admin":
        enriched.update({"super_admin", "admin"})
    elif role_norm == "admin":
        enriched.add("admin")
    return enriched


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Dépendance : utilisateur connecté via JWT Bearer ou cookie session BFF."""
    auth = AuthService(db)
    request_id = _request_id_from_request(request)
    user = None
    unauth_reason: str | None = None
    unauth_already_audited = False

    if credentials is not None:
        token = credentials.credentials
        user_id_str = auth.decode_access_token(token)
        if user_id_str is not None:
            try:
                user_id = UUID(user_id_str)
                user = auth.get_user_by_id(user_id)
            except ValueError:
                user = None
                unauth_reason = "invalid_access_token"
        else:
            unauth_reason = "invalid_access_token"

    if user is None and request is not None:
        session_token = request.cookies.get(auth.settings.auth_session_cookie_name)
        if session_token:
            session_row = auth.find_bff_session(session_token)
            if session_row is not None:
                user = auth.get_user_by_id(session_row.user_id)
            else:
                record_fail_closed_counter()
                auth.log_security_event(
                    event="FAIL_CLOSED_TRIGGERED",
                    request_id=request_id,
                    success=False,
                    details={
                        "dependency": DEPENDENCY_IDP,
                        "decision": "deny",
                        "reason": "invalid_bff_session",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                )
                write_resilience_audit_event(
                    db,
                    user_id=None,
                    request_id=request_id,
                    dependency=DEPENDENCY_IDP,
                    decision="deny",
                    reason="invalid_bff_session",
                    route=request.url.path if request else None,
                    status_code=status.HTTP_401_UNAUTHORIZED,
                )
                unauth_already_audited = True
                unauth_reason = "invalid_bff_session"

    if user is None:
        if not unauth_already_audited:
            reason = unauth_reason or "not_authenticated"
            record_fail_closed_counter()
            auth.log_security_event(
                event="FAIL_CLOSED_TRIGGERED",
                request_id=request_id,
                success=False,
                details={
                    "dependency": DEPENDENCY_IDP,
                    "decision": "deny",
                    "reason": reason,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            )
            write_resilience_audit_event(
                db,
                user_id=None,
                request_id=request_id,
                dependency=DEPENDENCY_IDP,
                decision="deny",
                reason=reason,
                route=request.url.path if request else None,
                status_code=status.HTTP_401_UNAUTHORIZED,
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active",
        )
    return user


def require_permissions(
    *permission_codes: str,
):
    """Dépendance : utilisateur connecté ET possédant au moins une des permissions (OR). 403 sinon.
    Usage : current_user = Depends(require_permissions(\"admin\")) ou require_permissions(\"caisse.access\", \"admin\").
    """

    def _check(
        request: Request,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        if not permission_codes:
            return current_user
        required_codes = set(permission_codes)
        raw_codes = get_user_permission_codes_from_user(db, current_user)
        codes = _permission_codes_with_role_implicits(raw_codes, current_user.role)
        request_id = _request_id_from_request(request)
        path = request.url.path.lower() if request and request.url and request.url.path else ""
        is_paheko_surface = "paheko" in path or any("paheko" in p for p in permission_codes)
        if is_paheko_surface:
            auth = AuthService(db)
            resilience = get_resilience_snapshot()
            paheko_state = resilience["dependencies"].get(DEPENDENCY_PAHEKO, {})
            if paheko_state.get("status") == "degraded":
                record_fail_closed_counter()
                reason = paheko_state.get("last_reason") or "paheko_dependency_unavailable"
                auth.log_security_event(
                    event="FAIL_CLOSED_TRIGGERED",
                    request_id=request_id,
                    success=False,
                    details={
                        "dependency": DEPENDENCY_PAHEKO,
                        "decision": "degraded",
                        "reason": reason,
                        "path": path,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                )
                write_resilience_audit_event(
                    db,
                    user_id=current_user.id if current_user else None,
                    request_id=request_id,
                    dependency=DEPENDENCY_PAHEKO,
                    decision="degraded",
                    reason=reason,
                    route=path,
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail={
                        "error": {
                            "code": "paheko_iam_dependency_unavailable",
                            "message": "Service temporairement indisponible",
                        }
                    },
                )
            paheko_access = PahekoAccessService(db)
            decision = paheko_access.evaluate_access(
                user=current_user,
                permission_codes=raw_codes,
            )
            decision_details = {
                "request_id": request_id,
                "role": current_user.role,
                "decision": "allow" if decision.allowed else "deny",
                "reason": decision.reason,
                "dependency": "iam",
                "path": path,
                "timestamp": datetime.now(timezone.utc).isoformat(),
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
            if not decision.allowed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Acces reserve roles autorises",
                )
            # Surface Paheko sensible: policy IAM dediee ET intersection stricte des permissions.
            if not codes.intersection(required_codes):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions",
                )
            return current_user
        if not codes.intersection(required_codes):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return _check
