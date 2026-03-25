from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from recyclic_api.core.database import get_db
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from recyclic_api.core.security import verify_token
from recyclic_api.models.sale import Sale
from recyclic_api.models.user import User, UserRole
from recyclic_api.schemas.sale import SaleResponse, SaleCreate, SaleUpdate, SaleItemUpdate, SaleItemResponse, SaleItemWeightUpdate
from recyclic_api.core.auth import require_role_strict
from recyclic_api.core.exceptions import AuthorizationError, ConflictError, NotFoundError, ValidationError
from recyclic_api.services.sale_service import SaleService
from recyclic_api.utils.domain_exception_http import raise_domain_exception_as_http
from sqlalchemy.orm import selectinload

router = APIRouter()
auth_scheme = HTTPBearer(auto_error=False)


def _jwt_sub_from_optional_bearer(
    credentials: Optional[HTTPAuthorizationCredentials],
) -> str:
    """
    Extrait le claim ``sub`` du Bearer pour POST /sales/, PUT /sales/{id}, PATCH .../items/{item_id}.

    Contrat inchangé (401 explicites, messages historiques) — diffère de
    ``PATCH .../weight`` qui utilise ``require_role_strict`` (403 sans en-tête).
    """
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = verify_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _user_for_sale_item_patch(db: Session, user_id: str) -> User:
    """Charge l'utilisateur pour PATCH item ; 401 ``User not found`` si absent (tests B52-P4)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def _require_admin_for_sale_note(db: Session, user_id: str) -> None:
    """
    Vérifie admin/super-admin pour PUT note.

    Absence en base ou rôle insuffisant → 403 (même message) ; comportement distinct
    de PATCH item (401 ``User not found`` si utilisateur absent).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions. Admin access required.",
        )


# ARCH-03 POST /sales/ : mêmes statuts qu'avant extraction ARCH-04 (Conflict → 422 session fermée).
_SALE_CREATE_DOMAIN_HTTP = {
    "not_found_status": 404,
    "conflict_status": 422,
    "validation_status": 400,
}

# ARCH-03 PUT /sales/{id} : note admin — exceptions domaine → HTTP.
_SALE_NOTE_UPDATE_DOMAIN_HTTP = {
    "not_found_status": 404,
    "conflict_status": 422,
    "validation_status": 400,
}

# ARCH-03 PATCH /sales/{id}/items/{item_id} : exceptions domaine → HTTP (403 géré à part).
_SALE_ITEM_PATCH_DOMAIN_HTTP = {
    "not_found_status": 404,
    "conflict_status": 422,
    "validation_status": 400,
}

# ARCH-03 PATCH /sales/{id}/items/{item_id}/weight : admin — UUID / poids → 400, item absent → 404.
_SALE_ITEM_WEIGHT_DOMAIN_HTTP = {
    "not_found_status": 404,
    "conflict_status": 422,
    "validation_status": 400,
}

@router.get("/", response_model=List[SaleResponse])
async def get_sales(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all sales"""
    # Story B52-P1: Eager load payments pour éviter N+1 queries
    sales = db.query(Sale).options(
        selectinload(Sale.payments),
        selectinload(Sale.items)
    ).offset(skip).limit(limit).all()
    return sales

@router.get("/{sale_id}", response_model=SaleResponse)
async def get_sale(sale_id: str, db: Session = Depends(get_db)):
    """Get sale by ID"""
    try:
        sale_uuid = UUID(sale_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid sale ID format")

    # Story B52-P1: Eager load payments pour éviter N+1 queries
    sale = db.query(Sale).options(
        selectinload(Sale.payments),
        selectinload(Sale.items)
    ).filter(Sale.id == sale_uuid).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    return sale

@router.put("/{sale_id}", response_model=SaleResponse)
async def update_sale_note(
    sale_id: str,
    sale_update: SaleUpdate,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme),
):
    """
    Update sale note (admin only).

    STORY-B40-P4: Edition des notes côté Admin
    - Restricted to Admin/SuperAdmin roles
    - Updates only the note field
    """
    user_id = _jwt_sub_from_optional_bearer(credentials)
    _require_admin_for_sale_note(db, user_id)

    try:
        return SaleService(db).update_admin_note(sale_id, sale_update.note)
    except (NotFoundError, ValidationError) as e:
        raise_domain_exception_as_http(e, **_SALE_NOTE_UPDATE_DOMAIN_HTTP)


@router.patch("/{sale_id}/items/{item_id}/weight", response_model=SaleItemResponse)
async def update_sale_item_weight(
    sale_id: str,
    item_id: str,
    weight_update: SaleItemWeightUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """
    Modifier le poids d'un item de vente (admin uniquement).
    
    Story B52-P2: Permet de corriger les erreurs de saisie de poids après validation.
    - Seuls les administrateurs peuvent modifier
    - Recalcule automatiquement les statistiques affectées
    - Log d'audit complet
    """
    try:
        return SaleService(db).update_sale_item_weight_admin(
            sale_id, item_id, weight_update.weight, current_user
        )
    except (NotFoundError, ValidationError) as e:
        raise_domain_exception_as_http(e, **_SALE_ITEM_WEIGHT_DOMAIN_HTTP)


@router.post("/", response_model=SaleResponse)
async def create_sale(
    sale_data: SaleCreate,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme),
):
    """
    Create new sale with items and operator traceability.

    STORY-B12-P5: Finalisation du Ticket de Caisse
    - Accepts: category, weight (kg), unit_price, total_price for each item
    - CRITICAL: total_amount = sum of all total_price (NO multiplication by weight)
    - Example: Item with weight=2.5kg and total_price=15.0 contributes 15.0 to total (NOT 37.5)
    """
    user_id = _jwt_sub_from_optional_bearer(credentials)

    try:
        return SaleService(db).create_sale(sale_data, user_id)
    except (NotFoundError, ValidationError, ConflictError) as e:
        raise_domain_exception_as_http(e, **_SALE_CREATE_DOMAIN_HTTP)

@router.patch("/{sale_id}/items/{item_id}", response_model=SaleItemResponse)
async def update_sale_item(
    sale_id: str,
    item_id: str,
    item_update: SaleItemUpdate,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme),
):
    """
    Update a sale item (preset, notes, quantity, weight, price).
    
    STORY-B52-P4: Amélioration éditeur d'item (destination et prix)
    - Preset and notes: editable by all operators
    - Price: editable by admin/super-admin only
    - Quantity and weight: editable by all operators
    - Price modifications are logged in audit log
    """
    user_id = _jwt_sub_from_optional_bearer(credentials)
    user = _user_for_sale_item_patch(db, user_id)

    try:
        return SaleService(db).update_sale_item(sale_id, item_id, item_update, user)
    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except (NotFoundError, ValidationError) as e:
        raise_domain_exception_as_http(e, **_SALE_ITEM_PATCH_DOMAIN_HTTP)
