# Guide d'Installation et Configuration de la Sauvegarde Automatisée

**Auteur:** James (Dev Agent)  
**Date:** 2025-01-27  
**Version:** 1.0  
**Objectif:** Guide complet pour installer et configurer le système de sauvegarde automatisée Recyclic

---

## 📋 Vue d'Ensemble

Ce guide vous accompagne dans l'installation et la configuration du système de sauvegarde automatisée pour Recyclic. Le système comprend :

- **Sauvegarde quotidienne** de la base de données PostgreSQL
- **Compression** et **chiffrement** des sauvegardes
- **Envoi automatique** vers un stockage externe sécurisé
- **Politique de rétention** configurable
- **Notifications** en cas de succès ou d'échec
- **Procédure de restauration** documentée

---

## 🚀 Installation Rapide

### Prérequis
- Serveur Linux (Ubuntu 20.04+ recommandé)
- Docker et Docker Compose installés
- Accès root/administrateur
- Serveur de stockage externe (SFTP/SCP)

### Installation en 3 étapes

```bash
# 1. Copier les scripts
cp scripts/backup.sh /usr/local/bin/
cp scripts/setup-backup-cron.sh /usr/local/bin/
cp scripts/test-backup.sh /usr/local/bin/

# 2. Configurer les permissions
chmod +x /usr/local/bin/backup.sh
chmod +x /usr/local/bin/setup-backup-cron.sh
chmod +x /usr/local/bin/test-backup.sh

# 3. Configurer et installer
cd /path/to/recyclic
./scripts/setup-backup-cron.sh
```

---

## ⚙️ Configuration Détaillée

### Étape 1: Configuration des Variables d'Environnement

Créez le fichier de configuration :

```bash
# Copier le fichier d'exemple
cp scripts/backup.env.example .env.backup

# Éditer la configuration
nano .env.backup
```

**Configuration minimale requise :**

```bash
# Base de données PostgreSQL
POSTGRES_PASSWORD=your_secure_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=recyclic
POSTGRES_USER=recyclic

# Stockage externe (optionnel mais recommandé)
BACKUP_REMOTE_HOST=your-backup-server.com
BACKUP_REMOTE_USER=backup_user
BACKUP_REMOTE_PATH=/backups/recyclic
BACKUP_RETENTION_DAYS=7

# Notifications (optionnel)
NOTIFICATION_EMAIL=admin@yourcompany.com
NOTIFICATION_WEBHOOK_URL=
```

### Étape 2: Configuration du Stockage Externe

#### Option A: Serveur SFTP/SCP (Recommandé)

```bash
# 1. Créer un utilisateur dédié sur le serveur de sauvegarde
sudo useradd -m -s /bin/bash backup_user
sudo mkdir -p /home/backup_user/backups/recyclic
sudo chown -R backup_user:backup_user /home/backup_user/backups

# 2. Configurer l'authentification par clé SSH
ssh-keygen -t rsa -b 4096 -f ~/.ssh/backup_key
ssh-copy-id -i ~/.ssh/backup_key.pub backup_user@your-backup-server.com

# 3. Tester la connexion
ssh -i ~/.ssh/backup_key backup_user@your-backup-server.com "ls -la"
```

#### Option B: Amazon S3 (Avancé)

```bash
# Installer AWS CLI
sudo apt-get install awscli

# Configurer les credentials
aws configure

# Modifier le script pour utiliser S3
# (Voir section "Personnalisation Avancée")
```

### Étape 3: Installation du Cron Job

```bash
# Exécuter le script d'installation
./scripts/setup-backup-cron.sh

# Vérifier l'installation
crontab -l | grep recyclic
```

**Résultat attendu :**
```
0 2 * * * cd /path/to/recyclic && /usr/local/bin/backup.sh >> /path/to/recyclic/logs/backup_cron.log 2>&1
```

### Étape 4: Test de la Configuration

```bash
# Exécuter le test complet
./scripts/test-backup.sh

# Vérifier les logs
tail -f logs/backup_*.log
```

---

## 🔧 Configuration Avancée

### Personnalisation des Horaires

Pour modifier l'heure de sauvegarde :

```bash
# Éditer le script setup-backup-cron.sh
nano scripts/setup-backup-cron.sh

# Modifier ces variables :
BACKUP_TIME="3"      # 3h du matin
BACKUP_MINUTE="30"   # 30 minutes

# Réinstaller le cron job
./scripts/setup-backup-cron.sh
```

### Configuration de Notifications

#### Notifications Email

```bash
# Installer mailutils
sudo apt-get install mailutils

# Configurer Postfix (optionnel)
sudo dpkg-reconfigure postfix

# Tester l'envoi d'email
echo "Test" | mail -s "Test Recyclic" admin@yourcompany.com
```

#### Notifications messageres (legacy, non recommandé)

