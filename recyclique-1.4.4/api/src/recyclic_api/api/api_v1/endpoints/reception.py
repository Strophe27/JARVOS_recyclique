from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Response, Body, Request, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional, List
from datetime import date, datetime

from recyclic_api.core.database import get_db
from recyclic_api.core.auth import require_role_strict
from recyclic_api.core.exceptions import ConflictError, NotFoundError, ValidationError
from recyclic_api.utils.domain_exception_http import raise_domain_exception_as_http
from recyclic_api.models.user import UserRole, User
from recyclic_api.utils.report_tokens import verify_download_token
from recyclic_api.application.reception_lignes_export_presentation import (
    build_lignes_depot_export_filename,
    render_lignes_depot_export_csv,
)
from recyclic_api.application.reception_ticket_export_presentation import (
    build_reception_ticket_download_json,
    reception_ticket_csv_filename,
    render_reception_ticket_csv_bytes,
)
from recyclic_api.application.reception_lists_presentation import (
    benevole_username_or_fallback,
    build_ligne_depot_list_response,
    build_ticket_list_response,
)
from recyclic_api.schemas.reception import (
    OpenPosteRequest,
    OpenPosteResponse,
    CreateTicketRequest,
    CreateTicketResponse,
    CloseResponse,
    CreateLigneRequest,
    UpdateLigneRequest,
    LigneResponse,
    LigneWeightUpdate,
    TicketDetailResponse,
    TicketListResponse,
    LigneDepotListResponse,
)
from recyclic_api.schemas.stats import ReceptionLiveStatsResponse
from recyclic_api.models.category import Category
from recyclic_api.services.reception_service import ReceptionService
from recyclic_api.services.reception_stats_service import ReceptionLiveStatsService
from recyclic_api.services.statistics_recalculation_service import StatisticsRecalculationService
from recyclic_api.core.audit import log_audit
from recyclic_api.models.audit_log import AuditActionType
from recyclic_api.core.config import settings


router = APIRouter()

# Statuts HTTP pour erreurs métier (réception) — ValidationError varie selon la route (400 vs 422).
_RECEPTION_DOMAIN_HTTP = {
    "not_found_status": status.HTTP_404_NOT_FOUND,
    "conflict_status": status.HTTP_409_CONFLICT,
}


