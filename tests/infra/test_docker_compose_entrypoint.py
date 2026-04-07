"""
Smoke infra — story 10.6b : point d'entrée Docker (compose racine + include legacy).

Valide sans démarrer de conteneurs : `docker compose config --quiet` et cohérence doc / YAML.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
LEGACY_DIR = PROJECT_ROOT / "recyclique-1.4.4"
README = PROJECT_ROOT / "README.md"
ROOT_COMPOSE = PROJECT_ROOT / "docker-compose.yml"
LEGACY_COMPOSE = LEGACY_DIR / "docker-compose.yml"

DOCKER = shutil.which("docker")
pytestmark = pytest.mark.skipif(
    not DOCKER,
    reason="CLI Docker absente : ces tests sont ignorés (installer Docker Desktop / Engine).",
)


def _compose_ci_env() -> dict[str, str]:
    """Variables minimales pour que le compose racine se résolve (sans .env local)."""
    env = os.environ.copy()
    env.setdefault("POSTGRES_PASSWORD", "ci_compose_config_only_not_for_runtime")
    env.setdefault("SECRET_KEY", "ci_compose_config_only_secret_key_32_chars__")
    return env


def _compose_config_quiet(cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [DOCKER or "docker", "compose", "config", "--quiet"],
        cwd=cwd,
        env=_compose_ci_env(),
        capture_output=True,
        text=True,
        timeout=180,
    )


def test_root_docker_compose_file_exists() -> None:
    assert ROOT_COMPOSE.is_file(), "Le compose canonique doit être à la racine du mono-repo."


def test_docker_compose_config_quiet_from_monorepo_root() -> None:
    r = _compose_config_quiet(PROJECT_ROOT)
    assert r.returncode == 0, f"docker compose config a échoué (cwd=racine).\nstderr:\n{r.stderr}"


def test_docker_compose_config_quiet_from_recyclique_1_4_4() -> None:
    """Compatibilité : même résolution depuis le dossier legacy (include vers la racine)."""
    assert LEGACY_DIR.is_dir()
    r = _compose_config_quiet(LEGACY_DIR)
    assert r.returncode == 0, (
            f"docker compose config a échoué (cwd=recyclique-1.4.4).\nstderr:\n{r.stderr}"
        )


def test_legacy_compose_includes_root_compose() -> None:
    assert LEGACY_COMPOSE.is_file()
    raw = LEGACY_COMPOSE.read_text(encoding="utf-8")
    assert "include:" in raw
    assert "../docker-compose.yml" in raw.replace("\\", "/")


def test_readme_documents_canonical_compose_at_repo_root() -> None:
    assert README.is_file()
    text = README.read_text(encoding="utf-8")
    assert "docker-compose.yml" in text
    assert "racine" in text.lower()
    assert "peintre-nano" in text.lower()


def test_compose_resolved_defines_expected_service_names() -> None:
    """Contrôle léger du modèle résolu (services attendus de la stack locale)."""
    r = subprocess.run(
        [DOCKER or "docker", "compose", "config", "--format", "json"],
        cwd=PROJECT_ROOT,
        env=_compose_ci_env(),
        capture_output=True,
        text=True,
        timeout=180,
    )
    assert r.returncode == 0, r.stderr
    model = json.loads(r.stdout)
    services = model.get("services") or {}
    for name in ("postgres", "redis", "api", "api-migrations", "frontend"):
        assert name in services, f"Service attendu manquant dans le compose résolu : {name}"


def test_root_compose_frontend_points_to_peintre_nano() -> None:
    raw = ROOT_COMPOSE.read_text(encoding="utf-8")
    normalized = raw.replace("\\", "/").lower()
    assert "./peintre-nano" in normalized
    assert "context: ./peintre-nano" in normalized
    assert "./peintre-nano/vite.config.ts:/app/vite.config.ts" in normalized
