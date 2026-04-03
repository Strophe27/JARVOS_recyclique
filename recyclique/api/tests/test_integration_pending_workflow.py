"""
Tests d'intégration pour le workflow de validation des inscriptions
(Basé sur des données réellement persistées et un client admin authentifié)
"""
import uuid
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.core.security import create_access_token
from recyclic_api.models.user import User, UserRole, UserStatus
from tests.factories import UserFactory

_ADMIN_USERS = f"{settings.API_V1_STR.rstrip('/')}/admin/users"


class TestPendingUsersIntegration:
    def _make_pending_users(self, db_session: Session, count: int = 5) -> list[User]:
        users: list[User] = []
        for i in range(count):
            user = UserFactory(
                username=f"pending_user_{i}",
                role=UserRole.USER,
                status=UserStatus.PENDING,
                is_active=True,
            )
            users.append(user)
        db_session.add_all(users)
        db_session.commit()
        for u in users:
            db_session.refresh(u)
        return users

    def test_workflow_pending_to_approved_success(self, admin_client: TestClient, db_session: Session):
        users = self._make_pending_users(db_session, 5)
        target_user = users[0]

        # GET pending
        resp = admin_client.get(f"{_ADMIN_USERS}/pending")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 5
        assert all(item["status"] == UserStatus.PENDING.value for item in data[:5])

        # Approve
        resp = admin_client.post(f"{_ADMIN_USERS}/{target_user.id}/approve", json={"message": "welcome"})
        assert resp.status_code == 200
        db_session.refresh(target_user)
        assert target_user.status == UserStatus.APPROVED

    def test_workflow_pending_to_rejected_success(self, admin_client: TestClient, db_session: Session):
        users = self._make_pending_users(db_session, 5)
        target_user = users[0]

        # Reject
        resp = admin_client.post(f"{_ADMIN_USERS}/{target_user.id}/reject", json={"reason": "Profil incomplet"})
        assert resp.status_code == 200
        db_session.refresh(target_user)
        assert target_user.status == UserStatus.REJECTED

    def test_batch_operations_multiple_users_success(self, admin_client: TestClient, db_session: Session):
        users = self._make_pending_users(db_session, 5)
        users_to_approve = users[:3]
        users_to_reject = users[3:]

        # Approve
        for user in users_to_approve:
            resp = admin_client.post(f"{_ADMIN_USERS}/{user.id}/approve")
            assert resp.status_code == 200
            db_session.refresh(user)
            assert user.status == UserStatus.APPROVED

        # Reject
        for user in users_to_reject:
            resp = admin_client.post(f"{_ADMIN_USERS}/{user.id}/reject", json={"reason": "Raison"})
            assert resp.status_code == 200
            db_session.refresh(user)
            assert user.status == UserStatus.REJECTED

    @pytest.mark.usefixtures("admin_client")
    def test_error_handling_database_error_returns_500(self, db_session: Session):
        from fastapi.testclient import TestClient

        from recyclic_api.main import app
        from recyclic_api.core.database import get_db

        admin_user = db_session.query(User).filter(User.role == UserRole.ADMIN).first()
        assert admin_user is not None
        token = create_access_token(data={"sub": str(admin_user.id)})

        def _broken_get_db():
            raise Exception("Database error")

        app.dependency_overrides[get_db] = _broken_get_db
        try:
            client = TestClient(app, raise_server_exceptions=False)
            resp = client.get(
                f"{_ADMIN_USERS}/pending",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 500
        finally:
            app.dependency_overrides.pop(get_db, None)

    def test_error_handling_user_not_found_returns_404(self, admin_client: TestClient):
        resp = admin_client.post(f"{_ADMIN_USERS}/{uuid.uuid4()}/approve")
        assert resp.status_code == 404

    def test_audit_logging_integration_calls_log_functions(self, admin_client: TestClient, db_session: Session, monkeypatch):
        users = self._make_pending_users(db_session, 1)
        target_user = users[0]

        from recyclic_api.api.api_v1.endpoints import admin as admin_ep
        from recyclic_api.api.api_v1.endpoints import admin_users_read as read_ep

        called_access = {"n": 0}
        called_role = {"n": 0}

        def _log_access(**kwargs):
            called_access["n"] += 1

        def _log_role_change(**kwargs):
            called_role["n"] += 1

        # GET /pending vit dans admin_users_read ; approve/reject dans admin
        monkeypatch.setattr(read_ep, "log_admin_access", _log_access)
        monkeypatch.setattr(admin_ep, "log_admin_access", _log_access)
        monkeypatch.setattr(admin_ep, "log_role_change", _log_role_change)

        # Pending list
        resp = admin_client.get(f"{_ADMIN_USERS}/pending")
        assert resp.status_code == 200
        assert called_access["n"] >= 1

        # Approve
        resp = admin_client.post(f"{_ADMIN_USERS}/{target_user.id}/approve")
        assert resp.status_code == 200
        assert called_role["n"] >= 1

    def test_data_consistency_after_operations_maintains_state(self, admin_client: TestClient, db_session: Session):
        users = self._make_pending_users(db_session, 3)
        target_user = users[0]

        # initial pending count
        resp = admin_client.get(f"{_ADMIN_USERS}/pending")
        assert resp.status_code == 200
        initial_count = len(resp.json())
        assert initial_count >= 3

        # approve one
        resp = admin_client.post(f"{_ADMIN_USERS}/{target_user.id}/approve")
        assert resp.status_code == 200

        # updated pending count
        resp = admin_client.get(f"{_ADMIN_USERS}/pending")
        assert resp.status_code == 200
        updated_count = len(resp.json())
        assert updated_count == initial_count - 1

    @pytest.mark.performance
    def test_performance_with_large_dataset_completes_quickly(self, admin_client: TestClient, db_session: Session):
        # Create many pending users
        bulk = [UserFactory(username=f"user_{i}", status=UserStatus.PENDING) for i in range(100)]
        db_session.add_all(bulk)
        db_session.commit()

        import time
        start = time.time()
        resp = admin_client.get(f"{_ADMIN_USERS}/pending")
        end = time.time()
        assert resp.status_code == 200
        assert end - start < 1.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])