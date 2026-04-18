"""Story 22.7 — processor outbox : reprise sous-écritures + état payload."""

from __future__ import annotations

import copy
import json
import uuid
from typing import Any

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session, noload

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
from recyclic_api.core.config import settings
from recyclic_api.services.paheko_close_batch_builder import PAHEKO_CLOSE_BATCH_STATE_KEY
from recyclic_api.services.paheko_outbox_processor import process_next_paheko_outbox_item
from tests.paheko_8x_test_utils import attach_latest_accounting_revision_to_session, seed_default_paheko_close_mapping

_V1 = settings.API_V1_STR.rstrip("/")


def _seed_session(db_session: Session) -> tuple[Site, CashSession]:
    site = Site(
        name="S227",
        address="1 r",
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
        username=f"u227_{uid.hex[:10]}@t.com",
        hashed_password="pw",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
        site_id=site.id,
    )
    db_session.add(user)
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
    attach_latest_accounting_revision_to_session(db_session, cs)
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
    cs = db_session.execute(select(CashSession).where(CashSession.id == cs.id).options(noload(CashSession.register))).scalar_one()
    return site, cs


def _mock_factory_seq(statuses: list[int], bodies: list[str]) -> Any:
    i = {"n": 0}

    def dispatch(request: httpx.Request) -> httpx.Response:
        n = i["n"]
        i["n"] += 1
        st = statuses[n] if n < len(statuses) else 200
        txt = bodies[n] if n < len(bodies) else '{"id":"remote-ok"}'
        return httpx.Response(st, text=txt, request=request)

    def factory() -> httpx.Client:
        return httpx.Client(transport=httpx.MockTransport(dispatch), base_url="http://paheko.test")

    return factory


def test_processor_batch_delivers_with_snapshot_payload(db_session: Session) -> None:
    site, cs = _seed_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    closed = svc.close_session_with_amounts(str(cs.id), 35.0, None, sync_correlation_id="corr-227-1")
    assert closed is not None
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()
    assert "accounting_close_snapshot_frozen" in (item.payload or {})

    factory = _mock_factory_seq([200], [json.dumps({"id": "t-1"})])
    client = PahekoAccountingClient(
        base_url="http://paheko.test",
        api_user="u",
        api_password="p",
        client_factory=factory,
        close_path="/c",
    )
    out = process_next_paheko_outbox_item(db_session, client=client)
    assert out is not None
    db_session.refresh(item)
    assert item.outbox_status == PahekoOutboxStatus.delivered.value
    st = (item.payload or {}).get(PAHEKO_CLOSE_BATCH_STATE_KEY)
    assert isinstance(st, dict)
    assert st.get("all_delivered") is True
    assert st.get("partial_success") is False
    subs = st.get("sub_writes") or []
    delivered = [s for s in subs if s.get("status") == "delivered"]
    assert delivered
    assert delivered[0].get("remote_transaction_id") == "t-1"


def test_processor_batch_partial_retry_skips_delivered_sub(db_session: Session) -> None:
    site, cs = _seed_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, None, sync_correlation_id="corr-227-2")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()

    factory = _mock_factory_seq(
        [200, 500, 200],
        [
            '{"id":"ok-sub-0"}',
            "tmp error",
            '{"id":"ok-sub-1"}',
        ],
    )
    client = PahekoAccountingClient(
        base_url="http://paheko.test",
        api_user="u",
        api_password="p",
        client_factory=factory,
        close_path="/c",
    )
    # Forcer deux sous-écritures HTTP : deepcopy pour ne pas partager les dicts imbriqués SQLAlchemy JSON
    frozen = copy.deepcopy((item.payload or {})["accounting_close_snapshot_frozen"])
    frozen["totals"]["refunds_current_fiscal_total"] = 5.0
    frozen["totals"]["by_payment_method_signed"] = {"cash": 30.0}
    pl = dict(item.payload or {})
    pl["accounting_close_snapshot_frozen"] = frozen
    item.payload = pl
    db_session.commit()
    db_session.refresh(item)

    process_next_paheko_outbox_item(db_session, client=client)
    db_session.refresh(item)
    assert item.outbox_status == PahekoOutboxStatus.pending.value
    st = (item.payload or {}).get(PAHEKO_CLOSE_BATCH_STATE_KEY) or {}
    assert st.get("partial_success") is True

    item.next_retry_at = None
    db_session.commit()
    process_next_paheko_outbox_item(db_session, client=client)
    db_session.refresh(item)
    assert item.outbox_status == PahekoOutboxStatus.delivered.value


def test_processor_batch_4xx_on_sub_write_quarantines_preserves_prior_remote_id(
    db_session: Session,
) -> None:
    """Échec non retryable (4xx) sur une sous-écriture → quarantaine batch ; ID distant déjà reçu conservé (AC4, AC5)."""
    site, cs = _seed_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, None, sync_correlation_id="corr-227-3")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()

    factory = _mock_factory_seq(
        [200, 400],
        [
            '{"id":"rid-sales"}',
            '{"error":"bad request"}',
        ],
    )
    client = PahekoAccountingClient(
        base_url="http://paheko.test",
        api_user="u",
        api_password="p",
        client_factory=factory,
        close_path="/c",
    )
    frozen = copy.deepcopy((item.payload or {})["accounting_close_snapshot_frozen"])
    frozen["totals"]["refunds_current_fiscal_total"] = 3.0
    frozen["totals"]["by_payment_method_signed"] = {"cash": 27.0}
    pl = dict(item.payload or {})
    pl["accounting_close_snapshot_frozen"] = frozen
    item.payload = pl
    db_session.commit()
    db_session.refresh(item)

    process_next_paheko_outbox_item(db_session, client=client)
    db_session.refresh(item)

    assert item.outbox_status == PahekoOutboxStatus.failed.value
    assert item.sync_state_core == "en_quarantaine"
    st = (item.payload or {}).get(PAHEKO_CLOSE_BATCH_STATE_KEY) or {}
    assert st.get("partial_success") is True
    subs = st.get("sub_writes") or []
    delivered = [s for s in subs if s.get("status") == "delivered"]
    assert len(delivered) == 1
    assert delivered[0].get("remote_transaction_id") == "rid-sales"
    failed = [s for s in subs if s.get("status") == "failed"]
    assert len(failed) == 1
    assert failed[0].get("last_http_status") == 400


def test_admin_get_item_exposes_close_batch_state_json(
    db_session: Session,
    super_admin_client: Any,
) -> None:
    """Story 22.7 — observabilité admin : GET outbox détail inclut close_batch_state (contrat public)."""
    site, cs = _seed_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, None, sync_correlation_id="corr-227-admin-cbs")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()

    factory = _mock_factory_seq([200], [json.dumps({"id": "t-admin"})])
    client = PahekoAccountingClient(
        base_url="http://paheko.test",
        api_user="u",
        api_password="p",
        client_factory=factory,
        close_path="/c",
    )
    process_next_paheko_outbox_item(db_session, client=client)
    db_session.refresh(item)

    r = super_admin_client.get(f"{_V1}/admin/paheko-outbox/items/{item.id}")
    assert r.status_code == 200, r.text
    det = r.json()
    cbs = det.get("close_batch_state")
    assert cbs is not None
    assert cbs.get("all_delivered") is True
    assert cbs.get("partial_success") is False
    subs = cbs.get("sub_writes") or []
    assert isinstance(subs, list) and len(subs) >= 1
    assert subs[0].get("remote_transaction_id") == "t-admin"
