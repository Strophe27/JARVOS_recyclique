from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Annotated, List
from uuid import UUID

from recyclic_api.core.context_binding_guard import enforce_optional_client_context_binding
from recyclic_api.core.database import get_db
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from recyclic_api.core.security import verify_token
from recyclic_api.models.user import User, UserRole
from recyclic_api.schemas.sale import (
    SaleCorrectionCreate,
    SaleResponse,
    SaleCreate,
    SaleUpdate,
    SaleItemUpdate,
    SaleItemResponse,
    SaleItemWeightUpdate,
    SaleHoldCreate,
    SaleFinalizeHeld,
    SalePaymentMethodOption,
    SaleReversalCreate,
    SaleReversalResponse,
)
from recyclic_api.core.auth import require_role_strict, resolve_access_token
from recyclic_api.core.exceptions import AuthorizationError, ConflictError, NotFoundError, ValidationError
from recyclic_api.core.redis import get_redis
from recyclic_api.core.step_up import (
    IDEMPOTENCY_KEY_HEADER,
    SENSITIVE_OPERATION_CASH_SALE_CORRECT,
    STEP_UP_PIN_HEADER,
    verify_step_up_pin_header,
)
from recyclic_api.services.idempotency_support import (
    body_fingerprint_sale_correction_json,
    body_fingerprint_sale_create_json,
    body_fingerprint_sale_finalize_held_json,
    get_cached_idempotent_close,
    redis_key_idempotent_sale_correction,
    redis_key_idempotent_sale_create,
    redis_key_idempotent_sale_finalize,
    store_idempotent_close,
    validate_or_raise_idempotency_conflict,
)
from recyclic_api.services.sale_service import SaleService
from recyclic_api.utils.domain_exception_http import raise_domain_exception_as_http
from recyclic_api.utils.rate_limit import conditional_rate_limit

router = APIRouter()
auth_scheme = HTTPBearer(auto_error=False)


def _jwt_sub_from_bearer_or_cookie(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials],
) -> str:
    """
    Extrait le claim ``sub`` : en-tête ``Authorization: Bearer`` prioritaire, sinon cookie
    d'accès web v2 (``resolve_access_token``), aligné sur le contrat OpenAPI ``bearerOrCookie``.

    401 et messages inchangés côté client quand l'auth est absente ou invalide.
    ``PATCH .../weight`` et corrections sensibles restent sur ``require_role_strict``.
    """
    token = resolve_access_token(request, credentials)
    if token is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = verify_token(token)
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
    try:
        uid = UUID(str(user_id))
    except ValueError:
        raise HTTPException(status_code=401, detail="User not found")
    user = db.query(User).filter(User.id == uid).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def _user_uuid_or_none(user_id: str) -> UUID | None:
    try:
        return UUID(str(user_id))
    except ValueError:
        return None


def _enforce_sales_context_binding(request: Request, db: Session, user_id: str) -> None:
    """Story 25.8 — refus 409 ``CONTEXT_STALE`` si les en-têtes de contexte ne matchent pas l'enveloppe."""
    uid = _user_uuid_or_none(user_id)
    if uid is None:
        return
    enforce_optional_client_context_binding(request, db, uid)


def _require_admin_for_sale_note(db: Session, user_id: str) -> None:
    """
    Vérifie admin/super-admin pour PUT note.

    Absence en base ou rôle insuffisant → 403 (même message) ; comportement distinct
    de PATCH item (401 ``User not found`` si utilisateur absent).
    """
    try:
        uid = UUID(str(user_id))
    except ValueError:
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions. Admin access required.",
        )
    user = db.query(User).filter(User.id == uid).first()
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

# Story 6.4 — reversals : conflits métier → 409 (double remboursement, vente non completed, etc.).
_SALE_REVERSAL_DOMAIN_HTTP = {
    "not_found_status": 404,
    "conflict_status": 409,
    "validation_status": 400,
}

