#!/bin/bash

# Script de validation complète du système de sauvegarde
# Auteur: James (Dev Agent)
# Date: 2025-01-27

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VALIDATION_LOG="$PROJECT_ROOT/logs/backup_validation_$(date +%Y%m%d_%H%M%S).log"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Compteurs
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$VALIDATION_LOG"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$VALIDATION_LOG"
    ((PASSED_TESTS++))
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$VALIDATION_LOG"
    ((FAILED_TESTS++))
}

warn() {
    echo -e "${YELLOW}⚠️ $1${NC}" | tee -a "$VALIDATION_LOG"
}

test_item() {
    local test_name="$1"
    local test_command="$2"
    
    ((TOTAL_TESTS++))
    log "Test: $test_name"
    
    if eval "$test_command" >/dev/null 2>&1; then
        success "$test_name"
        return 0
    else
        error "$test_name"
        return 1
    fi
}

# Tests de base
test_basic_requirements() {
    log "=== Tests des Prérequis de Base ==="
    
    test_item "Docker installé et fonctionnel" "docker --version"
    test_item "Docker Compose installé" "docker-compose --version"
    test_item "PostgreSQL client installé" "pg_dump --version"
    test_item "Scripts de sauvegarde présents" "[ -f scripts/backup.sh ]"
    test_item "Scripts exécutables" "[ -x scripts/backup.sh ]"
    test_item "Répertoire logs existe" "[ -d logs ]"
    test_item "Répertoire backups existe" "[ -d backups ]"
}

# Tests de configuration
test_configuration() {
    log "=== Tests de Configuration ==="
    
    # Vérifier les variables d'environnement
    if [ -f ".env" ]; then
        test_item "Fichier .env présent" "true"
        
        # Vérifier les variables critiques
        if grep -q "POSTGRES_PASSWORD" .env; then
            success "POSTGRES_PASSWORD configuré"
        else
            error "POSTGRES_PASSWORD manquant dans .env"
        fi
        
        if grep -q "BACKUP_REMOTE_HOST" .env; then
            success "BACKUP_REMOTE_HOST configuré"
        else
            warn "BACKUP_REMOTE_HOST non configuré (stockage local uniquement)"
        fi
    else
        error "Fichier .env manquant"
    fi
}

# Tests de connectivité
test_connectivity() {
    log "=== Tests de Connectivité ==="
    
    # Vérifier que les services Docker sont démarrés
    if docker-compose ps | grep -q "Up"; then
        success "Services Docker démarrés"
        
        # Tester la connexion PostgreSQL
        if docker-compose exec -T postgres pg_isready -U recyclic >/dev/null 2>&1; then
            success "PostgreSQL accessible"
        else
            error "PostgreSQL non accessible"
        fi
    else
        error "Services Docker non démarrés"
    fi
}

