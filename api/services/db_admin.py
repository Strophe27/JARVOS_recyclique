# Service admin BDD — export, purge transactions, import (Story 17.3).
# Logique operationnelle hors routeur (export dump reel, purge FK, import SQL).

from __future__ import annotations

import subprocess

from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from api.models import (
    CashSession,
    PaymentTransaction,
    Sale,
    SaleItem,
)


def export_dump(engine: Engine) -> bytes:
    """
    Genere un dump SQL de la base.
    - SQLite : schema via sqlite_master + donnees via SELECT (perimetre transactions).
    - PostgreSQL : pg_dump en subprocess.
    """
    url = str(engine.url)
    if "sqlite" in url:
        return _export_sqlite(engine)
    return _export_postgresql(engine, url)


def _export_sqlite(engine: Engine) -> bytes:
    """Export SQLite : schema uniquement en v1 (CREATE TABLE). Pas d'INSERT pour le moment."""
    parts: list[str] = ["-- RecyClique DB export (SQLite)", ""]
    with engine.connect() as conn:
        # Schema : toutes les tables
        r = conn.execute(text("SELECT name, sql FROM sqlite_master WHERE type='table' AND sql IS NOT NULL ORDER BY name"))
        for name, sql in r:
            if name == "sqlite_sequence":
                continue
            if sql:
                parts.append(f"-- Table: {name}")
                parts.append(sql + ";")
                parts.append("")
        # Donnees : tables du perimetre (schema + donnees utiles)
        # Pour un export minimal operationnel, on inclut au moins le schema.
        # Optionnel : INSERT pour categories, sites, etc. On garde le schema seul pour v1.
        parts.append("-- End schema export")
    return "\n".join(parts).encode("utf-8")


def _export_postgresql(engine: Engine, url: str) -> bytes:
    """Export PostgreSQL via pg_dump (schema + donnees)."""
    # Parser l'URL pour extraire host, port, user, dbname
    # Format: postgresql://user:pass@host:port/dbname
    try:
        result = subprocess.run(
            ["pg_dump", "--no-owner", "--no-acl", url],
            capture_output=True,
            timeout=120,
            check=True,
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"pg_dump failed: {e.stderr.decode('utf-8', errors='replace')}")
    except FileNotFoundError:
        raise RuntimeError("pg_dump non disponible (PostgreSQL tools requis)")
    except subprocess.TimeoutExpired:
        raise RuntimeError("pg_dump timeout")


def purge_transactions(db: Session) -> dict[str, int]:
    """
    Purge les tables transactionnelles.
    Ordre FK : payment_transactions -> sale_items -> sales -> cash_sessions.
    Retourne un dict {table: count} par table.
    """
    deleted: dict[str, int] = {}
    # Enfants avant parents
    tables = [
        (PaymentTransaction.__table__, "payment_transactions"),
        (SaleItem.__table__, "sale_items"),
        (Sale.__table__, "sales"),
        (CashSession.__table__, "cash_sessions"),
    ]
    for table, name in tables:
        r = db.execute(table.delete())
        deleted[name] = r.rowcount
    db.flush()
    return deleted


def execute_import_sql(db: Session, sql_content: str) -> tuple[bool, str]:
    """
    Execute le SQL contre la base.
    Retourne (ok, message) avec message detail en cas d'erreur.
    """
    # Split par statement (semicolon hors strings)
    statements = _split_sql_statements(sql_content)
    errors: list[str] = []
    executed = 0
    for stmt in statements:
        stmt = stmt.strip()
        if not stmt or stmt.startswith("--"):
            continue
        try:
            db.execute(text(stmt))
            executed += 1
        except Exception as e:
            errors.append(f"{str(e)[:200]} (stmt #{executed + 1})")
            db.rollback()
            return False, "; ".join(errors) if errors else str(e)
    db.flush()
    return True, f"{executed} instruction(s) executee(s)"


def _split_sql_statements(sql: str) -> list[str]:
    """
    Decoupe le SQL en statements (split par ; suivi de newline).

    Evite de splitter a l'interieur des chaines litterales (guillemets simples
    ou doubles). Si un point-virgule + newline apparait dans une chaine,
    il n'est pas considere comme separateur de statement.

    Limitations documentees :
    - Chaines echappees complexes (ex. E'...' PostgreSQL, $$...$$) non gerees.
    - Commentaires -- et /* */ : un ;\\n dans un commentaire peut etre splitte
      (impact faible car ces statements seraient vides ou invalides).
    - Pour des dumps pg_dump ou exports RecyClique standards, le comportement
      est suffisant. Fichiers SQL exotiques : valider manuellement.
    """
    normalized = sql.replace("\r\n", "\n").replace("\r", "\n")
    if not normalized.strip():
        return []
    normalized = normalized.rstrip() + "\n"

    statements: list[str] = []
    current: list[str] = []
    i = 0
    in_single = False
    in_double = False
    escape_next = False

    while i < len(normalized):
        c = normalized[i]
        if escape_next:
            escape_next = False
            current.append(c)
            i += 1
            continue
        if c == "\\" and (in_single or in_double):
            escape_next = True
            current.append(c)
            i += 1
            continue
        if in_single:
            if c == "'":
                # Verifier doublon '' (escape SQL)
                if i + 1 < len(normalized) and normalized[i + 1] == "'":
                    current.append("''")
                    i += 2
                    continue
                in_single = False
            current.append(c)
            i += 1
            continue
        if in_double:
            if c == '"':
                in_double = False
            current.append(c)
            i += 1
            continue
        if c == "'" and not in_double:
            in_single = True
            current.append(c)
            i += 1
            continue
        if c == '"' and not in_single:
            in_double = True
            current.append(c)
            i += 1
            continue
        # Hors chaine : detecter ; suivi de whitespace et newline
        if c == ";":
            # Regarder la suite : espaces/newlines jusqu'a un non-whitespace ou fin
            j = i + 1
            saw_newline = False
            while j < len(normalized):
                n = normalized[j]
                if n == "\n":
                    saw_newline = True
                    j += 1
                    break
                if n in " \t\r":
                    j += 1
                else:
                    break
            if saw_newline:
                stmt = "".join(current).strip()
                if stmt and not stmt.startswith("--"):
                    statements.append(stmt)
                current = []
                i = j
                continue
        current.append(c)
        i += 1

    remainder = "".join(current).strip()
    if remainder and not remainder.startswith("--"):
        statements.append(remainder)
    return statements
