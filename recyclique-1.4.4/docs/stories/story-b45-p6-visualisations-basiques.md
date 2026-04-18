# Story B45-P6: Visualisations Basiques

**Statut:** Draft  
**Épopée:** [EPIC-B45 – Audit Sessions Avancé](../epics/epic-b45-audit-sessions-avance.md)  
**Module:** Frontend Admin + Backend API  
**Priorité:** P6 (Phase 2 - Analyses)

## 1. Contexte

Pour faciliter l'analyse des données, il est nécessaire d'ajouter des graphiques permettant de visualiser les tendances et répartitions. Cette fonctionnalité permet de comprendre rapidement les données sans avoir à analyser des tableaux.

Cette story fait partie de la Phase 2 (Analyses) de l'Epic B45.

## 2. User Story

En tant que **administrateur**, je veux **voir des graphiques des données de sessions/tickets**, afin de comprendre rapidement les tendances et répartitions sans analyser des tableaux.

## 3. Critères d'acceptation

1. **Graphique linéaire** : Évolution CA/poids par jour
2. **Graphique en barres** : CA/poids par opérateur/bénévole
3. **Graphique camembert** : Répartition par site/catégorie
4. **Bibliothèque** : `recharts` (décision technique Architect)
5. **Onglet "Graphiques"** : Onglet dans ViewTabs pour basculer Liste ↔ Graphiques
6. **Export graphiques** : Export en PNG/PDF
7. **Responsive** : Graphiques adaptés mobile/tablette

## 4. Intégration & Compatibilité

- **Composants existants** : `SessionManager.tsx`, `ReceptionSessionManager.tsx`
- **Design** : Suivre architecture interface définie dans B45-P0
- **Bibliothèque** : `recharts` (décision technique)

## 5. Dev Notes

### Références Architecturales Clés

1. **COMMENCER PAR** : `docs/architecture/index.md` - Navigation complète de l'architecture
2. **Design UX** : `docs/ux/audit-sessions-advanced-design.md` - Architecture interface (validé dans B45-P0)
3. **Décisions techniques** : `docs/architecture/technical-decisions-b45.md` - Bibliothèque `recharts` choisie
4. **Frontend** : `docs/architecture/6-architecture-des-composants.md` - Patterns composants React
5. **Testing** : `docs/testing-strategy.md` - Standards de tests

### Décision Technique (Architect)

**Bibliothèque** : ✅ **`recharts`**
- Meilleure intégration React/TypeScript
- Plus léger que chart.js
- Support TypeScript natif
- Écosystème React standard

**Référence** : `docs/architecture/technical-decisions-b45.md` - Section 1

### Composant UI - ViewTabs (Design UX)

**Référence** : `docs/ux/audit-sessions-advanced-design.md` - Component: ViewTabs

**Spécifications** :
- **Onglets** : Liste | Graphiques | Anomalies
- **Onglet Graphiques** : Affichage graphiques avec sélecteur type
- **Responsive** : Horizontal tabs (desktop), Accordion (mobile)

### Composant UI - ChartContainer (Design UX)

**Référence** : `docs/ux/audit-sessions-advanced-design.md` - Component: ChartContainer

**Spécifications** :
- **Types** : Linéaire, Barres, Camembert
- **Sélecteur type** : Menu déroulant pour choisir type graphique
- **Export** : Bouton export PNG/PDF
- **Responsive** : Adaptation automatique taille écran

**User Flow détaillé** : Voir `docs/ux/audit-sessions-advanced-design.md` - Flow 5: Visualisations Graphiques (Phase 2)

### Types de Graphiques

**1. Graphique Linéaire** :
- **Données** : Évolution CA/poids par jour
- **Axe X** : Dates
- **Axe Y** : CA (€) ou Poids (kg)
- **Lignes** : Une ligne par type (CA, Poids, Dons)

**2. Graphique en Barres** :
- **Données** : CA/poids par opérateur/bénévole
- **Axe X** : Opérateurs/Bénévoles
- **Axe Y** : CA (€) ou Poids (kg)
- **Barres** : Groupées par type (CA, Poids)

**3. Graphique Camembert** :
- **Données** : Répartition par site/catégorie
- **Segments** : Un segment par site/catégorie
- **Légende** : Pourcentage et valeur

### Endpoints API Existants

**Sessions de Caisse** :
- `GET /v1/admin/cash-sessions/stats` : KPIs (existant)
- **À étendre** : Ajouter agrégations par jour, par opérateur, par site

