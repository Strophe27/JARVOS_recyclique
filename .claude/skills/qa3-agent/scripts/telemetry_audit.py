#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""Audit QA3 telemetry JSONL: schema, run completeness, parent chain, stale runs."""

from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

from skill_paths import resolve_events_path
from telemetry_validate import TEST_RUN_PREFIXES, _planner_routing, _schedule_required, validate_event

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_USAGE = 2

STALE_HOURS = 24
LEGACY_CUTOFF = datetime(2026, 6, 29, tzinfo=timezone.utc)
CORE_SEQUENCE = ("run_context", "routing_decision", "qa_fusion", "run_finished")
CSV_DELIMITER = ";"


def _load_csv_run_ids(csv_path: Path) -> set[str]:
    if not csv_path.is_file() or csv_path.stat().st_size == 0:
        return set()
    raw = csv_path.read_bytes()
    if raw.startswith(b"\xef\xbb\xbf"):
        text = raw[3:].decode("utf-8")
    else:
        text = raw.decode("utf-8-sig")
    lines = text.splitlines()
    if not lines:
        return set()
    reader = csv.DictReader(lines, delimiter=CSV_DELIMITER)
    return {row["run_id"] for row in reader if row.get("run_id")}


def _audit_csv_jsonl_drift(
    path: Path,
    events_by_run: dict[str, list[dict]],
    runs_without_finished: set[str],
    findings: list[dict],
) -> None:
    csv_path = path.parent / "runs_summary.csv"
    if not csv_path.is_file():
        return
    csv_run_ids = _load_csv_run_ids(csv_path)
    jsonl_finished = {
        run_id
        for run_id, events in events_by_run.items()
        if run_id not in runs_without_finished
    }
    for run_id in sorted(csv_run_ids - jsonl_finished):
        findings.append(
            _finding(
                "P1",
                "csv_jsonl_drift",
                f"run {run_id!r} in runs_summary.csv but no run_finished in JSONL",
                run_id=run_id,
            )
        )
    for run_id in sorted(jsonl_finished - csv_run_ids):
        if _is_test_run(run_id):
            continue
        findings.append(
            _finding(
                "P1",
                "csv_jsonl_drift",
                f"run {run_id!r} has run_finished in JSONL but missing from runs_summary.csv",
                run_id=run_id,
            )
        )


def _is_test_run(run_id: str) -> bool:
    return isinstance(run_id, str) and run_id.startswith(TEST_RUN_PREFIXES)


def _is_before_legacy_cutoff(event: dict) -> bool:
    ts = _parse_ts(event.get("timestamp"))
    return ts is not None and ts < LEGACY_CUTOFF


def _parse_ts(value: str | None) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    try:
        if value.endswith("Z"):
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def _planner_routing(routing: str | None) -> bool:
    return isinstance(routing, str) and routing.startswith("planner")


def _finding(
    severity: str,
    code: str,
    message: str,
    *,
    run_id: str | None = None,
    line: int | None = None,
    event_id: str | None = None,
) -> dict:
    out: dict = {"severity": severity, "code": code, "message": message}
    if run_id is not None:
        out["run_id"] = run_id
    if line is not None:
        out["line"] = line
    if event_id is not None:
        out["event_id"] = event_id
    return out


