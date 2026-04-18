# Guide de Prévention - Tests B42-P5 Hardening

**Date:** 2025-11-26  
**Public:** Agent Dev B42-P5 (Security & QA)  
**Objectif:** Éviter les problèmes de tests rencontrés dans P2, P3, P4

---

## 🎯 Leçons Apprises des Stories Précédentes

### Problèmes Rencontrés dans P2, P3, P4

1. **Tests créés mais non exécutables** (P2, P3)
   - Problème: Tests créés sans vérifier la configuration Docker/Node.js
   - Solution: Vérifier l'environnement AVANT de créer les tests

2. **Tests avec imports/dépendances incorrects** (P2)
   - Problème: Utilisation de `import jwt` au lieu de `from jose import jwt`
   - Solution: Vérifier les dépendances réelles du projet

3. **Tests non adaptés à l'infrastructure** (P2, P3)
   - Problème: Tests supposent un environnement idéal qui n'existe pas
   - Solution: Adapter les tests à l'infrastructure réelle

4. **Tests créés mais jamais exécutés** (P2, P3, P4)
   - Problème: Tests marqués comme "créés" mais jamais validés
   - Solution: Exécuter les tests immédiatement après création

---

## ✅ Checklist de Prévention pour P5

### Avant de Créer les Tests

#### 1. Vérifier l'Environnement
- [ ] **Docker:** Vérifier que les tests seront montés dans `docker-compose.yml`
  - Commande: `grep -A 5 "volumes:" docker-compose.yml | grep tests`
  - Si absent, ajouter `- ./api/tests:/app/tests` dans la section `api`

- [ ] **Node.js (si tests frontend):** Vérifier version Node.js dans WSL
  - Commande: `wsl -e bash -lc "node --version"`
  - Doit être >= 18.0.0, sinon mettre à jour

- [ ] **Dépendances Python:** Vérifier les imports utilisés
  - Ne JAMAIS utiliser `import jwt` → utiliser `from jose import jwt`
  - Vérifier les imports de modèles: utiliser les noms actuels (pas obsolètes)

#### 2. Vérifier les Références
- [ ] **Modèles:** Vérifier les noms dans `api/src/recyclic_api/models/__init__.py`
  - Ne pas utiliser `reception_ticket` → utiliser `ticket_depot`
  - Ne pas utiliser `reception` → utiliser `poste_reception`

- [ ] **Services:** Vérifier les méthodes disponibles
  - `RefreshTokenService.validate_and_rotate()` - Rotation obligatoire
  - `ActivityService.get_minutes_since_activity()` - Vérification d'activité

- [ ] **Endpoints:** Vérifier les routes exactes
  - `/v1/auth/refresh` (pas `/api/v1/auth/refresh` dans certains contextes)
  - Vérifier dans `api/src/recyclic_api/api/api_v1/endpoints/auth.py`

#### 3. Planifier la Structure
- [ ] **Emplacement des fichiers:**
  - Scripts pen-test: `scripts/security/sliding-session/`
  - Tests backend: `api/tests/test_refresh_chaos.py`
  - Tests frontend E2E: `frontend/tests/e2e/session-*.spec.ts`
  - Rapports: `docs/qa/reports/sliding-session-validation.md`

---

### Pendant la Création des Tests

#### 1. Tests Backend (Python/pytest)

**Règles d'or:**
- ✅ Toujours utiliser `from jose import jwt` (jamais `import jwt`)
- ✅ Utiliser les noms de modèles actuels (vérifier dans `models/__init__.py`)
- ✅ Utiliser la base de test `recyclic_test` (pas `recyclic`)
- ✅ Utiliser les fixtures de `conftest.py` (`db_session`, `client`)

**Exemple de test correct:**
```python
from jose import jwt
from recyclic_api.models.user_session import UserSession
from recyclic_api.services.refresh_token_service import RefreshTokenService

def test_replay_token_rejected(db_session):
    """Test qu'un refresh token réutilisé après rotation est rejeté."""
    service = RefreshTokenService(db_session)
    # ... test logic
```

**Exemple de test INCORRECT (à éviter):**
```python
import jwt  # ❌ INCORRECT - utiliser from jose import jwt
from recyclic_api.models.reception_ticket import ReceptionTicket  # ❌ Modèle obsolète
```

#### 2. Tests Frontend (Playwright/Vitest)

**Règles d'or:**
- ✅ Utiliser `data-testid` pour sélectionner les éléments
  - Exemple: `data-testid="session-banner"` pour `SessionStatusBanner`
- ✅ Utiliser `useFakeTimers` pour accélérer les tests (ne pas attendre 10h)
- ✅ Vérifier Node.js >= 18 avant d'exécuter

**Exemple de test correct:**
```typescript
test('session banner appears on offline', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.onLine = false);
  await expect(page.getByTestId('session-banner')).toBeVisible();
});
```

#### 3. Scripts Pen-Test (Python)

**Règles d'or:**
- ✅ Créer dans `scripts/security/sliding-session/`
- ✅ Documenter comment les exécuter
- ✅ Utiliser les mêmes dépendances que le projet (`python-jose`, pas `PyJWT`)

---

### Après la Création des Tests

