# Epic 16 - Tableau unique des ecarts (audit only)

Date initialisation: 2026-03-01  
Format priorite Epic 16: `P0 (bloquant)`, `P1 (important)`, `P2 (confort)`  
Classification derive: `bug`, `stub`, `derive assumee`, `manque de role`, `dette technique`

## Registre des ecarts

| Ecart ID | Story source | Lot | Priorite | Classification | Type derive | Cause derive BMAD | Constat | Impact | Preuve | Statut audit |
|---|---|---|---|---|---|---|---|---|---|---|
| E16-A-001 | 16.1 | A | P0 | manque de role | derive subie | Alignement incomplet RBAC front/back sur la cible super-admin phase 1 | Routes super-admin phase 1 accessibles au role admin (front/back) | Elevation de droits sur surface supervision sensible | `frontend/src/App.tsx`, `frontend/src/admin/SuperAdminGuard.tsx`, `frontend/src/admin/SuperAdminGuard.test.tsx`, `api/routers/v1/admin/health.py`, `api/routers/v1/admin/settings.py`, `api/routers/sites.py`, `api/tests/routers/test_admin_phase1_super_admin_rbac.py`, `16-1-matrice-acces-role-route.md`, `_bmad-output/implementation-artifacts/17-1-preuve-vitest-rbac-super-admin.txt`, `_bmad-output/implementation-artifacts/17-1-preuve-pytest-rbac-super-admin.txt` | ferme confirme (17.1: verrouillage super_admin front/back + revalidation front 18/18 et back 9/9) |
| E16-A-002 | 16.1 | A | P1 | bug | derive subie | Incoherence de garde de route entre conventions de protection admin | Route front `/admin` non protegee par guard explicite | Comportement ambigu de securite UI (acces route sensible sans blocage franc) | `frontend/src/App.tsx`, `frontend/src/admin/AdminGuard.tsx`, `frontend/src/App.test.tsx`, `_bmad-output/implementation-artifacts/17-4-preuve-vitest-app-guards.txt`, `_bmad-output/implementation-artifacts/17-4-guard-explicite-admin-tests-integration-routeur-global.md` | ferme (17.4: route /admin enveloppee par AdminGuard, tests integration 3 parcours verts) |
| E16-A-003 | 16.1 | A | P0 | dette technique | derive subie | Dette de fiabilisation du harness de test auth/session non traitee avant audit | Campagne auth/session invalidee (fixtures incoherentes: override auth globale + fixture manquante) | Impossibilite de verifier proprement des controles critiques lot A | `api/tests/conftest.py` (fixtures `db_session` + `auth_client`), `_bmad-output/implementation-artifacts/17-0-preuve-pytest-auth-session.txt`, `16-1-journal-tests-manuels.md` (addendum 17.0) | ferme (harness fiabilise et reproductible) |
| E16-A-004 | 16.1 | A | P1 | dette technique | derive subie | Stabilisation runtime Vitest non finalisee pour les runs groupes critiques | Execution frontend guard/session instable (process vitest bloque en run groupe) | Couverture de preuve partielle, verification lot A fragilisee | `frontend/src/caisse/CashRegisterGuard.test.tsx`, `frontend/src/auth/LoginPage.test.tsx`, `_bmad-output/implementation-artifacts/17-0-preuve-vitest-runtime.txt`, `16-1-journal-tests-manuels.md` (addendum 17.0) | ferme (run groupe termine sans blocage) |
| E16-B-001 | 16.2 | B | P0 | stub | derive subie | Livraison admin technique centree squelette sans completion metier effective | Fonctions BDD admin technique (export/purge/import) restent non operationnelles (stub) | Maintenance/reprise donnees non executable en condition reelle | `api/routers/v1/admin/db.py`, `frontend/src/admin/AdminDbPage.tsx`, `api/services/db_admin.py`, `_bmad-output/implementation-artifacts/17-3-preuve-pytest-admin-db-operations.txt` | ferme (17.3: export/purge/import operationnels) |
| E16-B-002 | 16.2 | B | P1 | stub | derive subie | Report implicite de profondeur import legacy sans recadrage formel de story | Pipeline import legacy CSV (analyze/preview/validate/execute) non operationnel (retours stub) | Migration de donnees legacy impossible a realiser de bout en bout | `api/routers/v1/admin/import_legacy.py`, `api/services/import_legacy.py`, `api/services/csv_categories.py`, `frontend/src/admin/AdminImportLegacyPage.tsx`, `_bmad-output/implementation-artifacts/17-5-preuve-pytest-import-legacy.txt`, `_bmad-output/implementation-artifacts/17-5-completion-pipeline-import-legacy-csv-analyze-preview-validate-execute.md` | ferme |
| E16-B-003 | 16.2 | B | P1 | stub | derive subie | Priorisation lot UI/admin avant persistance de reglages operationnels | Parametres admin (alertes/session/email) majoritairement non persistes | Gouvernance operationnelle partielle (reglages non fiabilises) | `api/routers/v1/admin/settings.py`, `api/services/admin_settings.py`, `api/models/admin_setting.py`, `frontend/src/admin/AdminSettingsPage.tsx`, `_bmad-output/implementation-artifacts/17-6-preuve-pytest-admin-settings.txt` | ferme (17.6: persistance reelle + tests API) |
| E16-B-004 | 16.2 | B | P1 | stub | derive subie | Instrumentation supervision v1 laissee en mode minimal | Sante admin partielle: anomalies + test notifications en mode stub | Surveillance/incidents non couverts completement | `api/routers/v1/admin/health.py`, `frontend/src/admin/AdminHealthPage.tsx`, `_bmad-output/implementation-artifacts/17-7-preuve-pytest-admin-health-anomalies-notifications.txt` | ferme (17.7: anomalies + test notifications non-stub) |
| E16-B-005 | 16.2 | B | P2 | stub | derive subie | Journalisation email non priorisee dans le perimetre livre | Logs email admin non implementes (liste vide) | Visibilite operationnelle reduite sur l'historique des envois | `api/routers/v1/admin/email_logs.py`, `frontend/src/admin/AdminEmailLogsPage.tsx` | ouvert |
| E16-B-006 | 16.2 | B | P2 | stub | derive subie | Reporting admin livre en version minimale non finalisee | Rapports caisse by-session/export-bulk restent minimaux (texte/IDs) | Valeur metier partielle pour reporting et exports | `api/routers/v1/admin/reports.py`, `frontend/src/admin/AdminReportsPage.tsx` | ouvert |
| E16-B-007 | 16.2 | B | P2 | derive assumee | derive assumee | Decision de scope Epic 15 concentree sur 3 blocs dashboard sans exposition complete des routes techniques | Discoverabilite superadmin phase 2 incomplete (routes techniques presentes hors menu superadmin) | Accessibilite fonctionnelle degradee pour admin technique | `frontend/src/admin/AdminDashboardPage.tsx`, `frontend/src/App.tsx`, `16-2-annexe-superadmin-phase2.md` | ouvert |
| E16-C-001 | 16.3 | C | P0 | bug | derive subie | Incoherence entre resultat attendu de securite et execution reelle de la campagne auth | Test critique `/v1/users/me` deconnecte invalide: observe 200 au lieu de 401 dans la campagne courante | Risque de faux negatif securite sur controle d'acces utilisateur courant | `_bmad-output/implementation-artifacts/17-2-preuve-pytest-users-me-non-auth.txt` (rerun story 17.2: `test_get_me_unauthorized` => `1 passed`; campagne `api/tests/routers/test_auth.py` => `37 passed`), `api/tests/routers/test_auth.py`, `api/core/deps.py` | ferme confirme (17.2: refus 401 non-authentifie confirme, test cible vert et campagne auth standard validee) |
| E16-C-002 | 16.3 | C | P0 | dette technique | derive subie | Fiabilisation suite auth differee alors que zone critique securite | Suite `api/tests/routers/test_auth.py` non fiabilisee (fixture `db_session` absente, erreurs setup massives) | Couverture auth/session non exploitable pour non-regression critique | `_bmad-output/implementation-artifacts/17-0-preuve-pytest-auth-session.txt` (`37 passed`), `api/tests/routers/test_auth.py`, `api/tests/conftest.py`, `16-1-journal-tests-manuels.md` (addendum 17.0) | ferme (suite auth/session exploitable) |
| E16-C-003 | 16.3 | C | P1 | dette technique | derive subie | Dette de stabilite outillage test front non absorbee avant consolidation QA | Runs Vitest multi-fichiers guard/session/auth se bloquent en fin de run | Robustesse CI/runtime front degradee, preuves de non-regression partielles | `_bmad-output/implementation-artifacts/17-0-preuve-vitest-runtime.txt` (run groupe termine), `frontend/src/caisse/CashRegisterGuard.test.tsx`, `frontend/src/auth/LoginPage.test.tsx`, `16-1-journal-tests-manuels.md` (addendum 17.0) | ferme (blocage runtime leve) |
| E16-C-004 | 16.3 | C | P1 | manque de role | derive subie | Absence de verrouillage role-based complet sur routes super-admin phase 1 | Couverture role-based super-admin phase 1 insuffisante sur routes sensibles (`/admin/health`, `/admin/settings`, `/admin/sites`) | Risque de non-detection des derives de role sur surface sensible | `16-1-matrice-acces-role-route.md` (mis a jour conforme), `frontend/src/admin/SuperAdminGuard.test.tsx`, `api/tests/routers/test_admin_phase1_super_admin_rbac.py`, `_bmad-output/implementation-artifacts/17-1-preuve-vitest-rbac-super-admin.txt`, `_bmad-output/implementation-artifacts/17-1-preuve-pytest-rbac-super-admin.txt` | ferme confirme (17.1: cas autorise/interdit/non-authentifie verts sur les 3 cibles, front 18/18 et back 9/9) |
| E16-C-005 | 16.3 | C | P1 | dette technique | derive subie | Non-priorisation des tests d'integration routeur global sur surface critique | Couverture integration routes front critiques quasi absente (`App.test.tsx` placeholder) | Regressions de guard/routage global potentiellement invisibles | `frontend/src/App.test.tsx` (3 tests integration routeur /admin), `frontend/src/App.tsx`, `_bmad-output/implementation-artifacts/17-4-preuve-vitest-app-guards.txt` | ferme (17.4: placeholder supprime, 3 parcours integration non-auth/sans-admin/avec-admin verts) |
| E16-C-006 | 16.3 | C | P2 | dette technique | derive subie | Lacune de couverture ciblage settings admin dans la strategie de tests | Absence de tests API cibles pour `/v1/admin/settings` | Regressions silencieuses sur parametrage admin | `api/tests/routers/test_admin_settings.py`, `_bmad-output/implementation-artifacts/17-6-preuve-pytest-admin-settings.txt` | ferme (17.6: 5 tests cibles PUT+GET 401 403) |
| E16-C-007 | 16.3 | C | P2 | stub | derive subie | Tests limites au contrat de stub sans verification d'effet metier reel | Couverture admin technique surtout "happy path stub" (assertions structurelles) | Faux sentiment de robustesse sur BDD/import legacy | `api/tests/routers/test_admin_db_import_legacy.py`, `api/routers/v1/admin/db.py`, `api/routers/v1/admin/import_legacy.py` | ouvert |

