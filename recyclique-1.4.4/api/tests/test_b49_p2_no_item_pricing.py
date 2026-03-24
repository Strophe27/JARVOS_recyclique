"""
Story B49-P2: Tests pour le mode prix global (no_item_pricing).

Tests API pour :
- Enregistrement ventes avec total_amount override
- Items à 0€ acceptés
- Validation si total_amount < sous-total
- Tests régression workflow standard
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.main import app
from recyclic_api.models.cash_register import CashRegister
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.site import Site
from recyclic_api.core.security import hash_password, create_access_token
from recyclic_api.services.cash_session_service import CashSessionService

client = TestClient(app)


@pytest.fixture
def test_user(db_session: Session):
    """Créer un utilisateur de test."""
    hashed_password = hash_password("testpassword123")
    user = User(
        telegram_id="test_user_b49_p2",
        username="test_user_b49_p2",
        email="test_b49_p2@example.com",
        hashed_password=hashed_password,
        first_name="Test",
        last_name="User",
        role=UserRole.USER,
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
        name="Test Site B49-P2",
        address="123 Test Street"
    )
    db_session.add(site)
    db_session.commit()
    db_session.refresh(site)
    return site


@pytest.fixture
def test_register_with_no_item_pricing(db_session: Session, test_site: Site):
    """Créer un poste de caisse avec mode prix global activé."""
    register = CashRegister(
        name="Test Register B49-P2",
        site_id=test_site.id,
        is_active=True,
        workflow_options={"features": {"no_item_pricing": {"enabled": True}}},
        enable_virtual=False,
        enable_deferred=False
    )
    db_session.add(register)
    db_session.commit()
    db_session.refresh(register)
    return register


@pytest.fixture
def test_register_standard(db_session: Session, test_site: Site):
    """Créer un poste de caisse standard (sans mode prix global)."""
    register = CashRegister(
        name="Test Register Standard",
        site_id=test_site.id,
        is_active=True,
        workflow_options={},  # Pas d'options
        enable_virtual=False,
        enable_deferred=False
    )
    db_session.add(register)
    db_session.commit()
    db_session.refresh(register)
    return register


@pytest.fixture
def test_session_with_no_item_pricing(db_session: Session, test_user: User, test_site: Site, test_register_with_no_item_pricing: CashRegister):
    """Créer une session avec mode prix global."""
    service = CashSessionService(db_session)
    session = service.create_session(
        operator_id=str(test_user.id),
        site_id=str(test_site.id),
        initial_amount=100.0,
        register_id=str(test_register_with_no_item_pricing.id)
    )
    return session


@pytest.fixture
def test_session_standard(db_session: Session, test_user: User, test_site: Site, test_register_standard: CashRegister):
    """Créer une session standard."""
    service = CashSessionService(db_session)
    session = service.create_session(
        operator_id=str(test_user.id),
        site_id=str(test_site.id),
        initial_amount=100.0,
        register_id=str(test_register_standard.id)
    )
    return session


@pytest.fixture
def user_token(test_user: User):
    """Token JWT pour l'utilisateur."""
    return create_access_token(data={"sub": str(test_user.id)})


