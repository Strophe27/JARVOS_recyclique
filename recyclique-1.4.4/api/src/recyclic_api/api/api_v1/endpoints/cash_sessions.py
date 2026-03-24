import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timezone

from recyclic_api.core.database import get_db
from recyclic_api.core.auth import get_current_user, require_role, require_role_strict
from recyclic_api.core.audit import (
    log_cash_session_opening,
    log_cash_session_closing,
    log_cash_sale,
    log_cash_session_access
)
from recyclic_api.models.user import User, UserRole
from recyclic_api.models.cash_session import CashSession, CashSessionStatus, CashSessionStep
from recyclic_api.models.sale import Sale
from recyclic_api.core.config import settings
from recyclic_api.core.email_service import EmailAttachment, get_email_service
from recyclic_api.services.export_service import generate_cash_session_report
from recyclic_api.utils.report_tokens import generate_download_token
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
from recyclic_api.services.cash_session_service import CashSessionService
from uuid import UUID

router = APIRouter()


logger = logging.getLogger(__name__)


def enrich_session_response(
    session: CashSession,
    service: CashSessionService,
    total_weight_out: Optional[float] = None,
) -> CashSessionResponse:
    """Story B49-P1: Enrichit une réponse de session avec les options du register.
    
    Args:
        session: La session de caisse à enrichir
        service: Le service de session pour récupérer les options
        
    Returns:
        CashSessionResponse enrichi avec register_options et total_donations
    """
    # Récupérer les options du register via la méthode publique qui valide avec Pydantic
    register_options = service.get_register_options(session)

    # B50-P10: Calculer total_donations depuis les ventes de la session
    from recyclic_api.models.sale import Sale

    total_donations = (
        service.db.query(func.coalesce(func.sum(Sale.donation), 0))
        .filter(Sale.cash_session_id == session.id)
        .scalar()
        or 0.0
    )
    total_donations = float(total_donations)

    # B52-P6: Calculer le poids total sorti si non fourni
    if total_weight_out is None:
        total_weight_out, _ = service.get_session_weight_aggregations(session)

    # Construire la réponse avec tous les champs
    response_data = CashSessionResponse.model_validate(session).model_dump()
    response_data["register_options"] = register_options
    response_data["total_donations"] = total_donations  # B50-P10: Ajouter les dons calculés
    response_data["total_weight_out"] = total_weight_out  # B52-P6: Poids total sorti sur la session

    return CashSessionResponse(**response_data)

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
    session_data: CashSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    service = CashSessionService(db)
    try:
        # B50-P4: Vérifier les permissions si opened_at est fourni (saisie différée)
        # Les admins/super-admins ont toujours accès, mais les USER avec permission caisse.deferred.access aussi
        if session_data.opened_at is not None:
            from recyclic_api.core.auth import user_has_permission
            has_deferred_permission = user_has_permission(current_user, 'caisse.deferred.access', db)
            is_admin = current_user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]
            
            if not (is_admin or has_deferred_permission):
                log_cash_session_opening(
                    user_id=str(current_user.id),
                    username=current_user.username or "Unknown",
                    session_id="",
                    opening_amount=session_data.initial_amount,
                    success=False,
                    db=db
                )
                raise HTTPException(
                    status_code=403,
                    detail="Permission requise: caisse.deferred.access pour créer des sessions avec une date personnalisée (saisie différée)"
                )
        
        # B44-P1: Vérifier qu'il n'y a pas déjà une session ouverte pour cet opérateur
        # Exception: les sessions différées peuvent être créées même si l'opérateur a une session normale ouverte
        if session_data.opened_at is None:
            # Pour les sessions normales, vérifier qu'il n'y a pas déjà une session ouverte
            existing_session = service.get_open_session_by_operator(session_data.operator_id)
            if existing_session:
                log_cash_session_opening(
                    user_id=str(current_user.id),
                    username=current_user.username or "Unknown",
                    session_id="",
                    opening_amount=session_data.initial_amount,
                    success=False,
                    db=db
                )
                raise HTTPException(
                    status_code=400,
                    detail="Une session de caisse est déjà ouverte pour cet opérateur"
                )
        # Pour les sessions différées, on permet la création même si l'opérateur a une session normale ouverte

        # Créer la nouvelle session avec opened_at si fourni
        cash_session = service.create_session(
            operator_id=session_data.operator_id,
            site_id=session_data.site_id,
            initial_amount=session_data.initial_amount,
            register_id=session_data.register_id,
            opened_at=session_data.opened_at,
        )

        # Initialiser les métriques d'étape (commencer par 'entry' pour les sessions de réception)
        cash_session.set_current_step(CashSessionStep.ENTRY)

        # Sauvegarder l'initialisation des métriques
        db.commit()

        # Log de l'ouverture de session (avec flag is_deferred si opened_at fourni)
        is_deferred = session_data.opened_at is not None
        log_cash_session_opening(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id=str(cash_session.id),
            opening_amount=session_data.initial_amount,
            success=True,
            is_deferred=is_deferred,
            opened_at=session_data.opened_at,
            created_at=datetime.now(timezone.utc) if is_deferred else None,
            db=db
        )

        # Sérialiser la réponse - utiliser from_orm pour éviter les problèmes de lazy loading
        try:
            # Rafraîchir l'objet depuis la DB pour s'assurer que tous les champs sont chargés
            db.refresh(cash_session)
            # Story B49-P1: Enrichir avec les options du register
            response = enrich_session_response(cash_session, service)
            return response
        except Exception as serialization_error:
            logger.error(f"Erreur lors de la sérialisation de la session {cash_session.id}: {serialization_error}", exc_info=True)
            # Fallback: construire manuellement la réponse
            return CashSessionResponse(
                id=str(cash_session.id),
                operator_id=str(cash_session.operator_id),
                site_id=str(cash_session.site_id),
                register_id=str(cash_session.register_id) if cash_session.register_id else None,
                initial_amount=cash_session.initial_amount,
                current_amount=cash_session.current_amount,
                status=cash_session.status,
                opened_at=cash_session.opened_at,
                closed_at=cash_session.closed_at,
                total_sales=cash_session.total_sales,
                total_items=cash_session.total_items,
                closing_amount=cash_session.closing_amount,
                actual_amount=cash_session.actual_amount,
                variance=cash_session.variance,
                variance_comment=cash_session.variance_comment
            )
    except ValueError as e:
        log_cash_session_opening(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id="",
            opening_amount=session_data.initial_amount,
            success=False,
            db=db
        )
        # Important: renvoyer un JSON cohérent
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Log any unexpected error before re-raising
        logger.error(f"Unexpected error in create_cash_session: {e}", exc_info=True)
        log_cash_session_opening(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id="",
            opening_amount=session_data.initial_amount,
            success=False,
            db=db
        )
        # Ensure proper error response format
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la création de la session de caisse: {str(e)}"
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


