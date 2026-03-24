# Guide de Sauvegarde Automatique Base de Données - Recyclic

**Auteur:** James (Dev Agent)  
**Date:** 2025-12-03  
**Version:** 1.0  
**Objectif:** Documentation complète du système de sauvegardes automatiques PostgreSQL pour Recyclic

---

## 1. Vue d'Ensemble

Le système de sauvegarde automatique garantit la disponibilité et l'intégrité des données PostgreSQL. Il propose deux méthodes d'exécution :

1. **Service Docker** : Service dédié avec profil `backup` (recommandé pour production)
2. **Script standalone** : Script bash exécutable manuellement ou via cron (flexible)

### Caractéristiques Principales

- ✅ Sauvegarde quotidienne automatique (configurable)
- ✅ Compression automatique (gzip)
- ✅ Chiffrement optionnel (AES-256-CBC)
- ✅ Politique de rétention multi-niveaux (quotidien, hebdomadaire, mensuel)
- ✅ Logs détaillés avec statut explicite (succès/échec)
- ✅ Vérification d'intégrité des sauvegardes
- ✅ Notifications optionnelles (email, Telegram)

---

## 2. Configuration

### 2.1. Variables d'Environnement

Les variables suivantes doivent être configurées dans le fichier `.env` :

```bash
# Configuration PostgreSQL (obligatoire)
POSTGRES_HOST=localhost          # Ou 'postgres' pour service Docker
POSTGRES_PORT=5432
POSTGRES_DB=recyclic
POSTGRES_USER=recyclic
POSTGRES_PASSWORD=your_password  # OBLIGATOIRE

# Configuration Backup (optionnel)
BACKUP_COMPRESSION=true          # Compression gzip (défaut: true)
BACKUP_ENCRYPTION=false          # Chiffrement AES-256 (défaut: false)
BACKUP_ENCRYPTION_KEY=           # Clé de chiffrement (si BACKUP_ENCRYPTION=true)
RETENTION_DAILY=7                # Jours de rétention quotidienne (défaut: 7)
RETENTION_WEEKLY=4                # Semaines de rétention hebdomadaire (défaut: 4)
RETENTION_MONTHLY=12              # Mois de rétention mensuelle (défaut: 12)

# Notifications (optionnel)
NOTIFICATION_EMAIL=admin@example.com
NOTIFICATION_TELEGRAM_TOKEN=
NOTIFICATION_TELEGRAM_CHAT_ID=

# Configuration service Docker (optionnel)
BACKUP_TIME=2                    # Heure d'exécution quotidienne (défaut: 2h)
BACKUP_MINUTE=0                  # Minute d'exécution (défaut: 0)
```

### 2.2. Répertoires Requis

Les répertoires suivants doivent exister et être accessibles en écriture :

```bash
./backups/    # Stockage des fichiers de sauvegarde
./logs/       # Stockage des logs de backup
```

**Création automatique :** Les scripts créent automatiquement ces répertoires s'ils n'existent pas.

---

## 3. Méthode 1 : Service Docker (Recommandé)

### 3.1. Configuration

Le service de backup est défini dans `docker-compose.backup.yml` avec le profil `backup`.

**Fichier :** `docker-compose.backup.yml`

```yaml
services:
  postgres-backup:
    build:
      context: .
      dockerfile: Dockerfile.backup
      args:
        BACKUP_TIME: ${BACKUP_TIME:-2}
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      # ... autres variables
    volumes:
      - ./backups:/backups
      - ./logs:/logs
    profiles:
      - backup
```

### 3.2. Activation du Service

```bash
# Démarrer le service de backup (exécution unique)
docker-compose -f docker-compose.backup.yml --profile backup up -d postgres-backup

# Vérifier l'état
docker-compose -f docker-compose.backup.yml --profile backup ps

# Voir les logs
docker-compose -f docker-compose.backup.yml --profile backup logs -f postgres-backup
```

### 3.3. Fonctionnement

Le service utilise un conteneur basé sur `postgres:15-alpine` avec :
- Cron configuré pour exécuter le backup quotidiennement à l'heure configurée
- Script `backup-postgres.sh` copié dans `/scripts/`
- Volumes montés : `/backups` et `/logs`

**Note :** Le service ne redémarre pas automatiquement (`restart: "no"`). Il s'exécute une fois par jour via cron.

---

## 4. Méthode 2 : Script Standalone

### 4.1. Script Principal

**Fichier :** `scripts/backup-postgres.sh`

