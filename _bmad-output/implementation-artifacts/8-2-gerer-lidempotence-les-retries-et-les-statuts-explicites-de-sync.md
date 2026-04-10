# Story 8.2 : Gérer l'idempotence, les retries et les statuts explicites de sync

Status: done

**Story ID :** 8.2  
**Story key :** `8-2-gerer-lidempotence-les-retries-et-les-statuts-explicites-de-sync`  
**Epic :** 8 — Fiabiliser l'articulation comptable réelle avec Paheko

<!-- Ultimate context engine analysis completed — BMAD create-story (CS) 2026-04-10. Extension 8.1 : machine d'états, retries, idempotence systématique ; backend autoritaire ; operationId figés. -->

## Story

En tant que **système d'intégration résilient**,

je veux que les **tentatives de synchronisation** soient **répétables, étatées et idempotentes**,

afin que **retries, doublons et échecs partiels** ne **corrompent pas** l'interprétation comptable ni ne fassent passer une **sync différée** pour une **réconciliation finale**.

## Décision produit — extension 8.1 (non négociable)

- **Baseline brownfield-first** : **8.2 étend 8.1** ; **ne pas** réécrire le slice **clôture → outbox durable → tentative Paheko** ; l'enrichir (politique de retry, rejeu, sémantique d'états, idempotence bout en bout).
- **Backend autoritaire** : idempotence, retries, machine d'états `SyncStateCore`, persistance outbox et appels Paheko restent dans **`recyclique/api`** ; **ne pas** déplacer cette logique vers **Peintre_nano**.
- **Paheko** = référence comptable cible ; Recyclique terrain d'abord (**FR23**) ; sync différée **visible** et **distincte** d'un état **finalement réconcilié**.

## Noyau d'états `SyncStateCore` / API (alignement contrat minimal)

**Source normative** : `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` §2.3.

| Clé | Sémantique (rappel opérationnel pour le dev) |
|-----|-----------------------------------------------|
| `a_reessayer` | Échec transitoire ou file en cours ; retries automatiques ou manuels possibles ; **pas** « clos comptablement » côté intention Paheko. |
| `en_quarantaine` | Échec persistant, incohérence ou correspondance manquante (**FR25**) ; intervention ou règle métier avant chaîne « fermée » — workflows UI / levée détaillés = **8.4**. |
| `resolu` | Alignement intention Recyclique ↔ effet Paheko **acceptable** pour cette opération ; sync **close** au sens métier — **uniquement** après **tentative distante réussie** (ou règle explicite documentée), **jamais** sur la seule persistance locale / seule création outbox. |
| `rejete` | Décision **explicite** de ne pas pousser ou d'abandonner la perspective Paheko, avec **raison** traçable ; **pas** de retry infini identique sans changement de contexte. |

**Distinctions obligatoires** (exposer clairement dans schémas, API admin outbox, agrégat bandeau si pertinent) :

1. **Enregistré localement** — terrain persisté (ex. session clôturée) ; **pas** « sync OK ».  
2. **File / pas encore tenté** — ligne outbox `pending` sans tentative HTTP réelle : **ne pas** mapper abusivement à `resolu`.  
3. **Tentative** — au moins un appel HTTP (ou équivalent) exécuté ; journaliser / persister le résultat.  
4. **Retry** — repassage contrôlé `failed` → éligible traitement ; backoff / limites = périmètre **8.2**.  
5. **Quarantaine / rejet / résolu** — selon table ci-dessus ; pas de **fausse réconciliation** (affichage ou enum) quand seul le local est à jour.

**Interdiction** : formulation « sync OK » ou valeur `resolu` **uniquement** parce que la clôture et l'outbox sont en base, **sans** critère de tentative + résultat conforme au contrat.

## operationId OpenAPI — ne pas casser ( périmètre figé )

Conserver **tels quels** (paths / `operation_id` alignés `contracts/openapi/recyclique-api.yaml`) :

