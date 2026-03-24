"""
Tests d'intégration pour les endpoints legacy import.
"""

import json
import pytest
from fastapi.testclient import TestClient

from recyclic_api.models.category import Category
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.core.security import hash_password


def make_csv(content: str) -> bytes:
    """Helper pour créer un CSV en bytes."""
    return content.encode("utf-8")


def make_json_mapping(mappings: dict, unmapped: list = None) -> bytes:
    """Helper pour créer un fichier JSON de mapping."""
    if unmapped is None:
        unmapped = []
    data = {"mappings": mappings, "unmapped": unmapped}
    return json.dumps(data).encode("utf-8")


class TestLegacyImportAnalyzeEndpoint:
    """Tests pour l'endpoint analyze."""
    
    def test_analyze_requires_admin(self, client, db_session):
        """Test que l'endpoint require ADMIN ou SUPER_ADMIN."""
        csv_content = (
            "date,category,poids_kg,destination,notes\n"
            "2025-01-15,Vaisselle,5.5,MAGASIN,\n"
        )
        
        files = {"file": ("test.csv", make_csv(csv_content), "text/csv")}
        r = client.post("/api/v1/admin/import/legacy/analyze", files=files)
        
        # Devrait retourner 401 ou 403
        assert r.status_code in [401, 403]
    
    def test_analyze_valid_csv(self, admin_client, db_session):
        """Test l'analyse d'un CSV valide."""
        # Créer une catégorie
        cat = Category(name="Vaisselle", is_active=True)
        db_session.add(cat)
        db_session.commit()
        
        csv_content = (
            "date,category,poids_kg,destination,notes\n"
            "2025-01-15,Vaisselle,5.5,MAGASIN,Test note\n"
            "2025-01-16,DEEE,10.0,RECYCLAGE,\n"
        )
        
        files = {"file": ("test.csv", make_csv(csv_content), "text/csv")}
        r = admin_client.post("/api/v1/admin/import/legacy/analyze", files=files)
        
        assert r.status_code == 200, r.text
        data = r.json()
        
        assert "mappings" in data
        assert "unmapped" in data
        assert "statistics" in data
        assert "errors" in data
        assert data["statistics"]["total_lines"] == 2
    
    def test_analyze_invalid_file_format(self, admin_client):
        """Test qu'un fichier non-CSV est rejeté."""
        files = {"file": ("test.txt", b"not a csv", "text/plain")}
        r = admin_client.post("/api/v1/admin/import/legacy/analyze", files=files)
        
        assert r.status_code == 400
        assert "csv" in r.json()["detail"].lower()
    
    def test_analyze_with_confidence_threshold(self, admin_client, db_session):
        """Test l'analyse avec un seuil de confiance personnalisé."""
        cat = Category(name="Vaisselle", is_active=True)
        db_session.add(cat)
        db_session.commit()
        
        csv_content = (
            "date,category,poids_kg,destination,notes\n"
            "2025-01-15,Vaisselle,5.5,MAGASIN,\n"
        )
        
        files = {
            "file": ("test.csv", make_csv(csv_content), "text/csv"),
        }
        data = {"confidence_threshold": 90.0}
        r = admin_client.post(
            "/api/v1/admin/import/legacy/analyze",
            files=files,
            data=data
        )
        
        assert r.status_code == 200

    def test_analyze_with_llm_model_override(self, admin_client, db_session):
        """Test l'analyse avec override du modèle LLM (B47-P6)."""
        cat = Category(name="Vaisselle", is_active=True)
        db_session.add(cat)
        db_session.commit()
        
        csv_content = (
            "date,category,poids_kg,destination,notes\n"
            "2025-01-15,UnknownCategory,5.5,MAGASIN,\n"
        )
        
        files = {
            "file": ("test.csv", make_csv(csv_content), "text/csv"),
        }
        data = {"llm_model_id": "mistralai/mistral-7b-instruct:free"}
        r = admin_client.post(
            "/api/v1/admin/import/legacy/analyze",
            files=files,
            data=data
        )
        
        assert r.status_code == 200
        result = r.json()
        # Vérifier que les statistiques LLM sont présentes
        assert "llm_attempted" in result["statistics"]
        assert "llm_model_used" in result["statistics"]
        assert "llm_batches_total" in result["statistics"]


class TestLegacyImportExecuteEndpoint:
    """Tests pour l'endpoint execute."""
    
    def test_execute_requires_admin(self, client, db_session):
        """Test que l'endpoint require ADMIN ou SUPER_ADMIN."""
        csv_content = (
            "date,category,poids_kg,destination,notes\n"
            "2025-01-15,Vaisselle,5.5,MAGASIN,\n"
        )
        mapping_content = make_json_mapping({})
        
        files = {
            "csv_file": ("test.csv", make_csv(csv_content), "text/csv"),
            "mapping_file": ("mapping.json", mapping_content, "application/json")
        }
        r = client.post("/api/v1/admin/import/legacy/execute", files=files)
        
        # Devrait retourner 401 ou 403
        assert r.status_code in [401, 403]
    
    def test_execute_valid_import(self, admin_client, db_session):
        """Test l'exécution d'un import valide."""
        from uuid import uuid4
        
        # Créer un utilisateur admin (pour l'import)
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
        )
        
        mapping_content = make_json_mapping({
            "Vaisselle": {
                "category_id": str(cat.id),
                "category_name": "Vaisselle",
                "confidence": 100.0
            }
        })
        
        files = {
            "csv_file": ("test.csv", make_csv(csv_content), "text/csv"),
            "mapping_file": ("mapping.json", mapping_content, "application/json")
        }
        r = admin_client.post("/api/v1/admin/import/legacy/execute", files=files)
        
        assert r.status_code == 200, r.text
        data = r.json()
        
        assert "report" in data
        assert "message" in data
        assert data["report"]["tickets_created"] == 1
        assert data["report"]["lignes_imported"] == 1
    
    def test_execute_invalid_mapping_json(self, admin_client):
        """Test qu'un mapping JSON invalide est rejeté."""
        csv_content = (
            "date,category,poids_kg,destination,notes\n"
            "2025-01-15,Vaisselle,5.5,MAGASIN,\n"
        )
        
        files = {
            "csv_file": ("test.csv", make_csv(csv_content), "text/csv"),
            "mapping_file": ("mapping.json", b"invalid json", "application/json")
        }
        r = admin_client.post("/api/v1/admin/import/legacy/execute", files=files)
        
        assert r.status_code == 400
        assert "json" in r.json()["detail"].lower()
    
    def test_execute_unmapped_category(self, admin_client, db_session):
        """Test qu'une catégorie non mappée génère des erreurs."""
        from uuid import uuid4
        
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
        )
        
        mapping_content = make_json_mapping({}, unmapped=["UnknownCategory"])
        
        files = {
            "csv_file": ("test.csv", make_csv(csv_content), "text/csv"),
            "mapping_file": ("mapping.json", mapping_content, "application/json")
        }
        r = admin_client.post("/api/v1/admin/import/legacy/execute", files=files)
        
        assert r.status_code == 200  # L'import peut réussir partiellement
        data = r.json()
        
        # Devrait avoir des erreurs pour la catégorie non mappée
        assert data["report"]["total_errors"] > 0