Le script détecte automatiquement son environnement :
- **Hôte** : Utilise `localhost` comme host PostgreSQL, chemins relatifs au projet
- **Conteneur Docker** : Utilise `postgres` comme host, chemins `/backups` et `/logs`

### 4.2. Exécution Manuelle

```bash
# Depuis l'hôte (WSL/Linux)
bash scripts/backup-postgres.sh

# Depuis le conteneur postgres
docker-compose exec postgres bash /scripts/backup-postgres.sh
```

### 4.3. Configuration Cron (Hôte)

Pour exécuter le script automatiquement via cron sur l'hôte :

```bash
# Installer le cron job
bash scripts/setup-postgres-backup-cron.sh

# Vérifier l'installation
crontab -l | grep recyclic
```

**Format cron :** `0 2 * * *` (tous les jours à 2h00)

---

## 5. Politique de Rétention

### 5.1. Stratégie Multi-Niveaux

Le système applique une politique de rétention à trois niveaux :

| Niveau | Fréquence | Rétention | Format |
|-------|-----------|-----------|--------|
| **Quotidien** | Tous les jours | 7 jours | `postgres_backup_YYYYMMDD_HHMMSS.dump` |
| **Hebdomadaire** | Dimanche | 4 semaines | `postgres_weekly_YYYYMMDD.dump` |
| **Mensuel** | 1er du mois | 12 mois | `postgres_monthly_YYYYMM.dump` |

### 5.2. Algorithme de Nettoyage

- **Quotidien** : Suppression automatique des backups > 7 jours
- **Hebdomadaire** : Création le dimanche, suppression après 4 semaines
- **Mensuel** : Création le 1er du mois, suppression après 12 mois

---

## 6. Format des Sauvegardes

### 6.1. Format de Fichier

- **Format** : PostgreSQL Custom Format (`.dump`)
- **Compression** : Gzip (optionnel, activé par défaut)
- **Extension** : `.dump` ou `.dump.gz`

### 6.2. Nommage

```
postgres_backup_YYYYMMDD_HHMMSS.dump[.gz]
```

Exemple : `postgres_backup_20251203_020000.dump.gz`

### 6.3. Emplacement

- **Hôte** : `./backups/`
- **Conteneur** : `/backups/` (monté depuis `./backups`)

---

## 7. Logs et Monitoring

### 7.1. Format des Logs

Chaque exécution génère un log dans `./logs/` avec le format :

```
backup_postgres_YYYYMMDD_HHMMSS.log
```

### 7.2. Contenu des Logs

Chaque log contient :
- Timestamp de chaque étape
- Statut des opérations (SUCCESS, ERROR, WARNING)
- Taille du fichier de backup
- Emplacement du fichier final
- Résumé de l'exécution

**Exemple de log :**
```
[2025-12-03 18:55:20] === Début de la sauvegarde PostgreSQL Recyclic ===
[2025-12-03 18:55:21] Vérification des prérequis...
[2025-12-03 18:55:21] Prérequis validés
[2025-12-03 18:55:21] Création de la sauvegarde PostgreSQL...
[2025-12-03 18:55:22] Sauvegarde PostgreSQL créée: ./backups/postgres_backup_20251203_185520.dump
[2025-12-03 18:55:22] Taille de la sauvegarde: 148K
[2025-12-03 18:55:22] Compression de la sauvegarde...
[2025-12-03 18:55:23] Sauvegarde compressée: ./backups/postgres_backup_20251203_185520.dump.gz
[2025-12-03 18:55:23] Application de la politique de rétention...
[2025-12-03 18:55:23] Politique de rétention appliquée
[2025-12-03 18:55:23] === Sauvegarde PostgreSQL terminée avec succès ===
[2025-12-03 18:55:23] Fichier final: postgres_backup_20251203_185520.dump.gz
[2025-12-03 18:55:23] Taille: 148K
[2025-12-03 18:55:23] Emplacement: ./backups/postgres_backup_20251203_185520.dump.gz
```

### 7.3. Vérification des Logs

```bash
# Voir les logs récents
ls -lt logs/backup_postgres_*.log | head -5

# Vérifier le dernier log
tail -f logs/backup_postgres_$(date +%Y%m%d)*.log

# Chercher les erreurs
grep -i error logs/backup_postgres_*.log
```

---

## 8. Procédures de Test

### 8.1. Test Manuel Rapide

```bash
# Utiliser le script de test dédié
bash scripts/test-backup-manual.sh
```

Ce script :
- ✅ Vérifie que le conteneur postgres est en cours d'exécution
- ✅ Crée un backup dans `./backups/`
- ✅ Génère un log dans `./logs/`
- ✅ Affiche le statut (succès/échec)