- `recyclique_cashSessions_closeSession`
- `recyclique_pahekoOutbox_listItems`
- `recyclique_pahekoOutbox_getItem`
- `recyclique_exploitation_getLiveSnapshot`

Toute évolution de schémas (enums, champs retry, compteurs, `next_retry_at`, etc.) se fait **sans** renommer ces `operationId` ; un renommage exigerait une décision de gouvernance **1.4** explicite, **hors périmètre** de la story 8.2.

## Registre et contrat minimal

- **Registre Epic 8** : `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md` — après DS, mettre à jour §2 (colonne retry / états) et la chronologie §6.
- **Contrat minimal** : `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` — at-least-once §3, idempotence §3.2, corrélation §4.

## Intelligence story 8.1 (à réutiliser, pas dupliquer)

Fichiers et patterns déjà en place (extension ciblée) :

- Modèle / migration : `paheko_outbox_items` ; statuts techniques `pending` / `processing` / `delivered` / `failed` vs `sync_state_core`.
- Services : `paheko_outbox_processor.process_next_paheko_outbox_item`, `PahekoAccountingClient.post_cash_session_close`, enqueue dans `CashSessionService.close_session_with_amounts` (même transaction que clôture).
- API admin : `admin_paheko_outbox.py` ; schémas `schemas/paheko_outbox.py` (`local_session_persisted`, `last_remote_http_status`, etc.).
- Bandeau : `exploitation_live_snapshot_service` — pire `sync_state_core` par site.
- Tests slice : `tests/test_story_8_1_paheko_outbox_slice.py`.

