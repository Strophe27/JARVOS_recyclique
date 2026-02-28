# Rejeu enforcement 13.3.2 sur lot 13.2.3

Date: 2026-02-28
Story source: `13-3-2-qa-visuelle-continue-enforcement-et-non-regression`
Lot rejoue: `13-2-3-remediation-visuelle-lot-admin2-admin3-categories-hors-exclusions`
Objectif: verifier que le gate 13.3.2 bloque automatiquement les faux positifs de cloture et impose la non-regression avec un manifest complet.

## Artefacts controles

- Story lot:
  - `_bmad-output/implementation-artifacts/13-2-3-remediation-visuelle-lot-admin2-admin3-categories-hors-exclusions.md`
- Manifest lot legacy (source):
  - `_bmad-output/implementation-artifacts/13-2-3-audit-admin2-admin3-preuves.json`
- Manifest rejeu enforcement 13.3.2 (normalise, complet):
  - `_bmad-output/implementation-artifacts/13-3-2-qa-visuelle-rejeu-enforcement-lot-13-2-3-preuves.json`
- Annexe lot:
  - `_bmad-output/implementation-artifacts/13-2-3-audit-admin2-admin3-annexe.md`
- Baseline AVANT:
  - `_bmad-output/implementation-artifacts/screenshots/11-0/admin-2/*.png`
  - `_bmad-output/implementation-artifacts/screenshots/11-0/admin-3-categories/*.png`
- Captures APRES canoniques par ecran (resolubles):
  - `_bmad-output/implementation-artifacts/screenshots/13-2-3-remediation-visuelle-lot-admin2-admin3-categories-hors-exclusions/admin-2/*.png`
  - `_bmad-output/implementation-artifacts/screenshots/13-2-3-remediation-visuelle-lot-admin2-admin3-categories-hors-exclusions/admin-3-categories/*.png`

## Rejeu gate enforcement (mecanisme executable)

Commande executee:

`python _bmad-output/implementation-artifacts/tools/qa_visuelle_enforcement_gate.py --manifest _bmad-output/implementation-artifacts/13-3-2-qa-visuelle-rejeu-enforcement-lot-13-2-3-preuves.json --stage review`

Resultat attendu et observe:

- `decision = blocked`
- code retour non-zero (refus automatique)
- raison bloquante: ecart majeur `ENF-13-2-3-REG-01` non accepte avec correctif `open`

Controles verifies via le gate:

1. Preconditions techniques minimales (`build`, `tests_ui_colocalises`, `preuves_completes`) -> `OK`
2. Verification chemins canoniques AVANT/APRES -> `OK` et resolubles ecran par ecran
3. Verification exclusions Epic 11 (`pin login`, `users pending`, `permissions`) -> `ok`
4. Verification ecarts severes + plan d'action correctif (`owner`, `action`, `statut`, `preuve_cible`) -> `OK`
5. Cohérence schema decision normalise (`preuves[].decision`, `mini_audit.resultat_global`, `decision.statut`) -> `OK`

## Verdict enforcement

- Decision gate 13.3.2 sur le rejeu normalise: **blocked**
- Raison bloquante principale: regression `majeur` ouverte (non acceptee) dans le scope traite
- Effet non-regression: passage `review`/`done` refuse automatiquement tant que l'action corrective n'est pas cloturee ou acceptee

## Plan d action correctif (exemple applique au lot rejoue)

| ID | Severite | Owner | Action | Statut | Preuve cible |
| --- | --- | --- | --- | --- | --- |
| ENF-13-2-3-REG-01 | majeur | equipe-ui | Recalibrer audit log et revalider la capture APRES associee | open | `_bmad-output/implementation-artifacts/screenshots/13-2-3-remediation-visuelle-lot-admin2-admin3-categories-hors-exclusions/admin-2/admin2-after-03-audit-log.png` |
| ENF-13-2-3-REG-02 | mineur | qa-visuelle | Reporter le residuel mineur vers lot suivant avec acceptation explicite | accepted | `_bmad-output/implementation-artifacts/13-3-2-qa-visuelle-rejeu-enforcement-lot-13-2-3-preuves.json` |

## Ajustements restants avant generalisation

| Ajustement | Statut | Evidence |
| --- | --- | --- |
| Section `verification_exclusions` obligatoire | fait | Manifest rejeu enforcement 13.3.2 |
| Plan d'action correctif regressions obligatoire | fait | Manifest rejeu + table ci-dessus |
| Controle automatique chemins APRES avant `review`/`done` | fait | `qa_visuelle_enforcement_gate.py` |
| Tuple minimal `Commande/Resultat/Perimetre/Preuves/Decision` trace | fait | Story 13-3-2 + present rejeu |
