"""Router cash-sessions — ouverture/fermeture/lecture (Story 5.1, 5.3 totaux)."""

import json
from datetime import datetime, timezone, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from api.core.deps import require_permissions
from api.db import get_db
from api.models import AuditEvent, CashRegister, CashSession, Sale, SaleItem, Site, User
from api.schemas.cash_session import (
    CashSessionClose,
    CashSessionCreate,
    CashSessionDeferredCheckResponse,
    CashSessionResponse,
    CashSessionStatusResponse,
    CashSessionStepUpdate,
)
from api.services.push_caisse import publish_session_closed, publish_session_opened

router = APIRouter(prefix="/cash-sessions", tags=["cash-sessions"])

# Lecture / list / status : caisse ou admin
_CaisseOrAdmin = Depends(require_permissions("caisse.access", "caisse.virtual.access", "caisse.deferred.access", "admin"))


def _get_session_totals(db: Session, session_id: UUID) -> tuple[int, int]:
    """Calcule total_sales (centimes) et total_items pour une session (Story 5.3)."""
    total_sales_row = db.execute(
        select(func.coalesce(func.sum(Sale.total_amount), 0)).where(Sale.cash_session_id == session_id)
    ).scalar_one()
    total_items_row = db.execute(
        select(func.count(SaleItem.id))
        .select_from(SaleItem)
        .join(Sale, SaleItem.sale_id == Sale.id)
        .where(Sale.cash_session_id == session_id)
    ).scalar_one()
    return (int(total_sales_row or 0), int(total_items_row or 0))


def _ensure_session_totals(db: Session, row: CashSession) -> CashSession:
    """Renseigne total_sales/total_items sur l'instance si session ouverte et non encore remplis (Story 5.3)."""
    if row.status == "open" and row.total_sales is None:
        total_sales, total_items = _get_session_totals(db, row.id)
        row.total_sales = total_sales
        row.total_items = total_items
    return row


def _check_session_permission(current_user: User, db: Session, session_type: str) -> None:
    """Raise 403 if user lacks permission for this session type."""
    from api.services.permissions import get_user_permission_codes_from_user
    from api.core.deps import _permission_codes_with_role_implicits
    raw = get_user_permission_codes_from_user(db, current_user)
    codes = _permission_codes_with_role_implicits(raw, current_user.role)
    if "admin" in codes:
        return
    if session_type == "virtual" and "caisse.virtual.access" not in codes:
        raise HTTPException(status_code=403, detail="Insufficient permissions for virtual session")
    if session_type == "deferred" and "caisse.deferred.access" not in codes:
        raise HTTPException(status_code=403, detail="Insufficient permissions for deferred session")
    if session_type == "real" and "caisse.access" not in codes:
        raise HTTPException(status_code=403, detail="Insufficient permissions for real session")


@router.post("", response_model=CashSessionResponse, status_code=201)
def open_cash_session(
    body: CashSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = _CaisseOrAdmin,
) -> CashSession:
    """POST /v1/cash-sessions — ouvrir une session. 409 si le register a déjà une session ouverte."""
    _check_session_permission(current_user, db, body.session_type or "real")
    register = (
        db.execute(select(CashRegister).where(CashRegister.id == body.register_id))
        .scalars()
        .one_or_none()
    )
    if not register:
        raise HTTPException(status_code=404, detail="Cash register not found")
    session_type = body.session_type or "real"
    if session_type == "virtual" and not register.enable_virtual:
        raise HTTPException(
            status_code=400,
            detail="This register does not allow virtual sessions (enable_virtual is false)",
        )
    if session_type == "deferred" and not register.enable_deferred:
        raise HTTPException(
            status_code=400,
            detail="This register does not allow deferred sessions (enable_deferred is false)",
        )
    existing = (
        db.execute(
            select(CashSession).where(
                CashSession.register_id == body.register_id,
                CashSession.status == "open",
            )
        )
        .scalars()
        .one_or_none()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Register already has an open session",
        )
    opened_at = body.opened_at or datetime.now(timezone.utc)
    session = CashSession(
        operator_id=current_user.id,
        register_id=body.register_id,
        site_id=register.site_id,
        initial_amount=body.initial_amount,
        current_amount=body.initial_amount,
        status="open",
        opened_at=opened_at,
        current_step="entry",
        session_type=session_type,
    )
    db.add(session)
    db.flush()  # pour obtenir session.id avant de créer l'audit
    evt = AuditEvent(
        user_id=current_user.id,
        action="cash_session_opened",
        resource_type="cash_session",
        resource_id=str(session.id),
        details=json.dumps({
            "register_id": str(body.register_id),
            "site_id": str(register.site_id),
            "initial_amount": body.initial_amount,
            "session_type": session_type,
        }),
    )
    db.add(evt)
    db.commit()
    db.refresh(session)
    publish_session_opened(
        session.id,
        current_user.id,
        body.register_id,
        register.site_id,
        body.initial_amount,
        opened_at.isoformat(),
        session_type,
    )
    return session


