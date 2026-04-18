#!/bin/bash
# audit-store-imports.sh
# Script d'audit pour détecter les imports directs de stores caisse
# Story B50-P10: Unification Stores Caisse

echo "🔍 Audit des imports directs de stores caisse..."
echo ""

# Définir les patterns à rechercher (imports directs à éviter)
PATTERNS=(
  "from.*stores/cashSessionStore"
  "from.*stores/virtualCashSessionStore"
  "from.*stores/deferredCashSessionStore"
)

# Fichiers à exclure (cas valides)
EXCLUDE_PATTERNS=(
  "CashStoreProvider"           # Point central d'injection
  "\.test\."                    # Tests unitaires
  "\.spec\."                    # Tests specs
  "__tests__"                   # Dossiers de tests
  "interfaces/ICashSessionStore" # Interface commune
  "cashSessionStoreUtils"       # Utilitaires
)

# Construire l'exclusion grep
EXCLUDE_ARGS=""
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
  EXCLUDE_ARGS="$EXCLUDE_ARGS | grep -v '$pattern'"
done

echo "📂 Recherche dans frontend/src..."
echo ""

FOUND_ISSUES=0

for pattern in "${PATTERNS[@]}"; do
  echo "Recherche: $pattern"
  
  # Chercher les occurrences (exclure node_modules et les cas valides)
  RESULTS=$(grep -rn "$pattern" frontend/src \
    --include="*.ts" \
    --include="*.tsx" \
    2>/dev/null \
    | grep -v "node_modules" \
    | grep -v "CashStoreProvider" \
    | grep -v "\.test\." \
    | grep -v "\.spec\." \
    | grep -v "__tests__" \
    | grep -v "interfaces/ICashSessionStore" \
    | grep -v "cashSessionStoreUtils" \
    | grep -v "cashSessionStore.test" \
    | grep -v "virtualCashSessionStore.test" \
    | grep -v "deferredCashSessionStore.test" || true)
  
  if [ -n "$RESULTS" ]; then
    echo "⚠️  Imports directs trouvés:"
    echo "$RESULTS"
    echo ""
    FOUND_ISSUES=$((FOUND_ISSUES + 1))
  else
    echo "✅ Aucun import direct non autorisé"
    echo ""
  fi
done

echo "----------------------------------------"
if [ $FOUND_ISSUES -gt 0 ]; then
  echo "❌ $FOUND_ISSUES pattern(s) avec imports directs non autorisés"
  echo ""
  echo "ACTION REQUISE:"
  echo "Remplacer les imports directs par useCashStores() depuis CashStoreProvider"
  echo ""
  echo "Exemple:"
  echo "  // AVANT:"
  echo "  import { useCashSessionStore } from '../stores/cashSessionStore';"
  echo "  const { submitSale } = useCashSessionStore();"
  echo ""
  echo "  // APRÈS:"
  echo "  import { useCashStores } from '../providers/CashStoreProvider';"
  echo "  const { cashSessionStore } = useCashStores();"
  echo "  const { submitSale } = cashSessionStore;"
  exit 1
else
  echo "✅ Audit réussi! Aucun import direct non autorisé trouvé."
fi






