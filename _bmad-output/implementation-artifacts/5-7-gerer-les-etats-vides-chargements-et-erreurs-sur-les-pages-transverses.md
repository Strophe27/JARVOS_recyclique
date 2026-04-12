# Story 5.7 : Gérer les états vides, chargements et erreurs sur les pages transverses

Status: review

<!-- Create-story BMAD (CS) — Epic 5 ; états UX transverses dans Peintre_nano, alignés runtime existant (reportRuntimeFallback, data-runtime-*), sans dupliquer la logique métier ni effondrer le shell. -->

## Story

En tant qu'**utilisateur du nouveau shell**,  
je veux que **les pages transverses restent lisibles** en chargement, vide et erreur,  
afin que **le shell migré soit utilisable** avant que tout le produit soit stabilisé côté données et backend.

## Acceptance Criteria

1. **États explicites et distinguables du contenu nominal** — Étant donné une **migration** qui expose temporairement des données partielles et une **disparité de maturité backend**, quand une **page transverse** (lot **5.3**–**5.4** : manifests `page-transverse-*` sous `contracts/creos/manifests/`) est en **chargement**, **sans données** ou en **erreur**, alors la page présente des états **explicites** (chargement / vide / erreur) **cohérents** avec les règles du runtime partagé (`data-runtime-severity`, `data-runtime-code`, `role` adapté `status` | `alert` comme pour `BandeauLive`), et ces états restent **visuellement et sémantiquement distinguables** d'un rendu métier « nominal ». [Source : `epics.md` — Story 5.7 ; `peintre-nano/src/domains/bandeau-live/BandeauLive.tsx` ; `peintre-nano/src/app/PageRenderer.tsx`]

2. **Dégradation locale sans effondrement du shell** — Étant donné que certaines défaillances doivent être **isolées** plutôt que de faire tomber tout le shell, quand un **bloc transverse non critique** échoue (widget, zone `main` partielle, fetch de données d'un widget), alors la **zone concernée** se dégrade **visiblement** (message + code runtime / sévérité) tandis que **navigation**, **en-tête** et le reste de l'écran **restent utilisables** dans la mesure du manifest et des garde-fous existants (`RootShell`, `FilteredNavEntries`, `PageAccessBlocked`). Utiliser **`reportRuntimeFallback`** pour la **traçabilité** (`state`, `code`, `severity`, `detail` utile sans fuite métier sensible). [Source : `peintre-nano/src/runtime/report-runtime-fallback.ts` ; checklist §10]

3. **Opérabilité avant complétude fonctionnelle** — Étant donné que l'**Epic 5** vise une usage quotidien du shell, quand la story est livrée, alors les **pages transverses** du lot servi deviennent **opérables de façon honnête** (pas d'hypothèse silencieuse de happy path) : pas de **succès vide** confondu avec des données valides ; les erreurs réseau / rejet manifeste ne sont pas **muettes**. [Source : `epics.md` — Story 5.7]

4. **Remplacement du placeholder story 5.6** — Étant donné que **5.6** a réservé `data-testid="transverse-state-slot-placeholder"` dans `TransverseHubLayout` / `TransverseConsultationLayout`, quand **5.7** est implémentée, alors ce placeholder est **remplacé ou branché** sur des **composants d'état réutilisables** (ou un slot contrôlé par le runtime) pour les familles **hub** (dashboard, listings, admin) et **consultation**, sans casser les tests existants `transverse-templates-5-6` (les adapter pour les nouveaux `data-testid` / comportements attendus). [Source : `peintre-nano/src/app/templates/transverse/TransverseHubLayout.tsx` ; `TransverseConsultationLayout.tsx` ; `tests/unit/transverse-templates-5-6.test.tsx`]

5. **Checklist PR Peintre (garde-fous)** — Étant donné `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`, quand des états sont ajoutés : **aucune** nouvelle vérité métier ou permission **déduite** côté UI ; les widgets qui chargent des données via API restent alignés sur **`data_contract.operation_id`** résolu dans `contracts/openapi/recyclique-api.yaml` ; **aucune** route / `page_key` **uniquement** front ; pas d'appel direct Paheko / externe depuis le shell. Les états « vide » reflètent des **réponses** ou **absence de lignes** autorisées par le backend, pas une invention locale. [Source : checklist — points 1–5, 7–9]

