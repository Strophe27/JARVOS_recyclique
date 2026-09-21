#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""
Figer une session d'analyse QA3 : métriques + watermark journal + comparaison delta.

Écrit JSON machine (artefacts/snapshots/) et markdown humain (artefacts/YYYY-MM-DD_NN_*.md).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tempfile
from pathlib import Path

import analyze_cycles
import analyze_pass_roi
import qa_stats
from skill_paths import resolve_events_path
from telemetry_journal import event_count_since, scan_journal, utc_now_iso, write_filtered_journal

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_USAGE = 2

SCHEMA_VERSION = "0.1"
DEFAULT_ARTEFACTS_REL = (
    Path(__file__).resolve().parents[4]
    / "docs"
    / "forge"
    / "auto-amelioration"
    / "SC-TELEMETRY-ANALYTICS-001"
    / "artefacts"
)


def resolve_artefacts_dir(explicit: str | None) -> Path:
    if explicit:
        return Path(explicit).expanduser().resolve()
    if os.environ.get("QA_ANALYTICS_ARTEFACTS_DIR"):
        return Path(os.environ["QA_ANALYTICS_ARTEFACTS_DIR"]).expanduser().resolve()
    return DEFAULT_ARTEFACTS_REL.resolve()


def _gate_rate(gate_final: dict) -> float | None:
    ok = gate_final.get("ok") or 0
    fail = gate_final.get("fail") or 0
    total = ok + fail
    if not total:
        return None
    return round(ok / total, 4)


def slim_cycles(report: dict) -> dict:
    gf = report.get("gate_final") or {}
    return {
        "run_count": report.get("run_count"),
        "loop_run_count": report.get("loop_run_count"),
        "event_count": report.get("event_count"),
        "gate_final": gf,
        "gate_final_rate": _gate_rate(gf),
        "stagnation_count": report.get("stagnation_count"),
        "exhaustion_count": report.get("exhaustion_count"),
        "excluded_run_count": report.get("excluded_run_count"),
    }


def slim_pass_roi(report: dict) -> dict:
    by_kind = report.get("by_pass_kind") or {}
    return {
        "run_count": report.get("run_count"),
        "worker_count": report.get("worker_count"),
        "event_count": report.get("event_count"),
        "by_pass_kind": by_kind,
        "redundancy_count": report.get("redundancy_count"),
        "cosmetic_threshold": report.get("cosmetic_threshold"),
    }


def slim_qa_stats(report: dict) -> dict:
    cm = report.get("cycle_metrics") or {}
    gf = cm.get("gate_final") or {}
    return {
        "run_count": report.get("run_count"),
        "event_count": report.get("event_count"),
        "flag_totals": report.get("flag_totals"),
        "routing_gate_rates": report.get("routing_gate_rates"),
        "cycle_metrics": {
            "loop_run_count": cm.get("loop_run_count"),
            "gate_final": gf,
            "gate_final_rate": _gate_rate(gf),
            "stagnation_count": cm.get("stagnation_count"),
        },
        "technique_pass_roi": report.get("technique_pass_roi"),
    }