# Story 6.8 — corrections sensibles : session clôturée / remboursement → 409.
_SALE_CORRECTION_DOMAIN_HTTP = {
    "not_found_status": 404,
    "conflict_status": 409,
    "validation_status": 400,
}

# Story 6.3 — chemins statiques avant /{sale_id} pour éviter « held » capturé comme UUID.
@conditional_rate_limit("120/minute")
@router.get(
    "/payment-method-options",
    response_model=list[SalePaymentMethodOption],
    summary="Moyens de paiement caisse (référentiel expert actif)",
    operation_id="recyclique_sales_listPaymentMethodOptions",
)
async def list_sale_payment_method_options(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme),
):
    """Codes et libellés pour UI caisse — alignés sur l’admin comptable expert (pas d’import Paheko)."""
    response.headers["Cache-Control"] = "private, no-store"
    user_id = _jwt_sub_from_bearer_or_cookie(request, credentials)
    try:
        return SaleService(db).list_payment_method_options_for_caisse(user_id)
    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/held", response_model=List[SaleResponse])
async def list_held_sales_for_session(
    request: Request,
    cash_session_id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme),
):
    """Tickets en attente pour une session de caisse (garde opérateur / site / permission)."""
    user_id = _jwt_sub_from_bearer_or_cookie(request, credentials)
    try:
        uid = UUID(str(user_id))
    except ValueError:
        raise HTTPException(status_code=401, detail="User not found")
    row = db.query(User).filter(User.id == uid).first()
    if not row:
        raise HTTPException(status_code=401, detail="User not found")
    try:
        return SaleService(db).list_held_sales_for_session(cash_session_id, user_id, limit=limit)
    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/hold", response_model=SaleResponse)
async def create_held_sale(
    request: Request,
    hold_data: SaleHoldCreate,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme),
):
    """Met un panier en attente (persisté serveur, sans paiement ni agrégat session)."""
    user_id = _jwt_sub_from_bearer_or_cookie(request, credentials)
    _enforce_sales_context_binding(request, db, user_id)
    rid = getattr(request.state, "request_id", None)
    try:
        return SaleService(db).create_held_sale(hold_data, user_id, request_id=rid)
    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except (NotFoundError, ValidationError, ConflictError) as e:
        raise_domain_exception_as_http(e, **_SALE_CREATE_DOMAIN_HTTP)


@router.post("/reversals", response_model=SaleReversalResponse)
async def create_sale_reversal(
    request: Request,
    body: SaleReversalCreate,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme),
):
    """
    Story 6.4 — enregistre un remboursement total (reversal) lié à une vente ``completed``.

    Permission effective ``caisse.refund`` + mêmes garde-fous session / site / opérateur que la vente nominale.
    """
    user_id = _jwt_sub_from_bearer_or_cookie(request, credentials)
    try:
        uid = UUID(str(user_id))
    except ValueError:
        raise HTTPException(status_code=401, detail="User not found")
    row = db.query(User).filter(User.id == uid).first()
    if not row:
        raise HTTPException(status_code=401, detail="User not found")

    _enforce_sales_context_binding(request, db, user_id)
    rid = getattr(request.state, "request_id", None)
    try:
        return SaleService(db).create_sale_reversal(body, user_id, request_id=rid)
    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except (NotFoundError, ValidationError, ConflictError) as e:
        raise_domain_exception_as_http(e, **_SALE_REVERSAL_DOMAIN_HTTP)


