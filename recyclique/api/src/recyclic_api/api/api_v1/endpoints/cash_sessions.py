import json
import logging
from pydantic import ValidationError as PydanticValidationError
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from recyclic_api.core.database import get_db
from recyclic_api.core.auth import get_current_user, require_role, require_role_strict
from recyclic_api.core.redis import get_redis
from recyclic_api.core.step_up import (
    IDEMPOTENCY_KEY_HEADER,
    SENSITIVE_OPERATION_CASH_SESSION_CLOSE,
    STEP_UP_PIN_HEADER,
    verify_step_up_pin_header,
)
from recyclic_api.services.idempotency_support import (
    body_fingerprint_close_json,
    get_cached_idempotent_close,
    redis_key_idempotent_close,
    store_idempotent_close,
    validate_or_raise_idempotency_conflict,
)
from recyclic_api.core.audit import (
    log_cash_sale,
    log_cash_session_access
)
from recyclic_api.models.user import User, UserRole
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.schemas.cash_session import (
    CashSessionCreate,
    CashSessionUpdate,
    CashSessionClose,
    CashSessionResponse,
    CashSessionListResponse,
    CashSessionFilters,
    CashSessionStats,
    CashSessionDetailResponse,
    SaleDetail,
    CashSessionStepUpdate,
    CashSessionStepResponse,
    CashSessionStep
)
from recyclic_api.application.cash_session_close_presentation import (
    present_close_cash_session_outcome,
)
from recyclic_api.application.cash_session_closing import run_close_cash_session
from recyclic_api.application.cash_session_opening import open_cash_session
from recyclic_api.services.cash_session_response_enrichment import enrich_session_response
from recyclic_api.services.cash_session_service import CashSessionService, CLOSE_VARIANCE_TOLERANCE
from recyclic_api.core.exceptions import ConflictError, NotFoundError, ValidationError
from recyclic_api.utils.domain_exception_http import raise_domain_exception_as_http
from uuid import UUID

router = APIRouter()

# Erreurs métier caisse : statuts inchangés (Conflict → 400, Validation → 400, NotFound → 404).
_CASH_DOMAIN_HTTP = {
    "not_found_status": 404,
    "conflict_status": 400,
    "validation_status": 400,
}

logger = logging.getLogger(__name__)


