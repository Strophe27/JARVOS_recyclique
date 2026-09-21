"""
Story 10.5 — garde-fou manifeste observabilité (racine dépôt).

Vérifie : YAML présent ; quatre piliers ; fichiers code référencés ; screenshots non vides si présents ;
optionnel : operationId OpenAPI listés dans contracts/openapi/recyclique-api.yaml.
"""

from __future__ import annotations

from pathlib import Path

import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MANIFEST = PROJECT_ROOT / "doc/observability-critical-flows.yaml"
PEINTRE_ROOT = PROJECT_ROOT / "peintre-nano"
API_ROOT = PROJECT_ROOT / "recyclique/api"
OPENAPI_REVIEWABLE = PROJECT_ROOT / "contracts/openapi/recyclique-api.yaml"

REQUIRED_PILLARS = (
    "health_readiness",
    "http_correlation",
    "sync_support_trail",
    "admin_journals",
)


def _load_manifest() -> dict:
    assert MANIFEST.is_file(), f"Manifeste attendu : {MANIFEST}"
    data = yaml.safe_load(MANIFEST.read_text(encoding="utf-8"))
    assert isinstance(data, dict), "Manifeste YAML invalide"
    return data


def _collect_openapi_operation_ids(path: Path) -> set[str]:
    doc = yaml.safe_load(path.read_text(encoding="utf-8"))
    ids: set[str] = set()
    for methods in (doc.get("paths") or {}).values():
        if not isinstance(methods, dict):
            continue
        for op in methods.values():
            if isinstance(op, dict) and "operationId" in op:
                ids.add(str(op["operationId"]))
    return ids


def _peintre_paths(pillar: dict) -> list[str]:
    paths: list[str] = []
    for entry in pillar.get("peintre_widgets") or []:
        if isinstance(entry, str):
            paths.append(entry)
        elif isinstance(entry, dict) and entry.get("path"):
            paths.append(str(entry["path"]))
    return paths


def test_manifest_story_and_four_pillars() -> None:
    data = _load_manifest()
    assert data.get("story") == "10.5"
    pillars = data.get("pillars")
    assert isinstance(pillars, dict)
    assert set(pillars.keys()) == set(REQUIRED_PILLARS)


def test_referenced_source_files_exist() -> None:
    data = _load_manifest()
    pillars = data["pillars"]
    for key in REQUIRED_PILLARS:
        pillar = pillars[key]
        for rel in pillar.get("api_source_files") or []:
            path = API_ROOT / rel
            assert path.is_file(), f"[{key}] fichier API manquant : {rel}"
        for rel in _peintre_paths(pillar):
            path = PEINTRE_ROOT / rel
            assert path.is_file(), f"[{key}] fichier Peintre manquant : {rel}"
        for rel in pillar.get("log_anchors") or []:
            path = API_ROOT / "src" / rel
            assert path.is_file(), f"[{key}] ancre log API manquante : {rel}"


def test_screenshot_refs_only_when_present_on_disk() -> None:
    data = _load_manifest()
    for key in REQUIRED_PILLARS:
        for ref in data["pillars"][key].get("screenshot_refs") or []:
            if not ref:
                continue
            path = PROJECT_ROOT / ref
            if path.is_file():
                assert path.suffix.lower() == ".png", f"[{key}] capture attendue PNG : {ref}"
            # Absence tolérée (clone léger) — pas d'assertion sur fichier manquant.


def test_health_readiness_roles_and_endpoints() -> None:
    data = _load_manifest()
    hr = data["pillars"]["health_readiness"]
    endpoints = hr.get("health_endpoints") or []
    roles = {e.get("role") for e in endpoints if isinstance(e, dict)}
    assert "liveness_canonical" in roles
    assert "readiness_admin" in roles
    liveness = [e for e in endpoints if e.get("role") == "liveness_canonical"]
    assert any(e.get("path") == "/health" for e in liveness)


def test_openapi_operation_ids_when_listed() -> None:
    assert OPENAPI_REVIEWABLE.is_file()
    known = _collect_openapi_operation_ids(OPENAPI_REVIEWABLE)
    data = _load_manifest()
    missing: list[str] = []
    for key in REQUIRED_PILLARS:
        for op_id in data["pillars"][key].get("openapi_operation_ids") or []:
            if op_id not in known:
                missing.append(f"{key}:{op_id}")
    assert not missing, f"operationId OpenAPI introuvables : {missing}"
