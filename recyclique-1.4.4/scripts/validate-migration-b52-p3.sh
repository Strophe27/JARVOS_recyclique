#!/bin/bash
# Script de validation de la migration B52-P3
# À exécuter AVANT et APRÈS l'application de la migration en staging/production

set -e

echo "=========================================="
echo "VALIDATION MIGRATION B52-P3: sale_date"
echo "=========================================="
echo ""

# Couleurs pour output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour exécuter une requête SQL
run_sql() {
    docker-compose exec -T postgres psql -U recyclic -d recyclic -c "$1"
}

# Fonction pour vérifier une condition
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1"
        return 1
    fi
}

echo "1. Vérification de la version Alembic actuelle..."
CURRENT_VERSION=$(run_sql "SELECT version_num FROM alembic_version;" | grep -v "version_num" | grep -v "---" | grep -v "row" | tr -d ' ' | head -1)
echo "   Version actuelle: $CURRENT_VERSION"
echo ""

echo "2. Vérification de l'existence de la colonne sale_date..."
COLUMN_EXISTS=$(run_sql "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'sale_date';" | grep -v "count" | grep -v "---" | grep -v "row" | tr -d ' ')
if [ "$COLUMN_EXISTS" = "1" ]; then
    echo -e "${GREEN}✓${NC} Colonne sale_date existe"
    COLUMN_EXISTS_BOOL=true
else
    echo -e "${YELLOW}⚠${NC} Colonne sale_date n'existe pas encore (normal avant migration)"
    COLUMN_EXISTS_BOOL=false
fi
echo ""

if [ "$COLUMN_EXISTS_BOOL" = "true" ]; then
    echo "3. Vérification des données (POST-MIGRATION)..."
    echo ""
    
    echo "   a) Nombre total de ventes:"
    TOTAL=$(run_sql "SELECT COUNT(*) FROM sales;" | grep -v "count" | grep -v "---" | grep -v "row" | tr -d ' ')
    echo "      Total: $TOTAL"
    
    echo "   b) Ventes avec sale_date:"
    WITH_DATE=$(run_sql "SELECT COUNT(sale_date) FROM sales;" | grep -v "count" | grep -v "---" | grep -v "row" | tr -d ' ')
    echo "      Avec sale_date: $WITH_DATE"
    
    echo "   c) Ventes avec sale_date = created_at:"
    MATCHING=$(run_sql "SELECT COUNT(*) FROM sales WHERE sale_date = created_at;" | grep -v "count" | grep -v "---" | grep -v "row" | tr -d ' ')
    echo "      Matching: $MATCHING"
    
    echo "   d) Ventes avec sale_date NULL:"
    NULL_COUNT=$(run_sql "SELECT COUNT(*) FROM sales WHERE sale_date IS NULL;" | grep -v "count" | grep -v "---" | grep -v "row" | tr -d ' ')
    echo "      NULL: $NULL_COUNT"
    echo ""
    
    # Validations
    if [ "$TOTAL" = "$WITH_DATE" ]; then
        echo -e "${GREEN}✓${NC} Toutes les ventes ont sale_date"
    else
        echo -e "${RED}✗${NC} ERREUR: $((TOTAL - WITH_DATE)) ventes sans sale_date"
        exit 1
    fi
    
    if [ "$NULL_COUNT" = "0" ]; then
        echo -e "${GREEN}✓${NC} Aucune vente avec sale_date NULL"
    else
        echo -e "${YELLOW}⚠${NC} $NULL_COUNT ventes avec sale_date NULL (peut être normal si nouvelles ventes créées)"
    fi
    
    echo ""
    echo "4. Vérification du type de colonne..."
    COLUMN_TYPE=$(run_sql "SELECT data_type FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'sale_date';" | grep -v "data_type" | grep -v "---" | grep -v "row" | tr -d ' ')
    if [ "$COLUMN_TYPE" = "timestampwithtimezone" ]; then
        echo -e "${GREEN}✓${NC} Type correct: timestamp with time zone"
    else
        echo -e "${RED}✗${NC} ERREUR: Type incorrect: $COLUMN_TYPE"
        exit 1
    fi
    echo ""
    
    echo "5. Vérification nullable..."
    IS_NULLABLE=$(run_sql "SELECT is_nullable FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'sale_date';" | grep -v "is_nullable" | grep -v "---" | grep -v "row" | tr -d ' ')
    if [ "$IS_NULLABLE" = "YES" ]; then
        echo -e "${GREEN}✓${NC} Colonne nullable (correct)"
    else
        echo -e "${YELLOW}⚠${NC} Colonne NOT NULL (peut causer des problèmes)"
    fi
    echo ""
    
else
    echo "3. Migration pas encore appliquée - Vérifications pré-migration..."
    echo ""
    echo "   a) Nombre total de ventes:"
    TOTAL=$(run_sql "SELECT COUNT(*) FROM sales;" | grep -v "count" | grep -v "---" | grep -v "row" | tr -d ' ')
    echo "      Total: $TOTAL"
    echo ""
    echo -e "${YELLOW}⚠${NC} Appliquer la migration avec: docker-compose run --rm api-migrations alembic upgrade head"
    echo ""
fi

echo "=========================================="
if [ "$COLUMN_EXISTS_BOOL" = "true" ]; then
    echo -e "${GREEN}✓✓✓ VALIDATION POST-MIGRATION RÉUSSIE ✓✓✓${NC}"
else
    echo -e "${YELLOW}⚠ Migration pas encore appliquée${NC}"
fi
echo "=========================================="



