"""Story B49-P3: Tests pour l'héritage des options de workflow dans les caisses virtuelles et différées."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.main import app
from recyclic_api.models.cash_register import CashRegister
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.site import Site
from recyclic_api.services.cash_register_service import CashRegisterService
from recyclic_api.services.cash_session_service import CashSessionService

client = TestClient(app)


@pytest.fixture
def test_user(db_session: Session):
    """Créer un utilisateur de test."""
    from recyclic_api.core.security import hash_password
    hashed_password = hash_password("testpassword123")

    user = User(
        telegram_id="test_user_b49_p3",
        username="test_admin_b49_p3",
        email="test_b49_p3@example.com",
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
        name="Test Site B49-P3",
        address="123 Test Street"
    )
    db_session.add(site)
    db_session.commit()
    db_session.refresh(site)
    return site


@pytest.fixture
def register_with_virtual(db_session: Session, test_site: Site):
    """Créer un poste de caisse avec enable_virtual=True."""
    register = CashRegister(
        name="Register Virtual",
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


@pytest.fixture
def register_with_deferred(db_session: Session, test_site: Site):
    """Créer un poste de caisse avec enable_deferred=True."""
    register = CashRegister(
        name="Register Deferred",
        site_id=test_site.id,
        is_active=True,
        workflow_options={"features": {"no_item_pricing": {"enabled": True}}},
        enable_virtual=False,
        enable_deferred=True
    )
    db_session.add(register)
    db_session.commit()
    db_session.refresh(register)
    return register


@pytest.fixture
def register_without_flags(db_session: Session, test_site: Site):
    """Créer un poste de caisse sans flags activés (rétrocompatibilité)."""
    register = CashRegister(
        name="Register Standard",
        site_id=test_site.id,
        is_active=True,
        workflow_options={},
        enable_virtual=False,
        enable_deferred=False
    )
    db_session.add(register)
    db_session.commit()
    db_session.refresh(register)
    return register


class TestCashRegisterStatusEndpoint:
    """T11: Tests pour l'endpoint /status qui retourne enable_virtual et enable_deferred."""
    
    def test_status_endpoint_includes_flags(self, admin_client: TestClient, test_user: User, 
                                            register_with_virtual: CashRegister,
                                            register_with_deferred: CashRegister):
        """Test que l'endpoint /status retourne enable_virtual et enable_deferred."""
        response = admin_client.get("/v1/cash-registers/status")
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        registers = data["data"]
        
        # Trouver nos registres dans la liste
        virtual_reg = next((r for r in registers if r["id"] == str(register_with_virtual.id)), None)
        deferred_reg = next((r for r in registers if r["id"] == str(register_with_deferred.id)), None)
        
        assert virtual_reg is not None
        assert deferred_reg is not None
        
        # Vérifier les flags
        assert "enable_virtual" in virtual_reg
        assert "enable_deferred" in virtual_reg
        assert virtual_reg["enable_virtual"] is True
        assert virtual_reg["enable_deferred"] is False
        
        assert "enable_deferred" in deferred_reg
        assert "enable_virtual" in deferred_reg
        assert deferred_reg["enable_deferred"] is True
        assert deferred_reg["enable_virtual"] is False
    
    def test_status_endpoint_filters_by_flags(self, admin_client: TestClient, test_user: User,
                                              register_with_virtual: CashRegister,
                                              register_with_deferred: CashRegister,
                                              register_without_flags: CashRegister):
        """Test que l'endpoint /status retourne tous les registres avec leurs flags."""
        response = admin_client.get("/v1/cash-registers/status")
        
        assert response.status_code == 200
        data = response.json()
        registers = data["data"]
        
        # Vérifier que tous les registres sont présents
        register_ids = [r["id"] for r in registers]
        assert str(register_with_virtual.id) in register_ids
        assert str(register_with_deferred.id) in register_ids
        assert str(register_without_flags.id) in register_ids
        
        # Vérifier les flags pour le registre sans flags
        standard_reg = next((r for r in registers if r["id"] == str(register_without_flags.id)), None)
        assert standard_reg is not None
        assert standard_reg["enable_virtual"] is False
        assert standard_reg["enable_deferred"] is False


class TestSessionOptionsInheritance:
    """T11: Tests pour l'héritage des options dans les sessions."""
    
    def test_session_inherits_options_from_register(self, db_session: Session, test_user: User,
                                                    test_site: Site, register_with_virtual: CashRegister):
        """Test qu'une session hérite des options du register associé."""
        service = CashSessionService(db_session)
        
        session = service.create_session(
            operator_id=str(test_user.id),
            site_id=str(test_site.id),
            initial_amount=100.0,
            register_id=str(register_with_virtual.id)
        )
        
        # Récupérer les options du register
        register_options = service.get_register_options(session)
        
        assert register_options is not None
        assert "features" in register_options
        assert register_options["features"]["no_item_pricing"]["enabled"] is True
    
    def test_session_without_register_has_no_options(self, db_session: Session, test_user: User,
                                                     test_site: Site):
        """Test qu'une session sans register n'a pas d'options (rétrocompatibilité)."""
        service = CashSessionService(db_session)
        
        session = service.create_session(
            operator_id=str(test_user.id),
            site_id=str(test_site.id),
            initial_amount=100.0,
            register_id=None
        )
        
        register_options = service.get_register_options(session)
        
        # Sans register_id, les options peuvent être None ou structure vide
        assert register_options is None or register_options == {} or register_options == {'features': {}}


