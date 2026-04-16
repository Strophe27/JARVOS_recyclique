"""Story 22.7 — builder batch depuis snapshot figé (déterminisme, montants, clés)."""

from __future__ import annotations

import copy
import uuid

import pytest

from recyclic_api.services.paheko_close_batch_builder import (
    RETRY_POLICY_RESUME_FAILED_SUB_WRITES,
    SUB_KIND_REFUNDS_CURRENT,
    SUB_KIND_REFUNDS_PRIOR_CLOSED,
    SUB_KIND_SALES_DONATIONS,
    amounts_from_frozen_snapshot,
    build_cash_session_close_batch_from_enriched_payload,
    build_planned_sub_writes,
    merge_state_with_planned,
    sub_write_idempotency_key,
)


def _snap(
    *,
    by_pm: dict,
    rc: float = 0.0,
    rp: float = 0.0,
) -> dict:
    return {
        "schema_version": 1,
        "session_id": str(uuid.uuid4()),
        "site_id": str(uuid.uuid4()),
        "sync_correlation_id": "c1",
        "totals": {
            "by_payment_method_signed": by_pm,
            "refunds_current_fiscal_total": rc,
            "refunds_prior_closed_fiscal_total": rp,
            "donation_surplus_total": 0.0,
            "cash_signed_net_from_journal": 10.0,
            "payment_transaction_line_count": 1,
            "preview_fallback_legacy_totals": False,
        },
        "closing": {
            "theoretical_cash_amount": 10.0,
            "actual_cash_amount": 10.0,
            "cash_variance": 0.0,
        },
    }


def test_amounts_reconstruct_sales_plus_refunds() -> None:
    snap = _snap(by_pm={"cash": 85.0}, rc=10.0, rp=5.0)
    s, rc, rp = amounts_from_frozen_snapshot(snap)
    assert s == 100.0
    assert rc == 10.0
    assert rp == 5.0


def test_planned_sub_writes_stable_order() -> None:
    snap = _snap(by_pm={"cash": 10.0})
    p1, e1, _ = build_planned_sub_writes(snap)
    assert e1 is None
    p2, e2, _ = build_planned_sub_writes(copy.deepcopy(snap))
    assert e2 is None
    assert [x["index"] for x in p1] == [0, 1, 2]
    assert p1 == p2


def test_sub_idempotency_keys_stable() -> None:
    snap = _snap(by_pm={"cash": 1.0})
    plan, err, _ = build_planned_sub_writes(snap)
    assert err is None
    bkey = "cash_session_close:abc"
    keys = [sub_write_idempotency_key(bkey, x["index"], x["kind"]) for x in plan]
    assert keys[0].endswith(f":0:{SUB_KIND_SALES_DONATIONS}")
    assert keys[1].endswith(f":1:{SUB_KIND_REFUNDS_CURRENT}")
    assert keys[2].endswith(f":2:{SUB_KIND_REFUNDS_PRIOR_CLOSED}")


def test_merge_state_preserves_delivered() -> None:
    snap = _snap(by_pm={"cash": 5.0})
    enr = {
        "accounting_close_snapshot_frozen": snap,
        "id_year": 2,
        "debit": "512",
        "credit": "707",
        "cash_session_id": str(uuid.uuid4()),
        "closed_at": "2026-01-15T10:00:00+00:00",
        "site_id": str(uuid.uuid4()),
        "operator_id": str(uuid.uuid4()),
        "actual_amount": 5.0,
        "theoretical_amount": 5.0,
        "variance": 0.0,
    }
    rows, err, _ = build_cash_session_close_batch_from_enriched_payload(
        enr,
        batch_idempotency_key="cash_session_close:x",
    )
    assert err is None and rows is not None
    prev = {
        "schema_version": 1,
        "batch_idempotency_key": "cash_session_close:x",
        "sub_writes": [
            {
                "index": 0,
                "kind": SUB_KIND_SALES_DONATIONS,
                "idempotency_sub_key": sub_write_idempotency_key(
                    "cash_session_close:x",
                    0,
                    SUB_KIND_SALES_DONATIONS,
                ),
                "status": "delivered",
                "remote_transaction_id": "rid-1",
                "last_http_status": 200,
                "last_error": None,
            },
        ],
    }
    merged = merge_state_with_planned(
        prev,
        batch_idempotency_key="cash_session_close:x",
        planned=rows,
    )
    assert merged["sub_writes"][0]["status"] == "delivered"
    assert merged["sub_writes"][0]["remote_transaction_id"] == "rid-1"
    assert merged["retry_policy"] == RETRY_POLICY_RESUME_FAILED_SUB_WRITES


@pytest.mark.parametrize("rc,rp,expect_bodies", [(0.0, 0.0, 1), (3.0, 0.0, 2), (1.0, 2.0, 3)])
def test_bodies_emitted_only_for_positive_amounts(
    rc: float,
    rp: float,
    expect_bodies: int,
) -> None:
    snap = _snap(by_pm={"cash": 10.0}, rc=rc, rp=rp)
    enr = {
        "accounting_close_snapshot_frozen": snap,
        "id_year": 2,
        "debit": "512",
        "credit": "707",
        "cash_session_id": str(uuid.uuid4()),
        "closed_at": "2026-01-15T10:00:00+00:00",
        "site_id": str(uuid.uuid4()),
        "operator_id": None,
        "actual_amount": 10.0,
        "theoretical_amount": 10.0,
        "variance": 0.0,
    }
    rows, err, _ = build_cash_session_close_batch_from_enriched_payload(
        enr,
        batch_idempotency_key="cash_session_close:z",
    )
    assert err is None and rows is not None
    n_bodies = sum(1 for _p, b in rows if b is not None)
    assert n_bodies == expect_bodies
