"""Story B49-P1: Tests d'intégration pour vérifier register_options dans tous les endpoints."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.main import app
from recyclic_api.models.cash_register import CashRegister
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.site import Site
from recyclic_api.core.auth import create_access_token

client = TestClient(app)


@pytest.fixture
def test_user(db_session: Session):
    """Créer un utilisateur de test."""
    from recyclic_api.core.security import hash_password
    hashed_password = hash_password("testpassword123")

    user = User(
        telegram_id="test_user_b49_integration",
        username="test_admin_b49_integration",
        email="test_b49_integration@example.com",
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
        name="Test Site B49 Integration",
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
        name="Test Register B49 Integration",
        site_id=test_site.id,
        is_active=True,
        workflow_options={"features": {"no_item_pricing": {"enabled": True, "label": "Mode prix global"}}},
        enable_virtual=True,
        enable_deferred=False
    )
    db_session.add(register)
    db_session.commit()
    db_session.refresh(register)
    return register


@pytest.fixture
def test_session(db_session: Session, test_user: User, test_site: Site, test_register: CashRegister):
    """Créer une session de caisse de test."""
    from recyclic_api.services.cash_session_service import CashSessionService
    service = CashSessionService(db_session)
    
    session = service.create_session(
        operator_id=str(test_user.id),
        site_id=str(test_site.id),
        initial_amount=100.0,
        register_id=str(test_register.id)
    )
    return session


class TestIntegrationRegisterOptions:
    """Tests d'intégration pour vérifier register_options dans tous les endpoints."""
    
    def test_get_current_session_includes_register_options(self, client: TestClient, test_user: User, test_session: CashSession):
        """Test que GET /current retourne register_options."""
        access_token = create_access_token(data={"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        response = client.get("/api/v1/cash-sessions/current", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "register_options" in data
        assert data["register_options"] is not None
        assert "features" in data["register_options"]
        assert "no_item_pricing" in data["register_options"]["features"]
        assert data["register_options"]["features"]["no_item_pricing"]["enabled"] is True
    
    def test_get_session_by_id_includes_register_options(self, client: TestClient, test_user: User, test_session: CashSession):
        """Test que GET /{id} retourne register_options."""
        access_token = create_access_token(data={"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        response = client.get(f"/api/v1/cash-sessions/{test_session.id}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "register_options" in data
        assert data["register_options"] is not None
        assert "features" in data["register_options"]
    
    def test_update_session_preserves_register_options(self, client: TestClient, test_user: User, test_session: CashSession):
        """Test que PUT /{id} préserve register_options dans la réponse."""
        access_token = create_access_token(data={"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        update_data = {
            "current_amount": 150.0
        }
        
        response = client.put(
            f"/api/v1/cash-sessions/{test_session.id}",
            json=update_data,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "register_options" in data
        assert data["register_options"] is not None
        assert data["current_amount"] == 150.0
    
    def test_close_session_includes_register_options(self, client: TestClient, test_user: User, test_session: CashSession, db_session: Session):
        """Test que POST /{id}/close retourne register_options."""
        # Ajouter une vente pour que la session ne soit pas vide
        from recyclic_api.models.sale import Sale, PaymentMethod
        sale = Sale(
            cash_session_id=test_session.id,
            operator_id=test_user.id,
            total_amount=25.0,
            donation=0.0,
            payment_method=PaymentMethod.CASH
        )
        db_session.add(sale)
        db_session.commit()
        
        access_token = create_access_token(data={"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        close_data = {
            "actual_amount": 125.0,
            "variance_comment": None
        }
        
        response = client.post(
            f"/api/v1/cash-sessions/{test_session.id}/close",
            json=close_data,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "register_options" in data
        assert data["register_options"] is not None
        assert data["status"] == "closed"
    
    def test_list_sessions_includes_register_options(self, client: TestClient, test_user: User, test_session: CashSession):
        """Test que GET / retourne register_options pour chaque session."""
        access_token = create_access_token(data={"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        response = client.get("/api/v1/cash-sessions/", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert len(data["data"]) > 0
        
        # Vérifier que la première session a register_options
        first_session = data["data"][0]
        assert "register_options" in first_session
        assert first_session["register_options"] is not None


