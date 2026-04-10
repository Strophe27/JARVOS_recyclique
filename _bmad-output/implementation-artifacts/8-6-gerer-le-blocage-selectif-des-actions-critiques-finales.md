# Story 8.6 : Gérer le blocage sélectif des actions critiques finales

Status: done

**Story ID :** 8.6  
**Story key :** `8-6-gerer-le-blocage-selectif-des-actions-critiques-finales`  
**Epic :** 8 — Fiabiliser l'articulation comptable réelle avec Paheko

<!-- Ultimate context engine analysis completed — BMAD bmad-create-story (create) 2026-04-10. FR66 / FR69 / FR70 ; politique backend ; distinction locale vs gating ; pas de gel global terrain. -->

## Story Preparation Gate (obligatoire — exécution DS)

| Dimension | Valeur figée pour 8.6 |
|-----------|------------------------|
| **Slice opérationnel** | Même périmètre **8.1–8.5** par défaut : outbox **`cash_session_close`** (`PahekoOutboxOperationType.CASH_SESSION_CLOSE`). Toute extension à d'autres `operation_type` ou autres « actions finales » = **hors DoD** sauf décision explicite de gouvernance documentée dans la story ou le registre Epic 8. |
| **Actions finales critiques nommées (DoD 8.6)** | **(A1)** **Clôture définitive de session de caisse avec prise en charge comptable outbound** : mutation backend **`recyclique_cashSessions_closeSession`** (`POST` clôture session) — moment où le terrain **termine** la session **et** **enfile** / **scelle** le handoff vers la chaîne Paheko (outbox + états **8.2**), au sens **Epic 6 clôture locale** complétée par **garanties comptables** définies par la **politique de sync** (ci-dessous). **Liste ouverte** : tout ajout futur d'action finale critique doit passer par **même mécanisme** (registre / config backend **explicite**), pas par logique dispersée dans Peintre. |
| **Opérations locales acceptées (exemples non exhaustifs — ne pas bloquer par défaut)** | Activité caisse sur session **ouverte** (ventes, tickets en attente, remboursements contrôlés, actions sociales, etc. — périmètre **Epic 6**) ; **réception v2** (**Epic 7**) ; consultations / listings ; ouverture de session ; actions admin outbox déjà **permissionnées** (**8.4**) — tant qu'elles ne sont **pas** inscrites comme **finales critiques** dans la politique. **Interdit** : geler « toute la caisse » ou tout le terrain pour un retard / échec de sync sur une ligne **non** qualifiée bloquante pour **(A1)**. |
| **Prérequis livrés** | **8.1** outbox clôture ; **8.2** états, retries, `SyncStateCore` ; **8.3** mapping ; **8.4** quarantaine & résolution tracée ; **8.5** `correlation_id`, timeline / filtres support. |
| **Objectif 8.6** | Implémenter une **politique de blocage sélectif** **côté backend uniquement** : quand une **garantie comptable** requise pour **(A1)** n'est **pas** satisfaite, la mutation **(A1)** est **refusée** ou **contrainte** avec sémantique **distincte** de « accepté localement, sync différée / en cours » ; journalisation et **contrat API** exploitables (observabilité **8.5**, **NFR7**, **AR17**). |
| **Hors périmètre** | **8.7** (validation réconciliation réelle globale) ; **UI Peintre** comme source de vérité — seulement **affichage** des codes / états renvoyés par l'API si nécessaire ; inventaire de **toutes** les futures actions finales hors slice (déclarations, exports fiscaux, etc.) — reporter hors DoD sauf entrée explicite au registre. |
| **Principe non négociable** | **Terrain-first** ; **backend autoritaire** ; **Peintre n'est pas la SoT** ; distinction contractuelle **acceptation locale non bloquante** vs **blocage sélectif** des finales critiques — `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` **§5.3**. |

### Politique de sync (à matérialiser en DS — concepts)

