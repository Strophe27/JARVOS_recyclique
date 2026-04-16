"""Story 22.3 — gouvernance parametrage comptable expert, revisions publiees, FK session.

Revision ID: s22_3_expert_accounting_governance
Revises: s22_1_payment_canonical_prep
Create Date: 2026-04-15
"""

from __future__ import annotations

import json
import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "s22_3_expert_accounting_governance"
down_revision = "s22_1_payment_canonical_prep"
branch_labels = None
depends_on = None

_GLOBAL_ID = uuid.UUID("00000000-0000-4000-8000-000000000001")
_GLOBAL_ID_STR = str(_GLOBAL_ID)
_GLOBAL_ID_BIND = sa.bindparam("id", _GLOBAL_ID_STR, type_=sa.String(length=36))


def _has_table(inspector: sa.Inspector, name: str) -> bool:
    return name in inspector.get_table_names()


def _has_column(inspector: sa.Inspector, table: str, column: str) -> bool:
    return any(c["name"] == column for c in inspector.get_columns(table))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _has_table(inspector, "global_accounting_settings"):
        op.create_table(
            "global_accounting_settings",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("default_sales_account", sa.String(length=32), nullable=False),
            sa.Column("default_donation_account", sa.String(length=32), nullable=False),
            sa.Column("prior_year_refund_account", sa.String(length=32), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    inspector = sa.inspect(bind)
    # Brownfield : `id` peut être UUID (table pré-existante) ou VARCHAR (créée ci-dessus).
    # Comparer en texte évite « operator does not exist: character varying = uuid ».
    existing_global = bind.execute(
        sa.text("SELECT COUNT(*) FROM global_accounting_settings WHERE CAST(id AS TEXT) = :id").bindparams(
            _GLOBAL_ID_BIND
        )
    ).scalar()
    if existing_global == 0:
        bind.execute(
            sa.text(
                """
                INSERT INTO global_accounting_settings (
                    id, default_sales_account, default_donation_account, prior_year_refund_account
                ) VALUES (
                    :id, '707', '708', '467'
                )
                """
            ).bindparams(_GLOBAL_ID_BIND)
        )

    if not _has_table(inspector, "accounting_config_revisions"):
        op.create_table(
            "accounting_config_revisions",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("revision_seq", sa.Integer(), nullable=False),
            sa.Column("published_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("actor_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("snapshot", sa.Text(), nullable=False),
            sa.Column("note", sa.Text(), nullable=True),
        )
        op.create_index(
            "ix_accounting_config_revisions_revision_seq",
            "accounting_config_revisions",
            ["revision_seq"],
            unique=True,
        )

    inspector = sa.inspect(bind)
    rev_count = bind.execute(sa.text("SELECT COUNT(*) FROM accounting_config_revisions")).scalar()
    if rev_count == 0:
        pm_snapshot = []
        if _has_table(inspector, "payment_methods"):
            rows = bind.execute(
                sa.text(
                    """
                    SELECT id, code, label, active, kind, paheko_debit_account, paheko_refund_credit_account,
                           min_amount, max_amount, display_order, notes, archived_at
                    FROM payment_methods
                    ORDER BY display_order, code
                    """
                )
            ).fetchall()
            for r in rows:
                pm_snapshot.append(
                    {
                        "id": str(r[0]),
                        "code": r[1],
                        "label": r[2],
                        "active": bool(r[3]),
                        "kind": r[4],
                        "paheko_debit_account": r[5],
                        "paheko_refund_credit_account": r[6],
                        "min_amount": r[7],
                        "max_amount": r[8],
                        "display_order": r[9],
                        "notes": r[10],
                        "archived_at": r[11].isoformat() if r[11] is not None else None,
                    }
                )
        g = bind.execute(
            sa.text(
                "SELECT default_sales_account, default_donation_account, prior_year_refund_account "
                "FROM global_accounting_settings WHERE CAST(id AS TEXT) = :id"
            ).bindparams(_GLOBAL_ID_BIND)
        ).fetchone()
        if g is None:
            ga = ("707", "708", "467")
        else:
            ga = (g[0], g[1], g[2])
        snapshot = {
            "schema_version": 1,
            "global_accounts": {
                "default_sales_account": ga[0],
                "default_donation_account": ga[1],
                "prior_year_refund_account": ga[2],
            },
            "payment_methods": pm_snapshot,
        }
        rid = uuid.uuid4()
        rev_table = sa.table(
            "accounting_config_revisions",
            sa.column("id", UUID(as_uuid=True)),
            sa.column("revision_seq", sa.Integer()),
            sa.column("snapshot", sa.Text()),
            sa.column("note", sa.Text()),
        )
        op.bulk_insert(
            rev_table,
            [
                {
                    "id": rid,
                    "revision_seq": 1,
                    "snapshot": json.dumps(snapshot),
                    "note": "Migration Story 22.3 — révision initiale à partir du référentiel courant.",
                }
            ],
        )

    inspector = sa.inspect(bind)
    if _has_table(inspector, "cash_sessions") and not _has_column(inspector, "cash_sessions", "accounting_config_revision_id"):
        op.add_column(
            "cash_sessions",
            sa.Column(
                "accounting_config_revision_id",
                UUID(as_uuid=True),
                sa.ForeignKey("accounting_config_revisions.id"),
                nullable=True,
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if _has_table(inspector, "cash_sessions") and _has_column(inspector, "cash_sessions", "accounting_config_revision_id"):
        op.drop_column("cash_sessions", "accounting_config_revision_id")
    inspector = sa.inspect(bind)
    if _has_table(inspector, "accounting_config_revisions"):
        idx_names = {i["name"] for i in inspector.get_indexes("accounting_config_revisions")}
        if "ix_accounting_config_revisions_revision_seq" in idx_names:
            op.drop_index("ix_accounting_config_revisions_revision_seq", table_name="accounting_config_revisions")
        op.drop_table("accounting_config_revisions")
    if _has_table(inspector, "global_accounting_settings"):
        op.drop_table("global_accounting_settings")
