# Story B52-P5: Améliorations cosmétiques et terminologie

**Statut:** Ready for Dev  
**Épopée:** [EPIC-B52 – Améliorations Caisse v1.4.3](../epics/epic-b52-ameliorations-caisse-v1.4.3.md)  
**Module:** Frontend (Dashboard, Détail Session, Analyse Rapide)  
**Priorité:** P2 (Amélioration UX/terminologie)  

---

## 1. Contexte

Plusieurs demandes d'amélioration de la terminologie et de l'affichage ont été remontées par les utilisateurs pour clarifier les métriques affichées dans l'interface. Ces changements visent à rendre l'interface plus claire et moins ambiguë.

**Problèmes identifiés** :
- Terminologie ambiguë ("articles", "articles vendus", "articles reçus")
- Métriques manquantes sur certains écrans
- Confusion entre nombre d'objets physiques et nombre de lignes/enregistrements

---

## 2. User Story

En tant qu'**utilisateur de l'interface** (caissier, administrateur, analyste),  
je veux **voir des libellés clairs et des métriques complètes**,  
afin de **comprendre exactement ce que représentent les chiffres affichés et avoir toutes les informations nécessaires**.

---

## 3. Critères d'acceptation

### 3.1. Écran Détail Session de Caisse

1. **Modification de libellés** :
   - "Montant initial" → "Montant initial (fond de caisse)"
   - "Articles vendus" → "Nombre de paniers" (car c'est le nombre de paniers/ventes, pas d'articles individuels)

2. **Nouvelles métriques à ajouter** :
   - "Poids reçus en don (entrées)" - pour la journée
     - **Clarification** : C'est un abus de langage "don", en réalité c'est "poids reçu en entrée"
     - **Logique** : Total poids entré (toutes les lignes de réception sauf is_exit=true), peu importe la destination (magasin, recyclage, etc.)
     - **Source** : Métrique live `weight_in` existante (calculée via `_calculate_weight_in()`)
   - "Poids vendus ou donnés (sorties)" - pour la journée
     - **Logique** : Total poids sorti de la boutique (ventes + lignes avec is_exit=true)
     - **Source** : Métrique live `weight_out` existante (calculée via `_calculate_weight_out()`)

### 3.2. Dashboard (Page d'accueil)

1. **Clarification terminologie** :
   - "Articles reçus" → Clarifier que c'est le nombre de pesées/lignes (pas d'objets physiques)
   - Option : "Lignes de réception" ou "Pesées reçues"
   - Les graphiques utilisent aussi le nombre de pesées (vérifier et clarifier si nécessaire)

### 3.3. Analyse Rapide - Comparaison de Périodes

1. **Clarification terminologie** :
   - "articles" → "lignes de vente" (ou meilleur terme si trouvé)
   - Clarifier ce que représente ce chiffre (nombre de lignes d'items de vente, pas d'objets physiques)

2. **Cohérence** :
   - Utiliser la même terminologie dans tous les écrans
   - Tooltip ou aide contextuelle si nécessaire pour expliquer la métrique

---

## 4. Intégration & Compatibilité

**Frontend - Écran Détail Session de Caisse** :

- **Fichier** : `frontend/src/pages/Admin/CashSessionDetail.tsx`
  - Modifier libellé "Montant initial" → "Montant initial (fond de caisse)"
  - Modifier libellé "Articles vendus" → "Nombre de paniers"
  - Ajouter métrique "Poids reçus en don (entrées)" - calculer depuis les réceptions de la journée
  - Ajouter métrique "Poids vendus ou donnés (sorties)" - calculer depuis les ventes de la journée

**Frontend - Dashboard** :

- **Fichier** : `frontend/src/pages/Dashboard.jsx` ou `frontend/src/pages/UnifiedDashboard.tsx`
  - Modifier libellé "Articles reçus" → "Lignes de réception" ou "Pesées reçues"
  - Vérifier les graphiques et clarifier la terminologie si nécessaire

**Frontend - Analyse Rapide** :

- **Fichier** : `frontend/src/pages/Admin/QuickAnalysis.tsx`
  - Modifier libellé "articles" → "lignes de vente"
  - **Composant** : `frontend/src/components/Admin/ComparisonCards.tsx`
    - Modifier affichage "{period1.items} articles" → "{period1.items} lignes de vente"
    - Modifier affichage "{difference.items_diff} articles" → "{difference.items_diff} lignes de vente"

**Backend (si nécessaire)** :

- Vérifier si des calculs supplémentaires sont nécessaires pour les nouvelles métriques (poids reçus en don, poids vendus/donnés)
- Les calculs existants peuvent être réutilisés depuis les services de statistiques

