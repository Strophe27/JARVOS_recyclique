# QA Domain — Decision (stub V1)

## Overview

Decision QA evaluates decision records, ADRs, and choice documentation.

## Axes (stub)

### 1. Decision statement
- What was decided?

### 2. Options
- Alternatives considered?

### 3. Constraints
- Boundaries that shaped the choice?

### 4. Success criteria
- How will we know the decision worked?

### 5. Reversibility
- Cost and path to rollback?

### 6. Risks
- Residual risks accepted?

## Severity grid (decision)

| Severity | Criterion |
|----------|-----------|
| `critical` | Decision contradicts stated constraints ; no options documented for high-stakes choice |
| `warning` | Missing success criteria, weak trade-off analysis |
| `info` | Format or example improvement |

Use `review_mode: decision_review` (P2) for dedicated decision audit logic.
