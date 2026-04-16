"""Story 8.1 — slice clôture caisse → outbox → tentative Paheko (mock HTTP)."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session, noload

from recyclic_api.core.config import settings
from recyclic_api.core.security import hash_password
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.paheko_outbox import PahekoOutboxItem, PahekoOutboxStatus
from recyclic_api.models.payment_transaction import (
    PaymentTransaction,
    PaymentTransactionDirection,
    PaymentTransactionNature,
)
from recyclic_api.models.site import Site
from recyclic_api.models.sale import PaymentMethod, Sale, SaleLifecycleStatus
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.services.cash_session_service import CashSessionService
from recyclic_api.services.paheko_accounting_client import PahekoAccountingClient
from recyclic_api.services.paheko_outbox_processor import process_next_paheko_outbox_item
from recyclic_api.services.paheko_outbox_service import idempotency_key_cash_session_close
from recyclic_api.services.reception_stats_service import ReceptionLiveStatsService
from tests.paheko_8x_test_utils import seed_default_paheko_close_mapping

_V1 = settings.API_V1_STR.rstrip("/")


def _site_user_session(db_session: Session) -> tuple[Site, User, CashSession]:
    site = Site(
        name="S8.1 site",
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
    db_session.flush()
    sale = Sale(
        cash_session_id=cs.id,
        operator_id=user.id,
        total_amount=25.0,
        donation=0.0,
        payment_method=PaymentMethod.CASH,
        lifecycle_status=SaleLifecycleStatus.COMPLETED,
    )
    db_session.add(sale)
    db_session.flush()
    db_session.add(
        PaymentTransaction(
            sale_id=sale.id,
            payment_method=PaymentMethod.CASH,
            nature=PaymentTransactionNature.SALE_PAYMENT,
            direction=PaymentTransactionDirection.INFLOW,
            amount=25.0,
        )
    )
    db_session.commit()
    cs = db_session.execute(
        select(CashSession).where(CashSession.id == cs.id).options(noload(CashSession.register))
    ).scalar_one()
    return site, user, cs


def test_close_non_empty_creates_outbox_same_commit(db_session: Session) -> None:
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    service = CashSessionService(db_session)
    corr = "test-correlation-8-1-atomic"
    closed = service.close_session_with_amounts(
        str(cs.id), 35.0, "ok", sync_correlation_id=corr
    )
    assert closed is not None
    assert closed.status == CashSessionStatus.CLOSED

    row = (
        db_session.query(PahekoOutboxItem)
        .filter(PahekoOutboxItem.cash_session_id == cs.id)
        .one_or_none()
    )
    assert row is not None
    assert row.idempotency_key == idempotency_key_cash_session_close(cs.id)
    assert row.outbox_status == PahekoOutboxStatus.pending.value
    assert row.sync_state_core == "a_reessayer"
    assert row.correlation_id == corr


def test_close_empty_session_no_outbox(db_session: Session) -> None:
    site, user, _ = _site_user_session(db_session)
    empty = CashSession(
        operator_id=user.id,
        site_id=site.id,
        initial_amount=10.0,
        current_amount=10.0,
        status=CashSessionStatus.OPEN,
        total_sales=0.0,
        total_items=0,
    )
    db_session.add(empty)
    db_session.commit()
    sid = str(empty.id)
    service = CashSessionService(db_session)
    assert service.close_session_with_amounts(sid, 10.0, None) is None
    n = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == empty.id).count()
    assert n == 0


def _mock_httpx_client_factory(status_code: int, text: str = "{}"):
    def dispatch(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code, text=text, request=request)

    def factory() -> httpx.Client:
        return httpx.Client(transport=httpx.MockTransport(dispatch), base_url="http://paheko.test")

    return factory


def _capturing_httpx_client_factory(
    captured: dict[str, httpx.Request],
    *,
    status_code: int = 200,
    text: str = "{}",
):
    def dispatch(request: httpx.Request) -> httpx.Response:
        captured["request"] = request
        return httpx.Response(status_code, text=text, request=request)

    def factory() -> httpx.Client:
        return httpx.Client(transport=httpx.MockTransport(dispatch), base_url="http://paheko.test")

    return factory


def test_processor_success_marks_resolu(db_session: Session) -> None:
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    service = CashSessionService(db_session)
    service.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="c2")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()

    paheko_client = PahekoAccountingClient(
        base_url="http://paheko.test",
        client_factory=_mock_httpx_client_factory(200, '{"ok":true}'),
    )
    out = process_next_paheko_outbox_item(db_session, client=paheko_client)
    assert out is not None
    assert str(out.id) == str(item.id)
    db_session.refresh(item)
    assert item.outbox_status == PahekoOutboxStatus.delivered.value
    assert item.sync_state_core == "resolu"
    assert item.last_http_status == 200
    assert item.attempt_count >= 1


def test_processor_http_500_schedules_retry_pending(db_session: Session) -> None:
    """Story 8.2 : 5xx transitoire → repassage contrôlé (pending + next_retry_at), pas quarantaine immédiate."""
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    service = CashSessionService(db_session)
    service.close_session_with_amounts(str(cs.id), 35.0, "ok")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()

    paheko_client = PahekoAccountingClient(
        base_url="http://paheko.test",
        client_factory=_mock_httpx_client_factory(500, "err"),
    )
    process_next_paheko_outbox_item(db_session, client=paheko_client)
    db_session.refresh(item)
    assert item.outbox_status == PahekoOutboxStatus.pending.value
    assert item.sync_state_core == "a_reessayer"
    assert item.last_http_status == 500
    assert item.next_retry_at is not None


def test_admin_list_and_get_item(super_admin_client: Any, db_session: Session) -> None:
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    service = CashSessionService(db_session)
    service.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="api-corr")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()

    r = super_admin_client.get(f"{_V1}/admin/paheko-outbox/items")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] >= 1
    ids = {x["id"] for x in body["data"]}
    assert str(item.id) in ids
    one = next(x for x in body["data"] if x["id"] == str(item.id))
    assert one["outbox_status"] == "pending"
    assert one["sync_state_core"] == "a_reessayer"
    assert one["local_session_persisted"] is True
    assert one["correlation_id"] == "api-corr"
    assert one["transaction_preview"]["amount"] == 25.0
    assert one["transaction_preview"]["debit"] == "512"
    assert one["transaction_preview"]["credit"] == "707"

    g = super_admin_client.get(f"{_V1}/admin/paheko-outbox/items/{item.id}")
    assert g.status_code == 200, g.text
    det = g.json()
    assert "payload" in det
    assert det["payload"]["cash_session_id"] == str(cs.id)
    assert det["transaction_preview"]["amount"] == 25.0
    assert det["transaction_preview"]["debit"] == "512"
    assert det["transaction_preview"]["credit"] == "707"


def test_live_snapshot_worst_state_pending_outbox(client: Any, db_session: Session) -> None:
    """Bandeau : présence d'outbox `a_reessayer` sur le site → pas de « resolu » implicite."""
    from recyclic_api.core.security import create_access_token

    site, user, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    service = CashSessionService(db_session)
    service.close_session_with_amounts(str(cs.id), 35.0, "ok")

    token = create_access_token(data={"sub": str(user.id)})

    def _stats(**_kwargs: Any):
        now = datetime.now(timezone.utc)
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return {
            "tickets_count": 0,
            "last_ticket_amount": 0.0,
            "ca": 0.0,
            "donations": 0.0,
            "weight_out_sales": 0.0,
            "tickets_open": 0,
            "tickets_closed_24h": 0,
            "items_received": 0,
            "weight_in": 0.0,
            "weight_out": 0.0,
            "period_start": start,
            "period_end": now,
        }

    with patch.object(
        ReceptionLiveStatsService,
        "get_unified_live_stats",
        new_callable=AsyncMock,
        side_effect=_stats,
    ):
        r = client.get(
            "/v2/exploitation/live-snapshot",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 200, r.text
    sync = r.json().get("sync_operational_summary")
    assert sync is not None
    assert sync["worst_state"] == "a_reessayer"


def test_processor_logs_use_correlation_id(caplog: pytest.LogCaptureFixture, db_session: Session) -> None:
    import logging

    caplog.set_level(logging.INFO)
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    service = CashSessionService(db_session)
    service.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="trace-xyz")
    paheko_client = PahekoAccountingClient(
        base_url="http://paheko.test",
        client_factory=_mock_httpx_client_factory(201, "{}"),
    )
    process_next_paheko_outbox_item(db_session, client=paheko_client)
    joined = " ".join(rec.message for rec in caplog.records)
    assert "trace-xyz" in joined


