"""Lecture stdin + utilitaires partagés pour les hooks Cursor JARVOS."""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

_USER_QUERY_RE = re.compile(r"<user_query>(.*?)</user_query>", re.DOTALL | re.IGNORECASE)
_GIT_STATUS_RE = re.compile(r"<git_status>(.*?)</git_status>", re.DOTALL | re.IGNORECASE)


def read_stdin_json() -> tuple[dict[str, Any], str, str | None]:
    """
    Retourne (payload, raw_text, erreur).
    erreur: None si OK, sinon message (stdin vide, JSON invalide).
    """
    raw_bytes = sys.stdin.buffer.read()
    if not raw_bytes:
        return {}, "", "stdin_vide"

    try:
        raw_text = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        raw_text = raw_bytes.decode("utf-8", errors="replace")

    stripped = raw_text.strip()
    if not stripped:
        return {}, raw_text, "stdin_apres_strip_vide"

    try:
        return json.loads(stripped), raw_text, None
    except json.JSONDecodeError as e:
        return {}, raw_text, f"json_invalid:{e}"


def infer_hook_event_name(p: dict[str, Any]) -> str | None:
    if p.get("hook_event_name"):
        return str(p["hook_event_name"])
    # Heuristiques si le client n'envoie pas le champ commun
    if "session_id" in p and "composer_mode" in p:
        return "sessionStart"
    if "prompt" in p and "attachments" in p:
        return "beforeSubmitPrompt"
    if "status" in p and "loop_count" in p:
        return "stop"
    if "text" in p and p.get("hook_event_name") is None and "tool_name" not in p:
        return "afterAgentResponse"
    return None


def now_local_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="milliseconds")


def resolve_log_dir(workspace_roots: list[str] | None) -> Path:
    """Répertoire log/cursor-agent sous workspace_roots[0], sinon cwd."""
    if workspace_roots:
        root = workspace_roots[0]
        if root:
            return Path(root) / "log" / "cursor-agent"
    return Path("log/cursor-agent")


def project_slug_from_root(workspace_root: str | None) -> str:
    if not workspace_root:
        return "unknown"
    normalized = workspace_root.replace("\\", "/").strip().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", normalized)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug or "unknown"


def redact_assistant_text(text: str | None) -> dict[str, Any]:
    """Par défaut hash+len ; texte complet si JARVOS_LOG_FULL_TEXT=1."""
    if text is None:
        return {"text": None, "text_len": 0}
    if os.environ.get("JARVOS_LOG_FULL_TEXT", "").strip() == "1":
        return {"text": text, "text_len": len(text)}
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return {"text_sha256": digest, "text_len": len(text)}


def redact_user_excerpt(user_query: str, *, max_len: int = 800) -> dict[str, Any]:
    """Par défaut hash+len ; excerpt clair si JARVOS_LOG_FULL_PROMPT=1."""
    excerpt = user_query[:max_len]
    if os.environ.get("JARVOS_LOG_FULL_PROMPT", "").strip() == "1":
        return {"user_excerpt": excerpt, "user_excerpt_len": len(excerpt)}
    if not excerpt:
        return {"user_excerpt_sha256": None, "user_excerpt_len": 0}
    digest = hashlib.sha256(excerpt.encode("utf-8")).hexdigest()
    return {"user_excerpt_sha256": digest, "user_excerpt_len": len(excerpt)}


def extract_user_query(prompt: str | None) -> str:
    if not prompt:
        return ""
    match = _USER_QUERY_RE.search(prompt)
    if match:
        return match.group(1).strip()
    return prompt.strip()


def extract_git_excerpt(prompt: str | None, max_lines: int = 5) -> str:
    if not prompt:
        return ""
    match = _GIT_STATUS_RE.search(prompt)
    block = match.group(1) if match else ""
    if not block.strip():
        return ""
    lines = block.strip().splitlines()
    return "\n".join(lines[:max_lines])


def append_jsonl(path: Path, record: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


def first_workspace_root(workspace_roots: list[str] | None) -> str | None:
    if workspace_roots and workspace_roots[0]:
        return workspace_roots[0]
    return None
