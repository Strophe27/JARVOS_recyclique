# Story B50-P8: Page Analyse Rapide - Comparaison de Périodes

**Statut:** Done  
**Épopée:** [EPIC-50 – Améliorations Exports, Permissions et Statistiques](../prd/epic-50-ameliorations-exports-permissions-stats.md)  
**Module:** Frontend Admin  
**Priorité:** P1

---

## 1. Contexte

Les administrateurs ont besoin d'un outil simple et rapide pour comparer les statistiques de sortie (poids) entre différentes périodes, notamment pour analyser l'impact d'opérations spéciales (ex: opération textile gratuite).

**Problème actuel :**
- L'export Excel permet des analyses mais n'est pas assez rapide
- Pas d'outil dédié pour comparer rapidement deux périodes
- Besoin de voir l'impact immédiatement (poids, variation, pourcentage)

**Cas d'usage :**
- Comparer le poids textile sorti hier/avant-hier vs semaine dernière
- Analyser l'impact d'une opération promotionnelle
- Comparer n'importe quelle catégorie entre deux périodes

## 2. User Story

En tant que **administrateur**, je veux **accéder rapidement à une page d'analyse comparative depuis le gestionnaire de sessions**, afin de comparer le poids sorti entre deux périodes pour n'importe quelle catégorie et voir immédiatement l'impact d'une opération.

## 3. Critères d'acceptation

1. **Page dédiée** : Nouvelle page `/admin/quick-analysis` accessible uniquement aux admins
2. **Raccourci depuis SessionManager** : Bouton/lien visible dans la page de gestion des sessions de caisse
3. **Sélecteurs de périodes** : Deux sélecteurs de dates (période 1 et période 2) avec boutons rapides
4. **Sélecteur de catégorie** : Dropdown avec toutes les catégories principales (toutes catégories disponibles)
5. **Affichage comparatif** : Cards avec poids période 1, période 2, et différence (kg et %)
6. **Graphique comparatif** : Graphique en barres côte à côte pour visualisation
7. **Placeholder export** : Bouton "Exporter" visible mais désactivé avec texte "À venir"
8. **Résultats instantanés** : Les résultats se chargent automatiquement lors du changement de sélection
9. **Gestion erreurs** : Affichage d'erreurs claires si les données ne peuvent pas être chargées

## 4. Implémentation

### Étape 1 : Créer la page QuickAnalysis

**Fichier** : `frontend/src/pages/Admin/QuickAnalysis.tsx` (nouveau)

**Structure de la page :**
1. **Header** : Titre "Analyse Rapide - Comparaison de Périodes"
2. **Section Filtres** :
   - Sélecteur de catégorie (dropdown)
   - Sélecteur période 1 (date picker + boutons rapides)
   - Sélecteur période 2 (date picker + boutons rapides)
3. **Section Résultats** :
   - 3 Cards : Période 1, Période 2, Comparaison
   - Graphique comparatif (barres)
   - Tableau détaillé (si période > 1 jour)
4. **Section Actions** :
   - Bouton "Exporter" (désactivé avec placeholder "À venir")

### Étape 2 : Ajouter le raccourci dans SessionManager

**Fichier** : `frontend/src/pages/Admin/SessionManager.tsx`

**Emplacement** : Dans la section header/toolbar, à côté des boutons d'export existants

**Implémentation :**
```tsx
// Ajouter un bouton dans la toolbar
<QuickAnalysisButton onClick={() => navigate('/admin/quick-analysis')}>
  <BarChart3 size={18} />
  Analyse Rapide
</QuickAnalysisButton>
```

### Étape 3 : Créer les composants réutilisables

**Fichiers à créer :**
- `frontend/src/components/Admin/PeriodSelector.tsx` : Sélecteur de période avec boutons rapides
- `frontend/src/components/Admin/ComparisonCards.tsx` : Cards de comparaison
- `frontend/src/components/Admin/ComparisonChart.tsx` : Graphique comparatif

### Étape 4 : Utiliser l'API existante

**Endpoint utilisé :** `GET /v1/stats/sales/by-category?start_date=X&end_date=Y`

**Logique :**
- Appeler l'API 2 fois (une pour chaque période)
- Filtrer les résultats par catégorie sélectionnée
- Calculer la différence et le pourcentage

## 5. Dev Notes

### Références Architecturales

