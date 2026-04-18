"""
Tests pour l'endpoint GET {API_V1_STR}/reception/tickets avec filtre de statut.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4

from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.site import Site
from recyclic_api.models.poste_reception import PosteReception, PosteReceptionStatus
from recyclic_api.models.ticket_depot import TicketDepot, TicketDepotStatus
from recyclic_api.core.security import hash_password
from recyclic_api.core.config import settings
from tests.reception_story72_eligibility import grant_user_reception_eligibility

_V1 = settings.API_V1_STR.rstrip("/")


class TestReceptionTicketsStatusFilter:
    """Tests pour le filtre de statut sur GET reception/tickets (préfixe API_V1_STR)."""

    def test_get_tickets_without_status_filter(self, client: TestClient, db_session: Session):
        """Test que l'endpoint retourne tous les tickets quand aucun filtre de statut n'est fourni."""
        site = Site(id=uuid4(), name="Site tickets filtre", is_active=True)
        db_session.add(site)
        db_session.commit()
        db_session.refresh(site)
        user = User(
            id=uuid4(),
            username="test@example.com",
            hashed_password=hash_password("testpassword"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            site_id=site.id,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        grant_user_reception_eligibility(db_session, user, site.id)

        # Créer un poste de réception
        poste = PosteReception(
            id=uuid4(),
            opened_by_user_id=user.id,
            status=PosteReceptionStatus.OPENED.value
        )
        db_session.add(poste)
        db_session.commit()

        # Créer des tickets avec différents statuts
        ticket_opened = TicketDepot(
            id=uuid4(),
            poste_id=poste.id,
            benevole_user_id=user.id,
            status=TicketDepotStatus.OPENED.value
        )
        ticket_closed = TicketDepot(
            id=uuid4(),
            poste_id=poste.id,
            benevole_user_id=user.id,
            status=TicketDepotStatus.CLOSED.value
        )
        db_session.add(ticket_opened)
        db_session.add(ticket_closed)
        db_session.commit()

        # Authentifier l'utilisateur
        login_response = client.post(f"{_V1}/auth/login", json={
            "username": "test@example.com",
            "password": "testpassword"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"

        # Appeler l'endpoint sans filtre (tickets sans lignes : include_empty=true)
        response = client.get(
            f"{_V1}/reception/tickets",
            params={"include_empty": True},
        )

        # Vérifications
        assert response.status_code == 200
        data = response.json()
        
        # Vérifier que les deux tickets sont retournés
        assert data["total"] == 2
        assert len(data["tickets"]) == 2
        
        # Vérifier que les tickets ont les bons statuts
        statuses = [ticket["status"] for ticket in data["tickets"]]
        assert "opened" in statuses
        assert "closed" in statuses

    def test_get_tickets_with_status_filter_opened(self, client: TestClient, db_session: Session):
        """Test que l'endpoint retourne uniquement les tickets ouverts avec le filtre status=opened."""
        site = Site(id=uuid4(), name="Site tickets filtre", is_active=True)
        db_session.add(site)
        db_session.commit()
        db_session.refresh(site)
        user = User(
            id=uuid4(),
            username="test@example.com",
            hashed_password=hash_password("testpassword"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            site_id=site.id,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        grant_user_reception_eligibility(db_session, user, site.id)

        # Créer un poste de réception
        poste = PosteReception(
            id=uuid4(),
            opened_by_user_id=user.id,
            status=PosteReceptionStatus.OPENED.value
        )
        db_session.add(poste)
        db_session.commit()

        # Créer des tickets avec différents statuts
        ticket_opened = TicketDepot(
            id=uuid4(),
            poste_id=poste.id,
            benevole_user_id=user.id,
            status=TicketDepotStatus.OPENED.value
        )
        ticket_closed = TicketDepot(
            id=uuid4(),
            poste_id=poste.id,
            benevole_user_id=user.id,
            status=TicketDepotStatus.CLOSED.value
        )
        db_session.add(ticket_opened)
        db_session.add(ticket_closed)
        db_session.commit()

        # Authentifier l'utilisateur
        login_response = client.post(f"{_V1}/auth/login", json={
            "username": "test@example.com",
            "password": "testpassword"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"

        response = client.get(
            f"{_V1}/reception/tickets",
            params={"status": "opened", "include_empty": True},
        )

        # Vérifications
        assert response.status_code == 200
        data = response.json()
        
        # Vérifier qu'un seul ticket est retourné
        assert data["total"] == 1
        assert len(data["tickets"]) == 1
        
        # Vérifier que le ticket retourné est bien ouvert
        ticket = data["tickets"][0]
        assert ticket["status"] == "opened"
        assert ticket["id"] == str(ticket_opened.id)

    def test_get_tickets_with_status_filter_closed(self, client: TestClient, db_session: Session):
        """Test que l'endpoint retourne uniquement les tickets fermés avec le filtre status=closed."""
        site = Site(id=uuid4(), name="Site tickets filtre", is_active=True)
        db_session.add(site)
        db_session.commit()
        db_session.refresh(site)
        user = User(
            id=uuid4(),
            username="test@example.com",
            hashed_password=hash_password("testpassword"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            site_id=site.id,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        grant_user_reception_eligibility(db_session, user, site.id)

        # Créer un poste de réception
        poste = PosteReception(
            id=uuid4(),
            opened_by_user_id=user.id,
            status=PosteReceptionStatus.OPENED.value
        )
        db_session.add(poste)
        db_session.commit()

        # Créer des tickets avec différents statuts
        ticket_opened = TicketDepot(
            id=uuid4(),
            poste_id=poste.id,
            benevole_user_id=user.id,
            status=TicketDepotStatus.OPENED.value
        )
        ticket_closed = TicketDepot(
            id=uuid4(),
            poste_id=poste.id,
            benevole_user_id=user.id,
            status=TicketDepotStatus.CLOSED.value
        )
        db_session.add(ticket_opened)
        db_session.add(ticket_closed)
        db_session.commit()

        # Authentifier l'utilisateur
        login_response = client.post(f"{_V1}/auth/login", json={
            "username": "test@example.com",
            "password": "testpassword"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"

        response = client.get(
            f"{_V1}/reception/tickets",
            params={"status": "closed", "include_empty": True},
        )

        # Vérifications
        assert response.status_code == 200
        data = response.json()
        
        # Vérifier qu'un seul ticket est retourné
        assert data["total"] == 1
        assert len(data["tickets"]) == 1
        
        # Vérifier que le ticket retourné est bien fermé
        ticket = data["tickets"][0]
        assert ticket["status"] == "closed"
        assert ticket["id"] == str(ticket_closed.id)

    def test_get_tickets_with_invalid_status_filter(self, client: TestClient, db_session: Session):
        """Test que l'endpoint retourne une liste vide avec un statut invalide."""
        site = Site(id=uuid4(), name="Site tickets filtre", is_active=True)
        db_session.add(site)
        db_session.commit()
        db_session.refresh(site)
        user = User(
            id=uuid4(),
            username="test@example.com",
            hashed_password=hash_password("testpassword"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            site_id=site.id,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        grant_user_reception_eligibility(db_session, user, site.id)

        # Créer un poste de réception
        poste = PosteReception(
            id=uuid4(),
            opened_by_user_id=user.id,
            status=PosteReceptionStatus.OPENED.value
        )
        db_session.add(poste)
        db_session.commit()

        # Créer un ticket ouvert
        ticket_opened = TicketDepot(
            id=uuid4(),
            poste_id=poste.id,
            benevole_user_id=user.id,
            status=TicketDepotStatus.OPENED.value
        )
        db_session.add(ticket_opened)
        db_session.commit()

        # Authentifier l'utilisateur
        login_response = client.post(f"{_V1}/auth/login", json={
            "username": "test@example.com",
            "password": "testpassword"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"

        response = client.get(
            f"{_V1}/reception/tickets",
            params={"status": "invalid_status", "include_empty": True},
        )

        # Vérifications
        assert response.status_code == 200
        data = response.json()
        
        # Vérifier qu'aucun ticket n'est retourné
        assert data["total"] == 0
        assert len(data["tickets"]) == 0

    def test_get_tickets_requires_authentication(self, client: TestClient):
        """Test que l'endpoint nécessite une authentification."""
        response = client.get(f"{_V1}/reception/tickets")
        assert response.status_code == 403  # comme les autres tests reception (pas de token)

    def test_get_tickets_with_pagination_and_status_filter(self, client: TestClient, db_session: Session):
        """Test que la pagination fonctionne correctement avec le filtre de statut."""
        site = Site(id=uuid4(), name="Site tickets filtre", is_active=True)
        db_session.add(site)
        db_session.commit()
        db_session.refresh(site)
        user = User(
            id=uuid4(),
            username="test@example.com",
            hashed_password=hash_password("testpassword"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            site_id=site.id,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        grant_user_reception_eligibility(db_session, user, site.id)

        # Créer un poste de réception
        poste = PosteReception(
            id=uuid4(),
            opened_by_user_id=user.id,
            status=PosteReceptionStatus.OPENED.value
        )
        db_session.add(poste)
        db_session.commit()

        # Créer plusieurs tickets ouverts
        for i in range(5):
            ticket = TicketDepot(
                id=uuid4(),
                poste_id=poste.id,
                benevole_user_id=user.id,
                status=TicketDepotStatus.OPENED.value
            )
            db_session.add(ticket)
        db_session.commit()

        # Authentifier l'utilisateur
        login_response = client.post(f"{_V1}/auth/login", json={
            "username": "test@example.com",
            "password": "testpassword"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"

        response = client.get(
            f"{_V1}/reception/tickets",
            params={
                "status": "opened",
                "page": 1,
                "per_page": 3,
                "include_empty": True,
            },
        )

        # Vérifications
        assert response.status_code == 200
        data = response.json()
        
        # Vérifier la pagination
        assert data["total"] == 5
        assert len(data["tickets"]) == 3
        assert data["page"] == 1
        assert data["per_page"] == 3
        assert data["total_pages"] == 2
        
        # Vérifier que tous les tickets retournés sont ouverts
        for ticket in data["tickets"]:
            assert ticket["status"] == "opened"

