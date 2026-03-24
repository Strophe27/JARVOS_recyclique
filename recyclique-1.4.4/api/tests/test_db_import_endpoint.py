"""
Tests pour l'endpoint d'import de base de données (Story B46-P2)
Pattern: Mocks & Overrides (évite d'exécuter pg_restore réel en test)
"""

import pytest
import os
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from io import BytesIO

from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.core.security import create_access_token
from tests.factories import UserFactory


class TestDatabaseImportEndpoint:
    """Tests pour l'endpoint POST /api/v1/admin/db/import"""

    @patch('recyclic_api.api.api_v1.endpoints.db_import.subprocess.run')
    @patch('recyclic_api.api.api_v1.endpoints.db_import.os.makedirs')
    def test_import_database_success_as_super_admin(
        self,
        mock_makedirs: Mock,
        mock_subprocess: Mock,
        super_admin_client: TestClient
    ):
        """Teste qu'un super-admin peut importer la base de données avec succès."""
        # Arrange
        # Mock successful validation, backup and restore
        def side_effect(*args, **kwargs):
            # First call: pg_restore --list (validation)
            # Second call: pg_dump (backup)
            # Third call: pg_restore (restore)
            call_count = len(mock_subprocess.call_args_list)
            return MagicMock(returncode=0, stderr="", stdout="")
        
        mock_subprocess.side_effect = side_effect
        mock_makedirs.return_value = None

        # Create a test dump file (binary format)
        dump_content = b"PGDMP\x01\x00\x00\x00"  # Minimal valid dump header
        files = {"file": ("test.dump", BytesIO(dump_content), "application/octet-stream")}

        # Act
        response = super_admin_client.post("/api/v1/admin/db/import", files=files)

        # Assert
        assert response.status_code == 200
        response_data = response.json()
        assert "Import de la base de données effectué avec succès" in response_data["message"]
        assert response_data["imported_file"] == "test.dump"
        assert "backup_created" in response_data
        assert "pre_restore_" in response_data["backup_created"]
        assert mock_subprocess.called
        # Vérifier que pg_restore --list a été appelé pour la validation
        assert len(mock_subprocess.call_args_list) >= 1
        first_call = mock_subprocess.call_args_list[0]
        assert "pg_restore" in first_call[0][0]
        assert "--list" in first_call[0][0]

    def test_import_database_requires_authentication(self, client: TestClient):
        """Teste que l'endpoint nécessite une authentification."""
        # Arrange
        dump_content = b"PGDMP\x01\x00\x00\x00"
        files = {"file": ("test.dump", BytesIO(dump_content), "application/octet-stream")}

        # Act
        response = client.post("/api/v1/admin/db/import", files=files)

        # Assert
        assert response.status_code == 401

    def test_import_database_requires_super_admin_role(
        self,
        admin_client: TestClient
    ):
        """Teste que l'endpoint nécessite le rôle SUPER_ADMIN (ADMIN n'est pas suffisant)."""
        # Arrange
        dump_content = b"PGDMP\x01\x00\x00\x00"
        files = {"file": ("test.dump", BytesIO(dump_content), "application/octet-stream")}

        # Act
        response = admin_client.post("/api/v1/admin/db/import", files=files)

        # Assert
        assert response.status_code == 403
        assert "super-administrateur" in response.json()["detail"].lower()

    def test_import_database_regular_user_denied(
        self,
        client: TestClient,
        db_session: Session
    ):
        """Teste qu'un utilisateur régulier ne peut pas importer."""
        # Arrange
        user = UserFactory(role=UserRole.USER, status=UserStatus.ACTIVE)
        db_session.commit()

        access_token = create_access_token(data={"sub": str(user.id)})
        client.headers = {"Authorization": f"Bearer {access_token}"}

        dump_content = b"PGDMP\x01\x00\x00\x00"
        files = {"file": ("test.dump", BytesIO(dump_content), "application/octet-stream")}

        # Act
        response = client.post("/api/v1/admin/db/import", files=files)

        # Assert
        assert response.status_code == 401

    def test_import_database_no_file_returns_400(self, super_admin_client: TestClient):
        """Teste que l'absence de fichier retourne une erreur 400."""
        # Act
        response = super_admin_client.post("/api/v1/admin/db/import")

        # Assert
        assert response.status_code == 400
        assert "Aucun fichier fourni" in response.json()["detail"]

    def test_import_database_non_dump_file_returns_400(self, super_admin_client: TestClient):
        """Teste qu'un fichier non-.dump retourne une erreur 400."""
        # Arrange
        files = {"file": ("test.txt", BytesIO(b"content"), "text/plain")}

        # Act
        response = super_admin_client.post("/api/v1/admin/db/import", files=files)

        # Assert
        assert response.status_code == 400
        assert ".dump" in response.json()["detail"]

    def test_import_database_file_too_large_returns_413(self, super_admin_client: TestClient):
        """Teste qu'un fichier trop volumineux retourne une erreur 413."""
        # Arrange
        # Create a large file (> 500MB)
        large_content = b"x" * (501 * 1024 * 1024)  # 501MB
        files = {"file": ("large.dump", BytesIO(large_content), "application/octet-stream")}

        # Act
        response = super_admin_client.post("/api/v1/admin/db/import", files=files)

        # Assert
        assert response.status_code == 413
        assert "trop volumineux" in response.json()["detail"]

    @patch('recyclic_api.api.api_v1.endpoints.db_import.subprocess.run')
    @patch('recyclic_api.api.api_v1.endpoints.db_import.os.makedirs')
    def test_import_database_validation_failure_returns_400(
        self,
        mock_makedirs: Mock,
        mock_subprocess: Mock,
        super_admin_client: TestClient
    ):
        """Teste que l'échec de la validation (pg_restore --list) retourne une erreur 400."""
        # Arrange
        # Mock validation failure
        mock_subprocess.return_value = MagicMock(
            returncode=1,
            stderr="pg_restore: error: invalid dump file"
        )
        mock_makedirs.return_value = None

        dump_content = b"invalid dump content"
        files = {"file": ("test.dump", BytesIO(dump_content), "application/octet-stream")}

        # Act
        response = super_admin_client.post("/api/v1/admin/db/import", files=files)

        # Assert
        assert response.status_code == 400
        assert ".dump n'est pas valide" in response.json()["detail"]

    @patch('recyclic_api.api.api_v1.endpoints.db_import.subprocess.run')
    @patch('recyclic_api.api.api_v1.endpoints.db_import.os.makedirs')
    def test_import_database_backup_failure_returns_500(
        self,
        mock_makedirs: Mock,
        mock_subprocess: Mock,
        super_admin_client: TestClient
    ):
        """Teste que l'échec de la sauvegarde automatique retourne une erreur 500."""
        # Arrange
        # Mock validation success but backup failure
        def side_effect(*args, **kwargs):
            call_count = len(mock_subprocess.call_args_list)
            if call_count == 0:
                # Validation succeeds
                return MagicMock(returncode=0, stderr="")
            else:
                # Backup fails
                return MagicMock(returncode=1, stderr="pg_dump: error: connection failed")
        
        mock_subprocess.side_effect = side_effect
        mock_makedirs.return_value = None

        dump_content = b"PGDMP\x01\x00\x00\x00"
        files = {"file": ("test.dump", BytesIO(dump_content), "application/octet-stream")}

        # Act
        response = super_admin_client.post("/api/v1/admin/db/import", files=files)

        # Assert
        assert response.status_code == 500
        assert "sauvegarde automatique" in response.json()["detail"]

    @patch('recyclic_api.api.api_v1.endpoints.db_import.subprocess.run')
    @patch('recyclic_api.api.api_v1.endpoints.db_import.os.makedirs')
    def test_import_database_restore_failure_returns_500(
        self,
        mock_makedirs: Mock,
        mock_subprocess: Mock,
        super_admin_client: TestClient
    ):
        """Teste que l'échec de la restauration retourne une erreur 500."""
        # Arrange
        # Mock successful validation and backup but failed restore
        def side_effect(*args, **kwargs):
            call_count = len(mock_subprocess.call_args_list)
            if call_count == 0:
                # Validation succeeds
                return MagicMock(returncode=0, stderr="")
            elif call_count == 1:
                # Backup succeeds
                return MagicMock(returncode=0, stderr="")
            else:
                # Restore fails
                return MagicMock(returncode=1, stderr="pg_restore: error: database error")
        
        mock_subprocess.side_effect = side_effect
        mock_makedirs.return_value = None

        dump_content = b"PGDMP\x01\x00\x00\x00"
        files = {"file": ("test.dump", BytesIO(dump_content), "application/octet-stream")}

        # Act
        response = super_admin_client.post("/api/v1/admin/db/import", files=files)

        # Assert
        assert response.status_code == 500
        assert "restauration" in response.json()["detail"]

    @patch('recyclic_api.api.api_v1.endpoints.db_import.subprocess.run')
    @patch('recyclic_api.api.api_v1.endpoints.db_import.os.makedirs')
    def test_import_database_timeout_returns_504(
        self,
        mock_makedirs: Mock,
        mock_subprocess: Mock,
        super_admin_client: TestClient
    ):
        """Teste que le timeout de l'import retourne une erreur 504."""
        # Arrange
        # Mock timeout during restore
        from subprocess import TimeoutExpired
        def side_effect(*args, **kwargs):
            call_count = len(mock_subprocess.call_args_list)
            if call_count == 0:
                # Validation succeeds
                return MagicMock(returncode=0, stderr="")
            elif call_count == 1:
                # Backup succeeds
                return MagicMock(returncode=0, stderr="")
            else:
                # Restore times out
                raise TimeoutExpired(cmd="pg_restore", timeout=600)
        
        mock_subprocess.side_effect = side_effect
        mock_makedirs.return_value = None

        dump_content = b"PGDMP\x01\x00\x00\x00"
        files = {"file": ("test.dump", BytesIO(dump_content), "application/octet-stream")}

        # Act
        response = super_admin_client.post("/api/v1/admin/db/import", files=files)

        # Assert
        assert response.status_code == 504
        assert "timeout" in response.json()["detail"].lower()

    @patch('recyclic_api.api.api_v1.endpoints.db_import.subprocess.run')
    @patch('recyclic_api.api.api_v1.endpoints.db_import.os.makedirs')
    def test_import_database_creates_automatic_backup(
        self,
        mock_makedirs: Mock,
        mock_subprocess: Mock,
        super_admin_client: TestClient
    ):
        """Teste que l'import crée automatiquement une sauvegarde dans /backups."""
        # Arrange
        # Mock successful validation, backup and restore
        def side_effect(*args, **kwargs):
            return MagicMock(returncode=0, stderr="", stdout="")
        
        mock_subprocess.side_effect = side_effect
        mock_makedirs.return_value = None

        dump_content = b"PGDMP\x01\x00\x00\x00"
        files = {"file": ("test.dump", BytesIO(dump_content), "application/octet-stream")}

        # Act
        response = super_admin_client.post("/api/v1/admin/db/import", files=files)

        # Assert
        assert response.status_code == 200
        response_data = response.json()
        assert "backup_created" in response_data
        assert "pre_restore_" in response_data["backup_created"]
        assert response_data["backup_path"].startswith("/backups/")
        
        # Vérifier que pg_dump a été appelé pour la sauvegarde (deuxième appel après validation)
        assert mock_subprocess.called
        assert len(mock_subprocess.call_args_list) >= 2
        # Le deuxième appel devrait être pg_dump (backup)
        backup_call = mock_subprocess.call_args_list[1]
        assert "pg_dump" in backup_call[0][0]
        assert "-F" in backup_call[0][0]
        # Vérifier que le format est custom (c) et compression (Z 9)
        cmd_args = backup_call[0][0]
        assert "c" in cmd_args[cmd_args.index("-F") + 1] if "-F" in cmd_args else False

    @patch('recyclic_api.api.api_v1.endpoints.db_import.subprocess.run')
    @patch('recyclic_api.api.api_v1.endpoints.db_import.os.makedirs')
    @patch('recyclic_api.api.api_v1.endpoints.db_import.os.unlink')
    def test_import_database_cleans_up_temporary_files(
        self,
        mock_unlink: Mock,
        mock_makedirs: Mock,
        mock_subprocess: Mock,
        super_admin_client: TestClient
    ):
        """Teste que les fichiers temporaires sont nettoyés après l'import."""
        # Arrange
        # Mock successful validation, backup and restore
        def side_effect(*args, **kwargs):
            return MagicMock(returncode=0, stderr="", stdout="")
        
        mock_subprocess.side_effect = side_effect
        mock_makedirs.return_value = None

        dump_content = b"PGDMP\x01\x00\x00\x00"
        files = {"file": ("test.dump", BytesIO(dump_content), "application/octet-stream")}

        # Act
        response = super_admin_client.post("/api/v1/admin/db/import", files=files)

        # Assert
        assert response.status_code == 200
        # Vérifier que os.unlink a été appelé pour nettoyer le fichier temporaire
        assert mock_unlink.called
