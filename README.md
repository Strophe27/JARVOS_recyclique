# JARVOS RecyClique

Application RecyClique (caisse, reception, administration) avec frontend React (Vite + TypeScript) et API FastAPI, integree a Paheko.

- **Frontend detaille :** [frontend/README.md](frontend/README.md)
- **Deploy Docker complet :** [doc/deployment.md](doc/deployment.md)
- **Mode dev rapide (recommande) :** [doc/dev-mode.md](doc/dev-mode.md)

## Demarrage rapide (recommande)

Mode le plus stable pour developper: infra Docker + hot reload.

### 1) Lancer l'infra + API backend en reload

Depuis la racine du depot:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### 2) Lancer le frontend en local

Dans un autre terminal:

```bash
cd frontend
npm run dev
```

### 3) URLs utiles en dev

- **Frontend dev (a utiliser au quotidien)** : `http://localhost:4173`
- **API + health** : `http://localhost:8000` et `http://localhost:8000/health`
- **Paheko** : `http://localhost:8080`

## Premiere connexion admin

Configurer dans `.env` avant le premier lancement:

- `FIRST_ADMIN_USERNAME`
- `FIRST_ADMIN_EMAIL`
- `FIRST_ADMIN_PASSWORD`

Le premier admin est cree automatiquement **uniquement si la table `users` est vide**.

## Quand rebuild est necessaire

Pas besoin de rebuild pour une modification normale de code.

Rebuild requis seulement si tu modifies notamment:

- `Dockerfile`
- `api/requirements.txt`

Commande:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d recyclic
```

## Arret

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

## Notes importantes

- Le flux OIDC/Keycloak a ete retire du run nominal v1.
- Le mode de connexion courant est le mode legacy RecyClique (login local).
- Aucune valeur sensible ne doit etre committee. Utiliser `.env` local uniquement.
