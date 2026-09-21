# Scoring formulas (QA3)

Reference for workers and parent fusion. Scores are **integers 0-100**. QA3 does **not** emit a primary score in 0-1.

## Worker scores (A1)

| Score | Definition |
|-------|------------|
| `quality_score` | Deliverable quality per intent + rubrics + open findings — **never** worker self-confidence |
| `audit_confidence` | QA reliability (sources read, rubrics loaded, no timeout, justified findings) |
| `coverage_score` | `0.60 × source_coverage + 0.40 × rubric_coverage` |

### quality_score scale (5 tiers)

| Range | Meaning |
|-------|---------|
| `100` | No material known issue, contract fulfilled, scope sufficiently covered |
| `95-99` | Very good, only non-blocking micro-remarks |
| `80-94` | Usable but with significant risks or defects |
| `<80` | Insufficient quality for a serious gate |
| `<70` | At least one blocking or structural defect |

### audit_confidence axes (6)

- sources accessible or not
- rubrics loaded correctly
- scope actually read
- no timeout / context limits
- observation coherence
- ability to justify findings

Informative Phase 1 — **not blocking** for gate.

## Worker quality formula (A2)

Each worker produces at minimum:

```yaml
quality_score: 0-100
audit_confidence: 0-100
coverage_score: 0-100
axis_scores:
  universal: 0-100
  domain: 0-100
  mode: 0-100
open_findings:
  P0: n
  P1: n
  Info: n
```

```text
quality_base = 0.40 × universal_score + 0.40 × domain_score + 0.20 × mode_score
# custom_grid → domain_score = custom_grid_score

penalty = min(40, P0×25) + min(15, P1×5)
quality_after_penalty = max(0, quality_base - penalty)

if P0 > 0:  quality_score = min(quality_after_penalty, 69)
elif P1 > 0: quality_score = min(quality_after_penalty, 94)
else:       quality_score = quality_after_penalty
```

Info does not penalize.

## Parent fusion (A3)

```text
worker_weight = pass_weight × coverage_score × criticality_weight
# pass_weight: 1 (default)
# criticality_weight: low 0.75, medium 1, high 1.25

fused_quality = weighted_mean(worker.quality_score, worker_weight)
# parent caps:
#   open P0 → min(69)
#   material P1 → min(94)
#   mandatory pass failed or unreadable (timeout, scope_paths inaccessible) → min(89)

fused_coverage = global union sources/axes ; fallback weighted mean
fused_audit_confidence = weighted_mean ; cap 75 if mandatory worker < 60
```

Also report: `lowest_worker_quality`, `lowest_worker_coverage`, `lowest_worker_audit_confidence`.

## Gate (A4)

```yaml
gate_passed:
  - quality_score >= gate_score      # default 95
  - no_open_P0: true
  - coverage_score >= minimum_coverage  # default 80
# audit_confidence: informative only Phase 1
# if audit_confidence < 60, display:
#   "Gate atteint sous confiance faible : audit a revalider humainement ou par passe dediee."
#   (does not block gate Phase 1)
```

Option P2: `minimum_audit_confidence: 70` (not Phase 1).

## JSON (A5)

Emit `quality_score`, `audit_confidence`, `coverage_score` as **integers 0-100**. QA3 **must not** emit a primary score in 0-1.

Legacy input compat:

```yaml
confidence: 0.85          # accepted input
legacy_confidence_normalized: 85   # internal normalization
```