@router.get("", response_model=list[CashSessionResponse])
def list_cash_sessions(
    register_id: UUID | None = None,
    site_id: UUID | None = None,
    operator_id: UUID | None = Query(None, description="Filtre par opérateur"),
    status: str | None = None,
    opened_at_from: str | None = Query(None, description="Date ouverture début YYYY-MM-DD"),
    opened_at_to: str | None = Query(None, description="Date ouverture fin YYYY-MM-DD"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = _CaisseOrAdmin,
) -> list[CashSession]:
    """GET /v1/cash-sessions — liste avec filtres et pagination (Story 8.2)."""
    q = select(CashSession)
    if register_id is not None:
        q = q.where(CashSession.register_id == register_id)
    if site_id is not None:
        q = q.where(CashSession.site_id == site_id)
    if operator_id is not None:
        q = q.where(CashSession.operator_id == operator_id)
    if status is not None:
        q = q.where(CashSession.status == status)
    if opened_at_from is not None:
        try:
            dt_from = datetime.strptime(opened_at_from, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            q = q.where(CashSession.opened_at >= dt_from)
        except ValueError:
            pass
    if opened_at_to is not None:
        try:
            dt_to = datetime.strptime(opened_at_to, "%Y-%m-%d").replace(
                tzinfo=timezone.utc
            ) + timedelta(days=1)
            q = q.where(CashSession.opened_at < dt_to)
        except ValueError:
            pass
    q = q.order_by(CashSession.opened_at.desc()).limit(limit).offset(offset)
    return list(db.execute(q).scalars().all())


@router.get("/current", response_model=CashSessionResponse | None)
def get_current_session(
    db: Session = Depends(get_db),
    current_user: User = _CaisseOrAdmin,
) -> CashSession | None:
    """GET /v1/cash-sessions/current — session ouverte pour l'opérateur connecté."""
    row = (
        db.execute(
            select(CashSession).where(
                CashSession.operator_id == current_user.id,
                CashSession.status == "open",
            )
        )
        .scalars()
        .one_or_none()
    )
    if row is not None:
        _ensure_session_totals(db, row)
    return row


@router.get("/deferred/check", response_model=CashSessionDeferredCheckResponse)
def deferred_check(
    date: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = _CaisseOrAdmin,
) -> CashSessionDeferredCheckResponse:
    """GET /v1/cash-sessions/deferred/check — vérifier si une session différée existe pour la date."""
    try:
        dt = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")
    day_start = dt.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)
    row = (
        db.execute(
            select(CashSession).where(
                CashSession.session_type == "deferred",
                CashSession.operator_id == current_user.id,
                CashSession.opened_at >= day_start,
                CashSession.opened_at < day_end,
            )
        )
        .scalars()
        .one_or_none()
    )
    return CashSessionDeferredCheckResponse(
        date=date,
        has_session=row is not None,
        session_id=row.id if row else None,
    )


@router.get("/status/{register_id}", response_model=CashSessionStatusResponse)
def get_register_status(
    register_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = _CaisseOrAdmin,
) -> CashSessionStatusResponse:
    """GET /v1/cash-sessions/status/{register_id} — occupé / libre."""
    row = (
        db.execute(
            select(CashSession).where(
                CashSession.register_id == register_id,
                CashSession.status == "open",
            )
        )
        .scalars()
        .one_or_none()
    )
    return CashSessionStatusResponse(
        register_id=register_id,
        has_open_session=row is not None,
        session_id=row.id if row else None,
        opened_at=row.opened_at if row else None,
    )


@router.get("/{session_id}", response_model=CashSessionResponse)
def get_cash_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = _CaisseOrAdmin,
) -> CashSession:
    """GET /v1/cash-sessions/{session_id} — détail."""
    row = (
        db.execute(select(CashSession).where(CashSession.id == session_id))
        .scalars()
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Cash session not found")
    _ensure_session_totals(db, row)
    return row


@router.post("/{session_id}/close", response_model=CashSessionResponse)
def close_cash_session(
    session_id: UUID,
    body: CashSessionClose,
    db: Session = Depends(get_db),
    current_user: User = _CaisseOrAdmin,
) -> CashSession:
    """POST /v1/cash-sessions/{session_id}/close — fermer la session (totaux, écart, syncAccounting via Paheko)."""
    row = (
        db.execute(select(CashSession).where(CashSession.id == session_id))
        .scalars()
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Cash session not found")
    if row.status == "closed":
        raise HTTPException(status_code=400, detail="Session already closed")
    if row.operator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the session operator can close it")

    total_sales, total_items = _get_session_totals(db, session_id)
    row.total_sales = total_sales
    row.total_items = total_items

    closed_at = datetime.now(timezone.utc)
    row.closed_at = closed_at
    row.status = "closed"
    if body.closing_amount is not None:
        row.closing_amount = body.closing_amount
    if body.actual_amount is not None:
        row.actual_amount = body.actual_amount
        if row.closing_amount is not None:
            row.variance = body.actual_amount - row.closing_amount
    if body.variance_comment is not None:
        row.variance_comment = body.variance_comment

    db.add(
        AuditEvent(
            user_id=current_user.id,
            action="cash_session_closed",
            resource_type="cash_session",
            resource_id=str(row.id),
            details=json.dumps({
                "closing_amount": row.closing_amount,
                "actual_amount": row.actual_amount,
                "variance": row.variance,
                "variance_comment": row.variance_comment,
                "total_sales": total_sales,
                "total_items": total_items,
            }),
        )
    )
    db.commit()
    db.refresh(row)
    publish_session_closed(
        row.id,
        closed_at.isoformat(),
        row.closing_amount,
        row.actual_amount,
        row.variance_comment,
        total_sales=total_sales,
        total_items=total_items,
    )
    return row


@router.get("/{session_id}/step")
def get_session_step(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = _CaisseOrAdmin,
) -> dict:
    """GET /v1/cash-sessions/{session_id}/step — étape courante (entry/sale/exit)."""
    row = (
        db.execute(select(CashSession).where(CashSession.id == session_id))
        .scalars()
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Cash session not found")
    return {"session_id": str(session_id), "current_step": row.current_step}


@router.put("/{session_id}/step", response_model=CashSessionResponse)
def update_session_step(
    session_id: UUID,
    body: CashSessionStepUpdate,
    db: Session = Depends(get_db),
    current_user: User = _CaisseOrAdmin,
) -> CashSession:
    """PUT /v1/cash-sessions/{session_id}/step — changer l'étape (entry/sale/exit)."""
    if body.step not in ("entry", "sale", "exit"):
        raise HTTPException(status_code=400, detail="step must be entry, sale, or exit")
    row = (
        db.execute(select(CashSession).where(CashSession.id == session_id))
        .scalars()
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Cash session not found")
    if row.status != "open":
        raise HTTPException(status_code=400, detail="Cannot change step on closed session")
    row.current_step = body.step
    db.commit()
    db.refresh(row)
    return row
