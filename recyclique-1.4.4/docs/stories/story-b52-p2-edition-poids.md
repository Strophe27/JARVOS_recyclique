# Story B52-P2: Édition du poids après validation

**Statut:** Ready for Dev  
**Épopée:** [EPIC-B52 – Améliorations Caisse v1.4.3](../epics/epic-b52-ameliorations-caisse-v1.4.3.md)  
**Module:** Caisse + Réception (Frontend + Backend API)  
**Priorité:** P1  

---

## 1. Contexte

Actuellement, une fois qu'un item est validé dans une session de vente ou de réception, il n'est plus possible de modifier son poids. Cependant, des erreurs de saisie peuvent survenir (ex. 960 kg au lieu de 960 g), ce qui fausse complètement les statistiques.

**Besoin exprimé** : Permettre à un administrateur de modifier le poids d'un item après validation, avec recalcul automatique des statistiques.

**Impact** : Les statistiques (poids ventes, poids réception, statistiques live, métriques mensuelles) doivent être recalculées après modification.

---

## 2. User Story

En tant qu'**administrateur**,  
je veux **pouvoir modifier le poids d'un item après validation** (sessions de vente et réception),  
afin de **corriger les erreurs de saisie sans impact sur les statistiques**.

---

## 3. Critères d'acceptation

1. **Permissions** :  
   - Seuls les administrateurs peuvent modifier le poids
   - Vérification côté backend et frontend

2. **Édition du poids** :  
   - Interface d'édition accessible depuis les détails d'un ticket (vente ou réception)
   - Modification possible à tout moment (pas de limite de temps)
   - Validation : poids > 0, format numérique valide

3. **Recalcul des statistiques** :  
   - Après modification, recalcul automatique des statistiques affectées :
     - Poids total de la session
     - Poids ventes (pour les ventes)
     - Poids réception (pour les réceptions)
     - Statistiques live (24h)
     - Métriques mensuelles (si pré-calculées)
   - Le recalcul doit être optimisé (uniquement les statistiques affectées)

4. **Traçabilité** :  
   - Log d'audit complet : ancien poids, nouveau poids, utilisateur, timestamp
   - Les logs sont consultables via l'interface d'administration

5. **Tests** :  
   - Tests unitaires : modification poids, recalcul statistiques
   - Tests d'intégration : vérifier que les statistiques sont correctement mises à jour
   - Tests de permissions : vérifier que seuls les admins peuvent modifier

---

## 4. Intégration & Compatibilité

**Backend API :**

- **Endpoints à créer/modifier** :
  - `PATCH /api/v1/sales/{sale_id}/items/{item_id}` : Modifier poids d'un item de vente
  - `PATCH /api/v1/reception/tickets/{ticket_id}/lignes/{ligne_id}` : Modifier poids d'une ligne de réception
  
- **Service de recalcul** :
  - Créer service `StatisticsRecalculationService` pour recalculer les statistiques
  - Optimiser : recalcul uniquement des statistiques affectées
  - Option : cache invalidé + recalcul asynchrone

- **Logs d'audit** :
  - Utiliser `recyclic_api.core.audit` pour logger les modifications
  - Format : `weight_updated(sale_id, item_id, old_weight, new_weight, user_id)`

**Frontend :**

- **Interface d'édition** :
  - Ajouter bouton "Modifier le poids" dans les détails d'un ticket (admin uniquement)
  - Modal d'édition avec champ poids
  - Validation et confirmation

