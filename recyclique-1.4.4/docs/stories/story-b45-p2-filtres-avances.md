# Story B45-P2: Filtres Avancés

**Statut:** Ready for Review  
**Épopée:** [EPIC-B45 – Audit Sessions Avancé](../epics/epic-b45-audit-sessions-avance.md)  
**Module:** Frontend Admin  
**Priorité:** P2 (Phase 1 - Fondations)

## 1. Contexte

Les filtres actuels dans `SessionManager.tsx` et `ReceptionSessionManager.tsx` sont basiques (date, statut, opérateur/bénévole). Pour un audit efficace, il faut des filtres avancés permettant de cibler précisément les sessions/tickets selon des critères métier (montant, variance, durée, etc.).

Cette story fait partie de la Phase 1 (Fondations) de l'Epic B45 et est un prérequis pour les fonctionnalités d'analyse avancée (Phase 2).

## 2. User Story

En tant que **administrateur**, je veux **filtrer les sessions/tickets avec des critères avancés (montant, variance, durée, etc.)**, afin de cibler précisément les données à analyser lors des audits.

## 3. Critères d'acceptation

1. **Filtres avancés Sessions de Caisse** :
   - Montant min/max (CA total)
   - Variance (oui/non ou seuil numérique)
   - Durée session (min/max en heures)
   - Méthode paiement (multi-sélection)
   - Présence don (oui/non)

2. **Filtres avancés Sessions de Réception** :
   - Poids min/max (kg)
   - Catégorie (multi-sélection)
   - Destination (multi-sélection)
   - Nombre lignes min/max

3. **Filtres combinables** : Tous les filtres utilisent une logique ET (tous les critères doivent être satisfaits)

4. **Sauvegarde filtres dans URL** : Les filtres sont encodés dans l'URL (query params) pour permettre le partage de vues filtrées

5. **Interface utilisateur** : Filtres avancés dans un accordéon expandable sous les filtres de base (selon design B45-P0)

## 4. Intégration & Compatibilité

- **Composants existants** : `SessionManager.tsx`, `ReceptionSessionManager.tsx`
- **Filtres existants** : Date, statut, opérateur/bénévole, recherche
- **Backend** : Endpoints doivent supporter les nouveaux filtres
- **Design** : Suivre architecture interface définie dans B45-P0

## 5. Dev Notes

### Références Architecturales Clés

1. **COMMENCER PAR** : `docs/architecture/index.md` - Navigation complète de l'architecture
2. **Design UX** : `docs/ux/audit-sessions-advanced-design.md` - Architecture interface (validé dans B45-P0)
3. **Frontend** : `docs/architecture/6-architecture-des-composants.md` - Patterns composants React
4. **API** : `docs/architecture/7-design-et-intgration-api.md` - Design API et intégration
5. **Décisions techniques** : `docs/architecture/technical-decisions-b45.md` - Décisions prises par l'Architect
6. **Testing** : `docs/testing-strategy.md` - Standards de tests

### Composants Existants à Étudier

- **`frontend/src/pages/Admin/SessionManager.tsx`** : 
  - Filtres actuels (lignes ~22-100)
  - Structure `FiltersBar`
  - Gestion état filtres
  
- **`frontend/src/pages/Admin/ReceptionSessionManager.tsx`** :
  - Filtres actuels
  - Structure similaire à SessionManager

### Structure de Données

**Filtres Sessions de Caisse** :
```typescript
interface AdvancedCashSessionFilters {
  // Filtres existants
  date_from?: string
  date_to?: string
  status?: 'open' | 'closed'
  operator_id?: string
  site_id?: string
  search?: string
  
  // Nouveaux filtres avancés
  amount_min?: number
  amount_max?: number
  variance_threshold?: number
  variance_has_variance?: boolean  // true = avec variance, false = sans variance
  duration_min_hours?: number
  duration_max_hours?: number
  payment_methods?: string[]  // multi-sélection
  has_donation?: boolean
}
```

**Filtres Sessions de Réception** :
```typescript
interface AdvancedReceptionTicketFilters {
  // Filtres existants
  date_from?: string
  date_to?: string
  status?: 'open' | 'closed'
  benevole_id?: string
  site_id?: string
  search?: string
  
  // Nouveaux filtres avancés
  poids_min?: number
  poids_max?: number
  categories?: string[]  // multi-sélection
  destinations?: string[]  // multi-sélection
  lignes_min?: number
  lignes_max?: number
}
```

