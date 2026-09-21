#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""Validate QA3 telemetry events against telemetry.md schema."""

from __future__ import annotations

import json
from pathlib import Path

AGENT_ROLES = frozenset({"parent_qa3", "planner", "worker"})
EVENT_TYPES = frozenset(
    {
        "run_context",
        "routing_decision",
        "planner_complete",
        "schedule_complete",
        "worker_complete",
        "qa_fusion",
        "loop_cycle",
        "run_finished",
    }
)
ENVELOPE_REQUIRED = (
    "schema_version",
    "run_id",
    "event_id",
    "event_type",
    "agent_role",
    "skill",
    "qa_variant",
    "model",
    "project",
    "payload",
)
TEST_RUN_PREFIXES = ("test_", "smoke_")

ROUTING_VALUES = frozenset({"mono", "direct_worker", "planner", "planner_multi_pass"})
MODE_VALUES = frozenset({"validation", "adversarial", "exploratory"})
PIPELINE_VALUES = frozenset({"light", "standard", "full"})
CRITICALITY_VALUES = frozenset({"low", "medium", "high"})
PASS_ADDED_VALUES = frozenset({"none", "low", "medium", "high"})
QA_PASS_VALUES = frozenset({"single", "initial", "re_qa"})
OUTCOME_VALUES = frozenset({"gate_passed", "gate_failed", "hitl", "aborted"})
TECHNIQUE_PASS_FORBIDDEN = frozenset({"unknown"})

PAYLOAD_ALLOWED: dict[str, frozenset[str]] = {
    "run_context": frozenset(
        {
            "entry_trigger",
            "wrapper_skill",
            "kinds",
            "gate_score",
            "minimum_coverage",
            "loop_enabled",
            "max_cycles",
            "loop_iteration",
            "project_hint",
        }
    ),
    "routing_decision": frozenset(
        {
            "routing",
            "routing_rationale",
            "kinds",
            "kinds_mixtes",
            "source_count",
            "mode",
            "pipeline",
            "criticality",
            "loop_iteration",
        }
    ),
    "planner_complete": frozenset(
        {"pass_count", "passes", "parse_retries", "routing_rationale"}
    ),
    "schedule_complete": frozenset(
        {
            "batches",
            "parallel_in_batch",
            "overlaps_blocked",
            "max_concurrent_workers",
            "pass_count",
            "shard_count",
            "cross_cutting_count",
            "allow_overlap_debug",
            "rationale",
        }
    ),
    "worker_complete": frozenset(
        {
            "pass_id",
            "pass_kind",
            "quality_score",
            "audit_confidence",
            "coverage_score",
            "open_findings",
            "pass_added_value",
            "findings_actionable",
            "technique_pass",
            "axis_scores",
            "files_analyzed",
        }
    ),
    "qa_fusion": frozenset(
        {
            "loop_iteration",
            "qa_pass_in_iteration",
            "total_workers",
            "fused_quality",
            "fused_coverage",
            "fused_audit_confidence",
            "lowest_worker_quality",
            "lowest_worker_coverage",
            "lowest_worker_audit_confidence",
            "open_findings",
            "open_P0",
            "open_P1",
            "gate_passed",
            "gate_score",
            "minimum_coverage",
            "findings_actionable",
            "worker_scores",
        }
    ),
    "loop_cycle": frozenset(
        {
            "loop_iteration",
            "gate_passed",
            "fused_quality",
            "fused_coverage",
            "fused_audit_confidence",
            "corrections_applied",
            "hitl",
            "score_delta",
            "findings_count",
        }
    ),
    "run_finished": frozenset(
        {
            "outcome",
            "kinds",
            "routing",
            "mode",
            "pipeline",
            "loop_enabled",
            "total_workers",
            "final_quality",
            "final_coverage",
            "final_audit_confidence",
            "final_p0",
            "final_p1",
            "gate_passed",
            "findings_actionable",
            "total_findings_actionable",
            "loop_iterations",
            "orchestration_flags",
        }
    ),
}

