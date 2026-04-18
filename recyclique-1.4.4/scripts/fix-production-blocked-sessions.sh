#!/bin/bash
# Script de correction pour les sessions différées bloquées en production
# Usage: ./scripts/fix-production-blocked-sessions.sh [--dry-run] [--delete-empty]

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Options
DRY_RUN=false
DELETE_EMPTY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --delete-empty)
      DELETE_EMPTY=true
      shift
      ;;
    *)
      echo "Usage: $0 [--dry-run] [--delete-empty]"
      exit 1
      ;;
  esac
done

echo "=========================================="
echo "Correction Sessions Différées Bloquées"
echo "=========================================="
echo "Mode: $([ "$DRY_RUN" = true ] && echo "DRY-RUN (simulation)" || echo "EXÉCUTION RÉELLE")"
echo "Supprimer sessions vides: $([ "$DELETE_EMPTY" = true ] && echo "Oui" || echo "Non")"
echo ""

# Vérifier que docker-compose est disponible
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Erreur: docker-compose n'est pas installé${NC}"
    exit 1
fi

# Vérifier que les conteneurs sont en cours d'exécution
if ! docker-compose ps | grep -q "postgres.*Up"; then
    echo -e "${RED}Erreur: Le conteneur postgres n'est pas en cours d'exécution${NC}"
    exit 1
fi

# Créer le script SQL temporaire
SQL_SCRIPT="/tmp/fix_blocked_sessions_$$.sql"

cat > "$SQL_SCRIPT" << 'EOF'
-- Script de correction des sessions différées bloquées
-- Ferme ou supprime les sessions différées ouvertes

DO $$
DECLARE
    session_record RECORD;
    sales_count INTEGER;
    items_count INTEGER;
    is_empty BOOLEAN;
    total_donations NUMERIC;
    theoretical_amount NUMERIC;
    fixed_count INTEGER := 0;
    deleted_count INTEGER := 0;
BEGIN
    -- Parcourir toutes les sessions différées ouvertes
    FOR session_record IN 
        SELECT id, opened_at, register_id, operator_id, initial_amount, 
               current_amount, total_sales, total_items
        FROM cash_sessions 
        WHERE status = 'OPEN' 
          AND opened_at < NOW()
    LOOP
        -- Compter les ventes et articles réels
        SELECT COUNT(*) INTO sales_count
        FROM sales 
        WHERE cash_session_id = session_record.id;
        
        SELECT COUNT(*) INTO items_count
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE s.cash_session_id = session_record.id;
        
        -- Vérifier si la session est vide
        is_empty := (session_record.total_sales IS NULL OR session_record.total_sales = 0)
                 AND (session_record.total_items IS NULL OR session_record.total_items = 0)
                 AND sales_count = 0;
        
        IF is_empty THEN
            -- Session vide : supprimer ou fermer selon l'option
            -- Note: La suppression en cascade des ventes est gérée par la base
            DELETE FROM cash_sessions WHERE id = session_record.id;
            deleted_count := deleted_count + 1;
            RAISE NOTICE 'Session % supprimée (vide)', session_record.id;
        ELSE
            -- Session avec transactions : fermer avec montant théorique
            -- Calculer le total des dons
            SELECT COALESCE(SUM(donation), 0) INTO total_donations
            FROM sales
            WHERE cash_session_id = session_record.id;
            
            -- Calculer le montant théorique
            theoretical_amount := COALESCE(session_record.initial_amount, 0) 
                                + COALESCE(session_record.total_sales, 0) 
                                + COALESCE(total_donations, 0);
            
            -- Fermer la session
            UPDATE cash_sessions
            SET status = 'CLOSED',
                closed_at = NOW(),
                variance = 0,
                variance_comment = 'Fermeture automatique - session différée bloquée'
            WHERE id = session_record.id;
            
            fixed_count := fixed_count + 1;
            RAISE NOTICE 'Session % fermée (montant théorique: %)', session_record.id, theoretical_amount;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Résumé: % sessions fermées, % sessions supprimées', fixed_count, deleted_count;
END $$;
EOF

# Copier le script dans le conteneur
CONTAINER_ID=$(docker-compose ps -q postgres)
if [ -z "$CONTAINER_ID" ]; then
    echo -e "${RED}Erreur: Impossible de trouver le conteneur postgres${NC}"
    exit 1
fi

docker cp "$SQL_SCRIPT" "$CONTAINER_ID:/tmp/fix_blocked_sessions.sql"

# Afficher d'abord les sessions qui seront affectées
echo -e "${YELLOW}Vérification des sessions bloquées...${NC}"
docker-compose exec -T postgres psql -U recyclic -d recyclic -c "
SELECT 
    id, 
    opened_at, 
    status,
    (SELECT COUNT(*) FROM sales WHERE cash_session_id = cash_sessions.id) as sales_count,
    (SELECT COUNT(*) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.cash_session_id = cash_sessions.id) as items_count
FROM cash_sessions 
WHERE status = 'OPEN' 
  AND opened_at < NOW()
ORDER BY opened_at;
"

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}Mode DRY-RUN: Aucune modification ne sera effectuée${NC}"
    echo "Pour appliquer les corrections, relancez sans --dry-run"
else
    echo -e "${YELLOW}Application des corrections...${NC}"
    docker-compose exec -T postgres psql -U recyclic -d recyclic -f /tmp/fix_blocked_sessions.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Corrections appliquées avec succès${NC}"
    else
        echo -e "${RED}❌ Erreur lors de l'application des corrections${NC}"
        exit 1
    fi
    
    # Vérifier qu'il n'y a plus de sessions bloquées
    echo -e "${YELLOW}Vérification finale...${NC}"
    REMAINING=$(docker-compose exec -T postgres psql -U recyclic -d recyclic -t -c "
        SELECT COUNT(*) 
        FROM cash_sessions 
        WHERE status = 'OPEN' 
          AND opened_at < NOW();
    " | tr -d ' ')
    
    if [ "$REMAINING" = "0" ]; then
        echo -e "${GREEN}✅ Aucune session bloquée restante${NC}"
    else
        echo -e "${YELLOW}⚠️  Il reste $REMAINING session(s) bloquée(s)${NC}"
    fi
fi

# Nettoyer
rm -f "$SQL_SCRIPT"
docker-compose exec -T postgres rm -f /tmp/fix_blocked_sessions.sql

echo ""
echo "=========================================="
echo "Correction terminée"
echo "=========================================="
