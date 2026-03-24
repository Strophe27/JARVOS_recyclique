"""Tests pour les filtres avancés des sessions de caisse (B45-P2)."""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.sale import Sale, PaymentMethod
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
def test_site_id():
    """ID de site de test."""
    return uuid.uuid4()


def test_filter_by_amount_min_max(admin_client, db_session, test_operator, test_site_id):
    """Test filtre par montant min/max."""
    base_time = datetime.now(timezone.utc) - timedelta(days=1)
    
    # Créer des sessions avec différents montants
    sessions = []
    amounts = [50.0, 100.0, 200.0, 300.0, 500.0]
    for i, amount in enumerate(amounts):
        s = CashSession(
            operator_id=test_operator.id,
            site_id=test_site_id,
            register_id=uuid.uuid4(),
            initial_amount=10.0,
            current_amount=10.0 + amount,
            status=CashSessionStatus.CLOSED,
            opened_at=base_time + timedelta(hours=i),
            closed_at=base_time + timedelta(hours=i+1),
            total_sales=amount,
            total_items=i+1,
        )
        sessions.append(s)
    db_session.add_all(sessions)
    db_session.commit()
    
    # Test: filtre par montant min
    params = {"amount_min": 200.0}
    r = admin_client.get("/v1/cash-sessions/", params=params)
    assert r.status_code == 200
    payload = r.json()
    assert all(row["total_sales"] >= 200.0 for row in payload["data"])
    
    # Test: filtre par montant max
    params = {"amount_max": 200.0}
    r = admin_client.get("/v1/cash-sessions/", params=params)
    assert r.status_code == 200
    payload = r.json()
    assert all(row["total_sales"] <= 200.0 for row in payload["data"])
    
    # Test: filtre par montant min et max
    params = {"amount_min": 100.0, "amount_max": 300.0}
    r = admin_client.get("/v1/cash-sessions/", params=params)
    assert r.status_code == 200
    payload = r.json()
    assert all(100.0 <= row["total_sales"] <= 300.0 for row in payload["data"])


def test_filter_by_variance(admin_client, db_session, test_operator, test_site_id):
    """Test filtre par variance."""
    base_time = datetime.now(timezone.utc) - timedelta(days=1)
    
    # Créer des sessions avec différentes variances
    sessions = []
    variances = [0.0, 5.0, -10.0, 15.0, None]
    for i, variance in enumerate(variances):
        s = CashSession(
            operator_id=test_operator.id,
            site_id=test_site_id,
            register_id=uuid.uuid4(),
            initial_amount=50.0,
            current_amount=50.0 + (variance or 0.0),
            status=CashSessionStatus.CLOSED,
            opened_at=base_time + timedelta(hours=i),
            closed_at=base_time + timedelta(hours=i+1),
            total_sales=100.0,
            total_items=5,
            variance=variance,
        )
        sessions.append(s)
    db_session.add_all(sessions)
    db_session.commit()
    
    # Test: filtre par présence de variance
    params = {"variance_has_variance": True}
    r = admin_client.get("/v1/cash-sessions/", params=params)
    assert r.status_code == 200
    payload = r.json()
    assert all(
        row.get("variance") is not None and row["variance"] != 0.0 
        for row in payload["data"]
    )
    
    # Test: filtre par absence de variance
    params = {"variance_has_variance": False}
    r = admin_client.get("/v1/cash-sessions/", params=params)
    assert r.status_code == 200
    payload = r.json()
    assert all(
        row.get("variance") is None or row["variance"] == 0.0 
        for row in payload["data"]
    )
    
    # Test: filtre par seuil de variance
    params = {"variance_threshold": 10.0}
    r = admin_client.get("/v1/cash-sessions/", params=params)
    assert r.status_code == 200
    payload = r.json()
    # Vérifier que toutes les sessions ont une variance >= 10.0 en valeur absolue
    for row in payload["data"]:
        if row.get("variance") is not None:
            assert abs(row["variance"]) >= 10.0


def test_filter_by_duration(admin_client, db_session, test_operator, test_site_id):
    """Test filtre par durée de session."""
    base_time = datetime.now(timezone.utc) - timedelta(days=1)
    
    # Créer des sessions avec différentes durées (en heures)
    sessions = []
    durations_hours = [0.5, 1.0, 2.0, 4.0, 8.0]
    for i, duration_hours in enumerate(durations_hours):
        opened = base_time + timedelta(hours=i)
        closed = opened + timedelta(hours=duration_hours)
        s = CashSession(
            operator_id=test_operator.id,
            site_id=test_site_id,
            register_id=uuid.uuid4(),
            initial_amount=50.0,
            current_amount=100.0,
            status=CashSessionStatus.CLOSED,
            opened_at=opened,
            closed_at=closed,
            total_sales=50.0,
            total_items=5,
        )
        sessions.append(s)
    db_session.add_all(sessions)
    db_session.commit()
    
    # Test: filtre par durée min
    params = {"duration_min_hours": 2.0}
    r = admin_client.get("/v1/cash-sessions/", params=params)
    assert r.status_code == 200
    payload = r.json()
    # Vérifier que toutes les sessions ont une durée >= 2h
    for row in payload["data"]:
        opened = datetime.fromisoformat(row["opened_at"].replace('Z', '+00:00'))
        closed = datetime.fromisoformat(row["closed_at"].replace('Z', '+00:00'))
        duration_hours = (closed - opened).total_seconds() / 3600.0
        assert duration_hours >= 2.0
    
    # Test: filtre par durée max
    params = {"duration_max_hours": 2.0}
    r = admin_client.get("/v1/cash-sessions/", params=params)
    assert r.status_code == 200
    payload = r.json()
    # Vérifier que toutes les sessions ont une durée <= 2h
    for row in payload["data"]:
        opened = datetime.fromisoformat(row["opened_at"].replace('Z', '+00:00'))
        closed = datetime.fromisoformat(row["closed_at"].replace('Z', '+00:00'))
        duration_hours = (closed - opened).total_seconds() / 3600.0
        assert duration_hours <= 2.0


