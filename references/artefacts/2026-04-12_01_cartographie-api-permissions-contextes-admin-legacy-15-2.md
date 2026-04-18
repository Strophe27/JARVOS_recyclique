# Cartographie API, permissions et contextes — admin legacy (Story 15.2)

**Date :** 2026-04-12  
**Story :** `15-2-cartographier-les-dependances-api-permissions-et-contextes-de-ladmin-legacy`  
**Perimetre ecrans :** routes `/admin/*` declarees dans `recyclique-1.4.4/frontend/src/App.jsx` + items de navigation `recyclique-1.4.4/frontend/src/config/adminRoutes.js` (le livrable 15.1 inventaire date n'est pas encore present dans `references/artefacts/` ; ce document **fige** la liste des routes telles que le code React les enregistre).

**Sources de verite citees :** handlers FastAPI sous `recyclique/api/src/recyclic_api/api/api_v1/endpoints/`, `recyclique/api/src/recyclic_api/core/auth.py`, services frontend `recyclique-1.4.4/frontend/src/services/`, `contracts/openapi/recyclique-api.yaml`, `peintre-nano/docs/03-contrats-creos-et-donnees.md` (cadre CREOS / ContextEnvelope pour le portage).

---

## 0. Resume executif

- **Shell route** : toute la zone `/admin` est enveloppee par `ProtectedRoute` avec `adminOnly` => acces UI reserve aux roles **ADMIN** ou **SUPER_ADMIN** (`recyclique-1.4.4/frontend/src/components/auth/ProtectedRoute.tsx`).
- **Renforts UI** : certaines sous-routes ajoutent `requiredRoles` (categories, groupes, audit, emails, settings, sites-and-registers, import legacy) — voir tableau 2.
- **Autorite backend** : souvent `require_admin_role`, `require_admin_role_strict`, ou `require_role_strict([...])` — les **permissions effectives** (hors role enum) pour les endpoints `/v1/users` non proteges sont un **ecart critique** (voir gaps OpenAPI / securite).
- **Step-up PIN** : present sur le **close** de session caisse (`recyclique/api/.../cash_sessions.py`, en-tetes `STEP_UP_PIN_HEADER` / idempotence) — les ecrans admin qui pilotent la fermeture ou des actions sensibles caisse doivent etre alignes sur ce contrat ; ce n'est pas un simple garde JSX.
- **Contrat OpenAPI canonique** (`contracts/openapi/recyclique-api.yaml`) couvre surtout auth/context, cash-sessions partiels, reception, sales, et une partie **admin Paheko** ; **il ne reflete pas** la majorite des routes `/v1/admin/*` utilisees par le legacy admin.

---

## 1. Tableau ecran (route) -> endpoints principaux / operationId

| Route legacy | Composant page | Endpoints HTTP (prefixe API `/v1` sauf mention) | operationId OpenAPI (canon `recyclique-api.yaml`) |
|--------------|----------------|--------------------------------------------------|-----------------------------------------------------|
| `/admin`, `/admin/dashboard` | `DashboardHomePage.jsx` | `GET /cash-sessions/`, `GET /cash-sessions/stats/summary`, `GET /stats/reception/summary` | `cash-sessions` partiellement documente ; **stats** : **absent** de l'OpenAPI canon |
| `/admin/cash-sessions/:id` | `CashSessionDetail.tsx` | `GET /cash-sessions/{id}`, `presetService` (presets), ventes / journal via composants metiers | Session GET documente ; dependances liees aux ventes : voir OpenAPI `sales` |
| `/admin/reception-stats` | `ReceptionDashboard.tsx` | `GET /stats/reception/summary`, `GET /stats/reception/by-category`, `GET /reception/stats/live`, `GET /stats/live` | **Story 19.1 (Peintre)** : `recyclique_stats_receptionSummary`, `recyclique_stats_receptionByCategory`, `recyclique_stats_unifiedLive` documentes dans `recyclique-api.yaml` ; `recyclique_reception_statsLiveDeprecated` non consomme cote UI. Ecarts residuels : liste nominative / sessions -> **19.2** / rail **K**. |
| `/admin/reception-reports` | `ReceptionReports.tsx` | `GET /reception/lignes`, `GET /reception/lignes/export-csv`, `GET /reception/categories` | Reception partiellement dans OpenAPI ; **lignes** listing/export : **gap** documentaire OpenAPI |
| `/admin/reception-sessions` | `ReceptionSessionManager.tsx` | `receptionTicketsService` => `GET /reception/tickets`, KPIs calcules client ; `GET /reception/categories` ; `POST /reception/tickets/{id}/download-token` ; `POST /admin/reports/reception-tickets/export-bulk` | Bulk export : **absent** OpenAPI ; tickets : partiel — **Story 19.2 (Peintre)** : CREOS `transverse-admin-reception-sessions` + `recyclique_reception_listTickets` via `reception-client.ts` ; KPIs hors `ReceptionTicketSummary` = **gap K** (manifeste) ; mutations/export **B** non branchées (liste + détail). |
| `/admin/reception-tickets/:id` | `ReceptionTicketDetail.tsx` | `GET /reception/tickets/{id}`, `POST .../download-token`, `PATCH .../lignes/{id}/weight` via `receptionService` | Partiel OpenAPI — **Story 19.2 (Peintre)** : `page_key` **`admin-reception-ticket-detail`**, lecture **`recyclique_reception_getTicketDetail`** ; jeton CSV / patch poids / close / bulk : **hors UI** tant qu'**Epic 16** non stabilisée (bloc explicite). |
| `/admin/reports` | `ReportsHub.tsx` | *(navigation uniquement)* | — |
| `/admin/reports/cash-sessions` | `Reports.tsx` | `GET /admin/reports/cash-sessions`, `GET` sur `download_url` retourne (souvent `/v1/admin/reports/cash-sessions/...?token=`) | **Absent** OpenAPI |
| `/admin/users` | `Users.tsx` / `adminStore` | `UsersApi.*` => `GET/POST/PUT/DELETE /users`, `GET/PUT /admin/users/{id}/role|status`, `GET /admin/users/pending`, approve/reject, `GET /admin/users/{id}/history`, `PUT /admin/users/{id}/groups`, `POST /admin/users/{id}/reset-password`, `POST /admin/users/{id}/force-password`, `POST /admin/users/{id}/reset-pin`, `GET /admin/users/statuses`, settings divers | **Presque tout le bloc admin utilisateurs** : **absent** OpenAPI canon |
| `/admin/pending` | `PendingUsers.tsx` | `GET /admin/users/pending`, `POST .../approve`, `POST .../reject` | **Absent** OpenAPI — rail **U** stories **17.1** / **17.3** : CREOS + placeholder (`transverse-admin-pending`) + slots homogènes `admin.transverse-list.*` + `AdminListPageShell` ; fermeture → **Epic 16** / rail **K**. |
| `/admin/session-manager` | `SessionManager.tsx` | `GET /cash-sessions/stats/summary`, `GET /cash-sessions/`, `UsersApi.active-operators`, `SitesApi.sites`, `POST /admin/reports/cash-sessions/export-bulk`, `GET /admin/reports/cash-sessions/by-session/{id}` (blob) | Bulk / by-session : **absent** OpenAPI |
| `/admin/quick-analysis` | `QuickAnalysis.tsx` | `GET /stats/sales/by-category`, `GET /categories/` | Sales by category : **absent** OpenAPI |
| `/admin/cash-registers` | `CashRegisters.tsx` | `GET/POST/PATCH/DELETE /cash-registers/`, `GET /cash-sessions/` (dependances) | Registers : **absent** OpenAPI — rail **U** stories **17.2** / **17.3** : CREOS `page-transverse-admin-cash-registers.json` + `admin.cash-registers.demo` + shell liste mutualise ; fermeture → **Epic 16** / rail **K**. |
| `/admin/sites` | `Sites.tsx` | `GET/PATCH/POST/DELETE /sites/`, `GET /cash-registers/`, `GET /cash-sessions/` (dependances suppression) | Sites : **absent** OpenAPI — rail **U** stories **17.2** / **17.3** : CREOS `page-transverse-admin-sites.json` + `admin.sites.demo` + shell liste ; coexistence hub **`/admin/site`** vs CRUD **`/admin/sites`** dans `peintre-nano/docs/03-contrats-creos-et-donnees.md` ; **Epic 16**. |
| `/admin/categories` | `Categories.tsx` | `GET/POST/PUT/... /categories/` (+ import/export PDF/Excel/CSV endpoints du service) | **Absent** OpenAPI |
| `/admin/groups` | `GroupsReal.tsx` | `GET/POST/... /admin/groups/`, `GET /users` (via adminService), permissions | Groupes admin : **absent** OpenAPI |
| `/admin/audit-log` | `AuditLog.tsx` | `GET /admin/audit-log`, `GET /admin/transaction-logs` (via client `api`) | **Absent** OpenAPI |
| `/admin/email-logs` | `EmailLogs.tsx` | Service utilise `fetch` vers baseUrl `'/api/v1/admin/email-logs'` (**chemin incoherent** avec `axiosClient` `/v1`) | **Absent** OpenAPI + **bug client probable** |
| `/admin/health` | `HealthDashboard.tsx` | `GET /admin/health`, `GET /admin/sessions/metrics`, `POST /admin/health/test-notifications`, `POST /admin/db/export` | Health/metrics : **absent** OpenAPI (sauf endpoints publics non utilises ici) |
| `/admin/settings` | `Settings.tsx` | `GET/PUT /admin/settings/session`, `GET/PUT /admin/settings/activity-threshold`, `GET/PUT /admin/settings/email`, `POST /admin/settings/email/test`, `POST /admin/db/export`, `POST /admin/db/purge-transactions`, `POST /admin/db/import`, `GET /admin/audit-log?action_type=db_import` | **Absent** OpenAPI |
| `/admin/sites-and-registers` | `SitesAndRegistersPage.tsx` | *(hub de navigation interne)* | — |
| `/admin/import/legacy` | `LegacyImport.tsx` | Famille `POST/GET /admin/import/legacy/*`, `GET /admin/templates/reception-offline.csv`, `GET /admin/import/legacy/llm-models`, etc. (`adminService`) | **Absent** OpenAPI |

**Note** : `Dashboard.tsx` est monte sur `/rapports/caisse` (hors `/admin`) avec `requiredRoles` ADMIN/SUPER_ADMIN ; meme famille `GET /cash-sessions/` — cite comme **adjacent admin** si la matrice 15.1 le retient.

---

## 2. Tableau ecran -> roles / permissions UI / contraintes backend / contexte

| Route | Garde JSX (`App.jsx` + `ProtectedRoute`) | Preuve backend (dependency typique) | Contexte / donnees sensibles |
|-------|------------------------------------------|--------------------------------------|------------------------------|
| Toute `/admin/*` | `adminOnly` => ADMIN ou SUPER_ADMIN | N/A (UI) ; API applique ses propres deps | Le runtime legacy s'appuie sur la session JWT/cookie ; **ContextEnvelope** (`GET /users/me/context`) est le contrat v2 pour Peintre — **non** appele de maniere systématique par chaque ecran admin legacy. |
| `/admin/categories` | ADMIN ou SUPER_ADMIN | `categories.py` : `require_role_strict([ADMIN, SUPER_ADMIN])` sur mutations | Catalogue global ; exports = **fuite donnees** potentielle. |
| `/admin/groups` | ADMIN ou SUPER_ADMIN | `admin_users_groups.py` : `require_admin_role` ; `groups` endpoints sous `/admin/groups` | Gestion ACL ; impact **tous sites** (super-admin implicitement plus large). |
| `/admin/audit-log`, `/admin/email-logs` | ADMIN ou SUPER_ADMIN | `admin_observability.py` : `require_admin_role_strict` (audit / transaction / email) | **Lecture transverse** logs ; email-logs : verifier alignement URL client vs routeur `/v1/admin/...`. |
| `/admin/settings` | SUPER_ADMIN seulement | `db_export.py`, `db_import.py`, `db_purge.py`, `admin_settings.py` : `require_super_admin_role` ou deps dediees | **Export/import DB**, purge : **super-admin** ; **step-up** non vu sur ces handlers dans la lecture rapide — risque a valider au portage (story securite / 2.4). |
| `/admin/import/legacy` | ADMIN ou SUPER_ADMIN | `legacy_import.py` (routes `/admin/import/legacy/...`) | **LLM externe**, fichiers utilisateurs, import massif : surface **HITL** et secrets. |
| `/admin/reception-reports` | adminOnly seulement | `GET /reception/lignes*` : `require_role_strict([ADMIN, SUPER_ADMIN])` | UI accessible a tout admin ; **OK** coherence avec backend sur cette famille. |
| `/admin/reception-stats` | adminOnly | `GET /stats/reception/summary` : `get_current_user` (tout utilisateur authentifie) | **Decalage** : l'API est plus permissive que la route UI ; acces direct API hors admin. |
| `/admin/session-manager`, rapports caisse | adminOnly | `reports.py` : `require_role_strict([ADMIN, SUPER_ADMIN])` ; `_ensure_session_access` restreint ADMIN au **site** de la session pour certains telechargements — **super-admin** cross-site | **Lecture cross-site** : explicite cote backend pour rapports ; a reporter dans la matrice parite. |
| `/admin/users` | adminOnly | Mutations admin : `require_admin_role` / `require_admin_role_strict` + checks SUPER_ADMIN pour `force-password` | `reset-pin` : `require_admin_role` (admin ou super-admin) — **sensible** ; le client `adminService.resetUserPin` appelle `POST /admin/users/{id}/reset-pin` **sans prefix `/v1`** => **bug** aligne sur client genere `/v1/admin/users/{id}/reset-pin`. |

**Permissions effectives (hors JSX)** : le store auth (`hasPermission`) peut elargir ADMIN — non re-analyse ici ; la story demandait la **preuve backend** : priorite aux `Depends(...)` dans les handlers.

---

## 3. Surfaces sensibles (step-up, export, super-admin, bulk, cross-contexte)

| Surface | Type | Preuve |
|---------|------|--------|
| Fermeture session caisse (depuis UI caisse / detail admin session) | **Step-up PIN** + idempotence | `cash_sessions.py` import `verify_step_up_pin_header`, `SENSITIVE_OPERATION_CASH_SESSION_CLOSE` |
| `POST /admin/db/export`, import, `POST /admin/db/purge-transactions` | **Super-admin**, fichiers binaires / irreversibilite | `db_export.py`, `db_import.py`, `db_purge.py` |
| `POST /admin/reports/cash-sessions/export-bulk`, `POST .../reception-tickets/export-bulk` | **Bulk export** ADMIN/SUPER_ADMIN | `reports.py` |
| `GET /admin/reports/cash-sessions/...` + jeton query | **Export** avec `generate_download_token` | `reports.py` |
| `POST /reception/tickets/{id}/download-token` + export CSV ticket | **Export** | `reception.py` |
| `POST /admin/users/{id}/force-password` | **Super-admin** uniquement (check explicite dans handler) | `admin_users_credentials.py` |
| `POST /admin/users/{id}/reset-pin` | **Admin** (pas step-up dans handler) | `admin_users_credentials.py` |
| Lectures stats reception (`/stats/reception/*`) avec `get_current_user` | **Cross-contexte API** (utilisateur non admin peut appeler si authentifie) | `stats.py` |
| `GET /users`, `GET /users/{id}` sans `Depends(get_current_user)` | **Critique** : liste utilisateurs sans auth declaree dans la signature | `users.py` lignes ~146-160 |

---

## 4. Gaps (OpenAPI / ContextEnvelope / CREOS) avec gravite

| ID | Description | Categorie | Gravite |
|----|-------------|-----------|---------|
| G-OA-01 | La majorite des chemins `/v1/admin/**` (sante, rapports, settings, groupes, observabilite, legacy import) **ne sont pas** decrits dans `contracts/openapi/recyclique-api.yaml`. | OpenAPI | **Bloquant portage** contract-driven |
| G-OA-02 | Ressources `sites`, `cash-registers`, `categories`, exports `reports` filesystem : **absentes** ou incompletes dans l'OpenAPI canon. | OpenAPI | **Bloquant** pour slices Peintre consommant ces surfaces |
| G-OA-03 | `GET /v1/users` et `GET /v1/users/{id}` : absence de `Depends(get_current_user)` dans le code FastAPI — l'autorisation ne suit pas le modele attendu pour l'admin. | OpenAPI + backend | **Bloquant securite** (a corriger avant toute replication Peintre) |
| G-CE-01 | Les ecrans admin legacy ne consomment pas systematiquement `ContextEnvelope` ; le portage Peintre doit definir quels widgets **doivent** lier `data_contract` / `operation_id` vs lecture directe brownfield. | ContextEnvelope | **Dette documentaire** + **Bloquant** si exigence stricte CREOS sans exception |
| G-CR-01 | Aucun **PageManifest** / **NavigationManifest** CREOS ne decrit les routes `/admin/*` legacy — navigation admin Peintre (Epic 14) reste hors parite fonctionnelle avec ce corpus. | CREOS | **Attendu** (chantier 15) — a tracer comme gap jusqu'a manifests dedies |

---

## 5. Incohérences client legacy (a ne pas recopier telles quelles)

| Element | Probleme |
|---------|----------|
| `emailLogService` | `baseUrl = '/api/v1/admin'` + `fetch` + `localStorage` token — diverge du client axios `/v1` + cookies httpOnly v2. |
| `adminService.resetUserPin` | URL `POST /admin/users/{id}/reset-pin` sans `/v1` — incompatible avec le montage standard `/v1`. |

---

## 6. Reference rapide fichiers consultes

- Routes : `recyclique-1.4.4/frontend/src/App.jsx`, `recyclique-1.4.4/frontend/src/config/adminRoutes.js`
- Garde : `recyclique-1.4.4/frontend/src/components/auth/ProtectedRoute.tsx`
- Services : `adminService.ts`, `api.ts`, `cashSessionsService.ts`, `receptionTicketsService.ts`, `reportsService.ts`, `categoryService.ts`, `groupService.ts`, `healthService.ts`, `emailLogService.ts`
- Backend : `recyclique/api/src/recyclic_api/api/api_v1/api.py`, `endpoints/{users,stats,reception,reports,categories,sites,cash_registers,cash_sessions,admin_*}.py`, `core/auth.py`
- Contrat : `contracts/openapi/recyclique-api.yaml`, `peintre-nano/docs/03-contrats-creos-et-donnees.md`

---

## 7. QA documentaire (substitut `bmad-qa-generate-e2e-tests`)

Checklist (statut : **PASS** si toutes cochees par revue statique) :

- [x] Chaque route `/admin/*` dans `App.jsx` a au moins une ligne dans les tableaux 1 et 2.
- [x] Chaque gap de la section 4 a une categorie **OpenAPI / ContextEnvelope / CREOS** et une gravite.
- [x] Chaque permission ou absence de permission citee renvoie a un fichier handler ou a une anomalie nommee (ex. `users.py` sans Depends).
- [x] Les surfaces sensibles section 3 sont explicites (export, bulk, super-admin, cross-site, step-up).
