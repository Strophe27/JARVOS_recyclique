#!/usr/bin/env python3
"""Tests légers pour index_transcripts.py (stdlib, sans pytest requis)."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


def _script_path() -> Path:
    return Path(__file__).resolve().parent / "index_transcripts.py"


def _run_index(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(_script_path()), *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )


class IndexTranscriptsTests(unittest.TestCase):
    def test_requires_dir_arg(self) -> None:
        r = _run_index()
        self.assertEqual(r.returncode, 2)
        self.assertIn("agent-transcripts", r.stderr)

    def test_indexes_one_parent_and_snippet(self) -> None:
        uid = "00000000-0000-4000-8000-000000000099"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            d = root / uid
            d.mkdir(parents=True)
            user_line = (
                '{"role":"user","message":{"content":['
                '{"type":"text","text":"<user_query>\\nAlpha unique\\n</user_query>"}]}}'
            )
            asst_line = (
                '{"role":"assistant","message":{"content":['
                '{"type":"tool_use","name":"Read","input":{}}]}}'
            )
            (d / f"{uid}.jsonl").write_text(user_line + "\n" + asst_line + "\n", encoding="utf-8")
            r = _run_index("--agent-transcripts", str(root))
            self.assertEqual(r.returncode, 0, msg=r.stderr)
            data = json.loads(r.stdout)
            self.assertEqual(data["parent_conversation_count"], 1)
            self.assertEqual(len(data["conversations"]), 1)
            c0 = data["conversations"][0]
            self.assertEqual(c0["uuid"], uid)
            self.assertIn("Alpha unique", c0["first_user_snippet"])
            self.assertIn("Read", c0["tool_names_head"])
            self.assertFalse(c0["has_subagents"])
            self.assertEqual(c0["line_count"], 2)

    def test_limit_orders_by_recent_mtime(self) -> None:
        u_old = "00000000-0000-4000-8000-000000000001"
        u_new = "00000000-0000-4000-8000-000000000002"
        line = '{"role":"user","message":{"content":[{"type":"text","text":"x"}]}}\n'
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for uid in (u_old, u_new):
                dd = root / uid
                dd.mkdir()
                p = dd / f"{uid}.jsonl"
                p.write_text(line, encoding="utf-8")
            p_old = root / u_old / f"{u_old}.jsonl"
            p_new = root / u_new / f"{u_new}.jsonl"
            os.utime(p_old, (1_000_000_000, 1_000_000_000))
            os.utime(p_new, (1_000_000_000, 2_000_000_000))
            r = _run_index("--agent-transcripts", str(root), "--limit", "1")
            self.assertEqual(r.returncode, 0, msg=r.stderr)
            data = json.loads(r.stdout)
            self.assertEqual(data["parent_conversation_count"], 1)
            self.assertEqual(data["conversations"][0]["uuid"], u_new)

    def test_verbose_reports_bad_json(self) -> None:
        uid = "00000000-0000-4000-8000-000000000088"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            d = root / uid
            d.mkdir()
            (d / f"{uid}.jsonl").write_text('{"not json"\n', encoding="utf-8")
            r = _run_index("--agent-transcripts", str(root), "--verbose")
            self.assertEqual(r.returncode, 0)
            self.assertIn("JSONDecodeError", r.stderr)


if __name__ == "__main__":
    unittest.main()
