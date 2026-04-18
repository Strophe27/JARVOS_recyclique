# Story 16.2 : Stabiliser les contrats et permissions pour `groups`, `audit-log` et `email-logs`

Status: done

**Story key :** `16-2-stabiliser-les-contrats-et-permissions-pour-groups-audit-log-et-email-logs`  
**Epic :** 16 — Déverrouiller les contrats, permissions et garde-fous admin avant portage UI (rail **K** — fondation 15.6)

## Story

As an admin platform team,  
I want the blocked governance and audit surfaces mapped to stable contracts and permissions,  
So that later UI work can consume explicit backend authority instead of historical coupling.

## Objectif

Les familles **`groups`**, **`audit-log`** et **`email-logs`** sont classées **B** (15.5 §7) : le besoin est légitime mais les **contrats OpenAPI canon** et la **chaîne d'autorité** doivent être stabilisés **avant** tout slice Peintre. Cette story ferme la partie **G-OA-01** concernant ces chemins `/v1/admin/**` (absence de description dans `contracts/openapi/recyclique-api.yaml`, 15.2 §4) pour les opérations listées ci-dessous, en alignant **documentation contractuelle**, **`operationId` stables**, **`securityRequirements`**, et notes sur **contexte / lecture transverse**, sans livrer d'UI.

## Périmètre (ferme)

- **Inclus :** `contracts/openapi/recyclique-api.yaml` (paths, schémas de réponse alignés sur le code, `operationId`, tags, `security`), éventuelle **régénération** des clients dérivés (`contracts/openapi/package.json` → `npm run generate` si applicable au repo), **tests API** (pytest) ou preuves reproductibles listées pour les codes 401/403 et cas nominaux admin, **notes de contexte** (ContextEnvelope : bornage d'affichage côté futur front — pas d'implémentation CREOS ici ; pas de « vérité permission » inventée côté UI, 15.5 §1 / garde **B**).
- **Hors scope (explicite) :**
  - **Aucune** page Peintre finale, **aucun** `PageManifest` / `NavigationManifest` CREOS, **aucun** JSX slice admin.
  - Refonte cosmétique du legacy React (`GroupsReal`, `AuditLog`, `EmailLogs`) — **sauf** si une micro-correction est **strictement** nécessaire pour aligner une URL de démo ; par défaut le legacy reste hors story.
  - Ne **pas** recopier l'anti-pattern **frontend** **`emailLogService`** (15.2 §5) : `baseUrl '/api/v1/admin'`, `fetch`, token `localStorage` en parallèle d'un client axios `/v1` + cookies httpOnly v2. Côté **backend**, l'usage de `EmailLogService` dans `admin_observability.py` est légitime (`recyclique/api/src/recyclic_api/services/email_log_service.py`) ; la story **documente** la divergence **client legacy** comme **à ne pas reproduire** ; la cible pour les futurs clients est **un seul** chemin contractuel `/v1/admin/...` cohérent avec le YAML.
  - Stories **16.3** (`settings` / super-admin), **16.4** (exports bulk / stats réception) — pas de scope creep.

## Cartographie technique vérifiée (repo)

Préfixe API public : **`/v1`** (montage global) ; les chemins ci-dessous sont relatifs à **`/v1`**.

### Famille `groups` — `recyclique/api/.../endpoints/groups.py` (routeur monté avec `prefix="/admin/groups"` dans `api.py`)

