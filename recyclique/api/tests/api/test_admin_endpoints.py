"""Tests pour les endpoints d'administration"""
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.orm import Session

from recyclic_api.core.auth import create_access_token
from recyclic_api.core.config import settings
from recyclic_api.models.user import User, UserRole, UserStatus

_V1 = settings.API_V1_STR.rstrip("/")
_ADMIN_USERS = f"{_V1}/admin/users"


@pytest.fixture
def admin_user(db_session: Session):
    """Créer un utilisateur admin pour les tests (identifiants uniques par test)."""
    tid = uuid.uuid4().hex[:12]
    admin = User(
        username=f"admin_test_{tid}",
        email=f"admin_{tid}@test.com",
        hashed_password="hashed_password",
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
        is_active=True,
    )
    db_session.add(admin)
    db_session.commit()
    return admin


@pytest.fixture
def admin_token(admin_user: User):
    """Créer un token JWT pour l'admin."""
    return create_access_token(data={"sub": str(admin_user.id)})


@pytest.fixture
def normal_user(db_session: Session):
    """Créer un utilisateur normal pour les tests (identifiants uniques par test)."""
    tid = uuid.uuid4().hex[:12]
    user = User(
        username=f"test_user_{tid}",
        email=f"user_{tid}@test.com",
        hashed_password="hashed_password",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.mark.asyncio
async def test_get_users_success(async_client: AsyncClient, admin_token: str):
    """Test que l'endpoint liste les utilisateurs"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = await async_client.get(_ADMIN_USERS, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_users_with_filters(async_client: AsyncClient, admin_token: str):
    """Test des filtres sur la liste des utilisateurs"""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Test filtre par rôle
    response = await async_client.get(f"{_ADMIN_USERS}?role=user", headers=headers)
    assert response.status_code == 200

    # Test filtre par statut (nom de query aligné sur l'endpoint)
    response = await async_client.get(
        f"{_ADMIN_USERS}?user_status=approved", headers=headers
    )
    assert response.status_code == 200

    # Test pagination
    response = await async_client.get(
        f"{_ADMIN_USERS}?skip=0&limit=10", headers=headers
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_update_user_role_user_not_found(async_client: AsyncClient, admin_token: str):
    """Test modification de rôle d'un utilisateur inexistant"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = await async_client.put(
        f"{_ADMIN_USERS}/nonexistent/role",
        json={"role": "admin"},
        headers=headers,
    )
    assert response.status_code == 404
    assert "Utilisateur non trouvé" in response.json()["detail"]


@pytest.mark.asyncio
async def test_update_user_role_invalid_role(async_client: AsyncClient, admin_token: str):
    """Test modification avec un rôle invalide"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = await async_client.put(
        f"{_ADMIN_USERS}/123/role",
        json={"role": "invalid_role"},
        headers=headers,
    )
    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_update_user_role_valid_role(async_client: AsyncClient, admin_token: str):
    """Test modification avec un rôle valide (même si l'utilisateur n'existe pas)"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = await async_client.put(
        f"{_ADMIN_USERS}/123/role",
        json={"role": "admin"},
        headers=headers,
    )
    # Devrait retourner 404 car l'utilisateur n'existe pas, mais la validation du rôle passe
    assert response.status_code == 404
    assert "Utilisateur non trouvé" in response.json()["detail"]


@pytest.mark.asyncio
async def test_admin_endpoints_structure(async_client: AsyncClient, admin_token: str):
    """Test que les endpoints admin sont bien structurés"""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Test GET /admin/users
    response = await async_client.get(_ADMIN_USERS, headers=headers)
    assert response.status_code == 200

    # Test PUT /admin/users/{id}/role
    response = await async_client.put(
        f"{_ADMIN_USERS}/123/role",
        json={"role": "user"},
        headers=headers,
    )
    # Devrait retourner 404 car l'utilisateur n'existe pas, mais l'endpoint fonctionne
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_user_profile_success(
    async_client: AsyncClient, admin_token: str, normal_user: User
):
    """Test de la mise à jour réussie du profil utilisateur."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    tid = uuid.uuid4().hex[:8]
    update_data = {
        "first_name": "Updated",
        "last_name": "Name",
        "username": f"updated_username_{tid}",
        "role": "admin",
        "status": "pending",
    }
    response = await async_client.put(
        f"{_ADMIN_USERS}/{normal_user.id}",
        json=update_data,
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["first_name"] == "Updated"
    assert data["last_name"] == "Name"
    assert data["username"] == update_data["username"]
    assert data["role"] == "admin"
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_trigger_reset_password_no_email(
    async_client: AsyncClient, admin_token: str, db_session: Session
):
    """Test de la réinitialisation pour un utilisateur sans e-mail."""
    tid = uuid.uuid4().hex[:12]
    user_no_email = User(
        username=f"no_email_user_{tid}",
        hashed_password="a_password",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
    )
    db_session.add(user_no_email)
    db_session.commit()

    headers = {"Authorization": f"Bearer {admin_token}"}
    response = await async_client.post(
        f"{_ADMIN_USERS}/{user_no_email.id}/reset-password",
        headers=headers,
    )
    assert response.status_code == 400
    assert "pas d'adresse e-mail" in response.json()["detail"]
