"""Story 22.5 — résolution « exercice courant » vs « antérieur clos » sans inférence (AC 5–6)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.core.exceptions import ConflictError, ValidationError
from recyclic_api.models.accounting_period_authority import AccountingPeriodAuthoritySnapshot


class RefundFiscalBranch(str, Enum):
    CURRENT = "current"
    PRIOR_CLOSED = "prior_closed"


@dataclass(frozen=True)
class AccountingAuthorityView:
    branch: RefundFiscalBranch
    sale_fiscal_year: int
    current_open_fiscal_year: int
    source: str
    snapshot_version: int


def _sale_booking_datetime(sale_date: datetime | None, created_at: datetime | None) -> datetime:
    if sale_date is not None:
        return sale_date if sale_date.tzinfo else sale_date.replace(tzinfo=timezone.utc)
    if created_at is not None:
        return created_at if created_at.tzinfo else created_at.replace(tzinfo=timezone.utc)
    raise ValidationError("Impossible de déterminer la date de rattachement comptable de la vente source.")


def _calendar_fiscal_year(d: datetime) -> int:
    """Hypothèse Story 22.5 : année civile (alignement backlog ; affinage fiscal ultérieur)."""
    return int(d.year)


class AccountingPeriodAuthorityService:
    """Lecture snapshot DB ; fraîcheur via ``ACCOUNTING_PERIOD_AUTHORITY_MAX_AGE_SECONDS``."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def resolve_refund_branch(self, *, sale_date: datetime | None, created_at: datetime | None) -> AccountingAuthorityView:
        row = self.db.query(AccountingPeriodAuthoritySnapshot).first()
        if row is None:
            raise ConflictError(
                "[ACCOUNTING_PERIOD_AUTHORITY_UNAVAILABLE] "
                "Aucune autorité comptable locale sur les exercices — impossible de trancher un remboursement "
                "sans supposer une clôture (Story 22.5). Importez ou synchronisez l'état depuis Paheko, "
                "ou publiez un instantané serveur."
            )

        now = datetime.now(timezone.utc)
        fetched = row.fetched_at if row.fetched_at.tzinfo else row.fetched_at.replace(tzinfo=timezone.utc)
        age_sec = (now - fetched).total_seconds()
        if age_sec > float(settings.ACCOUNTING_PERIOD_AUTHORITY_MAX_AGE_SECONDS):
            raise ConflictError(
                "[ACCOUNTING_PERIOD_AUTHORITY_STALE] "
                f"L'autorité sur les exercices clos est périmée (âge {int(age_sec)}s, "
                f"max {int(settings.ACCOUNTING_PERIOD_AUTHORITY_MAX_AGE_SECONDS)}s). "
                "Rafraîchir la source Paheko ou l'instantané local avant tout remboursement."
            )

        booking = _sale_booking_datetime(sale_date, created_at)
        fy = _calendar_fiscal_year(booking)
        open_y = int(row.current_open_fiscal_year)

        if fy > open_y:
            raise ValidationError(
                "Date de vente incompatible avec l'exercice ouvert connu (autorité comptable) — données incohérentes."
            )

        fb = RefundFiscalBranch.PRIOR_CLOSED if fy < open_y else RefundFiscalBranch.CURRENT
        return AccountingAuthorityView(
            branch=fb,
            sale_fiscal_year=fy,
            current_open_fiscal_year=open_y,
            source=row.source,
            snapshot_version=int(row.version or 1),
        )
