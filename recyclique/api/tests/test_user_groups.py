"""
Tests pour l'assignation de groupes aux utilisateurs.
"""
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4

from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.permission import Group
from recyclic_api.core.security import hash_password, create_access_token

_V1 = "/v1"


def _bearer_headers(user: User) -> dict:
    token = create_access_token(data={"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_user(db_session: Session) -> User:
    """Admin JWT + session DB (aligné sur test_groups_and_permissions)."""
    user = User(
        id=uuid4(),
        username=f"admin_groups_{uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("TestPassword123!"),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


class TestUserGroups:
    """Tests pour la gestion des groupes d'utilisateurs."""

    def test_update_user_groups_success(self, client: TestClient, db_session: Session, admin_user: User):
        """Test de mise à jour des groupes d'un utilisateur avec succès."""
        # Créer un utilisateur de test
        test_user = User(
            id=uuid4(),
            username="testuser@example.com",
            hashed_password=hash_password("testpassword"),
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True,
        )
        db_session.add(test_user)

        # Créer des groupes de test
        group1 = Group(
            id=uuid4(),
            name="Groupe Test 1",
            description="Premier groupe de test",
        )
        group2 = Group(
            id=uuid4(),
            name="Groupe Test 2",
            description="Deuxième groupe de test",
        )
        db_session.add_all([group1, group2])
        db_session.commit()

        response = client.put(
            f"{_V1}/admin/users/{test_user.id}/groups",
            json={
                "group_ids": [str(group1.id), str(group2.id)],
            },
            headers=_bearer_headers(admin_user),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]["group_ids"]) == 2
        assert str(group1.id) in data["data"]["group_ids"]
        assert str(group2.id) in data["data"]["group_ids"]

    def test_update_user_groups_user_not_found(self, client: TestClient, admin_user: User):
        """Test de mise à jour des groupes avec un utilisateur inexistant."""
        fake_user_id = str(uuid4())
        response = client.put(
            f"{_V1}/admin/users/{fake_user_id}/groups",
            json={
                "group_ids": ["group1", "group2"],
            },
            headers=_bearer_headers(admin_user),
        )

        assert response.status_code == 404
        data = response.json()
        assert "Utilisateur non trouvé" in data["detail"]

    def test_update_user_groups_invalid_group_id(self, client: TestClient, db_session: Session, admin_user: User):
        """Test de mise à jour avec un ID de groupe invalide."""
        test_user = User(
            id=uuid4(),
            username="testuser@example.com",
            hashed_password=hash_password("testpassword"),
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True,
        )
        db_session.add(test_user)
        db_session.commit()

        with patch(
            "recyclic_api.api.api_v1.endpoints.admin_users_groups.log_admin_access",
        ) as mock_log:
            response = client.put(
                f"{_V1}/admin/users/{test_user.id}/groups",
                json={
                    "group_ids": ["invalid-group-id"],
                },
                headers=_bearer_headers(admin_user),
            )

        assert response.status_code == 400
        data = response.json()
        assert "ID de groupe invalide" in data["detail"]
        failures = [
            c for c in mock_log.call_args_list if c.kwargs.get("success") is False
        ]
        assert len(failures) == 1
        assert "invalid-group-id" in failures[0].kwargs["error_message"]
        assert "ID de groupe invalide" in failures[0].kwargs["error_message"]

    def test_update_user_groups_nonexistent_group(self, client: TestClient, db_session: Session, admin_user: User):
        """Test de mise à jour avec un groupe inexistant."""
        test_user = User(
            id=uuid4(),
            username="testuser@example.com",
            hashed_password=hash_password("testpassword"),
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True,
        )
        db_session.add(test_user)
        db_session.commit()

        fake_group_id = str(uuid4())
        with patch(
            "recyclic_api.api.api_v1.endpoints.admin_users_groups.log_admin_access",
        ) as mock_log:
            response = client.put(
                f"{_V1}/admin/users/{test_user.id}/groups",
                json={
                    "group_ids": [fake_group_id],
                },
                headers=_bearer_headers(admin_user),
            )

        assert response.status_code == 404
        data = response.json()
        assert f"Groupe non trouvé: {fake_group_id}" in data["detail"]
        failures = [
            c for c in mock_log.call_args_list if c.kwargs.get("success") is False
        ]
        assert len(failures) == 1
        assert fake_group_id in failures[0].kwargs["error_message"]
        assert "Groupe non trouvé" in failures[0].kwargs["error_message"]

    def test_update_user_groups_empty_list(self, client: TestClient, db_session: Session, admin_user: User):
        """Test de mise à jour avec une liste vide de groupes."""
        test_user = User(
            id=uuid4(),
            username="testuser@example.com",
            hashed_password=hash_password("testpassword"),
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True,
        )
        db_session.add(test_user)
        db_session.commit()

        response = client.put(
            f"{_V1}/admin/users/{test_user.id}/groups",
            json={
                "group_ids": [],
            },
            headers=_bearer_headers(admin_user),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]["group_ids"]) == 0

    def test_update_user_groups_unauthorized(self, client: TestClient, db_session: Session):
        """Test de mise à jour des groupes sans authentification."""
        test_user = User(
            id=uuid4(),
            username="testuser@example.com",
            hashed_password=hash_password("testpassword"),
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True,
        )
        db_session.add(test_user)
        db_session.commit()

        response = client.put(
            f"{_V1}/admin/users/{test_user.id}/groups",
            json={
                "group_ids": ["group1"],
            },
        )

        assert response.status_code == 401

    def test_update_user_groups_non_admin(self, client: TestClient, db_session: Session):
        """Test de mise à jour des groupes par un utilisateur non-admin."""
        regular_user = User(
            id=uuid4(),
            username="regular@example.com",
            hashed_password=hash_password("testpassword"),
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True,
        )
        db_session.add(regular_user)

        test_user = User(
            id=uuid4(),
            username="testuser2@example.com",
            hashed_password=hash_password("testpassword"),
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True,
        )
        db_session.add(test_user)
        db_session.commit()

        response = client.put(
            f"{_V1}/admin/users/{test_user.id}/groups",
            json={
                "group_ids": ["00000000-0000-0000-0000-000000000001"],
            },
            headers=_bearer_headers(regular_user),
        )

        assert response.status_code == 403
