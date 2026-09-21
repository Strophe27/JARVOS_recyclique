# QA Domain — Code

## Overview

Code QA goes beyond linting. Evaluate whether code fulfills its contract, handles edge cases, and avoids invisible technical debt.

---

## Technique 1: Functional correctness

**Goal**: Does the code do what it is supposed to do?

Check:
- Business logic matches declared intent (comments, names, context)
- Boundary conditions handled (empty lists, null, zero, negatives, very large values)
- Return types consistent on all execution paths
- Errors caught **and** handled (not just `catch (e) {}` or `pass`)
- Loops terminate in all cases
- State mutations are intentional and visible (no hidden side effects)

Questions:
- "What if input is empty / null / malformed?"
- "What if network call fails / times out?"
- "What under concurrent execution?"
- "Happy path tested — what about the main sad paths?"

---

## Technique 2: Anti-pattern detection

**Goal**: Patterns that work today but create problems tomorrow.

**Coupling and dependencies:**
- Circular dependencies between modules
- God objects / god functions (> 50 lines per function, > 300 per file)
- Hardcoded values that should be configurable
- Importing whole modules when only a few functions are needed

**Error handling:**
- Silent exception swallowing
- Magic error codes instead of typed exceptions
- Infinite retry without backoff or circuit breaker
- Insufficient logging on error paths

**Data and state:**
- In-place mutation of shared data
- Global variables modified by multiple functions
- No input validation at system boundaries
- SQL built by string concatenation

**Latent performance:**
- N+1 queries in loops
- Eager load of large unused data
- No pagination on potentially large collections
- Regex compiled inside a loop

---

## Technique 3: Security analysis

**Goal**: Obvious vulnerabilities before production.

Check:
- SQL injection, XSS, command injection (unsanitized inputs)
- Hardcoded secrets (API keys, passwords, tokens)
- Endpoints without authentication / authorization
- Sensitive data logged in clear text
- Overly broad permissions
- Known vulnerable dependencies (if visible)
- Overly permissive CORS (`*` in production)
- No rate limiting on public endpoints

> Report only concrete vulnerabilities observable in code, not generic security lectures.

---

## Technique 4: Testability

**Goal**: Can the code be tested effectively?

Check:
- Clear function signatures (inputs → outputs)?
- External dependencies injectable / mockable?
- Separation of business logic and I/O?
- Single responsibility per function?
- Tests present? Do they cover critical cases?
- Fragile tests (order, timing, external data dependent)?

---

## Technique 5: Readability and maintainability

**Goal**: Can someone who did not write this code understand and change it confidently?

Check:
- Naming reveals intent
- Comments explain *why*, not *what*
- Control flow linear vs nested maze
- Meaningful DRY violations (not one-liners)
- Right abstraction level (not over- nor under-engineered)

---

## Severity grid (code)

| Severity   | Criterion |
|------------|-----------|
| `critical` | Functional bug, security flaw, possible data loss |
| `warning`  | Anti-pattern with future risk, unhandled edge case, tech debt |
| `info`     | Readability improvement, convention miss, minor optimization |
