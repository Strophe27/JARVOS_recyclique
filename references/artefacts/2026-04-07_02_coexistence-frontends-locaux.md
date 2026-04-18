# Coexistence locale des frontends

Date : 2026-04-07

## Décision

La stack Docker locale du mono-repo supporte désormais une **coexistence explicite** entre les deux frontends :

- `frontend` = **`peintre-nano`** = cible v2 officielle
- `frontend-legacy` = **`recyclique-1.4.4/frontend`** = frontend transitoire de comparaison / exploitation

Les deux tournent contre la **même API** `recyclique/api`.

## Ports locaux

- `frontend` / `peintre-nano` : `http://localhost:4444`
- `frontend-legacy` : `http://localhost:4445`
- `api` : `http://localhost:8000`

## Règle de lecture pour les agents

- **Cible produit / v2** : toujours `peintre-nano`
- **Usage transitoire** : le legacy reste disponible tant que tous les écrans utiles ne sont pas migrés dans la chaîne v2
- **Ne pas** présenter les deux frontends comme deux cibles équivalentes

## Pourquoi cette coexistence

- continuer à manipuler les écrans legacy et les données réelles pendant l’implémentation d’Epic 4+ ;
- comparer le comportement ancien / nouveau contre la même API ;
- éviter un remplacement brutal alors que `peintre-nano` ne couvre pas encore tout le périmètre.

## Conséquences techniques

- `docker-compose.yml` racine = point d’entrée unique ;
- `FRONTEND_URL` reste aligné sur `http://localhost:4444` pour la cible v2 ;
- `CORS_ALLOW_ORIGINS` et `BACKEND_CORS_ORIGINS` couvrent `4444` et `4445` en local ;
- `frontend-legacy` utilise le `Dockerfile.dev` existant du frontend brownfield et son proxy Vite `/api` vers le service Docker `api`.

## Commandes utiles

Lancer la stack :

```powershell
docker compose up --build
```

Tester les services :

```powershell
docker compose ps
```

Arrêter la stack :

```powershell
docker compose down
```

## Références

- `README.md`
- `docker-compose.yml`
- `_bmad-output/planning-artifacts/guide-pilotage-v2.md`
- `_bmad-output/implementation-artifacts/10-6b-clarifier-le-point-dentree-docker-local-du-mono-repo.md`
