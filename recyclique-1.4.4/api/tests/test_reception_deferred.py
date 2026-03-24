"""
Tests pour la saisie différée de tickets de réception (Story B44-P2).
"""

import os
import pytest
from datetime import datetime, timezone, timedelta
from jose import jwt

os.environ["TESTING"] = "true"

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.poste_reception import PosteReception
from recyclic_api.models.ticket_depot import TicketDepot
from recyclic_api.core.security import hash_password, create_access_token


@pytest.fixture(scope="function")
def user_client(db_session: Session) -> TestClient:
    """
    Fixture pour un client de test avec les droits d'utilisateur standard (USER).
    """
    from fastapi.testclient import TestClient
    from recyclic_api.main import app
    import uuid
    
    # Création de l'utilisateur USER
    user_username = f"user_{uuid.uuid4().hex}@test.com"
    user_password = "user_password"
    hashed_password = hash_password(user_password)

    user = User(
        username=user_username,
        hashed_password=hashed_password,
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
        telegram_id=777777777
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # Génération du token
    access_token = create_access_token(data={"sub": str(user.id)})

    # Configuration du client de test
    client = TestClient(app)
    client.headers["Authorization"] = f"Bearer {access_token}"

    return client


def test_create_deferred_poste_with_past_date(admin_client):
    """Test création poste avec date passée (ADMIN)."""
    # Date passée (7 jours avant)
    past_date = datetime.now(timezone.utc) - timedelta(days=7)
    
    # Ouvrir un poste avec date passée
    response = admin_client.post(
        "/api/v1/reception/postes/open",
        json={"opened_at": past_date.isoformat()}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["status"] == "opened"
    
    # Vérifier que le poste a bien la date passée (via la base de données)
    # Note: On ne peut pas vérifier directement depuis la réponse car opened_at n'est pas retourné
    # On vérifiera via la création d'un ticket que la date est bien utilisée


def test_create_deferred_poste_with_future_date_error(admin_client):
    """Test création poste avec date future (erreur 400)."""
    # Date future (1 jour après)
    future_date = datetime.now(timezone.utc) + timedelta(days=1)
    
    # Tenter d'ouvrir un poste avec date future
    response = admin_client.post(
        "/api/v1/reception/postes/open",
        json={"opened_at": future_date.isoformat()}
    )
    
    assert response.status_code == 400
    assert "futur" in response.json()["detail"].lower()


def test_create_deferred_poste_by_user_forbidden(user_client):
    """Test création poste avec date personnalisée par USER (erreur 403)."""
    # Date passée
    past_date = datetime.now(timezone.utc) - timedelta(days=7)
    
    # Tenter d'ouvrir un poste avec date passée (USER ne peut pas)
    response = user_client.post(
        "/api/v1/reception/postes/open",
        json={"opened_at": past_date.isoformat()}
    )
    
    assert response.status_code == 403
    assert "administrateur" in response.json()["detail"].lower()


def test_create_normal_poste_without_opened_at(admin_client):
    """Test création poste normale sans opened_at (comportement actuel)."""
    # Ouvrir un poste sans date personnalisée
    response = admin_client.post("/api/v1/reception/postes/open")
    
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["status"] == "opened"


def test_create_ticket_in_deferred_poste_uses_poste_date(admin_client, db_session):
    """Test création ticket dans poste différé (created_at = opened_at du poste)."""
    # Date passée (7 jours avant)
    past_date = datetime.now(timezone.utc) - timedelta(days=7)
    
    # Ouvrir un poste avec date passée
    response = admin_client.post(
        "/api/v1/reception/postes/open",
        json={"opened_at": past_date.isoformat()}
    )
    assert response.status_code == 200
    poste_id = response.json()["id"]
    
    # Créer un ticket dans ce poste
    response = admin_client.post(
        "/api/v1/reception/tickets",
        json={"poste_id": poste_id}
    )
    assert response.status_code == 200
    ticket_id = response.json()["id"]
    
    # Vérifier que le ticket a la date du poste (pas la date actuelle)
    from uuid import UUID
    ticket = db_session.query(TicketDepot).filter(TicketDepot.id == UUID(ticket_id)).first()
    assert ticket is not None
    
    # Vérifier que created_at du ticket est proche de opened_at du poste (tolérance de 1 seconde)
    poste = db_session.query(PosteReception).filter(PosteReception.id == UUID(poste_id)).first()
    assert poste is not None
    
    # Normaliser les dates en UTC pour comparaison
    ticket_created_at = ticket.created_at
    if ticket_created_at.tzinfo is None:
        ticket_created_at = ticket_created_at.replace(tzinfo=timezone.utc)
    elif ticket_created_at.tzinfo != timezone.utc:
        ticket_created_at = ticket_created_at.astimezone(timezone.utc)
    
    poste_opened_at = poste.opened_at
    if poste_opened_at.tzinfo is None:
        poste_opened_at = poste_opened_at.replace(tzinfo=timezone.utc)
    elif poste_opened_at.tzinfo != timezone.utc:
        poste_opened_at = poste_opened_at.astimezone(timezone.utc)
    
    # Vérifier que les dates sont proches (tolérance de 1 seconde)
    time_diff = abs((ticket_created_at - poste_opened_at).total_seconds())
    assert time_diff < 1, f"Ticket created_at ({ticket_created_at}) should be close to poste opened_at ({poste_opened_at})"
    
    # Vérifier que la date du ticket est dans le passé (pas maintenant)
    now = datetime.now(timezone.utc)
    assert ticket_created_at < now - timedelta(days=6), "Ticket should have past date"


def test_create_ticket_in_normal_poste_uses_current_time(admin_client, db_session):
    """Test création ticket dans poste normale (created_at = now())."""
    # Ouvrir un poste normale (sans date personnalisée)
    response = admin_client.post("/api/v1/reception/postes/open")
    assert response.status_code == 200
    poste_id = response.json()["id"]
    
    # Créer un ticket dans ce poste
    before_creation = datetime.now(timezone.utc)
    response = admin_client.post(
        "/api/v1/reception/tickets",
        json={"poste_id": poste_id}
    )
    assert response.status_code == 200
    ticket_id = response.json()["id"]
    after_creation = datetime.now(timezone.utc)
    
    # Vérifier que le ticket a la date actuelle (pas la date du poste)
    from uuid import UUID
    ticket = db_session.query(TicketDepot).filter(TicketDepot.id == UUID(ticket_id)).first()
    assert ticket is not None
    
    # Normaliser la date en UTC
    ticket_created_at = ticket.created_at
    if ticket_created_at.tzinfo is None:
        ticket_created_at = ticket_created_at.replace(tzinfo=timezone.utc)
    elif ticket_created_at.tzinfo != timezone.utc:
        ticket_created_at = ticket_created_at.astimezone(timezone.utc)
    
    # Vérifier que la date est proche de maintenant (tolérance de 5 secondes)
    assert before_creation <= ticket_created_at <= after_creation, \
        f"Ticket created_at ({ticket_created_at}) should be between {before_creation} and {after_creation}"


def test_create_deferred_poste_with_very_old_date(admin_client):
    """Test création poste avec date très ancienne (pas de limite dans le passé)."""
    # Date très ancienne (2 ans avant)
    very_old_date = datetime.now(timezone.utc) - timedelta(days=730)
    
    # Ouvrir un poste avec date très ancienne
    response = admin_client.post(
        "/api/v1/reception/postes/open",
        json={"opened_at": very_old_date.isoformat()}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["status"] == "opened"


def test_create_deferred_poste_with_today_date(admin_client):
    """Test création poste avec date d'aujourd'hui (doit être acceptée)."""
    # Date d'aujourd'hui (limite acceptable)
    today_date = datetime.now(timezone.utc)
    
    # Ouvrir un poste avec date d'aujourd'hui
    response = admin_client.post(
        "/api/v1/reception/postes/open",
        json={"opened_at": today_date.isoformat()}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["status"] == "opened"


def test_super_admin_can_create_deferred_poste(super_admin_client):
    """Test que SUPER_ADMIN peut créer un poste différé."""
    # Date passée
    past_date = datetime.now(timezone.utc) - timedelta(days=7)
    
    # Ouvrir un poste avec date passée
    response = super_admin_client.post(
        "/api/v1/reception/postes/open",
        json={"opened_at": past_date.isoformat()}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["status"] == "opened"

