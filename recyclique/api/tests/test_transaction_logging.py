"""
Tests pour le système de logging transactionnel (B48-P2).
"""
import json
import os
import shutil
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

import pytest

from recyclic_api.core.logging import (
    log_transaction_event,
    shutdown_transaction_logger,
)


class TestTransactionLogging:
    """Tests pour le module de logging transactionnel."""

    def setup_method(self):
        """Setup avant chaque test."""
        self.temp_dir = tempfile.mkdtemp()
        self.log_file = Path(self.temp_dir) / "transactions.log"

    def teardown_method(self):
        """Cleanup après chaque test."""
        shutdown_transaction_logger()
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    def test_log_transaction_event_format(self):
        """Test que les logs sont formatés en JSON correctement."""
        shutdown_transaction_logger()
        Path(self.temp_dir).mkdir(parents=True, exist_ok=True)
        with patch.multiple(
            "recyclic_api.core.logging",
            TRANSACTION_LOG_FILE=self.log_file,
            TRANSACTION_LOG_DIR=Path(self.temp_dir),
        ):
            log_transaction_event(
                "SESSION_OPENED",
                {
                    "user_id": "test-user-id",
                    "session_id": "test-session-id",
                    "opened_at": "2025-12-09T14:30:00Z",
                },
            )

        time.sleep(0.1)

        assert self.log_file.exists()

        with open(self.log_file, encoding="utf-8") as f:
            lines = f.readlines()
            assert len(lines) > 0

            log_entry = json.loads(lines[0].strip())

            assert log_entry["event"] == "SESSION_OPENED"
            assert log_entry["user_id"] == "test-user-id"
            assert log_entry["session_id"] == "test-session-id"
            assert "timestamp" in log_entry
            assert log_entry["timestamp"].endswith("Z")

    def test_log_transaction_event_timestamp(self):
        """Test que le timestamp est au format ISO 8601 UTC."""
        shutdown_transaction_logger()
        Path(self.temp_dir).mkdir(parents=True, exist_ok=True)
        with patch.multiple(
            "recyclic_api.core.logging",
            TRANSACTION_LOG_FILE=self.log_file,
            TRANSACTION_LOG_DIR=Path(self.temp_dir),
        ):
            log_transaction_event(
                "TICKET_OPENED",
                {
                    "user_id": "test-user-id",
                    "session_id": "test-session-id",
                },
            )

        time.sleep(0.1)

        with open(self.log_file, encoding="utf-8") as f:
            log_entry = json.loads(f.readline().strip())
            timestamp = log_entry["timestamp"]

            assert timestamp.endswith("Z")
            parsed_time = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            assert parsed_time.tzinfo is not None

    def test_log_transaction_event_best_effort(self):
        """Test que les erreurs de logging n'interrompent pas les opérations."""
        with patch("recyclic_api.core.logging.get_transaction_logger") as mock_logger:
            mock_logger.side_effect = Exception("Erreur de logging")

            try:
                log_transaction_event("TEST_EVENT", {"test": "data"})
            except Exception:
                pytest.fail("log_transaction_event ne devrait pas lever d'exception")

    def test_multiple_events(self):
        """Test que plusieurs événements sont loggés correctement."""
        shutdown_transaction_logger()
        Path(self.temp_dir).mkdir(parents=True, exist_ok=True)
        with patch.multiple(
            "recyclic_api.core.logging",
            TRANSACTION_LOG_FILE=self.log_file,
            TRANSACTION_LOG_DIR=Path(self.temp_dir),
        ):
            log_transaction_event(
                "SESSION_OPENED", {"user_id": "user1", "session_id": "session1"}
            )
            log_transaction_event(
                "TICKET_OPENED", {"user_id": "user1", "session_id": "session1"}
            )
            log_transaction_event(
                "PAYMENT_VALIDATED", {"user_id": "user1", "session_id": "session1"}
            )

        time.sleep(0.2)

        with open(self.log_file, encoding="utf-8") as f:
            lines = [line.strip() for line in f.readlines() if line.strip()]
            assert len(lines) >= 3

            events = [json.loads(line)["event"] for line in lines]
            assert "SESSION_OPENED" in events
            assert "TICKET_OPENED" in events
            assert "PAYMENT_VALIDATED" in events
