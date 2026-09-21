# QA Domain — PRD / Specifications

## Overview

PRD QA checks that a spec is precise enough to implement without ambiguity, covers real usage flows, and does not omit critical cases.

---

## Technique 1: Ambiguity detection

**Goal**: Find anything two developers could interpret differently.

Hunt systematically:
- **Vague terms**: "fast", "simple", "intuitive", "performant", "secure" — without metrics
- **Vague quantifiers**: "some", "several", "most", "certain"
- **Implicit conditions**: "the user can…" — under what conditions? with what rights?
- **Ambiguous pronouns**: unclear referent for "it", "this", "that"
- **Passive requirements**: "data will be processed" — by whom? when? how?

For each ambiguity:
1. Quote exact passage
2. Show 2+ possible interpretations
3. Request reformulation with measurable criteria

---

## Technique 2: User flow analysis

**Goal**: All user journeys covered, including error paths.

For each feature:
- Happy path step by step?
- Error states defined (what does user see if X fails)?
- Edge states (first use, empty list, quota reached, session expired)?
- State transitions explicit?
- Consistent with defined roles / permissions?

Questions:
- "What if user cancels mid-flow?"
- "What if user goes back?"
- "What if two users act simultaneously?"
- "Offline behavior?"

---

## Technique 3: Acceptance criteria verification

**Goal**: Each requirement objectively testable.

For each requirement:
- Measurable success criterion?
- Verifiable without subjective interpretation?
- Performance criteria quantified?
- Accessibility criteria specified if relevant?

Warning signs:
- "UI must be user-friendly" → not testable
- "System must be fast" → no threshold
- "Modern browsers" → which? which versions?

---

## Technique 4: Completeness analysis

**Goal**: Expected structural sections present?

Completeness checklist (adapt formality to document level):
- [ ] Objective / problem solved
- [ ] Target audience / personas
- [ ] Scope (in / out explicit)
- [ ] Functional requirements
- [ ] Non-functional requirements (perf, security, scale)
- [ ] Technical dependencies and constraints
- [ ] Edge cases and error behavior
- [ ] Acceptance criteria per feature
- [ ] Prioritization (MoSCoW, P0/P1/P2, etc.)
- [ ] Timeline or phases if applicable
- [ ] Success metrics

> Do not require all 11 for every PRD. A product brief ≠ full RFP.

---

## Technique 5: Dependencies and risks

**Goal**: External dependencies and risks identified?

Check:
- Third-party integrations named with constraints
- Technical assumptions explicit
- Implementation risks with mitigation
- Cross-team dependencies clear (who delivers what, when)

---

## Severity grid (PRD)

| Severity   | Criterion |
|------------|-----------|
| `critical` | Ambiguity on core feature, contradictory requirement |
| `warning`  | Missing error flow, non-measurable criterion, undocumented dependency |
| `info`     | Useful clarification, missing example, suggested rewording |
