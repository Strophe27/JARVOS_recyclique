# Sortie JSON (QA3)

Lire **uniquement** lorsque :

- `output` vaut `markdown+json`, **ou**
- criticite **high** **et** le brief **ne** definit pas `markdown_only: true`.

Workers : charger ce fichier quand JSON requis (routage parent via `workflow.md` / SKILL.md). Formules gate : `formulas.md`.

## Scores (A5)

QA3 emet **uniquement** des scores **entiers 0-100** :

- `quality_score` — qualite du livrable
- `audit_confidence` — confiance dans l'audit effectue
- `coverage_score` — couverture du perimetre audite

**Ne pas** emettre de score principal en 0-1. Entree legacy `confidence: 0.85` → normaliser en `legacy_confidence_normalized: 85` (interne).

## Schema

- **`kind`** (racine) : une ou plusieurs valeurs canoniques (`code`, `document`, `prd`, `system`, `idea`, …).
- **`axis_scores`** : `{ universal, domain, mode }` entiers 0-100.
- **`open_findings`** : `{ P0, P1, Info }` compteurs.
- Renseigner `metadata.files_analyzed`, `metadata.rubric_layers`, `metadata.subagent_axes` si pertinent.

## Exemple

```json
{
  "title": "string",
  "kind": ["document"],
  "criticality": "medium",
  "mode": "validation",
  "pipeline": "standard",
  "status": "pass | warning | fail",
  "summary": "string",
  "quality_score": 87,
  "audit_confidence": 92,
  "coverage_score": 85,
  "axis_scores": {
    "universal": 90,
    "domain": 88,
    "mode": 82
  },
  "open_findings": {
    "P0": 0,
    "P1": 2,
    "Info": 1
  },
  "quality_score_rationale": "string",
  "audit_confidence_rationale": "string",
  "coverage_score_rationale": "string",
  "issues": [
    {
      "id": "QA-001",
      "kind": "document",
      "severity": "critical | warning | info",
      "location": "string",
      "description": "string",
      "why": "string",
      "recommendation": "string",
      "effort": "trivial | minor | major"
    }
  ],
  "risks": [],
  "missing_elements": ["string"],
  "metadata": {
    "rubric_layers": ["universal", "domain", "mode"],
    "files_analyzed": ["string"],
    "subagent_axes": ["string"],
    "timestamp": "ISO8601"
  }
}
```

## Regles

- Mapping severites : `critical` → P0 ; `warning` → P1 ; `info` → Info.
- Gate parent : `quality_score >= gate_score` **et** `no_open_P0` **et** `coverage_score >= minimum_coverage` (defaut 80).