ROLE_BY_EVENT: dict[str, str] = {
    "run_context": "parent_qa3",
    "routing_decision": "parent_qa3",
    "planner_complete": "planner",
    "schedule_complete": "parent_qa3",
    "worker_complete": "worker",
    "qa_fusion": "parent_qa3",
    "loop_cycle": "parent_qa3",
    "run_finished": "parent_qa3",
}


def load_run_events_from_path(events_path: Path | str, run_id: str) -> list[dict]:
    """Load all events for run_id from JSONL (for cross-event validation at append)."""
    path = Path(events_path)
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


def _planner_routing(routing: str | None) -> bool:
    return isinstance(routing, str) and routing.startswith("planner")


def _routing_from_run(run_events: list[dict]) -> str | None:
    routing_ev = next(
        (e for e in run_events if e.get("event_type") == "routing_decision"),
        None,
    )
    if not routing_ev:
        return None
    routing = (routing_ev.get("payload") or {}).get("routing")
    return routing if isinstance(routing, str) else None


def _planner_pass_count(run_events: list[dict]) -> int:
    planner_ev = next(
        (e for e in run_events if e.get("event_type") == "planner_complete"),
        None,
    )
    if not planner_ev:
        return 0
    payload = planner_ev.get("payload") or {}
    count = payload.get("pass_count")
    if isinstance(count, int) and count > 0:
        return count
    passes = payload.get("passes")
    if isinstance(passes, list):
        return len(passes)
    return 0


def _schedule_required(run_events: list[dict]) -> bool:
    routing = _routing_from_run(run_events)
    if not _planner_routing(routing):
        return False
    return _planner_pass_count(run_events) >= 2


def _event_types(events: list[dict]) -> set[str]:
    return {e.get("event_type") for e in events if e.get("event_type")}


def validate_run_sequence(run_events: list[dict]) -> list[dict]:
    """Validate a run's event list is complete (verify_run_closure / audit)."""
    violations: list[dict] = []
    types = _event_types(run_events)

    if "run_finished" not in types:
        violations.append(
            _violation(
                "run_finished",
                "run_not_closed",
                "run_finished event is required to close the run",
            )
        )

    for required in ("run_context", "routing_decision", "worker_complete", "qa_fusion"):
        if required not in types:
            violations.append(
                _violation(
                    required,
                    "sequence_incomplete",
                    f"missing required event_type {required}",
                )
            )

    routing_ev = next(
        (e for e in run_events if e.get("event_type") == "routing_decision"),
        None,
    )
    if routing_ev and _planner_routing((routing_ev.get("payload") or {}).get("routing")):
        if "planner_complete" not in types:
            violations.append(
                _violation(
                    "planner_complete",
                    "planner_complete_required",
                    "planner_complete is required when routing is planner*",
                )
            )
        if _schedule_required(run_events) and "schedule_complete" not in types:
            violations.append(
                _violation(
                    "schedule_complete",
                    "schedule_complete_required",
                    "schedule_complete is required when routing is planner* and pass_count >= 2 (R11)",
                )
            )

    run_context = next(
        (e for e in run_events if e.get("event_type") == "run_context"),
        None,
    )
    if run_context and (run_context.get("payload") or {}).get("loop_enabled") is True:
        if "loop_cycle" not in types:
            violations.append(
                _violation(
                    "loop_cycle",
                    "sequence_incomplete",
                    "loop_cycle is required when run_context.loop_enabled is true",
                )
            )

    return violations


def _validate_planner_before_schedule(
    violations: list[dict],
    event: dict,
    run_events: list[dict] | None,
) -> None:
    if event.get("event_type") != "schedule_complete" or not run_events:
        return
    routing = _routing_from_run(run_events)
    if not _planner_routing(routing):
        return
    if any(e.get("event_type") == "planner_complete" for e in run_events):
        return
    violations.append(
        _violation(
            "planner_complete",
            "planner_complete_required",
            "planner_complete must be appended before schedule_complete when routing is planner*",
        )
    )


