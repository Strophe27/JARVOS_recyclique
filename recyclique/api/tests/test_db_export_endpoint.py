"""
Tests pour l'endpoint d'export de base de données (Story B11-P2)
Pattern: Mocks & Overrides (évite d'exécuter pg_dump réel en test)
"""

import pytest
import os
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.core.security import create_access_token
from recyclic_api.core.step_up import STEP_UP_PIN_HEADER
from tests.factories import UserFactory
from tests.api_v1_paths import v1

_DB_EXPORT = v1("/admin/db/export")

_DB_EXPORT_HEADERS = {STEP_UP_PIN_HEADER: "1234"}

# L’endpoint parse DATABASE_URL avant subprocess ; les tests utilisent SQLite par défaut.
_PG_URL_FOR_DUMP_TESTS = "postgresql://pytest:pytest@127.0.0.1:5432/pytest_db_export"


@pytest.fixture
def postgres_url_for_db_export(monkeypatch):
    from recyclic_api.core import config

    monkeypatch.setattr(config.settings, "DATABASE_URL", _PG_URL_FOR_DUMP_TESTS)


class TestDatabaseExportEndpoint:
    """Tests pour l'endpoint POST {API_V1_STR}/admin/db/export"""

    @patch('recyclic_api.api.api_v1.endpoints.db_export.FileResponse')
    @patch('recyclic_api.api.api_v1.endpoints.db_export.subprocess.run')
    @patch('recyclic_api.api.api_v1.endpoints.db_export.os.path.exists')
    def test_export_database_success_as_super_admin(
        self,
        mock_exists: Mock,
        mock_subprocess: Mock,
        mock_file_response: Mock,
        super_admin_client: TestClient,
        postgres_url_for_db_export,
    ):
        """Teste qu'un super-admin peut exporter la base de données avec succès."""
        # Arrange
        # Mock pg_dump successful execution
        mock_subprocess.return_value = MagicMock(returncode=0, stderr="")
        mock_exists.return_value = True

        # Mock FileResponse pour éviter l'erreur de fichier inexistant
        from fastapi.responses import Response
        mock_file_response.return_value = Response(
            content=b"Dump content",
            media_type="application/octet-stream",
            headers={"content-disposition": "attachment; filename=recyclic_db_export_test.dump"}
        )

        # Act
        response = super_admin_client.post(_DB_EXPORT, headers=_DB_EXPORT_HEADERS)

        # Assert
        assert response.status_code == 200
        assert "recyclic_db_export_" in str(mock_file_response.call_args)
        assert mock_subprocess.called

    def test_export_database_requires_authentication(self, client: TestClient):
        """Teste que l'endpoint nécessite une authentification."""
        # Act
        response = client.post(_DB_EXPORT)

        # Assert
        assert response.status_code == 401

    def test_export_database_requires_step_up_pin(
        self, super_admin_client: TestClient, postgres_url_for_db_export
    ):
        """Story 16.3 : PIN step-up obligatoire avant pg_dump."""
        r = super_admin_client.post(_DB_EXPORT)
        assert r.status_code == 403
        assert r.json().get("code") == "STEP_UP_PIN_REQUIRED"

    def test_export_database_requires_super_admin_role(
        self,
        admin_client: TestClient
    ):
        """Teste que l'endpoint nécessite le rôle SUPER_ADMIN (ADMIN n'est pas suffisant)."""
        # Act
        response = admin_client.post(_DB_EXPORT)

        # Assert
        assert response.status_code == 403
        assert "super-administrateur" in response.json()["detail"].lower()

    def test_export_database_regular_user_denied(
        self,
        client: TestClient,
        db_session: Session
    ):
        """Teste qu'un utilisateur régulier ne peut pas exporter."""
        # Arrange
        user = UserFactory(role=UserRole.USER, status=UserStatus.ACTIVE)
        db_session.commit()

        access_token = create_access_token(data={"sub": str(user.id)})
        client.headers = {"Authorization": f"Bearer {access_token}"}

        # Act
        response = client.post(_DB_EXPORT)

        # Assert
        # require_super_admin_role() retourne 401 pour les non-super-admins même s'ils sont authentifiés
        assert response.status_code == 401

    @patch('recyclic_api.api.api_v1.endpoints.db_export.subprocess.run')
    @patch('recyclic_api.api.api_v1.endpoints.db_export.os.path.exists')
    def test_export_database_pg_dump_failure_returns_500(
        self,
        mock_exists: Mock,
        mock_subprocess: Mock,
        super_admin_client: TestClient,
        postgres_url_for_db_export,
    ):
        """Teste que l'échec de pg_dump retourne une erreur 500."""
        # Arrange
        # Mock pg_dump failed execution
        mock_subprocess.return_value = MagicMock(
            returncode=1,
            stderr="pg_dump: error: connection failed"
        )

        # Act
        response = super_admin_client.post(_DB_EXPORT, headers=_DB_EXPORT_HEADERS)

        # Assert
        assert response.status_code == 500
        detail = response.json()["detail"].lower()
        assert "export" in detail and "échou" in detail

    @patch('recyclic_api.api.api_v1.endpoints.db_export.subprocess.run')
    @patch('recyclic_api.api.api_v1.endpoints.db_export.os.path.exists')
    def test_export_database_file_not_created_returns_500(
        self,
        mock_exists: Mock,
        mock_subprocess: Mock,
        super_admin_client: TestClient,
        postgres_url_for_db_export,
    ):
        """Teste que l'absence de fichier créé retourne une erreur 500."""
        # Arrange
        # Mock pg_dump successful but file not created
        mock_subprocess.return_value = MagicMock(returncode=0, stderr="")
        mock_exists.return_value = False

        # Act
        response = super_admin_client.post(_DB_EXPORT, headers=_DB_EXPORT_HEADERS)

        # Assert
        assert response.status_code == 500
        dexp = response.json()["detail"]
        assert "export" in dexp.lower()
        assert "pas été" in dexp or "pas ete" in dexp.lower()

    @patch('recyclic_api.api.api_v1.endpoints.db_export.subprocess.run')
    def test_export_database_timeout_returns_504(
        self,
        mock_subprocess: Mock,
        super_admin_client: TestClient,
        postgres_url_for_db_export,
    ):
        """Teste que le timeout de pg_dump retourne une erreur 504."""
        # Arrange
        # Mock pg_dump timeout
        from subprocess import TimeoutExpired
        mock_subprocess.side_effect = TimeoutExpired(cmd="pg_dump", timeout=300)

        # Act
        response = super_admin_client.post(_DB_EXPORT, headers=_DB_EXPORT_HEADERS)

        # Assert
        assert response.status_code == 504
        assert "timeout" in response.json()["detail"].lower()

    @patch('recyclic_api.api.api_v1.endpoints.db_export.FileResponse')
    @patch('recyclic_api.api.api_v1.endpoints.db_export.subprocess.run')
    @patch('recyclic_api.api.api_v1.endpoints.db_export.os.path.exists')
    def test_export_database_filename_contains_timestamp(
        self,
        mock_exists: Mock,
        mock_subprocess: Mock,
        mock_file_response: Mock,
        super_admin_client: TestClient,
        postgres_url_for_db_export,
    ):
        """Teste que le nom du fichier contient un timestamp."""
        # Arrange
        # Mock pg_dump successful execution
        mock_subprocess.return_value = MagicMock(returncode=0, stderr="")
        mock_exists.return_value = True

        # Mock FileResponse
        from fastapi.responses import Response
        mock_file_response.return_value = Response(
            content=b"Dump content",
            media_type="application/octet-stream",
            headers={"content-disposition": "attachment; filename=recyclic_db_export_20250101_120000.dump"}
        )

        # Act
        response = super_admin_client.post(_DB_EXPORT, headers=_DB_EXPORT_HEADERS)

        # Assert
        assert response.status_code == 200
        # Vérifier que FileResponse a été appelé avec un filename contenant timestamp
        call_args = mock_file_response.call_args
        filename = call_args.kwargs.get('filename', '')
        assert "recyclic_db_export_" in filename
        assert ".dump" in filename
        # Vérifier que pg_dump utilise le format custom (-F c) et compression (-Z 9)
        subprocess_call = mock_subprocess.call_args
        assert subprocess_call is not None
        cmd_args = subprocess_call[0][0] if subprocess_call[0] else []
        assert "-F" in cmd_args
        assert "c" in cmd_args[cmd_args.index("-F") + 1] if "-F" in cmd_args else False
        assert "-Z" in cmd_args
        assert "9" in cmd_args[cmd_args.index("-Z") + 1] if "-Z" in cmd_args else False


class TestStory163DatabaseExportStepUpGuards:
    """Story 16.3 — refus PIN invalide et lockout (même module step-up que l'import)."""

    def test_export_step_up_wrong_pin_returns_403(
        self, super_admin_client: TestClient, postgres_url_for_db_export
    ):
        r = super_admin_client.post(_DB_EXPORT, headers={STEP_UP_PIN_HEADER: "9999"})
        assert r.status_code == 403
        assert r.json().get("code") == "STEP_UP_PIN_INVALID"

    @patch("recyclic_api.core.step_up._is_locked_out", return_value=True)
    def test_export_step_up_locked_returns_429(
        self,
        _mock_lock: Mock,
        super_admin_client: TestClient,
        postgres_url_for_db_export,
    ):
        r = super_admin_client.post(_DB_EXPORT, headers=_DB_EXPORT_HEADERS)
        assert r.status_code == 429
        assert r.json().get("code") == "STEP_UP_LOCKED"
