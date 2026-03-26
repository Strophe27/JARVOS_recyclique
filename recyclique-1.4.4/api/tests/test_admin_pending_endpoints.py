"""
Tests refactorisés pour les endpoints de validation des inscriptions (Story 3.3)
Refactorisé selon la Charte de Stratégie de Test (pattern Mocks & Overrides)
"""

import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.main import app
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.core.security import create_access_token
from recyclic_api.core.config import settings
from tests.factories import UserFactory

_ADMIN_USERS = f"{settings.API_V1_STR.rstrip('/')}/admin/users"


def _telegram_id() -> int:
    """Identifiant Telegram numérique pour les users pending (évite int(None) dans l'API)."""
    return 1_000_000_000 + (uuid.uuid4().int % 8_999_999_999)


class TestPendingUsersEndpoints:
    """Tests for pending users endpoints."""

    def test_get_pending_users_success_returns_list(self, admin_client: TestClient, db_session: Session):
        """Teste que la récupération des utilisateurs en attente réussit et retourne une liste."""
        u_pending = UserFactory(status=UserStatus.PENDING, telegram_id=_telegram_id())
        u_approved = UserFactory(status=UserStatus.APPROVED, telegram_id=_telegram_id())
        db_session.add_all([u_pending, u_approved])
        db_session.commit()

        response = admin_client.get(f"{_ADMIN_USERS}/pending")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]['status'] == UserStatus.PENDING.value
        assert data[0]["telegram_id"] == str(u_pending.telegram_id)

    def test_get_pending_users_preserves_non_numeric_telegram_id(self, admin_client: TestClient, db_session: Session):
        """Un telegram_id non numérique ne doit plus faire échouer la sérialisation pending."""
        pending_user = UserFactory(status=UserStatus.PENDING, telegram_id="tg_pending_alpha")
        db_session.add(pending_user)
        db_session.commit()

        response = admin_client.get(f"{_ADMIN_USERS}/pending")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["telegram_id"] == "tg_pending_alpha"

    def test_get_pending_users_empty_list_returns_empty(self, admin_client: TestClient, db_session: Session):
        """Teste que la récupération des utilisateurs en attente retourne une liste vide s'il n'y en a pas."""
        u = UserFactory(status=UserStatus.APPROVED)
        db_session.add(u)
        db_session.commit()

        response = admin_client.get(f"{_ADMIN_USERS}/pending")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    def test_get_pending_users_insufficient_role_returns_403(self, client: TestClient, db_session: Session):
        """Teste que les utilisateurs avec un rôle insuffisant reçoivent une erreur 403."""
        user = UserFactory(role=UserRole.USER)
        db_session.add(user)
        db_session.commit()

        access_token = create_access_token(data={"sub": str(user.id)})
        client.headers = {"Authorization": f"Bearer {access_token}"}

        response = client.get(f"{_ADMIN_USERS}/pending")
        assert response.status_code == 403

    def test_approve_user_success_updates_status(self, admin_client: TestClient, db_session: Session):
        """Teste que l'approbation d'un utilisateur met à jour son statut."""
        user = UserFactory(status=UserStatus.PENDING, telegram_id=_telegram_id())
        db_session.add(user)
        db_session.commit()

        response = admin_client.post(f"{_ADMIN_USERS}/{user.id}/approve")
        assert response.status_code == 200
        db_session.refresh(user)
        assert user.status == UserStatus.APPROVED

    def test_approve_user_not_found_returns_404(self, admin_client: TestClient):
        """Teste que l'approbation d'un utilisateur inexistant retourne une erreur 404."""
        response = admin_client.post(f"{_ADMIN_USERS}/{uuid.uuid4()}/approve")
        assert response.status_code == 404

    def test_approve_user_invalid_uuid_returns_404(self, admin_client: TestClient):
        """Teste que l'approbation avec un UUID invalide retourne une erreur 404."""
        response = admin_client.post(f"{_ADMIN_USERS}/invalid-uuid/approve")
        assert response.status_code == 404

    def test_approve_user_not_pending_returns_400(self, admin_client: TestClient, db_session: Session):
        """Teste que l'approbation d'un utilisateur non en attente retourne une erreur 400."""
        user = UserFactory(status=UserStatus.APPROVED)
        db_session.add(user)
        db_session.commit()

        response = admin_client.post(f"{_ADMIN_USERS}/{user.id}/approve")
        assert response.status_code == 400

    def test_reject_user_success_updates_status(self, admin_client: TestClient, db_session: Session):
        """Teste que le rejet d'un utilisateur met à jour son statut."""
        user = UserFactory(status=UserStatus.PENDING, telegram_id=_telegram_id())
        db_session.add(user)
        db_session.commit()

        response = admin_client.post(f"{_ADMIN_USERS}/{user.id}/reject")
        assert response.status_code == 200
        db_session.refresh(user)
        assert user.status == UserStatus.REJECTED

    def test_reject_user_not_found_returns_404(self, admin_client: TestClient):
        """Teste que le rejet d'un utilisateur inexistant retourne une erreur 404."""
        response = admin_client.post(f"{_ADMIN_USERS}/{uuid.uuid4()}/reject")
        assert response.status_code == 404
    
    def test_reject_user_not_pending_returns_400(self, admin_client: TestClient, db_session: Session):
        """Teste que le rejet d'un utilisateur non en attente retourne une erreur 400."""
        user = UserFactory(status=UserStatus.APPROVED)
        db_session.add(user)
        db_session.commit()

        response = admin_client.post(f"{_ADMIN_USERS}/{user.id}/reject")
        assert response.status_code == 400

    def test_approve_user_without_message_succeeds(self, admin_client: TestClient, db_session: Session):
        """Teste que l'approbation sans message personnalisé réussit."""
        user = UserFactory(status=UserStatus.PENDING, telegram_id=_telegram_id())
        db_session.add(user)
        db_session.commit()
        response = admin_client.post(f"{_ADMIN_USERS}/{user.id}/approve", json=None)
        assert response.status_code == 200

    def test_reject_user_without_reason_succeeds(self, admin_client: TestClient, db_session: Session):
        """Teste que le rejet sans raison personnalisée réussit."""
        user = UserFactory(status=UserStatus.PENDING, telegram_id=_telegram_id())
        db_session.add(user)
        db_session.commit()
        response = admin_client.post(f"{_ADMIN_USERS}/{user.id}/reject", json=None)
        assert response.status_code == 200

    def test_database_error_handling_returns_500(
        self, admin_client: TestClient, db_session: Session, monkeypatch,
    ):
        """Après la résolution de l'admin (1er db.query), la 2e requête échoue → 500."""
        user = UserFactory(status=UserStatus.PENDING, telegram_id=_telegram_id())
        db_session.add(user)
        db_session.commit()

        query_calls = {"n": 0}
        real_query = db_session.query

        def counting_query(*args, **kwargs):
            query_calls["n"] += 1
            if query_calls["n"] >= 2:
                raise RuntimeError("Database connection error")
            return real_query(*args, **kwargs)

        monkeypatch.setattr(db_session, "query", counting_query)
        response = admin_client.get(f"{_ADMIN_USERS}/pending")
        assert response.status_code == 500