- **Registre ou module backend** listant les **actions finales critiques** (minimum **(A1)**) et, pour chacune, les **conditions** de garde (ex. : absence de ligne outbox **bloquante** pour la session / le site concerné ; état `en_quarantaine` sur une ressource **explicitement liée** à la garantie de **(A1)** ; mapping **8.3** manquant si la politique l'exige **avant** première émission ; seuils **documentés** — **pas** de règles magiques dans le front).
- **Réponses HTTP / schémas** : codes et payloads **stables** (alignement **AR21**) distinguant **« clôture locale OK, sync en file »** vs **« action finale refusée — politique sync »** ; **jamais** équivaloir les deux côté client.
- **Observabilité** : logs structurés (raison de blocage, `correlation_id` si déjà attribué, `cash_session_id`, `site_id`, état outbox / quarantaine pertinent) ; lien avec **8.5** pour investigation support.

## Story

En tant que **système métier responsable**,

je veux que **seules** les **véritables actions finales critiques** — **explicitement désignées** par la politique de sync — puissent être **soumises à un blocage** fondé sur les **garanties comptables**,

afin de **préserver la continuité terrain par défaut** (**FR66**) tout en **empêchant** les **finalisations dangereuses** lorsque la chaîne vers Paheko n'est pas **sûre** (**FR69**, **FR70**), **sans** réécrire le parcours nominal caisse **Epic 6** (**`epics.md`** Story 8.6).

## Contraintes produit et architecture (non négociables)

- **Handoff Epic 6 → 8** : la **clôture locale exploitable** reste la base ; **8.6** définit **quand** la **suffisance locale** cède la place au **gating comptable** pour **(A1)** uniquement (et extensions futures **nommées**), pas de refonte des flows terrain nominaux.
- **Brownfield-first** : étendre `cash_session_closing` / `cash_session_service` / présentation close (**`cash_session_close_presentation`**) et, si besoin, services outbox — **sans** casser les **`operationId`** **8.1–8.5** sans migration documentée.
- **Pas de gel global** : un état dégradé sur **une** ligne outbox ou **un** mapping ne doit **pas**, par défaut, interdire **l'ensemble** des opérations terrain ; le blocage cible **(A1)** (et futures entrées du registre) **uniquement** selon la politique.
- **Cohérence avec 8.4** : une quarantaine **bloquante** pour **(A1)** doit être **cohérente** avec les états et l'audit existants ; levée / résolution restent les parcours **8.4**, pas des contournements front.

## État des lieux code (post 8.6)

- **Clôture** : `enqueue_cash_session_close_outbox`, corrélation **8.5**, réponse enrichie `paheko_sync_correlation_id` / `paheko_outbox_item_id`.
- **Outbox** : états **8.2**, quarantaine **8.4**, timeline **8.5**.
- **8.6 livré** : `paheko_sync_final_action_policy` + garde dans `close_session_with_amounts` ; refus **409** / `PAHEKO_SYNC_FINAL_ACTION_REFUSED` distinct du **200** + outbox ; logs `paheko_a1_policy_refused*`.

## Acceptance Criteria

1. **Politique explicite et actions nommées** — Étant donné le principe **terrain-first** et **FR69**, quand le backend évalue une action soumise au gating, alors **seules** les actions inscrites comme **finales critiques** dans la **politique** (minimum **(A1)** — clôture session + handoff outbox slice courant) peuvent être **bloquées** ou **contraintes** pour raison de sync / compta ; **aucune** règle équivalente ne vit dans **Peintre** comme source de vérité. [Sources : `epics.md` 8.6 AC1 ; **FR69** ; contrat **§5.3**]

2. **Continuité terrain hors actions finales** — Étant donné **FR66**, quand l'intégration Paheko est **indisponible**, **en erreur** ou **en quarantaine** sur des périmètres **non** qualifiés bloquants pour **(A1)** selon la politique, alors les **opérations locales** (ventes et autres flux **session ouverte**, réception, etc.) **restent** possibles ; le système **ne** fige **pas** tout le terrain par défaut. [Sources : `epics.md` 8.6 AC1 ; **FR66**]

3. **Sémantique bloquée / contrainte vs locale acceptée** — Étant donné qu'une **clôture** ou finalité **(A1)** ne peut plus être **garantie** comptablement selon la politique (ex. ressource **bloquante** en **`en_quarantaine`**, mapping requis absent si la politique l'impose, autre prédicat **documenté**), quand l'utilisateur tente **(A1)**, alors la réponse API porte un **état refus / contrainte** **clair** et **distinct** de « enregistré localement, sync différée » / « en cours de traitement outbox » (**FR24**, distinction **UX-DR9**) ; le client peut afficher un message **sans** inférer la règle lui-même. [Sources : `epics.md` 8.6 AC2 ; **FR70** ; contrat **§5.3**]

