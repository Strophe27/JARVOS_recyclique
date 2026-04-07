# Story 4.3 : Brancher la source backend réelle et les cas d'ouverture décalée

Status: done

<!-- Note : validation optionnelle — validate-create-story avant dev-story. -->

## Story

En tant que **module live orienté opérateur**,  
je veux que le **`bandeau live`** consomme les **signaux d'exploitation réellement portés par le backend**,  
afin que l'état affiché reflète **honnêtement** les horaires d'ouverture, les **ouvertures décalées** et les **cas particuliers**, sans logique métier « devinée » côté frontend.

## Acceptance Criteria

1. **Source autoritative backend** — Étant donné que le backend expose la surface minimale live (Epic 2 / Story 2.7, `GET /v2/exploitation/live-snapshot`), quand `bandeau live` consomme cette source, alors le module **s'appuie sur l'état opérationnel fourni par le serveur** (schéma `ExploitationLiveSnapshot`) plutôt que sur une reconstruction locale des règles métier ; et l'affichage reste **cohérent** avec le contexte actif et les permissions en vigueur (401/403/503 gérés sans prétendre un état sain). [Source : `_bmad-output/planning-artifacts/epics.md` — Story 4.3 ; `contracts/openapi/recyclique-api.yaml`]

2. **Ouvertures décalées et cas particuliers (UX-DR15)** — Étant donné que le terrain exige ouvertures décalées et exceptions, quand l'état live est évalué côté serveur, alors le module **distingue** au minimum les scénarios reflétés par le contrat (ex. `effective_open_state` incluant `delayed_open` / `delayed_close` quand le backend les calcule, vs `open` / `closed` / `unknown` / `not_applicable`) **sans** réduire tout à une fiction « caisse du jour » ; et il **n'affiche pas** un état « actif » trompeur lorsque la fenêtre d'ouverture ne le justifie pas (la vérité vient du payload, pas d'heuristiques client). [Source : epics.md — Story 4.3 ; YAML `ExploitationLiveSnapshot.effective_open_state` ; PRD/UX AR44, UX-DR15 cités dans OpenAPI]

3. **Données incomplètes ou ambiguës** — Étant donné que des données contextuelles peuvent être incomplètes, quand le backend renvoie un snapshot **dégradé** (champs absents, `null`, résumés sync absents, `cash_session_effectiveness: unknown` en contexte restreint, etc.), alors le module présente un **état contraint ou dégradé lisible** plutôt qu'une certitude inventée ; l'opérateur comprend que l'information est **limitée**. [Source : epics.md — Story 4.3 ; artefact `references/artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md` §6 null/absence]

4. **Convergence 2 — polling, corrélation, journalisation** — Étant donné que le gate Convergence 2 / décision directrice exige une preuve bout-en-bout vérifiable, quand le widget déclare un `data_contract` avec `refresh: polling` (catalogue CREOS `widgets-catalog-bandeau-live.json`), alors le client **applique** le rafraîchissement selon `polling_interval_s` (**30 s** dans le manifest actuel, ou défaut documenté si le manifest est ajusté dans la même story) ; chaque requête vers `recyclique_exploitation_getLiveSnapshot` inclut un en-tête canonique **`X-Correlation-ID`** (valeur stable par « session » de poll ou **UUID / idempotence par tick** — à documenter dans le code et README domaine, mais **obligatoire** sur les appels réseau) ; le backend **journalise** déjà la corrélation sur ce flux (`exploitation.py` — conserver / étendre si besoin sans casser les tests 2.7). **Erreur HTTP**, **timeout** ou **payload JSON invalide** sur cet endpoint : affichage d'un **échec visible** (message dégradé minimal **sans masquer** l'échec) — la **politique unifiée** de fallbacks runtime (sévérités, `reportRuntimeFallback`, copie opérateur) est **Story 4.4**. [Source : epics.md — Story 4.3 (dernier bloc AC) ; `contracts/creos/manifests/widgets-catalog-bandeau-live.json` ; `recyclique/api/.../exploitation.py`]

## Tasks / Subtasks

