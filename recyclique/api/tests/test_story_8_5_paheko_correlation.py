"""Story 8.5 — corrélation inter-systèmes : filtre, timeline, réponse clôture, cohérence audit."""

from __future__ import annotations

import uuid
from typing import Any

import httpx
import pytest
from sqlalchemy.orm import Session, noload
from sqlalchemy import select

from recyclic_api.core.config import settings as app_settings
from recyclic_api.core.security import hash_password
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.paheko_outbox import PahekoOutboxItem
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.services.cash_session_service import CashSessionService
from recyclic_api.services.paheko_accounting_client import PahekoAccountingClient
from recyclic_api.services.paheko_outbox_processor import process_next_paheko_outbox_item
from tests.paheko_8x_test_utils import seed_default_paheko_close_mapping

_V1 = app_settings.API_V1_STR.rstrip("/")


def _site_user_session(db_session: Session) -> tuple[Site, User, CashSession]:
    site = Site(
        name="S8.5 site",
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
    cs = db_session.execute(
        select(CashSession).where(CashSession.id == cs.id).options(noload(CashSession.register))
    ).scalar_one()
    return site, user, cs


def _mock_httpx_client_factory(status_code: int, text: str = "{}"):
    def dispatch(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code, text=text, request=request)

    def factory() -> httpx.Client:
        return httpx.Client(transport=httpx.MockTransport(dispatch), base_url="http://paheko.test")

    return factory


def test_list_outbox_filter_by_correlation_id(super_admin_client: Any, db_session: Session) -> None:
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    corr = "corr-8-5-filter-unique"
    CashSessionService(db_session).close_session_with_amounts(
        str(cs.id), 35.0, "ok", sync_correlation_id=corr
    )
    r = super_admin_client.get(f"{_V1}/admin/paheko-outbox/items", params={"correlation_id": corr})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] >= 1
    assert all(x["correlation_id"] == corr for x in body["data"])


def test_correlation_timeline_after_processor(super_admin_client: Any, db_session: Session) -> None:
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    corr = "corr-8-5-timeline-proc"
    CashSessionService(db_session).close_session_with_amounts(
        str(cs.id), 35.0, "ok", sync_correlation_id=corr
    )
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()

    client = PahekoAccountingClient(
        base_url="http://paheko.test",
        client_factory=_mock_httpx_client_factory(200, '{"ok":true}'),
    )
    process_next_paheko_outbox_item(db_session, client=client)

    tl = super_admin_client.get(
        f"{_V1}/admin/paheko-outbox/by-correlation/{corr}",
    )
    assert tl.status_code == 200, tl.text
    data = tl.json()
    assert data["correlation_id"] == corr
    assert len(data["items"]) == 1
    assert data["items"][0]["id"] == str(item.id)
    assert data["items"][0]["correlation_id"] == corr
    assert data["sync_transitions_total"] >= 1
    for tr in data["sync_transitions"]:
        assert tr["correlation_id"] == corr


def test_correlation_timeline_404_unknown(super_admin_client: Any) -> None:
    r = super_admin_client.get(f"{_V1}/admin/paheko-outbox/by-correlation/does-not-exist-8-5")
    assert r.status_code == 404


def test_user_forbidden_correlation_admin_reads(user_client: Any) -> None:
    """Lecture admin outbox (liste filtrée + timeline) : rôle USER → 403."""
    r1 = user_client.get(
        f"{_V1}/admin/paheko-outbox/items",
        params={"correlation_id": "any-8-5"},
    )
    assert r1.status_code == 403
    r2 = user_client.get(f"{_V1}/admin/paheko-outbox/by-correlation/corr-8-5-user-deny")
    assert r2.status_code == 403


def test_close_response_surfaces_paheko_link(
    client: Any,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Any,
) -> None:
    """Réponse clôture : paheko_sync_correlation_id + paheko_outbox_item_id (même transaction outbox)."""
    from recyclic_api.core import security as sec
    from recyclic_api.core.step_up import STEP_UP_PIN_HEADER

    site, user, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    token = sec.create_access_token(data={"sub": str(user.id)})

    def _noop_step_up(*, user, pin_header_value, redis_client, operation) -> None:  # noqa: ARG001
        return None

    monkeypatch.setattr(
        "recyclic_api.api.api_v1.endpoints.cash_sessions.verify_step_up_pin_header",
        _noop_step_up,
    )

    def _fake_report(_db: Session, _cash_session: Any, reports_dir: Any = None) -> Any:
        p = tmp_path / "rep.csv"
        p.write_text("a\n", encoding="utf-8")
        return p

    monkeypatch.setattr(
        "recyclic_api.api.api_v1.endpoints.cash_sessions.generate_cash_session_report",
        _fake_report,
    )
    monkeypatch.setattr(app_settings, "CASH_SESSION_REPORT_RECIPIENT", "")

    headers = {
        "Authorization": f"Bearer {token}",
        STEP_UP_PIN_HEADER: "1234",
        "X-Request-Id": "req-close-8-5-paheko-fields",
    }
    r = client.post(
        f"{_V1}/cash-sessions/{cs.id}/close",
        json={"actual_amount": 35.0, "variance_comment": "ok"},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    if body.get("deleted"):
        pytest.fail("unexpected empty session")
    assert body.get("paheko_sync_correlation_id") == "req-close-8-5-paheko-fields"
    assert body.get("paheko_outbox_item_id")
    oid = body["paheko_outbox_item_id"]
    row = db_session.get(PahekoOutboxItem, uuid.UUID(oid))
    assert row is not None
    assert row.correlation_id == "req-close-8-5-paheko-fields"
