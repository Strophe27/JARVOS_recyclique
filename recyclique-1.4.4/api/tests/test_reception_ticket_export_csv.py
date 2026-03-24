"""
Tests pour l'endpoint d'export CSV d'un ticket individuel.
Story B50-P3: Correction Bug 500 - Export CSV Ticket Individuel
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import datetime, timedelta
from uuid import uuid4

from recyclic_api.main import app
from recyclic_api.models import User, UserRole, UserStatus, PosteReception, TicketDepot, LigneDepot, Category
from recyclic_api.models.ligne_depot import Destination
from recyclic_api.utils.report_tokens import generate_download_token


@pytest.fixture
def admin_user(db_session: Session):
    """Créer un utilisateur administrateur pour les tests."""
    user = User(
        id=uuid4(),
        username="admin@test.com",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        hashed_password="hashed_password"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def category(db_session: Session):
    """Créer une catégorie de test."""
    category_id = uuid4()
    category = Category(
        id=category_id,
        name=f"Test Category {category_id}",
        is_active=True
    )
    db_session.add(category)
    db_session.commit()
    db_session.refresh(category)
    return category


@pytest.fixture
def ticket_with_lignes(db_session: Session, admin_user: User, category: Category):
    """Créer un ticket avec des lignes pour les tests."""
    # Nettoyer d'abord
    db_session.query(LigneDepot).delete()
    db_session.query(TicketDepot).delete()
    db_session.query(PosteReception).delete()
    db_session.commit()
    
    # Créer un poste
    poste = PosteReception(
        id=uuid4(),
        opened_by_user_id=admin_user.id,
        status="opened"
    )
    db_session.add(poste)
    db_session.commit()
    db_session.refresh(poste)
    
    # Créer un ticket
    ticket = TicketDepot(
        id=uuid4(),
        poste_id=poste.id,
        benevole_user_id=admin_user.id,
        status="closed",
        created_at=datetime.now() - timedelta(days=1),
        closed_at=datetime.now()
    )
    db_session.add(ticket)
    db_session.commit()
    db_session.refresh(ticket)
    
    # Créer des lignes
    lignes = []
    for i in range(2):
        ligne = LigneDepot(
            id=uuid4(),
            ticket_id=ticket.id,
            category_id=category.id,
            poids_kg=Decimal(f"{10.5 + i}"),
            destination=Destination.MAGASIN,
            notes=f"Test note {i}"
        )
        db_session.add(ligne)
        lignes.append(ligne)
    
    db_session.commit()
    for ligne in lignes:
        db_session.refresh(ligne)
    
    return ticket


def create_auth_headers(user_id: str) -> dict:
    """Créer les headers d'authentification pour un utilisateur."""
    from recyclic_api.core.security import create_access_token
    token = create_access_token(data={"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


class TestTicketExportCSV:
    """Tests pour l'endpoint GET /api/v1/reception/tickets/{id}/export-csv."""
    
    def test_export_ticket_csv_requires_admin_role(self, client: TestClient, db_session: Session):
        """Test que l'endpoint nécessite un rôle admin pour générer le token."""
        from recyclic_api.models import User, UserRole, UserStatus
        from uuid import uuid4
        
        regular_user = User(
            id=uuid4(),
            username="user@test.com",
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            hashed_password="hashed_password"
        )
        db_session.add(regular_user)
        db_session.commit()
        
        ticket_id = str(uuid4())
        headers = create_auth_headers(regular_user.id)
        response = client.post(
            f"/api/v1/reception/tickets/{ticket_id}/download-token",
            headers=headers
        )
        assert response.status_code == 403
    
    def test_export_ticket_csv_500_reproduction(self, client: TestClient, admin_user: User, ticket_with_lignes: TicketDepot):
        """
        Test de reproduction du bug 500.
        Ce test devrait échouer avec l'erreur actuelle, puis passer après correction.
        """
        headers = create_auth_headers(admin_user.id)
        ticket_id = str(ticket_with_lignes.id)
        
        # 1. Générer le token de téléchargement
        response = client.post(
            f"/api/v1/reception/tickets/{ticket_id}/download-token",
            headers=headers
        )
        assert response.status_code == 200
        token_data = response.json()
        assert "download_url" in token_data
        
        # Extraire le token de l'URL
        download_url = token_data["download_url"]
        token = download_url.split("token=")[1]
        
        # 2. Appeler l'endpoint d'export CSV
        response = client.get(
            f"/api/v1/reception/tickets/{ticket_id}/export-csv",
            params={"token": token}
        )
        
        # AVANT CORRECTION : Devrait échouer avec 500
        # APRÈS CORRECTION : Devrait retourner 200 avec le CSV
        assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text[:500]}"
        assert response.headers["content-type"] == "text/csv; charset=utf-8"
        assert "attachment" in response.headers["content-disposition"]
        
        # Vérifier le contenu CSV
        csv_content = response.text
        assert "=== RÉSUMÉ DU TICKET DE RÉCEPTION ===" in csv_content
        assert "=== DÉTAILS DES LIGNES DE DÉPÔT ===" in csv_content
        assert str(ticket_with_lignes.id) in csv_content
    
    def test_export_ticket_csv_without_lignes(self, client: TestClient, admin_user: User, db_session: Session, category: Category):
        """Test d'export d'un ticket sans lignes."""
        # Créer un ticket sans lignes
        poste = PosteReception(
            id=uuid4(),
            opened_by_user_id=admin_user.id,
            status="opened"
        )
        db_session.add(poste)
        db_session.commit()
        
        ticket = TicketDepot(
            id=uuid4(),
            poste_id=poste.id,
            benevole_user_id=admin_user.id,
            status="closed",
            created_at=datetime.now() - timedelta(days=1),
            closed_at=datetime.now()
        )
        db_session.add(ticket)
        db_session.commit()
        db_session.refresh(ticket)
        
        headers = create_auth_headers(admin_user.id)
        ticket_id = str(ticket.id)
        
        # Générer le token
        response = client.post(
            f"/api/v1/reception/tickets/{ticket_id}/download-token",
            headers=headers
        )
        assert response.status_code == 200
        token_data = response.json()
        token = token_data["download_url"].split("token=")[1]
        
        # Exporter
        response = client.get(
            f"/api/v1/reception/tickets/{ticket_id}/export-csv",
            params={"token": token}
        )
        
        assert response.status_code == 200
        csv_content = response.text
        assert "Nombre de lignes" in csv_content
        assert "0" in csv_content  # Aucune ligne
    
    def test_export_ticket_csv_invalid_token(self, client: TestClient, admin_user: User, ticket_with_lignes: TicketDepot):
        """Test avec un token invalide."""
        headers = create_auth_headers(admin_user.id)
        ticket_id = str(ticket_with_lignes.id)
        
        # Utiliser un token invalide
        response = client.get(
            f"/api/v1/reception/tickets/{ticket_id}/export-csv",
            params={"token": "invalid_token"}
        )
        
        assert response.status_code == 403
    
    def test_export_ticket_csv_nonexistent_ticket(self, client: TestClient, admin_user: User):
        """Test avec un ticket inexistant."""
        headers = create_auth_headers(admin_user.id)
        fake_ticket_id = str(uuid4())
        
        # Générer un token pour un ticket inexistant
        response = client.post(
            f"/api/v1/reception/tickets/{fake_ticket_id}/download-token",
            headers=headers
        )
        assert response.status_code == 404

