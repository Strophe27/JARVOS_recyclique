# Tests Backend - Recyclic



## Guide pour les agents



### Exécution des tests



#### Méthode recommandée (lot consolidation 1.4.5)



Le service Compose `api-tests` est **commenté** dans `docker-compose.yml` (pas d'image dédiée en flux courant). Utiliser le script depuis la racine Compose `recyclique-1.4.4` :



```bash

cd recyclique-1.4.4

bash api/run_tests.sh

```



Le script démarre `postgres` et `redis`, prépare `recyclic_test` si besoin, génère `openapi.json`, puis lance **un sous-ensemble minimal** (auth + infra, lot élargi au fil du temps) via le service `api` avec `TESTING=true` et `ENVIRONMENT=test`. **Liste exacte des fichiers pytest :** ouvrir `api/run_tests.sh` (invocation réelle) — le bloc « équivalent manuel » ci-dessous est un extrait simplifié, pas la vérité exhaustive. Les schéma et tables sont gérés par `conftest.py` (`create_tables_if_not_exist`), pas par une variable d'environnement dédiée aux migrations.



#### Équivalent manuel (même enchaînement que le script)



```bash

# depuis recyclique-1.4.4

docker-compose down -v

docker-compose up -d postgres redis

# attendre que postgres soit prêt si besoin

sleep 10



docker-compose run --rm api python -c "from recyclic_api.main import app; import json; schema = app.openapi(); open('/app/openapi.json', 'w').write(json.dumps(schema, indent=2))"



docker-compose exec -T postgres psql -U recyclic -d postgres -c "CREATE DATABASE recyclic_test OWNER recyclic;" 2>/dev/null || true



docker-compose run --rm -e TESTING=true -e ENVIRONMENT=test api bash -lc "\

  cd /app && python -m pytest \

    tests/test_infrastructure.py \

    tests/test_auth_login_endpoint.py \

    tests/test_auth_logging.py"

```

Les options `-v` et `--tb=short` viennent uniquement de `api/pyproject.toml` (`[tool.pytest.ini_options].addopts`), pas de la ligne de commande. Il n’y a plus de `pytest.ini` dans ce package : la configuration effective est résolue depuis **`pyproject.toml`** (finding F6 / P0 clôturé, story **26-1**).

Validation locale minimale depuis le répertoire du paquet :

```bash

cd recyclique/api

python -m pytest tests/test_infrastructure.py

```



#### Ancienne cible `api-tests` (désactivée)



`docker-compose run --rm api-tests` n'est **pas** utilisable tant que le service reste commenté. Référence historique dans `docker-compose.yml` (bloc commenté).



### Architecture de test



- **Base de données :** PostgreSQL `recyclic_test`

- **Cache :** Redis

- **Isolation :** conteneur éphémère par exécution (`docker-compose run`)

- **Fixtures :** `db_engine` (scope session) pour le moteur et la création des tables ; `db_session` / `_db_autouse` par test pour une connexion + session ORM dédiées et l'override FastAPI `get_db` (voir **Contrat `_db_autouse`** ci-dessous — ce n'est pas un rollback systématique entre tests)



### Fixtures disponibles



#### `db_engine`



```python

@pytest.fixture(scope="session")

def db_engine():

    """Crée les tables une seule fois pour toute la session de test."""

```



#### `db_session`



```python

@pytest.fixture(scope="function")

def db_session(_db_autouse):

    """Même session que _db_autouse (alias)."""

```



#### Contrat `_db_autouse` (référence unique)



Document détaillé dans la docstring de `_db_autouse` dans `conftest.py`. En résumé :



- **Garantit** : une connexion et une `Session` SQLAlchemy par test, `connection.begin()` au démarrage, override de `get_db` pour que l'application sous `TestClient` utilise cette session.

- **Ne garantit pas** : remise à zéro de la base entre tests via rollback automatique. Tout `commit()` (endpoint ou test) persiste dans la base partagée ; les tests suivants peuvent voir ces données.

- **Teardown** : fermeture de la session puis de la connexion, **sans** commit/rollback explicite sur la transaction ouverte au `begin()` — ne pas confondre avec une isolation transactionnelle « style unittest ».



### Statut validé (lot minimal, trois fichiers ci-dessus)



- **Résultat :** 25 passed (sous-agent shell, même périmètre que `run_tests.sh` ; à revalider après toute modification)

- **Avertissements :** 5 warnings Pydantic (non bloquants pour ce lot)

- **Périmètre :** uniquement `test_infrastructure.py`, `test_auth_login_endpoint.py`, `test_auth_logging.py` ; `test_basic.py` et le reste de la suite ne sont pas exécutés par ce script



### Configuration



- `TESTING=true` — mode test (voir aussi `conftest.py`)

- `ENVIRONMENT=test` — aligné avec l'ancien service `api-tests` commenté

- `TEST_DATABASE_URL` / `DATABASE_URL` — base de test (Compose)

- **`api/pyproject.toml`** — `[tool.pytest.ini_options]` : `testpaths`, `pythonpath`, `addopts`, `filterwarnings`, marqueurs (`no_db`, `integration_db`, `performance`)

- `tests/conftest.py`, `docker-compose.yml`

#### Marqueur `no_db`

Utiliser `@pytest.mark.no_db` sur un test qui ne doit pas activer les fixtures DB autouse (`_db_autouse`, etc.). Le marqueur est déclaré dans `pyproject.toml` pour éviter les avertissements Pytest « unknown marker ».



### Références



- Script : `api/run_tests.sh`

- Config pytest : uniquement `api/pyproject.toml` (`[tool.pytest.ini_options]` ; pas de `pytest.ini`)

- Guide stabilisation : le fichier historique `api/TESTS_STABILIZATION_GUIDE.md` **n’est pas présent** dans ce dépôt (constat 2026-04-19). En attendant restitution ou réécriture du guide : stratégie pytest et dettes associées dans [`references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md`](../../../references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md) §6 ; détail fixtures dans ce dossier via `conftest.py`.



### Note sur `run_tests.sh`



Le script exécute `docker-compose down -v` au début (reset des volumes). À réserver aux environnements locaux / CI où ce reset est acceptable.

