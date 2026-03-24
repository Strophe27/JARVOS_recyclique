# Recyclic – Architecture brownfield (état réel)

- **Objectif** : Décrire l’**état actuel** du projet (code, Docker, déploiement), sans aspirer à une architecture cible. Ce document sert de référence pour des décisions d’architecture externes ou internes.
- **Périmètre** : Codebase et orchestration Docker telles qu’elles existent ; dette technique et écarts explicitement signalés.

## Changelog

| Date       | Version | Description                    | Auteur   |
|-----------|---------|--------------------------------|----------|
| 2025-02-23 | 1.0     | Création état des lieux réel   | Analyst  |

---

## 1. Résumé exécutif

- **Stack en production de fait** : Backend FastAPI (Python 3.11+), frontend React/Vite/TypeScript (PWA), PostgreSQL 15, Redis 7, Docker Compose. En staging/production exposée : **Traefik** (pas Nginx) comme reverse proxy / terminaison TLS.
- **Services Docker actifs** (d’après `docker-compose.yml`) : `postgres`, `redis`, `api`, `api-migrations`, `frontend`. Le service **bot** (Telegram) est **désactivé** (commenté, mention « BOT SERVICE DISABLED (STORY-B36-P3) »). Le code du bot existe encore dans `bot/` mais n’est pas déployé.
- **Points d’attention** : Plusieurs documents (dont `docs/export_doc_ecosystem/`) décrivent encore le bot Telegram et parfois Nginx ; ce document reflète uniquement l’état réel des services et du déploiement.

---

## 2. Références rapides – Fichiers clés

| Rôle | Fichier ou répertoire |
|------|------------------------|
| Entrée API | `api/src/recyclic_api/main.py` |
| Routeur API v1 | `api/src/recyclic_api/api/api_v1/api.py` |
| Endpoints | `api/src/recyclic_api/api/api_v1/endpoints/*.py` |
| Config | `api/src/recyclic_api/core/config.py` |
| Modèles DB | `api/src/recyclic_api/models/` |
| Migrations | `api/alembic/`, `api/alembic.ini` |
| Frontend entrée | `frontend/index.html`, `frontend/src/main.tsx` |
| Orchestration dev | `docker-compose.yml` |
| Orchestration staging/prod | `docker-compose.staging.yml`, `docker-compose.prod.yml` |
| Démarrage | `start.sh`, `env.example` |

---

## 3. Stack technique réelle

D’après les fichiers du dépôt (versions indicatives).

| Catégorie | Technologie | Version / source | Note |
|-----------|-------------|------------------|------|
| Backend | Python / FastAPI | 3.11+ (Dockerfile), FastAPI 0.104 | OpenAPI, CORS, rate limiting (SlowAPI) |
| Frontend | React / Vite / TypeScript | React 18, Vite (voir `frontend/package.json`) | PWA, Mantine UI |
| Base de données | PostgreSQL | 15 (image `postgres:15`) | Volume `postgres_data` |
| Cache / sessions | Redis | 7-alpine | Pas de persistance configurée en dev |
| API HTTP | Uvicorn | 0.24 | Dev : `--reload` ; prod/staging : `--proxy-headers` pour Traefik |
| Infra dev | Docker Compose | - | Réseau `recyclic-network` |
| Infra exposée (staging/prod) | Traefik | Externe (Jarvos) | TLS, routage par Host/Path ; **pas Nginx dans le repo** |
| Email | Brevo (Sendinblue) | SDK `sib-api-v3-sdk` | Envoi emails, webhooks optionnels |
| Rapports | ReportLab, OpenPyXL, PyPDF2 | requirements.txt | Génération PDF/Excel |
| Import legacy / classification | - | OpenRouter optionnel (LLM) | Variables `LEGACY_IMPORT_LLM_*`, `OPENROUTER_*` |

---

## 4. Services Docker (état réel)

D’après `docker-compose.yml` (sans override).

### 4.1 Services actifs

| Service | Image / build | Port(s) exposé(s) | Rôle |
|---------|----------------|-------------------|------|
| **postgres** | `postgres:15` | 5432 | Base de données principale, healthcheck `pg_isready` |
| **redis** | `redis:7-alpine` | 6379 | Cache / sessions, healthcheck `redis-cli ping` |
| **api** | Build `./api` | `${API_PORT:-8000}:8000` | Backend FastAPI (uvicorn), dépend de postgres + redis |
| **api-migrations** | Build `./api`, Dockerfile.migrations | - | Alembic `upgrade head`, une fois au démarrage (restart: no) |
| **frontend** | Build `./frontend`, Dockerfile.dev | 4444:5173 | Dev : Vite avec hot-reload, volumes sources |

En dev, le frontend appelle l’API soit directement (ex. `http://localhost:8000`), soit via le proxy Vite selon la config (voir `frontend/vite.config.js`). Aucun service Nginx dans le compose de base.

### 4.2 Services présents mais désactivés (commentés)

- **bot** (Telegram) : bloc commenté avec la mention `# BOT SERVICE DISABLED (STORY-B36-P3)`. Le répertoire `bot/` existe toujours (handlers, webhook, etc.) mais le service n’est pas lancé par défaut.
- **api-tests** / **bot-tests** : services de test commentés dans le même fichier.

### 4.3 Schéma des composants réels (simplifié)

