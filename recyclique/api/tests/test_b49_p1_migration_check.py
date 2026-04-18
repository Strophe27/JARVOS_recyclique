"""Vérification schéma B49-P1 (colonnes caisse) selon le dialecte de TEST_DATABASE_URL.

Sous SQLite (CI / dev local par défaut) : introspection SQLAlchemy uniquement — pas de requêtes
``information_schema`` propres à PostgreSQL (évite les faux positifs / erreurs si l'URL et le
dialecte réel ne coïncident pas).

Sous PostgreSQL : contrôle DDL aligné sur la migration (jsonb / boolean) via ``information_schema``.
Les types jsonb/boolean ne sont **pas** exigés sous SQLite (stockage JSON/TEXT et INTEGER 0/1).
"""
import os
from pathlib import Path

import pytest
from sqlalchemy import create_engine, inspect, text

_API_ROOT = Path(__file__).resolve().parent.parent
_DEFAULT_SQLITE_URL = (
    "sqlite:///" + str((_API_ROOT / "pytest_recyclic.db").resolve()).replace("\\", "/")
)


def _test_database_url() -> str:
    """Même défaut fichier SQLite que ``conftest`` ; jamais d'URL Postgres factice par défaut."""
    return os.getenv("TEST_DATABASE_URL") or _DEFAULT_SQLITE_URL


def _postgres_column_types(conn):
    result = conn.execute(
        text(
            """
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'cash_registers'
              AND column_name IN ('workflow_options', 'enable_virtual', 'enable_deferred')
            ORDER BY column_name
            """
        )
    )
    return {row[0]: row[1] for row in result}


def _sqlite_column_map(insp):
    cols = insp.get_columns("cash_registers")
    return {c["name"]: c["type"] for c in cols}


def _is_json_storage(t) -> bool:
    """JSON dialect-neutral ou équivalent stocké (TEXT) sous SQLite."""
    tn = type(t).__name__.upper()
    return "JSON" in tn or tn in ("TEXT", "VARCHAR", "STRING")


def _is_bool_storage(t) -> bool:
    """Boolean SQLAlchemy ou INTEGER 0/1 sous SQLite."""
    tn = type(t).__name__.upper()
    return "BOOL" in tn or tn == "INTEGER"


def test_migration_applied_to_test_db():
    """Colonnes B49-P1 présentes ; contrôle strict des types uniquement sur PostgreSQL."""
    test_db_url = _test_database_url()
    engine = create_engine(test_db_url)
    dialect = (engine.dialect.name or "").lower()

    with engine.connect() as conn:
        insp = inspect(conn)
        if not insp.has_table("cash_registers"):
            pytest.skip("Table cash_registers absente (base vide ou non initialisée pour ce test).")

        if dialect in ("postgresql", "postgres"):
            columns = _postgres_column_types(conn)
            assert "workflow_options" in columns, "Colonne workflow_options manquante"
            assert "enable_virtual" in columns, "Colonne enable_virtual manquante"
            assert "enable_deferred" in columns, "Colonne enable_deferred manquante"

            assert columns["workflow_options"] in (
                "jsonb",
                "USER-DEFINED",
            ), f"Type incorrect pour workflow_options: {columns['workflow_options']}"
            assert columns["enable_virtual"] == "boolean", (
                f"Type incorrect pour enable_virtual: {columns['enable_virtual']}"
            )
            assert columns["enable_deferred"] == "boolean", (
                f"Type incorrect pour enable_deferred: {columns['enable_deferred']}"
            )
        elif dialect == "sqlite":
            columns = _sqlite_column_map(insp)
            for name in ("workflow_options", "enable_virtual", "enable_deferred"):
                assert name in columns, f"Colonne {name} manquante (SQLite / introspection)"
            assert _is_json_storage(columns["workflow_options"]), (
                f"Type workflow_options non JSON-compatible sous SQLite: {columns['workflow_options']!r}"
            )
            assert _is_bool_storage(columns["enable_virtual"]), (
                f"Type enable_virtual non bool-compatible sous SQLite: {columns['enable_virtual']!r}"
            )
            assert _is_bool_storage(columns["enable_deferred"]), (
                f"Type enable_deferred non bool-compatible sous SQLite: {columns['enable_deferred']!r}"
            )
        else:
            pytest.skip(f"Dialecte {dialect!r} non couvert par ce test (utiliser Postgres ou SQLite).")
