"""Helpers partagés — lecture JSONL hooks, résolution transcripts Cursor."""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Iterable, Iterator

# Chemins par défaut (relatifs à la racine dépôt)
DEFAULT_LOG_DIR = Path("log") / "cursor-agent"
MANIFEST_NAME = "sessions_manifest.jsonl"
PROMPTS_NAME = "prompts.jsonl"
RESPONSES_NAME = "responses.jsonl"


def repo_root_from(start: Path | None = None) -> Path:
    """Remonte jusqu'à trouver references/index.md ou jarvos-memoire-sessions/."""
    cur = (start or Path.cwd()).resolve()
    for p in [cur, *cur.parents]:
        if (p / "references" / "index.md").is_file():
            return p
        if (p / "jarvos-memoire-sessions" / "README.md").is_file() and (
            p / "references"
        ).is_dir():
            return p
    return cur


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    """Lit un fichier JSONL ; ignore lignes vides / JSON invalides."""
    if not path.is_file():
        return []
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return rows


def iter_jsonl(path: Path) -> Iterator[dict[str, Any]]:
    """Itère les objets JSONL sans tout charger en mémoire."""
    if not path.is_file():
        return
    with path.open("r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def log_dir(repo_root: Path | None = None) -> Path:
    root = repo_root or repo_root_from()
    return (root / DEFAULT_LOG_DIR).resolve()


def manifest_path(repo_root: Path | None = None) -> Path:
    return log_dir(repo_root) / MANIFEST_NAME


def prompts_path(repo_root: Path | None = None) -> Path:
    return log_dir(repo_root) / PROMPTS_NAME


def responses_path(repo_root: Path | None = None) -> Path:
    return log_dir(repo_root) / RESPONSES_NAME


def read_manifest(repo_root: Path | None = None) -> list[dict[str, Any]]:
    return read_jsonl(manifest_path(repo_root))


def read_prompts(repo_root: Path | None = None) -> list[dict[str, Any]]:
    return read_jsonl(prompts_path(repo_root))


def read_responses(repo_root: Path | None = None) -> list[dict[str, Any]]:
    return read_jsonl(responses_path(repo_root))


def workspace_slug(workspace_root: str | None) -> str:
    """
    Slug dossier Cursor sous %USERPROFILE%\\.cursor\\projects\\<slug>\\
    (aligné hook_common.project_slug_from_root).
    """
    if not workspace_root:
        return "unknown"
    normalized = workspace_root.replace("\\", "/").strip().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", normalized)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug or "unknown"


def cursor_projects_base() -> Path:
    return Path(os.environ.get("USERPROFILE", os.path.expanduser("~"))) / ".cursor" / "projects"


def cursor_project_dir(workspace_root: str | None, project_slug: str | None = None) -> Path:
    slug = project_slug or workspace_slug(workspace_root)
    return cursor_projects_base() / slug


def agent_transcripts_dir(
    workspace_root: str | None = None,
    project_slug: str | None = None,
) -> Path:
    return cursor_project_dir(workspace_root, project_slug) / "agent-transcripts"


def transcript_jsonl_path(
    conversation_id: str,
    *,
    workspace_root: str | None = None,
    project_slug: str | None = None,
    explicit_path: str | Path | None = None,
) -> Path | None:
    """
    Résout <uuid>/<uuid>.jsonl sous agent-transcripts.
    explicit_path (manifest / responses) prioritaire s'il existe sur disque.
    """
    if explicit_path:
        p = Path(str(explicit_path)).expanduser()
        if p.is_file():
            return p.resolve()
    base = agent_transcripts_dir(workspace_root, project_slug)
    candidate = base / conversation_id / f"{conversation_id}.jsonl"
    if candidate.is_file():
        return candidate.resolve()
    return None


def filter_by_conversation_id(
    rows: Iterable[dict[str, Any]], conversation_id: str
) -> list[dict[str, Any]]:
    cid = conversation_id.lower()
    out: list[dict[str, Any]] = []
    for row in rows:
        rc = str(row.get("conversation_id") or "").lower()
        if rc == cid:
            out.append(row)
    return out


def merge_text_blobs(*parts: str | None) -> str:
    return "\n".join(p for p in parts if p and p.strip())


def first_workspace_from_rows(rows: list[dict[str, Any]]) -> str | None:
    for row in rows:
        wr = row.get("workspace_root")
        if isinstance(wr, str) and wr.strip():
            return wr
        roots = row.get("workspace_roots")
        if isinstance(roots, list) and roots:
            r0 = roots[0]
            if isinstance(r0, str) and r0.strip():
                return r0
    return None


def slug_short(text: str, max_len: int = 40) -> str:
    """Slug fichier court (ascii, tirets)."""
    t = text.strip().lower()
    t = re.sub(r"[^a-z0-9]+", "-", t)
    t = re.sub(r"-+", "-", t).strip("-")
    if len(t) > max_len:
        t = t[: max_len - 1].rstrip("-")
    return t or "session"


def uuid_prefix(conversation_id: str, n: int = 8) -> str:
    return conversation_id.replace("-", "")[:n] if conversation_id else "unknown"