```text
[ Utilisateur ]
      |
      v
[ Frontend (PWA) ]  :4444  (dev)
      |
      |  (appels API directs ou via proxy Vite)
      v
[ API FastAPI ]     :8000  (dev)
      |
      +---> PostgreSQL :5432
      +---> Redis     :6379
      +---> Brevo (email)
      +---> OpenRouter (optionnel, import legacy)

[ api-migrations ]  s’exécute au besoin (alembic upgrade head), pas de port exposé.
```

En **staging/production** (fichiers `docker-compose.staging.yml` / `docker-compose.prod.yml`) : les services `api` et `frontend` sont exposés via **Traefik** (réseau `traefik-public`), avec règles par Host et PathPrefix (`/api` pour l’API). Pas de Nginx dans ces fichiers.

---

## 5. Structure du dépôt (réelle)

```text
Recyclic/
├── api/                    # Backend FastAPI
│   ├── src/recyclic_api/   # Code source (main, api, core, models, services)
│   ├── alembic/             # Migrations
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile, Dockerfile.migrations
├── frontend/                # PWA React/Vite
│   ├── src/
│   ├── public/
│   └── package.json, vite.config.js
├── bot/                     # Code présent, service Docker désactivé
├── docs/                    # Documentation (dont export_doc_ecosystem, architecture, etc.)
├── scripts/                 # Utilitaires (build-info, etc.)
├── docker-compose.yml       # Dev : postgres, redis, api, api-migrations, frontend
├── docker-compose.staging.yml
├── docker-compose.prod.yml
├── start.sh
└── env.example
```

---

## 6. Données et persistance

- **PostgreSQL** : base principale (`recyclic`), utilisateur `recyclic`. Migrations gérées par Alembic. Volume nommé `postgres_data` ; sauvegardes possibles via `./backups` (monté dans le conteneur postgres).
- **Redis** : utilisé par l’API (sessions, cache, tâches planifiées). En dev, image sans persistance configurée.
- **Fichiers** : rapports générés, logs (ex. `./logs` monté dans l’API pour les logs transactionnels B48-P2), backups.

Modèles principaux (côté API) : User, UserStatusHistory, Deposit, Sale, CashSession, AuditLog, etc. Pour le détail des champs et relations, se référer au code dans `api/src/recyclic_api/models/` et aux migrations Alembic.

---

## 7. Intégrations externes et dépendances

| Système | Usage | Fichiers / config |
|---------|--------|--------------------|
| Brevo | Envoi d’emails, webhooks optionnels | Config : `BREVO_*` ; code API email / webhooks |
| OpenRouter | Optionnel : import legacy avec LLM (classification) | `LEGACY_IMPORT_LLM_*`, `OPENROUTER_*` |
| kDrive (WebDAV) | Référencé dans le code (sync périodique) | `sync_service.py`, `main.py` ; pivot métier vers rapports par email, à considérer comme legacy ou optionnel |
| Traefik | Staging/Prod uniquement, externe (Jarvos) | Labels dans `docker-compose.staging.yml` / `docker-compose.prod.yml` |

---

## 8. Dette technique et écarts documentaires

- **Bot Telegram** : désactivé au niveau Docker (STORY-B36-P3). La doc dans `docs/export_doc_ecosystem/` (et éventuellement `docs/architecture/`) parle encore du bot comme composant actif ; **ce document considère le bot comme hors périmètre opérationnel**.
- **Nginx vs Traefik** : certains documents mentionnent un « reverse proxy Nginx ». En réalité, en dev il n’y a pas de Nginx dans le compose ; en staging/prod c’est **Traefik** qui assure le routage et le TLS.
- **Règle Cursor** `.cursor/rules/docker-complete.mdc` : peut encore lister le bot et bot-webhook parmi les services principaux ; à aligner avec ce brownfield si vous vous basez sur cette doc.
- **kDrive** : toujours présent dans le code (scheduler, sync_service). La stratégie métier a pivoté vers les rapports par email ; à traiter comme legacy ou à désactiver explicitement selon la cible.
- **Double structure API** : présence de `api/api/api_v1/` en plus de `api/api_v1/` ; à considérer pour toute refactorisation de routes.

---

## 9. Développement et déploiement

- **Démarrage dev** : `./start.sh` ou `docker-compose up -d` après configuration de `.env` (voir `env.example`). L’API est typiquement sur le port 8000 (ou `API_PORT` si défini) et le frontend sur 4444.
- **Migrations** : `docker-compose up -d api-migrations` (ou exécution ponctuelle) pour appliquer Alembic.
- **Staging/Prod** : stacks séparées (`docker-compose.staging.yml`, `docker-compose.prod.yml`) avec Traefik et variables d’environnement adaptées (ex. `--proxy-headers` pour Uvicorn).

---

## 10. Utilisation de ce document

- **Externe** : fournir ce document (et le README de ce dossier) pour décrire l’état réel de l’architecture sans modifier les livrables dans `docs/export_doc_ecosystem/`.
- **Mise à jour** : ré-auditer le dépôt (compose, Dockerfiles, points d’entrée) et mettre à jour la date/version en en-tête ; pour une régénération plus formelle, utiliser la tâche BMAD **Document an Existing Project** (`.bmad-core/tasks/document-project.md`) puis placer le résultat ici.
