#!/usr/bin/env python3
"""Déduplique sessions_manifest.jsonl par conversation_id (garde la dernière ligne)."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from index_lib import manifest_path, read_jsonl, repo_root_from


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Consolide sessions_manifest.jsonl (last wins).")
    p.add_argument(
        "--repo-root",
        type=Path,
        default=None,
        help="Racine dépôt (défaut : auto depuis cwd).",
    )
    p.add_argument(
        "--manifest",
        type=Path,
        default=None,
        help="Chemin manifest (défaut : log/cursor-agent/sessions_manifest.jsonl).",
    )
    p.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Fichier de sortie (défaut : écrase le manifest d'entrée).",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Affiche stats sans écrire.",
    )
    return p.parse_args()


def consolidate(rows: list[dict]) -> tuple[list[dict], int]:
    """
    Garde la dernière occurrence par conversation_id (ordre fichier).
    Lignes sans conversation_id sont conservées en fin, non dédupliquées entre elles.
    """
    by_id: dict[str, dict] = {}
    order: list[str] = []
    no_id: list[dict] = []
    dupes = 0

    for row in rows:
        cid = row.get("conversation_id")
        if not cid:
            no_id.append(row)
            continue
        key = str(cid)
        if key in by_id:
            dupes += 1
        else:
            order.append(key)
        by_id[key] = row

    merged = [by_id[k] for k in order] + no_id
    return merged, dupes


def main() -> None:
    args = _parse_args()
    root = (args.repo_root or repo_root_from()).resolve()
    src = (args.manifest or manifest_path(root)).resolve()
    dst = (args.output or src).resolve()

    rows = read_jsonl(src)
    merged, dupes = consolidate(rows)

    print(
        f"manifest: {src}\n"
        f"  lignes lues: {len(rows)}\n"
        f"  doublons conversation_id: {dupes}\n"
        f"  lignes après consolidation: {len(merged)}",
        file=sys.stderr,
    )

    if args.dry_run:
        return

    dst.parent.mkdir(parents=True, exist_ok=True)
    with dst.open("w", encoding="utf-8") as f:
        for row in merged:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(f"écrit: {dst}", file=sys.stderr)


if __name__ == "__main__":
    main()
