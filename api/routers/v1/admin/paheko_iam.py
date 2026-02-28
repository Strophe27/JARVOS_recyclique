import json
from datetime import datetime, timezone
from uuid import UUID
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from api.core.deps import require_permissions
from api.db import get_db
from api.models import User
from api.schemas.paheko_iam import (
    PAHEKO_IAM_CONTRACT_VERSION,
    PahekoIamContractResponse,
    PahekoIamExceptionRevokeRequest,
    PahekoIamExceptionRequest,
    PahekoIamGrantGroupRequest,
    PahekoIamGrantPermissionRequest,
    PahekoIamPluginResponse,
    PahekoIamTenantRequest,
)
from api.services.audit import write_audit_event
from api.services.paheko_access import PahekoAccessService
from api.services.paheko_iam_plugin import (
    PahekoIamPluginBusinessError,
    PahekoIamPluginDependencyError,
    PahekoIamPluginService,
)
from api.services.resilience import (
    DEPENDENCY_PAHEKO,
    record_fail_closed_counter,
    write_resilience_audit_event,
)

router = APIRouter(prefix="/paheko/iam", tags=["admin-paheko-iam"])
_Sensitive = Depends(require_permissions("admin", "super_admin"))


def _request_id_from_request(request: Request) -> str:
    return request.headers.get("x-request-id") or request.headers.get("X-Request-Id") or str(uuid4())


def _resolve_idempotency_key(request: Request, body_key: str | None, request_id: str) -> str:
    return (
        request.headers.get("x-idempotency-key")
        or request.headers.get("X-Idempotency-Key")
        or body_key
        or request_id
    )


def _tenant_scope_for_user(user: User) -> str | None:
    return str(user.site_id) if user.site_id else None


def _validate_tenant_scope(*, current_user: User, tenant: str) -> None:
    if current_user.role == "super_admin":
        return
    scope = _tenant_scope_for_user(current_user)
    if not scope:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="tenant_scope_missing",
        )
    if tenant != scope:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="tenant_scope_mismatch",
        )


def _validate_exception_scope(
    *,
    db: Session,
    current_user: User,
    exception_id: UUID | None,
) -> None:
    if current_user.role != "benevole":
        return
    access = PahekoAccessService(db).evaluate_access(user=current_user, permission_codes=set())
    if not access.allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="iam_exception_required")
    if access.exception_id is None or exception_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="iam_exception_required")
    if access.exception_id != exception_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="iam_exception_mismatch")


def _write_plugin_audit(
    *,
    db: Session,
    request_id: str,
    actor: User,
    subject: str | None,
    tenant: str,
    decision: str,
    reason: str,
    operation: str,
    status_code: int,
) -> None:
    details = {
        "request_id": request_id,
        "actor": str(actor.id),
        "subject": subject,
        "role": actor.role,
        "tenant": tenant,
        "decision": decision,
        "reason": reason,
        "operation": operation,
        "status_code": status_code,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "contract_version": PAHEKO_IAM_CONTRACT_VERSION,
    }
    write_audit_event(
        db,
        user_id=actor.id if actor else None,
        action="PAHEKO_IAM_PLUGIN_DECISION",
        resource_type="paheko_iam_plugin",
        resource_id=request_id,
        details=json.dumps(details, ensure_ascii=True),
    )
    db.commit()