| Méthode | Chemin HTTP (sous `/v1`) | Security rule (FastAPI) | Contraintes / notes |
|--------|---------------------------|-------------------------|---------------------|
| GET | `/admin/groups/` | `Depends(require_admin_role)` | Liste paginée `skip`/`limit` ; charge `site_id` optionnel sur le groupe (portée multi-site / ACL — documenter en OpenAPI si champs sensibles). |
| GET | `/admin/groups/{group_id}` | `Depends(require_admin_role)` | Détail groupe + users + permissions. |
| POST | `/admin/groups/` | `Depends(require_admin_role)` | Création ; conflits nom/clé 409. |
| PUT | `/admin/groups/{group_id}` | `Depends(require_admin_role)` | Mise à jour métadonnées ; `site_id` nullable. |
| DELETE | `/admin/groups/{group_id}` | `Depends(require_admin_role)` | 204 si OK. |
| POST | `/admin/groups/{group_id}/permissions` | `Depends(require_admin_role)` | Ajout permissions au groupe. |
| DELETE | `/admin/groups/{group_id}/permissions/{permission_id}` | `Depends(require_admin_role)` | Retrait permission. |
| POST | `/admin/groups/{group_id}/users` | `Depends(require_admin_role)` | Ajout utilisateurs au groupe. |
| DELETE | `/admin/groups/{group_id}/users/{user_id}` | `Depends(require_admin_role)` | Retrait utilisateur du groupe. |

**Assignation groupes depuis fiche utilisateur (admin)** — `recyclique/api/.../endpoints/admin_users_groups.py` (routes enregistrées sur le routeur `/admin` via `admin.py`) :

| Méthode | Chemin HTTP (sous `/v1`) | Security rule | Notes |
|--------|--------------------------|---------------|-------|
| PUT | `/admin/users/{user_id}/groups` | `Depends(require_admin_role)` | Mutation ACL ; `log_admin_access` + `log_role_change` (audit applicatif). |

**Écart deps (à expliciter dans OpenAPI / notes story)** : `require_admin_role` résout surtout le **Bearer** via `resolve_access_token` ; `require_admin_role_strict` s'appuie sur `get_current_user_strict` (**cookie** d'accès). Les handlers **groups** et **PUT users/{id}/groups** utilisent la première forme ; l'observabilité utilise la seconde — le contrat doit documenter le **schéma de sécurité** attendu par endpoint (cohérence v2 cookies vs Bearer legacy).

### Famille `audit-log` + `email-logs` (+ `transaction-logs` associé legacy UI) — `admin_observability.py` (même routeur `/admin`)

| Méthode | Chemin HTTP (sous `/v1`) | Security rule | Contraintes / notes |
|--------|--------------------------|---------------|---------------------|
| GET | `/admin/transaction-logs` | `Depends(require_admin_role_strict())` | Lecture **transverse** fichiers log JSON ; rate limit `30/minute`. |
| GET | `/admin/audit-log` | `Depends(require_admin_role_strict())` | Lecture **transverse** table `AuditLog` (filtres `action_type`, acteur, cible, dates, recherche) ; rate limit `30/minute`. |
| GET | `/admin/email-logs` | `Depends(require_admin_role_strict())` | Liste logs email via `EmailLogService` ; `log_admin_access` ; rate limit `30/minute`. |

**Contexte** : pas de filtre **site** explicite dans ces handlers au moment de l'analyse — la lecture est **admin transverse** (aligné 15.2 tableau §2 : « lecture transverse logs »). Le futur **ContextEnvelope** ne doit **pas** réattribuer des rôles ; il borne l'**affichage** si une politique produit impose un scope (à tracer comme note contractuelle si différent du code actuel).

## Acceptance Criteria

**Given** les familles `groups`, `audit-log` et `email-logs` sont classées **B** (15.5 §7) et concernées par **G-OA-01** (chemins `/v1/admin/**` absents ou incomplets du OpenAPI canon, 15.2 §4)  
**When** cette story est livrée  
**Then** chaque endpoint du tableau « Cartographie technique vérifiée » dispose dans `contracts/openapi/recyclique-api.yaml` d'une opération documentée (méthode, path, paramètres query/path, corps si applicable, réponses 2xx/4xx pertinentes, schémas ou types cohérents avec les `response_model` / structures réelles)  
**And** chaque opération porte un **`operationId` stable** et non collisionnel, utilisable par de futurs manifests CREOS (sans livrer ces manifests ici)  
**And** les **`security`** / `securitySchemes` reflètent la dépendance réelle : **`require_admin_role`** vs **`require_admin_role_strict()`** (Bearer vs cookie strict — expliciter dans les descriptions ou `security` par opération si le fichier le permet)

