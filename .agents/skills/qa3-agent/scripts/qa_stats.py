#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""Aggregate QA3 telemetry and compute orchestration flags (streaming JSONL)."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

from skill_paths import resolve_events_path
from telemetry_validate import TEST_RUN_PREFIXES

try:
    from analyze_cycles import detect_stagnation
except ImportError:
    def detect_stagnation(cycles: list[dict]) -> bool:
        """Fallback when analyze_cycles not on path."""
        if len(cycles) < 2:
            return False
        ordered = sorted(cycles, key=lambda c: (c.get("loop_iteration") or 0))
        for prev, curr in zip(ordered, ordered[1:]):
            if _as_int(prev.get("score_delta")) == 0 and _as_int(curr.get("score_delta")) == 0:
                return True
        return False

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_USAGE = 2


def _as_int(value: object, default: int = 0) -> int:
    """Coerce numeric payload fields; explicit null counts as default."""
    if value is None:
        return default
    if isinstance(value, bool):
        return int(value)
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


@dataclass
class RunBucket:
    routing: dict | None = None
    workers: list[dict] = field(default_factory=list)
    fusions: list[dict] = field(default_factory=list)
    cycles: list[dict] = field(default_factory=list)
    finished: dict | None = None


def stream_buckets(path: Path) -> tuple[dict[str, RunBucket], int, int, dict[str, dict]]:
    """One pass over JSONL — keeps only fields needed for flags/aggregates."""
    if not path.exists():
        return {}, 0, 0, {}
    runs: dict[str, RunBucket] = {}
    event_count = 0
    skipped = 0
    technique_roi: dict[str, dict] = defaultdict(lambda: {"runs": 0, "with_findings": 0})

    with path.open(encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line:
                continue
            try:
                e = json.loads(line)
            except json.JSONDecodeError:
                skipped += 1
                continue
            event_count += 1
            run_id = e.get("run_id", "unknown")
            bucket = runs.setdefault(run_id, RunBucket())
            et = e.get("event_type")
            p = e.get("payload") or {}

            if et == "routing_decision":
                bucket.routing = {
                    "routing": p.get("routing"),
                    "kinds": p.get("kinds"),
                    "kinds_mixtes": p.get("kinds_mixtes"),
                    "source_count": p.get("source_count"),
                    "pipeline": p.get("pipeline"),
                }
            elif et == "worker_complete":
                slim = {
                    "pass_added_value": p.get("pass_added_value"),
                    "open_findings": p.get("open_findings"),
                    "findings_actionable": p.get("findings_actionable"),
                    "technique_pass": p.get("technique_pass"),
                }
                bucket.workers.append(slim)
                tp = p.get("technique_pass")
                if tp:
                    technique_roi[tp]["runs"] += 1
                    if (p.get("findings_actionable") or 0) > 0:
                        technique_roi[tp]["with_findings"] += 1
            elif et == "qa_fusion":
                bucket.fusions.append(
                    {
                        "fused_quality": p.get("fused_quality"),
                        "fused_coverage": p.get("fused_coverage"),
                        "fused_audit_confidence": p.get("fused_audit_confidence"),
                        "open_findings": p.get("open_findings"),
                        "gate_passed": p.get("gate_passed"),
                    }
                )
            elif et == "loop_cycle":
                bucket.cycles.append(
                    {
                        "loop_iteration": p.get("loop_iteration"),
                        "score_delta": _as_int(p.get("score_delta")),
                        "fused_quality": p.get("fused_quality"),
                        "gate_passed": p.get("gate_passed"),
                    }
                )
            elif et == "run_finished":
                bucket.finished = {
                    "outcome": p.get("outcome"),
                    "routing": p.get("routing"),
                    "gate_passed": p.get("gate_passed"),
                    "final_p1": p.get("final_p1"),
                }

    return runs, event_count, skipped, dict(technique_roi)


def load_run_events(path: Path, run_id: str) -> list[dict]:
    """Load all events for a run_id from JSONL (for flag computation)."""
    if not path.exists():
        return []
    events: list[dict] = []
    with path.open(encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line:
                continue
            try:
                e = json.loads(line)
            except json.JSONDecodeError:
                continue
            if e.get("run_id") == run_id:
                events.append(e)
    return events


def bucket_to_events(bucket: RunBucket) -> list[dict]:
    """Reconstruct minimal event list for flag helpers."""
    out: list[dict] = []
    if bucket.routing:
        out.append({"event_type": "routing_decision", "payload": bucket.routing})
    for w in bucket.workers:
        out.append({"event_type": "worker_complete", "payload": w})
    for f in bucket.fusions:
        out.append({"event_type": "qa_fusion", "payload": f})
    for c in bucket.cycles:
        out.append({"event_type": "loop_cycle", "payload": c})
    if bucket.finished:
        out.append({"event_type": "run_finished", "payload": bucket.finished})
    return out


def flag_planner_overkill(run_events: list[dict]) -> bool:
    routing = next(
        (e for e in run_events if e.get("event_type") == "routing_decision"),
        None,
    )
    if not routing:
        return False
    p = routing.get("payload") or {}
    routing_val = p.get("routing")
    if not isinstance(routing_val, str) or not routing_val.startswith("planner"):
        return False
    kinds = p.get("kinds") or []
    if len(kinds) > 1 or p.get("kinds_mixtes"):
        return False
    if p.get("source_count", 99) > 2:
        return False
    workers = [e for e in run_events if e.get("event_type") == "worker_complete"]
    if not workers:
        return False
    return all((w.get("payload") or {}).get("pass_added_value") == "none" for w in workers)


def flag_light_underkill(run_events: list[dict]) -> bool:
    routing = next(
        (e for e in run_events if e.get("event_type") == "routing_decision"),
        None,
    )
    if not routing or (routing.get("payload") or {}).get("pipeline") != "light":
        return False
    for w in run_events:
        if w.get("event_type") != "worker_complete":
            continue
        findings = (w.get("payload") or {}).get("open_findings") or {}
        if _as_int(findings.get("P0")) > 0:
            return True
    return False


def flag_silent_pass(run_events: list[dict]) -> bool:
    for f in run_events:
        if f.get("event_type") != "qa_fusion":
            continue
        p = f.get("payload") or {}
        findings = p.get("open_findings") or {}
        actionable = _as_int(findings.get("P0")) + _as_int(findings.get("P1"))
        quality = _as_int(p.get("fused_quality"))
        coverage = _as_int(p.get("fused_coverage"), default=100)
        if quality >= 95 and actionable == 0 and coverage < 80:
            return True
    return False


def flag_low_confidence_gate(run_events: list[dict]) -> bool:
    for f in run_events:
        if f.get("event_type") != "qa_fusion":
            continue
        p = f.get("payload") or {}
        if p.get("gate_passed") and _as_int(p.get("fused_audit_confidence"), default=100) < 60:
            return True
    return False


def flag_loop_effective(run_events: list[dict]) -> bool:
    cycles = [e for e in run_events if e.get("event_type") == "loop_cycle"]
    return any(_as_int((c.get("payload") or {}).get("score_delta")) > 0 for c in cycles)


def flag_gate_passed_with_open_p1(run_events: list[dict]) -> bool:
    finished = next(
        (e for e in run_events if e.get("event_type") == "run_finished"),
        None,
    )
    if not finished:
        return False
    p = finished.get("payload") or {}
    return bool(p.get("gate_passed")) and _as_int(p.get("final_p1")) > 0


def is_test_run(run_id: str) -> bool:
    return isinstance(run_id, str) and run_id.startswith(TEST_RUN_PREFIXES)


def is_legacy_run(run_id: str, bucket: RunBucket) -> bool:
    """Legacy = test/smoke prefix or run without run_finished."""
    if is_test_run(run_id):
        return True
    return bucket.finished is None


def compute_run_flags(run_events: list[dict]) -> list[str]:
    flags = []
    if flag_planner_overkill(run_events):
        flags.append("planner_overkill")
    if flag_light_underkill(run_events):
        flags.append("light_underkill")
    if flag_silent_pass(run_events):
        flags.append("silent_pass")
    if flag_low_confidence_gate(run_events):
        flags.append("low_confidence_gate")
    if flag_loop_effective(run_events):
        flags.append("loop_effective")
    if flag_gate_passed_with_open_p1(run_events):
        flags.append("gate_passed_with_open_p1")
    return flags


def routing_gate_rates(runs: dict[str, RunBucket]) -> dict[str, dict]:
    by_routing: dict[str, list[bool]] = defaultdict(list)
    for bucket in runs.values():
        if not bucket.routing or not bucket.finished:
            continue
        routing = bucket.routing.get("routing") or bucket.finished.get("routing") or "unknown"
        by_routing[routing].append(bucket.finished.get("outcome") == "gate_passed")
    return {
        k: {"runs": len(v), "gate_pass_rate": round(sum(v) / len(v), 3) if v else 0}
        for k, v in by_routing.items()
    }


def build_cycle_metrics(runs: dict[str, RunBucket]) -> dict:
    """
    Loop trajectories (loop_cycle.fused_quality) and final gate outcomes.
    Success metric = run_finished.outcome == gate_passed — not qa_fusion.gate_passed.
    """
    trajectories: dict[str, list[dict]] = {}
    gate_final = {"ok": 0, "fail": 0}
    stagnation_runs: list[str] = []
    loop_run_count = 0

    for run_id, bucket in runs.items():
        if not bucket.cycles:
            continue
        loop_run_count += 1
        traj = sorted(
            bucket.cycles,
            key=lambda c: (c.get("loop_iteration") or 0),
        )
        trajectories[run_id] = traj
        if detect_stagnation(bucket.cycles):
            stagnation_runs.append(run_id)

        if bucket.finished:
            if bucket.finished.get("outcome") == "gate_passed":
                gate_final["ok"] += 1
            else:
                gate_final["fail"] += 1

    return {
        "loop_run_count": loop_run_count,
        "gate_final": gate_final,
        "trajectories": trajectories,
        "stagnation_count": len(stagnation_runs),
        "stagnation_runs": stagnation_runs,
        "note": "qa_fusion.gate_passed is per-fusion intermediate; use run_finished.outcome for success",
    }


def filter_runs(
    runs: dict[str, RunBucket],
    *,
    exclude_test: bool,
    exclude_legacy: bool,
) -> dict[str, RunBucket]:
    filtered: dict[str, RunBucket] = {}
    for run_id, bucket in runs.items():
        if exclude_test and is_test_run(run_id):
            continue
        if exclude_legacy and is_legacy_run(run_id, bucket):
            continue
        filtered[run_id] = bucket
    return filtered


def build_report(
    events_path: Path,
    *,
    exclude_test: bool = True,
    exclude_legacy: bool = True,
) -> dict:
    all_runs, event_count, skipped, technique_roi = stream_buckets(events_path)
    runs = filter_runs(
        all_runs,
        exclude_test=exclude_test,
        exclude_legacy=exclude_legacy,
    )
    flag_counter: Counter = Counter()
    run_flags: dict[str, list[str]] = {}

    for run_id, bucket in runs.items():
        flags = compute_run_flags(bucket_to_events(bucket))
        run_flags[run_id] = flags
        for f in flags:
            flag_counter[f] += 1

    report: dict = {
        "ok": True,
        "events_path": str(events_path),
        "event_count": event_count,
        "run_count": len(runs),
        "run_count_total": len(all_runs),
        "run_flags": run_flags,
        "flag_totals": dict(flag_counter),
        "technique_pass_roi": technique_roi,
        "routing_gate_rates": routing_gate_rates(runs),
        "cycle_metrics": build_cycle_metrics(runs),
        "streaming": True,
        "filters": {
            "exclude_test": exclude_test,
            "exclude_legacy": exclude_legacy,
        },
    }
    if skipped:
        report["skipped_lines"] = skipped
    if exclude_test or exclude_legacy:
        report["excluded_run_count"] = len(all_runs) - len(runs)
    return report


def print_human(report: dict) -> None:
    print(f"Events: {report['event_count']} | Runs: {report['run_count']}")
    if report.get("skipped_lines"):
        print(f"Skipped invalid lines: {report['skipped_lines']}")
    print()
    for run_id, flags in sorted(report["run_flags"].items()):
        if flags:
            print(f"{run_id}: {', '.join(flags)}")
    print()
    print("Flag totals:")
    for flag, count in Counter(report["flag_totals"]).most_common():
        print(f"  {flag}: {count}")
    print()
    print("Technique pass ROI:")
    for tp, s in sorted(report["technique_pass_roi"].items()):
        rate = s["with_findings"] / s["runs"] if s["runs"] else 0
        print(f"  {tp}: {s['with_findings']}/{s['runs']} ({rate:.0%})")
    print()
    print("Routing vs gate:")
    for routing, s in report["routing_gate_rates"].items():
        print(f"  {routing}: {s}")


def main() -> int:
    parser = argparse.ArgumentParser(description="QA3 telemetry stats")
    parser.add_argument(
        "--events",
        default=None,
        help="Path to events.jsonl (default: install ~/.cursor/skills/qa3-agent/telemetry/events.jsonl)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="JSON on stdout (for agents)",
    )
    parser.add_argument(
        "--exclude-test",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Exclude run_id with test_/smoke_ prefix (default: true)",
    )
    parser.add_argument(
        "--exclude-legacy",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Exclude orphan runs without run_finished (default: true)",
    )
    parser.add_argument(
        "--include-test",
        action="store_true",
        help="Include test/smoke runs (overrides --exclude-test)",
    )
    parser.add_argument(
        "--include-legacy",
        action="store_true",
        help="Include legacy orphan runs (overrides --exclude-legacy)",
    )
    try:
        args = parser.parse_args()
    except SystemExit as exc:
        if exc.code not in (0, None):
            print(json.dumps({"ok": False, "error": "invalid_arguments"}))
            return EXIT_USAGE
        raise

    events_path = resolve_events_path(args.events)

    exclude_test = False if args.include_test else args.exclude_test
    exclude_legacy = False if args.include_legacy else args.exclude_legacy

    try:
        report = build_report(
            events_path,
            exclude_test=exclude_test,
            exclude_legacy=exclude_legacy,
        )
    except Exception as exc:
        print(f"QA_STATS_FAILED: {exc}", file=sys.stderr)
        print(json.dumps({"ok": False, "error": str(exc)}))
        return EXIT_FAIL

    if args.json:
        print(json.dumps(report, ensure_ascii=False))
    else:
        print_human(report)
    return EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
