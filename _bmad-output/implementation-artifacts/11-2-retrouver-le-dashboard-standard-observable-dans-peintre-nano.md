# Story 11.2 : Retrouver le dashboard standard observable dans `Peintre_nano`

Status: done

**Story ID :** 11.2  
**Story key :** `11-2-retrouver-le-dashboard-standard-observable-dans-peintre-nano`  
**Epic :** 11 — Retrouver la parite UI legacy critique dans `Peintre_nano`

## Story

En tant qu'**utilisateur authentifie**,

je veux retrouver dans `Peintre_nano` un shell standard et une premiere vue dashboard comparables au legacy,

afin de reconstituer l'ossature post-login du produit avant d'elargir la migration des autres ecrans.

## Scope

- Route et shell standard observes apres login : navigation transverse, accueil authentifie, premiers blocs dashboard, filtres temporels, etats visibles majeurs.
- Ancrage obligatoire sur des artefacts `CREOS` reviewables deja presents ou explicitement ajustes.
- Cartographie explicite entre appels legacy observes et contrats reviewables reellement assumes pour le slice.
- Perimetre borne aux blocs deja observes dans la matrice : navigation standard, accueil, lien `Dashboard personnel`, filtres temporels, et premier lot de blocs dashboard explicitement listes en implementation.

## Non-scope

- Parite exhaustive de tous les widgets statistiques legacy.
- Resolution silencieuse de l'ecart legacy `/` vs ancrage `CREOS` `/dashboard`.
- Signaux fins du bandeau session au-dela du perimetre explicitement observe et mappe.

## Acceptance Criteria

1. **Shell standard observable** — Etant donne le legacy observe sur `http://localhost:4445/`, quand le pilote est livre, alors `Peintre_nano` restitue un shell standard et une navigation transverse comparables pour le perimetre borne de la story.
2. **Ancrage CREOS explicite** — Etant donne les artefacts `navigation-transverse-served.json` et `page-transverse-dashboard.json`, quand la story est implementee, alors l'ecran livre s'appuie sur un contrat reviewable et ne cree pas une page dashboard one-off hors gouvernance.
3. **Mapping donnees borne** — Etant donne les appels reseau observes sur le legacy, quand la story est acceptee, alors chaque bloc de donnees dans le scope est soit mappe a un contrat reviewable explicite, soit marque comme gap / hors scope, sans ambiguite.
4. **Decision d'alignement routier** — Etant donne l'ecart entre le legacy route `/` et le slice `CREOS` actuel, quand la story passe en review, alors une decision explicite est documentee : alignement, ecart accepte, ou transition.

## Dependances / Gaps

- `11.1` recommande comme prerequis logique.
- Mapping des appels stats legacy vers le contrat reviewable a clarifier.
- Risque de confusion entre shell standard, bandeau session et route `/dashboard` si la decision d'alignement n'est pas prise.
- Si le lot de blocs dashboard devient trop large, scinder apres livraison du shell / navigation en story suivante plutot que d'elargir silencieusement 11.2.

## Preuves attendues

- Captures legacy / `Peintre_nano` du dashboard standard.
- Checklist des blocs et etats effectivement couverts.
- Mise a jour de la ligne `ui-pilote-02-dashboard-unifie-standard` dans la matrice.

## Dev Notes

Assembler le post-login comme une composition modulaire : `OpenAPI` -> `ContextEnvelope` -> `NavigationManifest` -> `PageManifest` -> `UserRuntimePrefs`.

### Shell attendu

- Le shell standard doit vivre dans la structure transverse existante, pas dans une page dashboard monolithique codee en dur.
- La decision d'alignement entre le legacy route `/` et l'ancrage `CREOS` actuel doit etre explicite dans le livrable.

### Slots / zones

- S'appuyer sur `navigation-transverse-served.json` et `page-transverse-dashboard.json`.
- Tout bloc dashboard livre doit vivre dans un slot / une zone reviewable du `PageManifest`, pas dans du JSX opaque accroche au shell.

### Widgets / composants

- Chaque bloc dashboard livre doit etre porte par un widget ou composant explicitement rattache au manifeste.
- Si un bloc n'a pas encore de contrat de donnees stable, il reste gap documente ou est sorti du scope ; ne pas remplir l'ecran avec des donnees ad hoc.

### Contrats requis

- Chaque widget data du scope doit etre mappe a un `operation_id` reviewable ou etre explicitement marque bloque / differe.
- Le filtrage de visibilite et les garde-fous de navigation viennent du `ContextEnvelope` et des manifests, pas d'une matrice locale de permissions.
- `UserRuntimePrefs` reste presentation locale seulement.

### Interdits / garde-fous

- Pas de page dashboard one-off hors manifests reviewables.
- Pas d'extension silencieuse du scope a "toutes les stats legacy".
- Pas de re-calcul du contexte, des droits, ni des agregations metier dans le shell.

## References

- `references/artefacts/2026-04-10_02_cadrage-parite-ui-legacy-peintre.md`
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `references/artefacts/2026-04-10_04_story-seeds-parite-ui-pilotes-peintre.md`

## Tasks / Subtasks

- [x] Post-login `LiveAuthShell` : `replaceState` vers `/dashboard` (canon CREOS) + commentaire de routage
- [x] `RuntimeDemoApp` : masquer le bandeau bac à sable si `VITE_LIVE_AUTH` (présentation « standard » observable)
- [x] Doc : section routage legacy `/` vs CREOS `/dashboard` dans `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- [x] Matrice : ligne `ui-pilote-02-dashboard-unifie-standard` + alignement critère pilote-01 (post-login `/dashboard`)
- [x] Tests Vitest : `live-auth-shell-11-2`, `runtime-demo-live-auth-11-2`
- [x] Gates : `npm run lint` + `npm run test` (peintre-nano) verts

## Dev Agent Record

### Implementation Plan

- Aligner le pilote auth live sur l’entrée manifeste `transverse-dashboard` (`/dashboard`) sans confondre avec le legacy qui sert l’accueil sur `/`.
- Réduire le bruit visuel du mode démo uniquement quand `VITE_LIVE_AUTH` est actif.

### Debug Log

- (vide)

### Completion Notes

- Preuves Chrome DevTools MCP (legacy `localhost:4445`) intégrées dans la matrice : redirection `/` → `/login` sans session ; lien Tableau de bord → `/` ; session absente → login.
- Décision produit documentée : canon CREOS / pilote = `/dashboard` ; écart legacy `/` accepté.
- Suite complète **327** tests Vitest + `tsc -b` OK.

## File List

- `peintre-nano/src/app/auth/LiveAuthShell.tsx`
- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- `peintre-nano/src/app/auth/README.md`
- `peintre-nano/tests/unit/live-auth-shell-11-2.test.tsx`
- `peintre-nano/tests/unit/runtime-demo-live-auth-11-2.test.tsx`
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/11-2-retrouver-le-dashboard-standard-observable-dans-peintre-nano.md`

## Change Log

- 2026-04-10 — Story Runner : gates (lint, build, test) + QA e2e synthèse + code review PASS → statut `done`.
- 2026-04-10 — Story 11.2 DS : post-login `/dashboard`, bandeau sandbox masqué en live auth, doc + matrice + tests.
