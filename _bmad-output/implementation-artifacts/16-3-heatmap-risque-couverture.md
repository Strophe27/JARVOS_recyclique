# Story 16.3 - Heatmap risque x couverture (Lot C robustesse/qualite)

Date audit: 2026-03-01  
Mode: audit strict (sans remediation code)

## Sources de preuve utilisees

- Lot A/B existants:
  - `16-1-matrice-acces-role-route.md`
  - `16-1-journal-tests-manuels.md`
  - `16-2-registre-stubs-placeholders-consolide.md`
  - `16-2-matrice-conformite-fonctionnelle.md`
  - `16-2-annexe-superadmin-phase2.md`
- Code et tests:
  - `api/tests/conftest.py`
  - `api/tests/routers/test_auth.py`
  - `api/tests/routers/test_admin_paheko_compta.py`
  - `api/tests/routers/test_admin_db_import_legacy.py`
  - `api/tests/routers/test_admin_health_audit.py`
  - `frontend/src/App.tsx`, `frontend/src/App.test.tsx`
  - `frontend/src/admin/AdminGuard.test.tsx`
  - `frontend/src/admin/VieAssociativeGuard.test.tsx`
  - `frontend/src/caisse/CashRegisterGuard.test.tsx`
  - `frontend/src/auth/AuthContext.test.tsx`
- Executions de tests (2026-03-01):
  - `python -m pytest api/tests/routers/test_auth.py::test_get_me_unauthorized -q`
  - `python -m pytest api/tests/routers/test_auth.py -q`
  - `python -m pytest api/tests/routers/test_admin_paheko_compta.py -q`
  - `python -m pytest api/tests/routers/test_admin_db_import_legacy.py -q`
  - `npm run test:run -- src/admin/AdminGuard.test.tsx src/admin/VieAssociativeGuard.test.tsx src/caisse/CashRegisterGuard.test.tsx src/auth/AuthContext.test.tsx src/App.test.tsx`

## Echelle

- Couverture: `couvert` / `partiel` / `non couvert`
- Risque: `P0` (bloquant), `P1` (important), `P2` (confort)

## Heatmap

| Domaine / zone critique | Risque principal | Couverture | Impact | Criticite | Preuves |
|---|---|---|---|---|---|
| Auth/session backend (`/v1/auth/*`, `/v1/users/me`) | Regressions auth non detectees (401/200, fail-closed OIDC) | partiel | Ouverture de surface d'acces non prevue + confiance QA reduite | P0 | `test_get_me_unauthorized` echoue (`assert 200 == 401`), `test_auth.py` = `7 failed, 13 passed, 17 errors` (fixture `db_session` absente), `api/tests/conftest.py` override auth globale |
| Harness backend de tests | Faux positifs/faux negatifs transverses sur routes protegees | non couvert | Invalidite de campagnes critiques, decision produit fragile | P0 | `api/tests/conftest.py` (override `get_current_user` + permissions forcees), erreurs setup `fixture 'db_session' not found` dans `api/tests/routers/test_auth.py` |
| Controle d'acces backend sensible Paheko | Derive de role non detectee sur acces admin sensibles | couvert | Risque limite sur ce sous-domaine (preuves executees stables) | P1 | `api/tests/routers/test_admin_paheko_compta.py` + execution `13 passed in 0.73s` |
| Admin sensible super-admin phase 1 (`/admin/health`, `/admin/settings`, `/admin/sites`) | Absence de preuve robuste du cloisonnement super-admin | partiel | Exposition possible de fonctions sensibles a un role trop large | P1 | `api/routers/v1/admin/health.py` gate `require_permissions("admin")`; `16-1-matrice-acces-role-route.md` (non conforme) |
| Robustesse runtime front (Vitest) | Pipeline test front non deterministe / bloque | non couvert | CI locale fragile, non-regression guard/session incertaine | P1 | 2 runs `npm run test:run ...` bloques (process interrompus), warnings React `act(...)` sur `CashRegisterGuard.test.tsx`, deja trace dans `16-1-journal-tests-manuels.md` |
| Guards/routes front critiques (`/admin`, guards role) | Regressions de routage/protection non detectees en integration | partiel | Derives d'acces front possibles sans detection rapide | P1 | `frontend/src/App.tsx` route `/admin` hors `AdminGuard`; `frontend/src/App.test.tsx` = test placeholder; tests guard existants mais unitaires isoles |
| Admin technique BDD/import legacy | Faux sentiment de couverture sur parcours critiques | partiel | Restauration/migration reelles non securisees par tests d'effets | P2 | `api/tests/routers/test_admin_db_import_legacy.py` valide surtout 200 + presence de cles; `api/routers/v1/admin/db.py` et `import_legacy.py` en stub |
| Parametres admin (`/v1/admin/settings`) | Regressions silencieuses sur parametrage operationnel | non couvert | Valeurs de config critiques potentiellement cassees sans alerte QA | P2 | Aucun test cible trouve pour `/v1/admin/settings` dans `api/tests/` |

## Lecture synthese

- Zones les plus risquees actuellement: `auth/session backend` et `harness backend` (P0).
- La couverture est la plus fragile sur: robustesse runtime Vitest, integration routes front, settings admin.
- Le sous-domaine le plus solide dans les preuves executees: controle d'acces Paheko (`test_admin_paheko_compta.py`).
