# Story 8.3 : Gérer les correspondances site / caisse / emplacements Paheko

Status: done

**Story ID :** 8.3  
**Story key :** `8-3-gerer-les-correspondances-site-caisse-emplacements-paheko`  
**Epic :** 8 — Fiabiliser l'articulation comptable réelle avec Paheko

<!-- Ultimate context engine analysis completed — BMAD create-story (CS) 2026-04-10. Mappings explicites pour le slice clôture ; pas de fallback silencieux ; backend autoritaire. -->

## Story Preparation Gate (obligatoire — exécution DS)

**Premier slice de mapping livré par cette story** (borné, explicite, aligné 8.1 / 8.2) :

| Dimension | Valeur figée pour 8.3 |
|-----------|-------------------------|
| **Contexte site** | `site_id` Recyclique — entité `Site` déjà liée aux `CashSession` ; une ressourcerie peut avoir plusieurs sites ; le mapping porte au minimum sur **(site_id)** comme clé de résolution terrain. |
| **Contexte caisse** | **Poste de caisse** = `CashSession.register_id` → `CashRegister` ; le premier batch doit permettre de distinguer, quand c'est pertinent pour Paheko, **quel registre** a servi à la session clôturée (sinon règle documentée « défaut par site » **explicite** en config, **jamais** implicite au runtime sans trace). |
| **Type d'opération syncable visé** | `cash_session_close` (`PahekoOutboxOperationType.CASH_SESSION_CLOSE`) — **même slice** que les stories **8.1** et **8.2** ; pas d'élargissement aux ventes ticket par ticket ni à la réception matière dans le périmètre **done** de 8.3. |
| **Destination Paheko ciblée** | Les **paramètres comptables** requis pour que l'appel HTTP existant (`PahekoAccountingClient.post_cash_session_close`) produise un body **officiel** Paheko via `POST /api/accounting/transaction` (configuré par `PAHEKO_ACCOUNTING_CASH_SESSION_CLOSE_PATH`, désormais par défaut sur cet endpoint) ; le premier minimum canonique reviewable est `id_year`, `debit`, `credit`, avec transformation explicite du payload métier Recyclique avant envoi. |

Toute extension ultérieure de la matrice (autres `operation_type`, multi-ressourcerie fine) = **stories suivantes** ; **ne pas** rouvrir **Epic 9** ni reporter la gouvernance sensible globale sur 9.2 pour le **minimum** 8.3.

## Story

En tant qu'**administrateur responsable**,

je veux que les **correspondances comptables** entre **Recyclique** (site, caisse / session) et les **cibles Paheko** (emplacements / paramètres d'écriture) soient **explicites, validées et stockées comme vérité de configuration**,

afin que la synchronisation **n'écrive jamais** vers une destination **invalide** ni ne **substitue** un mapping par défaut **non nommé** (interdit : fallback silencieux).

## Contraintes produit et architecture (non négociables)

- **Brownfield-first** : étendre l'outbox et le processor **8.1 / 8.2** sans casser idempotence, retries, `operationId` OpenAPI figés.
- **Backend autoritaire** : résolution des mappings, validation, états d'échec **uniquement** dans `recyclique/api` ; **Peintre_nano** ne porte **aucune** logique comptable (affichage d'états plus tard si besoin — hors périmètre obligatoire 8.3 sauf consommation de champs déjà exposés).
- **Pas de fallback silencieux** : mapping absent, incomplet ou invalide → **aucun** POST Paheko « au hasard » ; état **explicite** côté outbox / API (`en_quarantaine`, `rejete`, ou distinction **non-syncable** documentée dans OpenAPI — cohérent avec **FR42** et contrat minimal §2.3).
- **Terrain d'abord** : la **clôture locale** et la **ligne outbox** restent possibles tant que le métier l'exige ; l'**intégration** refuse l'écriture substitutive et expose la situation (aligné AC epics : opération **enregistrée dans Recyclique** + état sync **explicite**).
- **Epic 9** : **ne pas rouvrir** ; pas de dépendance fonctionnelle aux stories 9.x pour valider 8.3.

## État des lieux code (à partir de 8.1 / 8.2)

- **Enqueue** : `enqueue_cash_session_close_outbox` (`paheko_outbox_service.py`) — payload JSON avec `cash_session_id`, `site_id`, montants, etc. ; **pas** encore de résolution « destination Paheko » métier.
- **Processor** : `process_next_paheko_outbox_item` (`paheko_outbox_processor.py`) — appelle `post_cash_session_close(dict(item.payload))` si type supporté.
- **Modèle** : `PahekoOutboxItem` — `site_id`, `cash_session_id`, `payload`, `sync_state_core`, retry, `rejection_reason`, etc.
- **Client HTTP** : `PahekoAccountingClient` — URL / path configurables (`core/config.py`).

