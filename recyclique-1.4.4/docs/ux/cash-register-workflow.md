# Audit UX Caisse - Patterns et Workflows

**Date:** 26 novembre 2025
**Auteur:** James (Full Stack Developer Agent)
**Story:** B39-P5 - Quantité minimum = 1
**Objectif:** Documenter les patterns UX du module Caisse pour assurer la cohérence avec Réception

## Vue d'ensemble

Ce document présente les patterns UX du module Caisse, alignés sur les standards établis par le module Réception. Il documente les changements apportés dans B39-P5 pour la validation des quantités minimum.

## 1. Validation des Quantités

### Règle de Quantité Minimum

**Depuis B39-P5:** La quantité minimum autorisée est désormais `1` (au lieu de `0` précédemment).

#### Comportement
- **Pré-remplissage automatique** : Le champ quantité est initialisé à `1` lors de l'entrée dans l'étape quantité
- **Validation stricte** : Impossible de valider une vente avec une quantité < 1
- **Message d'erreur aligné** : `"La quantité minimale est 1"` (identique à Réception)

#### Justification UX
- **Prévention des erreurs** : Évite les tickets avec quantité = 0 ou vide
- **Cohérence** : Alignement avec les patterns de Réception
- **Performance** : Réduction des corrections post-validation

### Messages d'Erreur

| Condition | Message d'erreur | Alignement Réception |
|-----------|------------------|---------------------|
| Quantité < 1 | `"La quantité minimale est 1"` | ✅ Identique |
| Quantité vide | `"Quantité requise"` | ✅ Standard |
| Quantité > 9999 | `"Quantité doit être un entier positif entre 1 et 9999"` | ✅ Cohérent |

## 2. Workflow de Saisie Quantité

### Étapes du Workflow

1. **Sélection Catégorie** → Navigation hiérarchique
2. **Saisie Poids** → Validation numérique (≥ 0.01 kg)
3. **Saisie Quantité** → Validation numérique (≥ 1)
4. **Saisie Prix** → Validation selon catégorie
5. **Validation Finale** → Ajout au ticket

### Gestion d'État des Étapes

- **useCashWizardStepState** : Hook centralisé pour la gestion des transitions
- **Auto-focus** : Navigation automatique entre champs
- **Validation progressive** : Chaque étape doit être validée avant de passer à la suivante

### Gestion du Focus

#### Auto-focus par Étape
- **Après sélection catégorie** : Focus vers champ poids
- **Après validation poids** : Focus vers champ quantité (pré-rempli à 1)
- **Après validation quantité** : Focus vers champ prix
- **Après validation prix** : Focus vers bouton validation

## 3. Interface Utilisateur

### Layout Responsive

Le module Caisse utilise un layout 3 colonnes identique à Réception :

- **Colonne gauche (25%)** : Pavé numérique unifié
- **Colonne centrale (50%)** : Zone de travail (catégories → workflow)
- **Colonne droite (25%)** : Ticket en cours

### Pavé Numérique

#### Support Multi-champs
- **Mode contextuel** : Quantité / Prix / Poids selon l'étape active
- **Validation temps réel** : Feedback immédiat sur les saisies
- **Raccourcis clavier** : Support AZERTY pour chiffres et commandes

#### Contraintes par Champ

| Champ | Valeurs autorisées | Format | Validation |
|-------|-------------------|--------|------------|
| Quantité | 1-9999 | Entier | ≥ 1 requis |
| Poids | 0.01-9999.99 | Décimal | ≥ 0.01 kg |
| Prix | 0.01-9999.99 | Décimal | Selon catégorie |

## 4. Patterns de Validation

### Validation Progressive

- **Par étape** : Chaque étape valide ses propres contraintes
- **Feedback immédiat** : Messages d'erreur affichés dès la saisie invalide
- **Prévention** : Boutons de validation désactivés si données invalides
- **Recovery** : Guidage utilisateur pour correction

### États Visuels

#### Indicateurs de Validité
- **Bordure verte** : Valeur valide
- **Bordure rouge** : Valeur invalide
- **Message d'erreur** : Texte explicatif sous le champ
- **Bouton désactivé** : Validation impossible