#### 1. Exécution Immédiate
- [ ] **Exécuter les tests IMMÉDIATEMENT après création**
  - Backend: `docker-compose exec api python -m pytest api/tests/test_refresh_chaos.py -v`
  - Frontend: `wsl -e bash -lc "cd frontend && npm run test:run"`

- [ ] **Vérifier qu'il n'y a PAS d'erreurs d'import/config/environnement**
  - Si erreur `ModuleNotFoundError` → corriger les imports
  - Si erreur `file or directory not found` → vérifier Docker config
  - Si erreur Node.js → mettre à jour Node.js

#### 2. Validation
- [ ] **Vérifier que les tests s'exécutent** (même s'ils échouent pour des raisons logiques)
  - L'important est qu'ils ne donnent PAS d'erreurs d'import/config/environnement

- [ ] **Vérifier la couverture**
  - Tous les AC doivent avoir au moins un test
  - Tous les scénarios critiques doivent être couverts

#### 3. Documentation
- [ ] **Mettre à jour la story avec les tests créés**
  - Liste des fichiers créés
  - Commandes d'exécution
  - Résultats des tests

---

## 📋 Template de Test pour P5

### Test Replay Token (Backend)

```python
"""
Test que le replay d'un refresh token après rotation est rejeté.
"""
import pytest
from recyclic_api.services.refresh_token_service import RefreshTokenService
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.core.security import hash_password

def test_replay_token_rejected(db_session):
    """Test qu'un refresh token réutilisé après rotation est rejeté."""
    # Créer utilisateur
    user = User(
        username="test_replay_user",
        hashed_password=hash_password("testpass"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    
    service = RefreshTokenService(db_session)
    token1 = service.generate_refresh_token()
    
    # Créer session avec token1
    session1 = service.create_session(user.id, token1)
    
    # Faire rotation (obtenir token2)
    session2, token2 = service.validate_and_rotate(token1)
    
    # Essayer de réutiliser token1 (doit échouer)
    with pytest.raises(ValueError, match="Refresh token révoqué"):
        service.validate_and_rotate(token1)
```

### Test Long-Run (Frontend E2E)

```typescript
import { test, expect } from '@playwright/test';

test('session persists for 10h with activity', async ({ page, context }) => {
  // Configurer token_expiration_minutes=5 en test
  await page.goto('/');
  
  // Login
  await page.fill('[name="username"]', 'testuser');
  await page.fill('[name="password"]', 'testpass');
  await page.click('button[type="submit"]');
  
  // Simuler 10h avec fake timers (équivalent à 120 refresh)
  await page.evaluate(() => {
    // Mock timers pour accélérer
    jest.useFakeTimers();
    jest.advanceTimersByTime(10 * 60 * 60 * 1000); // 10h
  });
  
  // Vérifier que l'utilisateur est toujours connecté
  await expect(page.getByTestId('session-banner')).not.toBeVisible();
  
  // Vérifier accès à une page protégée
  await page.goto('/admin');
  await expect(page).toHaveURL('/admin');
});
```

---

## 🚨 Points d'Attention Spécifiques à P5

### 1. Tests de Sécurité
- **Ne pas tester des fonctionnalités qui n'existent pas**
  - Exemple: Le backend ne rejette PAS automatiquement les refresh depuis IP différente
  - Il LOGUE l'IP, mais ne bloque pas
  - Tester ce qui existe réellement (logs d'audit)

### 2. Tests Long-Run
- **Ne pas attendre 10h réelles**
  - Utiliser `token_expiration_minutes=5` en test
  - Utiliser `useFakeTimers` pour accélérer
  - Ou faire un test réel mais avec tokens courts (5 min)

### 3. Tests Chaos
- **Documenter les commandes exactes**
  - `docker-compose restart api`
  - `docker-compose restart redis`
  - Vérifier que les sessions persistent en DB

### 4. Tests CSRF
- **Vérifier que le frontend expose les hooks nécessaires**
  - `SessionStatusBanner` doit avoir `data-testid="session-banner"`
  - Vérifier que le header `X-CSRF-Token` est requis

---

## ✅ Checklist Finale Avant de Marquer "Complété"

- [ ] Tous les tests créés sont dans les bons emplacements
- [ ] Tous les tests utilisent les bonnes dépendances/imports
- [ ] Tous les tests s'exécutent sans erreur d'import/config/environnement
- [ ] Tous les tests sont documentés (comment les exécuter)
- [ ] Le rapport de validation est créé avec template
- [ ] La story est mise à jour avec les tests créés
- [ ] Les commandes de validation sont testées

---

## 📞 Références

- **Guide de correction P2/P3:** `docs/tests-problemes-guide-agents.md`
- **Pattern des problèmes:** `docs/tests-problemes-pattern-analyse.md`
- **Brief des problèmes:** `docs/tests-problemes-brief.md`
- **RFC Sliding Session:** `docs/architecture/sliding-session-rfc.md`
- **Story P2:** `docs/stories/story-b42-p2-backend-refresh-token.md`
- **Story P3:** `docs/stories/story-b42-p3-frontend-refresh-integration.md`

---

**Auteur:** Auto (Agent Cursor) - 2025-11-26

