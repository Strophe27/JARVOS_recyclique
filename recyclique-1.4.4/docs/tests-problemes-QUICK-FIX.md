# 🚀 QUICK FIX - Correction Rapide des Tests

**Pour les devs:** Ce document contient les corrections exactes à faire, copier-coller.

---

## ⚡ Corrections Rapides (30 min)

### 1. `api/tests/test_activity_ping.py`
**Ligne 5:** Remplacer `import jwt` par `from jose import jwt`

### 2. `api/tests/test_user_statuses.py`
**Ligne 98:** Remplacer `import jwt` par `from jose import jwt`  
*(Vérifier s'il y a d'autres occurrences avec `grep -n "import jwt" api/tests/test_user_statuses.py`)*

### 3. `api/tests/test_db_purge.py`
**Lignes 15-16:** Remplacer:
```python
from recyclic_api.models.reception_ticket import ReceptionTicket
from recyclic_api.models.reception_line import ReceptionLine
```
Par:
```python
from recyclic_api.models.ticket_depot import TicketDepot
from recyclic_api.models.ligne_depot import LigneDepot
```
**Puis dans tout le fichier:** `ReceptionTicket` → `TicketDepot`, `ReceptionLine` → `LigneDepot`

### 4. `api/tests/test_reception_tickets_status_filter.py`
**Ligne 10:** Remplacer:
```python
from recyclic_api.models.reception import PosteReception, PosteReceptionStatus, TicketDepot, TicketDepotStatus
```
Par:
```python
from recyclic_api.models.poste_reception import PosteReception, PosteReceptionStatus
from recyclic_api.models.ticket_depot import TicketDepot, TicketDepotStatus
```

### 5. `api/tests/test_category_export.py`
```bash
docker-compose exec api pip install --force-reinstall openpyxl==3.1.2
```

---

## 🐳 Configuration Docker (5 min)

### `docker-compose.yml` - Service `api`
**Ajouter dans la section `volumes` (ligne ~69):**
```yaml
volumes:
  - ./api/src:/app/src
  - ./api/tests:/app/tests  # ← AJOUTER CETTE LIGNE
```

**Puis:**
```bash
docker-compose restart api
```

---

## 📦 Node.js WSL (15 min)

```bash
# Vérifier version
wsl -e bash -lc "node --version"

# Si < 18, mettre à jour:
wsl -e bash -lc "nvm install 18 && nvm use 18"
# OU
wsl -e bash -lc "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
```

---

## ✅ Validation

```bash
# Tests backend corrigés
docker-compose exec api python -m pytest api/tests/test_activity_ping.py api/tests/test_user_statuses.py api/tests/test_db_purge.py api/tests/test_reception_tickets_status_filter.py api/tests/test_category_export.py -v

# Tests B42-P2
docker-compose exec api python -m pytest api/tests/test_refresh_token_service.py api/tests/test_refresh_token_endpoint.py -v

# Tests B42-P3
wsl -e bash -lc "cd frontend && npm run test:run"
```

---

**Guide complet:** Voir [tests-problemes-guide-action.md](tests-problemes-guide-action.md)

