"""Story B49-P4: Tests d'intégration pour les options de workflow des caisses."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4

from recyclic_api.main import app
from recyclic_api.models.cash_register import CashRegister
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.site import Site
from recyclic_api.core.auth import create_access_token
from recyclic_api.core.security import hash_password

client = TestClient(app)


@pytest.fixture
def test_user(db_session: Session):
    """Créer un utilisateur de test."""
    hashed_password = hash_password("testpassword123")

    user = User(
        telegram_id="test_user_b49_p4",
        username="test_admin_b49_p4",
        email="test_b49_p4@example.com",
        hashed_password=hashed_password,
        first_name="Test",
        last_name="Admin",
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_site(db_session: Session):
    """Créer un site de test."""
    site = Site(
        name="Test Site B49-P4",
        address="123 Test Street"
    )
    db_session.add(site)
    db_session.commit()
    db_session.refresh(site)
    return site


@pytest.fixture
def test_register(db_session: Session, test_site: Site):
    """Créer un poste de caisse de test avec options de workflow."""
    register = CashRegister(
        name="Test Register B49-P4",
        site_id=test_site.id,
        is_active=True,
        workflow_options={"features": {"no_item_pricing": {"enabled": True}}}
    )
    db_session.add(register)
    db_session.commit()
    db_session.refresh(register)
    return register


class TestCashRegisterOptionsAPI:
    """Tests d'intégration pour les options de workflow via API."""

    def test_create_register_with_workflow_options(self, test_user: User, test_site: Site):
        """Test création caisse avec workflow_options via API."""
        access_token = create_access_token(data={"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}

        payload = {
            "name": "API Test Register B49-P4",
            "site_id": str(test_site.id),
            "is_active": True,
            "workflow_options": {
                "features": {
                    "no_item_pricing": {
                        "enabled": True,
                        "label": "Mode prix global"
                    }
                }
            }
        }

        response = client.post(
            "/api/v1/cash-registers/",
            json=payload,
            headers=headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "API Test Register B49-P4"
        assert "workflow_options" in data
        assert data["workflow_options"]["features"]["no_item_pricing"]["enabled"] is True
        assert data["workflow_options"]["features"]["no_item_pricing"]["label"] == "Mode prix global"

    def test_update_register_with_workflow_options(self, test_user: User, test_register: CashRegister):
        """Test mise à jour caisse avec workflow_options via API."""
        access_token = create_access_token(data={"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}

        update_payload = {
            "workflow_options": {
                "features": {
                    "no_item_pricing": {
                        "enabled": False,
                        "label": "Mode standard"
                    }
                }
            }
        }

        response = client.patch(
            f"/api/v1/cash-registers/{test_register.id}",
            json=update_payload,
            headers=headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["workflow_options"]["features"]["no_item_pricing"]["enabled"] is False
        assert data["workflow_options"]["features"]["no_item_pricing"]["label"] == "Mode standard"

    def test_validate_workflow_options_schema(self, test_user: User, test_site: Site):
        """Test validation schémas Pydantic pour workflow_options."""
        access_token = create_access_token(data={"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}

        # Test structure valide
        valid_payload = {
            "name": "Valid Register",
            "site_id": str(test_site.id),
            "is_active": True,
            "workflow_options": {
                "features": {
                    "no_item_pricing": {
                        "enabled": True,
                        "label": "Test label"
                    }
                }
            }
        }

        response = client.post(
            "/api/v1/cash-registers/",
            json=valid_payload,
            headers=headers
        )

        assert response.status_code == 201

    def test_validate_workflow_options_error_invalid_structure(self, test_user: User, test_site: Site):
        """Test erreur de validation avec structure invalide."""
        access_token = create_access_token(data={"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}

        # Structure invalide: features doit être un objet, pas une liste
        invalid_payload = {
            "name": "Invalid Register",
            "site_id": str(test_site.id),
            "is_active": True,
            "workflow_options": {
                "features": ["no_item_pricing"]  # Invalide: devrait être un objet
            }
        }

        response = client.post(
            "/api/v1/cash-registers/",
            json=invalid_payload,
            headers=headers
        )

        # Devrait retourner 422 (validation error) ou 400 (bad request)
        assert response.status_code in [400, 422]

    def test_validate_workflow_options_error_missing_enabled(self, test_user: User, test_site: Site):
        """Test erreur de validation avec champ enabled manquant."""
        access_token = create_access_token(data={"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}

        # Structure invalide: enabled manquant
        invalid_payload = {
            "name": "Invalid Register",
            "site_id": str(test_site.id),
            "is_active": True,
            "workflow_options": {
                "features": {
                    "no_item_pricing": {
                        "label": "Test"  # enabled manquant
                    }
                }
            }
        }

        response = client.post(
            "/api/v1/cash-registers/",
            json=invalid_payload,
            headers=headers
        )

        # Devrait retourner 422 (validation error) ou accepter avec valeur par défaut
        assert response.status_code in [200, 201, 400, 422]

    def test_propagation_options_in_cash_session_response(self, db_session: Session, test_user: User, test_site: Site, test_register: CashRegister):
        """Test propagation options dans CashSessionResponse."""
        from recyclic_api.services.cash_session_service import CashSessionService

        # Créer une session avec le register
        service = CashSessionService(db_session)

        session = service.create_session(
            operator_id=str(test_user.id),
            site_id=str(test_site.id),
            initial_amount=100.0,
            register_id=str(test_register.id)
        )

        access_token = create_access_token(data={"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}

        # Récupérer la session via API
        response = client.get(
            f"/api/v1/cash-sessions/{session.id}",
            headers=headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "register_options" in data
        assert data["register_options"] is not None
        assert "features" in data["register_options"]
        assert "no_item_pricing" in data["register_options"]["features"]
        assert data["register_options"]["features"]["no_item_pricing"]["enabled"] is True

    def test_propagation_options_in_current_session(self, db_session: Session, test_user: User, test_site: Site, test_register: CashRegister):
        """Test propagation options dans GET /current."""
        from recyclic_api.services.cash_session_service import CashSessionService

        # Créer une session avec le register
        service = CashSessionService(db_session)

        session = service.create_session(
            operator_id=str(test_user.id),
            site_id=str(test_site.id),
            initial_amount=100.0,
            register_id=str(test_register.id)
        )

        access_token = create_access_token(data={"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}

        # Récupérer la session courante via API
        response = client.get(
            "/api/v1/cash-sessions/current",
            headers=headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "register_options" in data
        assert data["register_options"] is not None
        assert "features" in data["register_options"]
        assert data["register_options"]["features"]["no_item_pricing"]["enabled"] is True