**Contraintes** :

- Ne pas casser les fonctionnalités existantes
- Maintenir la cohérence de la terminologie dans toute l'application
- Les nouvelles métriques doivent être calculées efficacement

---

## 5. Dev Notes

### 5.1. Références Architecturales Clés

1. **COMMENCER PAR** : `docs/architecture/index.md` - Navigation complète de l'architecture
2. **Composants frontend** : `docs/architecture/frontend-architecture.md` - Structure des composants
3. **Services statistiques** : `api/src/recyclic_api/services/cash_session_service.py` et `reception_stats_service.py`

### 5.2. Terminologie proposée

**Pour clarifier la confusion** :
- **"Lignes de vente"** : Nombre de lignes d'items dans les ventes (SaleItem)
- **"Lignes de réception"** : Nombre de lignes de dépôt (LigneDepot)
- **"Pesées"** : Alternative possible, mais moins précise
- **"Enregistrements"** : Alternative possible, mais moins spécifique

**Recommandation** : Utiliser "lignes de vente" et "lignes de réception" pour être explicite.

### 5.3. Calculs des nouvelles métriques

**Poids reçus en don (entrées)** - **CLARIFIÉ** :
- **Logique** : Total poids entré (toutes les lignes de réception sauf is_exit=true)
- **Peu importe la destination** : magasin, recyclage, déchèterie, etc.
- **Source** : Utiliser la métrique live `weight_in` existante
- **Calcul backend** : `_calculate_weight_in()` dans `reception_stats_service.py`
  - Somme des `LigneDepot.poids_kg` où `is_exit=false` ou `is_exit IS NULL`
  - Tickets ouverts + tickets fermés dans les 24h
  - Exclut les tickets différés

**Poids vendus ou donnés (sorties)** - **CLARIFIÉ** :
- **Logique** : Total poids sorti de la boutique (ventes + sorties depuis réception)
- **Source** : Utiliser la métrique live `weight_out` existante
- **Calcul backend** : `_calculate_weight_out()` dans `reception_stats_service.py`
  - Poids des ventes (SUM SaleItem.weight) + poids des lignes avec is_exit=true
  - Exclut les sessions différées

**Implémentation** :
- Utiliser l'endpoint `/v1/stats/live` avec `period_type="daily"` pour obtenir `weight_in` et `weight_out` de la journée
- Ou créer un endpoint spécifique pour les stats de la journée d'une session

### 5.4. Points d'attention

- **Performance** : Les nouvelles métriques ne doivent pas ralentir l'affichage
- **Cohérence** : Utiliser la même terminologie partout
- **Clarté** : Les libellés doivent être explicites sans être trop longs
- **Tooltips** : Optionnel, mais peut aider à clarifier les métriques complexes

---

## 6. Tasks / Subtasks

- [x] **Écran Détail Session de Caisse - Modifications libellés**
  - [x] Modifier "Montant initial" → "Montant initial (fond de caisse)"
  - [x] Modifier "Articles vendus" → "Nombre de paniers"
  - [x] Tester l'affichage

- [x] **Écran Détail Session de Caisse - Nouvelles métriques**
  - [x] Récupérer `weight_in` et `weight_out` depuis l'endpoint `/v1/stats/live` (period_type="daily")
  - [x] Ajouter affichage "Poids reçus en don (entrées)" = `weight_in` de la journée
  - [x] Ajouter affichage "Poids vendus ou donnés (sorties)" = `weight_out` de la journée
  - [x] Tester l'affichage et vérifier que les valeurs correspondent aux stats live

- [x] **Dashboard - Clarification terminologie**
  - [x] Modifier "Articles reçus" → "Lignes de réception" (ou meilleur terme)
  - [x] Vérifier les graphiques et clarifier si nécessaire
  - [x] Tester l'affichage

- [x] **Analyse Rapide - Clarification terminologie**
  - [x] Modifier "articles" → "lignes de vente" dans `ComparisonCards.tsx`
  - [x] Modifier "articles" → "lignes de vente" dans `QuickAnalysis.tsx` si nécessaire
  - [x] Vérifier les graphiques et clarifier si nécessaire
  - [x] Tester l'affichage

- [x] **Backend - Vérification calculs existants**
  - [x] Vérifier que `weight_in` et `weight_out` sont disponibles via `/v1/stats/live`
  - [x] Vérifier que les calculs correspondent bien aux besoins (poids entré total, poids sorti total)
  - [x] Pas de nouveau calcul nécessaire, réutiliser les métriques live existantes

