# Story 8.4, 17.8 — GET /v1/admin/email-logs (lecture BDD, pagination, filtres).

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from api.core.deps import require_permissions
from api.db import get_db
from api.models import EmailLog, User

router = APIRouter(prefix="/email-logs", tags=["admin-email-logs"])
_Admin = Depends(require_permissions("admin"))


class EmailLogItem(BaseModel):
    id: str
    sent_at: str
    recipient: str
    subject: str
    status: str

    model_config = {"from_attributes": True}


class EmailLogsListResponse(BaseModel):
    items: list[EmailLogItem]
    total: int
    page: int
    page_size: int


def _parse_date(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        try:
            dt = datetime.strptime(s[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


@router.get("", response_model=EmailLogsListResponse)
def list_email_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    date_from: str | None = Query(None, description="ISO date or YYYY-MM-DD"),
    date_to: str | None = Query(None, description="ISO date or YYYY-MM-DD"),
    recipient: str | None = Query(None, max_length=255, description="Filter by recipient"),
    status: str | None = Query(None, description="Filter by status (sent, failed, etc.)"),
    db: Session = Depends(get_db),
    current_user: User = _Admin,
) -> EmailLogsListResponse:
    """GET /v1/admin/email-logs — liste paginée et filtrable."""
    q = select(EmailLog)
    count_q = select(func.count()).select_from(EmailLog)

    dt_from = _parse_date(date_from)
    dt_to = _parse_date(date_to)
    if dt_from is not None:
        q = q.where(EmailLog.sent_at >= dt_from)
        count_q = count_q.where(EmailLog.sent_at >= dt_from)
    if dt_to is not None:
        q = q.where(EmailLog.sent_at <= dt_to)
        count_q = count_q.where(EmailLog.sent_at <= dt_to)
    if recipient:
        # Échapper % et _ pour éviter wildcard injection (story 17.8 code-review)
        escaped = recipient.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        q = q.where(EmailLog.recipient.ilike(pattern, escape="\\"))
        count_q = count_q.where(EmailLog.recipient.ilike(pattern, escape="\\"))
    if status:
        q = q.where(EmailLog.status == status)
        count_q = count_q.where(EmailLog.status == status)

    total = db.execute(count_q).scalar() or 0
    q = q.order_by(EmailLog.sent_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = list(db.execute(q).scalars().all())
    items = [
        EmailLogItem(
            id=str(r.id),
            sent_at=r.sent_at.isoformat() if r.sent_at else "",
            recipient=r.recipient,
            subject=r.subject,
            status=r.status,
        )
        for r in rows
    ]
    return EmailLogsListResponse(items=items, total=total, page=page, page_size=page_size)
