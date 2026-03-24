"""B44-P3: Tests pour la gestion des sessions de caisse vides."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.main import app
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.site import Site
from recyclic_api.core.auth import create_access_token
from recyclic_api.services.cash_session_service import CashSessionService

client = TestClient(app)


@pytest.fixture
def test_user(client, db_session: Session):
    """Créer un utilisateur de test."""
    from recyclic_api.core.security import hash_password
    hashed_password = hash_password("testpassword123")

    user = User(
        telegram_id="test_user_123",
        username="test_cashier",
        email="test@example.com",
        hashed_password=hashed_password,
        first_name="Test",
        last_name="Cashier",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_site(client, db_session: Session):
    """Créer un site de test."""
    site = Site(
        name="Test Site",
        address="123 Test Street",
        city="Test City",
        postal_code="12345",
        country="Test Country",
        is_active=True
    )
    db_session.add(site)
    db_session.commit()
    db_session.refresh(site)
    return site


@pytest.fixture
def empty_cash_session(client, db_session: Session, test_user: User, test_site: Site):
    """Créer une session de caisse vide (sans transaction)."""
    session = CashSession(
        operator_id=test_user.id,
        site_id=test_site.id,
        initial_amount=50.0,
        current_amount=50.0,
        status=CashSessionStatus.OPEN,
        total_sales=0.0,  # Aucune vente
        total_items=0     # Aucun article
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


@pytest.fixture
def non_empty_cash_session(client, db_session: Session, test_user: User, test_site: Site):
    """Créer une session de caisse avec des transactions."""
    session = CashSession(
        operator_id=test_user.id,
        site_id=test_site.id,
        initial_amount=50.0,
        current_amount=75.0,
        status=CashSessionStatus.OPEN,
        total_sales=25.0,  # Des ventes
        total_items=3      # Des articles
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


class TestSessionEmptyDetection:
    """B44-P3: Tests de détection de session vide."""
    
    def test_is_session_empty_detects_empty_session(self, db_session: Session, empty_cash_session: CashSession):
        """Test que is_session_empty détecte correctement une session vide."""
        service = CashSessionService(db_session)
        assert service.is_session_empty(empty_cash_session) is True
    
    def test_is_session_empty_detects_non_empty_session(self, db_session: Session, non_empty_cash_session: CashSession):
        """Test que is_session_empty détecte correctement une session avec transactions."""
        service = CashSessionService(db_session)
        assert service.is_session_empty(non_empty_cash_session) is False
    
    def test_is_session_empty_with_null_values(self, db_session: Session, test_user: User, test_site: Site):
        """Test que is_session_empty gère correctement les valeurs None."""
        session = CashSession(
            operator_id=test_user.id,
            site_id=test_site.id,
            initial_amount=50.0,
            current_amount=50.0,
            status=CashSessionStatus.OPEN,
            total_sales=None,  # None au lieu de 0
            total_items=None   # None au lieu de 0
        )
        db_session.add(session)
        db_session.commit()
        db_session.refresh(session)
        
        service = CashSessionService(db_session)
        assert service.is_session_empty(session) is True


class TestEmptySessionDeletion:
    """B44-P3: Tests de suppression des sessions vides."""
    
    def test_close_empty_session_deletes_instead_of_closing(self, db_session: Session, empty_cash_session: CashSession):
        """Test que fermer une session vide la supprime au lieu de la fermer."""
        service = CashSessionService(db_session)
        session_id = str(empty_cash_session.id)
        
        # Fermer la session vide
        result = service.close_session_with_amounts(session_id, 50.0, None)
        
        # La session devrait être supprimée (retourne None)
        assert result is None
        
        # Vérifier que la session n'existe plus
        deleted_session = service.get_session_by_id(session_id)
        assert deleted_session is None
    
    def test_close_non_empty_session_closes_normally(self, db_session: Session, non_empty_cash_session: CashSession):
        """Test que fermer une session avec transactions fonctionne normalement."""
        service = CashSessionService(db_session)
        session_id = str(non_empty_cash_session.id)
        
        # Fermer la session avec transactions
        result = service.close_session_with_amounts(session_id, 75.0, "Aucun écart")
        
        # La session devrait être fermée (pas supprimée)
        assert result is not None
        assert result.status == CashSessionStatus.CLOSED
        assert result.actual_amount == 75.0
    
    def test_delete_session_removes_from_database(self, db_session: Session, empty_cash_session: CashSession):
        """Test que delete_session supprime la session de la base de données."""
        service = CashSessionService(db_session)
        session_id = str(empty_cash_session.id)
        
        # Supprimer la session
        success = service.delete_session(session_id)
        
        assert success is True
        
        # Vérifier que la session n'existe plus
        deleted_session = service.get_session_by_id(session_id)
        assert deleted_session is None


class TestEmptySessionFiltering:
    """B44-P3: Tests de filtrage des sessions vides dans les listes."""
    
    def test_get_sessions_excludes_empty_by_default(self, db_session: Session, empty_cash_session: CashSession, non_empty_cash_session: CashSession):
        """Test que get_sessions_with_filters exclut les sessions vides par défaut."""
        from recyclic_api.schemas.cash_session import CashSessionFilters
        
        service = CashSessionService(db_session)
        filters = CashSessionFilters(skip=0, limit=100)
        
        sessions, total = service.get_sessions_with_filters(filters)
        
        # Vérifier que la session vide n'est pas dans les résultats
        session_ids = [str(s.id) for s in sessions]
        assert str(empty_cash_session.id) not in session_ids
        
        # Vérifier que la session avec transactions est dans les résultats
        assert str(non_empty_cash_session.id) in session_ids
    
    def test_get_sessions_includes_empty_with_flag(self, db_session: Session, empty_cash_session: CashSession, non_empty_cash_session: CashSession):
        """Test que get_sessions_with_filters inclut les sessions vides si include_empty=True."""
        from recyclic_api.schemas.cash_session import CashSessionFilters
        
        service = CashSessionService(db_session)
        filters = CashSessionFilters(skip=0, limit=100, include_empty=True)
        
        sessions, total = service.get_sessions_with_filters(filters)
        
        # Vérifier que la session vide est dans les résultats
        session_ids = [str(s.id) for s in sessions]
        assert str(empty_cash_session.id) in session_ids
        
        # Vérifier que la session avec transactions est aussi dans les résultats
        assert str(non_empty_cash_session.id) in session_ids


class TestEmptySessionEndpoint:
    """B44-P3: Tests de l'endpoint de fermeture avec sessions vides."""
    
    def test_close_empty_session_endpoint_returns_deleted_message(self, client: TestClient, test_user: User, empty_cash_session: CashSession):
        """Test que l'endpoint de fermeture retourne un message si la session est vide."""
        access_token = create_access_token(data={"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        response = client.post(
            f"/api/v1/cash-sessions/{empty_cash_session.id}/close",
            json={"actual_amount": 50.0, "variance_comment": None},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["deleted"] is True
        assert "Session vide non enregistrée" in data["message"]
    
    def test_close_non_empty_session_endpoint_closes_normally(self, client: TestClient, test_user: User, non_empty_cash_session: CashSession):
        """Test que l'endpoint de fermeture ferme normalement une session avec transactions."""
        access_token = create_access_token(data={"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        response = client.post(
            f"/api/v1/cash-sessions/{non_empty_cash_session.id}/close",
            json={"actual_amount": 75.0, "variance_comment": "Aucun écart"},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "closed"
        assert "deleted" not in data
    
    def test_get_sessions_endpoint_excludes_empty_by_default(self, client: TestClient, test_user: User, empty_cash_session: CashSession, non_empty_cash_session: CashSession):
        """Test que l'endpoint GET /cash-sessions exclut les sessions vides par défaut."""
        access_token = create_access_token(data={"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        response = client.get(
            "/api/v1/cash-sessions/",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        session_ids = [s["id"] for s in data["data"]]
        
        # Vérifier que la session vide n'est pas dans les résultats
        assert str(empty_cash_session.id) not in session_ids
        
        # Vérifier que la session avec transactions est dans les résultats
        assert str(non_empty_cash_session.id) in session_ids
    
    def test_get_sessions_endpoint_includes_empty_with_flag(self, client: TestClient, test_user: User, empty_cash_session: CashSession, non_empty_cash_session: CashSession):
        """Test que l'endpoint GET /cash-sessions inclut les sessions vides si include_empty=true."""
        access_token = create_access_token(data={"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        response = client.get(
            "/api/v1/cash-sessions/?include_empty=true",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        session_ids = [s["id"] for s in data["data"]]
        
        # Vérifier que la session vide est dans les résultats
        assert str(empty_cash_session.id) in session_ids
        
        # Vérifier que la session avec transactions est aussi dans les résultats
        assert str(non_empty_cash_session.id) in session_ids