def _validate_planner_before_worker(
    violations: list[dict],
    event: dict,
    run_events: list[dict] | None,
) -> None:
    if event.get("event_type") != "worker_complete" or not run_events:
        return
    routing_ev = next(
        (e for e in run_events if e.get("event_type") == "routing_decision"),
        None,
    )
    if not routing_ev or not _planner_routing((routing_ev.get("payload") or {}).get("routing")):
        return
    if not any(e.get("event_type") == "planner_complete" for e in run_events):
        violations.append(
            _violation(
                "planner_complete",
                "planner_complete_required",
                "planner_complete must be appended before worker_complete when routing is planner*",
            )
        )
        return
    if _schedule_required(run_events) and not any(
        e.get("event_type") == "schedule_complete" for e in run_events
    ):
        violations.append(
            _violation(
                "schedule_complete",
                "schedule_complete_required",
                "schedule_complete must be appended before worker_complete when pass_count >= 2 (R11)",
            )
        )


def _validate_run_sequence_for_finished(
    violations: list[dict],
    event: dict,
    run_events: list[dict] | None,
) -> None:
    if event.get("event_type") != "run_finished" or not run_events:
        return
    combined = list(run_events or []) + [event]
    for seq_v in validate_run_sequence(combined):
        if seq_v["code"] != "run_not_closed":
            violations.append(seq_v)


def _violation(path: str, code: str, message: str) -> dict:
    return {"path": path, "code": code, "message": message}


def _is_missing(value) -> bool:
    return value is None or value == ""


def _check_type(
    violations: list[dict],
    path: str,
    value,
    expected: str,
    *,
    required: bool = True,
) -> None:
    if value is None:
        if required:
            violations.append(_violation(path, "required", f"{path} is required"))
        return
    if expected == "string" and not isinstance(value, str):
        violations.append(_violation(path, "type", f"{path} must be a string"))
    elif expected == "int" and not isinstance(value, int):
        violations.append(_violation(path, "type", f"{path} must be an int"))
    elif expected == "bool" and not isinstance(value, bool):
        violations.append(_violation(path, "type", f"{path} must be a bool"))
    elif expected == "list" and not isinstance(value, list):
        violations.append(_violation(path, "type", f"{path} must be a list"))
    elif expected == "object" and not isinstance(value, dict):
        violations.append(_violation(path, "type", f"{path} must be an object"))


def _check_string_list(violations: list[dict], path: str, value, *, required: bool = True) -> None:
    _check_type(violations, path, value, "list", required=required)
    if isinstance(value, list):
        for i, item in enumerate(value):
            if not isinstance(item, str):
                violations.append(
                    _violation(f"{path}[{i}]", "type", f"{path}[{i}] must be a string")
                )


def _check_score(violations: list[dict], path: str, value, *, required: bool = True) -> None:
    _check_type(violations, path, value, "int", required=required)
    if isinstance(value, int) and not 0 <= value <= 100:
        violations.append(_violation(path, "range", f"{path} must be between 0 and 100"))


def _check_open_findings(violations: list[dict], path: str, value, *, required: bool = True) -> None:
    _check_type(violations, path, value, "object", required=required)
    if not isinstance(value, dict):
        return
    for key in ("P0", "P1", "Info"):
        sub = f"{path}.{key}"
        if key not in value:
            violations.append(_violation(sub, "required", f"{sub} is required"))
        elif not isinstance(value[key], int):
            violations.append(_violation(sub, "type", f"{sub} must be an int"))


def _check_unknown_payload_fields(
    violations: list[dict], event_type: str, payload: dict
) -> None:
    allowed = PAYLOAD_ALLOWED.get(event_type, frozenset())
    for key in payload:
        if key not in allowed:
            violations.append(
                _violation(
                    f"payload.{key}",
                    "unknown_field",
                    f"payload.{key} is not allowed for event_type {event_type}",
                )
            )


