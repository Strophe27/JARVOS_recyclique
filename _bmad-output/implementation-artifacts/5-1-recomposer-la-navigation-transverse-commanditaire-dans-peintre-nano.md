# Story 5.1 : Recomposer la navigation transverse commanditaire dans `Peintre_nano`

Status: done

<!-- CS 2026-04-07 : analyse contexte create-story terminee — guide dev pret. -->

## Story

En tant qu'**utilisateur quotidien**,  
je veux que la **navigation principale** de l'application soit servie via le **shell v2 compose** (`Peintre_nano`),  
afin d'atteindre les **zones transverses** de `Recyclique` via une UI **gouvernee par la structure detenue par le backend** (contrats commanditaires), et non par une reconstruction ad hoc cote front.

## Acceptance Criteria

1. **Navigation issue des contrats commanditaires** — Etant donne que le shell v2 supporte deja une navigation pilotee par manifest, quand la navigation transverse est migree, alors la **navigation primaire**, la **hierarchie de routes** et les **raccourcis structurels** sont rendus a partir des **contrats commanditaires** (`NavigationManifest` + `PageManifest` associes) consommes dans `Peintre_nano` ; et le frontend **ne recree pas** une structure de navigation metier en dehors du chemin manifeste gouverne. [Source : `_bmad-output/planning-artifacts/epics.md` — Story 5.1 ; `architecture/navigation-structure-contract.md`]

2. **Filtrage permissions / contexte (politique UX)** — Etant donne que la navigation visible depend des **permissions** et du **contexte actif** fournis par le backend, quand les entrees sont resolues pour une utilisatrice, alors les entrees structurelles inaccessibles sont **masquees ou filtrees** selon la **politique UX agreee** (alignement avec UX-DR3, UX-DR4) ; et il n'y a **ni route fantome** ni **trou silencieux** a la place d'une structure metier manquante — les cas refuses restent **explicites** (garde-fous runtime existants : `resolvePageAccess`, fallbacks). [Source : `epics.md` — UX Coverage ; `peintre-nano/src/runtime/filter-navigation-for-context.ts`]

3. **Perimetre transverse sans absorber les flows metier** — Etant donne que cet epic vise la **recomposition transverse**, quand la migration navigation est livree, alors elle fournit un **acces stable** vers les **points d'entree dashboard et admin** (stubs ou pages minimales acceptables si la story 5.2 / 5.4 portent le contenu detaille) ; et elle **n'absorbe pas** les workflows metier detailles reserves aux **Epics 6, 7, 8** (sync / integrations sensibles) **et 9** (modules / ACL). [Source : `epics.md` — Story 5.1, Stories 5.2–5.4 ; `2026-04-07_03_checklist-pr-peintre-sans-metier.md` — articulation par epic]

4. **Cohabitation avec la preuve Epic 4** — Etant donne que la story **4.6b** a raccorde le slice `bandeau live` dans l'app servie via un merge de navigation demo + slice, quand la navigation transverse commanditaire est introduite, alors le mecanisme **reste traçable** (pas de second parallelisme non documente) : soit **promotion** des manifests transverses dans `contracts/creos/manifests/`, soit **strategie de chargement** documentee (bundle unique vs etapes) sans casser la **chaine Convergence 2** ni la demo Epic 3 si elle doit coexister ; les **echecs de contrat / bundle** restent **visibles et journalises** (alignement **AR32** / `loadManifestBundle` + fallbacks runtime, pas de succes silencieux). [Source : story `4-6b-...md` ; `peintre-nano/src/app/demo/runtime-demo-manifest.ts` ; `epics.md` — AR32]

## Tasks / Subtasks

- [x] **Cartographier l'etat actuel vs cible** (AC: 1, 4)
  - [x] Lister comment `RuntimeDemoApp` / `App.tsx` chargent aujourd'hui `loadManifestBundle`, `filterNavigation` et la garde page `resolvePageAccess` (`runtime-demo-manifest.ts`, `RuntimeDemoApp.tsx`, `resolve-page-access.ts`).
  - [x] Identifier les manifests **reviewables** a ajouter ou etendre sous `contracts/creos/manifests/` pour la navigation transverse (pas seulement `fixtures/` ou copies locales sans promotion).
  - [x] Documenter dans la PR / notes dev les **fichiers contractuels** touches (exigence checklist PR point 11).

