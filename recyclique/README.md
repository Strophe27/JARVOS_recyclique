# Recyclique — backend API (mono-repo JARVOS)

**Vérité unique (story 2.2b, 2026-04-03)** : le package Python **`recyclic_api`** (FastAPI), les tests pytest, Alembic et les fichiers `pyproject.toml` / `requirements*.txt` vivent dans ce dossier, sous **`api/`** :

- **`recyclique/api/`** — racine de travail pour `pytest`, `pip install -e .`, gates Story Runner Epic 2.

L’arborescence cible documentaire dans `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` montre parfois `recyclique/pyproject.toml` à la racine de `recyclique/` ; **dans ce dépôt**, le `pyproject.toml` est **sous `api/`** (équivalent documenté acceptable par la story 2.2b).

## Démarrage local (pytest)

Depuis la racine du dépôt (PowerShell) :

```powershell
Set-Location recyclique/api
$env:TESTING = 'true'
python -m pip install -r requirements.txt
python -m pytest tests/test_infrastructure.py -v --tb=short
```

**Ne pas** lancer plusieurs processus pytest en parallèle sur la même base SQLite locale (`pytest_recyclic.db`) — risque `database is locked`.

## Docker (stack `recyclic-local`)

**Point d’entrée unique (story 10.6b puis coexistence explicite des frontends)** : le fichier **`docker-compose.yml` à la racine du mono-repo** (pas dans `recyclique/`). Il orchestre Postgres, Redis, l’API (build depuis **`recyclique/api/`**), le frontend dev officiel **`peintre-nano/`** sur `http://localhost:4444` et un frontend transitoire **`frontend-legacy`** sur `http://localhost:4445`. Procédure : **`README.md` à la racine du dépôt** ; détail des ports et du socle legacy : `recyclique-1.4.4/README.md`. Un raccourci de compatibilité existe sous `recyclique-1.4.4/docker-compose.yml` (inclut le compose racine).

Le frontend `recyclique-1.4.4/frontend` reste un artefact brownfield / de compatibilité ; il n’est plus le frontend de développement par défaut du mono-repo, mais il peut tourner en parallèle contre la même API pour comparaison et accès aux écrans non encore migrés.

## CI

Workflows GitHub Actions à la racine du mono-repo : `.github/workflows/` (`deploy.yaml`, `alembic-check.yml`), chemins **`recyclique/api/`**.

## PIN step-up (local / tests)

Les mutations sensibles (ex. clôture de session caisse, correction de vente) exigent l’en-tête **`X-Step-Up-Pin`** aligné sur le champ **`users.hashed_pin`** (haché comme le mot de passe, 4 chiffres).

- **Nouveau stack Docker** : dans le `.env` racine (voir `recyclique-1.4.4/env.example`), définir **`FIRST_SUPER_ADMIN_PIN=1234`** en plus de `FIRST_SUPER_ADMIN_USERNAME` / `FIRST_SUPER_ADMIN_PASSWORD`. Au premier démarrage, le super-admin est créé avec ce PIN ; si le compte bootstrap existait déjà **sans** PIN, un **backfill** au redémarrage applique le PIN **uniquement** lorsque `ENVIRONMENT` vaut `development`, `dev`, `local` ou `test`.
- **Compte déjà présent, sans variable** : se connecter, puis **`PUT /v1/users/me/pin`** avec `{"pin":"1234"}` (sans `current_password` si aucun PIN n’était défini). Pour **changer** un PIN existant, fournir aussi `current_password`.

Références code : `recyclique/api/src/recyclic_api/initial_data.py`, `core/step_up.py`, `endpoints/users.py` (`PUT /me/pin`).

## OpenAPI reviewable

Contrat maintenu séparément : `contracts/openapi/recyclique-api.yaml` (pas dans ce dossier).
