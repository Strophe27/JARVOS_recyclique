"""Tests d'intégration pour les filtres avancés combinés (B45-P2)."""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models import (
    CashSession, CashSessionStatus, 
    PosteReception, PosteReceptionStatus, TicketDepot, TicketDepotStatus, LigneDepot
)
from recyclic_api.models.sale import Sale, PaymentMethod
from recyclic_api.models.ligne_depot import Destination
from recyclic_api.models.category import Category
from recyclic_api.core.security import hash_password


@pytest.fixture
def test_operator(db_session):
    """Créer un opérateur de test."""
    operator = User(
        id=uuid.uuid4(),
        username="test_operator",
        hashed_password=hash_password("testpass"),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    db_session.add(operator)
    db_session.commit()
    return operator


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
def test_site_id():
    """ID de site de test."""
    return uuid.uuid4()


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


def test_combined_advanced_filters_cash_sessions(admin_client, db_session, test_operator, test_site_id):
    """Test combinaison de tous les filtres avancés pour les sessions de caisse."""
    base_time = datetime.now(timezone.utc) - timedelta(days=1)
    
    # Créer une session qui correspond à tous les critères
    session = CashSession(
        operator_id=test_operator.id,
        site_id=test_site_id,
        register_id=uuid.uuid4(),
        initial_amount=50.0,
        current_amount=150.0,
        status=CashSessionStatus.CLOSED,
        opened_at=base_time,
        closed_at=base_time + timedelta(hours=3),  # Durée de 3h
        total_sales=100.0,  # Montant entre 50 et 200
        total_items=5,
        variance=5.0,  # Avec variance
    )
    db_session.add(session)
    db_session.flush()
    
    # Créer une vente avec don et méthode de paiement card
    sale = Sale(
        id=uuid.uuid4(),
        cash_session_id=session.id,
        operator_id=test_operator.id,
        total_amount=100.0,
        donation=10.0,
        payment_method=PaymentMethod.CARD,
    )
    db_session.add(sale)
    db_session.commit()
    
    # Test: combinaison de tous les filtres
    params = {
        "amount_min": 50.0,
        "amount_max": 200.0,
        "variance_has_variance": True,
        "duration_min_hours": 2.0,
        "duration_max_hours": 4.0,
        "payment_methods": ["card"],
        "has_donation": True,
    }
    r = admin_client.get("/v1/cash-sessions/", params=params)
    assert r.status_code == 200
    payload = r.json()
    # La session doit être présente
    session_ids = [row["id"] for row in payload["data"]]
    assert str(session.id) in session_ids


def test_combined_advanced_filters_reception_tickets(admin_client, db_session, test_benevole, test_categories):
    """Test combinaison de tous les filtres avancés pour les tickets de réception."""
    # Créer un poste
    poste = PosteReception(
        id=uuid.uuid4(),
        opened_by_user_id=test_benevole.id,
        status=PosteReceptionStatus.OPENED.value,
        opened_at=datetime.now(timezone.utc),
    )
    db_session.add(poste)
    db_session.flush()
    
    # Créer un ticket qui correspond à tous les critères
    ticket = TicketDepot(
        id=uuid.uuid4(),
        poste_id=poste.id,
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


def test_filters_et_logic(admin_client, db_session, test_operator, test_site_id):
    """Test que tous les filtres utilisent une logique ET (tous doivent être satisfaits)."""
    base_time = datetime.now(timezone.utc) - timedelta(days=1)
    
    # Créer 3 sessions avec différentes combinaisons de critères
    sessions = []
    
    # Session 1: Montant OK mais pas de variance
    s1 = CashSession(
        operator_id=test_operator.id,
        site_id=test_site_id,
        register_id=uuid.uuid4(),
        initial_amount=50.0,
        current_amount=150.0,
        status=CashSessionStatus.CLOSED,
        opened_at=base_time,
        closed_at=base_time + timedelta(hours=2),
        total_sales=100.0,  # Montant OK
        total_items=5,
        variance=0.0,  # Pas de variance
    )
    db_session.add(s1)
    db_session.flush()
    
    # Session 2: Variance OK mais montant trop bas
    s2 = CashSession(
        operator_id=test_operator.id,
        site_id=test_site_id,
        register_id=uuid.uuid4(),
        initial_amount=50.0,
        current_amount=60.0,
        status=CashSessionStatus.CLOSED,
        opened_at=base_time + timedelta(hours=1),
        closed_at=base_time + timedelta(hours=2),
        total_sales=10.0,  # Montant trop bas
        total_items=2,
        variance=5.0,  # Variance OK
    )
    db_session.add(s2)
    db_session.flush()
    
    # Session 3: Tous les critères OK
    s3 = CashSession(
        operator_id=test_operator.id,
        site_id=test_site_id,
        register_id=uuid.uuid4(),
        initial_amount=50.0,
        current_amount=160.0,
        status=CashSessionStatus.CLOSED,
        opened_at=base_time + timedelta(hours=2),
        closed_at=base_time + timedelta(hours=3),
        total_sales=110.0,  # Montant OK
        total_items=5,
        variance=5.0,  # Variance OK
    )
    db_session.add(s3)
    sessions = [s1, s2, s3]
    db_session.commit()
    
    # Test: Filtrer par montant ET variance
    # Seule la session 3 doit être retournée
    params = {
        "amount_min": 50.0,
        "amount_max": 200.0,
        "variance_has_variance": True,
    }
    r = admin_client.get("/v1/cash-sessions/", params=params)
    assert r.status_code == 200
    payload = r.json()
    session_ids = [row["id"] for row in payload["data"]]
    # Seule la session 3 doit être présente
    assert str(s3.id) in session_ids
    assert str(s1.id) not in session_ids  # Pas de variance
    assert str(s2.id) not in session_ids  # Montant trop bas