6. **Preuve par tests** — Étant donné la stack Vitest / e2e existante, quand l'implémentation est terminée, alors au moins : **(a)** des tests **unitaires** sur les primitives d'état transverse (présence `data-testid`, `data-runtime-code`, rôles ARIA) ; **(b)** un ou plusieurs tests **e2e** ou d'intégration sur un parcours transverse (ex. dashboard ou listing) simulant **chargement** / **liste vide** / **erreur** contrôlée (mock fetch ou props), sans dépendre du backend réel pour la CI. [Source : `peintre-nano/tests/`]

## Tasks / Subtasks

- [x] **Cartographier l'existant et cadrer le périmètre** (AC: 1, 5)
  - [x] Relire les widgets / domaines utilisés par les manifests `page-transverse-*.json` (registre, résolution `data_contract`).
  - [x] Lister où se situent aujourd'hui chargement / erreur (ex. bandeau live, `WidgetResolveFallback`, `ManifestErrorBanner`, `FilteredNavEmpty`).

- [x] **Définir des primitives transverses réutilisables** (AC: 1, 4, 5)
  - [x] Introduire un petit module (ex. sous `peintre-nano/src/app/templates/transverse/` ou `peintre-nano/src/app/states/transverse/`) : **TransverseLoadingState**, **TransverseEmptyState**, **TransverseErrorState** (noms indicatifs), styles via **tokens** (`src/styles/tokens.css`), pas de logique métier.
  - [x] Remplacer ou intégrer le **placeholder** 5.6 pour afficher ces états selon le mode page (hub vs consultation) — ou brancher un **wrapper** documenté si l'état est porté par widget.

- [x] **Brancher les états sur les parcours transverses du lot** (AC: 1–3)
  - [x] Pour **au moins** les pages correspondant aux manifests : `page-transverse-dashboard`, `page-transverse-listing-dons` ou `page-transverse-listing-articles`, et **une** page consultation + **une** admin — garantir chemins **loading / empty / error** visibles (données mockées ou scénarios démo tant que backend partiel).
  - [x] S'assurer que l'échec **local** (widget) n'empêche pas le rendu du shell : error boundary **ciblé** ou fallback par widget selon pattern déjà admis dans le projet (documenter le choix dans les Dev Notes du fichier story à la fin de l'implémentation).

- [x] **Instrumentation et cohérence runtime** (AC: 2)
  - [x] Appeler `reportRuntimeFallback` sur les transitions d'erreur / dégradation pertinentes (alignement sévérité `info` | `degraded` | `blocked`).

- [x] **Tests + qualité** (AC: 6)
  - [x] Mettre à jour / étendre `transverse-templates-5-6` si nécessaire ; ajouter tests dédiés **5.7**.
  - [x] `npm run lint` et `npm test` dans `peintre-nano/`.

## Dev Notes

### Garde-fous architecture et checklist PR Peintre

La checklist `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` s'applique **avant** merge : pas de seconde implémentation métier, hiérarchie **OpenAPI > ContextEnvelope > NavigationManifest > PageManifest > UserRuntimePrefs**.

### Continuité story 5.6

- Patrons `TransverseHubLayout`, `TransverseConsultationLayout`, `TransverseMainLayout`, `resolveTransverseMainLayoutMode` — la **5.7** active la **couche d'état** réservée par le placeholder.
- Fichier de référence implémenté : `_bmad-output/implementation-artifacts/5-6-poser-les-templates-et-layouts-reutilisables-des-pages-transverses.md`.

### Fichiers et zones typiques

