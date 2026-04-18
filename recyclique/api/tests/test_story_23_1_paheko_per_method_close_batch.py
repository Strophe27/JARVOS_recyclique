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
    POLICY_DETAILED,
    SUB_KIND_REFUNDS_CURRENT,
    SUB_KIND_REFUNDS_CURRENT_PER_PM_V1,
    SUB_KIND_REFUNDS_PRIOR_CLOSED_PER_PM_V1,
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
            "prior_year_refund_account": "672",
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


def _snap_base(
    *,
    by_pm: dict[str, float],
    rev_id: str,
    donation: float = 0.0,
    rc: float = 0.0,
    rp: float = 0.0,
    schema_version: int = 1,
    rc_by_pm: dict[str, float] | None = None,
    rp_by_pm: dict[str, float] | None = None,
) -> dict:
    return {
        "schema_version": schema_version,
        "session_id": str(uuid.uuid4()),
        "site_id": str(uuid.uuid4()),
        "sync_correlation_id": "c1",
        "accounting_config_revision_id": rev_id,
        "totals": {
            "by_payment_method_signed": by_pm,
            "refunds_current_fiscal_total": rc,
            "refunds_prior_closed_fiscal_total": rp,
            "refunds_current_fiscal_by_payment_method": dict(rc_by_pm or {}),
            "refunds_prior_closed_fiscal_by_payment_method": dict(rp_by_pm or {}),
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
        "session_initial_amount": 0.0,
        "session_total_sales_rollups": 60.0,
    }


def test_per_method_builds_advanced_balanced(db_session: Session) -> None:
    rev = _insert_revision(db_session)
    snap = _snap_base(by_pm={"cash": 40.0, "card": 20.0}, rev_id=str(rev.id), donation=5.0)
    enr = _enr(snap)
    rows, err, _ = build_cash_session_close_batch_from_enriched_payload(
        enr,
        batch_idempotency_key="cash_session_close:pm1",
        db=db_session,
    )
    assert err is None and rows is not None
    assert rows[0][0]["kind"] == SUB_KIND_SALES_DONATIONS_PER_PM
    body0 = rows[0][1]
    assert body0 is not None
    assert body0.get("type") == "ADVANCED"
    csid = enr["cash_session_id"]
    assert body0.get("label") == "Clôture caisse — 2026-01-15"
    assert body0.get("reference") == f"CAISSE-20260115-{csid[:8]}"
    notes0 = body0.get("notes") or ""
    assert "cash_session_id=" not in notes0
    assert "site_id=" not in notes0
    assert "sub_kind=" not in notes0
    assert "Fond de caisse :" in notes0
    assert "Ventes encaissées (net) :" in notes0
    assert "Révision config :" in notes0
    lines = body0.get("lines") or []
    for ln in lines:
        ref = ln.get("reference") or ""
        assert ref.startswith(f"CAISSE-20260115-{csid[:8]}:")
    assert any(ln.get("label") == "Encaissement espèces" for ln in lines)
    assert any(ln.get("label") == "Encaissement carte" for ln in lines)
    assert any(ln.get("label") == "Ventes de la session" for ln in lines)
    assert any(ln.get("label") == "Dons de la session" for ln in lines)
    cr707 = sum(float(x.get("credit") or 0) for x in lines if x.get("account") == "7070")
    cr754 = sum(float(x.get("credit") or 0) for x in lines if x.get("account") == "7541")
    assert cr707 == pytest.approx(55.0)
    assert cr754 == pytest.approx(5.0)
    td = sum(float(x.get("debit") or 0) for x in lines)
    tc = sum(float(x.get("credit") or 0) for x in lines)
    assert abs(td - tc) <= 0.01
    assert rows[1][0]["kind"] == SUB_KIND_REFUNDS_CURRENT
    assert rows[1][1] is None
    st = initial_batch_state_v1(batch_idempotency_key="cash_session_close:pm1", planned=rows)
    assert st["sub_writes"][0].get("observability", {}).get("body_format") == "ADVANCED"
    assert st["sub_writes"][0].get("observability", {}).get("builder_policy") == POLICY_DETAILED
    assert any(l.get("payment_method_code") == "cash" for l in st["sub_writes"][0]["observability"]["lines"])


def test_per_method_requires_db() -> None:
    snap = _snap_base(by_pm={"cash": 1.0}, rev_id=str(uuid.uuid4()))
    plan, err, _ = build_planned_sub_writes(
        snap,
        db=None,
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
    )
    assert err == "snapshot_missing_revision"
    assert rows is None


def test_refunds_blocks_unchanged_under_per_method(db_session: Session) -> None:
    """schema_version 1 sans ventilation dict → mono-ligne REVENUE (migration / compat)."""
    rev = _insert_revision(db_session)
    snap = _snap_base(by_pm={"cash": 10.0}, rev_id=str(rev.id), rc=3.0, rp=2.0, schema_version=1)
    enr = _enr(snap)
    rows, err, _ = build_cash_session_close_batch_from_enriched_payload(
        enr,
        batch_idempotency_key="cash_session_close:pm2",
        db=db_session,
    )
    assert err is None and rows is not None
    assert rows[1][0]["amount"] == 3.0 and rows[1][1] is not None
    assert rows[1][1].get("type") == "REVENUE"
    assert rows[2][0]["amount"] == 2.0 and rows[2][1] is not None


def test_schema_v2_refunds_per_pm_advanced_and_balanced(db_session: Session) -> None:
    rev = _insert_revision(db_session)
    snap = _snap_base(
        by_pm={"cash": 10.0, "card": 5.0},
        rev_id=str(rev.id),
        rc=7.0,
        rp=0.0,
        schema_version=2,
        rc_by_pm={"cash": 3.0, "card": 4.0},
        rp_by_pm={},
    )
    enr = _enr(snap)
    rows, err, _ = build_cash_session_close_batch_from_enriched_payload(
        enr,
        batch_idempotency_key="cash_session_close:v2-ref",
        db=db_session,
    )
    assert err is None and rows is not None
    assert rows[1][0]["kind"] == SUB_KIND_REFUNDS_CURRENT_PER_PM_V1
    body1 = rows[1][1]
    assert body1 is not None and body1.get("type") == "ADVANCED"
    lines = body1.get("lines") or []
    td = sum(float(x.get("debit") or 0) for x in lines)
    tc = sum(float(x.get("credit") or 0) for x in lines)
    assert abs(td - tc) <= 0.01
    cr511 = sum(float(x.get("credit") or 0) for x in lines if x.get("account") == "511")
    cr512 = sum(float(x.get("credit") or 0) for x in lines if x.get("account") == "512")
    assert cr511 == pytest.approx(3.0)
    assert cr512 == pytest.approx(4.0)
    db707 = sum(float(x.get("debit") or 0) for x in lines if x.get("account") == "7070")
    assert db707 == pytest.approx(7.0)
    assert rows[2][0]["kind"] == SUB_KIND_REFUNDS_PRIOR_CLOSED_PER_PM_V1
    assert rows[2][1] is None


def test_schema_v2_prior_refunds_per_pm_debit_672(db_session: Session) -> None:
    rev = _insert_revision(db_session)
    snap = _snap_base(
        by_pm={"cash": 20.0},
        rev_id=str(rev.id),
        rc=0.0,
        rp=5.0,
        schema_version=2,
        rc_by_pm={},
        rp_by_pm={"cash": 5.0},
    )
    enr = _enr(snap)
    rows, err, _ = build_cash_session_close_batch_from_enriched_payload(
        enr,
        batch_idempotency_key="cash_session_close:v2-n1",
        db=db_session,
    )
    assert err is None and rows
    body2 = rows[2][1]
    assert body2 is not None and body2.get("type") == "ADVANCED"
    lines = body2.get("lines") or []
    d672 = sum(float(x.get("debit") or 0) for x in lines if x.get("account") == "672")
    assert d672 == pytest.approx(5.0)
    cr511 = sum(float(x.get("credit") or 0) for x in lines if x.get("account") == "511")
    assert cr511 == pytest.approx(5.0)


def test_schema_v2_scalar_refund_without_dict_falls_back_to_revenue_mono(db_session: Session) -> None:
    """schema_version 2 mais dicts vides / incohérents : repli REVENUE (compat outbox historique)."""
    rev = _insert_revision(db_session)
    snap = _snap_base(
        by_pm={"cash": 10.0},
        rev_id=str(rev.id),
        rc=3.0,
        rp=0.0,
        schema_version=2,
        rc_by_pm={},
        rp_by_pm={},
    )
    enr = _enr(snap)
    rows, err, _ = build_cash_session_close_batch_from_enriched_payload(
        enr,
        batch_idempotency_key="cash_session_close:v2-fallback",
        db=db_session,
    )
    assert err is None and rows
    assert rows[1][0]["kind"] == SUB_KIND_REFUNDS_CURRENT
    assert rows[1][1] is not None and rows[1][1].get("type") == "REVENUE"


def test_schema_v1_opt_in_non_empty_refund_dict_uses_per_pm_adv(db_session: Session) -> None:
    """schema_version 1 + dicts remboursement présents → même ventilation ADVANCED que v2 (migration partielle)."""
    rev = _insert_revision(db_session)
    snap = _snap_base(
        by_pm={"cash": 10.0},
        rev_id=str(rev.id),
        rc=2.0,
        rp=0.0,
        schema_version=1,
        rc_by_pm={"cash": 2.0},
    )
    enr = _enr(snap)
    rows, err, _ = build_cash_session_close_batch_from_enriched_payload(
        enr,
        batch_idempotency_key="cash_session_close:v1-opt",
        db=db_session,
    )
    assert err is None and rows
    assert rows[1][0]["kind"] == SUB_KIND_REFUNDS_CURRENT_PER_PM_V1
    assert rows[1][1] is not None and rows[1][1].get("type") == "ADVANCED"


def test_schema_v2_idempotency_sub_keys_distinct_from_legacy_refund_kinds(db_session: Session) -> None:
    rev = _insert_revision(db_session)
    snap = _snap_base(
        by_pm={"cash": 10.0},
        rev_id=str(rev.id),
        rc=2.0,
        rp=0.0,
        schema_version=2,
        rc_by_pm={"cash": 2.0},
    )
    enr = _enr(snap)
    pm, err, _ = build_cash_session_close_batch_from_enriched_payload(
        enr,
        batch_idempotency_key="idem-v2",
        db=db_session,
    )
    assert err is None and pm
    assert pm[1][0]["kind"] == SUB_KIND_REFUNDS_CURRENT_PER_PM_V1
    k1 = sub_write_idempotency_key("idem-v2", 1, pm[1][0]["kind"])
    k_legacy = sub_write_idempotency_key("idem-v2", 1, SUB_KIND_REFUNDS_CURRENT)
    assert k1 != k_legacy


def test_merge_state_refund_per_pm_kind_mismatch_resets_sub_write(db_session: Session) -> None:
    """Ancien état batch (kind legacy index 1) ne fusionne pas avec le plan v2 (nouveau kind) — pas de double livraison."""
    rev = _insert_revision(db_session)
    snap = _snap_base(
        by_pm={"cash": 5.0},
        rev_id=str(rev.id),
        rc=1.0,
        rp=0.0,
        schema_version=2,
        rc_by_pm={"cash": 1.0},
    )
    enr = _enr(snap)
    rows, err, _ = build_cash_session_close_batch_from_enriched_payload(
        enr,
        batch_idempotency_key="cash_session_close:merge-rf",
        db=db_session,
    )
    assert err is None and rows
    prev = {
        "schema_version": 1,
        "batch_idempotency_key": "cash_session_close:merge-rf",
        "sub_writes": [
            {
                "index": 1,
                "kind": SUB_KIND_REFUNDS_CURRENT,
                "idempotency_sub_key": sub_write_idempotency_key(
                    "cash_session_close:merge-rf",
                    1,
                    SUB_KIND_REFUNDS_CURRENT,
                ),
                "status": "delivered",
                "remote_transaction_id": "legacy-tx",
                "last_http_status": 200,
                "last_error": None,
            },
        ],
    }
    merged = merge_state_with_planned(
        prev,
        batch_idempotency_key="cash_session_close:merge-rf",
        planned=rows,
    )
    sw1 = next(s for s in merged["sub_writes"] if s["index"] == 1)
    assert sw1["kind"] == SUB_KIND_REFUNDS_CURRENT_PER_PM_V1
    assert sw1.get("remote_transaction_id") != "legacy-tx"


def test_idempotency_sub_key_uses_per_pm_kind(db_session: Session) -> None:
    rev = _insert_revision(db_session)
    snap = _snap_base(by_pm={"cash": 5.0}, rev_id=str(rev.id))
    enr = _enr(snap)
    pm, err, _ = build_cash_session_close_batch_from_enriched_payload(
        enr,
        batch_idempotency_key="same",
        db=db_session,
    )
    assert err is None and pm
    assert pm[0][0]["kind"] == SUB_KIND_SALES_DONATIONS_PER_PM
    k = sub_write_idempotency_key("same", 0, pm[0][0]["kind"])
    assert SUB_KIND_SALES_DONATIONS_PER_PM in k


def test_per_method_observability_ac5_minimum_fields(db_session: Session) -> None:
    """AC5 : code moyen, montant, line_index par ligne ventilée ; id sous-écriture sur l’entrée batch."""
    rev = _insert_revision(db_session)
    snap = _snap_base(by_pm={"cash": 40.0, "card": 20.0}, rev_id=str(rev.id), donation=5.0)
    enr = _enr(snap)
    rows, err, _ = build_cash_session_close_batch_from_enriched_payload(
        enr,
        batch_idempotency_key="cash_session_close:ac5",
        db=db_session,
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


def test_per_method_observability_transfer_and_card_distinct(db_session: Session) -> None:
    """Snapshot aligné agrégat réel : trois codes (cash + deux BANK) → trois lignes ventilées observables."""
    rev_snap = _revision_snapshot()
    rev_snap["payment_methods"] = [
        *rev_snap["payment_methods"],
        {
            "code": "transfer",
            "label": "Virement",
            "active": True,
            "kind": "bank",
            "paheko_debit_account": "5121",
            "paheko_refund_credit_account": "5121",
        },
    ]
    max_seq = db_session.query(func.max(AccountingConfigRevision.revision_seq)).scalar()
    next_seq = (max_seq or 0) + 1
    rev = AccountingConfigRevision(
        revision_seq=next_seq,
        snapshot_json=json.dumps(rev_snap),
        note="pytest-23-1-dual-bank",
    )
    db_session.add(rev)
    db_session.commit()
    db_session.refresh(rev)

    snap = _snap_base(
        by_pm={"cash": 10.0, "transfer": 40.0, "card": 25.0},
        rev_id=str(rev.id),
        donation=0.0,
    )
    snap["totals"]["payment_transaction_line_count"] = 3
    enr = _enr(snap)
    rows, err, _ = build_cash_session_close_batch_from_enriched_payload(
        enr,
        batch_idempotency_key="cash_session_close:dual-bank-pm",
        db=db_session,
    )
    assert err is None and rows
    st = initial_batch_state_v1(batch_idempotency_key="cash_session_close:dual-bank-pm", planned=rows)
    obs_lines = (st["sub_writes"][0].get("observability") or {}).get("lines") or []
    codes_with_pm = {ln.get("payment_method_code") for ln in obs_lines if ln.get("payment_method_code")}
    assert codes_with_pm == {"cash", "transfer", "card"}
    body0 = rows[0][1]
    assert body0 is not None and body0.get("type") == "ADVANCED"
    adv_lines = body0.get("lines") or []
    td = sum(float(x.get("debit") or 0) for x in adv_lines)
    tc = sum(float(x.get("credit") or 0) for x in adv_lines)
    assert abs(td - tc) <= 0.01
