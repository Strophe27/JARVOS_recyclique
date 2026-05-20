"""Validation JSON Schema et bornes document module-config."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator
from jsonschema.exceptions import ValidationError as JsonSchemaValidationError

from recyclic_api.core.exceptions import ValidationError

MAX_JSON_DEPTH = 32
MAX_DOCUMENT_BYTES = 64 * 1024


def repo_root() -> Path:
    """Racine dépôt JARVOS_recyclique (recyclique/api/src/recyclic_api/... → +5 parents)."""
    return Path(__file__).resolve().parents[6]


def format_etag(version: int) -> str:
    return f'W/"{version}"'


def parse_if_match(header: str | None) -> int | None:
    if header is None or not str(header).strip():
        return None
    raw = str(header).strip()
    if raw.startswith("W/"):
        raw = raw[2:].strip()
    if len(raw) >= 2 and raw[0] == '"' and raw[-1] == '"':
        raw = raw[1:-1]
    try:
        return int(raw)
    except ValueError:
        return None


@lru_cache(maxsize=16)
def _load_validator(schema_relative_path: str) -> Draft202012Validator:
    path = repo_root() / schema_relative_path
    with path.open(encoding="utf-8") as f:
        schema = json.load(f)
    return Draft202012Validator(schema)


def json_depth(value: Any, *, _current: int = 0) -> int:
    if _current > MAX_JSON_DEPTH:
        return _current
    if isinstance(value, dict):
        if not value:
            return _current + 1
        return max(json_depth(v, _current=_current + 1) for v in value.values())
    if isinstance(value, list):
        if not value:
            return _current + 1
        return max(json_depth(v, _current=_current + 1) for v in value)
    return _current + 1


def assert_document_size_and_depth(payload: dict[str, Any]) -> None:
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    if len(encoded) > MAX_DOCUMENT_BYTES:
        raise ValidationError(
            f"Document module-config trop volumineux (max {MAX_DOCUMENT_BYTES} octets)."
        )
    if json_depth(payload) > MAX_JSON_DEPTH:
        raise ValidationError(f"Document module-config trop profond (max {MAX_JSON_DEPTH} niveaux).")


def validate_payload(schema_relative_path: str, payload: dict[str, Any]) -> None:
    assert_document_size_and_depth(payload)
    validator = _load_validator(schema_relative_path)
    try:
        validator.validate(payload)
    except JsonSchemaValidationError as exc:
        raise ValidationError(f"Payload invalide pour le schéma du module: {exc.message}") from exc
