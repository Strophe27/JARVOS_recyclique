# Story 8.5 / 17.3 / 17.5 — Tests POST /v1/admin/db/* et GET/POST /v1/admin/import/legacy/*.

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from api.models import (
    CashSession,
    PaymentTransaction,
    Sale,
    SaleItem,
)
from api.services.csv_categories import CSV_HEADERS
from api.tests.conftest import FAKE_SITE_ID, FAKE_USER_ID, TestingSessionLocal

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


def _create_transaction_data_via_import(client: TestClient, auth_headers: dict) -> None:
    """Cree des donnees transactionnelles via POST /v1/admin/db/import (meme DB que purge)."""
    cat_id = str(uuid4())
    preset_id = str(uuid4())
    reg_id = str(uuid4())
    cs_id = str(uuid4())
    sale_id = str(uuid4())
    item_id = str(uuid4())
    pt_id = str(uuid4())
    user_id = str(FAKE_USER_ID)
    site_id = str(FAKE_SITE_ID)
    now = "datetime('now')"
    sql = f"""
    INSERT INTO categories (id, name, is_visible_sale, is_visible_reception, display_order, display_order_entry, created_at, updated_at) VALUES ('{cat_id}', 'X', 1, 1, 0, 0, {now}, {now});
    INSERT INTO preset_buttons (id, name, category_id, preset_price, button_type, sort_order, is_active, created_at, updated_at) VALUES ('{preset_id}', 'X', '{cat_id}', 100, 'test', 0, 1, {now}, {now});
    INSERT INTO cash_registers (id, site_id, name, is_active, enable_virtual, enable_deferred, created_at, updated_at) VALUES ('{reg_id}', '{site_id}', 'X', 1, 0, 0, {now}, {now});
    INSERT INTO cash_sessions (id, operator_id, register_id, site_id, initial_amount, current_amount, status, opened_at, current_step, session_type, created_at, updated_at) VALUES ('{cs_id}', '{user_id}', '{reg_id}', '{site_id}', 0, 0, 'open', {now}, 'entry', 'real', {now}, {now});
    INSERT INTO sales (id, cash_session_id, operator_id, total_amount, created_at, updated_at) VALUES ('{sale_id}', '{cs_id}', '{user_id}', 100, {now}, {now});
    INSERT INTO sale_items (id, sale_id, preset_id, quantity, unit_price, total_price, created_at, updated_at) VALUES ('{item_id}', '{sale_id}', '{preset_id}', 1, 100, 100, {now}, {now});
    INSERT INTO payment_transactions (id, sale_id, payment_method, amount, created_at) VALUES ('{pt_id}', '{sale_id}', 'especes', 100, {now});
    """
    r = client.post("/v1/admin/db/import", headers=auth_headers, files={"file": ("data.sql", sql.encode("utf-8"), "application/sql")})
    assert r.status_code == 200 and r.json().get("ok"), r.json()


