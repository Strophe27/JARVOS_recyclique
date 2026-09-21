#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""Analyze QA3 loop_cycle trajectories, gate finals, stagnation, exhaustion."""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

from skill_paths import resolve_events_path
from telemetry_validate import TEST_RUN_PREFIXES

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_USAGE = 2

DEFAULT_MAX_CYCLES = 3


@dataclass
class RunCycles:
    context: dict | None = None
    cycles: list[dict] = field(default_factory=list)
    finished: dict | None = None


def is_test_run(run_id: str) -> bool:
    return isinstance(run_id, str) and run_id.startswith(TEST_RUN_PREFIXES)


def is_prod_closed(run_id: str, bucket: RunCycles) -> bool:
    if is_test_run(run_id):
        return False
    return bucket.finished is not None


def _cycle_point(event: dict) -> dict:
    p = event.get("payload") or {}
    return {
        "loop_iteration": p.get("loop_iteration"),
        "gate_passed": p.get("gate_passed"),
        "fused_quality": p.get("fused_quality"),
        "fused_coverage": p.get("fused_coverage"),
        "score_delta": p.get("score_delta", 0),
        "corrections_applied": p.get("corrections_applied"),
        "hitl": p.get("hitl"),
    }


def detect_stagnation(cycles: list[dict]) -> bool:
    """True when two consecutive loop_cycle events have score_delta == 0."""
    if len(cycles) < 2:
        return False
    ordered = sorted(cycles, key=lambda c: (c.get("loop_iteration") or 0))
    for prev, curr in zip(ordered, ordered[1:]):
        if (prev.get("score_delta") or 0) == 0 and (curr.get("score_delta") or 0) == 0:
            return True
    return False


def detect_exhaustion(bucket: RunCycles) -> bool:
    """
    loop_iterations >= max_cycles without final gate_passed,
    or last cycle hitl without gate.
    """
    if not bucket.finished:
        return False
    ctx = (bucket.context or {}).get("payload") or {}
    fin = bucket.finished.get("payload") or {}
    loop_enabled = bool(ctx.get("loop_enabled") or fin.get("loop_enabled"))
    if not loop_enabled and not bucket.cycles:
        return False
    max_cycles = ctx.get("max_cycles") or DEFAULT_MAX_CYCLES
    loop_iterations = fin.get("loop_iterations")
    if loop_iterations is None and bucket.cycles:
        loop_iterations = max(c.get("loop_iteration") or 0 for c in bucket.cycles)
    if loop_iterations is None:
        loop_iterations = 0
    gate_passed = bool(fin.get("gate_passed"))
    if loop_iterations >= max_cycles and not gate_passed:
        return True
    if bucket.cycles:
        ordered = sorted(bucket.cycles, key=lambda c: (c.get("loop_iteration") or 0))
        last = ordered[-1]
        if last.get("hitl") and not last.get("gate_passed"):
            return True
    return False


def stream_runs(path: Path) -> tuple[dict[str, RunCycles], int, int]:
    if not path.exists():
        return {}, 0, 0
    runs: dict[str, RunCycles] = {}
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
            bucket = runs.setdefault(run_id, RunCycles())
            et = event.get("event_type")
            p = event.get("payload") or {}
            if et == "run_context":
                bucket.context = event
            elif et == "loop_cycle":
                bucket.cycles.append(_cycle_point(event))
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

    gate_ok = 0
    gate_fail = 0
    trajectories: dict[str, list[dict]] = {}
    stagnation_runs: list[dict] = []
    exhaustion_runs: list[dict] = []

    for run_id, bucket in sorted(prod_runs.items()):
        fin = (bucket.finished or {}).get("payload") or {}
        if fin.get("gate_passed"):
            gate_ok += 1
        else:
            gate_fail += 1

        traj = sorted(bucket.cycles, key=lambda c: (c.get("loop_iteration") or 0))
        trajectories[run_id] = traj

        if detect_stagnation(bucket.cycles):
            stagnation_runs.append({"run_id": run_id, "cycles": traj})

        if detect_exhaustion(bucket):
            ctx = (bucket.context or {}).get("payload") or {}
            exhaustion_runs.append(
                {
                    "run_id": run_id,
                    "max_cycles": ctx.get("max_cycles") or DEFAULT_MAX_CYCLES,
                    "loop_iterations": fin.get("loop_iterations"),
                    "gate_passed": fin.get("gate_passed"),
                    "outcome": fin.get("outcome"),
                }
            )

    loop_run_count = sum(1 for b in prod_runs.values() if b.cycles)
    report: dict = {
        "ok": True,
        "events_path": str(events_path),
        "event_count": event_count,
        "run_count": len(prod_runs),
        "loop_run_count": loop_run_count,
        "gate_final": {"ok": gate_ok, "fail": gate_fail},
        "trajectories": trajectories,
        "stagnation_count": len(stagnation_runs),
        "stagnation_runs": stagnation_runs,
        "exhaustion_count": len(exhaustion_runs),
        "exhaustion_runs": exhaustion_runs,
        "filters": {"exclude_test": exclude_test, "require_run_finished": True},
    }
    if skipped:
        report["skipped_lines"] = skipped
    if exclude_test:
        report["excluded_run_count"] = len(all_runs) - len(prod_runs)
    return report


def print_human(report: dict) -> None:
    gf = report["gate_final"]
    print(f"Events: {report['event_count']} | Prod runs: {report['run_count']}")
    print(f"Loop runs: {report['loop_run_count']}")
    print(f"Gate final OK: {gf['ok']} | FAIL: {gf['fail']}")
    print(f"Stagnation (score_delta=0 x2): {report['stagnation_count']}")
    print(f"Exhaustion (max_cycles): {report['exhaustion_count']}")
    print()
    for run_id, traj in sorted(report["trajectories"].items()):
        if not traj:
            continue
        parts = [
            f"iter={c.get('loop_iteration')} d={c.get('score_delta', 0)}"
            f" gate={'Y' if c.get('gate_passed') else 'N'}"
            for c in traj
        ]
        print(f"  {run_id}: {' -> '.join(parts)}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Analyze QA3 loop_cycle trajectories")
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
        print(f"ANALYZE_CYCLES_FAILED: {exc}", file=sys.stderr)
        print(json.dumps({"ok": False, "error": str(exc)}))
        return EXIT_FAIL

    if args.json:
        print(json.dumps(report, ensure_ascii=False))
    else:
        print_human(report)
    return EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
