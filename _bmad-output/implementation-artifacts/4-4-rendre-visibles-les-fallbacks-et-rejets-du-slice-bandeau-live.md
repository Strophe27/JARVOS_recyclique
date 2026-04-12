# Story 4.4 : Rendre visibles les fallbacks et rejets du slice `bandeau live`

Status: done

<!-- Note : validation optionnelle — validate-create-story avant dev-story. -->

## Story

En tant que **chaîne modulaire résiliente**,  
je veux que le slice **`bandeau live`** **démontre explicitement** les comportements d'échec (fallbacks, rejets),  
afin que la **première preuve verticale** valide à la fois les **parcours nominaux** et la **défense en runtime** (sans masquer l'incertitude sur une surface live).

## Acceptance Criteria

1. **Échecs d'intégration (contrat, composition, état widget)** — Étant donné que contrats, manifests, widgets ou signaux backend peuvent échouer pendant l'intégration, quand le slice `bandeau live` rencontre un **contrat invalide**, un **état de widget non résolu** de façon sûre, ou une **entrée de composition non satisfaisante** pour ce module, alors le runtime produit un **fallback ou rejet visible** aligné sur les **règles de sévérité** déjà posées en story **3.6** (`info` | `degraded` | `blocked` via `reportRuntimeFallback` et UI homogène) ; et **le reste de l'écran** (header, aside, autres widgets du même `PageManifest`) **reste intact** lorsque l'échec est **non critique** pour la page (UX-DR10). [Source : `_bmad-output/planning-artifacts/epics.md` — Story 4.4 ; `peintre-nano/src/runtime/README.md`]

2. **Surface live : pas de faux « tout va bien »** — Étant donné qu'il ne faut **pas cacher l'incertitude** sur une surface opérationnelle live, quand le module **ne peut pas** afficher un état **digne de confiance** (erreur HTTP/timeout/parse déjà gérés en 4.3, réponse vide/dégradée, absence de données requises côté widget statique, etc.), alors il présente un **retour dégradé compréhensible** pour l'opérateur **et** le chemin d'échec est **traçable** pour le support et le développement (**`correlationId`** issu des appels live rattaché de façon **testable** au DOM ou à la charge `reportRuntimeFallback`, sans exposer de secrets). [Source : epics.md — Story 4.4 ; Story 4.3 — `live-snapshot-client.ts`, `BandeauLive.tsx`]

3. **Preuve Epic 4** — Étant donné qu'Epic 4 est une **epic de preuve**, quand cette story est terminée, alors le slice démontre **à la fois** le rendu nominal **et** le comportement d'échec **défendu** de bout en bout (compose + bandeau + signaux d'échec) ; l'équipe dispose d'une **référence concrète** avant migration de modules plus lourds. [Source : epics.md — Story 4.4 ; Epic 4 intro — gate Convergence 2]

4. **Corrélation** — Étant donné que **Convergence 2** exige corrélation sur le flux live, les chemins d'échec **liés au fetch** `GET /v2/exploitation/live-snapshot` **continuent** d'émettre **`X-Correlation-ID`** côté client et restent **alignés** avec la journalisation backend existante ; la story **4.4** rend cette corrélation **exploitable** côté UI/diagnostics (attribut `data-*`, affichage dev, ou copie courte documentée — **à trancher dans l'implémentation** mais **obligatoire** : au moins une assertion de test sur la présence du lien UI ↔ `correlationId` retourné par `fetchLiveSnapshot`). [Source : OpenAPI / story 4.3 ; `contracts/openapi/recyclique-api.yaml`]

## Tasks / Subtasks

- [x] **Alignement visuel et sémantique avec le runtime 3.6** (AC: 1, 2)
  - [x] Pour chaque état d'échec / dégradation du **widget** `bandeau-live`, exposer des **attributs `data-`** cohérents avec `PageRenderer` / `WidgetResolveFallback` : au minimum `data-runtime-severity`, `data-runtime-code` (codes **stables** préfixés `BANDEAU_LIVE_*` ou réutilisation des codes existants), `data-bandeau-state` déjà présent — documenter la grille dans `peintre-nano/src/domains/bandeau-live/README.md`.
  - [x] Vérifier les états : `loading`, `error`, `degraded`, `live`, `unavailable` (statique sans snapshot) ; ajouter **`reportRuntimeFallback`** là où un échec est **visible** mais **pas encore** signalé (ex. branche `catch` générique dans `BandeauLiveLive` après 4.3, chemin `unavailable` sans live source ni snapshot).

- [x] **Traçabilité `correlationId` sur échecs live** (AC: 2, 4)
  - [x] Conserver le `correlationId` dans l'état React en cas d'échec HTTP/parse/réseau ; l'afficher ou le refléter en **`data-correlation-id`** sur le conteneur d'erreur (politique : **toujours en DOM** pour outils support ; libellé opérateur optionnel type « Réf. technique : … » si le produit le valide, sinon seulement `data-*` + dev).
  - [x] Ne **pas** dupliquer la logique de génération d'ID : réutiliser celui renvoyé par `fetchLiveSnapshot`.

- [x] **Scénarios slice + manifests CREOS** (AC: 1, 3)
  - [x] Ajouter ou étendre les **tests** (Vitest) pour prouver : composition **bac à sable** `navigation-bandeau-live-slice` + `page-bandeau-live-sandbox` avec **variante** manifest (fixture de test ou JSON dérivé) qui force un **échec bandeau** tout en laissant un **widget voisin** (ex. `demo.text.block` / `demo.list.simple`) **rendu** — sans casser le manifest **reviewable** canonique sous `contracts/creos/manifests/` (préférer **clone en mémoire** dans le test, comme pour les scénarios d'erreur existants).
  - [x] Couvrir au moins : **widget inconnu** dans un slot du slice (si pertinent pour la démo Epic 4) **ou** **props bandeau** incohérentes menant à un état **rejeté visible** ; s'aligner sur les **tests contrat** `peintre-nano/tests/contract/creos-bandeau-live-manifests-4-1.test.ts` (ne pas affaiblir les garde-fous 4.1).

- [x] **Tests unitaires / e2e jsdom** (AC: 1–4)
  - [x] Étendre `bandeau-live-live-source.test.tsx` et/ou `bandeau-live-sandbox-compose.e2e.test.tsx` : assertions sur **`data-runtime-code`**, **`correlationId`** présent sur panneau d'erreur, `reportRuntimeFallback` appelé avec la **bonne charge** (`vi.spyOn` — pattern déjà utilisé dans l'e2e bac à sable).
  - [x] Cas nominal inchangé : snapshot statique + chemin live 200 **non régressés**.

- [x] **Documentation** (AC: 3)
  - [x] Mettre à jour `peintre-nano/src/domains/bandeau-live/README.md` : tableau **états × sévérité × codes × traçabilité** ; lien vers `runtime/README.md` (story 3.6).

## Dev Notes

### Garde-fous architecture

- **Hiérarchie de vérité** : pas de règles métier F1–F6 recalculées côté frontend ; les messages d'échec **décrivent** la limite du signal, ils **n'inventent** pas l'état caisse. [Source : `architecture/navigation-structure-contract.md` si présent dans planning-artifacts]
- **`data_contract.operation_id`** : conserver **`recyclique_exploitation_getLiveSnapshot`** (règle B4). [Source : `contracts/README.md`]
- **Frontières** : code sous `peintre-nano/` ; pas d'`import` runtime depuis `references/`.
- **Réutiliser** `reportRuntimeFallback` (`peintre-nano/src/runtime/report-runtime-fallback.ts`) — **ne pas** introduire un second bus d'événements pour ce slice.

### Périmètre explicite (ne pas faire)

- **Pas** de recomposition **dashboard** transverse ni d'**UI admin** (Epic 5 ; toggle = **Story 4.5**).
- **Pas** de gate **E2E prod** unique « chaîne complète » comme substitut aux tests ciblés (**Story 4.6**).
- **Pas** d'élargissement de la taxonomie globale des erreurs au-delà de ce qui est **nécessaire** pour le slice bandeau (éviter les refactors massifs de `PageRenderer` sauf extraction **minimale** justifiée et testée).

### Structure projet et fichiers typiques à toucher

| Zone | Fichiers / dossiers |
|------|---------------------|
| Widget | `peintre-nano/src/domains/bandeau-live/BandeauLive.tsx`, `BandeauLive.module.css` |
| Client live | `peintre-nano/src/api/live-snapshot-client.ts` (si besoin d'exposer plus d'info d'échec sans casser le type `FetchLiveSnapshotResult`) |
| Normalisation | `peintre-nano/src/domains/bandeau-live/live-snapshot-normalize.ts` |
| Runtime | `peintre-nano/src/runtime/report-runtime-fallback.ts` (lecture seule sauf évolution **justifiée** partagée) |
| Composition | `peintre-nano/src/app/PageRenderer.tsx` (lecture seule sauf harmonisation **minime** avec l'équipe / tests) |
| Manifests reviewables | `contracts/creos/manifests/*.json` — **préserver** ; variantes = **fixtures tests** |
| Tests | `peintre-nano/tests/unit/bandeau-live-*.tsx`, `peintre-nano/tests/e2e/bandeau-live-sandbox-compose.e2e.test.tsx`, `peintre-nano/tests/contract/creos-bandeau-live-manifests-4-1.test.ts` |
| Backend | `recyclique/api/...` — **seulement** si un trou de corrélation ou de log est identifié ; sinon hors scope |

### Intelligence story précédente (4.3)

- `fetchLiveSnapshot` : UUID **`X-Correlation-ID`** par requête ; `reportRuntimeFallback` déjà appelé pour `http` / `parse` / `network` avec codes `BANDEAU_LIVE_HTTP_ERROR`, `BANDEAU_LIVE_PARSE_ERROR`, `BANDEAU_LIVE_NETWORK_ERROR`.
- **Lacunes connues pour 4.4** : le `catch` générique (hors `AbortError`) ne journalise pas ; l'UI erreur n'affiche pas le `correlationId` ; le chemin `unavailable` (pas de snapshot, pas de `use_live_source`) n'appelle pas `reportRuntimeFallback`.
- États `data-bandeau-state` déjà utilisés : `loading`, `error`, `degraded`, `live`, `unavailable`.

### Intelligence story 3.6 (runtime global)

- Référence **`WidgetResolveFallback`** : `data-runtime-severity="degraded"`, `data-runtime-code`, `reportRuntimeFallback` au montage. Le bandeau live doit **parler la même langue** pour les outils et les tests.
- Table des sévérités : `peintre-nano/src/runtime/README.md`.

### Références

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.4 ; FR18, FR19, FR61, FR62 ; UX-DR8, UX-DR10, UX-DR15]
- [Source : `_bmad-output/implementation-artifacts/4-3-brancher-la-source-backend-reelle-et-les-cas-douverture-decalee.md`]
- [Source : `_bmad-output/implementation-artifacts/3-6-rendre-visibles-les-fallbacks-et-rejets-de-runtime.md`]
- [Source : `contracts/creos/manifests/navigation-bandeau-live-slice.json`, `page-bandeau-live-sandbox.json`, `widgets-catalog-bandeau-live.json`]
- [Source : `contracts/openapi/recyclique-api.yaml` — `/v2/exploitation/live-snapshot`, `X-Correlation-ID`]

### Contexte projet (`project-context.md`)

- Aucun `project-context.md` trouvé à la racine du dépôt pour cette story ; s'appuyer sur les artefacts ci-dessus et `references/index.md` si besoin.

## Dev Agent Record

### Agent Model Used

Composer (agent dev BMAD dev-story), session 2026-04-07.

### Debug Log References

_(aucun blocage)_ — le cas « catch » générique est couvert en test via un port auth qui lève avant `fetch`, car un `fetch` qui rejette est déjà normalisé en `BANDEAU_LIVE_NETWORK_ERROR` dans `fetchLiveSnapshot`.

### Completion Notes List

- `BandeauLive` : `data-runtime-severity` / `data-runtime-code` sur tous les états listés ; `BANDEAU_LIVE_RUNTIME_CODES` ; `data-correlation-id` + libellé dev « Réf. technique » sur erreurs live avec ID ; `reportRuntimeFallback` pour `unavailable`, `degraded` vide (une fois par phase), `catch` inattendu.
- E2E : doubles `main` en fixture mémoire (bandeau indisponible + `demo.text.block`) ; allowlist étendue en test uniquement pour `fixture.unknown.widget` + `UNKNOWN_WIDGET_TYPE` sans toucher aux JSON canoniques.
- Vitest : 126 tests ; pytest `tests/test_reception_live_stats.py` OK (non modifié, gate de non-régression).

### File List

- `peintre-nano/src/domains/bandeau-live/BandeauLive.tsx`
- `peintre-nano/src/domains/bandeau-live/README.md`
- `peintre-nano/tests/unit/bandeau-live-live-source.test.tsx`
- `peintre-nano/tests/unit/bandeau-live-widget.test.tsx`
- `peintre-nano/tests/e2e/bandeau-live-sandbox-compose.e2e.test.tsx`
- `_bmad-output/implementation-artifacts/4-4-rendre-visibles-les-fallbacks-et-rejets-du-slice-bandeau-live.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/tests/test-summary.md`

## Change Log

- **2026-04-07** — Implémentation story 4.4 (fallbacks visibles, corrélation, tests fixtures, README) ; statut → `review`.
- **2026-04-07** — QA : assertions parse/réseau pour `data-correlation-id` et charge `reportRuntimeFallback` ; `test-summary.md` ; Story Runner : gates + CR PASS ; statut → `done`.

## Git intelligence (session create-story)

Derniers commits observés sur la branche locale : alignement Docker / peintre-nano ; jalons Epic 1–2. La livraison **4.3** (bandeau + client live) est documentée dans le fichier story 4.3 et le statut sprint ; pas d'hypothèse sur SHA non présent dans le dépôt.

---

**Story completion status** : **done** — gates + QA + code-review (Story Runner PASS, 2026-04-07).

_Ultimate context engine analysis completed — comprehensive developer guide created._