@router.post("/postes/open", response_model=OpenPosteResponse)
def open_poste(
    payload: Optional[OpenPosteRequest] = Body(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_role_strict([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """
    Ouvrir un poste de réception.
    
    Si `opened_at` est fourni, seuls ADMIN et SUPER_ADMIN peuvent créer le poste (saisie différée).
    """
    opened_at = payload.opened_at if payload else None
    
    # Validation des permissions: si opened_at fourni, requiert ADMIN ou SUPER_ADMIN
    if opened_at is not None:
        if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Seuls les administrateurs peuvent créer des postes avec une date personnalisée"
            )
    
    service = ReceptionService(db)
    try:
        poste = service.open_poste(opened_by_user_id=current_user.id, opened_at=opened_at)
    except ValidationError as exc:
        raise_domain_exception_as_http(
            exc,
            **_RECEPTION_DOMAIN_HTTP,
            validation_status=status.HTTP_400_BAD_REQUEST,
        )
    return {"id": str(poste.id), "status": poste.status}


@router.post("/postes/{poste_id}/close", response_model=CloseResponse)
def close_poste(
    poste_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_role_strict([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    service = ReceptionService(db)
    try:
        poste = service.close_poste(poste_id=UUID(poste_id))
    except (NotFoundError, ConflictError) as exc:
        raise_domain_exception_as_http(
            exc,
            **_RECEPTION_DOMAIN_HTTP,
            validation_status=status.HTTP_400_BAD_REQUEST,
        )
    return {"status": poste.status}


@router.post("/tickets", response_model=CreateTicketResponse)
def create_ticket(
    payload: CreateTicketRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role_strict([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    service = ReceptionService(db)
    try:
        ticket = service.create_ticket(poste_id=UUID(payload.poste_id), benevole_user_id=current_user.id)
    except (NotFoundError, ConflictError) as exc:
        raise_domain_exception_as_http(
            exc,
            **_RECEPTION_DOMAIN_HTTP,
            validation_status=status.HTTP_400_BAD_REQUEST,
        )
    return {"id": str(ticket.id)}


@router.post("/tickets/{ticket_id}/close", response_model=CloseResponse)
def close_ticket(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_role_strict([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    service = ReceptionService(db)
    try:
        ticket = service.close_ticket(ticket_id=UUID(ticket_id))
    except NotFoundError as exc:
        raise_domain_exception_as_http(
            exc,
            **_RECEPTION_DOMAIN_HTTP,
            validation_status=status.HTTP_400_BAD_REQUEST,
        )
    return {"status": ticket.status}



# Lignes de dépôt
@router.post("/lignes", response_model=LigneResponse)
def add_ligne(
    payload: CreateLigneRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role_strict([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    service = ReceptionService(db)
    try:
        ligne = service.create_ligne(
            ticket_id=UUID(payload.ticket_id),
            category_id=UUID(payload.category_id),
            poids_kg=float(payload.poids_kg),
            destination=payload.destination,
            notes=payload.notes,
            is_exit=payload.is_exit if payload.is_exit is not None else False,
        )
    except (NotFoundError, ConflictError, ValidationError) as exc:
        raise_domain_exception_as_http(
            exc,
            **_RECEPTION_DOMAIN_HTTP,
            validation_status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    
    # Récupérer le nom de la catégorie
    from recyclic_api.services.category_service import CategoryService
    category_label = "Catégorie inconnue"
    if ligne.category:
        category_label = ligne.category.name  # Story B48-P5: Utilise name (nom court/rapide)
    
    return {
        "id": str(ligne.id),
        "ticket_id": str(ligne.ticket_id),
        "category_id": str(ligne.category_id),
        "category_label": category_label,
        "poids_kg": ligne.poids_kg,
        "destination": ligne.destination,
        "notes": ligne.notes,
        "is_exit": ligne.is_exit,
    }


@router.get("/categories")
def get_categories(
    db: Session = Depends(get_db),
    current_user=Depends(require_role_strict([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """Récupérer les catégories disponibles.
    
    Story B48-P5: Retourne name (nom court/rapide) pour l'affichage opérationnel.
    """
    categories = db.query(Category).filter(
        Category.is_active == True
    ).all()
    return [
        {
            "id": str(cat.id),
            "name": cat.name  # Story B48-P5: Nom court/rapide (toujours utilisé)
        }
        for cat in categories
    ]


@router.put("/lignes/{ligne_id}", response_model=LigneResponse)
def update_ligne(
    ligne_id: str,
    payload: UpdateLigneRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role_strict([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    service = ReceptionService(db)
    try:
        ligne = service.update_ligne(
            ligne_id=UUID(ligne_id),
            category_id=UUID(payload.category_id) if payload.category_id else None,
            poids_kg=float(payload.poids_kg) if payload.poids_kg is not None else None,
            destination=payload.destination,
            notes=payload.notes,
            is_exit=payload.is_exit,
        )
    except (NotFoundError, ConflictError, ValidationError) as exc:
        raise_domain_exception_as_http(
            exc,
            **_RECEPTION_DOMAIN_HTTP,
            validation_status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    
    # Récupérer le nom de la catégorie
    from recyclic_api.services.category_service import CategoryService
    category_label = "Catégorie inconnue"
    if ligne.category:
        category_label = ligne.category.name  # Story B48-P5: Utilise name (nom court/rapide)
    
    return {
        "id": str(ligne.id),
        "ticket_id": str(ligne.ticket_id),
        "category_id": str(ligne.category_id),
        "category_label": category_label,
        "poids_kg": ligne.poids_kg,
        "destination": ligne.destination,
        "notes": ligne.notes,
        "is_exit": ligne.is_exit,
    }


@router.delete("/lignes/{ligne_id}")
def delete_ligne(
    ligne_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_role_strict([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    service = ReceptionService(db)
    try:
        ligne_uuid = UUID(ligne_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ID format") from exc

    try:
        service.delete_ligne(ligne_id=ligne_uuid)
    except (NotFoundError, ConflictError) as exc:
        raise_domain_exception_as_http(
            exc,
            **_RECEPTION_DOMAIN_HTTP,
            validation_status=status.HTTP_400_BAD_REQUEST,
        )
    return {"status": "deleted"}


@router.patch("/tickets/{ticket_id}/lignes/{ligne_id}/weight", response_model=LigneResponse)
def update_ligne_weight(
    ticket_id: str,
    ligne_id: str,
    weight_update: LigneWeightUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """
    Modifier le poids d'une ligne de réception (admin uniquement).
    
    Story B52-P2: Permet de corriger les erreurs de saisie de poids après validation.
    - Seuls les administrateurs peuvent modifier
    - Permet la modification même si le ticket est fermé
    - Recalcule automatiquement les statistiques affectées
    - Log d'audit complet
    """
    # Valider les UUIDs
    try:
        ticket_uuid = UUID(ticket_id)
        ligne_uuid = UUID(ligne_id)
    except ValueError:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ID format")
    
    service = ReceptionService(db)
    
    # Récupérer la ligne pour obtenir l'ancien poids
    ligne = service.ligne_repo.get(ligne_uuid)
    if not ligne:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ligne introuvable")
    
    # Vérifier que la ligne appartient au ticket
    if ligne.ticket_id != ticket_uuid:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La ligne n'appartient pas à ce ticket")
    
    # Sauvegarder l'ancien poids pour l'audit et le recalcul
    old_weight = float(ligne.poids_kg) if ligne.poids_kg else 0.0
    new_weight = float(weight_update.poids_kg)
    
    # Mettre à jour le poids (méthode admin qui ignore le statut du ticket)
    try:
        ligne = service.update_ligne_weight_admin(
            ligne_id=ligne_uuid,
            poids_kg=new_weight
        )
    except (NotFoundError, ValidationError) as exc:
        raise_domain_exception_as_http(
            exc,
            **_RECEPTION_DOMAIN_HTTP,
            validation_status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    
    # Recalculer les statistiques affectées
    recalculation_result = None
    try:
        recalculation_service = StatisticsRecalculationService(db)
        recalculation_result = recalculation_service.recalculate_after_ligne_weight_update(
            ticket_id=ticket_uuid,
            ligne_id=ligne_uuid,
            old_weight=old_weight,
            new_weight=new_weight
        )
    except Exception as e:  # pragma: no cover - chemin de secours
        # En cas d'échec du recalcul, on conserve la modification de poids
        # mais on trace l'erreur dans les détails d'audit.
        recalculation_result = {"error": str(e)}
    
    # Logger l'audit
    log_audit(
        action_type=AuditActionType.SYSTEM_CONFIG_CHANGED,
        actor=current_user,
        target_id=ligne_uuid,
        target_type="ligne_depot",
        details={
            "ticket_id": str(ticket_uuid),
            "ligne_id": str(ligne_uuid),
            "old_weight": old_weight,
            "new_weight": new_weight,
            "weight_delta": new_weight - old_weight,
            "recalculation_result": recalculation_result
        },
        description=f"Modification du poids d'une ligne de réception: {old_weight} kg → {new_weight} kg",
        db=db
    )
    
    # Récupérer le nom de la catégorie
    from recyclic_api.services.category_service import CategoryService
    category_label = "Catégorie inconnue"
    if ligne.category:
        category_label = ligne.category.name  # Story B48-P5: Utilise name (nom court/rapide)
    
    return {
        "id": str(ligne.id),
        "ticket_id": str(ligne.ticket_id),
        "category_id": str(ligne.category_id),
        "category_label": category_label,
        "poids_kg": ligne.poids_kg,
        "destination": ligne.destination,
        "notes": ligne.notes,
        "is_exit": ligne.is_exit,
    }


# Endpoints pour l'historique des tickets
@router.get("/tickets", response_model=TicketListResponse)
def get_tickets(
    page: int = Query(1, ge=1, description="Numéro de page"),
    per_page: int = Query(10, ge=1, le=100, description="Nombre d'éléments par page"),
    status: Optional[str] = Query(None, description="Filtrer par statut"),
    date_from: Optional[datetime] = Query(None, description="Date de début (inclusive) au format ISO 8601"),
    date_to: Optional[datetime] = Query(None, description="Date de fin (inclusive) au format ISO 8601"),
    benevole_id: Optional[str] = Query(None, description="ID du bénévole"),
    search: Optional[str] = Query(None, description="Recherche textuelle (ID ticket ou nom bénévole)"),
    include_empty: bool = Query(False, description="B44-P4: Inclure les tickets vides (sans lignes)"),
    # B45-P2: Filtres avancés
    poids_min: Optional[float] = Query(None, ge=0, description="Poids minimum total du ticket (kg)"),
    poids_max: Optional[float] = Query(None, ge=0, description="Poids maximum total du ticket (kg)"),
    categories: Optional[List[str]] = Query(None, description="Catégories (multi-sélection)"),
    destinations: Optional[List[str]] = Query(None, description="Destinations (multi-sélection)"),
    lignes_min: Optional[int] = Query(None, ge=0, description="Nombre minimum de lignes"),
    lignes_max: Optional[int] = Query(None, ge=0, description="Nombre maximum de lignes"),
    db: Session = Depends(get_db),
    current_user=Depends(require_role_strict([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """Récupérer la liste des tickets de réception avec pagination."""
    service = ReceptionService(db)
    benevole_uuid = None
    if benevole_id:
        try:
            benevole_uuid = UUID(benevole_id)
        except ValueError:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="benevole_id invalide")
    
    # Convertir les catégories en UUIDs
    category_uuids = None
    if categories:
        try:
            category_uuids = [UUID(cat_id) for cat_id in categories]
        except ValueError:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="categories invalides")
    
    tickets, total = service.get_tickets_list(
        page=page, 
        per_page=per_page, 
        status=status,
        date_from=date_from,
        date_to=date_to,
        benevole_id=benevole_uuid,
        search=search,
        include_empty=include_empty,
        poids_min=poids_min,
        poids_max=poids_max,
        categories=category_uuids,
        destinations=destinations,
        lignes_min=lignes_min,
        lignes_max=lignes_max,
    )
    return build_ticket_list_response(service, tickets, total, page, per_page)


@router.get("/tickets/{ticket_id}", response_model=TicketDetailResponse)
def get_ticket_detail(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_role_strict([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """Récupérer les détails complets d'un ticket de réception."""
    service = ReceptionService(db)
    ticket = service.get_ticket_detail(UUID(ticket_id))
    
    if not ticket:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket introuvable")
    
    # Construire la liste des lignes
    lignes = []
    for ligne in ticket.lignes:
        # Récupérer le nom de la catégorie
        category_label = "Catégorie inconnue"
        if ligne.category:
            category_label = ligne.category.name
        
        lignes.append(LigneResponse(
            id=str(ligne.id),
            ticket_id=str(ligne.ticket_id),
            category_id=str(ligne.category_id),
            category_label=category_label,
            poids_kg=ligne.poids_kg,
            destination=ligne.destination,
            notes=ligne.notes,
            is_exit=ligne.is_exit
        ))
    
    return TicketDetailResponse(
        id=str(ticket.id),
        poste_id=str(ticket.poste_id),
        benevole_username=benevole_username_or_fallback(ticket.benevole),
        created_at=ticket.created_at,
        closed_at=ticket.closed_at,
        status=ticket.status,
        lignes=lignes
    )


@router.post("/tickets/{ticket_id}/download-token")
def generate_ticket_download_token(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """Générer un token de téléchargement pour un ticket de réception (B44-P4)."""
    from fastapi import HTTPException, status
    
    service = ReceptionService(db)
    ticket = service.get_ticket_detail(UUID(ticket_id))
    
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket introuvable")

    filename = reception_ticket_csv_filename(ticket)
    return build_reception_ticket_download_json(ticket_id, filename, ttl_seconds=60)


@router.get("/tickets/{ticket_id}/export-csv")
def export_ticket_csv(
    ticket_id: str,
    token: str = Query(..., description="Token de téléchargement signé (obligatoire)"),
    db: Session = Depends(get_db),
):
    """
    Exporter un ticket de réception au format CSV.
    
    Authentification via token signé (généré via POST /tickets/{ticket_id}/download-token).
    Le navigateur télécharge directement depuis cette URL, garantissant que le nom de fichier
    depuis le header Content-Disposition est respecté.
    """
    import logging
    from fastapi import HTTPException, status
    from recyclic_api.utils.export_error_handler import handle_export_errors
    
    logger = logging.getLogger(__name__)
    
    def _export_ticket():
        logger.info(f"Export CSV ticket demandé: ticket_id={ticket_id}")

        service = ReceptionService(db)
        ticket = service.get_ticket_detail(UUID(ticket_id))

        if not ticket:
            logger.warning(f"Ticket introuvable: ticket_id={ticket_id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket introuvable")

        lignes_n = len(ticket.lignes) if ticket.lignes else 0
        logger.info(f"Ticket chargé: ticket_id={ticket.id}, lignes_count={lignes_n}")

        filename = reception_ticket_csv_filename(ticket)
        logger.debug(f"Nom de fichier généré: {filename}")

        logger.debug(f"Validation du token: {token[:20]}...")
        if not verify_download_token(token, filename):
            logger.warning(f"Token invalide ou expiré pour ticket_id={ticket_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Token de téléchargement invalide ou expiré",
            )

        logger.debug("Token validé avec succès")

        csv_bytes, filename = render_reception_ticket_csv_bytes(ticket, service)
        logger.info(f"Export CSV réussi: ticket_id={ticket.id}, taille={len(csv_bytes)} bytes")

        return Response(
            content=csv_bytes,
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename}\"",
                "Content-Length": str(len(csv_bytes)),
            },
        )
    
    # Utilisation du gestionnaire d'erreurs standardisé (B50-P3: Standardisation)
    return handle_export_errors(
        _export_ticket,
        context="ticket CSV",
        resource_id=ticket_id
    )


# Endpoints pour les rapports de réception
@router.get("/lignes", response_model=LigneDepotListResponse)
def get_lignes_depot(
    page: int = Query(1, ge=1, description="Numéro de page"),
    per_page: int = Query(50, ge=1, le=100, description="Nombre d'éléments par page"),
    start_date: Optional[date] = Query(None, description="Date de début (inclusive) au format YYYY-MM-DD"),
    end_date: Optional[date] = Query(None, description="Date de fin (inclusive) au format YYYY-MM-DD"),
    category_id: Optional[str] = Query(None, description="ID de la catégorie à filtrer"),
    db: Session = Depends(get_db),
    current_user=Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """Récupérer la liste des lignes de dépôt avec filtres et pagination pour les rapports."""
    service = ReceptionService(db)
    
    # Convertir category_id en UUID si fourni
    category_uuid = None
    if category_id:
        try:
            category_uuid = UUID(category_id)
        except ValueError:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Format d'ID de catégorie invalide")
    
    lignes, total = service.get_lignes_depot_filtered(
        start_date=start_date,
        end_date=end_date,
        category_id=category_uuid,
        page=page,
        per_page=per_page
    )
    return build_ligne_depot_list_response(lignes, total, page, per_page)


@router.get("/lignes/export-csv")
def export_lignes_depot_csv(
    start_date: Optional[date] = Query(None, description="Date de début (inclusive) au format YYYY-MM-DD"),
    end_date: Optional[date] = Query(None, description="Date de fin (inclusive) au format YYYY-MM-DD"),
    category_id: Optional[str] = Query(None, description="ID de la catégorie à filtrer"),
    db: Session = Depends(get_db),
    current_user=Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """Exporter les lignes de dépôt au format CSV."""
    service = ReceptionService(db)
    
    # Convertir category_id en UUID si fourni
    category_uuid = None
    if category_id:
        try:
            category_uuid = UUID(category_id)
        except ValueError:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Format d'ID de catégorie invalide")
    
    lignes = service.get_lignes_depot_for_export(
        start_date=start_date,
        end_date=end_date,
        category_id=category_uuid
    )

    csv_content = render_lignes_depot_export_csv(lignes)

    category_filename_token: Optional[str] = None
    if category_id:
        try:
            cat = db.query(Category).get(category_uuid)
            if cat and getattr(cat, "name", None):
                category_filename_token = cat.name.lower().replace(" ", "-")
            else:
                category_filename_token = category_id
        except Exception:
            category_filename_token = category_id

    filename = build_lignes_depot_export_filename(
        utc_now=datetime.utcnow(),
        start_date=start_date,
        end_date=end_date,
        category_filename_token=category_filename_token,
    )

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/stats/live", response_model=ReceptionLiveStatsResponse)
async def get_live_reception_stats(
    site_id: Optional[str] = Query(None, description="Optional site filter for future multi-site support"),
    db: Session = Depends(get_db),
    current_user=Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    response: Response = Response(),
):
    """
    Get live reception statistics for admin dashboard.

    Returns real-time KPIs including open tickets, recent closures,
    turnover, donations, and weight metrics for the last 24 hours.

    Requires admin or super-admin permissions.
    
    **⚠️ DEPRECATED:** This endpoint is deprecated. Use `/v1/stats/live` instead.
    This endpoint will be removed in 3 months (2025-03-09).
    """
    # Add deprecation headers (Story B48-P7)
    response.headers["Deprecation"] = "true"
    response.headers["Sunset"] = "Mon, 09 Mar 2025 00:00:00 GMT"
    response.headers["Link"] = '</v1/stats/live>; rel="successor-version"'
    
    if not settings.LIVE_RECEPTION_STATS_ENABLED:
        # Return zeros when feature is disabled (backward compatibility)
        return ReceptionLiveStatsResponse(
            tickets_open=0,
            tickets_closed_24h=0,
            turnover_eur=0.0,
            donations_eur=0.0,
            weight_in=0.0,
            weight_out=0.0,
        )

    service = ReceptionLiveStatsService(db)
    stats = await service.get_live_stats(site_id=site_id)
    return ReceptionLiveStatsResponse(**stats)

