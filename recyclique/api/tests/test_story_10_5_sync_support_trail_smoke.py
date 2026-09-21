"""Story 10.5 — smoke fil sync support (contrat timeline HTTP, fixtures 8.1/8.5)."""

from __future__ import annotations

import os
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
        name="S10.5 sync smoke",
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


def _mock_httpx_client_factory(status_code: int, text: str = "{}") -> Any:
    def dispatch(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code, text=text, request=request)

    def factory() -> httpx.Client:
        return httpx.Client(transport=httpx.MockTransport(dispatch), base_url="http://paheko.test")

    return factory


@pytest.mark.skipif(
    not os.getenv("TEST_DATABASE_URL", "").startswith("postgresql"),
    reason="Schéma outbox/Paheko requis (PostgreSQL — CI api-minimal).",
)
def test_runbook_sync_timeline_minimal_200(super_admin_client: Any, db_session: Session) -> None:
    """
    Scénario runbook « incident sync-sensitive » : correlation_id connu → timeline 200.
    Mock Paheko acceptable ; ne duplique pas les assertions métier 8.1.
    """
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(db_session, site.id)
    sync_corr = "corr-10-5-runbook-sync-trail"
    CashSessionService(db_session).close_session_with_amounts(
        str(cs.id), 35.0, "ok", sync_correlation_id=sync_corr
    )
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()

    paheko_client = PahekoAccountingClient(
        base_url="http://paheko.test",
        client_factory=_mock_httpx_client_factory(200, '{"ok":true}'),
    )
    process_next_paheko_outbox_item(db_session, client=paheko_client)

    tl = super_admin_client.get(f"{_V1}/admin/paheko-outbox/by-correlation/{sync_corr}")
    assert tl.status_code == 200, tl.text
    data = tl.json()
    assert data["correlation_id"] == sync_corr
    assert len(data["items"]) == 1
    assert data["items"][0]["id"] == str(item.id)
