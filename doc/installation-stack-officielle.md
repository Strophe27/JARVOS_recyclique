# Installation — stack officielle v2 (story 10.6)

Guide d'installation **reproductible** pour une ressourcerie ou un déployeur : stack cible, environnement **officiellement supporté** et frontières de support.  
Manifeste machine-readable : [`supported-stack-official.yaml`](./supported-stack-official.yaml).

**Hiérarchie doc :** ce guide = chemin **officiel** install / évaluation v2 ; le [`README.md`](../README.md) racine reste l'entrée **développement** Docker (même compose, options dev supplémentaires).

## Les six piliers d'installabilité

| Pilier | Contenu |
|--------|---------|
| `stack_services` | Cinq services : API, Peintre_nano, Paheko, PostgreSQL 17, Redis |
| `debian_reference` | Hôte **Debian** (référence unique supportée) |
| `docker_entrypoint` | `docker-compose.yml` à la **racine** du dépôt ([story 10.6b](../_bmad-output/implementation-artifacts/10-6b-clarifier-le-point-dentree-docker-local-du-mono-repo.md)) |
| `postgresql_17` | Image `postgres:17` ; upgrade 15→17 : [runbook spike](../_bmad-output/planning-artifacts/operations/runbook-spike-postgresql-15-vers-17.md) ([10.6c](../_bmad-output/implementation-artifacts/10-6c-documenter-et-valider-le-spike-de-migration-postgresql-15-vers-17-hors-legacy.md)) |
| `browser_matrix` | Voir tableau **Support** ci-dessous |
| `nominal_install_complete` | Shell authentifié + premier contexte exploitable (checklist §6) |

## Index des sous-stories infra (10.6b–10.6e)

Liens **sans** recopier les runbooks :

| Story | Livrable canonique |
|-------|-------------------|
| **10.6b** | Point d'entrée Docker — [`README.md`](../README.md), [`docker-compose.yml`](../docker-compose.yml) |
| **10.6c** | Spike PG 15→17 — [`runbook-spike-postgresql-15-vers-17.md`](../_bmad-output/planning-artifacts/operations/runbook-spike-postgresql-15-vers-17.md) |
| **10.6d** | Compose + CI sur `postgres:17` — [`docker-compose.yml`](../docker-compose.yml), [`.github/workflows/ci-minimal.yml`](../.github/workflows/ci-minimal.yml) |
| **10.6e** | Alembic / API sur PG17 — smoke [`test_story_10_6e_pg17_backend_smoke.py`](../tests/infra/test_story_10_6e_pg17_backend_smoke.py) |

**Note historique :** l'artefact [`references/artefacts/2026-04-07_01_validation-stack-locale-peintre-nano.md`](../references/artefacts/2026-04-07_01_validation-stack-locale-peintre-nano.md) mentionne encore PostgreSQL 15 ; la stack canonique actuelle est **PostgreSQL 17** (voir runbook 10.6c).

**Volume existant en PG15 :** ne pas réutiliser tel quel avec l'image 17 — suivre le runbook spike avant `docker compose up`.

## Chemin minimal ordonné (Debian + Docker)

Prérequis hôte : **Debian 12 (bookworm)** ou équivalent documenté dans le manifeste YAML ; accès réseau pour tirer les images ; utilisateur pouvant exécuter Docker (groupe `docker` recommandé).

### 1. Prérequis hôte

