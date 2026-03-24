"""
ARCH-04 — présentation post-fermeture (rapport CSV, URL, email, enrichissement).
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from recyclic_api.application.cash_session_closing import CloseCashSessionOutcome
from recyclic_api.application.cash_session_close_presentation import (
    present_close_cash_session_outcome,
)
from recyclic_api.schemas.cash_session import CashSessionResponse, CashSessionStatus


def test_present_empty_session_returns_deleted_json():
    db = MagicMock()
    service = MagicMock()
    sid = str(uuid4())
    outcome = CloseCashSessionOutcome(closed_session=None, session_id=sid)

    resp = present_close_cash_session_outcome(db=db, service=service, outcome=outcome)

    assert resp.status_code == 200
    body = json.loads(resp.body.decode())
    assert body == {
        "message": "Session vide non enregistrée",
        "session_id": sid,
        "deleted": True,
    }


@patch("recyclic_api.api.api_v1.endpoints.cash_sessions.generate_cash_session_report")
@patch("recyclic_api.application.cash_session_close_presentation.generate_download_token")
@patch("recyclic_api.application.cash_session_close_presentation.enrich_session_response")
@patch("recyclic_api.application.cash_session_close_presentation.settings")
def test_present_closed_session_sets_report_url_and_skips_email_without_recipient(
    mock_settings,
    mock_enrich,
    mock_token,
    mock_report,
    tmp_path,
):
    mock_settings.API_V1_STR = "/api/v1"
    mock_settings.CASH_SESSION_REPORT_RECIPIENT = ""
    mock_settings.CASH_SESSION_REPORT_TOKEN_TTL_SECONDS = 3600

    csv_path = tmp_path / "report_session.csv"
    csv_path.write_bytes(b"a,b\n")
    mock_report.return_value = csv_path
    mock_token.return_value = "tok123"

    closed = SimpleNamespace(
        id=uuid4(),
        operator_id=uuid4(),
        operator=None,
        actual_amount=10.0,
        closing_amount=None,
        initial_amount=5.0,
    )
    outcome = CloseCashSessionOutcome(
        closed_session=closed, session_id=str(closed.id)
    )

    opened = datetime(2025, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    closed_at = datetime(2025, 1, 1, 18, 0, 0, tzinfo=timezone.utc)
    base = CashSessionResponse(
        id=str(closed.id),
        operator_id=str(closed.operator_id),
        site_id=str(uuid4()),
        initial_amount=5.0,
        current_amount=10.0,
        status=CashSessionStatus.CLOSED,
        opened_at=opened,
        closed_at=closed_at,
        register_options={},
    )
    mock_enrich.return_value = base

    db = MagicMock()
    service = MagicMock()

    result = present_close_cash_session_outcome(db=db, service=service, outcome=outcome)

    assert isinstance(result, CashSessionResponse)
    assert (
        result.report_download_url
        == "/api/v1/admin/reports/cash-sessions/report_session.csv?token=tok123"
    )
    assert result.report_email_sent is False
    mock_report.assert_called_once_with(db, closed)
    mock_enrich.assert_called_once_with(closed, service)
