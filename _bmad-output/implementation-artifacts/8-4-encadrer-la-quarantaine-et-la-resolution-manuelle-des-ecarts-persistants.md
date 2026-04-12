# Story 8.4 : Encadrer la quarantaine et la résolution manuelle des écarts persistants

Status: done

**Story ID :** 8.4  
**Story key :** `8-4-encadrer-la-quarantaine-et-la-resolution-manuelle-des-ecarts-persistants`  
**Epic :** 8 — Fiabiliser l'articulation comptable réelle avec Paheko

<!-- Ultimate context engine analysis completed — BMAD create-story (CS) 2026-04-10. Workflows gouvernés quarantaine / levée / rejet ; audit §6 contrat ; backend autoritaire ; pas de nettoyage silencieux. -->

## Story Preparation Gate (obligatoire — exécution DS)

| Dimension | Valeur figée pour 8.4 |
|-----------|------------------------|
| **Slice opérationnel** | Même périmètre **8.1 / 8.2 / 8.3** : ligne outbox **`cash_session_close`** (`PahekoOutboxOperationType.CASH_SESSION_CLOSE`) ; pas d'élargissement à d'autres `operation_type` dans le DoD **done** de 8.4 sauf décision explicite de gouvernance (hors scope par défaut). |
| **Déclencheurs `en_quarantaine`** (non exhaustif — aligner contrat §5.2) | (1) **Échec persistant** après politique retry **8.2** (ex. `max_attempts_exceeded`) ; (2) **Erreurs HTTP / métier** classées **non retryables** menant à une quarantaine explicite ; (3) **Mapping manquant ou invalide** **8.3** (`mapping_resolution_error`, etc.) ; (4) toute **incohérence durable** documentée dans le processor (codes / raisons structurées) — **sans** inventer de nouveaux états métier hors `SyncStateCore` sans bump contrat coordonné. |
| **Hors périmètre** | **Epic 9** (gouvernance mappings sensibles à grande échelle, déclarations) — **aucune** dépendance fonctionnelle ; **8.5** (corrélation inter-systèmes élargie) — réutiliser `correlation_id` existant, ne pas refaire toute la story 8.5 ; **8.6** (blocage sélectif actions finales) — seulement **rappels contractuels** si nécessaire, pas d'implémentation du moteur de blocage ici ; **UI Peintre** — pas de logique comptable côté frontend ; consommation d'API / affichage d'états = optionnel et **thin**. |
| **Principe non négociable** | **Aucun nettoyage silencieux** : pas de suppression / archivage / passage d'état « discrète » sans **transition nommée**, **traçable** et **exposée** (OpenAPI + persistance audit). |

## Story

En tant que **responsable de ressourcerie ou super-admin** (profil habilité selon **1.3** / contrat §6),

je veux que les **écarts de sync persistants** entrent dans des **workflows de quarantaine contrôlés** et puissent être **résolus** ou **rejetés explicitement**,

afin que les problèmes comptables soient **contenus, traçables** et **jamais ignorés en silence** (**FR25**, **FR26**, **FR27**, **NFR2**, **NFR6**).

## Contraintes produit et architecture (non négociables)

- **Brownfield-first** : étendre l'outbox, le processor et les endpoints admin **8.1–8.3** sans casser idempotence, retries, `operationId` OpenAPI figés.
- **Backend autoritaire** : toute règle de transition, permission et audit **uniquement** dans `recyclique/api`.
- **Pas de fallback silencieux** : une levée de quarantaine ou une « résolution » **sans** action humaine (ou automation **nommée** + auditable) **interdite** si le contrat impose une décision tracée.
- **Transitions visibles** : chaque sortie de `en_quarantaine` vers `a_reessayer`, `resolu`, ou `rejete` (ou équivalent technique cohérent avec la machine existante) doit être **persistée** et **consultable** (liste / détail outbox + piste d'audit).
- **Epic 9** : ne pas rouvrir ni reporter la gouvernance 8.4 sur des stories 9.x.

## État des lieux code (à partir de 8.2 / 8.3)

- **États** : `SyncStateCore` — `a_reessayer`, `en_quarantaine`, `resolu`, `rejete` (story **8.2**) ; sémantique rappelée dans le contrat minimal §2.3.
- **Rejet** : `POST .../paheko-outbox/items/{id}/reject` avec `rejection_reason` — pose une **décision explicite** mais l'**audit complet** « qui / quoi / quand / contexte » au sens **§6** du contrat peut rester **à compléter** (c'est le cœur de **8.4**).
- **Quarantaine auto** : ex. `max_attempts_exceeded`, échecs mapping **8.3** → `en_quarantaine` + champs d'erreur structurés.
- **Gap 8.4** : parcours **gouvernés** pour (a) **documenter l'entrée** en quarantaine avec contexte exploitable ; (b) **résolution manuelle** (ex. après correction mapping / données / Paheko) avec **ré-autorisation contrôlée** du traitement (`a_reessayer`) ou constat de **résolution** (`resolu`) selon règles **strictes** (pas de `resolu` sans critères alignés **8.2**) ; (c) **rejet** déjà amorcé — **enrichir l'audit** ; (d) **interdiction** de transitions « magiques » ou purge sans journal.

