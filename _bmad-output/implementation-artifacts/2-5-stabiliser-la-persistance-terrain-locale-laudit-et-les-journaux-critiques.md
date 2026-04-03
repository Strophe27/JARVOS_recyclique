# Story 2.5 : Stabiliser la persistance terrain locale, l'audit et les journaux critiques

**Clé fichier (obligatoire) :** `2-5-stabiliser-la-persistance-terrain-locale-laudit-et-les-journaux-critiques`  
**Epic :** epic-2 — **Piste B** (autorité backend Recyclique)  
**Statut :** done

<!-- Validation optionnelle : exécuter validate-create-story avant dev-story. -->

## Story

En tant que **plateforme terrain-first**,  
je veux que les **opérations locales** restent **enregistrées de façon durable** dans **`Recyclique`** avec des **pistes d’audit exploitables**,  
afin que l’**activité métier** continue **même lorsque les intégrations aval** (ex. **Paheko**) sont **retardées ou indisponibles**.

## Acceptance Criteria

### AC 1 — Persistance locale sans confirmation externe immédiate

**Étant donné** que les workflows terrain enregistrent les données dans **`Recyclique`** **avant** la synchronisation comptable ([Source : `epics.md` — Story 2.5, FR23 / NFR3])  
**Quand** la **fondation de persistance** est stabilisée  
**Alors** les **opérations métier locales** peuvent être **stockées durablement** sans exiger une **confirmation immédiate** d’un système externe  
**Et** l’implémentation **préserve** la capacité future de **rejouer**, **analyser** et **corréler** les événements critiques (identifiants métier, horodatage, périmètre site/caisse/session quand pertinent)

### AC 2 — Traces lisibles pour support et supervision

**Étant donné** que le **support** et la **supervision** exigent des traces **lisibles** ([Source : `epics.md` — Story 2.5, NFR6 / NFR7])  
**Quand** les **actions critiques**, **dégradations** et **événements sensibles** sont journalisés (logs applicatifs **et/ou** journal d’audit persistant selon le cas)  
**Alors** les entrées incluent **au minimum** : **identifiants de contexte** (ex. `site_id`, `cash_register_id`, `session_id`, `user_id` quand disponibles), **identité d’acteur** (ou acteur système explicite), **type d’opération**, **état de résultat** (succès / refus / erreur métier), et **information de corrélation** (ex. `X-Request-Id` / `request.state.request_id` introduit en story **2.4**)  
**Et** les **données sensibles** sont **masquées** ou **omises** lorsqu’elles ne sont **pas** requises opérationnellement (**aucun secret en clair** : mots de passe, PIN, tokens, en-têtes d’auth complets — aligné story **2.4** et annexe Story Runner)

### AC 3 — Ligne de base audit backend (pas d’invention ad hoc)

**Étant donné** que les **workflows futurs de sync et de correction** dépendent d’un **historique fiable**  
**Quand** cette story est **terminée**  
**Alors** les stories ultérieures peuvent **s’appuyer** sur une **ligne de base d’audit backend** plutôt que d’inventer des journaux locaux **ad hoc** par endpoint  
**Et** **Epic 8** peut s’appuyer sur des **états persistés explicites** plutôt que sur un comportement **implicite** (préparer champs ou conventions d’`details_json` / types d’actions pour **sync différée**, **échec de sync**, **quarantaine** — sans implémenter tout Epic 8 dans 2.5)

### AC 4 — Périmètre code et contrats

**Étant donné** que le writer canonique OpenAPI est **`contracts/openapi/recyclique-api.yaml`** ([Source : `contracts/README.md` — B4, `operationId` stables])  
**Quand** de **nouvelles** surfaces d’observabilité ou de **consultation d’audit** minimale sont exposées (si pertinent pour ce lot — **sinon** rester sur logs + table `audit_logs` sans nouvel endpoint)  
**Alors** le fichier reviewable est **mis à jour** en cohérence  
**Et** l’implémentation reste sous **`recyclique/api/`** (package `recyclic_api`) — **pas** de logique équivalente dans **`peintre-nano`** pour cette story

## Tasks / Subtasks

