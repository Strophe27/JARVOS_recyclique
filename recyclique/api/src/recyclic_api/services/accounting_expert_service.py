"""Story 22.3 — service paramétrage comptable expert (révisions, moyens, comptes globaux)."""

from __future__ import annotations

import json
import re
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from recyclic_api.core.exceptions import ConflictError, NotFoundError, ValidationError
from recyclic_api.models.accounting_config import (
    GLOBAL_ACCOUNTING_SETTINGS_ROW_ID,
    AccountingConfigRevision,
    GlobalAccountingSettings,
)
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.payment_method import PaymentMethodDefinition, PaymentMethodKind
from recyclic_api.models.payment_transaction import PaymentTransaction
from recyclic_api.models.sale import Sale

_GLOBAL_SETTINGS_ID_STR = str(GLOBAL_ACCOUNTING_SETTINGS_ROW_ID)

_PAHEKO_ACCOUNT_RE = re.compile(r"^[0-9A-Za-z._-]{1,32}$")


def validate_paheko_account_code(value: str) -> None:
    if not _PAHEKO_ACCOUNT_RE.match(value):
        raise ValidationError("Code compte Paheko invalide (1–32 caractères alphanumériques, . _ -)")


def _validate_min_max_amounts(min_amount: Optional[float], max_amount: Optional[float]) -> None:
    """Si les deux bornes sont renseignées, impose min_amount <= max_amount (sinon ou les deux nuls : OK)."""
    if min_amount is not None and max_amount is not None and min_amount > max_amount:
        raise ValidationError("min_amount doit être inférieur ou égal à max_amount")


