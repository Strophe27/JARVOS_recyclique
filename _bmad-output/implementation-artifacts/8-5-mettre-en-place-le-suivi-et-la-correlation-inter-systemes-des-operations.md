# Story 8.5 : Mettre en place le suivi et la corrélation inter-systèmes des opérations

Status: done

**Story ID :** 8.5  
**Story key :** `8-5-mettre-en-place-le-suivi-et-la-correlation-inter-systemes-des-operations`  
**Epic :** 8 — Fiabiliser l'articulation comptable réelle avec Paheko

<!-- Ultimate context engine analysis completed — BMAD bmad-create-story (create) 2026-04-10. FR28 / NFR8 / NFR10 ; corrélation bout-en-bout Recyclique ↔ Paheko ; pas de reconstruction manuelle fragile. -->

## Story Preparation Gate (obligatoire — exécution DS)

| Dimension | Valeur figée pour 8.5 |
|-----------|------------------------|
| **Slice opérationnel** | Même périmètre **8.1–8.4** par défaut : outbox **`cash_session_close`** (`PahekoOutboxOperationType.CASH_SESSION_CLOSE`). Toute extension à d'autres `operation_type` = **hors DoD** sauf décision explicite de gouvernance. |
| **Prérequis livrés** | **8.1** outbox + enqueue ; **8.2** idempotence, retries, `SyncStateCore` ; **8.3** mapping site/caisse ; **8.4** quarantaine, résolution manuelle, table **`paheko_outbox_sync_transitions`** avec `correlation_id` déjà copié depuis l’item. |
| **Objectif 8.5** | Rendre la **chaîne support/supervision** **exploitable** : un même **`correlation_id`** (et métadonnées minimales stables) relie **fermeture terrain** → **ligne outbox** → **tentatives HTTP Paheko** → **transitions / quarantaine / résolution**, **sans** dépendre d’une reconstitution ad hoc (grep de logs seuls). |
| **Hors périmètre** | **8.6** (blocage sélectif) — pas d’implémentation du moteur de gating ; **8.7** (validation réconciliation bout-en-bout) — peut **réutiliser** les sémantiques de corrélation livrées ici ; **UI Peintre** — pas de source de vérité métier ; éventuel **affichage thin** via API seulement si déjà dans les patterns admin existants. |
| **Principe non négociable** | **Backend autoritaire** ; **Peintre n’est pas la SoT** ; **brownfield-first** : étendre modèles / OpenAPI / endpoints existants sans casser les `operationId` ni les contrats **8.1–8.4**. |

## Story

En tant qu’**équipe support et supervision**,

je veux que les opérations synchronisées soient **traçables** entre **Recyclique** et **Paheko**,

afin que les incidents puissent être **suivis de bout en bout** sans reconstitution approximative (**FR28**, **NFR8**, **NFR10**).

## Contraintes produit et architecture (non négociables)

- **Brownfield-first** : réutiliser et **harmoniser** le **`correlation_id`** déjà présent sur `PahekoOutboxItem`, propagé vers **`PahekoOutboxSyncTransition`**, et envoyé côté Paheko en en-tête (**`X-Correlation-ID`** dans `paheko_accounting_client`).
- **Lien terrain → intégration** : la clôture caisse (`cash_session_closing` / `cash_session_service`) accepte déjà un `sync_correlation_id` (sinon UUID) — **8.5** doit garantir que ce fil est **consultable** et **filtrable** côté API admin / exploitation, pas seulement présent en base.
- **Pas de reconstruction fragile** : exposer des **points d’entrée API documentés** (ex. recherche par `correlation_id`, agrégat « vue ligne de vie ») plutôt que d’exiger du support l’assemblage manuel de plusieurs IDs opaques.
- **Cohérence du cycle de vie** : aux étapes **émission, retry, quarantaine, levée, résolution, rejet, livraison**, le **`correlation_id`** et les **métadonnées contextuelles minimales** (ex. `cash_session_id`, `site_id`, `operation_type`, états `sync_state_core` / `outbox_status`, dernier `last_http_status` / code erreur structuré) restent **alignés** et **explicites** dans les réponses OpenAPI pertinentes.
- **AR39** : schémas publics = **`contracts/openapi/recyclique-api.yaml`** (+ génération TS si pipeline repo) ; ne pas renommer les `operationId` existants des stories 8.x sans migration rétro-compatible documentée.

## État des lieux code (post 8.4)

