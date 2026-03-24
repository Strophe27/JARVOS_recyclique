"""
Tests d'intégration pour l'endpoint llm-only (B47-P6).
"""

import pytest
from fastapi.testclient import TestClient

from recyclic_api.models.category import Category
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.core.security import hash_password


def test_llm_only_requires_admin(client):
    """Test que l'endpoint require ADMIN ou SUPER_ADMIN."""
    r = client.post(
        "/api/v1/admin/import/legacy/analyze/llm-only",
        json={"unmapped_categories": ["Cat1", "Cat2"]}
    )
    
    assert r.status_code in [401, 403]


def test_llm_only_with_empty_list(admin_client, db_session):
    """Test que l'endpoint accepte une liste vide."""
    r = admin_client.post(
        "/api/v1/admin/import/legacy/analyze/llm-only",
        json={"unmapped_categories": []}
    )
    
    assert r.status_code == 200
    data = r.json()
    assert "mappings" in data
    assert "statistics" in data
    assert data["mappings"] == {}
    assert data["statistics"]["llm_attempted"] is False


def test_llm_only_with_model_override(admin_client, db_session):
    """Test la relance LLM avec override du modèle."""
    cat = Category(name="Vaisselle", is_active=True)
    db_session.add(cat)
    db_session.commit()
    
    r = admin_client.post(
        "/api/v1/admin/import/legacy/analyze/llm-only",
        json={
            "unmapped_categories": ["UnknownCategory"],
            "llm_model_id": "mistralai/mistral-7b-instruct:free"
        }
    )
    
    assert r.status_code == 200
    data = r.json()
    assert "mappings" in data
    assert "statistics" in data
    assert "llm_model_used" in data["statistics"]
    assert data["statistics"]["llm_model_used"] == "mistralai/mistral-7b-instruct:free"


def test_llm_only_response_schema_validation(admin_client, db_session):
    """Test que l'endpoint retourne une réponse valide avec LLMOnlyStatistics (B47-P8)."""
    cat = Category(name="Vaisselle", is_active=True)
    db_session.add(cat)
    db_session.commit()
    
    r = admin_client.post(
        "/api/v1/admin/import/legacy/analyze/llm-only",
        json={
            "unmapped_categories": ["UnknownCategory"],
        }
    )
    
    assert r.status_code == 200
    data = r.json()
    
    # Vérifier que la réponse contient les champs attendus
    assert "mappings" in data
    assert "statistics" in data
    
    stats = data["statistics"]
    
    # Vérifier que les champs LLM sont présents
    assert "llm_attempted" in stats
    assert "llm_model_used" in stats
    assert "llm_batches_total" in stats
    assert "llm_batches_succeeded" in stats
    assert "llm_batches_failed" in stats
    assert "llm_mapped_categories" in stats
    assert "llm_unmapped_after_llm" in stats
    assert "llm_last_error" in stats
    assert "llm_avg_confidence" in stats
    assert "llm_provider_used" in stats
    
    # Vérifier que les champs obligatoires de LegacyImportStatistics ne sont PAS présents
    # (ce qui causait l'erreur Pydantic avant la correction)
    assert "total_lines" not in stats
    assert "valid_lines" not in stats
    assert "error_lines" not in stats
    assert "unique_categories" not in stats
    assert "mapped_categories" not in stats
    assert "unmapped_categories" not in stats


def test_llm_only_with_all_categories(admin_client, db_session):
    """Test que l'endpoint accepte une liste complète de catégories (B47-P8)."""
    cat1 = Category(name="Vaisselle", is_active=True)
    cat2 = Category(name="Textile", is_active=True)
    db_session.add_all([cat1, cat2])
    db_session.commit()
    
    # Tester avec toutes les catégories (pas seulement les non mappées)
    all_categories = ["Category1", "Category2", "Category3"]
    
    r = admin_client.post(
        "/api/v1/admin/import/legacy/analyze/llm-only",
        json={
            "unmapped_categories": all_categories,
            "llm_model_id": "mistralai/mistral-7b-instruct:free"
        }
    )
    
    assert r.status_code == 200
    data = r.json()
    assert "mappings" in data
    assert "statistics" in data
    
    # Vérifier que la réponse est valide même avec une liste complète
    stats = data["statistics"]
    assert "llm_attempted" in stats
    assert "llm_batches_total" in stats






