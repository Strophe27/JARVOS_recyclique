# Recyclic API (`recyclic-api`)

Backend FastAPI du livrable **1.4.4** (package défini dans `pyproject.toml` à la racine de ce dossier).

## Rôle

- API HTTP (schémas Pydantic, services, endpoints).
- Migrations SQL gérées par **Alembic** (`migrations/`, `alembic.ini`).

## Développement local (résumé)

Les versions runtime sont alignées sur `requirements.txt`. Pour un setup typique :

```bash
pip install -r requirements.txt -r requirements-dev.txt
pip install -e ".[dev]"
```

Pour le détail (Docker, premier admin, etc.), voir le README du dossier parent `recyclique-1.4.4/README.md`.

## Migrations en conteneur

```bash
# depuis recyclique-1.4.4/
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
