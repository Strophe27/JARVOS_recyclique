# Calibrated examples — system

## P0 — example 1

The system depends on a single service without fallback, and its failure blocks the entire critical flow.

**Why P0**: single point of failure on central function.

## P0 — example 2

Two critical components share mutable state without locking, versioning, or source of truth rule.

**Why P0**: corruption, conflict, or non-deterministic behavior risk.

## P1 — example 1

Responsibilities between two modules are fuzzy, with risk of future duplication.

**Why P1**: significant design debt but not necessarily immediately blocking.

## P1 — example 2

Errors are logged locally but no observability or alert mechanism is planned.

**Why P1**: difficult production diagnosis.

## Info

Documenting system invariants in an ADR would improve maintainability.

**Why Info**: useful clarification, not a current defect.
