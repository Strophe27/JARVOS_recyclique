# QA Domain — Dataset (stub V1)

## Overview

Dataset QA evaluates training data, evaluation sets, and labeled corpora.

## Axes (stub)

### 1. Representativeness
- Does the dataset reflect target population?

### 2. Bias
- Sampling or labeling bias identified?

### 3. Label quality
- Inter-annotator agreement? Error rate?

### 4. Coverage
- Edge cases and rare classes represented?

### 5. License
- Usage rights clear?

### 6. Provenance / traceability
- Source and transformation history?

### 7. Train/test leakage
- Overlap between splits?

## Severity grid (dataset)

| Severity | Criterion |
|----------|-----------|
| `critical` | Train/test leakage ; license violation ; PII without handling |
| `warning` | Significant bias, poor label quality, missing coverage |
| `info` | Documentation, metadata, or schema improvement |
