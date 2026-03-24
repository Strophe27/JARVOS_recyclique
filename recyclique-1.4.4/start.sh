#!/bin/bash

# Script de démarrage pour Recyclic
echo "🚀 Démarrage de Recyclic..."

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez installer Docker d'abord."
    exit 1
fi

# Préférence Docker Compose v2 (`docker compose`), repli v1 (`docker-compose`)
if docker compose version &> /dev/null; then
    dc() { docker compose "$@"; }
    DC_HINT="docker compose"
elif command -v docker-compose &> /dev/null; then
    dc() { docker-compose "$@"; }
    DC_HINT="docker-compose"
else
    echo "❌ Docker Compose introuvable. Installez le plugin « docker compose » ou le binaire « docker-compose »."
    exit 1
fi

# Vérifier si le fichier .env existe
if [ ! -f .env ]; then
    echo "📝 Création du fichier .env à partir de env.example..."
    cp env.example .env
    echo "⚠️  Veuillez configurer les variables d'environnement dans le fichier .env"
fi

# Construire et démarrer les services
echo "🔨 Construction des images Docker..."
dc build

echo "🚀 Démarrage des services..."
dc up -d

# Attendre que les services soient prêts
echo "⏳ Attente du démarrage des services..."
sleep 10

# Vérifier le statut des services
echo "🔍 Vérification du statut des services..."
dc ps

# Tester l'API
echo "🧪 Test de l'API..."
sleep 5
curl -f http://localhost:8000/health || echo "⚠️  L'API n'est pas encore prête"

echo ""
echo "✅ Recyclic est démarré !"
echo ""
echo "🌐 Services disponibles :"
echo "   • API: http://localhost:8000 (surcharge possible via API_PORT dans .env)"
echo "   • Documentation: http://localhost:8000/docs"
echo "   • Frontend: http://localhost:4444"
echo "   • PostgreSQL: localhost:5432"
echo "   • Redis: localhost:6379"
echo ""
echo "📚 Commandes utiles (compose utilisé : ${DC_HINT}) :"
echo "   • Voir les logs: ${DC_HINT} logs -f"
echo "   • Arrêter: ${DC_HINT} down"
echo "   • Redémarrer: ${DC_HINT} restart"
