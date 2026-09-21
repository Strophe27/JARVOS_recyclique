#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""Convert runs_summary.csv from comma to semicolon (Excel FR). Idempotent."""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

from append_event import CSV_COLUMNS, CSV_DELIMITER, CSV_ENCODING

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_NOT_FOUND = 0  # nothing to do


def detect_delimiter(header_line: str) -> str:
    if ";" in header_line and header_line.count(";") >= len(CSV_COLUMNS) - 1:
        return ";"
    return ","


def needs_migration(path: Path) -> bool:
    if not path.is_file() or path.stat().st_size == 0:
        return False
    raw = path.read_bytes()
    if raw.startswith(b"\xef\xbb\xbf"):
        text = raw[3:].decode("utf-8")
    else:
        text = raw.decode("utf-8-sig")
    first = text.splitlines()[0] if text.strip() else ""
    return detect_delimiter(first) == ","


def read_rows(path: Path) -> list[dict[str, str]]:
    raw = path.read_bytes()
    if raw.startswith(b"\xef\xbb\xbf"):
        text = raw[3:].decode("utf-8")
    else:
        text = raw.decode("utf-8-sig")
    lines = text.splitlines()
    if not lines:
        return []
    delim = detect_delimiter(lines[0])
    import io

    buf = io.StringIO("\n".join(lines))
    reader = csv.DictReader(buf, delimiter=delim)
    rows: list[dict[str, str]] = []
    for row in reader:
        rows.append({col: (row.get(col) or "") for col in CSV_COLUMNS})
    return rows


def write_rows(path: Path, rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding=CSV_ENCODING, newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS, delimiter=CSV_DELIMITER)
        writer.writeheader()
        writer.writerows(rows)


def migrate_file(path: Path, dry_run: bool = False) -> dict:
    if not path.is_file():
        return {"path": str(path), "status": "missing", "rows": 0}
    if not needs_migration(path):
        return {"path": str(path), "status": "already_semicolon", "rows": 0}
    rows = read_rows(path)
    if dry_run:
        return {"path": str(path), "status": "would_migrate", "rows": len(rows)}
    write_rows(path, rows)
    return {"path": str(path), "status": "migrated", "rows": len(rows)}


def default_paths() -> list[Path]:
    here = Path(__file__).resolve().parent
    paths = [here.parent / "telemetry" / "runs_summary.csv"]
    home = Path.home()
    skills = Path(
        __import__("os").environ.get("CURSOR_SKILLS_DIR", home / ".cursor" / "skills")
    )
    paths.append(skills / "qa3-agent" / "telemetry" / "runs_summary.csv")
    return paths


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate runs_summary.csv to ; delimiter")
    parser.add_argument(
        "paths",
        nargs="*",
        help="CSV paths (default: repo telemetry + ~/.cursor/skills/...)",
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--json", action="store_true", help="JSON stdout")
    args = parser.parse_args()

    targets = [Path(p) for p in args.paths] if args.paths else default_paths()
    results = [migrate_file(p, dry_run=args.dry_run) for p in targets]

    if args.json:
        print(json.dumps({"ok": True, "results": results}, ensure_ascii=False))
    else:
        for r in results:
            status = r["status"]
            if status == "missing":
                print(f"skip  {r['path']} (absent)")
            elif status == "already_semicolon":
                print(f"ok    {r['path']} (deja au format ;)")
            elif status == "would_migrate":
                print(f"plan  {r['path']} ({r['rows']} ligne(s) a convertir)")
            else:
                print(f"done  {r['path']} ({r['rows']} ligne(s) converties)")

    return EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
