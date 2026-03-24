"""Tests pour les filtres avancés des tickets de réception (B45-P2)."""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models import PosteReception, PosteReceptionStatus, TicketDepot, TicketDepotStatus, LigneDepot
from recyclic_api.models.ligne_depot import Destination
from recyclic_api.models.category import Category
from recyclic_api.core.security import hash_password


@pytest.fixture
def test_benevole(db_session):
    """Créer un bénévole de test."""
    benevole = User(
        id=uuid.uuid4(),
        username="test_benevole",
        hashed_password=hash_password("testpass"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
    )
    db_session.add(benevole)
    db_session.commit()
    return benevole


@pytest.fixture
def test_categories(db_session):
    """Créer des catégories de test."""
    categories = []
    for i, name in enumerate(["EEE-1", "EEE-2", "EEE-3"]):
        cat = Category(
            id=uuid.uuid4(),
            name=name,
            is_active=True,
        )
        db_session.add(cat)
        categories.append(cat)
    db_session.commit()
    return categories


@pytest.fixture
def test_poste(db_session, test_benevole):
    """Créer un poste de réception de test."""
    poste = PosteReception(
        id=uuid.uuid4(),
        opened_by_user_id=test_benevole.id,
        status=PosteReceptionStatus.OPENED.value,
        opened_at=datetime.now(timezone.utc),
    )
    db_session.add(poste)
    db_session.commit()
    return poste


def test_filter_by_poids_min_max(admin_client, db_session, test_benevole, test_poste, test_categories):
    """Test filtre par poids min/max."""
    # Créer des tickets avec différents poids totaux
    tickets = []
    poids_totaux = [5.0, 10.0, 20.0, 30.0, 50.0]
    
    for i, poids_total in enumerate(poids_totaux):
        ticket = TicketDepot(
            id=uuid.uuid4(),
            poste_id=test_poste.id,
            benevole_user_id=test_benevole.id,
            status=TicketDepotStatus.CLOSED.value,
            created_at=datetime.now(timezone.utc) - timedelta(hours=i),
            closed_at=datetime.now(timezone.utc) - timedelta(hours=i-1),
        )
        db_session.add(ticket)
        db_session.flush()
        
        # Créer une ligne avec le poids total
        ligne = LigneDepot(
            id=uuid.uuid4(),
            ticket_id=ticket.id,
            category_id=test_categories[0].id,
            poids_kg=Decimal(str(poids_total)),
            destination=Destination.MAGASIN,
        )
        db_session.add(ligne)
        tickets.append(ticket)
    db_session.commit()
    
    # Test: filtre par poids min
    params = {"poids_min": 20.0}
    r = admin_client.get("/v1/reception/tickets", params=params)
    assert r.status_code == 200
    payload = r.json()
    # Vérifier que tous les tickets ont un poids >= 20.0
    ticket_ids = [t["id"] for t in payload["tickets"]]
    assert any(str(tickets[2].id) in ticket_ids)  # 20.0
    assert any(str(tickets[3].id) in ticket_ids)  # 30.0
    assert any(str(tickets[4].id) in ticket_ids)  # 50.0
    
    # Test: filtre par poids max
    params = {"poids_max": 20.0}
    r = admin_client.get("/v1/reception/tickets", params=params)
    assert r.status_code == 200
    payload = r.json()
    # Vérifier que tous les tickets ont un poids <= 20.0
    ticket_ids = [t["id"] for t in payload["tickets"]]
    assert any(str(tickets[0].id) in ticket_ids)  # 5.0
    assert any(str(tickets[1].id) in ticket_ids)  # 10.0
    assert any(str(tickets[2].id) in ticket_ids)  # 20.0


def test_filter_by_categories(admin_client, db_session, test_benevole, test_poste, test_categories):
    """Test filtre par catégories (multi-sélection)."""
    # Créer des tickets avec différentes catégories
    tickets = []
    for i, category in enumerate(test_categories):
        ticket = TicketDepot(
            id=uuid.uuid4(),
            poste_id=test_poste.id,
            benevole_user_id=test_benevole.id,
            status=TicketDepotStatus.CLOSED.value,
            created_at=datetime.now(timezone.utc) - timedelta(hours=i),
            closed_at=datetime.now(timezone.utc) - timedelta(hours=i-1),
        )
        db_session.add(ticket)
        db_session.flush()
        
        # Créer une ligne avec la catégorie
        ligne = LigneDepot(
            id=uuid.uuid4(),
            ticket_id=ticket.id,
            category_id=category.id,
            poids_kg=Decimal("10.0"),
            destination=Destination.MAGASIN,
        )
        db_session.add(ligne)
        tickets.append(ticket)
    db_session.commit()
    
    # Test: filtre par une catégorie
    params = {"categories": [str(test_categories[0].id)]}
    r = admin_client.get("/v1/reception/tickets", params=params)
    assert r.status_code == 200
    payload = r.json()
    ticket_ids = [t["id"] for t in payload["tickets"]]
    assert any(str(tickets[0].id) in ticket_ids)
    
    # Test: filtre par plusieurs catégories
    params = {"categories": [str(test_categories[0].id), str(test_categories[1].id)]}
    r = admin_client.get("/v1/reception/tickets", params=params)
    assert r.status_code == 200
    payload = r.json()
    ticket_ids = [t["id"] for t in payload["tickets"]]
    assert any(str(tickets[0].id) in ticket_ids)
    assert any(str(tickets[1].id) in ticket_ids)


def test_filter_by_destinations(admin_client, db_session, test_benevole, test_poste, test_categories):
    """Test filtre par destinations (multi-sélection)."""
    # Créer des tickets avec différentes destinations
    destinations_list = [Destination.MAGASIN, Destination.RECYCLAGE, Destination.DECHETERIE]
    tickets = []
    
    for i, destination in enumerate(destinations_list):
        ticket = TicketDepot(
            id=uuid.uuid4(),
            poste_id=test_poste.id,
            benevole_user_id=test_benevole.id,
            status=TicketDepotStatus.CLOSED.value,
            created_at=datetime.now(timezone.utc) - timedelta(hours=i),
            closed_at=datetime.now(timezone.utc) - timedelta(hours=i-1),
        )
        db_session.add(ticket)
        db_session.flush()
        
        # Créer une ligne avec la destination
        ligne = LigneDepot(
            id=uuid.uuid4(),
            ticket_id=ticket.id,
            category_id=test_categories[0].id,
            poids_kg=Decimal("10.0"),
            destination=destination,
        )
        db_session.add(ligne)
        tickets.append(ticket)
    db_session.commit()
    
    # Test: filtre par une destination
    params = {"destinations": ["MAGASIN"]}
    r = admin_client.get("/v1/reception/tickets", params=params)
    assert r.status_code == 200
    payload = r.json()
    ticket_ids = [t["id"] for t in payload["tickets"]]
    assert any(str(tickets[0].id) in ticket_ids)
    
    # Test: filtre par plusieurs destinations
    params = {"destinations": ["MAGASIN", "RECYCLAGE"]}
    r = admin_client.get("/v1/reception/tickets", params=params)
    assert r.status_code == 200
    payload = r.json()
    ticket_ids = [t["id"] for t in payload["tickets"]]
    assert any(str(tickets[0].id) in ticket_ids)
    assert any(str(tickets[1].id) in ticket_ids)


def test_filter_by_lignes_min_max(admin_client, db_session, test_benevole, test_poste, test_categories):
    """Test filtre par nombre de lignes min/max."""
    # Créer des tickets avec différents nombres de lignes
    tickets = []
    lignes_counts = [1, 2, 3, 5, 10]
    
    for i, lignes_count in enumerate(lignes_counts):
        ticket = TicketDepot(
            id=uuid.uuid4(),
            poste_id=test_poste.id,
            benevole_user_id=test_benevole.id,
            status=TicketDepotStatus.CLOSED.value,
            created_at=datetime.now(timezone.utc) - timedelta(hours=i),
            closed_at=datetime.now(timezone.utc) - timedelta(hours=i-1),
        )
        db_session.add(ticket)
        db_session.flush()
        
        # Créer plusieurs lignes
        for j in range(lignes_count):
            ligne = LigneDepot(
                id=uuid.uuid4(),
                ticket_id=ticket.id,
                category_id=test_categories[0].id,
                poids_kg=Decimal("10.0"),
                destination=Destination.MAGASIN,
            )
            db_session.add(ligne)
        tickets.append(ticket)
    db_session.commit()
    
    # Test: filtre par nombre de lignes min
    params = {"lignes_min": 3}
    r = admin_client.get("/v1/reception/tickets", params=params)
    assert r.status_code == 200
    payload = r.json()
    ticket_ids = [t["id"] for t in payload["tickets"]]
    # Les tickets avec 3, 5, 10 lignes doivent être présents
    assert any(str(tickets[2].id) in ticket_ids)  # 3 lignes
    assert any(str(tickets[3].id) in ticket_ids)  # 5 lignes
    assert any(str(tickets[4].id) in ticket_ids)  # 10 lignes
    
    # Test: filtre par nombre de lignes max
    params = {"lignes_max": 3}
    r = admin_client.get("/v1/reception/tickets", params=params)
    assert r.status_code == 200
    payload = r.json()
    ticket_ids = [t["id"] for t in payload["tickets"]]
    # Les tickets avec 1, 2, 3 lignes doivent être présents
    assert any(str(tickets[0].id) in ticket_ids)  # 1 ligne
    assert any(str(tickets[1].id) in ticket_ids)  # 2 lignes
    assert any(str(tickets[2].id) in ticket_ids)  # 3 lignes


def test_combined_advanced_filters(admin_client, db_session, test_benevole, test_poste, test_categories):
    """Test combinaison de plusieurs filtres avancés."""
    # Créer un ticket qui correspond à tous les critères
    ticket = TicketDepot(
        id=uuid.uuid4(),
        poste_id=test_poste.id,
        benevole_user_id=test_benevole.id,
        status=TicketDepotStatus.CLOSED.value,
        created_at=datetime.now(timezone.utc) - timedelta(hours=1),
        closed_at=datetime.now(timezone.utc),
    )
    db_session.add(ticket)
    db_session.flush()
    
    # Créer 3 lignes avec différentes catégories et destinations
    for i in range(3):
        ligne = LigneDepot(
            id=uuid.uuid4(),
            ticket_id=ticket.id,
            category_id=test_categories[i % len(test_categories)].id,
            poids_kg=Decimal("10.0"),  # Total = 30.0 kg
            destination=[Destination.MAGASIN, Destination.RECYCLAGE, Destination.DECHETERIE][i],
        )
        db_session.add(ligne)
    db_session.commit()
    
    # Test: combinaison de tous les filtres
    params = {
        "poids_min": 20.0,
        "poids_max": 40.0,
        "categories": [str(test_categories[0].id)],
        "destinations": ["MAGASIN"],
        "lignes_min": 2,
        "lignes_max": 5,
    }
    r = admin_client.get("/v1/reception/tickets", params=params)
    assert r.status_code == 200
    payload = r.json()
    # Le ticket doit être présent
    ticket_ids = [t["id"] for t in payload["tickets"]]
    assert str(ticket.id) in ticket_ids

