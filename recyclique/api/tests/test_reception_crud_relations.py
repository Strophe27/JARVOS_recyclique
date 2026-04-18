import os
import uuid
from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy import create_engine


def _bind_uuid(engine, value):
    """SQLite (pysqlite) n'accepte pas les paramètres de type ``uuid.UUID`` en brut."""
    if isinstance(value, uuid.UUID) and engine.dialect.name == "sqlite":
        return str(value)
    return value


def test_crud_relations_reception_minimal():
    db_url = os.getenv(
        "TEST_DATABASE_URL",
        os.getenv("DATABASE_URL", "postgresql://recyclic:postgres@localhost:5432/recyclic"),
    )
    engine = create_engine(db_url)
    now_ts = datetime.now(timezone.utc)
    with engine.begin() as conn:
        created_category = False
        created_user = False
        # Pick any active category or create one if none exists
        category_id = conn.execute(
            sa.text("SELECT id FROM categories WHERE is_active = true ORDER BY name LIMIT 1")
        ).scalar()
        if not category_id:
            created_category = True
            # Create a minimal category if none exists (colonnes NOT NULL du modèle actuel)
            category_id = uuid.uuid4()
            cat_name = f"qa_reception_crud_{category_id.hex[:10]}"
            conn.execute(
                sa.text(
                    """
                    INSERT INTO categories (
                        id, name, is_active,
                        display_order, display_order_entry, is_visible
                    )
                    VALUES (
                        :id, :name, true,
                        0, 0, true
                    )
                    """
                ),
                {"id": _bind_uuid(engine, category_id), "name": cat_name},
            )

        # Ensure a user exists to open a poste (fallback: create a dummy if schema allows)
        user_id = conn.execute(
            sa.text("SELECT id FROM users LIMIT 1")
        ).scalar()
        if not user_id:
            created_user = True
            # Create a minimal user if table exists and constraints allow
            user_id = uuid.uuid4()
            conn.execute(
                sa.text(
                    """
                    INSERT INTO users (id, username, hashed_password, role, status, is_active)
                    VALUES (:id, 'qa-user', 'x', 'user', 'active', true)
                    """
                ),
                {"id": _bind_uuid(engine, user_id)},
            )

        # Create poste_reception
        poste_id = uuid.uuid4()
        conn.execute(
            sa.text(
                """
                INSERT INTO poste_reception (id, opened_by_user_id, status, opened_at)
                VALUES (:id, :uid, 'opened', :opened_at)
                """
            ),
            {
                "id": _bind_uuid(engine, poste_id),
                "uid": _bind_uuid(engine, user_id),
                "opened_at": now_ts,
            },
        )

        # Create ticket_depot
        ticket_id = uuid.uuid4()
        conn.execute(
            sa.text(
                """
                INSERT INTO ticket_depot (id, poste_id, benevole_user_id, status, created_at)
                VALUES (:id, :poste, :uid, 'opened', :created_at)
                """
            ),
            {
                "id": _bind_uuid(engine, ticket_id),
                "poste": _bind_uuid(engine, poste_id),
                "uid": _bind_uuid(engine, user_id),
                "created_at": now_ts,
            },
        )

        # Create ligne_depot linked to category
        ligne_id = uuid.uuid4()
        conn.execute(
            sa.text(
                """
                INSERT INTO ligne_depot (id, ticket_id, category_id, poids_kg, destination)
                VALUES (:id, :ticket, :cat, 1.234, 'MAGASIN')
                """
            ),
            {
                "id": _bind_uuid(engine, ligne_id),
                "ticket": _bind_uuid(engine, ticket_id),
                "cat": _bind_uuid(engine, category_id),
            },
        )

        # Verify joins
        count = conn.execute(
            sa.text(
                """
                SELECT COUNT(*)
                FROM ticket_depot t
                JOIN ligne_depot l ON l.ticket_id = t.id
                JOIN categories c ON c.id = l.category_id
                WHERE t.id = :tid
                """
            ),
            {"tid": _bind_uuid(engine, ticket_id)},
        ).scalar()
        assert count == 1

        # Ne pas laisser de lignes dans la DB fichier partagée (TEST_DATABASE_URL SQLite),
        # sinon les tests ORM qui comptent les tickets voient du bruit.
        conn.execute(
            sa.text("DELETE FROM ligne_depot WHERE id = :id"),
            {"id": _bind_uuid(engine, ligne_id)},
        )
        conn.execute(
            sa.text("DELETE FROM ticket_depot WHERE id = :id"),
            {"id": _bind_uuid(engine, ticket_id)},
        )
        conn.execute(
            sa.text("DELETE FROM poste_reception WHERE id = :id"),
            {"id": _bind_uuid(engine, poste_id)},
        )
        if created_user:
            conn.execute(
                sa.text("DELETE FROM users WHERE id = :id"),
                {"id": _bind_uuid(engine, user_id)},
            )
        if created_category:
            conn.execute(
                sa.text("DELETE FROM categories WHERE id = :id"),
                {"id": _bind_uuid(engine, category_id)},
            )


import pytest




def test_create_poste_ticket_ligne_with_category_relations():
    # TODO: implement ORM session fixture, create poste → ticket → ligne linked to category
    assert True


def test_cascade_delete_ticket_removes_lignes_only():
    # TODO: implement: delete ticket should delete lignes, but keep poste and category
    assert True


