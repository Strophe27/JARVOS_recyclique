# JARVOS Recyclique — mono-repo

Dépôt produit **Recyclique** (backend), **Peintre_nano** (UI v2), contrats OpenAPI/CREOS, documentation BMAD et références.

## Stack Docker locale (développement)

**Point d'entrée unique :** à la **racine de ce dépôt**, fichier `docker-compose.yml`.

**Frontend dev officiel :** `peintre-nano/`.
Le service Compose `frontend` sert l'UI v2 sur `http://localhost:4444`, tout en gardant le modèle local sûr déjà utilisé dans le dépôt : **même origine navigateur** + **proxy Vite** `/api` vers l'API Docker.

**Frontend transitoire de comparaison / exploitation :** `recyclique-1.4.4/frontend`.
Le service Compose `frontend-legacy` le sert en parallèle sur `http://localhost:4445`. Il reste utile tant que `peintre-nano` ne couvre pas encore tous les écrans, mais ce n’est pas la cible v2.

1. Créer un fichier `.env` à la racine (copier `recyclique-1.4.4/env.example` et renseigner au minimum `POSTGRES_PASSWORD`, `SECRET_KEY`).  
   Si vous aviez déjà un `.env` dans `recyclique-1.4.4/`, vous pouvez soit le copier à la racine, soit lancer :  
   `docker compose --env-file recyclique-1.4.4/.env up --build`
2. Depuis la racine du repo :

```powershell
docker compose up --build
```

3. Migrations Alembic (premier démarrage ou après mise à jour des révisions) :

```powershell
docker compose run --rm api-migrations
```

**Backend vivant (FastAPI, tests, Alembic)** : `recyclique/api/` — ce n’est pas le dossier depuis lequel on lance Compose ; c’est le code source que les services `api` / `api-migrations` construisent.

**Compatibilité :** un fichier `recyclique-1.4.4/docker-compose.yml` minimal **inclut** le compose racine pour ne pas casser les commandes lancées depuis ce dossier (voir bannière dans ce fichier). Le démarrage documenté reste **depuis la racine**.

Les stacks **staging** / **production** restent décrites par les fichiers `docker-compose.staging.yml`, `docker-compose.prod.yml` sous `recyclique-1.4.4/` (chemins d’usage inchangés pour ces environnements).

**Important :** ce réalignement concerne d’abord le **développement local**. Les pipelines de déploiement et les stacks staging / production peuvent rester temporairement branchés sur le frontend legacy tant qu'un chantier dédié ne les a pas migrés.

### Coexistence locale des deux frontends

- `frontend` = `peintre-nano` sur `http://localhost:4444`
- `frontend-legacy` = `recyclique-1.4.4/frontend` sur `http://localhost:4445`
- `api` = `http://localhost:8000`

Les deux frontends pointent vers la **même API**. `FRONTEND_URL` reste réglé sur `http://localhost:4444` pour la cible v2 ; les origines CORS autorisent les deux ports en local.

## Voir aussi

- `recyclique/README.md` — backend, pytest, lien Docker  
- `recyclique-1.4.4/README.md` — détail services legacy, ports, super-admin  
- `peintre-nano/README.md` — frontend v2, scripts et runtime local  
- `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — pilotage BMAD  
