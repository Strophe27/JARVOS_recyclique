"""
Tests unitaires pour l'endpoint /auth/login
Story auth.B - Backend CLI adaptation - Tests d'intégration username/password
"""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.main import app

_V1 = settings.API_V1_STR.rstrip("/")
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.core.security import hash_password
from recyclic_api.schemas.auth import LoginResponse


class TestAuthLoginEndpoint:
    """Tests d'intégration pour l'endpoint POST /api/v1/auth/login avec username/password"""

    def test_login_success_valid_credentials(self, client: TestClient, db_engine, db_session: Session):
        """Test de connexion réussie avec des identifiants valides"""
        username = f"testuser_endpoint_{uuid.uuid4().hex}"

        # Créer un utilisateur de test avec mot de passe haché
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

        # Test de connexion
        response = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "testpassword123"
            }
        )

        assert response.status_code == 200
        data = response.json()
        
        # Validation du schéma Pydantic de la réponse
        try:
            validated_response = LoginResponse(**data)
            # Vérifications sur le contenu
            assert validated_response.access_token is not None
            assert validated_response.token_type == "bearer"
            assert validated_response.user is not None
            
            # Validation de l'utilisateur dans la réponse
            user_data = validated_response.user
            assert user_data.username == username
            assert user_data.role == UserRole.USER.value
            assert user_data.status == UserStatus.APPROVED.value
            assert user_data.is_active is True
            assert user_data.id is not None
        except Exception as e:
            pytest.fail(f"Validation Pydantic échouée pour la réponse de login: {e}")
        assert data["user"]["role"] == "user"
        assert data["user"]["is_active"] is True

    def test_login_success_non_numeric_telegram_id(self, client: TestClient, db_engine, db_session: Session):
        """Le login doit sérialiser un telegram_id alphanumérique comme en base (VARCHAR), sans erreur 500."""
        username = f"testuser_tg_alpha_{uuid.uuid4().hex}"
        telegram_handle = "tg_login_alpha_42"
        hashed_password = hash_password("testpassword123")
        test_user = User(
            username=username,
            hashed_password=hashed_password,
            telegram_id=telegram_handle,
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True,
        )
        db_session.add(test_user)
        db_session.commit()
        db_session.refresh(test_user)

        response = client.post(
            f"{_V1}/auth/login",
            json={"username": username, "password": "testpassword123"},
        )

        assert response.status_code == 200, response.text
        data = response.json()
        validated = LoginResponse(**data)
        assert validated.user.telegram_id == telegram_handle
        assert data["user"]["telegram_id"] == telegram_handle

    def test_login_failure_invalid_username(self, client: TestClient, db_engine, db_session: Session):
        """Test d'échec de connexion avec un nom d'utilisateur invalide"""
        
        response = client.post(
            f"{_V1}/auth/login",
            json={
                "username": "nonexistent_user",
                "password": "anypassword"
            }
        )

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "Identifiants invalides ou utilisateur inactif" in data["detail"]

    def test_login_failure_invalid_password(self, client: TestClient, db_engine, db_session: Session):
        """Test d'échec de connexion avec un mot de passe incorrect"""
        username = f"testuser_wrong_pass_{uuid.uuid4().hex}"

        # Créer un utilisateur de test
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

    def test_login_failure_inactive_user(self, client: TestClient, db_engine, db_session: Session):
        """Test d'échec de connexion avec un utilisateur inactif"""
        
        username = f"inactive_user_{uuid.uuid4().hex}"
        # Créer un utilisateur inactif
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
        """Test de validation avec username manquant"""
        
        response = client.post(
            f"{_V1}/auth/login",
            json={"password": "testpassword123"}
        )

        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    def test_login_validation_error_missing_password(self, client: TestClient):
        """Test de validation avec password manquant"""
        
        response = client.post(
            f"{_V1}/auth/login",
            json={"username": "testuser"}
        )

        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    def test_login_validation_error_empty_credentials(self, client: TestClient):
        """Test de validation avec des identifiants vides"""
        
        response = client.post(
            f"{_V1}/auth/login",
            json={}
        )

        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    def test_login_success_admin_user(self, client: TestClient, db_engine, db_session: Session):
        """Test de connexion réussie avec un utilisateur admin"""
        username = f"admin_endpoint_{uuid.uuid4().hex}"

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

    def test_login_success_super_admin_user(self, client: TestClient, db_engine, db_session: Session):
        """Test de connexion réussie avec un super-admin"""
        username = f"superadmin_endpoint_{uuid.uuid4().hex}"

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

    def test_jwt_token_structure(self, client: TestClient, db_engine, db_session: Session):
        """Test de la structure du token JWT généré"""
        username = f"jwt_test_endpoint_{uuid.uuid4().hex}"

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
        
        # Vérifier que le token est une chaîne non vide
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 0
        
        # Le token devrait contenir des points (structure JWT)
        assert "." in data["access_token"]
        assert data["access_token"].count(".") == 2

    def test_password_case_sensitivity(self, client: TestClient, db_engine, db_session: Session):
        """Test que l'authentification par mot de passe est sensible à la casse"""
        username = f"case_test_endpoint_{uuid.uuid4().hex}"

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

        # Test avec la bonne casse
        response = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "CaseSensitive123"
            }
        )
        assert response.status_code == 200

        # Test avec mauvaise casse
        response = client.post(
            f"{_V1}/auth/login",
            json={
                "username": username,
                "password": "casesensitive123"
            }
        )
        assert response.status_code == 401