def _validate_run_context(violations: list[dict], payload: dict, project: str) -> None:
    _check_type(violations, "payload.entry_trigger", payload.get("entry_trigger"), "string")
    if "wrapper_skill" in payload and payload["wrapper_skill"] is not None:
        _check_type(violations, "payload.wrapper_skill", payload["wrapper_skill"], "string")
    elif "wrapper_skill" not in payload:
        violations.append(
            _violation("payload.wrapper_skill", "required", "payload.wrapper_skill is required")
        )
    _check_string_list(violations, "payload.kinds", payload.get("kinds"))
    _check_type(violations, "payload.gate_score", payload.get("gate_score"), "int")
    _check_type(violations, "payload.minimum_coverage", payload.get("minimum_coverage"), "int")
    _check_type(violations, "payload.loop_enabled", payload.get("loop_enabled"), "bool")
    _check_type(violations, "payload.loop_iteration", payload.get("loop_iteration"), "int")
    if payload.get("loop_enabled") is True:
        _check_type(violations, "payload.max_cycles", payload.get("max_cycles"), "int")
    if project == "unknown":
        _check_type(violations, "payload.project_hint", payload.get("project_hint"), "string")


def _validate_routing_decision(violations: list[dict], payload: dict) -> None:
    routing = payload.get("routing")
    _check_type(violations, "payload.routing", routing, "string")
    if isinstance(routing, str) and routing not in ROUTING_VALUES:
        violations.append(
            _violation(
                "payload.routing",
                "enum",
                f"payload.routing must be one of {sorted(ROUTING_VALUES)}",
            )
        )
    _check_type(violations, "payload.routing_rationale", payload.get("routing_rationale"), "string")
    _check_string_list(violations, "payload.kinds", payload.get("kinds"))
    _check_type(violations, "payload.kinds_mixtes", payload.get("kinds_mixtes"), "bool")
    _check_type(violations, "payload.source_count", payload.get("source_count"), "int")
    mode = payload.get("mode")
    _check_type(violations, "payload.mode", mode, "string")
    if isinstance(mode, str) and mode not in MODE_VALUES:
        violations.append(
            _violation("payload.mode", "enum", f"payload.mode must be one of {sorted(MODE_VALUES)}")
        )
    pipeline = payload.get("pipeline")
    _check_type(violations, "payload.pipeline", pipeline, "string")
    if isinstance(pipeline, str) and pipeline not in PIPELINE_VALUES:
        violations.append(
            _violation(
                "payload.pipeline",
                "enum",
                f"payload.pipeline must be one of {sorted(PIPELINE_VALUES)}",
            )
        )
    criticality = payload.get("criticality")
    _check_type(violations, "payload.criticality", criticality, "string")
    if isinstance(criticality, str) and criticality not in CRITICALITY_VALUES:
        violations.append(
            _violation(
                "payload.criticality",
                "enum",
                f"payload.criticality must be one of {sorted(CRITICALITY_VALUES)}",
            )
        )


def _validate_schedule_complete(violations: list[dict], payload: dict) -> None:
    batches = payload.get("batches")
    _check_type(violations, "payload.batches", batches, "list")
    if isinstance(batches, list):
        for i, batch in enumerate(batches):
            _check_type(violations, f"payload.batches[{i}]", batch, "list")
    parallel = payload.get("parallel_in_batch")
    _check_type(violations, "payload.parallel_in_batch", parallel, "list")
    if isinstance(batches, list) and isinstance(parallel, list) and len(batches) != len(parallel):
        violations.append(
            _violation(
                "payload.parallel_in_batch",
                "length_mismatch",
                "payload.parallel_in_batch length must match payload.batches",
            )
        )
    _check_type(violations, "payload.overlaps_blocked", payload.get("overlaps_blocked"), "list")
    _check_type(
        violations, "payload.max_concurrent_workers", payload.get("max_concurrent_workers"), "int"
    )
    _check_type(violations, "payload.pass_count", payload.get("pass_count"), "int")
    _check_type(violations, "payload.shard_count", payload.get("shard_count"), "int")
    _check_type(
        violations, "payload.cross_cutting_count", payload.get("cross_cutting_count"), "int"
    )
    _check_type(violations, "payload.rationale", payload.get("rationale"), "string")


