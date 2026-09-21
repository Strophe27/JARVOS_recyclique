#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""Append QA3 telemetry events (JSONL) with file lock. Optional CSV summary row."""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from analyze_cycles import detect_stagnation
import qa_stats
from qa_stats import _as_int
from skill_paths import resolve_events_path
from telemetry_validate import validate_event

CSV_COLUMNS = [
    "run_id",
    "date",
    "project",
    "qa_variant",
    "entry_trigger",
    "wrapper_skill",
    "kinds",
    "routing",
    "mode",
    "pipeline",
    "loop_enabled",
    "total_workers",
    "final_quality",
    "final_coverage",
    "final_p0",
    "final_p1",
    "gate_passed",
    "findings_actionable",
    "outcome",
    "orchestration_flags",
]

# Point-virgule : Excel FR (locale virgule decimale). UTF-8 BOM pour accents a l'ouverture.
CSV_DELIMITER = ";"
CSV_ENCODING = "utf-8-sig"

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_USAGE = 2


def _pipe_list(value) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return "|".join(str(v) for v in value)
    return str(value)


def _emit(ok: bool, payload: dict, code: int) -> None:
    out = {"ok": ok, **payload}
    print(json.dumps(out, ensure_ascii=False))
    raise SystemExit(code)


class FileLock:
    STALE_SECONDS = 120.0

    def __init__(self, path: Path, timeout: float = 30.0, poll: float = 0.05):
        self.lock_path = path.with_suffix(path.suffix + ".lock")
        self.timeout = timeout
        self.poll = poll
        self._fd: int | None = None

    def _remove_stale_lock(self) -> None:
        if not self.lock_path.exists():
            return
        try:
            age = time.time() - self.lock_path.stat().st_mtime
            if age > self.STALE_SECONDS:
                self.lock_path.unlink(missing_ok=True)
        except OSError:
            pass

    def __enter__(self):
        deadline = time.monotonic() + self.timeout
        while True:
            self._remove_stale_lock()
            try:
                self._fd = os.open(
                    self.lock_path,
                    os.O_CREAT | os.O_EXCL | os.O_WRONLY,
                )
                os.write(self._fd, str(os.getpid()).encode())
                return self
            except FileExistsError:
                if time.monotonic() >= deadline:
                    raise TimeoutError(f"Lock timeout: {self.lock_path}")
                time.sleep(self.poll)

    def __exit__(self, exc_type, exc, tb):
        if self._fd is not None:
            os.close(self._fd)
            self._fd = None
        try:
            self.lock_path.unlink(missing_ok=True)
        except OSError:
            pass


def load_event(arg: str) -> dict:
    path = Path(arg)
    if path.is_file():
        return json.loads(path.read_text(encoding="utf-8-sig"))
    return json.loads(arg)


def normalize_event(event: dict) -> dict:
    event["timestamp"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if "schema_version" not in event:
        event["schema_version"] = 1
    return event


def log_append_failure(events_path: Path, event: dict, violations: list[dict]) -> None:
    failures_path = events_path.parent / "append_failures.jsonl"
    entry = {
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "run_id": event.get("run_id"),
        "event_id": event.get("event_id"),
        "event_type": event.get("event_type"),
        "violations": violations,
    }
    failures_path.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(entry, ensure_ascii=False, separators=(",", ":"))
    with FileLock(failures_path):
        with failures_path.open("a", encoding="utf-8", newline="\n") as f:
            f.write(line + "\n")


def append_jsonl(events_path: Path, event: dict) -> None:
    events_path.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(event, ensure_ascii=False, separators=(",", ":"))
    with FileLock(events_path):
        with events_path.open("a", encoding="utf-8", newline="\n") as f:
            f.write(line + "\n")


def _cycle_points_from_run(run_events: list[dict]) -> list[dict]:
    points: list[dict] = []
    for ev in run_events:
        if ev.get("event_type") != "loop_cycle":
            continue
        p = ev.get("payload") or {}
        points.append(
            {
                "loop_iteration": p.get("loop_iteration"),
                "score_delta": _as_int(p.get("score_delta")),
            }
        )
    return points


def enforce_runtime_rules(
    event: dict,
    run_events: list[dict],
    *,
    allow_stagnation: bool = False,
    allow_gate_p1_open: bool = False,
) -> list[dict]:
    """R2 stagnation + R3 gate P1 — runtime hooks before append."""
    violations: list[dict] = []
    event_type = event.get("event_type")
    payload = event.get("payload") or {}

    if event_type == "loop_cycle" and not allow_stagnation:
        existing = _cycle_points_from_run(run_events)
        if detect_stagnation(existing):
            violations.append(
                {
                    "code": "stagnation_blocked",
                    "path": "event_type",
                    "message": (
                        "loop_cycle append rejected: 2 consecutive score_delta=0 "
                        "already recorded for this run_id (R2); use --allow-stagnation to override"
                    ),
                }
            )

    if event_type == "run_finished" and not allow_gate_p1_open:
        if payload.get("gate_passed") and _as_int(payload.get("final_p1")) > 0:
            violations.append(
                {
                    "code": "gate_p1_blocked",
                    "path": "payload.gate_passed",
                    "message": (
                        "run_finished with gate_passed=true rejected while final_p1 > 0 (R3); "
                        "run cloture integrale (step H) or use --allow-gate-p1-open to override"
                    ),
                }
            )

    return violations


def inject_orchestration_flags(events_path: Path, event: dict) -> None:
    run_id = event.get("run_id")
    if not run_id:
        return
    run_events = qa_stats.load_run_events(events_path, run_id)
    flags = qa_stats.compute_run_flags(run_events)
    payload = event.setdefault("payload", {})
    payload["orchestration_flags"] = flags


def _run_context_payload(run_events: list[dict] | None) -> dict:
    if not run_events:
        return {}
    ctx = next((e for e in run_events if e.get("event_type") == "run_context"), None)
    return (ctx.get("payload") or {}) if ctx else {}


def summary_row(event: dict, run_events: list[dict] | None = None) -> dict:
    payload = event.get("payload") or {}
    ctx_payload = _run_context_payload(run_events)
    entry_trigger = ctx_payload.get("entry_trigger", "")
    wrapper_skill = ctx_payload.get("wrapper_skill", "")
    if wrapper_skill is None:
        wrapper_skill = ""
    return {
        "run_id": event.get("run_id", ""),
        "date": (event.get("timestamp") or "")[:10],
        "project": event.get("project", ""),
        "qa_variant": event.get("qa_variant", ""),
        "entry_trigger": entry_trigger,
        "wrapper_skill": wrapper_skill,
        "kinds": _pipe_list(payload.get("kinds")),
        "routing": payload.get("routing", ""),
        "mode": payload.get("mode", ""),
        "pipeline": payload.get("pipeline", ""),
        "loop_enabled": payload.get("loop_enabled", ""),
        "total_workers": payload.get("total_workers", ""),
        "final_quality": payload.get("final_quality", ""),
        "final_coverage": payload.get("final_coverage", ""),
        "final_p0": payload.get("final_p0", ""),
        "final_p1": payload.get("final_p1", ""),
        "gate_passed": payload.get("gate_passed", ""),
        "findings_actionable": payload.get(
            "findings_actionable", payload.get("total_findings_actionable", "")
        ),
        "outcome": payload.get("outcome", ""),
        "orchestration_flags": _pipe_list(payload.get("orchestration_flags")),
    }


def append_summary_csv(
    events_path: Path, event: dict, run_events: list[dict] | None = None
) -> None:
    if event.get("event_type") != "run_finished":
        raise ValueError("--summary requires event_type run_finished")
    csv_path = events_path.parent / "runs_summary.csv"
    row = summary_row(event, run_events)
    with FileLock(csv_path):
        write_header = not csv_path.exists() or csv_path.stat().st_size == 0
        with csv_path.open("a", encoding=CSV_ENCODING, newline="") as f:
            writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS, delimiter=CSV_DELIMITER)
            if write_header:
                writer.writeheader()
            writer.writerow(row)


