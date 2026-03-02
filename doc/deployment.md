# Déploiement Docker — JARVOS RecyClique

Ce document décrit le déploiement de la stack RecyClique via Docker Compose (projet `jarvos_recyclique`) et la vérification de l’instance.

## Prérequis

- **Docker** : Docker Desktop (Windows/macOS) ou moteur Docker + Docker Compose v2.
- **Audit Docker local (recommandé)** : avant le premier démarrage, effectuer une lecture du `docker-compose.yml` et du `Dockerfile` pour vérifier les images de base, les volumes et les ports. Aucun secret ne doit être en dur dans les fichiers ou les images.
- **Stratégie d’isolation** : les services (recyclic, paheko, postgres, redis) sont sur un réseau bridge dédié `jarvos_net` ; les données persistantes sont dans des volumes nommés (`postgres_data`, `redis_data`, `paheko_data`). Ne pas exposer les ports des bases en dehors du réseau si ce n’est pas nécessaire.

## Démarrer l’instance

À la **racine du dépôt** :

```bash
# Optionnel : copier .env.example vers .env pour surcharger les variables
# cp .env.example .env

docker compose up --build
```

Pour lancer en arrière-plan :

```bash
docker compose up --build -d
```

## Vérification de la stack

### 1. État des services

Vérifier que les services sont en état **running** (et **healthy** pour recyclic, postgres, redis) :

```bash
docker compose ps -a
```

Services attendus : **recyclic**, **paheko**, **postgres**, **redis**. En cas d’échec au démarrage (ex. port déjà utilisé), le service concerné restera en état `Created` ou `Exited` ; consulter les logs avec `docker compose logs <service>`.

### 2. Health check RecyClique

- **URL :** http://localhost:8000/health  
- **Méthode :** GET  

**Réponse attendue (exemple)** : un JSON avec au minimum les champs `status`, `database` (optionnel si BDD non configurée), `redis` :

```json
{"status": "ok", "database": "ok", "redis": "ok"}
```

ou si la base RecyClique n’est pas encore configurée :

```json
{"status": "ok", "database": "unconfigured", "redis": "ok"}
```

Un statut cohérent signifie : application up, connexion Redis opérationnelle, et éventuellement état de la base (ok / unconfigured / error).

### 3. Accès front et Paheko

| Service    | URL                     | Description                          |
|-----------|--------------------------|--------------------------------------|
| RecyClique (SPA + API) | http://localhost:8000   | Frontend et API                      |
| Health check           | http://localhost:8000/health | Santé de l’application et dépendances |
| Paheko                 | http://localhost:8080   | Compta / vie associative (si exposé)  |

Si **Docker n’est pas exécutable** dans l’environnement (ex. agent en sandbox), la vérification est **manuelle** : exécuter `docker compose up --build` sur une machine disposant de Docker, puis vérifier les URLs ci-dessus et le health check.

## Dépannage

- **Port 8080 déjà alloué** : le conteneur Paheko ne pourra pas démarrer. Libérer le port 8080 ou modifier le mapping dans `docker-compose.yml` (ex. `"8081:80"` pour Paheko) puis relancer `docker compose up -d`.
- **Port 8000 déjà utilisé** : idem pour RecyClique ; changer le mapping des ports ou arrêter le processus qui utilise le port.
- **Health check en échec** : vérifier les logs du service `recyclic` (`docker compose logs recyclic`) et que PostgreSQL et Redis sont bien healthy (`docker compose ps`).

## Authentification (Story 14.6 — arch. simplifiée)

Decision produit (14.6) : **pas d'identite unifiee OIDC en v1**. RecyClique gere l'auth terrain (JWT/PIN). Paheko reste la source de verite adherents via API/sync metier uniquement. Aucun service IdP externe n'est requis dans la stack standard.

Les endpoints `/v1/auth/sso/*` retournent `410 Gone`. Les variables OIDC ne sont plus supportees.

## Arrêter l’instance

```bash
docker compose down
```

Pour supprimer aussi les volumes (données) :

```bash
docker compose down -v
```
