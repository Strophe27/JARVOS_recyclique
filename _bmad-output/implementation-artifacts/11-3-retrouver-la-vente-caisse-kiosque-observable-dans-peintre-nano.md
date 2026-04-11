# Story 11.3 : Retrouver la vente caisse kiosque observable dans `Peintre_nano`

Status: done

**Constat post-rétro Epic 11 (honnêteté périmètre) :** le livrable clos ici est une **fondation technique** : routage legacy `/cash-register/sale`, shell kiosque en **runtime démo**, alignement documenté contrat `CREOS` / route legacy, tests automatisés. Ce n'est **pas** une parité legacy **validable humainement** (parcours vente bout-en-bout sur stack terrain avec preuves réseau sur le chemin nominal de vente). Les compléments de surface caisse et de preuve terrain relèvent explicitement de **Epic 13** ; **Epic 12** et **Epic 14** portent la même discipline sur réception et admin.

**Story ID :** 11.3  
**Story key :** `11-3-retrouver-la-vente-caisse-kiosque-observable-dans-peintre-nano`  
**Epic :** 11 — Retrouver la parite UI legacy critique dans `Peintre_nano`

## Story

En tant qu'**utilisateur avec `caisse.access` et une session ouverte**,

je veux retrouver dans `Peintre_nano` le parcours nominal de vente caisse en mode kiosque observe dans le legacy,

afin de poser le socle routage / shell pour ce flux critique sans deplacer l'autorite metier hors de l'API (validation humaine du parcours vente complet : Epic 13).

## Scope

- Parcours observe sur le legacy : hub caisse `/caisse` -> reprise -> ecran `/cash-register/sale`.
- Kiosque nominal reel uniquement : KPIs session, structure wizard / ticket / finalisation, garde-fous de session.
- Ancrage sur les artefacts `CREOS` cashflow existants, avec ecarts shell / route explicitement documentes.

## Non-scope

- Variantes `virtual` et `deferred`.
- Parite exhaustive de tout le workflow caisse historique.
- Equivalence implicite entre le slice `CREOS` `/caisse` et la route kiosque `/cash-register/sale` sans decision ecrite.
- Re-definition du metier caisse deja porte par Epic 6 ; ici on traite la parite UI observable et l'alignement contractuel du rendu `Peintre_nano`, pas une nouvelle specification fonctionnelle caisse.

## Clarification de périmètre réellement livré (rétrospective Epic 11, 2026-04-11)

Sans blâme individuelle : au moment de la clôture, le livrable **11.3** couvre surtout un **socle d’ingénierie** — alias de route `/cash-register/sale` vers le même `page_key` CREOS que `/caisse`, comportements de shell type kiosque (masquage nav / bac à sable), documentation d’écart route/contrat, mise à jour matrice, tests automatisés et preuves DevTools **sur la navigation et l’absence de XHR sur certains chemins**.

Ce socle **ne constitue pas**, dans l’état documenté ici, une **parité UI terrain** au sens où un opérateur pourrait **valider humainement** que l’écran et le parcours « ressemblent au legacy » de façon crédible pour une recette terrain. Le rendu reste **éloigné** de l’expérience legacy perçue sur le terrain pour cette intention.

**Ce n’est pas bloquant pour la roadmap** : les **Epics 12, 13 et 14** reprennent explicitement l’élargissement de la parité UI legacy (réception, caisse au-delà du kiosque nominal — notamment **Epic 13** pour prolonger et raffiner la caisse —, administration). La **vraie** parité legacy « reconnue opérateur » pour le kiosque et ses voisinages est **reportée** vers ces epics, avec des critères de validation à clarifier (voir rétro `epic-11-retro-2026-04-11.md`, actions A1–A3).

## Acceptance Criteria

1. **Parcours nominal observable (borne technique)** — Etant donne le legacy observe de `/caisse` vers `/cash-register/sale`, quand la story est livree, alors le **runtime démo** expose la meme `page_key` / slots `CREOS` nominal avec shell kiosque coherent et garde-fous d'acces alignes sur la story ; sans revendiquer une equivalence terrain humaine du flux vente complet (limite assumee ; suite Epic 13).
2. **Route / shell explicites** — Etant donne l'absence actuelle d'artefact `CREOS` dedie a la route kiosque, quand la story est en review, alors l'ecart entre le contrat `CREOS` disponible et la route legacy est documente explicitement, sans faux equivalent.
3. **Autorite API preservee** — Etant donne que le wizard et le ticket peuvent porter de l'etat UI local, quand la story est acceptee, alors aucune regle metier de session, de permission ou de vente n'est recreee comme source de verite dans le frontend.
4. **Preuve du flux** — Etant donne la criticite terrain de ce parcours, quand la story est en review, alors la preuve contient au minimum une capture kiosque, une checklist du parcours nominal, et un point reseau sur le chemin de vente effectivement couvert **ou** une mention honnete du gap (ici : preuves matrice / DevTools surtout sur navigations sans session ouverte ; pas de preuve reseau bout-en-bout vente au sens terrain — a renforcer en Epic 13 si retenu).

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
- **Limite (alignement rétro) :** ces preuves valident surtout le **routage / shell / absence d'appels fantomes** sur l'alias, pas une reprise operateur du kiosque en session caisse ouverte avec trace reseau sur le nominal de vente ; ne pas lire cela comme « parité legacy humaine ».
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

- 2026-04-11 — Rétrospective Epic 11 : constat en tête de fichier ; section « Clarification de périmètre réellement livré » ; AC1/AC4 et Completion Notes alignés sur le socle technique vs parité terrain ; report explicite vers Epics 12–14 (surtout 13 pour la caisse).
- 2026-04-10 — Story 11.3 DS (Task) : alias `/cash-register/sale`, kiosque `hideNav`, doc + matrice + tests ; sprint-status → review.
