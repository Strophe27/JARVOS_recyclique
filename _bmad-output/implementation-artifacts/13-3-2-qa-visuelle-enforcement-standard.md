# QA visuelle continue - enforcement et non-regression (13.3.2)

Date: 2026-02-28
Story source: `13-3-2-qa-visuelle-continue-enforcement-et-non-regression`
Base normative: `13-3-1-qa-visuelle-process-standard.md`

## 1) Regle d enforcement finale (obligatoire)

Le gate QA visuelle est **bloquant**:

- la story ne passe pas en `review` si une condition de gate est KO
- la story ne passe pas en `done` si la decision de lot est `blocked`
- la validation est **executee par script**; un statut `blocked` retourne un code non-zero (refus automatique)

Conditions bloquantes minimales:

1. `npm run build` (frontend) = `OK`
2. tests UI co-loces du scope touche = `OK`
3. preuves AVANT/APRES completes et resolubles
4. aucun ecart `critique` ou `majeur` non accepte dans le scope traite
5. exclusions Epic 11 verifiees explicitement (`pin login`, `users pending`, `permissions`)
6. chemins canoniques imposes:
   - AVANT: `_bmad-output/implementation-artifacts/screenshots/11-0/<domaine>/...`
   - APRES: `_bmad-output/implementation-artifacts/screenshots/<story_key>/<domaine>/...`

## 2) Moment exact de controle

## Controle avant `review`

Le gate est execute juste avant la bascule de statut story en `review`.

Resultat attendu:
- gate conforme -> `decision.statut = go-review`
- gate non conforme -> `decision.statut = blocked` et story maintenue `in-progress`

## Controle avant `done`

Le gate est rejoue au moment de la cloture finale:
- verifier que toutes les actions correctives sont fermees ou explicitement acceptees
- confirmer l absence de regression critique/majeure ouverte
- conserver la decision finale dans les artefacts QA

Resultat attendu:
- gate conforme -> story eligible `done`
- gate non conforme -> `blocked`, retour en correction (status `in-progress`)

## Mecanisme executable (obligatoire)

Script:

- `_bmad-output/implementation-artifacts/tools/qa_visuelle_enforcement_gate.py`

Commandes de gate:

- Avant passage `review`:
  - `python _bmad-output/implementation-artifacts/tools/qa_visuelle_enforcement_gate.py --manifest <manifest-enforcement.json> --stage review`
- Avant passage `done`:
  - `python _bmad-output/implementation-artifacts/tools/qa_visuelle_enforcement_gate.py --manifest <manifest-enforcement.json> --stage done`

Contrat d'execution:

- code `0`: gate conforme (`go-review`)
- code `2`: gate bloque (`blocked`) -> refus automatique du passage de statut
- code `1`: manifest invalide/incoherent -> refus automatique

## 3) Non-regression obligatoire a la cloture

## Protocole de detection

Pour chaque ecran du `scope_inclus`:
1. comparer AVANT (`11-0`) vs APRES (`<story_key>`)
2. consigner les regressions dans `preuves[].ecarts`
3. classer `critique|majeur|mineur`

## Trace corrective obligatoire

Toute regression detectee doit avoir une action corrective explicite:

- `owner`
- `action`
- `statut` (`open|in-progress|done|accepted`)
- `preuve_cible` (capture ou artefact attendu)

Regle de cloture:
- regression `critique` ou `majeur` avec `statut != accepted|done` -> `blocked`
- regression `mineur` ouverte -> possible si decision explicite `conforme-avec-residuel-accepte`

## 4) Schema de decision normalise

Le schema 13.3.1 est obligatoire, sans format parallele:

- `preuves[].decision`: `conforme|conforme-avec-residuel-accepte|non-conforme-bloquant`
- `mini_audit.resultat_global`: `conforme|conforme-avec-residuel-accepte|non-conforme-bloquant`
- `decision.statut`: `go-review|blocked`

Mapping legacy (rejeux historiques):

- `ok` -> `conforme`
- `pass` -> `conforme`
- `partiel` -> `conforme-avec-residuel-accepte`
- `ok-hitl` -> `conforme-avec-residuel-accepte`
- `pass_with_accepted_residuals` -> `conforme-avec-residuel-accepte`
- `blocked` -> `non-conforme-bloquant` (preuves/mini_audit), `blocked` (decision finale)

## 5) Checklist enforcement du flux story

## Entree en `review` (checklist)

- [ ] `npm run build` = OK (commande + resultat traces)
- [ ] tests UI co-loces = OK (commande + resultat traces)
- [ ] preuves AVANT/APRES completes, resolubles, chemins canoniques
- [ ] `scope_inclus`, `scope_exclu`, `verification_exclusions` renseignes
- [ ] aucune regression critique/majeure ouverte non acceptee
- [ ] decision finale de lot = `go-review` (sinon `blocked`)

## Sortie en `done` (checklist)

- [ ] story en `review` et revue terminee
- [ ] plan d action regressions cloture (ou acceptation explicite)
- [ ] aucune regression critique/majeure ouverte
- [ ] artefacts QA finalises (manifest + annexe + captures)
- [ ] decision finale conservee et coherente avec la cloture

## Comportement KO

Si un item est KO:
- story reste `in-progress`
- blocage documente dans la story (raison + action corrective + owner + preuve cible)
- `decision.statut = blocked`

## 6) Canevas completion notes enforcement (obligatoire)

Les completion notes de story doivent tracer au minimum:

- `Commande`: `<commande>`
- `Resultat`: `OK|KO`
- `Perimetre`: `<ecrans/routes/tests couverts>`
- `Preuves`: `<manifest + annexe + captures AVANT/APRES>`
- `Decision`: `go-review|blocked`
