# Guide de Déploiement Recyclic V2

**Version:** 2.1
**Date:** 2025-10-16
**Architecture:** Stacks Docker Indépendantes
**Public:** Développeurs et équipe technique

---

## 🎯 Vue d'Ensemble Rapide

Recyclic utilise maintenant une architecture Docker avec **stacks complètement indépendantes** :

- 📁 **3 fichiers Docker Compose séparés** (un par environnement)
- 🔒 **Isolation totale** (volumes, réseaux, projets différents)
- ✅ **Validation automatisée** (scripts de pré-déploiement)
- 🚀 **Déploiement simultané** possible (staging + prod sur même serveur)

```
Recyclic/
├── docker-compose.yml          # DEV uniquement
├── docker-compose.staging.yml  # STAGING complet
├── docker-compose.prod.yml     # PRODUCTION complet
├── .env                        # Config DEV
├── .env.staging               # Config STAGING
└── .env.production            # Config PRODUCTION
```

---

## 🖥️ Développement Local

### Quick Start

```bash
# 1. Cloner et configurer
git clone <repository-url>
cd recyclic
cp .env.example .env

# 2. Éditer .env avec vos valeurs
nano .env

# 3. Démarrer
docker compose --profile dev up -d --build

# 4. (Optionnel) Activer le service de backup automatique
# Définir ENABLE_BACKUP_SERVICE=true dans .env pour activer
# docker compose -f docker-compose.backup.yml --profile backup up -d postgres-backup

# 5. Accéder
# Frontend: http://localhost:4444
# API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Variables Essentielles (.env)

```bash
# Database
POSTGRES_USER=recyclic
POSTGRES_DB=recyclic
POSTGRES_PORT=5432
POSTGRES_HOST=postgres
POSTGRES_PASSWORD=votre_mot_de_passe

# Security
SECRET_KEY=votre_cle_secrete_longue

# Frontend
FRONTEND_URL=http://localhost:4444
VITE_API_URL=/api

# API Configuration
API_V1_STR=/v1
ROOT_PATH=

# Application Environment
ENVIRONMENT=development
```

### Commandes Courantes

```bash
# Voir les logs
docker compose logs -f

# Logs d'un service
docker compose logs -f api

# Redémarrer
docker compose restart api

# Arrêter
docker compose --profile dev down

# (Si service backup activé) Arrêter aussi le service backup
docker compose -f docker-compose.backup.yml --profile backup down
```

---

## 🧪 Environnement Staging

### Prérequis

- Serveur avec Docker installé
- DNS configuré pour `devrecyclic.jarvos.eu`
- Traefik en cours d'exécution
- **Dossier `./backups` créé avec permissions appropriées** (voir section Volumes ci-dessous)

### Déploiement

```bash
# 1. Se connecter au serveur
ssh utilisateur@serveur

# 2. Cloner le repository
git clone <repository-url>
cd recyclic

# 3. Créer .env.staging depuis le template
cp env.staging.example .env.staging
nano .env.staging

# 4. Validation pré-déploiement (OBLIGATOIRE)
bash scripts/pre-deployment-check.sh staging

# 5. Créer un backup (si existant)
bash scripts/backup-database.sh staging

# 6. Déployer la stack staging
docker compose -p recyclic-staging -f docker-compose.staging.yml --env-file .env.staging up -d --build

# 7. Activer le service de backup automatique (Story B46-P4)
docker compose -f docker-compose.backup.yml -p recyclic-staging --env-file .env.staging --profile backup up -d postgres-backup

# 8. Valider Traefik
bash scripts/validate-traefik.sh staging

# 9. Vérifier
curl https://devrecyclic.jarvos.eu/api/health
```

**Note :** Le service de backup automatique est activé automatiquement par le script `deploy-staging.sh`. Si vous déployez manuellement, n'oubliez pas l'étape 7.

### Variables Critiques (.env.staging)

```bash
# Database (utiliser les mêmes valeurs pour conserver les données existantes)
POSTGRES_USER=recyclic
POSTGRES_DB=recyclic
POSTGRES_PORT=5432
POSTGRES_HOST=postgres
POSTGRES_PASSWORD=mot_de_passe_staging_fort

# Security
SECRET_KEY=cle_secrete_staging_longue

# Frontend
FRONTEND_URL=https://devrecyclic.jarvos.eu
VITE_API_URL_STAGING=/api

# API Configuration
API_V1_STR=/v1
ROOT_PATH=
ENVIRONMENT=staging

