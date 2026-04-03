"""Tests des endpoints admin de maintenance des sessions caisse (différées bloquées, doublons)."""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import UUID

import pytest
from sqlalchemy.orm import Session, noload

from recyclic_api.core.config import settings
from recyclic_api.core.security import hash_password
from recyclic_api.services.cash_session_service import CashSessionService

_V1 = settings.API_V1_STR.rstrip("/")
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus


def _make_operator(db_session: Session) -> User:
    user = User(
        username="operator_cash_maint",
        email="op_cash_maint@test.com",
        hashed_password=hash_password("pw"),
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _make_site(db_session: Session) -> Site:
    site = Site(
        name="Site cash maint",
        address="1 rue test",
        city="Ville",
        postal_code="75000",
        country="FR",
        is_active=True,
    )
    db_session.add(site)
    db_session.commit()
    db_session.refresh(site)
    return site


@pytest.mark.parametrize(
    "path",
    [
        f"{_V1}/admin/cash-sessions/fix-blocked-deferred",
        f"{_V1}/admin/cash-sessions/merge-duplicate-deferred",
    ],
)
def test_cash_sessions_maintenance_requires_super_admin(path, admin_client, db_session: Session):
    """ADMIN sans SUPER_ADMIN ne doit pas appeler ces endpoints."""
    op = _make_operator(db_session)
    if "merge" in path:
        yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).date().isoformat()
        r = admin_client.post(path, params={"operator_id": str(op.id), "date": yesterday})
    else:
        r = admin_client.post(path)
    assert r.status_code == 403


def test_fix_blocked_deferred_no_sessions(super_admin_client):
    r = super_admin_client.post(f"{_V1}/admin/cash-sessions/fix-blocked-deferred")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "success"
    assert body["fixed_count"] == 0
    assert body["deleted_count"] == 0
    assert body.get("errors") in (None, [])


def test_fix_blocked_deferred_deletes_old_empty_session(super_admin_client, db_session: Session):
    op = _make_operator(db_session)
    site = _make_site(db_session)
    opened = datetime.now(timezone.utc) - timedelta(days=100)
    session = CashSession(
        operator_id=op.id,
        site_id=site.id,
        initial_amount=0.0,
        current_amount=0.0,
        status=CashSessionStatus.OPEN,
        total_sales=0.0,
        total_items=0,
        opened_at=opened,
    )
    db_session.add(session)
    db_session.flush()
    sid = session.id
    db_session.commit()

    r = super_admin_client.post(f"{_V1}/admin/cash-sessions/fix-blocked-deferred")
    assert r.status_code == 200
    data = r.json()
    assert data["deleted_count"] == 1
    assert data["fixed_count"] == 0

    # Éviter le joinedload register (table cash_registers absente du schéma SQLite partiel).
    assert (
        db_session.query(CashSession)
        .options(noload(CashSession.register))
        .filter(CashSession.id == sid)
        .first()
    ) is None


def test_merge_duplicate_no_duplicates(super_admin_client, db_session: Session):
    op = _make_operator(db_session)
    site = _make_site(db_session)
    day = datetime.now(timezone.utc) - timedelta(days=1)
    opened = day.replace(hour=12, minute=0, second=0, microsecond=0)
    session = CashSession(
        operator_id=op.id,
        site_id=site.id,
        initial_amount=0.0,
        current_amount=0.0,
        status=CashSessionStatus.OPEN,
        total_sales=0.0,
        total_items=0,
        opened_at=opened,
    )
    db_session.add(session)
    db_session.commit()

    date_str = opened.date().isoformat()
    r = super_admin_client.post(
        f"{_V1}/admin/cash-sessions/merge-duplicate-deferred",
        params={"operator_id": str(op.id), "date": date_str},
    )
    assert r.status_code == 200
    assert "Aucune session dupliquée" in r.json().get("message", "")


def test_merge_duplicate_invalid_date(super_admin_client, db_session: Session):
    op = _make_operator(db_session)
    r = super_admin_client.post(
        f"{_V1}/admin/cash-sessions/merge-duplicate-deferred",
        params={"operator_id": str(op.id), "date": "not-a-date"},
    )
    assert r.status_code == 400
    assert "YYYY-MM-DD" in r.json()["detail"]


def _get_session_by_id_no_register_join(self, session_id: str):
    """Même logique que CashSessionService.get_session_by_id sans join cash_registers (SQLite tests)."""
    sid = UUID(str(session_id)) if not isinstance(session_id, UUID) else session_id
    return (
        self.db.query(CashSession)
        .options(noload(CashSession.register))
        .filter(CashSession.id == sid)
        .first()
    )


def test_merge_duplicate_two_empty_sessions(super_admin_client, db_session: Session):
    op = _make_operator(db_session)
    site = _make_site(db_session)
    day = (datetime.now(timezone.utc) - timedelta(days=2)).date()
    t0 = datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc) + timedelta(hours=9)
    t1 = t0 + timedelta(hours=2)

    s1 = CashSession(
        operator_id=op.id,
        site_id=site.id,
        initial_amount=0.0,
        current_amount=0.0,
        status=CashSessionStatus.OPEN,
        total_sales=0.0,
        total_items=0,
        opened_at=t0,
    )
    s2 = CashSession(
        operator_id=op.id,
        site_id=site.id,
        initial_amount=0.0,
        current_amount=0.0,
        status=CashSessionStatus.OPEN,
        total_sales=0.0,
        total_items=0,
        opened_at=t1,
    )
    db_session.add_all([s1, s2])
    db_session.flush()
    main_id, dup_id = s1.id, s2.id
    db_session.commit()

    with patch.object(CashSessionService, "get_session_by_id", _get_session_by_id_no_register_join):
        r = super_admin_client.post(
            f"{_V1}/admin/cash-sessions/merge-duplicate-deferred",
            params={"operator_id": str(op.id), "date": day.isoformat()},
        )
    assert r.status_code == 200
    body = r.json()
    # response_model=AdminResponse : success + message (pas de champ status dans le JSON sérialisé)
    assert body.get("success") is True
    assert "1 session" in body.get("message", "") or "session(s) dupliquée" in body.get("message", "")

    db_session.expire_all()
    assert (
        db_session.query(CashSession)
        .options(noload(CashSession.register))
        .filter(CashSession.id == main_id)
        .first()
    ) is not None
    assert (
        db_session.query(CashSession)
        .options(noload(CashSession.register))
        .filter(CashSession.id == dup_id)
        .first()
    ) is None
