"""
Tests de validation OpenAPI pour les endpoints de l'API Recyclic.

Ces tests valident que les réponses de l'API respectent exactement
la spécification OpenAPI générée dynamiquement par `app.openapi()`.

Story 2.6 : enveloppe d'erreur stable (AR21) sur HTTPException / validation.
"""

import re
import uuid

import pytest
from fastapi.testclient import TestClient
from jsonschema import validate
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.core.security import create_access_token, hash_password
from recyclic_api.main import app
from recyclic_api.models.user import User, UserRole, UserStatus

_V1 = settings.API_V1_STR.rstrip("/")


def _resolve_openapi_path(openapi_schema: dict, relative: str) -> str:
    """Trouve la clé ``paths`` (slash final optionnel). ``relative`` = '/users/me/context'."""
    full = f"{_V1}{relative}"
    paths = openapi_schema["paths"]
    if full in paths:
        return full
    alt = full + "/" if not full.endswith("/") else full.rstrip("/")
    if alt in paths:
        return alt
    for key in paths:
        if key.rstrip("/") == full.rstrip("/"):
            return key
    raise AssertionError(f"Chemin OpenAPI introuvable: {full}")

# Schéma minimal aligné sur contracts/openapi/recyclique-api.yaml — RecycliqueApiError
_RECYCLIQUE_API_ERROR_SCHEMA = {
    "type": "object",
    "required": ["code", "detail", "retryable", "correlation_id"],
    "properties": {
        "code": {"type": "string"},
        "detail": {
            "oneOf": [
                {"type": "string"},
                {"type": "array"},
            ]
        },
        "retryable": {"type": "boolean"},
        "state": {"type": ["string", "null"]},
        "correlation_id": {"type": "string"},
    },
    "additionalProperties": False,
}


