# Story B45-P4: Comparaisons Périodes

**Statut:** Draft  
**Épopée:** [EPIC-B45 – Audit Sessions Avancé](../epics/epic-b45-audit-sessions-avance.md)  
**Module:** Frontend Admin + Backend API  
**Priorité:** P4 (Phase 2 - Analyses)

## 1. Contexte

Pour analyser les tendances et identifier les évolutions, il est nécessaire de pouvoir comparer les KPIs d'une période avec une période de référence (semaine précédente, mois précédent, etc.). Cette fonctionnalité permet de visualiser les variations et d'identifier rapidement les changements significatifs.

Cette story fait partie de la Phase 2 (Analyses) de l'Epic B45 et nécessite que les exports globaux (B45-P1) soient disponibles.

## 2. User Story

En tant que **administrateur**, je veux **comparer les KPIs d'une période avec une période de référence**, afin d'identifier rapidement les tendances et les variations significatives.

## 3. Critères d'acceptation

1. **Sélecteur "Comparer avec"** : Toggle dans barre d'outils avec options :
   - Semaine précédente
   - Mois précédent
   - Année précédente
   - Période personnalisée (sélecteur dates)

2. **Affichage côte à côte** : KPIs période actuelle vs période de référence affichés côte à côte

3. **Différences calculées** : Badges +X% ou -X% pour chaque KPI montrant la variation

4. **Graphiques comparatifs** : Graphiques en barres groupées ou lignes doubles dans onglet "Graphiques"

5. **Toggle activable/désactivable** : Retour immédiat à vue normale quand toggle désactivé

6. **Gestion erreurs** : Messages clairs si période de référence sans données

## 4. Intégration & Compatibilité

- **Story précédente** : B45-P1 (Export Global) - Nécessaire pour calculer KPIs
- **Composants existants** : `SessionManager.tsx`, `ReceptionSessionManager.tsx`
- **Endpoints existants** : `GET /v1/admin/cash-sessions/stats` (KPIs actuels)
- **Design** : Suivre architecture interface définie dans B45-P0

## 5. Dev Notes

### Références Architecturales Clés

1. **COMMENCER PAR** : `docs/architecture/index.md` - Navigation complète de l'architecture
2. **Design UX** : `docs/ux/audit-sessions-advanced-design.md` - Architecture interface (validé dans B45-P0)
3. **Frontend** : `docs/architecture/6-architecture-des-composants.md` - Patterns composants React
4. **API** : `docs/architecture/7-design-et-intgration-api.md` - Design API et intégration
5. **Décisions techniques** : `docs/architecture/technical-decisions-b45.md` - Décisions prises par l'Architect
6. **Testing** : `docs/testing-strategy.md` - Standards de tests

### Composant UI - ComparisonToggle (Design UX)

**Référence** : `docs/ux/audit-sessions-advanced-design.md` - Component: ComparisonToggle

**Spécifications** :
- **Position** : Barre d'outils, à côté du bouton Export
- **Variants** : Toggle ON/OFF + sélecteur période (apparaît quand toggle activé)
- **States** : Off (par défaut), On (comparaison active), Loading (chargement données)
- **Sélecteur période** : Menu déroulant avec options (Semaine précédente, Mois précédent, Année précédente, Période personnalisée)

**Pattern d'interaction** :
1. Activer toggle "Comparer avec..." → Sélecteur période apparaît
2. Choisir période → Calcul automatique dates + chargement données comparaison
3. Affichage côte à côte KPIs avec badges +X% / -X%
4. Désactiver toggle → Retour immédiat à vue normale

**User Flow détaillé** : Voir `docs/ux/audit-sessions-advanced-design.md` - Flow 3: Comparaison Périodes (Phase 2)

### Endpoints API Existants

**Sessions de Caisse** :
- `GET /v1/admin/cash-sessions/stats` : KPIs période actuelle (existant)
  - Retourne : CA total, Nb ventes, Poids total, Total dons, Nb sessions

**Sessions de Réception** :
- `GET /v1/reception/tickets/stats/summary` : KPIs période actuelle (si existe)

### Nouveaux Endpoints à Créer

**Backend API** :

1. **`GET /v1/admin/cash-sessions/stats/compare`**
   - **Query Params** : 
     - `date_from` : Date début période actuelle
     - `date_to` : Date fin période actuelle
     - `compare_date_from` : Date début période de référence
     - `compare_date_to` : Date fin période de référence
     - `filters` : Filtres optionnels (opérateur, site, etc.)
   - **Response** :
     ```json
     {
       "current_period": {
         "date_from": "2025-01-01",
         "date_to": "2025-01-31",
         "kpis": { "total_sales": 10000, "nb_sessions": 50, ... }
       },
       "compare_period": {
         "date_from": "2024-12-01",
         "date_to": "2024-12-31",
         "kpis": { "total_sales": 9500, "nb_sessions": 48, ... }
       },
       "differences": {
         "total_sales": { "value": 500, "percent": 5.26 },
         "nb_sessions": { "value": 2, "percent": 4.17 }
       }
     }
     ```

2. **`GET /v1/reception/tickets/stats/compare`**
   - Même structure que ci-dessus pour tickets de réception

### Structure de Données

**KPIs Comparés** :
- **Sessions de Caisse** : CA total, Nb ventes, Poids total, Total dons, Nb sessions, Variance moyenne
- **Sessions de Réception** : Poids total, Nb tickets, Nb lignes, Nb bénévoles actifs

**Calcul Différences** :
- **Valeur absolue** : `current - compare`
- **Pourcentage** : `((current - compare) / compare) * 100`
- **Gestion division par zéro** : Afficher "N/A" ou "∞" si compare = 0

### Affichage UI

