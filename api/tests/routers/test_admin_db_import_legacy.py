# Story 8.5 / 17.3 / 17.5 / 17.11 / 18.2 — Tests POST /v1/admin/db/* et GET/POST /v1/admin/import/legacy/*.
# 18.2 : refactor export/import/purge vers logique 1.4.4 (pg_dump -F c, pg_restore, super_admin seul).

from collections.abc import Generator
from unittest.mock import patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from api.core import deps
from api.db import get_db
from api.main import app
from api.services.csv_categories import CSV_HEADERS
from api.tests.conftest import FAKE_SITE_ID, override_get_db

# CSV format categories (Story 17.5)
_CSV_VALID_ONE_ROW = (
    "name,parent_id,official_name,is_visible_sale,is_visible_reception,display_order,display_order_entry\n"
    "TestCategory,,,true,true,0,0\n"
)
_CSV_INVALID_NO_NAME = (
    "name,parent_id,official_name,is_visible_sale,is_visible_reception,display_order,display_order_entry\n"
    ",,,,,\n"
)
_CSV_INVALID_BAD_PARENT_ID = (
    "name,parent_id,official_name,is_visible_sale,is_visible_reception,display_order,display_order_entry\n"
    "BadCat,not-a-uuid,,,,\n"
)


def _build_operator_user():
    """User operator (reception) sans permission admin."""
    from api.models import User

    return User(
        id=uuid4(),
        username=f"operator-{uuid4().hex[:8]}",
        email=f"operator-{uuid4().hex[:8]}@test.local",
        password_hash="hash",
        role="operator",
        status="active",
        site_id=FAKE_SITE_ID,
    )


@pytest.fixture
def role_client() -> Generator[callable, None, None]:
    """Client avec user operator et permission_codes parametrable (pour tests 403)."""
    original_get_codes = deps.get_user_permission_codes_from_user
    app.dependency_overrides[get_db] = override_get_db

    def _factory(permission_codes: set | None = None):
        user = _build_operator_user()

        def _get_current_user():
            return user

        codes = permission_codes if permission_codes is not None else {"reception.access"}
        deps.get_user_permission_codes_from_user = lambda db, u: codes
        app.dependency_overrides[deps.get_current_user] = _get_current_user
        return TestClient(app)

    try:
        yield _factory
    finally:
        app.dependency_overrides.clear()
        deps.get_user_permission_codes_from_user = original_get_codes



