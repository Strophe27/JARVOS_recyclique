"""
ARCH-04 — réception : export ticket CSV (présentation hors routeur).
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock
from urllib.parse import urlparse, parse_qs
from uuid import UUID, uuid4

from recyclic_api.application.reception_ticket_export_presentation import (
    build_reception_ticket_download_json,
    reception_ticket_csv_filename,
    render_reception_ticket_csv_bytes,
)
from recyclic_api.core.config import settings
from recyclic_api.utils.report_tokens import verify_download_token


def _ticket_stub(
    *,
    tid: UUID | None = None,
    benevole_username: str = "alice@test.com",
    created_at: datetime | None = None,
) -> SimpleNamespace:
    tid = tid or uuid4()
    created_at = created_at or datetime(2025, 6, 15, 14, 30, 45, tzinfo=timezone.utc)
    benevole = SimpleNamespace(username=benevole_username, full_name=None)
    return SimpleNamespace(
        id=tid,
        poste_id=uuid4(),
        benevole=benevole,
        created_at=created_at,
        closed_at=None,
        status="closed",
        lignes=[],
    )


def test_reception_ticket_csv_filename_format():
    tid = UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
    ticket = _ticket_stub(tid=tid)
    name = reception_ticket_csv_filename(ticket)
    assert name.startswith("rapport_reception_20250615_alice@test.com_aaaaaaaa_143045")
    assert name.endswith(".csv")


def test_build_reception_ticket_download_json_contract():
    filename = "rapport_reception_20250101_user_abc12345_120000.csv"
    tid = str(uuid4())
    body = build_reception_ticket_download_json(tid, filename, ttl_seconds=60)
    assert body["filename"] == filename
    assert body["expires_in_seconds"] == 60
    _prefix = settings.API_V1_STR.rstrip("/")
    assert f"{_prefix}/reception/tickets/{tid}/export-csv" in body["download_url"]
    parsed = urlparse(body["download_url"])
    qs = parse_qs(parsed.query)
    assert "token" in qs
    assert verify_download_token(qs["token"][0], filename)


def test_render_reception_ticket_csv_bytes_empty_ticket():
    ticket = _ticket_stub()
    service = MagicMock()
    service._calculate_ticket_totals.return_value = (0, Decimal("0"), Decimal("0"), Decimal("0"), Decimal("0"))

    raw, fname = render_reception_ticket_csv_bytes(ticket, service)
    assert fname == reception_ticket_csv_filename(ticket)
    text = raw.decode("utf-8-sig")
    assert "=== RÉSUMÉ DU TICKET DE RÉCEPTION ===" in text
    assert "=== DÉTAILS DES LIGNES DE DÉPÔT ===" in text
    assert str(ticket.id) in text
    service._calculate_ticket_totals.assert_called_once_with(ticket)


def test_download_json_token_matches_export_filename():
    """Le token est lié au même ``filename`` que celui utilisé à l'export (pas de divergence)."""
    ticket = _ticket_stub()
    filename = reception_ticket_csv_filename(ticket)
    body = build_reception_ticket_download_json(str(ticket.id), filename, ttl_seconds=60)
    token = parse_qs(urlparse(body["download_url"]).query)["token"][0]
    assert verify_download_token(token, filename)
    assert body["filename"] == filename