@router.patch("/{sale_id}/corrections", response_model=SaleResponse)
async def correct_sale_sensitive(
    request: Request,
    sale_id: str,
    body: Annotated[SaleCorrectionCreate, Body(discriminator="kind")],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([UserRole.SUPER_ADMIN])),
    redis_client=Depends(get_redis),
):
    """
    Story 6.8 — correction post-hoc bornée (super-admin).

    Liste fermée : ``kind: sale_date`` ou ``finalize_fields`` (donation, total_amount, payment_method, note,
    ``items[]`` lignes article, remplacement ``payments`` / ``donation_surplus``).
    Une session de caisse **clôturée** n'est plus bloquante (données historiques) ; l'audit porte le statut de session.
    Step-up ``X-Step-Up-Pin`` obligatoire ; ``Idempotency-Key`` optionnel (rejouer la même réponse).
    """
    verify_step_up_pin_header(
        user=current_user,
        pin_header_value=request.headers.get(STEP_UP_PIN_HEADER),
        redis_client=redis_client,
        operation=SENSITIVE_OPERATION_CASH_SALE_CORRECT,
    )

    idem_key = (request.headers.get(IDEMPOTENCY_KEY_HEADER) or "").strip() or None
    body_fp = body_fingerprint_sale_correction_json(body.model_dump(mode="json"))
    rkey = None
    if idem_key:
        rkey = redis_key_idempotent_sale_correction(str(current_user.id), sale_id, idem_key)
        cached = get_cached_idempotent_close(redis_client, rkey)
        if cached:
            status_c, response_body = validate_or_raise_idempotency_conflict(cached, body_fp)
            return JSONResponse(status_code=status_c, content=response_body)

    rid = getattr(request.state, "request_id", None)
    try:
        result = SaleService(db).apply_sensitive_sale_correction(
            sale_id, body, current_user, request_id=rid
        )
    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except (NotFoundError, ValidationError, ConflictError) as e:
        raise_domain_exception_as_http(e, **_SALE_CORRECTION_DOMAIN_HTTP)

    encoded = jsonable_encoder(result)
    if idem_key and rkey:
        store_idempotent_close(redis_client, rkey, body_fp, 200, encoded)
    return result


@router.get("/reversals/{reversal_id}", response_model=SaleReversalResponse)
async def get_sale_reversal(
    request: Request,
    reversal_id: str,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme),
):
    """Story 6.4 — détail d'un reversal si la vente source est lisible par l'utilisateur."""
    user_id = _jwt_sub_from_bearer_or_cookie(request, credentials)
    try:
        uid = UUID(str(user_id))
    except ValueError:
        raise HTTPException(status_code=401, detail="User not found")
    row = db.query(User).filter(User.id == uid).first()
    if not row:
        raise HTTPException(status_code=401, detail="User not found")

    try:
        return SaleService(db).get_sale_reversal_readable(reversal_id, user_id)
    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except (NotFoundError, ValidationError, ConflictError) as e:
        raise_domain_exception_as_http(e, **_SALE_REVERSAL_DOMAIN_HTTP)


@router.get("/{sale_id}", response_model=SaleResponse)
async def get_sale(
    request: Request,
    sale_id: str,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme),
):
    """
    Détail vente / ticket (Story 6.2).

    Authentification obligatoire ; revalidation permission caisse, site et opérateur
    (sauf admin / super-admin : lecture élargie).
    """
    user_id = _jwt_sub_from_bearer_or_cookie(request, credentials)
    try:
        uid = UUID(str(user_id))
    except ValueError:
        raise HTTPException(status_code=401, detail="User not found")
    row = db.query(User).filter(User.id == uid).first()
    if not row:
        raise HTTPException(status_code=401, detail="User not found")

    try:
        sale = SaleService(db).get_sale_readable_by_user(sale_id, user_id)
        return SaleService(db).build_sale_response(sale)
    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

