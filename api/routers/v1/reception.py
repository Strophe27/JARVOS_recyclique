# RecyClique API — Router réception v1 (Story 3.4, 6.1, 6.2, 6.3).
# Postes, tickets, lignes de dépôt, export CSV, stats live. Permission : reception.access.

import csv
import io
import json
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from api.core.deps import require_permissions
from api.db import get_db
from api.models import AuditEvent, LigneDepot, PosteReception, TicketDepot, User
from api.models.category import Category
from api.schemas.ligne_depot import (
    LigneDepotCreateRequest,
    LigneDepotListResponse,
    LigneDepotResponse,
    LigneDepotUpdateRequest,
    LigneDepotWeightUpdateRequest,
)
from api.schemas.poste_reception import PosteReceptionOpenRequest, PosteReceptionResponse
from api.schemas.ticket_depot import (
    TicketDepotCreateRequest,
    TicketDepotListResponse,
    TicketDepotResponse,
)

router = APIRouter(prefix="/reception", tags=["reception"])


def _resolve_user_name(ticket: TicketDepot) -> str | None:
    u = ticket.benevole_user
    if u is None:
        return None
    name = f"{u.first_name or ''} {u.last_name or ''}".strip()
    return name or u.username

_ReceptionAccess = Depends(require_permissions("reception.access"))

# Store pour tokens de téléchargement (export CSV ticket). Token -> (ticket_id, expires_at).
# Limitation : en mémoire, non partagé entre workers ; en déploiement multi-worker (ex. plusieurs
# processus Gunicorn), un token émis par un worker ne sera pas reconnu par un autre. Pour partage
# multi-worker, prévoir un stockage externe (ex. Redis) et remplacer _download_tokens par une lecture
# depuis ce store.
_download_tokens: dict[str, tuple[UUID, datetime]] = {}


def _get_ticket_for_user(db: Session, ticket_id: UUID, current_user: User) -> TicketDepot | None:
    """Charge le ticket et vérifie qu'il appartient au poste courant ou à l'utilisateur (règle 6.1)."""
    row = (
        db.execute(
            select(TicketDepot)
            .where(TicketDepot.id == ticket_id)
            .options(joinedload(TicketDepot.poste))
        )
        .scalars()
        .one_or_none()
    )
    if row is None:
        return None
    poste = row.poste
    if poste.opened_by_user_id == current_user.id:
        return row
    if row.benevole_user_id == current_user.id:
        return row
    return None


def _get_ligne_for_user(db: Session, ligne_id: UUID, current_user: User) -> LigneDepot | None:
    """Charge la ligne et vérifie que le ticket appartient à l'utilisateur."""
    row = (
        db.execute(
            select(LigneDepot)
            .where(LigneDepot.id == ligne_id)
            .options(joinedload(LigneDepot.ticket).joinedload(TicketDepot.poste))
        )
        .scalars()
        .one_or_none()
    )
    if row is None:
        return None
    poste = row.ticket.poste
    if poste.opened_by_user_id == current_user.id or row.ticket.benevole_user_id == current_user.id:
        return row
    return None


# ----- Postes -----


@router.post("/postes/open", response_model=PosteReceptionResponse, status_code=status.HTTP_201_CREATED)
def open_poste_reception(
    body: PosteReceptionOpenRequest | None = Body(None),
    db: Session = Depends(get_db),
    current_user: User = _ReceptionAccess,
) -> PosteReception:
    """POST /v1/reception/postes/open — ouvrir un poste réception. Body optionnel : { opened_at? } (saisie différée)."""
    opened_at = (body.opened_at if body else None) or datetime.now(timezone.utc)
    poste = PosteReception(
        opened_by_user_id=current_user.id,
        opened_at=opened_at,
        status="opened",
    )
    db.add(poste)
    db.flush()
    db.add(
        AuditEvent(
            user_id=current_user.id,
            action="reception_post_opened",
            resource_type="poste_reception",
            resource_id=str(poste.id),
            details=json.dumps({"opened_at": opened_at.isoformat()}),
        )
    )
    db.commit()
    db.refresh(poste)
    return poste


