#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""ROI analysis by pass_kind and technique_pass from QA3 worker_complete events."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

from skill_paths import resolve_events_path
from telemetry_validate import TEST_RUN_PREFIXES

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_USAGE = 2

COSMETIC_QUALITY_THRESHOLD = 96


@dataclass
class RunWorkers:
    workers: list[dict] = field(default_factory=list)
    finished: dict | None = None


def is_test_run(run_id: str) -> bool:
    return isinstance(run_id, str) and run_id.startswith(TEST_RUN_PREFIXES)


def is_prod_closed(run_id: str, bucket: RunWorkers) -> bool:
    if is_test_run(run_id):
        return False
    return bucket.finished is not None


def is_cosmetic(worker: dict) -> bool:
    quality = worker.get("quality_score") or 0
    findings = worker.get("open_findings") or {}
    actionable = (findings.get("P0") or 0) + (findings.get("P1") or 0)
    return quality >= COSMETIC_QUALITY_THRESHOLD and actionable == 0


def _worker_slim(event: dict) -> dict:
    p = event.get("payload") or {}
    return {
        "pass_kind": p.get("pass_kind"),
        "technique_pass": p.get("technique_pass"),
        "quality_score": p.get("quality_score"),
        "open_findings": p.get("open_findings") or {},
        "findings_actionable": p.get("findings_actionable") or 0,
    }


def _aggregate_bucket(workers: list[dict]) -> dict:
    total = len(workers)
    cosmetic = sum(1 for w in workers if is_cosmetic(w))
    findings_total = sum(w.get("findings_actionable") or 0 for w in workers)
    non_cosmetic = total - cosmetic
    return {
        "workers": total,
        "cosmetic": cosmetic,
        "cosmetic_rate": round(cosmetic / total, 3) if total else 0,
        "non_cosmetic": non_cosmetic,
        "non_cosmetic_rate": round(non_cosmetic / total, 3) if total else 0,
        "findings_actionable_total": findings_total,
        "findings_per_worker": round(findings_total / total, 3) if total else 0,
    }


def _intra_run_redundancy(run_id: str, workers: list[dict]) -> list[dict]:
    by_kind: Counter = Counter()
    by_technique: Counter = Counter()
    for w in workers:
        pk = w.get("pass_kind")
        if pk:
            by_kind[pk] += 1
        tp = w.get("technique_pass")
        if tp:
            by_technique[tp] += 1
    out: list[dict] = []
    for kind, count in by_kind.items():
        if count > 1:
            out.append({"run_id": run_id, "dimension": "pass_kind", "key": kind, "count": count})
    for tp, count in by_technique.items():
        if count > 1:
            out.append(
                {"run_id": run_id, "dimension": "technique_pass", "key": tp, "count": count}
            )
    return out


def stream_runs(path: Path) -> tuple[dict[str, RunWorkers], int, int]:
    if not path.exists():
        return {}, 0, 0
    runs: dict[str, RunWorkers] = {}
    event_count = 0
    skipped = 0
    with path.open(encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line:
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                skipped += 1
                continue
            event_count += 1
            run_id = event.get("run_id", "unknown")
            bucket = runs.setdefault(run_id, RunWorkers())
            et = event.get("event_type")
            if et == "worker_complete":
                bucket.workers.append(_worker_slim(event))
            elif et == "run_finished":
                bucket.finished = event
    return runs, event_count, skipped


def build_report(
    events_path: Path,
    *,
    exclude_test: bool = True,
) -> dict:
    all_runs, event_count, skipped = stream_runs(events_path)
    prod_runs = {
        run_id: bucket
        for run_id, bucket in all_runs.items()
        if is_prod_closed(run_id, bucket)
        and (not exclude_test or not is_test_run(run_id))
    }

    by_pass_kind: dict[str, list[dict]] = defaultdict(list)
    by_technique_pass: dict[str, list[dict]] = defaultdict(list)
    redundancy: list[dict] = []
    worker_count = 0

    for run_id, bucket in prod_runs.items():
        worker_count += len(bucket.workers)
        redundancy.extend(_intra_run_redundancy(run_id, bucket.workers))
        for w in bucket.workers:
            pk = w.get("pass_kind") or "(unset)"
            by_pass_kind[pk].append(w)
            tp = w.get("technique_pass")
            if tp:
                by_technique_pass[tp].append(w)

    report: dict = {
        "ok": True,
        "events_path": str(events_path),
        "event_count": event_count,
        "run_count": len(prod_runs),
        "worker_count": worker_count,
        "by_pass_kind": {k: _aggregate_bucket(v) for k, v in sorted(by_pass_kind.items())},
        "by_technique_pass": {
            k: _aggregate_bucket(v) for k, v in sorted(by_technique_pass.items())
        },
        "intra_run_redundancy": redundancy,
        "redundancy_count": len(redundancy),
        "filters": {"exclude_test": exclude_test, "require_run_finished": True},
        "cosmetic_threshold": COSMETIC_QUALITY_THRESHOLD,
    }
    if skipped:
        report["skipped_lines"] = skipped
    if exclude_test:
        report["excluded_run_count"] = len(all_runs) - len(prod_runs)
    return report


def print_human(report: dict) -> None:
    print(f"Events: {report['event_count']} | Runs: {report['run_count']}")
    print(f"Workers: {report['worker_count']} | Redundancy: {report['redundancy_count']}")
    print()
    print("By pass_kind:")
    for kind, stats in report["by_pass_kind"].items():
        print(
            f"  {kind}: {stats['workers']} workers, "
            f"cosmetic {stats['cosmetic_rate']:.0%}, "
            f"findings/worker {stats['findings_per_worker']}"
        )
    if report["by_technique_pass"]:
        print()
        print("By technique_pass:")
        for tp, stats in report["by_technique_pass"].items():
            print(
                f"  {tp}: {stats['workers']} workers, "
                f"findings/worker {stats['findings_per_worker']}"
            )


def main() -> int:
    parser = argparse.ArgumentParser(description="Analyze QA3 pass ROI by kind and technique")
    parser.add_argument(
        "--events",
        default=None,
        help="Path to events.jsonl (default: install ~/.cursor/skills/qa3-agent/telemetry/events.jsonl)",
    )
    parser.add_argument("--json", action="store_true", help="JSON on stdout")
    parser.add_argument(
        "--include-test",
        action="store_true",
        help="Include test/smoke runs (default: exclude)",
    )
    try:
        args = parser.parse_args()
    except SystemExit as exc:
        if exc.code not in (0, None):
            print(json.dumps({"ok": False, "error": "invalid_arguments"}))
            return EXIT_USAGE
        raise

    events_path = resolve_events_path(args.events)
    exclude_test = not args.include_test

    try:
        report = build_report(events_path, exclude_test=exclude_test)
    except Exception as exc:
        print(f"ANALYZE_PASS_ROI_FAILED: {exc}", file=sys.stderr)
        print(json.dumps({"ok": False, "error": str(exc)}))
        return EXIT_FAIL

    if args.json:
        print(json.dumps(report, ensure_ascii=False))
    else:
        print_human(report)
    return EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
