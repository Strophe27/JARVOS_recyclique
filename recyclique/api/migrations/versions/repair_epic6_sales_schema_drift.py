"""Réparation drift Epic 6 — schéma ``sales`` / ``sale_reversals`` / permissions caisse.

Revision ID: repair_epic6_sales_drift
Revises: f2b3_story_6_6_social
Create Date: 2026-04-09

Idempotent : une base déjà migrée correctement ne change pas. Ré-exécutable sans erreur.

Couvre le cas ``alembic_version`` à ``head`` alors que les révisions 6.3–6.6 n'ont pas réellement
appliqué leur DDL (stamp, transaction partielle, restauration partielle).
"""
from __future__ import annotations

import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "repair_epic6_sales_drift"
down_revision = "f2b3_story_6_6_social"
branch_labels = None
depends_on = None


def _table_exists(bind, table_name: str) -> bool:
    row = bind.execute(sa.text("SELECT to_regclass(:table_name)"), {"table_name": f"public.{table_name}"}).scalar()
    return row is not None


def _sales_column_names(bind) -> set[str]:
    insp = sa.inspect(bind)
    if not insp.has_table("sales"):
        return set()
    return {c["name"] for c in insp.get_columns("sales")}


def _permission_missing(bind, name: str) -> bool:
    row = bind.execute(
        sa.text("SELECT 1 FROM permissions WHERE name = :n LIMIT 1"),
        {"n": name},
    ).fetchone()
    return row is None


def _insert_permission_if_missing(bind, name: str, description: str) -> None:
    if not _permission_missing(bind, name):
        return
    permissions_table = sa.table(
        "permissions",
        sa.column("id", sa.UUID),
        sa.column("name", sa.String),
        sa.column("description", sa.Text),
    )
    op.bulk_insert(
        permissions_table,
        [
            {
                "id": str(uuid.uuid4()),
                "name": name,
                "description": description,
            }
        ],
    )


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    if not insp.has_table("sales"):
        raise RuntimeError(
            "repair_epic6_sales_drift: table « sales » absente — appliquer les migrations de base d'abord."
        )

    cols = _sales_column_names(bind)
    if "lifecycle_status" not in cols:
        op.add_column(
            "sales",
            sa.Column(
                "lifecycle_status",
                sa.String(32),
                nullable=False,
                server_default="completed",
            ),
        )

    op.execute(
        """
        UPDATE sales SET lifecycle_status = 'completed'
        WHERE lifecycle_status IS NULL OR lifecycle_status = ''
        """
    )

    cols = _sales_column_names(bind)
    if "special_encaissement_kind" not in cols:
        op.add_column(
            "sales",
            sa.Column("special_encaissement_kind", sa.String(length=64), nullable=True),
        )
    if "adherent_reference" not in cols:
        op.add_column(
            "sales",
            sa.Column("adherent_reference", sa.String(length=200), nullable=True),
        )
    if "social_action_kind" not in cols:
        op.add_column(
            "sales",
            sa.Column("social_action_kind", sa.String(length=64), nullable=True),
        )

    if not _table_exists(bind, "sale_reversals"):
        op.create_table(
            "sale_reversals",
            sa.Column("id", UUID(as_uuid=True), nullable=False),
            sa.Column("source_sale_id", UUID(as_uuid=True), nullable=False),
            sa.Column("cash_session_id", UUID(as_uuid=True), nullable=False),
            sa.Column("operator_id", UUID(as_uuid=True), nullable=False),
            sa.Column("amount_signed", sa.Float(), nullable=False),
            sa.Column("reason_code", sa.String(length=64), nullable=False),
            sa.Column("detail", sa.Text(), nullable=True),
            sa.Column("idempotency_key", sa.String(length=128), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(["cash_session_id"], ["cash_sessions.id"]),
            sa.ForeignKeyConstraint(["operator_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["source_sale_id"], ["sales.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("source_sale_id", name="uq_sale_reversals_source_sale_id"),
            sa.UniqueConstraint("idempotency_key", name="uq_sale_reversals_idempotency_key"),
        )
        op.create_index(
            op.f("ix_sale_reversals_cash_session_id"),
            "sale_reversals",
            ["cash_session_id"],
            unique=False,
        )

    _insert_permission_if_missing(
        bind,
        "caisse.refund",
        "Autorise les remboursements / reversals caisse (Story 6.4).",
    )
    _insert_permission_if_missing(
        bind,
        "caisse.special_encaissement",
        "Autorise les encaissements spéciaux sans article (don, adhésion) — Story 6.5.",
    )
    _insert_permission_if_missing(
        bind,
        "caisse.social_encaissement",
        "Autorise les encaissements d'actions sociales / solidaires (lot 1) — Story 6.6.",
    )


def downgrade() -> None:
    # Réparation : ne pas supprimer colonnes ni table (perte de données ; indistinguable d'une base saine).
    pass
