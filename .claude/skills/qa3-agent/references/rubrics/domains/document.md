# QA Domain — Document

## Overview

Documentation QA checks that docs fulfill their contract: the target reader can accomplish what they need without ambiguity or gaps.

---

## Technique 1: Coverage analysis

**Goal**: Is everything that should be documented actually documented?

Check:
- Each feature / component / concept mentioned is documented
- Prerequisites are explicit (no implicit assumptions about reader knowledge)
- Error cases and troubleshooting are covered
- Examples exist for non-trivial concepts
- Getting started or entry point identifiable in < 30 seconds

Questions:
- "Could a newcomer use this doc without asking questions?"
- "Are edge cases and exceptions documented?"
- "Are dependencies / prerequisites listed?"

---

## Technique 2: Intra- and inter-document consistency

**Goal**: Docs do not contradict themselves or other project docs.

Check:
- Consistent terminology (same concept, same name)
- Cross-references point to existing, up-to-date sections
- Versions / dates are coherent
- Step-by-step instructions match the real system state
- Diagrams match accompanying text

Warning signs:
- One term used with two different meanings
- Dead link or link to removed section
- Procedure mentions an option / button that no longer exists
- Numbers or metrics differ across documents

---

## Technique 3: Structure and findability

**Goal**: Is documentation structured to be found and navigated?

Check:
- Logical section hierarchy (general → specific)
- Table of contents for docs > 2 pages
- Balanced text / heading ratio (no walls of text, no empty headings)
- Granularity suited to audience
- Critical information not buried in a casual paragraph

Warning signs:
- Catch-all or "misc" section growing
- Redundancy across sections (same info, different wording)
- Flat structure (no hierarchy)
- Empty sections or only "TODO" / "TBD"

---

## Technique 4: Technical accuracy

**Goal**: Is what is written factually correct?

Check when possible:
- Commands / code snippets work
- File paths exist
- API, parameter, config names are correct
- Mentioned versions are current
- Screenshots match current UI

> If verification is impossible (no system access), flag as "to verify" rather than approving blindly.

---

## Technique 5: Target audience analysis

**Goal**: Does the doc speak at the right level for its reader?

Check:
- Jargon matches expected reader level
- Acronyms defined on first use
- Tone fits purpose (tutorial ≠ API reference ≠ decision guide)
- Knowledge assumptions are explicit or reasonable

---

## Severity grid (documentation)

| Severity   | Criterion |
|------------|-----------|
| `critical` | False / dangerous information, instruction that breaks the system |
| `warning`  | Important missing info, inconsistency, blocking ambiguity |
| `info`     | Clarity improvement, rewording, example addition |