4. **Observabilité et support** — Étant donné **8.5**, **NFR7**, **AR17**, quand un blocage ou une contrainte **(A1)** s'applique, alors les **logs** et/ou **métadonnées** d'erreur exposées (dans les limites **AR21**) permettent au **support** de relier **session**, **outbox**, **corrélation**, **raison structurée** de politique **sans** reconstitution ad hoc. [Sources : **NFR7** ; **NFR10**]

5. **OpenAPI et non-régression** — Étant donné **AR39** et les livraisons **8.1–8.5**, quand la story est livrée, alors `contracts/openapi/recyclique-api.yaml` décrit les **nouveaux** codes / champs / enums **sans** casser **`recyclique_cashSessions_closeSession`** ni les routes outbox **figées** ; évolutions **rétro-compatibles** ou note de migration. [Sources : stories **8.4** / **8.5** inventaires `operationId`]

6. **Tests** — Étant donné les scénarios ci-dessus, quand la suite ciblée s'exécute, alors des **pytest** couvrent : **(a)** **(A1)** **autorisée** lorsque la politique est satisfaite (non-régression **8.1–8.5**) ; **(b)** **(A1)** **refusée** (ou contrainte documentée) lorsque la politique **exige** un blocage **nommé** (ex. fixture quarantaine **bloquante** pour la session) ; **(c)** au moins un chemin où une **opération locale** hors **(A1)** **reste** permise malgré un état dégradé sync **non** bloquant selon la politique. [Sources : `epics.md` 8.6 ; **FR66**]

7. **Registre Epic 8** — Étant donné la méthode des epics 8.x, quand l'implémentation progresse, alors `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md` est **mis à jour** (politique **(A1)**, prédicats, codes API, commande pytest ciblée si suite globale KO). [Sources : pratique **8.4** / **8.5**]

8. **Cohérence Epic 6** — Étant donné **Epic 6** clôture locale, quand **8.6** est implémentée, alors elle **complète** le handoff (« fin de suffisance locale → gating comptable » pour **(A1)**) **sans** réécrire le parcours nominal caisse. [Sources : `epics.md` 8.6 AC3]

## Tasks / Subtasks

- [x] **Formaliser la politique** — Documenter les **prédicats** exacts (pseudo-code ou table) pour **(A1)** : quels états outbox / quarantaine / mapping **bloquent** ; ce qui **ne bloque pas** ; paramètres configurables vs constants **versionnés**. (AC : 1, 2, 8)

- [x] **Implémenter le moteur de garde** — Point d'injection unique **avant** commit / enqueue définitif de **(A1)** (service ou domain) ; **pas** de duplication dans les endpoints Peintre ; réutiliser lecture outbox / session / mapping **8.2–8.4**. (AC : 1, 3, 5)

- [x] **Contrat API + schémas** — Codes HTTP / champs d'erreur **stables** ; distinction réponse « clôture acceptée localement + outbox » vs « refus politique » ; bump OpenAPI + génération TS si pipeline. (AC : 3, 5)

- [x] **Observabilité** — Logs structurés ; corrélation ; raison **machine-readable** (code politique) ; alignement avec timeline **8.5** si pertinent. (AC : 4)

- [x] **Tests** — Fichier dédié ex. `tests/test_story_8_6_selective_blocking.py` ; mocks Paheko / outbox selon patterns **8.4**. (AC : 6)

