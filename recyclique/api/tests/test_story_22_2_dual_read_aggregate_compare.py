"""Story 22.2 — double lecture / comparaison agrégats legacy vs journal canonique."""

from __future__ import annotations

import uuid
from typing import Any
from datetime import datetime, timezone

import pytest
from sqlalchemy import text

from recyclic_api.core.config import settings
from recyclic_api.core.security import create_access_token
from recyclic_api.models.cash_register import CashRegister
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.payment_method import PaymentMethodDefinition, PaymentMethodKind
from recyclic_api.models.payment_transaction import (
    PaymentTransaction,
    PaymentTransactionDirection,
    PaymentTransactionNature,
)
from recyclic_api.models.sale import PaymentMethod, Sale, SaleLifecycleStatus
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.schemas.accounting_dual_read import DualReadTaxonomy
from recyclic_api.schemas.cash_session_close_snapshot import CashSessionJournalTotalsV1
from recyclic_api.services.cash_session_dual_read_service import (
    _digest_frozen_snapshot,
    build_dual_read_compare_report,
)
from recyclic_api.services.cash_session_journal_snapshot import compute_payment_journal_aggregates
from tests.caisse_sale_eligibility import grant_user_caisse_sale_eligibility

_V1 = settings.API_V1_STR.rstrip("/")
_EXPERT = f"{_V1}/admin/accounting-expert"

# Matrice minimale AC5 — UUID déterministes (uuid5) documentés story + preuves pytest
_NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")
MATRIX_SIMPLE = uuid.uuid5(_NS, "22-2-matrix-simple-payment")
MATRIX_MIXED = uuid.uuid5(_NS, "22-2-matrix-mixed-payments")
MATRIX_DONATION_SURPLUS = uuid.uuid5(_NS, "22-2-matrix-donation-surplus")
MATRIX_GRATUITY = uuid.uuid5(_NS, "22-2-matrix-gratuity")
MATRIX_REFUND_CURRENT = uuid.uuid5(_NS, "22-2-matrix-refund-current")
MATRIX_REFUND_PRIOR = uuid.uuid5(_NS, "22-2-matrix-refund-prior-closed")
MATRIX_HISTORICAL_GAP = uuid.uuid5(_NS, "22-2-matrix-historical-no-journal")
MATRIX_ADMIN_HTTP = uuid.uuid5(_NS, "22-2-matrix-admin-http")
MATRIX_DENORM = uuid.uuid5(_NS, "22-2-matrix-denorm-drift")
MATRIX_FROZEN_LINE_ONLY = uuid.uuid5(_NS, "22-2-frozen-snapshot-line-only")
MATRIX_HTTP_FORBIDDEN = uuid.uuid5(_NS, "22-2-matrix-http-forbidden-role")
MATRIX_FROZEN_UNREADABLE_TOTALS = uuid.uuid5(_NS, "22-2-frozen-unreadable-totals")
UNKNOWN_SESSION_HTTP = uuid.uuid5(_NS, "22-2-unknown-session-not-seeded")


def _item_block(price: float = 12.0):
    return {
        "category": "EEE-1",
        "quantity": 1,
        "weight": 1.0,
        "unit_price": price,
        "total_price": price,
    }


def _seed_pm_definitions(db_session):
    for code, order in (("cash", 10), ("check", 20), ("card", 30)):
        db_session.add(
            PaymentMethodDefinition(
                id=uuid.uuid4(),
                code=code,
                label=code,
                active=True,
                kind=PaymentMethodKind.CASH if code == "cash" else PaymentMethodKind.BANK,
                paheko_debit_account="530",
                paheko_refund_credit_account="530",
                display_order=order,
            )
        )


def _open_session_with_id(db_session, session_id: uuid.UUID) -> User:
    site = Site(
        id=uuid.uuid4(),
        name="S22.2 site",
        address="x",
        city="Paris",
        postal_code="75000",
        country="FR",
    )
    cashier = User(
        id=uuid.uuid4(),
        username=f"s222_{uuid.uuid4().hex[:8]}",
        hashed_password="x",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
        site_id=site.id,
    )
    register = CashRegister(
        id=uuid.uuid4(),
        name="Reg",
        location="Accueil",
        site_id=site.id,
        is_active=True,
    )
    session = CashSession(
        id=session_id,
        operator_id=cashier.id,
        site_id=site.id,
        register_id=register.id,
        initial_amount=50.0,
        current_amount=50.0,
        status=CashSessionStatus.OPEN,
    )
    db_session.add_all([site, cashier, register, session])
    db_session.commit()
    grant_user_caisse_sale_eligibility(db_session, cashier, site.id)
    _seed_pm_definitions(db_session)
    db_session.commit()
    return cashier


