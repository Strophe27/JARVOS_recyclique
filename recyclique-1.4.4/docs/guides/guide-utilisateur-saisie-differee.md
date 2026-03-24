# Guide Utilisateur - Saisie Différée de Cahiers de Vente

**Date:** 2025-01-27  
**Version:** 1.0  
**Story:** B44-P1 - Saisie différée de cahiers de vente

---

## 📋 Vue d'ensemble

La fonctionnalité de **saisie différée** permet aux administrateurs de saisir des ventes provenant d'anciens cahiers de vente papier avec une date dans le passé. Cette fonctionnalité est essentielle pour la traçabilité et la conformité comptable.

---

## 🎯 Quand utiliser la saisie différée ?

### Cas d'usage principaux

1. **Saisie de cahiers papier en retard**
   - Vous avez des cahiers de vente papier non encore saisis dans le système
   - Vous devez respecter la date réelle de la vente pour la comptabilité

2. **Correction de données**
   - Vous devez corriger une vente qui a été mal enregistrée
   - Vous devez réintégrer des ventes manquantes

3. **Migration de données**
   - Import de données depuis un ancien système
   - Saisie rétroactive de données historiques

---

## 🔐 Accès et Permissions

### Qui peut utiliser la saisie différée ?

- ✅ **Super Administrateur** : Accès complet
- ✅ **Administrateur** : Accès complet
- ❌ **Utilisateur standard** : Accès refusé

### Sécurité

- Seuls les administrateurs peuvent ouvrir une session avec une date passée
- Les ventes créées dans une session différée ont automatiquement la date de la session
- Toutes les actions sont tracées dans les logs d'audit

---

## 📍 Accès à la fonctionnalité

### Depuis le tableau de bord caisse

1. Connectez-vous avec un compte **Administrateur** ou **Super Administrateur**
2. Accédez au **Tableau de bord caisse** (`/cash-register`)
3. Vous verrez une carte orange **"Saisie différée"** avec un badge **"ADMIN"**
4. Cliquez sur **"Accéder"** pour ouvrir l'interface de saisie différée

### URL directe

- **Développement :** `http://localhost:4444/cash-register/deferred`
- **Production :** `https://app.recyclic.org/cash-register/deferred`

---

## 🔄 Workflow de saisie différée

### Étape 1 : Ouvrir une session différée

1. **Sélectionnez la date du cahier**
   - Un sélecteur de date apparaît automatiquement
   - **Important :** Vous ne pouvez sélectionner que des dates passées (pas de dates futures)
   - La date sélectionnée correspond à la date réelle du cahier de vente papier

2. **Remplissez les informations de session**
   - **Opérateur** : Sélectionnez l'opérateur qui a effectué les ventes
   - **Site** : Sélectionnez le site concerné
   - **Poste de caisse** : Sélectionnez le poste de caisse (optionnel)
   - **Montant initial** : Montant en caisse au début de la session

3. **Validez l'ouverture**
   - Cliquez sur **"Ouvrir la session"**
   - La session est créée avec la date sélectionnée

### Étape 2 : Saisir les ventes

Une fois la session ouverte, vous verrez :

- **Badge "Saisie différée"** : Indicateur visuel orange avec la date du cahier
- **Interface de vente normale** : Identique à l'interface de caisse standard

**Saisie d'une vente :**

1. Ajoutez les articles vendus (catégories, quantités, poids, prix)
2. Renseignez les informations de paiement
3. Ajoutez une note si nécessaire
4. Validez la vente

**Important :** 
- La vente sera automatiquement datée avec la date de la session (date du cahier)
- Vous pouvez saisir plusieurs ventes dans la même session

### Étape 3 : Fermer la session

1. Cliquez sur **"Fermer la session"**
2. Vérifiez le montant final en caisse
3. Confirmez la fermeture

---

## 🎨 Indicateurs visuels

### Badge "Saisie différée"

Le badge apparaît dans l'écran de vente pour vous rappeler que vous êtes en mode différé :

```
┌─────────────────────────────────────┐
│ 📅 Saisie différée: 15/01/2025      │
└─────────────────────────────────────┘
```

**Caractéristiques :**
- **Couleur** : Orange clair
- **Icône** : Calendrier
- **Contenu** : "Saisie différée: [date du cahier]"
- **Emplacement** : En haut de l'écran de vente, à côté des informations de session

---

## ⚠️ Validations et contraintes

### Validation de date

- ❌ **Date future** : Impossible de sélectionner une date dans le futur
- ✅ **Date passée** : Toutes les dates passées sont acceptées
- ✅ **Date du jour** : Acceptée (limite)

### Validation de permissions

- ❌ **Utilisateur standard** : Si un utilisateur standard tente d'ouvrir une session différée, une erreur 403 est retournée
- ✅ **Administrateur** : Accès autorisé

### Validation de données

- Les mêmes validations que pour une session normale s'appliquent :
  - Montant initial >= 0
  - Opérateur et site valides
  - Articles avec quantités et prix valides

---

## 📊 Traçabilité et audit

### Logs d'audit

Toutes les actions de saisie différée sont enregistrées dans les logs d'audit :

- **Ouverture de session différée** : 
  - Date réelle d'ouverture (date du cahier)
  - Date de saisie (date actuelle)
  - Utilisateur qui a ouvert la session
  - Flag `is_deferred: true`

