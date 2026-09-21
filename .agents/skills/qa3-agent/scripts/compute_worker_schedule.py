#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml>=6.0"]
# ///
"""R11 — compute QA3 worker execution batches (disjoint shard parallelism + serial cross_cutting)."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:  # pragma: no cover
    yaml = None  # type: ignore

EXIT_OK = 0
EXIT_SCHEDULE_BLOCKED = 1
EXIT_USAGE = 2

MAX_CONCURRENT_DEFAULT = 6
MAX_SHARD_PASSES_DEFAULT = 4

CROSS_CUTTING_TECHNIQUE_PASSES = frozenset(
    {
        "contradiction",
        "traceability",
        "fmea",
        "premortem",
        "assumption-audit",
        "abuse-misuse",
    }
)

CROSS_CUTTING_ORDER: dict[str, int] = {
    "contradiction": 10,
    "traceability": 20,
    "fmea": 30,
    "premortem": 40,
    "assumption-audit": 50,
    "abuse-misuse": 60,
}


def _norm_key(path: Path) -> str:
    return os.path.normcase(str(path))


def normalize_scope_path(raw: str) -> Path:
    p = Path(os.path.expandvars(raw)).expanduser()
    try:
        return p.resolve()
    except OSError:
        return p.absolute()


def paths_overlap(a: Path, b: Path) -> bool:
    ka, kb = _norm_key(a), _norm_key(b)
    if ka == kb:
        return True
    try:
        a.relative_to(b)
        return True
    except ValueError:
        pass
    try:
        b.relative_to(a)
        return True
    except ValueError:
        pass
    return False


def pass_scope_paths(pass_entry: dict[str, Any]) -> list[Path]:
    raw = pass_entry.get("scope_paths") or []
    if not isinstance(raw, list):
        return []
    out: list[Path] = []
    for item in raw:
        if isinstance(item, str) and item.strip():
            out.append(normalize_scope_path(item))
    return out


def passes_scope_overlap(a: dict[str, Any], b: dict[str, Any]) -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    for pa in pass_scope_paths(a):
        for pb in pass_scope_paths(b):
            if paths_overlap(pa, pb):
                pairs.append((_norm_key(pa), _norm_key(pb)))
    return pairs


def infer_execution_tier(pass_entry: dict[str, Any]) -> str:
    explicit = pass_entry.get("execution_tier")
    if explicit in ("shard", "cross_cutting"):
        return explicit
    technique = pass_entry.get("technique_pass")
    if isinstance(technique, str) and technique in CROSS_CUTTING_TECHNIQUE_PASSES:
        return "cross_cutting"
    objective = pass_entry.get("objective") or ""
    if isinstance(objective, str):
        lowered = objective.lower()
        for name in CROSS_CUTTING_TECHNIQUE_PASSES:
            if name in lowered:
                return "cross_cutting"
    return "shard"


def cross_cutting_sort_key(pass_entry: dict[str, Any]) -> tuple[int, str]:
    technique = pass_entry.get("technique_pass")
    if isinstance(technique, str) and technique in CROSS_CUTTING_ORDER:
        return (CROSS_CUTTING_ORDER[technique], pass_entry.get("id", ""))
    objective = pass_entry.get("objective") or ""
    if isinstance(objective, str):
        for name, order in CROSS_CUTTING_ORDER.items():
            if name in objective.lower():
                return (order, pass_entry.get("id", ""))
    return (999, pass_entry.get("id", ""))


def load_passes(arg: str) -> list[dict[str, Any]]:
    path = Path(arg)
    text = path.read_text(encoding="utf-8-sig") if path.is_file() else arg
    if path.suffix.lower() in {".json"} or text.lstrip().startswith("{"):
        data = json.loads(text)
    else:
        if yaml is None:
            raise RuntimeError("PyYAML required: uv run scripts/compute_worker_schedule.py")
        data = yaml.safe_load(text)
    if not isinstance(data, dict):
        raise ValueError("planner output must be a mapping")
    passes = data.get("passes")
    if not isinstance(passes, list) or not passes:
        raise ValueError("passes must be a non-empty list")
    for i, item in enumerate(passes):
        if not isinstance(item, dict):
            raise ValueError(f"passes[{i}] must be an object")
        if not item.get("id"):
            raise ValueError(f"passes[{i}].id is required")
    return passes


def build_shard_batches(
    shards: list[dict[str, Any]],
    *,
    max_concurrent: int,
    allow_overlap: bool,
) -> tuple[list[list[str]], list[bool], list[dict[str, Any]]]:
    batches: list[list[str]] = []
    parallel_flags: list[bool] = []
    overlaps_blocked: list[dict[str, Any]] = []
    remaining = list(shards)

    while remaining:
        batch: list[dict[str, Any]] = []
        i = 0
        while i < len(remaining) and len(batch) < max_concurrent:
            candidate = remaining[i]
            conflict = False
            for other in batch:
                overlap_pairs = passes_scope_overlap(candidate, other)
                if overlap_pairs:
                    if allow_overlap:
                        overlaps_blocked.append(
                            {
                                "pass_a": other.get("id"),
                                "pass_b": candidate.get("id"),
                                "paths": overlap_pairs,
                                "allowed": True,
                            }
                        )
                    else:
                        conflict = True
                        break
            if conflict:
                i += 1
                continue
            batch.append(candidate)
            remaining.pop(i)
            i = 0

        if not batch:
            first = remaining.pop(0)
            batch = [first]
            for other in shards:
                if other is first:
                    continue
                overlap_pairs = passes_scope_overlap(first, other)
                if overlap_pairs and not allow_overlap:
                    overlaps_blocked.append(
                        {
                            "pass_a": first.get("id"),
                            "pass_b": other.get("id"),
                            "paths": overlap_pairs,
                            "allowed": False,
                            "note": "serialized_to_next_batch",
                        }
                    )

        batch_ids = [str(p["id"]) for p in batch]
        batches.append(batch_ids)
        parallel_flags.append(len(batch_ids) > 1)

    return batches, parallel_flags, overlaps_blocked


def compute_schedule(
    passes: list[dict[str, Any]],
    *,
    max_concurrent: int = MAX_CONCURRENT_DEFAULT,
    max_shard_passes: int = MAX_SHARD_PASSES_DEFAULT,
    allow_overlap: bool = False,
) -> dict[str, Any]:
    enriched: list[dict[str, Any]] = []
    for p in passes:
        copy = dict(p)
        copy["execution_tier"] = infer_execution_tier(p)
        enriched.append(copy)

    shards = [p for p in enriched if p["execution_tier"] == "shard"]
    cross = sorted(
        [p for p in enriched if p["execution_tier"] == "cross_cutting"],
        key=cross_cutting_sort_key,
    )

    if len(shards) > max_shard_passes:
        return {
            "ok": False,
            "error": "shard_cap_exceeded",
            "message": f"shard pass count {len(shards)} exceeds max_shard_passes={max_shard_passes}",
            "shard_count": len(shards),
            "max_shard_passes": max_shard_passes,
        }

    shard_batches, shard_parallel, overlaps = build_shard_batches(
        shards,
        max_concurrent=max_concurrent,
        allow_overlap=allow_overlap,
    )

    batches = list(shard_batches)
    parallel_in_batch = list(shard_parallel)

    for p in cross:
        batches.append([str(p["id"])])
        parallel_in_batch.append(False)

    known_ids = {str(p["id"]) for p in passes}
    for batch in batches:
        for pass_id in batch:
            if pass_id not in known_ids:
                return {
                    "ok": False,
                    "error": "unknown_pass_id",
                    "message": f"batch references unknown pass id: {pass_id}",
                    "pass_id": pass_id,
                }

    rationale_parts = []
    if shard_batches:
        rationale_parts.append(
            f"phase1: {len(shard_batches)} shard batch(es), max {max_concurrent} concurrent"
        )
    if cross:
        rationale_parts.append(f"phase2: {len(cross)} cross_cutting serial")
    if overlaps:
        rationale_parts.append(f"overlaps_detected={len(overlaps)}")

    return {
        "ok": True,
        "batches": batches,
        "parallel_in_batch": parallel_in_batch,
        "overlaps_blocked": overlaps,
        "max_concurrent_workers": max_concurrent,
        "pass_count": len(passes),
        "shard_count": len(shards),
        "cross_cutting_count": len(cross),
        "allow_overlap_debug": allow_overlap,
        "rationale": "; ".join(rationale_parts) or "single pass",
        "passes_enriched": [
            {
                "id": p.get("id"),
                "execution_tier": p.get("execution_tier"),
                "technique_pass": p.get("technique_pass"),
                "scope_paths": [str(x) for x in pass_scope_paths(p)],
            }
            for p in enriched
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compute R11 worker schedule from planner YAML/JSON (passes key)"
    )
    parser.add_argument(
        "--passes",
        required=True,
        help="Path to planner YAML/JSON or inline JSON string with passes[]",
    )
    parser.add_argument(
        "--max-concurrent",
        type=int,
        default=MAX_CONCURRENT_DEFAULT,
        help=f"Max workers per parallel batch (default {MAX_CONCURRENT_DEFAULT})",
    )
    parser.add_argument(
        "--max-shard-passes",
        type=int,
        default=MAX_SHARD_PASSES_DEFAULT,
        help=f"Max shard passes allowed (default {MAX_SHARD_PASSES_DEFAULT})",
    )
    parser.add_argument(
        "--allow-overlap",
        action="store_true",
        help="Allow overlapping scope_paths in same parallel batch (debug only)",
    )
    try:
        args = parser.parse_args()
    except SystemExit as exc:
        if exc.code not in (0, None):
            print(json.dumps({"ok": False, "error": "invalid_arguments"}))
            return EXIT_USAGE
        raise

    if args.allow_overlap and os.environ.get("QA3_SCHEDULE_ALLOW_OVERLAP") != "1":
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": "allow_overlap_denied",
                    "message": "Set QA3_SCHEDULE_ALLOW_OVERLAP=1 for debug overlap override",
                },
                ensure_ascii=False,
            )
        )
        return EXIT_SCHEDULE_BLOCKED

    try:
        passes = load_passes(args.passes)
        result = compute_schedule(
            passes,
            max_concurrent=args.max_concurrent,
            max_shard_passes=args.max_shard_passes,
            allow_overlap=args.allow_overlap,
        )
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        return EXIT_SCHEDULE_BLOCKED

    print(json.dumps(result, ensure_ascii=False))
    return EXIT_OK if result.get("ok") else EXIT_SCHEDULE_BLOCKED


if __name__ == "__main__":
    raise SystemExit(main())
