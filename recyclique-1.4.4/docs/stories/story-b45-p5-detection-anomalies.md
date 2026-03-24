# Story B45-P5: Détection d'Anomalies

**Statut:** Draft  
**Épopée:** [EPIC-B45 – Audit Sessions Avancé](../epics/epic-b45-audit-sessions-avance.md)  
**Module:** Frontend Admin + Backend API  
**Priorité:** P5 (Phase 2 - Analyses)

## 1. Contexte

Pour un audit efficace, il est nécessaire d'identifier automatiquement les sessions/tickets nécessitant attention (variance élevée, durée anormale, poids anormal, etc.). Cette fonctionnalité permet de détecter rapidement les anomalies et de les mettre en évidence.

Cette story fait partie de la Phase 2 (Analyses) de l'Epic B45.

## 2. User Story

En tant que **administrateur**, je veux **voir automatiquement les sessions/tickets avec anomalies**, afin d'identifier rapidement les cas nécessitant attention lors des audits.

## 3. Critères d'acceptation

1. **Badge "⚠️" sur sessions** : Badge visible dans liste principale pour sessions avec anomalies
2. **Types d'anomalies détectées** :
   - Variance > seuil configurable (défaut: 10€)
   - Durée session > seuil configurable (défaut: 12h)
   - Poids anormalement élevé (tickets réception)
3. **Filtre "Afficher uniquement les anomalies"** : Filtre dans barre d'outils
4. **Onglet "Anomalies"** : Onglet dédié avec liste filtrée des anomalies uniquement
5. **Configuration seuils** : Interface admin pour configurer seuils (Super-Admin uniquement)
6. **Tooltip** : Afficher type d'anomalie au survol du badge

## 4. Intégration & Compatibilité

- **Composants existants** : `SessionManager.tsx`, `ReceptionSessionManager.tsx`
- **Système d'audit** : Réutiliser système d'audit existant si nécessaire
- **Design** : Suivre architecture interface définie dans B45-P0

## 5. Dev Notes

### Références Architecturales Clés

1. **COMMENCER PAR** : `docs/architecture/index.md` - Navigation complète de l'architecture
2. **Design UX** : `docs/ux/audit-sessions-advanced-design.md` - Architecture interface (validé dans B45-P0)
3. **Frontend** : `docs/architecture/6-architecture-des-composants.md` - Patterns composants React
4. **API** : `docs/architecture/7-design-et-intgration-api.md` - Design API et intégration
5. **Décisions techniques** : `docs/architecture/technical-decisions-b45.md` - Décisions prises par l'Architect
6. **Testing** : `docs/testing-strategy.md` - Standards de tests

### Composant UI - AnomalyBadge (Design UX)

**Référence** : `docs/ux/audit-sessions-advanced-design.md` - Component: AnomalyBadge

**Spécifications** :
- **Variants** : Warning (badge ⚠️ jaune/orange), Critical (badge ⚠️ rouge si anomalie critique)
- **Position** : À côté du statut dans le tableau
- **Tooltip** : Afficher type d'anomalie au survol
- **Clic** : Filtrer pour afficher uniquement les anomalies

**User Flow détaillé** : Voir `docs/ux/audit-sessions-advanced-design.md` - Flow 4: Détection et Affichage Anomalies (Phase 2)

### Composant UI - ViewTabs (Design UX)

**Référence** : `docs/ux/audit-sessions-advanced-design.md` - Component: ViewTabs

**Spécifications** :
- **Onglets** : Liste | Graphiques | Anomalies
- **Onglet Anomalies** : Liste filtrée des anomalies uniquement
- **Actions** : Voir détail, Exporter

### Nouveaux Endpoints à Créer

**Backend API** :

1. **`GET /v1/admin/cash-sessions/anomalies`**
   - **Query Params** : Filtres optionnels (date, opérateur, site, etc.)
   - **Response** : Liste sessions avec anomalies + type d'anomalie

2. **`GET /v1/admin/anomaly-thresholds`** (Super-Admin)
   - **Response** : Seuils configurés

3. **`PUT /v1/admin/anomaly-thresholds`** (Super-Admin)
   - **Body** : Nouveaux seuils
   - **Response** : Seuils mis à jour

### Service Détection Anomalies

**Backend** : Créer service `anomaly_detection_service.py`
- **Méthode** : `detect_anomalies(session)` → Liste types d'anomalies
- **Types** : `variance_high`, `duration_long`, `weight_high`

### Modèle AnomalyThreshold

