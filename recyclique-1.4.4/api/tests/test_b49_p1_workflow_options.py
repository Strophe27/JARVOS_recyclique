"""Story B49-P1: Tests pour les options de workflow des caisses."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.main import app
from recyclic_api.models.cash_register import CashRegister
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.site import Site
from recyclic_api.core.auth import create_access_token
from recyclic_api.services.cash_register_service import CashRegisterService
from recyclic_api.services.cash_session_service import CashSessionService

client = TestClient(app)


@pytest.fixture
def test_user(db_session: Session):
    """Créer un utilisateur de test."""
    from recyclic_api.core.security import hash_password
    hashed_password = hash_password("testpassword123")

    user = User(
        telegram_id="test_user_b49",
        username="test_admin_b49",
        email="test_b49@example.com",
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
        name="Test Site B49",
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
        name="Test Register B49",
        site_id=test_site.id,
        is_active=True,
        workflow_options={"features": {"no_item_pricing": {"enabled": True}}},
        enable_virtual=True,
        enable_deferred=False
    )
    db_session.add(register)
    db_session.commit()
    db_session.refresh(register)
    return register


class TestCashRegisterWorkflowOptions:
    """Tests pour les options de workflow des caisses."""
    
    def test_create_register_with_workflow_options(self, db_session: Session, test_site: Site):
        """Test création d'un poste de caisse avec options de workflow."""
        service = CashRegisterService(db_session)
        
        from recyclic_api.schemas.cash_register import CashRegisterCreate
        
        data = CashRegisterCreate(
            name="Test Register",
            site_id=str(test_site.id),
            is_active=True,
            workflow_options={"features": {"no_item_pricing": {"enabled": True}}},
            enable_virtual=True,
            enable_deferred=False
        )
        
        register = service.create(data=data)
        
        assert register.name == "Test Register"
        assert register.workflow_options == {"features": {"no_item_pricing": {"enabled": True}}}
        assert register.enable_virtual is True
        assert register.enable_deferred is False
    
    def test_update_register_workflow_options(self, db_session: Session, test_register: CashRegister):
        """Test mise à jour des options de workflow."""
        service = CashRegisterService(db_session)
        
        from recyclic_api.schemas.cash_register import CashRegisterUpdate
        
        update_data = CashRegisterUpdate(
            workflow_options={"features": {"no_item_pricing": {"enabled": False}}},
            enable_virtual=False
        )
        
        updated = service.update(register=test_register, data=update_data)
        
        assert updated.workflow_options == {"features": {"no_item_pricing": {"enabled": False}}}
        assert updated.enable_virtual is False
        assert updated.enable_deferred is False  # Non modifié
    
    def test_register_default_values(self, db_session: Session, test_site: Site):
        """Test que les valeurs par défaut sont correctes (rétrocompatibilité)."""
        service = CashRegisterService(db_session)
        
        from recyclic_api.schemas.cash_register import CashRegisterCreate
        
        data = CashRegisterCreate(
            name="Default Register",
            site_id=str(test_site.id),
            is_active=True
        )
        
        register = service.create(data=data)
        
        # Vérifier les valeurs par défaut
        assert register.workflow_options == {} or register.workflow_options is not None
        assert register.enable_virtual is False
        assert register.enable_deferred is False


class TestCashSessionRegisterOptions:
    """Tests pour la propagation des options de workflow dans les sessions."""
    
    def test_session_includes_register_options(self, db_session: Session, test_user: User, test_site: Site, test_register: CashRegister):
        """Test qu'une session inclut les options du register associé."""
        service = CashSessionService(db_session)
        
        session = service.create_session(
            operator_id=str(test_user.id),
            site_id=str(test_site.id),
            initial_amount=100.0,
            register_id=str(test_register.id)
        )
        
        # Récupérer les options du register
        register_options = service.get_register_options(session)
        
        assert register_options is not None
        assert "features" in register_options
        assert register_options["features"]["no_item_pricing"]["enabled"] is True
    
    def test_session_without_register_has_no_options(self, db_session: Session, test_user: User, test_site: Site):
        """Test qu'une session sans register n'a pas d'options."""
        service = CashSessionService(db_session)
        
        session = service.create_session(
            operator_id=str(test_user.id),
            site_id=str(test_site.id),
            initial_amount=100.0,
            register_id=None
        )
        
        register_options = service.get_register_options(session)
        
        assert register_options is None


class TestCashRegisterAPIEndpoints:
    """Tests pour les endpoints API des postes de caisse."""
    
    def test_get_register_includes_workflow_options(self, client: TestClient, test_user: User, test_register: CashRegister):
        """Test que l'endpoint GET retourne les options de workflow."""
        access_token = create_access_token(data={"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        response = client.get(
            f"/api/v1/cash-registers/{test_register.id}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "workflow_options" in data
        assert "enable_virtual" in data
        assert "enable_deferred" in data
        assert data["enable_virtual"] is True
    
    def test_create_register_via_api(self, client: TestClient, test_user: User, test_site: Site):
        """Test création d'un poste de caisse via API avec options."""
        access_token = create_access_token(data={"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        payload = {
            "name": "API Test Register",
            "site_id": str(test_site.id),
            "is_active": True,
            "workflow_options": {"features": {"no_item_pricing": {"enabled": True}}},
            "enable_virtual": True,
            "enable_deferred": False
        }
        
        response = client.post(
            "/api/v1/cash-registers/",
            json=payload,
            headers=headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "API Test Register"
        assert data["workflow_options"] == {"features": {"no_item_pricing": {"enabled": True}}}
        assert data["enable_virtual"] is True


class TestCashSessionAPIEndpoints:
    """Tests pour les endpoints API des sessions avec register_options."""
    
    def test_get_session_includes_register_options(self, client: TestClient, db_session: Session, test_user: User, test_site: Site, test_register: CashRegister):
        """Test que l'endpoint GET session retourne register_options."""
        service = CashSessionService(db_session)
        
        # Créer une session
        session = service.create_session(
            operator_id=str(test_user.id),
            site_id=str(test_site.id),
            initial_amount=100.0,
            register_id=str(test_register.id)
        )
        
        access_token = create_access_token(data={"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        response = client.get(
            f"/api/v1/cash-sessions/{session.id}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "register_options" in data
        assert data["register_options"] is not None
        assert "features" in data["register_options"]
    
    def test_validate_no_item_pricing_structure(self, db_session: Session, test_site: Site):
        """Test validation de la structure no_item_pricing (Story B49-P2)."""
        from recyclic_api.schemas.cash_register import WorkflowOptions, WorkflowFeatureOption
        
        # Test structure valide
        valid_options = WorkflowOptions(
            features={
                "no_item_pricing": WorkflowFeatureOption(
                    enabled=True,
                    label="Mode prix global (total saisi manuellement, article sans prix)"
                )
            }
        )
        
        assert valid_options.features["no_item_pricing"].enabled is True
        assert valid_options.features["no_item_pricing"].label is not None
        
        # Test structure avec enabled=False
        disabled_options = WorkflowOptions(
            features={
                "no_item_pricing": WorkflowFeatureOption(enabled=False)
            }
        )
        
        assert disabled_options.features["no_item_pricing"].enabled is False
        
        # Test validation depuis dict
        options_dict = {
            "features": {
                "no_item_pricing": {
                    "enabled": True,
                    "label": "Test label"
                }
            }
        }
        
        validated = WorkflowOptions.model_validate(options_dict)
        assert validated.features["no_item_pricing"].enabled is True
        assert validated.features["no_item_pricing"].label == "Test label"

