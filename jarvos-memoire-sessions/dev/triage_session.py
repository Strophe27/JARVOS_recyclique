#!/usr/bin/env python3
"""
Triage session agentique : heuristiques de type + fiche courte dans
references/jarvos-agentique/sessions/<uuid-prefix>_<slug-court>.md
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

from index_lib import (
    filter_by_conversation_id,
    first_workspace_from_rows,
    merge_text_blobs,
    read_manifest,
    read_prompts,
    read_responses,
    repo_root_from,
    slug_short,
    transcript_jsonl_path,
    uuid_prefix,
)

SESSION_TYPES = (
    "bmad-dev-story",
    "jarvos-discovery",
    "orchestration-graph",
    "mixte",
)

SIGNAL_PATTERNS: dict[str, list[tuple[str, re.Pattern[str]]]] = {
    "bmad-dev-story": [
        ("implementation-artifacts", re.compile(r"implementation-artifacts", re.I)),
        ("bmad", re.compile(r"\bbmad\b|bmad-dev-story|sprint-status", re.I)),
        ("story file", re.compile(r"story-\d+-\d+|_bmad-output", re.I)),
    ],
    "jarvos-discovery": [
        ("QCM", re.compile(r"\bQCM\b|reponse [A-D]|HITL", re.I)),
        ("ARCH", re.compile(r"\bARCH\b|architecte externe|dossier-architecte", re.I)),
        ("cartographie", re.compile(r"cartograph|discovery|protocole-modules", re.I)),
    ],
    "orchestration-graph": [
        (".cursor/plans", re.compile(r"\.cursor/plans|\.plan\.md", re.I)),
        ("orchestration", re.compile(r"orchestration-graph|long-run|meta-orchestr", re.I)),
        ("qa2 plan", re.compile(r"qa2_global|@qa2-orchestrator", re.I)),
    ],
}


@dataclass
class TriageResult:
    conversation_id: str
    session_type: str
    scores: dict[str, int] = field(default_factory=dict)
    signals_hit: list[str] = field(default_factory=list)
    title_hint: str = ""
    workspace_root: str | None = None
    transcript_path: str | None = None
    plan_refs: list[str] = field(default_factory=list)
    story_refs: list[str] = field(default_factory=list)


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Triage session → fiche jarvos-agentique/sessions/.")
    p.add_argument("--uuid", help="conversation_id cible.")
    p.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Traiter les N derniers UUID du manifest (0 = désactivé si --uuid).",
    )
    p.add_argument("--repo-root", type=Path, default=None)
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Affiche le type et le chemin sans écrire.",
    )
    p.add_argument(
        "--sessions-dir",
        type=Path,
        default=None,
        help="Dossier fiches (défaut : references/jarvos-agentique/sessions).",
    )
    return p.parse_args()


def _collect_corpus(
    conversation_id: str,
    manifest_rows: list[dict],
    prompt_rows: list[dict],
    response_rows: list[dict],
    transcript_path: Path | None,
    max_transcript_chars: int = 120_000,
) -> str:
    parts: list[str] = []
    for row in manifest_rows + prompt_rows + response_rows:
        for key in ("title_snippet", "user_excerpt", "prompt", "text", "payload"):
            val = row.get(key)
            if isinstance(val, str):
                parts.append(val)
            elif isinstance(val, dict):
                parts.append(json.dumps(val, ensure_ascii=False))
        payload = row.get("payload")
        if isinstance(payload, dict):
            for k, v in payload.items():
                if isinstance(v, str):
                    parts.append(v)
    if transcript_path and transcript_path.is_file():
        try:
            blob = transcript_path.read_text(encoding="utf-8", errors="replace")
            if len(blob) > max_transcript_chars:
                blob = blob[:max_transcript_chars]
            parts.append(blob)
        except OSError:
            pass
    return merge_text_blobs(*parts)


def _score_type(corpus: str) -> tuple[str, dict[str, int], list[str]]:
    scores: dict[str, int] = {t: 0 for t in SESSION_TYPES if t != "mixte"}
    hits: list[str] = []
    for stype, patterns in SIGNAL_PATTERNS.items():
        for label, rx in patterns:
            if rx.search(corpus):
                scores[stype] += 1
                hits.append(f"{stype}:{label}")

    ranked = sorted(scores.items(), key=lambda x: (-x[1], x[0]))
    top_score = ranked[0][1] if ranked else 0
    second = ranked[1][1] if len(ranked) > 1 else 0

    if top_score == 0:
        return "mixte", scores, hits
    leaders = [t for t, s in ranked if s == top_score and s > 0]
    if len(leaders) > 1 or (top_score > 0 and second > 0 and top_score == second):
        return "mixte", scores, hits
    return ranked[0][0], scores, hits


def _extract_path_refs(corpus: str) -> tuple[list[str], list[str]]:
    plans = sorted(set(re.findall(r"\.cursor/plans/[\w.-]+\.plan\.md", corpus, re.I)))[:5]
    stories = sorted(
        set(
            re.findall(
                r"_bmad-output/implementation-artifacts/[\w./-]+\.md",
                corpus,
                re.I,
            )
        )
    )[:5]
    return plans, stories


def triage_one(
    conversation_id: str,
    repo_root: Path,
    manifest_all: list[dict],
    prompts_all: list[dict],
    responses_all: list[dict],
) -> TriageResult:
    man = filter_by_conversation_id(manifest_all, conversation_id)
    pr = filter_by_conversation_id(prompts_all, conversation_id)
    res = filter_by_conversation_id(responses_all, conversation_id)

    workspace = first_workspace_from_rows(man + pr + res)
    explicit_tp = None
    for row in man + res:
        tp = row.get("transcript_path")
        if tp:
            explicit_tp = tp
            break
    slug = None
    for row in man:
        if row.get("project_slug"):
            slug = str(row["project_slug"])
            break

    tpath = transcript_jsonl_path(
        conversation_id,
        workspace_root=workspace,
        project_slug=slug,
        explicit_path=explicit_tp,
    )

    corpus = _collect_corpus(conversation_id, man, pr, res, tpath)
    session_type, scores, hits = _score_type(corpus)
    plans, stories = _extract_path_refs(corpus)

    title_hint = ""
    for row in man:
        payload = row.get("payload") or {}
        if isinstance(payload, dict) and payload.get("title_snippet"):
            title_hint = str(payload["title_snippet"])
            break
    if not title_hint:
        for row in pr:
            ex = row.get("user_excerpt") or row.get("prompt") or ""
            if ex:
                title_hint = str(ex)[:120]
                break

    return TriageResult(
        conversation_id=conversation_id,
        session_type=session_type,
        scores={k: v for k, v in scores.items()},
        signals_hit=hits[:12],
        title_hint=title_hint.strip(),
        workspace_root=workspace,
        transcript_path=str(tpath) if tpath else None,
        plan_refs=plans,
        story_refs=stories,
    )


def _render_fiche(tr: TriageResult) -> str:
    """Fiche 3–15 lignes selon le type (bmad-dev-story = courte, sans patterns)."""
    title = tr.title_hint or "Session agent"
    lines = [
        f"# {title}",
        "",
        f"- **Type :** {tr.session_type}",
        f"- **Transcript :** `{tr.conversation_id}`",
    ]
    if tr.workspace_root:
        lines.append(f"- **Workspace :** `{tr.workspace_root}`")
    if tr.plan_refs:
        lines.append(f"- **Plans :** {', '.join(f'`{p}`' for p in tr.plan_refs[:3])}")
    if tr.story_refs:
        lines.append(f"- **Story / artefacts :** {', '.join(f'`{s}`' for s in tr.story_refs[:3])}")
    if tr.signals_hit:
        lines.append(f"- **Signaux :** {', '.join(tr.signals_hit[:8])}")

    if tr.session_type == "bmad-dev-story":
        lines.extend(
            [
                "",
                "**Suite :** story file + `sprint-status.yaml` ; porte d'entrée §4 type `bmad-dev-story`.",
            ]
        )
        return "\n".join(lines) + "\n"

    lines.append("")
    if tr.session_type == "jarvos-discovery":
        lines.append(
            "**Suite :** `references/jarvos-agentique/00-porte-entree-contexte.md` § discovery ; "
            "artefacts datés plutôt que transcript."
        )
    elif tr.session_type == "orchestration-graph":
        lines.append(
            "**Suite :** plan `.cursor/plans/` + `plans-index.md` ; skill `long-run-orchestrator` si multi-vagues."
        )
    else:
        lines.append(
            "**Suite :** requalifier le type en début de prochaine session ; matrice porte d'entrée §4."
        )

    if tr.session_type != "bmad-dev-story":
        lines.append("")
        lines.append(
            "*Patterns :* voir `references/jarvos-agentique/registre-patterns.md` si session significative."
        )

    return "\n".join(lines) + "\n"


def _fiche_path(tr: TriageResult, sessions_dir: Path) -> Path:
    pref = uuid_prefix(tr.conversation_id, 8)
    slug = slug_short(tr.title_hint or tr.session_type, 36)
    return sessions_dir / f"{pref}_{slug}.md"


def _conversation_ids_from_manifest(manifest: list[dict], limit: int) -> list[str]:
    seen: list[str] = []
    for row in reversed(manifest):
        cid = row.get("conversation_id")
        if not cid:
            continue
        key = str(cid)
        if key not in seen:
            seen.append(key)
        if limit and len(seen) >= limit:
            break
    return list(reversed(seen))


def main() -> None:
    args = _parse_args()
    root = (args.repo_root or repo_root_from()).resolve()
    sessions_dir = (
        args.sessions_dir or root / "references" / "jarvos-agentique" / "sessions"
    ).resolve()

    if not args.uuid and not args.limit:
        print("Erreur: fournir --uuid ou --limit N.", file=sys.stderr)
        sys.exit(2)

    manifest = read_manifest(root)
    prompts = read_prompts(root)
    responses = read_responses(root)

    if args.uuid:
        ids = [args.uuid]
    else:
        ids = _conversation_ids_from_manifest(manifest, args.limit)

    if not ids:
        print("Aucune conversation à traiter.", file=sys.stderr)
        sys.exit(1)

    for cid in ids:
        tr = triage_one(cid, root, manifest, prompts, responses)
        out_path = _fiche_path(tr, sessions_dir)
        print(f"{cid} → {tr.session_type} → {out_path}", file=sys.stderr)
        if args.dry_run:
            continue
        sessions_dir.mkdir(parents=True, exist_ok=True)
        out_path.write_text(_render_fiche(tr), encoding="utf-8")


if __name__ == "__main__":
    main()
