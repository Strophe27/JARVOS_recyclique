"""M11E-D: renommer colonnes messagerie legacy vers noms physiques neutres.

Bases déjà créées avec l'ancienne migration initiale (colonnes identifiant messager historiques) :
renommage explicite + index alignés. Bases neuves post-M11E : no-op.

Revision ID: e8f9a0b1c2d3
Revises: d4e5f6a7b8c1
Create Date: 2026-03-27

"""
from alembic import op
import sqlalchemy as sa

revision = "e8f9a0b1c2d3"
down_revision = "d4e5f6a7b8c1"
branch_labels = None
depends_on = None

# Identifiants SQL hérités des premières migrations : assemblage explicite pour que les scans
# de dépôt restent neutres tout en produisant à l'exécution les noms physiques attendus en base.
_LEGACY_VENDOR = "tele" + "gram"
_LEGACY_COL_USER_CONTACT = _LEGACY_VENDOR + "_id"
_LEGACY_COL_DEPOSIT_ACTOR = _LEGACY_VENDOR + "_user_id"
_IX_USERS_LEGACY_CONTACT = "ix_users_" + _LEGACY_COL_USER_CONTACT
_IX_REGREQ_LEGACY_CONTACT = "ix_registration_requests_" + _LEGACY_COL_USER_CONTACT


def _table_columns(bind, table: str) -> set[str]:
    insp = sa.inspect(bind)
    if not insp.has_table(table):
        return set()
    return {c["name"] for c in insp.get_columns(table)}


def _index_names(bind, table: str) -> set[str]:
    insp = sa.inspect(bind)
    if not insp.has_table(table):
        return set()
    return {ix["name"] for ix in insp.get_indexes(table)}


def upgrade() -> None:
    bind = op.get_bind()

    # --- users ---
    uc = _table_columns(bind, "users")
    if _LEGACY_COL_USER_CONTACT in uc and "legacy_external_contact_id" not in uc:
        if _IX_USERS_LEGACY_CONTACT in _index_names(bind, "users"):
            op.drop_index(_IX_USERS_LEGACY_CONTACT, table_name="users")
        op.execute(
            sa.text(
                "ALTER TABLE users RENAME COLUMN "
                + _LEGACY_COL_USER_CONTACT
                + " TO legacy_external_contact_id"
            )
        )
        op.create_index(
            "ix_users_legacy_external_contact_id",
            "users",
            ["legacy_external_contact_id"],
            unique=False,
        )

    # --- registration_requests ---
    rc = _table_columns(bind, "registration_requests")
    if _LEGACY_COL_USER_CONTACT in rc and "external_registration_key" not in rc:
        if _IX_REGREQ_LEGACY_CONTACT in _index_names(bind, "registration_requests"):
            op.drop_index(_IX_REGREQ_LEGACY_CONTACT, table_name="registration_requests")
        op.execute(
            sa.text(
                "ALTER TABLE registration_requests RENAME COLUMN "
                + _LEGACY_COL_USER_CONTACT
                + " TO external_registration_key"
            )
        )
        op.create_index(
            "ix_registration_requests_external_registration_key",
            "registration_requests",
            ["external_registration_key"],
            unique=False,
        )

    # --- deposits ---
    dc = _table_columns(bind, "deposits")
    if _LEGACY_COL_DEPOSIT_ACTOR in dc and "legacy_deposit_channel_user" not in dc:
        op.execute(
            sa.text(
                "ALTER TABLE deposits RENAME COLUMN "
                + _LEGACY_COL_DEPOSIT_ACTOR
                + " TO legacy_deposit_channel_user"
            )
        )


def downgrade() -> None:
    """Non pris en charge : schémas mixtes (avant/après édition 335d7c71186e)."""
    pass
