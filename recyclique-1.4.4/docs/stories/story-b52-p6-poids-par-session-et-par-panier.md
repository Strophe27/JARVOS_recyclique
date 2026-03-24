# Story B52-P6: Poids par session de caisse et par panier

**Statut:** Draft  
**Épopée:** [EPIC-B52 – Améliorations Caisse v1.4.3](../epics/epic-b52-ameliorations-caisse-v1.4.3.md)  
**Module:** Caisse (Frontend + Backend API)  
**Priorité:** P2  

---

## 1. Contexte

Dans le détail d’une **session de caisse**, l’en-tête affiche plusieurs cartes de synthèse (opérateur, ouverture, fermeture, montant initial, total des ventes, total des dons, nombre de paniers, etc.) ainsi qu’une carte de **poids vendus ou donnés (sorties)** qui reste actuellement à `0` au lieu de refléter le poids réellement sorti sur la session.

Par ailleurs, le **journal des ventes** affiché sous ces cartes liste les paniers (tickets / `Sale`) mais **sans colonne de poids**, ce qui empêche de voir rapidement le poids associé à chaque panier.

Objectifs :
- Corriger la carte de **poids vendus ou donnés (sorties)** pour qu’elle reflète le poids réellement sorti sur la session.
- Ajouter une **colonne “Poids”** au journal des ventes pour chaque panier.
- Supprimer la carte **“Poids reçus en don (entrées)”** au niveau de la session de caisse (métrique plutôt globale / live, pas par session).

---

## 2. User Story

En tant qu’**utilisateur de la caisse** (caissier, responsable),  
je veux **voir le poids réellement sorti sur une session de caisse, ainsi que le poids total de chaque panier**,  
afin de **comprendre précisément les volumes manipulés par session et par ticket**.

---

## 3. Critères d’acceptation

### 3.1. Cartes de synthèse de la session de caisse

1. **Suppression de la carte “Poids reçus en don (entrées)”** :
   - La carte affichant actuellement “Poids reçus en don (entrées)” est **supprimée** de l’en-tête de la session de caisse.
   - Aucune référence à cette métrique ne subsiste dans cet écran (elle reste éventuellement utilisée ailleurs, ex. dashboard live).

2. **Correction de la carte “Poids vendus ou donnés (sorties)”** :
   - La carte “Poids vendus ou donnés (sorties)” affiche désormais **un poids non nul** lorsque des ventes ont un poids renseigné.
   - La valeur affichée correspond au **poids total sorti sur la session**.
   - **Définition de “poids total sorti sur la session”** :
     - Somme de tous les `SaleItem.weight` de tous les paniers (`Sale`) de la session de caisse considérée.
     - Inclus :
       - Ventes payantes
       - Dons 0€
       - Dons -18 ans
       - Tout preset équivalent de sortie (recyclé, donné, etc.) dès lors qu’un `weight` est présent.
   - Si aucun item de la session n’a de poids, la carte peut afficher `0 kg` ou être masquée (comportement à préciser mais au minimum cohérent).

3. **Alignement avec les autres métriques** :
   - Le calcul est **local à la session** (on ne réutilise pas une agrégation globale type `weight_out` quotidienne, sauf si celle-ci est déjà exposée par un endpoint spécifique par session – à confirmer côté implémentation).
   - Si un endpoint existant fournit déjà le **poids total des items vendus/donnés par session**, il peut être réutilisé. Sinon, le poids est calculé côté backend à partir des `SaleItem` rattachés à la session.

### 3.2. Journal des ventes (liste des paniers)

4. **Nouvelle colonne “Poids”** :
   - Le tableau listant les ventes (paniers / `Sale`) affiche une **nouvelle colonne “Poids”**.
   - Pour chaque ligne (un panier / ticket) :
     - La colonne “Poids” affiche le **poids total du panier**, défini comme :
       - Somme de tous les `SaleItem.weight` associés à cette vente (`Sale`) dans la session.
     - Si aucun item du panier n’a de poids, la colonne affiche `0 kg` ou reste vide, selon la convention UI utilisée ailleurs (à définir mais cohérente).

5. **Cohérence des unités et formatage** :
   - Le format du poids (ex. `12,34 kg`) est aligné avec les autres écrans utilisant le poids (nombre de décimales, séparateur, unité).
   - La colonne “Poids” est clairement identifiée (en-tête “Poids” ou “Poids total”).

6. **Performance** :
   - Le calcul du poids par session et par panier ne doit pas dégrader significativement le temps de chargement du détail de session.
   - Si besoin, le calcul peut être fait côté backend (agrégation SQL) plutôt que côté frontend, pour éviter des calculs lourds sur de gros volumes.

---

## 4. Intégration & Compatibilité

### 4.1. Frontend

