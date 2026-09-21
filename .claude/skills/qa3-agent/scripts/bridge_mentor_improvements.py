#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""
Bridge read-only: mentor-events.jsonl (kind=skill_gap) -> improvement_event (R-AI-01).

v0: prints normalized JSONL to stdout — no disk write.
"""

from __future__ import annotations

import argparse
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from validate_improvement_event import resolve_improvement_events_path

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_USAGE = 2

PROJECT_ID = "jarmes-skills-rules"
MENTOR_BUNDLE = "Skills/jarmes-bmad-trio/agents/mentor/"

SEVERITY_MAP = {
    "note": "note",
    "recurring": "important",
    "blocking": "bloquant",
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def resolve_mentor_events_path(
    explicit: str | None,
    *,
    cockpit_racine: Path | None = None,
) -> Path:
    if explicit:
        return Path(explicit).expanduser().resolve()
    improvement = resolve_improvement_events_path()
    return improvement.parent / "mentor-events.jsonl"


def read_mentor_events(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    events: list[dict] = []
    for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        stripped = line.strip()
        if not stripped:
            continue
        try:
            events.append(json.loads(stripped))
        except json.JSONDecodeError as exc:
            print(
                json.dumps({"warning": f"skip line {line_no}", "message": str(exc)}),
                file=sys.stderr,
            )
    return events


def mentor_gap_to_improvement(mentor_event: dict) -> dict | None:
    if mentor_event.get("kind") != "skill_gap":
        return None

    problem = (
        mentor_event.get("what_happened")
        or mentor_event.get("soul_note")
        or "skill gap mentor"
    )
    recommendation = mentor_event.get("improvement_hint") or ""
    if not recommendation and not problem:
        return None

    artifact_id = (
        mentor_event.get("expected_owner")
        or mentor_event.get("capability_actual")
        or mentor_event.get("capability_routed")
        or "bmad-mentor"
    )
    artifact_id = str(artifact_id).removeprefix("@")

    severity_raw = str(mentor_event.get("severity", "note"))
    severity = SEVERITY_MAP.get(severity_raw, "note")

    recorded_at = mentor_event.get("ts") or mentor_event.get("recorded_at") or _utc_now()
    if recorded_at.endswith("+00:00"):
        recorded_at = recorded_at.replace("+00:00", "Z")

    event = {
        "event_id": str(mentor_event.get("event_id") or uuid.uuid4()),
        "recorded_at": recorded_at,
        "artifact_type": "skill",
        "artifact_id": artifact_id,
        "source_bundle": MENTOR_BUNDLE,
        "install_target": "both",
        "problem": str(problem)[:500],
        "recommendation": str(recommendation)[:1000] if recommendation else str(problem)[:1000],
        "source": "mentor_self",
        "severity": severity,
        "status": "noted",
        "project_id": mentor_event.get("project_id") or PROJECT_ID,
    }
    if mentor_event.get("session_ref"):
        event["session_ref"] = mentor_event["session_ref"]
    return event


def build_bridge_events(mentor_events: list[dict]) -> list[dict]:
    out: list[dict] = []
    for raw in mentor_events:
        mapped = mentor_gap_to_improvement(raw)
        if mapped:
            out.append(mapped)
    return out


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Read mentor-events skill_gap -> improvement_event (read-only v0)",
    )
    parser.add_argument(
        "--mentor-events",
        help="Path to mentor-events.jsonl (default: sibling of improvement-events)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Max events to emit (0 = all)",
    )
    parser.add_argument(
        "--json-summary",
        action="store_true",
        help="Print summary JSON on stderr after stdout JSONL",
    )
    args = parser.parse_args(argv)

    mentor_path = resolve_mentor_events_path(args.mentor_events)
    if not mentor_path.is_file():
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": "mentor_events_missing",
                    "path": str(mentor_path),
                    "message": "read-only bridge v0 — file absent",
                }
            ),
            file=sys.stderr,
        )
        return EXIT_USAGE

    mentor_events = read_mentor_events(mentor_path)
    bridge_events = build_bridge_events(mentor_events)
    if args.limit > 0:
        bridge_events = bridge_events[-args.limit :]

    for ev in bridge_events:
        print(json.dumps(ev, ensure_ascii=False))

    if args.json_summary:
        print(
            json.dumps(
                {
                    "ok": True,
                    "read_only": True,
                    "mentor_path": str(mentor_path),
                    "mentor_count": len(mentor_events),
                    "bridge_count": len(bridge_events),
                }
            ),
            file=sys.stderr,
        )
    return EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
