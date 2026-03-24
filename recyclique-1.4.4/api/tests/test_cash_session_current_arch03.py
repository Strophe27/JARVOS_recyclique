"""
ARCH-03 — cash_sessions/current : erreurs métier côté service (sans DB).

La route GET /cash-sessions/current mappe ValidationError → 400 comme create/close/detail.
"""
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.core.exceptions import ValidationError
from recyclic_api.core.security import hash_password
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.services.cash_session_service import CashSessionService

_V1 = settings.API_V1_STR.rstrip("/")


@pytest.mark.no_db
def test_get_open_session_by_operator_invalid_operator_id_raises_validation_error():
    service = CashSessionService(MagicMock())
    with pytest.raises(ValidationError, match="operator_id invalide"):
        service.get_open_session_by_operator("not-a-uuid")


def test_get_current_cash_session_http_returns_null_when_service_returns_no_session(
    client: TestClient, db_session: Session
):
    """Route-level : aucune session ouverte → 200 et corps JSON null (sans table cash_sessions)."""
    user = User(
        id=uuid4(),
        username="arch03_current_null@example.com",
        hashed_password=hash_password("secret"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()

    login = client.post(
        f"{_V1}/auth/login",
        json={"username": "arch03_current_null@example.com", "password": "secret"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    with patch(
        "recyclic_api.api.api_v1.endpoints.cash_sessions.CashSessionService"
    ) as mock_cls:
        mock_cls.return_value.get_open_session_by_operator.return_value = None
        response = client.get(
            f"{_V1}/cash-sessions/current",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200
    assert response.json() is None


def test_get_current_cash_session_http_returns_400_when_service_raises_validation_error(
    client: TestClient, db_session: Session
):
    """Route-level : CashSessionService lève ValidationError → HTTP 400 (detail)."""
    user = User(
        id=uuid4(),
        username="arch03_current_val@example.com",
        hashed_password=hash_password("secret"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()

    login = client.post(
        f"{_V1}/auth/login",
        json={"username": "arch03_current_val@example.com", "password": "secret"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    with patch(
        "recyclic_api.api.api_v1.endpoints.cash_sessions.CashSessionService"
    ) as mock_cls:
        mock_cls.return_value.get_open_session_by_operator.side_effect = ValidationError(
            "operator_id invalide"
        )
        response = client.get(
            f"{_V1}/cash-sessions/current",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "operator_id invalide"