def _validate_planner_complete(violations: list[dict], payload: dict) -> None:
    _check_type(violations, "payload.pass_count", payload.get("pass_count"), "int")
    passes = payload.get("passes")
    _check_type(violations, "payload.passes", passes, "list")
    if isinstance(passes, list):
        for i, item in enumerate(passes):
            if not isinstance(item, dict):
                violations.append(
                    _violation(f"payload.passes[{i}]", "type", f"payload.passes[{i}] must be an object")
                )
                continue
            _check_type(violations, f"payload.passes[{i}].id", item.get("id"), "string")
            _check_type(violations, f"payload.passes[{i}].kind", item.get("kind"), "string")
    _check_type(violations, "payload.parse_retries", payload.get("parse_retries"), "int")
    _check_type(
        violations, "payload.routing_rationale", payload.get("routing_rationale"), "string"
    )


def _validate_worker_complete(violations: list[dict], payload: dict) -> None:
    _check_type(violations, "payload.pass_id", payload.get("pass_id"), "string")
    _check_type(violations, "payload.pass_kind", payload.get("pass_kind"), "string")
    _check_score(violations, "payload.quality_score", payload.get("quality_score"))
    _check_score(violations, "payload.audit_confidence", payload.get("audit_confidence"))
    _check_score(violations, "payload.coverage_score", payload.get("coverage_score"))
    _check_open_findings(violations, "payload.open_findings", payload.get("open_findings"))
    pav = payload.get("pass_added_value")
    _check_type(violations, "payload.pass_added_value", pav, "string")
    if isinstance(pav, str) and pav not in PASS_ADDED_VALUES:
        violations.append(
            _violation(
                "payload.pass_added_value",
                "enum",
                f"payload.pass_added_value must be one of {sorted(PASS_ADDED_VALUES)}",
            )
        )
    _check_type(violations, "payload.findings_actionable", payload.get("findings_actionable"), "int")
    tp = payload.get("technique_pass")
    if tp is not None and isinstance(tp, str) and tp.lower() in TECHNIQUE_PASS_FORBIDDEN:
        violations.append(
            _violation(
                "payload.technique_pass",
                "technique_pass_forbidden",
                "payload.technique_pass must not be 'unknown'; use integrated, none, or a technique name",
            )
        )


def _validate_qa_fusion(violations: list[dict], payload: dict) -> None:
    _check_type(violations, "payload.loop_iteration", payload.get("loop_iteration"), "int")
    qpi = payload.get("qa_pass_in_iteration")
    _check_type(violations, "payload.qa_pass_in_iteration", qpi, "string")
    if isinstance(qpi, str) and qpi not in QA_PASS_VALUES:
        violations.append(
            _violation(
                "payload.qa_pass_in_iteration",
                "enum",
                f"payload.qa_pass_in_iteration must be one of {sorted(QA_PASS_VALUES)}",
            )
        )
    _check_type(violations, "payload.total_workers", payload.get("total_workers"), "int")
    for field in (
        "fused_quality",
        "fused_coverage",
        "fused_audit_confidence",
        "lowest_worker_quality",
        "lowest_worker_coverage",
        "lowest_worker_audit_confidence",
    ):
        _check_score(violations, f"payload.{field}", payload.get(field))
    if "open_findings" in payload:
        _check_open_findings(violations, "payload.open_findings", payload.get("open_findings"))
    elif "open_P0" in payload or "open_P1" in payload:
        _check_type(violations, "payload.open_P0", payload.get("open_P0"), "int")
        _check_type(violations, "payload.open_P1", payload.get("open_P1"), "int")
    else:
        violations.append(
            _violation(
                "payload.open_findings",
                "required",
                "payload.open_findings (or open_P0/open_P1) is required",
            )
        )
    _check_type(violations, "payload.gate_passed", payload.get("gate_passed"), "bool")
    _check_type(violations, "payload.gate_score", payload.get("gate_score"), "int")
    _check_type(violations, "payload.minimum_coverage", payload.get("minimum_coverage"), "int")
    _check_type(violations, "payload.findings_actionable", payload.get("findings_actionable"), "int")


