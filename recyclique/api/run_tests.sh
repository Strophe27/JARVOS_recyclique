#!/bin/bash
# Script de test pour Recyclic - Stabilisation des tests
set -euo pipefail

echo "🧪 Démarrage des tests Recyclic..."
echo "=================================="

# Reset volumes
docker-compose down -v

# Start services
echo "📡 Vérification des services..."
docker-compose up -d postgres redis
sleep 10

# Generate openapi.json
docker-compose run --rm api python -c "from recyclic_api.main import app; import json; schema = app.openapi(); open('/app/openapi.json', 'w').write(json.dumps(schema, indent=2))"

# Lot consolidation 1.4.5 : sous-ensemble minimal (le service compose api-tests est désactivé).
# Créer la base recyclic_test si besoin (ignore l erreur si elle existe déjà).
docker-compose exec -T postgres psql -U recyclic -d postgres -c "CREATE DATABASE recyclic_test OWNER recyclic;" 2>/dev/null || true

docker-compose run --rm -e TESTING=true -e ENVIRONMENT=test api bash -lc "\
  cd /app && python -m pytest \
    tests/test_infrastructure.py \
    tests/test_auth_login_endpoint.py \
    tests/test_auth_logging.py \
    tests/test_auth_inactive_user_middleware.py \
    tests/test_auth_login_username_password.py \
    tests/test_admin_user_status_endpoint.py \
    tests/api/test_admin_user_management.py \
    tests/test_refresh_token_service.py \
    tests/test_refresh_token_endpoint.py \
    tests/test_context_envelope.py"

echo "✅ Tests terminés (lot pilote TEST-01 + TEST-02 admin, aligné conftest)."
echo ""
echo "📌 Le service docker compose api-tests est commenté dans docker-compose.yml ;"
echo "   ce script utilise l image api avec TESTING=true et le sous-ensemble ci-dessus."