#### États Loading
- **Spinner** : Pendant les calculs ou sauvegardes
- **Désactivation** : Interface grisée pendant les opérations
- **Feedback** : Messages de progression

## 5. Gestion des Erreurs

### Types d'Erreurs

1. **Erreurs de validation** : Données invalides (affichées immédiatement)
2. **Erreurs réseau** : Problèmes de connexion (popup d'alerte)
3. **Erreurs métier** : Règles business violées (messages contextuels)

### Stratégie de Recovery

- **Validation locale** : Prévention des erreurs avant envoi
- **Messages explicites** : Guidage pour correction
- **États réversibles** : Possibilité d'annuler et corriger
- **Logging** : Trace des erreurs pour analyse

## 6. Accessibilité

### Navigation Clavier

- **Tab order** : Logique séquentielle (catégories → poids → quantité → prix)
- **Enter** : Validation de l'étape courante
- **Échap** : Annulation/reset du champ courant
- **Raccourcis** : Support des raccourcis AZERTY

### Labels et Descriptions

- **ARIA labels** : Descriptions complètes pour lecteurs d'écran
- **data-testid** : Identifiants stables pour tests automatisés
- **Labels visuels** : Textes explicites pour tous les contrôles

## 7. Cohérence avec Réception

### Patterns Alignés

| Aspect | Réception | Caisse | Statut |
|--------|-----------|--------|--------|
| Quantité min | 1 | 1 | ✅ Aligné |
| Message erreur | "La quantité minimale est 1" | "La quantité minimale est 1" | ✅ Identique |
| Pré-remplissage | Non applicable | 1 | ✅ Amélioré |
| Validation | Stricte | Stricte | ✅ Cohérente |

### Améliorations Apportées

1. **Prévention proactive** : Quantité pré-remplie à 1
2. **Messages cohérents** : Erreur alignée sur Réception
3. **Validation renforcée** : Blocage strict des valeurs < 1
4. **UX améliorée** : Feedback immédiat et guidage

## 8. Tests et Validation

### Tests Unitaires

- **Validation quantité** : Tests de toutes les conditions d'erreur
- **Pré-remplissage** : Vérification de l'initialisation à 1
- **Messages d'erreur** : Vérification des textes exacts

### Tests d'Intégration

- **Workflow complet** : Test de bout en bout avec quantité
- **Validation UI** : Tests des états visuels et boutons
- **Récupération d'erreur** : Tests de correction après erreur

### Couverture de Test

- **Composants** : SaleWizard, Numpad, validation hooks
- **États** : Tous les chemins de validation quantité
- **Erreurs** : Tous les scénarios d'erreur utilisateur

## 9. Impact et Migration

### Changements Apportés

1. **Validation renforcée** : Quantité minimum = 1
2. **Pré-remplissage** : Valeur par défaut = 1
3. **Messages alignés** : Cohérence avec Réception
4. **Tests complets** : Couverture des nouveaux comportements

### Compatibilité

- **Données existantes** : Aucun impact (validation côté front uniquement)
- **API** : Pas de changements requis
- **Base de données** : Pas de migrations nécessaires

### Rollback

En cas de problème, rollback possible par :
1. **Revert du code** : Retour à la validation précédente
2. **Feature flag** : Possibilité d'activation/désactivation
3. **Tests de régression** : Validation des workflows impactés

## 10. Recommandations d'Évolution

### Améliorations Futures

1. **Quantité par défaut configurable** : Selon catégorie ou utilisateur
2. **Validation intelligente** : Adaptation selon le contexte métier
3. **Messages personnalisés** : Par type de produit ou catégorie
4. **Analytics** : Suivi des erreurs de saisie pour optimisation

### Maintenance

- **Monitoring** : Suivre les taux d'erreur de validation
- **Feedback utilisateur** : Recueillir les retours sur l'UX
- **Évolution** : Adapter selon les besoins métier
- **Documentation** : Maintenir à jour ce document

---

**Validation requise :** Tests passent, PO + QA validés
**Stories liées :** B39-P2, B39-P3, B39-P4, B39-P6 pour alignement complet
**Document de référence :** `docs/ux/reception-workflow.md` pour patterns UX















