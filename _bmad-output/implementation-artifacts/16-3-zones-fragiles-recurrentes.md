# Story 16.3 - Zones fragiles recurrentes (avec preuves)

Date audit: 2026-03-01  
Mode: audit strict (constats consolides, sans remediation)

## Methode de consolidation

- Reprise des constats Lot A/B existants (sans les invalider).
- Ajout de preuves Lot C via lecture code/tests + execution ciblee.
- Focus prioritaire: auth/session/acces, admin sensible, robustesse tests CI/runtime.

## Zones fragiles recurrentes

| ID | Zone fragile | Recurrente depuis | Constat consolide | Impact | Criticite | Preuves |
|---|---|---|---|---|---|---|
| ZF16C-001 | Harness backend de tests (overrides globaux) | Lot A (16.1) | Le fixture `client` force auth/permissions pour de nombreux tests, ce qui biaise les scenarios deconnectes et l'interpretation securite | Risque de faux positifs/faux negatifs sur auth et routes sensibles | P0 | `api/tests/conftest.py` (`override_get_current_user`, mock permissions), `16-1-journal-tests-manuels.md` (CR-001) |
| ZF16C-002 | Suite `api/tests/routers/test_auth.py` instable | Lot A (16.1) + Lot C | La suite auth n'est pas executable proprement en run complet (fixtures manquantes + fails fonctionnels) | Couverture critique auth/session non fiabilisee | P0 | Execution 2026-03-01: `7 failed, 13 passed, 17 errors`; erreurs `fixture 'db_session' not found`; `test_get_me_unauthorized` echoue |
| ZF16C-003 | Robustesse runtime Vitest (front) | Lot A (16.1-R) + Lot C | Les campagnes multi-fichiers gardes/session peuvent rester bloquees en fin de run | Non-regression front non deterministe | P1 | `16-1-journal-tests-manuels.md` (CR-002), runs 16.3 bloques, warnings React `act(...)` sur `CashRegisterGuard.test.tsx` |
| ZF16C-004 | Couverture integration routes front critiques | Lot A (16.1) + Lot C | Le comportement routeur global est peu teste (absence de test d'integration App sur routes sensibles) | Regression d'acces UI potentiellement invisible | P1 | `frontend/src/App.test.tsx` = placeholder, constats `16-1-matrice-acces-role-route.md` sur `/admin` |
| ZF16C-005 | Cloisonnement super-admin phase 1 | Lot A (16.1) + Lot B (16.2) + Lot C | Ecart role cible vs implementation observee + faible couverture de non-regression role-based | Exposition potentielle de fonctions admin sensibles | P1 | `16-1-matrice-acces-role-route.md` (non conforme), `api/routers/v1/admin/health.py` (`require_permissions("admin")`), `16-2-annexe-superadmin-phase2.md` |
| ZF16C-006 | Settings/admin operationnels | Lot B (16.2) + Lot C | Domaine deja identifie en stub et sans couverture test cible API dediee | Regressions silencieuses de parametrage | P1 | `16-2-registre-stubs-placeholders-consolide.md` (settings stub), absence de tests `/v1/admin/settings` dans `api/tests/` |
| ZF16C-007 | Tests "happy path stub" admin technique | Lot B (16.2) + Lot C | Couverture presente mais a faible profondeur (assertions de structure plutot que comportement metier) | Surconfiance qualite sur BDD/import legacy | P2 | `api/tests/routers/test_admin_db_import_legacy.py`, `api/routers/v1/admin/db.py`, `api/routers/v1/admin/import_legacy.py` |
| ZF16C-008 | Tolerance test ambiguë sur auth admin | Lot C | Certains tests acceptent plusieurs statuts contradictoires (`200` ou `401`) | Signal QA affaibli, policy difficile a trancher | P2 | `api/tests/routers/test_admin_health_audit.py` (`assert r.status_code in (200, 401)`) |

## Lecture de risque

- **Rouges prioritaires (P0):** `ZF16C-001`, `ZF16C-002`.
- **Orange (P1):** `ZF16C-003` a `ZF16C-006`.
- **Jaune (P2):** `ZF16C-007`, `ZF16C-008`.

## Lien avec le tableau unique Epic 16

- Les zones ci-dessus sont traduites en ecarts Lot C dans `16-0-tableau-unique-ecarts.md` avec:
  - priorite (`P0/P1/P2`)
  - classification (`bug/stub/derive assumee/manque de role/dette technique`)
  - preuve exploitable.
