#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""Append improvement_event records to improvement-events.jsonl (R-AI-01 v0.1)."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from append_event import FileLock
from validate_improvement_event import (
    is_file_header,
    read_events,
    resolve_improvement_events_path,
    validate_improvement_event,
)

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_USAGE = 2
EXIT_DUPLICATE = 3


def _utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_event(arg: str) -> dict:
    path = Path(arg)
    if path.is_file():
        return json.loads(path.read_text(encoding="utf-8-sig"))
    return json.loads(arg)


def normalize_event(event: dict) -> dict:
    if not event.get("recorded_at"):
        event["recorded_at"] = _utc_now()
    if not event.get("status"):
        event["status"] = "noted"
    return event


def existing_event_ids(path: Path) -> set[str]:
    return {str(e["event_id"]) for e in read_events(path) if e.get("event_id")}


def ensure_file_header(path: Path) -> None:
    if path.is_file() and path.stat().st_size > 0:
        first_line = path.read_text(encoding="utf-8").splitlines()[0].strip()
        if first_line:
            try:
                record = json.loads(first_line)
                if is_file_header(record):
                    return
            except json.JSONDecodeError:
                pass
    path.parent.mkdir(parents=True, exist_ok=True)
    header = {
        "_file_header": True,
        "schema_version": "0.1",
        "so_t_path": "jarmes-cockpit/global-bmad/telemetry/improvement-events.jsonl",
        "legacy_bridge": "mentor-events.jsonl",
        "created_at": _utc_now(),
    }
    line = json.dumps(header, ensure_ascii=False, separators=(",", ":"))
    with FileLock(path):
        with path.open("a", encoding="utf-8", newline="\n") as f:
            f.write(line + "\n")


def append_jsonl(path: Path, event: dict) -> None:
    ensure_file_header(path)
    line = json.dumps(event, ensure_ascii=False, separators=(",", ":"))
    with FileLock(path):
        with path.open("a", encoding="utf-8", newline="\n") as f:
            f.write(line + "\n")


def append_event(
    events_path: Path,
    event: dict,
    *,
    allow_duplicate: bool = False,
) -> tuple[bool, str | None]:
    """Return (ok, error_code). error_code duplicate | schema_violation | None."""
    event = normalize_event(dict(event))
    violations = validate_improvement_event(event)
    if violations:
        return False, "schema_violation"

    known = existing_event_ids(events_path)
    event_id = str(event["event_id"])
    if event_id in known and not allow_duplicate:
        return False, "duplicate_event_id"

    append_jsonl(events_path, event)
    return True, None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Append improvement_event (R-AI-01)")
    parser.add_argument(
        "--events",
        default=None,
        help="Path to improvement-events.jsonl (default: global-bmad SoT)",
    )
    parser.add_argument("--event", required=True, help="JSON string or path to .json file")
    parser.add_argument(
        "--allow-duplicate",
        action="store_true",
        help="Skip idempotence check (tests only)",
    )
    args = parser.parse_args(argv)

    events_path = resolve_improvement_events_path(args.events)
    try:
        event = load_event(args.event)
    except (json.JSONDecodeError, OSError) as exc:
        print(json.dumps({"ok": False, "error": "invalid_event", "message": str(exc)}))
        return EXIT_USAGE

    ok, err = append_event(
        events_path,
        event,
        allow_duplicate=args.allow_duplicate,
    )
    if not ok:
        if err == "schema_violation":
            violations = validate_improvement_event(normalize_event(dict(event)))
            print(
                json.dumps(
                    {
                        "ok": False,
                        "error": err,
                        "violations": violations,
                    },
                    ensure_ascii=False,
                )
            )
            return EXIT_FAIL
        if err == "duplicate_event_id":
            print(
                json.dumps(
                    {
                        "ok": False,
                        "error": err,
                        "event_id": event.get("event_id"),
                        "events_path": str(events_path),
                    },
                    ensure_ascii=False,
                )
            )
            return EXIT_DUPLICATE
        print(json.dumps({"ok": False, "error": err or "unknown"}))
        return EXIT_FAIL

    print(
        json.dumps(
            {
                "ok": True,
                "event_id": event.get("event_id"),
                "events_path": str(events_path),
            },
            ensure_ascii=False,
        )
    )
    return EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
