"""Story 23.1 — ventilation Paheko par moyen (ADVANCED + révision figée)."""

from __future__ import annotations

import json
import uuid
from typing import Any

import pytest
from sqlalchemy import func
from sqlalchemy.orm import Session

from recyclic_api.models.accounting_config import AccountingConfigRevision
from recyclic_api.services.paheko_close_batch_builder import (
    POLICY_AGGREGATED,
    POLICY_PER_PAYMENT_METHOD,
    SUB_KIND_REFUNDS_CURRENT,
    SUB_KIND_SALES_DONATIONS,
    SUB_KIND_SALES_DONATIONS_PER_PM,
    build_cash_session_close_batch_from_enriched_payload,
    build_planned_sub_writes,
    initial_batch_state_v1,
    merge_state_with_planned,
    sub_write_idempotency_key,
)


def _revision_snapshot() -> dict[str, Any]:
    return {
        "schema_version": 1,
        "global_accounts": {
            "default_sales_account": "7070",
            "default_donation_account": "7541",
            "prior_year_refund_account": "467",
        },
        "payment_methods": [
            {
                "code": "cash",
                "label": "Especes",
                "active": True,
                "kind": "cash",
                "paheko_debit_account": "511",
                "paheko_refund_credit_account": "511",
            },
            {
                "code": "card",
                "label": "CB",
                "active": True,
                "kind": "card",
                "paheko_debit_account": "512",
                "paheko_refund_credit_account": "512",
            },
        ],
    }


def _insert_revision(db_session: Session) -> AccountingConfigRevision:
    max_seq = db_session.query(func.max(AccountingConfigRevision.revision_seq)).scalar()
    next_seq = (max_seq or 0) + 1
    rev = AccountingConfigRevision(
        revision_seq=next_seq,
        snapshot_json=json.dumps(_revision_snapshot()),
        note="pytest-23-1",
    )
    db_session.add(rev)
    db_session.commit()
    db_session.refresh(rev)
    return rev


def _snap_base(*, by_pm: dict[str, float], rev_id: str, donation: float = 0.0, rc: float = 0.0, rp: float = 0.0) -> dict:
    return {
        "schema_version": 1,
        "session_id": str(uuid.uuid4()),
        "site_id": str(uuid.uuid4()),
        "sync_correlation_id": "c1",
        "accounting_config_revision_id": rev_id,
        "totals": {
            "by_payment_method_signed": by_pm,
            "refunds_current_fiscal_total": rc,
            "refunds_prior_closed_fiscal_total": rp,
            "donation_surplus_total": donation,
            "cash_signed_net_from_journal": 10.0,
            "payment_transaction_line_count": 2,
            "preview_fallback_legacy_totals": False,
        },
        "closing": {
            "theoretical_cash_amount": 10.0,
            "actual_cash_amount": 10.0,
            "cash_variance": 0.0,
        },
    }


def _enr(snap: dict) -> dict:
    csid = str(uuid.uuid4())
    return {
        "accounting_close_snapshot_frozen": snap,
        "id_year": 2,
        "debit": "512",
        "credit": "707",
        "cash_session_id": csid,
        "closed_at": "2026-01-15T10:00:00+00:00",
        "site_id": str(uuid.uuid4()),
        "operator_id": None,
        "actual_amount": 60.0,
        "theoretical_amount": 60.0,
        "variance": 0.0,
    }


def test_per_method_builds_advanced_balanced(db_session: Session) -> None:
    rev = _insert_revision(db_session)
    snap = _snap_base(by_pm={"cash": 40.0, "card": 20.0}, rev_id=str(rev.id), donation=5.0)
    enr = _enr(snap)
    rows, err, _ = build_cash_session_close_batch_from_enriched_payload(
        enr,
        batch_idempotency_key="cash_session_close:pm1",
        db=db_session,
        sales_policy=POLICY_PER_PAYMENT_METHOD,
    )
    assert err is None and rows is not None
    assert rows[0][0]["kind"] == SUB_KIND_SALES_DONATIONS_PER_PM
    body0 = rows[0][1]
    assert body0 is not None
    assert body0.get("type") == "ADVANCED"
    lines = body0.get("lines") or []
    td = sum(float(x.get("debit") or 0) for x in lines)
    tc = sum(float(x.get("credit") or 0) for x in lines)
    assert abs(td - tc) <= 0.01
    assert rows[1][0]["kind"] == SUB_KIND_REFUNDS_CURRENT
    assert rows[1][1] is None
    st = initial_batch_state_v1(batch_idempotency_key="cash_session_close:pm1", planned=rows)
    assert st["sub_writes"][0].get("observability", {}).get("body_format") == "ADVANCED"
    assert any(l.get("payment_method_code") == "cash" for l in st["sub_writes"][0]["observability"]["lines"])


def test_aggregated_policy_unchanged_shape() -> None:
    snap = _snap_base(by_pm={"cash": 10.0}, rev_id=str(uuid.uuid4()))
    plan, err, _ = build_planned_sub_writes(snap, sales_policy=POLICY_AGGREGATED)
    assert err is None
    assert plan[0]["kind"] == SUB_KIND_SALES_DONATIONS
    assert "http_body" not in plan[0]


def test_per_method_requires_db() -> None:
    snap = _snap_base(by_pm={"cash": 1.0}, rev_id=str(uuid.uuid4()))
    plan, err, _ = build_planned_sub_writes(
        snap,
        db=None,
        sales_policy=POLICY_PER_PAYMENT_METHOD,
        enriched_payload=_enr(snap),
    )
    assert err == "revision_resolution_requires_db"
    assert plan == []