@router.get("/postes/current", response_model=PosteReceptionResponse)
def get_current_poste(
    db: Session = Depends(get_db),
    current_user: User = _ReceptionAccess,
) -> PosteReception:
    """GET /v1/reception/postes/current — poste ouvert pour l'utilisateur connecté. 404 si aucun."""
    row = (
        db.execute(
            select(PosteReception)
            .where(
                PosteReception.opened_by_user_id == current_user.id,
                PosteReception.status == "opened",
            )
            .order_by(PosteReception.opened_at.desc())
            .limit(1)
        )
        .scalars()
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="No open reception post for current user")
    return row


@router.post("/postes/{poste_id}/close", response_model=PosteReceptionResponse)
def close_poste_reception(
    poste_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = _ReceptionAccess,
) -> PosteReception:
    """POST /v1/reception/postes/{poste_id}/close — fermer le poste. Audit : reception_post_closed."""
    row = (
        db.execute(select(PosteReception).where(PosteReception.id == poste_id))
        .scalars()
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Poste not found")
    if row.status != "opened":
        raise HTTPException(status_code=400, detail="Poste is already closed")
    if row.opened_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the user who opened the poste can close it")

    closed_at = datetime.now(timezone.utc)
    row.closed_at = closed_at
    row.status = "closed"
    db.add(
        AuditEvent(
            user_id=current_user.id,
            action="reception_post_closed",
            resource_type="poste_reception",
            resource_id=str(row.id),
            details=json.dumps({"closed_at": closed_at.isoformat()}),
        )
    )
    db.commit()
    db.refresh(row)
    return row


# ----- Tickets -----


@router.post("/tickets", response_model=TicketDepotResponse, status_code=status.HTTP_201_CREATED)
def create_ticket_depot(
    body: TicketDepotCreateRequest | None = Body(None),
    db: Session = Depends(get_db),
    current_user: User = _ReceptionAccess,
) -> TicketDepot:
    """POST /v1/reception/tickets — créer un ticket. poste_id optionnel (déduit du poste courant)."""
    poste_id = body.poste_id if body else None
    if poste_id is None:
        current = (
            db.execute(
                select(PosteReception)
                .where(
                    PosteReception.opened_by_user_id == current_user.id,
                    PosteReception.status == "opened",
                )
                .order_by(PosteReception.opened_at.desc())
                .limit(1)
            )
            .scalars()
            .one_or_none()
        )
        if current is None:
            raise HTTPException(
                status_code=400,
                detail="No open reception post; open a poste first or provide poste_id",
            )
        poste_id = current.id
    else:
        poste = (
            db.execute(select(PosteReception).where(PosteReception.id == poste_id))
            .scalars()
            .one_or_none()
        )
        if poste is None:
            raise HTTPException(status_code=404, detail="Poste not found")
        if poste.status != "opened":
            raise HTTPException(status_code=400, detail="Poste is not open")

    ticket = TicketDepot(
        poste_id=poste_id,
        benevole_user_id=current_user.id,
        status="opened",
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/tickets", response_model=TicketDepotListResponse)
def list_tickets(
    poste_id: UUID | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = _ReceptionAccess,
) -> TicketDepotListResponse:
    """GET /v1/reception/tickets — liste avec pagination et filtres poste_id, status."""
    q_base = select(TicketDepot)
    if poste_id is not None:
        q_base = q_base.where(TicketDepot.poste_id == poste_id)
    if status_filter is not None:
        q_base = q_base.where(TicketDepot.status == status_filter)

    count_q = select(func.count()).select_from(TicketDepot)
    if poste_id is not None:
        count_q = count_q.where(TicketDepot.poste_id == poste_id)
    if status_filter is not None:
        count_q = count_q.where(TicketDepot.status == status_filter)
    total = db.execute(count_q).scalar() or 0
    q_items = (
        q_base.order_by(TicketDepot.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .options(joinedload(TicketDepot.benevole_user))
    )
    rows = db.execute(q_items).unique().scalars().all()
    items = [r[0] if isinstance(r, tuple) else r for r in rows]

    for t in items:
        t.benevole_user_name = _resolve_user_name(t)

    return TicketDepotListResponse(
        items=[TicketDepotResponse.model_validate(t) for t in items],
        total=int(total),
        page=page,
        page_size=page_size,
    )


@router.get("/tickets/{ticket_id}", response_model=TicketDepotResponse)
def get_ticket(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = _ReceptionAccess,
) -> TicketDepotResponse:
    """GET /v1/reception/tickets/{ticket_id} — détail d'un ticket avec lignes (Story 6.2)."""
    row = (
        db.execute(
            select(TicketDepot)
            .where(TicketDepot.id == ticket_id)
            .options(joinedload(TicketDepot.lignes), joinedload(TicketDepot.benevole_user))
        )
        .unique()
        .scalars()
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    poste = db.get(PosteReception, row.poste_id) if row.poste_id else None
    if poste and poste.opened_by_user_id != current_user.id and row.benevole_user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Ticket not found")
    row.benevole_user_name = _resolve_user_name(row)
    return TicketDepotResponse.model_validate(row)


@router.post("/tickets/{ticket_id}/close", response_model=TicketDepotResponse)
def close_ticket_depot(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = _ReceptionAccess,
) -> TicketDepot:
    """POST /v1/reception/tickets/{ticket_id}/close — fermer un ticket (Story 6.1 API)."""
    row = (
        db.execute(select(TicketDepot).where(TicketDepot.id == ticket_id))
        .scalars()
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if row.status != "opened":
        raise HTTPException(status_code=400, detail="Ticket is already closed")
    row.closed_at = datetime.now(timezone.utc)
    row.status = "closed"
    db.commit()
    db.refresh(row)
    return row


# ----- Lignes de dépôt (Story 6.2) -----


@router.post("/lignes", response_model=LigneDepotResponse, status_code=status.HTTP_201_CREATED)
def create_ligne_depot(
    body: LigneDepotCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = _ReceptionAccess,
) -> LigneDepot:
    """POST /v1/reception/lignes — ajouter une ligne. Le ticket doit appartenir au poste courant ou à l'utilisateur."""
    ticket = _get_ticket_for_user(db, body.ticket_id, current_user)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found or access denied")
    ligne = LigneDepot(
        ticket_id=body.ticket_id,
        poids_kg=body.poids_kg,
        category_id=body.category_id,
        destination=body.destination.strip(),
        notes=body.notes,
        is_exit=body.is_exit,
    )
    db.add(ligne)
    db.commit()
    db.refresh(ligne)
    return ligne


@router.get("/lignes", response_model=LigneDepotListResponse)
def list_lignes(
    ticket_id: UUID | None = Query(None, description="Filtre par ticket (recommandé pour l'écran détail)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = _ReceptionAccess,
) -> LigneDepotListResponse:
    """GET /v1/reception/lignes — liste avec pagination. Filtre ticket_id fortement recommandé."""
    if ticket_id is None:
        raise HTTPException(
            status_code=400,
            detail="ticket_id query parameter is required for listing lines",
        )
    ticket = _get_ticket_for_user(db, ticket_id, current_user)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found or access denied")
    q_base = select(LigneDepot).where(LigneDepot.ticket_id == ticket_id)
    count_q = select(func.count()).select_from(LigneDepot).where(LigneDepot.ticket_id == ticket_id)
    total = db.execute(count_q).scalar() or 0
    q_items = (
        q_base.order_by(LigneDepot.created_at)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = db.execute(q_items).scalars().all()
    items = [r[0] if isinstance(r, tuple) else r for r in rows]
    return LigneDepotListResponse(
        items=[LigneDepotResponse.model_validate(x) for x in items],
        total=int(total),
        page=page,
        page_size=page_size,
    )


@router.put("/lignes/{ligne_id}", response_model=LigneDepotResponse)
def update_ligne_depot(
    ligne_id: UUID,
    body: LigneDepotUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = _ReceptionAccess,
) -> LigneDepot:
    """PUT /v1/reception/lignes/{ligne_id} — modifier une ligne (champs modifiables)."""
    ligne = _get_ligne_for_user(db, ligne_id, current_user)
    if ligne is None:
        raise HTTPException(status_code=404, detail="Ligne not found or access denied")
    updates = body.model_dump(exclude_unset=True)
    if "poids_kg" in updates and updates["poids_kg"] is not None:
        ligne.poids_kg = updates["poids_kg"]
    if "category_id" in updates:
        ligne.category_id = updates["category_id"]
    if "destination" in updates and updates["destination"] is not None:
        ligne.destination = updates["destination"].strip()
    if "notes" in updates:
        ligne.notes = updates["notes"]
    if "is_exit" in updates and updates["is_exit"] is not None:
        ligne.is_exit = updates["is_exit"]
    ligne.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ligne)
    return ligne


@router.patch(
    "/tickets/{ticket_id}/lignes/{ligne_id}/weight",
    response_model=LigneDepotResponse,
)
def update_ligne_weight(
    ticket_id: UUID,
    ligne_id: UUID,
    body: LigneDepotWeightUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = _ReceptionAccess,
) -> LigneDepot:
    """PATCH /v1/reception/tickets/{ticket_id}/lignes/{ligne_id}/weight — mettre à jour uniquement le poids."""
    ligne = _get_ligne_for_user(db, ligne_id, current_user)
    if ligne is None:
        raise HTTPException(status_code=404, detail="Ligne not found or access denied")
    if ligne.ticket_id != ticket_id:
        raise HTTPException(status_code=400, detail="Ligne does not belong to this ticket")
    ligne.poids_kg = body.weight
    ligne.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ligne)
    return ligne


@router.delete("/lignes/{ligne_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ligne_depot(
    ligne_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = _ReceptionAccess,
) -> None:
    """DELETE /v1/reception/lignes/{ligne_id} — supprimer une ligne."""
    ligne = _get_ligne_for_user(db, ligne_id, current_user)
    if ligne is None:
        raise HTTPException(status_code=404, detail="Ligne not found or access denied")
    db.delete(ligne)
    db.commit()


# ----- Export CSV et stats live (Story 6.3) -----


def _clean_expired_tokens() -> None:
    now = datetime.now(timezone.utc)
    expired = [k for k, (_, exp) in _download_tokens.items() if exp <= now]
    for k in expired:
        del _download_tokens[k]


@router.post("/tickets/{ticket_id}/download-token")
def create_download_token(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = _ReceptionAccess,
) -> dict:
    """POST /v1/reception/tickets/{ticket_id}/download-token — token court pour autoriser GET export-csv."""
    ticket = _get_ticket_for_user(db, ticket_id, current_user)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found or access denied")
    _clean_expired_tokens()
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    _download_tokens[token] = (ticket_id, expires_at)
    return {"token": token, "expires_in_seconds": 300}


@router.get("/tickets/{ticket_id}/export-csv")
def export_ticket_csv(
    ticket_id: UUID,
    token: str | None = Query(None, description="Token obtenu via POST download-token (optionnel si auth Bearer)"),
    db: Session = Depends(get_db),
    current_user: User = _ReceptionAccess,
):
    """GET /v1/reception/tickets/{ticket_id}/export-csv — CSV du ticket et de ses lignes. Token optionnel."""
    ticket_row: TicketDepot | None = None
    if token:
        _clean_expired_tokens()
        entry = _download_tokens.get(token)
        if entry is None:
            raise HTTPException(status_code=403, detail="Invalid or expired download token")
        tid, expires_at = entry
        if tid != ticket_id or expires_at <= datetime.now(timezone.utc):
            if tid == ticket_id:
                del _download_tokens[token]
            raise HTTPException(status_code=403, detail="Invalid or expired download token")
        ticket_row = (
            db.execute(
                select(TicketDepot)
                .where(TicketDepot.id == ticket_id)
                .options(
                    joinedload(TicketDepot.lignes),
                    joinedload(TicketDepot.poste),
                )
            )
            .unique()
            .scalars()
            .one_or_none()
        )
    else:
        ticket_row = _get_ticket_for_user(db, ticket_id, current_user)
        if ticket_row is not None:
            ticket_row = (
                db.execute(
                    select(TicketDepot)
                    .where(TicketDepot.id == ticket_id)
                    .options(
                        joinedload(TicketDepot.lignes),
                        joinedload(TicketDepot.poste),
                    )
                )
                .unique()
                .scalars()
                .one_or_none()
            )
    if ticket_row is None:
        raise HTTPException(status_code=404, detail="Ticket not found or access denied")

    category_ids = {l.category_id for l in ticket_row.lignes if l.category_id}
    categories_map: dict[UUID | None, str] = {}
    if category_ids:
        cats = db.execute(select(Category).where(Category.id.in_(category_ids))).scalars().all()
        for c in cats:
            cat = c[0] if isinstance(c, tuple) else c
            categories_map[cat.id] = cat.name or ""

    def _stream() -> io.BytesIO:
        buf = io.StringIO()
        writer = csv.writer(buf, delimiter=";", lineterminator="\r\n")
        writer.writerow([
            "ticket_id", "created_at", "closed_at", "benevole_user_id", "poste_id", "status",
            "ligne_id", "category_id", "category_name", "poids_kg", "destination", "notes", "is_exit", "ligne_created_at",
        ])
        for ligne in ticket_row.lignes:
            writer.writerow([
                str(ticket_row.id),
                ticket_row.created_at.isoformat() if ticket_row.created_at else "",
                ticket_row.closed_at.isoformat() if ticket_row.closed_at else "",
                str(ticket_row.benevole_user_id) if ticket_row.benevole_user_id else "",
                str(ticket_row.poste_id) if ticket_row.poste_id else "",
                ticket_row.status or "",
                str(ligne.id),
                str(ligne.category_id) if ligne.category_id else "",
                categories_map.get(ligne.category_id, ""),
                str(ligne.poids_kg),
                ligne.destination or "",
                ligne.notes or "",
                "1" if ligne.is_exit else "0",
                ligne.created_at.isoformat() if ligne.created_at else "",
            ])
        out = io.BytesIO()
        out.write("\ufeff".encode("utf-8"))
        out.write(buf.getvalue().encode("utf-8"))
        out.seek(0)
        return out

    body = _stream().read()
    if token:
        _download_tokens.pop(token, None)
    # Limitation : corps construit en mémoire puis renvoyé en un bloc ; pour très gros volumes
    # (tickets avec très nombreuses lignes), envisager un vrai streaming (generator yield chunks).
    return StreamingResponse(
        iter([body]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="ticket-{ticket_id}.csv"'},
    )


@router.get("/lignes/export-csv")
def export_lignes_csv(
    date_from: str = Query(..., description="Date début (YYYY-MM-DD ou ISO 8601)"),
    date_to: str = Query(..., description="Date fin (YYYY-MM-DD ou ISO 8601)"),
    limit: int = Query(10_000, ge=1, le=50_000),
    db: Session = Depends(get_db),
    current_user: User = _ReceptionAccess,
):
    """GET /v1/reception/lignes/export-csv — CSV des lignes sur la période. Permission reception.access."""
    try:
        from_date = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
    except ValueError:
        from_date = datetime.strptime(date_from[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
    if from_date.tzinfo is None:
        from_date = from_date.replace(tzinfo=timezone.utc)
    try:
        to_date = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
    except ValueError:
        to_date = datetime.strptime(date_to[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
    if to_date.tzinfo is None:
        to_date = to_date.replace(tzinfo=timezone.utc)
    if to_date < from_date:
        raise HTTPException(status_code=400, detail="date_to must be >= date_from")

    q = (
        select(LigneDepot, Category.name.label("category_name"))
        .join(TicketDepot, LigneDepot.ticket_id == TicketDepot.id)
        .outerjoin(Category, LigneDepot.category_id == Category.id)
        .where(LigneDepot.created_at >= from_date, LigneDepot.created_at <= to_date)
        .order_by(LigneDepot.created_at)
        .limit(limit)
    )
    rows = db.execute(q).all()

    def _stream() -> io.BytesIO:
        buf = io.StringIO()
        writer = csv.writer(buf, delimiter=";", lineterminator="\r\n")
        writer.writerow([
            "ticket_id", "ligne_id", "category_id", "category_name", "poids_kg", "destination", "notes", "is_exit", "created_at",
        ])
        for row in rows:
            ligne = row[0]
            cat_name = row[1] if len(row) > 1 else ""
            writer.writerow([
                str(ligne.ticket_id),
                str(ligne.id),
                str(ligne.category_id) if ligne.category_id else "",
                cat_name or "",
                str(ligne.poids_kg),
                ligne.destination or "",
                ligne.notes or "",
                "1" if ligne.is_exit else "0",
                ligne.created_at.isoformat() if ligne.created_at else "",
            ])
        out = io.BytesIO()
        out.write("\ufeff".encode("utf-8"))
        out.write(buf.getvalue().encode("utf-8"))
        out.seek(0)
        return out

    # Limitation : corps construit en mémoire ; pour très gros volumes envisager generator streaming.
    body = _stream().read()
    filename = f"reception-lignes-{from_date.strftime('%Y-%m-%d')}_{to_date.strftime('%Y-%m-%d')}.csv"
    return StreamingResponse(
        iter([body]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/stats/live")
def get_reception_stats_live(
    exclude_deferred: bool = Query(False, description="Exclure les postes ouverts en saisie différée"),
    db: Session = Depends(get_db),
    current_user: User = _ReceptionAccess,
) -> dict:
    """GET /v1/reception/stats/live — KPI réception en temps réel."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    if exclude_deferred:
        postes_subq = select(PosteReception.id).where(PosteReception.opened_at >= today_start)
        tickets_today_q = (
            select(func.count())
            .select_from(TicketDepot)
            .where(
                TicketDepot.created_at >= today_start,
                TicketDepot.poste_id.in_(postes_subq),
            )
        )
        lignes_q = (
            select(func.coalesce(func.sum(LigneDepot.poids_kg), 0), func.count(LigneDepot.id))
            .join(TicketDepot, LigneDepot.ticket_id == TicketDepot.id)
            .where(
                LigneDepot.created_at >= today_start,
                TicketDepot.poste_id.in_(postes_subq),
            )
        )
    else:
        tickets_today_q = select(func.count()).select_from(TicketDepot).where(TicketDepot.created_at >= today_start)
        lignes_q = (
            select(func.coalesce(func.sum(LigneDepot.poids_kg), 0), func.count(LigneDepot.id))
            .where(LigneDepot.created_at >= today_start)
        )

    tickets_today = db.execute(tickets_today_q).scalar() or 0
    lignes_row = db.execute(lignes_q).one()
    total_weight_kg = float(lignes_row[0] or 0)
    lines_count = lignes_row[1] or 0

    return {
        "tickets_today": int(tickets_today),
        "total_weight_kg": round(total_weight_kg, 3),
        "lines_count": int(lines_count),
    }
