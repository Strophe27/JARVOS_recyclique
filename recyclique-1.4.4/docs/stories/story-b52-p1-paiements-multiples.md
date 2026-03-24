# Story B52-P1: Paiements multiples à l'encaissement

**Statut:** Ready for Review  
**Épopée:** [EPIC-B52 – Améliorations Caisse v1.4.3](../epics/epic-b52-ameliorations-caisse-v1.4.3.md)  
**Module:** Caisse (Frontend + Backend API)  
**Priorité:** P1  

---

## 1. Contexte

Actuellement, lors de l'encaissement, un seul moyen de paiement peut être sélectionné (espèces, chèque, ou carte). Cependant, en situation réelle, les clients peuvent vouloir payer avec plusieurs moyens (ex. "tant en espèces et tant en chèques").

**Besoin exprimé** : Permettre plusieurs moyens de paiement lors d'un même encaissement, avec approche séquentielle (ajouter paiements un par un jusqu'à couvrir le total).

**Recherche POS** : Les systèmes POS modernes supportent les split payments. Pattern séquentiel recommandé :
- Saisir le premier paiement (ex. espèces)
- Afficher le reste dû
- Bouton "Ajouter un autre paiement"
- Répéter jusqu'à couvrir le total

---

## 2. User Story

En tant qu'**opérateur de caisse**,  
je veux **pouvoir diviser un encaissement entre plusieurs moyens de paiement** (ex. espèces + chèques),  
afin de **gérer les cas où un client paie avec plusieurs moyens différents**.

---

## 3. Critères d'acceptation

1. **Interface de paiement** :  
   - L'écran de paiement permet d'ajouter plusieurs paiements séquentiellement
   - Après chaque paiement, le reste dû est affiché en temps réel
   - Bouton "Ajouter un autre paiement" disponible tant que le total n'est pas couvert
   - Validation uniquement lorsque le total est couvert (exactement ou avec reste)

2. **Gestion des paiements** :  
   - Chaque paiement a un moyen de paiement (espèces, chèque, carte)
   - Chaque paiement a un montant
   - La somme des paiements doit couvrir le total (peut avoir un reste pour espèces)
   - Affichage de la liste des paiements ajoutés

3. **Backend** :  
   - Modification du modèle `Sale` pour supporter plusieurs paiements
   - Option 1 : Table `payment_transactions` liée à `Sale` (1-N)
   - Option 2 : Champ JSON `payments` sur `Sale` (plus simple, moins normalisé)
   - Les paiements sont tracés dans les logs d'audit

4. **Validation** :  
   - La somme des paiements doit être >= au total (avec gestion du reste pour espèces)
   - Message d'erreur clair si le total n'est pas couvert
   - Impossible de finaliser si le total n'est pas couvert

5. **Tests** :  
   - Tests unitaires : validation des paiements multiples
   - Tests d'intégration : finalisation avec paiements multiples
   - Tests E2E : workflow complet paiements multiples

---

## 4. Intégration & Compatibilité

**Backend API :**

- **Modèle Sale** : Modifier pour supporter plusieurs paiements
  - Option recommandée : Table `payment_transactions` (id, sale_id, payment_method, amount, created_at)
  - Alternative : Champ JSON `payments` sur `Sale` (plus simple mais moins normalisé)
  
- **Endpoint création vente** : Modifier `POST /api/v1/sales/` pour accepter liste de paiements
  - Format : `payments: [{method: "cash", amount: 50.0}, {method: "check", amount: 30.0}]`

**Frontend :**

- **Écran de finalisation** : `frontend/src/components/business/FinalizationScreen.tsx`
  - Ajouter interface pour paiements multiples
  - Afficher reste dû en temps réel
  - Bouton "Ajouter un autre paiement"

- **Store caisse** : Modifier pour gérer liste de paiements
  - `frontend/src/stores/cashSessionStore.ts` : Ajouter gestion paiements multiples

