"""
Tests pour le script de nettoyage du CSV legacy (Story B47-P1).

Tests unitaires et d'intégration pour:
- Parsing des dates (formats variés)
- Fill-down des dates
- Répartition des dates orphelines
- Arrondi des poids
- Gestion des cas limites (dates non parsables, poids invalides, structure CSV)
"""

import csv
import tempfile
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch

import pytest
import sys

# Ajouter le répertoire scripts au PYTHONPATH pour importer le module
scripts_dir = Path(__file__).parent.parent.parent / "scripts"
sys.path.insert(0, str(scripts_dir))

from clean_legacy_import import LegacyCSVCleaner


@pytest.fixture
def sample_csv_legacy(tmp_path):
    """Crée un CSV legacy de test avec structure typique."""
    csv_file = tmp_path / "test_legacy.csv"
    
    # Structure du CSV legacy:
    # Ligne 1: Totaux
    # Ligne 2: En-têtes
    # Lignes 3+: Données
    content = """;;TOTAUX;3886.72
Date;Catégorie;Libellé;Poids_kg;Notes
;Vaisselle;Lot;15.00;cahier p.3
;Meubles;Lot;37.00;cahier p.3
25/09/2025;Vaisselle;Lot;4.00;cahier p.3
25/09/2025;Textile;Lot;6.00;cahier p.3
26/09/2025;Livres;Lot;7.20;cahier p.4
27/sept;Électroménager;Lot;5.50;cahier p.4
;Divers;Lot;3.00;cahier p.5
09/oct;DEEE;Lot;1.20;cahier p.6
;Vaisselle;Lot;0.5699999999999999;cahier p.7
;Meubles;Lot;-5.00;cahier p.8
;Textile;Lot;0.0;cahier p.9
"""
    csv_file.write_text(content, encoding='utf-8')
    return csv_file


@pytest.fixture
def sample_csv_with_invalid_dates(tmp_path):
    """CSV avec dates non parsables."""
    csv_file = tmp_path / "test_invalid_dates.csv"
    content = """;;TOTAUX;100.00
Date;Catégorie;Libellé;Poids_kg;Notes
25/09/2025;Vaisselle;Lot;10.00;valid
invalid-date;Textile;Lot;5.00;invalid
32/13/2025;Livres;Lot;3.00;invalid month
"""
    csv_file.write_text(content, encoding='utf-8')
    return csv_file


@pytest.fixture
def sample_csv_with_empty_columns(tmp_path):
    """CSV avec colonnes supplémentaires vides."""
    csv_file = tmp_path / "test_empty_cols.csv"
    content = """;;TOTAUX;50.00
Date;Catégorie;Libellé;Poids_kg;Notes;;;;;;;;;;;;;;;;;;;;;
25/09/2025;Vaisselle;Lot;10.00;cahier p.3;;;;;;;;;;;;;;;;;;;;;
26/09/2025;Textile;Lot;5.00;cahier p.4;;;;;;;;;;;;;;;;;;;;;
"""
    csv_file.write_text(content, encoding='utf-8')
    return csv_file


class TestDateParsing:
    """Tests unitaires pour le parsing des dates."""
    
    def test_parse_date_dd_mm_yyyy(self):
        """Test parsing format DD/MM/YYYY."""
        cleaner = LegacyCSVCleaner(Path("dummy"), Path("dummy"))
        date = cleaner.parse_date("25/09/2025", 1)
        assert date == datetime(2025, 9, 25)
    
    def test_parse_date_dd_month_abbr(self):
        """Test parsing format DD/mois abrégé."""
        cleaner = LegacyCSVCleaner(Path("dummy"), Path("dummy"))
        date = cleaner.parse_date("27/sept", 1)
        assert date == datetime(2025, 9, 27)
        
        date = cleaner.parse_date("09/oct", 1)
        assert date == datetime(2025, 10, 9)
    
    def test_parse_date_empty_string(self):
        """Test parsing date vide."""
        cleaner = LegacyCSVCleaner(Path("dummy"), Path("dummy"))
        date = cleaner.parse_date("", 1)
        assert date is None
        
        date = cleaner.parse_date("   ", 1)
        assert date is None
    
    def test_parse_date_invalid_format(self):
        """Test parsing date avec format invalide."""
        cleaner = LegacyCSVCleaner(Path("dummy"), Path("dummy"))
        date = cleaner.parse_date("invalid-date", 1)
        assert date is None
        assert cleaner.stats['unparseable_dates'] == 1
    
    def test_parse_date_invalid_values(self):
        """Test parsing date avec valeurs invalides."""
        cleaner = LegacyCSVCleaner(Path("dummy"), Path("dummy"))
        date = cleaner.parse_date("32/13/2025", 1)  # Mois/jour invalides
        assert date is None


