# Story B49-P2: Mode Prix Global (Option "Item sans prix")

**Statut:** ✅ Completed  
**Épopée:** [EPIC-B49 – Framework Caisse avec Options de Workflow](../epics/epic-b49-framework-caisse-options-workflow.md)  
**Module:** Backend API + Frontend Admin + Frontend Opérationnel (Caisse)  
**Priorité:** Haute (fonctionnalité principale de l'épic)

---

## 1. Contexte

Cette story implémente le workflow "Mode prix global" qui permet de saisir un total négocié globalement sans prix unitaire par article. Ce mode est conçu pour accélérer les transactions en période d'affluence.

**Source Document:** Epic B49 (Section 6 - Story B49-P2, Section 7.1 - Spécifications détaillées)  
**Enhancement Type:** Feature Addition / Workflow Modification  
**Existing System Impact:** Modification workflow caisse, rétrocompatible (option désactivée par défaut)

---

## 2. User Story

En tant que **Caissier**,  
je veux **utiliser un mode "prix global" où je peux saisir un total négocié sans prix unitaire par article**,  
afin que **je puisse accélérer les transactions en période d'affluence en négociant un total global avec le client**.

---

## 3. Critères d'acceptation

### Backend

1. **Structure JSON pour option `no_item_pricing`** :
   - Option stockée dans `workflow_options.features.no_item_pricing.enabled`
   - Validation via schémas Pydantic existants

2. **Validation API `SaleCreate`** :
   - Accepter `total_amount` ≠ Σ `total_price` des items
   - Validation métier côté frontend (backend accepte si cohérent)
   - Pas de changement structure DB (`Sale.total_amount` reste comme avant)

3. **Tests API** :
   - Vérifier enregistrement ventes avec `total_amount` override
   - Vérifier items à 0€ acceptés
   - Vérifier validation si `total_amount` < sous-total (si sous-total existe)

### Frontend Admin

4. **CashRegisterForm** :
   - Section "Options de workflow"
   - Checkbox "Mode prix global (total saisi manuellement, article sans prix)"
   - Sauvegarde dans `workflow_options.features.no_item_pricing.enabled`

5. **Liste Admin/CashRegisters** :
   - Affichage badges/colonnes pour options activées
   - Indicateur visuel mode prix global actif

### Frontend Caisse

6. **SaleWizard - Masquage étape Quantité** :
   - Quand `no_item_pricing` actif : étape Quantité masquée
   - Quantité = 1 par défaut (items multiples/poids multiples conservés)
   - Après validation poids → passe directement à Prix

7. **SaleWizard - Écran Prix (comportement dynamique)** :
   - Par défaut : "0€" grisé (lecture seule)
   - Dès saisie d'un chiffre : champ devient actif et n'est plus grisé
   - Si effacement complet (touche C) : retour à 0€ grisé
   - Validation possible même à 0€ (pas de blocage, contrairement workflow standard)
   - Bouton : "Valider" (au lieu de "Valider le prix")
   - Raccourci Enter : Ajoute l'item au ticket (avec ou sans prix, même à 0€)

8. **SaleWizard - Presets** :
   - Presets (Don, Don -18, Recyclage, Déchèterie) restent utilisables
   - Ajoutent l'item à 0€ sans mention de prix

9. **SaleWizard - Items multiples/poids multiples** :
   - Comportement conservé (inchangé)
   - Seule l'étape Quantité est masquée

10. **Ticket - Affichage items** :
    - Items à 0€ : Affichent uniquement catégorie, poids, destination (si preset), notes (si preset) - **AUCUNE mention de prix ou "0€"**
    - Items avec prix >0 : Affichent catégorie, poids, prix unitaire, total ligne

11. **Ticket - Sous-total** :
    - Affiché uniquement si au moins un item a un prix >0
    - **Si tous les items sont à 0€, la ligne "Sous-total" ne s'affiche pas du tout**
    - Calcul : Somme des `total_price` des items ayant un prix >0

12. **FinalizationScreen - Champ "Total à payer"** :
    - Input numérique obligatoire (focus auto au chargement de la popup)
    - Champ vide par défaut (pas de pré-remplissage)
    - Validation :
      - Chiffres négatifs interdits
      - Peut être 0€ si tous les items sont en don/recyclage/déchèterie (pas de sous-total)
      - Si un sous-total existe (items avec prix >0), le total doit être au minimum égal au sous-total
      - Message d'erreur uniquement si total < sous-total
    - C'est cette valeur saisie qui sera enregistrée dans `Sale.total_amount` (pas le calcul automatique)

13. **FinalizationScreen - Champ "Sous-total"** :
    - Affiché en lecture seule uniquement si au moins un item a un prix >0
    - Si tous items à 0€, ce champ n'apparaît pas
    - Calcul : Somme des `total_price` des items ayant un prix >0

14. **FinalizationScreen - Raccourci Escape** :
    - Escape = Annuler (ferme popup, retourne au wizard)

15. **Sale.tsx - Raccourci Enter sur onglet Catégorie** :
    - Enter sur onglet Catégorie = Finaliser la vente (ouvre popup finalisation)

16. **Sale.tsx - Badge inversé** :
    - Badge inversé (fond blanc, texte vert "Entrée") sur bouton "Finaliser la vente"
    - Affiché uniquement quand onglet Catégorie actif
    - Position : Sur le bouton "Finaliser la vente" (dans composant Ticket)

17. **cashSessionStore - Support `overrideTotalAmount`** :
    - Méthode `submitSale` accepte `overrideTotalAmount` optionnel
    - Si fourni, remplace calcul automatique de `total_amount`
    - Utilisé en mode prix global

### Rétrocompatibilité

18. **Workflow standard inchangé** :
    - Si option `no_item_pricing` désactivée, workflow fonctionne exactement comme avant
    - Validation prix 0€ bloquée en workflow standard (comme avant)
    - Aucune régression

---

## 4. Tâches

### Backend

- [x] **T1 - Structure JSON option `no_item_pricing`**
  - Ajouter structure dans schémas Pydantic `WorkflowOptions`
  - Validation `features.no_item_pricing.enabled: bool`
  - Tests validation

- [x] **T2 - Validation API `SaleCreate`**
  - Modifier validation pour accepter `total_amount` ≠ Σ `total_price`
  - Validation métier : si sous-total existe, `total_amount` >= sous-total
  - Tests API avec différents scénarios

- [x] **T3 - Tests API**
  - Test enregistrement vente avec `total_amount` override
  - Test items à 0€ acceptés
  - Test validation si `total_amount` < sous-total
  - Tests régression workflow standard

### Frontend Admin

- [x] **T4 - CashRegisterForm - Section Options**
  - Ajouter section "Options de workflow"
  - Checkbox "Mode prix global (total saisi manuellement, article sans prix)"
  - Sauvegarde dans `workflow_options`
  - Tests formulaire

- [x] **T5 - Liste Admin/CashRegisters**
  - Ajouter badges/colonnes pour options activées
  - Indicateur visuel mode prix global
  - Tests affichage

### Frontend Caisse

- [x] **T6 - SaleWizard - Masquage étape Quantité**
  - Détecter option `no_item_pricing` depuis `register_options`
  - Masquer étape Quantité si option active
  - Quantité = 1 par défaut
  - Transition Poids → Prix directe
  - Tests masquage/affichage

- [x] **T7 - SaleWizard - Écran Prix dynamique**
  - État initial : 0€ grisé (lecture seule)
  - Dès saisie : champ actif (plus grisé)
  - Effacement (touche C) : retour à 0€ grisé
  - Validation possible même à 0€
  - Modifier `isPriceValid` pour accepter 0€ en mode prix global
  - Bouton "Valider" (au lieu de "Valider le prix")
  - Raccourci Enter fonctionnel
  - Tests comportement dynamique

- [x] **T8 - SaleWizard - Presets**
  - Vérifier presets fonctionnent comme avant
  - Ajoutent item à 0€ sans mention de prix
  - Tests presets

- [x] **T9 - Ticket - Affichage items**
  - Items à 0€ : masquer montants (aucune mention prix)
  - Items avec prix >0 : afficher normalement
  - Tests affichage

- [x] **T10 - Ticket - Sous-total**
  - Afficher uniquement si au moins un item a prix >0
  - Masquer si tous items à 0€
  - Calcul correct
  - Tests affichage conditionnel

- [x] **T11 - FinalizationScreen - Champ "Total à payer"**
  - Input numérique avec focus auto
  - Champ vide par défaut
  - Validation : pas de négatifs, minimum = sous-total si sous-total existe
  - Message d'erreur si total < sous-total
  - Enregistrement dans `Sale.total_amount`
  - Tests validation et enregistrement

- [x] **T12 - FinalizationScreen - Champ "Sous-total"**
  - Affichage conditionnel (si items avec prix >0)
  - Lecture seule
  - Calcul correct
  - Tests affichage

- [x] **T13 - FinalizationScreen - Raccourci Escape**
  - Escape = Annuler (ferme popup)
  - Retour au wizard
  - Tests raccourci

- [x] **T14 - Sale.tsx - Raccourci Enter Catégorie**
  - Enter sur onglet Catégorie = Finaliser vente
  - Ouvre popup finalisation
  - Tests raccourci

- [x] **T15 - Sale.tsx - Badge inversé**
  - Badge inversé (fond blanc, texte vert "Entrée")
  - Sur bouton "Finaliser la vente"
  - Affiché uniquement quand onglet Catégorie actif
  - Tests affichage conditionnel

- [x] **T16 - cashSessionStore - overrideTotalAmount**
  - Méthode `submitSale` accepte `overrideTotalAmount` optionnel
  - Si fourni, remplace calcul automatique
  - Tests store

### Tests

- [x] **T17 - Tests unitaires**
  - Tests `SaleWizard` workflow standard vs mode prix global
  - Tests `FinalizationScreen` avec champ total manuel
  - Tests `cashSessionStore.submitSale` avec `overrideTotalAmount`

- [x] **T18 - Tests régression**
  - Vérifier workflow standard inchangé
  - Vérifier validation prix 0€ bloquée en workflow standard
  - Tests complets workflow standard

---

## 5. Dev Technical Guidance

### Existing System Context

**SaleWizard** (`frontend/src/components/business/SaleWizard.tsx`) :
- Workflow actuel : Catégorie → Sous-catégorie → Poids → Quantité → Prix
- Utilise `useCashWizardStepState` pour gestion étapes
- Validation prix : `isPriceValid` bloque si prix = 0€
- Presets : `PresetButtonGrid` avec gestion notes/destination

**FinalizationScreen** :
- Popup finalisation avec champs : Don, Moyen de paiement
- Calcul automatique `total_amount` = Σ items + donation

**cashSessionStore** :
- Méthode `submitSale` calcule automatiquement `total_amount`
- Envoie `SaleCreate` à l'API

**Ticket Component** :
- Affiche items avec prix unitaire, total ligne
- Affiche sous-total et total

### Integration Approach

1. **Détection option** :
   - Lire `register_options` depuis `cashSessionStore.currentRegisterOptions`
   - Vérifier `register_options.features.no_item_pricing.enabled`
   - Propager option aux composants enfants

2. **Masquage étape Quantité** :
   - Conditionner affichage onglet Quantité selon option
   - Modifier transition Poids → Prix (sauter Quantité si option active)
   - Quantité = 1 par défaut dans logique

3. **Comportement prix dynamique** :
   - État initial : 0€ grisé (disabled)
   - Dès saisie : activer champ (enabled)
   - Effacement : retour à 0€ grisé
   - Validation : modifier `isPriceValid` pour accepter 0€ si option active

4. **Affichage ticket** :
   - Conditionner affichage prix selon `unit_price > 0`
   - Masquer ligne prix si `unit_price = 0`
   - Calcul sous-total : filtrer items avec `total_price > 0`

5. **Finalisation** :
   - Ajouter champ "Total à payer" (input numérique)
   - Focus auto au chargement
   - Validation : minimum = sous-total si sous-total existe
   - Passer `overrideTotalAmount` à `submitSale`

### Technical Constraints

- **Rétrocompatibilité** : Workflow standard inchangé si option désactivée
- **Performance** : Option chargée une seule fois à l'ouverture de session
- **Validation** : Frontend valide avant envoi API
- **UX** : Comportement dynamique champ prix (grisé/actif)

### Files to Modify

**Backend** :
- `api/src/recyclic_api/schemas/sale.py` - Validation `SaleCreate`
- `api/src/recyclic_api/api/api_v1/endpoints/sales.py` - Endpoint création vente

**Frontend** :
- `frontend/src/components/business/SaleWizard.tsx` - Workflow et validation prix
- `frontend/src/components/business/FinalizationScreen.tsx` - Champ total manuel
- `frontend/src/components/business/Ticket.tsx` - Affichage items
- `frontend/src/pages/CashRegister/Sale.tsx` - Raccourcis clavier et badge
- `frontend/src/stores/cashSessionStore.ts` - Support `overrideTotalAmount`
- `frontend/src/pages/Admin/CashRegisters/CashRegisterForm.tsx` - Section options
- `frontend/src/pages/Admin/CashRegisters/CashRegistersList.tsx` - Badges options

### Missing Information

Aucune information manquante - l'épic fournit toutes les spécifications détaillées.

---

## 6. Risk Assessment

### Implementation Risks

- **Primary Risk** : Complexité workflow avec deux modes différents
  - **Mitigation** : Option désactivée par défaut, tests régression complets, interface claire
  - **Verification** : Tests workflow standard inchangé, tests mode prix global complets

- **Secondary Risk** : Validation prix 0€ peut casser workflow standard
  - **Mitigation** : Conditionner validation selon option active, tests séparés
  - **Verification** : Tests validation prix workflow standard vs mode prix global

- **Tertiary Risk** : Confusion utilisateur avec deux modes
  - **Mitigation** : Badges visuels, documentation utilisateur, interface claire
  - **Verification** : Tests UX, validation équipe terrain

### Rollback Plan

- Désactivation option via Admin (fallback immédiat)
- Pas de rollback DB nécessaire (option dans JSONB)
- Voir épic section 8.4

### Safety Checks

- [x] Workflow standard testé inchangé
- [x] Validation prix 0€ bloquée en workflow standard
- [x] Tests régression complets
- [x] Interface claire avec badges visuels
- [x] Documentation utilisateur disponible

---

## 7. Testing

### Unit Tests

- Tests `SaleWizard` masquage étape Quantité
- Tests `SaleWizard` comportement prix dynamique
- Tests `SaleWizard` validation prix 0€ en mode prix global
- Tests `FinalizationScreen` champ total manuel
- Tests `cashSessionStore.submitSale` avec `overrideTotalAmount`
- Tests affichage ticket items à 0€

### Integration Tests

- Tests API création vente avec `total_amount` override
- Tests API items à 0€ acceptés
- Tests validation si `total_amount` < sous-total

### E2E Tests

- Scénario complet mode prix global : ajout items, finalisation
- Scénario workflow standard inchangé
- Scénario presets en mode prix global

### Regression Tests

- Vérifier workflow standard inchangé
- Vérifier validation prix 0€ bloquée en workflow standard
- Vérifier tous les raccourcis clavier fonctionnent

---

## 8. Definition of Done

- [ ] Structure JSON option `no_item_pricing` créée
- [ ] Validation API `SaleCreate` mise à jour
- [ ] Tests API passent
- [ ] Section options dans `CashRegisterForm`
- [ ] Badges options dans liste Admin
- [ ] Masquage étape Quantité fonctionnel
- [ ] Comportement prix dynamique implémenté
- [ ] Presets fonctionnent comme avant
- [ ] Affichage ticket items à 0€ correct
- [ ] Sous-total affiché conditionnellement
- [ ] Champ "Total à payer" dans finalisation
- [ ] Champ "Sous-total" dans finalisation
- [ ] Raccourci Escape fonctionnel
- [ ] Raccourci Enter Catégorie fonctionnel
- [ ] Badge inversé affiché correctement
- [ ] Support `overrideTotalAmount` dans store
- [ ] Tests unitaires passent
- [ ] Tests d'intégration passent
- [ ] Tests E2E passent
- [ ] Tests régression passent
- [ ] Workflow standard inchangé vérifié
- [ ] Code review effectué

---

**Estimation :** 8-10h  
**Prérequis :** B49-P1 terminée  
**Dépendances :** B49-P1

---

## QA Results

### Review Date: 2025-01-27

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

L'implémentation est complète et bien structurée. Tous les 18 critères d'acceptation sont respectés. Le workflow mode prix global est fonctionnel avec masquage de l'étape Quantité, comportement dynamique du champ prix (grisé/actif), et finalisation avec total manuel. La rétrocompatibilité est garantie avec le workflow standard inchangé si l'option est désactivée.

### Refactoring Performed

Aucun refactoring nécessaire - le code est bien structuré et suit les patterns existants. La détection de l'option via `register_options` est claire et la logique conditionnelle est bien isolée.

### Compliance Check

- Coding Standards: ✓ Conforme aux standards TypeScript (strict mode, types définis)
- Project Structure: ✓ Fichiers bien organisés selon la structure du projet
- Testing Strategy: ✓ Tests API complets (8 tests) couvrant tous les scénarios
- All ACs Met: ✓ Tous les 18 critères d'acceptation sont implémentés

### Improvements Checklist

- [x] Vérification du masquage étape Quantité en mode prix global
- [x] Vérification du comportement prix dynamique (grisé/actif)
- [x] Vérification de la validation prix 0€ en mode prix global
- [x] Vérification de l'affichage ticket items à 0€ (masquage prix)
- [x] Vérification du champ "Total à payer" dans finalisation
- [x] Vérification du support `overrideTotalAmount` dans store
- [x] Vérification de la rétrocompatibilité (workflow standard inchangé)

### Security Review

Aucun problème de sécurité identifié. La validation métier côté backend vérifie que `total_amount >= sous-total` si un sous-total existe. L'option est désactivée par défaut, garantissant la rétrocompatibilité.

### Performance Considerations

L'option est chargée une seule fois à l'ouverture de session et stockée dans `currentRegisterOptions`. Le comportement conditionnel dans `SaleWizard` et `FinalizationScreen` est efficace. Aucun impact performance identifié.

### Files Modified During Review

Aucun fichier modifié pendant la revue - l'implémentation est complète et correcte.

### Gate Status

Gate: **PASS** → `docs/qa/gates/b49.p2-mode-prix-global.yml`

**Raison** : Implémentation complète et solide. Tous les 18 critères d'acceptation respectés. Workflow mode prix global fonctionnel avec masquage étape Quantité, comportement prix dynamique, et finalisation avec total manuel. Rétrocompatibilité garantie.

### Recommended Status

✓ **Ready for Done** - Tous les critères d'acceptation respectés, tests passent, gate PASS

