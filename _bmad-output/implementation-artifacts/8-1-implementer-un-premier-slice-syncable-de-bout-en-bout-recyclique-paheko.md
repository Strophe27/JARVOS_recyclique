# Story 8.1 : Implémenter un premier slice syncable de bout en bout Recyclique → Paheko

Status: done

**Story ID :** 8.1  
**Story key :** `8-1-implementer-un-premier-slice-syncable-de-bout-en-bout-recyclique-paheko`  
**Epic :** 8 — Fiabiliser l'articulation comptable réelle avec Paheko

<!-- Ultimate context engine analysis completed — BMAD create-story (CS) 2026-04-10. Pivot Epic 8 : slice explicite, operationId, distinctions d'état, pas de cible FlowRenderer/CREOS. -->

## Story

En tant que **plateforme intégrée finance / terrain**,

je veux qu’**une première opération syncable concrète** parcoure **de bout en bout** le chemin **persistance locale Recyclique → outbox durable → tentative d’intégration Paheko**,

afin de **prouver** l’épine dorsale de sync **réelle** sur un périmètre **borné** avant d’élargir couverture, retries, quarantaine complète et réconciliation (stories **8.2–8.7**).

## Décision produit — premier slice syncable réel (pivot, non négociable)

**Slice choisi : clôture de session de caisse → événement comptable vers Paheko**

- **Événement métier** : la **clôture** d’une **session de caisse** (`CashSession`) déjà persistée côté Recyclique (terrain), conforme au **handoff Epic 6 → Epic 8** et à la matrice Paheko (écritures `/api/accounting/...`, pas réplication POS plugin).
- **Pourquoi ce slice** : aligné `references/artefacts/2026-04-02_06_matrice-integration-paheko-gaps-api.md` §1 bis / ligne « Clôture de caisse (terrain) → enregistrement comptable côté Paheko » ; `epics.md` Story 8.1 (backbone avant extension).
- **Hors scope de ce slice (explicite)** : réception matière, ventes ticket par ticket vers Paheko, modules Epic 9, **toute** UI Peintre_nano comme cible de livrable (voir baseline ci-dessous).

## Baseline brownfield-first (non négociable)

- **FlowRenderer / CREOS / widgets Peintre** : **hors cible produit** pour **8.1** ; pas de story centrée sur un nouvel écran de composition. Seuls des **signaux** déjà prévus (ex. bandeau / `sync_operational_summary` via OpenAPI existant) peuvent être **réutilisés** ou **enrichis** côté contrat si le backend expose des faits — **sans** refonte rendu.
- **Backend `recyclique/api`** : **autorité** sur compta outbound, idempotence, droits, corrélation, persistance outbox, états observables ; Paheko = **référence comptable** cible des tentatives.
- **Epic 9** : **ne pas rouvrir** ; aucune dépendance fonctionnelle vers 9.x dans la définition de done de **8.1**.
- **Epic 8 note `epics.md`** : intégration Paheko **derrière** le backend ; Peintre affiche des états plus tard, ne porte pas la logique comptable — rappel pour éviter la dérive de périmètre.

## Distinctions d’état obligatoires (ne jamais mentir sur « sync OK »)

Le livrable **8.1** doit rendre **explicites** et **distincts** dans le modèle / les réponses / les journaux (au minimum pour le slice clôture) :

| Concept | Définition opérationnelle (rappel contrat) |
|--------|--------------------------------------------|
| **Enregistré localement** | Session clôturée et **persistée** dans Recyclique ; **aucune** garantie Paheko ; **ne pas** présenter comme « sync OK ». |
| **Tentative de sync Paheko** | Appel HTTP (ou adaptateur) **réellement exécuté** vers l’instance / stub **documenté** ; horodatage + corrélation traçables. |
| **Erreur** | Échec **classé** (transitoire vs permanent — peut rester minimal dans 8.1 si **8.2** affine la machine à états). |
| **Quarantaine** | État **`en_quarantaine`** (noyau `SyncStateCore`) quand le contrat minimal l’exige ; périmètre **complet** des workflows quarantaine = **8.4** — 8.1 peut **poser** la valeur sur cas limite **nommé** si nécessaire. |
| **Blocage sélectif** | Actions finales critiques gelées selon politique — **8.6** ; **8.1** ne généralise **pas** le blocage terrain global. |
| **Réconciliation réelle** | Alignement **vérifié** Recyclique ↔ Paheko — **8.7** ; **8.1** peut prouver **un** scénario de **succès distant** ou **échec explicite**, **pas** « réconciliation globale ». |

