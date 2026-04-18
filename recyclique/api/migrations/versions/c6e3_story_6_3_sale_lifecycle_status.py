"""Story 6.3 — statut de cycle de vie vente (ticket en attente).

Revision ID: c6e3_sale_lifecycle
Revises: b53_st2_3_group_scope
Create Date: 2026-04-08

Ajoute ``lifecycle_status`` sur ``sales`` : ``completed`` (défaut, rétroactif),
``held`` (panier suspendu session), ``abandoned`` (abandon explicite côté caisse).
Les agrégats de session ne comptent que les ventes ``completed``.
"""
from alembic import op
import sqlalchemy as sa

revision = "c6e3_sale_lifecycle"
down_revision = "b53_st2_3_group_scope"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = {c["name"] for c in sa.inspect(bind).get_columns("sales")}
    if "lifecycle_status" not in existing:
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


def downgrade() -> None:
    bind = op.get_bind()
    existing = {c["name"] for c in sa.inspect(bind).get_columns("sales")}
    if "lifecycle_status" in existing:
        op.drop_column("sales", "lifecycle_status")
