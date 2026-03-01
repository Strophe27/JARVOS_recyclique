# Story 16.1 - Matrice acces role x route (Lot A securite/session/acces)

Date audit: 2026-03-01  
Mode: audit strict (lecture + execution de tests uniquement, zero remediation code)

## Perimetre "routes sensibles" retenu pour 16.1

- Frontend: routes protegees et quasi-protegees de la surface admin et parcours connecte/deconnecte.
- Backend: endpoints session/auth (v1 auth + v1 users me) et endpoints admin sensibles Paheko/supervision.
- Sources de preuve:
  - `frontend/src/App.tsx`
  - `frontend/src/admin/AdminGuard.tsx`
  - `frontend/src/admin/VieAssociativeGuard.tsx`
  - `frontend/src/admin/AdminDashboardPage.tsx`
  - `api/core/deps.py`
  - `api/routers/v1/auth.py`
  - `api/routers/v1/admin/paheko_compta.py`
  - `api/routers/v1/admin/health.py`
  - `api/tests/routers/test_admin_paheko_compta.py`
  - executions tests 2026-03-01 (journal 16.1 associe)

## Statuts

- `conforme`: attendu confirme par preuve exploitable
- `non conforme`: ecart confirme par preuve exploitable
- `non verifiable`: evidence insuffisante ou campagne de test invalidee
- Impact audit (pour `non verifiable`): indique explicitement ce qui reste incertain dans la decision 16.1.

## Matrice

| Role | Route sensible | Attendu | Observe | Statut | Preuve |
|---|---|---|---|---|---|
| deconnecte | `/admin/users` (front) | redirection login | `AdminGuard` redirige vers `/login` si `!user` | conforme | `frontend/src/admin/AdminGuard.tsx`, `frontend/src/admin/AdminGuard.test.tsx` |
| benevole (sans admin) | `/admin/users` (front) | acces refuse | message `Acces reserve aux administrateurs` | conforme | `frontend/src/admin/AdminGuard.tsx`, `frontend/src/admin/AdminGuard.test.tsx` |
| admin | `/admin/users` (front) | acces autorise | rendu enfant si `permissions` contient `admin` | conforme | `frontend/src/admin/AdminGuard.tsx`, `frontend/src/admin/AdminGuard.test.tsx` |
| deconnecte | `/admin/vie-associative` (front) | redirection login | `VieAssociativeGuard` redirige login si `!user` | conforme | `frontend/src/admin/VieAssociativeGuard.tsx`, `frontend/src/admin/VieAssociativeGuard.test.tsx` |
| benevole + `vie_asso.access` | `/admin/vie-associative` (front) | acces autorise | garde autorise `admin` ou `vie_asso.access` | conforme | `frontend/src/admin/VieAssociativeGuard.tsx`, `frontend/src/admin/VieAssociativeGuard.test.tsx` |
| benevole sans `vie_asso.access` | `/admin/vie-associative` (front) | acces refuse | message refus affiche | conforme | `frontend/src/admin/VieAssociativeGuard.tsx`, `frontend/src/admin/VieAssociativeGuard.test.tsx` |
| deconnecte | `/admin` (front) | blocage explicite route sensible | route non enveloppee par `AdminGuard` (rendu page admin avec contenu conditionnel) | non conforme | `frontend/src/App.tsx`, `frontend/src/admin/AdminDashboardPage.tsx` |
| admin (non super_admin) | `/admin/health`, `/admin/settings`, `/admin/sites` (front) | super-admin phase 1: acces restreint | routes protegees par `SuperAdminGuard`; admin non super_admin bloque explicitement, super_admin autorise | conforme | `frontend/src/App.tsx`, `frontend/src/admin/SuperAdminGuard.tsx`, `frontend/src/admin/SuperAdminGuard.test.tsx` |
| super_admin | section super-admin dashboard (front) | visibilite section dediee | section visible uniquement si `user.role === super_admin` | conforme | `frontend/src/admin/AdminDashboardPage.tsx`, `frontend/src/admin/AdminDashboardPage.test.tsx` |
| admin | `/v1/admin/paheko-compta-url` | autorise | tests: `status in (200,404)` et pas 403 | conforme | `api/tests/routers/test_admin_paheko_compta.py` (run 2026-03-01) |
| super_admin | `/v1/admin/paheko-compta-url` | autorise | tests: `status in (200,404)` et pas 403 | conforme | `api/tests/routers/test_admin_paheko_compta.py` (run 2026-03-01) |
| benevole sans exception | `/v1/admin/paheko-compta-url` | deny-by-default | tests: 403 + detail `Acces reserve roles autorises` | conforme | `api/tests/routers/test_admin_paheko_compta.py` (run 2026-03-01) |
| benevole avec exception active | `/v1/admin/paheko-compta-url` | autorise avec garde-fous | tests: autorise (200/404) | conforme | `api/tests/routers/test_admin_paheko_compta.py` (run 2026-03-01) |
| benevole avec exception expiree | `/v1/admin/paheko-compta-url` | retour deny-by-default + audit | tests: 403 + trace decision `deny_by_default_benevole` | conforme | `api/tests/routers/test_admin_paheko_compta.py` (run 2026-03-01) |
| admin/super_admin | `/v1/admin/paheko-access/exceptions*` | grant/revoke operables | tests grant/revoke OK | conforme | `api/tests/routers/test_admin_paheko_compta.py` (run 2026-03-01) |
| benevole (meme avec exception active) | `/v1/admin/paheko-access/exceptions` | interdiction gestion exceptions | tests: 403 confirme | conforme | `api/tests/routers/test_admin_paheko_compta.py` (run 2026-03-01) |
| admin (non super_admin) | `/v1/admin/health*`, `/v1/admin/settings*`, `/v1/sites*` (back) | super-admin phase 1: droits restreints (attendu cible) | endpoints gates `require_permissions("super_admin")`; admin non super_admin en 403, super_admin autorise, non-authentifie refuse (401) | conforme | `api/routers/v1/admin/health.py`, `api/routers/v1/admin/settings.py`, `api/routers/sites.py`, `api/tests/routers/test_admin_phase1_super_admin_rbac.py` |
| deconnecte | `/v1/users/me` | 401 | campagne courante invalidee (fixture client override auth globale) + test cible retourne 200 dans ce contexte | non verifiable | `api/tests/conftest.py`, `api/tests/routers/test_auth.py::test_get_me_unauthorized` |
| connecte/deconnecte | `/v1/auth/logout`, `/v1/auth/session`, `/v1/auth/sso/*` | verification lot A complete | campagne `test_auth.py` partiellement invalidee (`db_session` absent + setup auth override) | non verifiable | execution pytest 2026-03-01 + `api/tests/conftest.py` |

## Couverture lot 16.1 (routes sensibles)

- Routes sensibles listees dans ce scope: 20/20
- Repartition:
  - conforme: 15
  - non conforme: 1
  - non verifiable: 4

## Impact audit des statuts non verifiables (16.1-R)

- `/v1/users/me` (deconnecte):
  - impact audit: impossible de conclure de facon ferme sur le comportement runtime reel 401 en environnement non surcharge de tests.
- `/v1/auth/logout`, `/v1/auth/session`, `/v1/auth/sso/*`:
  - impact audit: evidence insuffisante pour valider completement le couple "session lifecycle + fail-closed OIDC" au niveau 16.1.
- Guards frontend en execution groupee (`AdminGuard`, `VieAssociativeGuard`, `CashRegisterGuard`, `AuthContext`):
  - impact audit: les preuves statiques restent fortes, mais la preuve d'execution consolidee de non-regression est partielle.

