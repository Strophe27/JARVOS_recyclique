from __future__ import annotations

import logging
import os
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from sqlalchemy import text
from sqlalchemy.orm import Session

from api.models import (
    CashSession,
    LigneDepot,
    Sale,
    SaleItem,
    TicketDepot,
)

logger = logging.getLogger(__name__)


def _parse_db_url(database_url: str) -> dict:
    parsed = urlparse(database_url)
    scheme = parsed.scheme.split("+")[0]
    if scheme not in ("postgresql", "postgres"):
        raise ValueError(f"Invalid database URL scheme (must be postgresql:// or postgres://): {parsed.scheme}")
    dbname = parsed.path.lstrip("/")
    if not dbname:
        raise ValueError("Database name is required in DATABASE_URL")
    user = parsed.username
    if not user:
        raise ValueError("Database user is required in DATABASE_URL")
    return {
        "host": parsed.hostname or "localhost",
        "port": str(parsed.port or 5432),
        "user": user,
        "password": parsed.password or "",
        "dbname": dbname,
    }


def export_dump(database_url: str) -> tuple[bytes, str]:
    parts = _parse_db_url(database_url)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"recyclic_db_export_{timestamp}.dump"

    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".dump")
    os.close(tmp_fd)

    try:
        cmd = [
            "pg_dump",
            "-F", "c",
            "-Z", "9",
            "--clean",
            "--if-exists",
            "--no-owner",
            "--no-privileges",
            "-h", parts["host"],
            "-p", parts["port"],
            "-U", parts["user"],
            "-d", parts["dbname"],
            "-f", tmp_path,
        ]
        env = {**os.environ, "PGPASSWORD": parts["password"]}

        try:
            result = subprocess.run(cmd, capture_output=True, timeout=600, env=env)
        except subprocess.TimeoutExpired:
            raise RuntimeError("timeout")
        except FileNotFoundError:
            raise RuntimeError("pg_dump non disponible (PostgreSQL tools requis)")

        if result.returncode != 0:
            stderr = result.stderr.decode("utf-8", errors="replace")
            raise RuntimeError(f"pg_dump failed: {stderr}")

        export_path = Path(tmp_path)
        if not export_path.exists() or export_path.stat().st_size == 0:
            raise RuntimeError("Export file was not created")

        return export_path.read_bytes(), filename
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def validate_dump_file(dump_path: str, timeout: int = 60) -> tuple[bool, str]:
    try:
        result = subprocess.run(
            ["pg_restore", "--list", dump_path],
            capture_output=True,
            timeout=timeout,
        )
        if result.returncode != 0:
            stderr = result.stderr.decode("utf-8", errors="replace")
            return False, f"Fichier dump invalide: {stderr}"
        return True, ""
    except subprocess.TimeoutExpired:
        return False, "Validation timeout"
    except FileNotFoundError:
        return False, "pg_restore non disponible"


def create_pre_restore_backup(
    db_url_parts: dict, backups_dir: str = "/backups", timeout: int = 300
) -> tuple[bool, str, str]:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_filename = f"pre_restore_{timestamp}.dump"
    backup_path = os.path.join(backups_dir, backup_filename)

    Path(backups_dir).mkdir(parents=True, exist_ok=True)

    cmd = [
        "pg_dump",
        "-F", "c",
        "-Z", "9",
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        "-h", db_url_parts["host"],
        "-p", db_url_parts["port"],
        "-U", db_url_parts["user"],
        "-d", db_url_parts["dbname"],
        "-f", backup_path,
    ]
    env = {**os.environ, "PGPASSWORD": db_url_parts["password"]}

    try:
        result = subprocess.run(cmd, capture_output=True, timeout=timeout, env=env)
        if result.returncode != 0:
            stderr = result.stderr.decode("utf-8", errors="replace")
            return False, "", f"Backup failed: {stderr}"
        return True, backup_path, ""
    except subprocess.TimeoutExpired:
        return False, "", "Backup timeout"
    except FileNotFoundError:
        return False, "", "pg_dump non disponible"


def terminate_active_connections(db_url_parts: dict, timeout: int = 30) -> None:
    dbname = db_url_parts["dbname"]
    sql = (
        f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
        f"WHERE datname = '{dbname}' AND pid <> pg_backend_pid()"
    )
    cmd = [
        "psql",
        "-h", db_url_parts["host"],
        "-p", db_url_parts["port"],
        "-U", db_url_parts["user"],
        "-d", "postgres",
        "-c", sql,
    ]
    env = {**os.environ, "PGPASSWORD": db_url_parts["password"]}
    try:
        subprocess.run(cmd, capture_output=True, timeout=timeout, env=env)
    except Exception as exc:
        logger.warning("terminate_active_connections failed: %s", exc)