### Endpoints API à Étendre

**Backend** :

1. **`GET /v1/admin/cash-sessions`** : Étendre pour supporter nouveaux filtres
   - Ajouter query params : `amount_min`, `amount_max`, `variance_threshold`, `variance_has_variance`, `duration_min_hours`, `duration_max_hours`, `payment_methods[]`, `has_donation`

2. **`GET /v1/reception/tickets`** : Étendre pour supporter nouveaux filtres
   - Ajouter query params : `poids_min`, `poids_max`, `categories[]`, `destinations[]`, `lignes_min`, `lignes_max`

### Sauvegarde URL (Query Params)

**Format** : Encoder tous les filtres dans l'URL
- Exemple : `/admin/cash-sessions?date_from=2025-01-01&date_to=2025-01-31&amount_min=100&variance_threshold=10&payment_methods[]=cash&payment_methods[]=card`

**Bibliothèque** : Utiliser `URLSearchParams` (natif) ou `query-string` si besoin de plus de fonctionnalités

**Synchronisation** :
- Au chargement : Lire filtres depuis URL
- Au changement filtre : Mettre à jour URL (sans rechargement page)
- Au partage : URL contient tous les filtres

### Composant UI - AdvancedFiltersAccordion (Design UX)

**Référence** : `docs/ux/audit-sessions-advanced-design.md` - Component: AdvancedFiltersAccordion

**Spécifications** :
- **Position** : Sous les filtres de base (toujours visibles)
- **Pattern** : Accordéon expandable
- **Par défaut** : Fermé (masqué) pour ne pas surcharger l'interface
- **Bouton** : "Filtres Avancés ▼" pour ouvrir/fermer
- **Animation** : Transition douce (0.2s) selon design UX
- **Responsive** : Sur mobile/tablette, utiliser modal au lieu d'accordéon

**Pattern d'interaction** :
1. Clic sur "Filtres Avancés ▼" → Accordéon s'ouvre
2. Remplir critères avancés
3. Clic sur "Appliquer" → Filtres appliqués, URL mise à jour, tableau mis à jour
4. Accordéon peut rester ouvert ou se fermer automatiquement

**User Flow** : Voir `docs/ux/audit-sessions-advanced-design.md` - Flow 2: Filtres Avancés

**Composants UI** :
- **Inputs numériques** : Montant min/max, poids min/max, durée min/max, lignes min/max
- **Select multi** : Méthode paiement, catégorie, destination
- **Toggle/Switch** : Variance oui/non, présence don
- **Slider (optionnel)** : Pour ranges (montant, poids)

### Fichiers à Créer/Modifier

**Frontend** :
- `frontend/src/pages/Admin/SessionManager.tsx` : 
  - Ajouter section filtres avancés (accordéon)
  - Ajouter gestion état nouveaux filtres
  - Ajouter synchronisation URL
- `frontend/src/pages/Admin/ReceptionSessionManager.tsx` :
  - Ajouter section filtres avancés (accordéon)
  - Ajouter gestion état nouveaux filtres
  - Ajouter synchronisation URL
- `frontend/src/services/cashSessionsService.ts` : Étendre interface `CashSessionFilters`
- `frontend/src/services/receptionTicketsService.ts` : Étendre interface filtres

**Backend** :
- `api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py` : Ajouter query params nouveaux filtres
- `api/src/recyclic_api/api/api_v1/endpoints/reception.py` : Ajouter query params nouveaux filtres
- `api/src/recyclic_api/services/cash_session_service.py` : Logique filtrage avancé
- `api/src/recyclic_api/services/reception_service.py` : Logique filtrage avancé

### Écarts Identifiés (Audit Brownfield)

**Référence** : `docs/architecture/audit-brownfield-b45-validation.md` - Section 4.1

**Fonctionnalités manquantes** :
- ❌ **Filtres avancés** : Code actuel ne contient que filtres de base (date, statut, opérateur, site, recherche)
- ❌ **Schéma** : `CashSessionFilters` ne contient pas les nouveaux champs (montant, variance, durée, paiement, don)
- ❌ **Service** : `CashSessionService.get_sessions_with_filters()` ne supporte pas les filtres avancés