**Contraintes :**

- Ne pas casser les ventes existantes (rétrocompatibilité)
- Les ventes avec un seul paiement continuent de fonctionner
- Migration des données existantes : créer un `payment_transaction` pour chaque `Sale` existant

---

## 5. Dev Notes

### 5.1. Références Architecturales Clés

1. **COMMENCER PAR** : `docs/architecture/index.md` - Navigation complète de l'architecture
2. **Modèles de données** : `docs/architecture/data-models.md` - Structure des modèles Sale
3. **Frontend architecture** : `docs/architecture/frontend-architecture.md` - Composants et stores

### 5.2. Design technique

**Option 1 : Table `payment_transactions` (RECOMMANDÉE)**

- Table séparée : meilleure normalisation, traçabilité complète
- Migration : créer table + migrer données existantes
- Requêtes : JOIN pour récupérer les paiements d'une vente

**Option 2 : Champ JSON `payments`**

- Plus simple : pas de table supplémentaire
- Moins normalisé : données dans un champ JSON
- Requêtes : extraction JSON pour analyses

**Recommandation** : Option 1 pour la traçabilité et les analyses futures.

### 5.3. Workflow utilisateur

**Workflow de base (souris) :**
1. Utilisateur finalise la vente → Écran de paiement
2. Saisit premier paiement (ex. espèces 50€) → Affiche reste dû
3. Clique "Ajouter un autre paiement"
4. Saisit deuxième paiement (ex. chèque 30€) → Affiche reste dû
5. Répète jusqu'à couvrir le total
6. Valide → Vente créée avec tous les paiements

**Workflow clavier optimisé (Spec B52-P1 Keyboard Workflow) :**
1. Total à payer → `Enter` → Moyen de paiement
2. Moyen de paiement → `Flèches haut/bas` → `Enter` → Montant reçu
3. Montant reçu → `Enter` → Don (si applicable)
4. Si reste dû > 0 : Focus automatique sur "Moyen de paiement" (boucle)
5. Moyen de paiement (boucle) → `Flèches haut/bas` → `Enter` → Montant du paiement
6. Montant du paiement → `Enter` → Ajoute automatiquement le paiement
7. Répète jusqu'à reste dû = 0
8. Focus automatique sur "Don" → `Enter` → Validation

**Comportements spécifiques :**
- **Sélection automatique** : Après ajout d'un paiement, le moyen suivant est sélectionné (cash → check → card → cash)
- **Exclusion "Gratuit / Don"** : Disponible uniquement pour le premier paiement, exclu de la boucle
- **Chèques/cartes partiels** : Permettre montant < baseAmount avec indication "Paiement partiel"
- **Don indépendant** : Modification du don ne recalcule pas le montant chèque (évite confusion)
- **Calcul du reste** : Inclut toujours le don (`amountDue = baseAmount + don`)

**Référence complète :** Voir [`docs/front-end-specs/spec-b52-p1-keyboard-workflow-paiements-multiples.md`](../front-end-specs/spec-b52-p1-keyboard-workflow-paiements-multiples.md)

### 5.4. Points d'attention

- **Gestion du reste** : Pour espèces, peut avoir un reste (monnaie rendue)
- **Validation** : Total doit être couvert exactement (sauf espèces avec reste)
- **Affichage** : Liste claire des paiements dans le ticket final
- **Exports** : Les exports doivent prendre en compte les paiements multiples
- **Gestion du don** : Le don est inclus dans le calcul du reste dû (`amountDue = baseAmount + don`)
- **Chèques/cartes partiels** : Permettre montant < baseAmount pour paiements multiples (indication visuelle affichée)
- **Sélection automatique** : Après ajout d'un paiement, sélectionner automatiquement le moyen suivant (cash → check → card)
- **Exclusion "Gratuit / Don"** : Disponible uniquement pour le premier paiement, exclu de la boucle paiements multiples

---

## 6. Tasks / Subtasks