- [ ] **Tests**
  - [ ] Tests unitaires : vérifier les nouveaux libellés
  - [ ] Tests d'intégration : vérifier les nouvelles métriques
  - [ ] Tests E2E : vérifier l'affichage complet

- [ ] **Documentation**
  - [ ] Mettre à jour les guides utilisateur si nécessaire
  - [ ] Documenter la terminologie utilisée

---

## 7. Definition of Done

- [ ] Tous les libellés modifiés selon les spécifications
- [ ] Nouvelles métriques ajoutées et fonctionnelles
- [ ] Terminologie cohérente dans toute l'application
- [ ] Calculs des nouvelles métriques corrects
- [ ] Tests unitaires, intégration et E2E passent
- [ ] Interface claire et non ambiguë
- [ ] Documentation mise à jour

---

## 8. Notes additionnelles

**Terminologie finale validée** :
- "Lignes de vente" : Nombre de lignes d'items dans les ventes (SaleItem)
- "Lignes de réception" : Nombre de lignes de dépôt (LigneDepot)
- "Nombre de paniers" : Nombre de ventes/tickets (Sale)

**Métriques clarifiées** :
- "Poids reçus en don (entrées)" = `weight_in` (total poids entré, toutes destinations confondues)
- "Poids vendus ou donnés (sorties)" = `weight_out` (total poids sorti, ventes + is_exit=true)
- Les deux métriques existent déjà dans les stats live, il suffit de les afficher

---

## 9. Dev Agent Record

### Agent Model Used
- Claude Sonnet 4.5 (via Cursor)

### File List
**Fichiers modifiés :**
- `frontend/src/pages/Admin/CashSessionDetail.tsx` - Modifications libellés et ajout métriques poids
- `frontend/src/pages/Dashboard.jsx` - Modification libellé "Articles reçus" → "Lignes de réception"
- `frontend/src/pages/UnifiedDashboard.tsx` - Modification libellé "Articles reçus" → "Lignes de réception"
- `frontend/src/components/Admin/ComparisonCards.tsx` - Modification "articles" → "lignes de vente"

**Fichiers vérifiés (pas de modification nécessaire) :**
- `frontend/src/pages/Admin/QuickAnalysis.tsx` - Aucune occurrence de "articles" trouvée
- `api/src/recyclic_api/api/api_v1/endpoints/stats.py` - Endpoint `/v1/stats/live` confirmé avec `weight_in` et `weight_out`

### Change Log
**2025-01-27 - Story B52-P5 Implémentation**

1. **CashSessionDetail.tsx** :
   - Modifié libellé "Montant initial" → "Montant initial (fond de caisse)" (ligne 778)
   - Modifié libellé "Articles vendus" → "Nombre de paniers" (ligne 808)
   - Changé la valeur affichée de `session.total_items` à `session.sales.length` (nombre de paniers)
   - Ajouté import `Scale` depuis lucide-react
   - Ajouté import `getUnifiedLiveStats` depuis services/api
   - Ajouté état pour `weightIn`, `weightOut`, `loadingWeights`
   - Ajouté useEffect pour charger les métriques poids depuis `/v1/stats/live` avec `period_type="daily"`
   - Ajouté deux nouveaux InfoItem pour afficher "Poids reçus en don (entrées)" et "Poids vendus ou donnés (sorties)"

2. **Dashboard.jsx** :
   - Modifié libellé "Articles reçus" → "Lignes de réception" (ligne 251)

3. **UnifiedDashboard.tsx** :
   - Modifié libellé "Articles reçus" → "Lignes de réception" (ligne 539)

4. **ComparisonCards.tsx** :
   - Modifié "articles" → "lignes de vente" dans les trois cartes (Période 1, Période 2, Comparaison)

### Completion Notes
- ✅ Tous les libellés modifiés selon les spécifications
- ✅ Nouvelles métriques poids ajoutées et fonctionnelles (utilisent l'endpoint `/v1/stats/live` existant)
- ✅ Terminologie cohérente dans toute l'application
- ✅ Calculs des nouvelles métriques corrects (réutilisation des métriques live existantes)
- ⚠️ Tests à mettre à jour pour refléter les nouveaux libellés
- ⚠️ Documentation utilisateur à mettre à jour si nécessaire

### Debug Log References
- Aucun problème rencontré lors de l'implémentation
- L'endpoint `/v1/stats/live` est déjà utilisé dans d'autres composants (useCashLiveStats, useReceptionKPILiveStats)
- Les métriques `weight_in` et `weight_out` sont disponibles dans la réponse `UnifiedLiveStatsResponse`

