# Story B45-P9: Interface Avancée

**Statut:** Draft  
**Épopée:** [EPIC-B45 – Audit Sessions Avancé](../epics/epic-b45-audit-sessions-avance.md)  
**Module:** Frontend Admin + Backend API  
**Priorité:** P9 (Phase 3 - Expert)

## 1. Contexte

Pour améliorer l'expérience utilisateur lors d'audits fréquents, il est nécessaire d'ajouter des fonctionnalités avancées permettant de sauvegarder des vues personnalisées, personnaliser les colonnes, et optimiser l'export et l'impression.

Cette story fait partie de la Phase 3 (Expert) de l'Epic B45.

## 2. User Story

En tant que **administrateur**, je veux **sauvegarder mes vues personnalisées et personnaliser les colonnes**, afin d'optimiser mon workflow lors d'audits fréquents.

## 3. Critères d'acceptation

1. **Bouton "Sauvegarder cette vue"** : Sauvegarder nom, filtres, colonnes
2. **Liste des vues sauvegardées** : Menu déroulant avec vues sauvegardées
3. **Colonnes personnalisables** : Drag & drop pour réorganiser, show/hide pour afficher/masquer
4. **Export de la vue actuelle** : Export tableau tel qu'affiché (colonnes visibles uniquement)
5. **Mode impression optimisé** : CSS optimisé pour impression (masquer éléments inutiles)

## 4. Intégration & Compatibilité

- **Composants existants** : `SessionManager.tsx`, `ReceptionSessionManager.tsx`
- **Design** : Suivre architecture interface définie dans B45-P0
- **Stockage** : Base de données (décision technique)

## 5. Dev Notes

### Références Architecturales Clés

1. **COMMENCER PAR** : `docs/architecture/index.md` - Navigation complète de l'architecture
2. **Design UX** : `docs/ux/audit-sessions-advanced-design.md` - Architecture interface (validé dans B45-P0)
3. **Décisions techniques** : `docs/architecture/technical-decisions-b45.md` - Stockage BDD choisi
4. **Frontend** : `docs/architecture/6-architecture-des-composants.md` - Patterns composants React
5. **API** : `docs/architecture/7-design-et-intgration-api.md` - Design API et intégration
6. **Testing** : `docs/testing-strategy.md` - Standards de tests

### Décision Technique (Architect)

**Stockage Vues Sauvegardées** : ✅ **Base de données**
- Partage possible entre utilisateurs (futur)
- Persistance garantie
- Cohérence avec le reste de l'application
- Possibilité de permissions par vue

**Modèle** : `SavedView`
```python
class SavedView(Base):
    id: UUID
    user_id: UUID (ForeignKey users)
    name: str
    type: str (enum: "cash_session" | "reception_ticket")
    filters_json: JSONB
    columns_json: JSONB
    created_at: DateTime
    updated_at: DateTime
```

**Référence** : `docs/architecture/technical-decisions-b45.md` - Section 3

### Composant UI - SavedViewsMenu (Design UX)

**Référence** : `docs/ux/audit-sessions-advanced-design.md` - Component: SavedViewsMenu

**Spécifications** :
- **Variants** : Dropdown menu (menu déroulant avec liste vues), With actions (actions Charger, Modifier, Supprimer)
- **Position** : Barre d'outils, à côté du bouton Export
- **Actions** : Charger vue, Modifier vue, Supprimer vue

### Composant UI - ColumnCustomizer (Design UX)

**Référence** : `docs/ux/audit-sessions-advanced-design.md` - Component: ColumnCustomizer

**Spécifications** :
- **Drag & Drop** : Réorganiser colonnes par glisser-déposer
- **Show/Hide** : Checkbox pour afficher/masquer colonnes
- **Position** : Menu "⚙️ Colonnes" dans barre d'outils

### Nouveaux Endpoints à Créer

**Backend API** :

1. **`GET /v1/admin/saved-views`**
   - **Query Params** : `type` (optionnel: "cash_session" | "reception_ticket")
   - **Response** : Liste vues sauvegardées de l'utilisateur

2. **`POST /v1/admin/saved-views`**
   - **Body** : `{ "name": "string", "type": "cash_session", "filters": {...}, "columns": {...} }`
   - **Response** : Vue créée

3. **`PUT /v1/admin/saved-views/{id}`**
   - **Body** : Configuration modifiée
   - **Response** : Vue mise à jour

4. **`DELETE /v1/admin/saved-views/{id}`**
   - **Response** : Vue supprimée

5. **`GET /v1/admin/saved-views/{id}`**
   - **Response** : Détails vue (filtres + colonnes)

### Structure de Données

**Vue Sauvegardée** :
- **name** : Nom de la vue (ex: "Audit Mensuel Janvier")
- **type** : "cash_session" ou "reception_ticket"
- **filters** : JSON avec tous les filtres (date, opérateur, montant, etc.)
- **columns** : JSON avec configuration colonnes (ordre, visibilité)