- [x] **Brancher la navigation transverse commanditaire** (AC: 1)
  - [x] Faire consommer par le shell servi un `NavigationManifest` (et pages associees) **autoritatif** : source canonique `contracts/creos/manifests/`, servi ou assemble cote `recyclique` selon patterns deja definis — **sans** dupliquer l'arborescence en dur dans `peintre-nano/src/app/routing/` hors contrat.
  - [x] Garantir que toute nouvelle route / `page_key` **existe** dans les manifests commanditaires (signal rouge si elle n'existe que dans le code React).
  - [x] Respecter les **regles de validation** du contrat navigation (`route_key` / `path` / `page_key` uniques, chaque noeud resolu vers un `PageManifest`, shortcuts valides) comme decrit dans `navigation-structure-contract.md` — **Validation Rules** ; en cas de collision non arbitree cote commanditaire / CI, **rejet dur** avant activation.

- [x] **Aligner filtrage UI sur `ContextEnvelope`** (AC: 2)
  - [x] Reutiliser / etendre `filterNavigation` et les regles declaratives (`permission_any`, `contexts_all`, `contexts_any`) conformement a `navigation-structure-contract.md`.
  - [x] Interdiction : hook ou utilitaire qui **recalcule** des permissions effectives cote front ; consommer uniquement les donnees backend / enveloppe.

- [x] **Points d'entree dashboard / admin** (AC: 3)
  - [x] Exposer dans la nav au minimum des entrees stables vers les zones qui seront detaillees en **5.2** (dashboard) et **5.4** (admin) — pages placeholder ou manifests minimaux **contratés**, sans implementer les flows caisse / reception.

- [x] **Tests et non-regression** (AC: 1–4)
  - [x] Ajouter ou adapter tests (unit / contract / e2e selon conventions `peintre-nano/tests/`) pour : chargement bundle nav transverse, filtrage selon enveloppe de test, absence de navigation orpheline.
  - [x] `npm run lint` et `npm run test` dans `peintre-nano/` ; pas d'edition manuelle des fichiers `generated/` pour « corriger » le contrat.

## Dev Notes

### Garde-fous architecture et checklist PR Peintre

Avant toute implementation, respecter integralement `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` :

- Pas de routes / pages / permissions metier **uniquement** dans `Peintre_nano`.
- Navigation et pages metier : **`NavigationManifest` / `PageManifest`**, pas hardcode local hors contrat.
- Pas de recalcul permissions « au feeling » front ; **`ContextEnvelope`** et reponses API font foi.
- Si le slice devient officiel : manifests **promus** dans `contracts/creos/manifests/`.
- Pas de couplage du runtime aux **details internes** de `recyclique` (imports metier profonds).

**Rappel checklist PR — points complementaires** (meme si cette story est surtout navigation / shell) :

- Tout widget officiel avec `data_contract` : **`operation_id`** resolu dans `contracts/openapi/recyclique-api.yaml` (point 3).
- Aucune **mutation sensible** ni **integration externe metier** depuis le front ; le backend revalide (points 6–7).
- Aucun **etat local** (ex. store client) comme source de verite permission / contexte / navigation (point 8).
- Ne pas editer les **fichiers generes** a la main pour « corriger » un contrat — correction dans `contracts/` + codegen (point 9).
- **Fraicheur contexte** / etats degrades / fallbacks **visibles** pour les zones sensibles, pas de succes silencieux (point 10, UX-DR10).

**Regles runtime** (extrait `navigation-structure-contract.md` — *Runtime Interpretation Rules* et *Validation Rules*) :

- Pas de **route metier** absente du `NavigationManifest` ; pas de **page metier** sans `PageManifest` associe.
- L'affichage effectif = intersection **contrat commanditaire** + **ContextEnvelope** + **UserRuntimePrefs** (prefs **ne** ajoutent **pas** route, page ni permission).
- **Collisions** `route_key` / `path` / `page_key` / `shortcut_key` : rejet par defaut si non arbitrees explicitement cote commanditaire / validation CI.
- **Journaliser** rejets de manifest, collisions et incoherences de contexte ; les echecs de chargement bundle passent par le chemin existant (`loadManifestBundle` → reporting runtime), en ligne avec **AR32**.

Hierarchie de verite : `OpenAPI` > `ContextEnvelope` > `NavigationManifest` > `PageManifest` > `UserRuntimePrefs`. [Source : `navigation-structure-contract.md` — Truth Hierarchy]

### Structure projet et zones typiques a toucher

| Zone | Role |
|------|------|
| `contracts/creos/manifests/` | Source reviewable navigation / pages transverses |
| `peintre-nano/src/runtime/load-manifest-bundle.ts` | Chargement / validation bundle |
| `peintre-nano/src/runtime/filter-navigation-for-context.ts` | Filtrage nav selon contexte |
| `peintre-nano/src/runtime/resolve-page-access.ts` | Garde acces page (permissions, contexte, fraicheur) — couple a AC2 |
| `peintre-nano/src/runtime/report-runtime-fallback.ts` | Reporting echecs manifeste / runtime (visibilite AR32) |
| `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`, `runtime-demo-manifest.ts` | Pipeline actuel demo + slice Epic 4 — point de convergence pour evolution |
| `peintre-nano/src/app/App.tsx` | Entree application servie |
| `peintre-nano/src/app/layouts/`, `routing/` | Shell, sync URL / selection nav si elargissement |
| `recyclique/.../manifests/` | Assemblage runtime **derive** des contrats — pas source editee a la main [Source : `project-structure-boundaries.md`] |

### Conformite ADR / layout

- Layout : **`CSS Grid`** comme moteur global (AR2). Couche Mantine : **adaptation** conforme **ADR P1**, pas racine de composition du runtime. [Source : `epics.md` — Additional Requirements]

### Intelligence Epic 4 (continuite)

- **4.6b** a volontairement **limite** le scope au raccordement du slice `bandeau live` dans l'app servie, avec merge de navigation **demo + slice** ; la story **5.1** est l'endroit pour **generaliser** la navigation transverse **commanditaire** sans deriver vers dashboard complet (5.2) ni listings (5.3).
- Conserver une **documentation de repro** des chemins URL / navigation apres changement (alignement habitudes story 4.6b).

### Stories ulterieures (ne pas faire dans 5.1)

- Contenu riche du **dashboard** (5.2), migration **listings** (5.3), **pages admin** (5.4), **libelles personnalises** (5.5), **templates reutilisables** (5.6), **etats vides / chargement / erreurs** transverses (5.7), **validation coherence shell** (5.8).
- Workflows **caisse / reception** (Epics **6** et **7**), **sync / integrations** sensibles (Epic **8**), **modules complementaires / ACL** (Epic **9**) : hors perimetre navigation transverse de 5.1.

### References

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 5, Story 5.1]
- [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`]
- [Source : `_bmad-output/planning-artifacts/architecture/navigation-structure-contract.md`]
- [Source : `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`]
- [Source : `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — Epic 5, checklist Peintre]
- [Source : `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` — cite dans epics Epic 5 note agents]
- [Source : `_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-peintre-autonome-applications-contributrices.md` — contexte extractibilite, hors scope implementation]
- [Source : `_bmad-output/implementation-artifacts/4-6b-raccorder-le-slice-bandeau-live-dans-lapplication-peintre-nano-reellement-servie.md`]

