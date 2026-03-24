"""
Tests d'intégration pour le système de logging transactionnel (B48-P2).

Vérifie que tous les événements transactionnels sont correctement loggés
lors des opérations réelles (ouverture session, création ticket, validation paiement).
"""
import pytest
import json
import time
from pathlib import Path
from unittest.mock import patch
from sqlalchemy.orm import Session

from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.sale import Sale, PaymentMethod
from recyclic_api.core.security import hash_password
from recyclic_api.core.logging import TRANSACTION_LOG_FILE, shutdown_transaction_logger
from recyclic_api.services.cash_session_service import CashSessionService


@pytest.fixture
def test_user(db_session: Session):
    """Créer un utilisateur de test."""
    user = User(
        username="test_user_transaction",
        email="test_transaction@test.com",
        hashed_password=hash_password("TestPassword123!"),
        role=UserRole.USER,
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
    from recyclic_api.models.site import Site
    site = Site(name="Test Site", address="Test Address")
    db_session.add(site)
    db_session.commit()
    db_session.refresh(site)
    return site


@pytest.fixture(autouse=True)
def cleanup_logs():
    """Nettoyer les logs avant et après chaque test."""
    # Nettoyer avant le test
    if TRANSACTION_LOG_FILE.exists():
        with open(TRANSACTION_LOG_FILE, 'w') as f:
            f.write('')
    
    yield
    
    # Nettoyer après le test
    shutdown_transaction_logger()
    if TRANSACTION_LOG_FILE.exists():
        with open(TRANSACTION_LOG_FILE, 'w') as f:
            f.write('')


def read_transaction_logs() -> list:
    """Lire les logs transactionnels depuis le fichier."""
    if not TRANSACTION_LOG_FILE.exists():
        return []
    
    logs = []
    with open(TRANSACTION_LOG_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    logs.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    
    return logs


def wait_for_logs(expected_count: int, timeout: float = 2.0):
    """Attendre que les logs soient écrits."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        logs = read_transaction_logs()
        if len(logs) >= expected_count:
            return logs
        time.sleep(0.1)
    return read_transaction_logs()


class TestSessionOpeningLogging:
    """Tests pour le logging d'ouverture de session."""
    
    def test_session_opened_is_logged(self, db_session: Session, test_user: User, test_site):
        """Test que l'ouverture d'une session est loggée."""
        service = CashSessionService(db_session)
        
        # Créer une session
        session = service.create_session(
            operator_id=str(test_user.id),
            site_id=str(test_site.id),
            initial_amount=100.0
        )
        
        # Attendre que le log soit écrit
        logs = wait_for_logs(1)
        
        # Vérifier qu'un log SESSION_OPENED existe
        session_logs = [log for log in logs if log.get("event") == "SESSION_OPENED"]
        assert len(session_logs) > 0, "Aucun log SESSION_OPENED trouvé"
        
        log_entry = session_logs[0]
        assert log_entry["user_id"] == str(test_user.id)
        assert log_entry["session_id"] == str(session.id)
        assert "timestamp" in log_entry
        assert "opened_at" in log_entry or log_entry.get("opened_at") is not None


class TestPaymentValidationLogging:
    """Tests pour le logging de validation de paiement."""
    
    def test_payment_validated_is_logged(
        self, 
        admin_client, 
        db_session: Session, 
        test_user: User, 
        test_site
    ):
        """Test que la validation d'un paiement est loggée."""
        from recyclic_api.services.cash_session_service import CashSessionService
        
        # Créer une session
        service = CashSessionService(db_session)
        session = service.create_session(
            operator_id=str(test_user.id),
            site_id=str(test_site.id),
            initial_amount=100.0
        )
        
        # Nettoyer les logs précédents
        if TRANSACTION_LOG_FILE.exists():
            with open(TRANSACTION_LOG_FILE, 'w') as f:
                f.write('')
        
        # Créer une vente
        sale_data = {
            "cash_session_id": str(session.id),
            "items": [
                {
                    "category": "EEE-3",
                    "quantity": 1,
                    "weight": 2.5,
                    "unit_price": 10.0,
                    "total_price": 10.0
                }
            ],
            "total_amount": 10.0,
            "donation": 0.0,
            "payment_method": "cash"
        }
        
        response = admin_client.post("/api/v1/sales/", json=sale_data)
        assert response.status_code == 200
        
        # Attendre que les logs soient écrits
        logs = wait_for_logs(1, timeout=3.0)
        
        # Vérifier qu'un log PAYMENT_VALIDATED existe
        payment_logs = [log for log in logs if log.get("event") == "PAYMENT_VALIDATED"]
        assert len(payment_logs) > 0, "Aucun log PAYMENT_VALIDATED trouvé"
        
        log_entry = payment_logs[0]
        assert log_entry["session_id"] == str(session.id)
        assert "transaction_id" in log_entry
        assert "cart_state_before" in log_entry
        assert "cart_state_after" in log_entry
        assert log_entry["payment_method"] == "cash"
        assert log_entry["amount"] == 10.0


class TestTransactionLogEndpoint:
    """Tests pour l'endpoint de logging depuis le frontend."""
    
    def test_transaction_log_endpoint_requires_auth(self, client):
        """Test que l'endpoint nécessite une authentification."""
        response = client.post(
            "/api/v1/transactions/log",
            json={
                "event": "TICKET_OPENED",
                "session_id": "test-session-id"
            }
        )
        assert response.status_code == 401
    
    def test_transaction_log_endpoint_logs_ticket_opened(self, admin_client, db_session: Session, test_user: User, test_site):
        """Test que l'endpoint log correctement un TICKET_OPENED."""
        from recyclic_api.services.cash_session_service import CashSessionService
        
        # Créer une session
        service = CashSessionService(db_session)
        session = service.create_session(
            operator_id=str(test_user.id),
            site_id=str(test_site.id),
            initial_amount=100.0
        )
        
        # Nettoyer les logs précédents
        if TRANSACTION_LOG_FILE.exists():
            with open(TRANSACTION_LOG_FILE, 'w') as f:
                f.write('')
        
        # Envoyer un log TICKET_OPENED
        log_data = {
            "event": "TICKET_OPENED",
            "session_id": str(session.id),
            "cart_state": {
                "items_count": 1,
                "items": [{"id": "item-1", "category": "EEE-3", "weight": 2.5, "price": 10.0}],
                "total": 10.0
            },
            "anomaly": False
        }
        
        response = admin_client.post("/api/v1/transactions/log", json=log_data)
        assert response.status_code == 200
        assert response.json()["success"] is True
        
        # Attendre que le log soit écrit
        logs = wait_for_logs(1)
        
        # Vérifier que le log existe
        ticket_logs = [log for log in logs if log.get("event") == "TICKET_OPENED"]
        assert len(ticket_logs) > 0, "Aucun log TICKET_OPENED trouvé"
        
        log_entry = ticket_logs[0]
        assert log_entry["session_id"] == str(session.id)
        assert "cart_state" in log_entry
        assert log_entry["cart_state"]["items_count"] == 1
    
    def test_transaction_log_endpoint_logs_ticket_reset(self, admin_client, db_session: Session, test_user: User, test_site):
        """Test que l'endpoint log correctement un TICKET_RESET."""
        from recyclic_api.services.cash_session_service import CashSessionService
        
        # Créer une session
        service = CashSessionService(db_session)
        session = service.create_session(
            operator_id=str(test_user.id),
            site_id=str(test_site.id),
            initial_amount=100.0
        )
        
        # Nettoyer les logs précédents
        if TRANSACTION_LOG_FILE.exists():
            with open(TRANSACTION_LOG_FILE, 'w') as f:
                f.write('')
        
        # Envoyer un log TICKET_RESET
        log_data = {
            "event": "TICKET_RESET",
            "session_id": str(session.id),
            "cart_state_before": {
                "items_count": 2,
                "items": [
                    {"id": "item-1", "category": "EEE-3", "weight": 2.5, "price": 10.0},
                    {"id": "item-2", "category": "EEE-4", "weight": 1.0, "price": 5.0}
                ],
                "total": 15.0
            },
            "anomaly": False
        }
        
        response = admin_client.post("/api/v1/transactions/log", json=log_data)
        assert response.status_code == 200
        
        # Attendre que le log soit écrit
        logs = wait_for_logs(1)
        
        # Vérifier que le log existe
        reset_logs = [log for log in logs if log.get("event") == "TICKET_RESET"]
        assert len(reset_logs) > 0, "Aucun log TICKET_RESET trouvé"
        
        log_entry = reset_logs[0]
        assert log_entry["session_id"] == str(session.id)
        assert "cart_state_before" in log_entry
        assert log_entry["cart_state_before"]["items_count"] == 2
    
    def test_transaction_log_endpoint_logs_anomaly_detected(self, admin_client, db_session: Session, test_user: User, test_site):
        """Test que l'endpoint log correctement un ANOMALY_DETECTED (ITEM_ADDED_WITHOUT_TICKET)."""
        from recyclic_api.services.cash_session_service import CashSessionService
        
        # Créer une session
        service = CashSessionService(db_session)
        session = service.create_session(
            operator_id=str(test_user.id),
            site_id=str(test_site.id),
            initial_amount=100.0
        )
        
        # Nettoyer les logs précédents
        if TRANSACTION_LOG_FILE.exists():
            with open(TRANSACTION_LOG_FILE, 'w') as f:
                f.write('')
        
        # Envoyer un log ANOMALY_DETECTED
        log_data = {
            "event": "ANOMALY_DETECTED",
            "session_id": str(session.id),
            "cart_state": {
                "items_count": 1,
                "items": [{"id": "item-1", "category": "EEE-3", "weight": 2.5, "price": 10.0}],
                "total": 10.0
            },
            "details": "Item added but no ticket is explicitly opened"
        }
        
        response = admin_client.post("/api/v1/transactions/log", json=log_data)
        assert response.status_code == 200
        assert response.json()["success"] is True
        
        # Attendre que le log soit écrit
        logs = wait_for_logs(1)
        
        # Vérifier que le log existe
        anomaly_logs = [log for log in logs if log.get("event") == "ANOMALY_DETECTED"]
        assert len(anomaly_logs) > 0, "Aucun log ANOMALY_DETECTED trouvé"
        
        log_entry = anomaly_logs[0]
        assert log_entry["session_id"] == str(session.id)
        assert log_entry["anomaly_type"] == "ITEM_ADDED_WITHOUT_TICKET"
        assert "cart_state" in log_entry
        assert "details" in log_entry
        assert "Item added but no ticket is explicitly opened" in log_entry["details"]

