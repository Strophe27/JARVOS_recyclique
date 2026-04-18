# Guide Utilisateur - Configuration des Options de Workflow

**Version:** 1.0  
**Date:** 2025-01-27  
**Story:** B49-P4

## Introduction

Ce guide explique comment configurer les options de workflow pour les postes de caisse dans Recyclic. Les options de workflow permettent de personnaliser le comportement de la caisse selon vos besoins.

## Vue d'ensemble

Les options de workflow sont configurées au niveau de chaque **poste de caisse**. Cela permet d'avoir des configurations différentes selon les besoins de chaque point de vente.

## Accès à la Configuration

1. Connectez-vous à l'interface d'administration
2. Naviguez vers **Paramètres** > **Postes de caisse**
3. Sélectionnez le poste de caisse à configurer
4. Cliquez sur **Modifier** ou **Configurer les options**

## Options Disponibles

### Mode Prix Global (no_item_pricing)

**Description:** Active le mode prix global, qui permet de saisir un total manuel pour la vente au lieu de calculer automatiquement le total des articles.

**Quand l'utiliser:**
- Pour les ventes où les articles n'ont pas de prix individuel
- Pour les dons ou articles à prix libre
- Pour simplifier la saisie lors de ventes en lot

**Configuration:**

1. Dans la page de configuration du poste de caisse
2. Activez l'option **"Mode prix global"**
3. Optionnellement, modifiez le libellé (par défaut: "Mode prix global")
4. Cliquez sur **Enregistrer**

**Exemple de configuration:**
```
Options de workflow:
  ✓ Mode prix global
    Libellé: "Mode prix global (total saisi manuellement)"
```

## Activation/Désactivation

### Activer une Option

1. Accédez à la configuration du poste de caisse
2. Cochez la case correspondante à l'option
3. Cliquez sur **Enregistrer**

### Désactiver une Option

1. Accédez à la configuration du poste de caisse
2. Décochez la case correspondante à l'option
3. Cliquez sur **Enregistrer**

**Note:** La désactivation d'une option n'affecte pas les sessions déjà ouvertes. Seules les nouvelles sessions utiliseront la nouvelle configuration.

## Impact sur les Sessions

Les options de workflow sont **héritées** par les sessions de caisse créées avec ce poste :

- **Sessions normales:** Héritent des options du poste
- **Sessions virtuelles:** Héritent des options du poste
- **Sessions différées:** Héritent des options du poste

## Exemples de Configuration

### Configuration Standard (Par Défaut)

```
Options de workflow:
  ✗ Mode prix global (désactivé)
```

**Comportement:** Le total est calculé automatiquement à partir des prix des articles.

### Configuration Mode Prix Global

```
Options de workflow:
  ✓ Mode prix global (activé)
    Libellé: "Mode prix global"
```

**Comportement:** Le total peut être saisi manuellement lors de la finalisation.

## FAQ

### Puis-je avoir des configurations différentes par poste de caisse ?

Oui, chaque poste de caisse peut avoir sa propre configuration d'options.

### Les options affectent-elles les sessions déjà ouvertes ?

Non, seules les nouvelles sessions créées après la modification héritent des nouvelles options.

### Puis-je désactiver toutes les options ?

Oui, vous pouvez laisser toutes les options désactivées pour revenir au comportement standard.

### Comment savoir quelles options sont actives sur un poste ?

Les options actives sont affichées dans la page de configuration du poste de caisse.

## Support

Pour toute question ou problème, contactez l'administrateur système.

