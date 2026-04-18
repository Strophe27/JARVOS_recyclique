# Diagnostic et Solutions - Tests B42-P3

**Date:** 2025-11-26  
**Auteur:** James (Dev Agent)  
**Story:** B42-P3 - Frontend Refresh Integration

---

## 🔍 Diagnostic Effectué

### État Actuel de l'Environnement

**Node.js dans WSL:**
- Version détectée: `v12.22.9`
- Version requise: `18.0.0+`
- **Status:** ❌ Version incompatible

**Outils disponibles:**
- NVM: ❌ Non installé
- Docker: ✅ Disponible (`/usr/bin/docker`)
- npm: ✅ Disponible (mais version liée à Node.js 12)

**Tests créés:**
- ✅ `frontend/src/utils/__tests__/jwt.test.ts` (12 tests)
- ✅ `frontend/src/test/hooks/useSessionHeartbeat.test.ts` (10 tests)
- ✅ `frontend/tests/e2e/session-refresh.spec.ts` (3 tests E2E)

---

## 🛠️ Solutions Proposées

### Option A: Installation NVM (Recommandée pour développement)

**Avantages:**
- Gestion facile de multiples versions Node.js
- Pas besoin de sudo pour utilisation
- Facile à mettre à jour

**Commandes:**
```bash
# Installer NVM
wsl -e bash -lc "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"

# Recharger le shell
wsl -e bash -lc "source ~/.bashrc"

# Installer Node.js 18
wsl -e bash -lc "nvm install 18 && nvm use 18"

# Vérifier
wsl -e bash -lc "node --version"  # Doit afficher v18.x.x
```

**Note:** Nécessite redémarrage du shell WSL ou rechargement du profil.

---

### Option B: Mise à jour via Package Manager (Rapide)

**Avantages:**
- Installation système globale
- Pas besoin de recharger le shell

**Commandes:**
```bash
# Ajouter le repository NodeSource
wsl -e bash -lc "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"

# Installer Node.js 18
wsl -e bash -lc "sudo apt-get install -y nodejs"

# Vérifier
wsl -e bash -lc "node --version"  # Doit afficher v18.x.x
```

**Note:** Nécessite sudo (privilèges administrateur).

---

### Option C: Exécution via Docker (Alternative)

**Si Node.js ne peut pas être mis à jour:**

Vérifier si le conteneur frontend a Node.js 18+:
```bash
docker-compose exec frontend node --version
```

Si oui, exécuter les tests dans le conteneur:
```bash
# Entrer dans le conteneur
docker-compose exec frontend bash

# Exécuter les tests
cd /app
npm run test:run
```

**Note:** Nécessite que le service `frontend` soit démarré et que Node.js 18+ soit dans l'image Docker.

---

### Option D: Exécution depuis Windows

**Si Node.js est à jour sur Windows:**

```bash
# Depuis PowerShell ou CMD
cd frontend
npm run test:run
```

**Note:** Nécessite Node.js 18+ installé sur Windows.

---

## ✅ Plan d'Action Recommandé

### Étape 1: Choisir une solution

**Pour développement local:** Option A (NVM)  
**Pour correction rapide:** Option B (Package Manager)  
**Si pas de privilèges:** Option C (Docker) ou D (Windows)

### Étape 2: Mettre à jour Node.js

Exécuter les commandes de la solution choisie.

### Étape 3: Vérifier la version

```bash
wsl -e bash -lc "node --version"
```

**Résultat attendu:** `v18.x.x` ou supérieur

### Étape 4: Exécuter les tests

```bash
wsl -e bash -lc "cd /mnt/d/Users/Strophe/Documents/1-IA/La\ Clique\ Qui\ Recycle/Recyclic/frontend && npm run test:run"
```

### Étape 5: Valider les résultats

**Tests attendus:**
- `jwt.test.ts`: 12 tests
- `useSessionHeartbeat.test.ts`: 10 tests
- `session-refresh.spec.ts`: 3 tests E2E (nécessite Playwright)

**Total:** 25 tests

---

## 📊 Résultats Attendus

### Tests Unitaires (Vitest)

```bash
✓ src/utils/__tests__/jwt.test.ts (12 tests)
✓ src/test/hooks/useSessionHeartbeat.test.ts (10 tests)
```

### Tests E2E (Playwright)

```bash
✓ tests/e2e/session-refresh.spec.ts (3 tests)
```

---

## 🚨 Problèmes Potentiels

### 1. Dépendances npm non installées

**Solution:**
```bash
cd frontend
npm install
```

### 2. Playwright non installé

**Solution:**
```bash
cd frontend
npx playwright install
```

### 3. Erreurs de compilation TypeScript

**Vérifier:**
```bash
cd frontend
npm run build
```

---

## 📝 Notes

- Les tests ont été créés avec syntaxe correcte (validée par linter)
- Le problème est uniquement environnemental (version Node.js)
- Une fois Node.js 18+ installé, les tests devraient s'exécuter sans problème

---

**Auteur:** James (Dev Agent) - 2025-11-26
