1. **API Stats** : `api/src/recyclic_api/api/api_v1/endpoints/stats.py:118-160`
2. **Service Stats** : `api/src/recyclic_api/services/stats_service.py:208-246`
3. **Page SessionManager** : `frontend/src/pages/Admin/SessionManager.tsx`
4. **Composants graphiques** : Réutiliser Recharts (déjà utilisé dans Dashboard)

### Structure des Données

**Réponse API `/v1/stats/sales/by-category` :**
```typescript
interface CategoryStats {
  category_name: string;
  total_weight: number;  // en kg
  total_items: number;
}
```

**Données pour comparaison :**
- Période 1 : `{ weight: number, items: number }`
- Période 2 : `{ weight: number, items: number }`
- Différence : `{ weight_diff: number, weight_percent: number, items_diff: number }`

### Boutons Rapides de Période

**Période 1 :**
- "Hier" : Date d'hier
- "Avant-hier" : Date d'avant-hier
- "Aujourd'hui" : Date d'aujourd'hui

**Période 2 :**
- "Semaine dernière" : Même jour de la semaine dernière
- "Mois dernier" : Même jour du mois dernier
- "Il y a 7 jours" : Date - 7 jours

### Placeholder Export

**Implémentation :**
```tsx
<ExportButton disabled>
  <Download size={18} />
  Exporter (À venir)
</ExportButton>
```

**Style :** Bouton grisé avec tooltip expliquant que la fonctionnalité sera disponible prochainement.

### Tests Standards

- **Framework** : Vitest + React Testing Library
- **Location** : `frontend/src/test/pages/Admin/QuickAnalysis.test.tsx`
- **Pattern** : Tests d'intégration pour vérifier le chargement des données et les calculs
- **Coverage** :
  - Affichage des sélecteurs
  - Chargement des données pour chaque période
  - Calcul correct de la différence et du pourcentage
  - Affichage du graphique
  - Navigation depuis SessionManager

## 6. Tasks / Subtasks

- [x] **T1 - Créer la page QuickAnalysis** (AC: 1)
  - [x] Créer fichier `frontend/src/pages/Admin/QuickAnalysis.tsx`
  - [x] Ajouter route dans `App.jsx` : `/admin/quick-analysis` (admin only)
  - [x] Créer structure de base avec header et sections
  - [x] Ajouter protection admin (utiliser `require_admin_role`)

- [x] **T2 - Créer composant PeriodSelector** (AC: 3)
  - [x] Créer `frontend/src/components/Admin/PeriodSelector.tsx`
  - [x] Ajouter date picker
  - [x] Ajouter boutons rapides (Hier, Avant-hier, etc.)
  - [x] Gérer la sélection de date
  - [x] Retourner la date sélectionnée via callback

- [x] **T3 - Ajouter sélecteur de catégorie** (AC: 4)
  - [x] Charger toutes les catégories principales via API
  - [x] Créer dropdown avec toutes les catégories
  - [x] Gérer la sélection de catégorie
  - [x] Aucune catégorie sélectionnée par défaut (ou "Toutes" si besoin)

- [x] **T4 - Implémenter chargement des données** (AC: 8)
  - [x] Créer fonction pour charger stats période 1
  - [x] Créer fonction pour charger stats période 2
  - [x] Appeler API `/v1/stats/sales/by-category` avec dates
  - [x] Filtrer par catégorie sélectionnée
  - [x] Gérer les états de chargement et erreurs

- [x] **T5 - Créer composant ComparisonCards** (AC: 5)
  - [x] Créer `frontend/src/components/Admin/ComparisonCards.tsx`
  - [x] Card Période 1 : poids (kg) et nombre d'items
  - [x] Card Période 2 : poids (kg) et nombre d'items
  - [x] Card Comparaison : différence (kg), variation (%), indicateur ↑↓
  - [x] Style cohérent avec le reste de l'interface

- [x] **T6 - Créer composant ComparisonChart** (AC: 6)
  - [x] Créer `frontend/src/components/Admin/ComparisonChart.tsx`
  - [x] Utiliser Recharts (BarChart) pour graphique comparatif
  - [x] Afficher barres côte à côte (période 1 vs période 2)
  - [x] Ajouter tooltips et légendes