- **Docker Engine** + **plugin Compose** (v2) installés sur Debian ([documentation Docker officielle](https://docs.docker.com/engine/install/debian/)).
- Ports locaux libres (stack minimale v2) :

| Port | Service Compose | Rôle |
|------|-----------------|------|
| **8000** | `api` | API Recyclique (`GET /health` liveness) |
| **4444** | `frontend` | Peintre_nano (UI v2) |
| **8080** | `paheko` | Paheko (comptabilité) |
| **5432** | `postgres` | PostgreSQL 17 |
| **6379** | `redis` | Redis |

Le port **4445** (`frontend-legacy`) est **hors** install v2 documentée — ne pas l'inclure dans la commande `up` minimale.

### 2. Cloner le dépôt et préparer `.env`

À la **racine** du mono-repo :

```bash
cp recyclique-1.4.4/env.example .env
```

Variables **minimales** (éditer `.env`) :

- `POSTGRES_PASSWORD`, `SECRET_KEY` — obligatoires
- `FIRST_SUPER_ADMIN_USERNAME`, `FIRST_SUPER_ADMIN_PASSWORD` (et optionnellement `FIRST_SUPER_ADMIN_PIN`) — **première install** pour le compte super-admin bootstrap
- `PAHEKO_*` (`PAHEKO_API_USER`, `PAHEKO_API_PASSWORD`, etc.) — si intégration comptable active ; l'API peut démarrer sans comptabilité configurée, mais la **stack officielle** documentée **démarre Paheko** avec les autres services

Ne jamais committer `.env` (secrets).

### 3. Démarrer la stack minimale v2 (sans legacy)

Depuis la **racine** :

```bash
docker compose up --build postgres redis api-migrations api paheko frontend
```

- **`api-migrations`** s'exécute **avant** `api` grâce à `depends_on` (`service_completed_successfully`) au premier démarrage — **pas** d'étape obligatoire `docker compose run --rm api-migrations` sur le happy path.
- **Reprise seulement** si migrations en échec : `docker compose run --rm api-migrations`

**Paheko (posture unique) :** le service `paheko` est **inclus** dans la commande ci-dessus (5ᵉ service métier + postgres + redis). URL : **`http://localhost:8080`**.

### 4. Vérifier la santé API

```bash
curl -sf http://localhost:8000/health
```

Réponse attendue : HTTP **200** (liveness canonique — aligné observabilité [10.5](./observability-support-runbook.md)).

### 5. Accéder à l'UI v2

Navigateur : **`http://localhost:4444`** (Peintre_nano, proxy `/api` vers l'API).

### 6. Checklist — install nominale complète (PRD §11.5)

- [ ] `GET /health` sur `:8000` OK
- [ ] UI `:4444` charge sans erreur bloquante
- [ ] **Connexion shell authentifié** : utiliser le compte créé via `FIRST_SUPER_ADMIN_*` à la première install, ou la procédure admin documentée dans [`recyclique-1.4.4/README.md`](../recyclique-1.4.4/README.md) (super-admin)
- [ ] **Premier contexte exploitable** : au moins un contexte organisation / site sélectionnable après login (pas de base vide non migrée)

Sans édition manuelle de schéma SQL : les migrations sont appliquées par `api-migrations`.

## Matrice Support

| Environnement | Statut | Notes |
|---------------|--------|-------|
| **Debian** (12 bookworm+) | **Officiel** | Seul OS hôte couvert par la matrice support v2 |
| Dérivés type **Ubuntu** | Best-effort communauté | Hors matrice support ; non garanti |
| **Windows / macOS** | Hors support officiel | Dev possible via Docker Desktop — voir [`README.md`](../README.md) |
| **Chromium** (stable) | Support nominal UI | PRD §web_app |
| **Firefox ESR** | Support nominal UI | PRD §web_app |
| **Microsoft Edge** (récent) | Best-effort | Non bloquant pour RC |
| **HelloAsso** | Catalogue connecteurs | **Pas** prérequis install cœur |
| **staging/prod** sous `recyclique-1.4.4/` | Transitoire | Fichiers `docker-compose.staging.yml` / `.prod.yml` — **non** chemin d'install v2 documenté |
| **`frontend-legacy` (:4445)** | Hors install v2 | Comparaison / legacy uniquement |

## Après installation — support

Une install réussie doit rester **diagnostiquable** sans dupliquer la doc observabilité :

- Runbook exploit : [`doc/observability-support-runbook.md`](./observability-support-runbook.md) (story **10.5** — santé canonique, corrélation HTTP, fil sync, journaux admin).
- Manifeste flux : [`doc/observability-critical-flows.yaml`](./observability-critical-flows.yaml).

## Hors périmètre (story 10.6)

- Gates **beta / v2 vendable** (10.7) et readiness globale (10.8)
- Playbook déploiement production automatisé
- Migration données production réelle (hors runbook spike documenté)
- Extension support OS au-delà du tableau ci-dessus
- Matériel minimal performance (PRD §11.4) — renvoi futur « guide performance » si absent
