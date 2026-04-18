"""G-OA-03 (Story 16.1) : GET /v1/users/ et GET /v1/users/{id} exigent session admin."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.core.security import hash_password
from recyclic_api.models.user import User, UserRole, UserStatus

_V1 = settings.API_V1_STR.rstrip("/")


@pytest.fixture
def _users_goa03_seed(db_session: Session):
    tid = uuid.uuid4().hex[:10]
    target = User(
        username=f"goa03_target_{tid}",
        hashed_password=hash_password("Password1!Aa"),
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
    )
    plain_user = User(
        username=f"goa03_plain_{tid}",
        hashed_password=hash_password("Password1!Aa"),
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
    )
    admin = User(
        username=f"goa03_admin_{tid}",
        hashed_password=hash_password("Password1!Aa"),
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
        is_active=True,
    )
    db_session.add_all([target, plain_user, admin])
    db_session.commit()
    db_session.refresh(target)
    db_session.refresh(plain_user)
    db_session.refresh(admin)
    return {"target": target, "plain": plain_user, "admin": admin}


def test_users_list_unauthenticated_401(client: TestClient):
    r = client.get(f"{_V1}/users/")
    assert r.status_code == 401


def test_users_detail_unauthenticated_401(client: TestClient, db_session: Session, _users_goa03_seed):
    uid = str(_users_goa03_seed["target"].id)
    r = client.get(f"{_V1}/users/{uid}")
    assert r.status_code == 401


def test_users_list_non_admin_403(client: TestClient, db_session: Session, _users_goa03_seed):
    u = _users_goa03_seed["plain"]
    login = client.post(f"{_V1}/auth/login", json={"username": u.username, "password": "Password1!Aa"})
    assert login.status_code == 200
    token = login.json()["access_token"]
    r = client.get(f"{_V1}/users/", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


def test_users_detail_non_admin_403(client: TestClient, db_session: Session, _users_goa03_seed):
    u = _users_goa03_seed["plain"]
    tid = str(_users_goa03_seed["target"].id)
    login = client.post(f"{_V1}/auth/login", json={"username": u.username, "password": "Password1!Aa"})
    assert login.status_code == 200
    token = login.json()["access_token"]
    r = client.get(f"{_V1}/users/{tid}", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


def test_users_list_admin_200(client: TestClient, db_session: Session, _users_goa03_seed):
    a = _users_goa03_seed["admin"]
    login = client.post(f"{_V1}/auth/login", json={"username": a.username, "password": "Password1!Aa"})
    assert login.status_code == 200
    token = login.json()["access_token"]
    r = client.get(f"{_V1}/users/", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_users_detail_admin_200(client: TestClient, db_session: Session, _users_goa03_seed):
    a = _users_goa03_seed["admin"]
    tid = str(_users_goa03_seed["target"].id)
    login = client.post(f"{_V1}/auth/login", json={"username": a.username, "password": "Password1!Aa"})
    assert login.status_code == 200
    token = login.json()["access_token"]
    r = client.get(f"{_V1}/users/{tid}", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == tid
    assert "hashed_password" not in body
