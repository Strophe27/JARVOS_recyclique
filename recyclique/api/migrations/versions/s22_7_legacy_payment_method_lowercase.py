"""Normalise payment_method en minuscules (valeurs enum) — brownfield SQLAlchemy.

Révision ID: s22_7_legacy_payment_method_lowercase
Revises: s22_6_accounting_close_snapshot

Anciennes lignes peuvent contenir les **noms** d'enum (`CASH`, …) au lieu des **valeurs**
(`cash`, …). SQLAlchemy + ``values_callable`` sur ``payment_transactions`` lève alors
``LookupError`` au chargement (ex. clôture caisse / agrégat journal).

En fin d'``upgrade`` : correctifs QA compta (UPDATE 708→7541, 467→672 ; seed moyens ``donation`` / ``transfer``).
Les colonnes ``cash_journal_code`` et ``default_entry_label_prefix`` sont ajoutées dans **s22_3**.
"""

from __future__ import annotations

import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

_DONATION_ID = uuid.UUID("44444444-4444-4444-4444-444444444401")
_TRANSFER_ID = uuid.UUID("44444444-4444-4444-4444-444444444402")

revision = "s22_7_legacy_payment_method_lowercase"
down_revision = "s22_6_accounting_close_snapshot"
branch_labels = None
depends_on = None


def _has_table(inspector: sa.Inspector, name: str) -> bool:
    return name in inspector.get_table_names()


def _has_column(inspector: sa.Inspector, table: str, column: str) -> bool:
    return any(c["name"] == column for c in inspector.get_columns(table))


def _normalize_table(bind, inspector: sa.Inspector, table: str) -> None:
    if not _has_table(inspector, table) or not _has_column(inspector, table, "payment_method"):
        return
    bind.execute(
        sa.text(
            f"""
            UPDATE {table}
            SET payment_method = lower(payment_method)
            WHERE payment_method IS NOT NULL
              AND lower(payment_method) IN ('cash', 'card', 'check', 'free')
              AND payment_method <> lower(payment_method)
            """
        )
    )


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    _normalize_table(bind, inspector, "payment_transactions")
    _normalize_table(bind, inspector, "sales")

    # --- QA compta expert (dev) : aligner anciennes valeurs 708/467 + moyens donation / virement (colonnes globales : s22_3).
    inspector = sa.inspect(bind)
    if _has_table(inspector, "global_accounting_settings"):
        bind.execute(
            sa.text(
                "UPDATE global_accounting_settings SET default_donation_account = '7541' "
                "WHERE default_donation_account = '708'"
            )
        )
        bind.execute(
            sa.text(
                "UPDATE global_accounting_settings SET prior_year_refund_account = '672' "
                "WHERE prior_year_refund_account = '467'"
            )
        )

    inspector = sa.inspect(bind)
    if not _has_table(inspector, "payment_methods"):
        return

    pm = sa.table(
        "payment_methods",
        sa.column("id", UUID(as_uuid=True)),
        sa.column("code", sa.String()),
        sa.column("label", sa.String()),
        sa.column("active", sa.Boolean()),
        sa.column("kind", sa.String()),
        sa.column("paheko_debit_account", sa.String()),
        sa.column("paheko_refund_credit_account", sa.String()),
        sa.column("min_amount", sa.Float()),
        sa.column("max_amount", sa.Float()),
        sa.column("display_order", sa.Integer()),
        sa.column("notes", sa.Text()),
    )
    existing = {row[0] for row in bind.execute(sa.text("SELECT code FROM payment_methods")).fetchall()}
    rows: list[dict] = []
    if "donation" not in existing:
        rows.append(
            {
                "id": _DONATION_ID,
                "code": "donation",
                "label": "Don",
                "active": True,
                "kind": "other",
                "paheko_debit_account": "530",
                "paheko_refund_credit_account": "7541",
                "min_amount": None,
                "max_amount": None,
                "display_order": 40,
                "notes": "Surplus volontaire du client. Ne pas utiliser comme moyen de règlement standard.",
            }
        )
    if "transfer" not in existing:
        rows.append(
            {
                "id": _TRANSFER_ID,
                "code": "transfer",
                "label": "Virement",
                "active": True,
                "kind": "bank",
                "paheko_debit_account": "512",
                "paheko_refund_credit_account": "512",
                "min_amount": None,
                "max_amount": None,
                "display_order": 35,
                "notes": "Virement bancaire direct. Vérifier le rapprochement dans Paheko.",
            }
        )
    if rows:
        op.bulk_insert(pm, rows)


def downgrade() -> None:
    """Pas de retour arrière fiable (perte d'information sur la casse d'origine)."""
    pass
