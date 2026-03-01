# Story 16.2 - Registre stubs/placeholders consolide (par domaine)

Date audit: 2026-03-01  
Mode: audit strict (lecture/execution uniquement, zero remediation code)

## Legende

- `stub`: comportement partiel explicitement mocke/minimal
- `placeholder`: ecran/zone "a venir" assume
- `statut`: `present`, `manquant`, `non verifiable`
- `impact metier`: `P0/P1/P2`

## Registre consolide

| Domaine | Element | Type | Statut | Impact metier | Constat | Preuve exploitable |
|---|---|---|---|---|---|---|
| Auth | Forgot password (envoi email reset) | stub | present | P1 | endpoint retourne message generique; envoi email non implemente | `api/routers/v1/auth.py` (`/forgot-password`, TODO email Brevo) |
| Caisse | Onglet "Sous-categories" en saisie vente | placeholder | present | P2 | UI affiche "Sous-categories - a venir" | `frontend/src/caisse/CashRegisterSalePage.tsx` |
| Reception | placeholders fonctionnels | N/A | non verifiable | P2 | pas de stub explicite bloquant detecte dans les flux principaux admin/reception | `frontend/src/reception/ReceptionAccueilPage.tsx`, `api/routers/v1/reception.py` |
| Admin - Sante | anomalies | stub | present | P1 | endpoint retourne liste vide en v1 | `api/routers/v1/admin/health.py` (`/anomalies`) |
| Admin - Sante | test notifications | stub | present | P1 | endpoint renvoie message stub sans preuve d'envoi effectif | `api/routers/v1/admin/health.py` (`/test-notifications`) |
| Admin - Parametres | alertes/session/email config | stub | present | P1 | UI et API indiquent "stub v1"; persistance non implementee | `frontend/src/admin/AdminSettingsPage.tsx`, `api/routers/v1/admin/settings.py` |
| Admin - Parametres | activity_threshold | stub | present | P1 | valeur renvoyee en echo sans persistance backend | `api/routers/v1/admin/settings.py` (`PUT /settings`) |
| Admin - Email logs | journal envois | stub | present | P2 | endpoint renvoie liste vide (pas de table email_logs) | `api/routers/v1/admin/email_logs.py`, `frontend/src/admin/AdminEmailLogsPage.tsx` |
| Admin - Rapports caisse | export rapport par session | stub | present | P2 | telechargement texte placeholder, pas de generation PDF | `api/routers/v1/admin/reports.py` (`/by-session/{session_id}`) |
| Admin - Rapports caisse | export bulk | stub | present | P2 | retourne liste IDs, pas d'archive reelle | `api/routers/v1/admin/reports.py` (`/export-bulk`) |
| Admin technique | BDD export | stub | present | P0 | dump SQL minimal stub (pas d'export donnees) | `api/routers/v1/admin/db.py` (`/export`) |
| Admin technique | BDD purge transactions | stub | present | P0 | "aucune suppression effectuee" | `api/routers/v1/admin/db.py` (`/purge-transactions`) |
| Admin technique | BDD import | stub | present | P0 | validation uniquement, aucune restauration | `api/routers/v1/admin/db.py` (`/import`) |
| Admin technique | Import legacy CSV (analyze/preview/validate/execute) | stub | present | P1 | endpoints renvoient structures vides/minimales, imported_count=0 | `api/routers/v1/admin/import_legacy.py`, `frontend/src/admin/AdminImportLegacyPage.tsx` |
| Vie associative (FR21) | ecran vie associative | placeholder | present | P2 | page "Contenu vie associative a venir" conforme au scope v1 placeholders | `frontend/src/admin/AdminVieAssociativePage.tsx`, `_bmad-output/implementation-artifacts/8-7-ecrans-ou-placeholders-vie-associative-dans-recyclique.md` |
| Extension points (FR26) | LayoutConfigService / VisualProvider | stub | present | P2 | stubs explicitement livres en v1 (objectif assume) | `_bmad-output/implementation-artifacts/10-1-interfaces-et-stubs-layoutconfigservice-visualprovider-v1.md` |

## Synthese par domaine

- **Domaine avec impact P0**: Admin technique (BDD).
- **Domaines avec impact P1**: Auth reset email, Sante admin, Parametres, Import legacy.
- **Domaines placeholders assumes P2**: Vie associative FR21, extension points FR26, sous-categories caisse.

