#!/usr/bin/env python3
"""Export MD léger depuis un transcript Cursor JSONL (sans thinking REDACTED massif)."""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from index_lib import (
    agent_transcripts_dir,
    repo_root_from,
    transcript_jsonl_path,
    workspace_slug,
)

_USER_QUERY_RE = re.compile(r"<user_query>\s*(.*?)\s*</user_query>", re.DOTALL | re.IGNORECASE)
_THINKING_TAG_RE = re.compile(r"<thinking>.*?</thinking>", re.DOTALL | re.IGNORECASE)
_REDACTED_BLOCK_RE = re.compile(
    r"\[REDACTED\][^\n]*(?:\n(?!\[REDACTED\])[^\n]*)*", re.IGNORECASE
)


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Export transcript JSONL → Markdown léger.")
    p.add_argument("--uuid", required=True, help="conversation_id (UUID parent).")
    p.add_argument(
        "--transcript",
        type=Path,
        default=None,
        help="Chemin .jsonl (sinon résolution via agent-transcripts).",
    )
    p.add_argument(
        "--workspace-root",
        type=str,
        default=None,
        help="Racine workspace pour résoudre le slug Cursor.",
    )
    p.add_argument(
        "--project-slug",
        type=str,
        default=None,
        help="Slug explicite sous .cursor/projects/.",
    )
    p.add_argument(
        "--max-lines",
        type=int,
        default=120,
        help="Nombre max de lignes JSONL à parcourir (0 = illimité).",
    )
    p.add_argument(
        "--max-chars",
        type=int,
        default=8000,
        help="Budget caractères total exporté.",
    )
    p.add_argument("-o", "--output", type=Path, default=None, help="Fichier MD (sinon stdout).")
    return p.parse_args()


def _extract_message_text(obj: dict) -> str:
    role = obj.get("role") or "?"
    parts = obj.get("message", {}).get("content", [])
    if not isinstance(parts, list):
        return ""
    chunks: list[str] = []
    for block in parts:
        if not isinstance(block, dict):
            continue
        btype = block.get("type")
        if btype == "text":
            t = block.get("text") or ""
            if t:
                chunks.append(t)
        elif btype == "tool_use":
            name = block.get("name") or "tool"
            chunks.append(f"[tool: {name}]")
    blob = "\n".join(chunks).strip()
    m = _USER_QUERY_RE.search(blob)
    if m:
        blob = m.group(1).strip()
    return blob


def _sanitize_body(text: str) -> str:
    if not text:
        return ""
    t = _THINKING_TAG_RE.sub("", text)
    t = _REDACTED_BLOCK_RE.sub("[…]", t)
    if text.count("[REDACTED]") > 3 and len(text) > 400:
        return "[contenu largement REDACTED — voir transcript local]"
    t = re.sub(r"\n{3,}", "\n\n", t).strip()
    return t


def export_md(jsonl: Path, max_lines: int, max_chars: int) -> str:
    lines_out: list[str] = [f"# Transcript {jsonl.parent.name}", ""]
    used = 0
    n = 0
    with jsonl.open("r", encoding="utf-8", errors="replace") as f:
        for raw in f:
            n += 1
            if max_lines and n > max_lines:
                lines_out.append(f"\n---\n*Tronqué après {max_lines} lignes JSONL.*")
                break
            raw = raw.strip()
            if not raw:
                continue
            try:
                obj = json.loads(raw)
            except json.JSONDecodeError:
                continue
            role = obj.get("role") or "?"
            body = _sanitize_body(_extract_message_text(obj))
            if not body:
                continue
            if used + len(body) > max_chars:
                lines_out.append("\n---\n*Budget caractères atteint.*")
                break
            lines_out.append(f"## {role} (L{n})")
            lines_out.append("")
            lines_out.append(body)
            lines_out.append("")
            used += len(body)
    return "\n".join(lines_out).rstrip() + "\n"


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    args = _parse_args()
    root = repo_root_from()
    wr = args.workspace_root
    if not wr:
        wr = str(root)

    path = args.transcript
    if path is None:
        resolved = transcript_jsonl_path(
            args.uuid,
            workspace_root=wr,
            project_slug=args.project_slug,
        )
        if resolved is None:
            base = agent_transcripts_dir(wr, args.project_slug)
            print(
                f"Erreur: transcript introuvable pour {args.uuid}\n"
                f"  cherché sous: {base}",
                file=sys.stderr,
            )
            sys.exit(1)
        path = resolved
    else:
        path = path.expanduser().resolve()

    md = export_md(path, args.max_lines, args.max_chars)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(md, encoding="utf-8")
        print(f"écrit: {args.output}", file=sys.stderr)
    else:
        sys.stdout.write(md)


if __name__ == "__main__":
    main()