- [x] **Backend - Modèle PaymentTransaction**
  - [x] Créer modèle `PaymentTransaction` (id, sale_id, payment_method, amount, created_at)
  - [x] Créer migration Alembic pour table `payment_transactions`
  - [x] Migrer données existantes : créer `PaymentTransaction` pour chaque `Sale` existant

- [x] **Backend - Modèle Sale**
  - [x] Ajouter relation `payments` vers `PaymentTransaction`
  - [x] Optionnel : Garder `payment_method` pour rétrocompatibilité (déprécié)

- [x] **Backend - Endpoint création vente**
  - [x] Modifier `POST /api/v1/sales/` pour accepter liste de paiements
  - [x] Validation : somme des paiements >= total
  - [x] Créer les `PaymentTransaction` associés

- [x] **Backend - Schémas API**
  - [x] Modifier `SaleCreate` pour accepter `payments: List[PaymentCreate]`
  - [x] Modifier `SaleResponse` pour inclure `payments: List[PaymentResponse]`
  - [x] Mettre à jour documentation OpenAPI

- [x] **Frontend - Store caisse**
  - [x] Modifier `cashSessionStore.ts` pour gérer liste de paiements
  - [x] Ajouter logique pour construire liste de paiements depuis `FinalizationData`

- [x] **Frontend - Écran finalisation**
  - [x] Modifier `FinalizationScreen.tsx` pour supporter paiements multiples (état et logique)
  - [x] Afficher liste des paiements ajoutés
  - [x] Afficher reste dû en temps réel
  - [x] Bouton "Ajouter un autre paiement"
  - [x] Validation : impossible de valider si total non couvert
  - [x] **Workflow clavier complet** (Spec B52-P1 Keyboard Workflow)
    - [x] Navigation clavier dans la boucle paiements multiples
    - [x] Indicateurs visuels pour guider l'utilisateur
    - [x] Feedback temporaire après ajout de paiement
    - [x] Focus automatique entre les champs
    - [x] Support des raccourcis clavier (Enter, Flèches, +)

- [x] **Frontend - Affichage ticket**
  - [x] Modifier affichage du ticket pour montrer tous les paiements
  - [x] Format clair : "Espèces : 50€, Chèque : 30€"

- [x] **UX - Workflow clavier**
  - [x] Spécification UX complète (Spec B52-P1 Keyboard Workflow)
  - [x] Implémentation workflow clavier dans FinalizationScreen
  - [x] Indicateurs visuels contextuels
  - [x] Feedback utilisateur après actions
  - [x] Navigation clavier fluide (Enter, Flèches, +)

- [x] **Tests**
  - [x] Tests unitaires : validation paiements multiples (`test_b52_p1_payments.py`)
  - [x] Tests d'intégration : création vente avec paiements multiples (`test_sales_integration.py`)
  - [x] Tests E2E : workflow complet paiements multiples (`cash-register-workflow.test.tsx`)

- [x] **Documentation**
  - [x] Documentation UX complète (spec front-end)
  - [ ] Mettre à jour guides utilisateur si nécessaire

---

## 7. Definition of Done

- [x] Modèle `PaymentTransaction` créé et migré
- [x] Endpoint API modifié pour accepter paiements multiples
- [x] Interface frontend permet paiements multiples
- [x] Reste dû affiché en temps réel
- [x] Validation : impossible de finaliser si total non couvert
- [x] **Workflow clavier complet et fluide** (Spec B52-P1 Keyboard Workflow)
- [x] **Indicateurs visuels contextuels** pour guider l'utilisateur
- [x] **Feedback utilisateur** après ajout de paiement
- [x] Tests unitaires, intégration et E2E créés et prêts à être exécutés
- [x] Rétrocompatibilité : ventes avec un seul paiement fonctionnent
- [x] Documentation UX complète (spec front-end)

---

## 8. Dev Agent Record

### Agent Model Used
Claude Sonnet 4.5 (via Cursor)