## Acceptance Criteria

1. **Entrée en quarantaine traçable** — Étant donné un échec persistant, une incohérence durable ou une correspondance requise absente/invalide (cf. contrat §5.2), quand le système place une ligne outbox en **`en_quarantaine`**, alors la transition est **explicite** (état + code / raison structurée déjà existants ou enrichis) et un **humain habilité** peut comprendre **le contexte minimal** (identifiant opération, site/session si applicable, dernière erreur, corrélation si présente) **sans** fouiller uniquement des logs bruts. [Sources : `epics.md` 8.4 AC1 ; contrat §5.2–5.3 ; **FR25**]

2. **Résolution / levée gouvernée** — Étant donné une ligne en **`en_quarantaine`**, quand un utilisateur **autorisé** exécute une action de **résolution** ou de **levée** (retour contrôlé vers **`a_reessayer`** pour nouveau traitement, ou transition vers **`resolu`** **uniquement** si les critères déjà définis en **8.2** sont respectés), alors l'action est **restreinte au périmètre de permissions** (admin / super-admin / rôle métier aligné **1.3**) et enregistre **auteur**, **date/heure ISO 8601**, **contexte** (identifiants stables, état avant/après), **raison obligatoire** — conformément au contrat §6 (**FR26**, **FR27**, **NFR6**). [Sources : `epics.md` 8.4 AC2 ; contrat §5.4 et §6]

3. **Rejet explicite et audit** — Étant donné qu'un **rejet** reste une décision sensible, quand le flux de rejet est utilisé ou complété, alors il produit la **même exigence d'audit** qu'en AC2 (qui, quand, quoi, raison, corrélation) et **aucune** relance automatique identique sans changement de contexte (cohérent **`rejete`** §2.3). [Sources : contrat §5.4 ; **8.2** endpoint reject]

4. **Visibilité et pas de disparition silencieuse** — Étant donné une ligne outbox ayant traversé quarantaine / résolution / rejet, quand on consulte l'**API admin** ou la **piste d'audit**, alors l'**historique des transitions significatives** reste **visible** (pas de suppression « discrète » de la ligne ou de son historique pour « nettoyer ») ; les champs exposés restent alignés **AR39** / OpenAPI. [Sources : `epics.md` 8.4 AC3 ; **NFR2**]

5. **OpenAPI et gouvernance** — Étant donné **AR39**, quand la story est livrée, alors `contracts/openapi/recyclique-api.yaml` (et `contracts/openapi/generated/recyclique-api.ts` si pipeline repo) décrit les **nouvelles** actions / champs d'audit / schémas **sans** second contrat HTTP parallèle ; **ne pas renommer** les `operationId` existants : `recyclique_cashSessions_closeSession`, `recyclique_pahekoOutbox_listItems`, `recyclique_pahekoOutbox_getItem`, `recyclique_exploitation_getLiveSnapshot`, ni casser `reject` sauf évolution rétro-compatible documentée.

6. **Tests** — Étant donné les scénarios ci-dessus, quand la suite ciblée s'exécute, alors des tests **pytest** couvrent : entrée en quarantaine **avec** contexte exposé ; **résolution / levée** avec audit persisté ; **tentative non autorisée** (rôle insuffisant) **rejetée** ; **interdiction** de transition invalide (ex. `resolu` sans critère 8.2).

