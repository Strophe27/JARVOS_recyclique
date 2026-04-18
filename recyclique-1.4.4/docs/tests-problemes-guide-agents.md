# Guide de Correction pour Agents Dev - Tests B42

**Date:** 2025-11-26  
**Public:** Agents Dev BMad (un agent par story P2, P3, P4)  
**Format:** Instructions structurées pour exécution par agent IA

---

## 🎯 Répartition des Tâches par Agent

| Agent | Story | Fichiers à Corriger | Priorité |
|-------|-------|---------------------|-----------|
| **Agent B42-P2** | Backend Refresh Token | Tests existants (5 fichiers) + Config Docker | 🔴 HAUTE |
| **Agent B42-P3** | Frontend Refresh Integration | Tests B42-P3 (3 fichiers) + Node.js WSL | 🔴 HAUTE |
| **Agent B42-P4** | UX & Observabilité | Tests B42-P4 (à créer) | 🟡 MOYENNE |

---

## 📋 Instructions pour Agent B42-P2

### Tâche 1: Corriger les Tests Existants (5 fichiers)

#### Action 1.1: Corriger `api/tests/test_activity_ping.py`
**Fichier:** `api/tests/test_activity_ping.py`  
**Ligne:** 5  
**Action:** Remplacer `import jwt` par `from jose import jwt`  
**Vérification:** Exécuter `docker-compose exec api python -m pytest api/tests/test_activity_ping.py -v` et vérifier qu'il n'y a plus d'erreur `ModuleNotFoundError: No module named 'jwt'`

#### Action 1.2: Corriger `api/tests/test_user_statuses.py`
**Fichier:** `api/tests/test_user_statuses.py`  
**Lignes:** Toutes les occurrences de `import jwt`  
**Action:** 
1. Rechercher toutes les occurrences: `grep -n "import jwt" api/tests/test_user_statuses.py`
2. Remplacer chaque `import jwt` par `from jose import jwt`
**Vérification:** Exécuter `docker-compose exec api python -m pytest api/tests/test_user_statuses.py -v` et vérifier qu'il n'y a plus d'erreur d'import

#### Action 1.3: Corriger `api/tests/test_db_purge.py`
**Fichier:** `api/tests/test_db_purge.py`  
**Lignes:** 15-16 (imports) + toutes les occurrences dans le fichier  
**Actions:**
1. Ligne 15: Remplacer `from recyclic_api.models.reception_ticket import ReceptionTicket` par `from recyclic_api.models.ticket_depot import TicketDepot`
2. Ligne 16: Remplacer `from recyclic_api.models.reception_line import ReceptionLine` par `from recyclic_api.models.ligne_depot import LigneDepot`
3. Dans tout le fichier: Remplacer `ReceptionTicket` par `TicketDepot` (utiliser `replace_all`)
4. Dans tout le fichier: Remplacer `ReceptionLine` par `LigneDepot` (utiliser `replace_all`)
**Vérification:** Exécuter `docker-compose exec api python -m pytest api/tests/test_db_purge.py -v` et vérifier qu'il n'y a plus d'erreur `ModuleNotFoundError: No module named 'recyclic_api.models.reception_ticket'`

#### Action 1.4: Corriger `api/tests/test_reception_tickets_status_filter.py`
**Fichier:** `api/tests/test_reception_tickets_status_filter.py`  
**Ligne:** 10  
**Action:** Remplacer:
```python
from recyclic_api.models.reception import PosteReception, PosteReceptionStatus, TicketDepot, TicketDepotStatus
```
Par:
```python
from recyclic_api.models.poste_reception import PosteReception, PosteReceptionStatus
from recyclic_api.models.ticket_depot import TicketDepot, TicketDepotStatus
```
**Vérification:** Exécuter `docker-compose exec api python -m pytest api/tests/test_reception_tickets_status_filter.py -v` et vérifier qu'il n'y a plus d'erreur d'import

