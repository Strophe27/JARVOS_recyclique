"""
Story 10.2 — détection de drift entre FastAPI et le YAML reviewable.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

pytestmark = pytest.mark.no_db

from recyclic_api.main import app
from recyclic_api.openapi_chain import (
    YAML_ONLY_PATH_METHODS,
    collect_operation_ids,
    fastapi_spec_with_yaml_operation_ids,
    load_yaml_spec,
    normalize_openapi_spec,
    path_method_set,
    reviewable_yaml_path,
    repo_root_from_api_dir,
    snapshot_path,
)

API_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = repo_root_from_api_dir(API_DIR)


@pytest.fixture
def fastapi_spec() -> dict:
    return app.openapi()


@pytest.fixture
def yaml_spec() -> dict:
    return load_yaml_spec(reviewable_yaml_path(REPO_ROOT))


def test_snapshot_file_matches_live_fastapi_export(fastapi_spec: dict) -> None:
    snap = snapshot_path(REPO_ROOT)
    assert snap.is_file(), (
        f"Snapshot manquant : {snap}. Exécuter "
        "`cd recyclique/api && python generate_openapi.py --emit-contracts`."
    )
    on_disk = json.loads(snap.read_text(encoding="utf-8"))
    assert normalize_openapi_spec(fastapi_spec) == on_disk


def test_path_methods_aligned_except_yaml_only_governance(
    fastapi_spec: dict,
    yaml_spec: dict,
) -> None:
    fa_paths = path_method_set(fastapi_spec)
    yaml_paths = path_method_set(yaml_spec)
    yaml_only = yaml_paths - fa_paths
    assert yaml_only <= YAML_ONLY_PATH_METHODS, (
        "Chemins YAML sans équivalent FastAPI (hors liste blanche) : "
        f"{sorted(yaml_only - YAML_ONLY_PATH_METHODS)}"
    )
    missing_in_yaml = fa_paths - yaml_paths
    assert not missing_in_yaml, (
        "Opérations FastAPI absentes du YAML reviewable — régénérer la chaîne : "
        f"{sorted(missing_in_yaml)[:20]}"
        f"{'…' if len(missing_in_yaml) > 20 else ''}"
    )


def test_operation_ids_aligned_with_reviewable_overrides(
    fastapi_spec: dict,
    yaml_spec: dict,
) -> None:
    projected = fastapi_spec_with_yaml_operation_ids(fastapi_spec, yaml_spec)
    projected_ids = collect_operation_ids(projected)
    yaml_ids = collect_operation_ids(yaml_spec)
    # Tolérance : opérations uniquement dans le YAML (ping gouvernance).
    yaml_only_ids = yaml_ids - projected_ids
    allowed_only_yaml = {
        yaml_spec["paths"]["/v2/_contract-governance/ping"]["get"]["operationId"],
    }
    assert yaml_only_ids <= allowed_only_yaml, f"operationId YAML inattendus : {yaml_only_ids - allowed_only_yaml}"
    missing = projected_ids - yaml_ids
    assert not missing, (
        "operationId manquants dans le YAML après projection — régénérer / committer la chaîne : "
        f"{sorted(missing)[:15]}"
    )
