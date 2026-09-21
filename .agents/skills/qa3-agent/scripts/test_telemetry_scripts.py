"""Unit tests for QA3 telemetry scripts (append_event, qa_stats, telemetry_validate)."""

from __future__ import annotations

import csv
import json
import sys
import tempfile
import unittest
from io import StringIO
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

import append_event
import append_improvement_event
import analyze_cycles
import analyze_export_improvements
import analyze_pass_roi
import analyze_snapshot
import qa_stats
import telemetry_journal
import telemetry_validate
import validate_improvement_event

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "telemetry"


def _load_fixture(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def _minimal_complete_run(run_id: str, *, routing: str = "mono") -> list[dict]:
    """Build a minimal valid closed run sequence for tests."""
    ctx = _load_fixture("valid_run_context.json")
    ctx["run_id"] = run_id
    ctx["event_id"] = f"ctx_{run_id}"
    routing_ev = _load_fixture("valid_routing_decision.json")
    routing_ev["run_id"] = run_id
    routing_ev["event_id"] = f"routing_{run_id}"
    routing_ev["parent_event_id"] = ctx["event_id"]
    routing_ev["payload"]["routing"] = routing
    events: list[dict] = [ctx, routing_ev]
    if routing.startswith("planner"):
        planner = _load_fixture("valid_planner_complete.json")
        planner["run_id"] = run_id
        planner["event_id"] = f"planner_{run_id}"
        planner["parent_event_id"] = routing_ev["event_id"]
        events.append(planner)
        if planner["payload"].get("pass_count", 1) >= 2:
            schedule = _load_fixture("valid_schedule_complete.json")
            schedule["run_id"] = run_id
            schedule["event_id"] = f"schedule_{run_id}"
            schedule["parent_event_id"] = planner["event_id"]
            events.append(schedule)
    worker = _load_fixture("valid_worker_complete.json")
    worker["run_id"] = run_id
    worker["event_id"] = f"worker_{run_id}"
    worker["parent_event_id"] = events[-1]["event_id"]
    worker["payload"]["pass_added_value"] = "none"
    worker["payload"]["open_findings"] = {"P0": 0, "P1": 0, "Info": 0}
    worker["payload"]["findings_actionable"] = 0
    worker["payload"]["technique_pass"] = "none"
    events.append(worker)
    fusion = _load_fixture("valid_qa_fusion.json")
    fusion["run_id"] = run_id
    fusion["event_id"] = f"fusion_{run_id}"
    fusion["parent_event_id"] = worker["event_id"]
    events.append(fusion)
    finished = _load_fixture("valid_run_finished.json")
    finished["run_id"] = run_id
    finished["event_id"] = f"finished_{run_id}"
    finished["parent_event_id"] = fusion["event_id"]
    finished["payload"]["routing"] = routing
    finished["payload"]["orchestration_flags"] = []
    events.append(finished)
    return events


def _loop_cycle_event(
    run_id: str,
    *,
    loop_iteration: int,
    score_delta: int = 0,
    gate_passed: bool = False,
    hitl: bool = False,
) -> dict:
    ev = _load_fixture("valid_loop_cycle.json")
    ev["run_id"] = run_id
    ev["event_id"] = f"loop_{run_id}_{loop_iteration}"
    ev["payload"]["loop_iteration"] = loop_iteration
    ev["payload"]["score_delta"] = score_delta
    ev["payload"]["gate_passed"] = gate_passed
    ev["payload"]["hitl"] = hitl
    return ev


def _worker_event(
    run_id: str,
    *,
    pass_kind: str = "code",
    quality_score: int = 92,
    findings_actionable: int = 1,
    technique_pass: str | None = None,
    open_findings: dict | None = None,
) -> dict:
    ev = _load_fixture("valid_worker_complete.json")
    ev["run_id"] = run_id
    ev["event_id"] = f"worker_{run_id}_{pass_kind}"
    ev["payload"]["pass_kind"] = pass_kind
    ev["payload"]["quality_score"] = quality_score
    ev["payload"]["findings_actionable"] = findings_actionable
    if technique_pass is not None:
        ev["payload"]["technique_pass"] = technique_pass
    else:
        ev["payload"].pop("technique_pass", None)
    ev["payload"]["open_findings"] = open_findings or {
        "P0": 0,
        "P1": findings_actionable,
        "Info": 0,
    }
    return ev


def _write_jsonl(path: Path, events: list[dict]) -> None:
    path.write_text(
        "\n".join(json.dumps(e) for e in events) + "\n",
        encoding="utf-8",
    )


def _run_append(argv: list[str]) -> tuple[int, str, str]:
    with mock.patch.object(sys, "argv", ["append_event.py", *argv]):
        stdout = StringIO()
        stderr = StringIO()
        with mock.patch("sys.stdout", stdout), mock.patch("sys.stderr", stderr):
            code = append_event.main()
    return code, stdout.getvalue().strip(), stderr.getvalue().strip()


class TestTelemetryValidate(unittest.TestCase):
    def test_reject_invalid_run_context_L17(self) -> None:
        violations = telemetry_validate.validate_event(_load_fixture("invalid_run_context_L17.json"))
        paths = {v["path"] for v in violations}
        self.assertIn("run_id", paths)
        self.assertIn("payload.run_id", paths)
        self.assertIn("agent_role", paths)
        self.assertIn("payload.scope_summary", paths)
        self.assertIn("payload.kinds", paths)
        self.assertIn("payload.loop_enabled", paths)
        self.assertIn("payload.loop_iteration", paths)

    def test_reject_invalid_routing_L18(self) -> None:
        violations = telemetry_validate.validate_event(_load_fixture("invalid_routing_L18.json"))
        paths = {v["path"] for v in violations}
        self.assertIn("run_id", paths)
        self.assertIn("payload.run_id", paths)
        self.assertIn("agent_role", paths)
        self.assertIn("payload.kind", paths)
        self.assertIn("payload.planner_required", paths)
        self.assertIn("payload.routing", paths)
        self.assertIn("payload.kinds", paths)
        self.assertIn("payload.source_count", paths)

    def test_valid_fixtures_pass(self) -> None:
        for name in (
            "valid_run_context.json",
            "valid_routing_decision.json",
            "valid_planner_complete.json",
            "valid_worker_complete.json",
            "valid_qa_fusion.json",
            "valid_loop_cycle.json",
            "valid_run_finished.json",
        ):
            with self.subTest(fixture=name):
                event = _load_fixture(name)
                self.assertEqual(telemetry_validate.validate_event(event), [])

    def test_loop_cycle_findings_count(self) -> None:
        event = _load_fixture("valid_loop_cycle.json")
        self.assertEqual(telemetry_validate.validate_event(event), [])
        self.assertEqual(event["payload"]["findings_count"], 2)
        bad = dict(event)
        bad["payload"] = {**event["payload"], "findings_count": "two"}
        violations = telemetry_validate.validate_event(bad)
        paths = {v["path"] for v in violations}
        self.assertIn("payload.findings_count", paths)

    def test_test_prefix_requires_allow_test(self) -> None:
        event = _load_fixture("valid_worker_complete.json")
        event["run_id"] = "test_unit_run"
        violations = telemetry_validate.validate_event(event, allow_test=False)
        self.assertTrue(any(v["path"] == "run_id" for v in violations))
        self.assertEqual(telemetry_validate.validate_event(event, allow_test=True), [])

    def test_reject_worker_without_planner_complete(self) -> None:
        run_id = "test_planner_gate"
        ctx, routing = _minimal_complete_run(run_id, routing="planner")[:2]
        worker = _load_fixture("valid_worker_complete.json")
        worker["run_id"] = run_id
        run_events = [ctx, routing]
        violations = telemetry_validate.validate_event(worker, allow_test=True, run_events=run_events)
        codes = {v["code"] for v in violations}
        self.assertIn("planner_complete_required", codes)

    def test_reject_worker_without_schedule_when_multi_pass(self) -> None:
        run_id = "test_schedule_gate"
        ctx, routing = _minimal_complete_run(run_id, routing="planner")[:2]
        planner = _load_fixture("valid_planner_complete.json")
        planner["run_id"] = run_id
        planner["event_id"] = f"planner_{run_id}"
        planner["parent_event_id"] = routing["event_id"]
        planner["payload"]["pass_count"] = 2
        planner["payload"]["passes"] = [
            {"id": "pass-a", "kind": "code"},
            {"id": "pass-b", "kind": "document"},
        ]
        worker = _load_fixture("valid_worker_complete.json")
        worker["run_id"] = run_id
        run_events = [ctx, routing, planner]
        violations = telemetry_validate.validate_event(worker, allow_test=True, run_events=run_events)
        codes = {v["code"] for v in violations}
        self.assertIn("schedule_complete_required", codes)

    def test_valid_schedule_complete_event(self) -> None:
        event = _load_fixture("valid_schedule_complete.json")
        violations = telemetry_validate.validate_event(event, allow_test=True)
        self.assertEqual(violations, [])

    def test_reject_schedule_without_planner_complete(self) -> None:
        run_id = "test_schedule_planner_gate"
        ctx, routing = _minimal_complete_run(run_id, routing="planner")[:2]
        schedule = _load_fixture("valid_schedule_complete.json")
        schedule["run_id"] = run_id
        schedule["event_id"] = f"schedule_{run_id}"
        schedule["parent_event_id"] = routing["event_id"]
        violations = telemetry_validate.validate_event(
            schedule, allow_test=True, run_events=[ctx, routing]
        )
        codes = {v["code"] for v in violations}
        self.assertIn("planner_complete_required", codes)

    def test_verify_run_closure_multi_pass_with_schedule(self) -> None:
        import verify_run_closure

        run_id = "test_verify_schedule_run"
        events = _minimal_complete_run(run_id, routing="planner_multi_pass")
        planner = next(e for e in events if e["event_type"] == "planner_complete")
        planner["payload"]["pass_count"] = 2
        planner["payload"]["passes"] = [
            {"id": "pass-a", "kind": "code"},
            {"id": "pass-b", "kind": "document"},
        ]
        schedule = _load_fixture("valid_schedule_complete.json")
        schedule["run_id"] = run_id
        schedule["event_id"] = f"schedule_{run_id}"
        schedule["parent_event_id"] = planner["event_id"]
        worker_idx = next(i for i, e in enumerate(events) if e["event_type"] == "worker_complete")
        events.insert(worker_idx, schedule)
        for i, ev in enumerate(events):
            if i > 0 and ev.get("parent_event_id"):
                ev["parent_event_id"] = events[i - 1]["event_id"]
        events[worker_idx + 1]["parent_event_id"] = schedule["event_id"]

        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            with events_path.open("w", encoding="utf-8") as fh:
                for ev in events:
                    fh.write(json.dumps(ev, ensure_ascii=False) + "\n")
            result = verify_run_closure.verify_run(events_path, run_id)
        self.assertTrue(result["ok"], result)

    def test_parent_event_id_invalid_without_parent_in_run(self) -> None:
        ctx = _load_fixture("valid_run_context.json")
        ctx["run_id"] = "test_parent_chain"
        routing = _load_fixture("valid_routing_decision.json")
        routing["run_id"] = "test_parent_chain"
        routing["parent_event_id"] = ctx["event_id"]
        violations = telemetry_validate.validate_event(routing, allow_test=True, run_events=[ctx])
        self.assertEqual(violations, [])
        violations_bad = telemetry_validate.validate_event(
            routing, allow_test=True, run_events=[]
        )
        codes = {v["code"] for v in violations_bad}
        self.assertIn("parent_event_id_invalid", codes)

    def test_routing_requires_loop_iteration_when_loop_enabled(self) -> None:
        ctx = _load_fixture("valid_run_context.json")
        ctx["run_id"] = "test_loop_run"
        ctx["payload"]["loop_enabled"] = True
        routing = _load_fixture("valid_routing_decision.json")
        routing["run_id"] = "test_loop_run"
        routing["parent_event_id"] = ctx["event_id"]
        violations = telemetry_validate.validate_event(
            routing, allow_test=True, run_events=[ctx]
        )
        paths = {v["path"] for v in violations}
        self.assertIn("payload.loop_iteration", paths)
        routing["payload"]["loop_iteration"] = 1
        self.assertEqual(
            telemetry_validate.validate_event(
                routing, allow_test=True, run_events=[ctx]
            ),
            [],
        )

    def test_reject_technique_pass_unknown(self) -> None:
        worker = _load_fixture("valid_worker_complete.json")
        worker["run_id"] = "test_tp_unknown"
        worker["payload"]["technique_pass"] = "unknown"
        violations = telemetry_validate.validate_event(worker, allow_test=True)
        codes = {v["code"] for v in violations}
        self.assertIn("technique_pass_forbidden", codes)

    def test_reject_planned_worker_without_technique_pass(self) -> None:
        run_id = "test_tp_required"
        ctx, routing, planner = _minimal_complete_run(run_id, routing="planner")[:3]
        worker = _load_fixture("valid_worker_complete.json")
        worker["run_id"] = run_id
        worker["payload"].pop("technique_pass", None)
        run_events = [ctx, routing, planner]
        violations = telemetry_validate.validate_event(
            worker, allow_test=True, run_events=run_events
        )
        codes = {v["code"] for v in violations}
        self.assertIn("technique_pass_required", codes)

    def test_loop_iterations_required_when_loop_enabled(self) -> None:
        finished = _load_fixture("valid_run_finished.json")
        finished["run_id"] = "test_loop_iter_req"
        finished["payload"]["loop_enabled"] = True
        finished["payload"].pop("loop_iterations", None)
        violations = telemetry_validate.validate_event(finished, allow_test=True)
        codes = {v["code"] for v in violations}
        self.assertIn("required", codes)
        paths = {v["path"] for v in violations}
        self.assertIn("payload.loop_iterations", paths)

    def test_loop_iterations_migration_from_loop_cycles(self) -> None:
        run_id = "test_loop_iter_migrate"
        events = _minimal_complete_run(run_id, routing="mono")
        ctx = events[0]
        ctx["payload"]["loop_enabled"] = True
        finished = events[-1]
        finished["payload"]["loop_enabled"] = True
        finished["payload"].pop("loop_iterations", None)
        loop = _loop_cycle_event(run_id, loop_iteration=1, score_delta=2)
        run_events = events[:-1] + [loop]
        violations = telemetry_validate.validate_event(
            finished, allow_test=True, run_events=run_events
        )
        iter_violations = [
            v for v in violations if v.get("path") == "payload.loop_iterations"
        ]
        self.assertEqual(iter_violations, [])


class TestAppendEvent(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.events_path = Path(self.tmp.name) / "events.jsonl"

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_append_valid_worker_ok(self) -> None:
        event = _load_fixture("valid_worker_complete.json")
        event["run_id"] = "test_unit_worker"
        event["parent_event_id"] = None
        code, out, _ = _run_append(
            [
                "--events",
                str(self.events_path),
                "--event",
                json.dumps(event),
                "--allow-test",
            ]
        )
        self.assertEqual(code, append_event.EXIT_OK)
        payload = json.loads(out)
        self.assertTrue(payload["ok"])
        lines = self.events_path.read_text(encoding="utf-8").strip().splitlines()
        self.assertEqual(len(lines), 1)
        stored = json.loads(lines[0])
        self.assertEqual(stored["run_id"], "test_unit_worker")
        self.assertIn("timestamp", stored)

    def test_reject_invalid_L17_logs_append_failures(self) -> None:
        fixture_path = FIXTURES / "invalid_run_context_L17.json"
        code, out, _ = _run_append(
            [
                "--events",
                str(self.events_path),
                "--event",
                str(fixture_path),
            ]
        )
        self.assertEqual(code, append_event.EXIT_FAIL)
        payload = json.loads(out)
        self.assertFalse(payload["ok"])
        self.assertEqual(payload["error"], "schema_violation")
        self.assertFalse(self.events_path.exists())
        failures_path = self.events_path.parent / "append_failures.jsonl"
        self.assertTrue(failures_path.is_file())
        failure = json.loads(failures_path.read_text(encoding="utf-8").strip())
        self.assertEqual(failure["event_type"], "run_context")
        self.assertTrue(failure["violations"])

    def test_reject_invalid_L18_logs_append_failures(self) -> None:
        fixture_path = FIXTURES / "invalid_routing_L18.json"
        code, out, _ = _run_append(
            [
                "--events",
                str(self.events_path),
                "--event",
                str(fixture_path),
            ]
        )
        self.assertEqual(code, append_event.EXIT_FAIL)
        payload = json.loads(out)
        self.assertEqual(payload["error"], "schema_violation")
        self.assertFalse(self.events_path.exists())

    def test_summary_injects_orchestration_flags(self) -> None:
        run_id = "test_flags_run"
        events = _minimal_complete_run(run_id, routing="planner")
        events[-1]["payload"]["orchestration_flags"] = []
        for event in events[:-1]:
            code, out, _ = _run_append(
                [
                    "--events",
                    str(self.events_path),
                    "--event",
                    json.dumps(event),
                    "--allow-test",
                ]
            )
            self.assertEqual(code, append_event.EXIT_OK, out)

        code, out, _ = _run_append(
            [
                "--events",
                str(self.events_path),
                "--event",
                json.dumps(events[-1]),
                "--summary",
                "--allow-test",
            ]
        )
        self.assertEqual(code, append_event.EXIT_OK, out)
        result = json.loads(out)
        csv_path = Path(result["summary_csv"])
        with csv_path.open(encoding=append_event.CSV_ENCODING, newline="") as f:
            rows = list(csv.DictReader(f, delimiter=append_event.CSV_DELIMITER))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["run_id"], run_id)
        self.assertIn("planner_overkill", rows[0]["orchestration_flags"])
        self.assertEqual(rows[0]["entry_trigger"], "qa3 simple")

    def test_append_failures_uses_file_lock(self) -> None:
        fixture_path = FIXTURES / "invalid_run_context_L17.json"
        with mock.patch.object(append_event, "FileLock") as lock_cls:
            lock_cls.return_value.__enter__ = mock.Mock(return_value=None)
            lock_cls.return_value.__exit__ = mock.Mock(return_value=False)
            _run_append(
                [
                    "--events",
                    str(self.events_path),
                    "--event",
                    str(fixture_path),
                ]
            )
            lock_cls.assert_called()
            lock_path = lock_cls.call_args[0][0]
            self.assertEqual(lock_path.name, "append_failures.jsonl")

    def test_summary_wrong_event_type_fails_before_append(self) -> None:
        event = _load_fixture("valid_worker_complete.json")
        event["run_id"] = "test_bad_summary"
        event["parent_event_id"] = None
        code, out, stderr = _run_append(
            [
                "--events",
                str(self.events_path),
                "--event",
                json.dumps(event),
                "--summary",
                "--allow-test",
            ]
        )
        self.assertEqual(code, append_event.EXIT_FAIL)
        payload = json.loads(out)
        self.assertFalse(payload["ok"])
        self.assertIn("run_finished", payload["error"])
        self.assertFalse(self.events_path.exists())
        self.assertIn("TELEMETRY_APPEND_FAILED", stderr)

    def test_summary_run_finished_writes_csv(self) -> None:
        run_id = "test_csv_unit"
        events = _minimal_complete_run(run_id, routing="mono")
        for event in events:
            argv = [
                "--events",
                str(self.events_path),
                "--event",
                json.dumps(event),
                "--allow-test",
            ]
            if event["event_type"] == "run_finished":
                argv.append("--summary")
            code, out, _ = _run_append(argv)
            self.assertEqual(code, append_event.EXIT_OK, out)
        payload = json.loads(out)
        self.assertTrue(payload["ok"])
        csv_path = Path(payload["summary_csv"])
        self.assertTrue(csv_path.is_file())
        with csv_path.open(encoding=append_event.CSV_ENCODING, newline="") as f:
            rows = list(csv.DictReader(f, delimiter=append_event.CSV_DELIMITER))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["run_id"], run_id)
        self.assertEqual(rows[0]["outcome"], "gate_passed")
        self.assertEqual(rows[0]["kinds"], "code")
        self.assertEqual(rows[0]["project"], "Skills")
        self.assertEqual(rows[0]["entry_trigger"], "qa3 simple")
        self.assertEqual(rows[0]["wrapper_skill"], "")

    def test_reject_loop_cycle_after_stagnation_r2(self) -> None:
        run_id = "test_stagnation_r2"
        events = _minimal_complete_run(run_id, routing="mono")[:-1]
        fusion_id = events[-1]["event_id"]
        loop_events = [
            _loop_cycle_event(run_id, loop_iteration=1, score_delta=0),
            _loop_cycle_event(run_id, loop_iteration=2, score_delta=0),
        ]
        for loop_ev in loop_events:
            loop_ev["parent_event_id"] = fusion_id
        events += loop_events
        for event in events:
            code, out, _ = _run_append(
                [
                    "--events",
                    str(self.events_path),
                    "--event",
                    json.dumps(event),
                    "--allow-test",
                ]
            )
            self.assertEqual(code, append_event.EXIT_OK, out)

        third = _loop_cycle_event(run_id, loop_iteration=3, score_delta=1)
        third["parent_event_id"] = fusion_id
        code, out, stderr = _run_append(
            [
                "--events",
                str(self.events_path),
                "--event",
                json.dumps(third),
                "--allow-test",
            ]
        )
        self.assertEqual(code, append_event.EXIT_FAIL)
        payload = json.loads(out)
        self.assertFalse(payload["ok"])
        self.assertEqual(payload["error"], "runtime_enforcement")
        codes = {v["code"] for v in payload["violations"]}
        self.assertIn("stagnation_blocked", codes)
        self.assertIn("runtime_enforcement", stderr)
        lines = self.events_path.read_text(encoding="utf-8").strip().splitlines()
        self.assertEqual(len(lines), len(events))

    def test_allow_stagnation_override_r2(self) -> None:
        run_id = "test_stagnation_override"
        events = _minimal_complete_run(run_id, routing="mono")[:-1]
        fusion_id = events[-1]["event_id"]
        loop_events = [
            _loop_cycle_event(run_id, loop_iteration=1, score_delta=0),
            _loop_cycle_event(run_id, loop_iteration=2, score_delta=0),
        ]
        for loop_ev in loop_events:
            loop_ev["parent_event_id"] = fusion_id
        events += loop_events
        for event in events:
            _run_append(
                [
                    "--events",
                    str(self.events_path),
                    "--event",
                    json.dumps(event),
                    "--allow-test",
                ]
            )

        third = _loop_cycle_event(run_id, loop_iteration=3, score_delta=1)
        third["parent_event_id"] = fusion_id
        code, out, _ = _run_append(
            [
                "--events",
                str(self.events_path),
                "--event",
                json.dumps(third),
                "--allow-test",
                "--allow-stagnation",
            ]
        )
        self.assertEqual(code, append_event.EXIT_OK, out)
        lines = self.events_path.read_text(encoding="utf-8").strip().splitlines()
        self.assertEqual(len(lines), len(events) + 1)

    def test_reject_run_finished_gate_passed_with_open_p1_r3(self) -> None:
        run_id = "test_gate_p1_r3"
        events = _minimal_complete_run(run_id, routing="mono")
        finished = events[-1]
        finished["payload"]["gate_passed"] = True
        finished["payload"]["final_p1"] = 2
        finished["payload"]["outcome"] = "gate_passed"
        for event in events[:-1]:
            code, out, _ = _run_append(
                [
                    "--events",
                    str(self.events_path),
                    "--event",
                    json.dumps(event),
                    "--allow-test",
                ]
            )
            self.assertEqual(code, append_event.EXIT_OK, out)

        code, out, stderr = _run_append(
            [
                "--events",
                str(self.events_path),
                "--event",
                json.dumps(finished),
                "--allow-test",
            ]
        )
        self.assertEqual(code, append_event.EXIT_FAIL)
        payload = json.loads(out)
        self.assertEqual(payload["error"], "runtime_enforcement")
        codes = {v["code"] for v in payload["violations"]}
        self.assertIn("gate_p1_blocked", codes)
        self.assertIn("runtime_enforcement", stderr)
        self.assertFalse(any(e.get("event_type") == "run_finished" for e in [
            json.loads(ln) for ln in self.events_path.read_text(encoding="utf-8").strip().splitlines()
        ]))

    def test_allow_gate_p1_open_override_r3(self) -> None:
        run_id = "test_gate_p1_override"
        events = _minimal_complete_run(run_id, routing="mono")
        finished = events[-1]
        finished["payload"]["gate_passed"] = True
        finished["payload"]["final_p1"] = 1
        finished["payload"]["outcome"] = "gate_passed"
        for event in events[:-1]:
            _run_append(
                [
                    "--events",
                    str(self.events_path),
                    "--event",
                    json.dumps(event),
                    "--allow-test",
                ]
            )

        code, out, _ = _run_append(
            [
                "--events",
                str(self.events_path),
                "--event",
                json.dumps(finished),
                "--allow-test",
                "--allow-gate-p1-open",
            ]
        )
        self.assertEqual(code, append_event.EXIT_OK, out)
        stored = [
            json.loads(ln)
            for ln in self.events_path.read_text(encoding="utf-8").strip().splitlines()
        ]
        self.assertTrue(any(e.get("event_type") == "run_finished" for e in stored))


