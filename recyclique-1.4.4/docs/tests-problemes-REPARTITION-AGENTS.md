# Répartition des Corrections - Agents Dev BMad

**Date:** 2025-11-26  
**Objectif:** Attribution claire des tâches de correction des tests aux agents responsables

---

## 📋 Instructions pour l'Attribution

**Format:** Pour chaque agent, indiquer:
1. Le fichier à lire
2. Les instructions à suivre
3. Les fichiers à modifier
4. Les validations à effectuer

---

## 🤖 Agent B42-P2 (Backend Refresh Token)

### Fichier à Lire
**`docs/tests-problemes-guide-agents.md`** - Section "Instructions pour Agent B42-P2"

### Instructions à Donner
```
Agent B42-P2, tu dois corriger les tests qui échouent pour ta story.

Lis le fichier: docs/tests-problemes-guide-agents.md
Section: "📋 Instructions pour Agent B42-P2"

Tu dois:
1. Corriger 5 fichiers de tests existants (imports jwt et modèles obsolètes)
2. Corriger la config Docker pour que les tests B42-P2 soient exécutables
3. Valider que tous les tests s'exécutent
4. Mettre à jour ta story avec les corrections appliquées

Suis les instructions étape par étape dans le guide.
```

### Fichiers à Modifier
- `api/tests/test_activity_ping.py`
- `api/tests/test_user_statuses.py`
- `api/tests/test_db_purge.py`
- `api/tests/test_reception_tickets_status_filter.py`
- `api/tests/test_category_export.py` (via commande Docker)
- `docker-compose.yml`
- `docs/stories/story-b42-p2-backend-refresh-token.md`

### Validation
```bash
# Tests existants corrigés
docker-compose exec api python -m pytest api/tests/test_activity_ping.py api/tests/test_user_statuses.py api/tests/test_db_purge.py api/tests/test_reception_tickets_status_filter.py api/tests/test_category_export.py -v

# Tests B42-P2
docker-compose exec api python -m pytest api/tests/test_refresh_token_service.py api/tests/test_refresh_token_endpoint.py -v
```

---

## 🤖 Agent B42-P3 (Frontend Refresh Integration)

### Fichier à Lire
**`docs/tests-problemes-guide-agents.md`** - Section "Instructions pour Agent B42-P3"

### Instructions à Donner
```
Agent B42-P3, tu dois corriger les tests qui échouent pour ta story.

Lis le fichier: docs/tests-problemes-guide-agents.md
Section: "📋 Instructions pour Agent B42-P3"

Tu dois:
1. Mettre à jour Node.js dans WSL (version 18+)
2. Valider que les tests B42-P3 s'exécutent
3. Mettre à jour ta story avec les corrections appliquées

Suis les instructions étape par étape dans le guide.
```

### Fichiers à Modifier
- Aucun fichier de code à modifier (les tests sont déjà créés)
- `docs/stories/story-b42-p3-frontend-refresh-integration.md` (mise à jour du rapport)

### Validation
```bash
# Vérifier Node.js
wsl -e bash -lc "node --version"

# Exécuter les tests
wsl -e bash -lc "cd /mnt/d/Users/Strophe/Documents/1-IA/La\ Clique\ Qui\ Recycle/Recyclic/frontend && npm run test:run"
```

---

## 🤖 Agent B42-P4 (UX & Observabilité)

### Fichier à Lire
**`docs/tests-problemes-guide-agents.md`** - Section "Instructions pour Agent B42-P4"

### Instructions à Donner
```
Agent B42-P4, tu dois créer les tests manquants pour ta story.

Lis le fichier: docs/tests-problemes-guide-agents.md
Section: "📋 Instructions pour Agent B42-P4"

Tu dois:
1. Créer les tests manquants selon les requirements de ta story
2. Valider que les tests s'exécutent
3. Mettre à jour ta story avec les tests créés

Consulte ta story pour les requirements exacts des tests à créer.
```

### Fichiers à Créer/Modifier
- Tests UI Playwright pour bannière (à créer)
- Tests API pour endpoint metrics (à créer)
- Tests alerting (à créer)
- `docs/stories/story-b42-p4-ux-alertes-observabilite.md` (mise à jour)

### Validation
```bash
# Exécuter les tests créés selon leur type (à déterminer)
```

---

## 📊 Vue d'Ensemble

| Agent | Fichier Guide | Tâches Principales | Priorité |
|-------|---------------|-------------------|----------|
| **B42-P2** | `tests-problemes-guide-agents.md` (Section P2) | Corriger 5 tests existants + Config Docker | 🔴 HAUTE |
| **B42-P3** | `tests-problemes-guide-agents.md` (Section P3) | Mettre à jour Node.js WSL | 🔴 HAUTE |
| **B42-P4** | `tests-problemes-guide-agents.md` (Section P4) | Créer les tests manquants | 🟡 MOYENNE |

---

## 🎯 Message Type à Envoyer à Chaque Agent

### Pour Agent B42-P2
```
Agent B42-P2, corrige les tests qui échouent pour ta story.

Lis: docs/tests-problemes-guide-agents.md (section "Agent B42-P2")
Tu dois corriger 5 fichiers de tests existants et la config Docker.
Valide avec les commandes dans le guide.
```

### Pour Agent B42-P3
```
Agent B42-P3, corrige les tests qui échouent pour ta story.

Lis: docs/tests-problemes-guide-agents.md (section "Agent B42-P3")
Tu dois mettre à jour Node.js WSL (18+).
Valide avec les commandes dans le guide.
```

### Pour Agent B42-P4
```
Agent B42-P4, crée les tests manquants pour ta story.

Lis: docs/tests-problemes-guide-agents.md (section "Agent B42-P4")
Consulte ta story pour les requirements exacts.
```

---

## ✅ Validation Globale (Après Toutes les Corrections)

**Exécuter ces commandes pour valider que tout fonctionne:**

```bash
# Tests backend (Agent B42-P2)
docker-compose exec api python -m pytest api/tests/test_activity_ping.py api/tests/test_user_statuses.py api/tests/test_db_purge.py api/tests/test_reception_tickets_status_filter.py api/tests/test_category_export.py api/tests/test_refresh_token_service.py api/tests/test_refresh_token_endpoint.py -v

# Tests frontend (Agent B42-P3)
wsl -e bash -lc "cd /mnt/d/Users/Strophe/Documents/1-IA/La\ Clique\ Qui\ Recycle/Recyclic/frontend && npm run test:run"
```

**Résultat attendu:** Tous les tests s'exécutent sans erreur d'import/config/environnement.

---

**Auteur:** Auto (Agent Cursor) - 2025-11-26

