#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""Merge QA3 telemetry JSONL journals into one canonical install journal."""

from __future__ import annotations

import argparse
import csv
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import append_event
import qa_stats
from skill_paths import discover_consolidation_sources, resolve_events_path
from telemetry_validate import validate_event

CSV_COLUMNS = append_event.CSV_COLUMNS
CSV_DELIMITER = append_event.CSV_DELIMITER
CSV_ENCODING = append_event.CSV_ENCODING


def _event_key(event: dict) -> tuple[str, str]:
    run_id = event.get("run_id") or ""
    event_id = event.get("event_id") or ""
    return (run_id, event_id)


def _parse_line(line: str, source: Path, line_no: int) -> dict | None:
    line = line.strip()
    if not line:
        return None
    try:
        event = json.loads(line)
    except json.JSONDecodeError:
        return None
    event["_consolidation_source"] = str(source)
    event["_consolidation_line"] = line_no
    return event


def load_events_from_file(path: Path) -> list[dict]:
    if not path.exists():
        return []
    events: list[dict] = []
    with path.open(encoding="utf-8") as fh:
        for line_no, raw in enumerate(fh, start=1):
            event = _parse_line(raw, path, line_no)
            if event is not None:
                events.append(event)
    return events


def _validation_score(event: dict) -> int:
    """Higher = prefer this copy when deduplicating."""
    violations = validate_event(event, allow_test=True)
    score = 100 - len(violations) * 10
    ts = event.get("timestamp") or ""
    return score * 10_000_000 + len(ts)


def dedupe_events(events: list[dict]) -> tuple[list[dict], dict]:
    best: dict[tuple[str, str], dict] = {}
    skipped_dupes = 0
    for event in events:
        key = _event_key(event)
        if not key[1]:
            key = (key[0], f"__line_{event.get('_consolidation_source')}:{event.get('_consolidation_line')}")
        existing = best.get(key)
        if existing is None or _validation_score(event) > _validation_score(existing):
            if existing is not None:
                skipped_dupes += 1
            best[key] = event
        else:
            skipped_dupes += 1
    merged = list(best.values())
    merged.sort(key=lambda e: (e.get("timestamp") or "", e.get("_consolidation_line") or 0))
    for event in merged:
        event.pop("_consolidation_source", None)
        event.pop("_consolidation_line", None)
    stats = {
        "input_events": len(events),
        "output_events": len(merged),
        "deduped": skipped_dupes,
        "unique_runs": len({e.get("run_id") for e in merged if e.get("run_id")}),
    }
    return merged, stats


def backup_file(path: Path, stamp: str) -> Path | None:
    if not path.exists() or path.stat().st_size == 0:
        return None
    backup_dir = path.parent / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup = backup_dir / f"{path.stem}.backup-{stamp}{path.suffix}"
    shutil.copy2(path, backup)
    return backup