def main() -> int:
    parser = argparse.ArgumentParser(description="Append QA3 telemetry event")
    parser.add_argument(
        "--events",
        default=None,
        help="Path to events.jsonl (default: install ~/.cursor/skills/qa3-agent/telemetry/events.jsonl)",
    )
    parser.add_argument("--event", required=True, help="JSON string or path to .json file")
    parser.add_argument(
        "--summary",
        action="store_true",
        help="Also append runs_summary.csv (run_finished only)",
    )
    parser.add_argument(
        "--allow-test",
        action="store_true",
        help="Allow run_id prefixes test_ and smoke_ (unit tests only)",
    )
    parser.add_argument(
        "--allow-stagnation",
        action="store_true",
        help="Allow loop_cycle append after 2 consecutive score_delta=0 (R2 override)",
    )
    parser.add_argument(
        "--allow-gate-p1-open",
        action="store_true",
        help="Allow run_finished gate_passed=true with final_p1 > 0 (R3 override)",
    )
    try:
        args = parser.parse_args()
    except SystemExit as exc:
        if exc.code not in (0, None):
            print(json.dumps({"ok": False, "error": "invalid_arguments"}))
            return EXIT_USAGE
        raise

    events_path = resolve_events_path(args.events)
    try:
        event = normalize_event(load_event(args.event))
        run_id = event.get("run_id")
        run_events = (
            qa_stats.load_run_events(events_path, run_id) if run_id else []
        )
        violations = validate_event(
            event, allow_test=args.allow_test, run_events=run_events
        )
        if violations:
            log_append_failure(events_path, event, violations)
            print(
                json.dumps(
                    {"ok": False, "error": "schema_violation", "violations": violations},
                    ensure_ascii=False,
                )
            )
            return EXIT_FAIL

        runtime_violations = enforce_runtime_rules(
            event,
            run_events,
            allow_stagnation=args.allow_stagnation,
            allow_gate_p1_open=args.allow_gate_p1_open,
        )
        if runtime_violations:
            log_append_failure(events_path, event, runtime_violations)
            print(
                json.dumps(
                    {
                        "ok": False,
                        "error": "runtime_enforcement",
                        "violations": runtime_violations,
                    },
                    ensure_ascii=False,
                ),
                file=sys.stderr,
            )
            print(
                json.dumps(
                    {
                        "ok": False,
                        "error": "runtime_enforcement",
                        "violations": runtime_violations,
                    },
                    ensure_ascii=False,
                )
            )
            return EXIT_FAIL

        if args.summary and event.get("event_type") != "run_finished":
            raise ValueError("--summary requires event_type run_finished")

        append_jsonl(events_path, event)
        result: dict = {
            "event_id": event.get("event_id"),
            "event_type": event.get("event_type"),
            "run_id": event.get("run_id"),
            "events_path": str(events_path),
        }
        if args.summary:
            inject_orchestration_flags(events_path, event)
            run_events_with_new = run_events + [event]
            append_summary_csv(events_path, event, run_events_with_new)
            result["summary_csv"] = str(events_path.parent / "runs_summary.csv")
        print(json.dumps({"ok": True, **result}, ensure_ascii=False))
        return EXIT_OK
    except Exception as exc:
        print(f"TELEMETRY_APPEND_FAILED: {exc}", file=sys.stderr)
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        return EXIT_FAIL


if __name__ == "__main__":
    raise SystemExit(main())