# CORS Settings - localhost est automatiquement ajouté pour les healthchecks
ALLOWED_HOSTS=devrecyclic.jarvos.eu
CORS_ALLOW_ORIGINS=https://devrecyclic.jarvos.eu
BACKEND_CORS_ORIGINS=https://devrecyclic.jarvos.eu
```

---

## 🚀 Environnement Production

### ⚠️ AVERTISSEMENT

Le déploiement en production nécessite une procédure complète avec validation, backup et rollback.

**→ Utiliser le runbook complet : [Deployment Independent Stacks](../runbooks/deployment-independent-stacks.md)**

### Prérequis

- Serveur avec Docker installé
- DNS configuré pour `recyclic.jarvos.eu`
- Traefik en cours d'exécution
- **Dossier `./backups` créé avec permissions appropriées** (voir section Volumes ci-dessous)

### Résumé des Commandes (après lecture du runbook)

```bash
# Phase 0 : Pré-validation (OBLIGATOIRE)
bash scripts/pre-deployment-check.sh prod

# Phase 1 : Backup (CRITIQUE)
bash scripts/backup-database.sh prod

# Phase 2 : Arrêt de l'ancienne stack (si migration)
docker compose --profile prod down --remove-orphans

# Phase 3 : Déploiement de la nouvelle stack
docker compose -p recyclic-prod -f docker-compose.prod.yml --env-file .env.production up -d --build

# Phase 3.5 : Activer le service de backup automatique (Story B46-P4)
docker compose -f docker-compose.backup.yml -p recyclic-prod --env-file .env.production --profile backup up -d postgres-backup

# Phase 4 : Validation
watch -n 5 'docker compose -p recyclic-prod -f docker-compose.prod.yml ps'
bash scripts/validate-traefik.sh prod

# Phase 5 : Tests
curl https://recyclic.jarvos.eu/api/health
curl -I https://recyclic.jarvos.eu
```

**Note :** Le service de backup automatique est activé automatiquement par le script `deploy-prod.sh`. Si vous déployez manuellement, n'oubliez pas l'étape 3.5.

### Variables Critiques (.env.production)

```bash
# Database (⚠️ IMPORTANT: utiliser les MÊMES valeurs qu'avant pour préserver les données)
POSTGRES_USER=recyclic
POSTGRES_DB=recyclic
POSTGRES_PORT=5432
POSTGRES_HOST=postgres
POSTGRES_PASSWORD=mot_de_passe_production_TRES_fort

# Security
SECRET_KEY=cle_secrete_production_TRES_longue_et_aleatoire

# Frontend
FRONTEND_URL=https://recyclic.jarvos.eu
VITE_API_URL_PROD=/api

# API Configuration
API_V1_STR=/v1
ROOT_PATH=
ENVIRONMENT=production

# CORS Settings - localhost est automatiquement ajouté pour les healthchecks
ALLOWED_HOSTS=recyclic.jarvos.eu
CORS_ALLOW_ORIGINS=https://recyclic.jarvos.eu
BACKEND_CORS_ORIGINS=https://recyclic.jarvos.eu

# Email Service (Brevo)
BREVO_API_KEY=cle_api_brevo_production
BREVO_WEBHOOK_SECRET=webhook_secret_production
EMAIL_FROM_NAME=Recyclic
EMAIL_FROM_ADDRESS=noreply@recyclic.jarvos.eu
```

---

## 🔄 Migrations de Base de Données

### Migrations Automatiques

Les migrations Alembic s'exécutent **automatiquement** au démarrage de chaque stack via le service `api-migrations` :

```yaml
# Service dédié dans docker-compose.staging.yml et docker-compose.prod.yml
api-migrations:
  container_name: recyclic-staging-migrations
  command: alembic upgrade head  # S'exécute automatiquement
  restart: "no"  # Container one-shot
```

**Comportement :**
- ✅ Container démarre après postgres/redis
- ✅ Exécute `alembic upgrade head`
- ✅ Applique uniquement les migrations manquantes
- ✅ S'arrête une fois terminé (restart: "no")
- ✅ L'API démarre ensuite avec le schéma à jour

### Vérifier les Migrations

```bash
# Voir les logs de migration
docker logs recyclic-staging-migrations
docker logs recyclic-prod-migrations

# Vérifier l'état actuel de la base
docker exec recyclic-prod-postgres psql -U recyclic -d recyclic -c "SELECT * FROM alembic_version;"
```

### Image Migrations Optimisée

L'image `recyclic-api-migrations` utilise un fichier `requirements-migrations.txt` minimal :
- ✅ **5 dépendances** au lieu de 25+
- ✅ Build 3x plus rapide
- ✅ Image 60% plus légère

```txt
# api/requirements-migrations.txt
alembic==1.12.1
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
pydantic==2.5.0
pydantic-settings==2.1.0
```

---

## 🔧 Gestion au Quotidien

### Démarrer/Arrêter

```bash
# DEV
docker compose --profile dev up -d
docker compose --profile dev down

