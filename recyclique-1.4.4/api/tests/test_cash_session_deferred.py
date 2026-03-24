"""
Tests pour la saisie différée de cahiers de vente (B44-P1).

Valide :
- Création de session avec opened_at dans le passé (ADMIN/SUPER_ADMIN uniquement)
- Validation date future (erreur 400)
- Permissions (USER ne peut pas créer session différée)
- Création de vente avec created_at = opened_at de session si session différée
"""

import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from recyclic_api.main import app
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.site import Site
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.cash_register import CashRegister
from recyclic_api.models.sale import Sale
from recyclic_api.core.security import hash_password
from recyclic_api.core.auth import create_access_token


@pytest.fixture
def test_user(db_session: Session):
    """Créer un utilisateur USER pour les tests."""
    user = User(
        id=uuid.uuid4(),
        username="test_user",
        hashed_password=hash_password("testpassword123"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_admin(db_session: Session):
    """Créer un utilisateur ADMIN pour les tests."""
    user = User(
        id=uuid.uuid4(),
        username="test_admin",
        hashed_password=hash_password("testpassword123"),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_super_admin(db_session: Session):
    """Créer un utilisateur SUPER_ADMIN pour les tests."""
    user = User(
        id=uuid.uuid4(),
        username="test_super_admin",
        hashed_password=hash_password("testpassword123"),
        role=UserRole.SUPER_ADMIN,
        status=UserStatus.ACTIVE,
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
        id=uuid.uuid4(),
        name="Site de Test",
        address="123 Rue de Test",
        is_active=True
    )
    db_session.add(site)
    db_session.commit()
    db_session.refresh(site)
    return site


@pytest.fixture
def test_register(db_session: Session, test_site: Site):
    """Créer un poste de caisse de test."""
    register = CashRegister(
        id=uuid.uuid4(),
        name="Caisse Test",
        site_id=test_site.id,
        is_active=True
    )
    db_session.add(register)
    db_session.commit()
    db_session.refresh(register)
    return register


@pytest.fixture
def user_client(db_session: Session, test_user: User) -> TestClient:
    """Client de test avec utilisateur USER authentifié."""
    token = create_access_token(data={"sub": str(test_user.id)})
    client = TestClient(app)
    client.headers["Authorization"] = f"Bearer {token}"
    return client


@pytest.fixture
def admin_client(db_session: Session, test_admin: User) -> TestClient:
    """Client de test avec utilisateur ADMIN authentifié."""
    token = create_access_token(data={"sub": str(test_admin.id)})
    client = TestClient(app)
    client.headers["Authorization"] = f"Bearer {token}"
    return client


@pytest.fixture
def super_admin_client(db_session: Session, test_super_admin: User) -> TestClient:
    """Client de test avec utilisateur SUPER_ADMIN authentifié."""
    token = create_access_token(data={"sub": str(test_super_admin.id)})
    client = TestClient(app)
    client.headers["Authorization"] = f"Bearer {token}"
    return client


class TestDeferredCashSessionCreation:
    """Tests pour la création de sessions différées."""

    def test_create_deferred_session_with_past_date_admin(self, admin_client: TestClient, test_admin: User, test_site: Site, test_register: CashRegister):
        """Test création session avec date passée (ADMIN)."""
        # Date passée récente (7 jours avant)
        past_date = datetime.now(timezone.utc) - timedelta(days=7)
        
        response = admin_client.post(
            "/api/v1/cash-sessions/",
            json={
                "operator_id": str(test_admin.id),
                "site_id": str(test_site.id),
                "register_id": str(test_register.id),
                "initial_amount": 50.0,
                "opened_at": past_date.isoformat()
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["id"] is not None
        assert data["opened_at"] == past_date.isoformat().replace("+00:00", "Z")
        assert data["status"] == "open"

    def test_create_deferred_session_with_past_date_super_admin(self, super_admin_client: TestClient, test_super_admin: User, test_site: Site, test_register: CashRegister):
        """Test création session avec date passée (SUPER_ADMIN)."""
        # Date passée lointaine (6 mois avant)
        past_date = datetime.now(timezone.utc) - timedelta(days=180)
        
        response = super_admin_client.post(
            "/api/v1/cash-sessions/",
            json={
                "operator_id": str(test_super_admin.id),
                "site_id": str(test_site.id),
                "register_id": str(test_register.id),
                "initial_amount": 50.0,
                "opened_at": past_date.isoformat()
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["opened_at"] == past_date.isoformat().replace("+00:00", "Z")

    def test_create_deferred_session_with_future_date_rejected(self, admin_client: TestClient, test_admin: User, test_site: Site, test_register: CashRegister):
        """Test création session avec date future (erreur 400)."""
        # Date future (1 jour après)
        future_date = datetime.now(timezone.utc) + timedelta(days=1)
        
        response = admin_client.post(
            "/api/v1/cash-sessions/",
            json={
                "operator_id": str(test_admin.id),
                "site_id": str(test_site.id),
                "register_id": str(test_register.id),
                "initial_amount": 50.0,
                "opened_at": future_date.isoformat()
            }
        )
        
        assert response.status_code == 400
        assert "futur" in response.json()["detail"].lower() or "future" in response.json()["detail"].lower()

    def test_create_deferred_session_user_forbidden(self, user_client: TestClient, test_user: User, test_site: Site, test_register: CashRegister):
        """Test création session différée par USER (erreur 403)."""
        past_date = datetime.now(timezone.utc) - timedelta(days=7)
        
        response = user_client.post(
            "/api/v1/cash-sessions/",
            json={
                "operator_id": str(test_user.id),
                "site_id": str(test_site.id),
                "register_id": str(test_register.id),
                "initial_amount": 50.0,
                "opened_at": past_date.isoformat()
            }
        )
        
        assert response.status_code == 403
        assert "administrateur" in response.json()["detail"].lower() or "admin" in response.json()["detail"].lower()

    def test_create_normal_session_without_opened_at(self, user_client: TestClient, test_user: User, test_site: Site, test_register: CashRegister):
        """Test création session normale sans opened_at (comportement actuel)."""
        response = user_client.post(
            "/api/v1/cash-sessions/",
            json={
                "operator_id": str(test_user.id),
                "site_id": str(test_site.id),
                "register_id": str(test_register.id),
                "initial_amount": 50.0
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["opened_at"] is not None
        # Vérifier que opened_at est proche de maintenant (à 1 seconde près)
        opened_at = datetime.fromisoformat(data["opened_at"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        assert abs((opened_at - now).total_seconds()) < 5

    def test_create_deferred_session_with_very_old_date(self, admin_client: TestClient, test_admin: User, test_site: Site, test_register: CashRegister):
        """Test création session avec date très ancienne (edge case)."""
        # Date très ancienne (2 ans avant)
        old_date = datetime.now(timezone.utc) - timedelta(days=730)
        
        response = admin_client.post(
            "/api/v1/cash-sessions/",
            json={
                "operator_id": str(test_admin.id),
                "site_id": str(test_site.id),
                "register_id": str(test_register.id),
                "initial_amount": 50.0,
                "opened_at": old_date.isoformat()
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["opened_at"] == old_date.isoformat().replace("+00:00", "Z")

    def test_create_deferred_session_with_today_date(self, admin_client: TestClient, test_admin: User, test_site: Site, test_register: CashRegister):
        """Test création session avec date d'aujourd'hui (doit être acceptée)."""
        # Date limite (aujourd'hui)
        today = datetime.now(timezone.utc)
        
        response = admin_client.post(
            "/api/v1/cash-sessions/",
            json={
                "operator_id": str(test_admin.id),
                "site_id": str(test_site.id),
                "register_id": str(test_register.id),
                "initial_amount": 50.0,
                "opened_at": today.isoformat()
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["opened_at"] is not None


class TestDeferredSaleCreation:
    """Tests pour la création de ventes dans des sessions différées."""

    def test_create_sale_in_deferred_session_uses_opened_at(self, admin_client: TestClient, db_session: Session, test_admin: User, test_site: Site, test_register: CashRegister):
        """Test création vente dans session différée : created_at = opened_at de session."""
        # Créer session différée (7 jours avant)
        past_date = datetime.now(timezone.utc) - timedelta(days=7)
        
        session_response = admin_client.post(
            "/api/v1/cash-sessions/",
            json={
                "operator_id": str(test_admin.id),
                "site_id": str(test_site.id),
                "register_id": str(test_register.id),
                "initial_amount": 50.0,
                "opened_at": past_date.isoformat()
            }
        )
        assert session_response.status_code == 201
        session_id = session_response.json()["id"]
        
        # Attendre un peu pour s'assurer que created_at sera différent
        import time
        time.sleep(0.1)
        
        # Créer une vente
        sale_response = admin_client.post(
            "/api/v1/sales/",
            json={
                "cash_session_id": session_id,
                "items": [
                    {
                        "category": "EEE-3",
                        "quantity": 1,
                        "weight": 2.5,
                        "unit_price": 15.0,
                        "total_price": 15.0
                    }
                ],
                "total_amount": 15.0,
                "donation": 0.0,
                "payment_method": "cash"
            }
        )
        
        assert sale_response.status_code == 200
        sale_data = sale_response.json()
        
        # Vérifier que created_at de la vente = opened_at de la session (à 1 seconde près)
        sale_created_at = datetime.fromisoformat(sale_data["created_at"].replace("Z", "+00:00"))
        session_opened_at = datetime.fromisoformat(session_response.json()["opened_at"].replace("Z", "+00:00"))
        
        # La différence doit être très petite (moins de 1 seconde)
        assert abs((sale_created_at - session_opened_at).total_seconds()) < 1

    def test_create_sale_in_normal_session_uses_now(self, user_client: TestClient, db_session: Session, test_user: User, test_site: Site, test_register: CashRegister):
        """Test création vente dans session normale : created_at = now()."""
        # Créer session normale (sans opened_at)
        session_response = user_client.post(
            "/api/v1/cash-sessions/",
            json={
                "operator_id": str(test_user.id),
                "site_id": str(test_site.id),
                "register_id": str(test_register.id),
                "initial_amount": 50.0
            }
        )
        assert session_response.status_code == 201
        session_id = session_response.json()["id"]
        
        # Noter le moment avant création de la vente
        before_sale = datetime.now(timezone.utc)
        
        # Créer une vente
        sale_response = user_client.post(
            "/api/v1/sales/",
            json={
                "cash_session_id": session_id,
                "items": [
                    {
                        "category": "EEE-3",
                        "quantity": 1,
                        "weight": 2.5,
                        "unit_price": 15.0,
                        "total_price": 15.0
                    }
                ],
                "total_amount": 15.0,
                "donation": 0.0,
                "payment_method": "cash"
            }
        )
        
        after_sale = datetime.now(timezone.utc)
        
        assert sale_response.status_code == 200
        sale_data = sale_response.json()
        
        # Vérifier que created_at de la vente est proche de maintenant (pas de la session)
        sale_created_at = datetime.fromisoformat(sale_data["created_at"].replace("Z", "+00:00"))
        
        # created_at doit être entre before_sale et after_sale
        assert sale_created_at >= before_sale
        assert sale_created_at <= after_sale

    def test_create_sale_in_deferred_session_old_date(self, admin_client: TestClient, db_session: Session, test_admin: User, test_site: Site, test_register: CashRegister):
        """Test création vente dans session différée très ancienne."""
        # Date très ancienne (6 mois avant)
        old_date = datetime.now(timezone.utc) - timedelta(days=180)
        
        session_response = admin_client.post(
            "/api/v1/cash-sessions/",
            json={
                "operator_id": str(test_admin.id),
                "site_id": str(test_site.id),
                "register_id": str(test_register.id),
                "initial_amount": 50.0,
                "opened_at": old_date.isoformat()
            }
        )
        assert session_response.status_code == 201
        session_id = session_response.json()["id"]
        
        # Créer une vente
        sale_response = admin_client.post(
            "/api/v1/sales/",
            json={
                "cash_session_id": session_id,
                "items": [
                    {
                        "category": "EEE-4",
                        "quantity": 2,
                        "weight": 5.0,
                        "unit_price": 20.0,
                        "total_price": 40.0
                    }
                ],
                "total_amount": 40.0,
                "donation": 0.0,
                "payment_method": "cash"
            }
        )
        
        assert sale_response.status_code == 200
        sale_data = sale_response.json()
        
        # Vérifier que created_at = opened_at de session (6 mois avant)
        sale_created_at = datetime.fromisoformat(sale_data["created_at"].replace("Z", "+00:00"))
        session_opened_at = datetime.fromisoformat(session_response.json()["opened_at"].replace("Z", "+00:00"))
        
        # La différence doit être très petite
        assert abs((sale_created_at - session_opened_at).total_seconds()) < 1
        
        # Vérifier que la date est bien dans le passé (6 mois avant)
        now = datetime.now(timezone.utc)
        assert (now - sale_created_at).days >= 179  # Au moins 179 jours (tolérance de 1 jour)

