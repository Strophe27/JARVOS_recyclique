# Messages à Envoyer aux Agents - Copier-Coller

**Date:** 2025-11-26  
**Usage:** Copier-coller ces messages pour assigner les corrections aux agents

---

## 🤖 Message pour Agent B42-P2

```
Agent B42-P2, corrige les tests qui échouent pour ta story.

Lis le fichier: docs/tests-problemes-guide-agents.md
Section: "📋 Instructions pour Agent B42-P2"

Tu dois:
1. Corriger 5 fichiers de tests existants (imports jwt et modèles obsolètes)
   - api/tests/test_activity_ping.py
   - api/tests/test_user_statuses.py
   - api/tests/test_db_purge.py
   - api/tests/test_reception_tickets_status_filter.py
   - api/tests/test_category_export.py

2. Corriger la config Docker (docker-compose.yml) pour que les tests B42-P2 soient exécutables

3. Valider avec:
   docker-compose exec api python -m pytest api/tests/test_activity_ping.py api/tests/test_user_statuses.py api/tests/test_db_purge.py api/tests/test_reception_tickets_status_filter.py api/tests/test_category_export.py -v
   docker-compose exec api python -m pytest api/tests/test_refresh_token_service.py api/tests/test_refresh_token_endpoint.py -v

4. Mettre à jour ta story (docs/stories/story-b42-p2-backend-refresh-token.md) avec les corrections appliquées

Suis les instructions étape par étape dans le guide.
```

---

## 🤖 Message pour Agent B42-P3

```
Agent B42-P3, corrige les tests qui échouent pour ta story.

Lis le fichier: docs/tests-problemes-guide-agents.md
Section: "📋 Instructions pour Agent B42-P3"

Tu dois:
1. Mettre à jour Node.js dans WSL vers version 18+
   Commande: wsl -e bash -lc "nvm install 18 && nvm use 18"
   (ou via package manager si nvm n'est pas disponible)

2. Valider avec:
   wsl -e bash -lc "node --version"  # Doit afficher >= 18.0.0
   wsl -e bash -lc "cd /mnt/d/Users/Strophe/Documents/1-IA/La\ Clique\ Qui\ Recycle/Recyclic/frontend && npm run test:run"

3. Mettre à jour ta story (docs/stories/story-b42-p3-frontend-refresh-integration.md) avec les corrections appliquées

Suis les instructions étape par étape dans le guide.
```

---

## 🤖 Message pour Agent B42-P4

```
Agent B42-P4, crée les tests manquants pour ta story.

Lis le fichier: docs/tests-problemes-guide-agents.md
Section: "📋 Instructions pour Agent B42-P4"

Tu dois:
1. Créer les tests manquants selon les requirements de ta story:
   - Tests UI (Playwright) pour bannière (success/failure)
   - Tests API pour endpoint metrics (/v1/admin/sessions/metrics)
   - Tests alerting (simulate failure rate > threshold)

2. Valider que les tests s'exécutent

3. Mettre à jour ta story (docs/stories/story-b42-p4-ux-alertes-observabilite.md) avec les tests créés

Consulte ta story pour les requirements exacts des tests à créer.
```

---

## 📋 Résumé Rapide

**Agent B42-P2:**
- Fichier: `docs/tests-problemes-guide-agents.md` (section P2)
- Tâche: Corriger 5 tests existants + Config Docker
- Priorité: 🔴 HAUTE

**Agent B42-P3:**
- Fichier: `docs/tests-problemes-guide-agents.md` (section P3)
- Tâche: Mettre à jour Node.js WSL (18+)
- Priorité: 🔴 HAUTE

**Agent B42-P4:**
- Fichier: `docs/tests-problemes-guide-agents.md` (section P4)
- Tâche: Créer les tests manquants
- Priorité: 🟡 MOYENNE

**Agent B42-P6:**
- Fichier: `docs/stories/story-b42-p6-activity-detector.md`
- Guides: `docs/tests-problemes-guide-agents.md` (section générale)
- Tâche: Implémenter capteur de présence + tests
- Priorité: 🟡 MOYENNE

---

## 🤖 Message pour Agent B42-P6

```
Agent B42-P6, implémente le capteur de présence pour rendre le système de session plus discret et automatique.

Lis le fichier: docs/stories/story-b42-p6-activity-detector.md

⚠️ IMPORTANT - Avant de créer les tests:
1. Consulte docs/tests-problemes-guide-agents.md pour éviter les problèmes récurrents
2. Vérifie que Node.js 18+ est disponible dans WSL (ou utilise Docker)
3. Vérifie que les tests frontend sont montés dans Docker si nécessaire
4. Exécute les tests après création pour valider qu'ils fonctionnent
5. Ne marque pas comme "complété" si les tests ne peuvent pas s'exécuter

Tu dois:
1. Créer le hook useActivityDetector pour détecter l'activité utilisateur
2. Intégrer avec useSessionHeartbeat pour refresh automatique silencieux
3. Rendre le SessionStatusBanner discret (masqué par défaut)
4. Créer les tests (unitaires + E2E) en suivant les guides de tests

Suis les instructions étape par étape dans la story et les guides de tests.
```

---

**Auteur:** Auto (Agent Cursor) - 2025-11-26

