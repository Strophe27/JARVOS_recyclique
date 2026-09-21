# QA Domain — System

## Overview

System QA evaluates structural decisions: actors, flows, dependencies, feedback loops, control/break points, invariants, evolvability, governance. Applies to architecture, pipelines, and operational systems.

For `system_subkind: software_architecture`, also apply the **Software architecture** section below.

---

## Technique 1: Dependency mapping

**Goal**: Make all dependencies visible and assess health.

Analyze:
- **Direct** dependencies: which component calls which?
- **Transitive**: A → B → C — A is fragile if C breaks
- **Circular**: A → B → C → A — pathological coupling
- **External**: third-party services, APIs, databases, CDN
- **Direction**: stable modules should not depend on volatile ones

Key questions:
- "If this service fails, what cascades?"
- "Can this component deploy independently?"
- "Is there a cycle in the dependency graph?"

---

## Technique 2: SPOF analysis (Single Points of Failure)

**Goal**: Components whose failure takes down the system.

Look for:
- Services without redundancy or fallback
- Single database without replication
- Single queue whose saturation blocks everything
- Central auth without graceful degradation
- Single cloud vendor with no migration plan

For each SPOF:
1. Describe failure scenario
2. Assess blast radius
3. Propose mitigation proportional to criticality

---

## Technique 3: Boundary analysis

**Goal**: Interfaces between components clear, stable, secure?

For each boundary (API, event, shared file, shared DB):
- Explicit contract (schema, types, versions)?
- Validation on both producer and consumer?
- Versioning strategy?
- Auth at the boundary?
- Errors propagated cleanly?

Warning signs:
- Two services sharing a database directly
- API without documented schema
- Sync where async would fit
- No timeout/retry/circuit breaker between services

---

## Technique 4: Scalability assessment

**Goal**: Reasonable growth without full rewrite?

Check:
- Stateful components identified with scaling strategy
- Horizontal scaling possible (no implicit singleton)
- Potential bottlenecks (DB, network, CPU, memory)
- Hot vs cold data strategies
- Caching appropriate (present and invalidated correctly)

> Scale analysis to context. An internal 10-user tool does not need multi-region strategy.

---

## Technique 5: ADR review

**Goal**: Architectural choices justified with explicit trade-offs?

For each significant decision:
- Context and constraints documented?
- Alternatives listed?
- Selection reasoning explicit?
- Accepted trade-offs named?
- Invalidation conditions ("if X changes, reconsider")?

---

## Technique 6: Global consistency

**Goal**: Consistent patterns across the system?

Check:
- Dominant communication style (not chaotic mix)
- Same problems solved the same way (auth, logging, config, errors)
- Consistent naming (services, URLs, events)
- End-to-end data flow understandable

---

## Severity grid (architecture)

| Severity   | Criterion |
|------------|-----------|
| `critical` | SPOF without mitigation, architectural security flaw, blocking structural inconsistency |
| `warning`  | Excessive coupling, scalability not addressed, undocumented decision |
| `info`     | Clarity improvement, alternative pattern, missing documentation |

---

## Software architecture (system_subkind)

When brief specifies `system_subkind: software_architecture` or legacy `type: arch`:

Check additionally:
- Component boundaries and responsibilities clear
- Data ownership and source of truth per entity
- Sync vs async communication choices justified
- Deployment units and coupling between services
- Observability hooks at architectural boundaries
- Security boundaries (authn/authz) at system edges