- [x] **T7 - Ajouter placeholder export** (AC: 7)
  - [x] Créer bouton "Exporter" dans section Actions
  - [x] Désactiver le bouton (`disabled`)
  - [x] Ajouter texte "À venir" ou "(À venir)"
  - [x] Ajouter tooltip explicatif si possible

- [x] **T8 - Ajouter raccourci dans SessionManager** (AC: 2)
  - [x] Modifier `frontend/src/pages/Admin/SessionManager.tsx`
  - [x] Ajouter bouton dans la toolbar/header
  - [x] Utiliser icône appropriée (BarChart3)
  - [x] Naviguer vers `/admin/quick-analysis` au clic
  - [x] Style cohérent avec les autres boutons

- [x] **T9 - Gestion erreurs et états** (AC: 9)
  - [x] Afficher spinner pendant chargement
  - [x] Afficher message d'erreur si API échoue
  - [x] Gérer cas où aucune donnée pour une période
  - [x] Valider que période 1 < période 2 (optionnel)

- [x] **T10 - Tests** (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9)
  - [x] Créer `frontend/src/test/pages/Admin/QuickAnalysis.test.tsx`
  - [x] Tester affichage des sélecteurs
  - [x] Tester chargement des données
  - [x] Tester calcul de la différence
  - [x] Tester navigation depuis SessionManager
  - [x] Tester gestion des erreurs

## 7. Fichiers à Modifier

- `frontend/src/pages/Admin/QuickAnalysis.tsx` : Créer nouvelle page (nouveau fichier) ✅
- `frontend/src/pages/Admin/SessionManager.tsx` : Ajouter bouton raccourci ✅
- `frontend/src/App.jsx` : Ajouter route `/admin/quick-analysis` ✅
- `frontend/src/components/Admin/PeriodSelector.tsx` : Créer composant (nouveau fichier) ✅
- `frontend/src/components/Admin/ComparisonCards.tsx` : Créer composant (nouveau fichier) ✅
- `frontend/src/components/Admin/ComparisonChart.tsx` : Créer composant (nouveau fichier) ✅
- `frontend/src/test/pages/Admin/QuickAnalysis.test.tsx` : Créer tests (nouveau fichier) ✅

## 8. Estimation

**5 points** (page complète avec composants réutilisables + intégration)

## 9. Exemple d'Interface

```
┌─────────────────────────────────────────────────────────────┐
│  Analyse Rapide - Comparaison de Périodes                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Catégorie: [Toutes les catégories ▼]                       │
│                                                              │
│  Période 1: [📅 25/01/2025] [Hier] [Avant-hier] [Aujourd'hui]│
│  Période 2: [📅 20/01/2025] [Semaine dernière] [Mois dernier]│
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Période 1    │  │ Période 2    │  │ Comparaison  │      │
│  │ 125.5 kg     │  │ 98.3 kg      │  │ +27.2 kg     │      │
│  │ 45 items     │  │ 32 items     │  │ +27.7% ↑     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  [Graphique Barres Comparatif - Période 1 vs Période 2]     │
│                                                              │
│  [📊 Exporter (À venir)]  [🔄 Actualiser]                   │
└─────────────────────────────────────────────────────────────┘
```

## 10. Notes de Développement

### API Utilisée

L'endpoint existant `/v1/stats/sales/by-category` est déjà disponible et retourne les statistiques par catégorie principale. Il suffit de :
1. Appeler l'API avec `start_date` et `end_date` pour chaque période
2. Filtrer les résultats par catégorie sélectionnée côté frontend
3. Calculer la différence et le pourcentage

### Optimisation Future

**Optionnel (Phase 2) :** Créer un endpoint dédié `/v1/stats/compare` qui :
- Accepte 2 périodes et une catégorie
- Retourne directement les données comparatives
- Réduit le nombre d'appels API (1 au lieu de 2)

### Export Futur

Le placeholder "À venir" sera remplacé par :
- Export CSV avec données comparatives
- Export Excel avec graphiques
- Partage de lien avec paramètres pré-remplis

---

**Référence brainstorming :** `docs/brainstorming/outil-statistiques-rapides-textile.md`

## 10. Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-27 | 1.0 | Création story initiale | Bob (SM) |
| 2025-01-27 | 1.1 | Implémentation complète - Page QuickAnalysis avec tous les composants | James (Dev) |
| 2025-01-27 | 1.2 | Corrections bugs production - Gestion valeurs non numériques et séparation graphiques | James (Dev) |

