"""
Hook beforeSubmitPrompt : prompts.jsonl (user_excerpt_sha256+len par défaut, git_excerpt, métadonnées).
Opt-in audit : JARVOS_LOG_FULL_PROMPT=1 → user_excerpt en clair (tronqué).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

_hooks_dir = Path(__file__).resolve().parent
if str(_hooks_dir) not in sys.path:
    sys.path.insert(0, str(_hooks_dir))

from hook_common import (
    append_jsonl,
    extract_git_excerpt,
    extract_user_query,
    first_workspace_root,
    now_local_iso,
    read_stdin_json,
    redact_user_excerpt,
    resolve_log_dir,
)

PROMPTS_NAME = "prompts.jsonl"
USER_EXCERPT_MAX = 800


def main() -> int:
    payload, _raw_text, stdin_err = read_stdin_json()
    if stdin_err and stdin_err != "stdin_vide":
        print(f"log_before_submit_prompt: stdin: {stdin_err}", file=sys.stderr)

    workspace_roots = payload.get("workspace_roots")
    log_dir = resolve_log_dir(workspace_roots)
    workspace_root = first_workspace_root(workspace_roots)
    prompt = payload.get("prompt")
    user_query = extract_user_query(prompt if isinstance(prompt, str) else None)

    record = {
        "logged_at_local": now_local_iso(),
        "hook_event_name": payload.get("hook_event_name"),
        "conversation_id": payload.get("conversation_id"),
        "generation_id": payload.get("generation_id"),
        "model": payload.get("model"),
        "workspace_root": workspace_root,
        **redact_user_excerpt(user_query, max_len=USER_EXCERPT_MAX),
        "git_excerpt": extract_git_excerpt(prompt if isinstance(prompt, str) else None),
    }

    try:
        append_jsonl(log_dir / PROMPTS_NAME, record)
    except OSError as e:
        print(f"log_before_submit_prompt: écriture impossible: {e}", file=sys.stderr)

    print(json.dumps({"continue": True}), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
