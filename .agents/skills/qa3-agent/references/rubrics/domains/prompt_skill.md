# QA Domain — Prompt / Skill

## Overview

Prompt and skill QA evaluates Cursor skills, agent instructions, and prompt templates for orchestration safety and actionability.

## Axes

### 1. Triggers
- Declencheurs precise enough? Too broad?

### 2. File conflicts
- Contradictory instructions across sections?
- Parent vs worker role confusion?

### 3. Progressive disclosure
- SKILL.md light ; detail in referenced files?

### 4. Instruction dilution
- Critical rules buried in long YAML?
- Anti-dilution signals present for Task/spawn?

### 5. Parent / worker roles
- Clear separation: parent routes, worker reads deliverable?

### 6. Relative paths
- Portable placeholders (`{USER_SKILLS_DIR}`) resolved before Task?

### 7. Redundancy
- Same rule repeated inconsistently?

### 8. Actionable instructions
- Each step executable without guesswork?

### 9. Tool compatibility
- Instructions match available tools (Task, read, etc.)?

### 10. Recursion / Task nesting
- Nested Task optional vs required clearly stated?

### 11. Portability
- Works across machines with path resolution?

## Severity grid (prompt_skill)

| Severity | Criterion |
|----------|-----------|
| `critical` | Contradiction that breaks orchestration ; worker cannot load required rubrics |
| `warning` | Over-broad triggers, stale QA3/qa3 refs, missing spawn signal |
| `info` | Example addition, README improvement |

See also `examples/prompt_skill.md` for calibrated severity examples.