## 11. Dev Agent Record

### Agent Model Used
Claude Sonnet 4.5 (via Cursor)

### Debug Log References
- **Bug corrigé (2025-01-27)** : Erreur `toFixed is not a function` dans ComparisonCards.tsx - Les valeurs de l'API peuvent être des strings, ajout de conversion explicite en nombres
- **Bug corrigé (2025-01-27)** : Graphiques confus (poids et articles mélangés) - Séparation en deux graphiques distincts pour plus de clarté
- **Warning corrigé** : styled-components prop `variant` - Utilisation de `withConfig` pour filtrer les props transientes

### Completion Notes List

1. **Page QuickAnalysis** : Page complète avec tous les composants requis
   - Route `/admin/quick-analysis` ajoutée dans `App.jsx` avec protection admin
   - Structure complète avec sections Filtres, Résultats, Actions
   - Gestion des états de chargement et erreurs

2. **Composant PeriodSelector** : Sélecteur de période avec boutons rapides
   - Date picker natif HTML5
   - Boutons rapides : "Aujourd'hui", "Hier", "Avant-hier" pour période 1
   - Boutons rapides : "Il y a 7 jours", "Semaine dernière", "Mois dernier" pour période 2
   - Gestion automatique de la date de fin (même date si non spécifiée)

3. **Sélecteur de catégorie** : Dropdown avec toutes les catégories principales
   - Chargement via `categoryService.getCategories(true)` (actives uniquement)
   - Filtrage des catégories principales (parent_id === null)
   - Option "Toutes les catégories" par défaut

4. **Chargement des données** : Appels API pour les deux périodes
   - Utilisation de `getSalesByCategory` avec dates ISO 8601
   - Filtrage côté frontend par catégorie sélectionnée
   - Calcul automatique de la différence et du pourcentage
   - Debounce de 300ms pour éviter les appels multiples

5. **Composant ComparisonCards** : Affichage des résultats comparatifs
   - 3 cards : Période 1, Période 2, Comparaison
   - Indicateurs visuels (↑↓) selon la variation
   - Style cohérent avec le reste de l'interface
   - Correction : Gestion robuste des valeurs non numériques (conversion explicite en nombres)

6. **Composant ComparisonChart** : Graphique comparatif avec Recharts
   - Deux graphiques séparés : un pour le poids (kg) et un pour le nombre d'articles
   - Chaque graphique a son propre axe Y avec l'unité appropriée
   - Tooltips adaptés à chaque type de donnée
   - Correction : séparation des graphiques pour éviter la confusion (poids vs articles)

7. **Placeholder export** : Bouton désactivé avec texte "À venir"
   - Bouton grisé et désactivé
   - Texte explicite "Exporter (À venir)"

8. **Raccourci SessionManager** : Bouton dans la toolbar
   - Icône BarChart3
   - Navigation vers `/admin/quick-analysis`
   - Style cohérent avec les autres boutons

9. **Gestion erreurs** : Affichage des erreurs et états de chargement
   - Spinner pendant le chargement
   - Messages d'erreur clairs
   - Gestion du cas "aucune donnée"

10. **Tests** : Suite de tests complète
    - Tests d'affichage des sélecteurs
    - Tests de chargement des données
    - Tests de gestion des erreurs
    - Mocks des composants enfants pour simplifier

### File List

**Nouveaux fichiers :**
- `frontend/src/pages/Admin/QuickAnalysis.tsx` : Page principale d'analyse rapide
- `frontend/src/components/Admin/PeriodSelector.tsx` : Composant sélecteur de période
- `frontend/src/components/Admin/ComparisonCards.tsx` : Composant cards de comparaison
- `frontend/src/components/Admin/ComparisonChart.tsx` : Composant graphique comparatif
- `frontend/src/test/pages/Admin/QuickAnalysis.test.tsx` : Tests de la page QuickAnalysis

**Fichiers modifiés :**
- `frontend/src/App.jsx` : Ajout de la route `/admin/quick-analysis` et lazy import
- `frontend/src/pages/Admin/SessionManager.tsx` : Ajout du bouton "Analyse Rapide" dans la toolbar
- `frontend/src/components/Admin/ComparisonCards.tsx` : Correction gestion valeurs non numériques (v1.2)
- `frontend/src/components/Admin/ComparisonChart.tsx` : Séparation en deux graphiques distincts (v1.2)

