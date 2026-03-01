# Story 17.6: Persistance parametres admin + couverture API `/v1/admin/settings`

Status: done

## Contexte et scope strict

- Epic cible : `epic-17` (remediation post-audit 16-0).
- Story source : `17.6` dans `_bmad-output/planning-artifacts/epics.md`.
- Dependance obligatoire : story `17.0` terminee (done).
- Mapping E16 autorise uniquement : `E16-B-003`, `E16-C-006`.
- Interdiction d'etendre le scope vers les autres ecarts `E16-*`.

## Story

As an administrateur,
I want que les parametres admin soient vraiment persistés et couverts par des tests API ciblés,
So that les regressions de configuration ne passent plus silencieusement.

## Acceptance Criteria

1. **Given** des modifications de parametres alertes/session/email
   **When** elles sont enregistrees puis relues
   **Then** les valeurs persistent effectivement et sont restituées correctement
   **And** une couverture de tests API cibles `/v1/admin/settings` valide les parcours nominaux et erreurs.

## Preuves obligatoires de fermeture (E16-B-003, E16-C-006)

- tests API `/v1/admin/settings` ajoutes et verts,
- preuve de persistance reelle (ecriture + relecture),
- verification front `AdminSettingsPage` sur donnees persistees.

## Tasks / Subtasks

- [x] Task 1 — Persistance backend (AC: 1, preuves)
  - [x] 1.1 Creer modele et table BDD pour parametres admin (ex. `admin_settings` : cle unique + payload JSON, ou table `AdminSetting` avec colonnes `alert_thresholds`, `session`, `email`, `activity_threshold`). Exporter le modele dans `api/models/__init__.py` pour que les tests (create_all) et migrations le prennent en compte.
  - [x] 1.2 Creer migration Alembic pour la nouvelle table. Nommage : `api/db/alembic/versions/2026_03_01_001_admin_settings.py`. `down_revision` = `"2026_02_28_12_4"` (derniere migration en place). Convention index : `idx_admin_settings_<colonne>`.
  - [x] 1.3 Creer service `api/services/admin_settings.py` : `get_settings(db)`, `put_settings(db, body)` — lecture/ecriture reelle en BDD.
  - [x] 1.4 Modifier `api/routers/v1/admin/settings.py` : injecter `db_session` via Depends, appeler le service au lieu de retourner des stubs. GET lit depuis BDD ; PUT enregistre puis retourne la reponse.
  - [x] 1.5 Gerer cas BDD vide : GET retourne valeurs par defaut coherentes (dicts vides ou schema minimal) sans erreur 500.

- [x] Task 2 — Tests API cibles `/v1/admin/settings` (AC: 1, preuves E16-C-006)
  - [x] 2.1 Creer `api/tests/routers/test_admin_settings.py` : reutiliser le pattern `role_client` / `auth_client` de `test_admin_phase1_super_admin_rbac.py` (override get_db = override_get_db, fixture role_client avec super_admin/admin, auth_client pour 401). Tests :
    - Parcours nominal : super_admin authentifie → PUT puis GET → valeurs identiques.
    - Parcours erreurs : 401 si non authentifie ; 403 si role non super_admin.
    - Assertions sur structure reponse (alert_thresholds, session, email, activity_threshold).
  - [x] 2.2 Archiver sortie pytest dans `_bmad-output/implementation-artifacts/17-6-preuve-pytest-admin-settings.txt`.
  - [x] 2.3 Verifier aucun stub dans les messages de reponse (pas de « stub v1 » dans detail/message).

- [x] Task 3 — Verification front et persistance reelle (AC: 1, preuves)
  - [x] 3.1 Verifier `AdminSettingsPage` : modification de `activity_threshold`, enregistrement, rechargement page ou appel GET → valeur persistee affichee.
  - [x] 3.2 Journal manuel ou capture : trace ecriture + relecture + affichage front coherent.
  - [x] 3.3 Mettre a jour `16-0-tableau-unique-ecarts.md` : statut `E16-B-003` et `E16-C-006` → ferme.

## Dev Notes

### Contexte code actuel

- **`api/routers/v1/admin/settings.py`** : GET/PUT stubs sans persistance. Retourne `alert_thresholds={}`, `session={}`, `email={}`, `activity_threshold=None`. PUT renvoie simplement le body recu.
- **`frontend/src/admin/AdminSettingsPage.tsx`** : appelle `getAdminSettings`/`putAdminSettings`, edite `activity_threshold`. Les onglets alertes/session/email affichent « à configurer (stub) ».
- **`frontend/src/api/adminHealthAudit.ts`** : `SettingsResponse`, `SettingsUpdateBody` deja definis ; pas de changement requis sauf si schema evolue.

### Contraintes architecture

- Base RecyClique : PostgreSQL (prod) / SQLite (tests conftest, Base.metadata.create_all).
- Routes deja protegees par `require_permissions("super_admin")` — conserver.
- Pas de changement RBAC ni de guards : scope limite a persistance + tests API.
- Service : pattern `db_admin` / `import_legacy` — le service recoit `db: Session`, le router injecte via `Depends(get_db)`, commit dans le service ou laisse le cycle de vie FastAPI gerer.