**Sessions de Réception** :
- `GET /v1/reception/tickets/stats/summary` : KPIs (si existe)
- **À étendre** : Ajouter agrégations par jour, par bénévole, par catégorie

### Nouveaux Endpoints à Créer

**Backend API** :

1. **`GET /v1/admin/cash-sessions/stats/charts`**
   - **Query Params** : 
     - `type`: "line" | "bar" | "pie"
     - `group_by`: "day" | "operator" | "site"
     - `filters`: Filtres optionnels
   - **Response** : Données formatées pour graphique

2. **`GET /v1/reception/tickets/stats/charts`**
   - Même structure que ci-dessus

### Bibliothèques à Installer

**Frontend** :
- `recharts` : Bibliothèque graphiques (décision technique)
- `react-to-pdf` ou `html2canvas` : Export PNG/PDF (optionnel)

### Fichiers à Créer/Modifier

**Frontend** :
- `frontend/src/pages/Admin/SessionManager.tsx` : 
  - Ajouter onglet "Graphiques" dans ViewTabs
  - Ajouter composant ChartContainer
- `frontend/src/pages/Admin/ReceptionSessionManager.tsx` : Même chose
- `frontend/src/components/ChartContainer.tsx` : Nouveau composant graphiques
- `frontend/src/services/cashSessionsService.ts` : Ajouter méthode `getChartData()`
- `frontend/src/services/receptionTicketsService.ts` : Ajouter méthode `getChartData()`

**Backend** :
- `api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py` : Endpoint `/stats/charts`
- `api/src/recyclic_api/api/api_v1/endpoints/reception.py` : Endpoint `/stats/charts`
- `api/src/recyclic_api/services/cash_session_service.py` : Méthode `get_chart_data()`
- `api/src/recyclic_api/services/reception_service.py` : Méthode `get_chart_data()`

### Points d'Attention Techniques

1. **Performance** : Agrégation côté serveur pour éviter calculs lourds côté client
2. **Agrégation automatique** : Si trop de points (> 30 jours), agréger par semaine
3. **Responsive** : Graphiques doivent s'adapter à la taille écran
4. **Export** : Utiliser `html2canvas` ou `react-to-pdf` pour export PNG/PDF

## 6. Tasks / Subtasks

- [ ] **Frontend - Installation recharts** (AC: 4)
  - [ ] Installer `recharts` dans `package.json`
  - [ ] Vérifier compatibilité TypeScript

- [ ] **Backend - Endpoints Chart Data** (AC: 1, 2, 3)
  - [ ] Créer endpoint `GET /v1/admin/cash-sessions/stats/charts`
  - [ ] Créer endpoint `GET /v1/reception/tickets/stats/charts`
  - [ ] Implémenter agrégations (par jour, par opérateur, par site)
  - [ ] Tests endpoints (pytest)

- [ ] **Frontend - Composant ChartContainer** (AC: 1, 2, 3, 7)
  - [ ] Créer composant `ChartContainer.tsx` avec recharts
  - [ ] Implémenter graphique linéaire
  - [ ] Implémenter graphique barres
  - [ ] Implémenter graphique camembert
  - [ ] Ajouter sélecteur type graphique
  - [ ] Gérer responsive
  - [ ] Tests composant (React Testing Library)

- [ ] **Frontend - Onglet Graphiques** (AC: 5)
  - [ ] Ajouter onglet "Graphiques" dans ViewTabs
  - [ ] Intégrer ChartContainer dans onglet
  - [ ] Tests composant (React Testing Library)

- [ ] **Frontend - Export Graphiques** (AC: 6)
  - [ ] Ajouter bouton export PNG/PDF
  - [ ] Implémenter export avec `html2canvas` ou `react-to-pdf`
  - [ ] Tests export

- [ ] **Tests d'intégration** (AC: 1-7)
  - [ ] Test endpoints chart data (pytest)
  - [ ] Test graphiques affichés correctement

- [ ] **Tests E2E** (AC: 1-7)
  - [ ] Test workflow : Onglet Graphiques → Changer type → Exporter (Playwright/Cypress)

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

1. **Performance** : Graphiques doivent charger < 2 secondes
2. **Responsive** : Graphiques doivent s'adapter mobile/tablette
3. **Export** : Export PNG/PDF doit fonctionner

## 8. Dépendances

- **B45-P0** : Design UX doit être complété (fait)
- **B45-P4** : Comparaisons pour graphiques comparatifs (optionnel)

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

