"""
Service de nettoyage CSV legacy réutilisable.

Ce service extrait la logique de nettoyage du script clean_legacy_import.py
pour permettre son utilisation à la fois par le script CLI et par l'endpoint API.
"""

from __future__ import annotations

import csv
import io
import logging
import re
from collections import Counter
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class LegacyCSVCleanerService:
    """Service de nettoyage CSV legacy réutilisable."""

    # Dates cibles pour la répartition des lignes orphelines (lignes 3-106)
    ORPHAN_DATE_START = datetime(2025, 9, 17)
    ORPHAN_DATE_END = datetime(2025, 9, 20)

    # Colonnes requises du CSV legacy
    REQUIRED_COLUMNS = {
        "date": ["Date", "date", "DATE"],
        "category": ["Catégorie", "catégorie", "CATÉGORIE", "Categorie", "categorie"],
        "label": ["Libellé", "libellé", "LIBELLÉ", "Libelle", "libelle"],
        "weight": ["Poids_kg", "poids_kg", "POIDS_KG", "Poids", "poids"],
    }

    def __init__(self):
        """Initialise le service de nettoyage."""
        self.stats = {
            "total_lines": 0,
            "orphan_lines": 0,
            "excluded_lines": 0,
            "final_lines": 0,
            "unparseable_dates": 0,
            "invalid_weights": 0,
            "dates_normalized": 0,
            "weights_rounded": 0,
            "date_distribution": Counter(),
        }

    def clean_csv(
        self, file_content: bytes, encoding: Optional[str] = None
    ) -> Tuple[bytes, Dict[str, Any]]:
        """
        Nettoie un CSV legacy et retourne le CSV nettoyé avec statistiques.

        Args:
            file_content: Contenu du fichier CSV en bytes
            encoding: Encodage du fichier (si None, détecte automatiquement)

        Returns:
            Tuple (csv_nettoyé_bytes, statistiques_dict)
        """
        # Réinitialiser les statistiques
        self.stats = {
            "total_lines": 0,
            "orphan_lines": 0,
            "excluded_lines": 0,
            "final_lines": 0,
            "unparseable_dates": 0,
            "invalid_weights": 0,
            "dates_normalized": 0,
            "weights_rounded": 0,
            "date_distribution": Counter(),
        }

        # Détecter l'encodage si non fourni
        if encoding is None:
            encoding = self._detect_encoding(file_content)

        # Lire le CSV
        headers, data_rows = self._read_csv(file_content, encoding)

        # Normaliser les dates
        normalized_rows = self._normalize_dates(data_rows)

        # Nettoyer et restructurer
        cleaned_data = self._clean_data(normalized_rows)

        # Générer le CSV nettoyé
        cleaned_csv_bytes = self._write_output(cleaned_data)

        # Préparer les statistiques pour le retour
        stats_dict = {
            "total_lines": self.stats["total_lines"],
            "cleaned_lines": self.stats["final_lines"],
            "excluded_lines": self.stats["excluded_lines"],
            "orphan_lines": self.stats["orphan_lines"],
            "dates_normalized": self.stats["dates_normalized"],
            "weights_rounded": self.stats["weights_rounded"],
            "date_distribution": dict(self.stats["date_distribution"]),
        }

        return cleaned_csv_bytes, stats_dict

    def _detect_encoding(self, file_content: bytes) -> str:
        """
        Détecte l'encodage du fichier en testant plusieurs encodages.

        Args:
            file_content: Contenu du fichier en bytes

        Returns:
            Encodage détecté (utf-8, latin-1, ou cp1252)
        """
        encodings = ["utf-8", "latin-1", "cp1252"]

        for encoding in encodings:
            try:
                file_content.decode(encoding)
                logger.info(f"Encodage détecté: {encoding}")
                return encoding
            except UnicodeDecodeError:
                continue

        # Par défaut, utiliser UTF-8 avec gestion d'erreurs
        logger.warning("Impossible de détecter l'encodage, utilisation de UTF-8")
        return "utf-8"

    def _read_csv(
        self, file_content: bytes, encoding: str
    ) -> Tuple[List[str], List[Dict[str, str]]]:
        """
        Lit le CSV legacy avec gestion d'encodage.

        Args:
            file_content: Contenu du fichier en bytes
            encoding: Encodage du fichier

        Returns:
            Tuple contenant les en-têtes et les lignes de données
        """
        try:
            text = file_content.decode(encoding, errors="replace")
            reader = csv.reader(io.StringIO(text), delimiter=";")
            rows = list(reader)

            if rows:
                logger.info(f"CSV lu avec succès en {encoding}")
                return self._parse_csv_structure(rows)
        except Exception as e:
            logger.error(f"Erreur lors de la lecture du CSV: {e}")
            raise ValueError(f"Impossible de lire le fichier CSV: {str(e)}")

    def _parse_csv_structure(
        self, rows: List[List[str]]
    ) -> Tuple[List[str], List[Dict[str, str]]]:
        """
        Parse la structure spécifique du CSV legacy.

        - Ignore la ligne de totaux (ligne 1 : `;;TOTAUX;3886.72`)
        - Identifie la ligne d'en-têtes (ligne 2)
        - Identifie les colonnes requises
        - Ignore les colonnes supplémentaires/vides

        Args:
            rows: Liste des lignes CSV parsées

        Returns:
            Tuple (en-têtes, lignes de données)
        """
        if not rows:
            raise ValueError("Le fichier CSV est vide")

        # Ignorer la ligne de totaux (ligne 1)
        if len(rows) > 0 and rows[0] and len(rows[0]) > 2 and "TOTAUX" in rows[0][2]:
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
                raise ValueError(
                    f"Colonne requise '{key}' non trouvée dans les en-têtes: {headers}"
                )

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
                    data_row[key] = ""

            data_row["_row_number"] = row_idx  # Conserver le numéro de ligne pour le logging
            data_rows.append(data_row)

        logger.info(f"{len(data_rows)} lignes de données extraites")
        return headers, data_rows

    def _parse_date(self, date_str: str, row_number: int) -> Optional[datetime]:
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
        pattern1 = r"(\d{1,2})/(\d{1,2})/(\d{4})"
        match = re.match(pattern1, date_str)
        if match:
            try:
                day, month, year = map(int, match.groups())
                return datetime(year, month, day)
            except ValueError:
                pass

        # Format DD/mois abrégé (année 2025 par défaut)
        pattern2 = r"(\d{1,2})/(jan|fév|mars|avr|mai|juin|juil|août|sept|oct|nov|déc)"
        month_map = {
            "jan": 1,
            "fév": 2,
            "mars": 3,
            "avr": 4,
            "mai": 5,
            "juin": 6,
            "juil": 7,
            "août": 8,
            "sept": 9,
            "oct": 10,
            "nov": 11,
            "déc": 12,
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
        self.stats["unparseable_dates"] += 1
        return None

    def _normalize_dates(
        self, data_rows: List[Dict[str, str]]
    ) -> List[Dict[str, datetime]]:
        """
        Normalise les dates avec fill-down et répartition des orphelines.

        - Principe fill-down: une date s'applique aux lignes suivantes jusqu'à la prochaine date
        - Lignes orphelines (3-106): répartition uniforme entre 17-20/09/2025
        - Conversion en ISO 8601 (YYYY-MM-DD)

        Args:
            data_rows: Liste des lignes de données brutes

        Returns:
            Liste des lignes avec dates normalisées
        """
        normalized = []
        current_date: Optional[datetime] = None
        orphan_rows: List[Dict] = []
        last_valid_date: Optional[datetime] = None

        for row in data_rows:
            row_number = row.get("_row_number", 0)
            date_str = row.get("date", "")

            # Parser la date
            parsed_date = self._parse_date(date_str, row_number)

            if parsed_date:
                current_date = parsed_date
                last_valid_date = parsed_date
                self.stats["dates_normalized"] += 1
            elif current_date:
                # Fill-down: utiliser la date courante
                parsed_date = current_date
            else:
                # Ligne orpheline (pas de date et pas de date courante)
                orphan_rows.append(row)
                continue

            # Ajouter la date normalisée
            row["date_normalized"] = parsed_date
            normalized.append(row)

        # Répartition uniforme des lignes orphelines
        if orphan_rows:
            self.stats["orphan_lines"] = len(orphan_rows)
            logger.info(
                f"Répartition de {len(orphan_rows)} lignes orphelines entre "
                f"{self.ORPHAN_DATE_START.date()} et {self.ORPHAN_DATE_END.date()}"
            )

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
                        current_orphan_date = self.ORPHAN_DATE_START + timedelta(
                            days=days_to_add
                        )

                orphan_row["date_normalized"] = current_orphan_date
                normalized.append(orphan_row)
                orphan_idx += 1
                self.stats["dates_normalized"] += 1

        # Utiliser date de fallback pour les dates non parsables restantes
        fallback_date = last_valid_date or self.ORPHAN_DATE_START
        for row in normalized:
            if "date_normalized" not in row:
                row_number = row.get("_row_number", 0)
                logger.warning(
                    f"Ligne {row_number}: Utilisation de la date de fallback: {fallback_date.date()}"
                )
                row["date_normalized"] = fallback_date
                self.stats["dates_normalized"] += 1

        return normalized

    def _round_weight(self, weight_str: str, row_number: int) -> Optional[Decimal]:
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
            weight_str = weight_str.strip().replace(",", ".")
            weight = Decimal(weight_str)

            # Valider que le poids est > 0
            if weight <= 0:
                logger.warning(f"Ligne {row_number}: Poids invalide (≤ 0): {weight}")
                self.stats["invalid_weights"] += 1
                return None

            # Arrondir à 2 décimales
            rounded = weight.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            if rounded != weight:
                self.stats["weights_rounded"] += 1
            return rounded
        except (ValueError, TypeError, InvalidOperation) as e:
            logger.warning(f"Ligne {row_number}: Poids non parsable: '{weight_str}' ({e})")
            self.stats["invalid_weights"] += 1
            return None

    def _clean_data(
        self, data_rows: List[Dict[str, datetime]]
    ) -> List[Dict[str, str]]:
        """
        Nettoie et restructure les données pour le template offline.

        - Arrondit les poids
        - Exclut les lignes avec poids invalides
        - Mappe vers le format template offline

        Args:
            data_rows: Liste des lignes avec dates normalisées

        Returns:
            Liste des lignes nettoyées au format template offline
        """
        cleaned = []

        for row in data_rows:
            row_number = row.get("_row_number", 0)
            self.stats["total_lines"] += 1

            # Arrondir le poids
            weight_str = row.get("weight", "")
            weight = self._round_weight(weight_str, row_number)

            if weight is None:
                # Exclure la ligne
                logger.warning(f"Ligne {row_number}: Exclue (poids invalide)")
                self.stats["excluded_lines"] += 1
                continue

            # Mapper vers le format template offline
            date_normalized = row.get("date_normalized")
            if not date_normalized:
                logger.warning(f"Ligne {row_number}: Exclue (date manquante)")
                self.stats["excluded_lines"] += 1
                continue

            # Utiliser Catégorie ou Libellé pour category
            category = row.get("category", "").strip() or row.get("label", "").strip()
            if not category:
                category = "Divers"  # Valeur par défaut

            cleaned_row = {
                "date": date_normalized.strftime("%Y-%m-%d"),
                "category": category,
                "poids_kg": str(weight),
                "destination": "MAGASIN",  # Valeur par défaut
                "notes": "",  # Colonne vide pour conformité template
            }

            cleaned.append(cleaned_row)
            self.stats["date_distribution"][cleaned_row["date"]] += 1

        self.stats["final_lines"] = len(cleaned)
        return cleaned

    def _write_output(self, cleaned_data: List[Dict[str, str]]) -> bytes:
        """
        Écrit le CSV nettoyé avec encodage UTF-8.

        Args:
            cleaned_data: Liste des lignes nettoyées

        Returns:
            CSV nettoyé en bytes (UTF-8)
        """
        fieldnames = ["date", "category", "poids_kg", "destination", "notes"]

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=fieldnames, delimiter=",")
        writer.writeheader()
        writer.writerows(cleaned_data)

        csv_bytes = output.getvalue().encode("utf-8")
        logger.info(f"CSV nettoyé généré: {len(cleaned_data)} lignes")
        return csv_bytes