- [x] **Client HTTP minimal aligné OpenAPI** (AC: 1, 4)
  - [x] Implémenter un appel `GET` vers `/v2/exploitation/live-snapshot` en **same-origin** : en dev Docker / Vite, s'appuyer sur le **proxy** existant (`peintre-nano/vite.config.ts` — préfixe `/api` réécrit vers le backend) ; documenter la **base URL** effective (variable d'env ou convention `/api` + chemin v2). [Source : `peintre-nano/vite.config.ts` ; `peintre-nano/README.md`]
  - [x] Auth : **`credentials: 'include'`** si parcours **cookie** httpOnly (`bearerOrCookie` OpenAPI) ; si le stockage **Bearer** est déjà présent côté adaptateur auth, l'envoyer en `Authorization` — **ne pas** dupliquer la logique d'autorisation : réutiliser / étendre la façade `AuthContextPort` ou un **petit module `api-client`** sous `peintre-nano/src/` (nouveau fichier acceptable) partagé pour les futurs widgets. [Source : OpenAPI `security` ; story 3.4 — `auth-context-port.ts`]
  - [x] Parser la réponse en **`ExploitationLiveSnapshot`** via types générés `contracts/openapi/generated/recyclique-api.ts` ; valider les champs minimaux nécessaires au rendu ou accepter partiellement avec branche dégradée (AC 3). [Source : story 4.2 — pas de duplication de schéma]

- [x] **Polling piloté par `data_contract`** (AC: 4)
  - [x] Lire `polling_interval_s` depuis la déclaration widget (catalogue reviewable **ou** props passées par le runtime si le moteur ingère le catalogue — **éviter** la magie : soit le `PageRenderer` / couche composition fournit `refreshIntervalS` + `liveEndpointConfigured`, soit `BandeauLive` lit un contrat injecté depuis le manifest page/slot). L'alignement **strict** avec `widgets-catalog-bandeau-live.json` (**30**) est attendu. [Source : `widgets-catalog-bandeau-live.json`]
  - [x] `setInterval` / `AbortController` : annuler les requêtes en cours au **démontage** du widget ; éviter les courses (dernier résultat gagne ou ignore si démonté). [Source : bonnes pratiques React]

- [x] **`X-Correlation-ID`** (AC: 4)
  - [x] Générer ou réutiliser un id par requête (recommandé : **UUID v4** par tick de poll, ou id stable session + suffixe séquentiel — **documenter** le choix dans `peintre-nano/src/domains/bandeau-live/README.md`).
  - [x] Vérifier que les tests backend existants (`test_live_snapshot_accepts_x_correlation_id_header`) restent pertinents ; pas d'exiger de changement backend sauf trou de corrélation découvert. [Source : `recyclique/api/tests/test_exploitation_live_snapshot.py`]

- [x] **Intégration widget `BandeauLive`** (AC: 1–3)
  - [x] Étendre `BandeauLive` (ou **wrapper** dédié enregistré sous la même clé `bandeau-live`) : mode **données live** quand `widget_props` **ne fournit pas** de `snapshot` statique **ou** qu'une clé explicite active le fetch (ex. `widget_props.use_live_source: true` pour les pages bac à sable branchées API — à trancher de façon **testable** et documentée). **Préserver** le comportement 4.2 : fixture / démo avec `snapshot` injecté **sans** appel réseau. [Source : story 4.2 — Completion Notes]
  - [x] Réutiliser `snapshotFromWidgetProps` pour le chemin statique ; pour le chemin API, mapper le JSON réponse vers la même forme consommée par le rendu (snake_case API vs normalisation existante camelCase). [Source : `BandeauLive.tsx`]
  - [x] Rendu des états `delayed_open` / `delayed_close` : libellés ou badges **distincts** des états nominal `open`/`closed` (texte accessible, pas seulement couleur). [Source : UX-DR15]

- [x] **Erreurs réseau / HTTP / parse** (AC: 4, lien 4.4)
  - [x] Sur échec : état UI explicite (ex. « Live indisponible », code HTTP optionnel en mode dev, corrélation affichable en debug seulement si convention projet) — **pas** de bandeau vert « tout va bien ».
  - [x] Optionnel dans 4.3 : appeler `reportRuntimeFallback` avec un code stable pour tracer l'échec — si fait, rester **minimal** ; l'unification est **4.4**. [Source : `peintre-nano/src/runtime/report-runtime-fallback.ts`]

