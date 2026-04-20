"""
Story 25.8 — symétrie ventes / caisse : refus **409** ``CONTEXT_STALE`` lorsque les en-têtes
``X-Recyclique-Context-*`` ne correspondent pas à l'enveloppe serveur (``build_context_envelope``).

Cibles : ``PUT .../cash-sessions/.../step``, ``PATCH .../sales/{sale_id}/corrections``,
``PUT .../sales/{sale_id}`` (note admin), ``PATCH .../sales/.../items/{item_id}`` (ligne hors ``/weight``),
``PATCH .../sales/.../weight`` — garde avant effet métier.
"""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.auth import create_access_token
from tests.caisse_sale_eligibility import grant_user_caisse_sale_eligibility
from recyclic_api.core.config import settings
from recyclic_api.core.context_binding_guard import (
    CONTEXT_STALE_CODE,
    CONTEXT_VALIDATION_CODE,
    HEADER_CONTEXT_CASH_SESSION_ID,
    HEADER_CONTEXT_SITE_ID,
)
from recyclic_api.core.security import hash_password
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus

_V1 = settings.API_V1_STR.rstrip("/")
_STEP_UP_PIN = "1234"


def _assert_409_context_stale_envelope(body: dict) -> None:
    """AR21 / RecycliqueApiError : 409 CONTEXT_STALE — ``retryable`` faux, ``correlation_id`` présent."""
    assert body["code"] == CONTEXT_STALE_CODE
    assert isinstance(body["detail"], str)
    assert body.get("retryable") is False
    assert "correlation_id" in body
    assert isinstance(body["correlation_id"], str)


def _assert_400_validation_envelope(body: dict) -> None:
    """400 — ``code`` ``VALIDATION_ERROR`` (en-tête non-UUID ou ``sub`` non-UUID avec en-têtes contexte)."""
    assert body["code"] == CONTEXT_VALIDATION_CODE
    assert isinstance(body["detail"], str)
    assert body.get("retryable") is False
    assert "correlation_id" in body


def test_patch_sale_corrections_409_context_stale_when_site_header_mismatches_envelope(
    client: TestClient,
    db_session: Session,
):
    """Story 25.8 — super-admin + step-up : refus avant service si en-tête site désaligné."""
    site = Site(name=f"ST258corr Site {uuid4().hex[:8]}", is_active=True)
    db_session.add(site)
    db_session.flush()
    alien_site_id = uuid4()

    user = User(
        id=uuid4(),
        username=f"st258_corr_{uuid4().hex[:10]}@example.com",
        hashed_password=hash_password("secret"),
        hashed_pin=hash_password(_STEP_UP_PIN),
        role=UserRole.SUPER_ADMIN,
        status=UserStatus.ACTIVE,
        site_id=site.id,
    )
    db_session.add(user)
    db_session.commit()

    token = create_access_token(data={"sub": str(user.id)})
    fake_sale_id = uuid4()
    new_date = (datetime.now(timezone.utc) - timedelta(minutes=20)).isoformat()

    response = client.patch(
        f"{_V1}/sales/{fake_sale_id}/corrections",
        json={
            "kind": "sale_date",
            "sale_date": new_date,
            "reason": "test context stale guard",
        },
        headers={
            "Authorization": f"Bearer {token}",
            "X-Step-Up-Pin": _STEP_UP_PIN,
            HEADER_CONTEXT_SITE_ID: str(alien_site_id),
        },
    )
    assert response.status_code == 409
    body = response.json()
    _assert_409_context_stale_envelope(body)
    assert "site" in body["detail"].lower()


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
    _assert_409_context_stale_envelope(body)
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
    _assert_409_context_stale_envelope(body)
    assert "session" in body["detail"].lower()


def test_put_sale_note_409_context_stale_when_site_header_mismatches_envelope(
    client: TestClient,
    db_session: Session,
):
    """Story 25.8 — admin : refus avant service si en-tête site désaligné (PUT note)."""
    site = Site(name=f"ST258note Site {uuid4().hex[:8]}", is_active=True)
    db_session.add(site)
    db_session.flush()
    alien_site_id = uuid4()

    user = User(
        id=uuid4(),
        username=f"st258_note_{uuid4().hex[:10]}@example.com",
        hashed_password=hash_password("secret"),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        site_id=site.id,
    )
    db_session.add(user)
    db_session.commit()

    token = create_access_token(data={"sub": str(user.id)})
    fake_sale_id = uuid4()

    response = client.put(
        f"{_V1}/sales/{fake_sale_id}",
        json={"note": "note test 25.8"},
        headers={
            "Authorization": f"Bearer {token}",
            HEADER_CONTEXT_SITE_ID: str(alien_site_id),
        },
    )
    assert response.status_code == 409
    body = response.json()
    _assert_409_context_stale_envelope(body)
    assert "site" in body["detail"].lower()