> **2026-03** : l’API Recyclic ne s’appuie plus sur d’anciennes variables d’alerte messageres pour les notifications sortantes. Préférer **email** (voir `docs/architecture/rollback-notifications-config.md`) ou votre outil de supervision.

```bash
# Ne pas introduire de variables d’alerte messageres sur les nouvelles stacks.
```

### Chiffrement des Sauvegardes

Pour chiffrer les sauvegardes avant envoi :

```bash
# Installer GPG
sudo apt-get install gnupg

# Générer une paire de clés
gpg --gen-key

# Modifier le script backup.sh pour ajouter le chiffrement
# (Voir section "Personnalisation du Script")
```

---

## 📊 Monitoring et Maintenance

### Vérification des Sauvegardes

```bash
# Vérifier les sauvegardes locales
ls -la backups/

# Vérifier les sauvegardes distantes
ssh backup_user@your-backup-server.com "ls -la /backups/recyclic/"

# Vérifier les logs
tail -f logs/backup_*.log
```

### Maintenance des Logs

```bash
# Nettoyer les anciens logs (garder 30 jours)
find logs/ -name "backup_*.log" -mtime +30 -delete

# Rotation automatique des logs
sudo nano /etc/logrotate.d/recyclic-backup
```

**Contenu de `/etc/logrotate.d/recyclic-backup` :**
```
/path/to/recyclic/logs/backup_*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 recyclic recyclic
}
```

### Surveillance des Espaces Disques

```bash
# Vérifier l'espace disque
df -h

# Surveiller la taille des sauvegardes
du -sh backups/
du -sh logs/
```

---

## 🚨 Dépannage

### Problèmes Courants

#### Erreur: "pg_dump: command not found"
```bash
# Solution: Installer PostgreSQL client
sudo apt-get install postgresql-client
```

#### Erreur: "Permission denied"
```bash
# Solution: Vérifier les permissions
chmod +x /usr/local/bin/backup.sh
chown recyclic:recyclic /usr/local/bin/backup.sh
```

#### Erreur: "Connection refused" (SSH)
```bash
# Solution: Vérifier la connexion SSH
ssh -v backup_user@your-backup-server.com

# Vérifier les clés SSH
ssh-add -l
```

#### Erreur: "No space left on device"
```bash
# Solution: Nettoyer l'espace disque
sudo apt-get autoremove
sudo apt-get autoclean
find /tmp -type f -mtime +7 -delete
```

### Logs de Diagnostic

```bash
# Logs du cron job
tail -f logs/backup_cron.log

# Logs système
sudo journalctl -u cron -f

# Logs Docker
docker-compose logs postgres
```

---

## 🔄 Procédure de Mise à Jour

### Mise à Jour du Script

```bash
# 1. Arrêter le cron job temporairement
crontab -l | grep -v recyclic | crontab -

# 2. Mettre à jour le script
cp new_backup.sh /usr/local/bin/backup.sh
chmod +x /usr/local/bin/backup.sh

# 3. Tester la nouvelle version
./scripts/test-backup.sh

# 4. Réinstaller le cron job
./scripts/setup-backup-cron.sh
```

### Migration des Sauvegardes

```bash
# Si changement de serveur de sauvegarde
# 1. Copier les sauvegardes existantes
rsync -avz backup_user@old-server:/backups/recyclic/ backup_user@new-server:/backups/recyclic/

# 2. Mettre à jour la configuration
# 3. Tester la nouvelle configuration
```

---

## 📚 Références et Ressources

### Documentation Technique
- [Script de sauvegarde](../scripts/backup.sh)
- [Procédure de restauration](../runbooks/database-restore.md)
- [Architecture du système](../architecture/architecture.md)

### Outils et Utilitaires
- [Test de sauvegarde](../scripts/test-backup.sh)
- [Configuration cron](../scripts/setup-backup-cron.sh)
- [Variables d'environnement](../scripts/backup.env.example)

### Support et Maintenance
- **Logs:** `logs/backup_*.log`
- **Sauvegardes:** `backups/`
- **Configuration:** `.env.backup`

---

## ✅ Checklist de Validation

### Installation
- [ ] Scripts copiés et exécutables
- [ ] Variables d'environnement configurées
- [ ] Cron job installé et fonctionnel
- [ ] Test de sauvegarde réussi

### Configuration
- [ ] Stockage externe accessible
- [ ] Notifications configurées
- [ ] Politique de rétention active
- [ ] Logs de monitoring opérationnels

### Sécurité
- [ ] Mots de passe sécurisés
- [ ] Clés SSH configurées
- [ ] Permissions restrictives
- [ ] Sauvegardes chiffrées (optionnel)

### Maintenance
- [ ] Rotation des logs configurée
- [ ] Surveillance de l'espace disque
- [ ] Procédure de restauration testée
- [ ] Documentation à jour

---

**🎉 Félicitations !** Votre système de sauvegarde automatisée Recyclic est maintenant opérationnel et sécurisé.