def _validate_loop_cycle(violations: list[dict], payload: dict) -> None:
    _check_type(violations, "payload.loop_iteration", payload.get("loop_iteration"), "int")
    _check_type(violations, "payload.gate_passed", payload.get("gate_passed"), "bool")
    _check_score(violations, "payload.fused_quality", payload.get("fused_quality"))
    _check_score(violations, "payload.fused_coverage", payload.get("fused_coverage"))
    if "fused_audit_confidence" in payload:
        _check_score(
            violations,
            "payload.fused_audit_confidence",
            payload.get("fused_audit_confidence"),
            required=False,
        )
    _check_type(violations, "payload.corrections_applied", payload.get("corrections_applied"), "bool")
    _check_type(violations, "payload.hitl", payload.get("hitl"), "bool")
    if "score_delta" in payload:
        _check_type(
            violations, "payload.score_delta", payload.get("score_delta"), "int", required=False
        )
    if "findings_count" in payload:
        _check_type(
            violations, "payload.findings_count", payload.get("findings_count"), "int", required=False
        )


def _validate_run_finished(violations: list[dict], payload: dict) -> None:
    outcome = payload.get("outcome")
    _check_type(violations, "payload.outcome", outcome, "string")
    if isinstance(outcome, str) and outcome not in OUTCOME_VALUES:
        violations.append(
            _violation(
                "payload.outcome",
                "enum",
                f"payload.outcome must be one of {sorted(OUTCOME_VALUES)}",
            )
        )
    _check_string_list(violations, "payload.kinds", payload.get("kinds"))
    routing = payload.get("routing")
    _check_type(violations, "payload.routing", routing, "string")
    if isinstance(routing, str) and routing not in ROUTING_VALUES:
        violations.append(
            _violation(
                "payload.routing",
                "enum",
                f"payload.routing must be one of {sorted(ROUTING_VALUES)}",
            )
        )
    mode = payload.get("mode")
    _check_type(violations, "payload.mode", mode, "string")
    if isinstance(mode, str) and mode not in MODE_VALUES:
        violations.append(
            _violation("payload.mode", "enum", f"payload.mode must be one of {sorted(MODE_VALUES)}")
        )
    pipeline = payload.get("pipeline")
    _check_type(violations, "payload.pipeline", pipeline, "string")
    if isinstance(pipeline, str) and pipeline not in PIPELINE_VALUES:
        violations.append(
            _violation(
                "payload.pipeline",
                "enum",
                f"payload.pipeline must be one of {sorted(PIPELINE_VALUES)}",
            )
        )
    _check_type(violations, "payload.loop_enabled", payload.get("loop_enabled"), "bool")
    _check_type(violations, "payload.total_workers", payload.get("total_workers"), "int")
    _check_score(violations, "payload.final_quality", payload.get("final_quality"))
    _check_score(violations, "payload.final_coverage", payload.get("final_coverage"))
    if "final_audit_confidence" in payload:
        _check_score(
            violations,
            "payload.final_audit_confidence",
            payload.get("final_audit_confidence"),
            required=False,
        )
    _check_type(violations, "payload.final_p0", payload.get("final_p0"), "int")
    _check_type(violations, "payload.final_p1", payload.get("final_p1"), "int")
    _check_type(violations, "payload.gate_passed", payload.get("gate_passed"), "bool")
    actionable = payload.get("findings_actionable")
    if actionable is None:
        actionable = payload.get("total_findings_actionable")
    _check_type(violations, "payload.findings_actionable", actionable, "int")
    loop_enabled = payload.get("loop_enabled")
    loop_iterations = payload.get("loop_iterations")
    if loop_enabled is True and loop_iterations is None:
        violations.append(
            _violation(
                "payload.loop_iterations",
                "required",
                "payload.loop_iterations is required when loop_enabled is true",
            )
        )
    elif loop_iterations is not None:
        _check_type(
            violations, "payload.loop_iterations", loop_iterations, "int", required=False
        )
    flags = payload.get("orchestration_flags")
    if flags is None:
        violations.append(
            _violation(
                "payload.orchestration_flags",
                "required",
                "payload.orchestration_flags is required",
            )
        )
    else:
        _check_string_list(violations, "payload.orchestration_flags", flags)