- **`PahekoOutboxItem.correlation_id`** (indexé) — créé à l’enqueue (`paheko_outbox_service`).
- **Clôture session** : `enqueue_cash_session_close_outbox(..., correlation_id=cid)` avec `cid` issu de `sync_correlation_id` ou UUID (`cash_session_service`).
- **Client HTTP Paheko** : `X-Correlation-ID` aligné sur cet identifiant (`paheko_accounting_client`).
- **Audit 8.4** : `PahekoOutboxSyncTransition.correlation_id` + `context_json` ; endpoints liste / détail outbox enrichis (`recent_sync_transitions`, etc.).
- **Gap 8.5** : absence typique d’une **vue unifiée** ou d’un **filtrage admin** par `correlation_id` ; réponse de **clôture caisse** / **session** peut ne pas **surfacer** explicitement le lien `correlation_id` ↔ `paheko_outbox_item_id` pour le support ; **identifiants côté Paheko** (si renvoyés dans le corps ou les en-têtes de réponse) peuvent ne pas être **persistés** de façon structurée — à traiter si le contrat Paheko le permet, sans bloquer le reste du slice.

## Acceptance Criteria

1. **Corrélation et métadonnées sur le cycle de vie** — Étant donné que le support doit comprendre un flux multi-étapes, quand une opération est **émise**, **retentée**, placée en **quarantaine**, **levée**, **résolue**, **rejetée** ou **livrée**, alors les enregistrements exposés via l’**API** (outbox list/detail, transitions sync, et tout endpoint d’investigation ajouté) portent un **`correlation_id` commun** et suffisamment de **métadonnées contextuelles** pour suivre le chemin **sans ambiguïté** entre les étapes importantes. [Sources : `epics.md` 8.5 AC bloc 1 ; **FR28** ; **NFR10**]

2. **Lien histoire terrain ↔ tentatives d’intégration** — Étant donné que les vues comptables et terrain peuvent **temporairement diverger**, quand un utilisateur **habilité** enquête sur un écart de sync, alors le système offre un **chemin clair** pour relier l’**historique terrain pertinent** (ex. session caisse clôturée, identifiants stables Recyclique) aux **tentatives d’intégration Paheko** (ligne outbox, états, erreurs, audit), **sans** procédure de reconstitution manuelle fragile (copier-coller multiple d’IDs non documentés, déduction depuis seuls les logs applicatifs). [Sources : `epics.md` 8.5 AC bloc 2 ; **NFR8**]

3. **Baseline d’observabilité pour l’avenir** — Étant donné qu’Epic 8 vise l’**opérabilité** au-delà des mécaniques backend, quand la story est **terminée**, alors le support et de **futurs écrans admin** peuvent s’appuyer sur des **sémantiques de corrélation stables** (nom de champ, filtres, agrégats documentés) réutilisables pour la **reporting** et la supervision ultérieure, **sans** nouvelle définition ad hoc par écran. [Sources : `epics.md` 8.5 AC bloc 3]

4. **OpenAPI et non-régression contractuelle** — Étant donné **AR39** et les livraisons **8.1–8.4**, quand les évolutions sont publiées, alors **`contracts/openapi/recyclique-api.yaml`** décrit les **nouveaux** champs / endpoints / paramètres de filtre **sans** second contrat HTTP parallèle ; les **`operationId`** existants cités en **8.4** (clôture caisse, outbox list/get, exploitation snapshot, reject, lift-quarantine, confirm-resolved, sync-transitions) **ne sont pas cassés** ; évolutions = **rétro-compatibles** ou versionnement cohérent avec la politique repo.

5. **Tests** — Étant donné les scénarios ci-dessus, quand la suite ciblée s’exécute, alors des tests **pytest** vérifient au minimum : **cohérence** du `correlation_id` à travers enqueue → processor (mock Paheko) → au moins une **transition** auditée ; **recherche ou agrégat** par `correlation_id` (selon design retenu) ; **non-régression** des flux **8.2 / 8.3 / 8.4** sur le slice clôture.

6. **Registre Epic 8** — Étant donné la méthode des epics 8.x, quand l’implémentation progresse, alors `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md` est **mis à jour** (sémantique corrélation, endpoints, lien contrat minimal si § dédié, commande pytest ciblée si suite globale KO).

## Tasks / Subtasks

- [x] **Cartographier les points de vérité** — Lister tous les endroits où `correlation_id` est créé, propagé, loggé ou exposé (middleware requête, clôture, outbox, processor, client Paheko, transitions) ; identifier les **trous** côté API support. (AC : 1, 2)

- [x] **Modèle / persistance (si nécessaire)** — Si le contrat Paheko ou les réponses HTTP fournissent un **identifiant distant exploitable**, définir persistance structurée (colonne dédiée ou `context_json` / payload **documenté**) — sinon documenter explicitement l’**absence** et s’appuyer sur `correlation_id` + `last_response_snippet` dans les limites **NFR**. (AC : 1, 2)

