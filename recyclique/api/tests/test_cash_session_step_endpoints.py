import pytest
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy.orm import Session

from recyclic_api.models.cash_session import (
    CashSession,
    CashSessionStatus,
    CashSessionStep as ORMCashSessionStep,
)
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.schemas.cash_session import CashSessionStepUpdate, CashSessionStep
from recyclic_api.core.security import hash_password, create_access_token
from tests.caisse_sale_eligibility import grant_user_caisse_sale_eligibility


def _auth_as(client, user: User) -> None:
    token = create_access_token(data={"sub": str(user.id)})
    client.headers["Authorization"] = f"Bearer {token}"


@pytest.fixture
def test_site(db_session: Session) -> Site:
    site = Site(name="site-step-metrics", address="1 rue test", is_active=True)
    db_session.add(site)
    db_session.commit()
    db_session.refresh(site)
    return site


@pytest.fixture
def test_user(db_session: Session, test_site: Site) -> User:
    user = User(
        username=f"user_step_{uuid4().hex[:12]}",
        hashed_password=hash_password("TestPass1!Aa"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
        is_active=True,
        site_id=test_site.id,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    grant_user_caisse_sale_eligibility(db_session, user, test_site.id)
    return user


@pytest.fixture
def admin_user(db_session: Session, test_site: Site) -> User:
    user = User(
        username=f"admin_step_{uuid4().hex[:12]}",
        hashed_password=hash_password("TestPass1!Aa"),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        is_active=True,
        site_id=test_site.id,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


class TestCashSessionStepEndpoints:
    """Tests pour les endpoints de métriques d'étapes des sessions de caisse."""

    def test_get_session_step_metrics_success(self, client, db_session, test_user, test_site):
        """Test récupération des métriques d'étape avec succès."""
        session = CashSession(
            operator_id=test_user.id,
            site_id=test_site.id,
            initial_amount=50.0,
            current_step=ORMCashSessionStep.ENTRY,
            last_activity=datetime.now(timezone.utc),
            step_start_time=datetime.now(timezone.utc),
        )
        db_session.add(session)
        db_session.commit()

        _auth_as(client, test_user)

        response = client.get(f"/v1/cash-sessions/{session.id}/step")

        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == str(session.id)
        assert data["current_step"] == "ENTRY"
        assert data["step_start_time"] is not None
        assert data["last_activity"] is not None

    def test_get_session_step_metrics_not_found(self, client, test_user):
        """Test récupération des métriques d'une session inexistante."""
        _auth_as(client, test_user)

        fake_session_id = str(uuid4())
        response = client.get(f"/v1/cash-sessions/{fake_session_id}/step")

        assert response.status_code == 404
        assert "non trouvée" in response.json()["detail"]

    def test_get_session_step_metrics_unauthorized(self, client, db_session, test_user, admin_user, test_site):
        """Test accès non autorisé aux métriques d'une autre session."""
        session = CashSession(
            operator_id=admin_user.id,
            site_id=test_site.id,
            initial_amount=50.0,
        )
        db_session.add(session)
        db_session.commit()

        _auth_as(client, test_user)

        response = client.get(f"/v1/cash-sessions/{session.id}/step")

        assert response.status_code == 403
        assert "non autorisé" in response.json()["detail"]

    def test_update_session_step_success(self, client, db_session, test_user, test_site):
        """Test mise à jour de l'étape avec succès."""
        session = CashSession(
            operator_id=test_user.id,
            site_id=test_site.id,
            initial_amount=50.0,
            status=CashSessionStatus.OPEN,
        )
        db_session.add(session)
        db_session.commit()

        _auth_as(client, test_user)

        step_update = CashSessionStepUpdate(step=CashSessionStep.SALE)
        response = client.put(
            f"/v1/cash-sessions/{session.id}/step",
            json=step_update.model_dump(mode="json"),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == str(session.id)
        assert data["current_step"] == "SALE"
        assert data["step_start_time"] is not None
        assert data["last_activity"] is not None

    def test_update_session_step_closed_session(self, client, db_session, test_user, test_site):
        """Test mise à jour de l'étape d'une session fermée."""
        session = CashSession(
            operator_id=test_user.id,
            site_id=test_site.id,
            initial_amount=50.0,
            status=CashSessionStatus.CLOSED,
        )
        db_session.add(session)
        db_session.commit()

        _auth_as(client, test_user)

        step_update = CashSessionStepUpdate(step=CashSessionStep.SALE)
        response = client.put(
            f"/v1/cash-sessions/{session.id}/step",
            json=step_update.model_dump(mode="json"),
        )

        assert response.status_code == 400
        assert "fermée" in response.json()["detail"]

    def test_update_session_step_invalid_step(self, client, db_session, test_user, test_site):
        """Test mise à jour avec une étape invalide."""
        session = CashSession(
            operator_id=test_user.id,
            site_id=test_site.id,
            initial_amount=50.0,
            status=CashSessionStatus.OPEN,
        )
        db_session.add(session)
        db_session.commit()

        _auth_as(client, test_user)

        response = client.put(
            f"/v1/cash-sessions/{session.id}/step",
            json={"step": "invalid_step"},
        )

        assert response.status_code == 422  # Validation error

    def test_update_session_step_unauthorized(self, client, db_session, test_user, admin_user, test_site):
        """Test mise à jour non autorisée d'une session d'un autre utilisateur."""
        session = CashSession(
            operator_id=admin_user.id,
            site_id=test_site.id,
            initial_amount=50.0,
            status=CashSessionStatus.OPEN,
        )
        db_session.add(session)
        db_session.commit()

        _auth_as(client, test_user)

        step_update = CashSessionStepUpdate(step=CashSessionStep.SALE)
        response = client.put(
            f"/v1/cash-sessions/{session.id}/step",
            json=step_update.model_dump(mode="json"),
        )

        assert response.status_code == 403
        assert "non autorisé" in response.json()["detail"]

    def test_session_creation_initializes_step_metrics(self, client, test_user, test_site):
        """La création de session positionne l'étape initiale ; les métriques sont exposées sur GET …/step."""
        _auth_as(client, test_user)

        session_data = {
            "operator_id": str(test_user.id),
            "site_id": str(test_site.id),
            "initial_amount": 75.0,
        }
        response = client.post("/v1/cash-sessions/", json=session_data)

        assert response.status_code == 201
        session_id = response.json()["id"]

        step_r = client.get(f"/v1/cash-sessions/{session_id}/step")
        assert step_r.status_code == 200
        metrics = step_r.json()
        assert metrics["current_step"] == "ENTRY"
        assert metrics["step_start_time"] is not None
        assert metrics["last_activity"] is not None

    def test_step_metrics_include_duration(self, client, db_session, test_user, test_site):
        """Test que les métriques incluent la durée écoulée."""
        session = CashSession(
            operator_id=test_user.id,
            site_id=test_site.id,
            initial_amount=50.0,
        )
        session.set_current_step(ORMCashSessionStep.ENTRY)
        db_session.add(session)
        db_session.commit()

        _auth_as(client, test_user)

        response = client.get(f"/v1/cash-sessions/{session.id}/step")

        assert response.status_code == 200
        data = response.json()

        assert "step_duration_seconds" in data
        assert data["step_duration_seconds"] >= 0

    def test_step_update_preserves_history(self, client, db_session, test_user, test_site):
        """Test que les mises à jour d'étape préservent l'historique."""
        session = CashSession(
            operator_id=test_user.id,
            site_id=test_site.id,
            initial_amount=50.0,
            status=CashSessionStatus.OPEN,
        )
        db_session.add(session)
        db_session.commit()

        _auth_as(client, test_user)

        step_update = CashSessionStepUpdate(step=CashSessionStep.ENTRY)
        response1 = client.put(
            f"/v1/cash-sessions/{session.id}/step",
            json=step_update.model_dump(mode="json"),
        )
        assert response1.status_code == 200

        step_update = CashSessionStepUpdate(step=CashSessionStep.SALE)
        response2 = client.put(
            f"/v1/cash-sessions/{session.id}/step",
            json=step_update.model_dump(mode="json"),
        )
        assert response2.status_code == 200

        data = response2.json()
        assert data["current_step"] == "SALE"

        start_time_1 = response1.json()["step_start_time"]
        start_time_2 = data["step_start_time"]
        assert start_time_2 > start_time_1