# STAGING
docker compose -p recyclic-staging -f docker-compose.staging.yml --env-file .env.staging up -d
docker compose -p recyclic-staging -f docker-compose.staging.yml --env-file .env.staging down

# PRODUCTION
docker compose -p recyclic-prod -f docker-compose.prod.yml --env-file .env.production up -d
docker compose -p recyclic-prod -f docker-compose.prod.yml --env-file .env.production down
```

### Mise à Jour du Code

```bash
# 1. Récupérer les modifications
git pull origin main

# 2. STAGING : Déployer
docker compose -p recyclic-staging -f docker-compose.staging.yml --env-file .env.staging up -d --build

# 3. PRODUCTION : Suivre le runbook complet
# Voir: docs/runbooks/deployment-independent-stacks.md
```

### Logs et Monitoring

```bash
# STAGING
docker compose -p recyclic-staging -f docker-compose.staging.yml --env-file .env.staging logs -f
docker compose -p recyclic-staging -f docker-compose.staging.yml --env-file .env.staging logs -f api

# PRODUCTION
docker compose -p recyclic-prod -f docker-compose.prod.yml --env-file .env.production logs -f
docker compose -p recyclic-prod -f docker-compose.prod.yml --env-file .env.production logs -f api
```

### Backup de la Base de Données

#### Backup Automatique (Story B46-P4)

Le service de backup automatique s'exécute quotidiennement à 2h00 (configurable via `BACKUP_TIME`).

**Activation :**
- ✅ **Automatique** : Activé automatiquement par `deploy-prod.sh` et `deploy-staging.sh`
- 🔧 **Manuelle** : `docker compose -f docker-compose.backup.yml -p recyclic-prod --env-file .env.production --profile backup up -d postgres-backup`

**Vérification :**
```bash
# Vérifier que le service backup est actif
docker compose -f docker-compose.backup.yml -p recyclic-prod --profile backup ps

# Voir les logs du service backup
docker compose -f docker-compose.backup.yml -p recyclic-prod --profile backup logs -f postgres-backup

# Vérifier les backups créés
ls -lh ./backups/
```

**Documentation complète :** Voir [`docs/runbooks/database-backup-automation.md`](../runbooks/database-backup-automation.md)

#### Backup Manuel

```bash
# Utiliser le script automatisé
bash scripts/backup-database.sh staging
bash scripts/backup-database.sh prod

# Backups stockés dans ./backups/
# Rétention : 7 jours automatique
```

---

## 🛠️ Outils de Validation

### Scripts Disponibles

| Script | Utilité | Quand |
|--------|---------|-------|
| `scripts/pre-deployment-check.sh` | Valide l'environnement avant déploiement | Avant chaque déploiement |
| `scripts/backup-database.sh` | Backup vérifié avec checksum | Avant modif production |
| `scripts/validate-traefik.sh` | Valide routage Traefik | Après déploiement |

### Exemple d'Utilisation

```bash
# Avant de déployer en staging
bash scripts/pre-deployment-check.sh staging
# ✅ Tous les checks doivent passer

# Créer un backup
bash scripts/backup-database.sh staging
# ✅ Vérifie que le backup existe

# Après déploiement
bash scripts/validate-traefik.sh staging
# ✅ Vérifie que Traefik route correctement
```

---

## 🆘 Dépannage Rapide

### Service ne démarre pas

```bash
# Vérifier les logs
docker compose -p recyclic-prod -f docker-compose.prod.yml logs api

# Vérifier l'état
docker compose -p recyclic-prod -f docker-compose.prod.yml ps

# Redémarrer
docker compose -p recyclic-prod -f docker-compose.prod.yml restart api
```

### Erreur de connexion base de données

```bash
# Vérifier PostgreSQL
docker compose -p recyclic-prod -f docker-compose.prod.yml ps postgres

# Vérifier les variables
docker compose -p recyclic-prod -f docker-compose.prod.yml exec api env | grep DATABASE_URL
```

### Traefik ne route pas

```bash
# Vérifier le réseau
docker network inspect traefik-public

# Valider avec le script
bash scripts/validate-traefik.sh prod

# Vérifier les labels
docker inspect <container-id> | grep traefik
```

---

## 📚 Documentation Complète

### Pour Aller Plus Loin

- 📖 **Runbook Ops Complet** : [deployment-independent-stacks.md](../runbooks/deployment-independent-stacks.md)
  - Procédure complète de déploiement production
  - Validation en phases
  - Rollback
  - Résolution de problèmes avancée

- 🏗️ **Architecture** : [docs/architecture/architecture.md](../architecture/architecture.md)
  - Vue d'ensemble technique
  - Stack technologique
  - Diagrammes

- 🧪 **Tests** : [docs/testing-strategy.md](../testing-strategy.md)
  - Stratégie de test
  - Comment lancer les tests

---

## ⚙️ Configuration Technique Importante

### ALLOWED_HOSTS et Healthchecks

Le middleware `TrustedHostMiddleware` de FastAPI valide les requêtes par leur header `Host`.

**Comportement automatique** (implémenté dans `api/src/recyclic_api/main.py`) :
- En **développement** : tous les hosts sont autorisés (`allowed_hosts=["*"]`)
- En **staging/prod** : `ALLOWED_HOSTS` est lu depuis `.env`
- **`localhost` et `127.0.0.1` sont TOUJOURS ajoutés automatiquement** pour les healthchecks Docker

```python
# Code automatique dans main.py
for internal_host in ["localhost", "127.0.0.1"]:
    if internal_host not in allowed_hosts:
        allowed_hosts.append(internal_host)
