"""
Tests pour le système de logging transactionnel (B48-P2).
"""
import pytest
import json
import tempfile
import os
from pathlib import Path
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock

from recyclic_api.core.logging import (
    get_transaction_logger,
    log_transaction_event,
    shutdown_transaction_logger,
    TRANSACTION_LOG_FILE,
    TRANSACTION_LOG_DIR
)


class TestTransactionLogging:
    """Tests pour le module de logging transactionnel."""
    
    def setup_method(self):
        """Setup avant chaque test."""
        # Créer un répertoire temporaire pour les logs
        self.temp_dir = tempfile.mkdtemp()
        # Patcher TRANSACTION_LOG_FILE pour utiliser le répertoire temporaire
        self.log_file = Path(self.temp_dir) / "transactions.log"
        
    def teardown_method(self):
        """Cleanup après chaque test."""
        # Arrêter le logger proprement
        shutdown_transaction_logger()
        # Nettoyer les fichiers temporaires
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    @patch('recyclic_api.core.logging.TRANSACTION_LOG_FILE')
    @patch('recyclic_api.core.logging.TRANSACTION_LOG_DIR')
    def test_log_transaction_event_format(self, mock_dir, mock_file):
        """Test que les logs sont formatés en JSON correctement."""
        mock_file.return_value = self.log_file
        mock_dir.return_value = Path(self.temp_dir)
        
        # Créer le répertoire
        Path(self.temp_dir).mkdir(parents=True, exist_ok=True)
        
        # Logger un événement
        log_transaction_event("SESSION_OPENED", {
            "user_id": "test-user-id",
            "session_id": "test-session-id",
            "opened_at": "2025-12-09T14:30:00Z"
        })
        
        # Attendre un peu pour que le queue listener écrive
        import time
        time.sleep(0.1)
        
        # Vérifier que le fichier existe
        assert self.log_file.exists()
        
        # Lire et parser le contenu
        with open(self.log_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            assert len(lines) > 0
            
            # Parser la première ligne JSON
            log_entry = json.loads(lines[0].strip())
            
            # Vérifier la structure
            assert log_entry["event"] == "SESSION_OPENED"
            assert log_entry["user_id"] == "test-user-id"
            assert log_entry["session_id"] == "test-session-id"
            assert "timestamp" in log_entry
            assert log_entry["timestamp"].endswith("Z")
    
    @patch('recyclic_api.core.logging.TRANSACTION_LOG_FILE')
    @patch('recyclic_api.core.logging.TRANSACTION_LOG_DIR')
    def test_log_transaction_event_timestamp(self, mock_dir, mock_file):
        """Test que le timestamp est au format ISO 8601 UTC."""
        mock_file.return_value = self.log_file
        mock_dir.return_value = Path(self.temp_dir)
        
        Path(self.temp_dir).mkdir(parents=True, exist_ok=True)
        
        log_transaction_event("TICKET_OPENED", {
            "user_id": "test-user-id",
            "session_id": "test-session-id"
        })
        
        import time
        time.sleep(0.1)
        
        with open(self.log_file, 'r', encoding='utf-8') as f:
            log_entry = json.loads(f.readline().strip())
            timestamp = log_entry["timestamp"]
            
            # Vérifier le format ISO 8601 avec Z
            assert timestamp.endswith("Z")
            # Parser pour vérifier que c'est valide
            parsed_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            assert parsed_time.tzinfo is not None
    
    def test_log_transaction_event_best_effort(self):
        """Test que les erreurs de logging n'interrompent pas les opérations."""
        # Tenter de logger avec un chemin invalide (devrait échouer silencieusement)
        with patch('recyclic_api.core.logging.get_transaction_logger') as mock_logger:
            mock_logger.side_effect = Exception("Erreur de logging")
            
            # Ne devrait pas lever d'exception
            try:
                log_transaction_event("TEST_EVENT", {"test": "data"})
            except Exception:
                pytest.fail("log_transaction_event ne devrait pas lever d'exception")
    
    @patch('recyclic_api.core.logging.TRANSACTION_LOG_FILE')
    @patch('recyclic_api.core.logging.TRANSACTION_LOG_DIR')
    def test_multiple_events(self, mock_dir, mock_file):
        """Test que plusieurs événements sont loggés correctement."""
        mock_file.return_value = self.log_file
        mock_dir.return_value = Path(self.temp_dir)
        
        Path(self.temp_dir).mkdir(parents=True, exist_ok=True)
        
        # Logger plusieurs événements
        log_transaction_event("SESSION_OPENED", {"user_id": "user1", "session_id": "session1"})
        log_transaction_event("TICKET_OPENED", {"user_id": "user1", "session_id": "session1"})
        log_transaction_event("PAYMENT_VALIDATED", {"user_id": "user1", "session_id": "session1"})
        
        import time
        time.sleep(0.2)
        
        # Vérifier que tous les événements sont dans le fichier
        with open(self.log_file, 'r', encoding='utf-8') as f:
            lines = [line.strip() for line in f.readlines() if line.strip()]
            assert len(lines) >= 3
            
            # Vérifier les événements
            events = [json.loads(line)["event"] for line in lines]
            assert "SESSION_OPENED" in events
            assert "TICKET_OPENED" in events
            assert "PAYMENT_VALIDATED" in events