class TestNoItemPricingMode:
    """Tests pour le mode prix global (no_item_pricing)."""
    
    def test_create_sale_with_total_override(self, db_session: Session, test_user: User, test_session_with_no_item_pricing: CashSession, user_token: str):
        """Test enregistrement vente avec total_amount override (différent de la somme des items)."""
        sale_data = {
            "cash_session_id": str(test_session_with_no_item_pricing.id),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 2.5,
                    "unit_price": 0.0,
                    "total_price": 0.0  # Item à 0€
                },
                {
                    "category": "EEE-2",
                    "quantity": 1,
                    "weight": 1.0,
                    "unit_price": 0.0,
                    "total_price": 0.0  # Item à 0€
                }
            ],
            "total_amount": 25.0,  # Total négocié globalement (différent de 0+0)
            "donation": 0.0,
            "payment_method": "cash"
        }
        
        response = client.post(
            "/api/v1/sales/",
            json=sale_data,
            headers={"Authorization": f"Bearer {user_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_amount"] == 25.0  # Le total override est bien enregistré
        assert len(data["items"]) == 2
        assert data["items"][0]["total_price"] == 0.0
        assert data["items"][1]["total_price"] == 0.0
    
    def test_create_sale_with_items_at_zero_euro(self, db_session: Session, test_user: User, test_session_with_no_item_pricing: CashSession, user_token: str):
        """Test que les items à 0€ sont acceptés."""
        sale_data = {
            "cash_session_id": str(test_session_with_no_item_pricing.id),
            "items": [
                {
                    "category": "EEE-3",
                    "quantity": 1,
                    "weight": 3.0,
                    "unit_price": 0.0,
                    "total_price": 0.0
                }
            ],
            "total_amount": 0.0,  # Total à 0€ accepté
            "donation": 0.0,
            "payment_method": "cash"
        }
        
        response = client.post(
            "/api/v1/sales/",
            json=sale_data,
            headers={"Authorization": f"Bearer {user_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_amount"] == 0.0
        assert data["items"][0]["total_price"] == 0.0
    
    def test_create_sale_with_mixed_items(self, db_session: Session, test_user: User, test_session_with_no_item_pricing: CashSession, user_token: str):
        """Test vente avec items à 0€ et items avec prix."""
        sale_data = {
            "cash_session_id": str(test_session_with_no_item_pricing.id),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 2.0,
                    "unit_price": 0.0,
                    "total_price": 0.0  # Item à 0€
                },
                {
                    "category": "EEE-2",
                    "quantity": 1,
                    "weight": 1.5,
                    "unit_price": 15.0,
                    "total_price": 15.0  # Item avec prix
                }
            ],
            "total_amount": 20.0,  # Total >= sous-total (15.0)
            "donation": 0.0,
            "payment_method": "cash"
        }
        
        response = client.post(
            "/api/v1/sales/",
            json=sale_data,
            headers={"Authorization": f"Bearer {user_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_amount"] == 20.0
        assert data["items"][0]["total_price"] == 0.0
        assert data["items"][1]["total_price"] == 15.0
    
    def test_create_sale_total_less_than_subtotal_fails(self, db_session: Session, test_user: User, test_session_with_no_item_pricing: CashSession, user_token: str):
        """Test validation si total_amount < sous-total (doit échouer)."""
        sale_data = {
            "cash_session_id": str(test_session_with_no_item_pricing.id),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 2.0,
                    "unit_price": 20.0,
                    "total_price": 20.0  # Sous-total = 20.0
                }
            ],
            "total_amount": 15.0,  # Total < sous-total (invalide)
            "donation": 0.0,
            "payment_method": "cash"
        }
        
        response = client.post(
            "/api/v1/sales/",
            json=sale_data,
            headers={"Authorization": f"Bearer {user_token}"}
        )
        
        assert response.status_code == 400
        assert "ne peut pas être inférieur au sous-total" in response.json()["detail"]
    
    def test_create_sale_total_equal_to_subtotal_succeeds(self, db_session: Session, test_user: User, test_session_with_no_item_pricing: CashSession, user_token: str):
        """Test que total_amount = sous-total est accepté."""
        sale_data = {
            "cash_session_id": str(test_session_with_no_item_pricing.id),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 2.0,
                    "unit_price": 20.0,
                    "total_price": 20.0
                }
            ],
            "total_amount": 20.0,  # Total = sous-total (valide)
            "donation": 0.0,
            "payment_method": "cash"
        }
        
        response = client.post(
            "/api/v1/sales/",
            json=sale_data,
            headers={"Authorization": f"Bearer {user_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_amount"] == 20.0


class TestStandardWorkflowRegression:
    """Tests de régression pour vérifier que le workflow standard fonctionne toujours."""
    
    def test_standard_workflow_unchanged(self, db_session: Session, test_user: User, test_session_standard: CashSession, user_token: str):
        """Test que le workflow standard fonctionne comme avant (rétrocompatibilité)."""
        sale_data = {
            "cash_session_id": str(test_session_standard.id),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 2.0,
                    "unit_price": 10.0,
                    "total_price": 10.0
                }
            ],
            "total_amount": 10.0,  # Total = somme des items (comportement standard)
            "donation": 0.0,
            "payment_method": "cash"
        }
        
        response = client.post(
            "/api/v1/sales/",
            json=sale_data,
            headers={"Authorization": f"Bearer {user_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_amount"] == 10.0
        assert data["items"][0]["total_price"] == 10.0
    
    def test_standard_workflow_total_override_still_works(self, db_session: Session, test_user: User, test_session_standard: CashSession, user_token: str):
        """Test que même en workflow standard, on peut override le total (si >= sous-total)."""
        sale_data = {
            "cash_session_id": str(test_session_standard.id),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 2.0,
                    "unit_price": 10.0,
                    "total_price": 10.0
                }
            ],
            "total_amount": 15.0,  # Total > sous-total (valide même en workflow standard)
            "donation": 0.0,
            "payment_method": "cash"
        }
        
        response = client.post(
            "/api/v1/sales/",
            json=sale_data,
            headers={"Authorization": f"Bearer {user_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_amount"] == 15.0  # Le total override est accepté
    
    def test_standard_workflow_total_less_than_subtotal_fails(self, db_session: Session, test_user: User, test_session_standard: CashSession, user_token: str):
        """Test que la validation fonctionne aussi en workflow standard."""
        sale_data = {
            "cash_session_id": str(test_session_standard.id),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 2.0,
                    "unit_price": 10.0,
                    "total_price": 10.0
                }
            ],
            "total_amount": 5.0,  # Total < sous-total (invalide)
            "donation": 0.0,
            "payment_method": "cash"
        }
        
        response = client.post(
            "/api/v1/sales/",
            json=sale_data,
            headers={"Authorization": f"Bearer {user_token}"}
        )
        
        assert response.status_code == 400
        assert "ne peut pas être inférieur au sous-total" in response.json()["detail"]


