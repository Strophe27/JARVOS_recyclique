# Story 10.6e : Vérifier `recyclique/api` et Alembic sur PostgreSQL 17

**Clé fichier (obligatoire) :** `10-6e-verifier-recyclique-api-et-alembic-sur-postgresql-17`  
**Epic :** epic-10  
**Statut :** done

## Story

En tant que **mainteneur backend**,  
je veux que la **API canonique** et le **chemin Alembic** soient **exercés contre PostgreSQL 17** avec une **preuve reproductible**,  
afin que le passage en 17 ne repose pas uniquement sur l’alignement d’images (stories 10.6c / 10.6d).

## Acceptance Criteria

Alignement avec `epics.md` (Story 10.6e) :

1. **Backend vivant** — Étant donné que le backend supporté est `recyclique/api/`, quand la validation tourne sur **PostgreSQL 17**, le chemin Alembic pertinent et une **sélection pytest bornée** sont exécutés (ou documentés avec résultats) ; les régressions bloquantes dans le périmètre backend sont corrigées ou signalées avant `done`.
2. **Périmètre** — Les preuves portent sur `recyclique/api/` et les vérifications dépendantes de PostgreSQL ; pas d’élargissement front / backlog hors chantier.
3. **Confiance opérationnelle** — Le dépôt contient une **piste de vérification concise** pour la compatibilité PG17 (réutilisable par le QA final).

## Tasks / Subtasks

- [x] Définir une **preuve exécutable localement** : test smoke `tests/infra/test_story_10_6e_pg17_backend_smoke.py` (conteneur éphémère `postgres:17`, `alembic upgrade head`, assertion version serveur 17.x).
- [x] Documenter dans ce fichier les **commandes de gate** et prérequis (`Docker` + `pip install -r recyclique/api/requirements.txt` pour Alembic/psycopg2 depuis la racine du repo).
- [x] Mettre à jour le **runbook** (section courte « post-10.6e ») si nécessaire pour pointer vers ce test.
- [x] `sprint-status.yaml` : story **10-6e** → `done` après gates + QA + CR

## Dev Notes

### Contexte

- **Précédent :** 10.6d aligne compose racine + CI sur `postgres:17` ; 10.6c a livré le runbook spike données.
- **Hors scope :** toute modification sous `recyclique-1.4.4/` pour la migration elle-même.

### Prérequis exécution smoke 10.6e

- **Docker** (CLI) pour lever un conteneur `postgres:17` éphémère.
- **Dépendances API** installées dans l’environnement Python qui exécute pytest :  
  `pip install -r recyclique/api/requirements.txt` (Alembic, SQLAlchemy, psycopg2, modèles `recyclic_api`).

### Gates (brief Story Runner)

- `docker compose config --quiet`
- `python -m pytest tests/infra/test_story_10_6c_pg17_doc_smoke.py -q`
- `python -m pytest tests/infra/test_story_10_6e_pg17_backend_smoke.py -q`

### Alignement CI existante

- `.github/workflows/alembic-check.yml` exécute déjà `alembic upgrade head` sur **postgres:17** (service GitHub Actions). Le smoke 10.6e **complète** avec une preuve locale/orchestrée par pytest au même niveau que les autres `tests/infra/`.

## Story completion status

- **CS :** fichier story créé
- **VS :** critères et périmètre validés pour l’implémentation
- **DS :** test smoke PG17 + doc ; pas de changement fonctionnel API hors nécessité PG17 (aucun ici au run initial)
- **Gates :** `docker compose config --quiet` OK ; `pytest tests/infra/test_story_10_6c_pg17_doc_smoke.py -q` OK (6 tests) ; `pytest tests/infra/test_story_10_6e_pg17_backend_smoke.py -q` OK (2 tests)
- **QA :** couverture par smoke infra (pas d’e2e navigateur requis pour ce chantier backend/PG17)
- **CR :** revue structurelle — APPROVED (risques résiduels documentés ci-dessous)

### Revue code (CR) — synthèse

- **Blind Hunter :** changements localisés (`tests/infra/`, story BMAD, runbook §9) ; pas de toucher `recyclique-1.4.4/`.
- **Edge cases :** si Docker ou dépendances API absentes, tests ignorés (aligné `test_docker_compose_entrypoint.py`) — le QA final doit exécuter sur une machine avec Docker + `pip install -r recyclique/api/requirements.txt`). Conteneurs tués en `finally` ; ports libres via `bind(0)`.
- **Acceptance :** preuve reproductible : `alembic upgrade head` + `alembic current` sur PG17 éphémère ; assertion `server_version_num` majeur 17.
