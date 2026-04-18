"""
Hook afterAgentResponse : diagnostic + ligne complète dans responses.jsonl (un seul process = stdin fiable).
"""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

_hooks_dir = Path(__file__).resolve().parent
if str(_hooks_dir) not in sys.path:
    sys.path.insert(0, str(_hooks_dir))

from hook_common import infer_hook_event_name, read_stdin_json

LOG_DIR = Path("log/cursor-agent")
DIAG_FILE = LOG_DIR / "diagnostic.log"
JSONL_FILE = LOG_DIR / "responses.jsonl"


def main() -> int:
    payload, _raw_text, stdin_err = read_stdin_json()
    if stdin_err and stdin_err != "stdin_vide":
        print(f"log_after_agent_response: stdin: {stdin_err}", file=sys.stderr)

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
    record = {
        "logged_at_local": datetime.now().astimezone().isoformat(timespec="milliseconds"),
        "model": payload.get("model"),
        "hook_event_name": payload.get("hook_event_name"),
        "conversation_id": payload.get("conversation_id"),
        "generation_id": payload.get("generation_id"),
        "cursor_version": payload.get("cursor_version"),
        "workspace_roots": payload.get("workspace_roots"),
        "user_email": payload.get("user_email"),
        "transcript_path": payload.get("transcript_path"),
        "text": payload.get("text"),
    }

    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        with DIAG_FILE.open("a", encoding="utf-8") as f:
            f.write(diag_line)
        with JSONL_FILE.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    except OSError as e:
        print(f"log_after_agent_response: écriture impossible: {e}", file=sys.stderr)

    print("{}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