- [x] **Tests** (AC: 1–4)
  - [x] Vitest : mocker `fetch` — succès 200 avec snapshot représentatif (**delayed_open**, dégradé partiel) ; 401/503 ; JSON invalide ; vérifier présence du header `X-Correlation-ID` sur les appels mockés.
  - [x] Ne pas casser `creos-bandeau-live-manifests-4-1.test.ts`, tests OpenAPI gouvernance, `bandeau-live-widget.test.tsx` (chemin snapshot statique).
  - [x] Documenter dans README domaine comment lancer **API + peintre** via `docker-compose` racine pour test manuel (référence `references/artefacts/` ou `docker-compose.yml` selon doc existante). [Source : `guide-pilotage-v2.md` — tests]

- [x] **Documentation** (AC: 4)
  - [x] Mettre à jour `peintre-nano/src/domains/bandeau-live/README.md` : flux live vs statique, polling, corrélation, variables d'env, limite **4.4** / **4.5**.

## Dev Notes

### Garde-fous architecture

- **Hiérarchie de vérité** : le frontend **affiche** ; le backend **calcule** `effective_open_state`, agrégats, sync — pas de réimplémentation des règles F1–F6 côté Peintre_nano. [Source : `_bmad-output/planning-artifacts/architecture/navigation-structure-contract.md`]
- **`data_contract.operation_id`** : doit rester **`recyclique_exploitation_getLiveSnapshot`** (règle B4 — pas de renommage sans PR conjointe). [Source : `contracts/README.md`]
- **Frontières repo** : code sous `peintre-nano/` ; pas d'`import` runtime depuis `references/`. [Source : `project-structure-boundaries.md`]

### Périmètre explicite (ne pas faire)

- **Pas** de recomposition **dashboard** ni d'**UI admin** pour toggles (Epic 5 / **Story 4.5**).
- **Pas** de politique complète des fallbacks / sévérités / messages opérateur (**Story 4.4**) — seulement échec **visible** et non trompeur.
- **Pas** d'E2E « chaîne complète » nominale comme gate unique (**Story 4.6**) ; 4.3 peut préparer des hooks testables.

### Structure projet et fichiers typiques à toucher

| Zone | Fichiers / dossiers |
|------|---------------------|
| Widget / fetch | `peintre-nano/src/domains/bandeau-live/BandeauLive.tsx`, éventuellement `useLiveSnapshot.ts` ou `live-snapshot-client.ts` |
| Auth / API | `peintre-nano/src/app/auth/*`, nouveau petit client sous `peintre-nano/src/api/` ou `runtime/` selon conventions existantes |
| Manifests | `contracts/creos/manifests/page-bandeau-live-sandbox.json` (optionnel : `widget_props.use_live_source`) — **ne pas** casser les tests 4.1 |
| Types | `contracts/openapi/generated/recyclique-api.ts` (lecture seule sauf regen YAML) |
| Backend | `recyclique/api/.../exploitation.py`, `exploitation_live_snapshot_service.py` — **changement seulement si** nécessaire pour corrélation/logs ; tests pytest associés |
| Tests | `peintre-nano/tests/unit/`, éventuellement extension E2E jsdom |

### Intelligence story précédente (4.2)

- Widget enregistré **`bandeau-live`** ; données via `widget_props.snapshot` pour démo ; **4.3** ajoute le **fetch réel** + polling + corrélation.
- `BandeauLive` accepte déjà snake_case / camelCase pour snapshot injecté — réutiliser pour la réponse HTTP. [Source : `_bmad-output/implementation-artifacts/4-2-implementer-le-widget-bandeau-live-dans-le-registre-peintre-nano.md`]

### Intelligence story 4.1 / contrats

- Catalogue : `polling_interval_s: 30`, `operation_id`, `endpoint_hint`. [Source : `widgets-catalog-bandeau-live.json`]
- OpenAPI documente `X-Correlation-ID`, réponses 401/403/503, `RecycliqueApiError.correlation_id`. [Source : `recyclique-api.yaml`]

