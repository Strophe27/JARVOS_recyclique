# Recyclic API (`recyclic-api`)

Backend FastAPI du livrable **1.4.4** (package défini dans `pyproject.toml` à la racine de ce dossier).

## Rôle

- API HTTP (schémas Pydantic, services, endpoints).
- Migrations SQL gérées par **Alembic** (`migrations/`, `alembic.ini`).

## Surfaces sensibles admin (Story 16.4)

| Surface | Rôles | Audit / garde-fous |
|--------|--------|---------------------|
| `POST /v1/admin/reports/cash-sessions/export-bulk` | ADMIN, SUPER_ADMIN | `X-Step-Up-Pin` + `Idempotency-Key` obligatoires ; `log_admin_access` après succès ; risque **fuite de masse** CSV/XLSX. |
| `POST /v1/admin/reports/reception-tickets/export-bulk` | ADMIN, SUPER_ADMIN | Idem. |
| `GET /v1/stats/reception/summary`, `GET /v1/stats/reception/by-category` | ADMIN, SUPER_ADMIN | Agrégats **cross-site** ; `log_admin_access` sur lecture réussie. Décision 16.4 : **plus** d’accès USER (écart 15.2 vs `/admin/reception-stats` legacy). |
| `GET /v1/stats/live` | ADMIN, SUPER_ADMIN | `log_admin_access` sur succès. |
| `GET /v1/reception/stats/live` | ADMIN, SUPER_ADMIN (déprécié → `/v1/stats/live`) | `log_admin_access` sur succès. |

Références cartographie : `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md`.

## Runtime Python : Docker vs local

- **Image Docker** (`Dockerfile`) : **Python 3.11** (`FROM python:3.11-slim`). C’est la référence d’exécution en compose / prod.
- **Local hors conteneur** : le projet déclare `requires-python = ">=3.11"` dans `pyproject.toml`. Pour coller au comportement de l’image, utilisez de préférence **CPython 3.11.x**. Une version plus récente (ex. 3.13) peut fonctionner mais n’est pas garantie identique (wheels, dépendances natives, comportements subtils).

## CORS et URL frontend

L’API lit **`BACKEND_CORS_ORIGINS`** ou **`CORS_ALLOW_ORIGINS`** (liste d’URLs séparées par des virgules) et **`FRONTEND_URL`** depuis l’environnement / `.env` via **Settings** (`core/config.py`). Si la liste CORS est vide et que `ENVIRONMENT` est `development`, `dev`, `local` ou `test`, un repli local minimal s’applique (localhost / conteneur frontend). En **production** (ou tout autre environnement non listé), une liste vide déclenche un avertissement côté logs ; en l’absence de `BACKEND_CORS_ORIGINS`, une seule origine dérivée de **`FRONTEND_URL`** est utilisée si elle est renseignée.

Dans le compose de développement du mono-repo, le frontend officiel est maintenant **`peintre-nano`**, exposé côté navigateur sur **`http://localhost:4444`** et configuré avec un **proxy Vite** `/api` vers le service Docker `api`. Un second frontend transitoire **`frontend-legacy`** peut aussi tourner sur **`http://localhost:4445`** contre la même API. Ce modèle évite d’ouvrir un chantier cross-origin plus large pour le dev local.

## Développement local (résumé)

Les versions runtime sont alignées sur `requirements.txt`. Pour un setup typique :

```bash
pip install -r requirements.txt -r requirements-dev.txt
pip install -e ".[dev]"
```

Le groupe **`[dev]`** (défini dans `pyproject.toml`) installe notamment **pytest**, **black**, **isort**, **flake8** et **ruff** (story Epic **26.5**). En conteneur, seul `requirements-dev.txt` est garanti si `INSTALL_DEV=1` — les outils listés **uniquement** dans `[project.optional-dependencies].dev` peuvent manquer (finding **F10** audit) ; installer le paquet en mode éditable avec **`[dev]`** en local pour le lint/format.

**Ruff (optionnel au quotidien, recommandé pour le format)** — depuis ce dossier :

```bash
ruff format src tests
ruff check src/recyclic_api
```

`ruff format` suit une ligne de **88** colonnes compatible **Black**. Le jeu de règles par défaut de `ruff check` dans ce dépôt est **minimal** (voir `[tool.ruff.lint]` dans `pyproject.toml`) pour ne pas bloquer la legacy ; **black / isort / flake8** restent utilisables pour des passes plus larges au fil des PR.

Pour le détail (Docker, premier admin, etc.), voir **`README.md` à la racine du mono-repo** puis `recyclique-1.4.4/README.md`.

## Migrations en conteneur

```bash
# depuis la racine du mono-repo JARVOS_recyclique
docker compose run --rm api-migrations
```

L'image dédiée utilise `Dockerfile.migrations` et `requirements-migrations.txt`.

### Règle d’usage (schéma versionné)

Toute évolution de schéma doit passer par une **révision Alembic** versionnée dans
`migrations/versions/` (pas de « DDL ad hoc » en prod sans migration équivalente).

**Base déjà existante** (créée avant la chaîne Alembic ou hors outil) : ne pas
lancer un `revision --autogenerate` sans contrôle — comparer le modèle à la base,
puis soit rédiger une migration manuelle ciblée, soit marquer l’état courant avec
`alembic stamp <revision>` (souvent `alembic stamp head` après validation que la
base correspond bien à la tête attendue). L’autogénération seule peut proposer des
opérations destructives ou redondantes.

La chaîne dans `migrations/versions/` part de la révision racine
`335d7c71186e` (*initial schema*) ; la tête courante est identifiable avec
`alembic heads`. Aucune révision no-op supplémentaire n’a été ajoutée ici pour
éviter une **double tête** Alembic : le dépôt contient déjà l’historique complet.
