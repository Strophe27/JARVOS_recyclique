"""T-MOD-3 — configuration modules par site (site_module_configs).

Revision ID: t_mod_3_site_module_configs
Revises: s24_10_exceptional_refund_p3_proof
Create Date: 2026-05-21

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "t_mod_3_site_module_configs"
down_revision = "s24_10_exceptional_refund_p3_proof"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "site_module_configs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("site_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("module_key", sa.String(length=128), nullable=False),
        sa.Column("schema_version", sa.String(length=32), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["site_id"],
            ["sites.id"],
            name="fk_site_module_configs_site_id_sites",
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "site_id",
            "module_key",
            name="uq_site_module_configs_site_id_module_key",
        ),
    )
    op.create_index(
        "ix_site_module_configs_site_id",
        "site_module_configs",
        ["site_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_site_module_configs_site_id", table_name="site_module_configs")
    op.drop_table("site_module_configs")