**Règle** : la phrase « sync OK » / `resolu` côté `SyncStateCore` **ne s’applique** qu’après **preuve** de la tentative **et** du résultat **conforme** au critère de done du slice (voir section **Preuves de validation** ci-dessous).

## Preuves de validation (Story 8.1)

Liste minimale à consigner dans le **registre Epic 8** et/ou joindre en review (alignée AC 1–7) :

1. **Atomicité outbox** — Preuve qu’après clôture réussie, une ligne outbox du type slice existe et a été créée **dans la même transaction** que la clôture (test pytest, extrait SQL documenté, ou les deux). → AC 1  
2. **Tentative distante** — Preuve d’exécution **réelle** du client HTTP (ou adaptateur injectable équivalent) : logs structurés **replayables**, résultat persisté ou journalisé (succès / échec / code). → AC 2  
3. **Distinctions d’état** — Exemple **nommé** (fixture ou scénario de test) où l’API list/get outbox expose **local vs tentative vs erreur** sans équivalence abusive « sync OK » sur la seule persistance locale ; si `en_quarantaine` / `rejete` utilisés, **citer** la valeur et la raison. → AC 3, tableau « Distinctions d’état »  
4. **OpenAPI** — Diff ou extrait montrant les `operationId` **figés** (`recyclique_pahekoOutbox_*` ou fusion documentée) + artefact généré à jour si le pipeline repo l’exige. → AC 4  
5. **Corrélation** — Au moins une trace où `correlation_id` (ou `X-Correlation-ID`) relie clôture → outbox → tentative handler (logs cohérents **AR17**). → AC 5  
6. **Frontière Epic 9** — Déclaration explicite en review : aucune story 9.x requise pour valider 8.1. → AC 6  
7. **Registre** — Entrée à jour dans `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md` (slice, `operationId`, liens preuves 1–5, **commande pytest exacte** du sous-ensemble si la suite globale n’est pas verte). → AC 7  

## operationId OpenAPI — périmètre 8.1

**Déjà dans `contracts/openapi/recyclique-api.yaml` (réutilisation / point d’ancrage)** :

- `recyclique_cashSessions_closeSession` — mutation métier **déclencheur** du slice (clôture session → émission outbox **dans la même transaction métier** que la persistance terrain + ligne outbox, selon AR11).
- `recyclique_exploitation_getLiveSnapshot` — agrégat **bandeau** ; champ `sync_operational_summary` / `SyncStateCore` déjà défini ; **8.1** peut **alimenter** ce résumé à partir du **pire état** des opérations du slice **si** pertinent, **sans** élargir la sémantique hors contrat.

**À ajouter ou à figer dans le même fichier (livraison story 8.1)** — noms **stables** proposés (ajuster si collision ; garder cohérence `recyclique_*`) :

- `recyclique_pahekoOutbox_listItems` — liste paginée des **éléments d’outbox** (filtres : type d’opération, session, état) ; permissions **admin / support** à cadrer (alignement Story 1.3 / permissions effectives).
- `recyclique_pahekoOutbox_getItem` — détail d’un **élément** (payload technique, tentatives, dernière erreur, corrélation).

> Si une **seule** route suffit pour la preuve minimale, **fusionner** en un seul `operationId` **documenté** — mais la **lecture** API versionnée reste **obligatoire** pour l’observabilité « explicitement observable dans Recyclique » (éviter « seulement la table SQL en silencieux »).

**Hors OpenAPI v2 pour 8.1** : endpoints **Paheko** eux-mêmes — référence `references/paheko/liste-endpoints-api-paheko.md` et matrice **1.6** ; pas de duplication du catalogue Paheko dans le YAML Recyclique.

## Contrat minimal de statuts (Story 8.1)

