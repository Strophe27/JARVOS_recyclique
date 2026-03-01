# Story 17.11: Renforcement tests admin technique hors « happy path stub »

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a equipe QA,
I want des tests admin technique qui valident des effets metier reels et cas d'erreur,
So that la robustesse ne soit plus surestimee par des tests purement structurels.

## Acceptance Criteria

1. **Given** les modules admin BDD/import legacy et leurs parcours critiques  
   **When** les tests sont elargis au-dela du contrat de stub  
   **Then** les assertions couvrent des effets metier reels et des chemins d'erreur significatifs  
   **And** les tests servent de garde-fous de non-regression sur les zones techniques critiques.

## Mapping E16

**E16-C-007** : Tests limites au contrat de stub sans verification d'effet metier reel. Couverture admin technique surtout « happy path stub » (assertions structurelles). Faux sentiment de robustesse sur BDD/import legacy.

## Dependances

- Story `17.3` (done) — completion operationnelle admin BDD (export/purge/import).
- Story `17.5` (done) — completion pipeline import legacy CSV.

## Tasks / Subtasks

- [x] Task 1 — Identifier et couvrir les chemins d'erreur significatifs (AC: #1)
  - [x] 1.1 Ajouter tests 401 (utiliser `auth_client` de conftest, sans headers) sur : POST `/v1/admin/db/export`, POST `/v1/admin/db/purge-transactions`, POST `/v1/admin/db/import` ; GET `/v1/admin/import/legacy/llm-models` ; POST `/v1/admin/import/legacy/analyze`, `preview`, `validate`, `execute`.
  - [x] 1.2 Ajouter tests 403 (fixture type `role_client` avec `get_user_permission_codes_from_user` retournant `{}` ou `{"reception.access"}`) pour user operator sur ces memes routes. S'inspirer de `test_admin_settings.py` (test_settings_admin_forbidden_403) et `test_admin_phase1_super_admin_rbac.py`.
  - [x] 1.3 Ajouter tests 400/422 db : POST `/v1/admin/db/import` sans fichier (FastAPI → 422), fichier vide (→ 400), extension invalide `.txt` (→ 400 ; db.py verifie extension pas MIME). import_legacy : extension non .csv → 400 ou 422 (deja partiellement couvert).
  - [x] 1.4 Documenter la couverture minimale des cas d'erreur critiques dans la story ou un artefact dedie.