def validate_with_resolver(instance, schema, openapi_schema):
    """Valide une instance contre un schéma OpenAPI avec résolution des références."""
    # Résoudre manuellement les références $ref dans le schéma
    def resolve_refs(obj, schema_dict):
        if isinstance(obj, dict):
            if '$ref' in obj:
                ref_path = obj['$ref']
                if ref_path.startswith('#/'):
                    # Résoudre la référence dans le schéma OpenAPI
                    path_parts = ref_path[2:].split('/')
                    ref_obj = schema_dict
                    for part in path_parts:
                        ref_obj = ref_obj[part]
                    return resolve_refs(ref_obj, schema_dict)
                else:
                    return obj
            else:
                return {k: resolve_refs(v, schema_dict) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [resolve_refs(item, schema_dict) for item in obj]
        else:
            return obj
    
    # Résoudre les références dans le schéma
    resolved_schema = resolve_refs(schema, openapi_schema)
    
    # Valider avec le schéma résolu
    validate(instance=instance, schema=resolved_schema)

@pytest.fixture
def client():
    """Client de test FastAPI."""
    return TestClient(app)

class TestOpenAPIValidation:
    """Tests de validation des schémas OpenAPI pour les endpoints principaux."""

    def test_health_endpoint_schema_validation(self, client, openapi_schema):
        """Test de validation du schéma pour l'endpoint de santé."""
        response = client.get(f"{_V1}/health/")
        
        assert response.status_code == 200
        data = response.json()
        
        # Validation du schéma OpenAPI de la réponse
        health_schema = openapi_schema["paths"][f"{_V1}/health/"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]
        validate_with_resolver(data, health_schema, openapi_schema)

    def test_users_endpoint_schema_validation(self, client, openapi_schema):
        """Test de validation du schéma pour l'endpoint des utilisateurs."""
        response = client.get(f"{_V1}/users/")
        
        # L'endpoint peut retourner 200, 401 ou 403 selon l'authentification
        assert response.status_code in [200, 401, 403]
        data = response.json()
        
        # Validation du schéma OpenAPI de la réponse
        if response.status_code == 200:
            users_schema = openapi_schema["paths"][f"{_V1}/users/"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]
            validate_with_resolver(data, users_schema, openapi_schema)
        else:
            # Pour les erreurs, valider la structure standard FastAPI
            assert "detail" in data

    def test_cash_sessions_endpoint_schema_validation(self, client, openapi_schema):
        """Test de validation du schéma pour l'endpoint des sessions de caisse."""
        response = client.get(f"{_V1}/cash-sessions/")
        
        # L'endpoint peut retourner 200, 401 ou 403 selon l'authentification
        assert response.status_code in [200, 401, 403]
        data = response.json()
        
        # Validation du schéma OpenAPI de la réponse
        if response.status_code == 200:
            cash_sessions_schema = openapi_schema["paths"][f"{_V1}/cash-sessions/"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]
            validate_with_resolver(data, cash_sessions_schema, openapi_schema)
        else:
            # Pour les erreurs, valider la structure standard FastAPI
            assert "detail" in data

    def test_error_response_schema_validation(self, client, openapi_schema):
        """404 HTTPException : enveloppe RecycliqueApiError (Story 2.6)."""
        response = client.get(f"{_V1}/nonexistent/")

        assert response.status_code == 404
        data = response.json()
        validate(instance=data, schema=_RECYCLIQUE_API_ERROR_SCHEMA)
        assert data["code"] == "NOT_FOUND"
        assert isinstance(data["detail"], str)
        assert data["retryable"] is False
        assert "correlation_id" in data

    def test_recyclique_api_error_includes_client_request_id(self, client):
        """X-Request-Id client repris dans correlation_id et en-tête réponse."""
        rid = str(uuid.uuid4())
        response = client.get(
            f"{_V1}/nonexistent/",
            headers={"X-Request-Id": rid},
        )
        assert response.status_code == 404
        assert response.headers.get("X-Request-Id") == rid
        data = response.json()
        assert data["correlation_id"] == rid

    def test_validation_error_envelope_recyclique_api_error(self, client):
        """422 RequestValidationError : detail liste + code VALIDATION_ERROR."""
        response = client.post(f"{_V1}/auth/login", json={})
        assert response.status_code == 422
        data = response.json()
        validate(instance=data, schema=_RECYCLIQUE_API_ERROR_SCHEMA)
        assert data["code"] == "VALIDATION_ERROR"
        assert isinstance(data["detail"], list)
        assert data["retryable"] is False
        assert re.match(
            r"^[0-9a-f-]{36}$",
            data["correlation_id"],
            flags=re.I,
        )

    def test_openapi_schema_structure(self, openapi_schema):
        """Test de validation de la structure du schéma OpenAPI lui-même."""
        # Vérifier que le schéma OpenAPI a la structure attendue
        assert "openapi" in openapi_schema
        assert "info" in openapi_schema
        assert "paths" in openapi_schema
        assert "components" in openapi_schema
        assert "schemas" in openapi_schema["components"]
        
        # Vérifier que les endpoints principaux sont définis
        assert f"{_V1}/health/" in openapi_schema["paths"]
        assert f"{_V1}/users/" in openapi_schema["paths"]
        assert f"{_V1}/cash-sessions/" in openapi_schema["paths"]

    def test_schema_references_resolution(self, openapi_schema):
        """Test de validation que les références $ref peuvent être résolues."""
        # Tester la résolution d'une référence de schéma
        cash_session_ref = {"$ref": "#/components/schemas/CashSessionResponse"}
        
        # Créer un objet de test valide pour la validation
        test_instance = {
            "operator_id": "test-operator-id",
            "site_id": "test-site-id", 
            "initial_amount": 100.0,
            "id": "test-session-id",
            "current_amount": 100.0,
            "status": "open",
            "opened_at": "2025-01-27T10:00:00Z"
        }
        
        try:
            validate_with_resolver(test_instance, cash_session_ref, openapi_schema)
            # Si on arrive ici, la résolution a fonctionné
            assert True
        except Exception as e:
            pytest.fail(f"Impossible de résoudre les références $ref: {e}")

    def test_openapi_components_context_envelope_response_present(
        self, openapi_schema
    ):
        """Story 2.6 : modèle Pydantic exposé dans le OpenAPI dynamique (reviewable YAML : ContextEnvelope)."""
        schemas = openapi_schema["components"]["schemas"]
        assert "ContextEnvelopeResponse" in schemas
        assert "ContextRuntimeState" in schemas

    def test_context_envelope_200_validates_against_openapi(
        self, client, db_session: Session, openapi_schema
    ):
        """GET /users/me/context : corps 200 conforme au schéma OpenAPI (ContextEnvelope)."""
        uid = uuid.uuid4()
        user = User(
            id=uid,
            username=f"openapi_ctx_{uuid.uuid4().hex[:8]}",
            hashed_password=hash_password("Test1234!"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
            site_id=None,
        )
        db_session.add(user)
        db_session.commit()

        token = create_access_token(data={"sub": str(uid)})
        path_http = f"{_V1}/users/me/context"
        response = client.get(path_http, headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()

        path_key = _resolve_openapi_path(openapi_schema, "/users/me/context")
        ctx_schema = openapi_schema["paths"][path_key]["get"]["responses"]["200"][
            "content"
        ]["application/json"]["schema"]
        validate_with_resolver(data, ctx_schema, openapi_schema)

    def test_context_envelope_unauthorized_recyclique_api_error(self, client):
        """Sans auth : 401/403 avec enveloppe AR21 (alignement contrat reviewable)."""
        path_http = f"{_V1}/users/me/context"
        response = client.get(path_http)
        assert response.status_code in (401, 403)
        data = response.json()
        validate(instance=data, schema=_RECYCLIQUE_API_ERROR_SCHEMA)
        assert data["code"] in ("UNAUTHORIZED", "FORBIDDEN")
        assert data["retryable"] is False
