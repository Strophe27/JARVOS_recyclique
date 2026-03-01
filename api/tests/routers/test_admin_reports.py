# Story 17.9 — Tests GET by-session, POST export-bulk.

from collections.abc import Generator
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from api.core import deps
from api.db import get_db
from api.main import app
from api.models import (
    CashRegister,
    CashSession,
    Category,
    Sale,
    SaleItem,
    PaymentTransaction,
    Site,
    User,
)
from api.tests.conftest import TestingSessionLocal, override_get_db


def _build_user(role: str) -> User:
    return User(
        id=uuid4(),
        username=f"{role}-user-{uuid4().hex[:8]}",
        email=f"{role}-{uuid4().hex[:8]}@test.local",
        password_hash="hash",
        role=role,
        status="active",
    )


@pytest.fixture
def admin_client() -> Generator[TestClient, None, None]:
    """Client avec user admin mock."""
    original_get_codes = deps.get_user_permission_codes_from_user
    app.dependency_overrides[get_db] = override_get_db

    def _get_current_user() -> User:
        return _build_user("admin")

    deps.get_user_permission_codes_from_user = lambda db, u: {"admin"}
    app.dependency_overrides[deps.get_current_user] = _get_current_user

    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    deps.get_user_permission_codes_from_user = original_get_codes


def _create_closed_session_with_sale(db, site_id, register_id, operator_id) -> CashSession:
    session = CashSession(
        id=uuid4(),
        site_id=site_id,
        register_id=register_id,
        operator_id=operator_id,
        status="closed",
        opened_at=datetime.now(timezone.utc),
        closed_at=datetime.now(timezone.utc),
        initial_amount=0,
        closing_amount=1000,
        actual_amount=1000,
        variance=0,
        total_sales=500,
        total_items=1,
    )
    db.add(session)
    db.flush()
    cat = Category(
        id=uuid4(),
        name="Test Cat",
        is_visible_sale=True,
        is_visible_reception=True,
    )
    db.add(cat)
    db.flush()
    sale = Sale(
        id=uuid4(),
        cash_session_id=session.id,
        operator_id=operator_id,
        total_amount=500,
        sale_date=datetime.now(timezone.utc),
    )
    db.add(sale)
    db.flush()
    item = SaleItem(
        sale_id=sale.id,
        category_id=cat.id,
        quantity=1,
        unit_price=500,
        total_price=500,
    )
    db.add(item)
    pt = PaymentTransaction(
        sale_id=sale.id,
        payment_method="especes",
        amount=500,
    )
    db.add(pt)
    db.commit()
    db.refresh(session)
    return session


class TestAdminReportsBySession:
    """GET /v1/admin/reports/cash-sessions/by-session/{id} — CSV, Content-Disposition."""

    def test_by_session_returns_csv_with_content_disposition(
        self,
        admin_client: TestClient,
        auth_headers: dict,
    ) -> None:
        db = TestingSessionLocal()
        try:
            site = Site(id=uuid4(), name="Site Rapport", is_active=True)
            db.add(site)
            db.flush()
            reg = CashRegister(
                id=uuid4(),
                site_id=site.id,
                name="Caisse 1",
                is_active=True,
            )
            db.add(reg)
            db.flush()
            user = User(
                id=uuid4(),
                username="op_rapport",
                email="op@rapport.local",
                password_hash="h",
                role="operator",
                status="active",
            )
            db.add(user)
            db.commit()
            session = _create_closed_session_with_sale(db, site.id, reg.id, user.id)
        finally:
            db.close()

        r = admin_client.get(
            f"/v1/admin/reports/cash-sessions/by-session/{session.id}",
            headers=auth_headers,
        )
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        cd = r.headers.get("Content-Disposition", "")
        assert "attachment" in cd
        assert "rapport-session-" in cd
        assert ".csv" in cd
        content = r.text
        assert "session_id" in content
        assert "opened_at" in content
        assert "ITEMS" in content or "sale_id" in content
        assert "PAYMENTS" in content or "payment_method" in content

    def test_by_session_not_found_404(
        self,
        admin_client: TestClient,
        auth_headers: dict,
    ) -> None:
        r = admin_client.get(
            "/v1/admin/reports/cash-sessions/by-session/00000000-0000-0000-0000-000000000000",
            headers=auth_headers,
        )
        assert r.status_code == 404


class TestAdminReportsExportBulk:
    """POST /v1/admin/reports/cash-sessions/export-bulk — ZIP, Content-Disposition."""

    def test_export_bulk_returns_zip_with_content_disposition(
        self,
        admin_client: TestClient,
        auth_headers: dict,
    ) -> None:
        db = TestingSessionLocal()
        try:
            site = Site(id=uuid4(), name="Site Bulk", is_active=True)
            db.add(site)
            db.flush()
            reg = CashRegister(
                id=uuid4(),
                site_id=site.id,
                name="Caisse Bulk",
                is_active=True,
            )
            db.add(reg)
            db.flush()
            user = User(
                id=uuid4(),
                username="op_bulk",
                email="op@bulk.local",
                password_hash="h",
                role="operator",
                status="active",
            )
            db.add(user)
            db.commit()
            session = _create_closed_session_with_sale(db, site.id, reg.id, user.id)
        finally:
            db.close()

        r = admin_client.post(
            "/v1/admin/reports/cash-sessions/export-bulk",
            json={},
            headers=auth_headers,
        )
        assert r.status_code == 200
        assert "application/zip" in r.headers.get("content-type", "")
        cd = r.headers.get("Content-Disposition", "")
        assert "attachment" in cd
        assert "export-bulk-" in cd
        assert ".zip" in cd
        assert len(r.content) > 0
        import zipfile
        import io
        zf = zipfile.ZipFile(io.BytesIO(r.content), "r")
        names = zf.namelist()
        zf.close()
        assert any("rapport-session-" in n and n.endswith(".csv") for n in names)

    def test_export_bulk_empty_returns_empty_zip(
        self,
        admin_client: TestClient,
        auth_headers: dict,
    ) -> None:
        r = admin_client.post(
            "/v1/admin/reports/cash-sessions/export-bulk",
            json={"date_from": "2099-01-01", "date_to": "2099-01-31"},
            headers=auth_headers,
        )
        assert r.status_code == 200
        assert "application/zip" in r.headers.get("content-type", "")
        import zipfile
        import io
        zf = zipfile.ZipFile(io.BytesIO(r.content), "r")
        assert len(zf.namelist()) == 0
        zf.close()

    def test_export_bulk_invalid_date_returns_400(
        self,
        admin_client: TestClient,
        auth_headers: dict,
    ) -> None:
        r = admin_client.post(
            "/v1/admin/reports/cash-sessions/export-bulk",
            json={"date_from": "invalid-date", "date_to": "2099-01-31"},
            headers=auth_headers,
        )
        assert r.status_code == 400
        assert "date_from" in (r.json().get("detail") or "").lower()