- [x] **API admin / exploitation** — Concevoir et implémenter au moins une capacité **documentée** parmi : filtre **`correlation_id`** sur la liste outbox ; endpoint **« timeline »** ou **get-by-correlation** agrégeant item + transitions ; enrichissement **réponse clôture session** / **détail cash session** avec `correlation_id` + `paheko_outbox_item_id` (ou lien hypermédia cohérent avec le style existant). Permissions alignées **1.3** / patterns admin existants. (AC : 1, 2, 4)

- [x] **OpenAPI + schémas Pydantic** — Mettre à jour schémas et exemples ; pas de duplication sémantique contradictoire entre list/detail. (AC : 4)

- [x] **Tests** — Nouveau fichier dédié ou extension `test_story_8_5_*.py` ; mocks Paheko inchangés en principe. (AC : 5)

- [x] **Registre + index** — Mise à jour registre Epic 8 + `references/artefacts/index.md` si nouveau paragraphe significatif. (AC : 6)

## Dev Notes

### Notes structure projet

- Code applicatif backend : racine paquet `recyclique/api/src/recyclic_api/` (chemins du tableau « Fichiers et modules probables » relatifs à ce paquet sauf mention contraire).
- Contrats HTTP publics : `contracts/openapi/recyclique-api.yaml` (+ génération TS du dépôt si le pipeline l’exige).

### operationId figés (non-régression Epic 8)

Ne pas renommer sans migration documentée : `recyclique_cashSessions_closeSession`, `recyclique_pahekoOutbox_listItems`, `recyclique_pahekoOutbox_getItem`, `recyclique_pahekoOutbox_rejectItem`, `recyclique_pahekoOutbox_listItemSyncTransitions`, `recyclique_pahekoOutbox_liftQuarantineToRetry`, `recyclique_pahekoOutbox_confirmResolvedFromDelivered`, `recyclique_exploitation_getLiveSnapshot`, `recyclique_exploitation_patchBandeauLiveSlice` ; côté mapping **8.3** : `recyclique_pahekoMapping_listCashSessionCloseMappings`, `recyclique_pahekoMapping_createCashSessionCloseMapping`, `recyclique_pahekoMapping_updateCashSessionCloseMapping`. **Story 8.5** ajoute `recyclique_pahekoOutbox_getCorrelationTimeline` (à traiter comme stable pour les clients).

### Fichiers et modules probables

| Zone | Fichiers (indicatif) |
|------|----------------------|
| Clôture / session | `application/cash_session_closing.py`, `services/cash_session_service.py` |
| Outbox | `models/paheko_outbox.py`, `services/paheko_outbox_service.py`, `services/paheko_outbox_processor.py` |
| Client Paheko | `services/paheko_accounting_client.py` |
| Audit | `models/paheko_outbox_sync_transition.py`, `services/paheko_outbox_transition_audit.py` |
| API | `api/api_v1/endpoints/admin_paheko_outbox.py`, `cash_sessions.py` (ou endpoint v2 exploitation si pattern existant) |
| Schémas | `schemas/paheko_outbox.py`, schémas session / clôture si enrichissement réponses |
| Contrat | `contracts/openapi/recyclique-api.yaml`, `contracts/openapi/generated/recyclique-api.ts` |

### Références techniques et produit

- `_bmad-output/planning-artifacts/epics.md` — Epic 8, Story 8.5 (source AC verbatim).
- `_bmad-output/implementation-artifacts/8-4-encadrer-la-quarantaine-et-la-resolution-manuelle-des-ecarts-persistants.md` — audit transitions, endpoints récents, file list.
- `_bmad-output/implementation-artifacts/8-2-*.md`, `8-3-*.md`, `8-1-*.md` — machine d’états, mapping, enqueue.
- `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` — corrélation, observabilité, § logs / audit si applicable.
- `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md` — registre Epic 8.
- `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` — Peintre sans logique comptable.

### Conformité architecture (extraits pertinents)

- **AR8** — Intégration Paheko via backend uniquement.
- **AR11** — Outbox durable ; ne pas perdre la lisibilité historique pour le support.
- **AR17** — Logs structurés et corrélation requête (**alignement** avec `X-Correlation-ID` vers Paheko).
- **AR24** — `Idempotency-Key` / unicité outbox inchangés.
- **AR39** — OpenAPI comme source reviewable des schémas publics.

## Exigences de test

- Pytest ciblé **8.5** + non-régression **8.1 / 8.2 / 8.3 / 8.4** sur le slice clôture.
- Si `pytest` complet du dépôt reste non vert (brownfield) : documenter la **commande exacte** du sous-ensemble dans le registre Epic 8.

## Definition of Done

- AC **1 à 6** satisfaits.
- Aucune régression sur les **`operationId`** et schémas publics des stories **8.1–8.4** sans note de migration.
- `sprint-status.yaml` : passage **in-progress** / **review** / **done** uniquement après **DS + gates + QA + CR** (hors périmètre **CS** — create-story).

