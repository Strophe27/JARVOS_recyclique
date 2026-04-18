from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import MagicMock

from recyclic_api.models.user import UserRole
from recyclic_api.repositories.reception import LigneDepotRepository, PosteReceptionRepository
from recyclic_api.services.reception_service import ReceptionService


def test_reception_repositories_do_not_commit_directly():
    db = MagicMock()
    poste_repo = PosteReceptionRepository(db)
    ligne_repo = LigneDepotRepository(db)

    poste = SimpleNamespace(id=uuid4())
    ligne = SimpleNamespace(id=uuid4())

    assert poste_repo.add(poste) is poste
    assert poste_repo.update(poste) is poste
    ligne_repo.delete(ligne)

    db.add.assert_called_once_with(poste)
    db.delete.assert_called_once_with(ligne)
    db.commit.assert_not_called()
    db.refresh.assert_not_called()


def test_reception_service_open_poste_commits_and_refreshes_once():
    db = MagicMock()
    service = ReceptionService(db)
    service.poste_repo.add = MagicMock()

    actor = MagicMock()
    actor.id = uuid4()
    actor.role = UserRole.ADMIN

    poste = service.open_poste(actor_user=actor)

    service.poste_repo.add.assert_called_once()
    db.commit.assert_called_once_with()
    db.refresh.assert_called_once_with(poste)
