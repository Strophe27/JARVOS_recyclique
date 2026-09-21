# Calibrated examples — prompt_skill

## P0 — example 1

A skill tells the parent not to read audited files, but another section asks it to "quickly load files to frame the QA".

**Why P0**: operational contradiction that destroys parent/worker orchestration principle.

## P0 — example 2

A worker receives a `custom_grid`, but the workflow still requires `domains/{kind}.md` and stops the pass if that file is missing.

**Why P0**: custom path does not actually work ; out-of-taxonomy deliverables become impossible to audit.

## P1 — example 1

Skill triggers are too broad and may activate QA3 on a simple unstructured proofread request.

**Why P1**: over-trigger risk, high cost, unexpected behavior.

## P1 — example 2

The skill mentions `qa3-agent` in `SKILL.md`, but an internal template still points to `QA3-agent`.

**Why P1**: migration inconsistency, incorrect routing risk.

## Info

The README could add a complete QABrief example for a `prompt_skill` audit.

**Why Info**: adoption improvement, not a blocking defect.