class TestDateNormalization:
    """Tests unitaires pour la normalisation des dates."""
    
    def test_fill_down_dates(self):
        """Test que le fill-down fonctionne correctement."""
        cleaner = LegacyCSVCleaner(Path("dummy"), Path("dummy"))
        
        data_rows = [
            {'_row_number': 1, 'date': '25/09/2025', 'category': 'Vaisselle', 'label': 'Lot', 'weight': '10.00'},
            {'_row_number': 2, 'date': '', 'category': 'Textile', 'label': 'Lot', 'weight': '5.00'},
            {'_row_number': 3, 'date': '', 'category': 'Livres', 'label': 'Lot', 'weight': '3.00'},
            {'_row_number': 4, 'date': '26/09/2025', 'category': 'Meubles', 'label': 'Lot', 'weight': '7.00'},
        ]
        
        normalized = cleaner.normalize_dates(data_rows)
        
        # Vérifier que toutes les lignes ont une date
        assert len(normalized) == 4
        assert normalized[0]['date_normalized'] == datetime(2025, 9, 25)
        assert normalized[1]['date_normalized'] == datetime(2025, 9, 25)  # Fill-down
        assert normalized[2]['date_normalized'] == datetime(2025, 9, 25)  # Fill-down
        assert normalized[3]['date_normalized'] == datetime(2025, 9, 26)
    
    def test_orphan_lines_distribution(self):
        """Test répartition uniforme des lignes orphelines."""
        cleaner = LegacyCSVCleaner(Path("dummy"), Path("dummy"))
        
        # Créer 10 lignes orphelines (sans date)
        data_rows = [
            {'_row_number': i, 'date': '', 'category': f'Cat{i}', 'label': 'Lot', 'weight': '1.00'}
            for i in range(1, 11)
        ]
        
        normalized = cleaner.normalize_dates(data_rows)
        
        # Vérifier que toutes les lignes ont une date dans la plage 17-20/09/2025
        assert len(normalized) == 10
        for row in normalized:
            date = row['date_normalized']
            assert date >= cleaner.ORPHAN_DATE_START
            assert date <= cleaner.ORPHAN_DATE_END
        
        # Vérifier la répartition (au moins 2 dates différentes utilisées)
        dates_used = {row['date_normalized'] for row in normalized}
        assert len(dates_used) >= 2
    
    def test_unparseable_date_fallback(self):
        """Test utilisation de date de fallback pour dates non parsables."""
        cleaner = LegacyCSVCleaner(Path("dummy"), Path("dummy"))
        
        data_rows = [
            {'_row_number': 1, 'date': '25/09/2025', 'category': 'Vaisselle', 'label': 'Lot', 'weight': '10.00'},
            {'_row_number': 2, 'date': 'invalid', 'category': 'Textile', 'label': 'Lot', 'weight': '5.00'},
        ]
        
        normalized = cleaner.normalize_dates(data_rows)
        
        # La première ligne doit avoir sa date
        assert normalized[0]['date_normalized'] == datetime(2025, 9, 25)
        # La deuxième ligne doit utiliser la date de fallback (dernière date valide)
        assert normalized[1]['date_normalized'] == datetime(2025, 9, 25)


class TestWeightRounding:
    """Tests unitaires pour l'arrondi des poids."""
    
    def test_round_weight_normal(self):
        """Test arrondi poids normal."""
        cleaner = LegacyCSVCleaner(Path("dummy"), Path("dummy"))
        weight = cleaner.round_weight("15.00", 1)
        assert weight == Decimal("15.00")
    
    def test_round_weight_excel_float(self):
        """Test arrondi poids avec décimales Excel."""
        cleaner = LegacyCSVCleaner(Path("dummy"), Path("dummy"))
        weight = cleaner.round_weight("0.5699999999999999", 1)
        assert weight == Decimal("0.57")
        
        weight = cleaner.round_weight("7.2000000000000002", 1)
        assert weight == Decimal("7.20")
    
    def test_round_weight_with_comma(self):
        """Test arrondi poids avec virgule."""
        cleaner = LegacyCSVCleaner(Path("dummy"), Path("dummy"))
        weight = cleaner.round_weight("15,50", 1)
        assert weight == Decimal("15.50")
    
    def test_round_weight_invalid_zero(self):
        """Test exclusion poids = 0."""
        cleaner = LegacyCSVCleaner(Path("dummy"), Path("dummy"))
        weight = cleaner.round_weight("0.0", 1)
        assert weight is None
        assert cleaner.stats['invalid_weights'] == 1
    
    def test_round_weight_invalid_negative(self):
        """Test exclusion poids négatif."""
        cleaner = LegacyCSVCleaner(Path("dummy"), Path("dummy"))
        weight = cleaner.round_weight("-5.00", 1)
        assert weight is None
        assert cleaner.stats['invalid_weights'] == 1
    
    def test_round_weight_invalid_string(self):
        """Test exclusion poids non parsable."""
        cleaner = LegacyCSVCleaner(Path("dummy"), Path("dummy"))
        weight = cleaner.round_weight("invalid", 1)
        assert weight is None
        assert cleaner.stats['invalid_weights'] == 1
    
    def test_round_weight_empty_string(self):
        """Test exclusion poids vide."""
        cleaner = LegacyCSVCleaner(Path("dummy"), Path("dummy"))
        weight = cleaner.round_weight("", 1)
        assert weight is None


class TestCSVStructure:
    """Tests pour la gestion de la structure CSV legacy."""
    
    def test_ignore_totals_line(self, sample_csv_legacy, tmp_path):
        """Test que la ligne de totaux est ignorée."""
        output_file = tmp_path / "output.csv"
        cleaner = LegacyCSVCleaner(sample_csv_legacy, output_file)
        
        headers, data_rows = cleaner.read_csv()
        
        # Vérifier que la ligne de totaux n'est pas dans les données
        assert len(data_rows) > 0
        # Aucune ligne ne devrait contenir "TOTAUX"
        for row in data_rows:
            assert 'TOTAUX' not in str(row.values())
    
    def test_parse_required_columns(self, sample_csv_legacy, tmp_path):
        """Test identification des colonnes requises."""
        output_file = tmp_path / "output.csv"
        cleaner = LegacyCSVCleaner(sample_csv_legacy, output_file)
        
        headers, data_rows = cleaner.read_csv()
        
        # Vérifier que les colonnes requises sont présentes
        assert len(data_rows) > 0
        first_row = data_rows[0]
        assert 'date' in first_row
        assert 'category' in first_row
        assert 'label' in first_row
        assert 'weight' in first_row
    
    def test_ignore_empty_columns(self, sample_csv_with_empty_columns, tmp_path):
        """Test que les colonnes vides sont ignorées."""
        output_file = tmp_path / "output.csv"
        cleaner = LegacyCSVCleaner(sample_csv_with_empty_columns, output_file)
        
        headers, data_rows = cleaner.read_csv()
        
        # Vérifier que les données sont correctement extraites malgré les colonnes vides
        assert len(data_rows) > 0
        for row in data_rows:
            # Les colonnes requises doivent être présentes
            assert 'date' in row
            assert 'category' in row


class TestDataCleaning:
    """Tests pour le nettoyage et la restructuration des données."""
    
    def test_clean_data_structure(self, sample_csv_legacy, tmp_path):
        """Test structure des données nettoyées."""
        output_file = tmp_path / "output.csv"
        cleaner = LegacyCSVCleaner(sample_csv_legacy, output_file)
        
        headers, data_rows = cleaner.read_csv()
        normalized = cleaner.normalize_dates(data_rows)
        cleaned = cleaner.clean_data(normalized)
        
        # Vérifier la structure du template offline
        assert len(cleaned) > 0
        first_row = cleaned[0]
        assert 'date' in first_row
        assert 'category' in first_row
        assert 'poids_kg' in first_row
        assert 'destination' in first_row
        assert 'notes' in first_row
        
        # Vérifier le format de la date (ISO 8601)
        assert first_row['date'].count('-') == 2  # YYYY-MM-DD
        datetime.strptime(first_row['date'], '%Y-%m-%d')  # Doit parser sans erreur
    
    def test_exclude_invalid_weights(self, sample_csv_legacy, tmp_path):
        """Test exclusion des lignes avec poids invalides."""
        output_file = tmp_path / "output.csv"
        cleaner = LegacyCSVCleaner(sample_csv_legacy, output_file)
        
        headers, data_rows = cleaner.read_csv()
        normalized = cleaner.normalize_dates(data_rows)
        cleaned = cleaner.clean_data(normalized)
        
        # Vérifier que les lignes avec poids ≤ 0 sont exclues
        for row in cleaned:
            weight = Decimal(row['poids_kg'])
            assert weight > 0
    
    def test_default_destination(self, sample_csv_legacy, tmp_path):
        """Test destination par défaut MAGASIN."""
        output_file = tmp_path / "output.csv"
        cleaner = LegacyCSVCleaner(sample_csv_legacy, output_file)
        
        headers, data_rows = cleaner.read_csv()
        normalized = cleaner.normalize_dates(data_rows)
        cleaned = cleaner.clean_data(normalized)
        
        # Toutes les lignes doivent avoir destination = MAGASIN
        for row in cleaned:
            assert row['destination'] == 'MAGASIN'
    
    def test_category_from_label_fallback(self, tmp_path):
        """Test utilisation de Libellé si Catégorie vide."""
        csv_file = tmp_path / "test_category_fallback.csv"
        content = """;;TOTAUX;10.00
Date;Catégorie;Libellé;Poids_kg;Notes
25/09/2025;;Lot Textile;5.00;test
"""
        csv_file.write_text(content, encoding='utf-8')
        
        output_file = tmp_path / "output.csv"
        cleaner = LegacyCSVCleaner(csv_file, output_file)
        
        headers, data_rows = cleaner.read_csv()
        normalized = cleaner.normalize_dates(data_rows)
        cleaned = cleaner.clean_data(normalized)
        
        # La catégorie doit venir du Libellé
        assert cleaned[0]['category'] == 'Lot Textile'


class TestIntegration:
    """Tests d'intégration avec échantillon du CSV legacy."""
    
    def test_full_cleaning_process(self, sample_csv_legacy, tmp_path):
        """Test processus complet de nettoyage."""
        output_file = tmp_path / "output.csv"
        cleaner = LegacyCSVCleaner(sample_csv_legacy, output_file)
        cleaner.clean()
        
        # Vérifier que le fichier de sortie existe
        assert output_file.exists()
        
        # Lire et valider le CSV de sortie
        with open(output_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            
            # Vérifier la structure
            assert len(rows) > 0
            fieldnames = ['date', 'category', 'poids_kg', 'destination', 'notes']
            assert set(reader.fieldnames) == set(fieldnames)
            
            # Vérifier le contenu
            for row in rows:
                # Date en ISO 8601
                datetime.strptime(row['date'], '%Y-%m-%d')
                
                # Poids valide et arrondi
                weight = Decimal(row['poids_kg'])
                assert weight > 0
                # Vérifier arrondi à 2 décimales
                assert str(weight) == row['poids_kg']
                
                # Destination par défaut
                assert row['destination'] == 'MAGASIN'
    
    def test_stats_reporting(self, sample_csv_legacy, tmp_path, caplog):
        """Test que les statistiques sont correctement rapportées."""
        output_file = tmp_path / "output.csv"
        cleaner = LegacyCSVCleaner(sample_csv_legacy, output_file)
        cleaner.clean()
        
        # Vérifier que les stats sont collectées
        assert cleaner.stats['total_lines'] > 0
        assert cleaner.stats['final_lines'] > 0
        assert cleaner.stats['final_lines'] <= cleaner.stats['total_lines']
        
        # Vérifier que les stats sont loggées
        log_output = caplog.text
        assert "STATISTIQUES DE NETTOYAGE" in log_output
        assert "Lignes traitées" in log_output
        assert "Lignes dans le CSV final" in log_output
    
    def test_encoding_detection(self, tmp_path):
        """Test détection automatique de l'encodage."""
        # Créer un CSV en latin-1
        csv_file = tmp_path / "test_latin1.csv"
        content = """;;TOTAUX;10.00
Date;Catégorie;Libellé;Poids_kg;Notes
25/09/2025;Vaisselle;Lot;5.00;test
"""
        csv_file.write_bytes(content.encode('latin-1'))
        
        output_file = tmp_path / "output.csv"
        cleaner = LegacyCSVCleaner(csv_file, output_file)
        
        # Ne doit pas lever d'erreur d'encodage
        headers, data_rows = cleaner.read_csv()
        assert len(data_rows) > 0