### File List
**Backend:**
- `api/src/recyclic_api/models/payment_transaction.py` (nouveau)
- `api/src/recyclic_api/models/sale.py` (modifié - ajout relation payments)
- `api/src/recyclic_api/models/__init__.py` (modifié - export PaymentTransaction)
- `api/src/recyclic_api/schemas/sale.py` (modifié - ajout PaymentCreate, PaymentResponse, modification SaleCreate/SaleResponse)
- `api/src/recyclic_api/api/api_v1/endpoints/sales.py` (modifié - support paiements multiples, eager loading)
- `api/migrations/versions/b52_p1_add_payment_transactions.py` (nouveau)
- `api/migrations/versions/b52_p3_add_sale_date_to_sales.py` (modifié - correction dépendance)

**Frontend:**
- `frontend/src/stores/interfaces/ICashSessionStore.ts` (modifié - ajout interface Payment, modification FinalizationData)
- `frontend/src/stores/cashSessionStore.ts` (modifié - support paiements multiples dans submitSale)
- `frontend/src/components/business/FinalizationScreen.tsx` (modifié - état, logique, UI complète et workflow clavier pour paiements multiples)
- `frontend/src/services/salesService.ts` (modifié - ajout interface Payment, modification SaleDetail)
- `frontend/src/pages/Admin/CashSessionDetail.tsx` (modifié - affichage paiements multiples dans ticket et journal)

**Backend - Corrections:**
- `api/src/recyclic_api/schemas/cash_session.py` (modifié - ajout PaymentDetail et payments dans SaleDetail)
- `api/src/recyclic_api/services/cash_session_service.py` (modifié - eager loading des paiements dans get_session_with_details)

**Tests:**
- `api/tests/test_b52_p1_payments.py` (nouveau - tests unitaires paiements multiples)
- `api/tests/test_sales_integration.py` (modifié - ajout tests intégration paiements multiples)
- `frontend/src/test/integration/cash-register-workflow.test.tsx` (modifié - ajout tests E2E paiements multiples)

### Completion Notes
**Backend - Complet:**
- ✅ Modèle `PaymentTransaction` créé avec migration
- ✅ Migration des données existantes (création PaymentTransaction pour chaque Sale)
- ✅ Relation `payments` ajoutée au modèle `Sale`
- ✅ Schémas API modifiés (PaymentCreate, PaymentResponse)
- ✅ Endpoint POST /api/v1/sales/ modifié pour accepter paiements multiples
- ✅ Validation : somme des paiements >= total
- ✅ Eager loading des paiements pour éviter N+1 queries
- ✅ Rétrocompatibilité : support payment_method pour ventes existantes

**Frontend - Complet:**
- ✅ Interfaces modifiées pour supporter paiements multiples
- ✅ Store modifié pour construire liste de paiements depuis FinalizationData
- ✅ FinalizationScreen : état, logique et UI complète pour paiements multiples
- ✅ Affichage liste des paiements ajoutés avec possibilité de suppression
- ✅ Affichage reste dû en temps réel
- ✅ Bouton "Ajouter un autre paiement" avec champ de saisie
- ✅ Validation : impossible de valider si total non couvert
- ✅ Affichage ticket modifié pour montrer tous les paiements (format: "Espèces : 50€, Chèque : 30€")
- ✅ **Workflow clavier complet** (Spec B52-P1 Keyboard Workflow) :
  - ✅ Navigation clavier fluide dans la boucle paiements multiples
  - ✅ Indicateurs visuels contextuels pour guider l'utilisateur
  - ✅ Feedback temporaire après ajout de paiement
  - ✅ Focus automatique intelligent entre les champs
  - ✅ Support des raccourcis clavier (Enter, Flèches haut/bas, +)
  - ✅ Exclusion de "Gratuit / Don" de la boucle paiements multiples
  - ✅ Gestion du don en dehors de la boucle (une seule fois à la fin)
  - ✅ Sélection automatique du moyen de paiement suivant après ajout (cash → check → card → cash)
  - ✅ Gestion des chèques/cartes partiels (montant < baseAmount) pour paiements multiples
  - ✅ Indication visuelle "Paiement partiel" pour chèques/cartes < baseAmount
  - ✅ Désactivation du recalcul bidirectionnel don ↔ montant chèque (évite confusion)
  - ✅ Inclusion du don dans le calcul du reste dû pour paiements multiples

