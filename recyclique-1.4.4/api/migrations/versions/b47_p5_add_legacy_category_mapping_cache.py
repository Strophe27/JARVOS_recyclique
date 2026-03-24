"""B47-P5: Add legacy_category_mapping_cache table for LLM/fuzzy mappings cache.

Revision ID: b47_p5_legacy_category_cache
Revises: b42_p2_user_sessions
Create Date: 2025-12-04 12:00:00.000000

Cette migration ajoute une table de cache dédiée pour les mappings de catégories
legacy, afin de réduire les appels LLM et réutiliser les correspondances déjà
validées (fuzzy ou LLM).
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "b47_p5_legacy_category_cache"
down_revision = "b42_p2_user_sessions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Créer la table legacy_category_mapping_cache (B47-P5)."""
    op.create_table(
        "legacy_category_mapping_cache",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_name_normalized", sa.String(), nullable=False),
        sa.Column("target_category_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Contrainte d'unicité + index sur la clé normalisée.
    op.create_unique_constraint(
        "uq_legacy_category_mapping_cache_source_name_normalized",
        "legacy_category_mapping_cache",
        ["source_name_normalized"],
    )
    op.create_index(
        "ix_legacy_category_mapping_cache_source_name_normalized",
        "legacy_category_mapping_cache",
        ["source_name_normalized"],
        unique=False,
    )

    # Index pour faciliter les filtrages par catégorie cible et provider.
    op.create_index(
        "ix_legacy_category_mapping_cache_target_category_id",
        "legacy_category_mapping_cache",
        ["target_category_id"],
        unique=False,
    )
    op.create_index(
        "ix_legacy_category_mapping_cache_provider",
        "legacy_category_mapping_cache",
        ["provider"],
        unique=False,
    )


def downgrade() -> None:
    """Supprimer la table et les index de cache (rollback propre)."""
    op.drop_index(
        "ix_legacy_category_mapping_cache_provider",
        table_name="legacy_category_mapping_cache",
    )
    op.drop_index(
        "ix_legacy_category_mapping_cache_target_category_id",
        table_name="legacy_category_mapping_cache",
    )
    op.drop_index(
        "ix_legacy_category_mapping_cache_source_name_normalized",
        table_name="legacy_category_mapping_cache",
    )
    op.drop_constraint(
        "uq_legacy_category_mapping_cache_source_name_normalized",
        "legacy_category_mapping_cache",
        type_="unique",
    )
    op.drop_table("legacy_category_mapping_cache")