class TestBackwardCompatibility:
    """T12: Tests de régression - rétrocompatibilité."""
    
    def test_register_without_flags_works_normally(self, db_session: Session, test_user: User,
                                                   test_site: Site, register_without_flags: CashRegister):
        """Test qu'un registre sans flags fonctionne normalement (rétrocompatibilité)."""
        service = CashSessionService(db_session)
        
        # Créer une session avec un registre sans flags
        session = service.create_session(
            operator_id=str(test_user.id),
            site_id=str(test_site.id),
            initial_amount=100.0,
            register_id=str(register_without_flags.id)
        )
        
        assert session is not None
        assert session.register_id == register_without_flags.id
        
        # Les options doivent être vides ou None
        register_options = service.get_register_options(session)
        # Si le registre a workflow_options={}, get_register_options peut retourner {} ou None
        # Les deux sont acceptables pour la rétrocompatibilité
        # Acceptable: None, {} vide, ou {'features': {}} (structure vide)
        assert register_options is None or register_options == {} or register_options == {'features': {}}
    
    def test_register_default_values_are_false(self, db_session: Session, test_site: Site):
        """Test que les valeurs par défaut des flags sont False (rétrocompatibilité)."""
        service = CashRegisterService(db_session)
        
        from recyclic_api.schemas.cash_register import CashRegisterCreate
        
        data = CashRegisterCreate(
            name="Default Register",
            site_id=str(test_site.id),
            is_active=True
        )
        
        register = service.create(data=data)
        
        # Vérifier les valeurs par défaut
        assert register.enable_virtual is False
        assert register.enable_deferred is False
        assert register.workflow_options == {} or register.workflow_options is not None
    
    def test_session_works_without_register_options(self, db_session: Session, test_user: User,
                                                     test_site: Site, register_without_flags: CashRegister):
        """Test qu'une session fonctionne même si le registre n'a pas d'options."""
        service = CashSessionService(db_session)
        
        session = service.create_session(
            operator_id=str(test_user.id),
            site_id=str(test_site.id),
            initial_amount=100.0,
            register_id=str(register_without_flags.id)
        )
        
        # La session doit être créée normalement
        assert session is not None
        assert session.status == CashSessionStatus.OPEN
        
        # Les options peuvent être vides, mais la session doit fonctionner
        register_options = service.get_register_options(session)
        # Acceptable: None, {} vide, ou {'features': {}} (structure vide)
        assert register_options is None or register_options == {} or register_options == {'features': {}}


class TestAPIEndpointsIntegration:
    """T11: Tests d'intégration pour les endpoints API."""
    
    def test_get_register_status_includes_flags(self, admin_client: TestClient, test_user: User,
                                               register_with_virtual: CashRegister):
        """Test que l'endpoint GET /status inclut les flags enable_virtual/enable_deferred."""
        response = admin_client.get("/v1/cash-registers/status")
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        
        # Trouver notre registre
        registers = data["data"]
        reg = next((r for r in registers if r["id"] == str(register_with_virtual.id)), None)
        
        assert reg is not None
        assert "enable_virtual" in reg
        assert "enable_deferred" in reg
        assert reg["enable_virtual"] is True
    
    def test_create_register_with_flags(self, admin_client: TestClient, test_user: User, test_site: Site):
        """Test création d'un registre avec enable_virtual et enable_deferred."""
        payload = {
            "name": "Test Register Flags",
            "site_id": str(test_site.id),
            "is_active": True,
            "workflow_options": {"features": {"no_item_pricing": {"enabled": True}}},
            "enable_virtual": True,
            "enable_deferred": True
        }
        
        response = admin_client.post("/v1/cash-registers/", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        assert data["enable_virtual"] is True
        assert data["enable_deferred"] is True
        assert data["workflow_options"]["features"]["no_item_pricing"]["enabled"] is True
    
    def test_update_register_flags(self, admin_client: TestClient, test_user: User,
                                   register_without_flags: CashRegister):
        """Test mise à jour des flags enable_virtual et enable_deferred."""
        payload = {
            "enable_virtual": True,
            "enable_deferred": False
        }
        
        response = admin_client.patch(
            f"/v1/cash-registers/{register_without_flags.id}",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["enable_virtual"] is True
        assert data["enable_deferred"] is False

