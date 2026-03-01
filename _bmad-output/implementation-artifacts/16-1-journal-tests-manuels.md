# Story 16.1 - Journal de tests manuels (cas, resultat, preuve)

Date audit: 2026-03-01  
Mode: audit strict (aucune modification code)  
Operateur: agent QA (execution + inspection manuelle)

## Legende resultat

- `OK`: comportement attendu confirme
- `KO`: ecart confirme
- `NV`: non verifiable dans cette campagne

## Journal des cas

| ID | Type | Cas | Resultat | Preuve |
|---|---|---|---|---|
| T16A-001 | execution tests | `python -m pytest api/tests/routers/test_admin_paheko_compta.py` (inclus dans campagne combinee) | OK (13 tests passes) | sortie campagne 2026-03-01: `api/tests/routers/test_admin_paheko_compta.py ............. [100%]` |
| T16A-002 | execution tests | `python -m pytest api/tests/routers/test_auth.py::test_get_me_unauthorized -q` | KO (attendu 401, observe 200) | sortie 2026-03-01: `assert 200 == 401` |
| T16A-003 | execution tests | `python -m pytest api/tests/routers/test_auth.py api/tests/routers/test_admin_paheko_compta.py` | NV (campagne auth invalidee) | 7 fails, 17 errors; erreurs setup `fixture 'db_session' not found` |
| T16A-004 | inspection manuelle | verifier validite du harness API auth | KO (harness biaise les tests non-auth) | `api/tests/conftest.py`: override global `get_current_user` dans fixture `client` |
| T16A-005 | execution tests | `npm run test:run -- src/admin/AdminDashboardPage.test.tsx` | OK (9/9) | sortie 2026-03-01: `Test Files 1 passed`, `Tests 9 passed` |
| T16A-006 | execution tests | `npm run test:run -- ...AdminGuard...VieAssociativeGuard...CashRegisterGuard...AuthContext...` | NV (process vitest bloque en fin de run) | sortie partielle: `CashRegisterGuard (4 tests)` et `AuthContext (3 tests)` puis process non termine |
| T16A-007 | inspection manuelle | route front `/admin` doit etre protegee explicitement | KO | `frontend/src/App.tsx`: route `/admin` sans `AdminGuard` |
| T16A-008 | inspection manuelle | droits super-admin phase 1 (`/admin/health`, `/admin/settings`, `/admin/sites`) | KO | `frontend/src/App.tsx` (garde admin generic), `api/routers/v1/admin/health.py` (admin autorise) |
| T16A-009 | inspection manuelle | guard front admin sur sous-routes admin | OK | `frontend/src/admin/AdminGuard.tsx` + tests associes |
| T16A-010 | inspection manuelle | guard front vie associative role-based | OK | `frontend/src/admin/VieAssociativeGuard.tsx` + tests associes |

## Notes de preuve complementaires

- Les commandes ont ete executees en lecture/execution uniquement; aucune ecriture dans le code source applicatif.
- Les ecarts et non-verifiables de ce journal sont reportes dans le tableau unique Epic 16.

## Addendum 16.1-R - Fiabilite des preuves (E16-A-003 / E16-A-004)

### 1) Ce qui est fiable

- Perimetre Paheko access control backend (`test_admin_paheko_compta.py`) : execution complete et stable.
- Constat structurel front sur protections de routes (`/admin` non guardee explicitement, super-admin phase 1 insuffisamment isole) : preuve de code directe.
- Verification dashboard admin (`AdminDashboardPage.test.tsx`) : run isole passe (9/9).

### 2) Ce qui est non fiable

- Campagne `test_auth.py` globale pour auth/session/logout : non fiable pour qualification finale lot A dans ce contexte de run.
- Campagnes frontend groupees guard/session (`AdminGuard` + `VieAssociativeGuard` + `CashRegisterGuard` + `AuthContext`) : non fiables en sortie globale (process vitest non termine).

### 3) Cause racine du non fiable

- **Cause racine CR-001 (backend test harness):**
  - fixture `client` surcharge l'authentification (`get_current_user`) dans `api/tests/conftest.py`
  - des tests `test_auth.py` attendent des comportements "deconnecte" mais tournent avec un contexte force
  - erreurs de setup supplementaires (`fixture 'db_session' not found`) invalident une partie de la campagne.
- **Cause racine CR-002 (frontend execution):**
  - executions vitest multi-fichiers restant bloquees en fin de run (absence de terminaison propre)
  - avertissements `act(...)` recurrentes sur `CashRegisterGuard` qui degradent la confiance de stabilite du run global.

### 4) Niveau de confiance par test (16.1-R)

| ID test | Domaine | Confiance | Justification |
|---|---|---|---|
| T16A-001 | backend paheko access | elevee | run complet, resultat stable, preuve exploitable |
| T16A-002 | backend auth (`/v1/users/me`) | moyenne | ecart observe net, mais dans un harness auth override |
| T16A-003 | backend auth campagne globale | faible | campagne invalidee par erreurs setup/harness |
| T16A-004 | backend harness qualite | elevee | constat direct sur `api/tests/conftest.py` |
| T16A-005 | frontend dashboard admin | elevee | run isole termine et passe |
| T16A-006 | frontend guard/session groupe | faible | process non termine, sortie partielle uniquement |
| T16A-007 | front route `/admin` | elevee | preuve statique claire dans `App.tsx` |
| T16A-008 | super-admin phase 1 front/back | elevee | preuve statique claire front + back |
| T16A-009 | guard admin (preuve code/tests) | moyenne | code clair, mais run groupe guard non consolide |
| T16A-010 | guard vie associative (preuve code/tests) | moyenne | code clair, mais run groupe guard non consolide |