- [x] Task 2 — Renforcer les assertions effet metier reel (AC: #1)
  - [x] 2.1 Verifier que les tests existants `test_db_export_returns_200_and_sql_content`, `test_db_purge_transactions_deletes_data`, `test_db_import_executes_sql`, `test_legacy_execute_valid_csv` conservent des assertions sur les effets reels (pas de regression vers stub).
  - [x] 2.2 Ajouter si manquant : assertion sur le contenu du dump export (presence de tables attendues, schema coherent) apres operations reelles.
  - [x] 2.3 Ajouter si manquant : verification que `purge-transactions` ne touche pas aux tables systeme/metier hors scope (categories, sites, etc.) ou documenter le comportement attendu.

- [x] Task 3 — Preuves et fermeture E16-C-007 (AC: #1)
  - [x] 3.1 Archiver preuve pytest dans `_bmad-output/implementation-artifacts/17-11-preuve-pytest-admin-technique.txt`.
  - [x] 3.2 Creer artefact `_bmad-output/implementation-artifacts/17-11-couverture-cas-erreur.md` listant les tests ajoutes et leur lien avec E16-C-007.
  - [x] 3.3 Mettre a jour `16-0-tableau-unique-ecarts.md` : E16-C-007 statut → ferme, avec reference aux preuves.

## Dev Notes

### Contexte E16-C-007

L'ecart E16-C-007 pointe vers : `api/tests/routers/test_admin_db_import_legacy.py`, `api/routers/v1/admin/db.py`, `api/routers/v1/admin/import_legacy.py`. Les tests actuels couvrent deja des effets reels (purge vide tables, import cree donnees, execute ajoute categories) mais des chemins d'erreur (401, 403, fichiers invalides) restent insuffisamment couverts.

**Eviter reinvention** : reutiliser les patterns 401/403 de `test_admin_settings.py` et `test_admin_phase1_super_admin_rbac.py`. Parametrer les endpoints avec `@pytest.mark.parametrize` pour limiter la duplication.

### Fichiers cibles

| Fichier | Action |
|---------|--------|
| `api/tests/routers/test_admin_db_import_legacy.py` | Ajouter tests 401/403, renforcer assertions effet metier |
| `_bmad-output/implementation-artifacts/17-11-preuve-pytest-admin-technique.txt` | Sortie `pytest api/tests/routers/test_admin_db_import_legacy.py -v` |
| `_bmad-output/implementation-artifacts/17-11-couverture-cas-erreur.md` | Documenter mapping tests ↔ E16-C-007 |
| `_bmad-output/implementation-artifacts/16-0-tableau-unique-ecarts.md` | E16-C-007 → ferme |

### Fixtures existantes

- `client`, `auth_headers` : conftest (user avec admin). Utilises pour tests happy-path.
- **401** : `auth_client` (conftest) — ne modifie pas `get_current_user`, donc requetes sans Bearer/session → 401.
- **403** : creer une fixture `role_client` ou parametrer `get_user_permission_codes_from_user` pour retourner `{}` ou `{"reception.access"}` (user operator sans admin). Patterns : `api/tests/routers/test_admin_settings.py`, `api/tests/routers/test_admin_phase1_super_admin_rbac.py`.

### Chemins d'erreur db.py (sources, lignes 79-105)

- filename absent : 400
- Extension != .sql/.dump : 400 (pas de controle MIME)
- Fichier vide : 400
- SQL invalide : 422 (deja teste)

### Chemins d'erreur import_legacy.py (sources, lignes 31-80)

- Fichier absent : FastAPI File(...) → 422 avant handler
- Extension != .csv : 400 (analyze/preview/validate) ou 422 (execute)

### References

- [Source: _bmad-output/implementation-artifacts/16-0-tableau-unique-ecarts.md — E16-C-007]
- [Source: api/routers/v1/admin/db.py — lignes 23-119]
- [Source: api/routers/v1/admin/import_legacy.py — lignes 20-81]
- [Source: api/tests/routers/test_admin_db_import_legacy.py — structure actuelle, 22 tests]
- [Source: api/tests/conftest.py — fixtures client, auth_headers, auth_client]
- [Source: api/tests/routers/test_admin_settings.py — pattern 401/403]
- [Source: api/tests/routers/test_admin_phase1_super_admin_rbac.py — pattern role_client, parametrize]

## Preuves obligatoires de fermeture

1. **Nouveaux tests backend admin technique verts** : sortie pytest complete dans `17-11-preuve-pytest-admin-technique.txt`.
2. **Couverture minimale documentee des cas d'erreur critiques** : artefact `17-11-couverture-cas-erreur.md` listant les tests ajoutes (401, 403, 400/422) et leur justification.
3. **Lien explicite entre tests ajoutes et fermeture E16-C-007** : mise a jour du tableau unique des ecarts avec preuve et trace.

## Critères Done

- [x] Tous les tests dans `test_admin_db_import_legacy.py` passent.
- [x] Au moins 2 tests 401 et 2 tests 403 ajoutes sur les routes admin technique ciblees.
- [x] Couverture cas d'erreur documentee dans `17-11-couverture-cas-erreur.md`.
- [x] E16-C-007 marque ferme dans `16-0-tableau-unique-ecarts.md`.
- [x] Build backend OK.

## Dev Agent Record

### Agent Model Used

bmad-dev

### Debug Log References

### Completion Notes List

- Task 1 : 8 tests 401 (parametrizes), 8 tests 403 (parametrizes), 4 tests 400/422 db, 4 tests extension invalide import_legacy.
- Task 2 : assertion dump export (categories/sites), documentation purge (4 tables ciblees).
- Task 3 : preuve 41 tests verts, couverture documentee, E16-C-007 ferme.
- Fix fixture : client conftest re-seed avant yield pour eviter "Test user not found" apres auth_client reset.
- [Code Review] Fix nom test : test_legacy_analyze_no_file_returns_400 → returns_422 (coherence assertion).

### Senior Developer Review (AI)

- **Date** : 2026-03-01
- **Resultat** : approved
- **Findings** : 1 LOW corrige (test_legacy_analyze_no_file_returns_400 → returns_422, nom coherent avec assertion 422). AC et tasks valides. 41 tests verts.

### File List

- api/tests/routers/test_admin_db_import_legacy.py (modifie : 401/403/400/422, assertions effet metier, renommage test_legacy_analyze_no_file)
- api/tests/conftest.py (modifie : _seed_fake_user_for_auth_flows dans client fixture)
- _bmad-output/implementation-artifacts/17-11-preuve-pytest-admin-technique.txt (cree)
- _bmad-output/implementation-artifacts/17-11-couverture-cas-erreur.md (cree)
- _bmad-output/implementation-artifacts/16-0-tableau-unique-ecarts.md (modifie : E16-C-007 ferme)