**Action requise** : Étendre `CashSessionFilters` et `CashSessionService.get_sessions_with_filters()` pour supporter tous les filtres avancés

### Points d'Attention Techniques

1. **Performance** :
   - Filtres côté backend (pas côté client)
   - Index DB si nécessaire (montant, poids, variance)
   - Pagination maintenue avec filtres
   - **Variance** : Calculer variance côté backend si pas déjà fait
   - **Durée** : Calculer durée session (closed_at - opened_at) côté backend

2. **Variance** :
   - Calculer variance côté backend si pas déjà fait
   - Filtrer par seuil ou présence/absence

3. **Multi-sélection** :
   - Utiliser composant Mantine `MultiSelect` ou équivalent
   - Encoder dans URL comme array : `payment_methods[]=cash&payment_methods[]=card`

4. **Synchronisation URL** :
   - Débounce pour éviter trop de mises à jour URL
   - Gérer historique navigateur (back/forward)

5. **Validation** :
   - Min < Max pour ranges
   - Formats numériques valides
   - Dates cohérentes

## 6. Tasks / Subtasks

- [x] **Backend - Étendre Endpoint Sessions de Caisse** (AC: 1)
  - [x] Ajouter query params nouveaux filtres dans `cash_sessions.py`
  - [x] Implémenter logique filtrage avancé dans `cash_session_service.py`
  - [x] Calculer variance si nécessaire
  - [x] Calculer durée session si nécessaire
  - [x] Tests unitaires filtres (pytest)

- [x] **Backend - Étendre Endpoint Tickets de Réception** (AC: 2)
  - [x] Ajouter query params nouveaux filtres dans `reception.py`
  - [x] Implémenter logique filtrage avancé dans `reception_service.py`
  - [x] Tests unitaires filtres (pytest)

- [x] **Frontend - Service Filtres Sessions** (AC: 1, 3, 4)
  - [x] Étendre interface `CashSessionFilters` dans `cashSessionsService.ts`
  - [x] Ajouter fonction encodage/décodage URL
  - [x] Tests unitaires service (Vitest)

- [x] **Frontend - Service Filtres Tickets** (AC: 2, 3, 4)
  - [x] Étendre interface filtres dans `receptionTicketsService.ts`
  - [x] Ajouter fonction encodage/décodage URL
  - [x] Tests unitaires service (Vitest)

- [x] **Frontend - UI Filtres Avancés SessionManager** (AC: 1, 3, 4, 5)
  - [x] Créer composant accordéon filtres avancés
  - [x] Ajouter inputs numériques (montant, variance, durée)
  - [x] Ajouter select multi (méthode paiement)
  - [x] Ajouter toggle (variance, don)
  - [x] Intégrer dans `SessionManager.tsx`
  - [x] Synchroniser avec URL (lecture/écriture)

- [x] **Frontend - UI Filtres Avancés ReceptionSessionManager** (AC: 2, 3, 4, 5)
  - [x] Créer composant accordéon filtres avancés
  - [x] Ajouter inputs numériques (poids, lignes)
  - [x] Ajouter select multi (catégorie, destination)
  - [x] Intégrer dans `ReceptionSessionManager.tsx`
  - [x] Synchroniser avec URL (lecture/écriture)

- [x] **Tests d'intégration** (AC: 1-5)
  - [x] Test filtres avancés sessions (pytest)
  - [x] Test filtres avancés tickets (pytest)
  - [x] Test combinaison filtres (ET logique)
  - [x] Test synchronisation URL

- [x] **Tests E2E** (AC: 1-5)
  - [x] Test workflow : Appliquer filtres avancés → Vérifier résultats (Playwright)
  - [x] Test partage URL : Copier URL → Ouvrir dans nouvel onglet → Vérifier filtres appliqués

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

1. **Filtres combinés** : Vérifier que tous les filtres fonctionnent ensemble (ET logique)
2. **Synchronisation URL** : Vérifier que filtres sont correctement encodés/décodés
3. **Performance** : Filtres ne doivent pas ralentir l'affichage
4. **Validation** : Min < Max, formats valides

## 8. Dépendances

