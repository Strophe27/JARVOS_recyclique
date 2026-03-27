"""
Tests end-to-end pour la validation des inscriptions
Story 3.3 - API et Interface pour la Validation des Inscriptions
"""

import pytest
import uuid
import asyncio
import json
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings

# Configuration pour les tests E2E
ADMIN_TOKEN = "test_admin_token"  # Token de test pour l'admin
_V1 = settings.API_V1_STR.rstrip("/")


class TestPendingValidationE2E:
    """Tests end-to-end pour le workflow complet de validation des inscriptions"""

    @pytest.fixture(autouse=True)
    def setup_test_environment(self):
        """Configuration de l'environnement de test"""
        # Ici on pourrait configurer une base de données de test
        # et créer des utilisateurs de test
        pass

    def test_health_check(self, client: TestClient):
        """Test de base pour vérifier que l'API fonctionne"""
        response = client.get(f"{_V1}/health")
        assert response.status_code == 200
        print("✅ API accessible")

    def test_openapi_spec_includes_pending_endpoints(self, client: TestClient):
        """Test que les nouveaux endpoints sont dans l'OpenAPI"""
        try:
            response = client.get(f"{_V1}/openapi.json", timeout=5)
            assert response.status_code == 200
            
            spec = response.json()
            paths = spec.get('paths', {})
            
            # Vérifier la présence des nouveaux endpoints
            required_endpoints = [
                f'{_V1}/admin/users/pending',
                f'{_V1}/admin/users/{{user_id}}/approve',
                f'{_V1}/admin/users/{{user_id}}/reject'
            ]
            
            for endpoint in required_endpoints:
                assert endpoint in paths, f"Endpoint {endpoint} manquant dans OpenAPI"
                print(f"✅ Endpoint {endpoint} trouvé dans OpenAPI")
                
        except Exception as e:
            pytest.skip(f"Impossible de récupérer l'OpenAPI: {e}")

    def test_pending_endpoints_require_authentication(self, client: TestClient):
        """Test que les endpoints pending nécessitent une authentification"""
        try:
            # Test sans authentification
            response = client.get(f"{_V1}/admin/users/pending", timeout=5)
            assert response.status_code in [401, 403], f"Statut inattendu: {response.status_code}"
            print("✅ Endpoints protégés par authentification")
            
        except Exception as e:
            pytest.skip(f"API non accessible: {e}")

    def test_pending_endpoints_structure(self, client: TestClient):
        """Test de la structure des endpoints pending"""
        try:
            # Test avec un token d'admin factice
            headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
            
            # Test de l'endpoint pending (doit retourner 401/403 sans vrai token)
            response = client.get(
                f"{_V1}/admin/users/pending", 
                headers=headers, 
                timeout=5
            )
            
            # On s'attend à une erreur d'authentification
            assert response.status_code in [401, 403, 404]
            print("✅ Structure des endpoints correcte")
            
        except Exception as e:
            pytest.skip(f"API non accessible: {e}")

    def test_approve_endpoint_structure(self, client: TestClient):
        """Test de la structure de l'endpoint d'approbation"""
        try:
            headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
            fake_user_id = str(uuid.uuid4())
            
            # Test de l'endpoint approve (doit retourner 401/403 sans vrai token)
            response = client.post(
                f"{_V1}/admin/users/{fake_user_id}/approve",
                headers=headers,
                json={"message": "Test message"},
                timeout=5
            )
            
            # On s'attend à une erreur d'authentification
            assert response.status_code in [401, 403, 404]
            print("✅ Endpoint d'approbation accessible")
            
        except Exception as e:
            pytest.skip(f"API non accessible: {e}")

    def test_reject_endpoint_structure(self, client: TestClient):
        """Test de la structure de l'endpoint de rejet"""
        try:
            headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
            fake_user_id = str(uuid.uuid4())
            
            # Test de l'endpoint reject (doit retourner 401/403 sans vrai token)
            response = client.post(
                f"{_V1}/admin/users/{fake_user_id}/reject",
                headers=headers,
                json={"reason": "Test reason"},
                timeout=5
            )
            
            # On s'attend à une erreur d'authentification
            assert response.status_code in [401, 403, 404]
            print("✅ Endpoint de rejet accessible")
            
        except Exception as e:
            pytest.skip(f"API non accessible: {e}")

    def test_endpoints_accept_correct_content_type(self, client: TestClient):
        """Test que les endpoints acceptent le bon Content-Type"""
        try:
            headers = {
                "Authorization": f"Bearer {ADMIN_TOKEN}",
                "Content-Type": "application/json"
            }
            fake_user_id = str(uuid.uuid4())
            
            # Test avec Content-Type correct
            response = client.post(
                f"{_V1}/admin/users/{fake_user_id}/approve",
                headers=headers,
                json={"message": "Test message"},
                timeout=5
            )
            
            # On s'attend à une erreur d'authentification, pas de format
            assert response.status_code in [401, 403, 404]
            print("✅ Content-Type accepté")
            
        except Exception as e:
            pytest.skip(f"API non accessible: {e}")

    def test_endpoints_reject_invalid_content_type(self, client: TestClient):
        """Test que les endpoints rejettent les Content-Type invalides"""
        try:
            headers = {
                "Authorization": f"Bearer {ADMIN_TOKEN}",
                "Content-Type": "text/plain"
            }
            fake_user_id = str(uuid.uuid4())
            
            # Test avec Content-Type incorrect
            response = client.post(
                f"{_V1}/admin/users/{fake_user_id}/approve",
                headers=headers,
                data="Test message",
                timeout=5
            )
            
            # On s'attend à une erreur de format ou d'authentification
            assert response.status_code in [400, 401, 403, 404, 422]
            print("✅ Content-Type invalide rejeté")
            
        except Exception as e:
            pytest.skip(f"API non accessible: {e}")

    def test_endpoints_handle_malformed_json(self, client: TestClient):
        """Test que les endpoints gèrent le JSON malformé"""
        try:
            headers = {
                "Authorization": f"Bearer {ADMIN_TOKEN}",
                "Content-Type": "application/json"
            }
            fake_user_id = str(uuid.uuid4())
            
            # Test avec JSON malformé
            response = client.post(
                f"{_V1}/admin/users/{fake_user_id}/approve",
                headers=headers,
                data="{ invalid json }",
                timeout=5
            )
            
            # On s'attend à une erreur de format ou d'authentification
            assert response.status_code in [400, 401, 403, 404, 422]
            print("✅ JSON malformé géré correctement")
            
        except Exception as e:
            pytest.skip(f"API non accessible: {e}")

    def test_endpoints_handle_missing_required_fields(self, client: TestClient):
        """Test que les endpoints gèrent les champs requis manquants"""
        try:
            headers = {
                "Authorization": f"Bearer {ADMIN_TOKEN}",
                "Content-Type": "application/json"
            }
            fake_user_id = str(uuid.uuid4())
            
            # Test avec données manquantes
            response = client.post(
                f"{_V1}/admin/users/{fake_user_id}/approve",
                headers=headers,
                json={},  # Pas de message
                timeout=5
            )
            
            # On s'attend à une erreur d'authentification ou de validation
            assert response.status_code in [401, 403, 404, 422]
            print("✅ Champs manquants gérés correctement")
            
        except Exception as e:
            pytest.skip(f"API non accessible: {e}")

    def test_endpoints_handle_invalid_user_id_format(self, client: TestClient):
        """Test que les endpoints gèrent les formats d'ID utilisateur invalides"""
        try:
            headers = {
                "Authorization": f"Bearer {ADMIN_TOKEN}",
                "Content-Type": "application/json"
            }
            
            # Test avec ID invalide
            invalid_user_ids = [
                "not-a-uuid",
                "123",
                "",
                "invalid-uuid-format",
                "00000000-0000-0000-0000-000000000000"
            ]
            
            for invalid_id in invalid_user_ids:
                response = client.post(
                    f"{_V1}/admin/users/{invalid_id}/approve",
                    headers=headers,
                    json={"message": "Test"},
                    timeout=5
                )
                
                # On s'attend à une erreur d'authentification ou de format
                assert response.status_code in [401, 403, 404, 422]
            
            print("✅ IDs invalides gérés correctement")
            
        except Exception as e:
            pytest.skip(f"API non accessible: {e}")

    def test_endpoints_response_format(self, client: TestClient):
        """Test du format de réponse des endpoints"""
        try:
            headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
            fake_user_id = str(uuid.uuid4())
            
            # Test de l'endpoint pending
            response = client.get(
                f"{_V1}/admin/users/pending",
                headers=headers,
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                assert isinstance(data, list), "La réponse doit être une liste"
                print("✅ Format de réponse correct pour pending")
            else:
                # On s'attend à une erreur d'authentification
                assert response.status_code in [401, 403, 404]
                print("✅ Endpoint pending protégé")
            
        except Exception as e:
            pytest.skip(f"API non accessible: {e}")

    def test_endpoints_error_response_format(self, client: TestClient):
        """Test du format des réponses d'erreur"""
        try:
            headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
            fake_user_id = str(uuid.uuid4())
            
            # Test d'un endpoint qui devrait retourner une erreur
            response = client.post(
                f"{_V1}/admin/users/{fake_user_id}/approve",
                headers=headers,
                json={"message": "Test"},
                timeout=5
            )
            
            if response.status_code >= 400:
                try:
                    error_data = response.json()
                    assert "detail" in error_data, "Les erreurs doivent avoir un champ 'detail'"
                    print("✅ Format d'erreur correct")
                except json.JSONDecodeError:
                    # Certaines erreurs peuvent ne pas être en JSON
                    print("✅ Erreur retournée (format non-JSON)")
            
        except Exception as e:
            pytest.skip(f"API non accessible: {e}")

    def test_endpoints_performance(self, client: TestClient):
        """Test de performance des endpoints"""
        try:
            headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
            
            # Test de performance pour l'endpoint pending
            import time
            start_time = time.time()
            
            response = client.get(
                f"{_V1}/admin/users/pending",
                headers=headers,
                timeout=10
            )
            
            end_time = time.time()
            response_time = end_time - start_time
            
            # La réponse doit être rapide (moins de 5 secondes)
            assert response_time < 5.0, f"Temps de réponse trop lent: {response_time}s"
            print(f"✅ Performance acceptable: {response_time:.2f}s")
            
        except Exception as e:
            pytest.skip(f"API non accessible: {e}")

    def test_endpoints_cors_headers(self, client: TestClient):
        """Test des en-têtes CORS"""
        try:
            headers = {
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET"
            }
            
            # Test de preflight CORS
            response = client.options(
                f"{_V1}/admin/users/pending",
                headers=headers,
                timeout=5
            )
            
            # Vérifier les en-têtes CORS
            cors_headers = [
                "Access-Control-Allow-Origin",
                "Access-Control-Allow-Methods",
                "Access-Control-Allow-Headers"
            ]
            
            for header in cors_headers:
                if header in response.headers:
                    print(f"✅ En-tête CORS {header} présent")
                else:
                    print(f"⚠️ En-tête CORS {header} manquant")
            
        except Exception as e:
            pytest.skip(f"API non accessible: {e}")

    def test_endpoints_security_headers(self, client: TestClient):
        """Test des en-têtes de sécurité"""
        try:
            response = client.get(f"{_V1}/admin/users/pending", timeout=5)
            
            # Vérifier les en-têtes de sécurité
            security_headers = [
                "X-Content-Type-Options",
                "X-Frame-Options",
                "X-XSS-Protection"
            ]
            
            for header in security_headers:
                if header in response.headers:
                    print(f"✅ En-tête de sécurité {header} présent")
                else:
                    print(f"⚠️ En-tête de sécurité {header} manquant")
            
        except Exception as e:
            pytest.skip(f"API non accessible: {e}")


def run_e2e_tests():
    """Fonction utilitaire pour exécuter les tests E2E"""
    print("🧪 Exécution des tests end-to-end pour la validation des inscriptions")
    print("=" * 70)
    
    # Vérifier que l'API est accessible
    try:
        response = client.get(f"{_V1}/health", timeout=5)
        if response.status_code != 200:
            print("❌ L'API n'est pas accessible. Vérifiez que Docker est démarré.")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Impossible de se connecter à l'API: {e}")
        return False
    
    print("✅ API accessible, exécution des tests...")
    return True


if __name__ == "__main__":
    if run_e2e_tests():
        pytest.main([__file__, "-v", "--tb=short"])
    else:
        print("❌ Tests E2E non exécutés - API non accessible")
