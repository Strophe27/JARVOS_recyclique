"""
Story 7.2 — garde-fous contexte réception (permission, site, opérateur poste).
"""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.core.security import create_access_token, hash_password
from recyclic_api.main import app
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from tests.reception_story72_eligibility import grant_user_reception_eligibility

_V1 = settings.API_V1_STR.rstrip("/")


@pytest.fixture
def story72_site(db_session: Session) -> Site:
    s = Site(id=uuid.uuid4(), name="Story 7.2 site", is_active=True)
    db_session.add(s)
    db_session.commit()
    db_session.refresh(s)
    return s


def _user_with_site_no_reception_perm(db_session: Session, site: Site) -> User:
    u = User(
        id=uuid.uuid4(),
        username=f"norx_{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("x"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
        site_id=site.id,
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


def _user_full_reception(db_session: Session, site: Site) -> User:
    u = User(
        id=uuid.uuid4(),
        username=f"rx_{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("x"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
        site_id=site.id,
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    grant_user_reception_eligibility(db_session, u, site.id)
    return u


def test_open_poste_forbidden_without_reception_permission(db_session: Session, story72_site: Site):
    user = _user_with_site_no_reception_perm(db_session, story72_site)
    token = create_access_token(data={"sub": str(user.id)})
    client = TestClient(app)
    r = client.post(
        f"{_V1}/reception/postes/open",
        json={},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403
    assert "reception.access" in r.json().get("detail", "")


def test_open_poste_forbidden_without_site(db_session: Session, story72_site: Site):
    u = User(
        id=uuid.uuid4(),
        username=f"nosite_{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("x"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
        site_id=story72_site.id,
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    grant_user_reception_eligibility(db_session, u, story72_site.id)
    u.site_id = None
    db_session.add(u)
    db_session.commit()

    token = create_access_token(data={"sub": str(u.id)})
    client = TestClient(app)
    r = client.post(
        f"{_V1}/reception/postes/open",
        json={},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403
    assert "site" in r.json().get("detail", "").lower()


def test_create_ticket_forbidden_on_other_operator_poste(db_session: Session, story72_site: Site):
    opener = _user_full_reception(db_session, story72_site)
    other = _user_full_reception(db_session, story72_site)

    c = TestClient(app)
    r_open = c.post(
        f"{_V1}/reception/postes/open",
        json={},
        headers={"Authorization": f"Bearer {create_access_token(data={'sub': str(opener.id)})}"},
    )
    assert r_open.status_code == 200
    poste_id = r_open.json()["id"]

    r_ticket = c.post(
        f"{_V1}/reception/tickets",
        json={"poste_id": poste_id},
        headers={"Authorization": f"Bearer {create_access_token(data={'sub': str(other.id)})}"},
    )
    assert r_ticket.status_code == 403
    detail = r_ticket.json().get("detail", "").lower()
    assert "poste" in detail or "opérateur" in detail or "session" in detail


def test_get_tickets_forbidden_without_reception_permission(db_session: Session, story72_site: Site):
    """Story 7.2 / CR : liste historique alignée sur le même garde-fou que get_categories."""
    user = _user_with_site_no_reception_perm(db_session, story72_site)
    token = create_access_token(data={"sub": str(user.id)})
    client = TestClient(app)
    r = client.get(
        f"{_V1}/reception/tickets",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403
    assert "reception.access" in r.json().get("detail", "")