#### Action 1.5: Corriger `api/tests/test_category_export.py`
**Fichier:** `api/tests/test_category_export.py`  
**Action:** 
1. Exécuter: `docker-compose exec api pip install --force-reinstall openpyxl==3.1.2`
2. Vérifier: `docker-compose exec api python -c "from openpyxl import load_workbook; print('OK')"`
**Vérification:** Exécuter `docker-compose exec api python -m pytest api/tests/test_category_export.py -v` et vérifier qu'il n'y a plus d'erreur `ImportError: cannot import name 'load_workbook'`

### Tâche 2: Corriger la Configuration Docker pour Tests B42-P2

#### Action 2.1: Modifier `docker-compose.yml`
**Fichier:** `docker-compose.yml`  
**Section:** Service `api` (ligne ~32)  
**Action:** 
1. Localiser la section `volumes:` du service `api` (ligne ~69)
2. Ajouter la ligne: `- ./api/tests:/app/tests` après `- ./api/src:/app/src`
**Résultat attendu:**
```yaml
volumes:
  - ./api/src:/app/src
  - ./api/tests:/app/tests
```
**Vérification:** 
1. Exécuter `docker-compose restart api`
2. Vérifier: `docker-compose exec api ls -la /app/tests/ | grep refresh_token`
3. Doit afficher les fichiers `test_refresh_token_service.py` et `test_refresh_token_endpoint.py`

#### Action 2.2: Valider les Tests B42-P2
**Actions:**
1. Exécuter: `docker-compose exec api python -m pytest api/tests/test_refresh_token_service.py -v`
2. Exécuter: `docker-compose exec api python -m pytest api/tests/test_refresh_token_endpoint.py -v`
**Vérification:** Les tests doivent s'exécuter (même s'ils échouent pour d'autres raisons, l'important est qu'ils ne donnent plus `ERROR: file or directory not found`)

### Tâche 3: Mettre à Jour la Story B42-P2

**Fichier:** `docs/stories/story-b42-p2-backend-refresh-token.md`  
**Action:** Ajouter une section "Corrections Appliquées" dans le Dev Agent Record:
```markdown
### Corrections Appliquées (2025-11-26)
- ✅ Corrigé imports `jwt` dans tests existants (test_activity_ping.py, test_user_statuses.py)
- ✅ Corrigé imports modèles obsolètes (test_db_purge.py, test_reception_tickets_status_filter.py)
- ✅ Réinstallé openpyxl pour test_category_export.py
- ✅ Ajouté montage tests dans docker-compose.yml
- ✅ Tests B42-P2 maintenant exécutables
```

---

## 📋 Instructions pour Agent B42-P3

### Tâche 1: Corriger l'Environnement Node.js WSL

#### Action 1.1: Vérifier la Version Node.js
**Commande:** `wsl -e bash -lc "node --version"`  
**Résultat attendu:** Version >= 18.0.0  
**Si version < 18:** Passer à Action 1.2

#### Action 1.2: Mettre à Jour Node.js (Option A - nvm)
**Commandes:**
```bash
wsl -e bash -lc "nvm install 18"
wsl -e bash -lc "nvm use 18"
```
**Vérification:** `wsl -e bash -lc "node --version"` doit afficher >= 18.0.0

#### Action 1.3: Mettre à Jour Node.js (Option B - package manager)
**Si nvm n'est pas disponible, utiliser:**
```bash
wsl -e bash -lc "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
wsl -e bash -lc "sudo apt-get install -y nodejs"
```
**Vérification:** `wsl -e bash -lc "node --version"` doit afficher >= 18.0.0

### Tâche 2: Exécuter les Tests B42-P3

#### Action 2.1: Exécuter les Tests Unitaires
**Commandes:**
```bash
wsl -e bash -lc "cd /mnt/d/Users/Strophe/Documents/1-IA/La\ Clique\ Qui\ Recycle/Recyclic/frontend && npm run test:run"
```
**Vérification:** Les tests doivent s'exécuter sans erreur `Error: Cannot find module 'node:path'`

#### Action 2.2: Valider les Tests
**Fichiers à valider:**
- `frontend/src/utils/__tests__/jwt.test.ts` (12 tests)
- `frontend/src/test/hooks/useSessionHeartbeat.test.ts` (10 tests)
- `frontend/tests/e2e/session-refresh.spec.ts` (3 tests E2E)