class AccountingExpertService:
    def __init__(self, db: Session):
        self.db = db

    def _ensure_global_row(self) -> GlobalAccountingSettings:
        row = self.db.query(GlobalAccountingSettings).filter(GlobalAccountingSettings.id == _GLOBAL_SETTINGS_ID_STR).first()
        if row is None:
            row = GlobalAccountingSettings(
                id=_GLOBAL_SETTINGS_ID_STR,
                default_sales_account="707",
                default_donation_account="708",
                prior_year_refund_account="467",
            )
            self.db.add(row)
            self.db.commit()
            row = self.db.query(GlobalAccountingSettings).filter(GlobalAccountingSettings.id == _GLOBAL_SETTINGS_ID_STR).one()
        return row

    def get_global_accounts(self) -> GlobalAccountingSettings:
        return self._ensure_global_row()

    def update_global_accounts(
        self,
        *,
        default_sales_account: str,
        default_donation_account: str,
        prior_year_refund_account: str,
    ) -> GlobalAccountingSettings:
        validate_paheko_account_code(default_sales_account)
        validate_paheko_account_code(default_donation_account)
        validate_paheko_account_code(prior_year_refund_account)
        row = self._ensure_global_row()
        row.default_sales_account = default_sales_account
        row.default_donation_account = default_donation_account
        row.prior_year_refund_account = prior_year_refund_account
        self.db.commit()
        self.db.refresh(row)
        return row

    def list_payment_methods(self) -> list[PaymentMethodDefinition]:
        return (
            self.db.query(PaymentMethodDefinition)
            .filter(PaymentMethodDefinition.archived_at.is_(None))
            .order_by(PaymentMethodDefinition.display_order, PaymentMethodDefinition.code)
            .all()
        )

    def get_payment_method(self, pm_id: UUID) -> PaymentMethodDefinition:
        pm = self.db.query(PaymentMethodDefinition).filter(PaymentMethodDefinition.id == pm_id).first()
        if pm is None:
            raise NotFoundError("Moyen de paiement introuvable")
        return pm

    def _reject_if_archived(self, pm: PaymentMethodDefinition) -> None:
        if pm.archived_at is not None:
            raise ConflictError("Moyen de paiement archivé : modification impossible.")

    def create_payment_method(
        self,
        *,
        code: str,
        label: str,
        kind: PaymentMethodKind,
        paheko_debit_account: str,
        paheko_refund_credit_account: str,
        min_amount: Optional[float],
        max_amount: Optional[float],
        display_order: int,
        notes: Optional[str],
        active: bool,
    ) -> PaymentMethodDefinition:
        code_norm = code.strip().lower()
        exists = self.db.query(PaymentMethodDefinition).filter(PaymentMethodDefinition.code == code_norm).first()
        if exists:
            raise ConflictError(f"Code moyen de paiement déjà utilisé: {code_norm}")
        validate_paheko_account_code(paheko_debit_account)
        validate_paheko_account_code(paheko_refund_credit_account)
        if active:
            # activation exige comptes valides (déjà validés) — rien de plus
            pass
        _validate_min_max_amounts(min_amount, max_amount)
        pm = PaymentMethodDefinition(
            code=code_norm,
            label=label.strip(),
            kind=kind,
            paheko_debit_account=paheko_debit_account,
            paheko_refund_credit_account=paheko_refund_credit_account,
            min_amount=min_amount,
            max_amount=max_amount,
            display_order=display_order,
            notes=notes,
            active=active,
        )
        self.db.add(pm)
        self.db.commit()
        self.db.refresh(pm)
        return pm

    def update_payment_method(self, pm_id: UUID, fields: dict[str, Any]) -> PaymentMethodDefinition:
        pm = self.get_payment_method(pm_id)
        self._reject_if_archived(pm)
        if "label" in fields and fields["label"] is not None:
            pm.label = str(fields["label"]).strip()
        if "kind" in fields and fields["kind"] is not None:
            pm.kind = fields["kind"]
        if "paheko_debit_account" in fields and fields["paheko_debit_account"] is not None:
            validate_paheko_account_code(fields["paheko_debit_account"])
            pm.paheko_debit_account = fields["paheko_debit_account"]
        if "paheko_refund_credit_account" in fields and fields["paheko_refund_credit_account"] is not None:
            validate_paheko_account_code(fields["paheko_refund_credit_account"])
            pm.paheko_refund_credit_account = fields["paheko_refund_credit_account"]
        if "min_amount" in fields:
            pm.min_amount = fields["min_amount"]
        if "max_amount" in fields:
            pm.max_amount = fields["max_amount"]
        if "display_order" in fields and fields["display_order"] is not None:
            pm.display_order = int(fields["display_order"])
        if "notes" in fields:
            pm.notes = fields["notes"]
        _validate_min_max_amounts(pm.min_amount, pm.max_amount)
        self.db.commit()
        self.db.refresh(pm)
        return pm

    def _used_in_open_session(self, pm_id: UUID) -> bool:
        q = (
            self.db.query(PaymentTransaction.id)
            .join(Sale, Sale.id == PaymentTransaction.sale_id)
            .join(CashSession, CashSession.id == Sale.cash_session_id)
            .filter(
                PaymentTransaction.payment_method_id == pm_id,
                CashSession.status == CashSessionStatus.OPEN,
            )
            .first()
        )
        return q is not None

    def set_active(self, pm_id: UUID, active: bool) -> PaymentMethodDefinition:
        pm = self.get_payment_method(pm_id)
        self._reject_if_archived(pm)
        if active:
            validate_paheko_account_code(pm.paheko_debit_account)
            validate_paheko_account_code(pm.paheko_refund_credit_account)
            pm.active = True
        else:
            if self._used_in_open_session(pm.id):
                raise ConflictError(
                    "Impossible de désactiver ce moyen : il est utilisé dans une session de caisse ouverte."
                )
            pm.active = False
        self.db.commit()
        self.db.refresh(pm)
        return pm

    def build_snapshot(self) -> dict[str, Any]:
        g = self._ensure_global_row()
        methods = (
            self.db.query(PaymentMethodDefinition)
            .filter(PaymentMethodDefinition.archived_at.is_(None))
            .order_by(PaymentMethodDefinition.display_order, PaymentMethodDefinition.code)
            .all()
        )
        pm_snapshot = []
        for m in methods:
            pm_snapshot.append(
                {
                    "id": str(m.id),
                    "code": m.code,
                    "label": m.label,
                    "active": m.active,
                    "kind": m.kind.value if hasattr(m.kind, "value") else str(m.kind),
                    "paheko_debit_account": m.paheko_debit_account,
                    "paheko_refund_credit_account": m.paheko_refund_credit_account,
                    "min_amount": m.min_amount,
                    "max_amount": m.max_amount,
                    "display_order": m.display_order,
                    "notes": m.notes,
                    "archived_at": m.archived_at.isoformat() if m.archived_at else None,
                }
            )
        return {
            "schema_version": 1,
            "global_accounts": {
                "default_sales_account": g.default_sales_account,
                "default_donation_account": g.default_donation_account,
                "prior_year_refund_account": g.prior_year_refund_account,
            },
            "payment_methods": pm_snapshot,
        }

    def _validate_snapshot_for_publish(self, snapshot: dict[str, Any]) -> None:
        for m in snapshot.get("payment_methods", []):
            if m.get("active"):
                validate_paheko_account_code(str(m["paheko_debit_account"]))
                validate_paheko_account_code(str(m["paheko_refund_credit_account"]))

    def get_latest_revision(self) -> Optional[AccountingConfigRevision]:
        return self.db.query(AccountingConfigRevision).order_by(AccountingConfigRevision.revision_seq.desc()).first()

    def get_revision(self, revision_id: UUID) -> AccountingConfigRevision:
        r = self.db.query(AccountingConfigRevision).filter(AccountingConfigRevision.id == revision_id).first()
        if r is None:
            raise NotFoundError("Révision comptable introuvable")
        return r

    def list_revisions(self, *, skip: int = 0, limit: int = 50) -> list[AccountingConfigRevision]:
        return (
            self.db.query(AccountingConfigRevision)
            .order_by(AccountingConfigRevision.revision_seq.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def publish_revision(self, *, actor_user_id: UUID, note: Optional[str] = None) -> AccountingConfigRevision:
        _max_publish_attempts = 5
        for attempt in range(_max_publish_attempts):
            snapshot = self.build_snapshot()
            self._validate_snapshot_for_publish(snapshot)
            max_seq = self.db.query(func.max(AccountingConfigRevision.revision_seq)).scalar()
            next_seq = (max_seq or 0) + 1
            rev = AccountingConfigRevision(
                revision_seq=next_seq,
                actor_user_id=actor_user_id,
                snapshot_json=json.dumps(snapshot),
                note=note,
            )
            self.db.add(rev)
            try:
                self.db.commit()
            except IntegrityError:
                self.db.rollback()
                if attempt >= _max_publish_attempts - 1:
                    raise ConflictError(
                        "Publication simultanée : conflit sur la séquence de révision. Réessayez."
                    ) from None
                continue
            self.db.refresh(rev)
            return rev