@router.get("/current", response_model=Optional[CashSessionResponse])
async def get_current_cash_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    """
    Récupère la session de caisse actuellement ouverte pour l'utilisateur connecté.
    """
    logging.info(f"=== DEBUG: get_current_cash_session appelé pour user {current_user.id} ===")
    try:
        service = CashSessionService(db)
        session = service.get_open_session_by_operator(str(current_user.id))
        
        logging.info(f"=== DEBUG: session trouvée: {session is not None} ===")
        
        if not session:
            logging.info("=== DEBUG: Aucune session ouverte, retour null ===")
            return None
        
        logging.info(f"=== DEBUG: Retour de la session {session.id} ===")
        # Story B49-P1: Enrichir avec les options du register
        return enrich_session_response(session, service)
        
    except Exception as e:
        # Log de l'erreur pour debug
        logging.error(f"=== DEBUG: Erreur dans get_current_cash_session: {e} ===")
        logging.error(f"=== DEBUG: Type d'erreur: {type(e)} ===")
        logging.error(f"=== DEBUG: User ID: {current_user.id} ===")
        
        # Retourner une erreur 500 avec plus de détails
        raise HTTPException(
            status_code=500,
            detail=f"DEBUG: Erreur lors de la récupération de la session courante: {str(e)}"
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
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    """Récupère les détails complets d'une session de caisse avec ses ventes."""
    service = CashSessionService(db)
    
    try:
        # Récupérer la session avec ses relations
        session = service.get_session_with_details(session_id)
        if not session:
            raise HTTPException(
                status_code=404,
                detail="Session de caisse non trouvée"
            )
        
        # Log de l'accès aux détails
        log_cash_session_access(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id=session_id,
            success=True,
            db=db
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
        
    except HTTPException:
        raise
    except Exception as e:
        # Log de l'erreur d'accès
        log_cash_session_access(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id=session_id,
            success=False,
            db=db
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
    session_id: str,
    close_data: CashSessionClose,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    service = CashSessionService(db)
    
    try:
        session = service.get_session_by_id(session_id)
        if not session:
            log_cash_session_closing(
                user_id=str(current_user.id),
                username=current_user.username or "Unknown",
                session_id=session_id,
                closing_amount=0,
                success=False,
                db=db
            )
            raise HTTPException(status_code=404, detail="Session de caisse non trouvée")
        
        # Vérifier que l'utilisateur peut fermer cette session
        if (current_user.role == UserRole.USER and 
            str(session.operator_id) != str(current_user.id)):
            log_cash_session_closing(
                user_id=str(current_user.id),
                username=current_user.username or "Unknown",
                session_id=session_id,
                closing_amount=session.current_amount,
                success=False,
                db=db
            )
            raise HTTPException(status_code=403, detail="Accès non autorisé à cette session")
        
        if session.status == CashSessionStatus.CLOSED:
            log_cash_session_closing(
                user_id=str(current_user.id),
                username=current_user.username or "Unknown",
                session_id=session_id,
                closing_amount=session.current_amount,
                success=False,
                db=db
            )
            raise HTTPException(status_code=400, detail="La session est déjà fermée")
        
        # Valider que le commentaire est fourni si il y a un écart
        # B50-P10: Calculer le montant théorique en incluant les dons
        # Le montant théorique = fond initial + ventes + dons
        total_donations = db.query(func.coalesce(func.sum(Sale.donation), 0)).filter(
            Sale.cash_session_id == session_id
        ).scalar() or 0.0
        total_donations = float(total_donations)
        
        theoretical_amount = session.initial_amount + (session.total_sales or 0) + total_donations
        variance = close_data.actual_amount - theoretical_amount
        
        # B50-P10: Logs de debug pour diagnostiquer les problèmes de variance
        logger.info(
            f"[close_cash_session] Calcul de variance - "
            f"session_id={session_id}, "
            f"initial_amount={session.initial_amount}, "
            f"total_sales={session.total_sales}, "
            f"total_donations={total_donations}, "
            f"theoretical_amount={theoretical_amount}, "
            f"actual_amount={close_data.actual_amount}, "
            f"variance={variance}, "
            f"abs_variance={abs(variance)}, "
            f"has_comment={bool(close_data.variance_comment)}"
        )
        
        # B50-P10: Tolérance augmentée à 5 centimes pour gérer les problèmes d'arrondi
        # et de précision, surtout pour les bénévoles qui utilisent le localStorage
        if abs(variance) > 0.05 and not close_data.variance_comment:  # Tolérance de 5 centimes
            log_cash_session_closing(
                user_id=str(current_user.id),
                username=current_user.username or "Unknown",
                session_id=session_id,
                closing_amount=close_data.actual_amount,
                success=False,
                db=db
            )
            # B50-P10: Message d'erreur amélioré avec les valeurs calculées
            error_detail = (
                f"Un commentaire est obligatoire en cas d'écart entre le montant théorique "
                f"({theoretical_amount:.2f}€) et le montant physique ({close_data.actual_amount:.2f}€). "
                f"Écart: {variance:+.2f}€"
            )
            raise HTTPException(
                status_code=400, 
                detail=error_detail
            )
        
        # B44-P3: Fermer la session avec contrôle des montants
        # Si la session est vide, elle sera supprimée au lieu d'être fermée
        closed_session = service.close_session_with_amounts(
            session_id, 
            close_data.actual_amount, 
            close_data.variance_comment
        )
        
        # B44-P3: Si la session était vide, elle a été supprimée
        if closed_session is None:
            # Session vide supprimée : retourner un message informatif
            log_cash_session_closing(
                user_id=str(current_user.id),
                username=current_user.username or "Unknown",
                session_id=session_id,
                closing_amount=0,
                success=True,
                db=db
            )
            # Retourner une réponse JSON personnalisée (pas CashSessionResponse)
            return JSONResponse(
                status_code=200,
                content={
                    "message": "Session vide non enregistrée",
                    "session_id": session_id,
                    "deleted": True
                }
            )
        
        # Log de la fermeture de session normale
        log_cash_session_closing(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id=session_id,
            closing_amount=closed_session.current_amount,
            success=True,
            db=db
        )
        

        report_path = generate_cash_session_report(db, closed_session)
        download_token = generate_download_token(report_path.name)
        report_download_url = f"{settings.API_V1_STR}/admin/reports/cash-sessions/{report_path.name}?token={download_token}"
        email_sent = False

        recipient = settings.CASH_SESSION_REPORT_RECIPIENT
        if not recipient:
            logger.warning("CASH_SESSION_REPORT_RECIPIENT is not configured; skipping report email dispatch")
        else:
            try:
                email_service = get_email_service()
                with report_path.open('rb') as report_file:
                    attachment = EmailAttachment(
                        filename=report_path.name,
                        content=report_file.read(),
                        mime_type='text/csv',
                    )

                if closed_session.operator:
                    operator_label = (
                        closed_session.operator.username
                        or getattr(closed_session.operator, 'telegram_id', None)
                        or str(closed_session.operator_id)
                    )
                else:
                    operator_label = str(closed_session.operator_id)

                if closed_session.actual_amount is not None:
                    final_amount = closed_session.actual_amount
                elif closed_session.closing_amount is not None:
                    final_amount = closed_session.closing_amount
                else:
                    final_amount = closed_session.initial_amount or 0.0

                html_rows = [
                    '<p>Bonjour,</p>',
                    f'<p>Veuillez trouver en pièce jointe le rapport CSV de la session de caisse {closed_session.id}.</p>',
                    f'<p>Opérateur : {operator_label}</p>',
                    f"<p>Montant final déclaré : {final_amount:.2f} €</p>",
                    f'<p>Vous pouvez également le télécharger via {report_download_url} (valide pendant {settings.CASH_SESSION_REPORT_TOKEN_TTL_SECONDS // 60} minutes).</p>',
                    '<p>- Recyclic</p>',
                ]

                email_sent = email_service.send_email(
                    to_email=recipient,
                    subject=f"Rapport de session de caisse {closed_session.id}",
                    html_content=''.join(html_rows),
                    db_session=db,
                    attachments=[attachment],
                )
            except Exception as exc:  # noqa: BLE001 - keep closing flow resilient
                logger.error("Failed to send cash session report email: %s", exc)

        # Story B49-P1: Enrichir avec les options du register
        response_model = enrich_session_response(closed_session, service)
        response_model = response_model.model_copy(update={
            'report_download_url': report_download_url,
            'report_email_sent': email_sent,
        })
        return response_model

    except HTTPException:
        raise
    except Exception as e:
        log_cash_session_closing(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id=session_id,
            closing_amount=0,
            success=False,
            db=db
        )
        raise


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

    session = service.get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session de caisse non trouvée")

    # Vérifier que l'utilisateur peut modifier cette session
    if (current_user.role == UserRole.USER and
        str(session.operator_id) != str(current_user.id)):
        raise HTTPException(status_code=403, detail="Accès non autorisé à cette session")

    # Vérifier que la session est ouverte
    if session.status != CashSessionStatus.OPEN:
        raise HTTPException(status_code=400, detail="Impossible de changer l'étape d'une session fermée")

    try:
        # Mettre à jour l'étape
        model_step = CashSessionStep(step_update.step.value.upper())
        session.set_current_step(model_step)

        # Sauvegarder les changements
        db.commit()

        # Log de l'activité (optionnel - peut être ajouté aux logs d'audit existants)
        logger.info(f"Session {session_id}: étape changée vers {step_update.step.value} par {current_user.username or current_user.id}")

        # Retourner les nouvelles métriques
        step_metrics = session.get_step_metrics()
        return CashSessionStepResponse(
            session_id=session_id,
            **step_metrics
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Étape invalide: {str(e)}")
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour de l'étape pour la session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la mise à jour de l'étape")
