#!/usr/bin/env python3
"""
Index compact des transcripts Cursor (agent-transcripts/*.jsonl).
Sortie JSON sur stdout : peu de tokens si reprise par l'agent.
stdlib uniquement.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Index JSONL agent-transcripts (parents uniquement).")
    p.add_argument(
        "--cursor-project-dir",
        type=Path,
        help="Dossier projet Cursor, ex. ~/.cursor/projects/<slug-du-workspace>",
    )
    p.add_argument(
        "--agent-transcripts",
        type=Path,
        help="Chemin direct vers agent-transcripts (prioritaire sur --cursor-project-dir).",
    )
    p.add_argument("--limit", type=int, default=0, help="Max nombre de conversations (0 = illimité).")
    p.add_argument(
        "--snippet-chars",
        type=int,
        default=160,
        help="Longueur max du premier extrait utilisateur.",
    )
    p.add_argument(
        "--max-tool-names",
        type=int,
        default=24,
        help="Max noms d'outils distincts listés par conversation.",
    )
    p.add_argument(
        "--verbose",
        action="store_true",
        help="Sur stderr : lignes JSONL non parseables (JSONDecodeError).",
    )
    return p.parse_args()


def _resolve_transcripts_dir(args: argparse.Namespace) -> Path:
    if args.agent_transcripts:
        return args.agent_transcripts.expanduser().resolve()
    if args.cursor_project_dir:
        base = args.cursor_project_dir.expanduser().resolve()
        return (base / "agent-transcripts").resolve()
    print(
        "Erreur: fournir --agent-transcripts ou --cursor-project-dir.",
        file=sys.stderr,
    )
    sys.exit(2)


_USER_QUERY_RE = re.compile(r"<user_query>\s*(.*?)\s*</user_query>", re.DOTALL | re.IGNORECASE)


def _extract_user_snippet(obj: dict, max_chars: int) -> str:
    # Schéma message hétérogène : on ignore toute forme inattendue sans bruit.
    try:
        parts = obj.get("message", {}).get("content", [])
        texts: list[str] = []
        for block in parts:
            if isinstance(block, dict) and block.get("type") == "text":
                t = block.get("text") or ""
                if t:
                    texts.append(t)
        blob = "\n".join(texts).strip()
        m = _USER_QUERY_RE.search(blob)
        if m:
            blob = m.group(1).strip()
        blob = " ".join(blob.split())
        if len(blob) > max_chars:
            return blob[: max_chars - 1] + "…"
        return blob
    except Exception:
        return ""


def _collect_tool_names(obj: dict, limit: int) -> list[str]:
    names: list[str] = []
    seen: set[str] = set()
    try:
        parts = obj.get("message", {}).get("content", [])
        for block in parts:
            if not isinstance(block, dict):
                continue
            if block.get("type") != "tool_use":
                continue
            n = block.get("name")
            if isinstance(n, str) and n and n not in seen:
                seen.add(n)
                names.append(n)
                if len(names) >= limit:
                    break
    except Exception:
        pass
    return names


def _iso_mtime(path: Path) -> str:
    try:
        ts = path.stat().st_mtime
        return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
    except OSError:
        return ""


def index_one_transcript(
    jsonl_path: Path,
    snippet_chars: int,
    max_tool_names: int,
    *,
    mtime_utc: str | None = None,
    verbose: bool = False,
) -> dict:
    first_user_snippet = ""
    tool_names: list[str] = []
    line_count = 0
    with jsonl_path.open("r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line_count += 1
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError as err:
                if verbose:
                    preview = line[:120] + ("…" if len(line) > 120 else "")
                    print(
                        f"{jsonl_path}:{line_count}: JSONDecodeError: {err!s} | {preview!r}",
                        file=sys.stderr,
                    )
                continue
            role = obj.get("role")
            if role == "user" and not first_user_snippet:
                first_user_snippet = _extract_user_snippet(obj, snippet_chars)
            if role == "assistant" and len(tool_names) < max_tool_names:
                for n in _collect_tool_names(obj, 256):
                    if n not in tool_names:
                        tool_names.append(n)
                    if len(tool_names) >= max_tool_names:
                        break
    mt = mtime_utc if mtime_utc is not None else _iso_mtime(jsonl_path)
    return {
        "line_count": line_count,
        "mtime_utc": mt,
        "first_user_snippet": first_user_snippet,
        "tool_names_head": tool_names,
    }


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    args = _parse_args()
    root = _resolve_transcripts_dir(args)
    if not root.is_dir():
        print(f"Erreur: dossier introuvable: {root}", file=sys.stderr)
        sys.exit(1)

    candidates: list[tuple[Path, str, bool]] = []
    for child in root.iterdir():
        if not child.is_dir():
            continue
        uuid = child.name
        jsonl = child / f"{uuid}.jsonl"
        if not jsonl.is_file():
            continue
        mkey = _iso_mtime(jsonl)
        has_subagents = (child / "subagents").is_dir()
        candidates.append((jsonl, mkey, has_subagents))

    candidates.sort(key=lambda t: t[1], reverse=True)
    if args.limit:
        candidates = candidates[: args.limit]

    rows: list[dict] = []
    for jsonl, mkey, has_subagents in candidates:
        uuid = jsonl.parent.name
        meta = index_one_transcript(
            jsonl,
            args.snippet_chars,
            args.max_tool_names,
            mtime_utc=mkey,
            verbose=args.verbose,
        )
        rows.append(
            {
                "uuid": uuid,
                "jsonl": str(jsonl),
                "has_subagents": has_subagents,
                **meta,
            }
        )

    out = {
        "agent_transcripts_dir": str(root),
        "parent_conversation_count": len(rows),
        "conversations": rows,
    }
    json.dump(out, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