def test_paheko_client_prefers_basic_auth_when_credentials_present() -> None:
    captured: dict[str, httpx.Request] = {}
    client = PahekoAccountingClient(
        base_url="http://paheko.test",
        api_user="sync-user",
        api_password="sync-secret",
        token="legacy-token",
        client_factory=_capturing_httpx_client_factory(captured),
    )
    result = client.post_cash_session_close(
        {"cash_session_id": "abc"},
        correlation_id="corr-basic",
        idempotency_key="idem-basic",
    )
    assert result.http_status == 200
    request = captured["request"]
    assert request.headers["Authorization"].startswith("Basic ")
    assert request.headers["X-Correlation-ID"] == "corr-basic"
    assert request.headers["Idempotency-Key"] == "idem-basic"
    assert request.url.path == "/api/accounting/transaction"


def test_paheko_client_falls_back_to_bearer_when_only_legacy_token_present() -> None:
    captured: dict[str, httpx.Request] = {}
    client = PahekoAccountingClient(
        base_url="http://paheko.test",
        token="legacy-token",
        client_factory=_capturing_httpx_client_factory(captured),
    )
    result = client.post_cash_session_close(
        {"cash_session_id": "abc"},
        correlation_id="corr-bearer",
        idempotency_key="idem-bearer",
    )
    assert result.http_status == 200
    request = captured["request"]
    assert request.headers["Authorization"] == "Bearer legacy-token"


