from __future__ import annotations

from types import SimpleNamespace
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest

from recyclic_api.core.exceptions import ConflictError, NotFoundError, ValidationError
from recyclic_api.models.ticket_depot import TicketDepotStatus
from recyclic_api.services.reception_service import ReceptionService


def test_close_poste_raises_not_found_error():
    service = ReceptionService(SimpleNamespace())
    service.poste_repo.get = lambda _poste_id: None

    with pytest.raises(NotFoundError, match="Poste introuvable"):
        service.close_poste(uuid4())


def test_open_poste_raises_validation_error_for_future_date():
    service = ReceptionService(SimpleNamespace())
    future_date = datetime.now(timezone.utc) + timedelta(days=1)

    with pytest.raises(ValidationError, match="futur"):
        service.open_poste(uuid4(), future_date)


def test_close_poste_raises_conflict_error_when_open_tickets_exist():
    service = ReceptionService(SimpleNamespace())
    poste = SimpleNamespace(id=uuid4())
    service.poste_repo.get = lambda _poste_id: poste
    service.poste_repo.count_open_tickets = lambda _poste_id: 1

    with pytest.raises(ConflictError, match="tickets ouverts"):
        service.close_poste(uuid4())


def test_close_ticket_raises_not_found_error():
    service = ReceptionService(SimpleNamespace())
    service.ticket_repo.get = lambda _ticket_id: None

    with pytest.raises(NotFoundError, match="Ticket introuvable"):
        service.close_ticket(uuid4())


def test_close_ticket_keeps_idempotent_behavior_for_closed_ticket():
    service = ReceptionService(SimpleNamespace())
    ticket = SimpleNamespace(status=TicketDepotStatus.CLOSED.value)
    service.ticket_repo.get = lambda _ticket_id: ticket

    assert service.close_ticket(uuid4()) is ticket


def test_create_ticket_raises_not_found_when_poste_is_missing():
    service = ReceptionService(SimpleNamespace())
    service.poste_repo.get = lambda _poste_id: None

    with pytest.raises(NotFoundError, match="Poste introuvable"):
        service.create_ticket(uuid4(), uuid4())


def test_create_ticket_raises_conflict_when_poste_is_closed():
    service = ReceptionService(SimpleNamespace())
    poste = SimpleNamespace(status="closed")
    service.poste_repo.get = lambda _poste_id: poste

    with pytest.raises(ConflictError, match="Poste fermé"):
        service.create_ticket(uuid4(), uuid4())


def test_create_ticket_raises_not_found_when_user_is_missing():
    service = ReceptionService(SimpleNamespace())
    poste = SimpleNamespace(status="opened", opened_at=None, id=uuid4())
    service.poste_repo.get = lambda _poste_id: poste
    service.user_repo.get = lambda _user_id: None

    with pytest.raises(NotFoundError, match="Utilisateur introuvable"):
        service.create_ticket(uuid4(), uuid4())


def test_create_ligne_raises_not_found_when_ticket_is_missing():
    service = ReceptionService(SimpleNamespace())
    service.ticket_repo.get = lambda _ticket_id: None

    with pytest.raises(NotFoundError, match="Ticket introuvable"):
        service.create_ligne(
            ticket_id=uuid4(),
            category_id=uuid4(),
            poids_kg=1.0,
            destination="MAGASIN",
            notes=None,
        )


def test_create_ligne_raises_conflict_when_ticket_is_closed():
    service = ReceptionService(SimpleNamespace())
    ticket = SimpleNamespace(status=TicketDepotStatus.CLOSED.value)
    service.ticket_repo.get = lambda _ticket_id: ticket

    with pytest.raises(ConflictError, match="Ticket fermé"):
        service.create_ligne(
            ticket_id=uuid4(),
            category_id=uuid4(),
            poids_kg=1.0,
            destination="MAGASIN",
            notes=None,
        )


def test_create_ligne_raises_not_found_when_category_is_missing():
    service = ReceptionService(SimpleNamespace())
    ticket = SimpleNamespace(status=TicketDepotStatus.OPENED.value)
    service.ticket_repo.get = lambda _ticket_id: ticket
    service.category_repo.exists = lambda _category_id: False

    with pytest.raises(NotFoundError, match="Catégorie introuvable"):
        service.create_ligne(
            ticket_id=uuid4(),
            category_id=uuid4(),
            poids_kg=1.0,
            destination="MAGASIN",
            notes=None,
        )


def test_create_ligne_raises_validation_for_non_positive_weight():
    service = ReceptionService(SimpleNamespace())
    ticket = SimpleNamespace(status=TicketDepotStatus.OPENED.value)
    service.ticket_repo.get = lambda _ticket_id: ticket
    service.category_repo.exists = lambda _category_id: True

    with pytest.raises(ValidationError, match="poids_kg"):
        service.create_ligne(
            ticket_id=uuid4(),
            category_id=uuid4(),
            poids_kg=0,
            destination="MAGASIN",
            notes=None,
        )


def test_create_ligne_raises_validation_for_invalid_exit_destination():
    service = ReceptionService(SimpleNamespace())
    ticket = SimpleNamespace(status=TicketDepotStatus.OPENED.value)
    service.ticket_repo.get = lambda _ticket_id: ticket
    service.category_repo.exists = lambda _category_id: True

    with pytest.raises(ValidationError, match="sortie de stock"):
        service.create_ligne(
            ticket_id=uuid4(),
            category_id=uuid4(),
            poids_kg=1.0,
            destination="MAGASIN",
            notes=None,
            is_exit=True,
        )
