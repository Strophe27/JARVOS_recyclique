"""
Tests pour l'endpoint de déconnexion audité (Story b34-p7).
Vérifie que POST ``.../auth/logout`` journalise correctement l'audit.
"""
import os
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.core.security import hash_password
from recyclic_api.models.audit_log import AuditActionType, AuditLog
from recyclic_api.models.user import User, UserRole, UserStatus

_V1 = settings.API_V1_STR.rstrip("/")
_TEST_DB_URL = os.getenv("TEST_DATABASE_URL", "")
pytestmark = pytest.mark.skipif(
    not _TEST_DB_URL.startswith("postgresql"),
    reason="`test_auth_logout.py` vérifie `audit_logs` (JSONB) et nécessite PostgreSQL.",
)


def _unique_username(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}@example.com"


class TestAuthLogout:
    """Tests pour l'endpoint de déconnexion audité."""

    def test_logout_success_authenticated_user(self, client: TestClient, db_session: Session):
        """Test que la déconnexion d'un utilisateur authentifié fonctionne et enregistre l'audit."""
        username = _unique_username("testuser")
        user = User(
            id=uuid4(),
            username=username,
            hashed_password=hash_password("Test1234!"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        # Se connecter pour obtenir un token
        login_response = client.post(f"{_V1}/auth/login", json={
            "username": username,
            "password": "Test1234!"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Compter les entrées d'audit avant la déconnexion
        audit_count_before = db_session.query(AuditLog).count()

        # Se déconnecter
        headers = {"Authorization": f"Bearer {token}"}
        logout_response = client.post(f"{_V1}/auth/logout", headers=headers)

        # Vérifier la réponse
        assert logout_response.status_code == 200
        data = logout_response.json()
        assert data["message"] == "Deconnexion reussie"

        # Vérifier qu'une entrée d'audit a été créée
        audit_count_after = db_session.query(AuditLog).count()
        assert audit_count_after == audit_count_before + 1

        # Vérifier les détails de l'entrée d'audit
        audit_entry = db_session.query(AuditLog).filter(
            AuditLog.action_type == AuditActionType.LOGOUT.value,
            AuditLog.actor_id == user.id,
        ).first()
        
        assert audit_entry is not None
        assert audit_entry.actor_id == user.id
        assert audit_entry.actor_username == user.username
        assert audit_entry.action_type == AuditActionType.LOGOUT.value
        assert "Deconnexion de l'utilisateur" in audit_entry.description
        assert audit_entry.details_json["username"] == user.username
        assert audit_entry.details_json["user_id"] == str(user.id)
        assert audit_entry.details_json["user_role"] == user.role.value

    def test_logout_requires_authentication(self, client: TestClient, db_session: Session):
        """Test que la déconnexion sans authentification retourne 401."""
        response = client.post(f"{_V1}/auth/logout")
        assert response.status_code == 401

    def test_logout_with_invalid_token_returns_401(self, client: TestClient, db_session: Session):
        """Test que la déconnexion avec un token invalide retourne 401."""
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.post(f"{_V1}/auth/logout", headers=headers)
        assert response.status_code == 401

    def test_logout_with_admin_user(self, client: TestClient, db_session: Session):
        """Test que la déconnexion d'un administrateur fonctionne correctement."""
        username = _unique_username("admin")
        admin_user = User(
            id=uuid4(),
            username=username,
            hashed_password=hash_password("Test1234!"),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            is_active=True
        )
        db_session.add(admin_user)
        db_session.commit()
        db_session.refresh(admin_user)

        # Se connecter
        login_response = client.post(f"{_V1}/auth/login", json={
            "username": username,
            "password": "Test1234!"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Se déconnecter
        headers = {"Authorization": f"Bearer {token}"}
        logout_response = client.post(f"{_V1}/auth/logout", headers=headers)

        # Vérifier la réponse
        assert logout_response.status_code == 200
        data = logout_response.json()
        assert data["message"] == "Deconnexion reussie"

        # Vérifier l'entrée d'audit
        audit_entry = db_session.query(AuditLog).filter(
            AuditLog.action_type == AuditActionType.LOGOUT.value,
            AuditLog.actor_id == admin_user.id
        ).first()
        
        assert audit_entry is not None
        assert audit_entry.actor_username == admin_user.username
        assert audit_entry.details_json["user_role"] == UserRole.ADMIN.value

    def test_logout_audit_contains_ip_and_user_agent(self, client: TestClient, db_session: Session):
        """Test que l'entrée d'audit contient l'IP et le User-Agent."""
        username = _unique_username("testuser")
        user = User(
            id=uuid4(),
            username=username,
            hashed_password=hash_password("Test1234!"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        # Se connecter
        login_response = client.post(f"{_V1}/auth/login", json={
            "username": username,
            "password": "Test1234!"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Se déconnecter avec des headers spécifiques
        headers = {
            "Authorization": f"Bearer {token}",
            "User-Agent": "TestBrowser/1.0"
        }
        logout_response = client.post(f"{_V1}/auth/logout", headers=headers)

        assert logout_response.status_code == 200

        # Vérifier l'entrée d'audit
        audit_entry = db_session.query(AuditLog).filter(
            AuditLog.action_type == AuditActionType.LOGOUT.value,
            AuditLog.actor_id == user.id
        ).first()
        
        assert audit_entry is not None
        assert audit_entry.user_agent == "TestBrowser/1.0"
        # L'IP sera "testclient" dans l'environnement de test
        assert audit_entry.ip_address is not None