- **Affichage** :
  - Indicateur visuel si le poids a été modifié (ex. badge "Modifié")
  - Historique des modifications accessible (via logs d'audit)

**Contraintes :**

- Performance : Le recalcul ne doit pas bloquer l'interface
- Rétrocompatibilité : Les statistiques existantes doivent rester cohérentes
- Pas de limite de temps : Modification possible à tout moment

---

## 5. Dev Notes

### 5.1. Références Architecturales Clés

1. **COMMENCER PAR** : `docs/architecture/index.md` - Navigation complète de l'architecture
2. **Services statistiques** : `api/src/recyclic_api/services/cash_session_service.py` et `reception_stats_service.py`
3. **Système d'audit** : `api/src/recyclic_api/core/audit.py`

### 5.2. Calculs de poids identifiés

**Ventes (Sales)** :
- `poids_ventes` = `SUM(SaleItem.weight)` avec filtres de date
- Utilisé dans `get_session_stats()` et `_calculate_weight_out()`

**Réception** :
- `poids_total` = `SUM(LigneDepot.poids_kg)` (tous les tickets)
- `poids_entree` = `SUM(LigneDepot.poids_kg)` où `is_exit=false` ET `destination=MAGASIN`
- `poids_direct` = `SUM(LigneDepot.poids_kg)` où `is_exit=false` ET `destination IN (RECYCLAGE, DECHETERIE)`
- `poids_sortie` = `SUM(LigneDepot.poids_kg)` où `is_exit=true`

**Statistiques Live** :
- `weight_in` : Poids entré en boutique (réception)
- `weight_out` : Poids vendu (ventes) + poids sorties (réception avec `is_exit=true`)

### 5.3. Service de recalcul

**Approche recommandée** :

1. **Recalcul à la volée** (simple mais peut être lent) :
   - Après modification, recalculer toutes les statistiques affectées
   - Utiliser les services existants (`CashSessionService.get_session_stats()`, etc.)

2. **Cache invalidé + recalcul asynchrone** (optimisé) :
   - Invalider le cache des statistiques affectées
   - Lancer recalcul en arrière-plan
   - Afficher indicateur "Recalcul en cours" si nécessaire

3. **Recalcul optimisé** (recommandé) :
   - Identifier uniquement les statistiques affectées
   - Recalculer uniquement ces statistiques
   - Mettre à jour les caches correspondants

### 5.4. Points d'attention

- **Performance** : Le recalcul peut être coûteux si beaucoup de données
- **Cohérence** : S'assurer que toutes les statistiques sont cohérentes après modification
- **Transactions** : Utiliser transactions DB pour garantir la cohérence
- **Rollback** : Si le recalcul échoue, rollback de la modification de poids

---

## 6. Tasks / Subtasks

- [x] **Backend - Endpoints modification poids**
  - [x] Créer `PATCH /api/v1/sales/{sale_id}/items/{item_id}/weight` pour modifier poids item vente
  - [x] Créer `PATCH /api/v1/reception/tickets/{ticket_id}/lignes/{ligne_id}/weight` pour modifier poids ligne réception
  - [x] Vérification permissions : admin uniquement
  - [x] Validation : poids > 0, format numérique

- [x] **Backend - Service de recalcul**
  - [x] Créer `StatisticsRecalculationService`
  - [x] Méthode `recalculate_after_sale_item_weight_update()` et `recalculate_after_ligne_weight_update()`
  - [x] Identifier statistiques affectées
  - [x] Recalculer uniquement ces statistiques

- [x] **Backend - Logs d'audit**
  - [x] Logger modification poids via `audit.log_audit()` avec `AuditActionType.SYSTEM_CONFIG_CHANGED`
  - [x] Format : ancien poids, nouveau poids, utilisateur, timestamp

- [x] **Frontend - Interface d'édition**
  - [x] Ajouter bouton "Modifier le poids" dans détails ticket (admin uniquement)
  - [x] Édition inline avec champ poids
  - [x] Validation et confirmation
  - [x] Appel API pour modification

- [x] **Frontend - Affichage**
  - [x] Message de confirmation après modification
  - [ ] Indicateur visuel si poids modifié (badge "Modifié") - Optionnel pour v1

- [x] **Tests**
  - [x] Tests unitaires / intégration backend : modification poids (ventes + réceptions)
  - [x] Tests d'interface frontend : boutons d'édition + appels API (admin uniquement)
  - [ ] Tests de performance : vérifier que recalcul ne bloque pas (à traiter plus tard)

- [ ] **Documentation**
  - [ ] Documenter le service de recalcul
  - [ ] Mettre à jour guides utilisateur si nécessaire

---

## 7. Definition of Done

- [x] Endpoints API créés pour modification poids (ventes et réceptions)
- [x] Service de recalcul des statistiques implémenté
- [x] Logs d'audit fonctionnels
- [x] Interface frontend permet modification poids (admin uniquement)
- [x] Statistiques recalculées automatiquement après modification (via recalcul à la volée)
- [x] Tests unitaires / intégration backend + tests frontend passent
- [ ] Performance acceptable (recalcul ne bloque pas) – à affiner si besoin
- [ ] Documentation mise à jour