**Backend** : Créer modèle `AnomalyThreshold`
```python
class AnomalyThreshold(Base):
    id: UUID
    type: str (enum: "variance" | "duration" | "weight")
    threshold_value: float
    created_at: DateTime
    updated_at: DateTime
```

### Fichiers à Créer/Modifier

**Frontend** :
- `frontend/src/pages/Admin/SessionManager.tsx` : 
  - Ajouter badge ⚠️ dans tableau
  - Ajouter filtre "Anomalies uniquement"
  - Ajouter onglet "Anomalies" (ViewTabs)
- `frontend/src/pages/Admin/ReceptionSessionManager.tsx` : Même chose
- `frontend/src/services/cashSessionsService.ts` : Ajouter méthode `getAnomalies()`
- `frontend/src/components/AnomalyBadge.tsx` : Nouveau composant badge

**Backend** :
- `api/src/recyclic_api/services/anomaly_detection_service.py` : Nouveau service
- `api/src/recyclic_api/models/anomaly_threshold.py` : Nouveau modèle
- `api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py` : Endpoint anomalies
- `api/src/recyclic_api/api/api_v1/endpoints/admin.py` : Endpoints seuils (Super-Admin)

### Points d'Attention Techniques

1. **Performance** : Détection côté serveur pour éviter calculs lourds côté client
2. **Seuils par défaut** : Utiliser valeurs par défaut si non configurés (variance > 10€, durée > 12h)
3. **Cache** : Mettre en cache seuils pour éviter requêtes répétées

## 6. Tasks / Subtasks

- [ ] **Backend - Modèle AnomalyThreshold** (AC: 5)
  - [ ] Créer modèle `AnomalyThreshold`
  - [ ] Créer migration
  - [ ] Tests modèle (pytest)

- [ ] **Backend - Service Détection** (AC: 2)
  - [ ] Créer service `anomaly_detection_service.py`
  - [ ] Implémenter détection variance
  - [ ] Implémenter détection durée
  - [ ] Implémenter détection poids
  - [ ] Tests unitaires service (pytest)

- [ ] **Backend - Endpoints Anomalies** (AC: 1, 2, 3)
  - [ ] Créer endpoint `GET /v1/admin/cash-sessions/anomalies`
  - [ ] Créer endpoint `GET /v1/reception/tickets/anomalies`
  - [ ] Tests endpoints (pytest)

- [ ] **Backend - Endpoints Seuils** (AC: 5)
  - [ ] Créer endpoint `GET /v1/admin/anomaly-thresholds` (Super-Admin)
  - [ ] Créer endpoint `PUT /v1/admin/anomaly-thresholds` (Super-Admin)
  - [ ] Tests endpoints (pytest)

- [ ] **Frontend - Composant AnomalyBadge** (AC: 1, 6)
  - [ ] Créer composant `AnomalyBadge.tsx`
  - [ ] Gérer variants (warning, critical)
  - [ ] Ajouter tooltip
  - [ ] Tests composant (React Testing Library)

- [ ] **Frontend - Filtre Anomalies** (AC: 3)
  - [ ] Ajouter filtre "Anomalies uniquement" dans barre d'outils
  - [ ] Intégrer dans `SessionManager.tsx` et `ReceptionSessionManager.tsx`
  - [ ] Tests composant (React Testing Library)

- [ ] **Frontend - Onglet Anomalies** (AC: 4)
  - [ ] Ajouter onglet "Anomalies" dans ViewTabs
  - [ ] Afficher liste filtrée anomalies uniquement
  - [ ] Tests composant (React Testing Library)

- [ ] **Frontend - Configuration Seuils** (AC: 5)
  - [ ] Créer interface admin pour configurer seuils (Super-Admin)
  - [ ] Tests composant (React Testing Library)

- [ ] **Tests d'intégration** (AC: 1-6)
  - [ ] Test détection anomalies (pytest)
  - [ ] Test configuration seuils (pytest)

- [ ] **Tests E2E** (AC: 1-6)
  - [ ] Test workflow : Voir anomalies → Configurer seuils (Playwright/Cypress)

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

1. **Détection** : Vérifier détection correcte selon seuils
2. **Performance** : Détection ne doit pas ralentir chargement liste
3. **Seuils** : Configuration seuils doit être persistée

## 8. Dépendances

- **B45-P0** : Design UX doit être complété (fait)
- **B45-P6** : ViewTabs pour onglet Anomalies (peut être fait en parallèle)

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