**Limite 8.1 connue** : repassage automatique `failed` → `pending`, backoff, seuils quarantaine, idempotence **systématique** sur **tous** les rejeux — à **compléter en 8.2** (OpenAPI 8.1 mentionnait explicitement l'absence de repassage auto avant 8.2).

## Hors périmètre explicite (autres stories)

| Story | Rôle |
|-------|------|
| **8.3** | Mappings site / caisse / emplacements Paheko. |
| **8.4** | Workflows quarantaine **complets** et résolution manuelle gouvernée (UI, audit levée). |
| **8.5** | Corrélation inter-systèmes **élargie** (8.2 renforce le socle logs / champs existants). |
| **8.6** | Blocage sélectif actions finales critiques. |
| **8.7** | Réconciliation **réelle** vérifiée Recyclique ↔ Paheko. |

## Acceptance Criteria

1. **États explicites backend** — Étant donné que la machine de sync est enrichie après **8.1**, quand une opération du slice (clôture → outbox) est observée via l'API ou les agrégats prévus, alors les états **`a_reessayer`**, **`en_quarantaine`**, **`resolu`**, **`rejete`** sont **exposés et documentés** (OpenAPI + sémantique) de façon **utilisable** par support / admin / future UI **sans** s'appuyer uniquement sur des messages libres. [Sources : `epics.md` 8.2 ; contrat minimal §2.3]

2. **Idempotence et rejeu** — Étant donné une **même** opération **retentée** ou **rejouée** (at-least-once), quand le processeur ou le client Paheko traite des duplicatas logiques, alors les règles d'**idempotence** empêchent un **double effet comptable indésirable** côté interprétation (clé stable, en-tête ou champ documenté, comportement Paheko mocké / contractuel) et l'**état reste intelligible** depuis Recyclique. [Sources : `epics.md` 8.2 ; contrat §3.2 ; AR24]

3. **Sync différée vs état final** — Étant donné la **sync différée** par défaut, quand survient un échec **retryable**, alors le **terrain** reste **cohérent** (pas de blocage global imposé par **8.2** hors cas déjà couverts ailleurs) **et** l'état **aval** est **clair** ; le système **évite** de présenter l'opération comme **finalement réconciliée** tant que les critères de **`resolu`** ne sont **pas** remplis. [Sources : `epics.md` 8.2 ; FR23–FR25]

4. **Pas de double compta ni fausse réconciliation** — Étant donné succès distants répétés ou retries, quand les scénarios de test couvrent ces cas, alors il n'y a **pas** d'incohérence état / message équivalente à « tout est OK Paheko » sans preuve de tentative + résultat attendu ; les tests ou la doc de story **nomment** les cas limites (ex. 2xx idempotent, 409, etc.) selon ce que permet l'API Paheko cible ou le mock. [Sources : contrat §3 ; matrice 1.6 en référence]

5. **Stabilité contractuelle** — Étant donné **AR39**, quand les schémas évoluent, alors **`contracts/openapi/recyclique-api.yaml`** (et génération TS si pipeline repo) reflètent les **nouveaux champs / enums** sans second contrat HTTP parallèle ; bump de version draft cohérent avec **1.4**.

6. **Registre Epic 8** — Étant donné la méthode des epics 6/7/8, quand l'implémentation progresse, alors `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md` est **mis à jour** (retry, idempotence, commandes pytest ciblées si suite globale KO).

## Tasks / Subtasks

- [x] **Cartographier l'existant 8.1** — Documenter dans les Dev Notes (ou registre) le mapping actuel `outbox_status` ↔ `sync_state_core` ; identifier les trous (ex. `pending` sans tentative vs `a_reessayer`). (AC : 1, 3)

- [x] **Politique de retry** — Définir backoff, plafond de tentatives, conditions de passage `failed` → ré-éligible `pending` / `a_reessayer` ; horodatages (`next_retry_at`, etc.) si utiles ; **ne pas** infinir sans seuil. (AC : 2, 3)

- [x] **Idempotence** — Garantir clé stable côté outbox + propagation vers `PahekoAccountingClient` (header `Idempotency-Key` ou équivalent documenté) ; tests : double traitement / double envoi ne produit pas état `resolu` trompeur ni effet métier incohérent dans les mocks. (AC : 2, 4)

- [x] **Transitions `rejete` / quarantaine** — Formaliser quand passer à `rejete` (décision ou code métier) vs `en_quarantaine` ; traçabilité minimale (raison, corrélation) ; s'aligner sur **8.4** pour l'UI de levée — 8.2 pose la **sémantique** et les **transitions** backend. (AC : 1, 4)

- [x] **OpenAPI + schémas Pydantic** — Enrichir les réponses list/get outbox et, si pertinent, `ExploitationLiveSnapshot` pour refléter retries / compteurs / prochaine tentative **sans** casser les `operationId` listés. (AC : 1, 5)

- [x] **Tests** — Étendre `test_story_8_1_paheko_outbox_slice.py` ou fichier dédié `test_story_8_2_*.py` : retry, idempotence, distinction local vs résolu ; documenter commande pytest dans le registre si suite complète KO. (AC : 2–4, 6)

- [x] **Registre §2 et §6** — Mettre à jour le tableau dette / retry et la chronologie. (AC : 6)

## Dev Notes

### Structure code (indicatif)

- `recyclique/api/src/recyclic_api/services/paheko_outbox_processor.py` — boucle, classifications, retry.
- `recyclique/api/src/recyclic_api/services/paheko_accounting_client.py` — idempotence HTTP.
- `recyclique/api/src/recyclic_api/models/paheko_outbox.py` — champs additionnels si migration nécessaire.
- `recyclique/api/src/recyclic_api/schemas/paheko_outbox.py`, `exploitation_live_snapshot` — exposer faits.
- `contracts/openapi/recyclique-api.yaml` + `contracts/openapi/generated/recyclique-api.ts` (génération).

### Références

- `_bmad-output/planning-artifacts/epics.md` — Epic 8, Story 8.2
- `_bmad-output/implementation-artifacts/8-1-implementer-un-premier-slice-syncable-de-bout-en-bout-recyclique-paheko.md`
- `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md`
- `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md`
- `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md`, `2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md`
- `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` (rappel : Peintre sans métier comptable)

### Conformité architecture

- **AR8** — Paheko via backend uniquement.
- **AR11** — Outbox durable, at-least-once.
- **AR17** — Corrélation (conserver sur retries).
- **AR21** — Enveloppe d'erreur si exposée.
- **AR24** — Idempotence.
- **AR39** — OpenAPI reviewable seule source schémas publics.

## Exigences de test

- Pytest ciblé **8.1 + 8.2** (slice + nouveaux scénarios retry / idempotence).
- Si `pytest tests/` complet échoue (brownfield) : commande exacte et périmètre dans le **registre Epic 8**.

## Definition of Done

- AC **1 à 6** satisfaits ; registre à jour.
- `sprint-status.yaml` : passage **review** / **done** uniquement après **DS + gates + QA + CR** (hors périmètre **CS**).

## Dev Agent Record

### Agent Model Used

Composer (agent dev story BMAD / sous-agent Task)

### Debug Log References

- SQLite tests : schéma persistant `pytest_recyclic.db` sans colonnes 8.2 → alignement `_sqlite_align_paheko_outbox_story_82` dans `conftest.py`.

### Completion Notes List

- Retry : échecs retryables (5xx, 408, 429, erreur réseau / `error_message`) → `pending` + `a_reessayer` + `next_retry_at` (backoff exponentiel plafonné via `PAHEKO_OUTBOX_RETRY_*`) tant que `attempt_count < PAHEKO_OUTBOX_MAX_ATTEMPTS` ; sinon `failed` + `en_quarantaine` + `max_attempts_exceeded`.
- `resolu` / `delivered` : uniquement après HTTP **2xx** ou **409** (idempotence côté Paheko mockée / contractuelle).
- `Idempotency-Key` HTTP = `paheko_outbox_items.idempotency_key` (déjà unique en base).
- `rejete` : `POST /v1/admin/paheko-outbox/items/{id}/reject` + `rejection_reason` ; lignes exclues du worker ; **409** si ligne déjà `delivered` / `resolu` (pas de rejet après sync terminée).
- Bandeau : `sync_operational_summary.deferred_remote_retry` si `next_retry_at` futur sur ligne `pending`.
- **8.3** : pas de blocage — correspondances fines site/caisse Paheko hors périmètre ; payload outbox porte déjà `site_id` terrain.

### File List

- `recyclique/api/migrations/versions/b8_2_story_8_2_paheko_outbox_retry.py`
- `recyclique/api/src/recyclic_api/core/config.py`
- `recyclique/api/src/recyclic_api/models/paheko_outbox.py`
- `recyclique/api/src/recyclic_api/services/paheko_outbox_processor.py`
- `recyclique/api/src/recyclic_api/services/paheko_accounting_client.py`
- `recyclique/api/src/recyclic_api/services/paheko_outbox_service.py`
- `recyclique/api/src/recyclic_api/services/exploitation_live_snapshot_service.py`
- `recyclique/api/src/recyclic_api/schemas/paheko_outbox.py`
- `recyclique/api/src/recyclic_api/schemas/exploitation_live_snapshot.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_paheko_outbox.py`
- `recyclique/api/tests/conftest.py`
- `recyclique/api/tests/test_story_8_1_paheko_outbox_slice.py`
- `recyclique/api/tests/test_story_8_2_paheko_outbox_retry_idempotence.py`
- `contracts/openapi/recyclique-api.yaml`
- `contracts/openapi/generated/recyclique-api.ts`
- `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/8-2-gerer-lidempotence-les-retries-et-les-statuts-explicites-de-sync.md`

## Change Log

- 2026-04-10 — Implémentation DS 8.2 (retry, idempotence, rejet, OpenAPI 0.1.12-draft, registre + sprint-status → review).
- 2026-04-10 — Story Runner : gates + QA + CR ; CR1 → garde **409** sur `reject` si `delivered`/`resolu` + test + OpenAPI ; CR2 APPROVED ; sprint-status → **done**.