- **Ventes créées** :
  - Date de création = date de la session (date du cahier)
  - Utilisateur qui a créé la vente
  - Tous les détails de la vente

### Consultation des logs

Les administrateurs peuvent consulter les logs d'audit dans :
- **Console d'administration** : Section "Audit Logs"
- **API** : Endpoint `/api/v1/audit-logs/` avec filtres

---

## 💡 Bonnes pratiques

### ✅ À faire

- **Vérifier la date** : Assurez-vous que la date sélectionnée correspond bien à celle du cahier papier
- **Saisir toutes les ventes** : Saisissez toutes les ventes d'un cahier dans la même session
- **Vérifier les montants** : Vérifiez que les montants correspondent aux totaux du cahier
- **Ajouter des notes** : Utilisez les notes pour documenter les particularités (ex: "Cahier du 15/01, correction")

### ❌ À éviter

- **Mélanger les dates** : Ne pas ouvrir une session avec une date et saisir des ventes d'une autre date
- **Oublier de fermer** : Toujours fermer la session après avoir terminé la saisie
- **Saisir des ventes futures** : Ne pas utiliser la saisie différée pour des ventes futures

---

## 🆘 Problèmes courants

### Erreur : "Seuls les administrateurs peuvent ouvrir une session avec une date passée"

**Cause :** Vous n'avez pas les droits d'administrateur.

**Solution :**
- Vérifiez que vous êtes connecté avec un compte Administrateur ou Super Administrateur
- Contactez un administrateur pour obtenir les droits nécessaires

### Erreur : "La date ne peut pas être dans le futur"

**Cause :** Vous avez sélectionné une date future.

**Solution :**
- Sélectionnez une date passée ou la date du jour
- Vérifiez que votre système a l'heure correcte

### Le badge "Saisie différée" n'apparaît pas

**Cause possible :** Vous n'êtes pas en mode différé.

**Solution :**
- Vérifiez que vous avez bien ouvert la session depuis `/cash-register/deferred`
- Vérifiez que la date de la session est bien dans le passé

### Les ventes ont la mauvaise date

**Cause possible :** La date de la session n'est pas correcte.

**Solution :**
- Fermez la session actuelle
- Rouvrez une nouvelle session avec la bonne date
- Les nouvelles ventes auront la date correcte

---

## 🔄 Différences avec la saisie normale

| Aspect | Saisie normale | Saisie différée |
|--------|----------------|-----------------|
| **Date de session** | Date actuelle (automatique) | Date sélectionnée (passée) |
| **Date des ventes** | Date actuelle | Date de la session |
| **Accès** | Tous les utilisateurs | Administrateurs uniquement |
| **Badge visuel** | Aucun | Badge "Saisie différée" |
| **Sélecteur de date** | Non affiché | Affiché et requis |

---

## 📱 Support multi-appareils

La saisie différée fonctionne sur tous les appareils :
- **Ordinateur de bureau** : Interface complète avec sélecteur de date
- **Tablette** : Interface adaptée avec sélecteur tactile
- **Mobile** : Interface compacte optimisée pour petits écrans

---

## 🔐 Sécurité

### Contrôles de sécurité

- **Permissions strictes** : Seuls les administrateurs peuvent créer des sessions différées
- **Validation de date** : Impossible de créer des sessions avec des dates futures
- **Traçabilité complète** : Toutes les actions sont enregistrées dans les logs d'audit
- **Validation des données** : Toutes les données sont validées avant enregistrement

### Bonnes pratiques de sécurité

- **Ne pas partager les accès** : Chaque administrateur doit utiliser son propre compte
- **Vérifier les dates** : Toujours vérifier que la date correspond au cahier
- **Consulter les logs** : Vérifier régulièrement les logs d'audit pour détecter les anomalies

---

## ❓ Questions fréquentes

### Puis-je modifier la date d'une session après l'avoir ouverte ?

Non, la date d'une session ne peut pas être modifiée après l'ouverture. Si vous avez besoin de changer la date, fermez la session et ouvrez-en une nouvelle avec la bonne date.

### Que se passe-t-il si je ferme la session sans avoir saisi toutes les ventes ?

Vous pouvez rouvrir une nouvelle session avec la même date pour continuer la saisie. Les ventes seront associées à la nouvelle session, mais auront toutes la même date.

### Puis-je utiliser la saisie différée pour des ventes futures ?

Non, la saisie différée est uniquement pour les ventes passées. Les ventes futures doivent être saisies normalement.

### Les ventes différées apparaissent-elles dans les rapports ?

Oui, les ventes différées apparaissent dans tous les rapports avec leur date réelle (date du cahier), pas la date de saisie.

### Puis-je annuler une vente différée ?

Oui, comme pour les ventes normales, vous pouvez annuler une vente différée si nécessaire. L'annulation sera tracée dans les logs d'audit.

---

## 📞 Support

Pour toute question ou problème :

- **Email :** support@recyclic.fr
- **Documentation technique :** Voir la story B44-P1 pour plus de détails
- **Console d'administration :** Consultez les logs d'audit pour diagnostiquer les problèmes

---

**Dernière mise à jour :** 2025-01-27  
**Version du document :** 1.0














