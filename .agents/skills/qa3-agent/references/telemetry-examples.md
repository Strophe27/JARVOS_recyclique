# Exemples canoniques télémétrie QA3

**Référence unique** pour parent, planner et workers : copier-coller ces enveloppes, adapter les valeurs, **ne pas** inclure `timestamp` (ajouté par `append_event.py`).

**Champ `model`** : exemples Cursor par défaut (`composer-2.5`) — planner = `cursor-grok-4.6-xhigh` si applicable · voir [`model-routing.md`](model-routing.md).

`run_id` : utiliser le placeholder `EXAMPLE_RUN_ID` ou, en prod, la valeur **unique** propagée via `telemetry.run_id` du QABrief (générée une fois par le parent).

Fixtures de validation : `scripts/fixtures/telemetry/valid_*.json`.

---

## `run_context` (parent_qa3)

```json
{
  "schema_version": 1,
  "run_id": "EXAMPLE_RUN_ID",
  "event_id": "run_context_001",
  "parent_event_id": null,
  "event_type": "run_context",
  "agent_role": "parent_qa3",
  "skill": "qa3-agent",
  "qa_variant": "qa3_loop",
  "model": "composer-2.5",
  "project": "Skills",
  "payload": {
    "entry_trigger": "qa3 simple",
    "wrapper_skill": null,
    "kinds": ["code"],
    "gate_score": 95,
    "minimum_coverage": 80,
    "loop_enabled": false,
    "loop_iteration": 0
  }
}
```

---

## `routing_decision` (parent_qa3)

```json
{
  "schema_version": 1,
  "run_id": "EXAMPLE_RUN_ID",
  "event_id": "routing_decision_001",
  "parent_event_id": "run_context_001",
  "event_type": "routing_decision",
  "agent_role": "parent_qa3",
  "skill": "qa3-agent",
  "qa_variant": "qa3_loop",
  "model": "composer-2.5",
  "project": "Skills",
  "payload": {
    "routing": "mono",
    "routing_rationale": "single kind, one source",
    "kinds": ["code"],
    "kinds_mixtes": false,
    "source_count": 1,
    "mode": "validation",
    "pipeline": "standard",
    "criticality": "medium"
  }
}
```

---

## `planner_complete` (planner)

```json
{
  "schema_version": 1,
  "run_id": "EXAMPLE_RUN_ID",
  "event_id": "planner_complete_001",
  "parent_event_id": "routing_decision_001",
  "event_type": "planner_complete",
  "agent_role": "planner",
  "skill": "qa3-agent",
  "qa_variant": "qa3_loop",
  "model": "composer-2.5",
  "project": "Skills",
  "payload": {
    "pass_count": 1,
    "passes": [{"id": "pass-code", "kind": "code"}],
    "parse_retries": 0,
    "routing_rationale": "single pass for mono routing"
  }
}
```

---

## `schedule_complete` (parent_qa3 — R11)

```json
{
  "schema_version": 1,
  "run_id": "EXAMPLE_RUN_ID",
  "event_id": "schedule_complete_001",
  "parent_event_id": "planner_complete_001",
  "event_type": "schedule_complete",
  "agent_role": "parent_qa3",
  "skill": "qa3-agent",
  "qa_variant": "qa3_loop",
  "model": "composer-2.5",
  "project": "Skills",
  "payload": {
    "batches": [["pass-code", "pass-tests"], ["pass-contradiction"]],
    "parallel_in_batch": [true, false],
    "overlaps_blocked": [],
    "max_concurrent_workers": 6,
    "pass_count": 3,
    "shard_count": 2,
    "cross_cutting_count": 1,
    "allow_overlap_debug": false,
    "rationale": "phase1: 1 shard batch; phase2: 1 cross_cutting serial"
  }
}
```

---

## `worker_complete` (worker)

```json
{
  "schema_version": 1,
  "run_id": "EXAMPLE_RUN_ID",
  "event_id": "worker_pass-code_001",
  "parent_event_id": "planner_complete_001",
  "event_type": "worker_complete",
  "agent_role": "worker",
  "skill": "qa3-agent",
  "qa_variant": "qa3_loop",
  "model": "composer-2.5",
  "project": "Skills",
  "payload": {
    "pass_id": "pass-code",
    "pass_kind": "code",
    "quality_score": 92,
    "audit_confidence": 85,
    "coverage_score": 88,
    "open_findings": {"P0": 0, "P1": 1, "Info": 2},
    "pass_added_value": "medium",
    "findings_actionable": 1
  }
}
```

---

## `qa_fusion` (parent_qa3)

```json
{
  "schema_version": 1,
  "run_id": "EXAMPLE_RUN_ID",
  "event_id": "qa_fusion_001",
  "parent_event_id": "worker_pass-code_001",
  "event_type": "qa_fusion",
  "agent_role": "parent_qa3",
  "skill": "qa3-agent",
  "qa_variant": "qa3_loop",
  "model": "composer-2.5",
  "project": "Skills",
  "payload": {
    "loop_iteration": 0,
    "qa_pass_in_iteration": "single",
    "total_workers": 1,
    "fused_quality": 92,
    "fused_coverage": 88,
    "fused_audit_confidence": 85,
    "lowest_worker_quality": 92,
    "lowest_worker_coverage": 88,
    "lowest_worker_audit_confidence": 85,
    "open_findings": {"P0": 0, "P1": 1, "Info": 2},
    "gate_passed": false,
    "gate_score": 95,
    "minimum_coverage": 80,
    "findings_actionable": 1
  }
}
```

---

## `loop_cycle` (parent_qa3 — boucle gate)

```json
{
  "schema_version": 1,
  "run_id": "EXAMPLE_RUN_ID",
  "event_id": "loop_cycle_001",
  "parent_event_id": "qa_fusion_001",
  "event_type": "loop_cycle",
  "agent_role": "parent_qa3",
  "skill": "qa3-agent",
  "qa_variant": "qa3_loop",
  "model": "composer-2.5",
  "project": "Skills",
  "payload": {
    "loop_iteration": 1,
    "gate_passed": true,
    "fused_quality": 96,
    "fused_coverage": 90,
    "fused_audit_confidence": 88,
    "corrections_applied": true,
    "hitl": false,
    "score_delta": 4,
    "findings_count": 2
  }
}
```

> `findings_count` : copier `qa_fusion.findings_actionable` de la fusion courante de l'itération (format retour R8 orchestrateur).

---

## `run_finished` (parent_qa3 — clôture obligatoire)

```json
{
  "schema_version": 1,
  "run_id": "EXAMPLE_RUN_ID",
  "event_id": "run_finished_001",
  "parent_event_id": "qa_fusion_001",
  "event_type": "run_finished",
  "agent_role": "parent_qa3",
  "skill": "qa3-agent",
  "qa_variant": "qa3_loop",
  "model": "composer-2.5",
  "project": "Skills",
  "payload": {
    "outcome": "gate_failed",
    "kinds": ["code"],
    "routing": "mono",
    "mode": "validation",
    "pipeline": "standard",
    "loop_enabled": false,
    "total_workers": 1,
    "final_quality": 92,
    "final_coverage": 88,
    "final_audit_confidence": 85,
    "final_p0": 0,
    "final_p1": 1,
    "gate_passed": false,
    "findings_actionable": 1,
    "orchestration_flags": []
  }
}
```

**`run_finished`** : toujours `--summary` à l'append. Détail champs : [`telemetry.md`](telemetry.md).
