# Story 16.2 - Matrice conformite fonctionnelle (attendu vs observe)

Date audit: 2026-03-01  
Mode: audit strict (sans remediation)

## Statuts de matrice

- `conforme`: aligne attendu/observe
- `ecart`: derive fonctionnelle detectee
- `stub`: implemente en mode partiel (non complet)
- `placeholder`: ecran volontairement "a venir"
- `hors-perimetre`: non requis par 16.2
- `non verifiable`: preuves insuffisantes

## Matrice

| Domaine | Fonctionnalite | Attendu (PRD/Epics) | Observe | Statut | Preuve |
|---|---|---|---|---|---|
| Admin 8.2 | Sites CRUD | operationnel | UI + API CRUD disponibles | conforme | `frontend/src/admin/AdminSitesPage.tsx`, `frontend/src/api/admin.ts` |
| Admin 8.2 | Rapports caisse par session | operationnel type 1.4.4 | telechargement texte minimal | stub | `api/routers/v1/admin/reports.py` |
| Admin 8.2 | Export bulk rapports | operationnel | retour IDs uniquement (pas export fichier) | stub | `api/routers/v1/admin/reports.py` |
| Admin 8.4 | Sante globale/db/scheduler/auth | operationnel | endpoints presents et utilises par UI | conforme | `api/routers/v1/admin/health.py`, `frontend/src/admin/AdminHealthPage.tsx` |
| Admin 8.4 | Sante anomalies | operationnel | retourne liste vide stub | stub | `api/routers/v1/admin/health.py` (`/anomalies`) |
| Admin 8.4 | Test notifications | operationnel | message stub sans execution verifiable | stub | `api/routers/v1/admin/health.py` (`/test-notifications`) |
| Admin 8.4 | Parametres seuils/session/email | operationnel | lecture/ecriture minimale; pas de persistance reelle | stub | `api/routers/v1/admin/settings.py`, `frontend/src/admin/AdminSettingsPage.tsx` |
| Admin 8.4 | Logs email | operationnel | liste vide stub (pas de table) | stub | `api/routers/v1/admin/email_logs.py`, `frontend/src/admin/AdminEmailLogsPage.tsx` |
| Admin 8.4 | Reception admin (stats/tickets/export) | operationnel | UI et endpoints relies, export bulk present | conforme | `frontend/src/admin/AdminReceptionPage.tsx`, `api/routers/v1/admin/reports_reception.py` |
| Admin 8.5 | BDD export/purge/import (super-admin) | operationnel | 3 actions en mode stub (aucune operation reelle) | ecart | `api/routers/v1/admin/db.py`, `frontend/src/admin/AdminDbPage.tsx` |
| Admin 8.5 | Import legacy CSV (analyze/preview/validate/execute) | operationnel | pipeline present mais 100% stub | ecart | `api/routers/v1/admin/import_legacy.py`, `frontend/src/admin/AdminImportLegacyPage.tsx` |
| Admin 8.6 | Acces compta via Paheko v1 | doc + acces reserve roles | endpoint acces/decision present, garde role en place | conforme | `api/routers/v1/admin/paheko_compta.py`, `frontend/src/admin/AdminDashboardPage.tsx` |
| Vie associative FR21 | acces ecran/placeholder | placeholders acceptables v1 | page placeholder explicite presente | conforme | `frontend/src/admin/AdminVieAssociativePage.tsx`, `_bmad-output/implementation-artifacts/8-7-ecrans-ou-placeholders-vie-associative-dans-recyclique.md` |
| Extension FR26 | stubs layout/visual | stubs requis v1 | story 10.1 livree en stub-first | conforme | `_bmad-output/implementation-artifacts/10-1-interfaces-et-stubs-layoutconfigservice-visualprovider-v1.md` |
| Caisse 15.x | sous-categories en vente | non explicitement qualifie dans AC 16.2 | zone "a venir" visible | non verifiable | `frontend/src/caisse/CashRegisterSalePage.tsx` |
| Auth 3.1 | forgot/reset parcours complet | reset ok + forgot email metier attendu | forgot reste message generique (sans envoi) | stub | `api/routers/v1/auth.py` (`/forgot-password`) |

## Conclusion Lot B

- Inventaire stubs/placeholders: complete sur les domaines admin, auth, caisse, vie associative, extension points.
- Ecarts fonctionnels majeurs Lot B: administration technique (BDD/import legacy) reste principalement en stub.

