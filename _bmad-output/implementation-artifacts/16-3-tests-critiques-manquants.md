# Story 16.3 - Liste des tests critiques manquants (sans implementation)

Date audit: 2026-03-01  
Mode: audit strict (liste d'ecarts de couverture uniquement)

## Regles

- Cette liste ne propose **aucune correction code**.
- Chaque item indique impact + criticite + preuve du manque.

## Inventaire priorise

| ID | Zone critique | Test critique manquant | Impact si non teste | Criticite | Preuve du manque |
|---|---|---|---|---|---|
| T16C-MISS-001 | Auth backend | Test d'integration fiable `GET /v1/users/me` deconnecte -> `401` sans override auth globale | Risque d'acces non autorise non detecte | P0 | `api/tests/routers/test_auth.py::test_get_me_unauthorized` echoue (`200 != 401`), `api/tests/conftest.py` override `get_current_user` |
| T16C-MISS-002 | Auth backend | Couverture complete stable des fixtures `db_session` sur `api/tests/routers/test_auth.py` | Suite auth inutilisable en non-regression | P0 | `python -m pytest api/tests/routers/test_auth.py -q` -> `17 errors` (`fixture 'db_session' not found`) |
| T16C-MISS-003 | Front routes sensibles | Test d'integration route `/admin` (deconnecte, benevole, admin, super_admin) avec rendu routeur reel | Derive de guard route non detectee | P1 | `frontend/src/App.test.tsx` contient un test placeholder unique (`expect(true).toBe(true)`) |
| T16C-MISS-004 | Front super-admin | Test d'integration front d'acces effectif a `/admin/health`, `/admin/settings`, `/admin/sites` par role | Exposition d'ecrans sensibles non detectee cote UI | P1 | Recherche tests front sur ces routes: seulement verif de liens dans `AdminDashboardPage.test.tsx`, pas de test de blocage/acces route |
| T16C-MISS-005 | Backend role-gating super-admin | Test explicite de refus role admin sur endpoints super-admin phase 1 (`/v1/admin/health*` si cible super-admin) | Ambiguite de securite role-based persiste | P1 | `16-1-matrice-acces-role-route.md` marque non conforme; code `api/routers/v1/admin/health.py` gate `admin`; pas de test de policy super-admin cible |
| T16C-MISS-006 | Backend settings admin | Tests API `GET/PUT /v1/admin/settings` (schema, persistance attendue/stub assume, securite role) | Regressions de parametres non detectees | P1 | Aucune occurrence `/v1/admin/settings` dans `api/tests/` |
| T16C-MISS-007 | CI/runtime front | Test de stabilite d'execution multi-fichiers Vitest (guard/session/auth) sans blocage fin de run | Non-regression front non fiable en run groupe | P1 | Deux executions `npm run test:run ...` bloquees; warnings React `act(...)` observes |
| T16C-MISS-008 | Admin BDD/import legacy | Tests d'effets metier (pas seulement 200 + structure) sur export/purge/import/legacy | Faux positif de robustesse sur parcours techniques critiques | P2 | `api/tests/routers/test_admin_db_import_legacy.py` verifie principalement presence de cles et retours stub |
| T16C-MISS-009 | Health/admin auth | Test deterministic `without auth` sur endpoints admin (attendu unique, pas `200 ou 401`) | Incoherence de policy d'auth non detectee | P2 | `api/tests/routers/test_admin_health_audit.py` accepte `r.status_code in (200, 401)` |
| T16C-MISS-010 | Couverture transversale | Scenario de non-regression croisee auth->guard->route sensible (front + API) | Defauts inter-couches detectes tardivement | P2 | Pas de test end-to-end technique equivalent dans le perimetre Lot C; preuves actuelles fragmentees entre tests unitaires |

## Focus prioritaire (ordre recommande d'audit futur)

1. `T16C-MISS-001` et `T16C-MISS-002` (P0, auth/session backend).
2. `T16C-MISS-003` a `T16C-MISS-007` (P1, routes sensibles et stabilite runtime).
3. `T16C-MISS-008` a `T16C-MISS-010` (P2, robustesse qualite globale).