def reset_public_schema(db_url_parts: dict, timeout: int = 30) -> tuple[bool, str]:
    """Vide le schéma public (DROP CASCADE + recreate) pour un restore propre sans conflits FK."""
    user = db_url_parts["user"]
    sql = (
        "DROP SCHEMA public CASCADE; "
        "CREATE SCHEMA public; "
        f"GRANT ALL ON SCHEMA public TO {user}; "
        "GRANT ALL ON SCHEMA public TO public;"
    )
    cmd = [
        "psql",
        "-h", db_url_parts["host"],
        "-p", db_url_parts["port"],
        "-U", user,
        "-d", db_url_parts["dbname"],
        "-c", sql,
    ]
    env = {**os.environ, "PGPASSWORD": db_url_parts["password"]}
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=timeout, env=env)
        if result.returncode != 0:
            stderr = result.stderr.decode("utf-8", errors="replace")
            return False, f"Schema reset failed: {stderr}"
        return True, ""
    except subprocess.TimeoutExpired:
        return False, "Schema reset timeout"
    except FileNotFoundError:
        return False, "psql non disponible"


def restore_dump(
    dump_path: str, db_url_parts: dict, timeout: int = 1200
) -> tuple[bool, bool, list[str], list[str]]:
    # Pas de --clean : le schéma a déjà été réinitialisé par reset_public_schema.
    # --disable-triggers évite les violations FK transitoires pendant le chargement des données.
    cmd = [
        "pg_restore",
        "--no-owner",
        "--no-privileges",
        "--disable-triggers",
        "--jobs=1",
        "-h", db_url_parts["host"],
        "-p", db_url_parts["port"],
        "-U", db_url_parts["user"],
        "-d", db_url_parts["dbname"],
        dump_path,
    ]
    env = {**os.environ, "PGPASSWORD": db_url_parts["password"]}

    try:
        result = subprocess.run(cmd, capture_output=True, timeout=timeout, env=env)
    except subprocess.TimeoutExpired:
        return False, True, [], ["Timeout après 1200s"]
    except FileNotFoundError:
        return False, False, [], ["pg_restore non disponible"]

    stderr_text = result.stderr.decode("utf-8", errors="replace")
    warnings: list[str] = []
    errors: list[str] = []

    # Classifier les lignes stderr : seules les lignes "pg_restore: error:" sont de vraies erreurs.
    # Les lignes "Command was:" sont attachées à l'erreur précédente pour le contexte.
    # Tout le reste (verbose informationnel) est ignoré pour ne pas polluer le message d'erreur.
    last_was_error = False
    for line in stderr_text.splitlines():
        stripped = line.strip()
        if not stripped:
            last_was_error = False
            continue
        lower = stripped.lower()
        if "warning" in lower or "errors ignored on restore" in lower:
            warnings.append(stripped)
            last_was_error = False
        elif lower.startswith("pg_restore: error:"):
            errors.append(stripped)
            last_was_error = True
        elif lower.startswith("command was:") and last_was_error:
            errors.append(stripped)
        else:
            last_was_error = False

    if result.returncode != 0 and errors:
        return False, False, warnings, errors

    return True, False, warnings, []


def import_dump(
    dump_bytes: bytes,
    filename: str,
    database_url: str,
    backups_dir: str = "/backups",
) -> dict:
    db_url_parts = _parse_db_url(database_url)

    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".dump")
    try:
        os.write(tmp_fd, dump_bytes)
        os.close(tmp_fd)
        tmp_fd = -1

        ok, err = validate_dump_file(tmp_path)
        if not ok:
            raise RuntimeError(f"validation_failed:{err}")

        backup_ok, backup_path, backup_err = create_pre_restore_backup(db_url_parts, backups_dir)
        if not backup_ok:
            raise RuntimeError(f"backup_failed:{backup_err}")

        # Couper toutes les connexions à la BDD cible avant de la réinitialiser.
        terminate_active_connections(db_url_parts)

        # Vider le schéma public pour un restore propre, sans conflits de FK ni
        # d'objets existants qui ne sont pas dans le dump (ex. tables du nouveau projet
        # absentes d'un dump 1.4.4, ou vice-versa).
        reset_ok, reset_err = reset_public_schema(db_url_parts)
        if not reset_ok:
            raise RuntimeError(f"restore_failed:Impossible de réinitialiser le schéma: {reset_err}")

        ok, is_timeout, warnings, errors = restore_dump(tmp_path, db_url_parts)

        if is_timeout:
            raise RuntimeError("timeout")

        if not ok:
            raise RuntimeError(f"restore_failed:{'; '.join(errors)}")

        return {
            "backup_created": os.path.basename(backup_path),
            "backup_path": backup_path,
            "warnings": warnings,
        }
    finally:
        if tmp_fd >= 0:
            os.close(tmp_fd)
        Path(tmp_path).unlink(missing_ok=True)


def purge_transactions(db: Session) -> dict[str, int]:
    deleted: dict[str, int] = {}
    tables = [
        (SaleItem.__table__, "sale_items"),
        (Sale.__table__, "sales"),
        (LigneDepot.__table__, "ligne_depot"),
        (TicketDepot.__table__, "ticket_depot"),
        (CashSession.__table__, "cash_sessions"),
    ]
    for table, name in tables:
        r = db.execute(table.delete())
        deleted[name] = r.rowcount
    db.flush()
    return deleted
