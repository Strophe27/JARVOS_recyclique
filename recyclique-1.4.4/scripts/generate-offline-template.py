#!/usr/bin/env python3
"""
Script de génération du template CSV offline pour les réceptions.

Ce script génère un fichier CSV vierge avec les en-têtes requis pour la saisie
manuelle des réceptions en cas de panne réseau. Le fichier est encodé en UTF-8
avec BOM pour compatibilité Excel.

Structure du template:
- date: Format ISO 8601 (YYYY-MM-DD)
- category: Nom exact de la catégorie en base
- poids_kg: Nombre décimal avec 2 décimales (ex: 12.50)
- destination: MAGASIN, RECYCLAGE, ou DECHETERIE
- notes: Texte libre (optionnel)
"""

from __future__ import annotations

import csv
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
    # Colonnes requises selon la story
    fieldnames = ['date', 'category', 'poids_kg', 'destination', 'notes']
    
    # Créer le contenu CSV en mémoire
    output = []
    
    # Écrire les en-têtes
    output.append(','.join(fieldnames))
    
    # Ajouter une ligne d'exemple pour guider la saisie
    # Note: Cette ligne doit être supprimée avant l'import ou sera ignorée par le système
    # si elle contient des valeurs de test (date dans le futur très lointain)
    example_row = [
        '2025-12-31',  # Date d'exemple (à remplacer)
        'EEE - Informatique',  # Catégorie d'exemple (à remplacer)
        '5.50',  # Poids d'exemple (à remplacer)
        'MAGASIN',  # Destination d'exemple (à remplacer)
        'EXEMPLE - Supprimer cette ligne avant l\'import'  # Note claire indiquant que c'est un exemple
    ]
    output.append(','.join(example_row))
    
    # Encoder en UTF-8 avec BOM (utf-8-sig)
    content = '\n'.join(output)
    # Ajouter le BOM UTF-8
    bom = '\ufeff'
    content_with_bom = bom + content
    
    # Encoder en bytes
    csv_bytes = content_with_bom.encode('utf-8-sig')
    
    # Écrire dans le fichier si un chemin est fourni
    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'wb') as f:
            f.write(csv_bytes)
    
    return csv_bytes


def main():
    """Point d'entrée principal."""
    if len(sys.argv) > 1:
        output_file = Path(sys.argv[1])
    else:
        # Nom par défaut
        output_file = Path('template-reception-offline.csv')
    
    try:
        generate_template_csv(output_file)
        print(f"Template généré avec succès: {output_file}")
        print(f"Colonnes: date, category, poids_kg, destination, notes")
        print(f"Encodage: UTF-8 avec BOM (compatible Excel)")
    except Exception as e:
        print(f"Erreur lors de la génération: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()