@router.post(
    "/", 
    response_model=CashSessionResponse,
    status_code=201,
    summary="Créer une session de caisse",
    description="""
    Crée une nouvelle session de caisse pour un opérateur.
    
    **Permissions requises :** CASHIER, ADMIN, ou SUPER_ADMIN
    
    **Règles métier :**
    - Un opérateur ne peut avoir qu'une seule session ouverte à la fois
    - Le montant initial doit être positif et inférieur à 10 000€
    - La session est automatiquement marquée comme "ouverte"
    
    **Audit :** Toutes les opérations sont tracées dans les logs d'audit
    """,
    responses={
        201: {
            "description": "Session créée avec succès",
            "content": {
                "application/json": {
                    "example": {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "operator_id": "550e8400-e29b-41d4-a716-446655440001",
                        "initial_amount": 50.0,
                        "current_amount": 50.0,
                        "status": "open",
                        "opened_at": "2025-01-27T10:30:00Z",
                        "closed_at": None,
                    "total_sales": 0.0,
                    "total_items": 0,
                    "register_options": {
                        "features": {
                            "no_item_pricing": {
                                "enabled": False,
                                "label": "Mode prix global (total saisi manuellement, article sans prix)"
                            }
                        }
                    }
                    }
                }
            }
        },
        400: {
            "description": "Erreur de validation ou session déjà ouverte",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Une session de caisse est déjà ouverte pour cet opérateur"
                    }
                }
            }
        },
        404: {
            "description": "Opérateur introuvable",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Opérateur non trouvé"
                    }
                }
            }
        },
        403: {
            "description": "Accès non autorisé",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Accès non autorisé"
                    }
                }
            }
        }
    },
    tags=["Sessions de Caisse"]
)
async def create_cash_session(
    request: Request,
    session_data: CashSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    """ARCH-04 : orchestration déléguée à ``application.cash_session_opening``."""
    rid = getattr(request.state, "request_id", None)
    return open_cash_session(
        db=db, current_user=current_user, session_data=session_data, request_id=rid
    )

@router.get(
    "/status/{register_id}",
    summary="Statut de session pour un poste de caisse",
    description="Retourne si une session est active pour le poste donné et l'ID de session le cas échéant.",
    tags=["Sessions de Caisse"]
)
async def get_cash_session_status(
    register_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    service = CashSessionService(db)
    session = service.get_open_session_by_register(register_id)
    return {
        "is_active": session is not None,
        "session_id": str(session.id) if session else None
    }


@router.get(
    "/deferred/check",
    summary="Vérifier si une session différée existe pour une date",
    description="Vérifie si l'opérateur a déjà une session différée ouverte pour la date spécifiée.",
    tags=["Sessions de Caisse"]
)
async def check_deferred_session_by_date(
    date: str = Query(..., description="Date au format YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    """
    Vérifie si une session différée existe pour la date fournie.
    
    Utilisé pour la reprise intelligente : avant de créer une nouvelle session,
    on vérifie si une session existe déjà pour cette date.
    """
    from datetime import datetime, timezone
    
    try:
        # Parser la date (format YYYY-MM-DD)
        target_date = datetime.strptime(date, "%Y-%m-%d")
        # Convertir en UTC (minuit UTC pour la date)
        target_date = target_date.replace(tzinfo=timezone.utc)
        
        service = CashSessionService(db)
        session = service.get_deferred_session_by_date(str(current_user.id), target_date)
        
        if session:
            return {
                "exists": True,
                "session_id": str(session.id),
                "opened_at": session.opened_at.isoformat(),
                "initial_amount": session.initial_amount,
                "total_sales": session.total_sales or 0,
                "total_items": session.total_items or 0
            }
        else:
            return {
                "exists": False,
                "session_id": None
            }
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Format de date invalide. Utilisez YYYY-MM-DD. Erreur: {str(e)}"
        )


@router.get(
    "/", 
    response_model=CashSessionListResponse,
    summary="Lister les sessions de caisse",
    description="""
    Récupère la liste des sessions de caisse avec filtres optionnels.
    
    **Permissions requises :** CASHIER, ADMIN ou SUPER_ADMIN
    
    **Filtres disponibles :**
    - `status` : Filtrer par statut (open/closed)
    - `operator_id` : Filtrer par opérateur
    - `date_from` : Date de début (ISO 8601)
    - `date_to` : Date de fin (ISO 8601)
    - `skip` : Nombre d'éléments à ignorer (pagination)
    - `limit` : Nombre maximum d'éléments (1-100)
    
    **Pagination :** Les résultats sont paginés pour optimiser les performances
    """,
    responses={
        200: {
            "description": "Liste des sessions récupérée avec succès",
            "content": {
                "application/json": {
                    "example": {
                        "data": [
                            {
                                "id": "550e8400-e29b-41d4-a716-446655440000",
                                "operator_id": "550e8400-e29b-41d4-a716-446655440001",
                                "initial_amount": 50.0,
                                "current_amount": 100.0,
                                "status": "open",
                                "opened_at": "2025-01-27T10:30:00Z",
                                "closed_at": None,
                                "total_sales": 50.0,
                                "total_items": 5,
                                "register_options": {
                                    "features": {
                                        "no_item_pricing": {
                                            "enabled": False,
                                            "label": "Mode prix global (total saisi manuellement, article sans prix)"
                                        }
                                    }
                                }
                            }
                        ],
                        "total": 1,
                        "skip": 0,
                        "limit": 20
                    }
                }
            }
        },
        403: {
            "description": "Accès non autorisé",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Accès non autorisé"
                    }
                }
            }
        }
    },
    tags=["Sessions de Caisse"]
)
async def get_cash_sessions(
    skip: int = Query(0, ge=0, description="Nombre d'éléments à ignorer"),
    limit: int = Query(20, ge=1, le=100, description="Nombre maximum d'éléments à retourner"),
    status: Optional[CashSessionStatus] = Query(None, description="Filtrer par statut"),
    operator_id: Optional[str] = Query(None, description="Filtrer par ID d'opérateur"),
    site_id: Optional[str] = Query(None, description="Filtrer par ID de site"),
    date_from: Optional[datetime] = Query(None, description="Date de début (ISO 8601)"),
    date_to: Optional[datetime] = Query(None, description="Date de fin (ISO 8601)"),
    search: Optional[str] = Query(None, description="Recherche textuelle (nom opérateur ou ID de session)"),
    include_empty: bool = Query(False, description="B44-P3: Inclure les sessions vides (sans transaction)"),
    # B45-P2: Filtres avancés
    amount_min: Optional[float] = Query(None, ge=0, description="Montant minimum (CA total)"),
    amount_max: Optional[float] = Query(None, ge=0, description="Montant maximum (CA total)"),
    variance_threshold: Optional[float] = Query(None, description="Seuil de variance (écart minimum)"),
    variance_has_variance: Optional[bool] = Query(None, description="Filtrer par présence/absence de variance"),
    duration_min_hours: Optional[float] = Query(None, ge=0, description="Durée minimum de session (en heures)"),
    duration_max_hours: Optional[float] = Query(None, ge=0, description="Durée maximum de session (en heures)"),
    payment_methods: Optional[List[str]] = Query(None, description="Méthodes de paiement (multi-sélection)"),
    has_donation: Optional[bool] = Query(None, description="Filtrer par présence de don"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    service = CashSessionService(db)
    
    filters = CashSessionFilters(
        skip=skip,
        limit=limit,
        status=status,
        operator_id=operator_id,
        site_id=site_id,
        date_from=date_from,
        date_to=date_to,
        search=search,
        include_empty=include_empty,
        amount_min=amount_min,
        amount_max=amount_max,
        variance_threshold=variance_threshold,
        variance_has_variance=variance_has_variance,
        duration_min_hours=duration_min_hours,
        duration_max_hours=duration_max_hours,
        payment_methods=payment_methods,
        has_donation=has_donation,
    )
    
    sessions, total = service.get_sessions_with_filters(filters)
    
    # Story B49-P1: Enrichir chaque session avec les options du register
    return CashSessionListResponse(
        data=[enrich_session_response(session, service) for session in sessions],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get(
    "/current",
    response_model=Optional[CashSessionResponse],
    summary="Session de caisse ouverte pour l'utilisateur connecté",
    description=(
        "Retourne la session ouverte (non différée) de l'utilisateur authentifié, "
        "ou null s'il n'en a pas — cas normal, pas une erreur."
    ),
    tags=["Sessions de Caisse"],
)
async def get_current_cash_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    """Récupère la session de caisse actuellement ouverte pour l'utilisateur connecté."""
    service = CashSessionService(db)
    try:
        session = service.get_open_session_by_operator(str(current_user.id))
        if not session:
            return None
        return enrich_session_response(session, service)
    except ValidationError as e:
        raise_domain_exception_as_http(e, **_CASH_DOMAIN_HTTP)
    except PydanticValidationError:
        # ``enrich_session_response`` journalise déjà les erreurs de schéma sur la session.
        raise HTTPException(
            status_code=500,
            detail="Erreur lors de la récupération de la session courante",
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception(
            "Erreur inattendue lors de la récupération de la session courante pour user %s",
            current_user.id,
        )
        raise HTTPException(
            status_code=500,
            detail="Erreur lors de la récupération de la session courante",
        )


@router.get(
    "/{session_id}",
    response_model=CashSessionDetailResponse,
    summary="Récupérer les détails d'une session de caisse",
    description="""
    Récupère les détails complets d'une session de caisse, y compris toutes les ventes associées.
    
    **Permissions requises :** ADMIN ou SUPER_ADMIN
    
    **Informations retournées :**
    - Détails de la session (opérateur, montants, dates, etc.)
    - Liste complète des ventes avec leurs détails
    - Informations sur l'opérateur et le site
    
    **Audit :** L'accès aux détails de session est tracé dans les logs d'audit
    """,
    responses={
        200: {
            "description": "Détails de la session récupérés avec succès",
            "content": {
                "application/json": {
                    "example": {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "operator_id": "550e8400-e29b-41d4-a716-446655440001",
                        "operator_name": "Jean Dupont",
                        "site_id": "550e8400-e29b-41d4-a716-446655440002",
                        "site_name": "Site Principal",
                        "initial_amount": 50.0,
                        "current_amount": 100.0,
                        "status": "closed",
                        "opened_at": "2025-01-27T10:30:00Z",
                        "closed_at": "2025-01-27T18:00:00Z",
                        "total_sales": 50.0,
                        "total_items": 5,
                        "sales": [
                            {
                                "id": "550e8400-e29b-41d4-a716-446655440003",
                                "total_amount": 25.0,
                                "donation": 5.0,
                                "payment_method": "cash",
                                "created_at": "2025-01-27T11:00:00Z",
                                "operator_id": "550e8400-e29b-41d4-a716-446655440001"
                            }
                        ],
                        "register_options": {
                            "features": {
                                "no_item_pricing": {
                                    "enabled": False,
                                    "label": "Mode prix global (total saisi manuellement, article sans prix)"
                                }
                            }
                        }
                    }
                }
            }
        },
        404: {
            "description": "Session non trouvée",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Session de caisse non trouvée"
                    }
                }
            }
        },
        400: {
            "description": "Identifiant de session invalide",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "session_id invalide"
                    }
                }
            }
        },
        403: {
            "description": "Accès non autorisé",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Accès non autorisé"
                    }
                }
            }
        }
    },
    tags=["Sessions de Caisse"]
)
async def get_cash_session_detail(
    request: Request,
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    """Récupère les détails complets d'une session de caisse avec ses ventes."""
    service = CashSessionService(db)
    rid = getattr(request.state, "request_id", None)

    try:
        # Récupérer la session avec ses relations (erreurs métier : ValidationError / NotFoundError)
        session = service.get_session_with_details_or_raise(session_id)
        
        # Log de l'accès aux détails
        log_cash_session_access(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id=session_id,
            success=True,
            db=db,
            request_id=rid,
            site_id=str(session.site_id) if session.site_id else None,
            cash_register_id=str(session.register_id) if session.register_id else None,
        )
        
        # B52-P6: Calculer les agrégations de poids pour la session et les ventes
        total_weight_out, sale_weights = service.get_session_weight_aggregations(session)

        # Construire la réponse avec les ventes, enrichies avec le poids total par panier
        sales_data = []
        for sale in session.sales:
            sale_schema = SaleDetail.model_validate(sale)
            sale_total_weight = sale_weights.get(str(sale.id), 0.0)
            sale_schema = sale_schema.model_copy(update={"total_weight": sale_total_weight})
            sales_data.append(sale_schema)

        # B50-P10/B52-P6: Utiliser enrich_session_response pour obtenir total_donations,
        # register_options et total_weight_out
        base_response = enrich_session_response(session, service, total_weight_out=total_weight_out)
        
        # Construire la réponse détaillée avec les ventes et infos supplémentaires
        response_data = base_response.model_dump()
        response_data.update({
            "sales": sales_data,
            "operator_name": session.operator.username if session.operator else None,
            "site_name": session.site.name if session.site else None
        })
        
        return CashSessionDetailResponse(**response_data)

    except NotFoundError as e:
        log_cash_session_access(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id=session_id,
            success=False,
            db=db,
            request_id=rid,
        )
        raise_domain_exception_as_http(e, **_CASH_DOMAIN_HTTP)
    except ValidationError as e:
        log_cash_session_access(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id=session_id,
            success=False,
            db=db,
            request_id=rid,
        )
        raise_domain_exception_as_http(e, **_CASH_DOMAIN_HTTP)
    except PydanticValidationError as exc:
        logger.error(
            "Sérialisation détail session : échec Pydantic (session_id=%s) : %s",
            session_id,
            exc.errors(),
            exc_info=exc,
        )
        log_cash_session_access(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id=session_id,
            success=False,
            db=db,
            request_id=rid,
        )
        raise HTTPException(
            status_code=500,
            detail="Erreur lors de la sérialisation des détails de la session",
        ) from exc
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erreur inattendue lors de la récupération du détail session %s", session_id)
        log_cash_session_access(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id=session_id,
            success=False,
            db=db,
            request_id=rid,
        )
        raise HTTPException(
            status_code=500,
            detail="Erreur lors de la récupération des détails de la session"
        )


@router.put("/{session_id}", response_model=CashSessionResponse)
async def update_cash_session(
    session_id: str,
    session_update: CashSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    """
    Met à jour une session de caisse.
    """
    service = CashSessionService(db)
    
    session = service.get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session de caisse non trouvée")
    
    # Vérifier que l'utilisateur peut modifier cette session
    if (current_user.role == UserRole.USER and 
        str(session.operator_id) != str(current_user.id)):
        raise HTTPException(status_code=403, detail="Accès non autorisé à cette session")
    
    # Mettre à jour la session
    updated_session = service.update_session(session_id, session_update)
    
    # Story B49-P1: Enrichir avec les options du register
    return enrich_session_response(updated_session, service)


@router.post(
    "/{session_id}/close", 
    response_model=CashSessionResponse,
    summary="Fermer une session de caisse",
    description="""
    Ferme une session de caisse ouverte.
    
    **Permissions requises :** CASHIER, ADMIN, ou SUPER_ADMIN
    
    **Règles métier :**
    - Seul l'opérateur de la session peut la fermer (sauf ADMIN/SUPER_ADMIN)
    - Une session fermée ne peut plus être modifiée
    - La date de fermeture est automatiquement enregistrée
    - Les statistiques finales sont calculées et sauvegardées
    
    **Audit :** La fermeture est tracée avec les statistiques finales
    """,
    responses={
        200: {
            "description": "Session fermée avec succès",
            "content": {
                "application/json": {
                    "example": {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "operator_id": "550e8400-e29b-41d4-a716-446655440001",
                        "initial_amount": 50.0,
                        "current_amount": 100.0,
                        "status": "closed",
                        "opened_at": "2025-01-27T10:30:00Z",
                        "closed_at": "2025-01-27T18:30:00Z",
                        "total_sales": 50.0,
                        "total_items": 5,
                        "register_options": {
                            "features": {
                                "no_item_pricing": {
                                    "enabled": False,
                                    "label": "Mode prix global (total saisi manuellement, article sans prix)"
                                }
                            }
                        }
                    }
                }
            }
        },
        400: {
            "description": "Session déjà fermée",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "La session est déjà fermée"
                    }
                }
            }
        },
        403: {
            "description": "Accès non autorisé à cette session",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Accès non autorisé à cette session"
                    }
                }
            }
        },
        404: {
            "description": "Session non trouvée",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Session de caisse non trouvée"
                    }
                }
            }
        }
    },
    tags=["Sessions de Caisse"]
)
async def close_cash_session(
    request: Request,
    session_id: str,
    close_data: CashSessionClose,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    redis_client=Depends(get_redis),
):
    """ARCH-04 : fermeture ``run_close_cash_session`` ; présentation ``present_close_cash_session_outcome``.

    Story 2.4 : step-up PIN serveur (``X-Step-Up-Pin``), idempotence optionnelle (``Idempotency-Key``).
    """
    verify_step_up_pin_header(
        user=current_user,
        pin_header_value=request.headers.get(STEP_UP_PIN_HEADER),
        redis_client=redis_client,
        operation=SENSITIVE_OPERATION_CASH_SESSION_CLOSE,
    )

    idem_key = request.headers.get(IDEMPOTENCY_KEY_HEADER)
    body_fp = body_fingerprint_close_json(close_data.model_dump())
    rkey = None
    if idem_key:
        rkey = redis_key_idempotent_close(str(current_user.id), session_id, idem_key)
        cached = get_cached_idempotent_close(redis_client, rkey)
        if cached:
            status_c, body = validate_or_raise_idempotency_conflict(cached, body_fp)
            return JSONResponse(status_code=status_c, content=body)

    service = CashSessionService(db)
    outcome = run_close_cash_session(
        db=db,
        service=service,
        current_user=current_user,
        session_id=session_id,
        close_data=close_data,
        request_id=getattr(request.state, "request_id", None),
    )
    result = present_close_cash_session_outcome(db=db, service=service, outcome=outcome)

    if idem_key and rkey:
        if isinstance(result, JSONResponse):
            sc = result.status_code
            bd = json.loads(result.body.decode())
        else:
            sc = 200
            bd = jsonable_encoder(result)
        store_idempotent_close(redis_client, rkey, body_fp, sc, bd)

    return result