7. **Registre Epic 8** — Étant donné la méthode des epics 6/7/8, quand l'implémentation progresse, alors `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md` est **mis à jour** (workflows quarantaine, audit, liens migration / OpenAPI, commande pytest ciblée si suite globale KO).

## Tasks / Subtasks

- [x] **Cartographier transitions existantes** — Lister tous les chemins menant à `en_quarantaine` / `rejete` / `resolu` dans `paheko_outbox_processor` et services associés ; identifier les trous d'audit vs contrat §6. (AC : 1, 2, 4)

- [x] **Modèle d'audit** — Table dédiée append-only ou extension **documentée** (événements de transition : `from_state`, `to_state`, `actor_user_id`, `occurred_at`, `reason`, `correlation_id`, payload contexte minimal) ; migration Alembic + accès repository/service. (AC : 2, 3, 4)

- [x] **Endpoints gouvernés** — Nouveaux endpoints admin (noms à figer dans OpenAPI) : ex. **levée / reprise traitement** (`en_quarantaine` → `a_reessayer` + ré-éligibilité processor selon règles 8.2), **résolution constatée** vers `resolu` **uniquement** si critères HTTP / métier 8.2 satisfaits ; harmoniser avec **reject** existant pour le **même** niveau d'audit. Permissions alignées **1.3** (admin local / super-admin — arbitrage précis dans les Dev Notes si besoin). (AC : 2, 3, 5)

- [x] **Processor** — S'assurer qu'après levée, le worker ne « saute » pas les garde-fous (mapping 8.3, idempotence 8.2) ; pas de retry infini ; pas de passage `resolu` sans preuve conforme. (AC : 2, 4, 6)

