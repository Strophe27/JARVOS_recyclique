# Story 17.3: Completion operationnelle admin BDD (export / purge / import)

Status: done

## Story

As a admin technique,
I want des actions BDD admin reellement operationnelles (sans stub),
so that la maintenance et la reprise de donnees puissent etre executees en conditions reelles.

## Contexte et scope strict

- Epic cible: `epic-17` (remediation post-audit 16-0).
- Story source: `17.3` dans `_bmad-output/planning-artifacts/epics.md`.
- Dependance obligatoire: story `17.0` terminee et validee.
- Mapping E16 autorise uniquement: `E16-B-001`.
- Interdiction d'etendre le scope vers les autres ecarts `E16-*` (ex. `E16-B-002` import legacy reste hors scope).

## Acceptance Criteria

1. **Given** les actions admin BDD actuellement en mode stub  
   **When** j'execute export, purge transactionnelle et import  
   **Then** chaque action produit un effet metier reel et verifiable  
   **And** les erreurs sont gerees proprement avec reponses API explicites.

2. **Given** POST `/v1/admin/db/export`  
   **When** un admin technique appele l'endpoint  
   **Then** un dump SQL reel de la base RecyClique est produit et telecharge  
   **And** le contenu contient des donnees reelles (schema + donnees selon perimetre defini), pas uniquement un commentaire stub.

3. **Given** POST `/v1/admin/db/purge-transactions`  
   **When** un admin technique appele l'endpoint  
   **Then** les donnees transactionnelles cibles (ex. payment_transactions, sale_items, sales, cash_sessions — perimetre a definir dans le code) sont effectivement supprimees  
   **And** `deleted_count` reflete le nombre reel d'enregistrements supprimes  
   **And** l'audit enregistre l'action et le nombre supprime.

4. **Given** POST `/v1/admin/db/import` avec un fichier SQL valide  
   **When** un admin technique envoie un fichier de sauvegarde  
   **Then** le contenu SQL est execute contre la base  
   **And** la reponse indique le succes ou les erreurs rencontrees  
   **And** en cas d'echec (syntaxe, contraintes), une reponse API explicite (400/422/500) est retournee avec detail exploitable.

5. **Given** un cas d'erreur (fichier invalide, BDD indisponible, etc.)  
   **When** une action echoue  
   **Then** la reponse API contient un code HTTP adapte et un `detail` ou `message` explicite  
   **And** aucune trace stub (« stub v1 », « aucune donnee… ») ne subsiste dans les messages de succes ou d'erreur.

## Tasks / Subtasks

- [x] Task 1 — Export BDD operationnel (AC: 1, 2)
  - [x] Remplacer le stub par une generation de dump SQL reel (pg_dump subprocess ou SQLAlchemy introspection selon stack).
  - [x] Definir le perimetre (schema + donnees reference + donnees transactionnelles ou schema seul selon decision).
  - [x] Conserver le format de reponse actuel (Response, attachment filename, media_type).
  - [x] Gerer les erreurs (connexion BDD, permissions) avec reponses explicites.

- [x] Task 2 — Purge transactions operationnelle (AC: 1, 3)
  - [x] Appliquer le perimetre « transactions » (voir Dev Notes) : payment_transactions, sale_items, sales, cash_sessions — ordre FK enfants avant parents.
  - [x] Implementer la suppression reelle avec respect des contraintes FK.
  - [x] Retourner `deleted_count` reel (agrege par table ou total selon choix).
  - [x] Mettre a jour l'audit avec le nombre effectif supprime.

- [x] Task 3 — Import BDD operationnel (AC: 1, 4, 5)
  - [x] Valider le format du fichier (SQL, extension).
  - [x] Executer les instructions SQL (split safe, transaction unique ou par statement selon robustesse).
  - [x] Retourner `ok`, `message`, `detail` en cas d'erreur.
  - [x] Gerer les erreurs (fichier vide, syntaxe invalide, contraintes violees) avec codes HTTP et detail explicite.

- [x] Task 4 — Adaptation frontend (AC: 1, 5)
  - [x] Supprimer toute reference « stub » dans `AdminDbPage.tsx` : textes (l.87, 96, 112, 132, 146), fallbacks `res.message` (l.48, 65), descriptions des cartes.
  - [x] Adapter labels/descriptions pour reflecter le comportement reel (export dump, purge effective, import restauration).
  - [x] Verifier que les appels API affichent des resultats coherents (messages success/erreur sans « stub »).

