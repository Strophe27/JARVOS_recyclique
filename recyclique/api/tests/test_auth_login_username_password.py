"""
Tests for the updated username/password authentication endpoint
Story auth.B - Backend CLI adaptation
"""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from jsonschema import validate, ValidationError

from recyclic_api.core.config import settings
from recyclic_api.main import app
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.core.security import hash_password

_V1 = settings.API_V1_STR.rstrip("/")

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


class TestAuthLoginUsernamePassword:
    """Tests for the POST /api/v1/auth/login endpoint with username/password"""

    def test_login_success_valid_credentials(self, client: TestClient, db_session: Session, openapi_schema):
        """Test successful login with valid username and password"""
        username = f"login_ok_{uuid.uuid4().hex[:12]}"
        # Create test user with hashed password
        hashed_password = hash_password("testpassword123")
        test_user = User(
            username=username,
            hashed_password=hashed_password,
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True
        )
        db_session.add(test_user)
        db_session.commit()
        db_session.refresh(test_user)

        # Test login
        response = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "testpassword123"
            }
        )

        assert response.status_code == 200
        data = response.json()
        
        # Validation du schéma OpenAPI de la réponse
        login_schema = openapi_schema["paths"][f"{_V1}/auth/login"]["post"]["responses"]["200"]["content"]["application/json"]["schema"]
        try:
            validate_with_resolver(data, login_schema, openapi_schema)
        except ValidationError as e:
            pytest.fail(f"Validation OpenAPI échouée pour la réponse de login: {e}")
        
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["username"] == username
        assert data["user"]["role"] == "user"
        assert data["user"]["is_active"] is True

    def test_login_failure_invalid_username(self, client: TestClient, db_session: Session):
        """Test login failure with non-existent username"""
        missing = f"no_such_user_{uuid.uuid4().hex[:12]}"
        response = client.post(
            f"{_V1}/auth/login",
            json={
                "username": missing,
                "password": "password123"
            }
        )

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "Identifiants invalides ou utilisateur inactif" in data["detail"]

    def test_login_failure_invalid_password(self, client: TestClient, db_session: Session):
        """Test login failure with invalid password"""
        username = f"login_bad_pwd_{uuid.uuid4().hex[:12]}"
        hashed_password = hash_password("correctpassword")
        test_user = User(
            username=username,
            hashed_password=hashed_password,
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True
        )
        db_session.add(test_user)
        db_session.commit()

        response = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "wrongpassword"
            }
        )

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "Identifiants invalides ou utilisateur inactif" in data["detail"]

    def test_login_failure_inactive_user(self, client: TestClient, db_session: Session):
        """Test login failure with inactive user"""
        username = f"login_inactive_{uuid.uuid4().hex[:12]}"
        hashed_password = hash_password("testpassword123")
        test_user = User(
            username=username,
            hashed_password=hashed_password,
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=False
        )
        db_session.add(test_user)
        db_session.commit()

        response = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "testpassword123"
            }
        )

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "Identifiants invalides ou utilisateur inactif" in data["detail"]

    def test_login_validation_error_missing_username(self, client: TestClient):
        """Test validation error with missing username"""
        response = client.post(
            f"{_V1}/auth/login",
            json={"password": "password123"}
        )

        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    def test_login_validation_error_missing_password(self, client: TestClient):
        """Test validation error with missing password"""
        response = client.post(
            f"{_V1}/auth/login",
            json={"username": f"login_no_pwd_{uuid.uuid4().hex[:12]}"}
        )

        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    def test_login_validation_error_empty_credentials(self, client: TestClient):
        """Test validation error with empty credentials"""
        response = client.post(
            f"{_V1}/auth/login",
            json={}
        )

        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    def test_login_success_admin_user(self, client: TestClient, db_session: Session):
        """Test successful login with admin user"""
        username = f"login_admin_{uuid.uuid4().hex[:12]}"
        hashed_password = hash_password("adminpass123")
        admin_user = User(
            username=username,
            hashed_password=hashed_password,
            role=UserRole.ADMIN,
            status=UserStatus.APPROVED,
            is_active=True
        )
        db_session.add(admin_user)
        db_session.commit()
        db_session.refresh(admin_user)

        response = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "adminpass123"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "admin"
        assert "access_token" in data

    def test_login_success_super_admin_user(self, client: TestClient, db_session: Session):
        """Test successful login with super-admin user"""
        username = f"login_superadmin_{uuid.uuid4().hex[:12]}"
        hashed_password = hash_password("superadminpass123")
        super_admin = User(
            username=username,
            hashed_password=hashed_password,
            role=UserRole.SUPER_ADMIN,
            status=UserStatus.APPROVED,
            is_active=True
        )
        db_session.add(super_admin)
        db_session.commit()
        db_session.refresh(super_admin)

        response = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "superadminpass123"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "super-admin"
        assert "access_token" in data

    def test_jwt_token_structure(self, client: TestClient, db_session: Session):
        """Test JWT token structure"""
        username = f"login_jwt_{uuid.uuid4().hex[:12]}"
        hashed_password = hash_password("tokentest123")
        test_user = User(
            username=username,
            hashed_password=hashed_password,
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True
        )
        db_session.add(test_user)
        db_session.commit()
        db_session.refresh(test_user)

        response = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "tokentest123"
            }
        )

        assert response.status_code == 200
        data = response.json()

        # Verify token is a non-empty string
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 0

        # JWT should contain dots (structure: header.payload.signature)
        assert "." in data["access_token"]
        assert data["access_token"].count(".") == 2

    def test_password_case_sensitivity(self, client: TestClient, db_session: Session):
        """Test that password authentication is case-sensitive"""
        username = f"login_case_{uuid.uuid4().hex[:12]}"
        hashed_password = hash_password("CaseSensitive123")
        test_user = User(
            username=username,
            hashed_password=hashed_password,
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True
        )
        db_session.add(test_user)
        db_session.commit()

        response = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "CaseSensitive123"
            }
        )
        assert response.status_code == 200

        response = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "casesensitive123"
            }
        )
        assert response.status_code == 401

    def test_login_response_serialization_success(self, client: TestClient, db_session: Session, openapi_schema):
        """
        Test de régression pour le bug EndOfStream.
        Vérifie que la sérialisation de LoginResponse fonctionne correctement
        même avec refresh_token None ou avec tous les champs remplis.
        """
        username = f"login_serial_{uuid.uuid4().hex[:12]}"
        hashed_password = hash_password("serialtest123")
        test_user = User(
            username=username,
            hashed_password=hashed_password,
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True,
            first_name="Test",
            last_name="User"
        )
        db_session.add(test_user)
        db_session.commit()
        db_session.refresh(test_user)

        response = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "serialtest123"
            }
        )

        assert response.status_code == 200, f"Login failed with status {response.status_code}: {response.text}"
        data = response.json()
        
        login_schema = openapi_schema["paths"][f"{_V1}/auth/login"]["post"]["responses"]["200"]["content"]["application/json"]["schema"]
        try:
            validate_with_resolver(data, login_schema, openapi_schema)
        except ValidationError as e:
            pytest.fail(f"Validation OpenAPI échouée pour la réponse de login: {e}")
        
        # Vérifier que tous les champs requis sont présents
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["username"] == username
        assert data["user"]["first_name"] == "Test"
        assert data["user"]["last_name"] == "User"
        assert "refresh_token" in data  # Peut être None ou string
        assert "expires_in" in data  # Peut être None ou int
        
        # Vérifier que refresh_token est soit None soit une string non vide
        if data["refresh_token"] is not None:
            assert isinstance(data["refresh_token"], str)
            assert len(data["refresh_token"]) > 0
