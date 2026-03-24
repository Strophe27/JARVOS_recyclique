#!/usr/bin/env python3

"""Scan story-related directories and summarize their status."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple


DIRECTORIES: Dict[str, Path] = {
    "stories_root": Path("docs/stories"),
    "archive_v1_2": Path("docs/archive/v1.2-and-earlier"),
    "archive_future": Path("docs/archive/future-versions"),
    "pending_debt": Path("docs/pending-tech-debt"),
    "to_review": Path("docs/stories/to-review"),
    "backup": Path("docs/backup-pre-cleanup"),
}

PATTERNS: Dict[str, re.Pattern[str]] = {
    "completed": re.compile(
        r"(✅|terminé|completed|implémentation|validation|story terminée)",
        re.IGNORECASE,
    ),
    "active": re.compile(
        r"(en cours|draft|todo|à faire|remaining|next steps)", re.IGNORECASE
    ),
    "future": re.compile(
        r"(proposition|future|roadmap|v\d+\.\d+)", re.IGNORECASE
    ),
    "debt": re.compile(
        r"(tech[- ]?debt|dette technique|stabilisation|stabilization|fix)",
        re.IGNORECASE,
    ),
}


def analyze_file(path: Path, now: datetime) -> Dict[str, object]:
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        text = path.read_text(encoding="utf-8", errors="ignore")

    stat = path.stat()
    age_days = (now - datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)).days
    findings = {name: bool(pattern.search(text)) for name, pattern in PATTERNS.items()}
    findings["age_old"] = age_days > 30

    title = path.stem
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            title = re.sub(r"^#+\s*", "", stripped)
            break

    classification = "review"
    rationale: List[str] = []

    if findings["debt"]:
        classification = "debt"
        rationale.append("mentions debt/stabilization/fix")
    elif findings["future"]:
        classification = "future"
        rationale.append("future/roadmap keywords")
    elif findings["active"]:
        classification = "review"
        rationale.append("active/draft indicators")
    elif findings["completed"] or findings["age_old"]:
        classification = "completed"
        if findings["completed"]:
            rationale.append("completion indicators")
        if findings["age_old"]:
            rationale.append("older than 30 days")
    else:
        rationale.append("no clear signals")

    return {
        "path": str(path).replace("\\", "/"),
        "title": title.strip(),
        "size": stat.st_size,
        "age_days": age_days,
        "findings": findings,
        "classification": classification,
        "rationale": rationale,
    }


def main() -> None:
    print("Starting story audit scan...")
    now = datetime.now(timezone.utc)
    report: Dict[str, List[Dict[str, object]]] = {key: [] for key in DIRECTORIES}

    for bucket, directory in DIRECTORIES.items():
        if not directory.exists():
            continue
        for path in directory.rglob("*.md"):
            report[bucket].append(analyze_file(path, now))

    output = Path("docs/story-audit-report.json")
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    total = sum(len(items) for items in report.values())
    print(f"Report written to {output} ({total} files).")


if __name__ == "__main__":
    main()

