"""
ARCH-04 (réception) : export CSV ticket — nom de fichier, métadonnées de téléchargement, corps CSV.

Couple HTTP : POST /tickets/{id}/download-token + GET /tickets/{id}/export-csv.
Le nom de fichier est calculé une seule fois (aligné token HMAC / en-tête Content-Disposition).
"""

from __future__ import annotations

import csv
import io
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional, Union

from recyclic_api.core.config import settings
from recyclic_api.utils.report_tokens import generate_download_token

if TYPE_CHECKING:
    from recyclic_api.models.ticket_depot import TicketDepot
    from recyclic_api.services.reception_service import ReceptionService


def reception_ticket_csv_filename(ticket: TicketDepot) -> str:
    """
    Nom de fichier CSV pour un ticket (même logique que l'historique B44-P4 / B50-P3).
    """
    benevole_username = "utilisateur_inconnu"
    if ticket.benevole:
        benevole_username = (
            getattr(ticket.benevole, "username", None)
            or getattr(ticket.benevole, "full_name", None)
            or "utilisateur_inconnu"
        )
    benevole_safe = benevole_username.replace(" ", "_").replace("/", "_").replace("\\", "_")[:20]
    date_str = ticket.created_at.strftime("%Y%m%d") if ticket.created_at else datetime.utcnow().strftime("%Y%m%d")
    timestamp = ticket.created_at.strftime("%H%M%S") if ticket.created_at else datetime.utcnow().strftime("%H%M%S")
    uuid_short = str(ticket.id).replace("-", "")[:8]
    return f"rapport_reception_{date_str}_{benevole_safe}_{uuid_short}_{timestamp}.csv"


def build_reception_ticket_download_json(
    ticket_id: str,
    filename: str,
    *,
    ttl_seconds: int = 60,
) -> dict[str, str | int]:
    """
    Corps JSON pour POST .../download-token (contrat inchangé).

    ``filename`` doit être celui retourné par :func:`reception_ticket_csv_filename` pour ce ticket.
    """
    token = generate_download_token(filename, ttl_seconds=ttl_seconds)
    prefix = settings.API_V1_STR.rstrip("/")
    download_url = f"{prefix}/reception/tickets/{ticket_id}/export-csv?token={token}"
    return {
        "download_url": download_url,
        "filename": filename,
        "expires_in_seconds": ttl_seconds,
    }


def render_reception_ticket_csv_bytes(
    ticket: TicketDepot,
    service: ReceptionService,
) -> tuple[bytes, str]:
    """
    Contenu CSV encodé UTF-8 avec BOM (Excel) et nom de fichier pour Content-Disposition.

    Réutilise les totaux via ``service._calculate_ticket_totals`` (comportement identique au routeur).
    """
    filename = reception_ticket_csv_filename(ticket)

    totals = service._calculate_ticket_totals(ticket)
    total_lignes, total_poids, _p_entree, _p_direct, _p_sortie = totals

    def _format_weight(value: Optional[Union[Decimal, float]]) -> str:
        if value is None:
            return ""
        return f"{value:.3f}".replace(".", ",")

    def _format_date(dt: Optional[datetime]) -> str:
        if dt is None:
            return ""
        return dt.strftime("%Y-%m-%d %H:%M:%S")

    benevole_username = "utilisateur_inconnu"
    if ticket.benevole:
        benevole_username = (
            getattr(ticket.benevole, "username", None)
            or getattr(ticket.benevole, "full_name", None)
            or "utilisateur_inconnu"
        )

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)

    writer.writerow(["=== RÉSUMÉ DU TICKET DE RÉCEPTION ==="])
    writer.writerow(["Champ", "Valeur"])
    writer.writerow(["ID Ticket", str(ticket.id)])
    writer.writerow(["ID Poste", str(ticket.poste_id)])
    writer.writerow(["Bénévole", benevole_username])
    writer.writerow(["Date création", _format_date(ticket.created_at)])
    if ticket.closed_at:
        writer.writerow(["Date fermeture", _format_date(ticket.closed_at)])
    writer.writerow(["Statut", ticket.status])
    writer.writerow(["Nombre de lignes", str(total_lignes)])
    writer.writerow(["Poids total (kg)", _format_weight(total_poids)])

    writer.writerow(["", ""])

    writer.writerow(["=== DÉTAILS DES LIGNES DE DÉPÔT ==="])
    writer.writerow(
        [
            "ID Ligne",
            "Catégorie",
            "Poids (kg)",
            "Destination",
            "Notes",
        ]
    )

    lignes = ticket.lignes if ticket.lignes else []

    for ligne in lignes:
        category_label = "Catégorie inconnue"
        if ligne.category:
            category_label = ligne.category.name

        destination_value = ""
        if ligne.destination:
            destination_value = (
                ligne.destination.value if hasattr(ligne.destination, "value") else str(ligne.destination)
            )

        notes = (ligne.notes or "").replace("\n", " ").replace("\r", " ").strip()

        writer.writerow(
            [
                str(ligne.id),
                category_label,
                _format_weight(ligne.poids_kg),
                destination_value,
                notes,
            ]
        )

    csv_content = output.getvalue()
    output.close()

    csv_bytes = csv_content.encode("utf-8-sig")
    return csv_bytes, filename
