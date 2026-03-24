"""
Tests pour l'endpoint de détail des sessions de caisse
"""
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4
from datetime import datetime, timezone

from recyclic_api.core.config import settings
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.sale import Sale, PaymentMethod
from recyclic_api.models.site import Site
from recyclic_api.models.cash_register import CashRegister
from recyclic_api.core.security import hash_password
from recyclic_api.models.audit_log import AuditActionType, AuditLog

_V1 = settings.API_V1_STR.rstrip("/")
_TEST_DB_URL = os.getenv("TEST_DATABASE_URL", "")

pytestmark = pytest.mark.skipif(
    not _TEST_DB_URL.startswith("postgresql"),
    reason="Les tests détail cash session nécessitent PostgreSQL (schéma site/session/ventes).",
)


@pytest.fixture
def test_session_data(db_session: Session):
    """Créer des données de test pour les sessions de caisse"""
    # Créer un site
    site = Site(
        id=uuid4(),
        name="Site Test",
        address="123 Test Street",
        is_active=True
    )
    db_session.add(site)
    db_session.commit()
    db_session.refresh(site)
    
    # Créer un registre de caisse
    register = CashRegister(
        id=uuid4(),
        name="Registre Test",
        site_id=site.id,
        is_active=True
    )
    db_session.add(register)
    db_session.commit()
    db_session.refresh(register)
    
    # Créer un utilisateur opérateur
    operator = User(
        id=uuid4(),
        username="operator@test.com",
        hashed_password=hash_password("password123"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE
    )
    db_session.add(operator)
    db_session.commit()
    db_session.refresh(operator)
    
    # Créer un utilisateur admin
    admin = User(
        id=uuid4(),
        username="admin@test.com",
        hashed_password=hash_password("password123"),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    
    # Créer une session de caisse
    session = CashSession(
        id=uuid4(),
        operator_id=operator.id,
        site_id=site.id,
        register_id=register.id,
        initial_amount=50.0,
        current_amount=100.0,
        status=CashSessionStatus.CLOSED,
        opened_at=datetime.now(timezone.utc),
        closed_at=datetime.now(timezone.utc),
        total_sales=50.0,
        total_items=3
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    
    # Créer des ventes pour la session
    sale1 = Sale(
        id=uuid4(),
        cash_session_id=session.id,
        operator_id=operator.id,
        total_amount=25.0,
        donation=5.0,
        payment_method=PaymentMethod.CASH,
        sale_date=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(sale1)
    
    sale2 = Sale(
        id=uuid4(),
        cash_session_id=session.id,
        operator_id=operator.id,
        total_amount=20.0,
        donation=0.0,
        payment_method=PaymentMethod.CARD,
        sale_date=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(sale2)
    
    db_session.commit()
    
    return {
        "session": session,
        "operator": operator,
        "admin": admin,
        "site": site,
        "register": register,
        "sales": [sale1, sale2]
    }


def test_get_cash_session_detail_success(client: TestClient, test_session_data, admin_client):
    """Test de récupération réussie des détails d'une session"""
    session = test_session_data["session"]
    
    response = admin_client.get(f"{_V1}/cash-sessions/{session.id}")
    
    assert response.status_code == 200
    data = response.json()
    
    # Vérifier les données de base de la session
    assert data["id"] == str(session.id)
    assert data["operator_id"] == str(session.operator_id)
    assert data["initial_amount"] == 50.0
    assert data["current_amount"] == 100.0
    assert data["status"] == "closed"
    assert data["total_sales"] == 50.0
    assert data["total_items"] == 3
    
    # Vérifier les informations supplémentaires
    assert "operator_name" in data
    assert "site_name" in data
    
    # Vérifier les ventes
    assert "sales" in data
    assert len(data["sales"]) == 2
    
    # Vérifier la structure des ventes
    sales = data["sales"]
    for sale in sales:
        assert "id" in sale
        assert "total_amount" in sale
        assert "created_at" in sale
        assert "payment_method" in sale


def test_get_cash_session_detail_not_found(client: TestClient, admin_client):
    """Test de session non trouvée"""
    fake_id = str(uuid4())
    
    response = admin_client.get(f"{_V1}/cash-sessions/{fake_id}")
    
    assert response.status_code == 404
    data = response.json()
    assert "Session de caisse non trouvée" in data["detail"]


def test_get_cash_session_detail_unauthorized(client: TestClient, test_session_data):
    """Test d'accès non autorisé sans authentification."""
    session = test_session_data["session"]
    
    response = client.get(f"{_V1}/cash-sessions/{session.id}")
    
    assert response.status_code == 403


def test_get_cash_session_detail_forbidden_user_role(client: TestClient, test_session_data):
    """Test d'accès interdit pour un utilisateur non-admin"""
    session = test_session_data["session"]
    operator = test_session_data["operator"]
    
    # Créer un token pour l'opérateur (rôle USER)
    from recyclic_api.core.security import create_access_token
    token = create_access_token(data={"sub": str(operator.id)})
    
    response = client.get(
        f"{_V1}/cash-sessions/{session.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 403


def test_get_cash_session_detail_with_open_session(client: TestClient, db_session: Session, admin_client):
    """Test de récupération d'une session ouverte"""
    # Créer une session ouverte
    site = Site(
        id=uuid4(),
        name="Site Test",
        address="123 Test Street",
        is_active=True
    )
    db_session.add(site)
    db_session.commit()
    db_session.refresh(site)
    
    operator = User(
        id=uuid4(),
        username="operator@test.com",
        hashed_password=hash_password("password123"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE
    )
    db_session.add(operator)
    db_session.commit()
    db_session.refresh(operator)
    
    session = CashSession(
        id=uuid4(),
        operator_id=operator.id,
        site_id=site.id,
        initial_amount=50.0,
        current_amount=50.0,
        status=CashSessionStatus.OPEN,
        opened_at=datetime.now(timezone.utc),
        total_sales=0.0,
        total_items=0
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    
    response = admin_client.get(f"{_V1}/cash-sessions/{session.id}")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] == "open"
    assert data["closed_at"] is None
    assert data["sales"] == []  # Pas de ventes pour une session ouverte


def test_get_cash_session_detail_with_variance(client: TestClient, db_session: Session, admin_client):
    """Test de récupération d'une session avec écart de caisse"""
    # Créer une session avec écart
    site = Site(
        id=uuid4(),
        name="Site Test",
        address="123 Test Street",
        is_active=True
    )
    db_session.add(site)
    db_session.commit()
    db_session.refresh(site)
    
    operator = User(
        id=uuid4(),
        username="operator@test.com",
        hashed_password=hash_password("password123"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE
    )
    db_session.add(operator)
    db_session.commit()
    db_session.refresh(operator)
    
    session = CashSession(
        id=uuid4(),
        operator_id=operator.id,
        site_id=site.id,
        initial_amount=50.0,
        current_amount=100.0,
        status=CashSessionStatus.CLOSED,
        opened_at=datetime.now(timezone.utc),
        closed_at=datetime.now(timezone.utc),
        total_sales=50.0,
        total_items=2,
        closing_amount=100.0,  # Montant théorique
        actual_amount=95.0,    # Montant physique
        variance=-5.0,         # Écart négatif
        variance_comment="Manque de 5€"
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    
    response = admin_client.get(f"{_V1}/cash-sessions/{session.id}")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["closing_amount"] == 100.0
    assert data["actual_amount"] == 95.0
    assert data["variance"] == -5.0
    assert data["variance_comment"] == "Manque de 5€"


def test_get_cash_session_detail_audit_logging(
    client: TestClient, test_session_data, admin_client, db_session: Session
):
    """L'accès aux détails persiste une entrée dans audit_logs (log_audit n'émet pas via logging/caplog)."""
    session = test_session_data["session"]

    response = admin_client.get(f"{_V1}/cash-sessions/{session.id}")

    assert response.status_code == 200

    audit_entry = (
        db_session.query(AuditLog)
        .filter(
            AuditLog.target_type == "cash_session",
            AuditLog.target_id == session.id,
            AuditLog.action_type == AuditActionType.SYSTEM_CONFIG_CHANGED.value,
        )
        .order_by(AuditLog.timestamp.desc())
        .first()
    )
    assert audit_entry is not None
    assert str(session.id) in (audit_entry.description or "")
    assert audit_entry.details_json is not None
    assert audit_entry.details_json.get("success") is True
    assert audit_entry.details_json.get("session_id") == str(session.id)


def test_get_cash_session_detail_error_handling(client: TestClient, admin_client):
    """Test de gestion d'erreur avec un ID invalide (ARCH-03 : 400 comme close)"""
    invalid_id = "invalid-uuid"

    response = admin_client.get(f"{_V1}/cash-sessions/{invalid_id}")

    assert response.status_code == 400
    assert "session_id invalide" in response.json()["detail"].lower()
