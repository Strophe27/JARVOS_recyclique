"""
Hook afterAgentResponse : diagnostic + responses.jsonl (texte redacted) + sessions_manifest.jsonl.
Remplace log_after_agent_response.py dans hooks.json (legacy conservé).
"""
from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

_hooks_dir = Path(__file__).resolve().parent
if str(_hooks_dir) not in sys.path:
    sys.path.insert(0, str(_hooks_dir))

from hook_common import (
    append_jsonl,
    first_workspace_root,
    infer_hook_event_name,
    now_local_iso,
    project_slug_from_root,
    read_stdin_json,
    redact_assistant_text,
    resolve_log_dir,
)

DIAG_NAME = "diagnostic.log"
RESPONSES_NAME = "responses.jsonl"
MANIFEST_NAME = "sessions_manifest.jsonl"


def main() -> int:
    payload, _raw_text, stdin_err = read_stdin_json()
    if stdin_err and stdin_err != "stdin_vide":
        print(f"log_after_agent_orchestrator: stdin: {stdin_err}", file=sys.stderr)

    workspace_roots = payload.get("workspace_roots")
    log_dir = resolve_log_dir(workspace_roots)
    workspace_root = first_workspace_root(workspace_roots)
    project_slug = project_slug_from_root(workspace_root)

    hook = infer_hook_event_name(payload) or payload.get("hook_event_name") or "?"
    keys = ",".join(sorted(payload.keys())[:24])
    if len(payload.keys()) > 24:
        keys += ",..."
    diag_line = (
        f"{datetime.now().astimezone().isoformat(timespec='seconds')}\t"
        f"hook={hook}\tmodel={payload.get('model')}\t"
        f"conv={payload.get('conversation_id')}\tgen={payload.get('generation_id')}\t"
        f"stdin_err={stdin_err or 'ok'}\tkeys={keys}\n"
    )

    response_record = {
        "logged_at_local": now_local_iso(),
        "model": payload.get("model"),
        "hook_event_name": payload.get("hook_event_name"),
        "conversation_id": payload.get("conversation_id"),
        "generation_id": payload.get("generation_id"),
        "cursor_version": payload.get("cursor_version"),
        "workspace_roots": workspace_roots,
        "workspace_root": workspace_root,
        "project_slug": project_slug,
        "transcript_path": payload.get("transcript_path"),
        **redact_assistant_text(payload.get("text")),
    }

    manifest_record = {
        "schema_version": "0.1",
        "line_kind": "manifest",
        "recorded_at": now_local_iso(),
        "manifest_kind": "session_index",
        "source": "hook:afterAgentResponse",
        "conversation_id": payload.get("conversation_id"),
        "transcript_path": payload.get("transcript_path"),
        "workspace_root": workspace_root,
        "project_slug": project_slug,
        "model": payload.get("model"),
    }

    try:
        with (log_dir / DIAG_NAME).open("a", encoding="utf-8") as f:
            f.write(diag_line)
        append_jsonl(log_dir / RESPONSES_NAME, response_record)
        append_jsonl(log_dir / MANIFEST_NAME, manifest_record)
    except OSError as e:
        print(f"log_after_agent_orchestrator: écriture impossible: {e}", file=sys.stderr)

    print("{}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
