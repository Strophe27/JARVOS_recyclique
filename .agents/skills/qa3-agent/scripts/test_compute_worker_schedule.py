"""Unit tests for compute_worker_schedule.py (R11)."""

from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

import compute_worker_schedule as cws

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "schedule"


class ComputeWorkerScheduleTests(unittest.TestCase):
    def test_three_disjoint_shards_one_parallel_batch(self) -> None:
        passes = cws.load_passes(str(FIXTURES / "three_disjoint_shards.yaml"))
        result = cws.compute_schedule(passes)
        self.assertTrue(result["ok"])
        self.assertEqual(len(result["batches"]), 1)
        self.assertEqual(len(result["batches"][0]), 3)
        self.assertTrue(result["parallel_in_batch"][0])

    def test_overlapping_shards_serialize_to_two_batches(self) -> None:
        passes = cws.load_passes(str(FIXTURES / "overlapping_shards.yaml"))
        result = cws.compute_schedule(passes)
        self.assertTrue(result["ok"])
        self.assertEqual(len(result["batches"]), 2)
        self.assertFalse(result["parallel_in_batch"][0])
        self.assertFalse(result["parallel_in_batch"][1])

    def test_mix_shard_then_cross_cutting_serial(self) -> None:
        passes = cws.load_passes(str(FIXTURES / "mix_shard_cross_cutting.yaml"))
        result = cws.compute_schedule(passes)
        self.assertTrue(result["ok"])
        self.assertEqual(result["shard_count"], 2)
        self.assertEqual(result["cross_cutting_count"], 2)
        # batch0: 2 shards parallel, then contradiction, then traceability
        self.assertEqual(len(result["batches"]), 3)
        self.assertTrue(result["parallel_in_batch"][0])
        self.assertFalse(result["parallel_in_batch"][1])
        self.assertFalse(result["parallel_in_batch"][2])
        self.assertEqual(result["batches"][1], ["pass-contradiction"])
        self.assertEqual(result["batches"][2], ["pass-traceability"])

    def test_technique_pass_infers_cross_cutting(self) -> None:
        passes = [
            {
                "id": "pass-fmea",
                "kind": "system",
                "technique_pass": "fmea",
                "scope_paths": ["D:/proj/a.py", "D:/proj/b.py"],
            }
        ]
        self.assertEqual(cws.infer_execution_tier(passes[0]), "cross_cutting")

    def test_directory_contains_file_overlap(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            child = root / "sub" / "file.py"
            child.parent.mkdir(parents=True)
            child.write_text("x", encoding="utf-8")
            a = cws.normalize_scope_path(str(root))
            b = cws.normalize_scope_path(str(child))
            self.assertTrue(cws.paths_overlap(a, b))

    def test_cli_exit_ok(self) -> None:
        with mock.patch.object(
            sys,
            "argv",
            [
                "compute_worker_schedule.py",
                "--passes",
                str(FIXTURES / "three_disjoint_shards.yaml"),
            ],
        ):
            code = cws.main()
        self.assertEqual(code, cws.EXIT_OK)

    def test_allow_overlap_requires_env(self) -> None:
        with mock.patch.object(
            sys,
            "argv",
            [
                "compute_worker_schedule.py",
                "--passes",
                str(FIXTURES / "overlapping_shards.yaml"),
                "--allow-overlap",
            ],
        ):
            env = os.environ.copy()
            env.pop("QA3_SCHEDULE_ALLOW_OVERLAP", None)
            with mock.patch.dict(os.environ, env, clear=True):
                code = cws.main()
        self.assertEqual(code, cws.EXIT_SCHEDULE_BLOCKED)

    def test_shard_cap_exceeded(self) -> None:
        passes = [
            {
                "id": f"p{i}",
                "kind": "code",
                "execution_tier": "shard",
                "scope_paths": [f"D:/proj/f{i}.py"],
            }
            for i in range(5)
        ]
        result = cws.compute_schedule(passes, max_shard_passes=4)
        self.assertFalse(result["ok"])
        self.assertEqual(result["error"], "shard_cap_exceeded")


if __name__ == "__main__":
    unittest.main()