class TestAdminDb:
    """POST /v1/admin/db/export, purge-transactions, import (super_admin uniquement — Story 18.2)."""

    @patch("api.routers.v1.admin.db.export_dump")
    def test_db_export_returns_200_octet_stream(
        self,
        mock_export,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST /v1/admin/db/export : 200, application/octet-stream, Content-Disposition .dump."""
        fake_bytes = b"\x50\x47\x44\x4d\x50fake_binary_dump"
        mock_export.return_value = (fake_bytes, "recyclic_db_export_20260302_120000.dump")

        r = client.post("/v1/admin/db/export", headers=auth_headers)
        assert r.status_code == 200
        assert "application/octet-stream" in r.headers.get("content-type", "")
        assert r.content == fake_bytes
        cd = r.headers.get("content-disposition", "")
        assert "recyclic_db_export" in cd
        assert ".dump" in cd

    @patch("api.routers.v1.admin.db.export_dump")
    def test_db_export_timeout_returns_504(
        self,
        mock_export,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST /v1/admin/db/export : timeout → 504."""
        mock_export.side_effect = RuntimeError("timeout")
        r = client.post("/v1/admin/db/export", headers=auth_headers)
        assert r.status_code == 504

    def test_db_purge_transactions_returns_200(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST /v1/admin/db/purge-transactions : 200, deleted_records dict, timestamp."""
        r = client.post("/v1/admin/db/purge-transactions", headers=auth_headers, json={})
        assert r.status_code == 200
        data = r.json()
        assert "message" in data
        assert "deleted_records" in data
        assert "timestamp" in data
        assert isinstance(data["deleted_records"], dict)
        expected_tables = {"sale_items", "sales", "ligne_depot", "ticket_depot", "cash_sessions"}
        assert expected_tables == set(data["deleted_records"].keys())
        assert "payment_transactions" not in data["deleted_records"]

    def test_db_purge_transactions_idempotent(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST /v1/admin/db/purge-transactions deux fois : second appel retourne 0 pour toutes les tables."""
        client.post("/v1/admin/db/purge-transactions", headers=auth_headers, json={})
        r2 = client.post("/v1/admin/db/purge-transactions", headers=auth_headers, json={})
        assert r2.status_code == 200
        data = r2.json()
        assert "deleted_records" in data
        assert all(v == 0 for v in data["deleted_records"].values()), (
            f"Deuxieme purge devrait trouver 0 lignes partout: {data['deleted_records']}"
        )
        assert "payment_transactions" not in data["deleted_records"]

    @patch("api.routers.v1.admin.db.import_dump")
    def test_db_import_valid_dump_returns_200(
        self,
        mock_import,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST /v1/admin/db/import avec .dump valide : 200, backup_created, imported_file, timestamp."""
        mock_import.return_value = {
            "backup_created": "pre_restore_20260302_120000.dump",
            "backup_path": "/backups/pre_restore_20260302_120000.dump",
            "warnings": [],
        }
        dump_bytes = b"\x50\x47\x44\x4d\x50fake_binary_dump_content"
        files = {"file": ("backup.dump", dump_bytes, "application/octet-stream")}
        r = client.post("/v1/admin/db/import", headers=auth_headers, files=files)
        assert r.status_code == 200
        data = r.json()
        assert data["backup_created"] == "pre_restore_20260302_120000.dump"
        assert data["imported_file"] == "backup.dump"
        assert "timestamp" in data
        assert "message" in data

    def test_db_import_sql_extension_returns_400(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST /v1/admin/db/import avec .sql : 400 (.dump requis)."""
        files = {"file": ("backup.sql", b"SELECT 1;", "application/sql")}
        r = client.post("/v1/admin/db/import", headers=auth_headers, files=files)
        assert r.status_code == 400
        detail = r.json().get("detail", "")
        assert ".dump" in detail.lower() or "format" in detail.lower()

    def test_db_import_invalid_extension_returns_400(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST /v1/admin/db/import extension .txt : 400 (.dump attendu)."""
        files = {"file": ("data.txt", b"SELECT 1;", "text/plain")}
        r = client.post("/v1/admin/db/import", headers=auth_headers, files=files)
        assert r.status_code == 400
        detail = r.json().get("detail", "")
        assert ".dump" in detail.lower() or "format" in detail.lower()

    def test_db_import_empty_file_returns_400(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST /v1/admin/db/import fichier .dump vide : 400."""
        files = {"file": ("empty.dump", b"", "application/octet-stream")}
        r = client.post("/v1/admin/db/import", headers=auth_headers, files=files)
        assert r.status_code == 400
        assert "vide" in r.json().get("detail", "").lower() or "empty" in str(r.json()).lower()

    @patch("api.routers.v1.admin.db._MAX_IMPORT_BYTES", 10)
    def test_db_import_oversized_returns_413(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST /v1/admin/db/import fichier > MAX : 413."""
        files = {"file": ("big.dump", b"X" * 11, "application/octet-stream")}
        r = client.post("/v1/admin/db/import", headers=auth_headers, files=files)
        assert r.status_code == 413

    @patch("api.routers.v1.admin.db.import_dump")
    def test_db_import_corrupted_dump_returns_400(
        self,
        mock_import,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST /v1/admin/db/import dump corrompu (pg_restore --list echoue) : 400."""
        mock_import.side_effect = RuntimeError("validation_failed:Fichier corrompu ou format invalide")
        files = {"file": ("corrupt.dump", b"this is not a real dump", "application/octet-stream")}
        r = client.post("/v1/admin/db/import", headers=auth_headers, files=files)
        assert r.status_code == 400
        assert "invalide" in r.json().get("detail", "").lower() or "corrompu" in r.json().get("detail", "").lower()

    def test_db_import_no_file_returns_422(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST /v1/admin/db/import sans fichier : FastAPI 422 (param manquant)."""
        r = client.post("/v1/admin/db/import", headers=auth_headers)
        assert r.status_code == 422


class TestAdminDbImportLegacy401:
    """17.11 : tests 401 (auth_client sans headers, requete non authentifiee)."""

    DB_401_ENDPOINTS = [
        ("POST", "/v1/admin/db/export"),
        ("POST", "/v1/admin/db/purge-transactions"),
        ("POST", "/v1/admin/db/import"),
    ]
    LEGACY_401_ENDPOINTS = [
        ("GET", "/v1/admin/import/legacy/llm-models"),
        ("POST", "/v1/admin/import/legacy/analyze"),
        ("POST", "/v1/admin/import/legacy/preview"),
        ("POST", "/v1/admin/import/legacy/validate"),
        ("POST", "/v1/admin/import/legacy/execute"),
    ]

    @pytest.mark.parametrize("method,url", DB_401_ENDPOINTS[:2])  # export, purge (sans body special)
    def test_db_unauthenticated_401(self, auth_client: TestClient, method: str, url: str) -> None:
        """401 si non authentifie sur routes db."""
        if method == "POST":
            r = auth_client.post(url, json={})
        else:
            r = auth_client.get(url)
        assert r.status_code == 401
        assert r.json().get("detail") == "Not authenticated"

    def test_db_import_unauthenticated_401(self, auth_client: TestClient) -> None:
        """401 si non authentifie sur POST db/import."""
        files = {"file": ("x.dump", b"fake", "application/octet-stream")}
        r = auth_client.post("/v1/admin/db/import", files=files)
        assert r.status_code == 401

    @pytest.mark.parametrize("method,url", LEGACY_401_ENDPOINTS)
    def test_legacy_unauthenticated_401(self, auth_client: TestClient, method: str, url: str) -> None:
        """401 si non authentifie sur routes import legacy."""
        if method == "GET":
            r = auth_client.get(url)
        else:
            r = auth_client.post(url, files={"file": ("x.csv", _CSV_VALID_ONE_ROW.encode(), "text/csv")})
        assert r.status_code == 401
        assert r.json().get("detail") == "Not authenticated"


class TestAdminDbImportLegacy403:
    """17.11 / 18.2 : tests 403 (role operator/admin sans super_admin)."""

    DB_403_ENDPOINTS = [
        ("POST", "/v1/admin/db/export"),
        ("POST", "/v1/admin/db/purge-transactions"),
        ("POST", "/v1/admin/db/import"),
    ]
    LEGACY_403_ENDPOINTS = [
        ("GET", "/v1/admin/import/legacy/llm-models"),
        ("POST", "/v1/admin/import/legacy/analyze"),
        ("POST", "/v1/admin/import/legacy/preview"),
        ("POST", "/v1/admin/import/legacy/validate"),
        ("POST", "/v1/admin/import/legacy/execute"),
    ]

    @pytest.mark.parametrize("method,url", DB_403_ENDPOINTS[:2])
    def test_db_operator_forbidden_403(self, role_client, method: str, url: str) -> None:
        """403 si role operator sans admin sur routes db."""
        with role_client(permission_codes={"reception.access"}) as client:
            if method == "POST":
                r = client.post(url, json={})
            else:
                r = client.get(url)
        assert r.status_code == 403
        assert r.json().get("detail") == "Insufficient permissions"

    def test_db_import_operator_forbidden_403(self, role_client) -> None:
        """403 si role operator sur POST db/import."""
        with role_client(permission_codes={"reception.access"}) as client:
            files = {"file": ("x.dump", b"fake", "application/octet-stream")}
            r = client.post("/v1/admin/db/import", files=files)
        assert r.status_code == 403

    @pytest.mark.parametrize("method,url", DB_403_ENDPOINTS[:2])
    def test_db_admin_role_forbidden_403(self, role_client, method: str, url: str) -> None:
        """18.2 : 403 si role admin (sans super_admin) sur routes db."""
        with role_client(permission_codes={"admin"}) as client:
            if method == "POST":
                r = client.post(url, json={})
            else:
                r = client.get(url)
        assert r.status_code == 403
        assert r.json().get("detail") == "Insufficient permissions"

    def test_db_import_admin_role_forbidden_403(self, role_client) -> None:
        """18.2 : 403 si role admin (sans super_admin) sur POST db/import."""
        with role_client(permission_codes={"admin"}) as client:
            files = {"file": ("x.dump", b"fake", "application/octet-stream")}
            r = client.post("/v1/admin/db/import", files=files)
        assert r.status_code == 403

    @pytest.mark.parametrize("method,url", LEGACY_403_ENDPOINTS)
    def test_legacy_operator_forbidden_403(self, role_client, method: str, url: str) -> None:
        """403 si role operator sans admin sur routes import legacy."""
        with role_client(permission_codes={}) as client:
            if method == "GET":
                r = client.get(url)
            else:
                r = client.post(url, files={"file": ("x.csv", _CSV_VALID_ONE_ROW.encode(), "text/csv")})
        assert r.status_code == 403
        assert r.json().get("detail") == "Insufficient permissions"


class TestAdminImportLegacy:
    """GET llm-models, POST analyze, preview, validate, execute (Story 17.5 : pipeline operationnel)."""

    def test_llm_models_returns_200_and_list(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """GET /v1/admin/import/legacy/llm-models : 200 et models (liste)."""
        r = client.get("/v1/admin/import/legacy/llm-models", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "models" in data
        assert isinstance(data["models"], list)
        assert "stub" not in str(data).lower()

    def test_legacy_analyze_valid_csv(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST analyze avec CSV valide : columns=CSV_HEADERS, row_count>0, pas de stub."""
        files = {"file": ("data.csv", _CSV_VALID_ONE_ROW.encode("utf-8"), "text/csv")}
        r = client.post("/v1/admin/import/legacy/analyze", headers=auth_headers, files=files)
        assert r.status_code == 200
        data = r.json()
        assert data["columns"] == CSV_HEADERS
        assert data["row_count"] > 0
        assert "errors" in data
        assert "warnings" in data
        assert "rows" in data
        assert "stub" not in str(data).lower()

    def test_legacy_analyze_invalid_csv(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST analyze avec CSV invalide (name manquant, parent_id UUID invalide) : errors non vides."""
        files = {"file": ("bad.csv", _CSV_INVALID_NO_NAME.encode("utf-8"), "text/csv")}
        r = client.post("/v1/admin/import/legacy/analyze", headers=auth_headers, files=files)
        assert r.status_code == 200
        data = r.json()
        assert len(data.get("errors", [])) > 0 or data.get("row_count", 0) == 0

        files2 = {"file": ("bad2.csv", _CSV_INVALID_BAD_PARENT_ID.encode("utf-8"), "text/csv")}
        r2 = client.post("/v1/admin/import/legacy/analyze", headers=auth_headers, files=files2)
        assert r2.status_code == 200
        assert len(r2.json().get("errors", [])) > 0
        assert "stub" not in str(r2.json()).lower()

    def test_legacy_analyze_no_file_returns_422(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST analyze sans fichier : 422 (FastAPI param manquant)."""
        r = client.post("/v1/admin/import/legacy/analyze", headers=auth_headers)
        assert r.status_code == 422

    def test_legacy_preview_valid_csv(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST preview avec CSV valide + file : rows non vides, total>0, pas stub."""
        files = {"file": ("data.csv", _CSV_VALID_ONE_ROW.encode("utf-8"), "text/csv")}
        r = client.post("/v1/admin/import/legacy/preview", headers=auth_headers, files=files)
        assert r.status_code == 200
        data = r.json()
        assert "rows" in data
        assert data["total"] > 0
        assert "stub" not in str(data).lower()

    def test_legacy_preview_no_file_returns_400(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST preview sans fichier : 400 ou 422 (FastAPI param manquant)."""
        r = client.post("/v1/admin/import/legacy/preview", headers=auth_headers)
        assert r.status_code in (400, 422)

    def test_legacy_validate_valid_csv(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST validate avec CSV valide : valid=True."""
        files = {"file": ("data.csv", _CSV_VALID_ONE_ROW.encode("utf-8"), "text/csv")}
        r = client.post("/v1/admin/import/legacy/validate", headers=auth_headers, files=files)
        assert r.status_code == 200
        data = r.json()
        assert data["valid"] is True
        assert "errors" in data
        assert "warnings" in data
        assert "stub" not in str(data).lower()

    def test_legacy_validate_invalid_csv(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST validate avec CSV invalide : valid=False, errors non vides."""
        files = {"file": ("bad.csv", _CSV_INVALID_BAD_PARENT_ID.encode("utf-8"), "text/csv")}
        r = client.post("/v1/admin/import/legacy/validate", headers=auth_headers, files=files)
        assert r.status_code == 200
        data = r.json()
        assert not data.get("valid", True) or len(data.get("errors", [])) > 0

    def test_legacy_execute_valid_csv(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST execute avec CSV valide : imported_count>0, verification BDD (table Category)."""
        files = {"file": ("data.csv", _CSV_VALID_ONE_ROW.encode("utf-8"), "text/csv")}
        r = client.post("/v1/admin/import/legacy/execute", headers=auth_headers, files=files)
        assert r.status_code == 200
        data = r.json()
        assert data["imported_count"] > 0
        assert "errors" in data
        assert "message" in data
        assert "stub" not in str(data).lower()

        r2 = client.get("/v1/categories", headers=auth_headers)
        assert r2.status_code == 200
        categories = r2.json()
        assert len(categories) >= 1
        names = [c["name"] for c in categories]
        assert "TestCategory" in names

    def test_legacy_execute_invalid_csv(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST execute avec CSV invalide : imported_count=0 ou partiel, errors non vides."""
        files = {"file": ("bad.csv", _CSV_INVALID_NO_NAME.encode("utf-8"), "text/csv")}
        r = client.post("/v1/admin/import/legacy/execute", headers=auth_headers, files=files)
        assert r.status_code == 200
        data = r.json()
        assert data["imported_count"] == 0
        assert "stub" not in str(data).lower()

    def test_legacy_execute_no_file_returns_400(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST execute sans fichier : 400 ou 422 (FastAPI param manquant)."""
        r = client.post("/v1/admin/import/legacy/execute", headers=auth_headers)
        assert r.status_code in (400, 422)

    # --- 17.11 : tests 400/422 import_legacy extension invalide ---
    @pytest.mark.parametrize("endpoint", ["/v1/admin/import/legacy/analyze", "/v1/admin/import/legacy/preview", "/v1/admin/import/legacy/validate", "/v1/admin/import/legacy/execute"])
    def test_legacy_invalid_extension_returns_400_or_422(
        self,
        client: TestClient,
        auth_headers: dict,
        endpoint: str,
    ) -> None:
        """POST avec extension .txt au lieu de .csv : 400 ou 422."""
        files = {"file": ("data.txt", _CSV_VALID_ONE_ROW.encode("utf-8"), "text/plain")}
        r = client.post(endpoint, headers=auth_headers, files=files)
        assert r.status_code in (400, 422)
        assert "csv" in r.json().get("detail", "").lower() or "csv" in str(r.json()).lower()