**`register_id` (brownfield)** : le JSON `payload` produit par `enqueue_cash_session_close_outbox` (8.1) contient `site_id` mais **pas** `register_id`. Pour la résolution mapping **(site_id [, register_id])**, le processor doit charger `CashSession` via `PahekoOutboxItem.cash_session_id` et lire `CashSession.register_id` (nullable).

**Gap 8.3** : introduire une **couche de résolution** « site + caisse (registre) → paramètres Paheko » appliquée **avant** l'appel HTTP dans le processor (**décision par défaut** : résolution au moment du traitement outbox, pas à l'enqueue — préserve l'atomicité 8.1). Si aucun mapping valide : **aucun** POST ; mise à jour d'état / raison structurée explicite (**interdiction** d'envoyer un payload enrichi sans mapping valide).

## Acceptance Criteria

1. **Jeu de mapping borné et configuration de vérité** — Étant donné le modèle de déploiissement « plusieurs contextes Recyclique → un périmètre Paheko par ressourcerie », quand les règles de mapping sont implémentées, alors le **premier lot** couvre un ensemble **explicite** et **borné** : au minimum **(site_id [, register_id]) → paramètres de destination Paheko** nécessaires au slice **`cash_session_close`**, persistés en base ou mécanisme **équivalent audit** (table dédiée, versionnement simple ou `created_at` / `updated_at`) ; ces entrées sont la **vérité de config** (pas de déduction opaque au runtime). [Sources : `epics.md` Story 8.3 AC1 ; matrice **1.6** § correspondances ; **FR41**/FR42]

2. **Absence / invalidité de mapping** — Étant donné une ligne outbox **cash_session_close** pour laquelle **aucune** correspondance valide n'existe ou les identifiants Paheko sont **invalides**, quand le traitement d'intégration s'exécute, alors **l'opération terrain** (session clôturée + enregistrement Recyclique) **reste** ; **aucune** écriture HTTP substitutive n'est effectuée vers une destination **non configurée** ; l'état exposé est **non syncable** ou **échec sync explicite** (`sync_state_core` / message structuré **sans** équivalence abusive avec un état « résolu / sync OK »). [Sources : `epics.md` 8.3 AC2 ; contrat minimal **2026-04-02_05** §2.3 ; **FR25** amorce]

3. **Compréhension opérationnelle** — Étant donné que les mappings sont **sensibles**, quand un humain (support / admin) consulte l'outbox ou la config, alors le **rôle** de chaque champ (site, registre, cible Paheko) et l'**effet** sur le slice clôture sont **compréhensibles** (libellés, doc OpenAPI, ou commentaires de schéma **sobres**) ; l'implémentation **préserve** l'extensibilité (nouvelles lignes / types d'opération **sans** refonte complète). [Sources : `epics.md` 8.3 AC3]

4. **OpenAPI et gouvernance** — Étant donné **1.4** / **AR39**, quand la story est livrée, alors `contracts/openapi/recyclique-api.yaml` (et `contracts/openapi/generated/recyclique-api.ts` si pipeline repo) reflètent les **nouveaux** moyens de **lire / administrer** les mappings (ou champs enrichis sur l'outbox expliquant **mapping_missing** / code de raison), **sans** second contrat HTTP parallèle ; **ne pas renommer** les `operationId` existants : `recyclique_cashSessions_closeSession`, `recyclique_pahekoOutbox_listItems`, `recyclique_pahekoOutbox_getItem`, `recyclique_exploitation_getLiveSnapshot`.

5. **Tests** — Étant donné les scénarios ci-dessus, quand la suite ciblée s'exécute, alors des tests **pytest** couvrent : mapping **résolu** → payload enrichi ou envoyé conforme au mock Paheko ; mapping **absent** → **pas** d'appel substitutif + état explicite ; **optionnel** mapping invalide / désactivé selon modèle de données retenu.

6. **Registre Epic 8** — Étant donné la méthode des epics 6/7/8, quand l'implémentation progresse, alors `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md` est **mis à jour** (tableau mapping slice clôture, liens vers migration / OpenAPI, commande pytest ciblée si suite globale KO).

## Tasks / Subtasks

- [x] **Modèle de données** — Concevoir table(s) ou extension de modèles existants (`Site`, `CashRegister`, ou table `paheko_*_mapping`) avec contraintes d'unicité claires (ex. par `(site_id, register_id)` avec sentinelle pour défaut site-only). Migration Alembic + modèles SQLAlchemy. (AC : 1, 3)

- [x] **Résolution avant envoi** — Dans `paheko_outbox_processor` (ou service dédié appelé depuis le processor), résoudre le mapping à partir de `site_id` (outbox / payload) et `register_id` lu sur `CashSession` via `cash_session_id` ; enrichir le payload **ou** stocker les IDs Paheko dans des champs **explicites** ; **échec** si introuvable. (AC : 1, 2)

- [x] **Statuts et observabilité** — Aligner `sync_state_core` / `last_error` / champ structuré (ex. `mapping_resolution_error`) pour distinguer **mapping manquant** vs **erreur HTTP Paheko** ; documenter dans `schemas/paheko_outbox.py` + OpenAPI. (AC : 2, 4)

- [x] **API admin (minimum)** — Endpoints pour **lister / créer / mettre à jour / désactiver** les lignes de mapping (permissions alignées admin/support — réutiliser patterns `admin_paheko_outbox` + Story 1.3) ; pas besoin d'UI Peintre dans le DoD 8.3. (AC : 1, 3, 4)

- [x] **Configuration** — Variables d'environnement si nécessaire (ex. mode strict) — **sans** secrets Paheko en dur ; documenter dans `core/config.py`. (AC : 1)

- [x] **Tests** — Nouveau fichier `tests/test_story_8_3_paheko_mapping.py` (ou extension des tests 8.x) ; mocks client Paheko inchangés sur le principe. (AC : 5)

- [x] **Registre + index** — Mise à jour registre Epic 8 + `references/artefacts/index.md` si nouveau paragraphe significatif. (AC : 6)

## Dev Notes

### Fichiers et modules probables

| Zone | Fichiers (indicatif) |
|------|----------------------|
| Modèle / migration | `recyclique/api/migrations/versions/…_story_8_3_paheko_mapping.py`, `recyclique/api/src/recyclic_api/models/…` |
| Résolution | `recyclique/api/src/recyclic_api/services/paheko_mapping_service.py` (nouveau) ou extension `paheko_outbox_service.py` |
| Processor | `recyclique/api/src/recyclic_api/services/paheko_outbox_processor.py` |
| Payload / session | `recyclique/api/src/recyclic_api/services/paheko_outbox_service.py` ; accès `CashSession` / `CashRegister` |
| API | `recyclique/api/src/recyclic_api/api/api_v1/endpoints/` (ex. `admin_paheko_mapping.py` ou sous-route admin existante) |
| Schémas | `recyclique/api/src/recyclic_api/schemas/paheko_outbox.py`, schémas mapping dédiés |
| Contrat | `contracts/openapi/recyclique-api.yaml`, `contracts/openapi/generated/recyclique-api.ts` |
| Bandeau | `exploitation_live_snapshot_service.py` — seulement si le contrat `ExploitationLiveSnapshot` doit refléter un **résumé** « mapping manquant » (optionnel ; ne pas élargir hors besoin AC) |

### Références techniques et produit

- `_bmad-output/planning-artifacts/epics.md` — Epic 8, Story 8.3, note agents (backend only, Peintre sans compta).
- `_bmad-output/implementation-artifacts/8-1-implementer-un-premier-slice-syncable-de-bout-en-bout-recyclique-paheko.md`, `8-2-gerer-lidempotence-les-retries-et-les-statuts-explicites-de-sync.md` — fichiers touchés, patterns outbox.
- `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` — états FR24, quarantaine, pas de fausse réconciliation.
- `references/artefacts/2026-04-02_06_matrice-integration-paheko-gaps-api.md` — ligne **Correspondances site / caisse / emplacement** ; mapping **dans Recyclique**.
- `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md`, `2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md`.
- `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` — rappel Peintre.
- `references/paheko/index.md`, `references/migration-paheko/index.md`, audits caisse si besoin de vocabulaire brownfield **sans** confondre avec nominal v2.
- `references/paheko/liste-endpoints-api-paheko.md` — forme attendue des écritures / champs.

### Conformité architecture (rappel)

- **AR8** — Intégration Paheko backend uniquement, mapping spécifié côté Recyclique.
- **AR11** — Outbox durable ; ne pas supprimer les lignes en cas de mapping manquant — **état** explicite.
- **AR17** — Conserver `correlation_id` sur les chemins d'erreur mapping.
- **AR24** — Idempotence inchangée sur le `idempotency_key` outbox.
- **AR39** — OpenAPI reviewable seule source des schémas publics.

## Exigences de test

- Pytest **ciblé 8.3** + non-régression **8.1 / 8.2** sur le slice clôture.
- Si `pytest` complet du dépôt reste non vert (brownfield) : documenter la **commande exacte** du sous-ensemble dans le registre Epic 8.

## Definition of Done

- AC **1 à 6** satisfaits.
- `sprint-status.yaml` : passage **in-progress** / **review** / **done** uniquement après **DS + gates + QA + CR** (hors périmètre **CS**).

## Dev Agent Record

### Agent Model Used

Task subagent (bmad-dev-story / Story Runner) — modèle Composer par défaut.

### Debug Log References

— 

### Completion Notes List

- Table `paheko_cash_session_close_mappings` : clé `(site_id, register_id)` avec `register_id` NULL = défaut site (index uniques partiels) ; `destination_params` sert de vérité de config comptable reviewable, désormais durcie sur un minimum réel (`id_year`, `debit`, `credit`) pour construire le body officiel Paheko.
- Processor : résolution **après** passage `processing`, **sans** `touch_attempt` si échec mapping → `failed` + `en_quarantaine` + `mapping_resolution_error` + `last_error` explicite ; aucun POST.
- API admin `/v1/admin/paheko-mappings/cash-session-close` (GET list, POST create, PATCH update/désactivation) ; OpenAPI **0.1.13-draft** + `npm run generate` sur `contracts/openapi`.
- Tests 8.1 / 8.2 : helper `seed_default_paheko_close_mapping` pour conserver les scénarios HTTP mockés.
- Pytest vert : `tests/test_story_8_1_paheko_outbox_slice.py` + `tests/test_story_8_2_paheko_outbox_retry_idempotence.py` + `tests/test_story_8_3_paheko_mapping.py`.

### File List

- `recyclique/api/migrations/versions/b8_3_story_8_3_paheko_cash_session_close_mapping.py`
- `recyclique/api/src/recyclic_api/models/paheko_cash_session_close_mapping.py`
- `recyclique/api/src/recyclic_api/models/paheko_outbox.py`
- `recyclique/api/src/recyclic_api/models/__init__.py`
- `recyclique/api/src/recyclic_api/services/paheko_mapping_service.py`
- `recyclique/api/src/recyclic_api/services/paheko_outbox_processor.py`
- `recyclique/api/src/recyclic_api/schemas/paheko_outbox.py`
- `recyclique/api/src/recyclic_api/schemas/paheko_mapping.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_paheko_mapping.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/__init__.py`
- `recyclique/api/src/recyclic_api/api/api_v1/api.py`
- `recyclique/api/src/recyclic_api/core/config.py`
- `recyclique/api/tests/conftest.py`
- `recyclique/api/tests/paheko_8x_test_utils.py`
- `recyclique/api/tests/test_story_8_1_paheko_outbox_slice.py`
- `recyclique/api/tests/test_story_8_2_paheko_outbox_retry_idempotence.py`
- `recyclique/api/tests/test_story_8_3_paheko_mapping.py`
- `contracts/openapi/recyclique-api.yaml`
- `contracts/openapi/generated/recyclique-api.ts`
- `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md`
- `references/artefacts/index.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-04-10 — Implémentation DS Story 8.3 (mappings, processor, API, OpenAPI, tests, registre Epic 8).

---

## Intelligence stories précédentes (8.1 / 8.2)

- **8.1** : table `paheko_outbox_items`, enqueue transactionnel à la clôture, client `PahekoAccountingClient`, endpoints admin list/get outbox.
- **8.2** : retry, `next_retry_at`, `Idempotency-Key`, `en_quarantaine` / `rejete`, endpoint `reject` ; **8.3** complète le **sens métier** du payload (destination Paheko), pas la mécanique retry.
- **Note 8.2 (Completion)** : « correspondances fines site/caisse Paheko hors périmètre » — **levée par 8.3** pour le slice défini dans la **Story Preparation Gate**.

## Décisions par défaut (exécution sans arbitrage bloquant)

- **Quand résoudre** : au **processor**, avant `post_cash_session_close` (pas à l'enqueue), pour garder la clôture métier + insert outbox atomiques comme en 8.1.
- **Granularité clé** : modèle **(site_id, register_id)** avec **`register_id` NULL** autorisé pour une ligne « défaut site » **unique** par `site_id` (contrainte d'unicité à définir en migration) ; lignes `(site_id, register_id non NULL)` pour surcharges par caisse. Si une session a un `register_id` et qu'il n'existe ni ligne spécifique ni défaut site applicable → **échec mapping explicite** (pas de POST).
- **Champs côté Paheko** : le slice courant vise explicitement `POST /api/accounting/transaction` ; `destination_params` ne transporte plus des clés fictives de mock mais les paramètres comptables réels minimaux, toute valeur invalide restant **quarantaine / erreur explicite**, jamais POST inventé.

**Écarts à remonter au DS** (non bloquants pour démarrer) : politique produit si plusieurs caisses sur un site **sans** ligne défaut site ni ligne par registre (comportement exact du message / code erreur).
