#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""Validate improvement_event records against R-AI-01 schema (v0.1)."""

from __future__ import annotations

import json
import os
import re
import uuid
from pathlib import Path

ARTIFACT_TYPES = frozenset({"skill", "rule"})
INSTALL_TARGETS = frozenset({"local", "vps", "both", "workshop_only"})
SOURCES = frozenset(
    {"operator", "mentor_self", "agent", "qa_telemetry", "gardien_telemetry"}
)
SEVERITIES = frozenset({"note", "important", "bloquant"})
STATUSES = frozenset(
    {"noted", "triaged", "in_progress", "hitl_pending", "done", "rejected"}
)

REQUIRED = (
    "event_id",
    "recorded_at",
    "artifact_type",
    "artifact_id",
    "source_bundle",
    "install_target",
    "problem",
    "recommendation",
    "source",
    "severity",
    "status",
    "project_id",
)

OPTIONAL = frozenset(
    {"session_ref", "related_idea_id", "auto_triage", "patch_ref", "_file_header"}
)

ISO8601_Z = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$"
)

ENV_EVENTS = "IMPROVEMENT_EVENTS_PATH"
DEFAULT_REL = Path("jarmes-cockpit/global-bmad/telemetry/improvement-events.jsonl")


def resolve_improvement_events_path(explicit: str | Path | None = None) -> Path:
    if explicit:
        return Path(explicit).expanduser().resolve()
    if os.environ.get(ENV_EVENTS):
        return Path(os.environ[ENV_EVENTS]).expanduser().resolve()
    script = Path(__file__).resolve()
    jarmes_root = script.parents[5]
    return (jarmes_root / DEFAULT_REL).resolve()


def is_file_header(record: dict) -> bool:
    return bool(record.get("_file_header"))


def _violation(path: str, code: str, message: str) -> dict:
    return {"path": path, "code": code, "message": message}


def _is_uuid_v4(value: str) -> bool:
    try:
        parsed = uuid.UUID(str(value))
    except (ValueError, AttributeError, TypeError):
        return False
    return parsed.version == 4


def validate_improvement_event(event: dict) -> list[dict]:
    """Return list of violations (empty = valid)."""
    if not isinstance(event, dict):
        return [_violation("$", "type", "event must be a JSON object")]

    if is_file_header(event):
        if event.get("schema_version") != "0.1":
            return [
                _violation(
                    "schema_version",
                    "invalid_header",
                    "file header schema_version must be 0.1",
                )
            ]
        return []

    violations: list[dict] = []
    for field in REQUIRED:
        if field not in event or event[field] in (None, ""):
            violations.append(
                _violation(field, "required", f"missing required field {field!r}")
            )

    unknown = set(event) - set(REQUIRED) - OPTIONAL
    for key in sorted(unknown):
        violations.append(_violation(key, "unknown_field", f"unknown field {key!r}"))

    event_id = event.get("event_id")
    if event_id is not None and not _is_uuid_v4(str(event_id)):
        violations.append(
            _violation("event_id", "invalid_uuid", "event_id must be UUID v4")
        )

    recorded_at = event.get("recorded_at")
    if recorded_at is not None and not ISO8601_Z.match(str(recorded_at)):
        violations.append(
            _violation(
                "recorded_at",
                "invalid_timestamp",
                "recorded_at must be ISO8601 UTC ending with Z",
            )
        )

    artifact_type = event.get("artifact_type")
    if artifact_type is not None and artifact_type not in ARTIFACT_TYPES:
        violations.append(
            _violation(
                "artifact_type",
                "invalid_enum",
                f"artifact_type must be one of {sorted(ARTIFACT_TYPES)}",
            )
        )

    install_target = event.get("install_target")
    if install_target is not None and install_target not in INSTALL_TARGETS:
        violations.append(
            _violation(
                "install_target",
                "invalid_enum",
                f"install_target must be one of {sorted(INSTALL_TARGETS)}",
            )
        )

    source = event.get("source")
    if source is not None and source not in SOURCES:
        violations.append(
            _violation(
                "source",
                "invalid_enum",
                f"source must be one of {sorted(SOURCES)}",
            )
        )

    severity = event.get("severity")
    if severity is not None and severity not in SEVERITIES:
        violations.append(
            _violation(
                "severity",
                "invalid_enum",
                f"severity must be one of {sorted(SEVERITIES)}",
            )
        )

    status = event.get("status")
    if status is not None and status not in STATUSES:
        violations.append(
            _violation(
                "status",
                "invalid_enum",
                f"status must be one of {sorted(STATUSES)}",
            )
        )

    problem = event.get("problem")
    if isinstance(problem, str) and len(problem) > 500:
        violations.append(
            _violation("problem", "max_length", "problem must be <= 500 chars")
        )

    recommendation = event.get("recommendation")
    if isinstance(recommendation, str) and len(recommendation) > 1000:
        violations.append(
            _violation(
                "recommendation",
                "max_length",
                "recommendation must be <= 1000 chars",
            )
        )

    auto_triage = event.get("auto_triage")
    if auto_triage is not None and not isinstance(auto_triage, dict):
        violations.append(
            _violation("auto_triage", "type", "auto_triage must be an object")
        )

    return violations


def read_events(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    events: list[dict] = []
    for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        stripped = line.strip()
        if not stripped:
            continue
        try:
            record = json.loads(stripped)
        except json.JSONDecodeError as exc:
            raise ValueError(f"invalid JSON line {line_no}: {exc}") from exc
        if is_file_header(record):
            continue
        events.append(record)
    return events


def main() -> int:
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Validate improvement_event JSON")
    parser.add_argument(
        "--event",
        help="JSON string or path to .json file (single event)",
    )
    parser.add_argument(
        "--events-file",
        help="Validate all events in improvement-events.jsonl (skip header)",
    )
    parser.add_argument(
        "--paths",
        action="store_true",
        help="Print resolved default improvement-events path",
    )
    args = parser.parse_args()

    if args.paths:
        print(
            json.dumps(
                {"improvement_events_path": str(resolve_improvement_events_path())},
                ensure_ascii=False,
            )
        )
        return 0

    if args.events_file:
        path = Path(args.events_file).expanduser().resolve()
        try:
            events = read_events(path)
        except ValueError as exc:
            print(json.dumps({"ok": False, "error": str(exc)}))
            return 1
        all_violations: list[dict] = []
        for idx, event in enumerate(events):
            violations = validate_improvement_event(event)
            for v in violations:
                v["event_index"] = idx
                v["event_id"] = event.get("event_id")
            all_violations.extend(violations)
        if all_violations:
            print(
                json.dumps(
                    {
                        "ok": False,
                        "error": "schema_violation",
                        "violations": all_violations,
                        "event_count": len(events),
                    },
                    ensure_ascii=False,
                )
            )
            return 1
        print(
            json.dumps(
                {"ok": True, "event_count": len(events), "path": str(path)},
                ensure_ascii=False,
            )
        )
        return 0

    if not args.event:
        parser.error("provide --event, --events-file, or --paths")

    raw = args.event.strip()
    path = Path(raw)
    if path.is_file():
        event = json.loads(path.read_text(encoding="utf-8-sig"))
    else:
        event = json.loads(raw)

    violations = validate_improvement_event(event)
    if violations:
        print(
            json.dumps(
                {"ok": False, "error": "schema_violation", "violations": violations},
                ensure_ascii=False,
            )
        )
        return 1
    print(json.dumps({"ok": True, "event_id": event.get("event_id")}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