def test_per_method_missing_revision_id(db_session: Session) -> None:
    snap = _snap_base(by_pm={"cash": 1.0}, rev_id=str(uuid.uuid4()))
    snap["accounting_config_revision_id"] = None
    enr = _enr(snap)
    rows, err, _ = build_cash_session_close_batch_from_enriched_payload(
        enr,
        batch_idempotency_key="x",
        db=db_session,
        sales_policy=POLICY_PER_PAYMENT_METHOD,
    )
    assert err == "snapshot_missing_revision"
    assert rows is None


def test_refunds_blocks_unchanged_under_per_method(db_session: Session) -> None:
    rev = _insert_revision(db_session)
    snap = _snap_base(by_pm={"cash": 10.0}, rev_id=str(rev.id), rc=3.0, rp=2.0)
    enr = _enr(snap)
    rows, err, _ = build_cash_session_close_batch_from_enriched_payload(
        enr,
        batch_idempotency_key="cash_session_close:pm2",
        db=db_session,
        sales_policy=POLICY_PER_PAYMENT_METHOD,
    )
    assert err is None and rows is not None
    assert rows[1][0]["amount"] == 3.0 and rows[1][1] is not None
    assert rows[1][1].get("type") == "REVENUE"
    assert rows[2][0]["amount"] == 2.0 and rows[2][1] is not None


def test_idempotency_sub_key_differs_between_policies(db_session: Session) -> None:
    rev = _insert_revision(db_session)
    snap = _snap_base(by_pm={"cash": 5.0}, rev_id=str(rev.id))
    enr = _enr(snap)
    agg, e1, _ = build_cash_session_close_batch_from_enriched_payload(
        enr,
        batch_idempotency_key="same",
        db=db_session,
        sales_policy=POLICY_AGGREGATED,
    )
    pm, e2, _ = build_cash_session_close_batch_from_enriched_payload(
        enr,
        batch_idempotency_key="same",
        db=db_session,
        sales_policy=POLICY_PER_PAYMENT_METHOD,
    )
    assert e1 is None and e2 is None and agg and pm
    k_agg = sub_write_idempotency_key("same", 0, agg[0][0]["kind"])
    k_pm = sub_write_idempotency_key("same", 0, pm[0][0]["kind"])
    assert k_agg != k_pm


def test_per_method_observability_ac5_minimum_fields(db_session: Session) -> None:
    """AC5 : code moyen, montant, line_index par ligne ventilée ; id sous-écriture sur l’entrée batch."""
    rev = _insert_revision(db_session)
    snap = _snap_base(by_pm={"cash": 40.0, "card": 20.0}, rev_id=str(rev.id), donation=5.0)
    enr = _enr(snap)
    rows, err, _ = build_cash_session_close_batch_from_enriched_payload(
        enr,
        batch_idempotency_key="cash_session_close:ac5",
        db=db_session,
        sales_policy=POLICY_PER_PAYMENT_METHOD,
    )
    assert err is None and rows
    st = initial_batch_state_v1(batch_idempotency_key="cash_session_close:ac5", planned=rows)
    sw0 = st["sub_writes"][0]
    assert sw0["index"] == 0
    assert sw0.get("idempotency_sub_key")
    obs = sw0.get("observability") or {}
    assert obs.get("body_format") == "ADVANCED"
    for line in obs.get("lines") or []:
        code = line.get("payment_method_code")
        if code:
            assert line.get("line_index") is not None
            assert "amount" in line
            assert line.get("account")
    prev = {
        "schema_version": 1,
        "batch_idempotency_key": "cash_session_close:ac5",
        "sub_writes": [
            {
                "index": 0,
                "kind": SUB_KIND_SALES_DONATIONS_PER_PM,
                "idempotency_sub_key": sub_write_idempotency_key(
                    "cash_session_close:ac5",
                    0,
                    SUB_KIND_SALES_DONATIONS_PER_PM,
                ),
                "status": "delivered",
                "remote_transaction_id": "paheko-tx-123",
                "last_http_status": 200,
                "last_error": None,
            },
        ],
    }
    merged = merge_state_with_planned(
        prev,
        batch_idempotency_key="cash_session_close:ac5",
        planned=rows,
    )
    assert merged["sub_writes"][0]["remote_transaction_id"] == "paheko-tx-123"


def test_merge_preserves_observability_on_redelivery_template(db_session: Session) -> None:
    rev = _insert_revision(db_session)
    snap = _snap_base(by_pm={"cash": 2.0}, rev_id=str(rev.id))
    enr = _enr(snap)
    rows, err, _ = build_cash_session_close_batch_from_enriched_payload(
        enr,
        batch_idempotency_key="cash_session_close:merge-obs",
        db=db_session,
        sales_policy=POLICY_PER_PAYMENT_METHOD,
    )
    assert err is None and rows
    prev = {
        "schema_version": 1,
        "batch_idempotency_key": "cash_session_close:merge-obs",
        "sub_writes": [
            {
                "index": 0,
                "kind": SUB_KIND_SALES_DONATIONS_PER_PM,
                "idempotency_sub_key": sub_write_idempotency_key(
                    "cash_session_close:merge-obs",
                    0,
                    SUB_KIND_SALES_DONATIONS_PER_PM,
                ),
                "status": "delivered",
                "remote_transaction_id": "rid-x",
                "last_http_status": 200,
                "last_error": None,
            },
        ],
    }
    merged = merge_state_with_planned(
        prev,
        batch_idempotency_key="cash_session_close:merge-obs",
        planned=rows,
    )
    assert merged["sub_writes"][0]["status"] == "delivered"
    assert merged["sub_writes"][0].get("observability") is not None
