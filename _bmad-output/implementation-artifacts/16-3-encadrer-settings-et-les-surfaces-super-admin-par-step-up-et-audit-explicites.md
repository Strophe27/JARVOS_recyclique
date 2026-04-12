# Story 16.3 : Encadrer `settings` et les surfaces super-admin par step-up et audit explicites



Status: done



**Story key :** `16-3-encadrer-settings-et-les-surfaces-super-admin-par-step-up-et-audit-explicites`  

**Epic :** 16 — Déverrouiller les contrats, permissions et garde-fous admin avant portage UI (rail **K** — fondation 15.6)



<!-- Validation VS 2026-04-12 — validate-create-story (bmad-create-story checklist) PASS -->



## Story



As a security-conscious architecture team,  

I want super-admin settings flows bound to explicit step-up and audit requirements,  

So that no high-risk admin surface is ported before its authority chain is fully defined.



## Objectif



Documenter et stabiliser **côté backend / contrat OpenAPI** la **chaîne d'autorité** (rôle `UserRole` → dépendances FastAPI `Depends(...)` → transport session / cookie vs Bearer si pertinent), le **step-up PIN** (+ idempotence quand requis) et la **piste d'audit** pour les surfaces **super-admin** nommées ci-dessous, en les alignant sur le **modèle step-up / idempotence** déjà posé en Epic 2.4 (référence `cash_sessions.close`). Documenter aussi les **restrictions de contexte** (périmètre site, `ContextEnvelope`, ou absence explicite) dans les descriptions OpenAPI et notes sécurité. Aucun travail UI Peintre ni manifest CREOS dans cette story.



**Surfaces super-admin nommées (périmètre 16.3, préfixe API `/v1`) :**



1. **Paramètres sensibles** — `GET/PUT /admin/settings/alert-thresholds` ; `GET/PUT /admin/settings/session` ; `GET/PUT /admin/settings/email` ; `POST /admin/settings/email/test` (`admin_settings.py`, rôles selon tableau ci-dessous).  

2. **Seuil d'activité (écart rôle)** — `GET/PUT /admin/settings/activity-threshold` (`admin_activity_threshold.py`, `require_admin_role`).  

3. **Opérations base** — `POST /admin/db/export`, `POST /admin/db/import`, `POST /admin/db/purge-transactions` (`db_export.py`, `db_import.py`, `db_purge.py`, `require_super_admin_role`).  



*Note 15.2 :* le même `POST /admin/db/export` peut être invoqué depuis d'autres écrans legacy (ex. `/admin/health`) ; **une seule** définition contractuelle / step-up / audit sur l'endpoint suffit — pas de portage UI dans cette story.



## Périmètre (ferme)



