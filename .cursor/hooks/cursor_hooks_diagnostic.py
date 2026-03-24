"""
Append une ligne dans log/cursor-agent/diagnostic.log à chaque invocation de hook.
Sert à vérifier que Cursor exécute bien les hooks (Chat vs Agent, workspace trust, python).
Ne log pas le contenu des prompts/réponses (seulement nom du hook + modèle + ids).
"""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

LOG_DIR = Path("log/cursor-agent")
DIAG_FILE = LOG_DIR / "diagnostic.log"


def main() -> int:
    raw = sys.stdin.read()
    try:
        p = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        p = {}

    hook = p.get("hook_event_name", "?")
    line = (
        f"{datetime.now().astimezone().isoformat(timespec='seconds')}\t"
        f"hook={hook}\tmodel={p.get('model')}\t"
        f"conv={p.get('conversation_id')}\tgen={p.get('generation_id')}\n"
    )
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        with DIAG_FILE.open("a", encoding="utf-8") as f:
            f.write(line)
    except OSError as e:
        print(f"cursor_hooks_diagnostic: {e}", file=sys.stderr)

    if hook == "beforeSubmitPrompt":
        print(json.dumps({"continue": True}), flush=True)
    else:
        print("{}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
