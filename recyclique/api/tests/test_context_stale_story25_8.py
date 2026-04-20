"""
Story 25.8 — symétrie ventes / caisse : refus **409** ``CONTEXT_STALE`` lorsque les en-têtes
``X-Recyclique-Context-*`` ne correspondent pas à l'enveloppe serveur (``build_context_envelope``).

Cible : mutations caisse sous ``cash_sessions`` (ici ``PUT .../step`` — garde avant le service).
"""
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.core.context_binding_guard import (
    CONTEXT_STALE_CODE,
    HEADER_CONTEXT_CASH_SESSION_ID,
    HEADER_CONTEXT_SITE_ID,
)
from recyclic_api.core.security import hash_password
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus

_V1 = settings.API_V1_STR.rstrip("/")


def test_put_cash_session_step_409_context_stale_when_site_header_mismatches_envelope(
    client: TestClient,
    db_session: Session,
):
    site = Site(name=f"ST258 Site {uuid4().hex[:8]}", is_active=True)
    db_session.add(site)
    db_session.flush()
    alien_site_id = uuid4()

    user = User(
        id=uuid4(),
        username=f"st258_site_{uuid4().hex[:10]}@example.com",
        hashed_password=hash_password("secret"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
        site_id=site.id,
    )
    db_session.add(user)
    db_session.commit()

    login = client.post(
        f"{_V1}/auth/login",
        json={"username": user.username, "password": "secret"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    session_path_id = str(uuid4())

    response = client.put(
        f"{_V1}/cash-sessions/{session_path_id}/step",
        headers={
            "Authorization": f"Bearer {token}",
            HEADER_CONTEXT_SITE_ID: str(alien_site_id),
        },
        json={"step": "SALE"},
    )
    assert response.status_code == 409
    body = response.json()
    assert body["code"] == CONTEXT_STALE_CODE
    assert isinstance(body["detail"], str)
    assert "site" in body["detail"].lower()


def test_put_cash_session_step_409_context_stale_when_cash_session_header_mismatches_envelope(
    client: TestClient,
    db_session: Session,
):
    site = Site(name=f"ST258b Site {uuid4().hex[:8]}", is_active=True)
    db_session.add(site)
    db_session.flush()

    user = User(
        id=uuid4(),
        username=f"st258_sess_{uuid4().hex[:10]}@example.com",
        hashed_password=hash_password("secret"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
        site_id=site.id,
    )
    db_session.add(user)
    db_session.flush()

    open_session = CashSession(
        operator_id=user.id,
        site_id=site.id,
        initial_amount=10.0,
        current_amount=10.0,
        status=CashSessionStatus.OPEN,
        total_sales=0.0,
        total_items=0,
    )
    db_session.add(open_session)
    db_session.commit()

    login = client.post(
        f"{_V1}/auth/login",
        json={"username": user.username, "password": "secret"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    wrong_session = uuid4()
    assert wrong_session != open_session.id

    response = client.put(
        f"{_V1}/cash-sessions/{open_session.id}/step",
        headers={
            "Authorization": f"Bearer {token}",
            HEADER_CONTEXT_CASH_SESSION_ID: str(wrong_session),
        },
        json={"step": "SALE"},
    )
    assert response.status_code == 409
    body = response.json()
    assert body["code"] == CONTEXT_STALE_CODE
    assert isinstance(body["detail"], str)
    assert "session" in body["detail"].lower()
