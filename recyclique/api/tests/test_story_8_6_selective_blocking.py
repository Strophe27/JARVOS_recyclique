"""Story 8.6 — politique A1 : garde unique avant clôture + outbox ; pas de gel global terrain."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy.orm import Session

from recyclic_api.core.exceptions import PahekoSyncPolicyBlockedError
from recyclic_api.core.security import hash_password
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.paheko_outbox import PahekoOutboxItem, PahekoOutboxStatus
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.services.cash_session_service import CashSessionService
from recyclic_api.services.paheko_outbox_service import OPERATION_CASH_SESSION_CLOSE
from recyclic_api.services.paheko_sync_final_action_policy import (
    CODE_REFUSED,
    REASON_CLOSE_MAPPING,
    REASON_SESSION_OUTBOX_QUARANTINE,
)
from tests.paheko_8x_test_utils import seed_default_paheko_close_mapping


def _two_sessions_same_site(db_session: Session) -> tuple[Site, User, CashSession, CashSession]:
    site = Site(
        name="S8.6 site",
        address="1 rue P",
        city="V",
        postal_code="75000",
        country="FR",
        is_active=True,
    )
    db_session.add(site)
    db_session.flush()
    uid_a = uuid.uuid4()
    user_a = User(
        id=uid_a,
        username=f"ua_{uid_a.hex[:8]}@t.com",
        hashed_password=hash_password("pw"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
        is_active=True,
        site_id=site.id,
    )
    db_session.add(user_a)
    uid_b = uuid.uuid4()
    user_b = User(
        id=uid_b,
        username=f"ub_{uid_b.hex[:8]}@t.com",
        hashed_password=hash_password("pw"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
        is_active=True,
        site_id=site.id,
    )
    db_session.add(user_b)
    db_session.flush()
    cs_a = CashSession(
        operator_id=user_a.id,
        site_id=site.id,
        initial_amount=10.0,
        current_amount=20.0,
        status=CashSessionStatus.OPEN,
        total_sales=10.0,
        total_items=1,
    )
    cs_b = CashSession(
        operator_id=user_b.id,
        site_id=site.id,
        initial_amount=5.0,
        current_amount=15.0,
        status=CashSessionStatus.OPEN,
        total_sales=10.0,
        total_items=1,
    )
    db_session.add_all([cs_a, cs_b])
    db_session.commit()
    return site, user_a, cs_a, cs_b


def test_a1_allowed_when_policy_satisfied(db_session: Session) -> None:
    site, _, cs_a, _ = _two_sessions_same_site(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    closed = svc.close_session_with_amounts(str(cs_a.id), 20.0, "ok", sync_correlation_id="8-6-ok")
    assert closed is not None
    assert closed.status == CashSessionStatus.CLOSED
    row = (
        db_session.query(PahekoOutboxItem)
        .filter(PahekoOutboxItem.cash_session_id == cs_a.id)
        .one_or_none()
    )
    assert row is not None


def test_a1_blocked_when_session_outbox_quarantine_row_exists(db_session: Session) -> None:
    site, _, cs, _ = _two_sessions_same_site(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    orphan = PahekoOutboxItem(
        operation_type=OPERATION_CASH_SESSION_CLOSE,
        idempotency_key=f"{OPERATION_CASH_SESSION_CLOSE}:{cs.id}:orphan-8-6",
        cash_session_id=cs.id,
        site_id=cs.site_id,
        payload={"cash_session_id": str(cs.id), "site_id": str(cs.site_id)},
        outbox_status=PahekoOutboxStatus.failed.value,
        sync_state_core="en_quarantaine",
        correlation_id="orphan-corr-8-6",
    )
    db_session.add(orphan)
    db_session.commit()

    svc = CashSessionService(db_session)
    with pytest.raises(PahekoSyncPolicyBlockedError) as exc:
        svc.close_session_with_amounts(str(cs.id), 20.0, "ok", sync_correlation_id="try-close")
    p = exc.value.payload
    assert p["code"] == CODE_REFUSED
    assert p["policy_reason_code"] == REASON_SESSION_OUTBOX_QUARANTINE
    assert p.get("blocking_outbox_item_id") == str(orphan.id)
    db_session.refresh(cs)
    assert cs.status == CashSessionStatus.OPEN


def test_local_sale_still_allowed_when_other_session_has_quarantine_outbox(db_session: Session) -> None:
    """FR66 — dégradé sync sur une session ne gèle pas l'activité d'une autre session ouverte."""
    site, _, cs_a, cs_b = _two_sessions_same_site(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    orphan = PahekoOutboxItem(
        operation_type=OPERATION_CASH_SESSION_CLOSE,
        idempotency_key=f"{OPERATION_CASH_SESSION_CLOSE}:{cs_a.id}:orphan-8-6-b",
        cash_session_id=cs_a.id,
        site_id=cs_a.site_id,
        payload={"cash_session_id": str(cs_a.id)},
        outbox_status=PahekoOutboxStatus.failed.value,
        sync_state_core="en_quarantaine",
        correlation_id="corr-a-q",
    )
    db_session.add(orphan)
    db_session.commit()

    svc = CashSessionService(db_session)
    assert svc.add_sale_to_session(str(cs_b.id), 1.0) is True
    db_session.refresh(cs_b)
    assert cs_b.current_amount == 16.0


def test_a1_other_session_can_close_when_only_peer_has_quarantine(db_session: Session) -> None:
    site, _, cs_a, cs_b = _two_sessions_same_site(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    orphan = PahekoOutboxItem(
        operation_type=OPERATION_CASH_SESSION_CLOSE,
        idempotency_key=f"{OPERATION_CASH_SESSION_CLOSE}:{cs_a.id}:orphan-8-6-c",
        cash_session_id=cs_a.id,
        site_id=cs_a.site_id,
        payload={"cash_session_id": str(cs_a.id)},
        outbox_status=PahekoOutboxStatus.failed.value,
        sync_state_core="en_quarantaine",
        correlation_id="corr-a-q2",
    )
    db_session.add(orphan)
    db_session.commit()

    svc = CashSessionService(db_session)
    closed_b = svc.close_session_with_amounts(str(cs_b.id), 15.0, "ok", sync_correlation_id="close-b-ok")
    assert closed_b is not None
    assert closed_b.status == CashSessionStatus.CLOSED


def test_a1_mapping_missing_raises_close_mapping_reason(db_session: Session) -> None:
    _, _, _, cs_b = _two_sessions_same_site(db_session)
    svc = CashSessionService(db_session)
    with pytest.raises(PahekoSyncPolicyBlockedError) as exc:
        svc.close_session_with_amounts(str(cs_b.id), 15.0, "ok")
    assert exc.value.payload["policy_reason_code"] == REASON_CLOSE_MAPPING
