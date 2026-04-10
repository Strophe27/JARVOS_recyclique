"""
Vérifications « schéma + seed » sur la DB réelle (TEST_DATABASE_URL / DATABASE_URL).

Sur PostgreSQL on utilise ``to_regclass`` (comportement historique). Sur SQLite
(typique des runs pytest locaux), cette fonction n'existe pas : on interroge
``sqlite_master`` à la place. La vérification « au moins une catégorie seed »
n'est exigée que sur PostgreSQL ; SQLite pytest n'importe pas le seed métier.
"""
import os

import pytest
import sqlalchemy as sa
from sqlalchemy import create_engine


def test_reception_tables_and_seed_exist():
    db_url = os.getenv("TEST_DATABASE_URL", os.getenv("DATABASE_URL", "postgresql://recyclic:postgres@localhost:5432/recyclic"))
    engine = create_engine(db_url)
    dialect = engine.dialect.name
    with engine.connect() as conn:
        expected = [
            "categories",
            "poste_reception",
            "ticket_depot",
            "ligne_depot",
        ]
        for table in expected:
            if dialect == "postgresql":
                res = conn.execute(sa.text("SELECT to_regclass(:t)"), {"t": table}).scalar()
                assert res == table, f"Table manquante: {table}"
            elif dialect == "sqlite":
                res = conn.execute(
                    sa.text(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name = :t LIMIT 1"
                    ),
                    {"t": table},
                ).scalar()
                assert res == table, f"Table manquante: {table}"
            else:
                pytest.skip(f"Vérification tables réception non définie pour le dialecte {dialect!r}")

        # Seed métier : pertinent surtout quand TEST_DATABASE_URL pointe vers une DB
        # migrée + peuplée (Postgres CI / dev). La DB SQLite éphémère des tests crée
        # les tables sans importer le seed applicatif.
        cnt = conn.execute(sa.text("SELECT COUNT(*) FROM categories WHERE is_active = true")).scalar()
        if dialect == "postgresql":
            assert cnt and cnt >= 1, f"Seed categories attendu >=1, obtenu {cnt}"