## Dev Agent Record

### Agent Model Used

Composer (agent Task / bmad-dev-story), 2026-04-10.

### Debug Log References

— (aucun blocage ; pytest slice 8.1–8.5 OK).

### Completion Notes List

- Filtre query `correlation_id` sur `recyclique_pahekoOutbox_listItems` ; service `list_outbox_items` étendu.
- Nouveau `operationId` **`recyclique_pahekoOutbox_getCorrelationTimeline`** : `GET /v1/admin/paheko-outbox/by-correlation/{correlation_id}` → schéma **`PahekoOutboxCorrelationTimelineResponse`** (items + `sync_transitions` paginés via `transitions_skip` / `transitions_limit`).
- **`list_transitions_for_correlation`** sur `paheko_outbox_sync_transitions.correlation_id` ; **`get_outbox_item_for_cash_session`** pour lier session clôturée → outbox.
- Réponse **`POST .../close`** ( **`recyclique_cashSessions_closeSession`** inchangé) : champs optionnels **`paheko_sync_correlation_id`**, **`paheko_outbox_item_id`** sur `CashSessionResponse` (via `present_close_cash_session_outcome`).
- OpenAPI **0.1.15-draft** ; `npm run generate` → `contracts/openapi/generated/recyclique-api.ts`.
- Pas de migration SQL (colonnes `correlation_id` déjà indexées 8.1 / 8.4).
- Identifiant métier Paheko distant : inchangé (hors contrat garanti) — aligné décision story (corrélation locale comme clé support).

### File List

- `recyclique/api/src/recyclic_api/services/paheko_outbox_service.py`
- `recyclique/api/src/recyclic_api/services/paheko_outbox_transition_audit.py`
- `recyclique/api/src/recyclic_api/schemas/paheko_outbox.py`
- `recyclique/api/src/recyclic_api/schemas/cash_session.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_paheko_outbox.py`
- `recyclique/api/src/recyclic_api/application/cash_session_close_presentation.py`
- `recyclique/api/tests/test_story_8_5_paheko_correlation.py`
- `contracts/openapi/recyclique-api.yaml`
- `contracts/openapi/generated/recyclique-api.ts`
- `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md`
- `references/artefacts/index.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/tests/test-summary-story-8-5-e2e.md`

## Intelligence story précédente (8.4)

- Table **`paheko_outbox_sync_transitions`** append-only ; chaque transition porte **`correlation_id`** copié depuis l’item — **8.5** doit **exploiter** ce fil au-delà du seul détail item.
- Endpoints **lift-quarantine**, **confirm-resolved**, **reject**, **GET sync-transitions** — tout enrichissement doit rester **cohérent** avec les patterns d’audit **§6** du contrat minimal.
- **8.4** a explicitement renvoyé vers **8.5** pour la « corrélation inter-systèmes élargie » : ne pas se contenter du seul champ colonne sans **parcours support** bout-en-bout.

## Décisions par défaut (exécution sans arbitrage bloquant)

- **Priorité** : exposer **filtrage / agrégation par `correlation_id`** et **surfacer les liens session ↔ outbox** dans les réponses déjà consultées par le support avant d’ajouter des champs Paheko distants incertains.
- **Stabilité** : traiter **`correlation_id`** comme **clé primaire logique** du fil support Recyclique ↔ tentative Paheko ; toute seconde clé (ex. id métier Paheko) est **optionnelle** et **sous feature flag / contrat** si la réponse HTTP ne la garantit pas.

## Change Log

- 2026-04-10 — **Story Runner** : CS→VS→DS→gates→QA→CR ; QA : test 403 USER sur filtre + timeline ; synthèse `_bmad-output/implementation-artifacts/tests/test-summary-story-8-5-e2e.md` ; gates : pytest 8.1–8.5 (+ `test_sync_service` / `test_dashboard_stats`) ; `npm run lint` + `npm run build` (**peintre-nano**) ; `npm run generate` (**contracts/openapi**) ; CR **PASS** ; sprint-status + story → **done**.
- 2026-04-10 — **DS (bmad-dev-story, Task)** : implémentation 8.5 — filtre liste, timeline by-correlation, champs clôture, OpenAPI 0.1.15-draft, tests `test_story_8_5_paheko_correlation.py`, registre Epic 8 + sprint-status → **review**.
- 2026-04-10 — Fichier story créé (bmad-create-story, mode create) : suivi et corrélation inter-systèmes, baseline observabilité **FR28** / **NFR8** / **NFR10**, alignement code existant outbox + audit **8.4**.
- 2026-04-10 — Validation VS (bmad-create-story, mode validate) : ajout **Notes structure projet** + inventaire explicite des **`operationId`** figés Epic 8 (complément au renvoi vers la story **8.4**).
