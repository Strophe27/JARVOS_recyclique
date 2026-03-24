"""Lecture stdin + déduction du hook si Cursor n'envoie pas hook_event_name."""
from __future__ import annotations

import json
import sys
from typing import Any


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
