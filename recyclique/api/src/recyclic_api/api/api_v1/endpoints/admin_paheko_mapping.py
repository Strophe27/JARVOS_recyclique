"""Admin — correspondances Paheko slice clôture caisse (Story 8.3)."""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from recyclic_api.core.auth import require_role_strict
from recyclic_api.core.database import get_db
from recyclic_api.models.user import User, UserRole
from recyclic_api.schemas.paheko_mapping import (
    PahekoCashSessionCloseMappingCreateBody,
    PahekoCashSessionCloseMappingListResponse,
    PahekoCashSessionCloseMappingPublic,
    PahekoCashSessionCloseMappingUpdateBody,
    mapping_row_to_public,
)
from recyclic_api.services.paheko_mapping_service import (
    create_cash_session_close_mapping,
    list_cash_session_close_mappings,
    update_cash_session_close_mapping,
)

router = APIRouter()


@router.get(
    "/cash-session-close",
    response_model=PahekoCashSessionCloseMappingListResponse,
    operation_id="recyclique_pahekoMapping_listCashSessionCloseMappings",
    summary="Lister les correspondances Paheko (clôture session caisse)",
)
async def list_mappings(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    site_id: Optional[str] = Query(None, description="Filtrer par site."),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    _ = current_user
    site_uuid = None
    if site_id:
        try:
            site_uuid = uuid.UUID(site_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="site_id invalide") from exc
    rows, total = list_cash_session_close_mappings(db, site_id=site_uuid, skip=skip, limit=limit)
    return PahekoCashSessionCloseMappingListResponse(
        data=[mapping_row_to_public(r) for r in rows],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post(
    "/cash-session-close",
    response_model=PahekoCashSessionCloseMappingPublic,
    operation_id="recyclique_pahekoMapping_createCashSessionCloseMapping",
    summary="Créer une correspondance Paheko (clôture session caisse)",
)
async def create_mapping(
    body: PahekoCashSessionCloseMappingCreateBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    _ = current_user
    try:
        sid = uuid.UUID(body.site_id.strip())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="site_id UUID invalide") from exc
    rid = None
    if body.register_id:
        try:
            rid = uuid.UUID(body.register_id.strip())
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="register_id UUID invalide") from exc
    row, err = create_cash_session_close_mapping(
        db,
        site_id=sid,
        register_id=rid,
        destination_params=body.destination_params,
        enabled=body.enabled,
        label=body.label,
    )
    if err == "invalid_destination_params":
        raise HTTPException(
            status_code=422,
            detail="destination_params doit être un objet JSON non vide.",
        )
    if err == "duplicate_key":
        raise HTTPException(
            status_code=409,
            detail="Une ligne existe déjà pour ce couple (site_id, register_id).",
        )
    assert row is not None
    db.commit()
    db.refresh(row)
    return mapping_row_to_public(row)


@router.patch(
    "/cash-session-close/{mapping_id}",
    response_model=PahekoCashSessionCloseMappingPublic,
    operation_id="recyclique_pahekoMapping_updateCashSessionCloseMapping",
    summary="Mettre à jour ou désactiver une correspondance Paheko (clôture)",
)
async def update_mapping(
    mapping_id: uuid.UUID,
    body: PahekoCashSessionCloseMappingUpdateBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    _ = current_user
    if body.destination_params is None and body.enabled is None and body.label is None:
        raise HTTPException(status_code=422, detail="Au moins un champ à modifier est requis.")
    row, err = update_cash_session_close_mapping(
        db,
        mapping_id,
        destination_params=body.destination_params,
        enabled=body.enabled,
        label=body.label,
    )
    if err == "not_found":
        raise HTTPException(status_code=404, detail="Correspondance introuvable")
    if err == "invalid_destination_params":
        raise HTTPException(status_code=422, detail="destination_params doit être un objet JSON non vide.")
    assert row is not None
    db.commit()
    db.refresh(row)
    return mapping_row_to_public(row)
