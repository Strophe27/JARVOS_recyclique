"""Story 25.9 — spec 25.4 §4 : résolution mapping obligatoire avant tout succès outbox (delta Epic 8)."""

from __future__ import annotations

import json
import uuid

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session, noload

from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.paheko_cash_session_close_mapping import PahekoCashSessionCloseMapping
from recyclic_api.models.paheko_outbox import PahekoOutboxItem, PahekoOutboxStatus
from recyclic_api.models.payment_transaction import (
    PaymentTransaction,
    PaymentTransactionDirection,
    PaymentTransactionNature,
)
from recyclic_api.models.site import Site
from recyclic_api.models.sale import PaymentMethod, Sale, SaleLifecycleStatus
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.schemas.paheko_outbox import outbox_item_to_public
from recyclic_api.services.cash_session_service import CashSessionService
from recyclic_api.services.paheko_accounting_client import PahekoAccountingClient
from recyclic_api.services.paheko_close_batch_builder import PAHEKO_CLOSE_BATCH_STATE_KEY
from recyclic_api.services.paheko_outbox_processor import process_next_paheko_outbox_item
from tests.paheko_8x_test_utils import attach_latest_accounting_revision_to_session, seed_default_paheko_close_mapping


def _seed_session(db_session: Session) -> tuple[Site, CashSession]:
    site = Site(
        name="S259",
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
        username=f"u259_{uid.hex[:10]}@t.com",
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


def test_mapping_must_be_resolved_before_delivered_mapping_removed_after_enqueue(
    db_session: Session,
) -> None:
    """Sans mapping actif au moment du traitement : quarantaine préparation, jamais delivered (25.4 §4)."""
    site, cs = _seed_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, None, sync_correlation_id="corr-259-mapping-removed")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()
    assert item.outbox_status == PahekoOutboxStatus.pending.value

    db_session.query(PahekoCashSessionCloseMapping).filter(PahekoCashSessionCloseMapping.site_id == site.id).delete()
    db_session.commit()

    def dispatch(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text='{"id":"should-not-run"}', request=request)

    def factory() -> httpx.Client:
        return httpx.Client(transport=httpx.MockTransport(dispatch), base_url="http://paheko.test")

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
    assert item.outbox_status == PahekoOutboxStatus.failed.value
    assert item.sync_state_core == "en_quarantaine"
    trace = (item.payload or {}).get("preparation_trace_v1") or {}
    assert trace.get("failure_domain") == "mapping"
    assert item.mapping_resolution_error == "mapping_missing"
    pub = outbox_item_to_public(item)
    assert pub.root_cause_domain == "mapping"
    assert pub.root_cause_code == "mapping_missing"


def test_mapping_resolved_then_close_batch_can_reach_delivered(db_session: Session) -> None:
    """Chemin nominal : mapping présent → builder + HTTP → delivered (succès outbox après résolution)."""
    site, cs = _seed_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    svc = CashSessionService(db_session)
    closed = svc.close_session_with_amounts(str(cs.id), 35.0, None, sync_correlation_id="corr-259-ok")
    assert closed is not None
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()
    assert "accounting_close_snapshot_frozen" in (item.payload or {})

    def dispatch(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=json.dumps({"id": "remote-259"}), request=request)

    def factory() -> httpx.Client:
        return httpx.Client(transport=httpx.MockTransport(dispatch), base_url="http://paheko.test")

    client = PahekoAccountingClient(
        base_url="http://paheko.test",
        api_user="u",
        api_password="p",
        client_factory=factory,
        close_path="/c",
    )
    process_next_paheko_outbox_item(db_session, client=client)
    db_session.refresh(item)
    assert item.outbox_status == PahekoOutboxStatus.delivered.value
    st = (item.payload or {}).get(PAHEKO_CLOSE_BATCH_STATE_KEY)
    assert isinstance(st, dict)
    assert st.get("all_delivered") is True