def write_jsonl(path: Path, events: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as fh:
        for event in events:
            fh.write(json.dumps(event, ensure_ascii=False, separators=(",", ":")) + "\n")


def rebuild_runs_summary(events_path: Path) -> dict:
    """Rebuild CSV from all run_finished events in the journal."""
    csv_path = events_path.parent / "runs_summary.csv"
    if csv_path.exists():
        backup_file(csv_path, datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S"))

    run_ids: list[str] = []
    seen: set[str] = set()
    with events_path.open(encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line:
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            if event.get("event_type") != "run_finished":
                continue
            run_id = event.get("run_id")
            if run_id and run_id not in seen:
                seen.add(run_id)
                run_ids.append(run_id)

    rows: list[dict] = []
    for run_id in run_ids:
        run_events = qa_stats.load_run_events(events_path, run_id)
        finished = next((e for e in run_events if e.get("event_type") == "run_finished"), None)
        if not finished:
            continue
        append_event.inject_orchestration_flags(events_path, finished)
        rows.append(append_event.summary_row(finished, run_events))

    with csv_path.open("w", encoding=CSV_ENCODING, newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=CSV_COLUMNS, delimiter=CSV_DELIMITER)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)

    return {"runs_summary_csv": str(csv_path), "rows": len(rows)}


def merge_append_failures(sources: list[Path], output_dir: Path, stamp: str) -> dict:
    out_path = output_dir / "append_failures.jsonl"
    if out_path.exists():
        backup_file(out_path, stamp)

    keys: set[str] = set()
    merged_lines: list[str] = []
    for src_dir in {p.parent for p in sources}:
        failures = src_dir / "append_failures.jsonl"
        if not failures.exists():
            continue
        for raw in failures.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line in keys:
                continue
            keys.add(line)
            merged_lines.append(line)

    if merged_lines:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text("\n".join(merged_lines) + "\n", encoding="utf-8")

    return {"append_failures_jsonl": str(out_path), "lines": len(merged_lines)}


def consolidate(
    sources: list[Path],
    output: Path,
    *,
    dry_run: bool = False,
    mirror_repo: Path | None = None,
) -> dict:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    all_events: list[dict] = []
    source_report = []
    for src in sources:
        loaded = load_events_from_file(src)
        all_events.extend(loaded)
        source_report.append({"path": str(src), "events": len(loaded)})

    merged, dedupe_stats = dedupe_events(all_events)
    report: dict = {
        "sources": source_report,
        "dedupe": dedupe_stats,
        "output": str(output),
        "dry_run": dry_run,
    }

    if dry_run:
        return report

    if output.exists():
        report["backup_events"] = str(backup_file(output, stamp) or "")
    write_jsonl(output, merged)
    report["failures"] = merge_append_failures(sources, output.parent, stamp)
    report["csv"] = rebuild_runs_summary(output)

    if mirror_repo and mirror_repo.resolve() != output.resolve():
        mirror_repo.parent.mkdir(parents=True, exist_ok=True)
        if mirror_repo.exists():
            report["mirror_backup"] = str(backup_file(mirror_repo, stamp) or "")
        shutil.copy2(output, mirror_repo)
        failures_src = output.parent / "append_failures.jsonl"
        if failures_src.exists():
            shutil.copy2(failures_src, mirror_repo.parent / "append_failures.jsonl")
        csv_src = output.parent / "runs_summary.csv"
        if csv_src.exists():
            shutil.copy2(csv_src, mirror_repo.parent / "runs_summary.csv")
        report["mirror_repo"] = str(mirror_repo)

    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Consolidate QA3 telemetry JSONL journals")
    parser.add_argument(
        "--sources",
        nargs="*",
        help="JSONL files to merge (default: auto-discover install + repo + archives)",
    )
    parser.add_argument(
        "--output",
        help="Canonical output events.jsonl (default: install ~/.cursor/skills/qa3-agent/telemetry/)",
    )
    parser.add_argument(
        "--mirror-repo",
        action="store_true",
        help="Also copy consolidated journal to repo qa/qa3-agent/telemetry/",
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--json", action="store_true", help="Print JSON report on stdout")
    args = parser.parse_args()

    sources = [Path(p).expanduser().resolve() for p in args.sources] if args.sources else discover_consolidation_sources()
    if not sources:
        print("TELEMETRY_CONSOLIDATE_FAILED: no source journals found", file=sys.stderr)
        return 1

    output = Path(args.output).expanduser().resolve() if args.output else resolve_events_path()
    mirror = None
    if args.mirror_repo:
        mirror = Path(__file__).resolve().parent.parent / "telemetry" / "events.jsonl"

    try:
        report = consolidate(sources, output, dry_run=args.dry_run, mirror_repo=mirror)
    except Exception as exc:
        print(f"TELEMETRY_CONSOLIDATE_FAILED: {exc}", file=sys.stderr)
        return 1

    if args.json or not args.dry_run:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
