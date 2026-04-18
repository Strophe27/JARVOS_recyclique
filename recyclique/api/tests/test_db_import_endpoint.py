"""
Tests pour l'endpoint d'import de base de données (Story B46-P2)
Pattern: Mocks & Overrides (évite d'exécuter pg_restore réel en test)
"""

import uuid

import pytest
import os
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from io import BytesIO

from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.core.security import create_access_token
from recyclic_api.core.config import settings
from recyclic_api.core.step_up import IDEMPOTENCY_KEY_HEADER, STEP_UP_PIN_HEADER
from recyclic_api.api.api_v1.endpoints import db_import as db_import_endpoint
from tests.factories import UserFactory


def _import_sensitive_headers(*, idempotency_key: str | None = None) -> dict[str, str]:
    return {
        STEP_UP_PIN_HEADER: "1234",
        IDEMPOTENCY_KEY_HEADER: idempotency_key or str(uuid.uuid4()),
    }


def _detail_text(response) -> str:
    raw = response.json().get("detail")
    if isinstance(raw, dict):
        return (raw.get("message") or raw.get("code") or str(raw)).lower()
    return str(raw).lower()

_V1 = settings.API_V1_STR.rstrip("/")
_DB_IMPORT_URL = f"{_V1}/admin/db/import"

# L'endpoint parse ``DATABASE_URL`` et exige ``postgresql://`` avant tout ``subprocess`` :
# les tests utilisent SQLite via conftest → forcer une URL Postgres factice pour les chemins mockés.
_FAKE_PG_URL = "postgresql://postgres:secret@127.0.0.1:5432/recyclic_import_test"


@pytest.fixture(autouse=True)
def _db_import_test_env(monkeypatch):
    monkeypatch.setattr(db_import_endpoint.settings, "DATABASE_URL", _FAKE_PG_URL)
    monkeypatch.setattr(db_import_endpoint.time, "sleep", lambda *args, **kwargs: None)
    monkeypatch.setattr(db_import_endpoint.shutil, "copy2", lambda *args, **kwargs: None)