### Structure donnees a persister

Champs actuels (SettingsResponse/SettingsUpdateBody) :
- `alert_thresholds` : dict (JSON)
- `session` : dict (JSON)
- `email` : dict (JSON)
- `activity_threshold` : float | None

Option simple : table `admin_settings` avec une seule ligne (singleton) et colonnes JSON ou une colonne `payload` JSON contenant tout. Ou table `AdminSetting` avec colonnes typées selon besoins.

### Fichiers a toucher (liste indicative, a completer par le dev)

| Fichier | Action |
|---------|--------|
| `api/models/admin_setting.py` | Creer modele AdminSetting |
| `api/models/__init__.py` | Exporter AdminSetting |
| `api/db/alembic/versions/2026_03_01_001_admin_settings.py` | Nouvelle migration |
| `api/services/admin_settings.py` | Creer |
| `api/routers/v1/admin/settings.py` | Modifier (injecter db, appeler service) |
| `api/tests/routers/test_admin_settings.py` | Creer |
| `frontend/src/admin/AdminSettingsPage.tsx` | Verifier affichage donnees persistees (sans changer UX tabs stub si hors scope) |
| `_bmad-output/implementation-artifacts/16-0-tableau-unique-ecarts.md` | Mise a jour statut ecarts |

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 17.6]
- [Source: `_bmad-output/implementation-artifacts/16-0-tableau-unique-ecarts.md` — E16-B-003, E16-C-006]
- [Source: `api/routers/v1/admin/settings.py` — stubs actuels]
- [Source: `api/tests/routers/test_admin_phase1_super_admin_rbac.py` — pattern role_client/auth_client a reutiliser]
- [Source: `frontend/src/admin/AdminSettingsPage.tsx` — client actuel]

## Dependencies

- Story `17.0` (done) : harness auth/session fiabilise — prerequis pour tests API authentifies.

## Mapping E16

- **E16-B-003** : Parametres admin (alertes/session/email) non persistes → fermer via persistance reelle.
- **E16-C-006** : Absence de tests API cibles `/v1/admin/settings` → fermer via tests ajoutes.

## Dev Agent Record

### Agent Model Used

_(bmad-dev)_

### Debug Log References

### Completion Notes List

- Modele AdminSetting singleton (id=1), colonnes JSON + activity_threshold float.
- Migration 2026_03_01_001, down_revision 2026_02_28_12_4.
- Service get_settings/put_settings avec gestion BDD vide.
- 5 tests API : nominal PUT+GET, structure, 401, 403, empty DB defaults.
- 14/14 tests verts (test_admin_settings + test_admin_phase1_super_admin_rbac).
- E16-B-003, E16-C-006 fermes dans 16-0-tableau-unique-ecarts.md.

### File List

- api/models/admin_setting.py (cree)
- api/models/__init__.py (modifie)
- api/db/alembic/versions/2026_03_01_001_admin_settings.py (cree)
- api/services/admin_settings.py (cree)
- api/routers/v1/admin/settings.py (modifie)
- api/tests/routers/test_admin_settings.py (cree)
- frontend/src/admin/AdminSettingsPage.tsx (modifie)
- _bmad-output/implementation-artifacts/16-0-tableau-unique-ecarts.md (modifie)
- _bmad-output/implementation-artifacts/17-6-preuve-pytest-admin-settings.txt (cree)
- _bmad-output/implementation-artifacts/17-6-journal-persistance-admin-settings.md (cree)

## Senior Developer Review (AI)

**Date:** 2026-03-01  
**Résultat:** Approved

### Validation exécutée

- **AC1** : Persistance réelle vérifiée (service get_settings/put_settings, BDD singleton, cas vide). Couverture tests API : 5 tests ciblés + 9 phase1 sur `/v1/admin/settings`.
- **Tâches** : Toutes validées contre le code (modèle, migration, service, router, tests, preuve, journal, tableau 16-0).
- **Git vs File List** : Cohérent — fichiers story présents. Autres fichiers modifiés hors scope 17.6.
- **Sécurité** : `require_permissions("super_admin")` conservé, validation Pydantic sur PUT.

### Observations (LOW, non bloquantes)

1. **POST `/v1/admin/settings/email/test`** retourne `"stub v1"` — hors scope 17.6, à traiter dans une story email.
2. **Fixture `role_client`** dupliquée dans `test_admin_settings` et `test_admin_phase1_super_admin_rbac` — extraction possible dans `api/tests/routers/conftest.py`.
3. **AdminSettingsPage** : onglets alertes/session/email en « à configurer (stub) » — scope assumé, backend persiste ces champs.

### Change Log

| Date       | Acteur | Changement |
|------------|--------|------------|
| 2026-03-01 | bmad-qa | Code review adversarial : approved. AC implémentés, tests verts, preuves conformes. |