PAYLOAD_VALIDATORS = {
    "run_context": lambda v, p, project: _validate_run_context(v, p, project),
    "routing_decision": lambda v, p, _project: _validate_routing_decision(v, p),
    "planner_complete": lambda v, p, _project: _validate_planner_complete(v, p),
    "schedule_complete": lambda v, p, _project: _validate_schedule_complete(v, p),
    "worker_complete": lambda v, p, _project: _validate_worker_complete(v, p),
    "qa_fusion": lambda v, p, _project: _validate_qa_fusion(v, p),
    "loop_cycle": lambda v, p, _project: _validate_loop_cycle(v, p),
    "run_finished": lambda v, p, _project: _validate_run_finished(v, p),
}


def _validate_parent_event_id(
    violations: list[dict],
    event: dict,
    run_events: list[dict] | None,
) -> None:
    parent_id = event.get("parent_event_id")
    if parent_id is None:
        return
    if run_events is None:
        return
    run_id = event.get("run_id")
    ids_in_run = {e.get("event_id") for e in run_events if e.get("run_id") == run_id}
    if parent_id not in ids_in_run:
        violations.append(
            _violation(
                "parent_event_id",
                "parent_event_id_invalid",
                f"parent_event_id {parent_id!r} must reference an event_id in the same run",
            )
        )


def _derive_loop_iterations(run_events: list[dict]) -> int | None:
    """Migration helper: count loop_cycle events when loop_iterations absent."""
    cycles = [e for e in run_events if e.get("event_type") == "loop_cycle"]
    if not cycles:
        return None
    iterations = [
        (e.get("payload") or {}).get("loop_iteration")
        for e in cycles
        if isinstance((e.get("payload") or {}).get("loop_iteration"), int)
    ]
    if iterations:
        return max(iterations)
    return len(cycles)


def _planned_pass_ids(run_events: list[dict]) -> set[str]:
    planner_ev = next(
        (e for e in run_events if e.get("event_type") == "planner_complete"),
        None,
    )
    if not planner_ev:
        return set()
    passes = (planner_ev.get("payload") or {}).get("passes") or []
    return {
        p.get("id")
        for p in passes
        if isinstance(p, dict) and isinstance(p.get("id"), str)
    }


def _validate_worker_technique_pass_planned(
    violations: list[dict],
    event: dict,
    run_events: list[dict] | None,
) -> None:
    if event.get("event_type") != "worker_complete" or not run_events:
        return
    planned_ids = _planned_pass_ids(run_events)
    if not planned_ids:
        return
    payload = event.get("payload") or {}
    pass_id = payload.get("pass_id")
    if not isinstance(pass_id, str) or pass_id not in planned_ids:
        return
    tp = payload.get("technique_pass")
    if tp is None or tp == "":
        violations.append(
            _violation(
                "payload.technique_pass",
                "technique_pass_required",
                "payload.technique_pass is required for planner-scheduled passes "
                "(use integrated, none, or technique name)",
            )
        )
    elif isinstance(tp, str) and tp.lower() in TECHNIQUE_PASS_FORBIDDEN:
        violations.append(
            _violation(
                "payload.technique_pass",
                "technique_pass_forbidden",
                "payload.technique_pass must not be 'unknown'",
            )
        )


def _validate_loop_iterations_migration(
    violations: list[dict],
    event: dict,
    run_events: list[dict] | None,
) -> None:
    """Allow absent loop_iterations when derivable from loop_cycle count (legacy migration)."""
    if event.get("event_type") != "run_finished" or not run_events:
        return
    payload = event.get("payload") or {}
    if payload.get("loop_enabled") is not True:
        return
    if payload.get("loop_iterations") is not None:
        return
    derived = _derive_loop_iterations(run_events)
    if derived is not None and derived > 0:
        violations[:] = [
            v
            for v in violations
            if not (
                v.get("path") == "payload.loop_iterations" and v.get("code") == "required"
            )
        ]


