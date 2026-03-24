"""
Tests pour l'endpoint PATCH /api/v1/sales/{sale_id}/items/{item_id}
Story B52-P4: Amélioration éditeur d'item (destination et prix)
"""

import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.main import app
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.site import Site
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.cash_register import CashRegister
from recyclic_api.models.sale import Sale
from recyclic_api.models.sale_item import SaleItem
from recyclic_api.core.security import create_access_token, hash_password


class TestUpdateSaleItem:
    """Tests pour l'endpoint PATCH /sales/{sale_id}/items/{item_id}"""

    @pytest.fixture
    def client(self):
        """Client de test FastAPI"""
        return TestClient(app)

    @pytest.fixture
    def test_user(self):
        """Utilisateur standard pour les tests"""
        return {
            "id": uuid.uuid4(),
            "username": "test_user",
            "hashed_password": hash_password("testpass"),
            "role": UserRole.USER,
            "status": UserStatus.ACTIVE,
            "is_active": True
        }

    @pytest.fixture
    def test_admin(self):
        """Administrateur pour les tests"""
        return {
            "id": uuid.uuid4(),
            "username": "test_admin",
            "hashed_password": hash_password("testpass"),
            "role": UserRole.ADMIN,
            "status": UserStatus.ACTIVE,
            "is_active": True
        }

    @pytest.fixture
    def test_site(self):
        """Site de test"""
        return {
            "id": uuid.uuid4(),
            "name": "Test Site",
            "address": "123 Test Street",
            "city": "Test City",
            "postal_code": "12345",
            "country": "France"
        }

    @pytest.fixture
    def test_cash_register(self, test_site):
        """Poste de caisse de test"""
        return {
            "id": uuid.uuid4(),
            "name": "Test Register",
            "location": "Test Location",
            "site_id": test_site["id"],
            "is_active": True
        }

    @pytest.fixture
    def test_cash_session(self, test_user, test_site, test_cash_register):
        """Session de caisse de test"""
        return {
            "id": uuid.uuid4(),
            "operator_id": test_user["id"],
            "site_id": test_site["id"],
            "register_id": test_cash_register["id"],
            "initial_amount": 100.0,
            "current_amount": 100.0,
            "status": CashSessionStatus.OPEN
        }

    @pytest.fixture
    def test_sale(self, test_cash_session, test_user):
        """Vente de test"""
        return {
            "id": uuid.uuid4(),
            "cash_session_id": test_cash_session["id"],
            "operator_id": test_user["id"],
            "total_amount": 50.0,
            "donation": 0.0
        }

    @pytest.fixture
    def test_sale_item(self, test_sale):
        """Item de vente de test"""
        return {
            "id": uuid.uuid4(),
            "sale_id": test_sale["id"],
            "category": "EEE-1",
            "quantity": 2,
            "weight": 1.5,
            "unit_price": 10.0,
            "total_price": 10.0,
            "preset_id": None,
            "notes": None
        }

    @pytest.fixture
    def user_token(self, test_user):
        """Token JWT pour utilisateur standard"""
        return create_access_token(data={"sub": str(test_user["id"])})

    @pytest.fixture
    def admin_token(self, test_admin):
        """Token JWT pour administrateur"""
        return create_access_token(data={"sub": str(test_admin["id"])})

    def test_update_sale_item_preset_success(self, client: TestClient, test_user, test_site, 
                                             test_cash_register, test_cash_session, test_sale, 
                                             test_sale_item, user_token, db_session):
        """Test de mise à jour du preset d'un item (utilisateur standard)"""
        # Créer les données en base
        user = User(**test_user)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)
        sale = Sale(**test_sale)
        sale_item = SaleItem(**test_sale_item)
        
        db_session.add_all([user, site, cash_register, cash_session, sale, sale_item])
        db_session.commit()

        # Mettre à jour le preset
        preset_id = uuid.uuid4()
        response = client.patch(
            f"/api/v1/sales/{test_sale['id']}/items/{test_sale_item['id']}",
            json={"preset_id": str(preset_id)},
            headers={"Authorization": f"Bearer {user_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["preset_id"] == str(preset_id)

    def test_update_sale_item_price_admin_success(self, client: TestClient, test_admin, test_user, 
                                                   test_site, test_cash_register, test_cash_session, 
                                                   test_sale, test_sale_item, admin_token, db_session):
        """Test de mise à jour du prix d'un item (admin)"""
        # Créer les données en base
        admin = User(**test_admin)
        user = User(**test_user)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)
        sale = Sale(**test_sale)
        sale_item = SaleItem(**test_sale_item)
        
        db_session.add_all([admin, user, site, cash_register, cash_session, sale, sale_item])
        db_session.commit()

        # Mettre à jour le prix
        new_price = 15.0
        response = client.patch(
            f"/api/v1/sales/{test_sale['id']}/items/{test_sale_item['id']}",
            json={"unit_price": new_price},
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["unit_price"] == new_price
        assert data["total_price"] == new_price  # total_price = unit_price

    def test_update_sale_item_price_user_forbidden(self, client: TestClient, test_user, test_site, 
                                                    test_cash_register, test_cash_session, test_sale, 
                                                    test_sale_item, user_token, db_session):
        """Test que les utilisateurs non-admin ne peuvent pas modifier le prix"""
        # Créer les données en base
        user = User(**test_user)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)
        sale = Sale(**test_sale)
        sale_item = SaleItem(**test_sale_item)
        
        db_session.add_all([user, site, cash_register, cash_session, sale, sale_item])
        db_session.commit()

        # Tentative de mise à jour du prix par un utilisateur standard
        response = client.patch(
            f"/api/v1/sales/{test_sale['id']}/items/{test_sale_item['id']}",
            json={"unit_price": 15.0},
            headers={"Authorization": f"Bearer {user_token}"}
        )

        assert response.status_code == 403
        assert "Admin access required" in response.json()["detail"]

    def test_update_sale_item_quantity_success(self, client: TestClient, test_user, test_site, 
                                               test_cash_register, test_cash_session, test_sale, 
                                               test_sale_item, user_token, db_session):
        """Test de mise à jour de la quantité d'un item"""
        # Créer les données en base
        user = User(**test_user)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)
        sale = Sale(**test_sale)
        sale_item = SaleItem(**test_sale_item)
        
        db_session.add_all([user, site, cash_register, cash_session, sale, sale_item])
        db_session.commit()

        # Mettre à jour la quantité
        new_quantity = 5
        response = client.patch(
            f"/api/v1/sales/{test_sale['id']}/items/{test_sale_item['id']}",
            json={"quantity": new_quantity},
            headers={"Authorization": f"Bearer {user_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["quantity"] == new_quantity

    def test_update_sale_item_weight_success(self, client: TestClient, test_user, test_site, 
                                             test_cash_register, test_cash_session, test_sale, 
                                             test_sale_item, user_token, db_session):
        """Test de mise à jour du poids d'un item"""
        # Créer les données en base
        user = User(**test_user)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)
        sale = Sale(**test_sale)
        sale_item = SaleItem(**test_sale_item)
        
        db_session.add_all([user, site, cash_register, cash_session, sale, sale_item])
        db_session.commit()

        # Mettre à jour le poids
        new_weight = 2.5
        response = client.patch(
            f"/api/v1/sales/{test_sale['id']}/items/{test_sale_item['id']}",
            json={"weight": new_weight},
            headers={"Authorization": f"Bearer {user_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["weight"] == new_weight

    def test_update_sale_item_notes_success(self, client: TestClient, test_user, test_site, 
                                            test_cash_register, test_cash_session, test_sale, 
                                            test_sale_item, user_token, db_session):
        """Test de mise à jour des notes d'un item"""
        # Créer les données en base
        user = User(**test_user)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)
        sale = Sale(**test_sale)
        sale_item = SaleItem(**test_sale_item)
        
        db_session.add_all([user, site, cash_register, cash_session, sale, sale_item])
        db_session.commit()

        # Mettre à jour les notes
        new_notes = "Item modifié"
        response = client.patch(
            f"/api/v1/sales/{test_sale['id']}/items/{test_sale_item['id']}",
            json={"notes": new_notes},
            headers={"Authorization": f"Bearer {user_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["notes"] == new_notes

    def test_update_sale_item_price_negative_forbidden(self, client: TestClient, test_admin, test_user, 
                                                        test_site, test_cash_register, test_cash_session, 
                                                        test_sale, test_sale_item, admin_token, db_session):
        """Test que le prix ne peut pas être négatif"""
        # Créer les données en base
        admin = User(**test_admin)
        user = User(**test_user)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)
        sale = Sale(**test_sale)
        sale_item = SaleItem(**test_sale_item)
        
        db_session.add_all([admin, user, site, cash_register, cash_session, sale, sale_item])
        db_session.commit()

        # Tentative de mise à jour avec prix négatif
        response = client.patch(
            f"/api/v1/sales/{test_sale['id']}/items/{test_sale_item['id']}",
            json={"unit_price": -10.0},
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 400
        assert "must be >= 0" in response.json()["detail"]

    def test_update_sale_item_not_found(self, client: TestClient, test_user, user_token, db_session):
        """Test que l'item non trouvé retourne 404"""
        user = User(**test_user)
        db_session.add(user)
        db_session.commit()

        fake_sale_id = uuid.uuid4()
        fake_item_id = uuid.uuid4()

        response = client.patch(
            f"/api/v1/sales/{fake_sale_id}/items/{fake_item_id}",
            json={"quantity": 5},
            headers={"Authorization": f"Bearer {user_token}"}
        )

        assert response.status_code == 404

    def test_update_sale_item_unauthorized(self, client: TestClient, test_user, test_site, 
                                           test_cash_register, test_cash_session, test_sale, 
                                           test_sale_item, db_session):
        """Test que l'accès sans token retourne 401"""
        # Créer les données en base
        user = User(**test_user)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)
        sale = Sale(**test_sale)
        sale_item = SaleItem(**test_sale_item)
        
        db_session.add_all([user, site, cash_register, cash_session, sale, sale_item])
        db_session.commit()

        # Tentative sans token
        response = client.patch(
            f"/api/v1/sales/{test_sale['id']}/items/{test_sale_item['id']}",
            json={"quantity": 5}
        )

        assert response.status_code == 401



