"""
Smoke backend — story 10.6e : Alembic `upgrade head` contre un PostgreSQL 17 éphémère (Docker).

Prérequis :
- CLI `docker` disponible ;
- dépendances `recyclique/api` installées pour l’interpréteur qui lance pytest :
  `pip install -r recyclique/api/requirements.txt`

Sans ces prérequis, les tests sont ignorés (même logique que `test_docker_compose_entrypoint.py`).
"""

from __future__ import annotations

import importlib.util
import os
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
API_ROOT = PROJECT_ROOT / "recyclique" / "api"

DOCKER = shutil.which("docker")
HAS_ALEMBIC = importlib.util.find_spec("alembic") is not None
HAS_PSYCOPG2 = importlib.util.find_spec("psycopg2") is not None

pytestmark = pytest.mark.skipif(
    not (DOCKER and HAS_ALEMBIC and HAS_PSYCOPG2),
    reason=(
        "Nécessite Docker CLI + dépendances recyclique/api "
        "(pip install -r recyclique/api/requirements.txt)."
    ),
)


def _pick_free_port() -> int:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def _wait_pg_ready(cid: str, timeout_sec: float = 90.0) -> None:
    deadline = time.monotonic() + timeout_sec
    while time.monotonic() < deadline:
        r = subprocess.run(
            [
                DOCKER or "docker",
                "exec",
                cid,
                "pg_isready",
                "-U",
                "recyclic",
                "-d",
                "recyclic_test",
            ],
            capture_output=True,
            text=True,
        )
        if r.returncode == 0:
            return
        time.sleep(0.5)
    pytest.fail("PostgreSQL 17 (conteneur) n'est pas devenu prêt à temps.")


def _server_version_major(cid: str) -> int:
    """`server_version_num` est du type 170002 pour 17.2 — majeur = valeur // 10000."""
    r = subprocess.run(
        [
            DOCKER or "docker",
            "exec",
            cid,
            "psql",
            "-U",
            "recyclic",
            "-d",
            "recyclic_test",
            "-tAc",
            "SHOW server_version_num;",
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    num = r.stdout.strip()
    if not num.isdigit():
        pytest.fail(f"server_version_num inattendu: {r.stdout!r}")
    return int(num) // 10000


def test_ephemeral_postgres17_server_version() -> None:
    """L'image postgres:17 annonce bien une version majeure 17."""
    port = _pick_free_port()
    pw = "smoke_pg17_test_10_6e"
    cid: str | None = None
    try:
        out = subprocess.run(
            [
                DOCKER or "docker",
                "run",
                "-d",
                "--rm",
                "-e",
                "POSTGRES_USER=recyclic",
                "-e",
                f"POSTGRES_PASSWORD={pw}",
                "-e",
                "POSTGRES_DB=recyclic_test",
                "-p",
                f"{port}:5432",
                "postgres:17",
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        cid = out.stdout.strip()
        _wait_pg_ready(cid)
        major = _server_version_major(cid)
        assert major == 17, f"Attendu PostgreSQL 17.x, obtenu majeur={major}"
    finally:
        if cid:
            subprocess.run(
                [DOCKER or "docker", "kill", cid],
                capture_output=True,
                text=True,
            )


def test_alembic_upgrade_head_on_ephemeral_postgres_17() -> None:
    """`alembic upgrade head` réussit contre une base PostgreSQL 17 fraîche."""
    port = _pick_free_port()
    pw = "smoke_pg17_test_10_6e"
    cid: str | None = None
    try:
        out = subprocess.run(
            [
                DOCKER or "docker",
                "run",
                "-d",
                "--rm",
                "-e",
                "POSTGRES_USER=recyclic",
                "-e",
                f"POSTGRES_PASSWORD={pw}",
                "-e",
                "POSTGRES_DB=recyclic_test",
                "-p",
                f"{port}:5432",
                "postgres:17",
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        cid = out.stdout.strip()
        _wait_pg_ready(cid)
        assert _server_version_major(cid) == 17

        env = os.environ.copy()
        env["POSTGRES_HOST"] = "127.0.0.1"
        env["POSTGRES_PORT"] = str(port)
        env["POSTGRES_USER"] = "recyclic"
        env["POSTGRES_PASSWORD"] = pw
        env["POSTGRES_DB"] = "recyclic_test"
        env.pop("TEST_DATABASE_URL", None)
        env.pop("TESTING", None)
        # migrations/env.py importe recyclic_api.core.config.settings — champs requis par Pydantic
        db_url = f"postgresql://recyclic:{pw}@127.0.0.1:{port}/recyclic_test"
        env["DATABASE_URL"] = db_url
        env["REDIS_URL"] = "redis://127.0.0.1:6379/0"
        env["SECRET_KEY"] = "story_10_6e_smoke_secret_key_32_chars_min__"

        subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=str(API_ROOT),
            env=env,
            check=True,
        )
        cur = subprocess.run(
            [sys.executable, "-m", "alembic", "current"],
            cwd=str(API_ROOT),
            env=env,
            capture_output=True,
            text=True,
            check=True,
        )
        assert cur.stdout.strip(), "alembic current doit retourner une révision"
    finally:
        if cid:
            subprocess.run(
                [DOCKER or "docker", "kill", cid],
                capture_output=True,
                text=True,
            )
