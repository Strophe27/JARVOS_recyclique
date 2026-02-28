## Domaine
`<domaine>`

## Story
`<story_key>`

## Perimetre

- Scope inclus:
  - `<route-ou-ecran>`
- Scope exclu:
  - `pin login`
  - `users pending`
  - `permissions`

## Traces techniques

- Commande: `npm run build`
  - Resultat: `OK|KO`
  - Perimetre: `<frontend>`
- Commande: `npm run test:run -- <tests-co-loces>`
  - Resultat: `OK|KO`
  - Perimetre: `<tests touches>`
- Verification navigateur:
  - Resultat: `OK|KO`
  - Notes: `<console et controles manuels>`

## Preuves AVANT/APRES

- Manifest: `_bmad-output/implementation-artifacts/<story_key>-audit-<domaine>-preuves.json`
- Captures AVANT:
  - `_bmad-output/implementation-artifacts/screenshots/11-0/<domaine>/<domaine>-before-XX-<slug>.png`
- Captures APRES:
  - `_bmad-output/implementation-artifacts/screenshots/<story_key>/<domaine>/<domaine>-after-XX-<slug>.png`
- Regle: chaque ecran du scope inclus doit avoir 1 capture AVANT + 1 capture APRES.

## Ecarts classes

### Critiques

- `<id>: <description> (accepte: oui/non, justification)`

### Majeurs

- `<id>: <description> (accepte: oui/non, justification)`

### Mineurs

- `<id>: <description> (accepte: oui/non, justification)`

## Ecarts residuels acceptes

- `<id>: <justification + plan de suivi>`

## Decision de cloture

- Statut: `go-review|blocked`
- Justification: `<raison>`

## Mapping statuts legacy (si rejeu historique)

- `ok` ou `pass` -> `conforme`
- `partiel`, `ok-hitl`, `pass_with_accepted_residuals` -> `conforme-avec-residuel-accepte`
- `blocked` -> `non-conforme-bloquant` (preuve/mini-audit) et `blocked` (decision finale)