- **Source normative** : `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` — noyau `SyncStateCore` : `a_reessayer`, `en_quarantaine`, `resolu`, `rejete`.
- **Pour ce slice** : documenter dans OpenAPI / schémas **le mapping** entre **cycle de vie outbox** (ex. `pending`, `processing`, `delivered`, `failed`) et **valeurs exposées** alignées sur `SyncStateCore` **ou** champs **additifs** non ambigus ; **interdiction** de marquer `resolu` sans critère **8.1** explicite (tentative Paheko **réussie** **ou** décision `rejete` tracée).
- **Versionnement** : toute extension d’enum ou schéma = bump **semver** / draft OpenAPI du dépôt, gate gouvernance **1.4**.

## Dépendances et délégation aux stories 8.2 à 8.7

| Story | Rôle par rapport à 8.1 |
|-------|-------------------------|
| **8.2** | Machine à états complète, retries standardisés, idempotence **systématique** sur **toutes** les voies de rejeu — 8.1 pose **un** chemin heureux + **un** chemin d’échec **explicite**. |
| **8.3** | Correspondances site / caisse / emplacements — 8.1 peut supposer un **jeu de mapping minimal** ou **fixture** **documenté** ; pas l’exhaustif métier. |
| **8.4** | Workflows quarantaine et résolution manuelle gouvernée — 8.1 **ne remplace** pas les écrans / permissions de levée. |
| **8.5** | Corrélation inter-systèmes **bout en bout** — 8.1 **doit** utiliser `X-Correlation-ID` / logs structurés (**AR17**) sur le chemin implémenté. |
| **8.6** | Blocage sélectif des actions finales — 8.1 **ne** bloque **pas** toute la caisse par défaut (**FR66**). |
| **8.7** | Validation réconciliation **réelle** — 8.1 fournit la **première** preuve de **faisabilité** technique, pas la clôture d’Epic 8. |

## Intelligence rétrospectives Epic 6 / 7 (à réinvestir)

- **Registre terrain + honnêteté vert / rouge** : même discipline que `references/artefacts/2026-04-08_07_caisse-v2-exploitabilite-terrain-epic6.md` et `2026-04-09_01_reception-v2-exploitabilite-terrain-epic7-squelette.md` — **8.1** aliment le **registre Epic 8** (`references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md`) : état du slice, `operationId`, preuves.
- **Citation `operationId`** dans la trace de validation (rétro 7 §1.6).
- **Pytest** : si la suite **globale** reste non verte (brownfield), documenter un **sous-ensemble reproductible** (fichiers / marqueurs) dans le registre ou `tests/test-summary-…` — **ne pas** inférer « tout vert » (rétro 7 §1.3).
- **Preuves UI** : hors périmètre **8.1** pour le rendu Peintre ; en revanche **preuves API** (`curl` / OpenAPI / logs) et **localhost:4444** **non requis** pour done **8.1** sauf enrichissement bandeau **déjà** couvert par `getLiveSnapshot` si implémenté.

## Acceptance Criteria

1. **Outbox durable + atomicité** — Étant donné qu’une session de caisse est **clôturée** via le flux backend existant, quand la transaction métier réussit, alors **un enregistrement outbox** (ou équivalent PostgreSQL **durable** aligné **AR11**) est **écrit dans la même transaction** que la clôture locale, avec **type d’opération** du slice et **clé d’idempotence** stable. [Sources : `2026-04-02_05_…` §3 ; `epics.md` 8.1]

2. **Tentative Paheko réelle** — Étant donné un élément outbox **éligible**, quand le worker / handler traite l’élément, alors une **tentative HTTP** (ou adaptateur **injectable** avec **même contrat** d’appel) est exécutée vers **Paheko** selon l’environnement de référence (`2026-04-02_01_surface-travail-v2-mode-reference-paheko.md`) ; le **résultat** (succès / échec / code) est **persisté** ou **journalisé** de façon **replayable**. [Sources : matrice **1.6** ; `epics.md` 8.1]

