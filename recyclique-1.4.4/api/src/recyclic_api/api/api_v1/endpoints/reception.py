from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Response, Body, Request
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional, List
from datetime import date, datetime
import csv
import io

from recyclic_api.core.database import get_db
from recyclic_api.core.auth import require_role_strict
from recyclic_api.models.user import UserRole, User
from recyclic_api.utils.report_tokens import generate_download_token, verify_download_token
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
    TicketSummaryResponse,
    TicketDetailResponse,
    TicketListResponse,
    LigneDepotReportResponse,
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
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Seuls les administrateurs peuvent créer des postes avec une date personnalisée"
            )
    
    service = ReceptionService(db)
    poste = service.open_poste(opened_by_user_id=current_user.id, opened_at=opened_at)
    return {"id": str(poste.id), "status": poste.status}


@router.post("/postes/{poste_id}/close", response_model=CloseResponse)
def close_poste(
    poste_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_role_strict([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    service = ReceptionService(db)
    poste = service.close_poste(poste_id=UUID(poste_id))
    return {"status": poste.status}


@router.post("/tickets", response_model=CreateTicketResponse)
def create_ticket(
    payload: CreateTicketRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role_strict([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    service = ReceptionService(db)
    ticket = service.create_ticket(poste_id=UUID(payload.poste_id), benevole_user_id=current_user.id)
    return {"id": str(ticket.id)}


@router.post("/tickets/{ticket_id}/close", response_model=CloseResponse)
def close_ticket(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_role_strict([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    service = ReceptionService(db)
    ticket = service.close_ticket(ticket_id=UUID(ticket_id))
    return {"status": ticket.status}



# Lignes de dépôt
@router.post("/lignes", response_model=LigneResponse)
def add_ligne(
    payload: CreateLigneRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role_strict([UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    service = ReceptionService(db)
    ligne = service.create_ligne(
        ticket_id=UUID(payload.ticket_id),
        category_id=UUID(payload.category_id),
        poids_kg=float(payload.poids_kg),
        destination=payload.destination,
        notes=payload.notes,
        is_exit=payload.is_exit if payload.is_exit is not None else False,
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
    ligne = service.update_ligne(
        ligne_id=UUID(ligne_id),
        category_id=UUID(payload.category_id) if payload.category_id else None,
        poids_kg=float(payload.poids_kg) if payload.poids_kg is not None else None,
        destination=payload.destination,
        notes=payload.notes,
        is_exit=payload.is_exit,
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
    service.delete_ligne(ligne_id=UUID(ligne_id))
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
    ligne = service.update_ligne_weight_admin(
        ligne_id=ligne_uuid,
        poids_kg=new_weight
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
    from uuid import UUID
    
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
    
    # Calculer les totaux pour chaque ticket
    ticket_summaries = []
    for ticket in tickets:
        total_lignes, total_poids, poids_entree, poids_direct, poids_sortie = service._calculate_ticket_totals(ticket)
        ticket_summaries.append(TicketSummaryResponse(
            id=str(ticket.id),
            poste_id=str(ticket.poste_id),
            benevole_username=ticket.benevole.username or "Utilisateur inconnu",
            created_at=ticket.created_at,
            closed_at=ticket.closed_at,
            status=ticket.status,
            total_lignes=total_lignes,
            total_poids=total_poids,
            poids_entree=poids_entree,
            poids_direct=poids_direct,
            poids_sortie=poids_sortie
        ))
    
    total_pages = (total + per_page - 1) // per_page
    
    return TicketListResponse(
        tickets=ticket_summaries,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


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
        benevole_username=ticket.benevole.username or "Utilisateur inconnu",
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
    
    # Générer le nom de fichier (même format que dans export_ticket_csv)
    # Vérifications None-safe pour le bénévole
    benevole_username = "utilisateur_inconnu"
    if ticket.benevole:
        benevole_username = (
            getattr(ticket.benevole, 'username', None) or 
            getattr(ticket.benevole, 'full_name', None) or 
            "utilisateur_inconnu"
        )
    benevole_safe = benevole_username.replace(' ', '_').replace('/', '_').replace('\\', '_')[:20]
    date_str = ticket.created_at.strftime("%Y%m%d") if ticket.created_at else datetime.utcnow().strftime("%Y%m%d")
    timestamp = ticket.created_at.strftime("%H%M%S") if ticket.created_at else datetime.utcnow().strftime("%H%M%S")
    uuid_short = str(ticket.id).replace('-', '')[:8]
    filename = f"rapport_reception_{date_str}_{benevole_safe}_{uuid_short}_{timestamp}.csv"
    
    # Générer le token (TTL de 60 secondes pour les téléchargements directs)
    token = generate_download_token(filename, ttl_seconds=60)
    
    # Construire l'URL de téléchargement (pointant vers l'API)
    # Le frontend utilisera cette URL directement pour le téléchargement
    download_url = f"/api/v1/reception/tickets/{ticket_id}/export-csv?token={token}"
    
    return {"download_url": download_url, "filename": filename, "expires_in_seconds": 60}


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
        
        logger.info(f"Ticket chargé: ticket_id={ticket.id}, lignes_count={len(ticket.lignes) if ticket.lignes else 0}")
        
        # Vérifications None-safe pour le bénévole
        benevole_username = "utilisateur_inconnu"
        if ticket.benevole:
            benevole_username = (
                getattr(ticket.benevole, 'username', None) or 
                getattr(ticket.benevole, 'full_name', None) or 
                "utilisateur_inconnu"
            )
        
        logger.debug(f"Bénévole: {benevole_username}")
        
        benevole_safe = benevole_username.replace(' ', '_').replace('/', '_').replace('\\', '_')[:20]
        date_str = ticket.created_at.strftime("%Y%m%d") if ticket.created_at else datetime.utcnow().strftime("%Y%m%d")
        timestamp = ticket.created_at.strftime("%H%M%S") if ticket.created_at else datetime.utcnow().strftime("%H%M%S")
        uuid_short = str(ticket.id).replace('-', '')[:8]
        filename = f"rapport_reception_{date_str}_{benevole_safe}_{uuid_short}_{timestamp}.csv"
        
        logger.debug(f"Nom de fichier généré: {filename}")
        
        # Vérifier le token signé (obligatoire)
        logger.debug(f"Validation du token: {token[:20]}...")
        if not verify_download_token(token, filename):
            logger.warning(f"Token invalide ou expiré pour ticket_id={ticket_id}")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token de téléchargement invalide ou expiré")
        
        logger.debug("Token validé avec succès")
        
        # Calculer les totaux (BUG CORRIGÉ: _calculate_ticket_totals retourne 5 valeurs, pas 2)
        totals = service._calculate_ticket_totals(ticket)
        total_lignes, total_poids, poids_entree, poids_direct, poids_sortie = totals
        logger.debug(f"Totaux calculés: lignes={total_lignes}, poids={total_poids}")
        
        # Fonctions de formatage (identique aux sessions de caisse)
        def _format_weight(value: Optional[float]) -> str:
            """Format un poids avec virgule comme séparateur décimal (format français)"""
            if value is None:
                return ''
            # Utiliser virgule au lieu de point pour les décimales (format français)
            return f"{value:.3f}".replace('.', ',')
        
        def _format_date(dt: Optional[datetime]) -> str:
            if dt is None:
                return ''
            return dt.strftime('%Y-%m-%d %H:%M:%S')
        
        # Créer le contenu CSV avec le même format que les sessions de caisse
        output = io.StringIO()
        # Utiliser point-virgule comme délimiteur (standard français pour CSV)
        # QUOTE_MINIMAL pour échapper automatiquement les guillemets et caractères spéciaux
        writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)
        
        # Section 1: Résumé du ticket (format tabulaire lisible, identique aux sessions de caisse)
        writer.writerow(['=== RÉSUMÉ DU TICKET DE RÉCEPTION ==='])
        writer.writerow(['Champ', 'Valeur'])
        writer.writerow(['ID Ticket', str(ticket.id)])
        writer.writerow(['ID Poste', str(ticket.poste_id)])
        writer.writerow(['Bénévole', benevole_username])
        writer.writerow(['Date création', _format_date(ticket.created_at)])
        if ticket.closed_at:
            writer.writerow(['Date fermeture', _format_date(ticket.closed_at)])
        writer.writerow(['Statut', ticket.status])
        writer.writerow(['Nombre de lignes', str(total_lignes)])
        writer.writerow(['Poids total (kg)', _format_weight(total_poids)])
        
        # Ligne vide pour séparation (avec le bon nombre de colonnes pour éviter les erreurs d'import)
        writer.writerow(['', ''])  # 2 colonnes pour le résumé
        
        # Section 2: Détails des lignes de dépôt
        writer.writerow(['=== DÉTAILS DES LIGNES DE DÉPÔT ==='])
        writer.writerow([
            'ID Ligne',
            'Catégorie',
            'Poids (kg)',
            'Destination',
            'Notes'
        ])
        
        # Données des lignes (vérification None-safe)
        lignes = ticket.lignes if ticket.lignes else []
        logger.debug(f"Export de {len(lignes)} lignes")
        
        for ligne in lignes:
            category_label = "Catégorie inconnue"
            if ligne.category:
                category_label = ligne.category.name
            
            destination_value = ""
            if ligne.destination:
                destination_value = ligne.destination.value if hasattr(ligne.destination, 'value') else str(ligne.destination)
            
            # Nettoyer les notes (retirer les retours à la ligne)
            notes = (ligne.notes or "").replace('\n', ' ').replace('\r', ' ').strip()
            
            writer.writerow([
                str(ligne.id),
                category_label,
                _format_weight(ligne.poids_kg),
                destination_value,
                notes
            ])
        
        # Préparer la réponse
        csv_content = output.getvalue()
        output.close()
        
        # Encoder le contenu CSV en UTF-8 bytes avec BOM (identique aux sessions de caisse)
        csv_bytes = csv_content.encode('utf-8-sig')  # BOM UTF-8 pour Excel
        
        # Le nom de fichier a déjà été généré plus haut, pas besoin de le régénérer
        logger.info(f"Export CSV réussi: ticket_id={ticket.id}, taille={len(csv_bytes)} bytes")
        
        return Response(
            content=csv_bytes,
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename}\"",
                "Content-Length": str(len(csv_bytes))
            }
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
    
    # Construire la liste des réponses
    ligne_responses = []
    for ligne in lignes:
        ligne_responses.append(LigneDepotReportResponse(
            id=str(ligne.id),
            ticket_id=str(ligne.ticket_id),
            poste_id=str(ligne.ticket.poste_id),
            benevole_username=ligne.ticket.benevole.username or "Utilisateur inconnu",
            category_label=ligne.category.name if ligne.category else "Catégorie inconnue",  # Story B48-P5: Nom court/rapide
            poids_kg=ligne.poids_kg,
            destination=ligne.destination,
            notes=ligne.notes,
            created_at=ligne.ticket.created_at
        ))
    
    total_pages = (total + per_page - 1) // per_page
    
    return LigneDepotListResponse(
        lignes=ligne_responses,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


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
    
    # Créer le contenu CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # En-têtes
    writer.writerow([
        "ID Ligne",
        "ID Ticket", 
        "ID Poste",
        "Bénévole",
        "Catégorie",
        "Poids (kg)",
        "Destination",
        "Notes",
        "Date de création"
    ])
    
    # Données
    for ligne in lignes:
        writer.writerow([
            str(ligne.id),
            str(ligne.ticket_id),
            str(ligne.ticket.poste_id),
            ligne.ticket.benevole.username or "Utilisateur inconnu",
            ligne.category.name if ligne.category else "Catégorie inconnue",  # Story B48-P5: Nom court/rapide
            str(ligne.poids_kg),
            ligne.destination.value if ligne.destination else "",
            ligne.notes or "",
            ligne.ticket.created_at.strftime("%Y-%m-%d %H:%M:%S")
        ])
    
    # Préparer la réponse
    csv_content = output.getvalue()
    output.close()
    
    # Générer le nom de fichier
    # Format de timestamp lisible et triable: YYYYMMDD_HHMM (UTC)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M")
    filename_parts = ["rapport_reception", timestamp]
    if start_date:
        filename_parts.append(f"depuis_{start_date}")
    if end_date:
        filename_parts.append(f"jusqu_{end_date}")
    if category_id:
        # tenter de récupérer le nom pour un nom plus parlant
        try:
            from recyclic_api.models.category import Category as _Category
            cat = db.query(_Category).get(category_uuid)
            if cat and getattr(cat, "name", None):
                safe_name = cat.name.lower().replace(" ", "-")
                filename_parts.append(f"categorie_{safe_name}")
            else:
                filename_parts.append(f"categorie_{category_id}")
        except Exception:
            filename_parts.append(f"categorie_{category_id}")
    filename = "_".join(filename_parts) + ".csv"
    
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