- [x] Task 5 — Tests API et preuves E16-B-001 (AC: 1, 2, 3, 4, 5)
  - [x] Ajouter ou etendre les tests dans `api/tests/routers/test_admin_db_import_legacy.py` :
    - Export : remplacer assertion actuelle ; exiger contenu significatif (schema ou INSERTs), negater presence de « stub » dans le corps.
    - Purge : donnees creees via import API, appel purge, verification tables videes.
    - Import : fichier SQL valide pour le moteur de test (SQLite : CREATE TABLE/INSERT ; PostgreSQL : idem). Assertion `ok` true et verification effet via export.
  - [x] Archiver sortie pytest dans `_bmad-output/implementation-artifacts/17-3-preuve-pytest-admin-db-operations.txt`.
  - [x] Mettre a jour `_bmad-output/implementation-artifacts/16-0-tableau-unique-ecarts.md` : statut `E16-B-001` → ferme.
  - [x] Produire un artefact de verification (journal manuel ou sortie commande) lie a `E16-B-001`.

- [x] Review Follow-ups (AI) — 2026-03-01
  - [x] [AI-Review][MEDIUM] Ajouter test import SQL invalide → 422 avec detail exploitable (AC4/5) [api/tests/routers/test_admin_db_import_legacy.py]
  - [x] [AI-Review][MEDIUM] Renforcer _split_sql_statements : eviter split sur `;\n` dans chaînes littérales (risque exécution partielle) [api/services/db_admin.py]
  - [x] [AI-Review][LOW] Docstring _export_sqlite : corriger (schema seul en v1, pas INSERT) [api/services/db_admin.py:34]
  - [ ] [AI-Review][LOW] Tests 400 : fichier vide, mauvaise extension .sql/.dump [api/tests/routers/test_admin_db_import_legacy.py]

## Preuves obligatoires de fermeture

- Test(s) API/integre validant effet reel des trois actions (export, purge, import).
- Preuve fonctionnelle front reliee a des reponses non-stub (capture manuelle ou test co-loce si pertinent).
- Artefact de verification (journal manuel ou sortie commande) lie a `E16-B-001`.
- Mise a jour `16-0-tableau-unique-ecarts.md` : `E16-B-001` ferme.

## File List (fichiers a modifier)

### Backend
- `api/routers/v1/admin/db.py` — implementation export, purge, import reels (remplacement stubs)
- `api/services/db_admin.py` — logique export, purge, import
- `api/tests/routers/test_admin_db_import_legacy.py` — tests avec assertions sur effet reel

### Frontend
- `frontend/src/admin/AdminDbPage.tsx` — suppression references stub, messages coherents avec comportement reel
- `frontend/src/admin/AdminDbPage.test.tsx` — s'assurer que les tests restent verts apres modifs (mocks API inchanges)

### Optionnel (si service dedie)
- `api/services/db_admin.py` (ou equivalent) — logique export/purge/import si extraction hors routeur souhaitee

### Artefacts
- `_bmad-output/implementation-artifacts/17-3-preuve-pytest-admin-db-operations.txt` — sortie pytest ciblee
- `_bmad-output/implementation-artifacts/16-0-tableau-unique-ecarts.md` — fermeture E16-B-001

## Dev Notes

### Contraintes architecture et qualite

- Base RecyClique : PostgreSQL (voir `api/db/`, `api/config/settings.py`). En dev local, `database_url` peut pointer vers SQLite.
- Conserver les permissions existantes : `require_permissions("super_admin", "admin")`.
- Conserver l'audit `write_audit_event` pour purge et import.
- Pas d'introduction de libs lourdes : utiliser pg_dump (subprocess) ou SQLAlchemy metadata/introspection selon preference.

### Tests pytest : SQLite vs PostgreSQL

- La campagne pytest utilise SQLite in-memory (`api/tests/conftest.py` : `TEST_ENGINE`, `override_get_db`). pg_dump n'existe pas sous SQLite.
- Export : en SQLite, utiliser schema dump (SQLAlchemy `metadata.create_all(engine)` inverse, ou requête `sqlite_schema`) ; en PostgreSQL, pg_dump ou SQLAlchemy.
- Purge / import : SQLAlchemy/SQL générique fonctionnent pour les deux. Fixtures purge : créer CashSession, Sale, SaleItem, PaymentTransaction ; s'inspirer de `api/tests/routers/test_cash_sessions.py` et `test_sales` pour Site, CashRegister, PresetButton.

