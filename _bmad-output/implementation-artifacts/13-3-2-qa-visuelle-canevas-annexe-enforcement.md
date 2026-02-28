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

## Verification exclusions Epic 11

- `pin login`: `OK|KO` - `<trace>`
- `users pending`: `OK|KO` - `<trace>`
- `permissions`: `OK|KO` - `<trace>`

## Traces techniques preconditions gate

- Commande: `npm run build`
  - Resultat: `OK|KO`
  - Perimetre: `<frontend>`
- Commande: `npm run test:run -- <tests-co-loces>`
  - Resultat: `OK|KO`
  - Perimetre: `<tests touches>`

## Preuves AVANT/APRES (chemins canoniques)

- Manifest: `_bmad-output/implementation-artifacts/<story_key>-audit-<domaine>-preuves.json`
- Captures AVANT:
  - `_bmad-output/implementation-artifacts/screenshots/11-0/<domaine>/<domaine>-before-XX-<slug>.png`
- Captures APRES:
  - `_bmad-output/implementation-artifacts/screenshots/<story_key>/<domaine>/<domaine>-after-XX-<slug>.png`

## Ecarts classes

### Critiques

- `<id>: <description> (accepte: oui/non, justification)`

### Majeurs

- `<id>: <description> (accepte: oui/non, justification)`

### Mineurs

- `<id>: <description> (accepte: oui/non, justification)`

## Plan d action correctif regressions

| ID | Severite | Description | Owner | Action | Statut | Preuve cible |
| --- | --- | --- | --- | --- | --- | --- |
| `<id-ecart>` | `critique|majeur|mineur` | `<description>` | `<owner>` | `<action>` | `open\|in-progress\|done\|accepted` | `<preuve-cible>` |

Regle:
- regression `critique` ou `majeur` sans `done|accepted` => `blocked`

## Mapping statuts legacy (si rejeu historique)

- `ok`, `pass` -> `conforme`
- `partiel`, `ok-hitl`, `pass_with_accepted_residuals` -> `conforme-avec-residuel-accepte`
- `blocked` -> `non-conforme-bloquant` (preuve/mini-audit) et `blocked` (decision finale)

## Decision de cloture

- Statut: `go-review|blocked`
- Justification: `<raison>`