def _validate_routing_loop_iteration(
    violations: list[dict],
    event: dict,
    run_events: list[dict] | None,
) -> None:
    if event.get("event_type") != "routing_decision" or not run_events:
        return
    run_context = next(
        (e for e in run_events if e.get("event_type") == "run_context"),
        None,
    )
    if not run_context:
        return
    if (run_context.get("payload") or {}).get("loop_enabled") is not True:
        return
    payload = event.get("payload") or {}
    loop_iter = payload.get("loop_iteration")
    if loop_iter is None:
        violations.append(
            _violation(
                "payload.loop_iteration",
                "required",
                "payload.loop_iteration is required when run_context.loop_enabled is true",
            )
        )
    elif not isinstance(loop_iter, int):
        violations.append(
            _violation(
                "payload.loop_iteration",
                "type",
                "payload.loop_iteration must be an int",
            )
        )


def validate_event(
    event: dict,
    allow_test: bool = False,
    run_events: list[dict] | None = None,
) -> list[dict]:
    """Return schema violations; empty list means the event is valid."""
    violations: list[dict] = []

    if not isinstance(event, dict):
        return [_violation("$", "type", "event must be an object")]

    for field in ENVELOPE_REQUIRED:
        if field not in event or _is_missing(event.get(field)):
            violations.append(_violation(field, "required", f"{field} is required"))

    if event.get("schema_version") != 1:
        violations.append(
            _violation("schema_version", "value", "schema_version must be 1")
        )

    run_id = event.get("run_id")
    if isinstance(run_id, str):
        if not allow_test and run_id.startswith(TEST_RUN_PREFIXES):
            violations.append(
                _violation(
                    "run_id",
                    "test_prefix",
                    "run_id with test_/smoke_ prefix requires --allow-test",
                )
            )
    elif "run_id" in event:
        violations.append(_violation("run_id", "type", "run_id must be a string"))

    agent_role = event.get("agent_role")
    if isinstance(agent_role, str) and agent_role not in AGENT_ROLES:
        violations.append(
            _violation(
                "agent_role",
                "enum",
                f"agent_role must be one of {sorted(AGENT_ROLES)}",
            )
        )

    event_type = event.get("event_type")
    if isinstance(event_type, str):
        if event_type not in EVENT_TYPES:
            violations.append(
                _violation(
                    "event_type",
                    "enum",
                    f"event_type must be one of {sorted(EVENT_TYPES)}",
                )
            )
        else:
            expected_role = ROLE_BY_EVENT[event_type]
            if agent_role != expected_role:
                violations.append(
                    _violation(
                        "agent_role",
                        "role_mismatch",
                        f"agent_role must be {expected_role} for event_type {event_type}",
                    )
                )
    elif "event_type" in event:
        violations.append(_violation("event_type", "type", "event_type must be a string"))

    payload = event.get("payload")
    if not isinstance(payload, dict):
        if "payload" in event:
            violations.append(_violation("payload", "type", "payload must be an object"))
        return violations

    if "run_id" in payload:
        violations.append(
            _violation(
                "payload.run_id",
                "forbidden",
                "run_id is forbidden in payload; use envelope run_id",
            )
        )

    if isinstance(event_type, str) and event_type in EVENT_TYPES:
        _check_unknown_payload_fields(violations, event_type, payload)
        PAYLOAD_VALIDATORS[event_type](violations, payload, event.get("project", ""))

    _validate_parent_event_id(violations, event, run_events)
    _validate_routing_loop_iteration(violations, event, run_events)
    _validate_planner_before_schedule(violations, event, run_events)
    _validate_planner_before_worker(violations, event, run_events)
    _validate_worker_technique_pass_planned(violations, event, run_events)
    _validate_run_sequence_for_finished(violations, event, run_events)
    _validate_loop_iterations_migration(violations, event, run_events)

    return violations
