"""Story 8.2 — retry backoff, idempotence HTTP, 409, rejet explicite, plafond tentatives."""

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
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.services.cash_session_service import CashSessionService
from recyclic_api.services.paheko_accounting_client import PahekoAccountingClient
from recyclic_api.services.paheko_outbox_processor import process_next_paheko_outbox_item
from tests.paheko_8x_test_utils import seed_default_paheko_close_mapping

_V1 = settings.API_V1_STR.rstrip("/")


def _site_user_session(db_session: Session) -> tuple[Site, User, CashSession]:
    site = Site(
        name="S8.2 site",
        address="1 rue T",
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


def _mock_factory(status_code: int, text: str = "{}"):
    def dispatch(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code, text=text, request=request)

    def factory() -> httpx.Client:
        return httpx.Client(transport=httpx.MockTransport(dispatch), base_url="http://paheko.test")

    return factory


def test_retry_after_backoff_then_success(db_session: Session) -> None:
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="r1")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()

    fail_client = PahekoAccountingClient(
        base_url="http://paheko.test",
        client_factory=_mock_factory(500, "e"),
    )
    process_next_paheko_outbox_item(db_session, client=fail_client)
    db_session.refresh(item)
    assert item.outbox_status == PahekoOutboxStatus.pending.value
    assert item.attempt_count == 1

    item.next_retry_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()

    ok_client = PahekoAccountingClient(
        base_url="http://paheko.test",
        client_factory=_mock_factory(200, '{"ok":true}'),
    )
    process_next_paheko_outbox_item(db_session, client=ok_client)
    db_session.refresh(item)
    assert item.outbox_status == PahekoOutboxStatus.delivered.value
    assert item.sync_state_core == "resolu"
    assert item.next_retry_at is None


def test_http_409_treated_as_resolu_idempotent(db_session: Session) -> None:
    """Contrat 8.2 : doublon logique côté Paheko (409) = preuve d'effet déjà pris en compte."""
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="id409")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()

    client = PahekoAccountingClient(
        base_url="http://paheko.test",
        client_factory=_mock_factory(409, "conflict"),
    )
    process_next_paheko_outbox_item(db_session, client=client)
    db_session.refresh(item)
    assert item.sync_state_core == "resolu"
    assert item.outbox_status == PahekoOutboxStatus.delivered.value
    assert item.last_http_status == 409


def test_idempotency_key_header_sent(db_session: Session) -> None:
    seen: list[str | None] = []

    def dispatch(request: httpx.Request) -> httpx.Response:
        seen.append(request.headers.get("Idempotency-Key"))
        return httpx.Response(200, text="{}", request=request)

    def factory() -> httpx.Client:
        return httpx.Client(transport=httpx.MockTransport(dispatch), base_url="http://paheko.test")

    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, "ok")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()

    client = PahekoAccountingClient(base_url="http://paheko.test", client_factory=factory)
    process_next_paheko_outbox_item(db_session, client=client)
    assert seen and seen[0] == item.idempotency_key


def test_max_attempts_then_quarantine(monkeypatch: pytest.MonkeyPatch, db_session: Session) -> None:
    monkeypatch.setattr(settings, "PAHEKO_OUTBOX_MAX_ATTEMPTS", 2)
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, "ok")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()

    bad = PahekoAccountingClient(
        base_url="http://paheko.test",
        client_factory=_mock_factory(500, "x"),
    )
    process_next_paheko_outbox_item(db_session, client=bad)
    db_session.refresh(item)
    item.next_retry_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()

    process_next_paheko_outbox_item(db_session, client=bad)
    db_session.refresh(item)
    assert item.outbox_status == PahekoOutboxStatus.failed.value
    assert item.sync_state_core == "en_quarantaine"
    assert item.attempt_count == 2
    assert "max_attempts_exceeded" in (item.last_error or "")


