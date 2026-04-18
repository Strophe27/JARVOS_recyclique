#!/usr/bin/env python3
"""
Script de nettoyage du CSV legacy pour produire un fichier conforme au template offline.

Ce script normalise les dates, arrondit les poids, et restructure le CSV legacy
pour produire un fichier conforme au template offline standardisé.
"""

from __future__ import annotations

import csv
import logging
import re
import sys
from collections import Counter
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)
logger = logging.getLogger(__name__)


class LegacyCSVCleaner:
    """Classe principale pour le nettoyage du CSV legacy."""
    
    # Dates cibles pour la répartition des lignes orphelines (lignes 3-106)
    ORPHAN_DATE_START = datetime(2025, 9, 17)
    ORPHAN_DATE_END = datetime(2025, 9, 20)
    
    # Colonnes requises du CSV legacy
    REQUIRED_COLUMNS = {
        'date': ['Date', 'date', 'DATE'],
        'category': ['Catégorie', 'catégorie', 'CATÉGORIE', 'Categorie', 'categorie'],
        'label': ['Libellé', 'libellé', 'LIBELLÉ', 'Libelle', 'libelle'],
        'weight': ['Poids_kg', 'poids_kg', 'POIDS_KG', 'Poids', 'poids']
    }
    
    def __init__(self, input_file: Path, output_file: Path):
        """
        Initialise le nettoyeur de CSV.
        
        Args:
            input_file: Chemin vers le fichier CSV legacy
            output_file: Chemin vers le fichier CSV nettoyé de sortie
        """
        self.input_file = input_file
        self.output_file = output_file
        self.stats = {
            'total_lines': 0,
            'orphan_lines': 0,
            'excluded_lines': 0,
            'final_lines': 0,
            'unparseable_dates': 0,
            'invalid_weights': 0,
            'date_distribution': Counter()
        }
    
    def read_csv(self) -> Tuple[List[str], List[Dict[str, str]]]:
        """
        Lit le CSV legacy avec gestion d'encodage.
        
        Returns:
            Tuple contenant les en-têtes et les lignes de données
        """
        encodings = ['utf-8', 'latin-1', 'cp1252']
        
        for encoding in encodings:
            try:
                with open(self.input_file, 'r', encoding=encoding, newline='') as f:
                    reader = csv.reader(f, delimiter=';')
                    rows = list(reader)
                    
                    if rows:
                        logger.info(f"CSV lu avec succès en {encoding}")
                        return self._parse_csv_structure(rows)
            except UnicodeDecodeError:
                continue
            except Exception as e:
                logger.error(f"Erreur lors de la lecture avec {encoding}: {e}")
                continue
        
        raise ValueError(f"Impossible de lire le fichier {self.input_file} avec les encodages testés")
    
    def _parse_csv_structure(self, rows: List[List[str]]) -> Tuple[List[str], List[Dict[str, str]]]:
        """
        Parse la structure spécifique du CSV legacy.
        
        - Ignore la ligne de totaux (ligne 1 : `;;TOTAUX;3886.72`)
        - Identifie la ligne d'en-têtes (ligne 2)
        - Identifie les colonnes requises
        - Ignore les colonnes supplémentaires/vides
        """
        if not rows:
            raise ValueError("Le fichier CSV est vide")
        
        # Ignorer la ligne de totaux (ligne 1)
        if len(rows) > 0 and rows[0] and len(rows[0]) > 2 and 'TOTAUX' in rows[0][2]:
            logger.info("Ligne de totaux ignorée")
            rows = rows[1:]
        
        if len(rows) < 1:
            raise ValueError("Pas de ligne d'en-têtes trouvée")
        
        # Ligne d'en-têtes (ligne 2 dans le fichier original, maintenant ligne 0)
        headers = [col.strip() for col in rows[0]]
        
        # Identifier les indices des colonnes requises
        column_indices = {}
        for key, possible_names in self.REQUIRED_COLUMNS.items():
            for idx, header in enumerate(headers):
                if header in possible_names:
                    column_indices[key] = idx
                    logger.info(f"Colonne '{key}' trouvée à l'index {idx}: '{header}'")
                    break
            if key not in column_indices:
                raise ValueError(f"Colonne requise '{key}' non trouvée dans les en-têtes: {headers}")
        
        # Parser les lignes de données
        data_rows = []
        for row_idx, row in enumerate(rows[1:], start=2):  # start=2 car on a ignoré la ligne de totaux
            if not row or all(not cell.strip() for cell in row):
                continue  # Ignorer les lignes vides
            
            # Extraire uniquement les colonnes requises
            data_row = {}
            for key, col_idx in column_indices.items():
                if col_idx < len(row):
                    data_row[key] = row[col_idx].strip()
                else:
                    data_row[key] = ''
            
            data_row['_row_number'] = row_idx  # Conserver le numéro de ligne pour le logging
            data_rows.append(data_row)
        
        logger.info(f"{len(data_rows)} lignes de données extraites")
        return headers, data_rows
    
    def parse_date(self, date_str: str, row_number: int) -> Optional[datetime]:
        """
        Parse une date avec formats variés.
        
        Formats supportés:
        - `25/09/2025` (DD/MM/YYYY)
        - `27/sept` (DD/mois abrégé, année 2025 par défaut)
        - `09/oct` (DD/mois abrégé, année 2025 par défaut)
        
        Args:
            date_str: Chaîne de date à parser
            row_number: Numéro de ligne pour le logging
        
        Returns:
            Objet datetime ou None si non parsable
        """
        if not date_str or not date_str.strip():
            return None
        
        date_str = date_str.strip()
        
        # Format DD/MM/YYYY
        pattern1 = r'(\d{1,2})/(\d{1,2})/(\d{4})'
        match = re.match(pattern1, date_str)
        if match:
            try:
                day, month, year = map(int, match.groups())
                return datetime(year, month, day)
            except ValueError:
                pass
        
        # Format DD/mois abrégé (année 2025 par défaut)
        pattern2 = r'(\d{1,2})/(jan|fév|mars|avr|mai|juin|juil|août|sept|oct|nov|déc)'
        month_map = {
            'jan': 1, 'fév': 2, 'mars': 3, 'avr': 4, 'mai': 5, 'juin': 6,
            'juil': 7, 'août': 8, 'sept': 9, 'oct': 10, 'nov': 11, 'déc': 12
        }
        match = re.match(pattern2, date_str, re.IGNORECASE)
        if match:
            try:
                day = int(match.group(1))
                month_name = match.group(2).lower()
                month = month_map.get(month_name)
                if month:
                    return datetime(2025, month, day)
            except (ValueError, KeyError):
                pass
        
        # Date non parsable
        logger.warning(f"Ligne {row_number}: Date non parsable: '{date_str}'")
        self.stats['unparseable_dates'] += 1
        return None
    
    def normalize_dates(self, data_rows: List[Dict[str, str]]) -> List[Dict[str, datetime]]:
        """
        Normalise les dates avec fill-down et répartition des orphelines.
        
        - Principe fill-down: une date s'applique aux lignes suivantes jusqu'à la prochaine date
        - Lignes orphelines (3-106): répartition uniforme entre 17-20/09/2025
        - Conversion en ISO 8601 (YYYY-MM-DD)
        """
        normalized = []
        current_date: Optional[datetime] = None
        orphan_rows: List[Dict] = []
        last_valid_date: Optional[datetime] = None
        
        for row in data_rows:
            row_number = row.get('_row_number', 0)
            date_str = row.get('date', '')
            
            # Parser la date
            parsed_date = self.parse_date(date_str, row_number)
            
            if parsed_date:
                current_date = parsed_date
                last_valid_date = parsed_date
            elif current_date:
                # Fill-down: utiliser la date courante
                parsed_date = current_date
            else:
                # Ligne orpheline (pas de date et pas de date courante)
                orphan_rows.append(row)
                continue
            
            # Ajouter la date normalisée
            row['date_normalized'] = parsed_date
            normalized.append(row)
        
        # Répartition uniforme des lignes orphelines
        if orphan_rows:
            self.stats['orphan_lines'] = len(orphan_rows)
            logger.info(f"Répartition de {len(orphan_rows)} lignes orphelines entre {self.ORPHAN_DATE_START.date()} et {self.ORPHAN_DATE_END.date()}")
            
            # Calculer la répartition uniforme
            date_range = (self.ORPHAN_DATE_END - self.ORPHAN_DATE_START).days + 1
            rows_per_date = len(orphan_rows) / date_range
            
            current_orphan_date = self.ORPHAN_DATE_START
            orphan_idx = 0
            
            for orphan_row in orphan_rows:
                # Avancer à la date suivante si nécessaire
                if orphan_idx > 0 and orphan_idx % rows_per_date >= rows_per_date - 0.5:
                    days_to_add = int(orphan_idx / rows_per_date)
                    if days_to_add < date_range:
                        current_orphan_date = self.ORPHAN_DATE_START + timedelta(days=days_to_add)
                
                orphan_row['date_normalized'] = current_orphan_date
                normalized.append(orphan_row)
                orphan_idx += 1
        
        # Utiliser date de fallback pour les dates non parsables restantes
        fallback_date = last_valid_date or self.ORPHAN_DATE_START
        for row in normalized:
            if 'date_normalized' not in row:
                row_number = row.get('_row_number', 0)
                logger.warning(f"Ligne {row_number}: Utilisation de la date de fallback: {fallback_date.date()}")
                row['date_normalized'] = fallback_date
        
        return normalized
    
    def round_weight(self, weight_str: str, row_number: int) -> Optional[Decimal]:
        """
        Arrondit un poids à 2 décimales.
        
        Args:
            weight_str: Chaîne représentant le poids
            row_number: Numéro de ligne pour le logging
        
        Returns:
            Decimal arrondi à 2 décimales ou None si invalide
        """
        if not weight_str or not weight_str.strip():
            return None
        
        try:
            # Nettoyer la chaîne (enlever espaces, virgules)
            weight_str = weight_str.strip().replace(',', '.')
            weight = Decimal(weight_str)
            
            # Valider que le poids est > 0
            if weight <= 0:
                logger.warning(f"Ligne {row_number}: Poids invalide (≤ 0): {weight}")
                self.stats['invalid_weights'] += 1
                return None
            
            # Arrondir à 2 décimales
            rounded = weight.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            return rounded
        except (ValueError, TypeError) as e:
            logger.warning(f"Ligne {row_number}: Poids non parsable: '{weight_str}' ({e})")
            self.stats['invalid_weights'] += 1
            return None
    
    def clean_data(self, data_rows: List[Dict[str, datetime]]) -> List[Dict[str, str]]:
        """
        Nettoie et restructure les données pour le template offline.
        
        - Arrondit les poids
        - Exclut les lignes avec poids invalides
        - Mappe vers le format template offline
        """
        cleaned = []
        
        for row in data_rows:
            row_number = row.get('_row_number', 0)
            self.stats['total_lines'] += 1
            
            # Arrondir le poids
            weight_str = row.get('weight', '')
            weight = self.round_weight(weight_str, row_number)
            
            if weight is None:
                # Exclure la ligne
                logger.warning(f"Ligne {row_number}: Exclue (poids invalide)")
                self.stats['excluded_lines'] += 1
                continue
            
            # Mapper vers le format template offline
            date_normalized = row.get('date_normalized')
            if not date_normalized:
                logger.warning(f"Ligne {row_number}: Exclue (date manquante)")
                self.stats['excluded_lines'] += 1
                continue
            
            # Utiliser Catégorie ou Libellé pour category
            category = row.get('category', '').strip() or row.get('label', '').strip()
            if not category:
                category = 'Divers'  # Valeur par défaut
            
            cleaned_row = {
                'date': date_normalized.strftime('%Y-%m-%d'),
                'category': category,
                'poids_kg': str(weight),
                'destination': 'MAGASIN',  # Valeur par défaut
                'notes': ''  # Colonne vide pour conformité template
            }
            
            cleaned.append(cleaned_row)
            self.stats['date_distribution'][cleaned_row['date']] += 1
        
        self.stats['final_lines'] = len(cleaned)
        return cleaned
    
    def write_output(self, cleaned_data: List[Dict[str, str]]) -> None:
        """
        Écrit le CSV nettoyé avec encodage UTF-8.
        """
        fieldnames = ['date', 'category', 'poids_kg', 'destination', 'notes']
        
        with open(self.output_file, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=',')
            writer.writeheader()
            writer.writerows(cleaned_data)
        
        logger.info(f"CSV nettoyé écrit: {self.output_file}")
    
    def print_stats(self) -> None:
        """Affiche les statistiques détaillées."""
        logger.info("=" * 60)
        logger.info("STATISTIQUES DE NETTOYAGE")
        logger.info("=" * 60)
        logger.info(f"Lignes traitées: {self.stats['total_lines']}")
        logger.info(f"Lignes orphelines (réparties): {self.stats['orphan_lines']}")
        logger.info(f"Lignes exclues: {self.stats['excluded_lines']}")
        logger.info(f"  - Dates non parsables: {self.stats['unparseable_dates']}")
        logger.info(f"  - Poids invalides: {self.stats['invalid_weights']}")
        logger.info(f"Lignes dans le CSV final: {self.stats['final_lines']}")
        logger.info("")
        logger.info("Répartition par date finale:")
        for date, count in sorted(self.stats['date_distribution'].items()):
            logger.info(f"  {date}: {count} lignes")
        logger.info("=" * 60)
    
    def clean(self) -> None:
        """Exécute le processus complet de nettoyage."""
        logger.info(f"Début du nettoyage: {self.input_file}")
        
        # 1. Lire le CSV
        headers, data_rows = self.read_csv()
        
        # 2. Normaliser les dates
        normalized_rows = self.normalize_dates(data_rows)
        
        # 3. Nettoyer et restructurer
        cleaned_data = self.clean_data(normalized_rows)
        
        # 4. Écrire le CSV nettoyé
        self.write_output(cleaned_data)
        
        # 5. Afficher les statistiques
        self.print_stats()


def main():
    """Point d'entrée principal."""
    if len(sys.argv) < 2:
        print("Usage: python clean_legacy_import.py <input_csv> [output_csv]")
        print("Exemple: python clean_legacy_import.py 'IMPORT_202509_ENTREES _ LaClique.csv'")
        sys.exit(1)
    
    input_file = Path(sys.argv[1])
    if not input_file.exists():
        logger.error(f"Fichier introuvable: {input_file}")
        sys.exit(1)
    
    if len(sys.argv) >= 3:
        output_file = Path(sys.argv[2])
    else:
        # Générer le nom de sortie par défaut
        output_file = input_file.parent / f"{input_file.stem}_CLEANED.csv"
    
    cleaner = LegacyCSVCleaner(input_file, output_file)
    cleaner.clean()
    
    logger.info("Nettoyage terminé avec succès!")


if __name__ == '__main__':
    main()

