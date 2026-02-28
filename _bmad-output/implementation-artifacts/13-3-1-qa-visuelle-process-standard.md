# Process QA visuelle continue - standard operatoire (Epic 13.3)

Date: 2026-02-28
Story source: `13-3-1-qa-visuelle-continue-process-et-livrables`
Perimetre: stories de remediation visuelle UI (Epic 11/13), hors exclusions validees.

## 1) Sequence unique d execution (obligatoire)

1. Cadrer le lot:
   - declarer explicitement `scope_inclus` et `scope_exclu`
   - verifier exclusions forcees: `pin login`, `users pending`, `permissions`
2. Build frontend:
   - executer `npm run build` dans `frontend/`
   - tracer commande + resultat (`OK`/`KO`) dans la story
3. Tests UI co-loces:
   - executer les `*.test.tsx` du perimetre touche (Vitest + RTL + jsdom)
   - tracer commande + resultat (`OK`/`KO`) dans la story
4. Captures AVANT/APRES:
   - produire des paires AVANT/APRES pour chaque ecran du `scope_inclus` (obligatoire, aucune exception hors `scope_exclu`)
   - stocker les captures uniquement sous chemins canoniques absolus:
     - AVANT: `_bmad-output/implementation-artifacts/screenshots/11-0/<domaine>/`
     - APRES: `_bmad-output/implementation-artifacts/screenshots/<story_key>/<domaine>/`
5. Mini audit visuel de domaine:
   - classifier tous les ecarts: `critique`, `majeur`, `mineur`
   - declarer les ecarts residuels acceptes avec justification
6. Cloture:
   - publier manifest `*-preuves.json` + annexe `*-annexe.md`
   - saisir decision finale de cloture du lot (`go-review` ou `blocked`)

## 2) Gate de passage (review et done)

## Passage a `review`

- `npm run build` = OK
- Tests UI co-loces du scope = OK
- Manifest de preuves publie et verifiable
- Annexe d audit publiee et verifiable
- Aucun ecart `critique`/`majeur` ouvert non accepte dans le scope traite
- Exclusions Epic 11 confirmees explicitement

## Passage a `done`

- Story en statut `review` puis revue code/QA terminee
- Aucune action bloquante ouverte en re-review
- `File List` et completion notes de la story completes
- Decision de cloture explicite conservee dans les artefacts

## Regles de blocage

- Build KO -> blocage immediat.
- Tests UI co-loces KO -> blocage immediat.
- Preuves incompletes/non tracables (dont capture APRES manquante pour un ecran inclus) -> blocage immediat.
- Ecart critique/majeur non accepte -> blocage immediat.

## 3) Definition of done QA visuelle (alignee Epic 11)

- Parite 1.4.4 maintenue, sans redesign libre.
- Pas de patch opportuniste non trace.
- Preuve AVANT/APRES par ecran du scope inclus (strictement obligatoire).
- Mini audit rejoue et classe.
- Exclusions (`pin login`, `users pending`, `permissions`) maintenues hors scope prioritaire.
- Traces techniques minimales dans la story:
  - commande executee
  - resultat (`OK`/`KO`)
  - perimetre couvert

## 4) Standard de livrables

## Manifest de preuves JSON

Nommage:
- `<story_key>-audit-<domaine>-preuves.json`

Champs minimaux:
- `story`
- `domaine`
- `ecran`
- `route`
- `captures.avant`
- `captures.apres`
- `ecarts`
- `decision`

## Annexe d audit markdown

Nommage:
- `<story_key>-audit-<domaine>-annexe.md`

Sections minimales:
- perimetre
- ecarts classes (`critique`/`majeur`/`mineur`)
- justification des ecarts acceptes
- decision de cloture

## Nomenclature et emplacement des captures

- AVANT de reference Epic 11:
  - `_bmad-output/implementation-artifacts/screenshots/11-0/<domaine>/`
- APRES de lot:
  - `_bmad-output/implementation-artifacts/screenshots/<story_key>/<domaine>/`
- Convention de nommage (strict):
  - `<domaine>-before-XX-<slug>.png`
  - `<domaine>-after-XX-<slug>.png`
- Regle anti-ambiguite:
  - Le dossier `11-0` est reserve aux references AVANT (baseline Epic 11).
  - Le dossier `<story_key>` est reserve aux captures APRES de la story courante.
  - Les manifests/annexes ne doivent jamais utiliser de chemin relatif court (`screenshots/...`).

## Matrice de statuts normalisee (obligatoire)

Schema cible a utiliser dans toutes les stories 13.3.2+:

- `preuves[].decision`:
  - `conforme`
  - `conforme-avec-residuel-accepte`
  - `non-conforme-bloquant`
- `mini_audit.resultat_global`:
  - `conforme`
  - `conforme-avec-residuel-accepte`
  - `non-conforme-bloquant`
- `decision.statut`:
  - `go-review`
  - `blocked`

Mapping legacy -> schema cible (obligatoire en rejeu/historique):

- `ok` -> `conforme`
- `pass` -> `conforme`
- `partiel` -> `conforme-avec-residuel-accepte`
- `ok-hitl` -> `conforme-avec-residuel-accepte`
- `pass_with_accepted_residuals` -> `conforme-avec-residuel-accepte`
- `blocked` -> `non-conforme-bloquant` (preuves/mini_audit) ou `blocked` (decision finale)

## 5) Garde-fous scope Epic 11

Chaque lot doit declarer:
- `scope_inclus`: routes et ecrans couverts
- `scope_exclu`: exclusions forcees + exclusions specifiques lot
- `verification_exclusions`: trace explicite que `pin login`, `users pending`, `permissions` ne sont pas inclus

Chaque lot doit aussi tracer:
- ecarts residuels classes (`critique`/`majeur`/`mineur`)
- statut d acceptation pour chaque ecart residuel

## 6) Canevas reutilisables dans la story

## Completion notes QA visuelle (copier/coller)

- `Commande`: `<commande>`
- `Resultat`: `OK|KO`
- `Perimetre`: `<domaine/routes/tests/ecrans>`
- `Preuves`: `<manifest + annexe + captures>`
- `Decision`: `go-review|blocked`

## File List orientee preuves (copier/coller)

- `<story_file>.md`
- `_bmad-output/implementation-artifacts/<story_key>-audit-<domaine>-preuves.json`
- `_bmad-output/implementation-artifacts/<story_key>-audit-<domaine>-annexe.md`
- `_bmad-output/implementation-artifacts/screenshots/<story_key>/<domaine>/<fichier>.png`
- `_bmad-output/implementation-artifacts/screenshots/11-0/<domaine>/<fichier>.png` (references AVANT utilisees)
- `<fichiers code/tests touches>`

## 7) Protocole de reprise entre agents (handoff immediat)

Un handoff est considere immediat si tous ces artefacts existent:

1. Story a jour (`Tasks` coches, `Completion Notes`, `File List`, `Status`).
2. Manifest de preuves JSON present et valide.
3. Annexe d audit markdown presente et valide.
4. Captures AVANT/APRES resolubles pour chaque ecran du scope inclus.
5. Decision de cloture explicite (`go-review` ou `blocked`) + raisons.

Sans ces 5 points, la story reste `in-progress`.
