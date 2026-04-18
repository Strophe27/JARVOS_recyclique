"""Story 6.8 — correction vente sensible (whitelist, super-admin, step-up PIN, audit, session ouverte)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from recyclic_api.core.auth import create_access_token
from recyclic_api.core.config import settings
from recyclic_api.core.security import hash_password
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.sale import PaymentMethod, Sale, SaleLifecycleStatus
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.services.context_envelope_service import build_context_envelope

V1 = settings.API_V1_STR.rstrip("/")
_PIN = "1234"


@pytest.fixture
def site_sc(db_session):
    s = Site(
        name="Site correction 6.8",
        address="1 r",
        city="Paris",
        postal_code="75001",
        country="FR",
        is_active=True,
    )
    db_session.add(s)
    db_session.commit()
    db_session.refresh(s)
    return s


@pytest.fixture
def super_admin_pin(db_session, site_sc):
    u = User(
        id=uuid.uuid4(),
        username=f"sa68_{uuid.uuid4().hex[:8]}",
        email=f"sa68_{uuid.uuid4().hex[:8]}@example.com",
        hashed_password=hash_password("Pw!123456"),
        hashed_pin=hash_password(_PIN),
        role=UserRole.SUPER_ADMIN,
        status=UserStatus.ACTIVE,
        is_active=True,
        site_id=site_sc.id,
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


@pytest.fixture
def admin_no_super(db_session, site_sc):
    u = User(
        id=uuid.uuid4(),
        username=f"adm68_{uuid.uuid4().hex[:8]}",
        email=f"adm68_{uuid.uuid4().hex[:8]}@example.com",
        hashed_password=hash_password("Pw!123456"),
        hashed_pin=hash_password(_PIN),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        is_active=True,
        site_id=site_sc.id,
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


@pytest.fixture
def open_session_sale(db_session, site_sc, super_admin_pin):
    opened = datetime.now(timezone.utc) - timedelta(hours=3)
    sess = CashSession(
        operator_id=super_admin_pin.id,
        site_id=site_sc.id,
        initial_amount=10.0,
        current_amount=50.0,
        status=CashSessionStatus.OPEN,
        total_sales=40.0,
        total_items=1,
        opened_at=opened,
    )
    db_session.add(sess)
    db_session.flush()
    sale = Sale(
        cash_session_id=sess.id,
        operator_id=super_admin_pin.id,
        total_amount=40.0,
        donation=2.0,
        payment_method=PaymentMethod.CASH,
        note="note orig",
        sale_date=datetime.now(timezone.utc) - timedelta(hours=2),
        lifecycle_status=SaleLifecycleStatus.COMPLETED,
    )
    db_session.add(sale)
    db_session.commit()
    db_session.refresh(sale)
    db_session.refresh(sess)
    return sess, sale


def test_correct_sale_date_super_admin_ok(client, db_session, super_admin_pin, open_session_sale):
    _, sale = open_session_sale
    token = create_access_token(data={"sub": str(super_admin_pin.id)})
    new_date = (datetime.now(timezone.utc) - timedelta(minutes=20)).isoformat()
    r = client.patch(
        f"{V1}/sales/{sale.id}/corrections",
        json={"kind": "sale_date", "sale_date": new_date, "reason": "Mauvais jour saisi"},
        headers={"Authorization": f"Bearer {token}", "X-Step-Up-Pin": _PIN},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("id") == str(sale.id)
    row = db_session.query(Sale).filter(Sale.id == sale.id).first()
    assert row is not None
    assert row.sale_date is not None


def test_correct_finalize_super_admin_ok(client, db_session, super_admin_pin, open_session_sale):
    _, sale = open_session_sale
    token = create_access_token(data={"sub": str(super_admin_pin.id)})
    r = client.patch(
        f"{V1}/sales/{sale.id}/corrections",
        json={
            "kind": "finalize_fields",
            "donation": 1.0,
            "note": "note corrigée",
            "reason": "Double saisie don",
        },
        headers={"Authorization": f"Bearer {token}", "X-Step-Up-Pin": _PIN},
    )
    assert r.status_code == 200, r.text
    # La requête HTTP utilise une autre Session ORM : expirer le cache identité du test.
    db_session.expire_all()
    row = db_session.query(Sale).filter(Sale.id == sale.id).first()
    assert float(row.donation or 0) == 1.0
    assert row.note == "note corrigée"


def test_correct_finalize_total_change_without_payment_rows_rejected(
    client, db_session, super_admin_pin, open_session_sale
):
    """Vente completed sans PaymentTransaction : changer total_amount doit être refusé (intégrité)."""
    _, sale = open_session_sale
    token = create_access_token(data={"sub": str(super_admin_pin.id)})
    old_total = float(sale.total_amount)
    r = client.patch(
        f"{V1}/sales/{sale.id}/corrections",
        json={
            "kind": "finalize_fields",
            "total_amount": 35.0,
            "reason": "Tentative correction total sans ligne paiement",
        },
        headers={"Authorization": f"Bearer {token}", "X-Step-Up-Pin": _PIN},
    )
    assert r.status_code == 400, r.text
    db_session.expire_all()
    row = db_session.query(Sale).filter(Sale.id == sale.id).first()
    assert row is not None
    assert float(row.total_amount) == old_total


def test_admin_forbidden(client, db_session, admin_no_super, open_session_sale):
    _, sale = open_session_sale
    token = create_access_token(data={"sub": str(admin_no_super.id)})
    r = client.patch(
        f"{V1}/sales/{sale.id}/corrections",
        json={"kind": "finalize_fields", "note": "x", "reason": "test"},
        headers={"Authorization": f"Bearer {token}", "X-Step-Up-Pin": _PIN},
    )
    assert r.status_code == 403


def test_missing_step_up_pin_forbidden(client, super_admin_pin, open_session_sale):
    _, sale = open_session_sale
    token = create_access_token(data={"sub": str(super_admin_pin.id)})
    r = client.patch(
        f"{V1}/sales/{sale.id}/corrections",
        json={"kind": "finalize_fields", "note": "x", "reason": "test"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403


def test_context_envelope_includes_caisse_sale_correct_for_super_admin(db_session, super_admin_pin):
    env = build_context_envelope(db_session, super_admin_pin.id)
    assert "caisse.sale_correct" in env.permission_keys
    assert "transverse.admin.view" in env.permission_keys


def test_context_envelope_excludes_caisse_sale_correct_for_admin(db_session, admin_no_super):
    env = build_context_envelope(db_session, admin_no_super.id)
    assert "caisse.sale_correct" not in env.permission_keys
    assert "transverse.admin.view" in env.permission_keys


def test_closed_session_conflict(client, db_session, site_sc, super_admin_pin):
    opened = datetime.now(timezone.utc) - timedelta(days=1)
    sess = CashSession(
        operator_id=super_admin_pin.id,
        site_id=site_sc.id,
        initial_amount=0.0,
        current_amount=0.0,
        status=CashSessionStatus.CLOSED,
        total_sales=15.0,
        total_items=1,
        opened_at=opened,
        closed_at=datetime.now(timezone.utc) - timedelta(hours=20),
    )
    db_session.add(sess)
    db_session.flush()
    sale = Sale(
        cash_session_id=sess.id,
        operator_id=super_admin_pin.id,
        total_amount=15.0,
        donation=0.0,
        payment_method=PaymentMethod.CASH,
        lifecycle_status=SaleLifecycleStatus.COMPLETED,
    )
    db_session.add(sale)
    db_session.commit()
    db_session.refresh(sale)

    token = create_access_token(data={"sub": str(super_admin_pin.id)})
    r = client.patch(
        f"{V1}/sales/{sale.id}/corrections",
        json={"kind": "finalize_fields", "note": "x", "reason": "test"},
        headers={"Authorization": f"Bearer {token}", "X-Step-Up-Pin": _PIN},
    )
    assert r.status_code == 409
