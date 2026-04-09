"""
Génération du template CSV offline pour les réceptions (Story B47-P4).

Même contrat que l’historique ``recyclique-1.4.4/scripts/generate-offline-template.py`` :
UTF-8 avec BOM, en-têtes + une ligne d’exemple. Implémentation locale pour éviter
un chemin fragile hors du paquet ``api``.
"""

from __future__ import annotations

import csv
import io
import sys
from pathlib import Path
from typing import Optional


def generate_template_csv(output_path: Optional[Path] = None) -> bytes:
    """
    Génère le contenu CSV du template offline.

    Args:
        output_path: Chemin optionnel pour écrire le fichier directement

    Returns:
        Contenu CSV encodé en UTF-8 avec BOM (bytes)
    """
    fieldnames = ["date", "category", "poids_kg", "destination", "notes"]

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(fieldnames)
    example_row = [
        "2025-12-31",
        "EEE - Informatique",
        "5.50",
        "MAGASIN",
        "EXEMPLE - Supprimer cette ligne avant l'import",
    ]
    writer.writerow(example_row)
    content = buf.getvalue()
    content_with_bom = "\ufeff" + content
    csv_bytes = content_with_bom.encode("utf-8-sig")

    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(csv_bytes)

    return csv_bytes


def main() -> None:
    """Point d'entrée CLI."""
    if len(sys.argv) > 1:
        output_file = Path(sys.argv[1])
    else:
        output_file = Path("template-reception-offline.csv")

    try:
        generate_template_csv(output_file)
        print(f"Template généré avec succès: {output_file}")
        print("Colonnes: date, category, poids_kg, destination, notes")
        print("Encodage: UTF-8 avec BOM (compatible Excel)")
    except Exception as e:
        print(f"Erreur lors de la génération: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