def _call_plugin(
    *,
    db: Session,
    request: Request,
    current_user: User,
    method: str,
    path: str,
    tenant: str,
    operation: str,
    subject: str | None,
    payload: dict | None = None,
    idempotency_key: str | None = None,
) -> PahekoIamPluginResponse:
    request_id = _request_id_from_request(request)
    service = PahekoIamPluginService()
    try:
        result = service.request(
            method=method,
            path=path,
            request_id=request_id,
            idempotency_key=idempotency_key,
            payload=payload,
        )
    except PahekoIamPluginDependencyError:
        record_fail_closed_counter()
        write_resilience_audit_event(
            db,
            user_id=current_user.id if current_user else None,
            request_id=request_id,
            dependency=DEPENDENCY_PAHEKO,
            decision="degraded",
            reason="paheko_iam_dependency_unavailable",
            route=request.url.path if request else None,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
        _write_plugin_audit(
            db=db,
            request_id=request_id,
            actor=current_user,
            subject=subject,
            tenant=tenant,
            decision="deny",
            reason="paheko_iam_dependency_unavailable",
            operation=operation,
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
    except PahekoIamPluginBusinessError as exc:
        _write_plugin_audit(
            db=db,
            request_id=request_id,
            actor=current_user,
            subject=subject,
            tenant=tenant,
            decision="deny",
            reason=exc.code,
            operation=operation,
            status_code=exc.status_code,
        )
        raise HTTPException(
            status_code=exc.status_code,
            detail={"error": {"code": exc.code, "message": exc.message}},
        )

    _write_plugin_audit(
        db=db,
        request_id=request_id,
        actor=current_user,
        subject=subject,
        tenant=tenant,
        decision="allow",
        reason="ok",
        operation=operation,
        status_code=result.status_code,
    )
    return PahekoIamPluginResponse(
        data=result.data,
        request_id=request_id,
        contract_version=PAHEKO_IAM_CONTRACT_VERSION,
    )


@router.get("/contract", response_model=PahekoIamContractResponse)
def get_contract(current_user: User = _Sensitive) -> PahekoIamContractResponse:
    return PahekoIamContractResponse(
        idempotency={
            "write_operations": "Idempotency-Key header, fallback to request_id",
            "replay_semantics": "safe replay returns stable result without duplicate side effects",
        },
        error_codes=[
            "bad_request",
            "unauthorized",
            "forbidden",
            "not_found",
            "conflict",
            "validation_error",
            "rate_limited",
            "plugin_error",
            "paheko_iam_dependency_unavailable",
        ],
        endpoints=[
            "GET /v1/admin/paheko/iam/contract",
            "POST /v1/admin/paheko/iam/groups",
            "POST /v1/admin/paheko/iam/permissions",
            "POST /v1/admin/paheko/iam/users/{user_id}/groups",
            "POST /v1/admin/paheko/iam/users/groups/grant",
            "POST /v1/admin/paheko/iam/users/groups/revoke",
            "POST /v1/admin/paheko/iam/groups/permissions/grant",
            "POST /v1/admin/paheko/iam/groups/permissions/revoke",
            "POST /v1/admin/paheko/iam/exceptions/grant",
            "POST /v1/admin/paheko/iam/exceptions/revoke",
        ],
    )


@router.post("/groups", response_model=PahekoIamPluginResponse)
def list_groups(
    body: PahekoIamTenantRequest,
    request: Request,
    current_user: User = _Sensitive,
    db: Session = Depends(get_db),
) -> PahekoIamPluginResponse:
    _validate_tenant_scope(current_user=current_user, tenant=body.tenant)
    return _call_plugin(
        db=db,
        request=request,
        current_user=current_user,
        method="POST",
        path="/groups/list",
        tenant=body.tenant,
        operation="groups_list",
        subject=None,
        payload={"tenant": body.tenant, "contract_version": PAHEKO_IAM_CONTRACT_VERSION},
    )


@router.post("/permissions", response_model=PahekoIamPluginResponse)
def list_permissions(
    body: PahekoIamTenantRequest,
    request: Request,
    current_user: User = _Sensitive,
    db: Session = Depends(get_db),
) -> PahekoIamPluginResponse:
    _validate_tenant_scope(current_user=current_user, tenant=body.tenant)
    return _call_plugin(
        db=db,
        request=request,
        current_user=current_user,
        method="POST",
        path="/permissions/list",
        tenant=body.tenant,
        operation="permissions_list",
        subject=None,
        payload={"tenant": body.tenant, "contract_version": PAHEKO_IAM_CONTRACT_VERSION},
    )


@router.post("/users/{user_id}/groups", response_model=PahekoIamPluginResponse)
def list_user_groups(
    user_id: UUID,
    body: PahekoIamTenantRequest,
    request: Request,
    current_user: User = _Sensitive,
    db: Session = Depends(get_db),
) -> PahekoIamPluginResponse:
    _validate_tenant_scope(current_user=current_user, tenant=body.tenant)
    return _call_plugin(
        db=db,
        request=request,
        current_user=current_user,
        method="POST",
        path="/users/groups/list",
        tenant=body.tenant,
        operation="user_groups_list",
        subject=str(user_id),
        payload={
            "tenant": body.tenant,
            "user_id": str(user_id),
            "contract_version": PAHEKO_IAM_CONTRACT_VERSION,
        },
    )


@router.post("/users/groups/grant", response_model=PahekoIamPluginResponse)
def grant_user_group(
    body: PahekoIamGrantGroupRequest,
    request: Request,
    current_user: User = _Sensitive,
    db: Session = Depends(get_db),
) -> PahekoIamPluginResponse:
    _validate_tenant_scope(current_user=current_user, tenant=body.tenant)
    _validate_exception_scope(db=db, current_user=current_user, exception_id=body.exception_id)
    request_id = _request_id_from_request(request)
    idempotency_key = _resolve_idempotency_key(request, body.idempotency_key, request_id)
    return _call_plugin(
        db=db,
        request=request,
        current_user=current_user,
        method="POST",
        path="/users/groups/grant",
        tenant=body.tenant,
        operation="user_group_grant",
        subject=str(body.user_id),
        idempotency_key=idempotency_key,
        payload={
            "tenant": body.tenant,
            "user_id": str(body.user_id),
            "group_code": body.group_code,
            "reason": body.reason,
            "exception_id": str(body.exception_id) if body.exception_id else None,
            "request_id": request_id,
            "idempotency_key": idempotency_key,
            "contract_version": PAHEKO_IAM_CONTRACT_VERSION,
        },
    )


@router.post("/users/groups/revoke", response_model=PahekoIamPluginResponse)
def revoke_user_group(
    body: PahekoIamGrantGroupRequest,
    request: Request,
    current_user: User = _Sensitive,
    db: Session = Depends(get_db),
) -> PahekoIamPluginResponse:
    _validate_tenant_scope(current_user=current_user, tenant=body.tenant)
    _validate_exception_scope(db=db, current_user=current_user, exception_id=body.exception_id)
    request_id = _request_id_from_request(request)
    idempotency_key = _resolve_idempotency_key(request, body.idempotency_key, request_id)
    return _call_plugin(
        db=db,
        request=request,
        current_user=current_user,
        method="POST",
        path="/users/groups/revoke",
        tenant=body.tenant,
        operation="user_group_revoke",
        subject=str(body.user_id),
        idempotency_key=idempotency_key,
        payload={
            "tenant": body.tenant,
            "user_id": str(body.user_id),
            "group_code": body.group_code,
            "reason": body.reason,
            "exception_id": str(body.exception_id) if body.exception_id else None,
            "request_id": request_id,
            "idempotency_key": idempotency_key,
            "contract_version": PAHEKO_IAM_CONTRACT_VERSION,
        },
    )


@router.post("/groups/permissions/grant", response_model=PahekoIamPluginResponse)
def grant_group_permission(
    body: PahekoIamGrantPermissionRequest,
    request: Request,
    current_user: User = _Sensitive,
    db: Session = Depends(get_db),
) -> PahekoIamPluginResponse:
    _validate_tenant_scope(current_user=current_user, tenant=body.tenant)
    _validate_exception_scope(db=db, current_user=current_user, exception_id=body.exception_id)
    request_id = _request_id_from_request(request)
    idempotency_key = _resolve_idempotency_key(request, body.idempotency_key, request_id)
    return _call_plugin(
        db=db,
        request=request,
        current_user=current_user,
        method="POST",
        path="/groups/permissions/grant",
        tenant=body.tenant,
        operation="group_permission_grant",
        subject=body.group_code,
        idempotency_key=idempotency_key,
        payload={
            "tenant": body.tenant,
            "group_code": body.group_code,
            "permission_code": body.permission_code,
            "reason": body.reason,
            "exception_id": str(body.exception_id) if body.exception_id else None,
            "request_id": request_id,
            "idempotency_key": idempotency_key,
            "contract_version": PAHEKO_IAM_CONTRACT_VERSION,
        },
    )


@router.post("/groups/permissions/revoke", response_model=PahekoIamPluginResponse)
def revoke_group_permission(
    body: PahekoIamGrantPermissionRequest,
    request: Request,
    current_user: User = _Sensitive,
    db: Session = Depends(get_db),
) -> PahekoIamPluginResponse:
    _validate_tenant_scope(current_user=current_user, tenant=body.tenant)
    _validate_exception_scope(db=db, current_user=current_user, exception_id=body.exception_id)
    request_id = _request_id_from_request(request)
    idempotency_key = _resolve_idempotency_key(request, body.idempotency_key, request_id)
    return _call_plugin(
        db=db,
        request=request,
        current_user=current_user,
        method="POST",
        path="/groups/permissions/revoke",
        tenant=body.tenant,
        operation="group_permission_revoke",
        subject=body.group_code,
        idempotency_key=idempotency_key,
        payload={
            "tenant": body.tenant,
            "group_code": body.group_code,
            "permission_code": body.permission_code,
            "reason": body.reason,
            "exception_id": str(body.exception_id) if body.exception_id else None,
            "request_id": request_id,
            "idempotency_key": idempotency_key,
            "contract_version": PAHEKO_IAM_CONTRACT_VERSION,
        },
    )


@router.post("/exceptions/grant", response_model=PahekoIamPluginResponse)
def grant_exception(
    body: PahekoIamExceptionRequest,
    request: Request,
    current_user: User = _Sensitive,
    db: Session = Depends(get_db),
) -> PahekoIamPluginResponse:
    _validate_tenant_scope(current_user=current_user, tenant=body.tenant)
    request_id = _request_id_from_request(request)
    idempotency_key = _resolve_idempotency_key(request, body.idempotency_key, request_id)
    return _call_plugin(
        db=db,
        request=request,
        current_user=current_user,
        method="POST",
        path="/exceptions/grant",
        tenant=body.tenant,
        operation="exception_grant",
        subject=str(body.user_id),
        idempotency_key=idempotency_key,
        payload={
            "tenant": body.tenant,
            "user_id": str(body.user_id),
            "scope": body.scope,
            "expires_at": body.expires_at.isoformat(),
            "reason": body.reason,
            "request_id": request_id,
            "idempotency_key": idempotency_key,
            "contract_version": PAHEKO_IAM_CONTRACT_VERSION,
        },
    )


@router.post("/exceptions/revoke", response_model=PahekoIamPluginResponse)
def revoke_exception(
    body: PahekoIamExceptionRevokeRequest,
    request: Request,
    current_user: User = _Sensitive,
    db: Session = Depends(get_db),
) -> PahekoIamPluginResponse:
    _validate_tenant_scope(current_user=current_user, tenant=body.tenant)
    request_id = _request_id_from_request(request)
    idempotency_key = _resolve_idempotency_key(request, body.idempotency_key, request_id)
    return _call_plugin(
        db=db,
        request=request,
        current_user=current_user,
        method="POST",
        path="/exceptions/revoke",
        tenant=body.tenant,
        operation="exception_revoke",
        subject=str(body.exception_id),
        idempotency_key=idempotency_key,
        payload={
            "tenant": body.tenant,
            "exception_id": str(body.exception_id),
            "reason": body.reason,
            "request_id": request_id,
            "idempotency_key": idempotency_key,
            "contract_version": PAHEKO_IAM_CONTRACT_VERSION,
        },
    )