def audit_events(
    path: Path,
    *,
    include_legacy: bool = False,
    now: datetime | None = None,
) -> dict:
    """Scan JSONL and return structured audit report."""
    now = now or datetime.now(timezone.utc)
    stale_cutoff = now - timedelta(hours=STALE_HOURS)

    lines_read = 0
    skipped_lines = 0
    events_by_run: dict[str, list[dict]] = defaultdict(list)
    event_index: dict[tuple[str, str], dict] = {}
    line_records: list[dict] = []
    findings: list[dict] = []

    if not path.exists():
        return {
            "ok": True,
            "events_path": str(path),
            "lines_read": 0,
            "run_count": 0,
            "findings": [],
            "p0_count": 0,
            "lines": [],
            "runs": {},
            "include_legacy": include_legacy,
        }

  # Pass 1: load all events (no validation yet — need prior run events chronologically)
    parsed_events: list[tuple[int, dict]] = []
    with path.open(encoding="utf-8") as fh:
        for line_no, raw in enumerate(fh, start=1):
            text = raw.strip()
            if not text:
                continue
            lines_read += 1
            try:
                event = json.loads(text)
            except json.JSONDecodeError:
                skipped_lines += 1
                findings.append(
                    _finding(
                        "P0",
                        "json_decode",
                        f"line {line_no}: invalid JSON",
                        line=line_no,
                    )
                )
                continue
            parsed_events.append((line_no, event))

    # Pass 2: validate each event with prior events in same run (chronological)
    prior_by_run: dict[str, list[dict]] = defaultdict(list)
    for line_no, event in parsed_events:
        run_id = event.get("run_id", "unknown")
        event_id = event.get("event_id")
        prior_run_events = prior_by_run[run_id]
        violations = validate_event(
            event, allow_test=True, run_events=prior_run_events
        )
        tags: list[str] = []

        if _is_test_run(run_id):
            tags.append("legacy_test")
        if violations and (
            _is_test_run(run_id)
            or _is_before_legacy_cutoff(event)
            or include_legacy
        ):
            tags.append("legacy_invalid")

        record = {
            "line": line_no,
            "run_id": run_id,
            "event_id": event_id,
            "event_type": event.get("event_type"),
            "tags": tags,
            "violations": violations,
        }
        line_records.append(record)

        events_by_run[run_id].append({**event, "_line": line_no})
        if isinstance(event_id, str):
            event_index[(run_id, event_id)] = event
        prior_by_run[run_id].append(event)

    runs_without_finished: set[str] = set()
    for run_id, run_events in events_by_run.items():
        has_finished = any(e.get("event_type") == "run_finished" for e in run_events)
        if not has_finished:
            runs_without_finished.add(run_id)

    _audit_csv_jsonl_drift(path, events_by_run, runs_without_finished, findings)

    for record in line_records:
        if record["run_id"] in runs_without_finished:
            if "legacy_orphan" not in record["tags"]:
                record["tags"].append("legacy_orphan")


    # Schema violations: always P0 on completed prod runs; else skip legacy_invalid lines
    for record in line_records:
        if not record["violations"]:
            continue
        run_id = record["run_id"]
        completed_prod = run_id not in runs_without_finished and not _is_test_run(run_id)
        if completed_prod or "legacy_invalid" not in record["tags"]:
            for v in record["violations"]:
                findings.append(
                    _finding(
                        "P0",
                        "schema_violation",
                        f"{v['path']}: {v['message']}",
                        run_id=run_id,
                        line=record["line"],
                        event_id=record.get("event_id"),
                    )
                )

    # parent_event_id must reference same run
    for run_id, run_events in events_by_run.items():
        for event in run_events:
            parent_id = event.get("parent_event_id")
            if not parent_id:
                continue
            parent = event_index.get((run_id, parent_id))
            if parent is None:
                cross_run = next(
                    (
                        ev
                        for (rid, eid), ev in event_index.items()
                        if eid == parent_id and rid != run_id
                    ),
                    None,
                )
                if cross_run is not None:
                    parent = cross_run
            if parent is None:
                if not include_legacy and (
                    _is_test_run(run_id) or run_id in runs_without_finished
                ):
                    continue
                findings.append(
                    _finding(
                        "P1",
                        "parent_missing",
                        f"parent_event_id {parent_id!r} not found in journal",
                        run_id=run_id,
                        line=event.get("_line"),
                        event_id=event.get("event_id"),
                    )
                )
                continue
            if parent.get("run_id") != run_id:
                legacy = _is_test_run(run_id) or run_id in runs_without_finished
                if legacy and not include_legacy:
                    continue
                findings.append(
                    _finding(
                        "P0",
                        "parent_run_mismatch",
                        f"parent_event_id {parent_id!r} belongs to run "
                        f"{parent.get('run_id')!r}, not {run_id!r}",
                        run_id=run_id,
                        line=event.get("_line"),
                        event_id=event.get("event_id"),
                    )
                )

    # Incomplete sequences (runs with run_finished)
    for run_id, run_events in run_events_sorted(events_by_run):
        if run_id in runs_without_finished:
            continue
        if _is_test_run(run_id) and not include_legacy:
            continue

        types_present = {e.get("event_type") for e in run_events}
        missing_core = [t for t in CORE_SEQUENCE if t not in types_present]
        if missing_core:
            findings.append(
                _finding(
                    "P1",
                    "incomplete_sequence",
                    f"missing event types: {', '.join(missing_core)}",
                    run_id=run_id,
                )
            )

        routing_ev = next(
            (e for e in run_events if e.get("event_type") == "routing_decision"), None
        )
        routing = None
        if routing_ev:
            routing = (routing_ev.get("payload") or {}).get("routing")

        if _planner_routing(routing):
            has_planner = any(e.get("event_type") == "planner_complete" for e in run_events)
            has_worker = any(e.get("event_type") == "worker_complete" for e in run_events)
            if not has_planner and has_worker:
                findings.append(
                    _finding(
                        "P1",
                        "incomplete_sequence",
                        "planner routing without planner_complete before workers",
                        run_id=run_id,
                    )
                )
            if _schedule_required(run_events):
                has_schedule = any(
                    e.get("event_type") == "schedule_complete" for e in run_events
                )
                if not has_schedule and has_worker:
                    findings.append(
                        _finding(
                            "P1",
                            "incomplete_sequence",
                            "planner multi-pass without schedule_complete before workers (R11)",
                            run_id=run_id,
                        )
                    )

        if "worker_complete" not in types_present and "qa_fusion" in types_present:
            findings.append(
                _finding(
                    "P1",
                    "incomplete_sequence",
                    "qa_fusion without worker_complete",
                    run_id=run_id,
                )
            )

    # Stale open runs (> 24h without run_finished)
    for run_id in runs_without_finished:
        if _is_test_run(run_id) and not include_legacy:
            continue
        timestamps = [
            _parse_ts(e.get("timestamp"))
            for e in events_by_run[run_id]
            if _parse_ts(e.get("timestamp")) is not None
        ]
        if not timestamps:
            continue
        first_ts = min(timestamps)
        if first_ts < stale_cutoff:
            age_h = round((now - first_ts).total_seconds() / 3600, 1)
            findings.append(
                _finding(
                    "P1",
                    "stale_open_run",
                    f"run open {age_h}h without run_finished (threshold {STALE_HOURS}h)",
                    run_id=run_id,
                )
            )

    # Filter output lines/runs when legacy excluded
    visible_lines = line_records
    if not include_legacy:
        visible_lines = [r for r in line_records if not r["tags"]]

    run_summaries = {}
    for run_id, run_events in events_by_run.items():
        tags = sorted(
            {
                tag
                for r in line_records
                if r["run_id"] == run_id
                for tag in r["tags"]
            }
        )
        if tags and not include_legacy:
            continue
        run_summaries[run_id] = {
            "event_count": len(run_events),
            "has_run_finished": run_id not in runs_without_finished,
            "tags": tags,
            "event_types": sorted({e.get("event_type") for e in run_events}),
        }

    visible_findings = findings
    if not include_legacy:
        visible_findings = [
            f
            for f in findings
            if not (
                _is_test_run(f.get("run_id", ""))
                or f.get("run_id") in runs_without_finished
            )
        ]

    p0_non_legacy = [
        f
        for f in findings
        if f["severity"] == "P0"
        and not _is_test_run(f.get("run_id", ""))
        and f.get("run_id") not in runs_without_finished
    ]

    report: dict = {
        "ok": len(p0_non_legacy) == 0,
        "events_path": str(path),
        "lines_read": lines_read,
        "skipped_lines": skipped_lines,
        "run_count": len(events_by_run),
        "legacy_run_count": sum(1 for r in runs_without_finished),
        "p0_count": len(p0_non_legacy),
        "findings": visible_findings,
        "lines": visible_lines,
        "runs": run_summaries,
        "include_legacy": include_legacy,
    }
    return report