def test_admin_reject_marks_rejete(super_admin_client: Any, db_session: Session) -> None:
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, "ok")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()

    r = super_admin_client.post(
        f"{_V1}/admin/paheko-outbox/items/{item.id}/reject",
        json={"reason": "Décision support : doublon terrain"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["sync_state_core"] == "rejete"
    assert body["outbox_status"] == "failed"
    assert body["rejection_reason"] is not None


def test_admin_reject_delivered_returns_409(super_admin_client: Any, db_session: Session) -> None:
    """Ne pas permettre de passer une ligne déjà livrée / resolu en rejete (intégrité audit)."""
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, "ok")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()
    item.outbox_status = PahekoOutboxStatus.delivered.value
    item.sync_state_core = "resolu"
    db_session.commit()

    r = super_admin_client.post(
        f"{_V1}/admin/paheko-outbox/items/{item.id}/reject",
        json={"reason": "ne doit pas s'appliquer"},
    )
    assert r.status_code == 409, r.text
    db_session.refresh(item)
    assert item.sync_state_core == "resolu"


def test_rejected_not_selected_for_processing(db_session: Session) -> None:
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, "ok")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()
    item.outbox_status = PahekoOutboxStatus.pending.value
    item.sync_state_core = "rejete"
    item.rejection_reason = "test"
    db_session.commit()

    calls: list[int] = []

    def dispatch(request: httpx.Request) -> httpx.Response:
        calls.append(1)
        return httpx.Response(200, text="{}", request=request)

    def factory() -> httpx.Client:
        return httpx.Client(transport=httpx.MockTransport(dispatch), base_url="http://paheko.test")

    client = PahekoAccountingClient(base_url="http://paheko.test", client_factory=factory)
    out = process_next_paheko_outbox_item(db_session, client=client)
    assert out is None
    assert calls == []


def test_immediate_second_process_respects_next_retry_at(db_session: Session) -> None:
    """Tant que ``next_retry_at`` est dans le futur, pas de 2e tentative HTTP."""
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, "ok")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()

    calls: list[int] = []

    def dispatch(request: httpx.Request) -> httpx.Response:
        calls.append(1)
        return httpx.Response(500, text="e", request=request)

    def factory() -> httpx.Client:
        return httpx.Client(transport=httpx.MockTransport(dispatch), base_url="http://paheko.test")

    bad = PahekoAccountingClient(base_url="http://paheko.test", client_factory=factory)
    process_next_paheko_outbox_item(db_session, client=bad)
    db_session.refresh(item)
    assert item.next_retry_at is not None
    assert calls == [1]

    out = process_next_paheko_outbox_item(db_session, client=bad)
    assert out is None
    assert calls == [1]


def test_admin_reject_unknown_returns_404(super_admin_client: Any) -> None:
    missing = uuid.uuid4()
    r = super_admin_client.post(
        f"{_V1}/admin/paheko-outbox/items/{missing}/reject",
        json={"reason": "inconnu"},
    )
    assert r.status_code == 404, r.text


def test_admin_reject_forbidden_for_user_role(user_client: Any, db_session: Session) -> None:
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, "ok")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()

    r = user_client.post(
        f"{_V1}/admin/paheko-outbox/items/{item.id}/reject",
        json={"reason": "tentative"},
    )
    assert r.status_code == 403, r.text


def _collect_openapi_operation_ids(schema: dict[str, Any]) -> set[str]:
    out: set[str] = set()
    for _path, methods in (schema.get("paths") or {}).items():
        if not isinstance(methods, dict):
            continue
        for _m, op in methods.items():
            if isinstance(op, dict) and "operationId" in op:
                out.add(str(op["operationId"]))
    return out


def test_openapi_includes_reject_operation_id(openapi_schema: dict[str, Any]) -> None:
    ids = _collect_openapi_operation_ids(openapi_schema)
    assert "recyclique_pahekoOutbox_rejectItem" in ids