- **B45-P0** : Design UX doit être complété avant (architecture interface)
- **B45-P1** : Export global peut utiliser ces filtres (pas bloquant)

## 9. Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-27 | 1.0 | Création story initiale | Bob (SM) |

## 10. Dev Agent Record

### Agent Model Used
Claude Sonnet 4.5 (via Cursor)

### Debug Log References
N/A

### Completion Notes List
- **Backend Sessions de Caisse (AC: 1)** : Implémentation complète des filtres avancés (montant, variance, durée, méthodes de paiement, don). Tests créés et validés.
- **Backend Tickets de Réception (AC: 2)** : Implémentation complète des filtres avancés (poids, catégories, destinations, nombre de lignes). Tests créés et validés.
- **Frontend Services (AC: 3, 4)** : Interfaces étendues avec tous les filtres avancés. Fonctions d'encodage/décodage URL implémentées. Tests unitaires créés.
- **Frontend UI SessionManager (AC: 1, 3, 4, 5)** : Composant accordéon créé et intégré. Synchronisation URL complète. Tous les filtres avancés disponibles.
- **Frontend UI ReceptionSessionManager (AC: 2, 3, 4, 5)** : Composant accordéon intégré. Synchronisation URL complète. Tous les filtres avancés disponibles.
- **Tests d'intégration (AC: 1-5)** : Tests de combinaison de filtres (logique ET) et synchronisation URL créés.
- **Tests E2E (AC: 1-5)** : Tests Playwright pour workflow complet et partage URL créés.
- **Statut** : Toutes les tâches complétées. Prêt pour review.

### File List
**Backend - Sessions de Caisse :**
- `api/src/recyclic_api/schemas/cash_session.py` (modifié - ajout filtres avancés)
- `api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py` (modifié - ajout query params)
- `api/src/recyclic_api/services/cash_session_service.py` (modifié - logique filtrage avancé)
- `api/tests/test_cash_sessions_advanced_filters.py` (nouveau - tests filtres avancés)

**Backend - Tickets de Réception :**
- `api/src/recyclic_api/api/api_v1/endpoints/reception.py` (modifié - ajout query params)
- `api/src/recyclic_api/services/reception_service.py` (modifié - logique filtrage avancé)
- `api/tests/test_reception_tickets_advanced_filters.py` (nouveau - tests filtres avancés)

**Backend - Tests d'intégration :**
- `api/tests/test_advanced_filters_integration.py` (nouveau - tests combinaison filtres)

**Frontend - Services :**
- `frontend/src/services/cashSessionsService.ts` (modifié - interface étendue + fonctions URL)
- `frontend/src/services/receptionTicketsService.ts` (modifié - interface étendue + fonctions URL)
- `frontend/src/services/__tests__/cashSessionFiltersUrl.test.ts` (nouveau - tests encodage/décodage)
- `frontend/src/services/__tests__/receptionTicketFiltersUrl.test.ts` (nouveau - tests encodage/décodage)

**Frontend - Composants UI :**
- `frontend/src/components/Admin/AdvancedFiltersAccordion.tsx` (nouveau - composant accordéon réutilisable)
- `frontend/src/pages/Admin/SessionManager.tsx` (modifié - intégration filtres avancés + synchronisation URL)
- `frontend/src/pages/Admin/ReceptionSessionManager.tsx` (modifié - intégration filtres avancés + synchronisation URL)

**Frontend - Tests E2E :**
- `frontend/tests/e2e/advanced-filters.spec.ts` (nouveau - tests E2E Playwright)

**Frontend - Tests Composants :**
- `frontend/src/components/Admin/__tests__/AdvancedFiltersAccordion.test.tsx` (nouveau - tests composant accordéon)

## 11. QA Results

### Review Date: 2025-01-27

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

**Excellent** - Implémentation complète et bien structurée. Le code respecte les patterns existants du projet et suit les bonnes pratiques. Architecture claire avec séparation des responsabilités (composant réutilisable, services, backend).

**Points forts :**
- Tests exhaustifs : Backend (3 fichiers), Frontend (2 fichiers), Intégration (1 fichier), E2E (1 fichier Playwright)
- Composant réutilisable : `AdvancedFiltersAccordion` bien conçu et réutilisable
- Synchronisation URL : Implémentation robuste avec `URLSearchParams` et gestion historique navigateur
- Filtres backend : Tous les filtres appliqués côté serveur pour performance optimale
- Gestion cas limites : Null values, ranges (min < max), multi-sélection bien gérés
- Architecture cohérente : Suit le design UX validé dans B45-P0

