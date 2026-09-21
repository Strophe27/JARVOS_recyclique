#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""Resolve canonical QA3 skill_root and telemetry paths (install-first)."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

SKILL_NAME = "qa3-agent"
ENV_EVENTS = "QA3_TELEMETRY_EVENTS"
ENV_SKILL_ROOT = "QA3_SKILL_ROOT"
ENV_SKILLS_DIR = "CURSOR_SKILLS_DIR"


def _user_skills_dir() -> Path:
    if os.environ.get(ENV_SKILLS_DIR):
        return Path(os.environ[ENV_SKILLS_DIR]).expanduser()
    return Path.home() / ".cursor" / "skills"


def resolve_skill_root() -> Path:
    """Skill root: env, else this clone (Numastria Git), else ~/.cursor/skills/qa3-agent."""
    if os.environ.get(ENV_SKILL_ROOT):
        return Path(os.environ[ENV_SKILL_ROOT]).expanduser().resolve()
    script_skill = Path(__file__).resolve().parent.parent
    if (script_skill / "SKILL.md").is_file() and script_skill.name == SKILL_NAME:
        return script_skill
    return (_user_skills_dir() / SKILL_NAME).resolve()


def resolve_events_path(explicit: str | Path | None = None) -> Path:
    """
    Canonical events.jsonl path.

    Priority: explicit arg > QA3_TELEMETRY_EVENTS > {skill_root}/telemetry/events.jsonl
    """
    if explicit:
        text = str(explicit).strip()
        if "{skill_root}" in text:
            root = resolve_skill_root()
            text = text.replace("{skill_root}", str(root))
        return Path(text).expanduser().resolve()
    if os.environ.get(ENV_EVENTS):
        return Path(os.environ[ENV_EVENTS]).expanduser().resolve()
    return (resolve_skill_root() / "telemetry" / "events.jsonl").resolve()


def resolve_telemetry_dir() -> Path:
    return resolve_events_path().parent


def discover_consolidation_sources() -> list[Path]:
    """Install journal + optional repo dev journal (if distinct)."""
    sources: list[Path] = []
    install_events = resolve_events_path()
    if install_events.exists():
        sources.append(install_events)
    script_root = Path(__file__).resolve().parent.parent
    repo_events = script_root / "telemetry" / "events.jsonl"
    repo_events = repo_events.resolve()
    if repo_events.exists() and repo_events not in sources:
        sources.append(repo_events)
    archives_dir = _user_skills_dir() / ".archives"
    if archives_dir.is_dir():
        for backup in sorted(archives_dir.glob("**/telemetry/events.jsonl")):
            backup = backup.resolve()
            if backup.exists() and backup not in sources:
                sources.append(backup)
    return sources


def paths_payload() -> dict:
    root = resolve_skill_root()
    events = resolve_events_path()
    telemetry = events.parent
    return {
        "skill_root": str(root),
        "events_path": str(events),
        "telemetry_dir": str(telemetry),
        "runs_summary_csv": str(telemetry / "runs_summary.csv"),
        "append_failures_jsonl": str(telemetry / "append_failures.jsonl"),
        "user_skills_dir": str(_user_skills_dir()),
    }


def main() -> int:
    print(json.dumps(paths_payload(), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
