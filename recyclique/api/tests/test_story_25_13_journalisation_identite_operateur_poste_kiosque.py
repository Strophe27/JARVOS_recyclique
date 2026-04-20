"""Story 25.13 — spec 25.4 §2.4 / ADR 25-2 : opérateur vs ancrage poste/caisse sur vente (PAYMENT_VALIDATED + audit).

Sous SQLite CI, ``log_audit`` peut être neutralisé (table ``audit_logs`` absente) : la preuve minimale
reste ``PAYMENT_VALIDATED`` dans ``transactions.log`` ; PostgreSQL valide en plus ``AuditLog``.
"""

from __future__ import annotations

import json
import time

import pytest
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.core.logging import TRANSACTION_LOG_FILE, shutdown_transaction_logger
from recyclic_api.models.audit_log import AuditActionType, AuditLog
from recyclic_api.models.cash_session import CashSession
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.services.cash_session_service import CashSessionService

from tests.api_v1_paths import v1

_SALES = v1("/sales/")


@pytest.fixture(autouse=True)
def _reset_transaction_logger():
    shutdown_transaction_logger()
    if TRANSACTION_LOG_FILE.exists():
        TRANSACTION_LOG_FILE.write_text("", encoding="utf-8")
    yield
    shutdown_transaction_logger()


def _read_payment_validated_logs() -> list[dict]:
    if not TRANSACTION_LOG_FILE.exists():
        return []
    out: list[dict] = []
    for line in TRANSACTION_LOG_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        if row.get("event") == "PAYMENT_VALIDATED":
            out.append(row)
    return out


def _wait_last_payment_validated(*, session_id: str, timeout: float = 3.0) -> dict | None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        logs = _read_payment_validated_logs()
        scoped = [x for x in logs if x.get("session_id") == session_id]
        if scoped:
            return scoped[-1]
        time.sleep(0.05)
    scoped = [x for x in _read_payment_validated_logs() if x.get("session_id") == session_id]
    return scoped[-1] if scoped else None


def test_sale_path_distinguishes_operator_from_register_in_logs_and_audit(
    admin_client,
    db_session: Session,
) -> None:
    """Vente caisse : PAYMENT_VALIDATED et CASH_SALE_RECORDED portent operator_user_id ≠ sens cash_register_id."""
    admin = db_session.query(User).filter(User.role == UserRole.ADMIN).order_by(User.id.desc()).first()
    assert admin is not None

    site = Site(name="S2513", address="adr")
    db_session.add(site)
    db_session.commit()
    db_session.refresh(site)

    svc = CashSessionService(db_session)
    session = svc.create_session(
        operator_id=str(admin.id),
        site_id=str(site.id),
        initial_amount=50.0,
    )
    db_session.refresh(session)
    assert session.register_id is not None

    payload = {
        "cash_session_id": str(session.id),
        "items": [
            {
                "category": "EEE-3",
                "quantity": 1,
                "weight": 1.0,
                "unit_price": 5.0,
                "total_price": 5.0,
            }
        ],
        "total_amount": 5.0,
        "donation": 0.0,
        "payment_method": "cash",
    }
    res = admin_client.post(_SALES, json=payload)
    assert res.status_code == 200, res.text

    tx = _wait_last_payment_validated(session_id=str(session.id))
    assert tx is not None, "PAYMENT_VALIDATED attendu dans transactions.log"
    assert tx["operator_user_id"] == str(admin.id)
    assert tx["user_id"] == str(admin.id)
    assert tx.get("site_id") == str(site.id)
    reg_id = str(session.register_id)
    assert tx.get("cash_register_id") == reg_id
    assert tx["operator_user_id"] != reg_id

    # Sous SQLite, conftest neutralise ``log_audit`` (table audit_logs absente) — la preuve
    # bout-en-bout reste ``PAYMENT_VALIDATED`` ; PostgreSQL valide en plus la persistance audit.
    if not settings.DATABASE_URL.startswith("sqlite"):
        audit_row = (
            db_session.query(AuditLog)
            .filter(AuditLog.action_type == AuditActionType.CASH_SALE_RECORDED.value)
            .order_by(AuditLog.timestamp.desc())
            .first()
        )
        assert audit_row is not None
        details = audit_row.details_json or {}
        assert details.get("operator_user_id") == str(admin.id)
        assert details.get("cash_register_id") == reg_id
        assert details.get("operator_user_id") != details.get("cash_register_id")