### Références

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.3 ; Stories 4.4–4.6]
- [Source : `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — Convergence 2, emplacements tests]
- [Source : `_bmad-output/implementation-artifacts/4-1-…`, `4-2-…`]
- [Source : `contracts/openapi/recyclique-api.yaml` — `/v2/exploitation/live-snapshot`]
- [Source : `references/artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md`]
- [Source : `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` — B4, D7]

### Contexte projet (`project-context.md`)

- Aucun `project-context.md` trouvé à la racine du dépôt ; s'appuyer sur les artefacts ci-dessus et `references/index.md` si besoin.

## Dev Agent Record

### Agent Model Used

Composer (agent dev-story / sous-agent Task Story Runner), 2026-04-07.

### Debug Log References

_(aucun blocage — `window.matchMedia` mocké dans les tests unitaires live source pour Mantine `RootProviders`.)_

### Completion Notes List

- Client `fetchLiveSnapshot` : `GET` same-origin `VITE_RECYCLIQUE_API_PREFIX` (défaut `/api`) + `/v2/exploitation/live-snapshot`, `credentials: 'include'`, `X-Correlation-ID` UUID v4 par requête, `Authorization` si `AuthContextPort.getAccessToken` est défini.
- `widget_props.use_live_source === true` active le polling (intervalle `polling_interval_s` ou `refreshIntervalS`, défaut 30 s) ; sinon chemin statique 4.2 inchangé (pas de fetch si snapshot injecté).
- États `delayed_open` / `delayed_close` : libellés français distincts + `data-effective-open-state` ; états open nominal affichés en « Ouvert (effectif) » (tests unitaires / e2e mis à jour sur attributs / libellé).
- Échecs HTTP / parse / réseau : UI « Live indisponible », HTTP en dev ; `reportRuntimeFallback` minimal (`BANDEAU_LIVE_*`).
- Réponse 200 sans signaux exploitables : bandeau `data-bandeau-state="degraded"` + message de limitation (AC3).
- Vitest `bandeau-live-live-source.test.tsx` : corrélation + Bearer, `delayed_open`, 503, 401, JSON invalide, corps vide dégradé.
- Normalisation snapshot extraite dans `live-snapshot-normalize.ts` ; `pytest tests/test_exploitation_live_snapshot.py` : 8 passed. Gate parent `pytest tests/test_reception_live_stats.py` : tables SQLite réception + `SaleItem` dans `conftest` ; correctifs tests (`items_received`, `SaleItem` champs requis, flush `cash_session_id`) — **16 passed** ; `reception.py` : `items_received=0` quand flag désactivé.

### File List

- `peintre-nano/src/api/live-snapshot-client.ts` (nouveau)
- `peintre-nano/src/domains/bandeau-live/live-snapshot-normalize.ts` (nouveau)
- `peintre-nano/src/domains/bandeau-live/BandeauLive.tsx`
- `peintre-nano/src/domains/bandeau-live/BandeauLive.module.css`
- `peintre-nano/src/domains/bandeau-live/README.md`
- `peintre-nano/src/app/auth/auth-context-port.ts`
- `peintre-nano/src/app/auth/mock-auth-adapter.ts`
- `peintre-nano/src/app/auth/AuthRuntimeProvider.tsx`
- `peintre-nano/tests/unit/bandeau-live-live-source.test.tsx` (nouveau)
- `peintre-nano/tests/unit/bandeau-live-widget.test.tsx`
- `peintre-nano/tests/e2e/bandeau-live-sandbox-compose.e2e.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `recyclique/api/tests/conftest.py`, `recyclique/api/tests/test_reception_live_stats.py`, `recyclique/api/src/recyclic_api/api/api_v1/endpoints/reception.py` (gate + cohérence `items_received`)
- `_bmad-output/implementation-artifacts/tests/test-summary.md` (synthèse QA)

## Change Log

| Date | Résumé |
|------|--------|
| 2026-04-07 | CS bmad-create-story : story 4.3 rédigée, statut **ready-for-dev**, sprint-status mis à jour. |
| 2026-04-07 | DS bmad-dev-story : implémentation client live + polling + corrélation + tests Vitest ; statut **review**. |
| 2026-04-07 | Story Runner : gates CS→VS→DS→QA→CR **PASS** ; `sprint-status` **done** pour 4.3. |

---

**Story completion status** : **done** — gates verts, revue code mergeable.
