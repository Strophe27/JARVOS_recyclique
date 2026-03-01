"""Router sites — CRUD /v1/sites (Story 2.1). Protégé RBAC (Story 17.1) : super_admin."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.core.deps import require_permissions
from api.db import get_db
from api.models import Site, User
from api.schemas.site import SiteCreate, SiteResponse, SiteUpdate

router = APIRouter(prefix="/sites", tags=["sites"])

_SuperAdmin = Depends(require_permissions("super_admin"))


@router.get("", response_model=list[SiteResponse])
def list_sites(
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    current_user: User = _SuperAdmin,
) -> list[Site]:
    """GET /v1/sites — liste des sites (filtre optionnel is_active)."""
    q = select(Site)
    if is_active is not None:
        q = q.where(Site.is_active == is_active)
    return list(db.execute(q).scalars().all())


@router.get("/{site_id}", response_model=SiteResponse)
def get_site(
    site_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = _SuperAdmin,
) -> Site:
    """GET /v1/sites/{site_id} — détail d'un site (404 si absent)."""
    row = db.execute(select(Site).where(Site.id == site_id)).scalars().one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Site not found")
    return row


@router.post("", response_model=SiteResponse, status_code=201)
def create_site(
    body: SiteCreate,
    db: Session = Depends(get_db),
    current_user: User = _SuperAdmin,
) -> Site:
    """POST /v1/sites — création (body : name, is_active optionnel)."""
    site = Site(name=body.name, is_active=body.is_active)
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


@router.patch("/{site_id}", response_model=SiteResponse)
def update_site(
    site_id: UUID,
    body: SiteUpdate,
    db: Session = Depends(get_db),
    current_user: User = _SuperAdmin,
) -> Site:
    """PATCH /v1/sites/{site_id} — mise à jour partielle (name, is_active)."""
    site = db.execute(select(Site).where(Site.id == site_id)).scalars().one_or_none()
    if site is None:
        raise HTTPException(status_code=404, detail="Site not found")
    changed = False
    if body.name is not None and body.name != site.name:
        site.name = body.name
        changed = True
    if body.is_active is not None and body.is_active != site.is_active:
        site.is_active = body.is_active
        changed = True
    if changed:
        site.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(site)
    return site


@router.delete("/{site_id}", status_code=204)
def delete_site(
    site_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = _SuperAdmin,
) -> None:
    """DELETE /v1/sites/{site_id} — suppression (204 ou 404)."""
    site = db.execute(select(Site).where(Site.id == site_id)).scalars().one_or_none()
    if site is None:
        raise HTTPException(status_code=404, detail="Site not found")
    db.delete(site)
    db.commit()