def test_matrix_simple_payment_report_struct(client, db_session):
    cashier = _open_session_with_id(db_session, MATRIX_SIMPLE)
    token = create_access_token(data={"sub": str(cashier.id)})
    r = client.post(
        "/v1/sales/",
        json={
            "cash_session_id": str(MATRIX_SIMPLE),
            "items": [_item_block(25.0)],
            "total_amount": 25.0,
            "payment_method": "cash",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text

    rep = build_dual_read_compare_report(db_session, MATRIX_SIMPLE)
    assert rep.legacy_brownfield.sum_sales_total_amount == pytest.approx(25.0)
    assert rep.canonical_journal.totals.payment_transaction_line_count >= 1
    # Clés journal = codes expert (jointure payment_method_id), alignés seed _seed_pm_definitions
    assert rep.canonical_journal.totals.by_payment_method_signed.get("cash") == pytest.approx(25.0)
    assert rep.cutover_indicator_ok is True
    assert rep.gap_findings == []


def test_matrix_mixed_payments_aligned(client, db_session):
    cashier = _open_session_with_id(db_session, MATRIX_MIXED)
    token = create_access_token(data={"sub": str(cashier.id)})
    r = client.post(
        "/v1/sales/",
        json={
            "cash_session_id": str(MATRIX_MIXED),
            "items": [_item_block(12.0)],
            "total_amount": 12.0,
            "payments": [
                {"payment_method": "cash", "amount": 5.0},
                {"payment_method": "check", "amount": 7.0},
            ],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    rep = build_dual_read_compare_report(db_session, MATRIX_MIXED)
    assert rep.journal_derived.sale_payment_inflow_sum == pytest.approx(12.0)
    by_pm = rep.canonical_journal.totals.by_payment_method_signed
    assert by_pm.get("cash") == pytest.approx(5.0)
    assert by_pm.get("check") == pytest.approx(7.0)
    assert rep.cutover_indicator_ok is True


def test_matrix_donation_surplus_has_model_gap_not_blocking(client, db_session):
    cashier = _open_session_with_id(db_session, MATRIX_DONATION_SURPLUS)
    token = create_access_token(data={"sub": str(cashier.id)})
    r = client.post(
        "/v1/sales/",
        json={
            "cash_session_id": str(MATRIX_DONATION_SURPLUS),
            "items": [_item_block(12.0)],
            "total_amount": 12.0,
            "payments": [{"payment_method": "cash", "amount": 10.0}],
            "donation_surplus": [{"payment_method": "cash", "amount": 2.0}],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    rep = build_dual_read_compare_report(db_session, MATRIX_DONATION_SURPLUS)
    kinds = {g.taxonomy for g in rep.gap_findings}
    assert DualReadTaxonomy.MODEL in kinds
    assert rep.cutover_indicator_ok is True
    assert all(not g.blocks_cutover for g in rep.gap_findings if g.taxonomy == DualReadTaxonomy.MODEL)


def test_matrix_gratuity_out_of_scope_not_blocking(client, db_session):
    cashier = _open_session_with_id(db_session, MATRIX_GRATUITY)
    token = create_access_token(data={"sub": str(cashier.id)})
    r = client.post(
        "/v1/sales/",
        json={
            "cash_session_id": str(MATRIX_GRATUITY),
            "items": [
                {
                    "category": "EEE-1",
                    "quantity": 1,
                    "weight": 1.0,
                    "unit_price": 0.0,
                    "total_price": 0.0,
                }
            ],
            "total_amount": 0.0,
            "payment_method": "free",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    rep = build_dual_read_compare_report(db_session, MATRIX_GRATUITY)
    assert any(g.taxonomy == DualReadTaxonomy.OUT_OF_SCOPE for g in rep.gap_findings)
    assert rep.cutover_indicator_ok is True


def test_matrix_historical_missing_journal_blocks_cutover(db_session):
    """Vente sans lignes journal — simule dette antérieure 22.1."""
    _open_session_with_id(db_session, MATRIX_HISTORICAL_GAP)
    session = db_session.query(CashSession).filter(CashSession.id == MATRIX_HISTORICAL_GAP).one()
    op = db_session.query(User).filter(User.id == session.operator_id).one()
    sale = Sale(
        cash_session_id=session.id,
        operator_id=op.id,
        total_amount=10.0,
        donation=0.0,
        payment_method=PaymentMethod.CASH,
        lifecycle_status=SaleLifecycleStatus.COMPLETED,
    )
    db_session.add(sale)
    session.total_sales = 10.0
    db_session.commit()

    rep = build_dual_read_compare_report(db_session, MATRIX_HISTORICAL_GAP)
    assert any(g.taxonomy == DualReadTaxonomy.HISTORICAL_DATA for g in rep.gap_findings)
    assert rep.cutover_indicator_ok is False


def test_matrix_refund_prior_closed_db_only(db_session):
    """Remboursement N−1 : cohérence agrégats journal vs lignes dérivées."""
    _open_session_with_id(db_session, MATRIX_REFUND_PRIOR)
    session = db_session.query(CashSession).filter(CashSession.id == MATRIX_REFUND_PRIOR).one()
    op = db_session.query(User).filter(User.id == session.operator_id).one()
    sale = Sale(
        cash_session_id=session.id,
        operator_id=op.id,
        total_amount=15.0,
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
            amount=15.0,
        )
    )
    db_session.add(
        PaymentTransaction(
            sale_id=sale.id,
            payment_method=PaymentMethod.CASH,
            nature=PaymentTransactionNature.REFUND_PAYMENT,
            direction=PaymentTransactionDirection.OUTFLOW,
            amount=4.0,
            is_prior_year_special_case=True,
        )
    )
    session.total_sales = 15.0
    db_session.commit()

    rep = build_dual_read_compare_report(db_session, MATRIX_REFUND_PRIOR)
    assert rep.canonical_journal.totals.refunds_prior_closed_fiscal_total == pytest.approx(4.0)
    assert rep.journal_derived.refund_outflow_sum_prior_closed == pytest.approx(4.0)
    assert rep.cutover_indicator_ok is True


def test_admin_dual_read_endpoint(client, super_admin_client, db_session):
    cashier = _open_session_with_id(db_session, MATRIX_ADMIN_HTTP)
    tok_sale = create_access_token(data={"sub": str(cashier.id)})
    pr = client.post(
        f"{_V1}/sales/",
        json={
            "cash_session_id": str(MATRIX_ADMIN_HTTP),
            "items": [_item_block(5.0)],
            "total_amount": 5.0,
            "payment_method": "cash",
        },
        headers={"Authorization": f"Bearer {tok_sale}"},
    )
    assert pr.status_code == 200, pr.text

    resp = super_admin_client.get(f"{_EXPERT}/cash-sessions/{MATRIX_ADMIN_HTTP}/dual-read-compare")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "legacy_brownfield" in body and "canonical_journal" in body
    assert "cutover_indicator_ok" in body


def test_admin_dual_read_endpoint_404_unknown_session(super_admin_client):
    r = super_admin_client.get(f"{_EXPERT}/cash-sessions/{UNKNOWN_SESSION_HTTP}/dual-read-compare")
    assert r.status_code == 404, r.text


def test_admin_dual_read_endpoint_403_non_super_admin(client, db_session):
    _open_session_with_id(db_session, MATRIX_HTTP_FORBIDDEN)
    session = db_session.query(CashSession).filter(CashSession.id == MATRIX_HTTP_FORBIDDEN).one()
    op = db_session.query(User).filter(User.id == session.operator_id).one()
    tok = create_access_token(data={"sub": str(op.id)})
    r = client.get(
        f"{_EXPERT}/cash-sessions/{MATRIX_HTTP_FORBIDDEN}/dual-read-compare",
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 403, r.text


def test_digest_frozen_snapshot_normalizes_uuid_sync_correlation_id():
    """`sync_correlation_id` hors JSON DB (objet UUID) → chaîne stable dans le digest."""
    cid = uuid.uuid4()
    tot = CashSessionJournalTotalsV1(
        by_payment_method_signed={"cash": 10.0},
        cash_signed_net_from_journal=10.0,
        payment_transaction_line_count=1,
    )

    class _Session:
        accounting_close_snapshot = {
            "sync_correlation_id": cid,
            "totals": tot.model_dump(mode="python"),
        }

    dig = _digest_frozen_snapshot(_Session())
    assert dig.present is True
    assert dig.sync_correlation_id == str(cid)
    assert dig.totals_from_snapshot is not None


def test_frozen_snapshot_line_only_gap_not_misleading_cash_delta(db_session):
    """Écart snapshot figé sur le nombre de lignes uniquement : finding dédié, pas d'écart cash si aligné."""
    _open_session_with_id(db_session, MATRIX_FROZEN_LINE_ONLY)
    session = db_session.query(CashSession).filter(CashSession.id == MATRIX_FROZEN_LINE_ONLY).one()
    op = db_session.query(User).filter(User.id == session.operator_id).one()
    sale = Sale(
        cash_session_id=session.id,
        operator_id=op.id,
        total_amount=20.0,
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
            amount=20.0,
        )
    )
    session.total_sales = 20.0
    db_session.commit()

    canon = compute_payment_journal_aggregates(
        db_session,
        cash_session_id=MATRIX_FROZEN_LINE_ONLY,
        use_legacy_preview_if_no_journal=False,
    )
    snap_totals = canon.model_copy(update={"payment_transaction_line_count": canon.payment_transaction_line_count + 4})
    cid = uuid.uuid4()
    session.accounting_close_snapshot = {
        "sync_correlation_id": str(cid),
        "totals": snap_totals.model_dump(mode="python"),
    }
    db_session.commit()

    rep = build_dual_read_compare_report(db_session, MATRIX_FROZEN_LINE_ONLY)
    assert rep.frozen_snapshot.sync_correlation_id == str(cid)
    keys = {g.metric_key for g in rep.gap_findings}
    assert "frozen_snapshot_line_count_vs_live_journal" in keys
    assert "frozen_snapshot_cash_signed_net_vs_live_journal" not in keys
    line_gap = next(g for g in rep.gap_findings if g.metric_key == "frozen_snapshot_line_count_vs_live_journal")
    assert line_gap.delta == pytest.approx(-4.0)
    assert rep.cutover_indicator_ok is False


def test_frozen_snapshot_unreadable_totals_blocks_cutover(client, db_session):
    """Snapshot 22.6 présent mais `totals` non dict → gap bloquant, pas d'indicateur vert."""
    cashier = _open_session_with_id(db_session, MATRIX_FROZEN_UNREADABLE_TOTALS)
    token = create_access_token(data={"sub": str(cashier.id)})
    r = client.post(
        "/v1/sales/",
        json={
            "cash_session_id": str(MATRIX_FROZEN_UNREADABLE_TOTALS),
            "items": [_item_block(25.0)],
            "total_amount": 25.0,
            "payment_method": "cash",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    session = db_session.query(CashSession).filter(CashSession.id == MATRIX_FROZEN_UNREADABLE_TOTALS).one()
    session.accounting_close_snapshot = {"totals": []}
    db_session.commit()

    rep = build_dual_read_compare_report(db_session, MATRIX_FROZEN_UNREADABLE_TOTALS)
    keys = {g.metric_key for g in rep.gap_findings}
    assert "frozen_snapshot_present_but_totals_unreadable" in keys
    assert rep.cutover_indicator_ok is False


def test_denormalized_session_total_sales_triggers_historical_gap(db_session):
    _open_session_with_id(db_session, MATRIX_DENORM)
    session = db_session.query(CashSession).filter(CashSession.id == MATRIX_DENORM).one()
    op = db_session.query(User).filter(User.id == session.operator_id).one()
    sale = Sale(
        cash_session_id=session.id,
        operator_id=op.id,
        total_amount=20.0,
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
            amount=20.0,
        )
    )
    session.total_sales = 999.0
    db_session.commit()
    rep = build_dual_read_compare_report(db_session, MATRIX_DENORM)
    assert any(g.metric_key == "session_total_sales_vs_sum_sale_total_amount" for g in rep.gap_findings)
    assert rep.cutover_indicator_ok is False


# --- Remboursement exercice courant (API réversal, aligné 22.5) ---


@pytest.fixture
def s225_like_session(db_session):
    site_id = uuid.uuid4()
    op_id = uuid.uuid4()
    site = Site(
        id=site_id,
        name="S222ref",
        address="a",
        city="c",
        postal_code="75000",
        country="FR",
    )
    user = User(
        id=op_id,
        username="cashier_s222r",
        hashed_password="x",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
        site_id=site_id,
    )
    session = CashSession(
        id=MATRIX_REFUND_CURRENT,
        operator_id=op_id,
        site_id=site_id,
        register_id=None,
        initial_amount=100.0,
        current_amount=100.0,
        status="open",
        opened_at=datetime.utcnow(),
    )
    db_session.add_all([site, user, session])
    db_session.commit()
    grant_user_caisse_sale_eligibility(db_session, user, site_id)
    _seed_pm_definitions(db_session)
    db_session.commit()
    from tests.caisse_sale_eligibility import (
        grant_user_caisse_refund_permission,
    )

    grant_user_caisse_refund_permission(db_session, user)

    token = create_access_token(data={"sub": str(op_id)})
    return {
        "token": token,
        "session_id": str(MATRIX_REFUND_CURRENT),
        "headers": {"Authorization": f"Bearer {token}"},
    }


def _ensure_fiscal_snapshot(db_session, *, year: int) -> None:
    rid = "00000000-0000-5000-8000-000000000001"
    ts = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    ct = db_session.execute(
        text("SELECT COUNT(*) FROM accounting_period_authority_snapshots WHERE id = :id"),
        {"id": rid},
    ).scalar()
    if ct == 0:
        db_session.execute(
            text(
                "INSERT INTO accounting_period_authority_snapshots "
                "(id, current_open_fiscal_year, fetched_at, source, version) "
                "VALUES (:id, :y, :ts, 'local_test', 1)"
            ),
            {"id": rid, "y": year, "ts": ts},
        )
    else:
        db_session.execute(
            text(
                "UPDATE accounting_period_authority_snapshots SET "
                "current_open_fiscal_year = :y, fetched_at = :ts WHERE id = :id"
            ),
            {"y": year, "ts": ts, "id": rid},
        )
    db_session.commit()
    db_session.expire_all()


def test_matrix_refund_current_reversal_aligned(client, db_session, s225_like_session):
    h = s225_like_session["headers"]
    sid = s225_like_session["session_id"]
    y = datetime.now(timezone.utc).year
    _ensure_fiscal_snapshot(db_session, year=y)

    r0 = client.post(
        f"{_V1}/sales/",
        json={
            "cash_session_id": sid,
            "items": [_item_block(30.0)],
            "total_amount": 30.0,
            "payment_method": "cash",
        },
        headers=h,
    )
    assert r0.status_code == 200, r0.text
    sale_id = r0.json()["id"]

    r1 = client.post(
        f"{_V1}/sales/reversals",
        json={"source_sale_id": sale_id, "reason_code": "RETOUR_ARTICLE", "refund_payment_method": "cash"},
        headers=h,
    )
    assert r1.status_code == 200, r1.text

    rep = build_dual_read_compare_report(db_session, MATRIX_REFUND_CURRENT)
    assert rep.canonical_journal.totals.refunds_current_fiscal_total == pytest.approx(30.0)
    assert rep.cutover_indicator_ok is True


def test_cutover_json_packaging_readable():
    from pathlib import Path

    p = (
        Path(__file__).resolve().parent.parent
        / "src"
        / "recyclic_api"
        / "data"
        / "epic22_cutover_criteria_v1.json"
    )
    assert p.is_file()
    import json

    data = json.loads(p.read_text(encoding="utf-8"))
    assert data["version"] == 1
    assert "validation_package" in data


def _collect_openapi_operation_ids(schema: dict[str, Any]) -> set[str]:
    out: set[str] = set()
    for _path, methods in (schema.get("paths") or {}).items():
        if not isinstance(methods, dict):
            continue
        for _m, op in methods.items():
            if isinstance(op, dict) and "operationId" in op:
                out.add(str(op["operationId"]))
    return out


def test_openapi_includes_accounting_expert_dual_read_compare_operation_id(
    openapi_schema: dict[str, Any],
) -> None:
    """operationId fige dans le OpenAPI genere par l'app (aligne contracts/openapi : accountingExpertDualReadCompare)."""
    ids = _collect_openapi_operation_ids(openapi_schema)
    assert "accountingExpertDualReadCompare" in ids