- [x] **Registre + index** — Mise à jour registre Epic 8 + `references/artefacts/index.md` si paragraphe significatif. (AC : 7)

## Dev Notes

### Notes structure projet

- Code applicatif backend : racine paquet `recyclique/api/src/recyclic_api/` (chemins du tableau « Fichiers et modules probables » relatifs à ce paquet sauf mention contraire).
- Contrats HTTP publics : `contracts/openapi/recyclique-api.yaml` (+ génération TS du dépôt si le pipeline l’exige).

### Fichiers et modules probables

| Zone | Fichiers (indicatif) |
|------|----------------------|
| Clôture | `application/cash_session_closing.py`, `services/cash_session_service.py`, `application/cash_session_close_presentation.py` |
| Politique / garde | Nouveau module ex. `services/paheko_sync_final_action_policy.py` ou équivalent **documenté** |
| Outbox / états | `services/paheko_outbox_service.py`, `models/paheko_outbox.py` |
| API | `api/api_v1/endpoints/cash_sessions.py` |
| Schémas | `schemas/cash_session.py`, schémas erreur **AR21** |
| Contrat | `contracts/openapi/recyclique-api.yaml`, `contracts/openapi/generated/recyclique-api.ts` |

### operationId et routes figés (non-régression Epic 8)

Ne pas renommer sans migration documentée : **`recyclique_cashSessions_closeSession`** ; ensemble **8.4** / **8.5** (`recyclique_pahekoOutbox_*`, `recyclique_pahekoMapping_*`, `recyclique_exploitation_*`). Toute **nouvelle** route ou `operationId` pour exposer la politique en **lecture** (optionnel) doit être **versionnée** et **documentée**.

### Références techniques et produit

