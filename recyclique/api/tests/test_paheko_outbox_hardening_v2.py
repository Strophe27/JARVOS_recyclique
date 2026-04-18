"""PAHEKO-SYNC hardening v2 — AGR-01, SNAP partial_success, DEL-01 delete guard."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.core.security import create_access_token, hash_password
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.paheko_outbox import PahekoOutboxItem, PahekoOutboxStatus
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.services.paheko_close_batch_builder import PAHEKO_CLOSE_BATCH_STATE_KEY
from recyclic_api.services.reception_stats_service import ReceptionLiveStatsService

_V1 = settings.API_V1_STR.rstrip("/")


def _mock_unified_stats_payload() -> dict:
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


def _minimal_site_user(db_session: Session) -> tuple[Site, User]:
    site = Site(id=uuid.uuid4(), name="Hardening site", is_active=True)
    db_session.add(site)
    uid = uuid.uuid4()
    user = User(
        id=uid,
        username=f"h_{uid.hex[:8]}@test.com",
        hashed_password=hash_password("pw"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
        legacy_external_contact_id=f"leg_{uid.hex[:12]}",
        site_id=site.id,
    )
    db_session.add(user)
    db_session.commit()
    return site, user


def test_live_snapshot_worst_state_rejete_beats_a_reessayer_agr01(
    client: TestClient, db_session: Session
) -> None:
    """PAHEKO-SYNC-AGR-01 — même site : `rejete` domine `a_reessayer`."""
    site, user = _minimal_site_user(db_session)

    cs1 = CashSession(
        operator_id=user.id,
        site_id=site.id,
        initial_amount=0.0,
        current_amount=0.0,
        status=CashSessionStatus.CLOSED,
        closed_at=datetime.now(timezone.utc),
        closing_amount=0.0,
        actual_amount=0.0,
        variance=0.0,
        total_sales=0.0,
        total_items=0,
    )
    cs2 = CashSession(
        operator_id=user.id,
        site_id=site.id,
        initial_amount=0.0,
        current_amount=0.0,
        status=CashSessionStatus.CLOSED,
        closed_at=datetime.now(timezone.utc),
        closing_amount=0.0,
        actual_amount=0.0,
        variance=0.0,
        total_sales=0.0,
        total_items=0,
    )
    db_session.add_all([cs1, cs2])
    db_session.flush()

    db_session.add_all(
        [
            PahekoOutboxItem(
                operation_type="cash_session_close",
                idempotency_key=f"t:rej:{cs1.id}",
                cash_session_id=cs1.id,
                site_id=site.id,
                payload={},
                outbox_status="pending",
                sync_state_core="rejete",
                correlation_id=f"corr-{uuid.uuid4()}",
            ),
            PahekoOutboxItem(
                operation_type="cash_session_close",
                idempotency_key=f"t:retry:{cs2.id}",
                cash_session_id=cs2.id,
                site_id=site.id,
                payload={},
                outbox_status="pending",
                sync_state_core="a_reessayer",
                correlation_id=f"corr-{uuid.uuid4()}",
            ),
        ]
    )
    db_session.commit()

    token = create_access_token(data={"sub": str(user.id)})
    with patch.object(
        ReceptionLiveStatsService,
        "get_unified_live_stats",
        new_callable=AsyncMock,
        return_value=_mock_unified_stats_payload(),
    ):
        r = client.get(
            "/v2/exploitation/live-snapshot",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 200, r.text
    body = r.json()
    sync = body.get("sync_operational_summary")
    assert sync is not None
    assert sync["worst_state"] == "rejete"
    assert body.get("sync_aggregate_unavailable") is False


def test_live_snapshot_partial_success_true_when_batch_partial(
    client: TestClient, db_session: Session
) -> None:
    """SNAP-01 — partial_success dans la réponse lorsque présent en base."""
    site, user = _minimal_site_user(db_session)
    cs = CashSession(
        operator_id=user.id,
        site_id=site.id,
        initial_amount=0.0,
        current_amount=0.0,
        status=CashSessionStatus.CLOSED,
        closed_at=datetime.now(timezone.utc),
        closing_amount=0.0,
        actual_amount=0.0,
        variance=0.0,
        total_sales=0.0,
        total_items=0,
    )
    db_session.add(cs)
    db_session.flush()
    db_session.add(
        PahekoOutboxItem(
            operation_type="cash_session_close",
            idempotency_key=f"t:partial:{cs.id}",
            cash_session_id=cs.id,
            site_id=site.id,
            payload={
                PAHEKO_CLOSE_BATCH_STATE_KEY: {
                    "schema_version": 1,
                    "retry_policy": "default",
                    "partial_success": True,
                    "all_delivered": False,
                    "sub_writes": [
                        {
                            "index": 0,
                            "kind": "x",
                            "status": "delivered",
                            "idempotency_sub_key": "k0",
                        },
                        {
                            "index": 1,
                            "kind": "y",
                            "status": "pending",
                            "idempotency_sub_key": "k1",
                        },
                    ],
                }
            },
            outbox_status="pending",
            sync_state_core="a_reessayer",
            correlation_id=f"corr-{uuid.uuid4()}",
        )
    )
    db_session.commit()

    token = create_access_token(data={"sub": str(user.id)})
    with patch.object(
        ReceptionLiveStatsService,
        "get_unified_live_stats",
        new_callable=AsyncMock,
        return_value=_mock_unified_stats_payload(),
    ):
        r = client.get(
            "/v2/exploitation/live-snapshot",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 200, r.text
    sync = r.json().get("sync_operational_summary")
    assert sync is not None
    assert sync.get("partial_success") is True


def test_delete_failed_blocked_when_partial_batch_snapshot(
    super_admin_client: Any, db_session: Session
) -> None:
    """DEL-01 — DELETE refusé (409) si batch partiel persisté sur une ligne failed."""
    site, user = _minimal_site_user(db_session)
    cs = CashSession(
        operator_id=user.id,
        site_id=site.id,
        initial_amount=0.0,
        current_amount=0.0,
        status=CashSessionStatus.CLOSED,
        closed_at=datetime.now(timezone.utc),
        closing_amount=0.0,
        actual_amount=0.0,
        variance=0.0,
        total_sales=0.0,
        total_items=0,
    )
    db_session.add(cs)
    db_session.flush()
    item = PahekoOutboxItem(
        operation_type="cash_session_close",
        idempotency_key=f"t:del:{cs.id}",
        cash_session_id=cs.id,
        site_id=site.id,
        payload={
            PAHEKO_CLOSE_BATCH_STATE_KEY: {
                "schema_version": 1,
                "retry_policy": "default",
                "partial_success": True,
                "all_delivered": False,
                "sub_writes": [
                    {
                        "index": 0,
                        "kind": "x",
                        "status": "delivered",
                        "idempotency_sub_key": "k0",
                    },
                ],
            }
        },
        outbox_status=PahekoOutboxStatus.failed.value,
        sync_state_core="a_reessayer",
        correlation_id=f"corr-{uuid.uuid4()}",
    )
    db_session.add(item)
    db_session.commit()

    r = super_admin_client.delete(f"{_V1}/admin/paheko-outbox/items/{item.id}")
    assert r.status_code == 409, r.text
    assert r.json().get("code") == "DELETE_BLOCKED_BATCH_CLOSE_STATE"
    assert r.json().get("policy_reason_code") == "PAHEKO_DELETE_BLOCKED_PARTIAL_OR_AMBIGUOUS_BATCH"


def test_delete_failed_blocked_when_batch_key_exists_but_unparseable(
    super_admin_client: Any, db_session: Session
) -> None:
    """DEL-01 — refus prudent si clé batch présente mais snapshot illisible."""
    site, user = _minimal_site_user(db_session)
    cs = CashSession(
        operator_id=user.id,
        site_id=site.id,
        initial_amount=0.0,
        current_amount=0.0,
        status=CashSessionStatus.CLOSED,
        closed_at=datetime.now(timezone.utc),
        closing_amount=0.0,
        actual_amount=0.0,
        variance=0.0,
        total_sales=0.0,
        total_items=0,
    )
    db_session.add(cs)
    db_session.flush()
    item = PahekoOutboxItem(
        operation_type="cash_session_close",
        idempotency_key=f"t:bad:{cs.id}",
        cash_session_id=cs.id,
        site_id=site.id,
        payload={PAHEKO_CLOSE_BATCH_STATE_KEY: "not-a-dict"},
        outbox_status=PahekoOutboxStatus.failed.value,
        sync_state_core="en_quarantaine",
        correlation_id=f"corr-{uuid.uuid4()}",
    )
    db_session.add(item)
    db_session.commit()

    r = super_admin_client.delete(f"{_V1}/admin/paheko-outbox/items/{item.id}")
    assert r.status_code == 409, r.text
    assert r.json().get("code") == "DELETE_BLOCKED_BATCH_CLOSE_STATE"