**Vérification:** Tous les tests doivent s'exécuter (même s'ils échouent pour d'autres raisons, l'important est qu'ils ne donnent plus d'erreur Node.js)

### Tâche 3: Mettre à Jour la Story B42-P3

**Fichier:** `docs/stories/story-b42-p3-frontend-refresh-integration.md`  
**Action:** Ajouter une section "Corrections Appliquées" dans le Dev Agent Record:
```markdown
### Corrections Appliquées (2025-11-26)
- ✅ Mis à jour Node.js WSL vers version 18+
- ✅ Tests B42-P3 maintenant exécutables
- ✅ Validation: Tous les tests s'exécutent sans erreur Node.js
```

---

## 📋 Instructions pour Agent B42-P4

### Tâche 1: Créer les Tests Manquants

**Note:** Les tests B42-P4 n'ont pas encore été créés. Voir la story pour les requirements.

**Fichier:** `docs/stories/story-b42-p4-ux-alertes-observabilite.md`  
**Section:** Tasks / Subtasks, ligne 70-73

**Tests à créer:**
1. Tests UI (Playwright) pour bannière (success/failure)
2. Tests API pour endpoint metrics (`/v1/admin/sessions/metrics`)
3. Tests alerting (simulate failure rate > threshold)

**Action:** Créer les tests selon les requirements de la story.

---

## ✅ Critères de Validation Globale

### Pour Agent B42-P2
- [ ] Les 5 fichiers de tests existants s'exécutent sans erreur d'import
- [ ] Les tests B42-P2 sont visibles dans le conteneur Docker (`/app/tests/`)
- [ ] Les tests B42-P2 peuvent être exécutés (pas d'erreur `file or directory not found`)
- [ ] La story B42-P2 est mise à jour avec les corrections

### Pour Agent B42-P3
- [ ] Node.js 18+ est disponible dans WSL
- [ ] Les tests B42-P3 peuvent être exécutés (pas d'erreur `Cannot find module 'node:path'`)
- [ ] La story B42-P3 est mise à jour avec les corrections

### Pour Agent B42-P4
- [ ] Les tests B42-P4 sont créés selon les requirements
- [ ] Les tests B42-P4 peuvent être exécutés
- [ ] La story B42-P4 est mise à jour

---

## 🔍 Commandes de Vérification Finale

**Exécuter après toutes les corrections:**

```bash
# Tests backend corrigés (Agent B42-P2)
docker-compose exec api python -m pytest api/tests/test_activity_ping.py api/tests/test_user_statuses.py api/tests/test_db_purge.py api/tests/test_reception_tickets_status_filter.py api/tests/test_category_export.py -v

# Tests B42-P2 (Agent B42-P2)
docker-compose exec api python -m pytest api/tests/test_refresh_token_service.py api/tests/test_refresh_token_endpoint.py -v

# Tests B42-P3 (Agent B42-P3)
wsl -e bash -lc "cd /mnt/d/Users/Strophe/Documents/1-IA/La\ Clique\ Qui\ Recycle/Recyclic/frontend && npm run test:run"
```

**Résultat attendu:** Tous les tests s'exécutent (même s'ils échouent pour des raisons logiques, l'important est qu'ils ne donnent plus d'erreurs d'import/config/environnement).

---

## 📝 Format de Rapport pour les Agents

**Chaque agent doit créer un rapport dans sa story:**

```markdown
## Corrections Appliquées (2025-11-26)

### Fichiers Modifiés
- [Liste des fichiers modifiés avec changements]

### Commandes Exécutées
- [Liste des commandes exécutées]

### Résultats
- [Résultats des tests après correction]

### Problèmes Rencontrés
- [Si des problèmes persistent]

### Validation
- [ ] Tous les tests s'exécutent sans erreur d'import/config/environnement
- [ ] Story mise à jour
```

---

**Auteur:** Auto (Agent Cursor) - 2025-11-26

