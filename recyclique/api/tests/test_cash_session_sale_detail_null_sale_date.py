"""Régression : détail session / schéma SaleDetail avec sale_date NULL (legacy, ORM nullable)."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

from recyclic_api.schemas.cash_session import SaleDetail


def test_sale_detail_model_validate_accepts_null_sale_date() -> None:
    """GET /cash-sessions/{id} sérialise les ventes dont sale_date est NULL en base."""
    sale = SimpleNamespace(
        id=uuid4(),
        total_amount=10.0,
        donation=None,
        payment_method=None,
        payments=None,
        sale_date=None,
        created_at=datetime.now(timezone.utc),
        operator_id=None,
        operator_name=None,
        note=None,
        lifecycle_status="completed",
    )
    detail = SaleDetail.model_validate(sale)
    assert detail.sale_date is None
    assert detail.id == str(sale.id)
    assert detail.total_amount == 10.0


def test_sale_detail_model_validate_preserves_explicit_sale_date() -> None:
    ts = datetime(2024, 6, 1, 12, 0, tzinfo=timezone.utc)
    sale = SimpleNamespace(
        id=uuid4(),
        total_amount=5.0,
        donation=None,
        payment_method="cash",
        payments=None,
        sale_date=ts,
        created_at=datetime.now(timezone.utc),
        operator_id=None,
        operator_name=None,
        note=None,
        lifecycle_status="completed",
    )
    detail = SaleDetail.model_validate(sale)
    assert detail.sale_date == ts