**Cards KPIs Côte à Côte** :
```
┌─────────────────┬─────────────────┐
│ Période Actuelle│ Période Référence│
├─────────────────┼─────────────────┤
│ CA Total: 10000€ │ CA Total: 9500€ │
│                 │ Diff: +500€ (+5%)│
└─────────────────┴─────────────────┘
```

**Badges** :
- **+X%** : Badge vert (augmentation)
- **-X%** : Badge rouge (diminution)
- **0%** : Badge gris (pas de changement)

### Graphiques Comparatifs

**Onglet "Graphiques"** (Phase 2, B45-P6) :
- **Barres groupées** : Deux barres côte à côte pour chaque KPI
- **Lignes doubles** : Deux lignes sur graphique linéaire (évolution dans le temps)

### Fichiers à Créer/Modifier

**Frontend** :
- `frontend/src/pages/Admin/SessionManager.tsx` : 
  - Ajouter composant `ComparisonToggle` dans barre d'outils
  - Ajouter affichage côte à côte KPIs
  - Ajouter badges différences
- `frontend/src/pages/Admin/ReceptionSessionManager.tsx` : Même chose
- `frontend/src/services/cashSessionsService.ts` : Ajouter méthode `getStatsCompare()`
- `frontend/src/services/receptionTicketsService.ts` : Ajouter méthode `getStatsCompare()`

**Backend** :
- `api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py` : Créer endpoint `/stats/compare`
- `api/src/recyclic_api/api/api_v1/endpoints/reception.py` : Créer endpoint `/stats/compare`
- `api/src/recyclic_api/services/cash_session_service.py` : Ajouter méthode `get_stats_compare()`
- `api/src/recyclic_api/services/reception_service.py` : Ajouter méthode `get_stats_compare()`

### Points d'Attention Techniques

1. **Performance** :
   - Deux requêtes KPIs (période actuelle + période référence)
   - Mettre en cache si même période de référence demandée plusieurs fois
   - Calcul différences côté serveur

2. **Gestion division par zéro** :
   - Si période référence = 0, afficher "N/A" ou "∞"
   - Valider côté backend avant calcul

3. **Périodes personnalisées** :
   - Validation : date_from < date_to
   - Validation : compare_date_from < compare_date_to
   - Normalisation optionnelle si périodes de longueurs différentes

4. **Filtres** :
   - Appliquer mêmes filtres aux deux périodes pour comparaison équitable
   - Exclure filtres de date (remplacés par périodes de comparaison)

## 6. Tasks / Subtasks

- [ ] **Backend - Endpoint Comparaison Sessions** (AC: 1, 2, 3)
  - [ ] Créer endpoint `GET /v1/admin/cash-sessions/stats/compare`
  - [ ] Implémenter logique calcul KPIs période actuelle
  - [ ] Implémenter logique calcul KPIs période référence
  - [ ] Calculer différences (valeur absolue + pourcentage)
  - [ ] Gérer division par zéro
  - [ ] Tests unitaires endpoint (pytest)

- [ ] **Backend - Endpoint Comparaison Tickets** (AC: 1, 2, 3)
  - [ ] Créer endpoint `GET /v1/reception/tickets/stats/compare`
  - [ ] Même logique que sessions
  - [ ] Tests unitaires endpoint (pytest)

- [ ] **Frontend - Service Comparaison** (AC: 1, 2, 3)
  - [ ] Ajouter méthode `getStatsCompare()` dans `cashSessionsService.ts`
  - [ ] Ajouter méthode `getStatsCompare()` dans `receptionTicketsService.ts`
  - [ ] Gérer calcul automatique dates (semaine/mois/année précédente)
  - [ ] Tests unitaires service (Jest)

- [ ] **Frontend - Composant ComparisonToggle** (AC: 1, 5)
  - [ ] Créer composant `ComparisonToggle` (toggle + sélecteur)
  - [ ] Intégrer dans barre d'outils `SessionManager.tsx`
  - [ ] Intégrer dans barre d'outils `ReceptionSessionManager.tsx`
  - [ ] Gérer états (off, on, loading)
  - [ ] Tests composant (React Testing Library)

- [ ] **Frontend - Affichage Côte à Côte KPIs** (AC: 2, 3)
  - [ ] Modifier composant KPIs Cards pour affichage côte à côte
  - [ ] Ajouter badges différences (+X% / -X%)
  - [ ] Gérer états loading et erreur
  - [ ] Tests composant (React Testing Library)

- [ ] **Frontend - Graphiques Comparatifs** (AC: 4)
  - [ ] Étendre composant graphiques (B45-P6) pour comparaison
  - [ ] Ajouter barres groupées pour comparaison
  - [ ] Ajouter lignes doubles pour évolution
  - [ ] Tests composant (React Testing Library)

- [ ] **Tests d'intégration** (AC: 1-6)
  - [ ] Test comparaison sessions (pytest)
  - [ ] Test comparaison tickets (pytest)
  - [ ] Test gestion division par zéro
  - [ ] Test périodes personnalisées

- [ ] **Tests E2E** (AC: 1-6)
  - [ ] Test workflow : Activer comparaison → Vérifier affichage (Playwright/Cypress)

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

1. **Calcul différences** : Vérifier calculs corrects (valeur absolue + pourcentage)
2. **Division par zéro** : Gérer cas où période référence = 0
3. **Performance** : Deux requêtes KPIs ne doivent pas ralentir l'interface
4. **Toggle** : Activation/désactivation doit être instantanée

## 8. Dépendances

- **B45-P0** : Design UX doit être complété (fait)
- **B45-P1** : Export Global doit exister (prérequis logique pour KPIs)
- **B45-P6** : Visualisations pour graphiques comparatifs (optionnel, peut être fait en parallèle)

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