- `_bmad-output/planning-artifacts/epics.md` — Epic 8, Story **8.6** ; note agents (backend only, Peintre états seulement).
- `_bmad-output/implementation-artifacts/8-5-mettre-en-place-le-suivi-et-la-correlation-inter-systemes-des-operations.md` — corrélation, champs clôture.
- `_bmad-output/implementation-artifacts/8-4-encadrer-la-quarantaine-et-la-resolution-manuelle-des-ecarts-persistants.md` — quarantaine **bloquante** sémantique.
- `_bmad-output/implementation-artifacts/8-2-gerer-lidempotence-les-retries-et-les-statuts-explicites-de-sync.md` — `SyncStateCore`.
- `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` — **§5.3** (acceptation locale vs blocage sélectif).
- `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md` — registre Epic 8.
- `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` — pas de logique comptable dans Peintre.
- `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — repères validation / parcours caisse (continuum terrain).

### Conformité architecture (extraits pertinents)

- **AR8** — Paheko via backend uniquement.
- **AR11** — Outbox durable ; le **refus** de **(A1)** ne doit **pas** créer d'incohérence silencieuse (pas d'enqueue « à moitié » sans règle claire).
- **AR17** — Corrélation sur refus / contrainte.
- **AR21** — Enveloppe d'erreur stable.
- **AR39** — OpenAPI reviewable.

## Exigences de test

- Pytest ciblé **8.6** + non-régression **8.1–8.5** sur le slice clôture.
- Si `pytest` complet du dépôt reste non vert (brownfield) : documenter la **commande exacte** du sous-ensemble dans le registre Epic 8.

## Definition of Done

- AC **1 à 8** satisfaits.
- Aucune régression sur les **`operationId`** et schémas publics des stories **8.1–8.5** sans note de migration.
- `sprint-status.yaml` : passage **in-progress** / **review** / **done** uniquement après **DS + gates + QA + CR** (hors périmètre **CS**).

## Dev Agent Record

### Agent Model Used

Cursor — sous-agent Task BMAD Story Runner (exécution bmad-dev-story 2026-04-10).

### Debug Log References

### Completion Notes List

- Vérification **AC 1–8** : politique **(A1)** centralisée dans `paheko_sync_final_action_policy.py` (`POLICY_VERSION=8.6.1`, prédicats P1 quarantaine outbox session / P2 mapping clôture) ; garde appelée depuis `CashSessionService.close_session_with_amounts` **avant** `enqueue_cash_session_close_outbox` + `commit`.
- **HTTP** : `run_close_cash_session` (`cash_session_closing.py`) transforme `PahekoSyncPolicyBlockedError` en **409** avec payload AR21 (`code` `PAHEKO_SYNC_FINAL_ACTION_REFUSED`, `policy_reason_code`, `correlation_id`, `blocking_outbox_item_id` si applicable) — distinct du **200** + champs `paheko_*` (8.5).
- **FR66** : `add_sale_to_session` et clôture d’une **autre** session restent possibles si seule une session voisine a une ligne outbox en quarantaine (tests dédiés).
- **OpenAPI** `recyclique_cashSessions_closeSession` : description + réponse **409** documentées ; schéma `RecycliqueApiError` enrichi (champs `policy_*` / `blocking_*`).
- **Pytest** (Task) : `tests/test_story_8_1` … `test_story_8_6` + `test_cash_session_empty` + `test_cash_session_close_policy` — **PASS** (SQLite) ; `contracts/openapi` **`npm run generate`** exécuté.

### File List

- `recyclique/api/src/recyclic_api/services/paheko_sync_final_action_policy.py`
- `recyclique/api/src/recyclic_api/services/cash_session_service.py`
- `recyclique/api/src/recyclic_api/application/cash_session_closing.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_cash_sessions_maintenance.py`
- `recyclique/api/src/recyclic_api/core/exceptions.py`
- `recyclique/api/src/recyclic_api/schemas/recyclique_api_error.py`
- `recyclique/api/tests/test_story_8_6_selective_blocking.py`
- `recyclique/api/tests/test_story_8_1_paheko_outbox_slice.py`
- `recyclique/api/tests/test_story_8_2_paheko_outbox_retry_idempotence.py`
- `recyclique/api/tests/test_story_8_3_paheko_mapping.py`
- `recyclique/api/tests/test_story_8_5_paheko_correlation.py`
- `recyclique/api/tests/test_cash_session_empty.py`
- `recyclique/api/tests/test_cash_session_close_policy.py`
- `contracts/openapi/recyclique-api.yaml`
- `contracts/openapi/generated/recyclique-api.ts`
- `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md`
- `references/artefacts/index.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Intelligence story précédente (8.5)

- **Corrélation** et liens session ↔ outbox sont **exploitables** ; les **refus 8.6** doivent **réutiliser** les mêmes identifiants dans les logs et, si pertinent, les **réponses** d'erreur pour le support.
- Ne **pas** déplacer la **décision** de blocage dans un **filtre** Peintre : tout **prédicat** sur **(A1)** reste **serveur**.

## Décisions par défaut (exécution sans arbitrage bloquant)

- **Première livraison** : politique **code-first** (module Python + constantes / enum **documentés**) plutôt que table SQL de règles, sauf si l'équipe impose la config dynamique — dans ce cas, migration + **seed** minimal pour **(A1)** uniquement.
- **Granularité blocage** : par **session** / **site** alignée sur le slice **cash_session_close** ; ne pas généraliser à d'autres agrégats sans **entrée registre**.

## Change Log

- 2026-04-10 — Fichier story créé (bmad-create-story, mode **create** / CS) : politique **(A1)**, distinction locale / finale bloquée, observabilité backend, alignement **8.1–8.5** et contrat **§5.3**.
- 2026-04-10 — DS (bmad-dev-story Task) : validation alignement code/tests/OpenAPI avec AC ; story → **review** ; registre Epic 8 + index artefacts ; `sprint-status` **8-6** → **review** ; pytest slice 8.x + `npm run generate` (contracts/openapi).
- 2026-04-10 — Story Runner (CS→VS→DS→gates→QA→CR) : gates verts ; `npm run generate` exécuté depuis `contracts/openapi` (le script n’existe pas dans `peintre-nano`) ; story `8-6` → **done** ; `sprint-status` **8-6** → **done**.
