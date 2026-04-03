"""ARCH-03 : erreurs métier du CashRegisterService en exceptions de domaine."""

from __future__ import annotations

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from recyclic_api.core.config import settings
from recyclic_api.core.exceptions import ConflictError, NotFoundError
from recyclic_api.models.cash_register import CashRegister
from recyclic_api.services.cash_register_service import CashRegisterService

_V1 = settings.API_V1_STR.rstrip("/")


def test_get_required_raises_not_found_when_missing():
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    service = CashRegisterService(db)

    with pytest.raises(NotFoundError, match="Poste de caisse introuvable"):
        service.get_required(register_id=str(uuid4()))


def test_delete_raises_conflict_when_cash_sessions_exist():
    register = CashRegister(
        id=uuid4(),
        name="Reg1",
        location="L",
        site_id=uuid4(),
        is_active=True,
    )
    db = MagicMock()
    db.query.return_value.filter.return_value.count.return_value = 2
    service = CashRegisterService(db)

    with pytest.raises(ConflictError, match="session"):
        service.delete(register=register)


def test_delete_proceeds_when_no_sessions(monkeypatch):
    register = CashRegister(
        id=uuid4(),
        name="Reg2",
        location="L",
        site_id=uuid4(),
        is_active=True,
    )
    db = MagicMock()
    db.query.return_value.filter.return_value.count.return_value = 0
    service = CashRegisterService(db)
    monkeypatch.setattr(service._db, "delete", MagicMock())
    monkeypatch.setattr(service._db, "commit", MagicMock())

    service.delete(register=register)

    service._db.delete.assert_called_once_with(register)
    service._db.commit.assert_called_once()


def test_get_cash_register_http_maps_not_found(admin_client):
    """Route GET : NotFoundError du service → 404 (detail)."""
    rid = str(uuid4())
    with patch(
        "recyclic_api.api.api_v1.endpoints.cash_registers.CashRegisterService"
    ) as mock_cls:
        mock_cls.return_value.get_required.side_effect = NotFoundError(
            "Poste de caisse introuvable"
        )
        response = admin_client.get(f"{_V1}/cash-registers/{rid}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Poste de caisse introuvable"


def test_update_cash_register_http_maps_not_found(admin_client):
    """Route PATCH : NotFoundError du service (get_required) → 404 (detail)."""
    rid = str(uuid4())
    with patch(
        "recyclic_api.api.api_v1.endpoints.cash_registers.CashRegisterService"
    ) as mock_cls:
        mock_cls.return_value.get_required.side_effect = NotFoundError(
            "Poste de caisse introuvable"
        )
        response = admin_client.patch(
            f"{_V1}/cash-registers/{rid}",
            json={},
        )

    assert response.status_code == 404
    assert response.json()["detail"] == "Poste de caisse introuvable"


def test_delete_cash_register_http_maps_conflict(admin_client):
    """Route DELETE : ConflictError du service → 409 (exc.detail)."""
    rid = str(uuid4())
    mock_register = MagicMock()
    detail = (
        f"Impossible de supprimer le poste de caisse 'X'. "
        f"1 session(s) de caisse y sont associées."
    )
    with patch(
        "recyclic_api.api.api_v1.endpoints.cash_registers.CashRegisterService"
    ) as mock_cls:
        mock_cls.return_value.get_required.return_value = mock_register
        mock_cls.return_value.delete.side_effect = ConflictError(detail)
        response = admin_client.delete(f"{_V1}/cash-registers/{rid}")

    assert response.status_code == 409
    assert response.json()["detail"] == detail
