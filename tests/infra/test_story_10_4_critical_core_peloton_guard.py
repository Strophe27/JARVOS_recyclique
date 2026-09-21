"""
Story 10.4 — garde-fou manifeste peloton critical core (racine dépôt).

Vérifie : YAML présent ; quatre clés `targets` ; fichiers Peintre ; sélecteurs API
résolus via `pytest --collect-only` depuis recyclique/api.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MANIFEST = PROJECT_ROOT / "doc/critical-core-peloton.yaml"
PEINTRE_ROOT = PROJECT_ROOT / "peintre-nano"
API_ROOT = PROJECT_ROOT / "recyclique/api"

REQUIRED_TARGET_KEYS = (
    "module_chain",
    "caisse_nominal",
    "reception_nominal",
    "sync_sensitive",
)


def _load_manifest() -> dict:
    assert MANIFEST.is_file(), f"Manifeste attendu : {MANIFEST}"
    data = yaml.safe_load(MANIFEST.read_text(encoding="utf-8"))
    assert isinstance(data, dict), "Manifeste YAML invalide"
    return data


def test_manifest_story_and_four_targets() -> None:
    data = _load_manifest()
    assert data.get("story") == "10.4"
    targets = data.get("targets")
    assert isinstance(targets, dict)
    assert set(targets.keys()) == set(REQUIRED_TARGET_KEYS)


def test_peintre_paths_exist() -> None:
    data = _load_manifest()
    targets = data["targets"]
    for key in REQUIRED_TARGET_KEYS:
        peintre = targets[key].get("peintre") or []
        for rel in peintre:
            path = PEINTRE_ROOT / rel
            assert path.is_file(), f"[{key}] fichier Peintre manquant : {rel}"


def test_api_selectors_collect_only() -> None:
    data = _load_manifest()
    targets = data["targets"]
    selectors: list[str] = []
    for key in REQUIRED_TARGET_KEYS:
        for sel in targets[key].get("api") or []:
            assert "::" in sel, f"[{key}] sélecteur pytest invalide (attendu path::test) : {sel}"
            rel_path = sel.split("::", 1)[0]
            assert (API_ROOT / rel_path).is_file(), f"[{key}] fichier API manquant : {rel_path}"
            selectors.append(sel)

    assert selectors, "Au moins un sélecteur API attendu dans le manifeste"

    for sel in selectors:
        proc = subprocess.run(
            ["python3", "-m", "pytest", sel, "--collect-only", "-q"],
            cwd=API_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        assert proc.returncode == 0, (
            f"collect-only échoué pour {sel}\nstdout:\n{proc.stdout}\nstderr:\n{proc.stderr}"
        )