## Synthese priorites (Lot A + Lot B + Lot C)

- P0: 5
- P1: 8
- P2: 5

## Regles de mise a jour

- Ajouter uniquement des constats d'audit (pas de plan de correction ici).
- Toute entree doit pointer vers une preuve exploitable (fichier, commande, artefact).
- Les stories 16.2/16.3/16.4/16.5 alimenteront ce meme tableau.

## Clarification statut 16.1-R

- `E16-A-003` est **ferme** apres la stabilisation 17.0: preuve auth/session exploitable (`37 passed`) et harness backend fiabilise.
- `E16-A-004` est **ferme** apres la stabilisation 17.0: run Vitest groupe termine proprement sans blocage runtime.

## Clarification statut 16.2

- Lot B ajoute au tableau unique sans remediation: constats, classification et preuves uniquement.
- `E16-B-001` a `E16-B-004` portent les ecarts fonctionnels prioritaires.
- Les placeholders assumes FR21/FR26 sont traces dans les livrables 16.2 mais ne sont pas ouverts en ecarts bloquants.

## Clarification statut 16.3

- Lot C consolide la robustesse/qualite sans remediation: focus couverture, tests critiques manquants et fragilites recurrentes.
- `E16-C-001` est **ferme confirme** par la story 17.2 (preuve exploitable mise a jour: test cible vert + campagne standard `37 passed`).
- `E16-C-002` est **ferme** depuis la story 17.0 (harness auth/session fiabilise).
- `E16-C-003` a `E16-C-005` portent les risques majeurs de non-regression guard/session/acces.

## Verification finale 16.5 (coherence et completude)

- Verification croisee executee entre `16-0-tableau-unique-ecarts.md` et `16-4-matrice-derive-bmad.md`.
- Coherence IDs ecarts: **18/18** alignes (`E16-A-001` a `E16-C-007`), sans manquant ni doublon.
- Coherence classification: **18/18** alignes sur la taxonomie (`bug`, `stub`, `derive assumee`, `manque de role`, `dette technique`).
- Coherence priorites globales: confirmee (`P0=5`, `P1=8`, `P2=5`) avec la synthese 16.4.
- Coherence type derive: confirmee (`derive assumee=1`, `derive subie=17`) avec distinction explicite conservee.
- Completude preuves: chaque ecart conserve une preuve exploitable (code/test/artefact).
- Incoherence detectee lors de la verification finale: **aucune**.
- Nouveau constat ajoute en 16.5: **aucun** (mise a jour limitee a la verification finale).

