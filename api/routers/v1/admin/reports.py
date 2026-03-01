# Rapports admin — Story 8.2, 17.9.
# GET /v1/admin/reports/cash-sessions, by-session/{id}, export-bulk.

import io
import zipfile
from datetime import datetime, timezone, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select, nulls_last

from api.core.deps import require_permissions
from api.db import get_db
from api.models import CashSession, User
from api.services.report_service import generate_session_report_csv
from sqlalchemy.orm import Session

router = APIRouter(prefix="/reports/cash-sessions", tags=["admin-reports"])

_Admin = Depends(require_permissions("admin"))


class ReportListItem(BaseModel):
    session_id: UUID
    closed_at: datetime | None
    opened_at: datetime
    site_id: UUID
    register_id: UUID
    operator_id: UUID
    status: str


class ExportBulkRequest(BaseModel):
    date_from: str | None = None  # YYYY-MM-DD
    date_to: str | None = None
    site_id: UUID | None = None


@router.get("", response_model=list[ReportListItem])
def list_cash_session_reports(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = _Admin,
) -> list[ReportListItem]:
    """GET /v1/admin/reports/cash-sessions — liste des rapports (sessions clôturées)."""
    q = (
        select(CashSession)
        .where(CashSession.status == "closed")
        .order_by(nulls_last(CashSession.closed_at.desc()), CashSession.opened_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = list(db.execute(q).scalars().all())
    return [
        ReportListItem(
            session_id=r.id,
            closed_at=r.closed_at,
            opened_at=r.opened_at,
            site_id=r.site_id,
            register_id=r.register_id,
            operator_id=r.operator_id,
            status=r.status,
        )
        for r in rows
    ]


@router.get("/by-session/{session_id}")
def get_report_by_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = _Admin,
) -> Response:
    """GET /v1/admin/reports/cash-sessions/by-session/{session_id} — téléchargement rapport session CSV."""
    csv_content = generate_session_report_csv(db, session_id)
    if csv_content is None:
        row = (
            db.execute(select(CashSession).where(CashSession.id == session_id))
            .scalars()
            .one_or_none()
        )
        if row is None:
            raise HTTPException(status_code=404, detail="Session not found")
        raise HTTPException(status_code=400, detail="Session not closed, no report yet")
    filename = f"rapport-session-{session_id}.csv"
    return Response(
        content=csv_content.encode("utf-8"),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/export-bulk")
def export_bulk(
    body: ExportBulkRequest,
    db: Session = Depends(get_db),
    current_user: User = _Admin,
) -> Response:
    """POST /v1/admin/reports/cash-sessions/export-bulk — export bulk ZIP (un CSV par session)."""
    q = select(CashSession).where(CashSession.status == "closed")
    if body.site_id is not None:
        q = q.where(CashSession.site_id == body.site_id)
    if body.date_from is not None:
        try:
            dt_from = datetime.strptime(body.date_from, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            q = q.where(CashSession.closed_at >= dt_from)
        except ValueError:
            raise HTTPException(
                status_code=400, detail="Invalid date format for date_from (expected YYYY-MM-DD)"
            )
    if body.date_to is not None:
        try:
            dt_to = datetime.strptime(body.date_to, "%Y-%m-%d").replace(tzinfo=timezone.utc) + timedelta(days=1)
            q = q.where(CashSession.closed_at < dt_to)
        except ValueError:
            raise HTTPException(
                status_code=400, detail="Invalid date format for date_to (expected YYYY-MM-DD)"
            )
    q = q.order_by(CashSession.closed_at.desc())
    sessions = list(db.execute(q).scalars().all())

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for s in sessions:
            csv_content = generate_session_report_csv(db, s.id)
            if csv_content:
                zf.writestr(f"rapport-session-{s.id}.csv", csv_content.encode("utf-8"))

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if body.date_from and body.date_to:
        date_suffix = f"{body.date_from}-{body.date_to}"
    else:
        date_suffix = today
    filename = f"export-bulk-{date_suffix}.zip"
    buf.seek(0)
    return Response(
        content=buf.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
