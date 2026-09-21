#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""Verify a QA3 run is fully instrumented (sequence + run_finished) in events.jsonl."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from skill_paths import resolve_events_path
from telemetry_validate import load_run_events_from_path, validate_run_sequence

EXIT_OK = 0
EXIT_NOT_CLOSED = 1
EXIT_USAGE = 2


def verify_run(events_path: Path, run_id: str) -> dict:
    run_events = load_run_events_from_path(events_path, run_id)
    if not run_events:
        return {
            "ok": False,
            "error": "run_not_found",
            "run_id": run_id,
            "events_path": str(events_path),
            "has_run_finished": False,
            "sequence_ok": False,
            "violations": [
                {"path": "run_id", "code": "run_not_found", "message": "no events for run_id"}
            ],
        }

    violations = validate_run_sequence(run_events)
    has_finished = any(e.get("event_type") == "run_finished" for e in run_events)
    sequence_ok = len(violations) == 0

    if sequence_ok:
        return {
            "ok": True,
            "run_id": run_id,
            "events_path": str(events_path),
            "has_run_finished": has_finished,
            "sequence_ok": True,
            "event_count": len(run_events),
        }

    return {
        "ok": False,
        "error": "sequence_incomplete" if has_finished else "run_not_closed",
        "run_id": run_id,
        "events_path": str(events_path),
        "has_run_finished": has_finished,
        "sequence_ok": False,
        "violations": violations,
        "message": "run sequence incomplete or missing run_finished",
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Exit 0 if run_id has complete telemetry sequence in events.jsonl"
    )
    parser.add_argument(
        "--events",
        default=None,
        help="Path to events.jsonl (default: install ~/.cursor/skills/qa3-agent/telemetry/events.jsonl)",
    )
    parser.add_argument("--run-id", required=True, help="Run ID to verify")
    try:
        args = parser.parse_args()
    except SystemExit as exc:
        if exc.code not in (0, None):
            print(json.dumps({"ok": False, "error": "invalid_arguments"}))
            return EXIT_USAGE
        raise

    result = verify_run(resolve_events_path(args.events), args.run_id)
    print(json.dumps(result, ensure_ascii=False))
    return EXIT_OK if result["ok"] else EXIT_NOT_CLOSED


if __name__ == "__main__":
    raise SystemExit(main())
