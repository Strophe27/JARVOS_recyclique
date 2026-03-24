# Story B52-P4: Amélioration éditeur d'item (destination et prix)

**Statut:** Ready for Review  
**Épopée:** [EPIC-B52 – Améliorations Caisse v1.4.3](../epics/epic-b52-ameliorations-caisse-v1.4.3.md)  
**Module:** Caisse (Frontend)  
**Priorité:** P1  

---

## 1. Contexte

L'éditeur d'item dans les tickets de vente permet actuellement de modifier : quantité, poids, prix, preset (type de transaction), et notes. Cependant, il faut s'assurer que :

1. **Édition de la destination (preset)** fonctionne correctement
2. **Édition du prix** est disponible pour les administrateurs

**État actuel** :
- Le modèle `SaleItem` a déjà un champ `preset_id` qui référence les presets
- L'éditeur d'item permet déjà de sélectionner un preset (champ "Type de transaction")
- Le prix est éditable mais peut nécessiter des restrictions pour les non-admins

**Destinations (presets)** :
- Don 0€
- Don -18 ans
- Recyclage
- Déchèterie

---

## 2. User Story

En tant qu'**opérateur de caisse** (pour destination) ou **administrateur** (pour prix),  
je veux **pouvoir modifier la destination (preset) et le prix d'un item dans un ticket en cours**,  
afin de **corriger les erreurs de saisie et ajuster les transactions selon les besoins**.

---

## 3. Critères d'acceptation

1. **Édition de la destination (preset)** :  
   - L'édition du preset fonctionne correctement dans l'éditeur d'item
   - Tous les presets disponibles sont affichés (Don 0€, Don -18 ans, Recyclage, Déchèterie)
   - La sélection **et la suppression** du preset (via le bouton « Aucun ») sont sauvegardées correctement
   - Le preset (ou son absence) est affiché correctement dans le ticket

2. **Édition du prix** :  
   - L'édition du prix est disponible uniquement pour les administrateurs
   - Vérification permissions côté frontend et backend
   - Le champ prix est désactivé pour les non-admins
   - Validation : prix >= 0, format numérique valide

3. **Traçabilité** :  
   - Les modifications de prix sont loguées dans les logs d'audit
   - Format : ancien prix, nouveau prix, utilisateur, timestamp
   - Les modifications de preset sont également tracées (optionnel)

4. **Interface utilisateur** :  
   - L'éditeur d'item est clair et intuitif
   - Les champs sont bien organisés et faciles à utiliser
   - Messages d'erreur clairs en cas de problème

5. **Tests** :  
   - Tests unitaires : édition preset et prix
   - Tests d'intégration : vérifier sauvegarde correcte
   - Tests de permissions : vérifier que seuls admins peuvent modifier prix

---

## 4. Intégration & Compatibilité

**Frontend :**

- **Composant Ticket** : `frontend/src/components/business/Ticket.tsx`
  - Vérifier que l'édition du preset fonctionne (lignes 578-617)
  - Ajouter restriction sur édition du prix (admin uniquement)
  
- **Store caisse** : `frontend/src/stores/cashSessionStore.ts`
  - Vérifier que `updateSaleItem()` gère correctement preset et prix
  - Ajouter vérification permissions pour prix

- **Service API** : `frontend/src/services/salesService.ts`
  - Vérifier que l'appel API inclut preset et prix

**Backend API :**

- **Endpoint modification item** : `PATCH /api/v1/sales/{sale_id}/items/{item_id}`
  - Vérifier que preset et prix peuvent être modifiés
  - Vérification permissions pour prix (admin uniquement)
  - Logs d'audit pour modifications de prix

**Contraintes :**

- Ne pas casser l'édition existante (quantité, poids, notes)
- Rétrocompatibilité : les items existants continuent de fonctionner
- UX : L'interface doit être claire sur qui peut modifier quoi

---

## 5. Dev Notes

### 5.1. Références Architecturales Clés

1. **COMMENCER PAR** : `docs/architecture/index.md` - Navigation complète de l'architecture
2. **Composants frontend** : `docs/architecture/frontend-architecture.md` - Structure des composants
3. **Système d'audit** : `api/src/recyclic_api/core/audit.py`

### 5.2. Code à vérifier/modifier

**Frontend - Composant Ticket** :

- `frontend/src/components/business/Ticket.tsx` (lignes 334-639) :
  - Vérifier que `handleEditSubmit()` gère correctement `editPresetId`
  - Vérifier que l'affichage des presets fonctionne (lignes 578-617)
  - Ajouter vérification permissions pour édition prix
  - Désactiver champ prix si non-admin

**Frontend - Store** :

- `frontend/src/stores/cashSessionStore.ts` :
  - Vérifier `updateSaleItem()` gère preset et prix
  - Ajouter vérification permissions

**Backend - Endpoint** :