def run_events_sorted(runs: dict[str, list[dict]]) -> list[tuple[str, list[dict]]]:
    return sorted(runs.items(), key=lambda item: item[0])


def print_human(report: dict) -> None:
    print(f"Events path: {report['events_path']}")
    print(f"Lines: {report['lines_read']} | Runs: {report['run_count']}")
    if report.get("skipped_lines"):
        print(f"Skipped invalid JSON: {report['skipped_lines']}")
    print(f"P0 (non-legacy): {report['p0_count']} | OK: {report['ok']}")
    if not report.get("include_legacy"):
        print("(legacy runs/lines hidden — use --include-legacy)")
    print()

    tagged = [r for r in report.get("lines", []) if r.get("tags")]
    if tagged:
        print("Tagged lines:")
        for r in tagged:
            vcount = len(r.get("violations") or [])
            extra = f", {vcount} violation(s)" if vcount else ""
            print(
                f"  L{r['line']} {r['run_id']} {r.get('event_type')}: "
                f"{', '.join(r['tags'])}{extra}"
            )
        print()

    findings = report.get("findings") or []
    if findings:
        print("Findings:")
        for f in findings:
            loc = ""
            if f.get("line"):
                loc = f" L{f['line']}"
            print(f"  [{f['severity']}] {f['code']}{loc}: {f['message']}")
        print()

    stale = [f for f in findings if f["code"] == "stale_open_run"]
    if stale:
        print("Stale open runs (>24h):")
        for f in stale:
            print(f"  {f['run_id']}: {f['message']}")
        print()


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit QA3 telemetry JSONL")
    parser.add_argument(
        "--events",
        default=None,
        help="Path to events.jsonl (default: install ~/.cursor/skills/qa3-agent/telemetry/events.jsonl)",
    )
    parser.add_argument("--json", action="store_true", help="JSON on stdout")
    parser.add_argument(
        "--include-legacy",
        action="store_true",
        help="Include legacy test/orphan/invalid lines in output and findings",
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
        report = audit_events(events_path, include_legacy=args.include_legacy)
    except Exception as exc:
        print(f"TELEMETRY_AUDIT_FAILED: {exc}", file=sys.stderr)
        print(json.dumps({"ok": False, "error": str(exc)}))
        return EXIT_FAIL

    if args.json:
        print(json.dumps(report, ensure_ascii=False))
    else:
        print_human(report)

    return EXIT_OK if report["ok"] else EXIT_FAIL


if __name__ == "__main__":
    raise SystemExit(main())