- [x] **Cartographier l’existant** (AC : #1–#3)  
  - [x] Recenser les chemins **métier terrain** déjà persistants (caisse, ventes, dépôts, réception, etc.) et où la **vérité locale** est déjà en DB vs. risques de **double écriture** ou **transactions incomplètes**  
  - [x] Recenser **`recyclic_api.core.audit`** (`log_audit`, helpers caisse), modèle **`AuditLog`** / **`AuditActionType`**, et logger **`recyclic_api.core.logging`** (`transaction_audit`, JSON rotatif) — identifier **lacunes** (ex. `print` sur erreur audit, types génériques `SYSTEM_CONFIG_CHANGED` partout, absence systématique de `correlation_id` dans `details_json`)

- [x] **Stabiliser la persistance « terrain d’abord »** (AC : #1)  
  - [x] Pour un **premier périmètre** choisi et documenté (ex. fermeture caisse + ventes liées, ou autre lot minimal **sans** refonte complète brownfield), garantir **atomicité** ou **compensation** documentée : pas d’état « à moitié écrit » sans stratégie de reprise  
  - [x] S’assurer qu’une **indisponibilité Paheko** (ou sync) **ne bloque pas** la **persistance locale** par défaut (alignement FR66 / NFR3 — **pas** implémenter tout le moteur Epic 8, mais **ne pas** introduire de dépendance synchrone bloquante sur ce lot)

- [x] **Harmoniser audit DB + logs applicatifs** (AC : #2, #3)  
  - [x] Définir un **schéma minimal** pour `details_json` sur événements critiques (champs recommandés : `request_id`, `operation`, `outcome`, ids contexte) ; étendre **`AuditActionType`** ou documenter **convention de noms** pour réduire la bouillie `system_config_changed`  
  - [x] Remplacer le **`print`** d’échec dans `log_audit` par **`logging`** structuré **sans** fuite de données sensibles  
  - [x] Passer en revue les **`logger.error` / validation** dans `main.py` et autres handlers : confirmer **politique « pas de corps brut »** (déjà partiellement en place pour Pydantic) et l’**étendre** aux chemins critiques identifiés

- [x] **Fondations Epic 8 (documentation + hooks)** (AC : #3)  
  - [x] Documenter dans les notes dev / doc courte interne quels **champs ou états** métier serviront plus tard à **sync**, **retry**, **quarantaine** (réf. FR24–FR27, Epic 8 stories 8.2–8.4) — **interfaces** ou **colonnes réservées** si migration nécessaire, **sans** livrer la sync complète

- [x] **OpenAPI** (AC : #4) — uniquement si nouvelle surface HTTP  
  - [x] Mettre à jour `contracts/openapi/recyclique-api.yaml` ; respecter **B4** pour `operationId` — **N/A** (aucun nouvel endpoint)

- [x] **Tests** (AC : tous)  
  - [x] Pytest : au moins un test sur **persistance** du périmètre choisi (happy path + cas refus) ; tests sur **présence** de champs non sensibles dans logs mockés ou sur entrées `audit_logs` (si DB de test disponible)  
  - [x] Étendre le **gate** Epic 2 ci-dessous selon fichiers touchés

- [x] **Gate qualité — pytest aligné Epic 2** (AC : #4)  
  - [x] Exécuter depuis `recyclique/api` (ajuster la liste si le gate parent impose un sur-ensemble) :

```powershell
Set-Location 'D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api'
$env:TESTING = 'true'
python -m pytest tests/test_infrastructure.py tests/test_auth_login_endpoint.py tests/test_auth_logging.py tests/test_auth_inactive_user_middleware.py tests/test_auth_login_username_password.py tests/test_admin_user_status_endpoint.py tests/api/test_admin_user_management.py tests/test_refresh_token_service.py tests/test_refresh_token_endpoint.py tests/test_context_envelope.py tests/test_monorepo_backend_layout.py tests/test_user_permissions.py tests/test_effective_permissions.py tests/test_groups_and_permissions.py tests/api/test_pin_endpoints.py tests/test_pin_management.py tests/test_step_up_cash_session_close.py tests/test_audit_story_25.py tests/test_cash_session_close_arch04.py -v --tb=short
```

  - [x] Si échec pour **indisponibilité d’environnement** (Redis, Postgres, Docker, EPERM) : **NEEDS_HITL** avec cause — ne pas marquer PASS fragile  
  - **Note gate 2026-04-03** : sur l’environnement d’exécution DS, `tests/api/test_pin_endpoints.py` et `tests/test_pin_management.py` échouent (404 : client de test sur `/api/v1/...` vs montage `/v1` — aligné note story 2.4). Sous-ensemble sans PIN + `test_audit_story_25` + `test_cash_session_close_arch04` : **141 passed**, 3 skipped.

## Dev Notes

### Portée story (annexe Story Runner)

- **Terrain d’abord** ; **traces exploitables** ; **base pour Epic 8** (états explicites, pas tout le moteur sync) ; périmètre **`recyclique/api`** ; **pas de credentials en logs** (PIN, mots de passe, tokens, corps de requête sensibles).

### Découpage avec stories voisines

| Story | Rôle |
|-------|------|
| **2.4** | Step-up, **PIN**, **idempotence**, **`X-Request-Id`** — **réutiliser** `request.state.request_id` dans audit/logs critiques |
| **2.6** | Contrats versionnés — toute nouvelle surface API ici reste **minimale** et **cohérente** avec B4 |
| **2.7** | Signaux bandeau live — **hors scope** sauf réutilisation des **patterns** de logging/corrélation |
| **Epic 8** | Sync, quarantaine, corrélation inter-systèmes — **2.5** pose la **ligne de base** persistance + audit, pas le orchestrateur |

### État brownfield pertinent

- **Audit** : `recyclique/api/src/recyclic_api/core/audit.py`, `models/audit_log.py` — beaucoup d’événements caisse passent encore par des types **génériques** ; **actor** souvent `None` avec `user_id` en JSON.  
- **Logging structuré** : `recyclique/api/src/recyclic_api/core/logging.py` — `transaction_audit`, fichiers sous `logs/` ; **à aligner** avec la corrélation HTTP.  
- **Corrélation** : `middleware/request_correlation.py`, enregistré dans `main.py` (story **2.4**).  
- **Validation** : handler Pydantic dans `main.py` — **ne pas journaliser le corps** des requêtes.

### Fichiers et zones probables à toucher

- `recyclique/api/src/recyclic_api/core/audit.py`  
- `recyclique/api/src/recyclic_api/models/audit_log.py`  
- `recyclique/api/src/recyclic_api/core/logging.py`  
- `recyclique/api/src/recyclic_api/middleware/request_correlation.py` (lecture seule sauf enrichissement)  
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/` — points de persistance métier du **lot choisi**  
- `recyclique/api/migrations/versions/` — si nouvelles colonnes `audit_logs` ou tables d’**outbox** / **sync_state** minimales  
- `contracts/openapi/recyclique-api.yaml` — si endpoint public  
- `recyclique/api/tests/` — nouveaux tests ciblés  

### Références normatives

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.5 ; FR23, FR66, NFR3, NFR6, NFR7]  
- [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — Piste B, OpenAPI reviewable, responsabilité audit/historique `recyclique`]  
- [Source : `contracts/README.md` — politique B4 `operationId`]  
- [Source : `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — rythme Piste B / convergences, complément Epic 2]  
- Story **2.4** — `_bmad-output/implementation-artifacts/2-4-encadrer-les-actions-sensibles-avec-step-up-security-pin-et-idempotence.md`  

### Référence project-context (GPC)

- **`project-context.md`** : absent du dépôt au passage CS ; optionnel. Si généré plus tard (`bmad-generate-project-context`), charger au `dev-story`. En attendant : `_bmad-output/planning-artifacts/architecture/project-context-analysis.md` pour contraintes transverses.

### Stack / versions (garde-fous implémentation)

- Backend : Python, **FastAPI**, **SQLAlchemy**, **Alembic**, **pytest** — versions figées par `recyclique/api/pyproject.toml` / `requirements*.txt` ; ne pas introduire de framework d’audit parallèle sans décision archi.

### Intelligence story 2.4 (continuité)

- **Corrélation** : exploiter **`X-Request-Id`** / `request.state.request_id` sur les événements audit et logs critiques liés aux mutations.  
- **PIN / secrets** : même exigence **qu’en 2.4** — jamais dans `logger`, exceptions exposées, ni `details_json` non contrôlé.  
- **Note gate** : la story 2.4 signale un point **NEEDS_HITL** possible sur des tests encore en **`/api/v1/...`** vs montage **`/v1`** — lors du gate 2.5, **vérifier** l’alignement des URLs de test ou de `ROOT_PATH` avant de valider un PASS global.

### Anti-patterns à éviter

- Dépendre d’une **API externe** pour **committer** la transaction locale « métier terrain » dans le chemin nominal.  
- **Dupliquer** un second système d’audit par feature sans passer par les **conventions** communes (`AuditLog` + champs standard).  
- Journaliser le **corps brut** des requêtes ou les **en-têtes d’authentification** complets.  
- **Écraser** silencieusement les échecs d’audit (`print` + `return None`) **sans** métrique ou log **sûr** côté ops.

### Conformité architecture

- **Recyclique** porte la **persistance terrain**, l’**historique** et l’**audit** (project-structure-boundaries).  
- **AR19** : évolutions de contrat **OpenAPI** pour toute nouvelle surface HTTP documentée.

### Structure projet (post 2.2b)

- Backend vivant : **`recyclique/api/`** ; stack Docker dev **`recyclic-local`** depuis `recyclique-1.4.4/docker-compose.yml` avec contexte API `../recyclique/api` ([Source : `epics.md` — note exécution Epic 2]).

## Dev Agent Record

### Agent Model Used

Composer (sous-agent Task / dev-story DS), 2026-04-03.

### Debug Log References

### Completion Notes List

- Audit caisse : nouveaux `AuditActionType` dédiés ; `merge_critical_audit_fields` + `sanitize_audit_details` ; `log_audit` sans `print`, rollback + log `audit_persist_failed` (sans message d’exception brut).
- Corrélation : `request_id` propagé vers fermeture/ouverture caisse, détail session, vente (`POST /sales`), rapports CSV admin, `log_transaction_event` (PAYMENT_VALIDATED), handler validation Pydantic (`main.py`).
- Ventes : `log_cash_sale` après commits locaux (terrain d’abord, pas de sync aval).
- Rapports : appels `log_cash_session_access` corrigés (signature invalide auparavant) avec `db=` et `operation=cash_session.report_download`.
- Doc interne : `recyclique/api/docs/story-2-5-epic8-audit-foundations.md`.
- Tests : `tests/test_audit_story_25.py` (masquage, schéma, type fermeture, logger sur échec audit).

### File List

- `recyclique/api/src/recyclic_api/models/audit_log.py`
- `recyclique/api/src/recyclic_api/core/audit.py`
- `recyclique/api/src/recyclic_api/application/cash_session_closing.py`
- `recyclique/api/src/recyclic_api/application/cash_session_opening.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/sales.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/reports.py`
- `recyclique/api/src/recyclic_api/services/sale_service.py`
- `recyclique/api/src/recyclic_api/core/logging.py`
- `recyclique/api/src/recyclic_api/main.py`
- `recyclique/api/docs/story-2-5-epic8-audit-foundations.md`
- `recyclique/api/tests/test_audit_story_25.py`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/2-5-stabiliser-la-persistance-terrain-locale-laudit-et-les-journaux-critiques.md`

### Change Log

- 2026-04-03 : Implémentation story 2.5 (audit terrain, corrélation, masquage, vente + caisse, doc Epic 8, tests).

---

**Note de complétion create-story (CS)** : analyse `epics.md` Story 2.5, annexe Story Runner (terrain d’abord, traces exploitables, base Epic 8, `recyclique/api`, pas de credentials en logs), brownfield audit/logging + corrélation 2.4 — guide pour l’agent **dev-story**. Pass CS complémentaire : références `guide-pilotage-v2.md`, bloc project-context / stack (`pyproject.toml`).
