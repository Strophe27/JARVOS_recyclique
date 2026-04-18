"""Story 22.1 - canonical payment schema preparation

Revision ID: s22_1_payment_canonical_prep
Revises: b8_4_paheko_outbox_sync_audit
Create Date: 2026-04-15 18:30:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = "s22_1_payment_canonical_prep"
down_revision = "b8_4_paheko_outbox_sync_audit"
branch_labels = None
depends_on = None


_PAYMENT_METHOD_ROWS = (
    {
        "id": "11111111-1111-1111-1111-111111111111",
        "code": "cash",
        "label": "Espèces",
        "active": True,
        "kind": "cash",
        "paheko_debit_account": "530",
        "paheko_refund_credit_account": "530",
        "display_order": 10,
        "notes": "Référentiel canonique Story 22.1 - backfill historique.",
    },
    {
        "id": "22222222-2222-2222-2222-222222222222",
        "code": "check",
        "label": "Chèque",
        "active": True,
        "kind": "bank",
        "paheko_debit_account": "5112",
        "paheko_refund_credit_account": "5112",
        "display_order": 20,
        "notes": "Référentiel canonique Story 22.1 - backfill historique.",
    },
    {
        "id": "33333333-3333-3333-3333-333333333333",
        "code": "card",
        "label": "Carte",
        "active": True,
        "kind": "bank",
        "paheko_debit_account": "511",
        "paheko_refund_credit_account": "511",
        "display_order": 30,
        "notes": "Référentiel canonique Story 22.1 - backfill historique.",
    },
)


def _has_table(inspector: sa.Inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _has_column(inspector: sa.Inspector, table_name: str, column_name: str) -> bool:
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def _ensure_payment_methods_table(bind, inspector: sa.Inspector) -> None:
    if _has_table(inspector, "payment_methods"):
        return

    op.create_table(
        "payment_methods",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("paheko_debit_account", sa.String(length=32), nullable=False),
        sa.Column("paheko_refund_credit_account", sa.String(length=32), nullable=False),
        sa.Column("min_amount", sa.Float(), nullable=True),
        sa.Column("max_amount", sa.Float(), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("code", name="uq_payment_methods_code"),
    )
    op.create_index("ix_payment_methods_active_display_order", "payment_methods", ["active", "display_order"])


def _seed_payment_methods(bind) -> None:
    payment_methods_table = sa.table(
        "payment_methods",
        sa.column("id", UUID(as_uuid=True)),
        sa.column("code", sa.String()),
        sa.column("label", sa.String()),
        sa.column("active", sa.Boolean()),
        sa.column("kind", sa.String()),
        sa.column("paheko_debit_account", sa.String()),
        sa.column("paheko_refund_credit_account", sa.String()),
        sa.column("display_order", sa.Integer()),
        sa.column("notes", sa.Text()),
    )
    existing_codes = {
        row[0]
        for row in bind.execute(sa.text("SELECT code FROM payment_methods")).fetchall()
    }
    missing_rows = [row for row in _PAYMENT_METHOD_ROWS if row["code"] not in existing_codes]
    if missing_rows:
        op.bulk_insert(payment_methods_table, missing_rows)


def _ensure_payment_transaction_columns(inspector: sa.Inspector) -> None:
    if not _has_table(inspector, "payment_transactions"):
        return

    if not _has_column(inspector, "payment_transactions", "payment_method_id"):
        op.add_column(
            "payment_transactions",
            sa.Column("payment_method_id", UUID(as_uuid=True), sa.ForeignKey("payment_methods.id"), nullable=True),
        )
    if not _has_column(inspector, "payment_transactions", "nature"):
        op.add_column("payment_transactions", sa.Column("nature", sa.String(length=32), nullable=True))
    if not _has_column(inspector, "payment_transactions", "direction"):
        op.add_column("payment_transactions", sa.Column("direction", sa.String(length=32), nullable=True))
    if not _has_column(inspector, "payment_transactions", "original_sale_id"):
        op.add_column(
            "payment_transactions",
            sa.Column("original_sale_id", UUID(as_uuid=True), sa.ForeignKey("sales.id"), nullable=True),
        )
    if not _has_column(inspector, "payment_transactions", "original_payment_method_id"):
        op.add_column(
            "payment_transactions",
            sa.Column(
                "original_payment_method_id",
                UUID(as_uuid=True),
                sa.ForeignKey("payment_methods.id"),
                nullable=True,
            ),
        )
    if not _has_column(inspector, "payment_transactions", "is_prior_year_special_case"):
        op.add_column(
            "payment_transactions",
            sa.Column(
                "is_prior_year_special_case",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
        )
    if not _has_column(inspector, "payment_transactions", "paheko_account_override"):
        op.add_column("payment_transactions", sa.Column("paheko_account_override", sa.String(length=32), nullable=True))
    if not _has_column(inspector, "payment_transactions", "notes"):
        op.add_column("payment_transactions", sa.Column("notes", sa.Text(), nullable=True))

    inspector = sa.inspect(op.get_bind())
    index_names = {idx["name"] for idx in inspector.get_indexes("payment_transactions")}
    if "ix_payment_transactions_payment_method_id" not in index_names:
        op.create_index(
            "ix_payment_transactions_payment_method_id",
            "payment_transactions",
            ["payment_method_id"],
        )
    if "ix_payment_transactions_original_sale_id" not in index_names:
        op.create_index(
            "ix_payment_transactions_original_sale_id",
            "payment_transactions",
            ["original_sale_id"],
        )


def _backfill_payment_transactions(bind) -> None:
    bind.execute(
        sa.text(
            """
            UPDATE payment_transactions
            SET is_prior_year_special_case = COALESCE(is_prior_year_special_case, FALSE)
            """
        )
    )
    bind.execute(
        sa.text(
            """
            UPDATE payment_transactions AS pt
            SET
                payment_method_id = pm.id,
                nature = COALESCE(pt.nature, 'sale_payment'),
                direction = COALESCE(pt.direction, 'inflow')
            FROM payment_methods AS pm
            WHERE pt.payment_method = pm.code
              AND pm.code IN ('cash', 'check', 'card')
            """
        )
    )
    bind.execute(
        sa.text(
            """
            UPDATE payment_transactions
            SET
                amount = 0,
                payment_method_id = NULL,
                original_payment_method_id = NULL,
                nature = NULL,
                direction = NULL,
                notes = CASE
                    WHEN notes IS NULL OR notes = ''
                        THEN 'Legacy free payment neutralized by Story 22.1 migration (non-financial free sale).'
                    ELSE notes || ' | Legacy free payment neutralized by Story 22.1 migration (non-financial free sale).'
                END
            WHERE payment_method = 'free'
            """
        )
    )


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    _ensure_payment_methods_table(bind, inspector)
    _seed_payment_methods(bind)
    inspector = sa.inspect(bind)
    _ensure_payment_transaction_columns(inspector)
    _backfill_payment_transactions(bind)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _has_table(inspector, "payment_transactions"):
        index_names = {idx["name"] for idx in inspector.get_indexes("payment_transactions")}
        if "ix_payment_transactions_original_sale_id" in index_names:
            op.drop_index("ix_payment_transactions_original_sale_id", table_name="payment_transactions")
        if "ix_payment_transactions_payment_method_id" in index_names:
            op.drop_index("ix_payment_transactions_payment_method_id", table_name="payment_transactions")

        for column_name in (
            "notes",
            "paheko_account_override",
            "is_prior_year_special_case",
            "original_payment_method_id",
            "original_sale_id",
            "direction",
            "nature",
            "payment_method_id",
        ):
            if _has_column(inspector, "payment_transactions", column_name):
                op.drop_column("payment_transactions", column_name)

    inspector = sa.inspect(bind)
    if _has_table(inspector, "payment_methods"):
        index_names = {idx["name"] for idx in inspector.get_indexes("payment_methods")}
        if "ix_payment_methods_active_display_order" in index_names:
            op.drop_index("ix_payment_methods_active_display_order", table_name="payment_methods")
        op.drop_table("payment_methods")
