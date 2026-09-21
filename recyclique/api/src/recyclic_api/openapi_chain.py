"""
Chaîne OpenAPI Story 10.2 — export FastAPI → snapshot versionné → YAML reviewable.

Politique (voir contracts/README.md et doc/ci-minimal.md) :
- Snapshot canonique machine : ``contracts/openapi/generated/openapi-snapshot.json`` (JSON normalisé).
- ``recyclique-api.yaml`` : chemins + ``components`` alignés sur ``app.openapi()``, avec conservation
  des champs reviewables (``operationId``, ``description``, ``summary``, ``tags``, extensions ``x-*``)
  par couple (chemin normalisé, méthode HTTP) lorsqu'ils existent déjà.
- Chemins présents uniquement dans le YAML (ex. gouvernance illustrative) sont conservés.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

import yaml

HTTP_METHODS = frozenset(
    {"get", "put", "post", "delete", "options", "head", "patch", "trace"}
)

REVIEWABLE_OPERATION_KEYS = frozenset(
    {
        "operationId",
        "summary",
        "description",
        "tags",
        "deprecated",
        "externalDocs",
        "security",
        "servers",
    }
)


def repo_root_from_api_dir(api_dir: Path) -> Path:
    """Racine monorepo (parent de ``recyclique/``)."""
    return api_dir.resolve().parents[1]


def contracts_openapi_dir(repo_root: Path) -> Path:
    return repo_root / "contracts" / "openapi"


def snapshot_path(repo_root: Path) -> Path:
    return contracts_openapi_dir(repo_root) / "generated" / "openapi-snapshot.json"


def reviewable_yaml_path(repo_root: Path) -> Path:
    return contracts_openapi_dir(repo_root) / "recyclique-api.yaml"


def normalize_path_key(path: str) -> str:
    return path.rstrip("/") or "/"


def _sort_dict_deep(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: _sort_dict_deep(obj[k]) for k in sorted(obj.keys())}
    if isinstance(obj, list):
        return [_sort_dict_deep(item) for item in obj]
    return obj


def normalize_openapi_spec(spec: dict[str, Any]) -> dict[str, Any]:
    """Tri récursique des clés pour diffs git stables (FM4)."""
    return _sort_dict_deep(copy.deepcopy(spec))


def iter_path_operations(
    spec: dict[str, Any],
) -> list[tuple[str, str, dict[str, Any]]]:
    out: list[tuple[str, str, dict[str, Any]]] = []
    for path, path_item in (spec.get("paths") or {}).items():
        if not isinstance(path_item, dict):
            continue
        for method, operation in path_item.items():
            if method.startswith("x-"):
                continue
            if method.lower() not in HTTP_METHODS:
                continue
            if not isinstance(operation, dict):
                continue
            out.append((normalize_path_key(path), method.lower(), operation))
    return out


def collect_operation_ids(spec: dict[str, Any]) -> set[str]:
    ids: set[str] = set()
    for _, _, operation in iter_path_operations(spec):
        oid = operation.get("operationId")
        if isinstance(oid, str) and oid:
            ids.add(oid)
    return ids


def index_reviewable_operations(
    spec: dict[str, Any],
) -> dict[tuple[str, str], dict[str, Any]]:
    index: dict[tuple[str, str], dict[str, Any]] = {}
    for path_key, method, operation in iter_path_operations(spec):
        reviewable: dict[str, Any] = {}
        for key in REVIEWABLE_OPERATION_KEYS:
            if key in operation:
                reviewable[key] = copy.deepcopy(operation[key])
        for key, value in operation.items():
            if key.startswith("x-") and key not in reviewable:
                reviewable[key] = copy.deepcopy(value)
        index[(path_key, method)] = reviewable
    return index


def _merge_operation(
    fastapi_operation: dict[str, Any],
    reviewable: dict[str, Any] | None,
) -> dict[str, Any]:
    merged = copy.deepcopy(fastapi_operation)
    if not reviewable:
        return merged
    for key, value in reviewable.items():
        if key == "operationId" and value:
            merged["operationId"] = value
        elif key in ("description", "summary") and value:
            merged[key] = value
        elif key == "tags" and value:
            merged["tags"] = copy.deepcopy(value)
        elif key.startswith("x-") or key in REVIEWABLE_OPERATION_KEYS:
            if key not in merged or key in ("description", "summary", "tags", "operationId"):
                merged[key] = copy.deepcopy(value)
    if reviewable.get("operationId"):
        merged["operationId"] = reviewable["operationId"]
    return merged


def build_reviewable_spec(
    fastapi_spec: dict[str, Any],
    existing_yaml_spec: dict[str, Any],
) -> dict[str, Any]:
    reviewable_index = index_reviewable_operations(existing_yaml_spec)
    yaml_paths = existing_yaml_spec.get("paths") or {}
    fastapi_paths = fastapi_spec.get("paths") or {}

    merged_paths: dict[str, Any] = {}
    all_path_keys = set()
    for raw_path in fastapi_paths:
        all_path_keys.add(normalize_path_key(raw_path))
    for raw_path in yaml_paths:
        all_path_keys.add(normalize_path_key(raw_path))

    for path_key in sorted(all_path_keys):
        fa_raw = next(
            (p for p in fastapi_paths if normalize_path_key(p) == path_key),
            None,
        )
        yaml_raw = next(
            (p for p in yaml_paths if normalize_path_key(p) == path_key),
            None,
        )
        source_path = fa_raw if fa_raw is not None else yaml_raw
        if source_path is None:
            continue

        fa_item = fastapi_paths.get(fa_raw, {}) if fa_raw else {}
        yaml_item = yaml_paths.get(yaml_raw, {}) if yaml_raw else {}

        merged_item: dict[str, Any] = {}
        for key, value in fa_item.items():
            if key.startswith("x-") and key not in HTTP_METHODS:
                merged_item[key] = copy.deepcopy(value)
        for key, value in yaml_item.items():
            if key.startswith("x-") and key not in HTTP_METHODS and key not in merged_item:
                merged_item[key] = copy.deepcopy(value)

        method_names = set()
        for item in (fa_item, yaml_item):
            for method in item:
                if method.lower() in HTTP_METHODS:
                    method_names.add(method.lower())

        for method in sorted(method_names):
            fa_op = fa_item.get(method) or fa_item.get(method.upper())
            yaml_op = yaml_item.get(method) or yaml_item.get(method.upper())
            if fa_op and isinstance(fa_op, dict):
                merged_item[method] = _merge_operation(
                    fa_op,
                    reviewable_index.get((path_key, method)),
                )
            elif yaml_op and isinstance(yaml_op, dict):
                merged_item[method] = copy.deepcopy(yaml_op)

        if merged_item:
            merged_paths[source_path] = merged_item

    result = copy.deepcopy(existing_yaml_spec)
    result["paths"] = merged_paths
    result["components"] = _merge_components(
        fastapi_spec.get("components") or {},
        existing_yaml_spec.get("components") or {},
    )
    if existing_yaml_spec.get("openapi"):
        result["openapi"] = existing_yaml_spec["openapi"]
    elif fastapi_spec.get("openapi"):
        result["openapi"] = fastapi_spec["openapi"]
    return result


def _merge_schema_objects(
    fastapi_schema: dict[str, Any],
    yaml_schema: dict[str, Any] | None,
) -> dict[str, Any]:
    merged = copy.deepcopy(fastapi_schema)
    if not yaml_schema:
        return merged
    yaml_props = yaml_schema.get("properties")
    if isinstance(yaml_props, dict):
        merged_props = copy.deepcopy(merged.get("properties") or {})
        for key, value in yaml_props.items():
            if key not in merged_props:
                merged_props[key] = copy.deepcopy(value)
            elif isinstance(value, dict) and isinstance(merged_props.get(key), dict):
                nested = _merge_schema_objects(merged_props[key], value)
                merged_props[key] = nested
        merged["properties"] = merged_props
    for meta_key in ("description", "title", "example", "examples"):
        if meta_key in yaml_schema and yaml_schema[meta_key]:
            merged[meta_key] = copy.deepcopy(yaml_schema[meta_key])
    if yaml_schema.get("required") and "required" not in merged:
        merged["required"] = copy.deepcopy(yaml_schema["required"])
    return merged


def _merge_components(
    fastapi_components: dict[str, Any],
    yaml_components: dict[str, Any],
) -> dict[str, Any]:
    merged = copy.deepcopy(fastapi_components)
    fa_schemas = fastapi_components.get("schemas") or {}
    yaml_schemas = yaml_components.get("schemas") or {}
    out_schemas: dict[str, Any] = {}
    for name in sorted(set(fa_schemas) | set(yaml_schemas)):
        fa_s = fa_schemas.get(name)
        yaml_s = yaml_schemas.get(name)
        if isinstance(fa_s, dict):
            out_schemas[name] = _merge_schema_objects(fa_s, yaml_s if isinstance(yaml_s, dict) else None)
        elif isinstance(yaml_s, dict):
            out_schemas[name] = copy.deepcopy(yaml_s)
    merged["schemas"] = out_schemas
    for section in ("parameters", "responses", "requestBodies", "headers", "securitySchemes"):
        yaml_section = yaml_components.get(section)
        if isinstance(yaml_section, dict):
            base = merged.get(section) or {}
            for key, value in yaml_section.items():
                if key not in base:
                    base[key] = copy.deepcopy(value)
            merged[section] = base
    return merged


def write_json_snapshot(path: Path, spec: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    normalized = normalize_openapi_spec(spec)
    path.write_text(
        json.dumps(normalized, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def write_reviewable_yaml(path: Path, spec: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = yaml.dump(
        spec,
        allow_unicode=True,
        default_flow_style=False,
        sort_keys=False,
        width=120,
    )
    path.write_text(text, encoding="utf-8")


def load_yaml_spec(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        loaded = yaml.safe_load(handle)
    assert isinstance(loaded, dict)
    return loaded


def emit_contracts_chain(
    fastapi_spec: dict[str, Any],
    repo_root: Path,
    *,
    sync_yaml: bool = True,
) -> None:
    snap = snapshot_path(repo_root)
    write_json_snapshot(snap, fastapi_spec)

    if not sync_yaml:
        return

    yaml_path = reviewable_yaml_path(repo_root)
    existing = load_yaml_spec(yaml_path)
    merged = build_reviewable_spec(fastapi_spec, existing)
    write_reviewable_yaml(yaml_path, merged)


def fastapi_spec_with_yaml_operation_ids(
    fastapi_spec: dict[str, Any],
    yaml_spec: dict[str, Any],
) -> dict[str, Any]:
    """Projection FastAPI avec les ``operationId`` reviewables du YAML (gate drift AC4)."""
    reviewable_index = index_reviewable_operations(yaml_spec)
    projected = copy.deepcopy(fastapi_spec)
    for path_key, method, operation in iter_path_operations(projected):
        preserved = reviewable_index.get((path_key, method))
        if preserved and preserved.get("operationId"):
            operation["operationId"] = preserved["operationId"]
    return projected


def path_method_set(spec: dict[str, Any]) -> set[tuple[str, str]]:
    return {(path_key, method) for path_key, method, _ in iter_path_operations(spec)}


# Chemins reviewables absents de FastAPI (gouvernance 1.4) — conservés dans le YAML.
YAML_ONLY_PATH_METHODS: frozenset[tuple[str, str]] = frozenset(
    {("/v2/_contract-governance/ping", "get")}
)