# Tests de sauvegarde
test_backup_functionality() {
    log "=== Tests de Fonctionnalité de Sauvegarde ==="
    
    # Test de création de sauvegarde
    local test_backup_dir="$PROJECT_ROOT/test_validation_backup"
    mkdir -p "$test_backup_dir"
    
    # Modifier temporairement le script pour utiliser le répertoire de test
    local test_script="$SCRIPT_DIR/backup_validation_test.sh"
    cp "$SCRIPT_DIR/backup.sh" "$test_script"
    
    # Modifier les chemins
    sed -i "s|BACKUP_DIR=\"\$.*\"|BACKUP_DIR=\"$test_backup_dir\"|g" "$test_script"
    sed -i "s|LOG_DIR=\"\$.*\"|LOG_DIR=\"$PROJECT_ROOT/logs\"|g" "$test_script"
    
    # Charger les variables d'environnement
    if [ -f ".env" ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
    
    # Exécuter le test de sauvegarde
    if bash "$test_script" >/dev/null 2>&1; then
        success "Script de sauvegarde exécutable"
        
        # Vérifier qu'un fichier de sauvegarde a été créé
        if find "$test_backup_dir" -name "recyclic_backup_*.dump" -type f | head -1 | grep -q .; then
            success "Fichier de sauvegarde créé"
            
            # Vérifier l'intégrité
            local backup_file=$(find "$test_backup_dir" -name "recyclic_backup_*.dump" -type f | head -1)
            if docker-compose exec -T postgres pg_restore --list /dev/stdin < "$backup_file" >/dev/null 2>&1; then
                success "Intégrité de la sauvegarde validée"
            else
                error "Sauvegarde corrompue"
            fi
        else
            error "Aucun fichier de sauvegarde créé"
        fi
    else
        error "Échec de l'exécution du script de sauvegarde"
    fi
    
    # Nettoyer
    rm -rf "$test_backup_dir" "$test_script"
}

# Tests de cron job
test_cron_job() {
    log "=== Tests du Cron Job ==="
    
    if crontab -l 2>/dev/null | grep -q "recyclic_backup"; then
        success "Cron job installé"
        
        # Vérifier la syntaxe du cron job
        local cron_line=$(crontab -l | grep "recyclic_backup")
        if echo "$cron_line" | grep -q "0 2 \* \* \*"; then
            success "Cron job configuré pour 2h du matin"
        else
            warn "Cron job configuré à une heure différente"
        fi
    else
        error "Cron job non installé"
    fi
}

# Tests de stockage externe (si configuré)
test_external_storage() {
    log "=== Tests de Stockage Externe ==="
    
    if [ -n "${BACKUP_REMOTE_HOST:-}" ] && [ -n "${BACKUP_REMOTE_USER:-}" ]; then
        # Tester la connexion SSH
        if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$BACKUP_REMOTE_USER@$BACKUP_REMOTE_HOST" "echo 'test'" >/dev/null 2>&1; then
            success "Connexion SSH au serveur de sauvegarde"
        else
            error "Impossible de se connecter au serveur de sauvegarde"
        fi
        
        # Vérifier l'espace disque sur le serveur distant
        local remote_space=$(ssh -o StrictHostKeyChecking=no "$BACKUP_REMOTE_USER@$BACKUP_REMOTE_HOST" "df -h $BACKUP_REMOTE_PATH" 2>/dev/null | tail -1 | awk '{print $4}')
        if [ -n "$remote_space" ]; then
            success "Espace disque distant disponible: $remote_space"
        else
            warn "Impossible de vérifier l'espace disque distant"
        fi
    else
        warn "Stockage externe non configuré"
    fi
}

# Tests de notifications
test_notifications() {
    log "=== Tests de Notifications ==="
    
    if [ -n "${NOTIFICATION_EMAIL:-}" ]; then
        if command -v mail >/dev/null 2>&1; then
            success "Système de mail configuré"
        else
            warn "Système de mail non installé"
        fi
    else
        warn "Notifications email non configurées"
    fi
}

# Tests de sécurité
test_security() {
    log "=== Tests de Sécurité ==="
    
    # Vérifier les permissions des scripts
    if [ -x "scripts/backup.sh" ]; then
        success "Script de sauvegarde exécutable"
    else
        error "Script de sauvegarde non exécutable"
    fi
    
    # Vérifier que les mots de passe ne sont pas en dur
    if grep -q "password.*=" scripts/backup.sh; then
        error "Mots de passe en dur détectés dans le script"
    else
        success "Aucun mot de passe en dur détecté"
    fi
    
    # Vérifier les permissions des fichiers de configuration
    if [ -f ".env" ]; then
        local env_perms=$(stat -c "%a" .env)
        if [ "$env_perms" = "600" ] || [ "$env_perms" = "640" ]; then
            success "Permissions .env sécurisées"
        else
            warn "Permissions .env non optimales (recommandé: 600)"
        fi
    fi
}

# Rapport final
generate_report() {
    log "=== RAPPORT DE VALIDATION ==="
    
    local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    
    echo -e "\n${BLUE}📊 RÉSULTATS DE VALIDATION${NC}"
    echo -e "Tests exécutés: $TOTAL_TESTS"
    echo -e "Tests réussis: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Tests échoués: ${RED}$FAILED_TESTS${NC}"
    echo -e "Taux de réussite: ${BLUE}$success_rate%${NC}"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 VALIDATION COMPLÈTE RÉUSSIE !${NC}"
        echo -e "Le système de sauvegarde est prêt pour la production."
    elif [ $success_rate -ge 80 ]; then
        echo -e "\n${YELLOW}⚠️ VALIDATION PARTIELLEMENT RÉUSSIE${NC}"
        echo -e "Le système fonctionne mais nécessite des ajustements."
    else
        echo -e "\n${RED}❌ VALIDATION ÉCHOUÉE${NC}"
        echo -e "Le système nécessite des corrections importantes."
    fi
    
    echo -e "\n📁 Logs détaillés: $VALIDATION_LOG"
}

# Fonction principale
main() {
    log "=== VALIDATION DU SYSTÈME DE SAUVEGARDE RECYCLIC ==="
    
    test_basic_requirements
    test_configuration
    test_connectivity
    test_backup_functionality
    test_cron_job
    test_external_storage
    test_notifications
    test_security
    
    generate_report
}

# Exécution
main "$@"