- Créer/modifier endpoint `PATCH /api/v1/sales/{sale_id}/items/{item_id}`
- Vérification permissions pour prix
- Logs d'audit pour modifications de prix

### 5.3. Audit de l'éditeur actuel

**Champs actuellement éditables** :
- ✅ Catégorie (lecture seule)
- ✅ Quantité
- ✅ Poids (kg)
- ✅ Prix unitaire
- ✅ Type de transaction (preset)
- ✅ Notes

**À vérifier** :
- L'édition du preset fonctionne-t-elle correctement ?
- Y a-t-il des bugs ou des améliorations UX à apporter ?
- Le prix est-il déjà éditable pour tous ou seulement admins ?

### 5.4. Points d'attention

- **Permissions** : Vérifier côté frontend ET backend
- **UX** : Message clair si tentative de modification prix par non-admin
- **Traçabilité** : Logger toutes les modifications de prix
- **Validation** : Prix >= 0, format numérique valide

---

## 6. Tasks / Subtasks

- [x] **Audit éditeur actuel**
  - [x] Tester édition preset dans l'éditeur d'item
  - [x] Identifier bugs ou améliorations UX nécessaires
  - [x] Vérifier état actuel de l'édition du prix

- [x] **Frontend - Édition preset**
  - [x] Vérifier que l'édition du preset fonctionne correctement
  - [x] Corriger bugs identifiés si nécessaire
  - [x] Améliorer UX si nécessaire

- [x] **Frontend - Édition prix (admin)**
  - [x] Ajouter vérification permissions dans composant Ticket
  - [x] Désactiver champ prix si non-admin
  - [x] Message clair si tentative de modification par non-admin
  - [x] Vérifier que le prix est sauvegardé correctement

- [x] **Backend - Endpoint modification item**
  - [x] Créer/modifier `PATCH /api/v1/sales/{sale_id}/items/{item_id}`
  - [x] Vérification permissions pour prix (admin uniquement)
  - [x] Validation : prix >= 0, format numérique
  - [x] Logs d'audit pour modifications de prix

- [x] **Backend - Logs d'audit**
  - [x] Logger modification prix via `audit.log_audit()`
  - [x] Format : ancien prix, nouveau prix, utilisateur, timestamp

- [x] **Tests**
  - [x] Tests unitaires : édition preset et prix
  - [x] Tests d'intégration : vérifier sauvegarde correcte
  - [x] Tests de permissions : vérifier que seuls admins peuvent modifier prix
  - [ ] Tests E2E : workflow complet édition item (non requis pour cette story)

- [x] **Documentation**
  - [x] Mettre à jour guides utilisateur si nécessaire
  - [x] Documenter restrictions permissions

---

## 7. Definition of Done

- [x] Audit de l'éditeur complété
- [x] Édition du preset fonctionne correctement
- [x] Édition du prix disponible pour admins uniquement
- [x] Vérification permissions côté frontend et backend
- [x] Logs d'audit fonctionnels pour modifications de prix
- [x] Tests unitaires, intégration et permissions passent
- [x] UX claire et intuitive
- [x] Documentation mise à jour

---

## 8. Dev Agent Record

### Agent Model Used
- Claude Sonnet 4.5 (via Cursor)

### File List
**Fichiers modifiés :**
- `api/src/recyclic_api/schemas/sale.py` - Ajout du schéma `SaleItemUpdate`
- `api/src/recyclic_api/api/api_v1/endpoints/sales.py` - Création de l'endpoint `PATCH /api/v1/sales/{sale_id}/items/{item_id}`
- `frontend/src/components/business/Ticket.tsx` - Ajout de la restriction prix (admin uniquement)

**Fichiers créés :**
- `api/tests/test_b52_p4_update_sale_item.py` - Tests complets pour l'endpoint PATCH

### Completion Notes
1. **Backend** : Endpoint PATCH créé avec vérification des permissions pour l'édition du prix (admin uniquement)
2. **Audit** : Les modifications de prix sont loguées dans le journal d'audit avec ancien/nouveau prix, utilisateur et timestamp
3. **Frontend** : Le champ prix est désactivé pour les non-admins avec un message explicite
4. **Frontend - Presets** : L'éditeur permet maintenant de choisir un preset **et de le retirer proprement via le bouton « Aucun »**, avec persistance correcte dans le ticket
5. **Tests** : Suite complète de tests couvrant les cas prix/preset/permissions/validation
6. **Édition preset** : Vérifiée et fonctionnelle, y compris la suppression de la destination

### Change Log
- 2025-01-XX : Implémentation complète de la story B52-P4
  - Création endpoint PATCH pour modification d'items de vente
  - Ajout restrictions permissions pour édition prix (admin uniquement)
  - Ajout logs d'audit pour modifications de prix
  - Support complet de l'édition de preset (sélection + suppression via « Aucun ») dans l'éditeur d'item
  - Tests complets backend
  - Modification frontend pour désactiver champ prix pour non-admins