- **Inclus :**

  - Inventaire précis des handlers FastAPI concernés, dépendances `Depends(...)` (rôles, transports Bearer vs cookie si pertinent), et écart **15.2** (step-up **non** observé sur `db_export` / `db_import` / `db_purge` au moment de la cartographie).

  - Alignement **documentaire et contractuel** : extension de la couverture **G-OA-01** dans `contracts/openapi/recyclique-api.yaml` pour les chemins listés ci-dessous (ou sous-ensemble clairement justifié avec tâche de suivi pour le reste), avec `operationId` stables, `security` / descriptions alignées sur le code réel.

  - Step-up serveur : soit **implémentation** des appels `verify_step_up_pin_header` (+ constantes d'opération dans `recyclic_api/core/step_up.py`) sur les mutations à haut risque convenues, soit **décision tracée** (ADR courte dans la story / commentaires OpenAPI) si une opération doit rester hors PIN avec justification sécurité — **sans** laisser le vide documentaire hérité de 15.2.

  - Audit : exiger au minimum une **ligne de contrat** + tâches de code pour `export` / `purge` si l'audit applicatif structuré manque (comparer avec `db_import` qui utilise déjà `log_system_action` / `AuditActionType.DB_IMPORT`).

- **Hors scope (explicite) :**

  - **Aucune** page Peintre, **aucun** `PageManifest` / `NavigationManifest`, **aucun** JSX de portage admin.

  - **Pas** de refonte du legacy React `Settings.tsx` sauf correction **strictement** nécessaire pour une démo contractuelle (défaut : aucun changement front).

  - Familles **16.4** (exports bulk rapports, stats réception sensibles) — pas de scope creep ; mention croisée autorisée si le même handler réutilise un pattern.

  - **16.1** (`users` / G-OA-03) — hors story sauf référence transverses permissions.



## Cartographie technique vérifiée (repo)



Préfixe API public : **`/v1`**. Chemins relatifs à **`/v1`**.



### Montage routeurs — `recyclique/api/src/recyclic_api/api/api_v1/api.py`



| Routeur | `prefix` | Fichier endpoints |

|---------|----------|-------------------|

| `admin_settings` | `/admin/settings` | `endpoints/admin_settings.py` |

| `db_export`, `db_import`, `db_purge` | `/admin` | `endpoints/db_export.py`, `db_import.py`, `db_purge.py` |

| `admin` (dont `admin_activity_threshold`) | `/admin` | `endpoints/admin.py` + enregistrement `admin_activity_threshold.py` |



### Famille `admin/settings` — `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_settings.py`



| Méthode | Chemin (sous `/v1`) | Dépendance d'autorisation | Journalisation / notes |

|--------|---------------------|---------------------------|-------------------------|

| GET/PUT | `/admin/settings/alert-thresholds` | `require_role_strict([ADMIN, SUPER_ADMIN])` | `log_admin_access` |

| GET/PUT | `/admin/settings/session` | `require_role_strict([SUPER_ADMIN])` | `log_admin_access` |

| GET/PUT | `/admin/settings/email` | `require_role_strict([SUPER_ADMIN])` | `log_admin_access` |

| POST | `/admin/settings/email/test` | `require_role_strict([SUPER_ADMIN])` | `log_admin_access` ; envoi réel email test |



### Seuil d'activité (écran legacy « settings » mais handler séparé) — `endpoints/admin_activity_threshold.py`



| Méthode | Chemin (sous `/v1`) | Dépendance | Notes |

|--------|---------------------|------------|-------|

| GET/PUT | `/admin/settings/activity-threshold` | `require_admin_role` (ADMIN **ou** SUPER_ADMIN) | `log_audit` / `AuditActionType.SETTING_UPDATED` sur PUT — **écarter** du modèle « super-admin only » côté API vs UI legacy SUPER_ADMIN sur `/admin/settings` (15.2) : à documenter comme **écart UI/API** dans OpenAPI / Dev Notes. |



### Opérations base (super-admin) — `require_super_admin_role()` depuis `recyclic_api/core/auth.py`



| Méthode | Chemin (sous `/v1`) | Fichier | Audit / logs |

|--------|---------------------|---------|----------------|

| POST | `/admin/db/export` | `db_export.py` | Step-up `db.export` + `log_system_action` + `AuditActionType.DB_EXPORT` (Story 16.3 DS) |

| POST | `/admin/db/import` | `db_import.py` | Step-up `db.import` + `Idempotency-Key` obligatoire + `log_system_action` + `AuditActionType.DB_IMPORT` |

| POST | `/admin/db/purge-transactions` | `db_purge.py` | Step-up `db.purge_transactions` + `Idempotency-Key` obligatoire + `log_system_action` + `AuditActionType.DB_PURGE` |



### Référence step-up Epic 2.4 (modèle à aligner)



- **Fichier :** `recyclique/api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py` — handler `close_cash_session` : `verify_step_up_pin_header` + en-tête `X-Step-Up-Pin` (`STEP_UP_PIN_HEADER`), Redis via `Depends(get_redis)`, idempotence `Idempotency-Key` pour la fermeture.

- **Définitions :** `recyclique/api/src/recyclic_api/core/step_up.py` — constantes `SENSITIVE_OPERATION_*`, `IDEMPOTENCY_KEY_HEADER`, lockout Redis.



## Acceptance Criteria



**Given** les flux `settings` et les opérations `POST /admin/db/export`, `POST /admin/db/import`, `POST /admin/db/purge-transactions` sont classés **sensibles / super-admin** dans la cartographie 15.2 (tableaux §1–§3) et la classe **B** inclut explicitement **`settings`** (15.5 §7)  

**When** cette story est livrée  

**Then** la **chaîne d'autorité** (rôle `UserRole`, dépendance FastAPI, transport session) est décrite **par endpoint** dans le livrable (story + OpenAPI) et reste **vérifiable** dans les fichiers listés en Dev Notes  

**And** les **restrictions de contexte** (bornage site / multi-site, usage ou non de `ContextEnvelope` côté handler, ou **N/A** justifié par le code si seul le rôle super-admin global s'applique) sont documentées **par famille d'endpoints** dans OpenAPI / notes sécurité — sans laisser d'ambiguïté pour un futur rail UI  

**And** l'**écart** signalé en 15.2 — absence de step-up visible sur export/import/purge — est soit **levé** (implémentation + tests), soit **fermé par décision documentée** avec lien vers contrainte produit / risque résiduel (sans silence)



**Given** le rail **K** (15.6, seed item 3 : paramètres super-admin `settings` — contrat step-up + surface sensible **avant** UI)  

**When** un reviewer contrôle la story  

**Then** aucun critère n'exige de rendu Peintre, manifest CREOS ni slice observable  

**And** les futures stories de parité **doivent** référencer ce contrôle comme preuve d'autorité (OpenAPI + notes sécurité)



**Given** le gap **G-OA-01** (15.2 §4) : majorité des `/v1/admin/**` absentes du YAML canon jusqu'aux travaux 16.2  

**When** l'implémentation DS est terminée  

**Then** les opérations de cette story sont ajoutées à `contracts/openapi/recyclique-api.yaml` avec **`operationId` stables**, schémas de requête/réponse alignés sur le code (fichiers, `UploadFile` pour import, `FileResponse` pour export, corps purge si applicable), et mentions **G-OA-01** / **Story 16.3** dans les descriptions  

**And** la régénération des artefacts dérivés (`contracts/openapi/generated/recyclique-api.ts` via `npm run generate` si applicable) est réalisée ou explicitement listée en tâche bloquante



**Given** l'audit et la traçabilité (FR21, FR27, NFR6 / Epic 2)  

**When** export ou purge sont exécutés avec succès ou échec  

**Then** une trace **exploitable** (table audit ou équivalent déjà utilisé par `db_import`) existe ou est ajoutée avec **type d'action**, **acteur**, **horodatage**, **corrélation** si disponible sur la requête — sans exposer de secrets (URL DB, PIN, contenu dump)  

**And** les tests pytest couvrent au minimum **401/403** sur les chemins sensibles sans auth / mauvais rôle, et les cas step-up **nominal / refus / lockout** si le step-up est implémenté



**Given** la correction de vente sensible (`sales.py`) réutilise le même module `step_up`  

**When** de nouvelles constantes `SENSITIVE_OPERATION_*` sont introduites  

**Then** elles suivent la convention existante et sont référencées dans OpenAPI (description des en-têtes requis) pour éviter la divergence client



### Alignement AC officielles (`epics.md` — Story 16.3)



| AC epics (résumé) | Couverture dans cette story |

|-------------------|-----------------------------|

| Step-up explicite attendu sur flux super-admin sensibles | AC BDD § « step-up » + Tasks 3.x ; écart 15.2 levé ou ADR |

| Piste d'audit / traçabilité | AC « audit » + Tasks 4.x ; alignement `db_import` |

| Restrictions de contexte documentées (contrats + notes sécurité) | Objectif + **Then** sur restrictions de contexte ; Task 2.x descriptions OpenAPI |

| Aucune parité Peintre sans référencer ces contrôles | AC rail K / hors scope Peintre ; critère reviewer « aucun critère n'exige … Peintre » |



## ADR — Step-up absent sur `admin/settings` et activity-threshold (Story 16.3)



**Contexte** : les mutations `PUT` alert-thresholds / session / email et `POST` email/test, ainsi que `PUT` activity-threshold, restent **sans** `X-Step-Up-Pin`.



**Décision** : conserver uniquement `require_role_strict` / `require_admin_role` + transports JWT existants + `log_admin_access` / `log_audit` (activity-threshold).



**Justification** : éviter une rupture immédiate des clients admin legacy et limiter la friction sur des réglages fréquents non équivalents à une destruction de base ; le risque résiduel est borné par rôle (ADMIN vs SUPER_ADMIN selon route) et par l'absence d'effet « remplacement base ». Les opérations **db.*** reçoivent le PIN + idempotence obligatoires (gravité maximale).



**Conséquences** : le contrat OpenAPI et cette story portent la trace explicite ; un durcissement ultérieur pourra ajouter le step-up sur session/email sans changer les constantes `db.*`.



## Tasks / Subtasks



- [x] Task 1 (AC : cartographie + chaîne d'autorité)  

  - [x] 1.1 Finaliser le tableau « Cartographie technique » ci-dessus contre le code (imports, `response_model`, rate limits `conditional_rate_limit` / `slowapi` sur `admin_activity_threshold`).  

  - [x] 1.2 Documenter l'écart **activity-threshold** : `require_admin_role` vs garde UI SUPER_ADMIN-only (15.2).  

- [x] Task 2 (AC : G-OA-01 / OpenAPI)  

  - [x] 2.1 Ajouter dans `contracts/openapi/recyclique-api.yaml` les paths pour `/admin/settings/*` (toutes les opérations du routeur `admin_settings`), `/admin/settings/activity-threshold` (GET/PUT), `/admin/db/export`, `/admin/db/import`, `/admin/db/purge-transactions`.  

  - [x] 2.2 Définir les `security` / `securitySchemes` conformément aux deps réelles (`require_role_strict`, `require_admin_role`, `require_super_admin_role`).  

  - [x] 2.3 Pour chaque opération : une description qui inclut **chaîne d'autorité** + **restrictions de contexte** (ou **N/A** avec justification liée au handler) + renvois step-up/audit quand applicables — conformément à l'AC epics et au rail **K** (15.6 seed 3).  

  - [x] 2.4 Régénérer le client TypeScript si le pipeline du repo l'exige ; vérifier absence de collision d'`operationId`.  

- [x] Task 3 (AC : step-up)  

  - [x] 3.1 Lister les mutations à soumettre au PIN (`import`, `purge` **obligatoires** candidats ; `export` **fortement recommandé** ; mutations `session` / `email` **à arbitrer** avec justification).  

  - [x] 3.2 Étendre `recyclic_api/core/step_up.py` avec les identifiants d'opération nominatifs (ex. `db.export`, `db.import`, `db.purge_transactions`, …) alignés style `cash_session.close`.  

  - [x] 3.3 Brancher `verify_step_up_pin_header` + `Depends(get_redis)` dans les handlers concernés ; documenter `X-Step-Up-Pin` dans OpenAPI.  

  - [x] 3.4 Ajouter idempotence (`Idempotency-Key`) **là où** une double soumission créerait un incident grave (import / purge au minimum — alignement Story 2.4).  

- [x] Task 4 (AC : audit)  

  - [x] 4.1 Pour `db_export` et `db_purge`, ajouter `log_system_action` (ou équivalent métier) avec types d'audit cohérents (`AuditActionType` existants ou extension justifiée dans `recyclic_api/models/audit_log.py`).  

  - [x] 4.2 Vérifier que la consultation `GET /admin/audit-log?action_type=db_import` (15.2) reste cohérente avec les nouveaux types éventuels.  

- [x] Task 5 (AC : tests)  

  - [x] 5.1 Tests API : authz de base + step-up (headers présents/absents, lockout Redis mocké comme sur les tests existants de caisse si pattern disponible).  

  - [x] 5.2 Mettre à jour ou ajouter un fichier de tests dédié (ex. sous `recyclique/api/tests/`) pour les nouveaux garde-fous.  



## Dev Notes



### Architecture et contraintes



- **Rail K** : backend / OpenAPI / sécurité / audit uniquement (Epic 16, note epics.md).  

- **Références obligatoires :**  

  - [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 16 / Story 16.3]  

  - [Source: `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md` — §1 ligne `/admin/settings`, §2 ligne super-admin + step-up, §3 table surfaces sensibles, §4 G-OA-01]  

  - [Source: `references/artefacts/2026-04-12_03_recommandation-architecture-admin-peintre-nano-15-5.md` — classe B, `settings`]  

  - [Source: `references/artefacts/2026-04-12_05_package-fondation-passe-analyse-epics-admin-15-6.md` — rail K, seed story 3 paramètres super-admin]  

- **Story 16.2 (done)** : modèle de documentation **G-OA-01** / split `require_admin_role` vs `require_admin_role_strict` — réutiliser le même niveau de rigueur pour les `security` descriptions ; pas de duplication de scope groups/audit-log/email-logs.



### Fichiers backend à ouvrir en priorité



| Sujet | Chemin repo |

|-------|-------------|

| Paramètres admin (seuils, session, email) | `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_settings.py` |

| Export DB | `recyclique/api/src/recyclic_api/api/api_v1/endpoints/db_export.py` |

| Import DB | `recyclique/api/src/recyclic_api/api/api_v1/endpoints/db_import.py` |

| Purge transactions | `recyclique/api/src/recyclic_api/api/api_v1/endpoints/db_purge.py` |

| Seuil d'activité | `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_activity_threshold.py` |

| Rôle super-admin | `recyclique/api/src/recyclic_api/core/auth.py` (`require_super_admin_role`, `require_role_strict`, `require_admin_role`) |

| Step-up PIN + en-têtes | `recyclique/api/src/recyclic_api/core/step_up.py` |

| Référence implémentation step-up + idempotence | `recyclique/api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py` (`close_cash_session`) |

| Montage des routeurs | `recyclique/api/src/recyclic_api/api/api_v1/api.py` |

| Contrat canon | `contracts/openapi/recyclique-api.yaml` |

| Tests existants DB | `recyclique/api/tests/test_db_export_endpoint.py`, `test_db_import_endpoint.py` |



### Tests / qualité



- Réutiliser les patterns pytest du repo (fixtures `admin_client`, super-admin, mocks Redis si nécessaire).  

- Après modification OpenAPI : exécuter la chaîne de génération / diff attendue par Epic 1 / CI (voir stories 16.2 et `contracts/openapi/package.json`).



### Structure projet



- Le backend vivant est sous `recyclique/api/` ; ne pas confondre avec le legacy `recyclique-1.4.4/` pour les preuves de navigation, mais la **cartographie 15.2** cite le legacy comme source des routes UI — la **preuve d'implémentation** reste le code FastAPI ci-dessus.



## Intelligence story précédente (16.2)



- Les familles **G-OA-01** traitées en 16.2 ont établi le **format** des descriptions OpenAPI (trace 15.2 §4, autorité explicite par handler). Répliquer pour `settings` + `db_*`.  

- Séparer clairement **Bearer** vs **cookie strict** dans les descriptions si les deps diffèrent (`require_role_strict` utilise `get_current_user` — vérifier le chemin token dans `auth.py` lors de l'édition OpenAPI).



## Statut de complétion (create-story)



**ready-for-dev** — Analyse contextuelle create-story (CS) terminée : guide d'implémentation backend/contrat/audit pour les surfaces super-admin `settings` et DB, sans portage UI. **VS 2026-04-12** : validate-create-story — alignement AC epics (restrictions de contexte), surfaces nommées, tâche OpenAPI 2.3, traçabilité tableau § Alignement AC officielles.



## Dev Agent Record



### Agent Model Used



Composer (agent Task DS — bmad-dev-story), 2026-04-12.



### Debug Log References



- Ajustement test conflit idempotence import : empreinte basée sur `filename` + `taille` — deux corps de même taille ne provoquent pas de 409 (test corrigé avec fichier plus long).



### Completion Notes List



- Step-up + Redis sur `POST /v1/admin/db/export`, `/import`, `/purge-transactions` ; constantes `SENSITIVE_OPERATION_DB_*` dans `step_up.py`.

- `Idempotency-Key` **obligatoire** import + purge (Redis `idem:v1:db_*`, réutilisation helpers `idempotency_support`).

- Export : pas d'`Idempotency-Key` obligatoire (réponse binaire — décision tracée OpenAPI + ADR ci-dessus pour settings).

- Audit : `DB_EXPORT`, `DB_PURGE` + `log_system_action` sur export (succès/échecs) et purge ; import inchangé (`DB_IMPORT`).

- OpenAPI **G-OA-01** 0.1.19-draft + schémas settings/activity/db ; `npm run generate` → `contracts/openapi/generated/recyclique-api.ts`.

- Fixture `super_admin_client` : `hashed_pin` test `1234` pour les tests DB ; purge fixture locale alignée.

- Nouveaux tests classe `TestStory163DatabaseImportGuards` + garde-fous purge + export step-up manquant.

- **Story Runner (post-CR)** : audit succès import via `SessionLocal()` si la session FastAPI est invalide après `pg_restore` (plus de `next(get_db())`) ; réponses HTTP **sans** `stderr` / chemins sensibles pour export et import ; timeout import reformulé ; assertions tests export mises à jour.



### File List



- `recyclique/api/src/recyclic_api/core/step_up.py`

- `recyclique/api/src/recyclic_api/models/audit_log.py`

- `recyclique/api/src/recyclic_api/services/idempotency_support.py`

- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/db_export.py`

- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/db_import.py`

- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/db_purge.py`

- `contracts/openapi/recyclique-api.yaml`

- `contracts/openapi/generated/recyclique-api.ts`

- `recyclique/api/tests/conftest.py`

- `recyclique/api/tests/test_db_import_endpoint.py`

- `recyclique/api/tests/test_db_export_endpoint.py`

- `recyclique/api/tests/test_db_purge.py`

- `_bmad-output/implementation-artifacts/sprint-status.yaml`

- `_bmad-output/implementation-artifacts/16-3-encadrer-settings-et-les-surfaces-super-admin-par-step-up-et-audit-explicites.md`

- `_bmad-output/implementation-artifacts/tests/test-summary-story-16-3-qa-api.md`



## Change Log



- **2026-04-12** — DS Story 16.3 : step-up + idempotence import/purge, audit export/purge, OpenAPI G-OA-01 settings + DB, codegen TS, tests pytest.

- **2026-04-12** — Story Runner : QA (tests PIN invalide / lockout) ; CR puis correctifs **db_export** / **db_import** (messages client génériques, session audit dédiée) ; CR re-run **APPROVED**.

