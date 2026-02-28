from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from api.core.deps import require_permissions
from api.db import get_db
from api.models import User
from api.services.member_sync import MemberSyncService
from api.services.resilience import (
    DEPENDENCY_PAHEKO,
    record_fail_closed_counter,
    write_resilience_audit_event,
)

router = APIRouter(prefix="/paheko/members", tags=["admin-paheko-members"])
_Admin = Depends(require_permissions("admin"))


class SyncCountersResponse(BaseModel):
    created: int
    updated: int
    deleted: int
    errors: int
    conflicts: int


class MemberSyncRunResponse(BaseModel):
    request_id: str
    status: str
    counters: SyncCountersResponse
    watermark: datetime | None
    cursor: str | None
    message: str | None = None


class MemberSyncStatusResponse(BaseModel):
    last_sync_at: datetime | None
    last_success_at: datetime | None
    last_status: str
    last_request_id: str | None
    last_error: str | None
    watermark: datetime | None
    last_cursor: str | None
    counters: SyncCountersResponse
    contract_fields: list[str] = Field(default_factory=list)
    excluded_local_user_fields: list[str] = Field(default_factory=list)


class SyncTriggerBody(BaseModel):
    force_full: bool = False


@router.get("/sync/status", response_model=MemberSyncStatusResponse)
def get_member_sync_status(
    db: Session = Depends(get_db),
    current_user: User = _Admin,
) -> MemberSyncStatusResponse:
    service = MemberSyncService(db)
    status_data = service.get_last_status()
    return MemberSyncStatusResponse.model_validate(status_data)


@router.post("/sync", response_model=MemberSyncRunResponse)
def trigger_member_sync(
    body: SyncTriggerBody,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = _Admin,
) -> MemberSyncRunResponse:
    service = MemberSyncService(db)
    request_id = request.headers.get("x-request-id") or request.headers.get("X-Request-Id") or str(uuid4())
    result = service.run_sync(
        request_id=request_id,
        actor_user_id=current_user.id,
        force_full=body.force_full,
    )
    if result.status != "success":
        record_fail_closed_counter()
        write_resilience_audit_event(
            db,
            user_id=current_user.id if current_user else None,
            request_id=request_id,
            dependency=DEPENDENCY_PAHEKO,
            decision="degraded",
            reason="paheko_dependency_unavailable",
            route=request.url.path if request else None,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service temporairement indisponible",
        )
    return MemberSyncRunResponse(
        request_id=result.request_id,
        status=result.status,
        counters=SyncCountersResponse(
            created=result.counters.created,
            updated=result.counters.updated,
            deleted=result.counters.deleted,
            errors=result.counters.errors,
            conflicts=result.counters.conflicts,
        ),
        watermark=result.watermark,
        cursor=result.cursor,
        message=result.message,
    )

