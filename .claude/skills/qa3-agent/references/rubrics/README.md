# Rubrics (QA3)

Multi-layer rubric engine for qa3-agent workers.

## Layout

```
rubrics/
├── formulas.md          # Scoring A1-A5
├── schema.md            # Brief aliases, kinds, passes
├── sortie-json.md       # JSON output 0-100
├── layers/
│   └── universal.md     # Always loaded (C11)
├── domains/             # kind → domain file (B6)
├── modes/               # validation, adversarial, exploratory
├── passes/              # Technical passes (C12)
└── examples/            # Calibrated severity examples (F19)
```

## Policy

- Workers load `layers/universal.md` + `domains/{kind}.md` (or `custom_grid`) + `modes/{mode}.md` + optional `passes/{pass}.md`.
- Legacy aliases in `domains/arch.md`, `doc.md`, `concept.md` redirect to canonical files.
- Rubrics in **English** ; workflows in **French**.

## qa2 legacy (archive)

`qa/archives/qa2-agent/` — non installe par sync. Voir `qa/archives/README.md`.
