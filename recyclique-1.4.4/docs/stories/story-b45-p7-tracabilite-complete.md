# Story B45-P7: Traçabilité Complète

**Statut:** Draft  
**Épopée:** [EPIC-B45 – Audit Sessions Avancé](../epics/epic-b45-audit-sessions-avance.md)  
**Module:** Frontend Admin + Backend API  
**Priorité:** P7 (Phase 3 - Expert)

## 1. Contexte

Pour un audit complet, il est nécessaire de pouvoir consulter l'historique complet des modifications et accès d'une session/ticket. Cette fonctionnalité permet de tracer toutes les actions effectuées et d'identifier qui a fait quoi et quand.

Cette story fait partie de la Phase 3 (Expert) de l'Epic B45.

## 2. User Story

En tant que **Super-Admin**, je veux **voir l'historique complet des modifications et accès d'une session/ticket**, afin de tracer toutes les actions effectuées lors des audits.

## 3. Critères d'acceptation

1. **Onglet "Historique"** : Onglet dans détail session/ticket (Super-Admin uniquement)
2. **Liste des modifications** : Qui, quand, quoi (action effectuée)
3. **Log des accès** : Qui a consulté la session/ticket
4. **Commentaires d'audit** : Champ texte libre pour ajouter commentaires
5. **Export historique** : Export historique en CSV
6. **Timeline** : Affichage chronologique (plus récent en haut)

## 4. Intégration & Compatibilité

- **Système d'audit existant** : `recyclic_api.core.audit` avec `AuditLog` (existant)
- **Composants existants** : Détail session/ticket
- **Design** : Suivre architecture interface définie dans B45-P0

## 5. Dev Notes

### Références Architecturales Clés

1. **COMMENCER PAR** : `docs/architecture/index.md` - Navigation complète de l'architecture
2. **Design UX** : `docs/ux/audit-sessions-advanced-design.md` - Architecture interface (validé dans B45-P0)
3. **Frontend** : `docs/architecture/6-architecture-des-composants.md` - Patterns composants React
4. **API** : `docs/architecture/7-design-et-intgration-api.md` - Design API et intégration
5. **Testing** : `docs/testing-strategy.md` - Standards de tests

### Système d'Audit Existant

**Référence** : `docs/architecture/audit-brownfield-b45-validation.md` - Section 2.3

**Code actuel** :
- ✅ Système d'audit existe (`recyclic_api.core.audit`) avec `AuditLog`
- ✅ Fonctions spécialisées : `log_cash_session_opening()`, `log_cash_session_closing()`, `log_role_change()`
- ✅ Modèle `AuditLog` pour traçabilité complète

**Action requise** : Créer endpoint pour récupérer historique d'une session

### Composant UI - HistoryTab (Design UX)

**Référence** : `docs/ux/audit-sessions-advanced-design.md` - Component: HistoryTab

**Spécifications** :
- **Variants** : Timeline view (vue chronologique, plus récent en haut), Table view (optionnel)
- **Position** : Onglet dans détail session/ticket
- **Permissions** : Super-Admin uniquement

**User Flow détaillé** : Voir `docs/ux/audit-sessions-advanced-design.md` - Flow 6: Traçabilité et Historique (Phase 3)

### Nouveaux Endpoints à Créer

**Backend API** :

1. **`GET /v1/admin/cash-sessions/{id}/history`** (Super-Admin)
   - **Response** : Liste historique (modifications + accès)
   ```json
   {
     "session_id": "uuid",
     "history": [
       {
         "id": "uuid",
         "action": "session_opened" | "session_closed" | "viewed" | "modified",
         "user_id": "uuid",
         "user_name": "string",
         "timestamp": "2025-01-27T10:00:00Z",
         "details": "string",
         "comment": "string (optionnel)"
       }
     ]
   }
   ```

2. **`POST /v1/admin/cash-sessions/{id}/history/comment`** (Super-Admin)
   - **Body** : `{ "comment": "string" }`
   - **Response** : Commentaire ajouté

3. **`GET /v1/reception/tickets/{id}/history`** (Super-Admin)
   - Même structure que sessions

4. **`POST /v1/reception/tickets/{id}/history/comment`** (Super-Admin)
   - Même structure que sessions

### Structure de Données

**Types d'actions** :
- `session_opened` : Session ouverte
- `session_closed` : Session fermée
- `viewed` : Session consultée
- `modified` : Session modifiée
- `exported` : Session exportée
- `commented` : Commentaire ajouté

**Historique** :
- **Timeline** : Plus récent en haut
- **Groupement** : Par date (optionnel)
- **Filtres** : Par type d'action (optionnel)

### Fichiers à Créer/Modifier

**Frontend** :
- `frontend/src/pages/Admin/SessionDetail.tsx` : Ajouter onglet "Historique" (Super-Admin)
- `frontend/src/pages/Admin/TicketDetail.tsx` : Ajouter onglet "Historique" (Super-Admin)
- `frontend/src/components/HistoryTab.tsx` : Nouveau composant historique
- `frontend/src/services/cashSessionsService.ts` : Ajouter méthodes `getHistory()`, `addComment()`
- `frontend/src/services/receptionTicketsService.ts` : Ajouter méthodes `getHistory()`, `addComment()`

