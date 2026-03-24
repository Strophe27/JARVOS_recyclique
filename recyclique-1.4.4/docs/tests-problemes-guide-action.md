# Guide d'Action - Correction des Tests qui Échouent

**Date:** 2025-11-26  
**Auteur:** Auto (Agent Cursor)  
**Public:** Développeurs responsables  
**Objectif:** Guide actionnable pour corriger tous les tests qui échouent

---

## 🎯 Vue d'Ensemble

**10 fichiers de tests à corriger** (70+ tests individuels)  
**Temps estimé:** 1-2 heures  
**Priorité:** 🔴 HAUTE (bloque validation des stories B42)

---

## ✅ Checklist de Correction

### Phase 1: Tests Existants - Imports Obsolètes (30 min)

#### 1.1 Corriger `test_activity_ping.py`

**Fichier:** `api/tests/test_activity_ping.py`

**Action:**
```python
# Ligne 5: Remplacer
import jwt

# Par
from jose import jwt
```

**Vérification:**
```bash
docker-compose exec api python -m pytest api/tests/test_activity_ping.py -v
```

---

#### 1.2 Corriger `test_user_statuses.py`

**Fichier:** `api/tests/test_user_statuses.py`

**Action:**
```python
# Ligne 98: Remplacer
import jwt

# Par
from jose import jwt
```

**Note:** Il y a peut-être plusieurs occurrences de `import jwt` dans ce fichier. Vérifier avec:
```bash
grep -n "import jwt" api/tests/test_user_statuses.py
```

**Vérification:**
```bash
docker-compose exec api python -m pytest api/tests/test_user_statuses.py -v
```

---

#### 1.3 Corriger `test_db_purge.py`

**Fichier:** `api/tests/test_db_purge.py`

**Action:**
```python
# Lignes 15-16: Remplacer
from recyclic_api.models.reception_ticket import ReceptionTicket
from recyclic_api.models.reception_line import ReceptionLine

# Par
from recyclic_api.models.ticket_depot import TicketDepot
from recyclic_api.models.ligne_depot import LigneDepot
```

**Puis remplacer toutes les occurrences dans le fichier:**
- `ReceptionTicket` → `TicketDepot`
- `ReceptionLine` → `LigneDepot`

**Vérification:**
```bash
docker-compose exec api python -m pytest api/tests/test_db_purge.py -v
```

---

#### 1.4 Corriger `test_reception_tickets_status_filter.py`

**Fichier:** `api/tests/test_reception_tickets_status_filter.py`

**Action:**
```python
# Ligne 10: Remplacer
from recyclic_api.models.reception import PosteReception, PosteReceptionStatus, TicketDepot, TicketDepotStatus

# Par
from recyclic_api.models.poste_reception import PosteReception, PosteReceptionStatus
from recyclic_api.models.ticket_depot import TicketDepot, TicketDepotStatus
```

**Vérification:**
```bash
docker-compose exec api python -m pytest api/tests/test_reception_tickets_status_filter.py -v
```

---

#### 1.5 Corriger `test_category_export.py`

**Fichier:** `api/tests/test_category_export.py`

**Action 1: Vérifier l'installation d'openpyxl**
```bash
docker-compose exec api pip list | grep openpyxl
```

**Action 2: Réinstaller si nécessaire**
```bash
docker-compose exec api pip install --force-reinstall openpyxl==3.1.2
```

**Action 3: Vérifier l'import**
```bash
docker-compose exec api python -c "from openpyxl import load_workbook; print('OK')"
```

**Vérification:**
```bash
docker-compose exec api python -m pytest api/tests/test_category_export.py -v
```

---

### Phase 2: Tests B42-P2 - Configuration Docker (15 min)

#### 2.1 Ajouter le montage des tests dans Docker

**Fichier:** `docker-compose.yml`

**Action:**
Localiser le service `api` (ligne ~32) et modifier la section `volumes`:

```yaml
api:
  # ... autres configs ...
  volumes:
    - ./api/src:/app/src
    - ./api/tests:/app/tests  # ← AJOUTER CETTE LIGNE
```

**Vérification:**
```bash
# Redémarrer le service
docker-compose restart api

# Vérifier que les tests sont accessibles
docker-compose exec api ls -la /app/tests/ | grep refresh_token
```

**Exécution des tests:**
```bash
docker-compose exec api python -m pytest api/tests/test_refresh_token_service.py -v
docker-compose exec api python -m pytest api/tests/test_refresh_token_endpoint.py -v
```

---

### Phase 3: Tests B42-P3 - Environnement Node.js (30 min)

#### 3.1 Vérifier la version Node.js dans WSL

**Action:**
```bash
wsl -e bash -lc "node --version"
```

**Si version < 14.18:**

#### Option A: Mettre à jour via nvm (Recommandé)
```bash
wsl -e bash -lc "nvm install 18 && nvm use 18"
```