## Dev Agent Record

### Implementation Plan

1. Promouvoir un `NavigationManifest` unique reviewable (`navigation-transverse-served.json`) incluant démo + bandeau + entrées transverse.
2. Promouvoir les `PageManifest` de base sous `contracts/creos/manifests/` et étendre le parseur + `filterNavigation` pour `visibility` CREOS.
3. Brancher `runtimeServedManifestLoadResult` sur imports contrat ; étendre l'enveloppe démo avec les permissions transverse.
4. Tests contract + unitaires + stabilisation e2e.

### Agent Model Used

Composer (agent dev story BMAD), session 2026-04-07.

### Debug Log References

### Completion Notes List

- **Navigation servie** : `runtimeServedManifestLoadResult` importe désormais `navigation-transverse-served.json` et les `PageManifest` associés sous `contracts/creos/manifests/` — fin de la fusion locale « fixtures démo + slice » pour l'app servie ; traçabilité Convergence 2 conservée (entrée bandeau dans le manifest unique, pages Epic 4 toujours sous contrat).
- **Filtrage** : `filterNavigation` applique `visibility.permission_any` et `contexts_all` / `contexts_any` en consommant uniquement `ContextEnvelope` + dérivation documentée des marqueurs (`resolveContextMarkersFromEnvelope`) — pas de recalcul de permissions côté UI.
- **Transverse 5.2 / 5.4** : entrées `/dashboard` et `/admin` + placeholders `transverse-*-placeholder` dans les contrats ; permissions démo `transverse.dashboard.view` / `transverse.admin.view` ajoutées à l'enveloppe par défaut.
- **Tests** : contract `navigation-transverse-served-5-1.test.ts`, unités filtre + marqueurs ; stabilisation e2e bandeau (`waitFor` sur `module_disabled`).

### File List

- `contracts/creos/manifests/navigation-transverse-served.json`
- `contracts/creos/manifests/page-demo-home.json`
- `contracts/creos/manifests/page-demo-unknown-widget.json`
- `contracts/creos/manifests/page-demo-guarded-page.json`
- `contracts/creos/manifests/page-transverse-dashboard-placeholder.json`
- `contracts/creos/manifests/page-transverse-admin-placeholder.json`
- `peintre-nano/tsconfig.app.json`
- `peintre-nano/src/types/context-envelope.ts`
- `peintre-nano/src/types/navigation-manifest.ts`
- `peintre-nano/src/runtime/resolve-context-markers.ts`
- `peintre-nano/src/runtime/filter-navigation-for-context.ts`
- `peintre-nano/src/validation/navigation-ingest.ts`
- `peintre-nano/src/app/auth/default-demo-auth-adapter.ts`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/tests/unit/filter-navigation-for-context.test.ts`
- `peintre-nano/tests/unit/resolve-context-markers.test.ts`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/e2e/bandeau-live-sandbox-compose.e2e.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/5-1-recomposer-la-navigation-transverse-commanditaire-dans-peintre-nano.md`

## Change Log

- **2026-04-07** — Story 5.1 implémentée : bundle servi depuis `contracts/creos/manifests/`, visibilité déclarative nav, placeholders dashboard/admin, tests ; statut sprint → `review`.
- **2026-04-07** — Story Runner BMAD : QA e2e `navigation-transverse-5-1.e2e.test.tsx`, gates `npm test` / `npm run build` OK, CR PASS ; sprint → `done`.
