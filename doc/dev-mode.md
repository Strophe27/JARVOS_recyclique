# Mode dev local stable (sans rebuild a chaque modif)

Objectif: garder l'infra en Docker et activer le hot reload pour coder plus vite.

## Principe

- PostgreSQL, Redis, Paheko: en Docker (stables).
- API RecyClique: en Docker avec `uvicorn --reload` (via `docker-compose.dev.yml`).
- Frontend: en local avec Vite (`npm run dev`), proxy vers `http://localhost:8000`.

## 1) Lancer la stack dev

Depuis la racine du projet:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

## 2) Lancer le frontend en hot reload

Dans un autre terminal:

```bash
cd frontend
npm run dev
```

Frontend dev: `http://localhost:4173`  
API/health: `http://localhost:8000`

## 3) Workflow quotidien

- Modif backend (`api/*`): recharge auto via `--reload` (pas de rebuild).
- Modif frontend (`frontend/src/*`): hot reload instantane dans Vite.
- Ouvrir le navigateur sur `http://localhost:5173` pendant le dev.

## 4) Quand rebuild reste necessaire

Rebuild requis uniquement si tu modifies:

- `Dockerfile`
- `api/requirements.txt`
- config image systeme/dependances

Commande:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d recyclic
```

## 5) Arret

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```