## 12. QA Results

### Review Date: 2025-01-27
### Reviewed By: Quinn (Test Architect)
### Gate Status: **PASS** ✅
### Quality Score: **95/100**

### Code Quality Assessment

Implémentation complète et bien structurée de la page d'analyse rapide pour la comparaison de périodes. La page utilise intelligemment l'API existante `/v1/stats/sales/by-category` avec des appels parallèles pour optimiser les performances. Les composants sont bien séparés et réutilisables.

**Points forts :**
- Page QuickAnalysis complète avec tous les composants requis
- Composants réutilisables bien structurés (PeriodSelector, ComparisonCards, ComparisonChart)
- Raccourci dans SessionManager correctement implémenté
- Gestion complète des erreurs et des états de chargement
- Tests complets (10 tests) couvrant tous les cas d'usage
- Utilisation de debounce (300ms) pour éviter les appels multiples
- Appels API parallèles (Promise.all) pour optimiser les performances
- Filtrage côté frontend efficace
- Placeholder export bien implémenté avec bouton désactivé

**Implémentation :**
- Page : `frontend/src/pages/Admin/QuickAnalysis.tsx` - Page complète avec gestion des états
- Composants : PeriodSelector, ComparisonCards, ComparisonChart - Tous créés et fonctionnels
- Route : `/admin/quick-analysis` - Protégée dans la section admin
- Raccourci : Bouton dans SessionManager avec icône BarChart3
- Tests : Suite complète de tests avec mocks appropriés

**Décisions prises :**
- Utilisation de l'API existante au lieu de créer un nouvel endpoint (optimisation future possible)
- Filtrage côté frontend après réception des données (acceptable pour MVP)
- Placeholder export avec bouton désactivé (fonctionnalité future)

### Refactoring Performed

Aucun refactoring nécessaire. L'implémentation suit les patterns existants du projet.

### Compliance Check

- Coding Standards: ✓ Conforme - Code bien structuré, utilise styled-components comme le reste du projet
- Project Structure: ✓ Conforme - Fichiers dans les bons répertoires (pages/Admin, components/Admin)
- Testing Strategy: ✓ Conforme - Tests complets avec Vitest et React Testing Library
- All ACs Met: ✓ Tous les critères d'acceptation sont satisfaits

### Improvements Checklist

- [x] Page QuickAnalysis créée avec structure complète
- [x] Route `/admin/quick-analysis` ajoutée et protégée
- [x] Composant PeriodSelector créé avec boutons rapides
- [x] Composant ComparisonCards créé avec 3 cards
- [x] Composant ComparisonChart créé avec Recharts
- [x] Sélecteur de catégorie avec toutes les catégories principales
- [x] Chargement des données avec appels API parallèles
- [x] Calcul de la différence et du pourcentage
- [x] Gestion des erreurs et états de chargement
- [x] Placeholder export avec bouton désactivé
- [x] Raccourci dans SessionManager
- [x] Tests complets (10 tests)

### Security Review

Aucun problème de sécurité identifié. La route est protégée dans la section `/admin` qui nécessite un rôle admin. Aucune donnée sensible n'est exposée.

### Performance Considerations

**Bon** : Utilisation de debounce (300ms) pour éviter les appels multiples lors des changements de sélection. Appels API parallèles avec `Promise.all` pour optimiser le chargement. Filtrage côté frontend efficace. 

**Optimisation future** : Créer un endpoint dédié `/v1/stats/compare` pour réduire le nombre d'appels API (1 au lieu de 2) et améliorer les performances.

### Files Modified During Review

Aucun fichier modifié pendant la review. L'implémentation est complète et correcte.

### Gate Status

Gate: **PASS** → `docs/qa/gates/B50.P8-analyse-rapide-comparaison-periodes.yml`  
**Quality Score**: **95/100**

**Décision** : Implémentation complète et bien structurée. Tous les critères d'acceptation sont satisfaits. La page est fonctionnelle et prête pour la production. Les recommandations futures (endpoint dédié, export) sont documentées pour une phase 2.

### Recommended Status

✓ **Ready for Done** - L'implémentation est complète et prête pour la production. Aucun changement requis avant le passage en statut "Done".

