#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""
Bridge: QA analytics session -> improvement_event JSONL (source: qa_telemetry).

Default: append to improvement-events.jsonl (R-AI-01). Use --dry-run for stdout only.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from append_improvement_event import append_event
from validate_improvement_event import resolve_improvement_events_path

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_USAGE = 2

FILTER_VERSION = "0.1-draft"
PROJECT_ID = "jarmes-skills-rules"
DEFAULT_IDEA = "IDEA-2026-07-11-001"
QA3_BUNDLE = "Skills/qa/qa3-agent/"
ORCH_BUNDLE = "Skills/qa/orchestrateur-qa-95/"

# Thresholds (draft AUTO-004) — align PONT-R-AI-01-DRAFT.md
MISSING_RUN_FINISHED_MIN = 5
COSMETIC_RATE_THRESHOLD = 0.30
TECHNIQUE_PASS_LOW_CONFIDENCE = 0.20


def _utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _read_json_source(path: str | None) -> dict | None:
    if not path:
        return None
    if path == "-":
        raw = sys.stdin.read()
    else:
        raw = Path(path).read_text(encoding="utf-8")
    raw = raw.strip()
    if not raw:
        return None
    return json.loads(raw)


def _auto_triage(
    rules: list[str],
    confidence: str = "medium",
    rejected: int = 0,
) -> dict:
    return {
        "filter_version": FILTER_VERSION,
        "decision": "promote",
        "rules_matched": rules,
        "confidence": confidence,
        "noise_rejected_count": rejected,
    }


def _event(
    *,
    artifact_id: str,
    source_bundle: str,
    problem: str,
    recommendation: str,
    severity: str,
    session_ref: str | None,
    related_idea_id: str | None,
    rules: list[str],
    confidence: str = "medium",
) -> dict:
    return {
        "event_id": str(uuid.uuid4()),
        "recorded_at": _utc_now(),
        "artifact_type": "skill",
        "artifact_id": artifact_id,
        "source_bundle": source_bundle,
        "install_target": "both",
        "problem": problem[:500],
        "recommendation": recommendation[:1000],
        "source": "qa_telemetry",
        "severity": severity,
        "status": "noted",
        "project_id": PROJECT_ID,
        **({"session_ref": session_ref} if session_ref else {}),
        **({"related_idea_id": related_idea_id} if related_idea_id else {}),
        "auto_triage": _auto_triage(rules, confidence=confidence),
    }


def _events_from_cycles(data: dict | None, session_ref: str | None) -> list[dict]:
    if not data or not data.get("ok", True):
        return []
    events: list[dict] = []
    summary = data.get("summary") or data

    missing = summary.get("missing_run_finished") or summary.get("runs_without_run_finished")
    if isinstance(missing, int) and missing >= MISSING_RUN_FINISHED_MIN:
        events.append(
            _event(
                artifact_id="qa3-agent",
                source_bundle=QA3_BUNDLE,
                problem=(
                    f"{missing} runs prod sans evenement run_finished - tokens gaspilles"
                ),
                recommendation=(
                    "Rendre verify_run_closure bloquant avant end_turn parent ; "
                    "documenter TELEMETRY_APPEND_FAILED si append impossible"
                ),
                severity="bloquant",
                session_ref=session_ref,
                related_idea_id=DEFAULT_IDEA,
                rules=["aggregated_pattern", "artifact_actionable"],
                confidence="high",
            )
        )

    stagnation = summary.get("stagnation_runs") or summary.get("stagnation_count")
    stagnation_n = stagnation if isinstance(stagnation, int) else len(stagnation or [])
    if stagnation_n >= 3:
        events.append(
            _event(
                artifact_id="qa3-agent",
                source_bundle=QA3_BUNDLE,
                problem=(
                    f"Stagnation score_delta=0 sur 2 cycles consecutifs - {stagnation_n} runs"
                ),
                recommendation=(
                    "R2 workflow-loop : stop boucle + HITL si 2 cycles sans progression ; "
                    "aligner orchestrateur-qa-95 brief"
                ),
                severity="important",
                session_ref=session_ref,
                related_idea_id=DEFAULT_IDEA,
                rules=["aggregated_pattern"],
                confidence="medium",
            )
        )

    closure_anomalies = summary.get("anomalies_closure") or summary.get("closure_p1_anomalies")
    anomaly_n = closure_anomalies if isinstance(closure_anomalies, int) else len(closure_anomalies or [])
    if anomaly_n >= 2:
        events.append(
            _event(
                artifact_id="qa3-agent",
                source_bundle=QA3_BUNDLE,
                problem="Anomalies closure P1 : loop_cycle gate OK mais run_finished FAIL",
                recommendation=(
                    "R3 renforcer clôture integrale workflow-loop avant append run_finished"
                ),
                severity="important",
                session_ref=session_ref,
                related_idea_id=DEFAULT_IDEA,
                rules=["aggregated_pattern", "artifact_actionable"],
                confidence="medium",
            )
        )

    if summary.get("qa_stats_broken") or summary.get("qa_stats_error"):
        events.append(
            _event(
                artifact_id="qa3-agent",
                source_bundle=QA3_BUNDLE,
                problem="qa_stats.py indisponible ou en erreur — monitoring auto bloque",
                recommendation="R6 corriger agrégats null-safe ; test test_telemetry_scripts",
                severity="bloquant",
                session_ref=session_ref,
                related_idea_id=DEFAULT_IDEA,
                rules=["tool_failure"],
                confidence="high",
            )
        )

    return events


