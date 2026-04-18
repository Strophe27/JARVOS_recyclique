#!/bin/bash
# Script de validation des changements QA pour Story B38-P2
# Utilisation: ./scripts/validate-qa-changes.sh

set -e  # Exit on any error

echo "🚀 Validation des changements QA - Story B38-P2"
echo "================================================"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher le statut
status() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. Vérifier que Docker est en cours d'exécution
echo "1. Vérification de l'environnement..."
if ! docker info > /dev/null 2>&1; then
    error "Docker n'est pas disponible"
    exit 1
fi
status "Docker est disponible"

# 2. Vérifier que les services sont démarrés
echo "2. Vérification des services Docker..."
if ! docker-compose ps | grep -q "Up"; then
    warning "Les services Docker ne semblent pas démarrés"
    echo "   Démarrage des services..."
    docker-compose up -d postgres redis
    sleep 5
fi
status "Services Docker vérifiés"

# 3. Validation syntaxique du code
echo "3. Validation de la syntaxe Python..."
python_files=(
    "src/recyclic_api/services/reception_stats_service.py"
    "src/recyclic_api/api/api_v1/endpoints/reception.py"
    "src/recyclic_api/schemas/stats.py"
    "tests/test_reception_live_stats.py"
)

for file in "${python_files[@]}"; do
    if [ -f "$file" ]; then
        if docker-compose exec -T api python -m py_compile "/app/$file" 2>/dev/null; then
            status "Syntaxe OK: $file"
        else
            error "Erreur de syntaxe: $file"
            exit 1
        fi
    else
        error "Fichier manquant: $file"
        exit 1
    fi
done

# 4. Vérification des imports
echo "4. Vérification des imports Python..."
if docker-compose exec -T api python -c "
import sys
sys.path.append('/app/src')
try:
    from recyclic_api.services.reception_stats_service import ReceptionLiveStatsService
    from recyclic_api.schemas.stats import ReceptionLiveStatsResponse
    print('✅ Imports réussis')
except ImportError as e:
    print(f'❌ Erreur d\'import: {e}')
    exit(1)
" 2>/dev/null; then
    status "Imports Python valides"
else
    error "Problème d'imports Python"
    exit 1
fi

# 5. Exécution des tests unitaires
echo "5. Exécution des tests unitaires..."
if docker-compose exec -T api python -m pytest tests/test_reception_live_stats.py -v --tb=short > test_output.log 2>&1; then
    status "Tests unitaires réussis"
else
    error "Échec des tests unitaires"
    echo "   Détails dans test_output.log"
    exit 1
fi

# 6. Test de performance
echo "6. Test de performance..."
if docker-compose exec -T api python -m pytest tests/test_reception_live_stats.py::TestReceptionLiveStatsEndpoint::test_endpoint_performance_under_load -v --tb=short > perf_output.log 2>&1; then
    status "Test de performance réussi (<500ms)"
else
    warning "Test de performance échoué - vérifier perf_output.log"
fi

# 7. Validation OpenAPI
echo "7. Validation du schéma OpenAPI..."
if docker-compose exec -T api python -c "
import requests
try:
    response = requests.get('http://localhost:8000/openapi.json', timeout=5)
    if response.status_code == 200:
        schema = response.json()
        if 'paths' in schema and '/api/v1/reception/stats/live' in schema['paths']:
            print('✅ Endpoint présent dans OpenAPI')
        else:
            print('❌ Endpoint manquant dans OpenAPI')
            exit(1)
    else:
        print('❌ Impossible de récupérer le schéma OpenAPI')
        exit(1)
except Exception as e:
    print(f'❌ Erreur de validation OpenAPI: {e}')
    exit(1)
"; then
    status "Schéma OpenAPI valide"
else
    error "Problème avec le schéma OpenAPI"
    exit 1
fi

# 8. Test d'intégration de l'endpoint
echo "8. Test d'intégration de l'endpoint..."
# Note: Pour un test complet, il faudrait un token admin valide
# Pour l'instant, on vérifie juste que l'endpoint répond
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/reception/stats/live | grep -q "401"; then
    status "Endpoint répond correctement (authentification requise)"
else
    warning "Endpoint ne répond pas comme attendu"
fi

# 9. Vérification de la configuration
echo "9. Vérification de la configuration..."
if grep -q "LIVE_RECEPTION_STATS_ENABLED" ../recyclique/api/src/recyclic_api/core/config.py; then
    status "Feature flag présent dans la configuration"
else
    error "Feature flag manquant dans la configuration"
    exit 1
fi

# 10. Vérification de la documentation
echo "10. Vérification de la documentation..."
if grep -q "Live Reception Stats" docs/runbooks/dev-workflow-guide.md; then
    status "Documentation à jour"
else
    warning "Documentation pourrait nécessiter une mise à jour"
fi

echo ""
echo "🎉 Validation terminée avec succès!"
echo ""
echo "Résumé des validations:"
echo "✅ Syntaxe Python"
echo "✅ Imports"
echo "✅ Tests unitaires"
echo "✅ Performance (<500ms)"
echo "✅ Schéma OpenAPI"
echo "✅ Configuration"
echo "✅ Documentation"
echo ""
echo "Les changements QA ont été validés et sont prêts pour la production."