3. **Observabilité dans Recyclique** — Étant donné l’exigence « explicitly observable », quand on interroge l’API Recyclique **versionnée**, alors les **`operationId`** **list/get** outbox (cf. section dédiée) retournent **l’état** et la **distinction** locale vs tentative vs erreur pour **au moins** une clôture de test ; **pas** de « sync OK » sur la seule persistance locale. [Sources : `epics.md` 8.1 ; FR24]

4. **OpenAPI et gouvernance** — Étant donné **1.4**, quand la story est livrée, alors `contracts/openapi/recyclique-api.yaml` et artefacts générés (`contracts/openapi/generated/recyclique-api.ts` si pipeline repo) **reflètent** les nouveaux endpoints ; **pas** de second contrat HTTP parallèle non reviewable.

5. **Corrélation** — Étant donné **AR17**, quand le traitement outbox s’exécute, alors **correlation_id** propage **logs** + réponses erreur **AR21** si exposées ; cohérent avec les pratiques Epic 2.

6. **Frontière Epic 9** — Étant donné la consigne projet, quand le périmètre est revu, alors **aucune** story **9.x** n’est requise pour valider **8.1**.

7. **Registre Epic 8** — Étant donné la méthode Epics 6/7, quand la story progresse, alors `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md` est **tenu à jour** (slice, `operationId`, preuves, pytest ciblé si global KO) et `references/artefacts/index.md` pointe vers ce fichier.

## Tasks / Subtasks

- [x] **Cadrage technique** — Valider le **payload minimal** vers Paheko (compta) pour **clôture** : s’appuyer sur **1.6** + doc Paheko ; lister **gaps** dans le registre si l’API ne permet pas encore l’écriture complète (fallback : échec **explicite** `a_reessayer` / `en_quarantaine` avec **raison**). (AC : 2, 7)
- [x] **Modèle outbox** — Migration SQLAlchemy + table(s) ; transaction **clôture + insert outbox**. (AC : 1)
- [x] **Worker / handler** — Boucle de traitement **at-least-once** ; idempotence **minimale** sur le slice (complété en **8.2**). (AC : 2, 5)
- [x] **Client Paheko** — Module dédié backend (auth, URL, timeouts) ; **pas** de secrets en dur ; config **12-factor**. (AC : 2)
- [x] **Endpoints lecture** — Implémenter `recyclique_pahekoOutbox_listItems` + `recyclique_pahekoOutbox_getItem` (ou équivalent **nommé** dans le YAML). (AC : 3, 4)
- [x] **OpenAPI + génération** — Mettre à jour YAML + TS généré ; gate drift si applicable. (AC : 4)
- [x] **Tests** — pytest : transaction clôture → ligne outbox ; traitement → état **distinct** ; **mock HTTP Paheko** acceptable en CI si **documenté** + **un** scénario **intégration** optionnel compose local. (AC : 1–3)
- [x] **Registre** — Mettre à jour le registre **8** + index artefacts. (AC : 7)

## Dev Notes

### Structure code (indicatif, à affiner à l’implémentation)

- `recyclique/api/src/recyclic_api/` — services `paheko_*` ou `sync_outbox_*`, modèles, migrations, endpoints API v1.
- `recyclique/api/tests/` — tests ciblés **8.1** ; nommer fichiers pour **sous-ensemble** si suite globale lourde.

### Références