- **Écran Détail Session de Caisse**  
  - **Fichier** : `frontend/src/pages/Admin/CashSessionDetail.tsx`
  - **Tâches** :
    - Supprimer la carte “Poids reçus en don (entrées)” de l’en-tête.
    - Adapter la carte “Poids vendus ou donnés (sorties)” pour utiliser la nouvelle donnée backend (poids total sorti sur la session).
    - Ajouter une colonne “Poids” (ou “Poids total”) au tableau des ventes :
      - Afficher le poids total du panier.
      - Gérer l’affichage en cas de poids nul / absent.

### 4.2. Backend API

- **Endoints / Services potentiellement concernés** :
  - Endpoint de détail de session de caisse (ex: `/api/v1/cash-sessions/{session_id}`) :
    - Ajouter un champ `total_weight_out` ou équivalent, représentant le **poids total des items vendus/donnés sur la session**.
  - Service de sessions de caisse (`CashSessionService` ou équivalent) :
    - Ajouter l’agrégation de tous les `SaleItem.weight` liés à la session.
  - Optionnel : exposer pour chaque vente un champ `total_weight` (somme des `SaleItem.weight` de ce ticket) pour éviter de recalculer côté frontend.

- **Contraintes** :
  - Ne pas casser les structures de réponse JSON existantes (ajouter des champs plutôt que modifier ceux existants).
  - Rester cohérent avec les futures stories B52-P2 (édition poids) : si un poids est modifié a posteriori, ces nouveaux totaux doivent se mettre à jour automatiquement.

---

## 5. Dev Notes

### 5.1. Références Architecturales Clés

1. **COMMENCER PAR** : `docs/architecture/index.md` – Navigation complète de l’architecture.  
2. **Services caisse / stats** :  
   - `api/src/recyclic_api/services/cash_session_service.py`  
   - `api/src/recyclic_api/services/stats_service.py` (pour voir comment `SaleItem.weight` est agrégé ailleurs).  
3. **Frontend** :  
   - `frontend/src/pages/Admin/CashSessionDetail.tsx` – Détail de session de caisse.  

### 5.2. Calculs de poids

- **Poids total sorti sur la session (carte)** :
  - Agrégation SQL recommandée :
    - `SUM(SaleItem.weight)` pour tous les `SaleItem` :
      - Liés à une `Sale` appartenant à la session de caisse concernée.
      - Avec un `weight` non nul.

- **Poids total par panier (colonne “Poids”)** :
  - Agrégation par `Sale` :
    - `SUM(SaleItem.weight)` groupé par `Sale.id`.

### 5.3. Points d’attention

- **Cohérence avec B52-P2 (édition du poids)** :
  - Si un poids est modifié a posteriori, les totaux de session et de panier doivent se mettre à jour (recalcul à la volée ou via service de recalcul).
- **UX** :
  - S’assurer que la colonne “Poids” est lisible et utile, sans surcharger le tableau.
  - Garder une largeur raisonnable de colonne, éventuellement avec alignement à droite pour les nombres.

---

## 6. Tasks / Subtasks

- [ ] **Backend – Agrégation poids par session**
  - [ ] Étendre le service / endpoint de détail de session pour retourner le poids total sorti (`total_weight_out`).
  - [ ] Ajouter les agrégations SQL nécessaires (SUM sur `SaleItem.weight`).
  - [ ] Tests unitaires pour vérifier le calcul.

- [ ] **Backend – Poids total par panier (optionnel mais recommandé)**
  - [ ] Ajouter dans les réponses de ventes d’une session un champ `total_weight` par `Sale`.
  - [ ] Tests unitaires pour ce champ.

- [ ] **Frontend – En-tête session**
  - [ ] Supprimer la carte “Poids reçus en don (entrées)” dans `CashSessionDetail.tsx`.
  - [ ] Utiliser `total_weight_out` (ou équivalent) pour la carte “Poids vendus ou donnés (sorties)”.

- [ ] **Frontend – Journal des ventes**
  - [ ] Ajouter une colonne “Poids” dans le tableau des ventes.
  - [ ] Afficher le poids total du panier.
  - [ ] Gérer le formatage (unités, décimales).

- [ ] **Tests**
  - [ ] Tests unitaires backend sur les agrégations.
  - [ ] Tests d’intégration pour vérifier que les valeurs sont correctes sur une session avec plusieurs paniers.
  - [ ] Tests E2E sur l’écran de détail de session pour vérifier l’affichage des nouvelles données.

- [ ] **Documentation**
  - [ ] Mettre à jour la documentation UX / produit si nécessaire.

---

## 7. Definition of Done

- [ ] Carte “Poids reçus en don (entrées)” supprimée de l’en-tête de session de caisse.  
- [ ] Carte “Poids vendus ou donnés (sorties)” affiche le **poids total sorti sur la session**.  
- [ ] Journal des ventes affiche une **colonne “Poids”** avec le **poids total par panier**.  
- [ ] Les calculs sont cohérents avec les poids des `SaleItem` et avec les modifications de poids ultérieures (B52-P2).  
- [ ] Tests unitaires, intégration et E2E passent.  
- [ ] Documentation mise à jour si nécessaire.  