def test_filter_by_payment_methods(admin_client, db_session, test_operator, test_site_id):
    """Test filtre par méthodes de paiement."""
    base_time = datetime.now(timezone.utc) - timedelta(days=1)
    
    # Créer des sessions avec différentes méthodes de paiement
    payment_methods = [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.CHECK]
    sessions = []
    for i, payment_method in enumerate(payment_methods):
        s = CashSession(
            operator_id=test_operator.id,
            site_id=test_site_id,
            register_id=uuid.uuid4(),
            initial_amount=50.0,
            current_amount=100.0,
            status=CashSessionStatus.CLOSED,
            opened_at=base_time + timedelta(hours=i),
            closed_at=base_time + timedelta(hours=i+1),
            total_sales=50.0,
            total_items=5,
        )
        db_session.add(s)
        db_session.flush()
        
        # Créer une vente avec la méthode de paiement
        sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=s.id,
            operator_id=test_operator.id,
            total_amount=50.0,
            payment_method=payment_method,
        )
        db_session.add(sale)
        sessions.append(s)
    db_session.commit()
    
    # Test: filtre par méthode de paiement (cash)
    params = {"payment_methods": ["cash"]}
    r = admin_client.get("/v1/cash-sessions/", params=params)
    assert r.status_code == 200
    payload = r.json()
    # Vérifier que toutes les sessions ont au moins une vente en cash
    session_ids = [row["id"] for row in payload["data"]]
    assert any(str(sessions[0].id) in session_ids)  # La première session a cash
    
    # Test: filtre par plusieurs méthodes de paiement
    params = {"payment_methods": ["cash", "card"]}
    r = admin_client.get("/v1/cash-sessions/", params=params)
    assert r.status_code == 200
    payload = r.json()
    # Vérifier que les sessions ont au moins une vente avec cash ou card
    session_ids = [row["id"] for row in payload["data"]]
    assert any(str(sessions[0].id) in session_ids)  # cash
    assert any(str(sessions[1].id) in session_ids)  # card


def test_filter_by_has_donation(admin_client, db_session, test_operator, test_site_id):
    """Test filtre par présence de don."""
    base_time = datetime.now(timezone.utc) - timedelta(days=1)
    
    # Créer des sessions avec et sans don
    sessions = []
    donations = [0.0, 5.0, 0.0, 10.0, None]
    for i, donation in enumerate(donations):
        s = CashSession(
            operator_id=test_operator.id,
            site_id=test_site_id,
            register_id=uuid.uuid4(),
            initial_amount=50.0,
            current_amount=100.0,
            status=CashSessionStatus.CLOSED,
            opened_at=base_time + timedelta(hours=i),
            closed_at=base_time + timedelta(hours=i+1),
            total_sales=50.0,
            total_items=5,
        )
        db_session.add(s)
        db_session.flush()
        
        # Créer une vente avec ou sans don
        sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=s.id,
            operator_id=test_operator.id,
            total_amount=50.0,
            donation=donation,
        )
        db_session.add(sale)
        sessions.append(s)
    db_session.commit()
    
    # Test: filtre par présence de don
    params = {"has_donation": True}
    r = admin_client.get("/v1/cash-sessions/", params=params)
    assert r.status_code == 200
    payload = r.json()
    # Vérifier que toutes les sessions ont au moins une vente avec don > 0
    session_ids = [row["id"] for row in payload["data"]]
    # Les sessions avec don (indices 1 et 3) doivent être présentes
    assert any(str(sessions[1].id) in session_ids)
    assert any(str(sessions[3].id) in session_ids)
    
    # Test: filtre par absence de don
    params = {"has_donation": False}
    r = admin_client.get("/v1/cash-sessions/", params=params)
    assert r.status_code == 200
    payload = r.json()
    # Vérifier que les sessions n'ont pas de don > 0
    session_ids = [row["id"] for row in payload["data"]]
    # Les sessions sans don (indices 0, 2, 4) doivent être présentes
    assert any(str(sessions[0].id) in session_ids)
    assert any(str(sessions[2].id) in session_ids)


def test_combined_advanced_filters(admin_client, db_session, test_operator, test_site_id):
    """Test combinaison de plusieurs filtres avancés."""
    base_time = datetime.now(timezone.utc) - timedelta(days=1)
    
    # Créer une session qui correspond à tous les critères
    s = CashSession(
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
    db_session.add(s)
    db_session.flush()
    
    # Créer une vente avec don et méthode de paiement card
    sale = Sale(
        id=uuid.uuid4(),
        cash_session_id=s.id,
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
    assert str(s.id) in session_ids

