# Story 16.2 - Annexe SuperAdmin phase 2 (attendu vs observe)

Date audit: 2026-03-01  
Mode: audit strict (sans correction)

## Regle de lecture

- `present`: contenu accessible et exploitable
- `manquant`: attendu non trouve dans le parcours cible
- `non verifiable`: present mais niveau d'aboutissement non prouvable sans preuves runtime complementaires

## A. Sous-menus / blocs SuperAdmin sur dashboard

Source attendu: Story 15.5 (`/admin`) - section "Administration Super-Admin" avec 3 blocs.

| Bloc attendu | Observe | Statut | Preuve |
|---|---|---|---|
| Sante Systeme | bloc present, lien vers `/admin/health` | present | `_bmad-output/planning-artifacts/epics.md` (Story 15.5), `frontend/src/admin/AdminDashboardPage.tsx` |
| Parametres Avances | bloc present, lien vers `/admin/settings` | present | `_bmad-output/planning-artifacts/epics.md` (Story 15.5), `frontend/src/admin/AdminDashboardPage.tsx` |
| Sites & Caisses | bloc present, lien vers `/admin/sites` | present | `_bmad-output/planning-artifacts/epics.md` (Story 15.5), `frontend/src/admin/AdminDashboardPage.tsx` |

## B. Contenus phase 2 rattaches au domaine SuperAdmin

| Sous-menu/contenu | Attendu | Observe | Statut | Classification | Preuve |
|---|---|---|---|---|---|
| `/admin/health` - vue systeme | supervision operationnelle complete | vue presente; anomalies + test notifications en stub | present (partiel) | stub | `frontend/src/admin/AdminHealthPage.tsx`, `api/routers/v1/admin/health.py` |
| `/admin/settings` - parametres avances | seuils/session/email configurables | onglets presents; majoritairement stubs, pas de persistance | present (partiel) | stub | `frontend/src/admin/AdminSettingsPage.tsx`, `api/routers/v1/admin/settings.py` |
| `/admin/sites` + fonctions caisse associees | pilotage sites & caisses | sites CRUD present; autres ecrans caisse admin hors bloc superadmin | present (partiel) | derive assumee | `frontend/src/admin/AdminSitesPage.tsx`, `frontend/src/App.tsx` |
| `/admin/db` (export/purge/import) | actions BDD operationnelles (Story 8.5) | ecran et endpoints presents mais 100% stub | present (partiel) | stub | `frontend/src/admin/AdminDbPage.tsx`, `api/routers/v1/admin/db.py` |
| `/admin/import/legacy` | pipeline import legacy operationnel (Story 8.5) | ecran et endpoints presents mais 100% stub | present (partiel) | stub | `frontend/src/admin/AdminImportLegacyPage.tsx`, `api/routers/v1/admin/import_legacy.py` |
| `/admin/quick-analysis` | comparaison periodes / analytics admin | ecran present; dependance stats optionnelle, niveau metier non prouvable | non verifiable | dette technique | `frontend/src/admin/AdminQuickAnalysisPage.tsx` |
| Visibilite menu superadmin des routes techniques (`/admin/db`, `/admin/import/legacy`, `/admin/quick-analysis`) | acces discoverable direct depuis zone superadmin | routes existantes mais non exposees dans les 3 blocs superadmin dashboard | manquant (dans menu) | dette technique | `frontend/src/admin/AdminDashboardPage.tsx`, `frontend/src/App.tsx` |

## C. Synthese SuperAdmin phase 2

- **Present**: 3/3 blocs dashboard imposes par Story 15.5.
- **Present partiel**: contenus de supervision/parametrage/admin technique majoritairement en mode stub.
- **Manquant**: discoverabilite menu superadmin de certaines routes techniques.
- **Non verifiable**: valeur metier reelle de l'analyse rapide sans preuves runtime complementaires.