class TestQaStats(unittest.TestCase):
    def test_invalid_json_line_skipped(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            events_path.write_text(
                '{"run_id":"r1","event_type":"worker_complete","payload":{}}\n'
                "not valid json\n"
                '{"run_id":"r2","event_type":"run_finished","payload":{"outcome":"gate_passed"}}\n',
                encoding="utf-8",
            )
            report = qa_stats.build_report(events_path)
            self.assertTrue(report["ok"])
            self.assertEqual(report["event_count"], 2)
            self.assertEqual(report["skipped_lines"], 1)
            self.assertTrue(report.get("streaming"))

    def test_load_run_events_filters_by_run_id(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            events_path.write_text(
                '{"run_id":"a","event_type":"run_context","payload":{}}\n'
                '{"run_id":"b","event_type":"run_context","payload":{}}\n'
                '{"run_id":"a","event_type":"run_finished","payload":{}}\n',
                encoding="utf-8",
            )
            events = qa_stats.load_run_events(events_path, "a")
            self.assertEqual(len(events), 2)
            self.assertTrue(all(e["run_id"] == "a" for e in events))

    def test_planner_multi_pass_triggers_overkill(self) -> None:
        events = [
            {
                "event_type": "routing_decision",
                "payload": {
                    "routing": "planner_multi_pass",
                    "kinds": ["code"],
                    "kinds_mixtes": False,
                    "source_count": 1,
                },
            },
            {
                "event_type": "worker_complete",
                "payload": {"pass_added_value": "none"},
            },
        ]
        self.assertTrue(qa_stats.flag_planner_overkill(events))

    def test_gate_passed_with_open_p1_flag(self) -> None:
        events = [
            {
                "event_type": "run_finished",
                "payload": {"gate_passed": True, "final_p1": 2},
            }
        ]
        flags = qa_stats.compute_run_flags(events)
        self.assertIn("gate_passed_with_open_p1", flags)

    def test_exclude_test_and_legacy_runs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            finished = _load_fixture("valid_run_finished.json")
            finished["run_id"] = "prod_complete"
            test_run = _load_fixture("valid_run_finished.json")
            test_run["run_id"] = "test_unit_stats"
            orphan = _load_fixture("valid_run_context.json")
            orphan["run_id"] = "prod_orphan"
            lines = [json.dumps(e) for e in (finished, test_run, orphan)]
            events_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

            report = qa_stats.build_report(events_path)
            self.assertEqual(report["run_count"], 1)
            self.assertIn("prod_complete", report["run_flags"])
            self.assertEqual(report["excluded_run_count"], 2)

            report_all = qa_stats.build_report(
                events_path, exclude_test=False, exclude_legacy=False
            )
            self.assertEqual(report_all["run_count"], 3)

    def test_null_score_delta_does_not_crash(self) -> None:
        """Prod data may emit loop_cycle with score_delta=null — treat as 0."""
        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            run_id = "20260711_null_delta"
            events = _minimal_complete_run(run_id, routing="planner_multi_pass")
            loop = _loop_cycle_event(run_id, loop_iteration=1, score_delta=0)
            loop["payload"]["score_delta"] = None
            _write_jsonl(events_path, events + [loop])

            report = qa_stats.build_report(events_path)
            self.assertTrue(report["ok"])
            self.assertEqual(report["run_count"], 1)
            self.assertNotIn("loop_effective", report["run_flags"][run_id])

    def test_cycle_metrics_export(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            run_id = "20260711_cycle_metrics"
            events = _minimal_complete_run(run_id, routing="mono")
            finished = events[-1]
            finished["payload"]["loop_enabled"] = True
            finished["payload"]["loop_iterations"] = 1
            loop = _loop_cycle_event(
                run_id, loop_iteration=1, score_delta=3, gate_passed=True
            )
            loop["payload"]["fused_quality"] = 95
            _write_jsonl(events_path, events + [loop])

            report = qa_stats.build_report(events_path)
            self.assertIn("cycle_metrics", report)
            cm = report["cycle_metrics"]
            self.assertEqual(cm["loop_run_count"], 1)
            self.assertIn(run_id, cm["trajectories"])
            self.assertEqual(cm["trajectories"][run_id][0]["fused_quality"], 95)
            self.assertIn("note", cm)


class TestAnalyzeCycles(unittest.TestCase):
    def test_gate_final_counts_and_trajectories(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            ok_run = "20260711_gate_ok"
            fail_run = "20260711_gate_fail"
            events = _minimal_complete_run(ok_run, routing="mono")
            finished_ok = events[-1]
            finished_ok["payload"]["gate_passed"] = True
            finished_ok["payload"]["outcome"] = "gate_passed"
            events_ok = events + [
                _loop_cycle_event(ok_run, loop_iteration=1, score_delta=4, gate_passed=True),
            ]

            events_fail = _minimal_complete_run(fail_run, routing="mono")
            finished_fail = events_fail[-1]
            finished_fail["payload"]["gate_passed"] = False
            finished_fail["payload"]["outcome"] = "gate_failed"
            events_fail = events_fail + [
                _loop_cycle_event(fail_run, loop_iteration=1, score_delta=0, gate_passed=False),
            ]
            _write_jsonl(events_path, events_ok + events_fail)

            report = analyze_cycles.build_report(events_path)
            self.assertTrue(report["ok"])
            self.assertEqual(report["run_count"], 2)
            self.assertEqual(report["gate_final"]["ok"], 1)
            self.assertEqual(report["gate_final"]["fail"], 1)
            self.assertEqual(len(report["trajectories"][ok_run]), 1)
            self.assertEqual(report["trajectories"][ok_run][0]["score_delta"], 4)

    def test_stagnation_two_zero_deltas(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            run_id = "20260711_stagnant"
            events = _minimal_complete_run(run_id, routing="mono")
            ctx = events[0]
            ctx["payload"]["loop_enabled"] = True
            ctx["payload"]["max_cycles"] = 3
            finished = events[-1]
            finished["payload"]["loop_enabled"] = True
            finished["payload"]["loop_iterations"] = 2
            finished["payload"]["gate_passed"] = False
            events = events + [
                _loop_cycle_event(run_id, loop_iteration=1, score_delta=0),
                _loop_cycle_event(run_id, loop_iteration=2, score_delta=0),
            ]
            _write_jsonl(events_path, events)

            report = analyze_cycles.build_report(events_path)
            self.assertEqual(report["stagnation_count"], 1)
            self.assertEqual(report["stagnation_runs"][0]["run_id"], run_id)

    def test_exhaustion_max_cycles_without_gate(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            run_id = "20260711_exhausted"
            events = _minimal_complete_run(run_id, routing="mono")
            ctx = events[0]
            ctx["payload"]["loop_enabled"] = True
            ctx["payload"]["max_cycles"] = 3
            finished = events[-1]
            finished["payload"]["loop_enabled"] = True
            finished["payload"]["loop_iterations"] = 3
            finished["payload"]["gate_passed"] = False
            finished["payload"]["outcome"] = "gate_failed"
            events = events + [
                _loop_cycle_event(run_id, loop_iteration=3, score_delta=1, hitl=True),
            ]
            _write_jsonl(events_path, events)

            report = analyze_cycles.build_report(events_path)
            self.assertEqual(report["exhaustion_count"], 1)
            self.assertEqual(report["exhaustion_runs"][0]["run_id"], run_id)

    def test_excludes_test_and_orphan_runs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            prod = _minimal_complete_run("20260711_prod_only", routing="mono")
            test_run = _minimal_complete_run("test_cycle_unit", routing="mono")
            orphan = [_load_fixture("valid_run_context.json")]
            orphan[0]["run_id"] = "20260711_orphan"
            _write_jsonl(events_path, prod + test_run + orphan)

            report = analyze_cycles.build_report(events_path)
            self.assertEqual(report["run_count"], 1)
            self.assertIn("20260711_prod_only", report["trajectories"])


class TestAnalyzePassRoi(unittest.TestCase):
    def test_cosmetic_and_findings_per_worker(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            run_id = "20260711_roi"
            base = _minimal_complete_run(run_id, routing="mono")[:2]
            workers = [
                _worker_event(
                    run_id,
                    pass_kind="code",
                    quality_score=97,
                    findings_actionable=0,
                    open_findings={"P0": 0, "P1": 0, "Info": 1},
                ),
                _worker_event(
                    run_id,
                    pass_kind="prd",
                    quality_score=90,
                    findings_actionable=3,
                    open_findings={"P0": 0, "P1": 3, "Info": 0},
                ),
            ]
            finished = _load_fixture("valid_run_finished.json")
            finished["run_id"] = run_id
            finished["parent_event_id"] = None
            _write_jsonl(events_path, base + workers + [finished])

            report = analyze_pass_roi.build_report(events_path)
            self.assertTrue(report["ok"])
            self.assertEqual(report["worker_count"], 2)
            code = report["by_pass_kind"]["code"]
            self.assertEqual(code["cosmetic"], 1)
            self.assertEqual(code["cosmetic_rate"], 1.0)
            prd = report["by_pass_kind"]["prd"]
            self.assertEqual(prd["findings_per_worker"], 3.0)

    def test_technique_pass_roi(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            run_id = "20260711_technique"
            base = _minimal_complete_run(run_id, routing="mono")[:2]
            workers = [
                _worker_event(
                    run_id,
                    pass_kind="code",
                    technique_pass="premortem",
                    findings_actionable=2,
                ),
                _worker_event(
                    run_id,
                    pass_kind="code",
                    technique_pass="premortem",
                    findings_actionable=0,
                    quality_score=98,
                    open_findings={"P0": 0, "P1": 0, "Info": 0},
                ),
            ]
            finished = _load_fixture("valid_run_finished.json")
            finished["run_id"] = run_id
            finished["parent_event_id"] = None
            _write_jsonl(events_path, base + workers + [finished])

            report = analyze_pass_roi.build_report(events_path)
            tp = report["by_technique_pass"]["premortem"]
            self.assertEqual(tp["workers"], 2)
            self.assertEqual(tp["findings_actionable_total"], 2)
            self.assertEqual(tp["findings_per_worker"], 1.0)

    def test_intra_run_redundancy(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            run_id = "20260711_redundant"
            base = _minimal_complete_run(run_id, routing="mono")[:2]
            workers = [
                _worker_event(run_id, pass_kind="code", findings_actionable=1),
                _worker_event(run_id, pass_kind="code", findings_actionable=0, quality_score=97),
            ]
            finished = _load_fixture("valid_run_finished.json")
            finished["run_id"] = run_id
            finished["parent_event_id"] = None
            _write_jsonl(events_path, base + workers + [finished])

            report = analyze_pass_roi.build_report(events_path)
            self.assertEqual(report["redundancy_count"], 1)
            self.assertEqual(report["intra_run_redundancy"][0]["dimension"], "pass_kind")
            self.assertEqual(report["intra_run_redundancy"][0]["count"], 2)


class TestTelemetryJournal(unittest.TestCase):
    def test_scan_journal_watermark(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            events = [
                {
                    "timestamp": "2026-07-11T10:00:00Z",
                    "run_id": "r1",
                    "event_type": "run_context",
                },
                {
                    "timestamp": "2026-07-12T02:00:00Z",
                    "run_id": "r1",
                    "event_type": "run_finished",
                    "payload": {"gate_passed": True, "outcome": "gate_passed"},
                },
            ]
            events_path.write_text(
                "\n".join(json.dumps(e) for e in events) + "\n",
                encoding="utf-8",
            )
            meta = telemetry_journal.scan_journal(events_path)
            self.assertEqual(meta["events_line_count"], 2)
            self.assertEqual(meta["events_watermark"], "2026-07-12T02:00:00Z")
            self.assertEqual(meta["events_first_timestamp"], "2026-07-11T10:00:00Z")

    def test_iter_events_since_exclusive(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            events = [
                {"timestamp": "2026-07-11T10:00:00Z", "run_id": "a"},
                {"timestamp": "2026-07-11T11:00:00Z", "run_id": "b"},
                {"timestamp": "2026-07-12T01:00:00Z", "run_id": "c"},
            ]
            events_path.write_text(
                "\n".join(json.dumps(e) for e in events) + "\n",
                encoding="utf-8",
            )
            filtered = list(
                telemetry_journal.iter_events(events_path, since="2026-07-11T11:00:00Z")
            )
            self.assertEqual(len(filtered), 1)
            self.assertEqual(filtered[0]["run_id"], "c")


class TestAnalyzeSnapshot(unittest.TestCase):
    def test_build_snapshot_slim_metrics(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            run_id = "20260712_snapshot"
            events = _minimal_complete_run(run_id, routing="mono")
            finished = events[-1]
            finished["payload"]["gate_passed"] = True
            finished["payload"]["outcome"] = "gate_passed"
            events[0]["timestamp"] = "2026-07-12T00:00:00Z"
            finished["timestamp"] = "2026-07-12T00:05:00Z"
            _write_jsonl(events_path, events)

            snap = analyze_snapshot.build_snapshot(events_path)
            self.assertTrue(snap["ok"])
            self.assertEqual(snap["schema_version"], "0.1")
            self.assertEqual(snap["journal"]["events_watermark"], "2026-07-12T00:05:00Z")
            cycles = snap["metrics"]["cycles"]
            self.assertEqual(cycles["run_count"], 1)
            self.assertNotIn("trajectories", cycles)

    def test_write_bundle_creates_json_and_md(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            artefacts_dir = Path(tmp) / "artefacts"
            run_id = "20260712_write"
            events = _minimal_complete_run(run_id, routing="mono")
            events[0]["timestamp"] = "2026-07-12T01:00:00Z"
            events[-1]["timestamp"] = "2026-07-12T01:01:00Z"
            _write_jsonl(events_path, events)

            snap = analyze_snapshot.build_snapshot(events_path)
            written = analyze_snapshot.write_bundle(
                snap,
                artefacts_dir,
                artefact_slug="2026-07-12_01",
            )
            self.assertTrue(Path(written["json_path"]).exists())
            self.assertTrue(Path(written["md_path"]).exists())
            index = json.loads((artefacts_dir / "snapshots" / "INDEX.json").read_text())
            self.assertEqual(index["latest"], written["json_name"])

    def test_compare_gate_delta(self) -> None:
        delta = analyze_snapshot.compare_gate_delta(
            {"gate_final_rate": 0.8},
            {"gate_final_rate": 0.74},
        )
        self.assertIsNotNone(delta)
        self.assertEqual(delta["delta_pp"], 6.0)


class TestAnalyzeExportImprovements(unittest.TestCase):
    def test_without_dry_run_writes_to_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "improvement-events.jsonl"
            cycles_path = Path(tmp) / "cycles.json"
            cycles_path.write_text(
                json.dumps({"ok": True, "summary": {"stagnation_runs": 5}}),
                encoding="utf-8",
            )
            import io
            from contextlib import redirect_stdout

            out = io.StringIO()
            with redirect_stdout(out):
                rc = analyze_export_improvements.main(
                    [
                        "--output",
                        str(events_path),
                        "--cycles-json",
                        str(cycles_path),
                        "--session-ref",
                        "test-session",
                    ]
                )
            self.assertEqual(rc, analyze_export_improvements.EXIT_OK)
            summary = json.loads(out.getvalue().strip())
            self.assertTrue(summary["ok"])
            self.assertEqual(summary["written"], 1)
            stored = validate_improvement_event.read_events(events_path)
            self.assertEqual(len(stored), 1)
            self.assertEqual(stored[0]["source"], "qa_telemetry")

    def test_dry_run_stagnation_emits_event(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            cycles_path = Path(tmp) / "cycles.json"
            cycles_path.write_text(
                json.dumps({"ok": True, "summary": {"stagnation_runs": 5}}),
                encoding="utf-8",
            )
            import io
            from contextlib import redirect_stderr, redirect_stdout

            out = io.StringIO()
            err = io.StringIO()
            with redirect_stdout(out), redirect_stderr(err):
                rc = analyze_export_improvements.main(
                    [
                        "--dry-run",
                        "--cycles-json",
                        str(cycles_path),
                        "--session-ref",
                        "test-session",
                    ]
                )
            self.assertEqual(rc, analyze_export_improvements.EXIT_OK)
            lines = [ln for ln in out.getvalue().splitlines() if ln.strip()]
            self.assertEqual(len(lines), 1)
            event = json.loads(lines[0])
            self.assertEqual(event["source"], "qa_telemetry")
            self.assertIn("Stagnation", event["problem"])
            summary = json.loads(err.getvalue().strip())
            self.assertTrue(summary["ok"])
            self.assertEqual(summary["event_count"], 1)


class TestValidateImprovementEvent(unittest.TestCase):
    def _valid_event(self) -> dict:
        return {
            "event_id": "a1b2c3d4-e5f6-4789-a012-3456789abcde",
            "recorded_at": "2026-07-11T12:00:00Z",
            "artifact_type": "skill",
            "artifact_id": "qa3-agent",
            "source_bundle": "Skills/qa/qa3-agent/",
            "install_target": "both",
            "problem": "test problem",
            "recommendation": "test reco",
            "source": "qa_telemetry",
            "severity": "important",
            "status": "noted",
            "project_id": "jarmes-skills-rules",
        }

    def test_valid_event_passes(self) -> None:
        self.assertEqual(
            validate_improvement_event.validate_improvement_event(self._valid_event()),
            [],
        )

    def test_missing_required_field(self) -> None:
        ev = self._valid_event()
        del ev["artifact_id"]
        violations = validate_improvement_event.validate_improvement_event(ev)
        paths = {v["path"] for v in violations}
        self.assertIn("artifact_id", paths)

    def test_file_header_valid(self) -> None:
        header = {"_file_header": True, "schema_version": "0.1"}
        self.assertEqual(validate_improvement_event.validate_improvement_event(header), [])


class TestAppendImprovementEvent(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.events_path = Path(self.tmp.name) / "improvement-events.jsonl"

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_append_valid_creates_header(self) -> None:
        ev = {
            "event_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            "recorded_at": "2026-07-11T12:00:00Z",
            "artifact_type": "skill",
            "artifact_id": "qa3-agent",
            "source_bundle": "Skills/qa/qa3-agent/",
            "install_target": "both",
            "problem": "append test",
            "recommendation": "fix it",
            "source": "operator",
            "severity": "note",
            "status": "noted",
            "project_id": "jarmes-skills-rules",
        }
        rc = append_improvement_event.main(
            ["--events", str(self.events_path), "--event", json.dumps(ev)]
        )
        self.assertEqual(rc, append_improvement_event.EXIT_OK)
        lines = self.events_path.read_text(encoding="utf-8").strip().splitlines()
        self.assertGreaterEqual(len(lines), 2)
        header = json.loads(lines[0])
        self.assertTrue(header.get("_file_header"))
        stored = validate_improvement_event.read_events(self.events_path)
        self.assertEqual(len(stored), 1)

    def test_duplicate_event_id_rejected(self) -> None:
        ev = {
            "event_id": "550e8400-e29b-41d4-a716-446655440000",
            "recorded_at": "2026-07-11T12:00:00Z",
            "artifact_type": "skill",
            "artifact_id": "qa3-agent",
            "source_bundle": "Skills/qa/qa3-agent/",
            "install_target": "both",
            "problem": "dup test",
            "recommendation": "fix",
            "source": "operator",
            "severity": "note",
            "status": "noted",
            "project_id": "jarmes-skills-rules",
        }
        argv = ["--events", str(self.events_path), "--event", json.dumps(ev)]
        self.assertEqual(append_improvement_event.main(argv), append_improvement_event.EXIT_OK)
        rc = append_improvement_event.main(argv)
        self.assertEqual(rc, append_improvement_event.EXIT_DUPLICATE)


class TestTelemetryAudit(unittest.TestCase):
    def _write_events(self, path: Path, events: list[dict]) -> None:
        path.write_text(
            "\n".join(json.dumps(e) for e in events) + "\n",
            encoding="utf-8",
        )

    def test_valid_run_no_p0(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            run_id = "20260629_audit_clean"
            self._write_events(events_path, _minimal_complete_run(run_id, routing="mono"))

            import telemetry_audit

            report = telemetry_audit.audit_events(events_path)
            self.assertTrue(report["ok"])
            self.assertEqual(report["p0_count"], 0)

    def test_tags_test_and_orphan(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            test_ev = _load_fixture("valid_worker_complete.json")
            test_ev["run_id"] = "test_audit_tag"
            orphan = _load_fixture("valid_run_context.json")
            orphan["run_id"] = "prod_orphan_only"
            self._write_events(events_path, [test_ev, orphan])

            import telemetry_audit

            report = telemetry_audit.audit_events(events_path, include_legacy=True)
            tags_by_line = {r["line"]: r["tags"] for r in report["lines"]}
            self.assertIn("legacy_test", tags_by_line[1])
            self.assertIn("legacy_orphan", tags_by_line[2])

    def test_parent_run_mismatch_p0(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            a = _load_fixture("valid_run_context.json")
            a["run_id"] = "run_a"
            a["event_id"] = "ctx_a"
            b = _load_fixture("valid_routing_decision.json")
            b["run_id"] = "run_b"
            b["event_id"] = "routing_b"
            b["parent_event_id"] = "ctx_a"
            finished_b = _load_fixture("valid_run_finished.json")
            finished_b["run_id"] = "run_b"
            self._write_events(events_path, [a, b, finished_b])

            import telemetry_audit

            report = telemetry_audit.audit_events(events_path)
            self.assertFalse(report["ok"])
            self.assertGreater(report["p0_count"], 0)
            codes = {f["code"] for f in report["findings"]}
            self.assertIn("parent_run_mismatch", codes)

    def test_same_event_id_across_runs_no_false_mismatch(self) -> None:
        """Canonical event_id reused per run must not trigger parent_run_mismatch."""
        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            shared_event_id = "ctx_canonical_001"

            def _complete_run(run_id: str) -> list[dict]:
                events = _minimal_complete_run(run_id, routing="mono")
                events[0]["event_id"] = shared_event_id
                events[1]["parent_event_id"] = shared_event_id
                return events

            events = _complete_run("20260629_run_a") + _complete_run("20260629_run_b")
            self._write_events(events_path, events)

            import telemetry_audit

            report = telemetry_audit.audit_events(events_path)
            mismatch = [f for f in report["findings"] if f["code"] == "parent_run_mismatch"]
            self.assertEqual(mismatch, [], mismatch)
            self.assertTrue(report["ok"])

    def test_csv_jsonl_drift(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            csv_path = Path(tmp) / "runs_summary.csv"
            run_id = "20260629_drift_test"
            finished = _load_fixture("valid_run_finished.json")
            finished["run_id"] = run_id
            finished["parent_event_id"] = None
            self._write_events(events_path, [finished])
            with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
                writer = csv.DictWriter(
                    f,
                    fieldnames=["run_id", "outcome"],
                    delimiter=";",
                )
                writer.writeheader()
                writer.writerow({"run_id": "orphan_csv_only", "outcome": "gate_passed"})

            import telemetry_audit

            report = telemetry_audit.audit_events(events_path)
            codes = {f["code"] for f in report["findings"]}
            self.assertIn("csv_jsonl_drift", codes)


class TestVerifyRunClosure(unittest.TestCase):
    def test_closed_run_exit_0(self) -> None:
        import verify_run_closure

        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            run_id = "test_closed_run"
            events = _minimal_complete_run(run_id, routing="mono")
            events_path.write_text(
                "\n".join(json.dumps(e) for e in events) + "\n",
                encoding="utf-8",
            )
            stdout = StringIO()
            with mock.patch.object(
                sys,
                "argv",
                [
                    "verify_run_closure.py",
                    "--events",
                    str(events_path),
                    "--run-id",
                    run_id,
                ],
            ), mock.patch("sys.stdout", stdout):
                code = verify_run_closure.main()
            self.assertEqual(code, verify_run_closure.EXIT_OK)
            payload = json.loads(stdout.getvalue().strip())
            self.assertTrue(payload["ok"])
            self.assertTrue(payload["has_run_finished"])
            self.assertTrue(payload["sequence_ok"])
            self.assertEqual(payload["run_id"], run_id)

    def test_open_run_exit_1_json_error(self) -> None:
        import verify_run_closure

        with tempfile.TemporaryDirectory() as tmp:
            events_path = Path(tmp) / "events.jsonl"
            run_id = "test_open_run"
            ctx = _load_fixture("valid_run_context.json")
            ctx["run_id"] = run_id
            events_path.write_text(json.dumps(ctx) + "\n", encoding="utf-8")
            stdout = StringIO()
            with mock.patch.object(
                sys,
                "argv",
                [
                    "verify_run_closure.py",
                    "--events",
                    str(events_path),
                    "--run-id",
                    run_id,
                ],
            ), mock.patch("sys.stdout", stdout):
                code = verify_run_closure.main()
            self.assertEqual(code, verify_run_closure.EXIT_NOT_CLOSED)
            payload = json.loads(stdout.getvalue().strip())
            self.assertFalse(payload["ok"])
            self.assertIn(payload["error"], ("run_not_closed", "sequence_incomplete"))


class TestSkillPaths(unittest.TestCase):
    def test_resolve_events_path_expands_skill_root(self) -> None:
        import skill_paths

        with mock.patch.dict(
            "os.environ",
            {"QA3_SKILL_ROOT": str(Path("C:/fake/skills/qa3-agent"))},
            clear=False,
        ):
            path = skill_paths.resolve_events_path("{skill_root}/telemetry/events.jsonl")
        self.assertEqual(
            path, Path("C:/fake/skills/qa3-agent/telemetry/events.jsonl").resolve()
        )

    def test_paths_payload_keys(self) -> None:
        import skill_paths

        payload = skill_paths.paths_payload()
        for key in ("skill_root", "events_path", "telemetry_dir", "runs_summary_csv"):
            self.assertIn(key, payload)
            self.assertTrue(payload[key])


class TestTelemetryConsolidate(unittest.TestCase):
    def test_dedupe_prefers_valid_event(self) -> None:
        import telemetry_consolidate

        run_id = "test_consolidate_run"
        good = _minimal_complete_run(run_id)[0]
        bad = dict(good)
        bad["agent_role"] = "parent"
        merged, stats = telemetry_consolidate.dedupe_events([bad, good])
        self.assertEqual(stats["output_events"], 1)
        self.assertEqual(merged[0]["agent_role"], "parent_qa3")

    def test_consolidate_writes_union(self) -> None:
        import telemetry_consolidate

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            src_a = tmp_path / "a.jsonl"
            src_b = tmp_path / "b.jsonl"
            out = tmp_path / "out.jsonl"
            run_a = _minimal_complete_run("run_a")
            run_b = _minimal_complete_run("run_b")
            telemetry_consolidate.write_jsonl(src_a, run_a)
            telemetry_consolidate.write_jsonl(src_b, run_b)
            report = telemetry_consolidate.consolidate([src_a, src_b], out)
            self.assertEqual(report["dedupe"]["output_events"], len(run_a) + len(run_b))
            self.assertTrue(out.exists())
            lines = out.read_text(encoding="utf-8").strip().splitlines()
            self.assertEqual(len(lines), len(run_a) + len(run_b))


if __name__ == "__main__":
    unittest.main()