```

**Donc dans `.env.staging` ou `.env.production`, vous pouvez simplement mettre :**

```bash
ALLOWED_HOSTS=recyclic.jarvos.eu
# localhost est ajouté automatiquement, pas besoin de le mettre !
```

### Structure des Volumes Docker Compose

Avec l'option `-p` (project name), Docker Compose préfixe automatiquement les volumes :

| Déclaration | Nom réel créé | Commande |
|-------------|---------------|----------|
| `staging_postgres_data` | `recyclic-staging_staging_postgres_data` | `-p recyclic-staging` |
| `prod_postgres_data` | `recyclic-prod_prod_postgres_data` | `-p recyclic-prod` |
| `postgres_data` (dev) | `recyclic_postgres_data` | par défaut |

**Conséquence pratique :**
- Isolation totale entre environnements
- Pas de conflit de noms
- Pour voir les volumes : `docker volume ls | grep recyclic`

### Volume de Backups (`./backups:/backups`)

**⚠️ IMPORTANT :** Le service `api` monte le volume `./backups:/backups` pour stocker les sauvegardes automatiques créées avant les imports de base de données (Story B46-P2).

**Configuration requise sur le serveur VPS (staging et production) :**

```bash
# 1. Créer le dossier backups à la racine du projet
cd /opt/recyclic  # Ou le chemin de votre projet
mkdir -p ./backups

# 2. Définir les permissions appropriées (lecture/écriture pour l'utilisateur Docker)
chmod 755 ./backups

# 3. Vérifier que le dossier existe et est accessible
ls -ld ./backups
# Doit afficher : drwxr-xr-x ... ./backups
```

**Configuration dans docker-compose :**

Le volume est déjà configuré dans les 3 fichiers docker-compose :
- `docker-compose.yml` (dev) : `volumes: - ./backups:/backups`
- `docker-compose.staging.yml` (staging) : `volumes: - ./backups:/backups`
- `docker-compose.prod.yml` (production) : `volumes: - ./backups:/backups`

**Utilisation :**

Les backups automatiques créés avant les imports de base de données sont stockés dans `/backups` (dans le conteneur) qui correspond à `./backups` sur le serveur hôte. Les fichiers sont nommés `pre_restore_YYYYMMDD_HHMMSS.dump` (format binaire PostgreSQL).

**Vérification après déploiement :**

```bash
# Vérifier que le volume est bien monté
docker compose -p recyclic-prod -f docker-compose.prod.yml exec api ls -la /backups

# Vérifier depuis l'hôte
ls -lh ./backups/
```

### Restauration de Base de Données

**Méthode recommandée : Dump SQL**

```bash
# Créer un dump
docker exec recyclic-prod-postgres pg_dump -U recyclic -d recyclic > backup.sql

# Restaurer dans une nouvelle base
docker cp backup.sql recyclic-prod-postgres:/tmp/restore.sql
docker exec recyclic-prod-postgres psql -U recyclic -d recyclic -f /tmp/restore.sql
```

⚠️ **Ne PAS copier directement les volumes PostgreSQL** entre environnements différents, risque de corruption (identifiants système différents).

---

## 🔄 Migration depuis l'Ancienne Architecture

Si vous utilisez encore l'ancienne architecture avec profiles (`--profile staging`, `--profile prod`), consultez le runbook pour la procédure de migration sécurisée.

**→ [Section Migration du Runbook](../runbooks/deployment-independent-stacks.md#procédure-de-déploiement-sécurisée)**

---

## 📞 Support

- 📄 **Logs** : `docker compose logs -f`
- 📖 **API Docs** : `http://localhost:8000/docs` (dev)
- 🐛 **Issues** : Créer une issue sur le repository
- 👥 **Équipe** : Contacter l'équipe de développement

---

**Dernière mise à jour** : 2025-10-16
**Version du guide** : 2.1
**Architecture** : Stacks Indépendantes (Epic B31)
**Nouveautés v2.1** : Migrations automatiques, ALLOWED_HOSTS auto-config, requirements-migrations optimisés