class TestDatabaseImportEndpoint:
    """Tests pour l'endpoint POST {API_V1_STR}/admin/db/import"""

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
            # Ordre réel : pg_restore --list, pg_dump, psql (terminate), pg_restore (restore)
            return MagicMock(returncode=0, stderr="", stdout="")
        
        mock_subprocess.side_effect = side_effect
        mock_makedirs.return_value = None

        # Create a test dump file (binary format)
        dump_content = b"PGDMP\x01\x00\x00\x00"  # Minimal valid dump header
        files = {"file": ("test.dump", BytesIO(dump_content), "application/octet-stream")}

        # Act
        response = super_admin_client.post(
            _DB_IMPORT_URL, files=files, headers=_import_sensitive_headers()
        )

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
        response = client.post(_DB_IMPORT_URL, files=files)

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
        response = admin_client.post(_DB_IMPORT_URL, files=files)

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
        response = client.post(_DB_IMPORT_URL, files=files)

        # Assert
        assert response.status_code == 401

    def test_import_database_no_file_returns_422(self, super_admin_client: TestClient):
        """Sans fichier : FastAPI / File(...) → 422 (champ ``file`` manquant), pas le corps métier 400."""
        response = super_admin_client.post(_DB_IMPORT_URL)
        assert response.status_code == 422
        body = response.json()
        assert "detail" in body

    def test_import_database_non_dump_file_returns_400(self, super_admin_client: TestClient):
        """Teste qu'un fichier non-.dump retourne une erreur 400."""
        # Arrange
        files = {"file": ("test.txt", BytesIO(b"content"), "text/plain")}

        # Act
        response = super_admin_client.post(
            _DB_IMPORT_URL, files=files, headers=_import_sensitive_headers()
        )

        # Assert
        assert response.status_code == 400
        assert ".dump" in _detail_text(response)

    def test_import_database_file_too_large_returns_413(self, super_admin_client: TestClient):
        """Teste qu'un fichier trop volumineux retourne une erreur 413."""
        # Arrange
        # Create a large file (> 500MB)
        large_content = b"x" * (501 * 1024 * 1024)  # 501MB
        files = {"file": ("large.dump", BytesIO(large_content), "application/octet-stream")}

        # Act
        response = super_admin_client.post(
            _DB_IMPORT_URL, files=files, headers=_import_sensitive_headers()
        )

        # Assert
        assert response.status_code == 413
        assert "trop volumineux" in _detail_text(response)

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
        response = super_admin_client.post(
            _DB_IMPORT_URL, files=files, headers=_import_sensitive_headers()
        )

        # Assert
        assert response.status_code == 400
        assert ".dump n'est pas valide" in _detail_text(response)

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
        # Validation (pg_restore --list) OK ; échec sur pg_dump — ne pas se fier à len(call_args_list)
        def side_effect(*args, **kwargs):
            cmd = args[0] if args else ()
            cmd0 = cmd[0] if cmd else ""
            if "pg_restore" in cmd0 and "--list" in cmd:
                return MagicMock(returncode=0, stderr="", stdout="")
            if "pg_dump" in cmd0:
                return MagicMock(returncode=1, stderr="pg_dump: error: connection failed")
            return MagicMock(returncode=0, stderr="", stdout="")
        
        mock_subprocess.side_effect = side_effect
        mock_makedirs.return_value = None

        dump_content = b"PGDMP\x01\x00\x00\x00"
        files = {"file": ("test.dump", BytesIO(dump_content), "application/octet-stream")}

        # Act
        response = super_admin_client.post(
            _DB_IMPORT_URL, files=files, headers=_import_sensitive_headers()
        )

        # Assert
        assert response.status_code == 500
        assert "sauvegarde automatique" in _detail_text(response)

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
        # Validation, backup, psql terminate OK ; échec sur le 4e appel (pg_restore)
        def side_effect(*args, **kwargs):
            n = len(mock_subprocess.call_args_list)
            if n < 3:
                return MagicMock(returncode=0, stderr="", stdout="")
            return MagicMock(returncode=1, stderr="pg_restore: error: database error")
        
        mock_subprocess.side_effect = side_effect
        mock_makedirs.return_value = None

        dump_content = b"PGDMP\x01\x00\x00\x00"
        files = {"file": ("test.dump", BytesIO(dump_content), "application/octet-stream")}

        # Act
        response = super_admin_client.post(
            _DB_IMPORT_URL, files=files, headers=_import_sensitive_headers()
        )

        # Assert
        assert response.status_code == 500
        assert "restauration" in _detail_text(response)

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
            n = len(mock_subprocess.call_args_list)
            if n < 3:
                return MagicMock(returncode=0, stderr="", stdout="")
            raise TimeoutExpired(cmd="pg_restore", timeout=600)
        
        mock_subprocess.side_effect = side_effect
        mock_makedirs.return_value = None

        dump_content = b"PGDMP\x01\x00\x00\x00"
        files = {"file": ("test.dump", BytesIO(dump_content), "application/octet-stream")}

        # Act
        response = super_admin_client.post(
            _DB_IMPORT_URL, files=files, headers=_import_sensitive_headers()
        )

        # Assert
        assert response.status_code == 504
        assert "timeout" in _detail_text(response)

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
        response = super_admin_client.post(
            _DB_IMPORT_URL, files=files, headers=_import_sensitive_headers()
        )

        # Assert
        assert response.status_code == 200
        response_data = response.json()
        assert "backup_created" in response_data
        assert "pre_restore_" in response_data["backup_created"]
        norm_backup = response_data["backup_path"].replace("\\", "/")
        assert norm_backup.startswith("/backups/")
        
        assert mock_subprocess.called
        assert len(mock_subprocess.call_args_list) >= 2
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
        response = super_admin_client.post(
            _DB_IMPORT_URL, files=files, headers=_import_sensitive_headers()
        )

        # Assert
        assert response.status_code == 200
        # Vérifier que os.unlink a été appelé pour nettoyer le fichier temporaire
        assert mock_unlink.called