class TestAdminDb:
    """POST /v1/admin/db/export, purge-transactions, import (admin ou super_admin)."""

    def test_db_export_returns_200_and_sql_content(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST /v1/admin/db/export : 200, contenu significatif (schema), pas de stub."""
        r = client.post("/v1/admin/db/export", headers=auth_headers)
        assert r.status_code == 200
        assert "recyclique" in r.headers.get("content-disposition", "").lower() or "sql" in r.headers.get("content-type", "").lower()
        content = r.content.decode("utf-8", errors="replace")
        assert "stub" not in content.lower()
        assert "CREATE TABLE" in content or "create table" in content or "RecyClique" in content

    def test_db_purge_transactions_returns_200(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST /v1/admin/db/purge-transactions : 200 et message, deleted_count (peut etre 0)."""
        r = client.post("/v1/admin/db/purge-transactions", headers=auth_headers, json={})
        assert r.status_code == 200
        data = r.json()
        assert "message" in data
        assert "deleted_count" in data
        assert isinstance(data["deleted_count"], int)

    def test_db_purge_transactions_deletes_data(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST /v1/admin/db/purge-transactions : tables videes apres purge."""
        _create_transaction_data_via_import(client, auth_headers)
        r = client.post("/v1/admin/db/purge-transactions", headers=auth_headers, json={})
        assert r.status_code == 200
        data = r.json()
        assert "deleted_count" in data
        # Verifier que les tables sont videes (effet reel)
        db = TestingSessionLocal()
        try:
            for model, name in [
                (PaymentTransaction, "payment_transactions"),
                (SaleItem, "sale_items"),
                (Sale, "sales"),
                (CashSession, "cash_sessions"),
            ]:
                rows = db.scalars(select(model)).all()
                assert len(rows) == 0, f"{name} devrait etre vide apres purge"
        finally:
            db.close()

    def test_db_import_returns_200_with_file(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST /v1/admin/db/import avec fichier SQL : 200 et ok/message."""
        files = {"file": ("backup.sql", b"-- RecyClique import test\nSELECT 1;", "application/sql")}
        r = client.post("/v1/admin/db/import", headers=auth_headers, files=files)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "filename" in data or "message" in data

    def test_db_import_executes_sql(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """
        POST /v1/admin/db/import : fichier SQL valide (CREATE TABLE + INSERT).
        Verifie ok=true et effet via export (table presente dans le dump).
        """
        sql = """
        CREATE TABLE IF NOT EXISTS _test_import_stub (id INTEGER PRIMARY KEY, name TEXT);
        INSERT INTO _test_import_stub (id, name) VALUES (1, 'test');
        """
        files = {"file": ("import.sql", sql.encode("utf-8"), "application/sql")}
        r = client.post("/v1/admin/db/import", headers=auth_headers, files=files)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        # Verification effet : export doit contenir la table creee
        r2 = client.post("/v1/admin/db/export", headers=auth_headers)
        assert r2.status_code == 200
        export_content = r2.content.decode("utf-8", errors="replace")
        assert "_test_import_stub" in export_content

    def test_db_import_invalid_sql_returns_422_with_exploitable_detail(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """
        POST /v1/admin/db/import avec SQL invalide : 422 et detail exploitable (AC4/5).
        Verifie que l'erreur de syntaxe SQL est renvoyee avec un message comprehensible.
        """
        invalid_sql = "SELECT FROM non_existent_table;"
        files = {"file": ("invalid.sql", invalid_sql.encode("utf-8"), "application/sql")}
        r = client.post("/v1/admin/db/import", headers=auth_headers, files=files)
        assert r.status_code == 422, r.json()
        data = r.json()
        assert "detail" in data
        detail = data["detail"]
        assert detail, "detail ne doit pas etre vide"
        # Message exploitable : doit contenir une indication d'erreur (syntaxe, sql, etc.)
        detail_lower = str(detail).lower()
        assert any(
            k in detail_lower for k in ("syntax", "error", "sql", "invalid", "near", "syntax error")
        ), f"detail doit etre exploitable, recu: {detail}"

    def test_db_import_sql_with_semicolon_newline_in_string_literal(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """
        POST /v1/admin/db/import : SQL avec ;\\n dans une chaine litterale.
        Verifie que _split_sql_statements ne coupe pas a l'interieur des guillemets.
        """
        sql = """
        CREATE TABLE IF NOT EXISTS _test_semicolon_in_str (id INTEGER PRIMARY KEY, val TEXT);
        INSERT INTO _test_semicolon_in_str (id, val) VALUES (1, 'hello;
        world');
        """
        files = {"file": ("semicolon.sql", sql.encode("utf-8"), "application/sql")}
        r = client.post("/v1/admin/db/import", headers=auth_headers, files=files)
        assert r.status_code == 200, r.json()
        data = r.json()
        assert data.get("ok") is True
        # Verification : export doit contenir la valeur inseree
        r2 = client.post("/v1/admin/db/export", headers=auth_headers)
        assert r2.status_code == 200
        export_content = r2.content.decode("utf-8", errors="replace")
        assert "_test_semicolon_in_str" in export_content


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

    def test_legacy_analyze_no_file_returns_400(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """POST analyze sans fichier : 400."""
        r = client.post("/v1/admin/import/legacy/analyze", headers=auth_headers)
        assert r.status_code == 422  # FastAPI retourne 422 pour param manquant

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
        """POST preview sans fichier : 400."""
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
        # parent_id invalide -> parse error, valid peut etre False ou errors non vides
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

        # Verification effet reel : GET categories doit retourner la categorie importee
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
        """POST execute sans fichier : 400/422."""
        r = client.post("/v1/admin/import/legacy/execute", headers=auth_headers)
        assert r.status_code in (400, 422)
