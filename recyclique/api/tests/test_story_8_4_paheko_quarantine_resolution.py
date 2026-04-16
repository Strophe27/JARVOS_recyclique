"""Story 8.4 — quarantaine traçable, levée / constat resolu / rejet audités, permissions, transitions invalides."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
import pytest
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.core.security import hash_password
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.paheko_outbox import PahekoOutboxItem, PahekoOutboxStatus
from recyclic_api.models.paheko_outbox_sync_transition import PahekoOutboxSyncTransition
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.services.cash_session_service import CashSessionService
from recyclic_api.services.paheko_accounting_client import PahekoAccountingClient
from recyclic_api.services.paheko_outbox_processor import process_next_paheko_outbox_item
from recyclic_api.services.paheko_outbox_transition_audit import (
    TRANSITION_AUTO_QUARANTINE_HTTP,
    TRANSITION_MANUAL_CONFIRM_RESOLU,
)
from tests.paheko_8x_test_utils import seed_default_paheko_close_mapping

_V1 = settings.API_V1_STR.rstrip("/")


@pytest.fixture(autouse=True)
def _force_paheko_close_sales_policy_aggregated_for_epic8(monkeypatch: pytest.MonkeyPatch) -> None:
    """Epic 8 : quarantaine / audit HTTP — politique agrégée stable (évite batch « tout skip » sans POST)."""
    monkeypatch.setattr(settings, "PAHEKO_CLOSE_SALES_BUILDER_POLICY", "aggregated_v22_7", raising=False)


def _site_user_session(db_session: Session) -> tuple[Site, User, CashSession]:
    site = Site(
        name="S8.4 site",
        address="1 rue Q",
        city="V",
        postal_code="75000",
        country="FR",
        is_active=True,
    )
    db_session.add(site)
    db_session.flush()
    uid = uuid.uuid4()
    user = User(
        id=uid,
        username=f"u_{uid.hex[:10]}@t.com",
        hashed_password=hash_password("pw"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
        is_active=True,
        site_id=site.id,
    )
    db_session.add(user)
    db_session.flush()
    cs = CashSession(
        operator_id=user.id,
        site_id=site.id,
        initial_amount=10.0,
        current_amount=35.0,
        status=CashSessionStatus.OPEN,
        total_sales=25.0,
        total_items=1,
    )
    db_session.add(cs)
    db_session.commit()
    return site, user, cs


def _mock_httpx_client_factory(status_code: int, text: str = "{}"):
    def dispatch(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code, text=text, request=request)

    def factory() -> httpx.Client:
        return httpx.Client(transport=httpx.MockTransport(dispatch), base_url="http://paheko.test")

    return factory


def test_quarantine_entry_persists_audit_with_context(db_session: Session) -> None:
    """AC1 — entrée en quarantaine : transition nommée + contexte minimal (via processor)."""
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="corr-84-q")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()
    client = PahekoAccountingClient(
        base_url="http://paheko.test",
        client_factory=_mock_httpx_client_factory(403, "forbidden"),
    )
    process_next_paheko_outbox_item(db_session, client=client)
    db_session.refresh(item)
    assert item.sync_state_core == "en_quarantaine"

    rows = (
        db_session.query(PahekoOutboxSyncTransition)
        .filter(PahekoOutboxSyncTransition.outbox_item_id == item.id)
        .all()
    )
    assert len(rows) >= 1
    auto = next(r for r in rows if r.transition_name == TRANSITION_AUTO_QUARANTINE_HTTP)
    assert auto.actor_user_id is None
    assert auto.correlation_id == "corr-84-q"
    ctx = auto.context_json or {}
    assert ctx.get("operation_type") == "cash_session_close"
    assert ctx.get("cash_session_id") == str(cs.id)


def test_lift_quarantine_audit_and_retry_eligibility(
    super_admin_client: Any, db_session: Session
) -> None:
    """AC2 — levée manuelle : audit avec acteur ; ligne repasse pending + a_reessayer."""
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="corr-84-lift")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()
    bad = PahekoAccountingClient(
        base_url="http://paheko.test",
        client_factory=_mock_httpx_client_factory(403, "x"),
    )
    process_next_paheko_outbox_item(db_session, client=bad)
    db_session.refresh(item)
    assert item.sync_state_core == "en_quarantaine"

    admin_before = db_session.query(PahekoOutboxSyncTransition).filter(
        PahekoOutboxSyncTransition.outbox_item_id == item.id
    ).count()

    r = super_admin_client.post(
        f"{_V1}/admin/paheko-outbox/items/{item.id}/lift-quarantine",
        json={"reason": "Mapping corrigé côté configuration — reprise traitement."},
    )
    assert r.status_code == 200, r.text
    db_session.refresh(item)
    assert item.sync_state_core == "a_reessayer"
    assert item.outbox_status == PahekoOutboxStatus.pending.value
    assert item.mapping_resolution_error is None

    manual = (
        db_session.query(PahekoOutboxSyncTransition)
        .filter(
            PahekoOutboxSyncTransition.outbox_item_id == item.id,
            PahekoOutboxSyncTransition.transition_name == "manual_lift_quarantine_to_retry",
        )
        .one()
    )
    assert manual.actor_user_id is not None
    assert manual.from_sync_state == "en_quarantaine"
    assert manual.to_sync_state == "a_reessayer"
    assert manual.reason
    assert db_session.query(PahekoOutboxSyncTransition).filter(
        PahekoOutboxSyncTransition.outbox_item_id == item.id
    ).count() == admin_before + 1


def test_lift_after_max_attempts_resets_counter_next_retryable_gets_fresh_cycle(
    super_admin_client: Any, monkeypatch: pytest.MonkeyPatch, db_session: Session
) -> None:
    """Après quarantaine max_attempts_exceeded (8.2), levée → compteur à 0 ; 1er échec retryable reprogramme, pas quarantaine immédiate."""
    monkeypatch.setattr(settings, "PAHEKO_OUTBOX_MAX_ATTEMPTS", 2)
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="lift-max-cycle")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()

    bad = PahekoAccountingClient(
        base_url="http://paheko.test",
        client_factory=_mock_httpx_client_factory(500, "x"),
    )
    process_next_paheko_outbox_item(db_session, client=bad)
    db_session.refresh(item)
    item.next_retry_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()

    process_next_paheko_outbox_item(db_session, client=bad)
    db_session.refresh(item)
    assert item.sync_state_core == "en_quarantaine"
    assert item.attempt_count == 2
    assert "max_attempts_exceeded" in (item.last_error or "")

    r = super_admin_client.post(
        f"{_V1}/admin/paheko-outbox/items/{item.id}/lift-quarantine",
        json={"reason": "Reprise après incident Paheko — nouveau cycle de retries autorisé."},
    )
    assert r.status_code == 200, r.text
    db_session.refresh(item)
    assert item.attempt_count == 0
    assert item.sync_state_core == "a_reessayer"
    assert item.outbox_status == PahekoOutboxStatus.pending.value

    process_next_paheko_outbox_item(db_session, client=bad)
    db_session.refresh(item)
    assert item.attempt_count == 1
    assert item.outbox_status == PahekoOutboxStatus.pending.value
    assert item.sync_state_core == "a_reessayer"
    assert item.next_retry_at is not None


def test_user_forbidden_confirm_resolved(user_client: Any, db_session: Session) -> None:
    """AC6 — confirm-resolved : rôle USER → 403."""
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="u-cr")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()
    item.outbox_status = PahekoOutboxStatus.delivered.value
    item.sync_state_core = "en_quarantaine"
    db_session.commit()

    r = user_client.post(
        f"{_V1}/admin/paheko-outbox/items/{item.id}/confirm-resolved",
        json={"reason": "tentative"},
    )
    assert r.status_code == 403


def test_user_forbidden_reject(user_client: Any, db_session: Session) -> None:
    """AC6 — reject : rôle USER → 403."""
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="u-rj")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()
    item.sync_state_core = "en_quarantaine"
    item.outbox_status = PahekoOutboxStatus.failed.value
    db_session.commit()

    r = user_client.post(
        f"{_V1}/admin/paheko-outbox/items/{item.id}/reject",
        json={"reason": "tentative"},
    )
    assert r.status_code == 403


def test_user_forbidden_lift_quarantine(user_client: Any, db_session: Session) -> None:
    """AC6 — rôle insuffisant : 403."""
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="u")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()
    item.sync_state_core = "en_quarantaine"
    item.outbox_status = PahekoOutboxStatus.failed.value
    db_session.commit()

    r = user_client.post(
        f"{_V1}/admin/paheko-outbox/items/{item.id}/lift-quarantine",
        json={"reason": "tentative non autorisée"},
    )
    assert r.status_code == 403


def test_confirm_resolved_success_when_delivered_with_audit(super_admin_client: Any, db_session: Session) -> None:
    """AC2 — preuve delivered (8.2) : constat manuel resolu + audit acteur."""
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="cr-ok")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()
    item.outbox_status = PahekoOutboxStatus.delivered.value
    item.sync_state_core = "en_quarantaine"
    db_session.commit()

    r = super_admin_client.post(
        f"{_V1}/admin/paheko-outbox/items/{item.id}/confirm-resolved",
        json={"reason": "Constat après vérif Paheko : écriture présente — alignement resolu."},
    )
    assert r.status_code == 200, r.text
    db_session.refresh(item)
    assert item.sync_state_core == "resolu"
    assert item.outbox_status == PahekoOutboxStatus.delivered.value

    row = (
        db_session.query(PahekoOutboxSyncTransition)
        .filter(
            PahekoOutboxSyncTransition.outbox_item_id == item.id,
            PahekoOutboxSyncTransition.transition_name == TRANSITION_MANUAL_CONFIRM_RESOLU,
        )
        .one()
    )
    assert row.actor_user_id is not None
    assert row.from_sync_state == "en_quarantaine"
    assert row.to_sync_state == "resolu"


def test_confirm_resolved_idempotent_second_call_no_extra_transition(
    super_admin_client: Any, db_session: Session
) -> None:
    """Service : déjà resolu → pas de ligne d'audit supplémentaire."""
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="idem")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()
    item.outbox_status = PahekoOutboxStatus.delivered.value
    item.sync_state_core = "a_reessayer"
    db_session.commit()

    r1 = super_admin_client.post(
        f"{_V1}/admin/paheko-outbox/items/{item.id}/confirm-resolved",
        json={"reason": "Premier constat resolu."},
    )
    assert r1.status_code == 200
    c1 = db_session.query(PahekoOutboxSyncTransition).filter(
        PahekoOutboxSyncTransition.outbox_item_id == item.id,
        PahekoOutboxSyncTransition.transition_name == TRANSITION_MANUAL_CONFIRM_RESOLU,
    ).count()

    r2 = super_admin_client.post(
        f"{_V1}/admin/paheko-outbox/items/{item.id}/confirm-resolved",
        json={"reason": "Rappel — doit être idempotent."},
    )
    assert r2.status_code == 200
    c2 = db_session.query(PahekoOutboxSyncTransition).filter(
        PahekoOutboxSyncTransition.outbox_item_id == item.id,
        PahekoOutboxSyncTransition.transition_name == TRANSITION_MANUAL_CONFIRM_RESOLU,
    ).count()
    assert c1 == c2 == 1