**Points d'amélioration mineurs :**
- Aucun point critique identifié

### Refactoring Performed

Aucun refactoring nécessaire. Le code est déjà bien structuré et suit les standards du projet.

### Compliance Check

- **Coding Standards**: ✓ Conforme - Code suit les conventions TypeScript/React et Python
- **Project Structure**: ✓ Conforme - Fichiers placés aux bons emplacements selon la structure du projet
- **Testing Strategy**: ✓ Conforme - Tests unitaires, intégration et E2E complets
- **All ACs Met**: ✓ Tous les critères d'acceptation sont implémentés et testés

### Requirements Traceability

**Mapping AC → Tests :**

- **AC1** (Filtres avancés Sessions de Caisse) → ✅ Testé backend (`test_cash_sessions_advanced_filters.py`), frontend (composant), E2E
- **AC2** (Filtres avancés Sessions de Réception) → ✅ Testé backend (`test_reception_tickets_advanced_filters.py`), frontend (composant), E2E
- **AC3** (Filtres combinables - logique ET) → ✅ Testé (`test_advanced_filters_integration.py`)
- **AC4** (Sauvegarde filtres dans URL) → ✅ Testé frontend (`cashSessionFiltersUrl.test.ts`, `receptionTicketFiltersUrl.test.ts`), E2E (partage URL)
- **AC5** (Interface utilisateur - accordéon) → ✅ Testé frontend (`AdvancedFiltersAccordion.test.tsx`), E2E

**Coverage gaps :**
- Aucun gap identifié

### Test Architecture Assessment

**Backend Tests** (pytest) : ✅ **Excellent**
- Tests unitaires complets pour chaque filtre avancé (montant, variance, durée, paiement, don)
- Tests d'intégration pour combinaison de filtres (logique ET)
- Couverture exhaustive des cas limites (null values, ranges)
- Utilisation fixtures appropriées, structure AAA respectée

**Frontend Tests** (Vitest) : ✅ **Excellent**
- Tests unitaires pour composant `AdvancedFiltersAccordion`
- Tests pour encodage/décodage URL (`cashSessionFiltersUrl.test.ts`, `receptionTicketFiltersUrl.test.ts`)
- Mocks appropriés, structure claire

**Tests E2E** (Playwright) : ✅ **Excellent**
- Tests workflow complet : Appliquer filtres → Vérifier résultats
- Tests partage URL : Copier URL → Ouvrir dans nouvel onglet → Vérifier filtres appliqués
- Scénarios complets et bien documentés

**Test Level Appropriateness** : ✅ Correct
- Unitaires pour composants UI isolés et fonctions utilitaires
- Intégration pour endpoints API et combinaison de filtres
- E2E pour workflows complets utilisateur

### Security Review

**Statut : PASS**

- Filtres appliqués côté backend : Validation des paramètres via schémas Pydantic
- Pas de risques d'injection : Paramètres validés et typés
- Pas de risques de sécurité identifiés

### Performance Considerations

**Statut : PASS**

- Filtres appliqués côté backend : Pas de filtrage côté client, performance optimale
- Pagination maintenue : Filtres n'affectent pas la pagination
- Calculs optimisés : Durée et variance calculés efficacement côté backend
- Index DB : Utilisation appropriée des index existants

### Files Modified During Review

Aucun fichier modifié. L'implémentation est de qualité et ne nécessite pas de refactoring.

### Gate Status

**Gate: PASS** → `docs/qa/gates/b45.p2-filtres-avances.yml`

**Résumé** : Implémentation complète et solide avec tests exhaustifs (backend, frontend, intégration, E2E). Tous les critères d'acceptation implémentés. Qualité code excellente, architecture cohérente, synchronisation URL bien gérée.

**Quality Score : 95/100**

### Recommended Status

✅ **Ready for Done** - Les fonctionnalités sont complètes, tous les ACs sont implémentés et testés. Tests exhaustifs à tous les niveaux (unitaire, intégration, E2E). L'implémentation est prête pour la production.

(Story owner décide du statut final)

