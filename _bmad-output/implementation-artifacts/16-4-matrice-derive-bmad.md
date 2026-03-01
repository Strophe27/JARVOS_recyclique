# Story 16.4 - Matrice de derive BMAD (intention vs observe)

Date audit: 2026-03-01  
Mode: audit strict (constats et classification uniquement, zero remediation code)

## Sources d'intention et de preuve

- Intention:
  - `_bmad-output/planning-artifacts/prd.md`
  - `_bmad-output/planning-artifacts/architecture.md`
  - `_bmad-output/planning-artifacts/epics.md` (Epic 16 + stories precedentes)
- Observe:
  - `_bmad-output/implementation-artifacts/16-0-tableau-unique-ecarts.md`
  - `_bmad-output/implementation-artifacts/16-1-matrice-acces-role-route.md`
  - `_bmad-output/implementation-artifacts/16-1-journal-tests-manuels.md`
  - `_bmad-output/implementation-artifacts/16-2-registre-stubs-placeholders-consolide.md`
  - `_bmad-output/implementation-artifacts/16-2-matrice-conformite-fonctionnelle.md`
  - `_bmad-output/implementation-artifacts/16-2-annexe-superadmin-phase2.md`
  - `_bmad-output/implementation-artifacts/16-3-heatmap-risque-couverture.md`
  - `_bmad-output/implementation-artifacts/16-3-tests-critiques-manquants.md`
  - `_bmad-output/implementation-artifacts/16-3-zones-fragiles-recurrentes.md`

## Matrice de derive

