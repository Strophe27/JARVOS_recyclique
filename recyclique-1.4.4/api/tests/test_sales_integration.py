"""
Tests d'intégration pour l'endpoint POST /sales
Story 5.2 - Interface Vente Multi-Modes
"""

import pytest
import uuid
import time
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from recyclic_api.main import app
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.site import Site
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.cash_register import CashRegister
from recyclic_api.core.security import create_access_token


class TestSalesIntegration:
    """Tests d'intégration pour l'endpoint POST /sales"""

    @pytest.fixture
    def client(self):
        """Client de test FastAPI"""
        return TestClient(app)

    @pytest.fixture
    def test_cashier(self, client):
        """Données de test pour un caissier"""
        return {
            "id": uuid.uuid4(),
            "username": "test_cashier",
            "hashed_password": "hashed_password",
    "role": UserRole.USER,
            "status": UserStatus.APPROVED,
            "is_active": True
        }

    @pytest.fixture
    def test_site(self, client):
        """Données de test pour un site"""
        return {
            "id": uuid.uuid4(),
            "name": "Test Site",
            "address": "123 Test Street",
            "city": "Test City",
            "postal_code": "12345",
            "country": "France"
        }

    @pytest.fixture
    def test_cash_register(self, client, test_site):
        """Données de test pour un poste de caisse"""
        return {
            "id": uuid.uuid4(),
            "name": "Test Register",
            "location": "Test Location",
            "site_id": str(test_site["id"]),
            "is_active": True
        }

    @pytest.fixture
    def test_cash_session(self, client, test_cashier, test_site, test_cash_register):
        """Données de test pour une session de caisse"""
        return {
            "id": uuid.uuid4(),
            "operator_id": str(test_cashier["id"]),
            "site_id": str(test_site["id"]),
            "register_id": str(test_cash_register["id"]),
            "initial_amount": 100.0,
            "current_amount": 100.0,
            "status": "open",
            "opened_at": datetime.utcnow()
        }

    @pytest.fixture
    def cashier_token(self, test_cashier):
        """Token JWT pour le caissier"""
        return create_access_token(data={"sub": str(test_cashier["id"])})

    def test_create_sale_success(self, client: TestClient, test_cashier, test_site, test_cash_register, test_cash_session, cashier_token, db_session):
        """
        Test de création d'une vente avec succès.

        Valide que :
        1. Le poids (weight) est enregistré correctement
        2. Le prix (total_price) est enregistré correctement
        3. Le total de la vente = somme des total_price (SANS multiplication par le poids)
        """
        # Créer les données de test en base
        user = User(**test_cashier)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)

        db_session.add(user)
        db_session.add(site)
        db_session.add(cash_register)
        db_session.add(cash_session)
        db_session.commit()

        # Données de la vente
        sale_data = {
            "cash_session_id": str(test_cash_session["id"]),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 2,
                    "weight": 1.5,  # Poids en kg
                    "unit_price": 10.0,
                    "total_price": 10.0  # total_price = unit_price (pas de multiplication)
                },
                {
                    "category": "EEE-2",
                    "quantity": 1,
                    "weight": 0.75,  # Poids en kg
                    "unit_price": 5.50,
                    "total_price": 5.50
                }
            ],
            "total_amount": 15.50,  # Mis à jour car total = 10.0 + 5.50
            "donation": 2.50,
            "payment_method": "cash"
        }

        # Créer la vente
        response = client.post(
            "/api/v1/sales/",
            json=sale_data,
            headers={"Authorization": f"Bearer {cashier_token}"}
        )

        assert response.status_code == 200
        data = response.json()

        # Vérifications de base
        assert data["cash_session_id"] == str(test_cash_session["id"])
        assert "id" in data
        assert "created_at" in data
        assert len(data["items"]) == 2

        # Vérification critique : le total = somme des prix (sans multiplication par poids)
        # Item 1 : weight=1.5, total_price=10.0 → contribue 10.0 au total (PAS 1.5 * 10.0 = 15.0)
        # Item 2 : weight=0.75, total_price=5.50 → contribue 5.50 au total (PAS 0.75 * 5.50 = 4.125)
        # Total attendu : 10.0 + 5.50 = 15.50
        assert data["total_amount"] == 15.50, f"Expected total 15.50, got {data['total_amount']}"

        # Vérification item 1 : poids et prix
        item1 = data["items"][0]
        assert item1["category"] == "EEE-1"
        assert item1["quantity"] == 2
        assert item1["weight"] == 1.5, f"Item 1: expected weight 1.5, got {item1['weight']}"
        assert item1["unit_price"] == 10.0, f"Item 1: expected unit_price 10.0, got {item1['unit_price']}"
        assert item1["total_price"] == 10.0, f"Item 1: expected total_price 10.0, got {item1['total_price']}"

        # Vérification item 2 : poids et prix
        item2 = data["items"][1]
        assert item2["category"] == "EEE-2"
        assert item2["weight"] == 0.75, f"Item 2: expected weight 0.75, got {item2['weight']}"
        assert item2["unit_price"] == 5.50, f"Item 2: expected unit_price 5.50, got {item2['unit_price']}"
        assert item2["total_price"] == 5.50, f"Item 2: expected total_price 5.50, got {item2['total_price']}"

        # Vérification des nouveaux champs (Story B14-P1)
        assert data["donation"] == 2.50, f"Expected donation 2.50, got {data['donation']}"
        assert data["payment_method"] == "cash", f"Expected payment_method 'cash', got {data['payment_method']}"

    def test_create_sale_with_card_payment_and_donation(self, client: TestClient, test_cashier, test_site, test_cash_register, test_cash_session, cashier_token, db_session):
        """
        Test de création d'une vente avec paiement carte et don.

        Story B14-P1: Valide que donation et payment_method sont bien enregistrés.
        """
        # Créer les données de test en base
        user = User(**test_cashier)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)

        db_session.add(user)
        db_session.add(site)
        db_session.add(cash_register)
        db_session.add(cash_session)
        db_session.commit()

        # Données de la vente avec paiement carte et don
        sale_data = {
            "cash_session_id": str(test_cash_session["id"]),
            "items": [
                {
                    "category": "EEE-3",
                    "quantity": 1,
                    "weight": 2.0,
                    "unit_price": 20.0,
                    "total_price": 20.0
                }
            ],
            "total_amount": 20.0,
            "donation": 5.0,
            "payment_method": "card"
        }

        response = client.post(
            "/api/v1/sales/",
            json=sale_data,
            headers={"Authorization": f"Bearer {cashier_token}"}
        )

        assert response.status_code == 200
        data = response.json()

        # Vérifications
        assert data["total_amount"] == 20.0
        assert data["donation"] == 5.0
        assert data["payment_method"] == "card"

    def test_create_sale_unauthorized(self, client: TestClient, test_cash_session):
        """Test de création d'une vente sans authentification"""
        sale_data = {
            "cash_session_id": str(test_cash_session["id"]),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 1.0,
                    "unit_price": 10.0,
                    "total_price": 10.0
                }
            ],
            "total_amount": 10.0
        }

        response = client.post("/api/v1/sales/", json=sale_data)
        assert response.status_code == 401

    def test_create_sale_invalid_data(self, client: TestClient, cashier_token):
        """Test de création d'une vente avec des données invalides"""
        sale_data = {
            "cash_session_id": "invalid-uuid",
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": -1,  # Quantité négative
                    "weight": -1.0,  # Poids négatif
                    "unit_price": 10.0,
                    "total_price": -10.0
                }
            ],
            "total_amount": -10.0  # Montant négatif
        }

        response = client.post(
            "/api/v1/sales/",
            json=sale_data,
            headers={"Authorization": f"Bearer {cashier_token}"}
        )
        assert response.status_code == 422  # Validation error

    def test_get_sales_list(self, client: TestClient, cashier_token):
        """Test de récupération de la liste des ventes"""
        response = client.get(
            "/api/v1/sales/",
            headers={"Authorization": f"Bearer {cashier_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_create_sale_with_note(self, client: TestClient, test_cashier, test_site, test_cash_register, test_cash_session, cashier_token, db_session):
        """
        Test de création d'une vente avec une note.
        
        Story B40-P5: Valide que le champ note est bien enregistré et récupéré.
        """
        # Créer les données de test en base
        user = User(**test_cashier)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)

        db_session.add(user)
        db_session.add(site)
        db_session.add(cash_register)
        db_session.add(cash_session)
        db_session.commit()

        # Données de la vente avec note
        sale_data = {
            "cash_session_id": str(test_cash_session["id"]),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 1.0,
                    "unit_price": 10.0,
                    "total_price": 10.0
                }
            ],
            "total_amount": 10.0,
            "note": "Client a demandé une facture"
        }

        # Créer la vente
        response = client.post(
            "/api/v1/sales/",
            json=sale_data,
            headers={"Authorization": f"Bearer {cashier_token}"}
        )

        assert response.status_code == 200
        data = response.json()

        # Vérifier que la note est présente dans la réponse
        assert "note" in data
        assert data["note"] == "Client a demandé une facture"

        # Vérifier que la note est persistée en base de données
        from recyclic_api.models.sale import Sale
        sale_id = data["id"]
        db_sale = db_session.query(Sale).filter(Sale.id == sale_id).first()
        assert db_sale is not None
        assert db_sale.note == "Client a demandé une facture"

    def test_create_sale_without_note(self, client: TestClient, test_cashier, test_site, test_cash_register, test_cash_session, cashier_token, db_session):
        """
        Test de création d'une vente sans note (note optionnelle).
        
        Story B40-P5: Valide que le champ note peut être omis.
        """
        # Créer les données de test en base
        user = User(**test_cashier)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)

        db_session.add(user)
        db_session.add(site)
        db_session.add(cash_register)
        db_session.add(cash_session)
        db_session.commit()

        # Données de la vente sans note
        sale_data = {
            "cash_session_id": str(test_cash_session["id"]),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 1.0,
                    "unit_price": 10.0,
                    "total_price": 10.0
                }
            ],
            "total_amount": 10.0
        }

        # Créer la vente
        response = client.post(
            "/api/v1/sales/",
            json=sale_data,
            headers={"Authorization": f"Bearer {cashier_token}"}
        )

        assert response.status_code == 200
        data = response.json()

        # Vérifier que la note est None ou absente
        assert data.get("note") is None or "note" not in data

        # Vérifier en base de données
        from recyclic_api.models.sale import Sale
        sale_id = data["id"]
        db_sale = db_session.query(Sale).filter(Sale.id == sale_id).first()
        assert db_sale is not None
        assert db_sale.note is None

    def test_get_sale_with_note(self, client: TestClient, test_cashier, test_site, test_cash_register, test_cash_session, cashier_token, db_session):
        """
        Test de récupération d'une vente avec note.
        
        Story B40-P5: Valide que la note est retournée lors de la lecture.
        """
        # Créer les données de test en base
        user = User(**test_cashier)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)

        db_session.add(user)
        db_session.add(site)
        db_session.add(cash_register)
        db_session.add(cash_session)
        db_session.commit()

        # Créer une vente avec note via l'API
        sale_data = {
            "cash_session_id": str(test_cash_session["id"]),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 1.0,
                    "unit_price": 10.0,
                    "total_price": 10.0
                }
            ],
            "total_amount": 10.0,
            "note": "Note de test pour lecture"
        }

        create_response = client.post(
            "/api/v1/sales/",
            json=sale_data,
            headers={"Authorization": f"Bearer {cashier_token}"}
        )
        assert create_response.status_code == 200
        sale_id = create_response.json()["id"]

        # Récupérer la vente
        get_response = client.get(
            f"/api/v1/sales/{sale_id}",
            headers={"Authorization": f"Bearer {cashier_token}"}
        )

        assert get_response.status_code == 200
        data = get_response.json()

        # Vérifier que la note est présente
        assert "note" in data
        assert data["note"] == "Note de test pour lecture"

    @pytest.fixture
    def admin_token(self, test_cashier):
        """Token JWT pour un administrateur"""
        # Créer un utilisateur admin pour les tests
        admin_data = test_cashier.copy()
        admin_data["role"] = UserRole.ADMIN
        return create_access_token(data={"sub": str(admin_data["id"])})

    def test_update_sale_note_admin_success(self, client: TestClient, test_cashier, test_site, test_cash_register, test_cash_session, admin_token, db_session):
        """
        Test de mise à jour de la note d'une vente par un administrateur.

        Story B40-P4: Valide que les admins peuvent modifier les notes des ventes.
        """
        # Créer les données de test en base
        user = User(**test_cashier)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)

        db_session.add(user)
        db_session.add(site)
        db_session.add(cash_register)
        db_session.add(cash_session)
        db_session.commit()

        # Créer une vente avec une note initiale
        from recyclic_api.models.sale import Sale
        from recyclic_api.models.sale_item import SaleItem

        sale = Sale(
            cash_session_id=test_cash_session["id"],
            operator_id=test_cashier["id"],
            total_amount=25.0,
            donation=5.0,
            payment_method="cash",
            note="Note initiale"
        )
        db_session.add(sale)
        db_session.flush()

        # Ajouter un item à la vente
        sale_item = SaleItem(
            sale_id=sale.id,
            category="EEE-1",
            quantity=1,
            weight=2.5,
            unit_price=25.0,
            total_price=25.0
        )
        db_session.add(sale_item)
        db_session.commit()

        # Créer un utilisateur admin pour le token
        admin_user = User(
            id=uuid.uuid4(),
            username="admin_test",
            hashed_password="hashed_password",
            role=UserRole.ADMIN,
            status=UserStatus.APPROVED,
            is_active=True
        )
        db_session.add(admin_user)
        db_session.commit()

        admin_token_real = create_access_token(data={"sub": str(admin_user.id)})

        # Mettre à jour la note
        update_data = {
            "note": "Note mise à jour par admin"
        }

        response = client.put(
            f"/api/v1/sales/{sale.id}",
            json=update_data,
            headers={"Authorization": f"Bearer {admin_token_real}"}
        )

        assert response.status_code == 200
        data = response.json()

        # Vérifier que la note a été mise à jour
        assert data["note"] == "Note mise à jour par admin"

        # Vérifier en base de données
        db_sale = db_session.query(Sale).filter(Sale.id == sale.id).first()
        assert db_sale.note == "Note mise à jour par admin"

    def test_update_sale_note_non_admin_forbidden(self, client: TestClient, test_cashier, test_site, test_cash_register, test_cash_session, cashier_token, db_session):
        """
        Test de mise à jour de la note par un utilisateur non-admin (doit échouer).

        Story B40-P4: Valide que seuls les admins peuvent modifier les notes.
        """
        # Créer les données de test en base
        user = User(**test_cashier)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)

        db_session.add(user)
        db_session.add(site)
        db_session.add(cash_register)
        db_session.add(cash_session)
        db_session.commit()

        # Créer une vente
        from recyclic_api.models.sale import Sale
        from recyclic_api.models.sale_item import SaleItem

        sale = Sale(
            cash_session_id=test_cash_session["id"],
            operator_id=test_cashier["id"],
            total_amount=25.0,
            donation=5.0,
            payment_method="cash",
            note="Note initiale"
        )
        db_session.add(sale)
        db_session.flush()

        # Ajouter un item à la vente
        sale_item = SaleItem(
            sale_id=sale.id,
            category="EEE-1",
            quantity=1,
            weight=2.5,
            unit_price=25.0,
            total_price=25.0
        )
        db_session.add(sale_item)
        db_session.commit()

        # Tenter de mettre à jour la note avec un token utilisateur normal
        update_data = {
            "note": "Note mise à jour par user"
        }

        response = client.put(
            f"/api/v1/sales/{sale.id}",
            json=update_data,
            headers={"Authorization": f"Bearer {cashier_token}"}
        )

        # Doit retourner 403 Forbidden
        assert response.status_code == 403

        # Vérifier que la note n'a pas changé en base
        db_sale = db_session.query(Sale).filter(Sale.id == sale.id).first()
        assert db_sale.note == "Note initiale"

    def test_update_sale_note_unauthorized(self, client: TestClient, test_cashier, test_site, test_cash_register, test_cash_session, db_session):
        """
        Test de mise à jour de la note sans authentification.

        Story B40-P4: Valide que l'authentification est requise.
        """
        # Créer les données de test en base
        user = User(**test_cashier)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)

        db_session.add(user)
        db_session.add(site)
        db_session.add(cash_register)
        db_session.add(cash_session)
        db_session.commit()

        # Créer une vente
        from recyclic_api.models.sale import Sale
        from recyclic_api.models.sale_item import SaleItem

        sale = Sale(
            cash_session_id=test_cash_session["id"],
            operator_id=test_cashier["id"],
            total_amount=25.0,
            donation=5.0,
            payment_method="cash",
            note="Note initiale"
        )
        db_session.add(sale)
        db_session.flush()

        # Ajouter un item à la vente
        sale_item = SaleItem(
            sale_id=sale.id,
            category="EEE-1",
            quantity=1,
            weight=2.5,
            unit_price=25.0,
            total_price=25.0
        )
        db_session.add(sale_item)
        db_session.commit()

        # Tenter de mettre à jour sans token
        update_data = {
            "note": "Note mise à jour sans auth"
        }

        response = client.put(f"/api/v1/sales/{sale.id}", json=update_data)

        # Doit retourner 401 Unauthorized
        assert response.status_code == 401

    def test_update_sale_note_not_found(self, client: TestClient, admin_token, db_session):
        """
        Test de mise à jour d'une vente inexistante.

        Story B40-P4: Valide la gestion des erreurs.
        """
        # Créer un utilisateur admin pour le token
        admin_user = User(
            id=uuid.uuid4(),
            username="admin_test",
            hashed_password="hashed_password",
            role=UserRole.ADMIN,
            status=UserStatus.APPROVED,
            is_active=True
        )
        db_session.add(admin_user)
        db_session.commit()

        admin_token_real = create_access_token(data={"sub": str(admin_user.id)})

        # Tenter de mettre à jour une vente inexistante
        update_data = {
            "note": "Note pour vente inexistante"
        }

        fake_sale_id = str(uuid.uuid4())
        response = client.put(
            f"/api/v1/sales/{fake_sale_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {admin_token_real}"}
        )

        # Doit retourner 404 Not Found
        assert response.status_code == 404

    def test_update_sale_note_super_admin_success(self, client: TestClient, test_cashier, test_site, test_cash_register, test_cash_session, db_session):
        """
        Test de mise à jour de la note par un super admin.

        Story B40-P4: Valide que les super admins peuvent aussi modifier les notes.
        """
        # Créer les données de test en base
        user = User(**test_cashier)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)

        db_session.add(user)
        db_session.add(site)
        db_session.add(cash_register)
        db_session.add(cash_session)
        db_session.commit()

        # Créer une vente
        from recyclic_api.models.sale import Sale
        from recyclic_api.models.sale_item import SaleItem

        sale = Sale(
            cash_session_id=test_cash_session["id"],
            operator_id=test_cashier["id"],
            total_amount=25.0,
            donation=5.0,
            payment_method="cash",
            note="Note initiale"
        )
        db_session.add(sale)
        db_session.flush()

        # Ajouter un item à la vente
        sale_item = SaleItem(
            sale_id=sale.id,
            category="EEE-1",
            quantity=1,
            weight=2.5,
            unit_price=25.0,
            total_price=25.0
        )
        db_session.add(sale_item)
        db_session.commit()

        # Créer un utilisateur super admin
        super_admin = User(
            id=uuid.uuid4(),
            username="super_admin_test",
            hashed_password="hashed_password",
            role=UserRole.SUPER_ADMIN,
            status=UserStatus.APPROVED,
            is_active=True
        )
        db_session.add(super_admin)
        db_session.commit()

        super_admin_token = create_access_token(data={"sub": str(super_admin.id)})

        # Mettre à jour la note
        update_data = {
            "note": "Note mise à jour par super admin"
        }

        response = client.put(
            f"/api/v1/sales/{sale.id}",
            json=update_data,
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )

        assert response.status_code == 200
        data = response.json()

        # Vérifier que la note a été mise à jour
        assert data["note"] == "Note mise à jour par super admin"

        # Vérifier en base de données
        db_sale = db_session.query(Sale).filter(Sale.id == sale.id).first()
        assert db_sale.note == "Note mise à jour par super admin"

    def test_sales_have_distinct_timestamps(self, client: TestClient, test_cashier, test_site, test_cash_register, test_cash_session, cashier_token, db_session):
        """
        Test Story B51-P2: Vérifie que les ventes créées successivement ont des timestamps distincts.
        
        Valide que le backend génère des timestamps précis (avec secondes) pour distinguer
        les encaissements créés dans la même minute.
        """
        # Créer les données de test en base
        user = User(**test_cashier)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)

        db_session.add(user)
        db_session.add(site)
        db_session.add(cash_register)
        db_session.add(cash_session)
        db_session.commit()

        # Créer plusieurs ventes successivement avec un petit délai
        sale_ids = []
        sale_timestamps = []
        
        for i in range(3):
            response = client.post(
                "/api/v1/sales/",
                json={
                    "cash_session_id": str(test_cash_session["id"]),
                    "items": [
                        {
                            "category": "EEE-3",
                            "quantity": 1,
                            "weight": 2.5,
                            "unit_price": 10.0 + i,
                            "total_price": 10.0 + i
                        }
                    ],
                    "total_amount": 10.0 + i,
                    "donation": 0.0,
                    "payment_method": "cash"
                },
                headers={"Authorization": f"Bearer {cashier_token}"}
            )
            
            assert response.status_code == 200
            sale_data = response.json()
            sale_ids.append(sale_data["id"])
            
            # Parser le timestamp
            created_at_str = sale_data["created_at"]
            # Gérer les formats avec ou sans 'Z'
            if created_at_str.endswith('Z'):
                created_at_str = created_at_str.replace('Z', '+00:00')
            sale_timestamp = datetime.fromisoformat(created_at_str)
            sale_timestamps.append(sale_timestamp)
            
            # Petit délai pour s'assurer que les timestamps sont distincts
            time.sleep(0.1)
        
        # Vérifier que tous les timestamps sont distincts
        assert len(set(sale_timestamps)) == 3, "Tous les timestamps doivent être distincts"
        
        # Vérifier que les timestamps sont dans l'ordre chronologique
        for i in range(len(sale_timestamps) - 1):
            assert sale_timestamps[i] < sale_timestamps[i + 1], \
                f"Le timestamp {i} doit être antérieur au timestamp {i + 1}"
        
        # Vérifier que les timestamps ont une précision au moins à la seconde
        # (les différences doivent être d'au moins 0.1 seconde à cause du sleep)
        for i in range(len(sale_timestamps) - 1):
            diff_seconds = (sale_timestamps[i + 1] - sale_timestamps[i]).total_seconds()
            assert diff_seconds >= 0.1, \
                f"La différence entre les timestamps doit être d'au moins 0.1 seconde, mais était {diff_seconds}"

    def test_create_sale_blocked_when_session_closed(self, client: TestClient, test_cashier, test_site, test_cash_register, cashier_token, db_session):
        """
        Test B51-P5 Fix 3: La création d'une vente doit être bloquée si la session est fermée.
        
        Valide que :
        1. POST /sales/ retourne 422 si la session associée est fermée
        2. Le message d'erreur indique clairement que la session est fermée
        """
        # Créer les données de test en base
        user = User(**test_cashier)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        
        # Créer une session FERMÉE
        closed_session_data = {
            "id": uuid.uuid4(),
            "operator_id": str(test_cashier["id"]),
            "site_id": str(test_site["id"]),
            "register_id": str(test_cash_register["id"]),
            "initial_amount": 100.0,
            "current_amount": 100.0,
            "status": CashSessionStatus.CLOSED,  # Session fermée
            "opened_at": datetime.utcnow(),
            "closed_at": datetime.utcnow()
        }
        closed_session = CashSession(**closed_session_data)
        
        db_session.add(user)
        db_session.add(site)
        db_session.add(cash_register)
        db_session.add(closed_session)
        db_session.commit()
        
        # Données de vente
        sale_data = {
            "cash_session_id": str(closed_session.id),
            "items": [
                {
                    "category": "EEE-3",
                    "quantity": 1,
                    "weight": 2.5,
                    "unit_price": 10.0,
                    "total_price": 15.0
                }
            ],
            "total_amount": 15.0,
            "donation": 0.0,
            "payment_method": "cash"
        }
        
        # Tenter de créer une vente pour une session fermée
        response = client.post(
            "/api/v1/sales/",
            json=sale_data,
            headers={"Authorization": f"Bearer {cashier_token}"}
        )
        
        # Vérifier que la requête est rejetée avec 422
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        assert "fermée" in response.json()["detail"].lower() or "closed" in response.json()["detail"].lower(), \
            f"Le message d'erreur doit mentionner que la session est fermée: {response.json()['detail']}"

    # Story B52-P1: Tests pour paiements multiples
    def test_create_sale_with_multiple_payments(self, client: TestClient, test_cashier, test_site, test_cash_register, test_cash_session, cashier_token, db_session):
        """
        Test de création d'une vente avec paiements multiples.
        
        Story B52-P1: Valide que plusieurs paiements peuvent être associés à une vente.
        """
        # Créer les données de test en base
        user = User(**test_cashier)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)

        db_session.add(user)
        db_session.add(site)
        db_session.add(cash_register)
        db_session.add(cash_session)
        db_session.commit()

        # Données de la vente avec paiements multiples
        sale_data = {
            "cash_session_id": str(test_cash_session["id"]),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 1.0,
                    "unit_price": 50.0,
                    "total_price": 50.0
                }
            ],
            "total_amount": 50.0,
            "donation": 0.0,
            "payments": [
                {"payment_method": "cash", "amount": 25.0},
                {"payment_method": "check", "amount": 25.0}
            ]
        }

        response = client.post(
            "/api/v1/sales/",
            json=sale_data,
            headers={"Authorization": f"Bearer {cashier_token}"}
        )

        assert response.status_code == 200
        data = response.json()

        # Vérifier que la vente a été créée
        assert "id" in data
        assert data["total_amount"] == 50.0

        # Vérifier que les paiements multiples sont présents
        assert "payments" in data
        assert len(data["payments"]) == 2

        # Vérifier les détails des paiements
        payment_methods = {p["payment_method"] for p in data["payments"]}
        assert "cash" in payment_methods
        assert "check" in payment_methods

        payment_amounts = {p["amount"] for p in data["payments"]}
        assert 25.0 in payment_amounts

        # Vérifier que la somme des paiements couvre le total
        total_payments = sum(p["amount"] for p in data["payments"])
        assert total_payments == 50.0

        # Vérifier en base de données
        from recyclic_api.models.payment_transaction import PaymentTransaction
        sale_id = data["id"]
        db_payments = db_session.query(PaymentTransaction).filter(
            PaymentTransaction.sale_id == sale_id
        ).all()
        assert len(db_payments) == 2

    def test_create_sale_with_multiple_payments_and_donation(self, client: TestClient, test_cashier, test_site, test_cash_register, test_cash_session, cashier_token, db_session):
        """
        Test de création d'une vente avec paiements multiples et don.
        
        Story B52-P1: Valide que le don est inclus dans le calcul du total.
        """
        # Créer les données de test en base
        user = User(**test_cashier)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)

        db_session.add(user)
        db_session.add(site)
        db_session.add(cash_register)
        db_session.add(cash_session)
        db_session.commit()

        # Données de la vente : 100€ base + 20€ don = 120€ total
        sale_data = {
            "cash_session_id": str(test_cash_session["id"]),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 2.0,
                    "unit_price": 100.0,
                    "total_price": 100.0
                }
            ],
            "total_amount": 120.0,  # 100€ base + 20€ don
            "donation": 20.0,
            "payments": [
                {"payment_method": "cash", "amount": 60.0},
                {"payment_method": "check", "amount": 60.0}
            ]
        }

        response = client.post(
            "/api/v1/sales/",
            json=sale_data,
            headers={"Authorization": f"Bearer {cashier_token}"}
        )

        assert response.status_code == 200
        data = response.json()

        # Vérifier que la somme des paiements couvre le total (inclut le don)
        total_payments = sum(p["amount"] for p in data["payments"])
        assert total_payments == 120.0
        assert total_payments >= data["total_amount"]

    def test_create_sale_with_multiple_payments_cash_change(self, client: TestClient, test_cashier, test_site, test_cash_register, test_cash_session, cashier_token, db_session):
        """
        Test de création d'une vente avec paiement espèces supérieur au total (reste).
        
        Story B52-P1: Valide que la somme des paiements peut être supérieure au total pour espèces.
        """
        # Créer les données de test en base
        user = User(**test_cashier)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)

        db_session.add(user)
        db_session.add(site)
        db_session.add(cash_register)
        db_session.add(cash_session)
        db_session.commit()

        # Données de la vente : 50€ total, paiement espèces 55€ (reste 5€)
        sale_data = {
            "cash_session_id": str(test_cash_session["id"]),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 1.0,
                    "unit_price": 50.0,
                    "total_price": 50.0
                }
            ],
            "total_amount": 50.0,
            "donation": 0.0,
            "payments": [
                {"payment_method": "cash", "amount": 55.0}  # 5€ de reste
            ]
        }

        response = client.post(
            "/api/v1/sales/",
            json=sale_data,
            headers={"Authorization": f"Bearer {cashier_token}"}
        )

        assert response.status_code == 200
        data = response.json()

        # Vérifier que le paiement est supérieur au total (reste pour espèces)
        total_payments = sum(p["amount"] for p in data["payments"])
        assert total_payments == 55.0
        assert total_payments > data["total_amount"]

    def test_create_sale_with_multiple_payments_validation_error(self, client: TestClient, test_cashier, test_site, test_cash_register, test_cash_session, cashier_token, db_session):
        """
        Test de validation : somme des paiements < total doit échouer.
        
        Story B52-P1: Valide que la validation rejette les paiements insuffisants.
        """
        # Créer les données de test en base
        user = User(**test_cashier)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)

        db_session.add(user)
        db_session.add(site)
        db_session.add(cash_register)
        db_session.add(cash_session)
        db_session.commit()

        # Données de la vente : 50€ total, paiements seulement 40€ (insuffisant)
        sale_data = {
            "cash_session_id": str(test_cash_session["id"]),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 1.0,
                    "unit_price": 50.0,
                    "total_price": 50.0
                }
            ],
            "total_amount": 50.0,
            "donation": 0.0,
            "payments": [
                {"payment_method": "cash", "amount": 25.0},
                {"payment_method": "check", "amount": 15.0}  # Total = 40€ < 50€
            ]
        }

        response = client.post(
            "/api/v1/sales/",
            json=sale_data,
            headers={"Authorization": f"Bearer {cashier_token}"}
        )

        # Doit retourner une erreur de validation
        assert response.status_code == 422
        assert "paiements" in response.json()["detail"].lower() or "payments" in response.json()["detail"].lower()

    def test_create_sale_backward_compatibility_single_payment(self, client: TestClient, test_cashier, test_site, test_cash_register, test_cash_session, cashier_token, db_session):
        """
        Test de rétrocompatibilité : paiement unique avec payment_method.
        
        Story B52-P1: Valide que les ventes avec payment_method unique continuent de fonctionner.
        """
        # Créer les données de test en base
        user = User(**test_cashier)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)

        db_session.add(user)
        db_session.add(site)
        db_session.add(cash_register)
        db_session.add(cash_session)
        db_session.commit()

        # Données de la vente avec payment_method (ancien format)
        sale_data = {
            "cash_session_id": str(test_cash_session["id"]),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 1.0,
                    "unit_price": 50.0,
                    "total_price": 50.0
                }
            ],
            "total_amount": 50.0,
            "donation": 0.0,
            "payment_method": "cash"  # Ancien format
        }

        response = client.post(
            "/api/v1/sales/",
            json=sale_data,
            headers={"Authorization": f"Bearer {cashier_token}"}
        )

        assert response.status_code == 200
        data = response.json()

        # Vérifier qu'un PaymentTransaction a été créé automatiquement
        assert "payments" in data
        assert len(data["payments"]) == 1
        assert data["payments"][0]["payment_method"] == "cash"
        assert data["payments"][0]["amount"] == 50.0

        # Vérifier en base de données
        from recyclic_api.models.payment_transaction import PaymentTransaction
        sale_id = data["id"]
        db_payments = db_session.query(PaymentTransaction).filter(
            PaymentTransaction.sale_id == sale_id
        ).all()
        assert len(db_payments) == 1
        assert db_payments[0].payment_method.value == "cash"
        assert db_payments[0].amount == 50.0

    def test_get_sale_with_multiple_payments(self, client: TestClient, test_cashier, test_site, test_cash_register, test_cash_session, cashier_token, db_session):
        """
        Test de récupération d'une vente avec paiements multiples.
        
        Story B52-P1: Valide que les paiements multiples sont retournés lors de la lecture.
        """
        # Créer les données de test en base
        user = User(**test_cashier)
        site = Site(**test_site)
        cash_register = CashRegister(**test_cash_register)
        cash_session = CashSession(**test_cash_session)

        db_session.add(user)
        db_session.add(site)
        db_session.add(cash_register)
        db_session.add(cash_session)
        db_session.commit()

        # Créer une vente avec paiements multiples
        sale_data = {
            "cash_session_id": str(test_cash_session["id"]),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 1.0,
                    "unit_price": 100.0,
                    "total_price": 100.0
                }
            ],
            "total_amount": 100.0,
            "donation": 0.0,
            "payments": [
                {"payment_method": "cash", "amount": 50.0},
                {"payment_method": "check", "amount": 50.0}
            ]
        }

        create_response = client.post(
            "/api/v1/sales/",
            json=sale_data,
            headers={"Authorization": f"Bearer {cashier_token}"}
        )
        assert create_response.status_code == 200
        sale_id = create_response.json()["id"]

        # Récupérer la vente
        get_response = client.get(
            f"/api/v1/sales/{sale_id}",
            headers={"Authorization": f"Bearer {cashier_token}"}
        )

        assert get_response.status_code == 200
        data = get_response.json()

        # Vérifier que les paiements multiples sont présents
        assert "payments" in data
        assert len(data["payments"]) == 2
        assert sum(p["amount"] for p in data["payments"]) == 100.0