**Backend** :
- `api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py` : Endpoints `/history` et `/history/comment`
- `api/src/recyclic_api/api/api_v1/endpoints/reception.py` : Endpoints `/history` et `/history/comment`
- `api/src/recyclic_api/services/audit_service.py` : Méthodes `get_session_history()`, `add_history_comment()`

### Points d'Attention Techniques

1. **Permissions** : Vérifier Super-Admin uniquement côté backend
2. **Performance** : Pagination si historique très long
3. **Log accès** : Logger chaque consultation (ajouter dans `AuditLog`)

## 6. Tasks / Subtasks

- [ ] **Backend - Endpoints Historique Sessions** (AC: 1, 2, 3)
  - [ ] Créer endpoint `GET /v1/admin/cash-sessions/{id}/history` (Super-Admin)
  - [ ] Créer endpoint `POST /v1/admin/cash-sessions/{id}/history/comment` (Super-Admin)
  - [ ] Récupérer historique depuis `AuditLog`
  - [ ] Logger accès (ajouter dans `AuditLog`)
  - [ ] Tests endpoints (pytest)

- [ ] **Backend - Endpoints Historique Tickets** (AC: 1, 2, 3)
  - [ ] Créer endpoint `GET /v1/reception/tickets/{id}/history` (Super-Admin)
  - [ ] Créer endpoint `POST /v1/reception/tickets/{id}/history/comment` (Super-Admin)
  - [ ] Tests endpoints (pytest)

- [ ] **Frontend - Composant HistoryTab** (AC: 1, 2, 3, 6)
  - [ ] Créer composant `HistoryTab.tsx` (timeline view)
  - [ ] Afficher liste modifications (qui, quand, quoi)
  - [ ] Afficher log accès
  - [ ] Gérer permissions (Super-Admin uniquement)
  - [ ] Tests composant (React Testing Library)

- [ ] **Frontend - Commentaires Audit** (AC: 4)
  - [ ] Ajouter champ texte pour commentaires
  - [ ] Bouton "Ajouter commentaire"
  - [ ] Afficher commentaires dans historique
  - [ ] Tests composant (React Testing Library)

- [ ] **Frontend - Export Historique** (AC: 5)
  - [ ] Ajouter bouton "Exporter historique"
  - [ ] Générer CSV historique
  - [ ] Tests export

- [ ] **Frontend - Intégration Onglet** (AC: 1)
  - [ ] Ajouter onglet "Historique" dans détail session (Super-Admin)
  - [ ] Ajouter onglet "Historique" dans détail ticket (Super-Admin)
  - [ ] Tests composant (React Testing Library)

- [ ] **Tests d'intégration** (AC: 1-6)
  - [ ] Test endpoints historique (pytest)
  - [ ] Test permissions (Super-Admin uniquement)

- [ ] **Tests E2E** (AC: 1-6)
  - [ ] Test workflow : Voir historique → Ajouter commentaire → Exporter (Playwright/Cypress)

## 7. Testing

### ⚠️ CRITIQUE - Leçons Apprises sur les Tests

**Références obligatoires avant de créer les tests** :
- **[docs/tests-problemes-p5-prevention.md](../tests-problemes-p5-prevention.md)** - Checklist complète de prévention (OBLIGATOIRE avant de créer les tests)
- **[docs/tests-problemes-brief.md](../tests-problemes-brief.md)** - Résumé des problèmes rencontrés (B42-P2, B42-P3)
- **[docs/tests-problemes-pattern-analyse.md](../tests-problemes-pattern-analyse.md)** - Analyse des patterns d'échecs
- **[docs/tests-problemes-QUICK-FIX.md](../tests-problemes-QUICK-FIX.md)** - Corrections rapides
- **[docs/tests-problemes-guide-agents.md](../tests-problemes-guide-agents.md)** - Guide complet pour agents dev

**Problèmes récurrents à éviter** :
- Tests non montés dans Docker (vérifier `docker-compose.yml`)
- Imports incorrects (`import jwt` au lieu de `from jose import jwt`)
- Node.js WSL incompatible (vérifier version 18+)
- Tests créés mais jamais exécutés (exécuter immédiatement après création)

**Action immédiate** : Vérifier Docker config, Node.js version, et exécuter les tests après création.

### Standards de Tests

- **Tests unitaires** : Jest (frontend) + pytest (backend)
- **Tests d'intégration** : pytest pour endpoints API
- **Tests E2E** : Playwright ou Cypress pour workflows complets
- **Standards** : Suivre `docs/testing-strategy.md`

### Tests Critiques

1. **Permissions** : Vérifier Super-Admin uniquement
2. **Performance** : Historique ne doit pas ralentir chargement détail
3. **Log accès** : Vérifier que chaque consultation est loggée

## 8. Dépendances

- **B45-P0** : Design UX doit être complété (fait)
- **Système d'audit** : Doit exister (existant)

## 9. Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-27 | 1.0 | Création story initiale | Bob (SM) |

## 10. Dev Agent Record

### Agent Model Used
_À remplir par le dev agent_

### Debug Log References
_À remplir par le dev agent_

### Completion Notes List
_À remplir par le dev agent_

### File List
_À remplir par le dev agent_

## 11. QA Results
_À remplir par le QA agent_

