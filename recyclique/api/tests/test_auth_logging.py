"""
Unit tests for authentication logging functionality.

Tests that proper logging is performed for successful and failed login attempts.
"""
import uuid

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.models.user import User, UserRole, UserStatus

_V1 = settings.API_V1_STR.rstrip("/")
from recyclic_api.core.security import hash_password


def _render_warning_message(positional_args: tuple) -> str:
    """Reconstitue le texte d'un appel logger.warning (f-string ou %)."""
    if not positional_args:
        return ""
    if len(positional_args) == 1:
        return str(positional_args[0])
    template, *values = positional_args
    if isinstance(template, str) and "%" in template:
        try:
            return template % tuple(values)
        except (TypeError, ValueError):
            return template
    return str(template)


def _warning_text_from_call(raw) -> str:
    args = raw.args if hasattr(raw, "args") else raw[0]
    return _render_warning_message(args) if len(args) > 1 else str(args[0] if args else "")


class TestAuthLogging:
    """Unit tests for authentication logging."""

    @pytest.fixture
    def test_user(self, db_engine, db_session: Session):
        """Create a test user for logging tests."""
        suffix = uuid.uuid4().hex
        username = f"test_log_user_{suffix}"
        email = f"testlog_{suffix}@example.com"
        test_password = "TestPassword123!"
        hashed_password = hash_password(test_password)

        test_user = User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True
        )

        db_session.add(test_user)
        db_session.commit()
        db_session.refresh(test_user)

        yield test_user

        # Cleanup without triggering relationship lazy-loads
        try:
            db_session.query(User).filter(User.id == test_user.id).delete(synchronize_session=False)
            db_session.commit()
        except Exception:
            db_session.rollback()

    @patch('recyclic_api.api.api_v1.endpoints.auth.logger')
    def test_successful_login_logging(self, mock_logger, client: TestClient, test_user: User, db_session: Session):
        """Test that successful logins are properly logged."""
        login_data = {
            "username": test_user.username,
            "password": "TestPassword123!"
        }

        response = client.post(f"{_V1}/auth/login", json=login_data)

        # Verify response is successful
        assert response.status_code == 200
        response_data = response.json()
        assert "access_token" in response_data

        # Verify logging was called correctly
        mock_logger.info.assert_called_once()
        log_call_args = mock_logger.info.call_args[0][0]
        assert f"Successful login for user_id: {test_user.id}" == log_call_args

    @patch('recyclic_api.api.api_v1.endpoints.auth.logger')
    def test_failed_login_invalid_user_logging(self, mock_logger, client: TestClient, db_engine, db_session: Session):
        """Test that failed logins with invalid usernames are properly logged."""
        login_data = {
            "username": "nonexistent_user",
            "password": "any_password"
        }

        response = client.post(f"{_V1}/auth/login", json=login_data)

        # Verify response is 401
        assert response.status_code == 401

        # Verify warning was logged (message %-format dans auth.login)
        mock_logger.warning.assert_called_once()
        rendered = _render_warning_message(mock_logger.warning.call_args[0])
        assert "user not found" in rendered.lower()
        assert "testclient" in rendered

    @patch('recyclic_api.api.api_v1.endpoints.auth.logger')
    def test_failed_login_invalid_password_logging(self, mock_logger, client: TestClient, test_user: User, db_engine, db_session: Session):
        """Test that failed login attempts with invalid passwords are properly logged."""
        # Store username before using the user object to avoid DetachedInstanceError
        username = test_user.username
        
        login_data = {
            "username": username,
            "password": "wrong_password"
        }

        response = client.post(f"{_V1}/auth/login", json=login_data)

        # Verify response is 401
        assert response.status_code == 401

        mock_logger.warning.assert_called_once()
        log_call_args = mock_logger.warning.call_args[0][0]
        assert "invalid password for username:" in log_call_args
        assert username in log_call_args
        assert "testclient" in log_call_args

    @patch('recyclic_api.api.api_v1.endpoints.auth.logger')
    def test_failed_login_inactive_user_logging(self, mock_logger, client: TestClient, db_engine, db_session: Session):
        """Test that failed logins with inactive users are properly logged."""
        # Create inactive user
        suffix = uuid.uuid4().hex
        username = f"inactive_user_{suffix}"
        test_password = "TestPassword123!"
        hashed_password = hash_password(test_password)

        inactive_user = User(
            username=username,
            email=f"inactive_{suffix}@example.com",
            hashed_password=hashed_password,
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=False  # Inactive user
        )

        db_session.add(inactive_user)
        db_session.commit()

        try:
            login_data = {
                "username": username,
                "password": "TestPassword123!"
            }

            response = client.post(f"{_V1}/auth/login", json=login_data)

            # Verify response is 401
            assert response.status_code == 401

            mock_logger.warning.assert_called_once()
            rendered = _render_warning_message(mock_logger.warning.call_args[0])
            assert "inactive user" in rendered.lower()
            assert "testclient" in rendered

        finally:
            # Cleanup without triggering relationship lazy-loads
            try:
                db_session.query(User).filter(User.id == inactive_user.id).delete(synchronize_session=False)
                db_session.commit()
            except Exception:
                db_session.rollback()

    @patch('recyclic_api.api.api_v1.endpoints.auth.auth_metrics')
    @patch('recyclic_api.api.api_v1.endpoints.auth.logger')
    def test_login_logging_and_metrics_integration(self, mock_logger, mock_auth_metrics, client: TestClient, test_user: User, db_engine, db_session: Session):
        """Test that both logging and metrics are called for login attempts."""
        login_data = {
            "username": test_user.username,
            "password": "TestPassword123!"
        }

        response = client.post(f"{_V1}/auth/login", json=login_data)

        # Verify response is successful
        assert response.status_code == 200

        # Verify both logging and metrics were called
        mock_logger.info.assert_called_once()
        mock_auth_metrics.record_login_attempt.assert_called_once()

        # Verify metrics call parameters
        metrics_call = mock_auth_metrics.record_login_attempt.call_args
        assert metrics_call[1]['username'] == test_user.username
        assert metrics_call[1]['success'] is True
        assert metrics_call[1]['user_id'] == str(test_user.id)
        assert 'elapsed_ms' in metrics_call[1]
        assert 'client_ip' in metrics_call[1]

    @patch('recyclic_api.api.api_v1.endpoints.auth.auth_metrics')
    @patch('recyclic_api.api.api_v1.endpoints.auth.logger')
    def test_failed_login_logging_and_metrics_integration(self, mock_logger, mock_auth_metrics, client: TestClient, db_engine, db_session: Session):
        """Test that both logging and metrics are called for failed login attempts."""
        login_data = {
            "username": "nonexistent_user",
            "password": "any_password"
        }

        response = client.post(f"{_V1}/auth/login", json=login_data)

        # Verify response is 401
        assert response.status_code == 401

        # Verify both logging and metrics were called
        mock_logger.warning.assert_called_once()
        mock_auth_metrics.record_login_attempt.assert_called_once()

        # Verify metrics call parameters for failed login
        metrics_call = mock_auth_metrics.record_login_attempt.call_args
        assert metrics_call[1]['username'] == "nonexistent_user"
        assert metrics_call[1]['success'] is False
        assert metrics_call[1]['error_type'] == "invalid_user_or_inactive"
        assert 'elapsed_ms' in metrics_call[1]
        assert 'client_ip' in metrics_call[1]

    @patch('recyclic_api.api.api_v1.endpoints.auth.logger')
    def test_multiple_login_attempts_logging(self, mock_logger, client: TestClient, test_user: User, db_engine, db_session: Session):
        """Test logging behavior with multiple consecutive login attempts."""
        # First attempt - successful
        login_data = {
            "username": test_user.username,
            "password": "TestPassword123!"
        }

        response1 = client.post(f"{_V1}/auth/login", json=login_data)
        assert response1.status_code == 200

        # Second attempt - failed
        failed_login_data = {
            "username": test_user.username,
            "password": "wrong_password"
        }

        response2 = client.post(f"{_V1}/auth/login", json=failed_login_data)
        assert response2.status_code == 401

        # Third attempt - successful again
        response3 = client.post(f"{_V1}/auth/login", json=login_data)
        assert response3.status_code == 200

        assert mock_logger.info.call_count == 2  # Two successful logins

        info_calls = [c[0][0] for c in mock_logger.info.call_args_list]
        for log_msg in info_calls:
            assert f"Successful login for user_id: {test_user.id}" == log_msg

        # D'autres warnings peuvent être émis (ex. expire_all) ; on cible l'échec mot de passe.
        pwd_failures = [
            c for c in mock_logger.warning.call_args_list
            if "invalid password for username:" in _warning_text_from_call(c)
        ]
        assert len(pwd_failures) == 1
        msg = _warning_text_from_call(pwd_failures[0])
        assert test_user.username in msg
        assert "testclient" in msg

    def test_logging_without_mocking(self, client: TestClient, test_user: User, db_engine, db_session: Session, caplog):
        """Test actual logging output without mocking (integration test)."""
        import logging

        # Set log level to capture INFO and WARNING
        caplog.set_level(logging.INFO)

        login_data = {
            "username": test_user.username,
            "password": "TestPassword123!"
        }

        response = client.post(f"{_V1}/auth/login", json=login_data)
        assert response.status_code == 200

        # Check that log was actually captured
        assert len(caplog.records) > 0

        # Find the auth-related log entry
        auth_logs = [record for record in caplog.records
                    if 'recyclic_api.api.api_v1.endpoints.auth' in record.name]

        assert len(auth_logs) > 0

        # Verify the successful login log
        success_logs = [record for record in auth_logs
                       if record.levelname == 'INFO' and 'Successful login' in record.message]
        assert len(success_logs) == 1
        assert f"user_id: {test_user.id}" in success_logs[0].message