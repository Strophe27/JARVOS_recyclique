"""Story 2.5 — audit : masquage details, types caisse, échec persistance audit."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from recyclic_api.core.audit import (
    log_audit,
    log_cash_session_closing,
    merge_critical_audit_fields,
    sanitize_audit_details,
)
from recyclic_api.models.audit_log import AuditActionType


def test_sanitize_audit_details_redacts_sensitive_keys():
    raw = {
        "user_id": "u1",
        "password": "secret",
        "nested": {"refresh_token": "tok", "ok": 1},
    }
    out = sanitize_audit_details(raw)
    assert out["user_id"] == "u1"
    assert out["password"] == "[REDACTED]"
    assert out["nested"]["refresh_token"] == "[REDACTED]"
    assert out["nested"]["ok"] == 1


def test_sanitize_audit_details_redacts_pin_and_access_token_keys():
    """AC2 — aucun PIN / token en clair dans details_json (convention clés sensibles)."""
    raw = {
        "step_up_pin": "1234",
        "access_token": "bear",
        "meta": {"session_cookie": "sid"},
    }
    out = sanitize_audit_details(raw)
    assert out["step_up_pin"] == "[REDACTED]"
    assert out["access_token"] == "[REDACTED]"
    assert out["meta"]["session_cookie"] == "[REDACTED]"


def test_merge_critical_audit_fields_orders_context():
    d = merge_critical_audit_fields(
        {"foo": 1},
        request_id="rid",
        operation="op",
        outcome="success",
        site_id="s",
        cash_register_id="r",
        session_id="sess",
        user_id="u",
    )
    assert d["request_id"] == "rid"
    assert d["operation"] == "op"
    assert d["outcome"] == "success"
    assert d["site_id"] == "s"
    assert d["cash_register_id"] == "r"
    assert d["session_id"] == "sess"
    assert d["user_id"] == "u"
    assert d["foo"] == 1


@patch("recyclic_api.core.audit.log_audit")
def test_log_cash_session_closing_typed_action_and_refused(mock_log_audit):
    db = MagicMock()
    log_cash_session_closing(
        user_id="u1",
        username="alice",
        session_id="550e8400-e29b-41d4-a716-446655440000",
        closing_amount=10.0,
        success=False,
        outcome="refused",
        db=db,
        request_id="req-xyz",
        site_id="s1",
        cash_register_id="r1",
    )
    mock_log_audit.assert_called_once()
    kwargs = mock_log_audit.call_args.kwargs
    assert kwargs["action_type"] == AuditActionType.CASH_SESSION_CLOSED
    det = kwargs["details"]
    assert det["request_id"] == "req-xyz"
    assert det["operation"] == "cash_session.close"
    assert det["outcome"] == "refused"
    assert det["site_id"] == "s1"
    assert det["cash_register_id"] == "r1"


def test_log_audit_failure_uses_logger_not_print(caplog):
    db = MagicMock()
    db.add.side_effect = RuntimeError("boom")
    with caplog.at_level("ERROR", logger="recyclic_api.core.audit"):
        result = log_audit(
            action_type=AuditActionType.LOGIN_SUCCESS,
            actor=None,
            details={"user_id": "x"},
            db=db,
        )
    assert result is None
    db.rollback.assert_called_once()
    assert "audit_persist_failed" in caplog.text
    assert "exc_type=RuntimeError" in caplog.text