- `_bmad-output/planning-artifacts/epics.md` — Epic 8, Story 8.1
- `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md`
- `references/artefacts/2026-04-02_06_matrice-integration-paheko-gaps-api.md`
- `references/artefacts/2026-04-02_01_surface-travail-v2-mode-reference-paheko.md`
- `references/paheko/index.md`, `references/migration-paeco/index.md`
- `contracts/openapi/recyclique-api.yaml` — `SyncStateCore`, `ExploitationLiveSnapshot`
- `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — jalons Piste B
- `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md`, `2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md`
- `_bmad-output/implementation-artifacts/epic-7-retro-2026-04-10.md`, `epic-6-retro-2026-04-09.md` — leçons registre / pytest / operationId

### Conformité architecture

- **AR11** — Outbox PostgreSQL, at-least-once.
- **AR17** — Corrélation.
- **AR24** — Idempotence (minimal **8.1**, renforcé **8.2**).
- **AR8** — Intégration Paheko **backend only**.

## Exigences de test

- **Minimum** : pytest sur le **slice** (outbox + handler + API lecture) ; **vert** sur ce périmètre.
- Si `pytest` **complet** échoue pour causes **hors** 8.1 : documenter la **commande exacte** du sous-ensemble dans le registre Epic 8 (alignement rétro 7).

## Definition of Done

- AC **1 à 7** satisfaits ou **gaps** **nommés** dans le registre **sans** fausse « sync OK ».
- `sprint-status.yaml` : story passée en **review** / **done** uniquement après **DS + gates + QA + CR** (hors périmètre **CS**).

## Dev Agent Record

### Agent Model Used

Composer (agent dev BMAD / sous-agent Task Story Runner), session 2026-04-10.

### Debug Log References

- Ajustement mock `get_unified_live_stats` : accepter `**kwargs` (signature async réelle avec `period_type`, `site_id`).

### Completion Notes List

- Outbox `paheko_outbox_items` + enqueue dans `CashSessionService.close_session_with_amounts` (même `commit` que la clôture) ; corrélation `request_id` → `sync_correlation_id`.
- Client `PahekoAccountingClient` (httpx, `MockTransport` en test) ; processeur `process_next_paheko_outbox_item` (PostgreSQL `SKIP LOCKED`, SQLite sans verrouillage ligne).
- API admin `GET /v1/admin/paheko-outbox/items` + détail ; bandeau : pire `sync_state_core` outbox par site dans `build_exploitation_live_snapshot`.
- OpenAPI **0.1.11-draft** + `npm run generate` sur `recyclique-api.ts` (doc limite 8.1 vs 8.2 sur `a_reessayer` / `failed`).
- Registre Epic 8 + index artefacts mis à jour (AC7). **AC6** : aucune dépendance Epic 9.
- Pytest slice : `tests/test_story_8_1_paheko_outbox_slice.py` ; régressions `test_sync_service` / `test_dashboard_stats` ; QA a enrichi les tests OpenAPI / états admin.
- Revue code **CR1** CHANGES_REQUESTED → correctifs : `IntegrityError` + savepoint sur enqueue idempotent ; OpenAPI explicite absence de repassage auto `pending` avant **8.2** → **CR2 APPROVED** (Story Runner 2026-04-10).

### File List

- `recyclique/api/src/recyclic_api/models/paheko_outbox.py`
- `recyclique/api/migrations/versions/story_8_1_add_paheko_outbox_items.py`
- `recyclique/api/src/recyclic_api/models/__init__.py`
- `recyclique/api/src/recyclic_api/core/config.py`
- `recyclique/api/src/recyclic_api/services/paheko_accounting_client.py`
- `recyclique/api/src/recyclic_api/services/paheko_outbox_service.py`
- `recyclique/api/src/recyclic_api/services/paheko_outbox_processor.py`
- `recyclique/api/src/recyclic_api/services/cash_session_service.py`
- `recyclique/api/src/recyclic_api/services/exploitation_live_snapshot_service.py`
- `recyclique/api/src/recyclic_api/application/cash_session_closing.py`
- `recyclique/api/src/recyclic_api/schemas/paheko_outbox.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_paheko_outbox.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/__init__.py`
- `recyclique/api/src/recyclic_api/api/api_v1/api.py`
- `recyclique/api/tests/conftest.py`
- `recyclique/api/tests/test_story_8_1_paheko_outbox_slice.py`
- `contracts/openapi/recyclique-api.yaml`
- `contracts/openapi/generated/recyclique-api.ts`
- `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md`
- `references/artefacts/index.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/8-1-implementer-un-premier-slice-syncable-de-bout-en-bout-recyclique-paheko.md`

## Change Log

- 2026-04-10 — Implémentation Story 8.1 (outbox, client Paheko, processeur, endpoints admin, OpenAPI, tests, registre Epic 8). Statut sprint → **review**.
- 2026-04-10 — Story Runner : gates (pytest slice + sync + dashboard ; peintre lint/build ; `npm run generate` OpenAPI), QA, CR → correctifs CR (OpenAPI 0.1.11, `IntegrityError` enqueue) ; sprint → **done**.
