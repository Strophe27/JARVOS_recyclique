# QA Domain — Idea / Strategy

## Overview

Concept QA applies to ideas and plans not yet formalized. The goal is not to validate a finished deliverable but to stress-test thinking before it becomes one.

---

## Technique 1: Logical coherence

**Goal**: Does the reasoning hold?

Check:
- Premises explicit and acceptable?
- Conclusion follows from premises?
- Logical gaps (A therefore C, without B)?
- Assumptions labeled as assumptions?
- Circular reasoning?

---

## Technique 2: Feasibility

**Goal**: Can this be realized with existing resources and constraints?

Dimensions:
- **Technical**: required tech / skills available?
- **Temporal**: timeline realistic for complexity?
- **Human**: team capacity and skills?
- **Financial**: cost proportional to expected value?
- **Organizational**: stakeholders identified and aligned?

---

## Technique 3: Blind spots

**Goal**: What was not considered?

Exploration grid:
- **Side effects** on existing systems / processes?
- **Degraded cases**: half-working? 10x better than expected?
- **Time horizon**: does the solution age well?
- **Reversibility**: can we roll back? at what cost?
- **Forgotten stakeholders**?
- **Implicit dependencies**: what must stay true?

---

## Technique 4: Alternatives

**Goal**: Best option among available choices?

Check:
- Other approaches considered?
- "Do nothing" evaluated?
- Choice criteria explicit?
- Trade-offs of chosen option documented?
- Simplest solution that solves the problem?

---

## Technique 5: Communication clarity

**Goal**: Can stakeholders understand and buy in?

Check:
- Problem stated clearly (1–2 sentences)?
- Value proposition obvious?
- Non-technical decision-maker could grasp the stakes?
- Success metrics defined?
- Definition of done clear?

---

## Severity grid (concepts)

| Severity   | Criterion |
|------------|-----------|
| `critical` | Fundamental logic flaw, obvious technical/financial infeasibility |
| `warning`  | Significant blind spot, alternative not considered, fragile assumption |
| `info`     | Useful clarification, enrichment suggestion, watch point |