#### Option B: Mettre à jour via package manager
```bash
wsl -e bash -lc "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
```

#### Option C: Exécuter via Docker (si service configuré)
```bash
docker-compose run --rm frontend-tests npm run test:run
```

#### Option D: Exécuter depuis Windows (si Node.js à jour)
```bash
cd frontend
npm run test:run
```

**Vérification:**
```bash
wsl -e bash -lc "cd frontend && npm run test:run"
```

**Tests à valider:**
- `frontend/src/utils/__tests__/jwt.test.ts` (12 tests)
- `frontend/src/test/hooks/useSessionHeartbeat.test.ts` (10 tests)
- `frontend/tests/e2e/session-refresh.spec.ts` (3 tests E2E)

---

### Phase 4: Validation Globale (15 min)

#### 4.1 Exécuter tous les tests backend

```bash
# Tests corrigés (Phase 1)
docker-compose exec api python -m pytest api/tests/test_activity_ping.py api/tests/test_user_statuses.py api/tests/test_db_purge.py api/tests/test_reception_tickets_status_filter.py api/tests/test_category_export.py -v

# Tests B42-P2 (Phase 2)
docker-compose exec api python -m pytest api/tests/test_refresh_token_service.py api/tests/test_refresh_token_endpoint.py -v
```

#### 4.2 Exécuter tous les tests frontend

```bash
wsl -e bash -lc "cd frontend && npm run test:run"
```

#### 4.3 Vérifier le nombre de tests qui passent

**Backend:**
- 5 fichiers de tests existants corrigés
- 2 fichiers de tests B42-P2 exécutables
- **Total: 7 fichiers de tests débloqués**

**Frontend:**
- 3 fichiers de tests B42-P3 exécutables
- **Total: 3 fichiers de tests débloqués**

---

## 📋 Résumé des Actions

| Fichier | Action | Commande de Vérification |
|---------|--------|-------------------------|
| `test_activity_ping.py` | `import jwt` → `from jose import jwt` | `pytest api/tests/test_activity_ping.py -v` |
| `test_user_statuses.py` | `import jwt` → `from jose import jwt` | `pytest api/tests/test_user_statuses.py -v` |
| `test_db_purge.py` | Imports modèles obsolètes → nouveaux | `pytest api/tests/test_db_purge.py -v` |
| `test_reception_tickets_status_filter.py` | Imports modèles obsolètes → nouveaux | `pytest api/tests/test_reception_tickets_status_filter.py -v` |
| `test_category_export.py` | Réinstaller `openpyxl` | `pytest api/tests/test_category_export.py -v` |
| `docker-compose.yml` | Ajouter montage `./api/tests:/app/tests` | `docker-compose exec api ls /app/tests/` |
| Tests B42-P3 | Mettre à jour Node.js WSL (18+) | `cd frontend && npm run test:run` |

---

## 🚨 Points d'Attention

### 1. Ordre de Correction
**Important:** Corriger dans l'ordre indiqué (Phase 1 → 2 → 3 → 4) pour éviter les dépendances.

### 2. Vérification Après Chaque Correction
**Ne pas sauter les étapes de vérification** - chaque correction doit être validée avant de passer à la suivante.

### 3. Tests B42-P2
**Après correction Docker:** Les tests doivent être exécutables, mais peuvent encore échouer pour d'autres raisons (à investiguer).

### 4. Tests B42-P3
**Si Node.js ne peut pas être mis à jour:** Utiliser Docker ou Windows pour exécuter les tests.

### 5. Backup
**Avant modification de docker-compose.yml:** Faire un commit ou backup.

---

## ✅ Critères de Succès

**Phase 1 réussie si:**
- ✅ Les 5 fichiers de tests existants s'exécutent sans erreur d'import
- ✅ Tous les tests de ces fichiers passent (ou échouent pour des raisons logiques, pas d'import)

**Phase 2 réussie si:**
- ✅ Les tests B42-P2 sont visibles dans le conteneur Docker
- ✅ Les tests B42-P2 peuvent être exécutés (même s'ils échouent pour d'autres raisons)

**Phase 3 réussie si:**
- ✅ Node.js 18+ est disponible dans WSL
- ✅ Les tests B42-P3 peuvent être exécutés

**Phase 4 réussie si:**
- ✅ Tous les tests corrigés s'exécutent
- ✅ Le nombre de tests qui passent augmente

---

## 📞 Support

**Si un problème survient:**
1. Vérifier les logs: `docker-compose logs api`
2. Vérifier les erreurs exactes dans la sortie des tests
3. Consulter `docs/tests-problemes-brief.md` pour les détails techniques
4. Consulter `docs/tests-problemes-pattern-analyse.md` pour comprendre le pattern

---

**Auteur:** Auto (Agent Cursor) - 2025-11-26

