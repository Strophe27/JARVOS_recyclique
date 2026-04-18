#!/bin/bash
# Script de test manuel pour valider le système de backup
# Usage: bash scripts/test-backup-manual.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_DIR="$PROJECT_ROOT/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="postgres_backup_${TIMESTAMP}.dump"
LOG_FILE="$LOG_DIR/backup_postgres_${TIMESTAMP}.log"

echo "=== Test de backup manuel PostgreSQL ==="
echo "Timestamp: $TIMESTAMP"
echo "Backup file: $BACKUP_FILE"
echo "Log file: $LOG_FILE"
echo ""

# Créer les répertoires si nécessaire
mkdir -p "$BACKUP_DIR" "$LOG_DIR"

# Charger les variables d'environnement (ignorer les erreurs de syntaxe)
if [ -f "$PROJECT_ROOT/.env" ]; then
    set +e
    source "$PROJECT_ROOT/.env" 2>/dev/null || true
    set -e
fi

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-recyclic}"
POSTGRES_USER="${POSTGRES_USER:-recyclic}"

# Fonction de log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Début du test de backup manuel ==="

# Vérifier que le conteneur postgres est en cours d'exécution
if ! docker-compose ps postgres | grep -q "Up"; then
    log "ERROR: Le conteneur postgres n'est pas en cours d'exécution"
    exit 1
fi

log "Conteneur postgres vérifié"

# Créer le backup depuis le conteneur
log "Création du backup..."
if docker-compose exec -T postgres bash -c "
    export PGPASSWORD=\$POSTGRES_PASSWORD
    pg_dump -h localhost -U $POSTGRES_USER -d $POSTGRES_DB -Fc --no-password -f /tmp/$BACKUP_FILE
    echo 'Backup créé dans le conteneur'
"; then
    log "Backup créé dans le conteneur: /tmp/$BACKUP_FILE"
else
    log "ERROR: Échec de la création du backup"
    exit 1
fi

# Copier le backup depuis le conteneur vers l'hôte
log "Copie du backup vers l'hôte..."
if docker cp "$(docker-compose ps -q postgres):/tmp/$BACKUP_FILE" "$BACKUP_DIR/$BACKUP_FILE"; then
    log "Backup copié vers: $BACKUP_DIR/$BACKUP_FILE"
    
    # Vérifier la taille du fichier
    FILE_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    log "Taille du backup: $FILE_SIZE"
    
    # Vérifier que le fichier n'est pas vide
    if [ -s "$BACKUP_DIR/$BACKUP_FILE" ]; then
        log "SUCCESS: Backup créé avec succès"
        log "Fichier: $BACKUP_DIR/$BACKUP_FILE"
        log "Taille: $FILE_SIZE"
    else
        log "ERROR: Le fichier de backup est vide"
        exit 1
    fi
else
    log "ERROR: Échec de la copie du backup"
    exit 1
fi

# Nettoyer le fichier temporaire dans le conteneur
docker-compose exec -T postgres bash -c "rm -f /tmp/$BACKUP_FILE" || true

log "=== Test de backup manuel terminé avec succès ==="
echo ""
echo "✅ Backup créé: $BACKUP_DIR/$BACKUP_FILE"
echo "📋 Log: $LOG_FILE"