### Perimetre purge « transactions »

Ordre FK (enfants avant parents) — aligne sur `api/models/` :
- `payment_transactions` (FK sales) → `sale_items` (FK sales) → `sales` (FK cash_sessions) → `cash_sessions`
- Hors scope purge transactions : `ticket_depot`, `ligne_depot` (reception), `users`, `sites`, `categories`, groupes, permissions, mapping Paheko.

### Gestion erreurs attendue

- Export : 500 si connexion/erreur BDD, detail dans body ou headers.
- Purge : 500 si erreur BDD ; 200 avec `deleted_count` meme si 0 (aucune donnee).
- Import : 400 si fichier absent ou invalide ; 422/500 si erreur d'execution SQL, `detail` avec message d'erreur exploitable.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 17, Story 17.3]
- [Source: `_bmad-output/implementation-artifacts/16-0-tableau-unique-ecarts.md` — E16-B-001]
- [Source: `api/routers/v1/admin/db.py` — code actuel stub]
- [Source: `frontend/src/admin/AdminDbPage.tsx` — page admin BDD]
- [Source: `frontend/src/api/adminDb.ts` — client API admin BDD]
- [Source: `api/tests/routers/test_admin_db_import_legacy.py` — tests existants]
- [Source: `references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md`]
- [Source: `_bmad-output/planning-artifacts/architecture.md`]

## Gate « Done » obligatoire

- Build OK (front + api).
- Tests API cibles verts (export, purge, import avec effet reel).
- Tests UI co-loces AdminDbPage si modifies : verts.
- Aucune reference « stub » dans les messages utilisateur.
- Preuves E16-B-001 archivees et tableau ecarts mis a jour.
- Artefact de verification (journal ou sortie) lie a E16-B-001.

## Senior Developer Review (AI)

**Date:** 2026-03-01 | **Resultat:** approved (re-review post-corrections)

**Synthèse :** AC implémentés, tests 12/12 verts, front sans stub, E16-B-001 fermé. Corrections MEDIUM validées (test SQL invalide 422, _split_sql_statements robuste). Story approuvée.

**Findings MEDIUM :**
1. Absence de test pour import avec SQL invalide → vérifier 422 et `detail` exploitable (AC4/5).
2. `_split_sql_statements` (db_admin.py) : split sur `;\s*\n` peut casser du SQL avec point-virgule + newline dans chaînes littérales → exécution partielle.

**Findings LOW :**
3. Docstring `_export_sqlite` promet INSERT mais n’implémente que schema en v1.
4. Pas de tests 400 (fichier vide, mauvaise extension).

**Action items :** voir section Review Follow-ups (AI) dans Tasks.

## Change Log

- 2026-03-01: Creation story 17.3, passage ready-for-dev. Contexte Epic 17, mapping E16-B-001, dependance 17.0.
- 2026-03-01: Validation create-story checklist. Corrections : Dev Notes SQLite/PostgreSQL tests, perimetre purge FK explicite (hors ticket_depot/ligne_depot), Task 4 emplacements stub AdminDbPage, Task 5 assertions et fixtures purge, File List AdminDbPage.test.tsx.
- 2026-03-01: Implementation complete. Export (SQLite schema + pg_dump PostgreSQL), purge FK (payment_transactions→sale_items→sales→cash_sessions), import (split SQL, execution). Frontend sans stub. Tests : export sans stub, purge avec donnees via import, import avec verification export. E16-B-001 ferme.
- 2026-03-01: Revision. Corrige: import `func` inutile retiré (test_admin_db_import_legacy). Verifie: completude tasks, coherence noms/chemins, preuves E16-B-001, build/tests. Aucune escalation.
- 2026-03-01: Code review adversarial (BMAD workflow). Resultat: changes-requested. MEDIUM: test import SQL invalide manquant, _split_sql_statements fragile. LOW: docstring, tests 400. Story → in-progress, action items ajoutes.
- 2026-03-01: Corrections MEDIUM/LOW. Test import SQL invalide → 422 avec detail exploitable ajoute. _split_sql_statements renforce (ne split pas dans chaines ' ou "). Docstring _export_sqlite corrigee. Test regression ;\\n dans chaine litterale ajoute. Story → review.
- 2026-03-01: Re-review adversarial. Corrections MEDIUM validees. review.json → approved. Story → done. sprint-status 17-3 → done.