- [x] **OpenAPI + schémas Pydantic** — Réponses list/get outbox enrichies si nécessaire (**dernière action manuelle**, lien vers entrées d'audit) ; documenter codes d'erreur permission / transition invalide. (AC : 4, 5)

- [x] **Tests** — Fichier dédié `tests/test_story_8_4_paheko_quarantine_resolution.py` (ou extension 8.x) ; mocks Paheko inchangés sur le principe. (AC : 6)

- [x] **Registre + index** — Mise à jour registre Epic 8 + `references/artefacts/index.md` si nouveau paragraphe significatif. (AC : 7)

## Dev Notes

### Fichiers et modules probables

| Zone | Fichiers (indicatif) |
|------|----------------------|
| Processor / services | `paheko_outbox_processor.py`, `paheko_outbox_service.py`, éventuellement nouveau `paheko_outbox_audit_service.py` |
| Modèle / migration | `models/paheko_outbox.py` + nouvelle table audit ; `migrations/versions/…_story_8_4_*.py` |
| API | `admin_paheko_outbox.py` (ou route dédiée cohérente avec les patterns admin existants) |
| Schémas | `schemas/paheko_outbox.py`, schémas audit |
| Contrat | `contracts/openapi/recyclique-api.yaml`, `contracts/openapi/generated/recyclique-api.ts` |
| Permissions | Réutiliser patterns RBAC **1.3** / endpoints admin existants |

### Références techniques et produit

- `_bmad-output/planning-artifacts/epics.md` — Epic 8, Story 8.4 ; note agents (backend only).
- `_bmad-output/implementation-artifacts/8-2-gerer-lidempotence-les-retries-et-les-statuts-explicites-de-sync.md` — machine d'états, reject, critères `resolu`.
- `_bmad-output/implementation-artifacts/8-3-gerer-les-correspondances-site-caisse-emplacements-paheko.md` — mapping, `en_quarantaine` mapping.
- `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` — §2.3 (états), §5.2–5.4 (quarantaine, résolution/rejet), **§6 (audit minimal)**.
- `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md` — registre Epic 8.
- `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md`, `2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md`.
- `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` — Peintre sans logique comptable.

### Conformité architecture

- **AR8** — Paheko via backend uniquement.
- **AR11** — Outbox durable ; pas de perte d'historique d'exception.
- **AR17** — Conserver `correlation_id` sur les actions manuelles.
- **AR21** — Enveloppe d'erreur stable si exposée.
- **AR24** — Idempotence inchangée sur la livraison.
- **AR39** — OpenAPI reviewable seule source des schémas publics.
- **NFR6** — Journalisation des résolutions manuelles.

## Exigences de test

- Pytest ciblé **8.4** + non-régression **8.1 / 8.2 / 8.3** sur le slice clôture.
- Si `pytest` complet du dépôt reste non vert (brownfield) : documenter la **commande exacte** du sous-ensemble dans le registre Epic 8.

## Definition of Done

- AC **1 à 7** satisfaits.
- `sprint-status.yaml` : passage **in-progress** / **review** / **done** uniquement après **DS + gates + QA + CR** (hors périmètre **CS**).

## Dev Agent Record

### Agent Model Used

Composer (agent Task / bmad-dev-story)

### Debug Log References

—

### Completion Notes List

- Table **`paheko_outbox_sync_transitions`** + migration **`b8_4_paheko_outbox_sync_audit`** ; append via `paheko_outbox_transition_audit.append_paheko_outbox_transition`.
- **Processor** : transitions nommées vers `en_quarantaine`, succès `delivered`/`resolu`, mapping fail, unsupported op, max attempts, HTTP non retryable.
- **API** : `GET .../sync-transitions` (ordre chronologique asc), `POST .../lift-quarantine`, `POST .../confirm-resolved` (409 si pas `delivered`) ; **reject** exige `actor_user_id` et écrit la même structure d'audit ; détail outbox inclut **`recent_sync_transitions`** (10 dernières, desc).
- OpenAPI **0.1.14-draft** + `npm run generate` ; pytest **`test_story_8_4_paheko_quarantine_resolution.py`** + non-régression 8.1–8.3 PASS.

### File List

- `recyclique/api/migrations/versions/b8_4_story_8_4_paheko_outbox_sync_audit.py`
- `recyclique/api/src/recyclic_api/models/paheko_outbox_sync_transition.py`
- `recyclique/api/src/recyclic_api/models/__init__.py`
- `recyclique/api/src/recyclic_api/services/paheko_outbox_transition_audit.py`
- `recyclique/api/src/recyclic_api/services/paheko_outbox_processor.py`
- `recyclique/api/src/recyclic_api/services/paheko_outbox_service.py`
- `recyclique/api/src/recyclic_api/schemas/paheko_outbox.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_paheko_outbox.py`
- `recyclique/api/tests/conftest.py`
- `recyclique/api/tests/test_story_8_4_paheko_quarantine_resolution.py`
- `contracts/openapi/recyclique-api.yaml`
- `contracts/openapi/generated/recyclique-api.ts`
- `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md`
- `references/artefacts/index.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/8-4-encadrer-la-quarantaine-et-la-resolution-manuelle-des-ecarts-persistants.md`

## Intelligence stories précédentes (8.2 / 8.3)

- **8.2** : retry, `next_retry_at`, plafond → `en_quarantaine` ; `reject` → `rejete` ; `resolu` / `delivered` seulement après HTTP 2xx ou 409 idempotent — **8.4** n'assouplit **pas** ces règles.
- **8.3** : résolution mapping au processor ; échec mapping → pas de POST, état explicite + `mapping_resolution_error` — les **levées** après correction de config doivent rester **tracées** (8.4).

## Décisions par défaut (exécution sans arbitrage bloquant)

- **Stockage audit** : table **append-only** dédiée préférée à l'altération de champs JSON opaques sur la ligne outbox seule (meilleure exploitabilité support).
- **Levée typique** : `en_quarantaine` → **`a_reessayer`** + remise en file (`pending` / éligibilité selon règles 8.2) après **raison** + **acteur** ; **`resolu`** seulement si une **tentative réussie** ou règle **8.2** explicite est satisfaite.
- **Automatisation** : toute règle auto sortant de la quarantaine doit être **nommée**, **configurable** et **auditable** ; défaut story : **pas** d'auto-levée sans ce cadre.

**Écarts à remonter au produit** (non bloquants pour démarrer) : granularité exacte « admin local site » vs « super-admin global » pour chaque endpoint 8.4.

## Change Log

- 2026-04-10 — Fichier story créé (CS bmad-create-story) : quarantaine gouvernée, résolution manuelle, audit §6, hors Epic 9 / hors logique Peintre.
- 2026-04-10 — DS (bmad-dev-story Task) : implémentation 8.4 — table audit, endpoints, processor, OpenAPI 0.1.14-draft, tests, registre ; statut **review**.
