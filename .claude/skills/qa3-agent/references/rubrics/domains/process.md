# QA Domain — Process

## Overview

Process QA evaluates workflows, runbooks, SOPs, and operational procedures.

## Axes

### 1. Trigger
- What starts the process? Clear entry conditions?

### 2. Steps
- Ordered, complete, no implicit jumps?

### 3. Responsibilities
- Who does what at each step?

### 4. Inputs / outputs
- Artifacts defined per step?

### 5. Errors
- Failure paths documented?

### 6. Recovery after failure
- Rollback or retry procedures?

### 7. Stop criteria
- When is the process complete or aborted?

### 8. Observability
- How to verify progress and completion?

## Severity grid (process)

| Severity | Criterion |
|----------|-----------|
| `critical` | Missing safety step ; destructive action without guard |
| `warning` | Unclear ownership, missing error path, no stop criteria |
| `info` | Clarity, diagram, or checklist improvement |
