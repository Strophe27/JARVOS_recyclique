# Story 2.2b : Migrer le backend vers `recyclique/` (racine mono-repo)

**Clé fichier (obligatoire) :** `2-2b-migrer-le-backend-vers-recyclique-racine-mono-repo`  
**Epic :** epic-2 — **Piste B**  
**Statut :** done

<!-- Note : validation optionnelle — exécuter validate-create-story avant dev-story. -->

## Story

En tant qu’**équipe plateforme**,  
je veux que le **package API vivant** (FastAPI / `recyclic_api`) réside sous le dossier canonique **`recyclique/`** à la racine du mono-repo, avec **CI**, **Docker Compose** et **gates Story Runner** mis à jour,  
afin d’**aligner** le dépôt sur `project-structure-boundaries.md` **avant** les stories lourdes en chemins (**2.6** contrats, **2.7** signaux) et d’**éviter** deux racines backend actives sans décision explicite.

## Acceptance Criteria

### AC 1 — Emplacement unique pour le travail neuf

**Étant donné** que l’architecture cible nomme `recyclique/` à la racine du dépôt ([Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — arborescence `recyclique/`, limites backend])  
**Quand** cette story est complétée  
**Alors** le code applicatif, les tests et la configuration d’outillage **principale** pour Epic 2 pointent vers `recyclique/` (structure alignée sur ce document ; **équivalent documenté** acceptable si le `pyproject.toml` est à la racine de `recyclique/` plutôt que sous `recyclique/api/` — **une** vérité écrite dans le README de clôture)  
**Et** `recyclique-1.4.4/api/` **n’est plus** la racine de développement actif pour le nouveau travail (bannière README, archive, lien explicite, ou contenu réduit à renvoi — **une** vérité pour les chemins neufs)

### AC 2 — Docker / dev local

**Étant donné** que compose et variables d’environnement référencent des chemins  
**Quand** la migration est faite  
**Alors** la procédure de démarrage local (et/ou Docker) est **documentée** pour la nouvelle racine  
**Et** les secrets restent **hors dépôt** (`.env.example` à jour si des noms de variables ou chemins changent)

### AC 3 — Gates et Epic Runner

**Étant donné** que les briefs Story Runner utilisent des chemins absolus  
**Quand** cette story est acceptée  
**Alors** les commandes de gate par défaut pour le backend Epic 2 ciblent le **nouveau** répertoire de travail (`Set-Location` vers le dossier contenant `pyproject.toml` et `tests/`) sous `recyclique/`  
**Et** aucune incohérence volontaire entre `epics.md`, ce fichier et `sprint-status.yaml` (clé story inchangée)

### AC 4 — Traçabilité décisionnelle

**Étant donné** la décision transitoire 2.1 et le Correct Course 2026-04-03  
**Quand** la migration est **done**  
**Alors** `references/artefacts/2026-04-03_01_decision-backend-story-2-1-recyclique-1.4.4-vs-canonical.md` est **révisé** (emplacement final, date, lien vers cette story)  
**Et** la traçabilité avec `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-03.md` est préservée

## Tasks / Subtasks