class TestStory163DatabaseImportGuards:
    """Story 16.3 — step-up PIN, Idempotency-Key, lockout."""

    def test_import_requires_idempotency_key(self, super_admin_client: TestClient):
        dump_content = b"PGDMP\x01\x00\x00\x00"
        files = {"file": ("test.dump", BytesIO(dump_content), "application/octet-stream")}
        r = super_admin_client.post(
            _DB_IMPORT_URL,
            files=files,
            headers={STEP_UP_PIN_HEADER: "1234"},
        )
        assert r.status_code == 400
        assert r.json()["code"] == "IDEMPOTENCY_KEY_REQUIRED"

    def test_import_requires_step_up_pin(self, super_admin_client: TestClient):
        dump_content = b"PGDMP\x01\x00\x00\x00"
        files = {"file": ("test.dump", BytesIO(dump_content), "application/octet-stream")}
        r = super_admin_client.post(
            _DB_IMPORT_URL,
            files=files,
            headers={IDEMPOTENCY_KEY_HEADER: str(uuid.uuid4())},
        )
        assert r.status_code == 403
        assert r.json()["code"] == "STEP_UP_PIN_REQUIRED"

    def test_import_step_up_wrong_pin_returns_403(self, super_admin_client: TestClient):
        dump_content = b"PGDMP\x01\x00\x00\x00"
        files = {"file": ("test.dump", BytesIO(dump_content), "application/octet-stream")}
        r = super_admin_client.post(
            _DB_IMPORT_URL,
            files=files,
            headers={
                STEP_UP_PIN_HEADER: "9999",
                IDEMPOTENCY_KEY_HEADER: str(uuid.uuid4()),
            },
        )
        assert r.status_code == 403
        assert r.json()["code"] == "STEP_UP_PIN_INVALID"

    @patch("recyclic_api.core.step_up._is_locked_out", return_value=True)
    def test_import_step_up_locked_returns_429(
        self,
        _mock_lock: Mock,
        super_admin_client: TestClient,
    ):
        dump_content = b"PGDMP\x01\x00\x00\x00"
        files = {"file": ("test.dump", BytesIO(dump_content), "application/octet-stream")}
        r = super_admin_client.post(
            _DB_IMPORT_URL,
            files=files,
            headers=_import_sensitive_headers(),
        )
        assert r.status_code == 429
        assert r.json()["code"] == "STEP_UP_LOCKED"

    @patch("recyclic_api.api.api_v1.endpoints.db_import.subprocess.run")
    @patch("recyclic_api.api.api_v1.endpoints.db_import.os.makedirs")
    def test_import_idempotent_replay_same_payload(
        self,
        mock_makedirs: Mock,
        mock_subprocess: Mock,
        super_admin_client: TestClient,
    ):
        def side_effect(*args, **kwargs):
            return MagicMock(returncode=0, stderr="", stdout="")

        mock_subprocess.side_effect = side_effect
        mock_makedirs.return_value = None
        dump_content = b"PGDMP\x01\x00\x00\x00"
        files = {"file": ("test.dump", BytesIO(dump_content), "application/octet-stream")}
        ik = str(uuid.uuid4())
        h = _import_sensitive_headers(idempotency_key=ik)
        r1 = super_admin_client.post(_DB_IMPORT_URL, files=files, headers=h)
        r2 = super_admin_client.post(_DB_IMPORT_URL, files=files, headers=h)
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r1.json() == r2.json()

    @patch("recyclic_api.api.api_v1.endpoints.db_import.subprocess.run")
    @patch("recyclic_api.api.api_v1.endpoints.db_import.os.makedirs")
    def test_import_idempotency_key_conflict_different_file(
        self,
        mock_makedirs: Mock,
        mock_subprocess: Mock,
        super_admin_client: TestClient,
    ):
        def side_effect(*args, **kwargs):
            return MagicMock(returncode=0, stderr="", stdout="")

        mock_subprocess.side_effect = side_effect
        mock_makedirs.return_value = None
        ik = str(uuid.uuid4())
        h = _import_sensitive_headers(idempotency_key=ik)
        files1 = {"file": ("test.dump", BytesIO(b"PGDMP\x01\x00\x00\x00"), "application/octet-stream")}
        r1 = super_admin_client.post(_DB_IMPORT_URL, files=files1, headers=h)
        assert r1.status_code == 200
        files2 = {
            "file": (
                "test.dump",
                BytesIO(b"PGDMP\x02\x00\x00\x00" + b"x" * 50),
                "application/octet-stream",
            )
        }
        r2 = super_admin_client.post(_DB_IMPORT_URL, files=files2, headers=h)
        assert r2.status_code == 409
        assert r2.json()["code"] == "IDEMPOTENCY_KEY_CONFLICT"