@router.get("/stats/summary", response_model=CashSessionStats)
async def get_cash_session_stats(
    date_from: Optional[datetime] = Query(None, description="Date de début (ISO 8601)"),
    date_to: Optional[datetime] = Query(None, description="Date de fin (ISO 8601)"),
    site_id: Optional[str] = Query(None, description="Filtrer par ID de site"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # Changed: Allow all authenticated users
    response: Response = Response(),
):
    """
    Récupère les statistiques des sessions de caisse (KPIs agrégés).

    Seuls les administrateurs peuvent voir les statistiques.
    
    **⚠️ DEPRECATED:** This endpoint is deprecated. Use `/v1/stats/live` instead.
    This endpoint will be removed in 3 months (2025-03-09).
    """
    # Add deprecation headers (Story B48-P7)
    response.headers["Deprecation"] = "true"
    response.headers["Sunset"] = "Mon, 09 Mar 2025 00:00:00 GMT"
    response.headers["Link"] = '</v1/stats/live>; rel="successor-version"'
    
    service = CashSessionService(db)

    stats = service.get_session_stats(date_from=date_from, date_to=date_to, site_id=site_id)

    return CashSessionStats(**stats)


@router.get(
    "/{session_id}/step",
    response_model=CashSessionStepResponse,
    summary="Récupérer les métriques d'étape d'une session",
    description="""
    Récupère l'état actuel de l'étape du workflow pour une session de caisse.

    **Permissions requises :** USER, ADMIN, ou SUPER_ADMIN

    **Informations retournées :**
    - Étape actuelle du workflow (entry/sale/exit)
    - Timestamp de début de l'étape actuelle
    - Timestamp de dernière activité
    - Durée écoulée dans l'étape actuelle

    **Utilisation :** Sert aux indicateurs visuels de progression dans l'interface
    """,
    responses={
        200: {
            "description": "Métriques d'étape récupérées avec succès",
            "content": {
                "application/json": {
                    "example": {
                        "session_id": "550e8400-e29b-41d4-a716-446655440000",
                        "current_step": "entry",
                        "step_start_time": "2025-01-27T10:30:00Z",
                        "last_activity": "2025-01-27T10:35:00Z",
                        "step_duration_seconds": 300.0
                    }
                }
            }
        },
        404: {
            "description": "Session non trouvée",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Session de caisse non trouvée"
                    }
                }
            }
        },
        403: {
            "description": "Accès non autorisé",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Accès non autorisé"
                    }
                }
            }
        }
    },
    tags=["Sessions de Caisse - Métriques d'Étape"]
)
async def get_session_step_metrics(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    """Récupère les métriques d'étape actuelles d'une session."""
    service = CashSessionService(db)

    session = service.get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session de caisse non trouvée")

    # Vérifier que l'utilisateur peut accéder à cette session
    if (current_user.role == UserRole.USER and
        str(session.operator_id) != str(current_user.id)):
        raise HTTPException(status_code=403, detail="Accès non autorisé à cette session")

    # Récupérer les métriques d'étape
    step_metrics = session.get_step_metrics()

    return CashSessionStepResponse(
        session_id=session_id,
        **step_metrics
    )


@router.put(
    "/{session_id}/step",
    response_model=CashSessionStepResponse,
    summary="Mettre à jour l'étape d'une session",
    description="""
    Met à jour l'étape actuelle du workflow pour une session de caisse.

    **Permissions requises :** USER, ADMIN, ou SUPER_ADMIN

    **Règles métier :**
    - Seul l'opérateur de la session peut changer son étape
    - Les transitions d'étape mettent à jour les métriques de performance
    - L'activité est automatiquement tracée avec timestamp

    **Étapes disponibles :**
    - `entry` : Phase de réception/dépôt d'objets
    - `sale` : Phase de vente (caisse)
    - `exit` : Phase de clôture

    **Audit :** Les changements d'étape sont tracés dans les logs
    """,
    responses={
        200: {
            "description": "Étape mise à jour avec succès",
            "content": {
                "application/json": {
                    "example": {
                        "session_id": "550e8400-e29b-41d4-a716-446655440000",
                        "current_step": "sale",
                        "step_start_time": "2025-01-27T10:35:00Z",
                        "last_activity": "2025-01-27T10:35:00Z",
                        "step_duration_seconds": 0.0
                    }
                }
            }
        },
        400: {
            "description": "Erreur de validation",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Étape invalide"
                    }
                }
            }
        },
        403: {
            "description": "Accès non autorisé",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Accès non autorisé à cette session"
                    }
                }
            }
        },
        404: {
            "description": "Session non trouvée",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Session de caisse non trouvée"
                    }
                }
            }
        }
    },
    tags=["Sessions de Caisse - Métriques d'Étape"]
)
async def update_session_step(
    session_id: str,
    step_update: CashSessionStepUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    """Met à jour l'étape actuelle d'une session et retourne les nouvelles métriques."""
    service = CashSessionService(db)

    try:
        session = service.get_session_by_id_or_raise(session_id)
    except (NotFoundError, ValidationError) as e:
        raise_domain_exception_as_http(e, **_CASH_DOMAIN_HTTP)

    # Vérifier que l'utilisateur peut modifier cette session
    if (current_user.role == UserRole.USER and
        str(session.operator_id) != str(current_user.id)):
        raise HTTPException(status_code=403, detail="Accès non autorisé à cette session")

    try:
        session = service.apply_step_update_to_open_session(session, step_update.step)
        logger.info(
            "Session %s: étape changée vers %s par %s",
            session_id,
            step_update.step.value,
            current_user.username or current_user.id,
        )
        step_metrics = session.get_step_metrics()
        return CashSessionStepResponse(
            session_id=session_id,
            **step_metrics
        )
    except (ConflictError, ValidationError) as e:
        raise_domain_exception_as_http(e, **_CASH_DOMAIN_HTTP)
    except HTTPException:
        raise
    except Exception:
        logger.exception(
            "Erreur inattendue lors de la mise à jour de l'étape pour la session %s",
            session_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Erreur lors de la mise à jour de l'étape",
        )


# Re-export pour compatibilité tests (monkeypatch ARCH-04) : la présentation post-close
# résout ces symboles via import local depuis ce module.
from recyclic_api.core.email_service import get_email_service  # noqa: E402
from recyclic_api.services.export_service import generate_cash_session_report  # noqa: E402