def test_confirm_resolved_rejected_without_delivered(super_admin_client: Any, db_session: Session) -> None:
    """AC6 — resolu sans critère 8.2 (delivered) : 409."""
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="nd")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()
    item.sync_state_core = "en_quarantaine"
    item.outbox_status = PahekoOutboxStatus.failed.value
    db_session.commit()

    r = super_admin_client.post(
        f"{_V1}/admin/paheko-outbox/items/{item.id}/confirm-resolved",
        json={"reason": "Tentative illégale sans delivered."},
    )
    assert r.status_code == 409


def test_reject_writes_audit_same_shape_as_lift(super_admin_client: Any, db_session: Session) -> None:
    """AC3 — rejet : même niveau d'audit (acteur, raison, états avant/après)."""
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="rej")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()
    item.sync_state_core = "en_quarantaine"
    item.outbox_status = PahekoOutboxStatus.failed.value
    db_session.commit()

    r = super_admin_client.post(
        f"{_V1}/admin/paheko-outbox/items/{item.id}/reject",
        json={"reason": "Doublon métier — abandon push Paheko."},
    )
    assert r.status_code == 200, r.text
    db_session.refresh(item)
    assert item.sync_state_core == "rejete"

    row = (
        db_session.query(PahekoOutboxSyncTransition)
        .filter(
            PahekoOutboxSyncTransition.outbox_item_id == item.id,
            PahekoOutboxSyncTransition.transition_name == "manual_reject",
        )
        .one()
    )
    assert row.actor_user_id is not None
    assert row.to_sync_state == "rejete"
    assert "Doublon" in row.reason


def test_detail_includes_recent_sync_transitions(super_admin_client: Any, db_session: Session) -> None:
    """AC4 — visibilité API : détail enrichi + GET sync-transitions."""
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="vis")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()
    bad = PahekoAccountingClient(
        base_url="http://paheko.test",
        client_factory=_mock_httpx_client_factory(403, "x"),
    )
    process_next_paheko_outbox_item(db_session, client=bad)

    g = super_admin_client.get(f"{_V1}/admin/paheko-outbox/items/{item.id}")
    assert g.status_code == 200
    body = g.json()
    assert "recent_sync_transitions" in body
    assert len(body["recent_sync_transitions"]) >= 1

    lg = super_admin_client.get(f"{_V1}/admin/paheko-outbox/items/{item.id}/sync-transitions")
    assert lg.status_code == 200
    lst = lg.json()
    assert lst["total"] >= 1
    assert lst["data"][0]["transition_name"]
