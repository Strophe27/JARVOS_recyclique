# Story 11.3 : Retrouver la vente caisse kiosque observable dans `Peintre_nano`

Status: done

**Story ID :** 11.3  
**Story key :** `11-3-retrouver-la-vente-caisse-kiosque-observable-dans-peintre-nano`  
**Epic :** 11 — Retrouver la parite UI legacy critique dans `Peintre_nano`

## Story

En tant qu'**utilisateur avec `caisse.access` et une session ouverte**,

je veux retrouver dans `Peintre_nano` le parcours nominal de vente caisse en mode kiosque observe dans le legacy,

afin de rendre a nouveau testable un flux terrain critique sans deplacer l'autorite metier hors de l'API.

## Scope

- Parcours observe sur le legacy : hub caisse `/caisse` -> reprise -> ecran `/cash-register/sale`.
- Kiosque nominal reel uniquement : KPIs session, structure wizard / ticket / finalisation, garde-fous de session.
- Ancrage sur les artefacts `CREOS` cashflow existants, avec ecarts shell / route explicitement documentes.

## Non-scope

- Variantes `virtual` et `deferred`.
- Parite exhaustive de tout le workflow caisse historique.
- Equivalence implicite entre le slice `CREOS` `/caisse` et la route kiosque `/cash-register/sale` sans decision ecrite.
- Re-definition du metier caisse deja porte par Epic 6 ; ici on traite la parite UI observable et l'alignement contractuel du rendu `Peintre_nano`, pas une nouvelle specification fonctionnelle caisse.

## Acceptance Criteria

1. **Parcours nominal observable** — Etant donne le legacy observe de `/caisse` vers `/cash-register/sale`, quand la story est livree, alors `Peintre_nano` reproduit ce parcours nominal borne avec un shell kiosque coherent et un acces reserve au role attendu.
2. **Route / shell explicites** — Etant donne l'absence actuelle d'artefact `CREOS` dedie a la route kiosque, quand la story est en review, alors l'ecart entre le contrat `CREOS` disponible et la route legacy est documente explicitement, sans faux equivalent.
3. **Autorite API preservee** — Etant donne que le wizard et le ticket peuvent porter de l'etat UI local, quand la story est acceptee, alors aucune regle metier de session, de permission ou de vente n'est recreee comme source de verite dans le frontend.
4. **Preuve du flux** — Etant donne la criticite terrain de ce parcours, quand la story est en review, alors la preuve contient au minimum une capture kiosque, une checklist du parcours nominal, et un point reseau sur le chemin de vente effectivement couvert.

## Dependances / Gaps

- `11.1` et `11.2` recommandées comme socle session / shell.
- Ancrage `CREOS` kiosque incomplet a ce stade.
- Categories / presets / certains contrats de donnees a completer ou a borner avant DoD stricte.
- Frontiere a garder explicite avec Epic 6 : `11.3` verifie le rendu observable et les ecarts shell / route ; il ne re-ouvre pas les exigences metier caisse deja fermees ou bornees ailleurs.

## Preuves attendues

- Captures legacy / `Peintre_nano` de l'ecran kiosque.
- Checklist du parcours nominal observe.
- Mise a jour de la ligne `ui-pilote-03-caisse-vente-kiosk` dans la matrice.

## Dev Notes

La story traite la parite UI observable du kiosque, pas une re-specification metier caisse. Hierarchie de verite : `OpenAPI` -> `ContextEnvelope` -> `NavigationManifest` -> `PageManifest` -> `UserRuntimePrefs`.

### Shell attendu

- Le hub caisse et l'acces a la vue nominale doivent rester alignes sur les contrats `CREOS` disponibles, avec un ecart explicite pour la route legacy kiosque `/cash-register/sale` si elle n'est pas encore formalisee comme artefact reviewable.
- Le shell kiosque ne doit pas etre reconstitue comme page fixe hors gouvernance si un alignement manifeste / route est requis.

### Slots / zones

- S'appuyer sur `page-cashflow-nominal.json` et la navigation associee.
- Toute structure livree doit etre exprimee en zones / slots reviewables ; ne pas injecter un layout kiosque monolithique dans le moteur sans contrat.

### Widgets / composants

- Les blocs `wizard`, `ticket`, KPIs et finalisation doivent correspondre a des widgets / composants explicitement rattaches au slice `CREOS` cashflow.
- L'etat UI local du wizard est admis pour l'UX, mais il ne devient jamais source de verite pour session, permissions ou vente.

### Contrats requis

- Les operations session / vente / categories / presets effectivement utilisees doivent etre nommees ou explicitement marquees gap.
- Le `ContextEnvelope` reste la source du contexte actif et des garde-fous d'affichage.
- `UserRuntimePrefs` ne peut pas forger un acces caisse ou un comportement kiosque metier.

### Interdits / garde-fous

- Pas de re-definition metier du workflow caisse deja porte par Epic 6.
- Pas d'equivalence implicite `CREOS /caisse` = route legacy `/cash-register/sale` sans decision ecrite.
- Pas d'elargissement silencieux aux variantes `virtual` ou `deferred`.

## References

- `references/artefacts/2026-04-10_02_cadrage-parite-ui-legacy-peintre.md`
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `references/artefacts/2026-04-10_04_story-seeds-parite-ui-pilotes-peintre.md`

## Tasks / Subtasks

- [x] `RuntimeDemoApp` : alias `/cash-register/sale` → meme `page_key` `cashflow-nominal` que `/caisse` (sans entree `NavigationManifest` dediee)
- [x] `syncSelectionFromPath` : selection `cashflow-nominal` quand le path est `/cash-register/sale`
- [x] Mode kiosque observable : masquer zone nav `RootShell` + bandeau bac a sable sur cet alias ; conserver slots CREOS `page-cashflow-nominal.json`
- [x] `RootShell` : prop `hideNav` + grille sans colonne nav + `data-testid` `cash-register-sale-kiosk`
- [x] Doc decision : `peintre-nano/docs/03-contrats-creos-et-donnees.md` § routage 11.3
- [x] Matrice : ligne `ui-pilote-03-caisse-vente-kiosk` (preuves DevTools parent, statut, decision)
- [x] Tests Vitest : `runtime-demo-cash-register-sale-kiosk-11-3`, extension `root-shell`
- [x] Gates : `npm run lint` + `npm run test` (peintre-nano) verts

## Dev Agent Record

### Implementation Plan

- Mapper la route legacy uniquement dans le runtime demo, en reutilisant le bundle CREOS existant (`cashflow-nominal`).
- Separer clairement presentation kiosque (chrome) et contrat de page (manifeste).

### Debug Log

- (vide)

### Completion Notes

- Preuves DevTools parent integrees matrice : sans session, `/caisse` et `/cash-register/sale` → `/login` ; pas de XHR/fetch sur ces navigations.
- Suite **330** tests Vitest + `tsc -b` OK.

## File List

- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `peintre-nano/src/app/layouts/RootShell.tsx`
- `peintre-nano/src/app/layouts/RootShell.module.css`
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- `peintre-nano/tests/unit/runtime-demo-cash-register-sale-kiosk-11-3.test.tsx`
- `peintre-nano/tests/unit/root-shell.test.tsx`
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/11-3-retrouver-la-vente-caisse-kiosque-observable-dans-peintre-nano.md`

## Change Log

- 2026-04-10 — Story 11.3 DS (Task) : alias `/cash-register/sale`, kiosque `hideNav`, doc + matrice + tests ; sprint-status → review.
