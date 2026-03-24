"""
ARCH-04 (réception) : JSON des listes GET /reception/tickets et GET /reception/lignes.

Mapping domaine → schémas Pydantic et pagination (même formule que l’historique routeur).
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Sequence

from recyclic_api.schemas.reception import (
    LigneDepotListResponse,
    LigneDepotReportResponse,
    TicketListResponse,
    TicketSummaryResponse,
)

if TYPE_CHECKING:
    from recyclic_api.models.ligne_depot import LigneDepot
    from recyclic_api.models.ticket_depot import TicketDepot
    from recyclic_api.services.reception_service import ReceptionService


def paginated_total_pages(total: int, per_page: int) -> int:
    """Nombre total de pages (ceil entier), aligné sur l’implémentation historique du routeur."""
    return (total + per_page - 1) // per_page


def map_ticket_to_summary_response(
    service: ReceptionService,
    ticket: TicketDepot,
) -> TicketSummaryResponse:
    total_lignes, total_poids, poids_entree, poids_direct, poids_sortie = (
        service._calculate_ticket_totals(ticket)
    )
    return TicketSummaryResponse(
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
        poids_sortie=poids_sortie,
    )


def build_ticket_list_response(
    service: ReceptionService,
    tickets: Sequence[TicketDepot],
    total: int,
    page: int,
    per_page: int,
) -> TicketListResponse:
    ticket_summaries = [map_ticket_to_summary_response(service, t) for t in tickets]
    total_pages = paginated_total_pages(total, per_page)
    return TicketListResponse(
        tickets=ticket_summaries,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


def map_ligne_depot_to_report_response(ligne: LigneDepot) -> LigneDepotReportResponse:
    return LigneDepotReportResponse(
        id=str(ligne.id),
        ticket_id=str(ligne.ticket_id),
        poste_id=str(ligne.ticket.poste_id),
        benevole_username=ligne.ticket.benevole.username or "Utilisateur inconnu",
        category_label=ligne.category.name if ligne.category else "Catégorie inconnue",  # Story B48-P5
        poids_kg=ligne.poids_kg,
        destination=ligne.destination,
        notes=ligne.notes,
        created_at=ligne.ticket.created_at,
    )


def build_ligne_depot_list_response(
    lignes: Sequence[LigneDepot],
    total: int,
    page: int,
    per_page: int,
) -> LigneDepotListResponse:
    ligne_responses = [map_ligne_depot_to_report_response(l) for l in lignes]
    total_pages = paginated_total_pages(total, per_page)
    return LigneDepotListResponse(
        lignes=ligne_responses,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )
