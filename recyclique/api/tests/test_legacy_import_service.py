"""
Tests unitaires pour LegacyImportService.
"""

import pytest
from datetime import date, datetime, timezone
from uuid import uuid4

from recyclic_api.services.legacy_import_service import LegacyImportService
from recyclic_api.models.category import Category


class TestLegacyImportServiceFuzzyMatching:
    """Tests pour le fuzzy matching des catégories."""
    
    def test_fuzzy_match_exact_match(self, db_session):
        """Test qu'un match exact retourne 100% de confiance."""
        # Créer une catégorie
        cat = Category(name="Vaisselle", is_active=True)
        db_session.add(cat)
        db_session.commit()
        
        service = LegacyImportService(db_session)
        result = service._fuzzy_match_category("Vaisselle", confidence_threshold=80.0)
        
        assert result is not None
        assert result["category_id"] == str(cat.id)
        assert result["category_name"] == "Vaisselle"
        assert result["confidence"] >= 80.0
    
    def test_fuzzy_match_typo(self, db_session):
        """Test qu'une typo légère retourne un score élevé."""
        cat = Category(name="Vaisselle", is_active=True)
        db_session.add(cat)
        db_session.commit()
        
        service = LegacyImportService(db_session)
        result = service._fuzzy_match_category("Vaiselle", confidence_threshold=80.0)
        
        # Devrait matcher avec un score élevé (mais pas 100%)
        assert result is not None
        assert result["category_id"] == str(cat.id)
        assert result["confidence"] >= 80.0
    
    def test_fuzzy_match_no_match_below_threshold(self, db_session):
        """Test qu'une correspondance faible retourne None si < seuil."""
        cat = Category(name="Vaisselle", is_active=True)
        db_session.add(cat)
        db_session.commit()
        
        service = LegacyImportService(db_session)
        result = service._fuzzy_match_category("XYZ123", confidence_threshold=80.0)
        
        # Ne devrait pas matcher
        assert result is None
    
    def test_fuzzy_match_case_insensitive(self, db_session):
        """Test que le matching est insensible à la casse."""
        cat = Category(name="Vaisselle", is_active=True)
        db_session.add(cat)
        db_session.commit()
        
        service = LegacyImportService(db_session)
        result1 = service._fuzzy_match_category("VAISSELLE", confidence_threshold=80.0)
        result2 = service._fuzzy_match_category("vaiselle", confidence_threshold=80.0)
        
        assert result1 is not None
        assert result2 is not None
        assert result1["category_id"] == result2["category_id"]
    
    def test_generate_mapping(self, db_session):
        """Test la génération de mapping pour plusieurs catégories."""
        # Créer des catégories
        cat1 = Category(name="Vaisselle", is_active=True)
        cat2 = Category(name="DEEE", is_active=True)
        db_session.add_all([cat1, cat2])
        db_session.commit()
        
        service = LegacyImportService(db_session)
        unique_categories = ["Vaisselle", "DEEE", "UnknownCategory"]
        
        result = service._generate_mapping(unique_categories, confidence_threshold=80.0)
        
        assert "mappings" in result
        assert "unmapped" in result
        assert len(result["mappings"]) == 2  # Vaisselle et DEEE mappés
        assert "UnknownCategory" in result["unmapped"]


class TestLegacyImportServiceAnalyze:
    """Tests pour la méthode analyze."""
    
    def test_analyze_valid_csv(self, db_session):
        """Test l'analyse d'un CSV valide."""
        # Créer une catégorie
        cat = Category(name="Vaisselle", is_active=True)
        db_session.add(cat)
        db_session.commit()
        
        csv_content = (
            "date,category,poids_kg,destination,notes\n"
            "2025-01-15,Vaisselle,5.5,MAGASIN,Test note\n"
            "2025-01-16,DEEE,10.0,RECYCLAGE,\n"
        ).encode("utf-8")
        
        service = LegacyImportService(db_session)
        result = service.analyze(csv_content)
        
        assert "mappings" in result
        assert "unmapped" in result
        assert "statistics" in result
        assert "errors" in result
        assert result["statistics"]["total_lines"] == 2
        assert result["statistics"]["valid_lines"] == 2
        assert result["statistics"]["llm_mapped_categories"] == 0
    
    def test_analyze_missing_headers(self, db_session):
        """Test qu'un CSV sans en-têtes valides lève une erreur."""
        csv_content = (
            "date,category\n"
            "2025-01-15,Vaisselle\n"
        ).encode("utf-8")
        
        service = LegacyImportService(db_session)
        
        with pytest.raises(Exception):  # HTTPException ou ValueError
            service.analyze(csv_content)
    
    def test_analyze_invalid_date(self, db_session):
        """Test qu'une date invalide génère une erreur."""
        csv_content = (
            "date,category,poids_kg,destination,notes\n"
            "invalid-date,Vaisselle,5.5,MAGASIN,\n"
        ).encode("utf-8")
        
        service = LegacyImportService(db_session)
        result = service.analyze(csv_content)
        
        assert len(result["errors"]) > 0
        assert any("Date invalide" in err for err in result["errors"])
    
    def test_analyze_invalid_weight(self, db_session):
        """Test qu'un poids invalide génère une erreur."""
        csv_content = (
            "date,category,poids_kg,destination,notes\n"
            "2025-01-15,Vaisselle,0,MAGASIN,\n"
        ).encode("utf-8")
        
        service = LegacyImportService(db_session)
        result = service.analyze(csv_content)
        
        assert len(result["errors"]) > 0
        assert any("Poids invalide" in err for err in result["errors"])


class TestLegacyImportServiceExecute:
    """Tests pour la méthode execute."""
    
    def test_execute_valid_import(self, db_session):
        """Test l'exécution d'un import valide."""
        from recyclic_api.models.user import User, UserRole, UserStatus
        from recyclic_api.core.security import hash_password
        
        # Créer un utilisateur admin
        admin_user = User(
            id=uuid4(),
            username="admin@test.com",
            hashed_password=hash_password("testpass"),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(admin_user)
        
        # Créer une catégorie
        cat = Category(name="Vaisselle", is_active=True)
        db_session.add(cat)
        db_session.commit()
        
        csv_content = (
            "date,category,poids_kg,destination,notes\n"
            "2025-01-15,Vaisselle,5.5,MAGASIN,Test note\n"
        ).encode("utf-8")
        
        mapping_json = {
            "mappings": {
                "Vaisselle": {
                    "category_id": str(cat.id),
                    "category_name": "Vaisselle",
                    "confidence": 100.0
                }
            },
            "unmapped": []
        }
        
        service = LegacyImportService(db_session)
        result = service.execute(csv_content, mapping_json, admin_user.id)
        
        assert result["postes_created"] >= 0
        assert result["tickets_created"] == 1
        assert result["lignes_imported"] == 1
        assert result["total_errors"] == 0
    
    def test_execute_invalid_mapping_structure(self, db_session):
        """Test qu'un mapping invalide lève une erreur."""
        from recyclic_api.models.user import User, UserRole, UserStatus
        from recyclic_api.core.security import hash_password
        
        admin_user = User(
            id=uuid4(),
            username="admin@test.com",
            hashed_password=hash_password("testpass"),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(admin_user)
        db_session.commit()
        
        csv_content = (
            "date,category,poids_kg,destination,notes\n"
            "2025-01-15,Vaisselle,5.5,MAGASIN,\n"
        ).encode("utf-8")
        
        mapping_json = {}  # Structure invalide
        
        service = LegacyImportService(db_session)
        
        with pytest.raises(Exception):  # HTTPException
            service.execute(csv_content, mapping_json, admin_user.id)
    
    def test_execute_unmapped_category(self, db_session):
        """Test qu'une catégorie non mappée génère une erreur."""
        from recyclic_api.models.user import User, UserRole, UserStatus
        from recyclic_api.core.security import hash_password
        
        admin_user = User(
            id=uuid4(),
            username="admin@test.com",
            hashed_password=hash_password("testpass"),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(admin_user)
        db_session.commit()
        
        csv_content = (
            "date,category,poids_kg,destination,notes\n"
            "2025-01-15,UnknownCategory,5.5,MAGASIN,\n"
        ).encode("utf-8")
        
        mapping_json = {
            "mappings": {},
            "unmapped": ["UnknownCategory"]
        }
        
        service = LegacyImportService(db_session)
        result = service.execute(csv_content, mapping_json, admin_user.id)
        
        # Devrait avoir des erreurs pour la catégorie non mappée
        assert result["total_errors"] > 0
        assert any("non mappée" in err.lower() or "absente" in err.lower() for err in result["errors"])

