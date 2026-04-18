from __future__ import annotations

from datetime import datetime, timedelta, timezone
import os
from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import MagicMock

import pytest

from recyclic_api.core.config import settings
from recyclic_api.core.exceptions import ConflictError, NotFoundError, ValidationError
from recyclic_api.models.cash_register import CashRegister
from recyclic_api.models.cash_session import CashSessionStatus
from recyclic_api.models.site import Site
from recyclic_api.services.cash_session_service import CashSessionService

_V1 = settings.API_V1_STR.rstrip("/")
_TEST_DB_URL = os.getenv("TEST_DATABASE_URL", "")


def test_create_session_raises_validation_error_for_future_opened_at():
    db = MagicMock()
    service = CashSessionService(db)

    with pytest.raises(ValidationError, match="futur"):
        service.create_session(
            operator_id=str(uuid4()),
            site_id=str(uuid4()),
            initial_amount=50.0,
            opened_at=datetime.now(timezone.utc) + timedelta(days=1),
        )


def test_create_session_raises_validation_error_for_invalid_operator_id():
    db = MagicMock()
    service = CashSessionService(db)

    with pytest.raises(ValidationError, match="operator_id invalide"):
        service.create_session(
            operator_id="not-a-uuid",
            site_id=str(uuid4()),
            initial_amount=50.0,
        )


def test_create_session_raises_not_found_for_unknown_operator():
    db = MagicMock()
    service = CashSessionService(db)
    register_id = uuid4()

    db.query.return_value.filter.return_value.first.return_value = None

    with pytest.raises(NotFoundError, match="Opérateur non trouvé"):
        service.create_session(
            operator_id=str(uuid4()),
            site_id=str(uuid4()),
            initial_amount=50.0,
            register_id=str(register_id),
        )


def test_create_session_raises_conflict_for_open_register():
    db = MagicMock()
    service = CashSessionService(db)
    operator_id = uuid4()
    register_id = uuid4()

    db.query.return_value.filter.return_value.first.side_effect = [
        SimpleNamespace(id=operator_id),
        SimpleNamespace(id=uuid4(), status=CashSessionStatus.OPEN),
    ]

    with pytest.raises(ConflictError, match="poste de caisse"):
        service.create_session(
            operator_id=str(operator_id),
            site_id=str(uuid4()),
            initial_amount=50.0,
            register_id=str(register_id),
        )


def test_create_cash_session_returns_400_for_invalid_operator_id(admin_client):
    response = admin_client.post(
        f"{_V1}/cash-sessions/",
        json={
            "operator_id": "not-a-uuid",
            "site_id": str(uuid4()),
            "register_id": str(uuid4()),
            "initial_amount": 50.0,
        },
    )

    assert response.status_code == 400
    assert "operator_id invalide" in response.json()["detail"]


@pytest.mark.skipif(
    not _TEST_DB_URL.startswith("postgresql"),
    reason="Le test HTTP create cash session ARCH-03 nécessite PostgreSQL (site/register réels).",
)
def test_create_cash_session_returns_404_for_unknown_operator(admin_client, db_session):
    site = Site(name=f"ARCH03 Site {uuid4().hex[:8]}", is_active=True)
    db_session.add(site)
    db_session.flush()

    register = CashRegister(name=f"ARCH03 Register {uuid4().hex[:8]}", site_id=site.id, is_active=True)
    db_session.add(register)
    db_session.commit()

    response = admin_client.post(
        f"{_V1}/cash-sessions/",
        json={
            "operator_id": str(uuid4()),
            "site_id": str(site.id),
            "register_id": str(register.id),
            "initial_amount": 50.0,
        },
    )

    assert response.status_code == 404
    assert "Opérateur non trouvé" in response.json()["detail"]