### 8.2. Test d'Intégrité

```bash
# Vérifier l'intégrité d'un backup
bash scripts/verify-backup.sh

# Tester la restauration (dry-run)
TEST_RESTORE=true bash scripts/verify-backup.sh
```

### 8.3. Test de Restauration Complète

Voir le guide : [`docs/runbooks/database-recovery.md`](./database-recovery.md)

---

## 9. Dépannage

### 9.1. Problèmes Courants

#### Backup ne s'exécute pas

**Symptômes :** Aucun fichier dans `./backups/`, aucun log récent

**Solutions :**
```bash
# Vérifier que le conteneur postgres est en cours d'exécution
docker-compose ps postgres

# Vérifier les variables d'environnement
docker-compose exec postgres env | grep POSTGRES

# Tester la connexion PostgreSQL
docker-compose exec postgres pg_isready -U recyclic

# Exécuter un backup manuel pour voir les erreurs
bash scripts/test-backup-manual.sh
```

#### Erreur "POSTGRES_PASSWORD n'est pas défini"

**Solution :** Vérifier que la variable est définie dans `.env` :
```bash
grep POSTGRES_PASSWORD .env
```

#### Backup vide ou corrompu

**Solution :** Vérifier l'intégrité :
```bash
# Lister le contenu du backup
docker-compose exec postgres pg_restore --list ./backups/postgres_backup_*.dump | head -20

# Tester la restauration sur une base de test
bash scripts/verify-backup.sh
```

#### Espace disque insuffisant

**Solution :** Nettoyer les anciens backups :
```bash
# Voir l'espace utilisé
du -sh ./backups/

# Supprimer les backups > 7 jours (manuellement)
find ./backups -name "postgres_backup_*.dump*" -mtime +7 -delete
```

### 9.2. Logs d'Erreur

Les erreurs sont enregistrées dans les logs avec le préfixe `ERROR:` :

```bash
# Chercher les erreurs récentes
grep -i "ERROR" logs/backup_postgres_*.log | tail -10

# Voir les warnings
grep -i "WARNING" logs/backup_postgres_*.log | tail -10
```

---

## 10. Bonnes Pratiques

### 10.1. Production

- ✅ **Activer le service Docker** avec profil `backup` pour automatisation
- ✅ **Configurer les notifications** (email ou Telegram) pour être alerté en cas d'échec
- ✅ **Vérifier quotidiennement** que les backups sont créés (automatiser avec monitoring)
- ✅ **Tester mensuellement** la restauration sur un environnement de test
- ✅ **Conserver des backups hors site** pour protection contre sinistre

### 10.2. Développement

- ✅ **Tester les backups** après chaque migration importante
- ✅ **Vérifier l'intégrité** avant les déploiements
- ✅ **Maintenir des backups manuels** avant les changements risqués

### 10.3. Monitoring

- ✅ **Surveiller l'espace disque** disponible dans `./backups/`
- ✅ **Vérifier les logs** quotidiennement pour détecter les échecs
- ✅ **Configurer des alertes** pour les backups manqués (> 25h)

---

## 11. Références

### Fichiers de Configuration

- `docker-compose.backup.yml` : Configuration du service Docker
- `Dockerfile.backup` : Image Docker pour le service de backup
- `scripts/backup-postgres.sh` : Script principal de sauvegarde
- `scripts/verify-backup.sh` : Script de vérification d'intégrité
- `scripts/setup-postgres-backup-cron.sh` : Configuration cron
- `scripts/test-backup-manual.sh` : Script de test manuel

### Documentation Associée

- [`docs/runbooks/database-recovery.md`](./database-recovery.md) : Guide de récupération
- [`docs/runbooks/database-restore.md`](./database-restore.md) : Procédure de restauration
- [`docs/architecture/architecture.md`](../architecture/architecture.md) : Architecture générale

### Stories Liées

- **B46-P2** : Import/Restauration BDD via Admin Settings (utilise les backups automatiques)
- **B46-P4** : Sauvegardes Automatiques BDD & Supervision (cette story)

---

## 12. Changelog

### Version 1.0 (2025-12-03)

- ✅ Configuration initiale du système de backup automatique
- ✅ Service Docker avec profil `backup`
- ✅ Script standalone avec détection d'environnement
- ✅ Politique de rétention multi-niveaux
- ✅ Logs détaillés avec statut explicite
- ✅ Documentation complète

---

**Dernière mise à jour :** 2025-12-03  
**Prochaine révision :** Après déploiement en production