**Given** la chaîne d'architecture cible (15.5 §1) : `OpenAPI` → `ContextEnvelope` → guards (pas de vérité permission côté UI)  
**When** un développeur lit la story et le YAML  
**Then** les **règles d'autorisation** (rôles ADMIN / SUPER_ADMIN) sont traçables depuis le contrat et renvoient aux deps listées  
**And** les **surfaces de lecture sensible** (logs transverses, métadonnées email) sont décrites comme **préoccupations backend**, pas comme conventions JSX

**Given** le seed rail **K** en 15.6 §4 item 2 (« stabiliser permissions / audit pour `groups`, `audit-log`, `email-logs` — **pas** de page Peintre dans l'AC »)  
**When** la story est considérée « ready-for-dev » puis implémentée  
**Then** **aucun** critère d'acceptation n'exige de rendu Peintre, manifest CREOS ni slice admin observable

**Given** le pipeline contrats du mono-repo  
**When** le YAML OpenAPI est modifié  
**Then** toute étape de régénération attendue (ex. types TS sous `contracts/openapi/generated/`) est exécutée ou listée comme tâche bloquante avec propriétaire

**Given** la continuité avec **16.1** (fermeture **G-OA-03** sur `GET /users`, patterns OpenAPI + pytest)  
**When** des tests sont ajoutés pour cette story  
**Then** ils couvrent au minimum un cas **admin positif** et un cas **403/401** représentatif sur **une route par famille** (`groups`, `audit-log`, `email-logs`) si faisable sans dette excessive (sinon checklist de preuve manuelle reproductible)

## Tasks / Subtasks

- [x] Cartographier l'état OpenAPI actuel pour `/admin/groups*`, `/admin/users/{id}/groups`, `/admin/audit-log`, `/admin/email-logs`, `/admin/transaction-logs` (grep dans `recyclique-api.yaml`).
- [x] Rédiger / compléter les paths et schémas (pagination `audit-log` / `transaction-logs`, `EmailLogListResponse`, listes `GroupResponse`, etc.) en se calant sur les handlers réels.
- [x] Assigner des `operationId` stables (préfixe suggéré : `adminGroups...`, `adminAuditLog...`, `adminEmailLogs...`, `adminTransactionLogs...`, `adminUsersGroupsPut...`).
- [x] Documenter dans les descriptions OpenAPI : (a) **G-OA-01** / lien 15.2 §4, (b) split **require_admin_role** vs **require_admin_role_strict**, (c) anti-pattern **`emailLogService`** interdit pour futurs clients.
- [x] Ajouter ou étendre les tests pytest ciblant les permissions sur au moins un endpoint par famille (ou document équivalent). Point de départ repo : `recyclique/api/tests/test_groups_and_permissions.py`, `recyclique/api/tests/test_admin_observability_endpoints.py`, `recyclique/api/tests/test_email_logs_endpoint.py` (aligner les assertions 401/403 avec le schéma de sécurité documenté).
- [x] Régénérer les artefacts dérivés (`npm run generate` dans `contracts/openapi/` si applicable) ; vérifier CI locale minimale.

## Change Log

- **2026-04-12 (Story Runner)** : DS → gates → QA → CR **PASS** ; sprint-status et statut story → **done**.
- **2026-04-12 (DS)** : OpenAPI `0.1.18-draft` — paths `/v1/admin/groups/**`, `/v1/admin/users/{user_id}/groups`, `/v1/admin/transaction-logs`, `/audit-log`, `/email-logs` ; schéma de sécurité `adminSessionStrict` ; tests pytest alignés 401/403 ; `npm run generate` exécuté.

## Garde-fous (dev)

- Ne pas déplacer les URLs sans décision d'architecture : le périmètre est **contrat + autorité documentée**, pas refonte de routing.
- **ContextEnvelope** : référence architecturale uniquement dans cette story ; pas d'implémentation `GET /users/me/context` nouvelle ici sauf brief explicite ultérieur.
- Harmoniser **require_admin_role** vs **strict** sur tout le module est **hors scope** sauf si une incohérence bloquante est prouvée ; sinon **documenter** l'existant.

## Références

- `_bmad-output/planning-artifacts/epics.md` — Epic 16, Story 16.2
- `_bmad-output/implementation-artifacts/16-1-fermer-le-gap-g-oa-03-et-requalifier-le-portage-futur-de-users.md` — continuité rail K, patterns OpenAPI + pytest, G-OA-03
- `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md` — tableaux §1–§2 (`/admin/groups`, `/admin/audit-log`, `/admin/email-logs`), **G-OA-01**, §5 anti-pattern **`emailLogService`**
- `references/artefacts/2026-04-12_03_recommandation-architecture-admin-peintre-nano-15-5.md` — classement **B** §7, chaîne **OpenAPI → ContextEnvelope → guards** §1
- `references/artefacts/2026-04-12_05_package-fondation-passe-analyse-epics-admin-15-6.md` — rail **K** §3, seed §4 item 2 (sans page Peintre dans les AC)
- `contracts/openapi/recyclique-api.yaml`
- `recyclique/api/src/recyclic_api/api/api_v1/api.py` — `include_router` admin + groups
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/groups.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_users_groups.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_observability.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin.py` — enregistrement `register_admin_*`
- `recyclique/api/src/recyclic_api/core/auth.py` — `require_admin_role`, `require_admin_role_strict`
- `recyclique/api/src/recyclic_api/services/email_log_service.py` — service **serveur** (ne pas confondre avec le **client** legacy `emailLogService`)
- `recyclique/api/tests/test_groups_and_permissions.py`, `test_admin_observability_endpoints.py`, `test_email_logs_endpoint.py`

## Dev Agent Record

### Agent Model Used

Phase DS : agent d'implémentation Cursor (story 16.2).

### Debug Log References

### Completion Notes List

- Story créée en **ready-for-dev** : stabilisation contrats / permissions pour **groups**, **audit-log**, **email-logs** (rail **K**), sans livrable UI Peintre.
- **DS 2026-04-12** : Chemins G-OA-01 documentés dans `recyclique-api.yaml` avec `operationId` stables ; `securitySchemes.adminSessionStrict` pour les trois routes observabilité (`require_admin_role_strict`) vs `bearerOrCookie` pour `groups` et `PUT .../users/{id}/groups` (`require_admin_role`). Schémas composants `AdminGroup*`, `AdminAuditLogPage`, `AdminEmailLogListResponse`, etc. Tests : observabilité sans auth → **403** ; `PUT /admin/users/{id}/groups` sans auth → **401**, USER → **403** ; email-logs sans auth → **403**. `openapi-typescript` régénéré (`contracts/openapi/generated/recyclique-api.ts`). Pytest ciblé sur les trois fichiers de tests : OK.
- **Story Runner 2026-04-12** : Gates pytest + `npm run generate` revérifiés par l'orchestrateur ; QA synthèse `_bmad-output/implementation-artifacts/tests/test-summary-story-16-2-e2e.md` ; revue code **PASS** (findings mineurs non bloquants : convention `operationId`, SQLite vs audit-log nominal, symétrie test USER sur audit-log).

### File List

- `_bmad-output/implementation-artifacts/16-2-stabiliser-les-contrats-et-permissions-pour-groups-audit-log-et-email-logs.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `contracts/openapi/recyclique-api.yaml`
- `contracts/openapi/generated/recyclique-api.ts`
- `recyclique/api/tests/test_groups_and_permissions.py`
- `recyclique/api/tests/test_admin_observability_endpoints.py`
- `recyclique/api/tests/test_email_logs_endpoint.py`
- `_bmad-output/implementation-artifacts/tests/test-summary-story-16-2-e2e.md`