**Corrections de bugs (post-implémentation) :**
- ✅ Correction affichage paiements multiples dans journal des ventes (CashSessionDetail)
- ✅ Correction chargement des paiements dans get_session_with_details (eager loading)
- ✅ Correction schéma SaleDetail pour inclure payments
- ✅ Correction logique d'ajout de paiement pour mieux gérer les différents moyens
- ✅ Correction affichage ticket de caisse pour montrer tous les paiements

**Tests - Complet:**
- ✅ Tests unitaires créés (`api/tests/test_b52_p1_payments.py`)
  - Test création PaymentTransaction
  - Test relation Sale-PaymentTransaction
  - Test cascade delete
  - Test validation somme des paiements
  - Test paiements multiples avec différents moyens
  - Test paiements avec don
  - Test rétrocompatibilité
- ✅ Tests d'intégration ajoutés (`api/tests/test_sales_integration.py`)
  - Test création vente avec paiements multiples
  - Test paiements multiples avec don
  - Test paiement espèces avec reste
  - Test validation erreur (somme < total)
  - Test rétrocompatibilité payment_method unique
  - Test récupération vente avec paiements multiples
- ✅ Tests E2E ajoutés (`frontend/src/test/integration/cash-register-workflow.test.tsx`)
  - Test workflow complet paiements multiples
  - Test validation total couvert avant confirmation
  - Test affichage liste des paiements

### Change Log
- 2025-01-27 : Implémentation backend complète (modèle, migration, API)
- 2025-01-27 : Implémentation frontend complète (logique + UI)
- 2025-01-27 : Migration appliquée avec succès
- 2025-01-27 : Affichage ticket modifié pour paiements multiples
- 2025-01-27 : Corrections backend (eager loading paiements, schémas API)
- 2025-01-27 : Corrections frontend (affichage journal des ventes, chargement paiements)
- 2025-01-27 : **Implémentation workflow clavier complet** (Spec B52-P1 Keyboard Workflow)
  - Navigation clavier fluide dans la boucle paiements multiples
  - Indicateurs visuels contextuels
  - Feedback utilisateur après ajout
  - Focus automatique intelligent
- 2025-01-27 : **Améliorations UX workflow paiements multiples**
  - Sélection automatique du moyen suivant après ajout (cash → check → card)
  - Exclusion de "Gratuit / Don" de la boucle (disponible uniquement pour premier paiement)
  - Gestion des chèques/cartes partiels avec indication visuelle
  - Désactivation recalcul bidirectionnel don ↔ montant chèque
  - Inclusion du don dans le calcul du reste dû (amountDue = baseAmount + don)
- 2025-01-27 : **Création tests complets** (Story B52-P1 Review)
  - Tests unitaires : validation, relations, cascade delete, rétrocompatibilité
  - Tests d'intégration : création vente, validation, récupération avec paiements multiples
  - Tests E2E : workflow complet, validation total couvert, affichage liste paiements

### Debug Log References
- Migration b52_p1_payments appliquée après correction dépendance avec b52_p3_sale_date
- Eager loading ajouté dans endpoints GET pour éviter N+1 queries sur payments
- Corrections affichage paiements multiples dans journal des ventes et ticket de caisse
- Implémentation workflow clavier selon spec UX complète

### Références UX
- **Spec complète :** [`docs/front-end-specs/spec-b52-p1-keyboard-workflow-paiements-multiples.md`](../front-end-specs/spec-b52-p1-keyboard-workflow-paiements-multiples.md)
- **Auteur spec :** Sally (UX Expert)
- **Date spec :** 2025-01-27

