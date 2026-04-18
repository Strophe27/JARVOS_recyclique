"""
Tests pour l'endpoint de mise à jour du statut utilisateur.
Adresse QA API-001: Définir schéma, validations, audit log et permissions.
"""

import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.main import app
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.user_status_history import UserStatusHistory
from recyclic_api.core.security import hash_password, create_access_token

_V1 = settings.API_V1_STR.rstrip("/")


class TestAdminUserStatusEndpoint:
    """Tests pour l'endpoint PUT /admin/users/{user_id}/status"""

    def test_update_user_status_success(self, client: TestClient, db_session: Session):
        """Test de mise à jour réussie du statut utilisateur"""
        tid = uuid.uuid4().hex[:10]
        admin_user = User(
            username=f"adm_status_ok_adm_{tid}",
            hashed_password=hash_password("password"),
            role=UserRole.ADMIN,
            status=UserStatus.APPROVED,
            is_active=True
        )
        db_session.add(admin_user)

        target_user = User(
            username=f"adm_status_ok_tgt_{tid}",
            hashed_password=hash_password("password"),
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True
        )
        db_session.add(target_user)
        db_session.commit()
        db_session.refresh(admin_user)
        db_session.refresh(target_user)

        access_token = create_access_token(data={"sub": str(admin_user.id)})

        response = client.put(
            f"{_V1}/admin/users/{target_user.id}/status",
            json={
                "status": "approved",
                "is_active": False,
                "reason": "Désactivé pour test"
            },
            headers={"Authorization": f"Bearer {access_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "Utilisateur" in data["message"]
        assert "succ" in data["message"].lower()
        assert data["data"]["is_active"] is False
        assert data["data"]["previous_status"] is True
        assert data["data"]["reason"] == "Désactivé pour test"

        # Vérifier que l'utilisateur est bien désactivé dans la DB
        db_session.refresh(target_user)
        assert target_user.is_active is False

        # Vérifier l'historique
        history = db_session.query(UserStatusHistory).filter(
            UserStatusHistory.user_id == target_user.id
        ).first()
        assert history is not None
        assert history.old_status is True
        assert history.new_status is False
        assert history.reason == "Désactivé pour test"
        assert history.changed_by_admin_id == admin_user.id

    def test_update_user_status_validation_error(self, client: TestClient, db_session: Session):
        """Test de validation des données d'entrée"""
        tid = uuid.uuid4().hex[:10]
        admin_user = User(
            username=f"adm_status_val_adm_{tid}",
            hashed_password=hash_password("password"),
            role=UserRole.ADMIN,
            status=UserStatus.APPROVED,
            is_active=True
        )
        db_session.add(admin_user)
        db_session.commit()
        db_session.refresh(admin_user)

        access_token = create_access_token(data={"sub": str(admin_user.id)})

        response = client.put(
            f"{_V1}/admin/users/{admin_user.id}/status",
            json={
                "status": "approved",
                "is_active": "not_a_boolean",  # Type incorrect
                "reason": "Test"
            },
            headers={"Authorization": f"Bearer {access_token}"}
        )

        assert response.status_code == 422  # Unprocessable Entity
        data = response.json()
        assert "detail" in data

    def test_update_user_status_not_found(self, client: TestClient, db_session: Session):
        """Test avec un ID utilisateur inexistant"""
        tid = uuid.uuid4().hex[:10]
        admin_user = User(
            username=f"adm_status_nf_adm_{tid}",
            hashed_password=hash_password("password"),
            role=UserRole.ADMIN,
            status=UserStatus.APPROVED,
            is_active=True
        )
        db_session.add(admin_user)
        db_session.commit()
        db_session.refresh(admin_user)

        access_token = create_access_token(data={"sub": str(admin_user.id)})

        fake_user_id = str(uuid.uuid4())
        response = client.put(
            f"{_V1}/admin/users/{fake_user_id}/status",
            json={
                "status": "approved",
                "is_active": False,
                "reason": "Test"
            },
            headers={"Authorization": f"Bearer {access_token}"}
        )

        assert response.status_code == 404
        data = response.json()
        # Sous Windows / sources mal encodées, éviter la dépendance aux accents exacts.
        assert "non trouv" in data["detail"]

    def test_update_user_status_unauthorized(self, client: TestClient, db_session: Session):
        """Test d'accès non autorisé (utilisateur non-admin)"""
        tid = uuid.uuid4().hex[:10]
        normal_user = User(
            username=f"adm_status_403_usr_{tid}",
            hashed_password=hash_password("password"),
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True
        )
        db_session.add(normal_user)
        db_session.commit()
        db_session.refresh(normal_user)

        access_token = create_access_token(data={"sub": str(normal_user.id)})

        response = client.put(
            f"{_V1}/admin/users/{normal_user.id}/status",
            json={
                "status": "approved",
                "is_active": False,
                "reason": "Test"
            },
            headers={"Authorization": f"Bearer {access_token}"}
        )

        assert response.status_code == 403  # Forbidden

    def test_admin_cannot_deactivate_self(self, client: TestClient, db_session: Session):
        """Test qu'un admin ne peut pas se désactiver lui-même"""
        tid = uuid.uuid4().hex[:10]
        admin_user = User(
            username=f"adm_status_self_adm_{tid}",
            hashed_password=hash_password("password"),
            role=UserRole.ADMIN,
            status=UserStatus.APPROVED,
            is_active=True
        )
        db_session.add(admin_user)
        db_session.commit()
        db_session.refresh(admin_user)

        access_token = create_access_token(data={"sub": str(admin_user.id)})

        response = client.put(
            f"{_V1}/admin/users/{admin_user.id}/status",
            json={
                "status": "approved",
                "is_active": False,
                "reason": "Auto-désactivation"
            },
            headers={"Authorization": f"Bearer {access_token}"}
        )

        assert response.status_code == 403
        data = response.json()
        assert "administrateur" in data["detail"].lower()

        # Vérifier que l'admin est toujours actif
        db_session.refresh(admin_user)
        assert admin_user.is_active is True

    def test_reactivate_user_success(self, client: TestClient, db_session: Session):
        """Test de réactivation d'un utilisateur inactif"""
        tid = uuid.uuid4().hex[:10]
        admin_user = User(
            username=f"adm_status_react_adm_{tid}",
            hashed_password=hash_password("password"),
            role=UserRole.ADMIN,
            status=UserStatus.APPROVED,
            is_active=True
        )
        db_session.add(admin_user)

        inactive_user = User(
            username=f"adm_status_react_ina_{tid}",
            hashed_password=hash_password("password"),
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=False
        )
        db_session.add(inactive_user)
        db_session.commit()
        db_session.refresh(admin_user)
        db_session.refresh(inactive_user)

        access_token = create_access_token(data={"sub": str(admin_user.id)})

        response = client.put(
            f"{_V1}/admin/users/{inactive_user.id}/status",
            json={
                "status": "approved",
                "is_active": True,
                "reason": "Réactivé après résolution du problème"
            },
            headers={"Authorization": f"Bearer {access_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "succ" in data["message"].lower()
        assert data["data"]["is_active"] is True

        # Vérifier que l'utilisateur est bien réactivé dans la DB
        db_session.refresh(inactive_user)
        assert inactive_user.is_active is True