def load_latest_snapshot(snapshots_dir: Path) -> dict | None:
    if not snapshots_dir.is_dir():
        return None
    candidates = sorted(snapshots_dir.glob("*.json"), key=lambda p: p.name)
    index_path = snapshots_dir / "INDEX.json"
    if index_path.exists():
        try:
            index = json.loads(index_path.read_text(encoding="utf-8"))
            latest = index.get("latest")
            if latest:
                p = snapshots_dir / latest
                if p.exists():
                    return json.loads(p.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    for path in reversed(candidates):
        if path.name == "INDEX.json":
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if data.get("ok"):
                return data
        except (json.JSONDecodeError, OSError):
            continue
    return None


def compare_gate_delta(current: dict | None, previous: dict | None) -> dict | None:
    if not current or not previous:
        return None
    cur_rate = current.get("gate_final_rate")
    prev_rate = previous.get("gate_final_rate")
    if cur_rate is None or prev_rate is None:
        return None
    return {
        "previous_gate_final_rate": prev_rate,
        "current_gate_final_rate": cur_rate,
        "delta_pp": round((cur_rate - prev_rate) * 100, 2),
    }


def build_snapshot(
    events_path: Path,
    *,
    since: str | None = None,
    exclude_test: bool = True,
    previous_snapshot: dict | None = None,
    analyst_note: str | None = None,
) -> dict:
    journal_meta = scan_journal(events_path)
    analysis_at = utc_now_iso()

    analysis_path = events_path
    temp_path: Path | None = None
    if since:
        temp_path = write_filtered_journal(events_path, since=since)
        analysis_path = temp_path

    try:
        cycles_full = analyze_cycles.build_report(analysis_path, exclude_test=exclude_test)
        roi_full = analyze_pass_roi.build_report(analysis_path, exclude_test=exclude_test)
        stats_full = qa_stats.build_report(
            analysis_path,
            exclude_test=exclude_test,
            exclude_legacy=True,
        )
    finally:
        if temp_path is not None:
            try:
                temp_path.unlink(missing_ok=True)
            except OSError:
                pass

    cycles_slim = slim_cycles(cycles_full)
    roi_slim = slim_pass_roi(roi_full)
    stats_slim = slim_qa_stats(stats_full)

    prev_cycles = None
    if previous_snapshot:
        prev_metrics = previous_snapshot.get("metrics") or {}
        prev_cycles = (prev_metrics.get("cycles") or {}).copy()

    snapshot: dict = {
        "ok": True,
        "schema_version": SCHEMA_VERSION,
        "analysis_session_at": analysis_at,
        "analyst_note": analyst_note,
        "journal": journal_meta,
        "scope": {
            "mode": "delta" if since else "cumulative",
            "since_filter": since,
            "events_analyzed_count": (
                event_count_since(events_path, since) if since else journal_meta.get("events_parsed_count")
            ),
            "filters": {
                "exclude_test": exclude_test,
                "exclude_legacy": True,
                "require_run_finished": True,
            },
        },
        "previous_snapshot": {
            "analysis_session_at": previous_snapshot.get("analysis_session_at") if previous_snapshot else None,
            "events_watermark": (previous_snapshot.get("journal") or {}).get("events_watermark")
            if previous_snapshot
            else None,
            "json_file": previous_snapshot.get("_json_file") if previous_snapshot else None,
        },
        "metrics": {
            "cycles": cycles_slim,
            "pass_roi": roi_slim,
            "qa_stats": stats_slim,
        },
        "comparison_vs_previous": compare_gate_delta(cycles_slim, prev_cycles),
    }
    return snapshot


def _snapshot_filename(analysis_at: str) -> str:
    slug = analysis_at.replace(":", "").replace("-", "")
    return f"{slug}.json"


def _next_artefact_slug(artefacts_dir: Path, date_prefix: str) -> tuple[str, int]:
    pattern = re.compile(rf"^{re.escape(date_prefix)}_(\d{{2}})_")
    max_nn = 0
    for path in artefacts_dir.glob(f"{date_prefix}_*.md"):
        m = pattern.match(path.name)
        if m:
            max_nn = max(max_nn, int(m.group(1)))
    nn = max_nn + 1
    return f"{date_prefix}_{nn:02d}", nn


def render_markdown(snapshot: dict, *, artefact_name: str, json_name: str) -> str:
    j = snapshot.get("journal") or {}
    scope = snapshot.get("scope") or {}
    cycles = (snapshot.get("metrics") or {}).get("cycles") or {}
    roi = (snapshot.get("metrics") or {}).get("pass_roi") or {}
    gf = cycles.get("gate_final") or {}
    ok, fail = gf.get("ok") or 0, gf.get("fail") or 0
    rate = cycles.get("gate_final_rate")
    rate_pct = f"{rate * 100:.1f} %" if rate is not None else "n/a"

    prev = snapshot.get("previous_snapshot") or {}
    cmp_ = snapshot.get("comparison_vs_previous")

    lines = [
        f"# Session analyste — snapshot scripté ({artefact_name})",
        "",
        f"**Date session** : {snapshot.get('analysis_session_at', '')[:10]}",
        f"**Analyse figée à** : `{snapshot.get('analysis_session_at')}`",
        f"**Journal** : `{j.get('events_path')}`",
        f"**Watermark journal** : `{j.get('events_watermark')}` (dernier événement lu)",
        f"**Lignes journal** : {j.get('events_line_count')} · événements parsés : {j.get('events_parsed_count')}",
        f"**Snapshot JSON** : [snapshots/{json_name}](snapshots/{json_name})",
        "",
        "> Prochaine analyse : filtrer les événements **après** ce watermark (`analyze_snapshot.py --since <watermark>`).",
        "",
        "---",
        "",
        "## Périmètre",
        "",
        f"| Champ | Valeur |",
        f"|-------|--------|",
        f"| Mode | `{scope.get('mode')}` |",
        f"| Since filter | `{scope.get('since_filter') or '—'}` |",
        f"| Événements analysés (scope) | {scope.get('events_analyzed_count')} |",
        f"| Snapshot précédent | `{prev.get('analysis_session_at') or '—'}` |",
        f"| Watermark précédent | `{prev.get('events_watermark') or '—'}` |",
        "",
    ]

    if cmp_:
        lines.extend(
            [
                "### Évolution vs snapshot précédent (gate finale)",
                "",
                f"- Taux précédent : **{cmp_['previous_gate_final_rate'] * 100:.1f} %**",
                f"- Taux courant : **{cmp_['current_gate_final_rate'] * 100:.1f} %**",
                f"- Delta : **{cmp_['delta_pp']:+.2f} pp**",
                "",
            ]
        )

    note = snapshot.get("analyst_note")
    if note:
        lines.extend(["### Note analyste", "", note, ""])

    lines.extend(
        [
            "## Baseline chiffrée (scripts `analyze_*`)",
            "",
            "### L1 — Runs clôturés et gate finale",
            "",
            "| Métrique | Valeur |",
            "|----------|--------|",
            f"| Runs prod clôturés | {cycles.get('run_count')} |",
            f"| Runs en boucle | {cycles.get('loop_run_count')} |",
            f"| Gate finale OK / FAIL | {ok} / {fail} (**{rate_pct}**) |",
            f"| Stagnation (score_delta=0×2) | {cycles.get('stagnation_count')} |",
            f"| Épuisement max_cycles | {cycles.get('exhaustion_count')} |",
            f"| Runs exclus (test/orphelin) | {cycles.get('excluded_run_count')} |",
            "",
            "### L3 — ROI par `pass_kind`",
            "",
            "| Kind | Workers | Cosmétique | Findings/worker |",
            "|------|---------|------------|-----------------|",
        ]
    )

    for kind, stats in sorted((roi.get("by_pass_kind") or {}).items()):
        cos = stats.get("cosmetic_rate")
        cos_s = f"{cos * 100:.0f} %" if cos is not None else "n/a"
        lines.append(
            f"| `{kind}` | {stats.get('workers')} | {cos_s} | {stats.get('findings_per_worker')} |"
        )

    lines.extend(
        [
            "",
            "## Méthode",
            "",
            "Scripts exécutés : `analyze_snapshot.py` → `analyze_cycles` · `analyze_pass_roi` · `qa_stats`.",
            "Runbook : [RUNBOOK-ANALYSTE.md](../RUNBOOK-ANALYSTE.md).",
            "",
            "## Reco patch skill (hors artefact)",
            "",
            "→ [IDEA-2026-07-11-001](../../../../../docs/ideas/kanban/IDEA-2026-07-11-001.md) · AUTO-005",
            "",
            f"*{artefact_name} — généré par analyze_snapshot.py*",
        ]
    )
    return "\n".join(lines) + "\n"


def update_snapshots_index(snapshots_dir: Path, json_name: str, snapshot: dict) -> None:
    index_path = snapshots_dir / "INDEX.json"
    entries: list[dict] = []
    if index_path.exists():
        try:
            data = json.loads(index_path.read_text(encoding="utf-8"))
            entries = data.get("snapshots") or []
        except (json.JSONDecodeError, OSError):
            entries = []
    entries.append(
        {
            "file": json_name,
            "analysis_session_at": snapshot.get("analysis_session_at"),
            "events_watermark": (snapshot.get("journal") or {}).get("events_watermark"),
            "scope_mode": (snapshot.get("scope") or {}).get("mode"),
        }
    )
    index_path.write_text(
        json.dumps(
            {
                "schema_version": SCHEMA_VERSION,
                "latest": json_name,
                "snapshots": entries,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def write_bundle(
    snapshot: dict,
    artefacts_dir: Path,
    *,
    artefact_slug: str | None = None,
    artefact_subject: str = "scripted-snapshot",
) -> dict:
    artefacts_dir.mkdir(parents=True, exist_ok=True)
    snapshots_dir = artefacts_dir / "snapshots"
    snapshots_dir.mkdir(parents=True, exist_ok=True)

    json_name = _snapshot_filename(snapshot["analysis_session_at"])
    json_path = snapshots_dir / json_name
    snapshot["_json_file"] = f"snapshots/{json_name}"
    json_path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    update_snapshots_index(snapshots_dir, json_name, snapshot)

    date_prefix = snapshot["analysis_session_at"][:10]
    if artefact_slug:
        md_name = f"{artefact_slug}_{artefact_subject}.md"
    else:
        slug, _ = _next_artefact_slug(artefacts_dir, date_prefix)
        md_name = f"{slug}_{artefact_subject}.md"

    md_path = artefacts_dir / md_name
    md_path.write_text(
        render_markdown(snapshot, artefact_name=md_name.replace(".md", ""), json_name=json_name),
        encoding="utf-8",
    )

    return {
        "json_path": str(json_path),
        "md_path": str(md_path),
        "json_name": json_name,
        "md_name": md_name,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Figé session analyse QA3 (métriques + watermark + comparaison)"
    )
    parser.add_argument("--events", default=None, help="Chemin events.jsonl (défaut install)")
    parser.add_argument(
        "--since",
        default=None,
        help="ISO8601 — analyser uniquement événements après ce timestamp (delta)",
    )
    parser.add_argument(
        "--compare-previous",
        action="store_true",
        help="Charger le dernier snapshot JSON et calculer delta gate",
    )
    parser.add_argument(
        "--auto-since-previous",
        action="store_true",
        help="Si --since absent : utiliser events_watermark du snapshot précédent comme filtre delta",
    )
    parser.add_argument(
        "--artefacts-dir",
        default=None,
        help="Dossier artefacts SC-TELEMETRY (défaut env QA_ANALYTICS_ARTEFACTS_DIR ou chemin forge)",
    )
    parser.add_argument("--write", action="store_true", help="Écrire JSON + markdown dans artefacts/")
    parser.add_argument(
        "--artefact-slug",
        default=None,
        help="Forcer slug YYYY-MM-DD_NN (ex. 2026-07-12_01) sans auto-incrément",
    )
    parser.add_argument("--artefact-subject", default="scripted-snapshot", help="Suffixe sujet markdown")
    parser.add_argument("--json", action="store_true", help="JSON snapshot sur stdout")
    parser.add_argument("--include-test", action="store_true", help="Inclure runs test_/smoke_")
    parser.add_argument("--note", default=None, help="Note analyste libre")
    try:
        args = parser.parse_args()
    except SystemExit as exc:
        if exc.code not in (0, None):
            print(json.dumps({"ok": False, "error": "invalid_arguments"}))
            return EXIT_USAGE
        raise

    events_path = resolve_events_path(args.events)
    artefacts_dir = resolve_artefacts_dir(args.artefacts_dir)
    snapshots_dir = artefacts_dir / "snapshots"

    previous: dict | None = None
    if args.compare_previous or args.auto_since_previous:
        previous = load_latest_snapshot(snapshots_dir)

    since = args.since
    if since is None and args.auto_since_previous and previous:
        since = (previous.get("journal") or {}).get("events_watermark")

    exclude_test = not args.include_test

    try:
        snapshot = build_snapshot(
            events_path,
            since=since,
            exclude_test=exclude_test,
            previous_snapshot=previous,
            analyst_note=args.note,
        )
    except Exception as exc:
        print(f"ANALYZE_SNAPSHOT_FAILED: {exc}", file=sys.stderr)
        print(json.dumps({"ok": False, "error": str(exc)}))
        return EXIT_FAIL

    written: dict | None = None
    if args.write:
        try:
            written = write_bundle(
                snapshot,
                artefacts_dir,
                artefact_slug=args.artefact_slug,
                artefact_subject=args.artefact_subject,
            )
            snapshot["written"] = written
        except Exception as exc:
            print(f"ANALYZE_SNAPSHOT_WRITE_FAILED: {exc}", file=sys.stderr)
            print(json.dumps({"ok": False, "error": str(exc)}))
            return EXIT_FAIL

    if args.json or not args.write:
        print(json.dumps(snapshot, ensure_ascii=False, indent=2))
    elif written:
        print(
            json.dumps(
                {
                    "ok": True,
                    "written": written,
                    "analysis_session_at": snapshot.get("analysis_session_at"),
                    "events_watermark": (snapshot.get("journal") or {}).get("events_watermark"),
                },
                ensure_ascii=False,
                indent=2,
            )
        )

    return EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
