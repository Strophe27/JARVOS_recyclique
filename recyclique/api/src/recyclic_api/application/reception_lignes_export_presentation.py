"""
ARCH-04 (réception) : export CSV des lignes de dépôt — en-têtes, lignes, nom de fichier.

GET /reception/lignes/export-csv : le routeur charge les lignes via le service et construit la Response ;
ce module se limite au rendu CSV et au format du nom de fichier (contrat inchangé).
"""

from __future__ import annotations

import csv
import io
from datetime import date, datetime
from typing import TYPE_CHECKING, Iterable, Optional

from recyclic_api.application.reception_lists_presentation import benevole_username_or_fallback

if TYPE_CHECKING:
    from recyclic_api.models.ligne_depot import LigneDepot


def build_lignes_depot_export_filename(
    *,
    utc_now: datetime,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category_filename_token: Optional[str] = None,
) -> str:
    """
    Nom de fichier pour l'export des lignes (timestamp UTC + segments de filtres).

    ``category_filename_token`` : partie après ``categorie_`` (nom normalisé ou id chaîne),
    ou ``None`` si aucun filtre catégorie — aligné sur la logique historique du routeur.
    """
    timestamp = utc_now.strftime("%Y%m%d_%H%M")
    filename_parts = ["rapport_reception", timestamp]
    if start_date:
        filename_parts.append(f"depuis_{start_date}")
    if end_date:
        filename_parts.append(f"jusqu_{end_date}")
    if category_filename_token is not None:
        filename_parts.append(f"categorie_{category_filename_token}")
    return "_".join(filename_parts) + ".csv"


def render_lignes_depot_export_csv(lignes: Iterable[LigneDepot]) -> str:
    """
    Corps CSV (texte) des lignes déjà chargées : mêmes colonnes et formatage que l'export historique.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(
        [
            "ID Ligne",
            "ID Ticket",
            "ID Poste",
            "Bénévole",
            "Catégorie",
            "Poids (kg)",
            "Destination",
            "Notes",
            "Date de création",
        ]
    )

    for ligne in lignes:
        writer.writerow(
            [
                str(ligne.id),
                str(ligne.ticket_id),
                str(ligne.ticket.poste_id),
                benevole_username_or_fallback(ligne.ticket.benevole),
                ligne.category.name if ligne.category else "Catégorie inconnue",  # Story B48-P5: Nom court/rapide
                str(ligne.poids_kg),
                ligne.destination.value if ligne.destination else "",
                ligne.notes or "",
                ligne.ticket.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            ]
        )

    csv_content = output.getvalue()
    output.close()
    return csv_content