- [x] **Cartographier** les chemins actuels (AC : #1, #2)  
  - [x] Code + tests : anciennement `recyclique-1.4.4/api/` → **`recyclique/api/`**  
  - [x] CI : workflows racine `.github/workflows/` (`deploy.yaml`, `alembic-check.yml`) ; suppression des doublons sous `recyclique-1.4.4/.github/workflows/`  
  - [x] Compose : `recyclique-1.4.4/docker-compose*.yml` → `context` / volumes `../recyclique/api`  
  - [x] Scripts utilitaires (`create_tables.py`, `reset-production-data.py`, `validate-qa-changes.sh`, `tests/test_rollback.sh`) pointent vers `recyclique/api`  
  - [x] OpenAPI : aucun générateur sous `contracts/` ne codait un chemin vers l’ancien dossier (pas de changement requis)

- [x] **Migrer le package** vers `recyclique/` (AC : #1)  
  - [x] Déplacement physique `recyclique-1.4.4/api` → `recyclique/api` (Move-Item)  
  - [x] Note d’implémentation dans `project-structure-boundaries.md` + `recyclique/README.md` (écart `pyproject` sous `api/`)

- [x] **Mettre à jour l’outillage** (AC : #2, #3)  
  - [x] CI racine, `recyclique/README.md`, `recyclique-1.4.4/README.md`, brief `_runner-brief-story-2-2.md`, `epics.md`, `guide-pilotage-v2.md`, story **2.2** (chemins gate)

- [x] **Clôturer la double vérité** (AC : #1)  
  - [x] Bannière + chemins doc dans `recyclique-1.4.4/README.md` ; plus de dossier `recyclique-1.4.4/api/`

- [x] **Réviser l’artefact décision 2.1** (AC : #4)  
  - [x] `references/artefacts/2026-04-03_01_decision-backend-story-2-1-recyclique-1.4.4-vs-canonical.md` + entrée `references/artefacts/index.md`

- [x] **Vérifier pytest** depuis la nouvelle racine (AC : #3) — smoke **DS**  
  - [x] `python -m pytest tests/test_infrastructure.py` depuis `recyclique/api` (PASS) ; gate complet laissé au **Task shell** parent  
  - [x] Rappel : pas de pytest parallèles sur la même SQLite

## Dev Notes

### Pack contexte Epic 2 — story 2.2b (Story Runner — **ne pas diluer**)

**Objectif** : une seule racine backend active — déplacer le package API de `recyclique-1.4.4/api/` vers **`recyclique/api/`** (ou structure documentée équivalente sous `recyclique/`), mettre à jour Docker/compose/CI/README, artefact décision 2.1, briefs futurs pointent vers le nouveau chemin.

**Pas** de vérité contextuelle dans Peintre_nano. Secrets hors dépôt.

**Références** : `sprint-change-proposal-2026-04-03.md` ; `2026-04-03_01_decision-backend-story-2-1-recyclique-1.4.4-vs-canonical.md` (à réviser en fin de story) ; `contracts/openapi/recyclique-api.yaml` (chemins générateurs si touchés).

**Phrase anti-dilution** : conserver cette annexe pour les workers CS/DS telle quelle dans les briefs ; le fichier story ci-dessus en est l’expansion opérationnelle.

### Gate pytest (référence Story Runner — après migration DS)

Exécuter depuis le répertoire package **vivant** (cible : `recyclique/api` si le `pyproject.toml` y est ; sinon le dossier réellement utilisé après migration, **documenté** dans le README) :

```powershell
Set-Location 'D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api'
$env:TESTING = 'true'
python -m pytest tests/test_infrastructure.py tests/test_auth_login_endpoint.py tests/test_auth_logging.py tests/test_auth_inactive_user_middleware.py tests/test_auth_login_username_password.py tests/test_admin_user_status_endpoint.py tests/api/test_admin_user_management.py tests/test_refresh_token_service.py tests/test_refresh_token_endpoint.py tests/test_context_envelope.py -v --tb=short
```

*(Ajuster `Set-Location` si la racine du package diffère — ex. `recyclique/` seul avec `tests/` au même niveau que `pyproject.toml`.)*

**Note gate** : après migration DS, le package vivant doit être sous `recyclique/` ; même périmètre pytest qu’en fin de story **2.2**, avec extension **context envelope**. **Ne pas** lancer plusieurs pytest en parallèle sur le même fichier SQLite.

### Intelligence story 2.2 (continuité implémentation)

- **Livré story 2.2** (chemins historiques brownfield puis migrés) : `ContextEnvelope`, `GET /v1/users/me/context`, `POST /v1/users/me/context/refresh`, schémas, `context_envelope_service`, `tests/test_context_envelope.py`, OpenAPI — code désormais sous **`recyclique/api/`**.  
- **Auth** : conserver le modèle Story 2.1 (`get_current_user`, Bearer + cookies) — toute migration de chemins ne doit pas casser ces invariants.  
- **Fichiers de référence (avant migration)** : voir « File List » dans `2-2-implementer-le-contextenvelope-backend-minimal-et-le-recalcul-explicite-de-contexte.md` — **à réhéberger** sous `recyclique/` avec les mêmes responsabilités.

### Contraintes architecture

- Backend nominal = **`recyclique/`** ; OpenAPI reviewable = **`contracts/openapi/recyclique-api.yaml`** ; pas d’import runtime vers `references/`.  
- **Peintre_nano** reste hors périmètre sauf si un chemin de codegen côté frontend référence l’ancien dossier backend — aligner si nécessaire.

### État dépôt au passage create-story (2026-04-03)

- Le dossier **`recyclique/`** à la racine du mono-repo **n’existait pas** encore sur l’arborescence analysée ; la story **crée le contexte dev** pour que **DS** réalise le déplacement effectif depuis `recyclique-1.4.4/api/`.

### Project Structure Notes

- **Cible documentaire** : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — section « Complete Project Directory Structure » (`recyclique/pyproject.toml`, `recyclique/src/recyclic_api/`, `recyclique/tests/`).  
- **Écart transitoire résolu par cette story** : code vivant auparavant sous `recyclique-1.4.4/api/` (Correct Course + décision 2.1).

### References

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 2, encadré exécution transitoire, Story 2.2b]
- [Source : `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-03.md`]
- [Source : `references/artefacts/2026-04-03_01_decision-backend-story-2-1-recyclique-1.4.4-vs-canonical.md`]
- [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`]
- [Source : `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — cartographie tests / chemins]
- [Source : `contracts/openapi/recyclique-api.yaml`]
- [Source : `_bmad-output/implementation-artifacts/2-2-implementer-le-contextenvelope-backend-minimal-et-le-recalcul-explicite-de-contexte.md` — intelligence story précédente]

## Dev Agent Record

### Agent Model Used

Task BMAD / phase DS (implémentation story 2.2b), 2026-04-03.

### Debug Log References

### Completion Notes List

- Déplacement `recyclique-1.4.4/api` → `recyclique/api` ; compose et volumes mis à jour ; CI GitHub Actions à la racine du mono-repo ; artefact décision 2.1 révisé ; smoke pytest `test_infrastructure` OK depuis `recyclique/api`.

### File List

- `recyclique/api/**` (arborescence déplacée depuis `recyclique-1.4.4/api/`)
- `recyclique/README.md` (nouveau)
- `recyclique-1.4.4/docker-compose.yml`
- `recyclique-1.4.4/docker-compose.staging.yml`
- `recyclique-1.4.4/docker-compose.prod.yml`
- `recyclique-1.4.4/README.md`
- `recyclique-1.4.4/create_tables.py`
- `recyclique-1.4.4/scripts/reset-production-data.py`
- `recyclique-1.4.4/scripts/validate-qa-changes.sh`
- `recyclique-1.4.4/tests/test_rollback.sh`
- `.github/workflows/alembic-check.yml` (nouveau)
- `.github/workflows/deploy.yaml` (nouveau)
- `recyclique-1.4.4/.github/workflows/alembic-check.yml` (supprimé)
- `recyclique-1.4.4/.github/workflows/deploy.yaml` (supprimé)
- `references/artefacts/2026-04-03_01_decision-backend-story-2-1-recyclique-1.4.4-vs-canonical.md`
- `references/artefacts/index.md`
- `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/guide-pilotage-v2.md`
- `_bmad-output/implementation-artifacts/_runner-brief-story-2-2.md`
- `_bmad-output/implementation-artifacts/2-2-implementer-le-contextenvelope-backend-minimal-et-le-recalcul-explicite-de-contexte.md`
- `_bmad-output/implementation-artifacts/2-2b-migrer-le-backend-vers-recyclique-racine-mono-repo.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `references/ancien-repo/index.md`
- `references/ancien-repo/README.md`

## Change Log

- 2026-04-03 — DS : migration backend vers `recyclique/api`, mise à jour compose/CI/docs/BMAD.

---

## Story completion status

**review** — Implémentation DS terminée ; gate pytest complet à exécuter par le Story Runner (Task shell). Prochaine étape : **GATE** puis **QA** / **CR** selon politique retry.