| Ecart ID | Intention de reference | Observe reel | Classification | Type derive | Cause derive BMAD | Impact | Preuve |
|---|---|---|---|---|---|---|---|
| E16-A-001 | PRD RBAC + Epic 16.1 (routes sensibles rolees) | Surface super-admin phase 1 accessible au role admin | manque de role | derive subie | Alignement incomplet RBAC front/back sur cible role | Elevation de droits sur surface sensible | `16-1-matrice-acces-role-route.md`, `frontend/src/App.tsx`, `api/routers/v1/admin/health.py` |
| E16-A-002 | Epic 16.1 (guard explicite routes sensibles front) | Route `/admin` sans garde explicite | bug | derive subie | Incoherence de convention de guard au niveau routeur | Ambiguite de securite UI | `16-1-matrice-acces-role-route.md`, `frontend/src/App.tsx`, `frontend/src/admin/AdminDashboardPage.tsx` |
| E16-A-003 | Epic 16.1 (preuves executables fiables auth/session) | Campagne invalidee (override auth + fixture manquante) | dette technique | derive subie | Dette de fiabilisation harness tests critique differee | Verification lot A non fiable | `16-1-journal-tests-manuels.md`, `api/tests/conftest.py`, sortie pytest 2026-03-01 |
| E16-A-004 | Epic 16.1 (preuve runtime front consolidee) | Runs Vitest groupes instables/non terminants | dette technique | derive subie | Stabilisation outillage test front non finalisee | Couverture de preuve partielle | `16-1-journal-tests-manuels.md`, sorties vitest 2026-03-01 |
| E16-B-001 | Epic 8.5 (BDD export/purge/import operationnels) | Fonctions admin BDD restent en mode stub | stub | derive subie | Livraison centree squelette sans completion metier | Maintenance/reprise donnees non operationnelle | `16-2-matrice-conformite-fonctionnelle.md`, `api/routers/v1/admin/db.py`, `frontend/src/admin/AdminDbPage.tsx` |
| E16-B-002 | Epic 8.5 (pipeline import legacy operationnel) | Analyze/preview/validate/execute restent stub | stub | derive subie | Report implicite de profondeur sans recadrage explicite | Migration legacy non executable | `16-2-matrice-conformite-fonctionnelle.md`, `api/routers/v1/admin/import_legacy.py`, `frontend/src/admin/AdminImportLegacyPage.tsx` |
| E16-B-003 | Epic 8.4 (parametres admin utilisables) | Parametres majoritairement non persistes | stub | derive subie | Priorisation UI avant persistance effective | Gouvernance operationnelle partielle | `16-2-registre-stubs-placeholders-consolide.md`, `api/routers/v1/admin/settings.py`, `frontend/src/admin/AdminSettingsPage.tsx` |
| E16-B-004 | Epic 8.4 (sante/admin complete) | Anomalies et test notifications en stub | stub | derive subie | Instrumentation supervision laissee en minimal | Surveillance incidents incomplete | `16-2-registre-stubs-placeholders-consolide.md`, `api/routers/v1/admin/health.py`, `frontend/src/admin/AdminHealthPage.tsx` |
| E16-B-005 | Epic 8.4 (logs email administrables) | Liste vide permanente | stub | derive subie | Journalisation email non priorisee dans lot livre | Visibilite operationnelle reduite | `16-2-registre-stubs-placeholders-consolide.md`, `api/routers/v1/admin/email_logs.py`, `frontend/src/admin/AdminEmailLogsPage.tsx` |
| E16-B-006 | Epic 8.2 (rapports caisse exploitables) | Exports minimaux texte/IDs | stub | derive subie | Reporting livre en version partielle | Valeur metier reportings degradee | `16-2-matrice-conformite-fonctionnelle.md`, `api/routers/v1/admin/reports.py`, `frontend/src/admin/AdminReportsPage.tsx` |
| E16-B-007 | Epic 15.5 (dashboard super-admin 3 blocs) + Epic 8.x (surface technique) | Routes techniques presentes hors menu super-admin principal | derive assumee | derive assumee | Decision de scope visuel focalisee sur 3 blocs sans exhaustivite de discoverabilite | Accessibilite fonctionnelle degradee mais intentionnellement acceptee en lot | `16-2-annexe-superadmin-phase2.md`, `frontend/src/admin/AdminDashboardPage.tsx`, `frontend/src/App.tsx` |
| E16-C-001 | Epic 16.3 (tests critiques auth fiables) | `test_get_me_unauthorized` observe 200 au lieu de 401 | bug | derive subie | Ecart comportement attendu vs execution courante | Faux negatif securite potentiel | `16-3-heatmap-risque-couverture.md`, `api/tests/routers/test_auth.py`, `api/tests/conftest.py` |
| E16-C-002 | Epic 16.3 (couverture auth/session exploitable) | Suite `test_auth.py` massivement en erreur setup | dette technique | derive subie | Fiabilisation suite critique non achevee | Non-regression auth non demonstrable | `16-3-heatmap-risque-couverture.md`, `api/tests/routers/test_auth.py`, sortie pytest 2026-03-01 |
| E16-C-003 | Epic 16.3 (robustesse execution tests front) | Blocages en fin de run multi-fichiers | dette technique | derive subie | Dette de stabilite CI/runtime front | Signal QA instable | `16-3-heatmap-risque-couverture.md`, `16-1-journal-tests-manuels.md`, `frontend/src/caisse/CashRegisterGuard.test.tsx` |
| E16-C-004 | PRD RBAC + Epic 16.3 (couverture role-based sensible) | Couverture role-based super-admin insuffisante | manque de role | derive subie | Cloisonnement role sensible incomplet et peu teste | Non-detection possible d'ecarts d'acces | `16-3-heatmap-risque-couverture.md`, `16-1-matrice-acces-role-route.md`, `api/routers/v1/admin/health.py` |
| E16-C-005 | Epic 16.3 (tests integration routes critiques) | `App.test.tsx` placeholder, faible couverture globale routeur | dette technique | derive subie | Non-priorisation des tests d'integration routeur | Regressions guard/routage invisibles | `16-3-tests-critiques-manquants.md`, `frontend/src/App.test.tsx`, `frontend/src/App.tsx` |
| E16-C-006 | Epic 16.3 (couvrir settings admin sensibles) | Aucun test cible `/v1/admin/settings` | dette technique | derive subie | Lacune de strategie de couverture sur parametres admin | Regressions silencieuses | `16-3-tests-critiques-manquants.md`, `api/routers/v1/admin/settings.py` |
| E16-C-007 | Epic 16.3 (tests robustesse admin technique) | Tests surtout structurels sur endpoints stub | stub | derive subie | Couverture focalisee contrat de stub, pas effet metier | Surconfiance sur robustesse BDD/import legacy | `16-3-tests-critiques-manquants.md`, `api/tests/routers/test_admin_db_import_legacy.py`, `api/routers/v1/admin/db.py` |

## Distinction explicite derive assumee vs derive subie

### Derive assumee

- Nombre: 1
- Ecart: `E16-B-007`
- Logique: restriction de scope Epic 15 orientee shell/dashboard, avec discoverabilite partielle acceptee.

### Derive subie

- Nombre: 17
- Ecarts: `E16-A-001` a `E16-A-004`, `E16-B-001` a `E16-B-006`, `E16-C-001` a `E16-C-007`
- Logique: ecarts non explicitement cibles comme compromis produit, observes comme dette/defaut/couverture incomplete.

## Tableau de priorites globales (P0/P1/P2)

- P0: 5 (`E16-A-001`, `E16-A-003`, `E16-B-001`, `E16-C-001`, `E16-C-002`)
- P1: 8 (`E16-A-002`, `E16-A-004`, `E16-B-002`, `E16-B-003`, `E16-B-004`, `E16-C-003`, `E16-C-004`, `E16-C-005`)
- P2: 5 (`E16-B-005`, `E16-B-006`, `E16-B-007`, `E16-C-006`, `E16-C-007`)

## Verification de fin 16.4

- Ecart non classe: 0
- Ecart sans preuve liee: 0
- Distinction derive assumee vs subie: explicite (oui)
