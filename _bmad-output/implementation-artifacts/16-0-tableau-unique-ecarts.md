# Epic 16 - Tableau unique des ecarts (audit only)

Date initialisation: 2026-03-01  
Format priorite Epic 16: `P0 (bloquant)`, `P1 (important)`, `P2 (confort)`  
Classification derive: `bug`, `stub`, `derive assumee`, `manque de role`, `dette technique`

## Registre des ecarts

| Ecart ID | Story source | Lot | Priorite | Classification | Type derive | Cause derive BMAD | Constat | Impact | Preuve | Statut audit |
|---|---|---|---|---|---|---|---|---|---|---|
| E16-A-001 | 16.1 | A | P0 | manque de role | derive subie | Alignement incomplet RBAC front/back sur la cible super-admin phase 1 | Routes super-admin phase 1 accessibles au role admin (front/back) | Elevation de droits sur surface supervision sensible | `frontend/src/App.tsx`, `api/routers/v1/admin/health.py`, `16-1-matrice-acces-role-route.md` | ouvert |
| E16-A-002 | 16.1 | A | P1 | bug | derive subie | Incoherence de garde de route entre conventions de protection admin | Route front `/admin` non protegee par guard explicite | Comportement ambigu de securite UI (acces route sensible sans blocage franc) | `frontend/src/App.tsx`, `frontend/src/admin/AdminDashboardPage.tsx`, `16-1-matrice-acces-role-route.md` | ouvert |
| E16-A-003 | 16.1 | A | P0 | dette technique | derive subie | Dette de fiabilisation du harness de test auth/session non traitee avant audit | Campagne auth/session invalidee (fixtures incoherentes: override auth globale + fixture manquante) | Impossibilite de verifier proprement des controles critiques lot A | `api/tests/conftest.py`, sortie pytest 2026-03-01, `16-1-journal-tests-manuels.md` (addendum 16.1-R) | ouvert (confirme) |
| E16-A-004 | 16.1 | A | P1 | dette technique | derive subie | Stabilisation runtime Vitest non finalisee pour les runs groupes critiques | Execution frontend guard/session instable (process vitest bloque en run groupe) | Couverture de preuve partielle, verification lot A fragilisee | sortie vitest 2026-03-01 + run isole dashboard OK, `16-1-journal-tests-manuels.md` (addendum 16.1-R) | partiellement leve (reserve critique maintenue) |
| E16-B-001 | 16.2 | B | P0 | stub | derive subie | Livraison admin technique centree squelette sans completion metier effective | Fonctions BDD admin technique (export/purge/import) restent non operationnelles (stub) | Maintenance/reprise donnees non executable en condition reelle | `api/routers/v1/admin/db.py`, `frontend/src/admin/AdminDbPage.tsx`, `16-2-matrice-conformite-fonctionnelle.md` | ouvert |
| E16-B-002 | 16.2 | B | P1 | stub | derive subie | Report implicite de profondeur import legacy sans recadrage formel de story | Pipeline import legacy CSV (analyze/preview/validate/execute) non operationnel (retours stub) | Migration de donnees legacy impossible a realiser de bout en bout | `api/routers/v1/admin/import_legacy.py`, `frontend/src/admin/AdminImportLegacyPage.tsx`, `16-2-matrice-conformite-fonctionnelle.md` | ouvert |
| E16-B-003 | 16.2 | B | P1 | stub | derive subie | Priorisation lot UI/admin avant persistance de reglages operationnels | Parametres admin (alertes/session/email) majoritairement non persistes | Gouvernance operationnelle partielle (reglages non fiabilises) | `api/routers/v1/admin/settings.py`, `frontend/src/admin/AdminSettingsPage.tsx`, `16-2-registre-stubs-placeholders-consolide.md` | ouvert |
| E16-B-004 | 16.2 | B | P1 | stub | derive subie | Instrumentation supervision v1 laissee en mode minimal | Sante admin partielle: anomalies + test notifications en mode stub | Surveillance/incidents non couverts completement | `api/routers/v1/admin/health.py`, `frontend/src/admin/AdminHealthPage.tsx`, `16-2-registre-stubs-placeholders-consolide.md` | ouvert |
| E16-B-005 | 16.2 | B | P2 | stub | derive subie | Journalisation email non priorisee dans le perimetre livre | Logs email admin non implementes (liste vide) | Visibilite operationnelle reduite sur l'historique des envois | `api/routers/v1/admin/email_logs.py`, `frontend/src/admin/AdminEmailLogsPage.tsx` | ouvert |
| E16-B-006 | 16.2 | B | P2 | stub | derive subie | Reporting admin livre en version minimale non finalisee | Rapports caisse by-session/export-bulk restent minimaux (texte/IDs) | Valeur metier partielle pour reporting et exports | `api/routers/v1/admin/reports.py`, `frontend/src/admin/AdminReportsPage.tsx` | ouvert |
| E16-B-007 | 16.2 | B | P2 | derive assumee | derive assumee | Decision de scope Epic 15 concentree sur 3 blocs dashboard sans exposition complete des routes techniques | Discoverabilite superadmin phase 2 incomplete (routes techniques presentes hors menu superadmin) | Accessibilite fonctionnelle degradee pour admin technique | `frontend/src/admin/AdminDashboardPage.tsx`, `frontend/src/App.tsx`, `16-2-annexe-superadmin-phase2.md` | ouvert |
| E16-C-001 | 16.3 | C | P0 | bug | derive subie | Incoherence entre resultat attendu de securite et execution reelle de la campagne auth | Test critique `/v1/users/me` deconnecte invalide: observe 200 au lieu de 401 dans la campagne courante | Risque de faux negatif securite sur controle d'acces utilisateur courant | execution pytest 2026-03-01 (`test_get_me_unauthorized`: `assert 200 == 401`), `api/tests/routers/test_auth.py`, `api/tests/conftest.py` | ouvert |
| E16-C-002 | 16.3 | C | P0 | dette technique | derive subie | Fiabilisation suite auth differee alors que zone critique securite | Suite `api/tests/routers/test_auth.py` non fiabilisee (fixture `db_session` absente, erreurs setup massives) | Couverture auth/session non exploitable pour non-regression critique | execution pytest 2026-03-01 (`7 failed, 13 passed, 17 errors`), `api/tests/routers/test_auth.py`, `api/tests/conftest.py` | ouvert |
| E16-C-003 | 16.3 | C | P1 | dette technique | derive subie | Dette de stabilite outillage test front non absorbee avant consolidation QA | Runs Vitest multi-fichiers guard/session/auth se bloquent en fin de run | Robustesse CI/runtime front degradee, preuves de non-regression partielles | executions `npm run test:run ...` 2026-03-01 (process bloques), warnings React `act(...)` sur `CashRegisterGuard.test.tsx`, `16-1-journal-tests-manuels.md` | ouvert |
| E16-C-004 | 16.3 | C | P1 | manque de role | derive subie | Absence de verrouillage role-based complet sur routes super-admin phase 1 | Couverture role-based super-admin phase 1 insuffisante sur routes sensibles (`/admin/health`, `/admin/settings`, `/admin/sites`) | Risque de non-detection des derives de role sur surface sensible | `16-1-matrice-acces-role-route.md` (non conforme), `api/routers/v1/admin/health.py`, `frontend/src/App.tsx` | ouvert |
| E16-C-005 | 16.3 | C | P1 | dette technique | derive subie | Non-priorisation des tests d'integration routeur global sur surface critique | Couverture integration routes front critiques quasi absente (`App.test.tsx` placeholder) | Regressions de guard/routage global potentiellement invisibles | `frontend/src/App.test.tsx` (placeholder), `frontend/src/App.tsx`, `16-3-tests-critiques-manquants.md` | ouvert |
| E16-C-006 | 16.3 | C | P2 | dette technique | derive subie | Lacune de couverture ciblage settings admin dans la strategie de tests | Absence de tests API cibles pour `/v1/admin/settings` | Regressions silencieuses sur parametrage admin | recherche tests 2026-03-01: aucune occurrence `/v1/admin/settings` dans `api/tests/`, `api/routers/v1/admin/settings.py` | ouvert |
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

- `E16-A-003` reste **ouvert**: la preuve auth/session globale n'est pas fiabilisee au niveau necessaire pour lever le risque.
- `E16-A-004` passe en **partiellement leve**: certaines preuves frontend sont fiabilisees en isole, mais la consolidation guard/session en run groupe reste non fiable.

## Clarification statut 16.2

- Lot B ajoute au tableau unique sans remediation: constats, classification et preuves uniquement.
- `E16-B-001` a `E16-B-004` portent les ecarts fonctionnels prioritaires.
- Les placeholders assumes FR21/FR26 sont traces dans les livrables 16.2 mais ne sont pas ouverts en ecarts bloquants.

## Clarification statut 16.3

- Lot C consolide la robustesse/qualite sans remediation: focus couverture, tests critiques manquants et fragilites recurrentes.
- `E16-C-001` et `E16-C-002` constituent le noyau bloquant qualite test auth/session.
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