def test_patch_sale_item_notes_409_context_stale_when_site_header_mismatches_envelope(
    client: TestClient,
    db_session: Session,
):
    """Story 25.8 — opérateur : refus avant service sur PATCH ligne (hors /weight) si site désaligné."""
    site = Site(name=f"ST258item Site {uuid4().hex[:8]}", is_active=True)
    db_session.add(site)
    db_session.flush()
    alien_site_id = uuid4()

    user = User(
        id=uuid4(),
        username=f"st258_item_{uuid4().hex[:10]}@example.com",
        hashed_password=hash_password("secret"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
        site_id=site.id,
    )
    db_session.add(user)
    db_session.commit()

    token = create_access_token(data={"sub": str(user.id)})

    response = client.patch(
        f"{_V1}/sales/{uuid4()}/items/{uuid4()}",
        json={"notes": "ctx stale item patch"},
        headers={
            "Authorization": f"Bearer {token}",
            HEADER_CONTEXT_SITE_ID: str(alien_site_id),
        },
    )
    assert response.status_code == 409
    body = response.json()
    _assert_409_context_stale_envelope(body)
    assert "site" in body["detail"].lower()


def test_patch_sale_item_weight_409_context_stale_when_site_header_mismatches_envelope(
    client: TestClient,
    db_session: Session,
):
    """Story 25.8 — admin : refus avant service si en-tête site désaligné (PATCH poids ligne)."""
    site = Site(name=f"ST258w Site {uuid4().hex[:8]}", is_active=True)
    db_session.add(site)
    db_session.flush()
    alien_site_id = uuid4()

    user = User(
        id=uuid4(),
        username=f"st258_w_{uuid4().hex[:10]}@example.com",
        hashed_password=hash_password("secret"),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        site_id=site.id,
    )
    db_session.add(user)
    db_session.commit()

    token = create_access_token(data={"sub": str(user.id)})

    response = client.patch(
        f"{_V1}/sales/{uuid4()}/items/{uuid4()}/weight",
        json={"weight": 1.5},
        headers={
            "Authorization": f"Bearer {token}",
            HEADER_CONTEXT_SITE_ID: str(alien_site_id),
        },
    )
    assert response.status_code == 409
    body = response.json()
    _assert_409_context_stale_envelope(body)
    assert "site" in body["detail"].lower()


def test_put_cash_session_step_400_when_site_header_not_valid_uuid(
    client: TestClient,
    db_session: Session,
):
    """En-tête site présent mais non UUID — 400 ``VALIDATION_ERROR``, pas 409 ``CONTEXT_STALE``."""
    site = Site(name=f"ST258badhdr Site {uuid4().hex[:8]}", is_active=True)
    db_session.add(site)
    db_session.flush()

    user = User(
        id=uuid4(),
        username=f"st258_badhdr_{uuid4().hex[:10]}@example.com",
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

    response = client.put(
        f"{_V1}/cash-sessions/{uuid4()}/step",
        headers={
            "Authorization": f"Bearer {token}",
            HEADER_CONTEXT_SITE_ID: "ceci-nest-pas-un-uuid",
        },
        json={"step": "SALE"},
    )
    assert response.status_code == 400
    _assert_400_validation_envelope(response.json())


def test_post_hold_400_when_context_header_present_but_jwt_sub_not_uuid(
    client: TestClient,
    db_session: Session,
):
    """Story 25.8 — ``sub`` illisible comme UUID alors que le client envoie un en-tête de contexte : 400."""
    site = Site(name=f"ST258sub Site {uuid4().hex[:8]}", is_active=True)
    db_session.add(site)
    db_session.flush()

    user = User(
        id=uuid4(),
        username=f"st258_sub_{uuid4().hex[:10]}@example.com",
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

    grant_user_caisse_sale_eligibility(db_session, user, site.id)

    token = create_access_token(data={"sub": "not-a-uuid"})
    hold_body = {
        "cash_session_id": str(open_session.id),
        "items": [
            {
                "category": "EEE-1",
                "quantity": 1,
                "weight": 1.0,
                "unit_price": 3.0,
                "total_price": 3.0,
            }
        ],
        "total_amount": 3.0,
        "donation": 0,
    }
    response = client.post(
        f"{_V1}/sales/hold",
        json=hold_body,
        headers={
            "Authorization": f"Bearer {token}",
            HEADER_CONTEXT_SITE_ID: str(site.id),
        },
    )
    assert response.status_code == 400
    _assert_400_validation_envelope(response.json())
