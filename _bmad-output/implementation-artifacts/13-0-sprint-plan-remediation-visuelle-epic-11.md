# Sprint 13 - Remediation visuelle Epic 11

Date: 2026-02-28
Statut: PRET A LANCER

## Objectif

Passer de "Epic 11 livré" a "Epic 11 conforme visuellement en continu", avec parité 1.4.4 quasi pixel perfect sur le scope inclus.

## Scope

- Inclus: ecrans Epic 11 hors exclusions.
- Exclus: `pin login`, `users pending`, `permissions`.

## Stories du sprint

1. `13-1-1-socle-visuel-shell-global-bandeau-menu-layout`
2. `13-1-2-socle-visuel-tokens-et-composants-ui-cles`
3. `13-2-1-remediation-visuelle-lot-auth-caisse-hors-exclusions`
4. `13-2-2-remediation-visuelle-lot-reception-admin1-hors-exclusions`
5. `13-2-3-remediation-visuelle-lot-admin2-admin3-categories-hors-exclusions`
6. `13-3-1-qa-visuelle-continue-process-et-livrables`
7. `13-3-2-qa-visuelle-continue-enforcement-et-non-regression`

## Artefacts obligatoires

- `_bmad-output/implementation-artifacts/11-x-point-de-verite-parite-v1.4.4.md`
- `_bmad-output/implementation-artifacts/11-x-charte-visuelle-operatoire.md`
- `_bmad-output/implementation-artifacts/11-x-guide-refactor-propre.md`
- `_bmad-output/implementation-artifacts/11-x-gate-qualite-epic11.md`
- `.cursor/rules/epic11-parite-et-refactor-propre.mdc`

## Gate de fin de sprint

- 0 ecart critique/majeur sur le scope inclus.
- Build et tests passes.
- Preuves avant/apres completes.
- Mini audit visuel domaine rejoue apres changements.

## Parallelisation avec sprint 12

- Orchestrateur BMAD: une seule execution `run-epic` active via `_bmad-output/implementation-artifacts/.run-epic-state.json`.
- Actuellement: `epic-12` est `running`.
- Conclusion: sprint 13 est prepare, mais son run `/run-epic epic-13` doit etre lance apres pause/fin propre de l'epic 12.