def test_processor_sends_official_paheko_transaction_payload(db_session: Session) -> None:
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(
        db_session,
        site.id,
        destination_params={"id_year": 2, "debit": "512", "credit": "707", "reference_prefix": "terrain"},
    )
    service = CashSessionService(db_session)
    service.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="tx-official")

    captured: dict[str, httpx.Request] = {}
    paheko_client = PahekoAccountingClient(
        base_url="http://paheko.test",
        client_factory=_capturing_httpx_client_factory(captured),
    )
    process_next_paheko_outbox_item(db_session, client=paheko_client)

    request = captured["request"]
    payload = json.loads(request.read().decode("utf-8"))
    assert request.url.path == "/api/accounting/transaction"
    assert payload["id_year"] == 2
    assert payload["debit"] == "512"
    assert payload["credit"] == "707"
    assert payload["amount"] == 25.0
    assert "cash_session_id" not in payload


def _collect_openapi_operation_ids(schema: dict[str, Any]) -> set[str]:
    out: set[str] = set()
    for _path, methods in (schema.get("paths") or {}).items():
        if not isinstance(methods, dict):
            continue
        for _m, op in methods.items():
            if isinstance(op, dict) and "operationId" in op:
                out.add(str(op["operationId"]))
    return out


def test_openapi_includes_paheko_outbox_operation_ids(openapi_schema: dict[str, Any]) -> None:
    """AC4 : operationId figés exposés dans le schéma versionné (généré par l'app)."""
    ids = _collect_openapi_operation_ids(openapi_schema)
    assert "recyclique_pahekoOutbox_listItems" in ids
    assert "recyclique_pahekoOutbox_getItem" in ids


def test_admin_get_after_processor_success_shows_resolu(
    super_admin_client: Any, db_session: Session
) -> None:
    """AC3 : après tentative HTTP réussie, l'API ne se limite pas à « local OK » — resolu + delivered."""
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    service = CashSessionService(db_session)
    service.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="post-ok")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()
    paheko_client = PahekoAccountingClient(
        base_url="http://paheko.test",
        client_factory=_mock_httpx_client_factory(200, '{"ok":true}'),
    )
    process_next_paheko_outbox_item(db_session, client=paheko_client)

    g = super_admin_client.get(f"{_V1}/admin/paheko-outbox/items/{item.id}")
    assert g.status_code == 200, g.text
    det = g.json()
    assert det["outbox_status"] == "delivered"
    assert det["sync_state_core"] == "resolu"
    assert det["last_remote_http_status"] == 200
    assert det["remote_attempt_count"] >= 1


def test_admin_get_after_processor_403_shows_en_quarantaine(
    super_admin_client: Any, db_session: Session
) -> None:
    """AC3 : échec 403 → en_quarantaine (contrat minimal), observable via GET outbox."""
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    service = CashSessionService(db_session)
    service.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="q403")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()
    paheko_client = PahekoAccountingClient(
        base_url="http://paheko.test",
        client_factory=_mock_httpx_client_factory(403, "forbidden"),
    )
    process_next_paheko_outbox_item(db_session, client=paheko_client)

    g = super_admin_client.get(f"{_V1}/admin/paheko-outbox/items/{item.id}")
    assert g.status_code == 200, g.text
    det = g.json()
    assert det["outbox_status"] == "failed"
    assert det["sync_state_core"] == "en_quarantaine"
    assert det["last_remote_http_status"] == 403
