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

_hooks_dir = Path(__file__).resolve().parent
if str(_hooks_dir) not in sys.path:
    sys.path.insert(0, str(_hooks_dir))

from hook_common import infer_hook_event_name, read_stdin_json

LOG_DIR = Path("log/cursor-agent")
DIAG_FILE = LOG_DIR / "diagnostic.log"


def main() -> int:
    p, _raw_text, stdin_err = read_stdin_json()
    hook = infer_hook_event_name(p) or p.get("hook_event_name") or "?"
    keys = ",".join(sorted(p.keys())[:24])
    if len(p.keys()) > 24:
        keys += ",..."
    line = (
        f"{datetime.now().astimezone().isoformat(timespec='seconds')}\t"
        f"hook={hook}\tmodel={p.get('model')}\t"
        f"conv={p.get('conversation_id')}\tgen={p.get('generation_id')}\t"
        f"stdin_err={stdin_err or 'ok'}\tkeys={keys}\n"
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
