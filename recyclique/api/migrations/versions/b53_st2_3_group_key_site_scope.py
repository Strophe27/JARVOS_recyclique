"""Story 2.3 : clé stable groupe, libellé optionnel, périmètre site.

Revision ID: b53_st2_3_group_scope
Revises: e8f9a0b1c2d3
Create Date: 2026-04-03

"""
from __future__ import annotations

import re

import sqlalchemy as sa
from alembic import op

revision = "b53_st2_3_group_scope"
down_revision = "e8f9a0b1c2d3"
branch_labels = None
depends_on = None

FK_GROUPS_SITE = "fk_groups_site_id_sites"


def _slugify(label: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (label or "").lower().strip())
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "group"


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c["name"] for c in insp.get_columns("groups")} if insp.has_table("groups") else set()

    if "key" not in cols:
        op.add_column("groups", sa.Column("key", sa.String(), nullable=True))
    if "display_name" not in cols:
        op.add_column("groups", sa.Column("display_name", sa.String(), nullable=True))
    if "site_id" not in cols:
        op.add_column("groups", sa.Column("site_id", sa.UUID(), nullable=True))

    # Backfill key + display_name
    res = bind.execute(sa.text("SELECT id, name FROM groups WHERE key IS NULL OR key = ''"))
    rows = res.fetchall()
    used: set[str] = set()
    res2 = bind.execute(sa.text("SELECT key FROM groups WHERE key IS NOT NULL AND key != ''"))
    used.update(r[0] for r in res2.fetchall())

    for row in rows:
        gid, name = row[0], row[1]
        base = _slugify(str(name) if name else "group")
        candidate = base
        n = 0
        while candidate in used:
            n += 1
            candidate = f"{base}-{n}"
        used.add(candidate)
        bind.execute(
            sa.text(
                "UPDATE groups SET key = :k, display_name = COALESCE(display_name, :d) WHERE id = :id"
            ),
            {"k": candidate, "d": str(name) if name else "", "id": gid},
        )

    # NOT NULL sur key une fois backfill
    op.alter_column("groups", "key", existing_type=sa.String(), nullable=False)

    fk_names = {fk.get("name") for fk in insp.get_foreign_keys("groups")}
    if FK_GROUPS_SITE not in fk_names:
        op.create_foreign_key(
            FK_GROUPS_SITE,
            "groups",
            "sites",
            ["site_id"],
            ["id"],
            ondelete="SET NULL",
        )

    ix_names = {ix.get("name") for ix in insp.get_indexes("groups")}
    if "ix_groups_key" not in ix_names:
        op.create_index(op.f("ix_groups_key"), "groups", ["key"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_groups_key"), table_name="groups")
    op.drop_constraint(FK_GROUPS_SITE, "groups", type_="foreignkey")
    op.drop_column("groups", "site_id")
    op.drop_column("groups", "display_name")
    op.drop_column("groups", "key")