def _events_from_roi(data: dict | None, session_ref: str | None) -> list[dict]:
    if not data or not data.get("ok", True):
        return []
    events: list[dict] = []
    passes = data.get("passes") or data.get("by_kind") or []

    for row in passes:
        kind = row.get("kind") or row.get("pass_kind") or "unknown"
        cosmetic = row.get("cosmetic_rate") or row.get("cosmetic_pct")
        if cosmetic is not None and cosmetic > 1:
            cosmetic = cosmetic / 100.0
        if isinstance(cosmetic, (int, float)) and cosmetic >= COSMETIC_RATE_THRESHOLD:
            pct = int(round(cosmetic * 100))
            events.append(
                _event(
                    artifact_id="qa3-agent",
                    source_bundle=QA3_BUNDLE,
                    problem=(
                        f"Passe {kind} {pct}% cosmétique (Q>=96, 0 findings P0+P1) sur agrégat"
                    ),
                    recommendation=(
                        "R10 planner : ne pas doubler code/process si 1re passe Q>=95 "
                        "et 0 findings ; privilégier prd + adversarial"
                    ),
                    severity="important",
                    session_ref=session_ref,
                    related_idea_id=DEFAULT_IDEA,
                    rules=["aggregated_pattern"],
                    confidence="medium",
                )
            )

    confidence = (data.get("technique_pass_confidence") or "").lower()
    coverage = data.get("technique_pass_coverage")
    if confidence == "low" or (
        isinstance(coverage, (int, float)) and coverage < TECHNIQUE_PASS_LOW_CONFIDENCE
    ):
        events.append(
            _event(
                artifact_id="qa3-agent",
                source_bundle=QA3_BUNDLE,
                problem="technique_pass absent sur majorite workers - ROI passes peu fiable",
                recommendation="R7 rejeter append worker si technique_pass absent ; instrumenter passes",
                severity="important",
                session_ref=session_ref,
                related_idea_id=DEFAULT_IDEA,
                rules=["data_quality"],
                confidence="medium",
            )
        )

    return events


_RECO_HEADER = re.compile(
    r"^###\s+R(\d+)\s+[—\-]\s+(.+)$",
    re.MULTILINE,
)

_RECO_ARTIFACT = {
    "1": ("qa3-agent", QA3_BUNDLE, "important"),
    "2": ("qa3-agent", QA3_BUNDLE, "important"),
    "3": ("qa3-agent", QA3_BUNDLE, "important"),
    "4": ("qa3-agent", QA3_BUNDLE, "bloquant"),
    "5": ("qa3-agent", QA3_BUNDLE, "note"),
    "6": ("qa3-agent", QA3_BUNDLE, "bloquant"),
    "7": ("qa3-agent", QA3_BUNDLE, "important"),
    "8": ("orchestrateur-qa-95", ORCH_BUNDLE, "note"),
    "9": ("qa3-agent", QA3_BUNDLE, "note"),
    "10": ("qa3-agent", QA3_BUNDLE, "important"),
}