| Zone | Rôle |
|------|------|
| `peintre-nano/src/app/demo/RuntimeDemoApp.tsx` | Orchestration demo : erreur bundle (`ManifestErrorBanner`) — modèle de **non-effondrement** partiel |
| `peintre-nano/src/app/PageRenderer.tsx` | `WidgetResolveFallback` — dégradation **par widget** |
| `peintre-nano/src/app/FilteredNavEntries.tsx` | `FilteredNavEmpty` — **vide** navigation filtrée |
| `peintre-nano/src/runtime/report-runtime-fallback.ts` | Charge utile structurée |
| `contracts/creos/manifests/page-transverse-*.json` | Pages transverses de référence |
| `contracts/openapi/recyclique-api.yaml` | `operationId` pour données widget |

### Stories adjacentes

- **5.8** : validation de cohérence transverse globale — pas d'y reporter toute la batterie de tests **5.7**.
- **Epic 6+** : `DATA_STALE` et blocages métier critiques — **5.7** pose l'**UX transverse** de base sans anticiper toute la sémantique caisse.

### Conformité stack

React 18, Vite, TypeScript, Vitest, Mantine pour **petits** contrôles locaux si déjà le pattern du dossier ; structure spatiale et états transverses prioritairement **CSS Modules + tokens**.

### Références

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 5, Story 5.7]
- [Source : `_bmad-output/planning-artifacts/guide-pilotage-v2.md`]
- [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`]
- [Source : `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`]
- [Source : `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`]
- [Source : `peintre-nano/src/runtime/README.md`]
- [Source : `_bmad-output/implementation-artifacts/5-6-poser-les-templates-et-layouts-reutilisables-des-pages-transverses.md`]

## Dev Agent Record

### Agent Model Used

Composer (implémentation story 5.7 — DS).

### Debug Log References

### Completion Notes List

- Module `peintre-nano/src/app/states/transverse/` : **TransverseLoadingState**, **TransverseEmptyState**, **TransverseErrorState**, **TransversePageStateSlot** ; attributs `data-runtime-code` / `data-runtime-severity` / rôles `status` | `alert` alignés sur le pattern existant.
- **TransverseErrorState** appelle `reportRuntimeFallback` une fois au montage (`state: transverse_page_surface_error`).
- Layouts hub / consultation : `data-testid="transverse-page-state-slot"` + `data-transverse-state` ; nominal = zone visuellement réservée (sr-only), pas de confusion avec le contenu métier.
- **RuntimeDemoApp** : `?transverseState=loading|empty|error` (démo uniquement) + `searchSnapshot` pour resynchroniser après `popstate` / navigation.
- Dégradation **widget** : inchangée — **WidgetResolveFallback** dans `PageRenderer` + `reportRuntimeFallback` (pas de nouveau boundary React ; évite d'empiler les patterns sans besoin immédiat).

### File List

- `peintre-nano/src/app/states/transverse/` (nouveau module : primitives + slot + types + codes)
- `peintre-nano/src/app/demo/runtime-demo-transverse-state.ts`
- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `peintre-nano/src/app/templates/transverse/TransverseHubLayout.tsx`
- `peintre-nano/src/app/templates/transverse/TransverseHubLayout.module.css`
- `peintre-nano/src/app/templates/transverse/TransverseConsultationLayout.tsx`
- `peintre-nano/src/app/templates/transverse/TransverseConsultationLayout.module.css`
- `peintre-nano/src/app/templates/transverse/TransverseMainLayout.tsx`
- `peintre-nano/tests/unit/transverse-states-5-7.test.tsx`
- `peintre-nano/tests/unit/transverse-templates-5-6.test.tsx`
- `peintre-nano/tests/e2e/transverse-templates-5-6.e2e.test.tsx`
- `peintre-nano/tests/e2e/transverse-states-5-7.e2e.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/5-7-gerer-les-etats-vides-chargements-et-erreurs-sur-les-pages-transverses.md`

## Change Log

- 2026-04-08 — Story 5.7 : états transverses (chargement / vide / erreur), slot remplaçant le placeholder 5.6, démo query param, tests unitaires + e2e.

---

**Note create-story :** analyse contexte — Ultimate context engine analysis completed ; story passée en **review** après implémentation 5.7.