@router.put("/{sale_id}", response_model=SaleResponse)
async def update_sale_note(
    request: Request,
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
    user_id = _jwt_sub_from_bearer_or_cookie(request, credentials)
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
    request: Request,
    sale_data: SaleCreate,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme),
    redis_client=Depends(get_redis),
):
    """
    Create new sale with items and operator traceability.

    STORY-B12-P5: Finalisation du Ticket de Caisse
    - Accepts: category, weight (kg), unit_price, total_price for each item
    - CRITICAL: total_amount = sum of all total_price (NO multiplication by weight)
    - Example: Item with weight=2.5kg and total_price=15.0 contributes 15.0 to total (NOT 37.5)
    """
    user_id = _jwt_sub_from_bearer_or_cookie(request, credentials)
    _enforce_sales_context_binding(request, db, user_id)
    rid = getattr(request.state, "request_id", None)

    idem_key = (request.headers.get(IDEMPOTENCY_KEY_HEADER) or "").strip() or None
    body_fp = body_fingerprint_sale_create_json(sale_data.model_dump(mode="json"))
    rkey = None
    if idem_key:
        rkey = redis_key_idempotent_sale_create(user_id, idem_key)
        cached = get_cached_idempotent_close(redis_client, rkey)
        if cached:
            status_c, response_body = validate_or_raise_idempotency_conflict(cached, body_fp)
            return JSONResponse(status_code=status_c, content=response_body)

    try:
        result = SaleService(db).create_sale(sale_data, user_id, request_id=rid)
    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except (NotFoundError, ValidationError, ConflictError) as e:
        raise_domain_exception_as_http(e, **_SALE_CREATE_DOMAIN_HTTP)

    encoded = jsonable_encoder(result)
    if idem_key and rkey:
        store_idempotent_close(redis_client, rkey, body_fp, 200, encoded)
    return result


@router.post("/{sale_id}/finalize-held", response_model=SaleResponse)
async def finalize_held_sale(
    request: Request,
    sale_id: str,
    payload: SaleFinalizeHeld,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme),
    redis_client=Depends(get_redis),
):
    """Finalise un ticket précédemment mis en attente (paiement + agrégats session)."""
    user_id = _jwt_sub_from_bearer_or_cookie(request, credentials)
    _enforce_sales_context_binding(request, db, user_id)
    rid = getattr(request.state, "request_id", None)

    idem_key = (request.headers.get(IDEMPOTENCY_KEY_HEADER) or "").strip() or None
    body_fp = body_fingerprint_sale_finalize_held_json(payload.model_dump(mode="json"))
    rkey = None
    if idem_key:
        rkey = redis_key_idempotent_sale_finalize(user_id, sale_id, idem_key)
        cached = get_cached_idempotent_close(redis_client, rkey)
        if cached:
            status_c, response_body = validate_or_raise_idempotency_conflict(cached, body_fp)
            return JSONResponse(status_code=status_c, content=response_body)

    try:
        result = SaleService(db).finalize_held_sale(sale_id, payload, user_id, request_id=rid)
    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except (NotFoundError, ValidationError, ConflictError) as e:
        raise_domain_exception_as_http(e, **_SALE_CREATE_DOMAIN_HTTP)

    encoded = jsonable_encoder(result)
    if idem_key and rkey:
        store_idempotent_close(redis_client, rkey, body_fp, 200, encoded)
    return result


@router.post("/{sale_id}/abandon-held", response_model=SaleResponse)
async def abandon_held_sale(
    request: Request,
    sale_id: str,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme),
):
    """Abandon explicite d'un ticket en attente."""
    user_id = _jwt_sub_from_bearer_or_cookie(request, credentials)
    _enforce_sales_context_binding(request, db, user_id)
    rid = getattr(request.state, "request_id", None)
    try:
        return SaleService(db).abandon_held_sale(sale_id, user_id, request_id=rid)
    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except (NotFoundError, ValidationError, ConflictError) as e:
        raise_domain_exception_as_http(e, **_SALE_CREATE_DOMAIN_HTTP)


@router.patch("/{sale_id}/items/{item_id}", response_model=SaleItemResponse)
async def update_sale_item(
    request: Request,
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
    user_id = _jwt_sub_from_bearer_or_cookie(request, credentials)
    _enforce_sales_context_binding(request, db, user_id)
    user = _user_for_sale_item_patch(db, user_id)

    try:
        return SaleService(db).update_sale_item(sale_id, item_id, item_update, user)
    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except (NotFoundError, ValidationError, ConflictError) as e:
        raise_domain_exception_as_http(e, **_SALE_ITEM_PATCH_DOMAIN_HTTP)