**Configuration Colonnes** :
```json
{
  "columns": [
    { "id": "status", "visible": true, "order": 0 },
    { "id": "date", "visible": true, "order": 1 },
    { "id": "operator", "visible": true, "order": 2 },
    { "id": "total_sales", "visible": false, "order": 3 }
  ]
}
```

### Bibliothèques Frontend

**Drag & Drop** :
- `react-beautiful-dnd` ou `@dnd-kit/core` : Pour drag & drop colonnes

### Fichiers à Créer/Modifier

**Frontend** :
- `frontend/src/pages/Admin/SessionManager.tsx` : 
  - Ajouter bouton "Sauvegarder cette vue"
  - Ajouter menu "Vues sauvegardées"
  - Ajouter menu "⚙️ Colonnes" (ColumnCustomizer)
  - Gérer export vue actuelle (colonnes visibles uniquement)
- `frontend/src/pages/Admin/ReceptionSessionManager.tsx` : Même chose
- `frontend/src/components/SavedViewsMenu.tsx` : Nouveau composant
- `frontend/src/components/ColumnCustomizer.tsx` : Nouveau composant
- `frontend/src/services/savedViewsService.ts` : Nouveau service
- `frontend/src/styles/print.css` : CSS mode impression

**Backend** :
- `api/src/recyclic_api/models/saved_view.py` : Nouveau modèle
- `api/src/recyclic_api/services/saved_view_service.py` : Nouveau service
- `api/src/recyclic_api/api/api_v1/endpoints/saved_views.py` : Nouveaux endpoints

### Points d'Attention Techniques

1. **Persistance** : Sauvegarder configuration colonnes dans localStorage (temporaire) + BDD (permanent)
2. **Performance** : Drag & drop ne doit pas ralentir interface
3. **Export vue actuelle** : Exporter uniquement colonnes visibles
4. **Mode impression** : CSS `@media print` pour masquer éléments inutiles

## 6. Tasks / Subtasks

- [ ] **Backend - Modèle SavedView** (AC: 1, 2)
  - [ ] Créer modèle `SavedView`
  - [ ] Créer migration
  - [ ] Tests modèle (pytest)

- [ ] **Backend - Endpoints Vues Sauvegardées** (AC: 1, 2)
  - [ ] Créer endpoints CRUD (`GET`, `POST`, `PUT`, `DELETE`)
  - [ ] Tests endpoints (pytest)

- [ ] **Frontend - Composant SavedViewsMenu** (AC: 1, 2)
  - [ ] Créer composant `SavedViewsMenu.tsx`
  - [ ] Menu déroulant avec liste vues
  - [ ] Actions : Charger, Modifier, Supprimer
  - [ ] Tests composant (React Testing Library)

- [ ] **Frontend - Bouton Sauvegarder Vue** (AC: 1)
  - [ ] Ajouter bouton "Sauvegarder cette vue" dans barre d'outils
  - [ ] Modal pour nommer la vue
  - [ ] Sauvegarder filtres + colonnes
  - [ ] Tests composant (React Testing Library)

- [ ] **Frontend - Composant ColumnCustomizer** (AC: 3)
  - [ ] Créer composant `ColumnCustomizer.tsx`
  - [ ] Drag & drop pour réorganiser colonnes
  - [ ] Checkbox show/hide pour afficher/masquer
  - [ ] Persister configuration (localStorage + BDD)
  - [ ] Tests composant (React Testing Library)

- [ ] **Frontend - Export Vue Actuelle** (AC: 4)
  - [ ] Modifier export pour exporter uniquement colonnes visibles
  - [ ] Tests export

- [ ] **Frontend - Mode Impression** (AC: 5)
  - [ ] Créer CSS `@media print`
  - [ ] Masquer éléments inutiles (filtres, boutons)
  - [ ] Optimiser affichage tableau
  - [ ] Tests impression

- [ ] **Frontend - Service SavedViews** (AC: 1, 2)
  - [ ] Créer service `savedViewsService.ts`
  - [ ] Méthodes CRUD
  - [ ] Tests service (Jest)

- [ ] **Tests d'intégration** (AC: 1-5)
  - [ ] Test sauvegarde vue (pytest)
  - [ ] Test chargement vue (pytest)
  - [ ] Test configuration colonnes (pytest)

- [ ] **Tests E2E** (AC: 1-5)
  - [ ] Test workflow : Sauvegarder vue → Charger vue → Exporter (Playwright/Cypress)

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

1. **Persistance** : Vérifier sauvegarde/chargement vues
2. **Drag & Drop** : Vérifier réorganisation colonnes
3. **Export** : Vérifier export uniquement colonnes visibles
4. **Impression** : Vérifier mode impression optimisé

## 8. Dépendances

- **B45-P0** : Design UX doit être complété (fait)
- **B45-P1** : Export Global doit exister (prérequis logique)

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

