"""DATA-03: contrainte FK users.site_id -> sites.id

La migration initiale créait users.site_id sans ForeignKeyConstraint.
Alignement sur les autres tables (deposits, cash_registers, etc.).

Revision ID: d4e5f6a7b8c1
Revises: a7b3c9d2014f
Create Date: 2026-03-24

"""
from alembic import op


revision = "d4e5f6a7b8c1"
down_revision = "a7b3c9d2014f"
branch_labels = None
depends_on = None

FK_NAME = "fk_users_site_id_sites"


def upgrade() -> None:
    # Éviter l'échec de CREATE CONSTRAINT si des lignes pointent hors sites.
    # Traçabilité : NOTICE PostgreSQL avec le nombre de lignes corrigées (visible dans les logs migrate).
    op.execute(
        """
        DO $data03$
        DECLARE
            n integer;
        BEGIN
            UPDATE users
            SET site_id = NULL
            WHERE site_id IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM sites WHERE sites.id = users.site_id);
            GET DIAGNOSTICS n = ROW_COUNT;
            RAISE NOTICE 'DATA-03 fk_users_site_id_sites: orphaned site_id cleared, rows=%', n;
        END
        $data03$;
        """
    )
    op.create_foreign_key(
        FK_NAME,
        "users",
        "sites",
        ["site_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(FK_NAME, "users", type_="foreignkey")
