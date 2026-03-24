"""
ARCH-03 — cash_sessions PUT /step : erreurs métier côté service, traduction HTTP au route.

Même principe que create/close/detail/current : NotFoundError / ValidationError / ConflictError,
sans dépendre de la table cash_sessions pour les tests HTTP (mock du service).
"""
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.core.exceptions import ConflictError, NotFoundError, ValidationError
from recyclic_api.core.security import hash_password
from recyclic_api.models.cash_session import CashSessionStatus
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.schemas.cash_session import CashSessionStep as ApiCashSessionStep
from recyclic_api.services.cash_session_service import CashSessionService

_V1 = settings.API_V1_STR.rstrip("/")


@pytest.mark.no_db
def test_apply_step_update_to_open_session_closed_raises_conflict():
    """Métier : session fermée → ConflictError (pas HTTP)."""
    service = CashSessionService(MagicMock())
    session = MagicMock()
    session.status = CashSessionStatus.CLOSED
    with pytest.raises(ConflictError, match="session fermée"):
        service.apply_step_update_to_open_session(session, ApiCashSessionStep.SALE)
    service.db.commit.assert_not_called()


@pytest.mark.no_db
def test_apply_step_update_to_open_session_commits_for_open_session():
    """Métier : session ouverte → set_current_step, commit, refresh."""
    db = MagicMock()
    service = CashSessionService(db)
    session = MagicMock()
    session.status = CashSessionStatus.OPEN
    session.set_current_step = MagicMock()
    out = service.apply_step_update_to_open_session(session, ApiCashSessionStep.SALE)
    assert out is session
    session.set_current_step.assert_called_once()
    db.commit.assert_called_once()
    db.refresh.assert_called_once_with(session)


