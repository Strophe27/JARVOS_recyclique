"""Tests pour les endpoints de gestion des utilisateurs (statut et profil)"""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.user_status_history import UserStatusHistory
from recyclic_api.core.security import hash_password

_V1 = settings.API_V1_STR.rstrip("/")


def test_update_user_status_success(client: TestClient, db_session: Session):
    """Test de mise à jour du statut utilisateur avec succès"""
    tid = uuid.uuid4().hex[:10]
    uname_u = f"mgmt_st_ok_u_{tid}"
    uname_a = f"mgmt_st_ok_a_{tid}"
    test_user = User(
        username=uname_u,
        hashed_password=hash_password("password"),
        first_name="Test",
        last_name="User",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True
    )
    db_session.add(test_user)
    db_session.commit()
    db_session.refresh(test_user)

    admin_user = User(
        username=uname_a,
        hashed_password=hash_password("password"),
        first_name="Admin",
        last_name="User",
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
        is_active=True
    )
    db_session.add(admin_user)
    db_session.commit()
    db_session.refresh(admin_user)

    login_response = client.post(
        f"{_V1}/auth/login",
        json={"username": uname_a, "password": "password"}
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    response = client.put(
        f"{_V1}/admin/users/{test_user.id}/status",
        json={
            "status": "approved",
            "is_active": False,
            "reason": "Test de désactivation",
        },
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["is_active"] is False
    assert data["data"]["previous_status"] is True
    assert data["data"]["reason"] == "Test de désactivation"

    db_session.refresh(test_user)
    assert test_user.is_active is False

    history = db_session.query(UserStatusHistory).filter(
        UserStatusHistory.user_id == test_user.id
    ).first()
    assert history is not None
    assert history.old_status is True
    assert history.new_status is False
    assert history.reason == "Test de désactivation"
    assert history.changed_by_admin_id == admin_user.id


def test_update_user_status_user_not_found(client: TestClient, db_session: Session):
    """Test de mise à jour du statut d'un utilisateur inexistant"""
    tid = uuid.uuid4().hex[:10]
    uname_a = f"mgmt_st_nf_a_{tid}"
    admin_user = User(
        username=uname_a,
        hashed_password=hash_password("password"),
        first_name="Admin",
        last_name="User",
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
        is_active=True
    )
    db_session.add(admin_user)
    db_session.commit()

    login_response = client.post(
        f"{_V1}/auth/login",
        json={"username": uname_a, "password": "password"}
    )
    token = login_response.json()["access_token"]

    response = client.put(
        f"{_V1}/admin/users/00000000-0000-0000-0000-000000000000/status",
        json={"status": "approved", "is_active": False},
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 404
    assert "non trouv" in response.json()["detail"]


def test_update_user_status_admin_cannot_deactivate_self(client: TestClient, db_session: Session):
    """Test qu'un admin ne peut pas se désactiver lui-même"""
    tid = uuid.uuid4().hex[:10]
    uname_a = f"mgmt_st_self_a_{tid}"
    admin_user = User(
        username=uname_a,
        hashed_password=hash_password("password"),
        first_name="Admin",
        last_name="User",
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
        is_active=True
    )
    db_session.add(admin_user)
    db_session.commit()
    db_session.refresh(admin_user)

    login_response = client.post(
        f"{_V1}/auth/login",
        json={"username": uname_a, "password": "password"}
    )
    token = login_response.json()["access_token"]

    response = client.put(
        f"{_V1}/admin/users/{admin_user.id}/status",
        json={"status": "approved", "is_active": False},
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 403
    assert "administrateur" in response.json()["detail"].lower()


def test_update_user_profile_success(client: TestClient, db_session: Session):
    """Test de mise à jour du profil utilisateur avec succès"""
    tid = uuid.uuid4().hex[:10]
    uname_u = f"mgmt_pr_ok_u_{tid}"
    uname_a = f"mgmt_pr_ok_a_{tid}"
    test_user = User(
        username=uname_u,
        hashed_password=hash_password("password"),
        first_name="Old",
        last_name="Name",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True
    )
    db_session.add(test_user)
    db_session.commit()
    db_session.refresh(test_user)

    admin_user = User(
        username=uname_a,
        hashed_password=hash_password("password"),
        first_name="Admin",
        last_name="User",
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
        is_active=True
    )
    db_session.add(admin_user)
    db_session.commit()

    login_response = client.post(
        f"{_V1}/auth/login",
        json={"username": uname_a, "password": "password"}
    )
    token = login_response.json()["access_token"]

    response = client.put(
        f"{_V1}/admin/users/{test_user.id}",
        json={"first_name": "New", "last_name": "Name"},
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["first_name"] == "New"
    assert data["data"]["last_name"] == "Name"
    assert "first_name" in data["data"]["updated_fields"]
    assert "last_name" in data["data"]["updated_fields"]

    db_session.refresh(test_user)
    assert test_user.first_name == "New"
    assert test_user.last_name == "Name"


def test_update_user_profile_partial_update(client: TestClient, db_session: Session):
    """Test de mise à jour partielle du profil utilisateur"""
    tid = uuid.uuid4().hex[:10]
    uname_u = f"mgmt_pr_part_u_{tid}"
    uname_a = f"mgmt_pr_part_a_{tid}"
    test_user = User(
        username=uname_u,
        hashed_password=hash_password("password"),
        first_name="Old",
        last_name="Name",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True
    )
    db_session.add(test_user)
    db_session.commit()
    db_session.refresh(test_user)

    admin_user = User(
        username=uname_a,
        hashed_password=hash_password("password"),
        first_name="Admin",
        last_name="User",
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
        is_active=True
    )
    db_session.add(admin_user)
    db_session.commit()

    login_response = client.post(
        f"{_V1}/auth/login",
        json={"username": uname_a, "password": "password"}
    )
    token = login_response.json()["access_token"]

    response = client.put(
        f"{_V1}/admin/users/{test_user.id}",
        json={"first_name": "NewFirst"},
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["first_name"] == "NewFirst"
    assert data["data"]["last_name"] == "Name"
    assert data["data"]["updated_fields"] == ["first_name"]

    db_session.refresh(test_user)
    assert test_user.first_name == "NewFirst"
    assert test_user.last_name == "Name"


def test_update_user_profile_no_fields_provided(client: TestClient, db_session: Session):
    """Test de mise à jour du profil sans champs fournis"""
    tid = uuid.uuid4().hex[:10]
    uname_u = f"mgmt_pr_empty_u_{tid}"
    uname_a = f"mgmt_pr_empty_a_{tid}"
    test_user = User(
        username=uname_u,
        hashed_password=hash_password("password"),
        first_name="Test",
        last_name="User",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True
    )
    db_session.add(test_user)
    db_session.commit()
    db_session.refresh(test_user)

    admin_user = User(
        username=uname_a,
        hashed_password=hash_password("password"),
        first_name="Admin",
        last_name="User",
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
        is_active=True
    )
    db_session.add(admin_user)
    db_session.commit()

    login_response = client.post(
        f"{_V1}/auth/login",
        json={"username": uname_a, "password": "password"}
    )
    token = login_response.json()["access_token"]

    response = client.put(
        f"{_V1}/admin/users/{test_user.id}",
        json={},
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "Aucun champ" in detail and "fourni" in detail


def test_update_user_profile_user_not_found(client: TestClient, db_session: Session):
    """Test de mise à jour du profil d'un utilisateur inexistant"""
    tid = uuid.uuid4().hex[:10]
    uname_a = f"mgmt_pr_nf_a_{tid}"
    admin_user = User(
        username=uname_a,
        hashed_password=hash_password("password"),
        first_name="Admin",
        last_name="User",
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
        is_active=True
    )
    db_session.add(admin_user)
    db_session.commit()

    login_response = client.post(
        f"{_V1}/auth/login",
        json={"username": uname_a, "password": "password"}
    )
    token = login_response.json()["access_token"]

    response = client.put(
        f"{_V1}/admin/users/00000000-0000-0000-0000-000000000000",
        json={"first_name": "New"},
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 404
    assert "non trouv" in response.json()["detail"]


def test_update_user_role_success(client: TestClient, db_session: Session):
    """Admin : PUT /admin/users/{id}/role met à jour le rôle (module admin_users_mutations)."""
    tid = uuid.uuid4().hex[:10]
    uname_u = f"mgmt_role_ok_u_{tid}"
    uname_a = f"mgmt_role_ok_a_{tid}"
    test_user = User(
        username=uname_u,
        hashed_password=hash_password("password"),
        first_name="U",
        last_name="Ser",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
    )
    db_session.add(test_user)
    db_session.commit()
    db_session.refresh(test_user)

    admin_user = User(
        username=uname_a,
        hashed_password=hash_password("password"),
        first_name="Ad",
        last_name="Min",
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
        is_active=True,
    )
    db_session.add(admin_user)
    db_session.commit()

    login_response = client.post(
        f"{_V1}/auth/login",
        json={"username": uname_a, "password": "password"},
    )
    token = login_response.json()["access_token"]

    response = client.put(
        f"{_V1}/admin/users/{test_user.id}/role",
        json={"role": "admin"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["role"] == "admin"
    assert data["data"]["previous_role"] == "user"
    db_session.refresh(test_user)
    assert test_user.role == UserRole.ADMIN


def test_update_user_role_admin_cannot_downgrade_self(client: TestClient, db_session: Session):
    """Un admin ne peut pas se rétrograder via PUT .../role."""
    tid = uuid.uuid4().hex[:10]
    uname_a = f"mgmt_role_self_a_{tid}"
    admin_user = User(
        username=uname_a,
        hashed_password=hash_password("password"),
        first_name="Ad",
        last_name="Min",
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
        is_active=True,
    )
    db_session.add(admin_user)
    db_session.commit()
    db_session.refresh(admin_user)

    login_response = client.post(
        f"{_V1}/auth/login",
        json={"username": uname_a, "password": "password"},
    )
    token = login_response.json()["access_token"]

    response = client.put(
        f"{_V1}/admin/users/{admin_user.id}/role",
        json={"role": "user"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert "dégrader" in response.json()["detail"]
    db_session.refresh(admin_user)
    assert admin_user.role == UserRole.ADMIN


def test_admin_endpoints_require_admin_role(client: TestClient, db_session: Session):
    """Test que les endpoints nécessitent un rôle admin"""
    tid = uuid.uuid4().hex[:10]
    uname_n = f"mgmt_role_norm_{tid}"
    normal_user = User(
        username=uname_n,
        hashed_password=hash_password("password"),
        first_name="Normal",
        last_name="User",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True
    )
    db_session.add(normal_user)
    db_session.commit()

    login_response = client.post(
        f"{_V1}/auth/login",
        json={"username": uname_n, "password": "password"}
    )
    token = login_response.json()["access_token"]

    response = client.put(
        f"{_V1}/admin/users/123/status",
        json={"status": "approved", "is_active": False},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403

    response = client.put(
        f"{_V1}/admin/users/123",
        json={"first_name": "New"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403

    response = client.put(
        f"{_V1}/admin/users/123/role",
        json={"role": "admin"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403


def test_get_user_response_excludes_hashed_password(client: TestClient, db_session: Session):
    """Test que hashed_password n'est pas inclus dans GET users/{id} (préfixe API depuis settings)."""
    tid = uuid.uuid4().hex[:10]
    uname_u = f"mgmt_get_one_{tid}"
    test_user = User(
        username=uname_u,
        hashed_password=hash_password("password"),
        first_name="Test",
        last_name="User",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True
    )
    db_session.add(test_user)
    db_session.commit()
    db_session.refresh(test_user)

    response = client.get(f"{_V1}/users/{test_user.id}")

    assert response.status_code == 200
    data = response.json()

    assert "hashed_password" not in data, f"hashed_password trouvé dans la réponse: {data}"
    assert data["username"] == uname_u
    assert data["first_name"] == "Test"
    assert data["last_name"] == "User"
    assert data["role"] == "user"
    assert data["status"] == "approved"


def test_get_users_list_excludes_hashed_password(client: TestClient, db_session: Session):
    """Test que hashed_password n'est pas inclus dans GET users/ (liste)."""
    tid = uuid.uuid4().hex[:10]
    uname_u = f"mgmt_get_list_{tid}"
    test_user = User(
        username=uname_u,
        hashed_password=hash_password("password"),
        first_name="Test",
        last_name="User",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True
    )
    db_session.add(test_user)
    db_session.commit()

    response = client.get(f"{_V1}/users/")

    assert response.status_code == 200
    users = response.json()

    ours = [u for u in users if u.get("username") == uname_u]
    assert len(ours) >= 1
    for user in ours:
        assert "hashed_password" not in user, f"hashed_password trouvé: {user}"
        assert user["username"] == uname_u
        assert user["first_name"] == "Test"


def test_update_user_profile_persistence(client: TestClient, db_session: Session):
    """Test que les modifications de profil utilisateur sont persistées en base de données"""
    tid = uuid.uuid4().hex[:10]
    uname_u = f"mgmt_persist_{tid}"
    test_user = User(
        username=uname_u,
        hashed_password=hash_password("password"),
        first_name="OldFirst",
        last_name="OldLast",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True
    )
    db_session.add(test_user)
    db_session.commit()
    db_session.refresh(test_user)

    response = client.put(
        f"{_V1}/users/{test_user.id}",
        json={"first_name": "NewFirst", "last_name": "NewLast", "role": "admin"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "NewFirst"
    assert data["last_name"] == "NewLast"
    assert data["role"] == "admin"

    db_session.refresh(test_user)
    assert test_user.first_name == "NewFirst", f"Prénom non persisté: {test_user.first_name}"
    assert test_user.last_name == "NewLast", f"Nom de famille non persisté: {test_user.last_name}"
    assert test_user.role == UserRole.ADMIN, f"Rôle non persisté: {test_user.role}"

    assert test_user.username == uname_u
    assert test_user.status == UserStatus.APPROVED
    assert test_user.is_active is True

    assert test_user.updated_at is not None
