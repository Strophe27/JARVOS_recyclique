"""
Tests pour Story B52-P3: Correction bug date des tickets (sale_date)

Vérifie que :
1. Pour sessions normales : sale_date = created_at (même valeur)
2. Pour sessions différées : sale_date = opened_at (date du cahier), created_at = NOW() (date de saisie)
3. Les données existantes sont correctement migrées (sale_date = created_at)
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

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
def user_client(db_session: Session, test_user: User):
    """Client de test avec utilisateur USER authentifié."""
    token = create_access_token(data={"sub": str(test_user.id)})
    client = TestClient(app)
    
    class AuthenticatedClient:
        def __init__(self, client, token):
            self._client = client
            self._headers = {"Authorization": f"Bearer {token}"}
        
        def get(self, url, **kwargs):
            headers = kwargs.pop("headers", {})
            headers.update(self._headers)
            return self._client.get(url, headers=headers, **kwargs)
        
        def post(self, url, **kwargs):
            headers = kwargs.pop("headers", {})
            headers.update(self._headers)
            return self._client.post(url, headers=headers, **kwargs)
        
        def put(self, url, **kwargs):
            headers = kwargs.pop("headers", {})
            headers.update(self._headers)
            return self._client.put(url, headers=headers, **kwargs)
        
        def patch(self, url, **kwargs):
            headers = kwargs.pop("headers", {})
            headers.update(self._headers)
            return self._client.patch(url, headers=headers, **kwargs)
        
        def delete(self, url, **kwargs):
            headers = kwargs.pop("headers", {})
            headers.update(self._headers)
            return self._client.delete(url, headers=headers, **kwargs)
    
    return AuthenticatedClient(client, token)


@pytest.fixture
def admin_client(db_session: Session, test_admin: User):
    """Client de test avec utilisateur ADMIN authentifié."""
    token = create_access_token(data={"sub": str(test_admin.id)})
    client = TestClient(app)
    
    class AuthenticatedClient:
        def __init__(self, client, token):
            self._client = client
            self._headers = {"Authorization": f"Bearer {token}"}
        
        def get(self, url, **kwargs):
            headers = kwargs.pop("headers", {})
            headers.update(self._headers)
            return self._client.get(url, headers=headers, **kwargs)
        
        def post(self, url, **kwargs):
            headers = kwargs.pop("headers", {})
            headers.update(self._headers)
            return self._client.post(url, headers=headers, **kwargs)
        
        def put(self, url, **kwargs):
            headers = kwargs.pop("headers", {})
            headers.update(self._headers)
            return self._client.put(url, headers=headers, **kwargs)
        
        def patch(self, url, **kwargs):
            headers = kwargs.pop("headers", {})
            headers.update(self._headers)
            return self._client.patch(url, headers=headers, **kwargs)
        
        def delete(self, url, **kwargs):
            headers = kwargs.pop("headers", {})
            headers.update(self._headers)
            return self._client.delete(url, headers=headers, **kwargs)
    
    return AuthenticatedClient(client, token)


class TestSaleDateNormalSession:
    """Tests pour les sessions normales : sale_date = created_at"""

    def test_create_sale_in_normal_session_sale_date_equals_created_at(
        self, 
        user_client: TestClient, 
        db_session: Session, 
        test_user: User, 
        test_site: Site, 
        test_register: CashRegister
    ):
        """Test création vente dans session normale : sale_date = created_at."""
        # Créer session normale (sans opened_at personnalisé)
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
        
        # Vérifier que sale_date et created_at sont présents
        assert "sale_date" in sale_data
        assert "created_at" in sale_data
        
        sale_date = datetime.fromisoformat(sale_data["sale_date"].replace("Z", "+00:00"))
        created_at = datetime.fromisoformat(sale_data["created_at"].replace("Z", "+00:00"))
        
        # Pour session normale : sale_date = created_at (même valeur)
        assert abs((sale_date - created_at).total_seconds()) < 1
        
        # created_at doit être entre before_sale et after_sale
        assert before_sale <= created_at <= after_sale


class TestSaleDateDeferredSession:
    """Tests pour les sessions différées : sale_date = opened_at, created_at = NOW()"""

    def test_create_sale_in_deferred_session_sale_date_equals_opened_at(
        self, 
        admin_client: TestClient, 
        db_session: Session, 
        test_admin: User, 
        test_site: Site, 
        test_register: CashRegister
    ):
        """Test création vente dans session différée : sale_date = opened_at, created_at = NOW()."""
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
        
        # Noter le moment avant création de la vente
        before_sale = datetime.now(timezone.utc)
        
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
        
        after_sale = datetime.now(timezone.utc)
        
        assert sale_response.status_code == 200
        sale_data = sale_response.json()
        
        # Vérifier que sale_date et created_at sont présents
        assert "sale_date" in sale_data
        assert "created_at" in sale_data
        
        sale_date = datetime.fromisoformat(sale_data["sale_date"].replace("Z", "+00:00"))
        created_at = datetime.fromisoformat(sale_data["created_at"].replace("Z", "+00:00"))
        session_opened_at = datetime.fromisoformat(past_date.isoformat().replace("Z", "+00:00"))
        
        # Pour session différée : sale_date = opened_at (date du cahier)
        assert abs((sale_date - session_opened_at).total_seconds()) < 1
        
        # created_at doit être NOW() (date de saisie)
        assert before_sale <= created_at <= after_sale
        
        # sale_date et created_at doivent être différents (plus de 2 minutes d'écart)
        assert abs((sale_date - created_at).total_seconds()) > 120


class TestSaleDateMigration:
    """Tests pour vérifier que les données existantes sont correctement migrées"""

    def test_existing_sales_have_sale_date_after_migration(
        self,
        db_session: Session,
        test_user: User,
        test_site: Site
    ):
        """Test que les ventes existantes ont sale_date = created_at après migration."""
        # Créer une session
        session = CashSession(
            id=uuid.uuid4(),
            operator_id=test_user.id,
            site_id=test_site.id,
            initial_amount=100.0,
            current_amount=100.0,
            status=CashSessionStatus.OPEN.value,
            opened_at=datetime.now(timezone.utc)
        )
        db_session.add(session)
        db_session.commit()
        
        # Créer une vente existante (sans sale_date, simulant une vente créée avant la migration)
        now = datetime.now(timezone.utc)
        sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=session.id,
            operator_id=test_user.id,
            total_amount=20.0,
            created_at=now - timedelta(hours=1)
        )
        db_session.add(sale)
        db_session.commit()
        
        # Simuler la migration : sale_date = created_at pour les ventes existantes
        db_session.execute(
            "UPDATE sales SET sale_date = created_at WHERE sale_date IS NULL"
        )
        db_session.commit()
        
        # Vérifier que sale_date est maintenant rempli
        db_session.refresh(sale)
        assert sale.sale_date is not None
        assert abs((sale.sale_date - sale.created_at).total_seconds()) < 1


class TestSaleDateInResponse:
    """Tests pour vérifier que sale_date est présent dans les réponses API"""

    def test_sale_date_in_sale_response(
        self,
        user_client: TestClient,
        db_session: Session,
        test_user: User,
        test_site: Site,
        test_register: CashRegister
    ):
        """Test que sale_date est présent dans la réponse de création de vente."""
        # Créer session
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
        
        assert sale_response.status_code == 200
        sale_data = sale_response.json()
        
        # Vérifier que sale_date est présent dans la réponse
        assert "sale_date" in sale_data
        assert sale_data["sale_date"] is not None
        
        # Vérifier que created_at est aussi présent
        assert "created_at" in sale_data
        assert sale_data["created_at"] is not None

