from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest

from recyclic_api.core.exceptions import ConflictError, NotFoundError
from recyclic_api.models.ticket_depot import TicketDepotStatus
from recyclic_api.services.reception_service import ReceptionService


def test_close_poste_raises_not_found_error():
    service = ReceptionService(SimpleNamespace())
    service.poste_repo.get = lambda _poste_id: None

    with pytest.raises(NotFoundError, match="Poste introuvable"):
        service.close_poste(uuid4())


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