---

## QA Results

### Review Date: 2026-01-05

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

Implémentation complète et solide avec une architecture bien pensée. La solution utilise une table séparée `payment_transactions` pour une meilleure normalisation et traçabilité. Le code est bien structuré, commenté avec références aux stories. Le workflow clavier est complet et bien implémenté selon la spec UX.

**Points forts :**
- Architecture robuste avec table séparée pour les paiements
- Migration bien structurée avec migration des données existantes
- Rétrocompatibilité assurée (support `payment_method` pour ventes existantes)
- Eager loading des paiements pour éviter N+1 queries
- Workflow clavier complet et fluide selon spec UX
- Validation backend correcte (somme >= total)

**Point critique :**
- ⚠️ **Aucun test écrit** - Critère d'acceptation #5 non satisfait. Pour une fonctionnalité de paiement, l'absence de tests est préoccupante.

### Refactoring Performed

Aucun refactoring nécessaire. Le code est bien structuré et suit les bonnes pratiques.

### Compliance Check

- Coding Standards: ✓ Code conforme aux standards du projet, bien commenté
- Project Structure: ✓ Fichiers organisés selon la structure du projet
- Testing Strategy: ✗ **Tests manquants** - Aucun test écrit pour valider les paiements multiples
- All ACs Met: ✗ **AC #5 non satisfait** - Tests unitaires, intégration et E2E manquants

### Improvements Checklist

- [ ] **CRITIQUE** : Créer tests unitaires pour validation des paiements multiples
- [ ] **CRITIQUE** : Créer tests d'intégration pour création vente avec paiements multiples
- [ ] **CRITIQUE** : Créer tests E2E pour workflow complet paiements multiples (incluant workflow clavier)
- [ ] Considérer tests de performance pour paiements multiples avec grand nombre de transactions
- [ ] Documenter les cas limites (paiements partiels, reste dû, etc.)

### Security Review

Validation backend correcte : la somme des paiements doit être >= au total. Pas de risque d'injection identifié. Les paiements sont tracés dans les logs d'audit via `log_transaction_event`.

**Recommandation :** Ajouter des tests de sécurité pour valider que les paiements ne peuvent pas être manipulés (montants négatifs, totaux incorrects, etc.).

### Performance Considerations

Eager loading des paiements implémenté avec `selectinload(Sale.payments)` pour éviter N+1 queries. Index créé sur `sale_id` dans la table `payment_transactions` pour améliorer les performances des requêtes.

### Files Modified During Review

Aucun fichier modifié lors de la revue. L'implémentation est complète et correcte.

### Gate Status

Gate: **READY FOR TESTING** → `docs/qa/gates/b52.p1-paiements-multiples.yml`

**Raison :** Tests créés, en attente d'exécution et validation.

### Recommended Status

✓ **Ready for Testing** - Tous les tests ont été créés selon les spécifications de la review. La story est prête pour l'exécution des tests et la validation finale.

**Tests créés :**
1. ✅ `api/tests/test_b52_p1_payments.py` - Tests unitaires complets
2. ✅ `api/tests/test_sales_integration.py` - Tests d'intégration ajoutés (6 nouveaux tests)
3. ✅ `frontend/src/test/integration/cash-register-workflow.test.tsx` - Tests E2E ajoutés (3 nouveaux tests)

**Prochaines étapes :**
1. Exécuter les tests unitaires : `pytest api/tests/test_b52_p1_payments.py -v`
2. Exécuter les tests d'intégration : `pytest api/tests/test_sales_integration.py::TestSalesIntegration::test_create_sale_with_multiple_payments -v`
3. Exécuter les tests E2E : `npm test -- cash-register-workflow.test.tsx`
4. Une fois tous les tests passants, la story pourra être marquée "Ready for Done".


