"""
Service de validation de conformité CSV pour l'import legacy.

Ce service valide qu'un CSV est conforme au template offline standardisé
avant l'analyse et l'import.
"""

from __future__ import annotations

import csv
import io
import logging
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class CSVValidationService:
    """Service de validation de conformité CSV."""

    REQUIRED_HEADERS = ["date", "category", "poids_kg", "destination", "notes"]
    
    # Formats de date acceptés (ISO 8601 prioritaire)
    DATE_FORMATS = [
        "%Y-%m-%d",  # ISO 8601 (prioritaire)
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%Y/%m/%d",
    ]

    def __init__(self):
        """Initialise le service de validation."""
        self.validation_report: Dict[str, Any] = {
            "is_valid": True,
            "errors": [],
            "warnings": [],
            "statistics": {
                "total_lines": 0,
                "valid_lines": 0,
                "invalid_lines": 0,
                "missing_columns": [],
                "extra_columns": [],
                "date_errors": 0,
                "weight_errors": 0,
                "structure_issues": 0,
            },
        }

    def validate(self, file_bytes: bytes, encoding: str = "utf-8") -> Dict[str, Any]:
        """
        Valide la conformité d'un CSV.
        
        Args:
            file_bytes: Contenu du fichier CSV en bytes
            encoding: Encodage du fichier (défaut: utf-8)
        
        Returns:
            Rapport de validation avec is_valid, errors, warnings, statistics
        """
        # Réinitialiser le rapport
        self.validation_report = {
            "is_valid": True,
            "errors": [],
            "warnings": [],
            "statistics": {
                "total_lines": 0,
                "valid_lines": 0,
                "invalid_lines": 0,
                "missing_columns": [],
                "extra_columns": [],
                "date_errors": 0,
                "weight_errors": 0,
                "structure_issues": 0,
            },
        }

        # Décoder le CSV
        try:
            text = file_bytes.decode(encoding, errors="replace")
        except Exception as e:
            self._add_error(f"Erreur lors du décodage du CSV: {str(e)}")
            self.validation_report["is_valid"] = False
            return self.validation_report

        # Parser le CSV
        try:
            reader = csv.DictReader(io.StringIO(text))
            headers = [h.strip() for h in (reader.fieldnames or [])]
        except Exception as e:
            self._add_error(f"Erreur lors du parsing du CSV: {str(e)}")
            self.validation_report["is_valid"] = False
            return self.validation_report

        # Valider les colonnes requises
        self._validate_headers(headers)

        # Valider les lignes de données
        self._validate_data_rows(reader, headers)

        # Déterminer si le CSV est valide
        if self.validation_report["errors"]:
            self.validation_report["is_valid"] = False

        return self.validation_report

    def _validate_headers(self, headers: List[str]) -> None:
        """Valide que toutes les colonnes requises sont présentes."""
        missing = [h for h in self.REQUIRED_HEADERS if h not in headers]
        if missing:
            self._add_error(
                f"Colonnes manquantes: {', '.join(missing)}. "
                f"Colonnes requises: {', '.join(self.REQUIRED_HEADERS)}"
            )
            self.validation_report["statistics"]["missing_columns"] = missing

        # Détecter les colonnes supplémentaires (warning, pas erreur)
        extra = [h for h in headers if h not in self.REQUIRED_HEADERS]
        if extra:
            self._add_warning(
                f"Colonnes supplémentaires détectées (seront ignorées): {', '.join(extra)}"
            )
            self.validation_report["statistics"]["extra_columns"] = extra

    def _validate_data_rows(
        self, reader: csv.DictReader, headers: List[str]
    ) -> None:
        """Valide chaque ligne de données."""
        for idx, row in enumerate(reader, start=2):  # start=2 car ligne 1 = en-têtes
            self.validation_report["statistics"]["total_lines"] += 1
            line_valid = True

            # Détecter les lignes de totaux (structure hétérogène)
            if self._is_total_line(row):
                self._add_warning(f"Ligne {idx}: Ligne de totaux détectée (sera ignorée)")
                self.validation_report["statistics"]["structure_issues"] += 1
                self.validation_report["statistics"]["invalid_lines"] += 1
                continue

            # Valider la date
            date_str = row.get("date", "").strip()
            if not date_str:
                self._add_error(f"Ligne {idx}: Date manquante")
                line_valid = False
                self.validation_report["statistics"]["date_errors"] += 1
            else:
                if not self._validate_date_format(date_str):
                    self._add_error(
                        f"Ligne {idx}: Format de date invalide: '{date_str}'. "
                        f"Format attendu: YYYY-MM-DD (ISO 8601)"
                    )
                    line_valid = False
                    self.validation_report["statistics"]["date_errors"] += 1

            # Valider la catégorie
            category = row.get("category", "").strip()
            if not category:
                self._add_error(f"Ligne {idx}: Catégorie manquante")
                line_valid = False

            # Valider le poids
            poids_str = row.get("poids_kg", "").strip()
            if not poids_str:
                self._add_error(f"Ligne {idx}: Poids manquant")
                line_valid = False
                self.validation_report["statistics"]["weight_errors"] += 1
            else:
                if not self._validate_weight(poids_str):
                    self._add_error(
                        f"Ligne {idx}: Poids invalide: '{poids_str}'. "
                        f"Le poids doit être un nombre > 0"
                    )
                    line_valid = False
                    self.validation_report["statistics"]["weight_errors"] += 1

            # Destination et notes sont optionnels, pas de validation stricte

            # Mettre à jour les statistiques
            if line_valid:
                self.validation_report["statistics"]["valid_lines"] += 1
            else:
                self.validation_report["statistics"]["invalid_lines"] += 1

    def _validate_date_format(self, date_str: str) -> bool:
        """
        Valide que la date est au format ISO 8601 (YYYY-MM-DD).
        
        Args:
            date_str: Chaîne de date à valider
        
        Returns:
            True si la date est au format ISO 8601, False sinon
        """
        if not date_str or not date_str.strip():
            return False

        # Essayer d'abord le format ISO 8601 (prioritaire)
        try:
            datetime.strptime(date_str.strip(), "%Y-%m-%d")
            return True
        except ValueError:
            pass

        # Si ce n'est pas ISO 8601, c'est invalide (même si d'autres formats sont parsables)
        return False

    def _validate_weight(self, weight_str: str) -> bool:
        """
        Valide que le poids est numérique et > 0.
        
        Args:
            weight_str: Chaîne représentant le poids
        
        Returns:
            True si le poids est valide, False sinon
        """
        if not weight_str or not weight_str.strip():
            return False

        try:
            # Nettoyer la chaîne (enlever espaces, remplacer virgule par point)
            cleaned = weight_str.strip().replace(",", ".").replace(" ", "")
            weight = Decimal(cleaned)

            # Valider que le poids est > 0
            if weight <= 0:
                return False

            return True
        except (ValueError, InvalidOperation, TypeError):
            return False

    def _is_total_line(self, row: Dict[str, str]) -> bool:
        """
        Détecte si une ligne est une ligne de totaux.
        
        Une ligne de totaux est typiquement:
        - Contient "TOTAUX" ou "TOTAL" dans une colonne
        - A plusieurs colonnes vides au début
        - A un nombre dans la colonne poids
        
        Args:
            row: Dictionnaire représentant une ligne CSV
        
        Returns:
            True si la ligne semble être une ligne de totaux, False sinon
        """
        # Vérifier si "TOTAUX" ou "TOTAL" apparaît dans n'importe quelle colonne
        row_values = " ".join(str(v).upper() for v in row.values())
        if "TOTAUX" in row_values or "TOTAL" in row_values:
            return True

        # Vérifier si plusieurs colonnes sont vides au début (pattern typique)
        values_list = list(row.values())
        empty_count = sum(1 for v in values_list[:3] if not str(v).strip())
        if empty_count >= 2:
            # Si on a au moins 2 colonnes vides au début et un nombre dans poids_kg
            poids_str = row.get("poids_kg", "").strip()
            if poids_str:
                try:
                    float(poids_str.replace(",", "."))
                    return True
                except (ValueError, TypeError):
                    pass

        return False

    def _add_error(self, message: str) -> None:
        """Ajoute une erreur au rapport de validation."""
        self.validation_report["errors"].append(message)
        logger.warning(f"Validation CSV - Erreur: {message}")

    def _add_warning(self, message: str) -> None:
        """Ajoute un avertissement au rapport de validation."""
        self.validation_report["warnings"].append(message)
        logger.info(f"Validation CSV - Avertissement: {message}")

