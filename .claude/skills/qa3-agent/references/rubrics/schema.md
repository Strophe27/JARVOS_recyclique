# QABrief schema (QA3)

Canonical field definitions and normalization rules for parent and workers.

## Brief aliases (parent normalization)

| Legacy field | Normalization |
|--------------|---------------|
| `type: doc` | `kind: document` |
| `type: arch` | `kind: system` |
| `type: concept` | `kind: idea` |
| `types_mixtes` | `kinds_mixtes` (alias legacy brief) |
| `scope_paths[]` | `sources[]` with `type: path` |
| `conversation_brief` (non empty) | `sources[]` with `type: conversation_excerpt`, `value: <text>` ; **keep** field for QA3 template compat |
| `confidence: 0.85` (input) | `legacy_confidence_normalized: 85` |

Rule: if `conversation_brief` **and** `conversation_excerpt` both present → **merge** into one excerpt (brief first, then excerpt) ; warn if contradictory content.

## object_under_review.sources[].type

`path` | `inline_text` | `conversation_excerpt` | `diff` | `url` | `screenshot`

### Source behaviors V1

| Source | Behavior |
|--------|----------|
| `path` | Read accessible paths. Inaccessible: P0 if central without substitute ; P1 if secondary ; lower `coverage_score` |
| `inline_text` | Treat as complete source |
| `conversation_excerpt` | Textual source ; flag if excerpt insufficient |
| `diff` | Audit delta ; use adjacent context if possible ; without context → reduce `audit_confidence` |
| `url` | No guaranteed sandbox fetch. Unreadable: issue "source non accessible", lower coverage, human action — **no invention** |
| `screenshot` | Read image if environment allows ; else issue "capture non lisible", lower coverage, request transcription |

## kind → domain file (B6)

| kind | File |
|------|------|
| code | code.md |
| document | document.md |
| prd | prd.md |
| system | system.md |
| idea | idea.md |
| text | text.md |
| prompt_skill | prompt_skill.md |
| process | process.md |
| research | research.md |
| decision | decision.md |
| dataset | dataset.md |
| llm_ai | llm_ai.md |

Legacy alias resolution (V1+V2): `arch` → `system.md` ; `concept` → `idea.md` ; `doc` → `document.md`.

Option brief: `system_subkind: software_architecture` (B7).

## rubric_layers

```yaml
rubric_layers:
  - universal
  - domain          # or custom_grid
  - mode
  - pass            # conditional: if dedicated technical pass planned
```

## custom_grid (C13)

If `custom_grid`: load custom + universal + mode (+ passes) ; **do not require** `domains/{kind}.md`.

`custom_grid` does **not** replace `universal.md`, `modes/{mode}.md`, `passes/{pass}.md`, `formulas.md`, `schema.md`.

## review_mode (P2)

`standard` | `comparative` | `synthesis` | `decision_review` — **do not** overload `mode`.

`mode` remains: `validation | adversarial | exploratory`.

## execution_tier (R11 — planner passes[])

| Value | Meaning |
|-------|---------|
| `shard` | Parallel-eligible when `scope_paths` disjoint from other shards |
| `cross_cutting` | Serial only; may overlap paths; auto if `technique_pass` ∈ contradiction, traceability, fmea, premortem, assumption-audit, abuse-misuse |

Parent runs `compute_worker_schedule.py` before workers when `pass_count >= 2`. See [`../r11-file-shard-schedule.md`](../r11-file-shard-schedule.md).

## technique_passes — dedicated_when evaluation (C12)

| Rule | Behavior |
|------|----------|
| `dedicated_when` list | **OR** between entries: **one** satisfied → dedicated pass eligible |
| Keys in **one** YAML entry | **AND**: all keys must be true |
| `pipeline: standard_or_full` | Special value: `standard` **or** `full` |
| `integrated_when` | If true and pass **not** dedicated → short section in main worker |
| Priority | `dedicated_when` wins over `integrated_when` if both match |

Canonical mapping:

```yaml
premortem:
  default_for: [idea, system, process, decision, research, prompt_skill]
  dedicated_when: [pipeline: full, criticality: high, mode: exploratory]

fmea:
  default_for: [system, process, code, dataset, llm_ai]
  dedicated_when: [pipeline: full, criticality: high]

assumption-audit:
  default_for: [idea, prd, research, decision, prompt_skill, llm_ai, system]
  dedicated_when: [pipeline: standard_or_full]

traceability:
  default_for: [prd, process, code, document, research, dataset]
  dedicated_when:
    - requirements_exist: true
      expected_outputs_exist: true

contradiction:
  default_for: [document, prd, system, text, prompt_skill, research, decision]
  dedicated_when:
    - pipeline: full
      multiple_sources: true
  integrated_when: [pipeline: standard]

abuse-misuse:
  default_for: [code, system, process, prompt_skill, llm_ai, dataset]
  dedicated_when:
    - criticality: high
    - mode: adversarial
```

## exploratory_blocks_gate

`true` if `gate_score` present in brief **or** execution via `workflow-loop.md`.

Mapping if `exploratory_blocks_gate: true`:
- Blocking questions → P0-equivalent
- Important questions → P1-equivalent
- Secondary leads → Info

## i18n (E18)

- `rubrics_language: en`
- `workflow_language: fr`
- `output_language: auto_from_user`
- JSON/YAML schemas in English
