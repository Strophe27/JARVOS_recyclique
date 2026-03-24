"""
Tests API pour l'endpoint de consultation des logs transactionnels (B48-P2).

Vérifie que l'endpoint GET /api/v1/admin/transaction-logs fonctionne correctement
avec pagination et filtres.
"""
import pytest
import json
import time
from pathlib import Path

from recyclic_api.core.logging import TRANSACTION_LOG_FILE, log_transaction_event, shutdown_transaction_logger


@pytest.fixture(autouse=True)
def setup_test_logs():
    """Créer des logs de test avant chaque test."""
    # Nettoyer les logs existants
    if TRANSACTION_LOG_FILE.exists():
        with open(TRANSACTION_LOG_FILE, 'w') as f:
            f.write('')
    
    # Créer quelques logs de test
    test_logs = [
        {
            "event": "SESSION_OPENED",
            "user_id": "user-1",
            "session_id": "session-1",
            "timestamp": "2025-12-09T10:00:00Z"
        },
        {
            "event": "TICKET_OPENED",
            "user_id": "user-1",
            "session_id": "session-1",
            "timestamp": "2025-12-09T10:05:00Z",
            "cart_state": {"items_count": 1, "items": [], "total": 10.0}
        },
        {
            "event": "PAYMENT_VALIDATED",
            "user_id": "user-1",
            "session_id": "session-1",
            "transaction_id": "transaction-1",
            "timestamp": "2025-12-09T10:10:00Z",
            "amount": 10.0
        },
        {
            "event": "SESSION_OPENED",
            "user_id": "user-2",
            "session_id": "session-2",
            "timestamp": "2025-12-09T11:00:00Z"
        },
        {
            "event": "TICKET_RESET",
            "user_id": "user-2",
            "session_id": "session-2",
            "timestamp": "2025-12-09T11:05:00Z",
            "cart_state_before": {"items_count": 2, "items": [], "total": 20.0}
        }
    ]
    
    # Écrire les logs dans le fichier
    TRANSACTION_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(TRANSACTION_LOG_FILE, 'w', encoding='utf-8') as f:
        for log in test_logs:
            f.write(json.dumps(log, ensure_ascii=False) + '\n')
    
    yield
    
    # Nettoyer après le test
    shutdown_transaction_logger()
    if TRANSACTION_LOG_FILE.exists():
        with open(TRANSACTION_LOG_FILE, 'w') as f:
            f.write('')


class TestTransactionLogsAPI:
    """Tests pour l'endpoint de consultation des logs transactionnels."""
    
    def test_get_transaction_logs_requires_admin(self, client):
        """Test que l'endpoint nécessite un rôle admin."""
        response = client.get("/api/v1/admin/transaction-logs")
        assert response.status_code in [401, 403]
    
    def test_get_transaction_logs_success(self, admin_client):
        """Test la récupération des logs avec succès."""
        response = admin_client.get("/api/v1/admin/transaction-logs")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "entries" in data
        assert "pagination" in data
        assert len(data["entries"]) > 0
        
        # Vérifier la structure de pagination
        pagination = data["pagination"]
        assert "page" in pagination
        assert "page_size" in pagination
        assert "total_count" in pagination
        assert "total_pages" in pagination
    
    def test_get_transaction_logs_pagination(self, admin_client):
        """Test la pagination des logs."""
        # Première page
        response1 = admin_client.get("/api/v1/admin/transaction-logs?page=1&page_size=2")
        assert response1.status_code == 200
        data1 = response1.json()
        assert len(data1["entries"]) == 2
        assert data1["pagination"]["page"] == 1
        
        # Deuxième page
        response2 = admin_client.get("/api/v1/admin/transaction-logs?page=2&page_size=2")
        assert response2.status_code == 200
        data2 = response2.json()
        assert len(data2["entries"]) >= 1
        assert data2["pagination"]["page"] == 2
    
    def test_get_transaction_logs_filter_by_event_type(self, admin_client):
        """Test le filtre par type d'événement."""
        response = admin_client.get("/api/v1/admin/transaction-logs?event_type=SESSION_OPENED")
        
        assert response.status_code == 200
        data = response.json()
        
        # Vérifier que tous les logs sont de type SESSION_OPENED
        for entry in data["entries"]:
            assert entry["event"] == "SESSION_OPENED"
    
    def test_get_transaction_logs_filter_by_user_id(self, admin_client):
        """Test le filtre par user_id."""
        response = admin_client.get("/api/v1/admin/transaction-logs?user_id=user-1")
        
        assert response.status_code == 200
        data = response.json()
        
        # Vérifier que tous les logs sont pour user-1
        for entry in data["entries"]:
            assert entry["user_id"] == "user-1"
    
    def test_get_transaction_logs_filter_by_session_id(self, admin_client):
        """Test le filtre par session_id."""
        response = admin_client.get("/api/v1/admin/transaction-logs?session_id=session-1")
        
        assert response.status_code == 200
        data = response.json()
        
        # Vérifier que tous les logs sont pour session-1
        for entry in data["entries"]:
            assert entry["session_id"] == "session-1"
    
    def test_get_transaction_logs_filter_by_date_range(self, admin_client):
        """Test le filtre par plage de dates."""
        response = admin_client.get(
            "/api/v1/admin/transaction-logs"
            "?start_date=2025-12-09T10:00:00Z"
            "&end_date=2025-12-09T10:30:00Z"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Vérifier que tous les logs sont dans la plage de dates
        for entry in data["entries"]:
            timestamp = entry["timestamp"]
            assert "2025-12-09T10:00:00Z" <= timestamp <= "2025-12-09T10:30:00Z"
    
    def test_get_transaction_logs_combined_filters(self, admin_client):
        """Test la combinaison de plusieurs filtres."""
        response = admin_client.get(
            "/api/v1/admin/transaction-logs"
            "?event_type=TICKET_OPENED"
            "&user_id=user-1"
            "&session_id=session-1"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Vérifier que tous les logs correspondent aux filtres
        for entry in data["entries"]:
            assert entry["event"] == "TICKET_OPENED"
            assert entry["user_id"] == "user-1"
            assert entry["session_id"] == "session-1"
    
    def test_get_transaction_logs_empty_result(self, admin_client):
        """Test avec des filtres qui ne correspondent à aucun log."""
        response = admin_client.get(
            "/api/v1/admin/transaction-logs"
            "?event_type=ANOMALY_DETECTED"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Devrait retourner une liste vide
        assert len(data["entries"]) == 0
        assert data["pagination"]["total_count"] == 0