def test_put_cash_session_step_http_404_when_service_raises_not_found(
    client: TestClient, db_session: Session
):
    user = User(
        id=uuid4(),
        username="arch03_step_nf@example.com",
        hashed_password=hash_password("secret"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()

    login = client.post(
        f"{_V1}/auth/login",
        json={"username": "arch03_step_nf@example.com", "password": "secret"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    sid = str(uuid4())

    with patch(
        "recyclic_api.api.api_v1.endpoints.cash_sessions.CashSessionService"
    ) as mock_cls:
        mock_cls.return_value.get_session_by_id_or_raise.side_effect = NotFoundError(
            "Session de caisse non trouvée"
        )
        response = client.put(
            f"{_V1}/cash-sessions/{sid}/step",
            headers={"Authorization": f"Bearer {token}"},
            json={"step": "SALE"},
        )

    assert response.status_code == 404
    assert response.json()["detail"] == "Session de caisse non trouvée"


def test_put_cash_session_step_http_400_when_service_raises_validation_on_lookup(
    client: TestClient, db_session: Session
):
    user = User(
        id=uuid4(),
        username="arch03_step_val@example.com",
        hashed_password=hash_password("secret"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()

    login = client.post(
        f"{_V1}/auth/login",
        json={"username": "arch03_step_val@example.com", "password": "secret"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    with patch(
        "recyclic_api.api.api_v1.endpoints.cash_sessions.CashSessionService"
    ) as mock_cls:
        mock_cls.return_value.get_session_by_id_or_raise.side_effect = ValidationError(
            "session_id invalide"
        )
        response = client.put(
            f"{_V1}/cash-sessions/not-a-uuid/step",
            headers={"Authorization": f"Bearer {token}"},
            json={"step": "SALE"},
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "session_id invalide"


def test_put_cash_session_step_http_400_when_apply_raises_conflict(
    client: TestClient, db_session: Session
):
    user = User(
        id=uuid4(),
        username="arch03_step_cf@example.com",
        hashed_password=hash_password("secret"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()

    login = client.post(
        f"{_V1}/auth/login",
        json={"username": "arch03_step_cf@example.com", "password": "secret"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    sid = str(uuid4())

    mock_session = MagicMock()
    mock_session.operator_id = user.id
    mock_session.status = CashSessionStatus.CLOSED

    with patch(
        "recyclic_api.api.api_v1.endpoints.cash_sessions.CashSessionService"
    ) as mock_cls:
        svc = mock_cls.return_value
        svc.get_session_by_id_or_raise.return_value = mock_session
        svc.apply_step_update_to_open_session.side_effect = ConflictError(
            "Impossible de changer l'étape d'une session fermée"
        )
        response = client.put(
            f"{_V1}/cash-sessions/{sid}/step",
            headers={"Authorization": f"Bearer {token}"},
            json={"step": "SALE"},
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "Impossible de changer l'étape d'une session fermée"


def test_put_cash_session_step_http_403_when_user_not_session_operator(
    client: TestClient, db_session: Session
):
    """USER : session d'un autre opérateur → 403, sans appeler apply_step_update."""
    user = User(
        id=uuid4(),
        username="arch03_step_403@example.com",
        hashed_password=hash_password("secret"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()

    login = client.post(
        f"{_V1}/auth/login",
        json={"username": "arch03_step_403@example.com", "password": "secret"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    sid = str(uuid4())

    other_operator_id = uuid4()
    mock_session = MagicMock()
    mock_session.operator_id = other_operator_id
    mock_session.status = CashSessionStatus.OPEN

    with patch(
        "recyclic_api.api.api_v1.endpoints.cash_sessions.CashSessionService"
    ) as mock_cls:
        svc = mock_cls.return_value
        svc.get_session_by_id_or_raise.return_value = mock_session
        response = client.put(
            f"{_V1}/cash-sessions/{sid}/step",
            headers={"Authorization": f"Bearer {token}"},
            json={"step": "SALE"},
        )

    assert response.status_code == 403
    assert response.json()["detail"] == "Accès non autorisé à cette session"
    svc.apply_step_update_to_open_session.assert_not_called()


def test_put_cash_session_step_http_200_nominal_valid_response_body(
    client: TestClient, db_session: Session
):
    """Chemin nominal : opérateur = utilisateur, service mocké → 200 et corps conforme au schéma."""
    user = User(
        id=uuid4(),
        username="arch03_step_200@example.com",
        hashed_password=hash_password("secret"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()

    login = client.post(
        f"{_V1}/auth/login",
        json={"username": "arch03_step_200@example.com", "password": "secret"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    sid = str(uuid4())

    t0 = datetime(2025, 1, 27, 10, 35, 0, tzinfo=timezone.utc)
    step_metrics = {
        "current_step": "SALE",
        "step_start_time": t0.isoformat(),
        "last_activity": t0.isoformat(),
        "step_duration_seconds": 0.0,
    }

    mock_session = MagicMock()
    mock_session.operator_id = user.id
    mock_session.status = CashSessionStatus.OPEN
    mock_session.get_step_metrics.return_value = step_metrics

    with patch(
        "recyclic_api.api.api_v1.endpoints.cash_sessions.CashSessionService"
    ) as mock_cls:
        svc = mock_cls.return_value
        svc.get_session_by_id_or_raise.return_value = mock_session
        svc.apply_step_update_to_open_session.return_value = mock_session
        response = client.put(
            f"{_V1}/cash-sessions/{sid}/step",
            headers={"Authorization": f"Bearer {token}"},
            json={"step": "SALE"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["session_id"] == sid
    assert body["current_step"] == "SALE"
    assert body["step_start_time"] == t0.isoformat().replace("+00:00", "Z")
    assert body["last_activity"] == t0.isoformat().replace("+00:00", "Z")
    assert body["step_duration_seconds"] == 0.0
    svc.apply_step_update_to_open_session.assert_called_once()
    assert svc.apply_step_update_to_open_session.call_args[0][0] is mock_session
    assert svc.apply_step_update_to_open_session.call_args[0][1] == ApiCashSessionStep.SALE
