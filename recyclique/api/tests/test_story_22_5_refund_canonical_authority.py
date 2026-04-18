"""Story 22.5 — remboursement canonique (journal) + autorité exercice clos (non devinable)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from recyclic_api.core.security import create_access_token
from recyclic_api.models.cash_session import CashSession
from recyclic_api.models.payment_transaction import (
    PaymentTransaction,
    PaymentTransactionDirection,
    PaymentTransactionNature,
)
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.services.cash_session_service import CashSessionService
from recyclic_api.services.cash_session_response_enrichment import enrich_session_response
from recyclic_api.main import app
from tests.caisse_sale_eligibility import (
    grant_user_accounting_prior_year_refund_permission,
    grant_user_caisse_refund_permission,
    grant_user_caisse_sale_eligibility,
)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def s225_fixtures(db_session):
    site_id = uuid.uuid4()
    op_id = uuid.uuid4()
    sess_id = uuid.uuid4()

    site = Site(
        id=site_id,
        name="S225",
        address="a",
        city="c",
        postal_code="75000",
        country="FR",
    )
    user = User(
        id=op_id,
        username="cashier_s225",
        hashed_password="x",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
        site_id=site_id,
    )
    session = CashSession(
        id=sess_id,
        operator_id=op_id,
        site_id=site_id,
        register_id=None,
        initial_amount=100.0,
        current_amount=100.0,
        status="open",
        opened_at=datetime.utcnow(),
    )
    db_session.add_all([site, user, session])
    db_session.commit()
    grant_user_caisse_sale_eligibility(db_session, user, site_id)
    grant_user_caisse_refund_permission(db_session, user)

    token = create_access_token(data={"sub": str(op_id)})
    return {
        "token": token,
        "session_id": str(sess_id),
        "headers": {"Authorization": f"Bearer {token}"},
        "op_id": str(op_id),
        "user": user,
    }


def _ensure_snapshot_row(db_session, *, year: int) -> None:
    """Mise à jour SQL brute — évite les décalages UUID SQLite vs ORM."""
    rid = "00000000-0000-5000-8000-000000000001"
    ts = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    ct = db_session.execute(
        text("SELECT COUNT(*) FROM accounting_period_authority_snapshots WHERE id = :id"),
        {"id": rid},
    ).scalar()
    if ct == 0:
        db_session.execute(
            text(
                "INSERT INTO accounting_period_authority_snapshots "
                "(id, current_open_fiscal_year, fetched_at, source, version) "
                "VALUES (:id, :y, :ts, 'local_test', 1)"
            ),
            {"id": rid, "y": year, "ts": ts},
        )
    else:
        db_session.execute(
            text(
                "UPDATE accounting_period_authority_snapshots SET "
                "current_open_fiscal_year = :y, fetched_at = :ts WHERE id = :id"
            ),
            {"y": year, "ts": ts, "id": rid},
        )
    db_session.commit()
    db_session.expire_all()


def _create_completed_sale(client: TestClient, headers: dict, session_id: str, total: float = 25.0) -> str:
    body = {
        "cash_session_id": session_id,
        "items": [
            {
                "category": "EEE-1",
                "quantity": 1,
                "weight": 1.0,
                "unit_price": total,
                "total_price": total,
            }
        ],
        "total_amount": total,
        "donation": 0,
        "payment_method": "cash",
    }
    r = client.post("/v1/sales/", json=body, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_reversal_creates_refund_payment_transaction_canonical(client: TestClient, db_session, s225_fixtures):
    h = s225_fixtures["headers"]
    sid = s225_fixtures["session_id"]
    y = datetime.now(timezone.utc).year
    _ensure_snapshot_row(db_session, year=y)

    sale_id = _create_completed_sale(client, h, sid, 30.0)
    r = client.post(
        "/v1/sales/reversals",
        json={"source_sale_id": sale_id, "reason_code": "RETOUR_ARTICLE", "refund_payment_method": "cash"},
        headers=h,
    )
    assert r.status_code == 200, r.text

    sid_uuid = uuid.UUID(sale_id)
    rows = (
        db_session.query(PaymentTransaction)
        .filter(
            PaymentTransaction.sale_id == sid_uuid,
            PaymentTransaction.nature == PaymentTransactionNature.REFUND_PAYMENT,
        )
        .all()
    )
    assert len(rows) == 1
    pt = rows[0]
    assert pt.direction == PaymentTransactionDirection.OUTFLOW
    assert float(pt.amount) == 30.0
    assert pt.is_prior_year_special_case is False
    assert pt.original_sale_id == sid_uuid


def test_prior_year_blocked_without_expert_path(client: TestClient, db_session, s225_fixtures):
    h = s225_fixtures["headers"]
    sid = s225_fixtures["session_id"]
    _ensure_snapshot_row(db_session, year=2026)

    sale_id = _create_completed_sale(client, h, sid, 10.0)
    from recyclic_api.models.sale import Sale

    srow = db_session.query(Sale).filter(Sale.id == uuid.UUID(sale_id)).first()
    srow.sale_date = datetime(2024, 3, 15, tzinfo=timezone.utc)
    db_session.commit()

    r = client.post(
        "/v1/sales/reversals",
        json={"source_sale_id": sale_id, "reason_code": "ERREUR_SAISIE"},
        headers=h,
    )
    assert r.status_code == 409
    assert "PRIOR_YEAR_REFUND_REQUIRES_EXPERT_PATH" in (r.json().get("detail") or "")


def test_get_sale_includes_refund_fiscal_preview_prior_closed(client: TestClient, db_session, s225_fixtures):
    """Story 24.4 — GET ticket expose la même autorité que POST reversals (visibilité proactive terrain)."""
    h = s225_fixtures["headers"]
    sid = s225_fixtures["session_id"]
    _ensure_snapshot_row(db_session, year=2026)

    sale_id = _create_completed_sale(client, h, sid, 10.0)
    from recyclic_api.models.sale import Sale

    srow = db_session.query(Sale).filter(Sale.id == uuid.UUID(sale_id)).first()
    srow.sale_date = datetime(2024, 3, 15, tzinfo=timezone.utc)
    db_session.commit()

    r = client.get(f"/v1/sales/{sale_id}", headers=h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("fiscal_branch") == "prior_closed"
    assert body.get("sale_fiscal_year") == 2024
    assert body.get("current_open_fiscal_year") == 2026


def test_prior_year_expert_path_ok(client: TestClient, db_session, s225_fixtures):
    h = s225_fixtures["headers"]
    sid = s225_fixtures["session_id"]
    user = s225_fixtures["user"]
    grant_user_accounting_prior_year_refund_permission(db_session, user)

    _ensure_snapshot_row(db_session, year=2026)
    sale_id = _create_completed_sale(client, h, sid, 11.0)
    from recyclic_api.models.sale import Sale

    srow = db_session.query(Sale).filter(Sale.id == uuid.UUID(sale_id)).first()
    srow.sale_date = datetime(2024, 3, 15, tzinfo=timezone.utc)
    db_session.commit()

    r = client.post(
        "/v1/sales/reversals",
        json={
            "source_sale_id": sale_id,
            "reason_code": "ERREUR_SAISIE",
            "expert_prior_year_refund": True,
        },
        headers=h,
    )
    assert r.status_code == 200, r.text

    pt = (
        db_session.query(PaymentTransaction)
        .filter(
            PaymentTransaction.sale_id == uuid.UUID(sale_id),
            PaymentTransaction.nature == PaymentTransactionNature.REFUND_PAYMENT,
        )
        .one()
    )
    assert pt.is_prior_year_special_case is True


def test_authority_stale_blocks(client: TestClient, db_session, s225_fixtures):
    h = s225_fixtures["headers"]
    sid = s225_fixtures["session_id"]
    y = datetime.now(timezone.utc).year
    _ensure_snapshot_row(db_session, year=y)
    db_session.execute(
        text("UPDATE accounting_period_authority_snapshots SET fetched_at = '1999-01-01T00:00:00'")
    )
    db_session.commit()

    sale_id = _create_completed_sale(client, h, sid, 5.0)
    r = client.post(
        "/v1/sales/reversals",
        json={"source_sale_id": sale_id, "reason_code": "RETOUR_ARTICLE"},
        headers=h,
    )
    assert r.status_code == 409
    assert "ACCOUNTING_PERIOD_AUTHORITY_STALE" in (r.json().get("detail") or "")


def test_authority_missing_blocks(client: TestClient, db_session, s225_fixtures):
    h = s225_fixtures["headers"]
    sid = s225_fixtures["session_id"]
    db_session.execute(text("DELETE FROM accounting_period_authority_snapshots"))
    db_session.commit()

    sale_id = _create_completed_sale(client, h, sid, 4.0)
    r = client.post(
        "/v1/sales/reversals",
        json={"source_sale_id": sale_id, "reason_code": "RETOUR_ARTICLE"},
        headers=h,
    )
    assert r.status_code == 409
    assert "ACCOUNTING_PERIOD_AUTHORITY_UNAVAILABLE" in (r.json().get("detail") or "")
    _ensure_snapshot_row(db_session, year=datetime.now(timezone.utc).year)


def test_story64_aggregates_unchanged(client: TestClient, db_session, s225_fixtures):
    """Régression 6.4 : agrégats session après remboursement."""
    h = s225_fixtures["headers"]
    sid = s225_fixtures["session_id"]
    _ensure_snapshot_row(db_session, year=datetime.now(timezone.utc).year)

    sale_id = _create_completed_sale(client, h, sid, 30.0)
    r = client.post(
        "/v1/sales/reversals",
        json={"source_sale_id": sale_id, "reason_code": "RETOUR_ARTICLE"},
        headers=h,
    )
    assert r.status_code == 200, r.text

    sess = db_session.query(CashSession).filter(CashSession.id == uuid.UUID(sid)).first()
    enriched = enrich_session_response(sess, CashSessionService(db_session))
    assert enriched.totals is not None
    assert enriched.totals.refunds == -30.0
