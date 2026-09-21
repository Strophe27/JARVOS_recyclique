# QA Domain — LLM / AI

## Overview

LLM and AI system QA evaluates prompts, RAG pipelines, agents, and model-integrated features.

## Axes

### 1. Hallucination risk
- Grounding mechanisms? Citations required?

### 2. Grounding
- Retrieval or context sufficient for claims?

### 3. Evals
- Evaluation suite defined? Regression checks?

### 4. Data leakage
- Training or context leakage across tenants/users?

### 5. Prompt injection
- User input separated from instructions?

### 6. Robustness to ambiguous input
- Behavior on edge or adversarial inputs?

### 7. Instruction / data separation
- Clear delimiters between system and user content?

### 8. Traceability
- Model version, prompt version, source attribution?

### 9. Cost / latency / models
- Trade-offs documented? Fallback models?

## Severity grid (llm_ai)

| Severity | Criterion |
|----------|-----------|
| `critical` | Prompt injection vector ; secret leakage ; ungrounded safety claim |
| `warning` | Missing evals, weak grounding, no injection guard |
| `info` | Cost optimization, eval expansion |
