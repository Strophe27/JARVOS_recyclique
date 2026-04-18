# Guide Utilisateur - Utilisation du Mode Prix Global

**Version:** 1.0  
**Date:** 2025-01-27  
**Story:** B49-P4

## Introduction

Le mode prix global permet de saisir un total manuel pour une vente au lieu de calculer automatiquement le total des articles. Ce guide explique comment utiliser cette fonctionnalité.

## Prérequis

- Le mode prix global doit être activé sur le poste de caisse (voir [Guide de Configuration](./workflow-options-configuration.md))
- Une session de caisse doit être ouverte

## Workflow Détaillé

### Étape 1: Ouvrir une Session de Caisse

1. Connectez-vous à l'interface de caisse
2. Ouvrez une session de caisse normalement
3. Vérifiez que le mode prix global est actif (l'étape "Quantité" sera masquée)

### Étape 2: Ajouter des Articles

1. **Sélectionner une catégorie**
   - Cliquez sur la catégorie souhaitée (ex: EEE-1, EEE-2, etc.)

2. **Saisir le poids** (si nécessaire)
   - Entrez le poids de l'article
   - Appuyez sur **Entrée** pour valider

3. **Saisir le prix**
   - En mode prix global, vous pouvez saisir **0€** pour les articles sans prix
   - Entrez le prix si vous le connaissez
   - Appuyez sur **Entrée** pour valider

**Note:** L'étape "Quantité" est masquée en mode prix global.

### Étape 3: Finaliser la Vente

1. Cliquez sur **Finaliser** ou appuyez sur la touche de raccourci

2. **Écran de finalisation:**
   - Un champ **"Total à payer"** apparaît
   - Saisissez le montant total de la vente
   - Si certains articles ont un prix, un **sous-total** est affiché
   - Le total saisi ne peut pas être inférieur au sous-total

3. **Compléter les informations:**
   - **Don** (optionnel): Montant du don
   - **Méthode de paiement:** Espèces, Carte, Chèque
   - **Note** (optionnel): Note sur la vente

4. Cliquez sur **Confirmer** pour valider la vente

## Cas d'Usage

### Cas 1: Articles à 0€ sans mention de prix

**Scénario:** Vente d'articles sans prix individuel (dons, articles gratuits)

**Workflow:**
1. Ajoutez les articles avec prix 0€
2. Lors de la finalisation, saisissez le total manuel
3. Validez la vente

**Exemple:**
- Article 1: EEE-1, poids 2.5kg, prix 0€
- Article 2: EEE-2, poids 1.0kg, prix 0€
- **Total saisi:** 15.00€

### Cas 2: Mixte (articles avec prix + articles à 0€)

**Scénario:** Vente mixte avec certains articles à prix fixe et d'autres sans prix

**Workflow:**
1. Ajoutez les articles avec leurs prix respectifs
2. Ajoutez les articles sans prix (0€)
3. Lors de la finalisation:
   - Un **sous-total** est affiché (somme des articles avec prix)
   - Saisissez le **total** (sous-total + articles sans prix)
4. Validez la vente

**Exemple:**
- Article 1: EEE-1, prix 15.00€ → Sous-total: 15.00€
- Article 2: EEE-2, prix 0€
- **Total saisi:** 20.00€ (15€ sous-total + 5€ pour l'article sans prix)

### Cas 3: Presets en Mode Prix Global

**Scénario:** Utilisation de presets (dons, tarifs fixes) en mode prix global

**Workflow:**
1. Sélectionnez un preset (ex: "Don 0€", "Don 18€")
2. Le preset est ajouté avec prix 0€
3. Lors de la finalisation, saisissez le total manuel
4. Validez la vente

**Note:** Les presets fonctionnent normalement, mais le total final est toujours saisi manuellement.

## Règles de Validation

### Validation du Total

- Le total saisi doit être **≥ 0€**
- Si un sous-total est affiché, le total doit être **≥ sous-total**
- Le total peut être **0€** si tous les articles sont à 0€ et qu'il n'y a pas de sous-total

### Exemples de Validation

✅ **Valide:**
- Total: 15.00€, Sous-total: 10.00€ → Accepté (15 ≥ 10)
- Total: 0.00€, Pas de sous-total → Accepté (don ou gratuit)
- Total: 25.50€, Sous-total: 25.50€ → Accepté (égal au sous-total)

❌ **Invalide:**
- Total: 5.00€, Sous-total: 10.00€ → Rejeté (5 < 10)
- Total: -5.00€ → Rejeté (négatif)

## Raccourcis Clavier

- **Échap:** Annuler la finalisation et revenir à la saisie
- **Entrée:** Valider la saisie du total (si valide)

## FAQ

### Puis-je utiliser le mode prix global pour toutes les ventes ?

Oui, si le mode est activé sur le poste de caisse, toutes les ventes utiliseront ce mode.

### Que se passe-t-il si je ne saisie pas de total ?

Le champ "Total à payer" est obligatoire. Vous devez saisir un montant pour valider la vente.

### Puis-je modifier le total après l'avoir saisi ?

Oui, vous pouvez modifier le total dans le champ "Total à payer" avant de confirmer.

### Les articles avec prix sont-ils toujours pris en compte ?

Oui, si des articles ont un prix, un sous-total est calculé et affiché. Le total saisi doit être au moins égal à ce sous-total.

### Puis-je utiliser les presets en mode prix global ?

Oui, les presets fonctionnent normalement. Ils sont ajoutés avec prix 0€, et vous saisissez le total manuellement.

## Support

Pour toute question ou problème, contactez l'administrateur système.