def _events_from_artefact(path: Path, session_ref: str | None) -> list[dict]:
    if not path.is_file():
        return []
    text = path.read_text(encoding="utf-8")
    events: list[dict] = []
    matches = list(_RECO_HEADER.finditer(text))
    for idx, match in enumerate(matches):
        num = match.group(1)
        title = match.group(2).strip()
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        body = text[start:end].strip()
        first_line = next((ln.strip() for ln in body.splitlines() if ln.strip()), "")
        artifact_id, bundle, severity = _RECO_ARTIFACT.get(
            num, ("qa3-agent", QA3_BUNDLE, "note")
        )
        events.append(
            _event(
                artifact_id=artifact_id,
                source_bundle=bundle,
                problem=f"Reco R{num} analyse télémétrie : {title}"[:500],
                recommendation=first_line[:1000] if first_line else title[:1000],
                severity=severity,
                session_ref=session_ref,
                related_idea_id=DEFAULT_IDEA,
                rules=["artefact_reco"],
                confidence="medium",
            )
        )
    return events


def _dedupe_events(events: list[dict]) -> list[dict]:
    seen: set[tuple[str, str]] = set()
    out: list[dict] = []
    for ev in events:
        key = (ev["artifact_id"], ev["problem"][:120])
        if key in seen:
            continue
        seen.add(key)
        out.append(ev)
    return out


def build_events(
    *,
    cycles: dict | None,
    roi: dict | None,
    artefact: Path | None,
    session_ref: str | None,
    include_artefact_recos: bool,
) -> list[dict]:
    events: list[dict] = []
    events.extend(_events_from_cycles(cycles, session_ref))
    events.extend(_events_from_roi(roi, session_ref))
    if include_artefact_recos and artefact:
        events.extend(_events_from_artefact(artefact, session_ref))
    return _dedupe_events(events)


def _write_events(events: list[dict], output_path: Path) -> tuple[int, int, list[str]]:
    """Append events; return (written, skipped_duplicate, errors)."""
    written = 0
    skipped = 0
    errors: list[str] = []
    for ev in events:
        ok, err = append_event(output_path, ev)
        if ok:
            written += 1
        elif err == "duplicate_event_id":
            skipped += 1
        else:
            errors.append(f"{ev.get('event_id')}: {err}")
    return written, skipped, errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Export improvement_event JSONL from QA analytics (R-AI-01).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print JSONL to stdout only; no disk writes",
    )
    parser.add_argument(
        "--output",
        help="improvement-events.jsonl path (default: global-bmad SoT)",
    )
    parser.add_argument("--cycles-json", help="Path to analyze_cycles JSON or '-' for stdin")
    parser.add_argument("--roi-json", help="Path to analyze_pass_roi JSON or '-' for stdin")
    parser.add_argument("--artefact", type=Path, help="Markdown session artefact (SC)")
    parser.add_argument("--session-ref", help="session_ref field for exported events")
    parser.add_argument(
        "--from-artefact-recos",
        action="store_true",
        help="Parse ### R1..R10 sections from artefact (default: only JSON signals)",
    )
    args = parser.parse_args(argv)

    try:
        cycles = _read_json_source(args.cycles_json)
        roi = _read_json_source(args.roi_json)
    except json.JSONDecodeError as exc:
        print(json.dumps({"ok": False, "error": "invalid_json", "message": str(exc)}))
        return EXIT_FAIL

    session_ref = args.session_ref
    if not session_ref and args.artefact:
        session_ref = str(args.artefact).replace("\\", "/")

    events = build_events(
        cycles=cycles,
        roi=roi,
        artefact=args.artefact,
        session_ref=session_ref,
        include_artefact_recos=args.from_artefact_recos,
    )

    if args.dry_run:
        for ev in events:
            print(json.dumps(ev, ensure_ascii=False))
        print(
            json.dumps(
                {
                    "ok": True,
                    "dry_run": True,
                    "event_count": len(events),
                }
            ),
            file=sys.stderr,
        )
        return EXIT_OK

    output_path = resolve_improvement_events_path(args.output)
    written, skipped, errors = _write_events(events, output_path)
    summary = {
        "ok": len(errors) == 0,
        "dry_run": False,
        "event_count": len(events),
        "written": written,
        "skipped_duplicate": skipped,
        "output": str(output_path),
    }
    if errors:
        summary["errors"] = errors
    print(json.dumps(summary, ensure_ascii=False))
    return EXIT_OK if not errors else EXIT_FAIL


if __name__ == "__main__":
    raise SystemExit(main())
