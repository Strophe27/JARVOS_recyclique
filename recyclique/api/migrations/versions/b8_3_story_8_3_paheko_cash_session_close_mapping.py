"""Story 8.3 — mappings site/caisse → Paheko (clôture) + colonne ``mapping_resolution_error`` outbox.

Revision ID: b8_3_paheko_cash_session_close_mapping
Revises: b8_2_paheko_outbox_retry
Create Date: 2026-04-10
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "b8_3_paheko_cash_session_close_mapping"
down_revision = "b8_2_paheko_outbox_retry"
branch_labels = None
depends_on = None


def _widen_alembic_version_num() -> None:
    """IDs de révision > 32 car. : le défaut Alembic (VARCHAR(32)) tronque le stamp."""
    op.execute(
        """
        DO $widen$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'alembic_version'
              AND column_name = 'version_num'
              AND character_maximum_length IS NOT NULL
              AND character_maximum_length < 255
          ) THEN
            ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(255);
          END IF;
        END
        $widen$;
        """
    )


def _idx_names(bind, table: str) -> set[str]:
    insp = sa.inspect(bind)
    if not insp.has_table(table):
        return set()
    return {i["name"] for i in insp.get_indexes(table)}


def upgrade() -> None:
    _widen_alembic_version_num()

    bind = op.get_bind()
    insp = sa.inspect(bind)

    if not insp.has_table("paheko_cash_session_close_mappings"):
        op.create_table(
            "paheko_cash_session_close_mappings",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column("site_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("register_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("enabled", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("destination_params", sa.JSON(), nullable=False),
            sa.Column("label", sa.String(length=255), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["site_id"], ["sites.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["register_id"], ["cash_registers.id"], ondelete="CASCADE"),
        )

    m_idx = _idx_names(bind, "paheko_cash_session_close_mappings")
    if "ix_paheko_cs_close_map_site_id" not in m_idx:
        op.create_index(
            "ix_paheko_cs_close_map_site_id",
            "paheko_cash_session_close_mappings",
            ["site_id"],
        )
    if "ix_paheko_cs_close_map_register_id" not in m_idx:
        op.create_index(
            "ix_paheko_cs_close_map_register_id",
            "paheko_cash_session_close_mappings",
            ["register_id"],
        )
    if "uq_paheko_cs_close_map_site_register" not in m_idx:
        op.create_index(
            "uq_paheko_cs_close_map_site_register",
            "paheko_cash_session_close_mappings",
            ["site_id", "register_id"],
            unique=True,
            postgresql_where=sa.text("register_id IS NOT NULL"),
            sqlite_where=sa.text("register_id IS NOT NULL"),
        )
    if "uq_paheko_cs_close_map_site_default" not in m_idx:
        op.create_index(
            "uq_paheko_cs_close_map_site_default",
            "paheko_cash_session_close_mappings",
            ["site_id"],
            unique=True,
            postgresql_where=sa.text("register_id IS NULL"),
            sqlite_where=sa.text("register_id IS NULL"),
        )

    outbox_cols = {c["name"] for c in insp.get_columns("paheko_outbox_items")} if insp.has_table("paheko_outbox_items") else set()
    if "mapping_resolution_error" not in outbox_cols:
        op.add_column(
            "paheko_outbox_items",
            sa.Column("mapping_resolution_error", sa.String(length=64), nullable=True),
        )

    insp = sa.inspect(bind)
    ob_idx = _idx_names(bind, "paheko_outbox_items")
    if "ix_paheko_outbox_mapping_resolution_error" not in ob_idx:
        op.create_index(
            "ix_paheko_outbox_mapping_resolution_error",
            "paheko_outbox_items",
            ["mapping_resolution_error"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    if insp.has_table("paheko_outbox_items"):
        ob_idx = _idx_names(bind, "paheko_outbox_items")
        if "ix_paheko_outbox_mapping_resolution_error" in ob_idx:
            op.drop_index("ix_paheko_outbox_mapping_resolution_error", table_name="paheko_outbox_items")
        ob_cols = {c["name"] for c in insp.get_columns("paheko_outbox_items")}
        if "mapping_resolution_error" in ob_cols:
            op.drop_column("paheko_outbox_items", "mapping_resolution_error")

    if insp.has_table("paheko_cash_session_close_mappings"):
        m_idx = _idx_names(bind, "paheko_cash_session_close_mappings")
        for name in (
            "uq_paheko_cs_close_map_site_default",
            "uq_paheko_cs_close_map_site_register",
            "ix_paheko_cs_close_map_register_id",
            "ix_paheko_cs_close_map_site_id",
        ):
            if name in m_idx:
                op.drop_index(name, table_name="paheko_cash_session_close_mappings")
        op.drop_table("paheko_cash_session_close_mappings")
