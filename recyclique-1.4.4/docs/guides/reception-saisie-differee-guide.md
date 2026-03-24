# Guide Utilisateur - Saisie Différée de Tickets de Réception

**Auteur:** Équipe de Développement Recyclic  
**Date:** 2025-01-27  
**Version:** 1.0

## Introduction

La fonctionnalité de **saisie différée** permet aux administrateurs de saisir des tickets de réception d'anciens cahiers papier avec leur date réelle de réception, et non la date de saisie actuelle.

Cette fonctionnalité est particulièrement utile lorsque :
- Les bénévoles ont utilisé des cahiers papier lors de coupures internet
- Plusieurs jours de réception ont été enregistrés sur un même cahier
- Il est nécessaire de saisir des tickets a posteriori avec leur date réelle

## Permissions Requises

⚠️ **Important** : Seuls les utilisateurs avec les rôles suivants peuvent utiliser la saisie différée :
- **Administrateur** (ADMIN)
- **Super Administrateur** (SUPER_ADMIN)

Les utilisateurs standard (USER) ne verront pas l'option de saisie différée.

## Comment Utiliser la Saisie Différée

### Étape 1 : Accéder au Module de Réception

1. Connectez-vous à l'application Recyclic
2. Naviguez vers le **Module de Réception** (`/reception`)

### Étape 2 : Ouvrir un Poste en Mode Saisie Différée

1. Si vous êtes administrateur, vous verrez un bouton **"Saisie différée"** dans le header de la page de réception
2. Cliquez sur le bouton **"Saisie différée"**
3. Un modal s'ouvre avec un sélecteur de date

### Étape 3 : Sélectionner la Date du Cahier

1. Dans le modal, utilisez le **sélecteur de date** pour choisir la date du cahier
2. ⚠️ **Règles de validation** :
   - La date ne peut **pas être dans le futur**
   - Il n'y a **pas de limite dans le passé** (vous pouvez saisir des tickets très anciens)
   - La date d'aujourd'hui est acceptée

3. Cliquez sur **"Ouvrir le poste"**

### Étape 4 : Vérifier le Mode Saisie Différée

Une fois le poste ouvert, vous verrez un **indicateur visuel** dans le header :
- **"Saisie différée - [Date du cahier]"** avec une icône d'horloge
- Cet indicateur confirme que vous êtes en mode saisie différée

### Étape 5 : Créer des Tickets

1. Créez des tickets normalement en cliquant sur **"Créer un nouveau ticket de dépôt"**
2. Ajoutez des lignes de dépôt comme d'habitude
3. ⚠️ **Important** : Tous les tickets créés dans ce poste auront la **date du poste** (date du cahier), pas la date de saisie actuelle

### Étape 6 : Fermer le Poste

1. Une fois tous les tickets du cahier saisis, cliquez sur **"Terminer ma session"**
2. Le poste se ferme normalement
3. Tous les tickets créés conservent la date du cahier dans leur `created_at`

## Comportement Technique

### Dates des Tickets

- **Poste normal** : Les tickets ont `created_at` = date de création actuelle
- **Poste différé** : Les tickets ont `created_at` = `opened_at` du poste (date du cahier)

### Dates des Lignes de Dépôt

- Les lignes de dépôt n'ont pas de `created_at` propre
- Elles héritent de la date du ticket auquel elles appartiennent
- Dans un poste différé, les lignes ont donc la date du poste (via le ticket)

### Validation Backend

Le système vérifie automatiquement :
- ✅ Que seuls ADMIN/SUPER_ADMIN peuvent créer des postes différés
- ✅ Que la date fournie n'est pas dans le futur
- ✅ Que tous les tickets créés utilisent la date du poste si différé

## Exemples d'Utilisation

### Exemple 1 : Saisir un Cahier de la Semaine Dernière

**Scénario** : Un bénévole a utilisé un cahier papier il y a 7 jours.

1. Ouvrez le module de réception
2. Cliquez sur "Saisie différée"
3. Sélectionnez la date d'il y a 7 jours
4. Ouvrez le poste
5. Saisissez tous les tickets du cahier
6. Fermez le poste

**Résultat** : Tous les tickets créés ont la date d'il y a 7 jours dans leur `created_at`.

### Exemple 2 : Saisir Plusieurs Cahiers d'un Même Mois

**Scénario** : Vous avez plusieurs cahiers du mois dernier à saisir.

1. Pour chaque cahier :
   - Ouvrez un nouveau poste en mode différé
   - Sélectionnez la date du cahier
   - Saisissez les tickets de ce cahier
   - Fermez le poste
2. Répétez pour chaque cahier avec sa date respective

**Résultat** : Chaque cahier est saisi avec sa date réelle, permettant un historique précis.

### Exemple 3 : Saisir un Cahier Très Ancien

**Scénario** : Vous devez saisir un cahier de 6 mois auparavant.

1. Ouvrez le module de réception
2. Cliquez sur "Saisie différée"
3. Sélectionnez une date de 6 mois auparavant (pas de limite)
4. Ouvrez le poste et saisissez les tickets

**Résultat** : Les tickets sont créés avec la date d'il y a 6 mois, même si vous les saisissez aujourd'hui.

## FAQ

### Puis-je modifier la date d'un poste après l'avoir ouvert ?

Non, la date d'un poste est définie lors de son ouverture et ne peut pas être modifiée. Si vous avez besoin d'une autre date, fermez le poste actuel et ouvrez-en un nouveau avec la bonne date.

### Que se passe-t-il si je sélectionne une date future ?

Le système vous empêchera de créer le poste avec un message d'erreur : *"La date ne peut pas être dans le futur"*.

### Puis-je mélanger des tickets normaux et différés dans le même poste ?

Non. Un poste est soit normal (date actuelle) soit différé (date passée). Tous les tickets créés dans un poste différé auront la date du poste.

### Les tickets différés apparaissent-ils différemment dans les rapports ?

Non, les tickets différés apparaissent comme des tickets normaux dans les rapports. La seule différence est leur date de création (`created_at`), qui correspond à la date du cahier et non à la date de saisie.

### Puis-je voir quels tickets ont été créés en mode différé ?

Oui, vous pouvez identifier les tickets différés en vérifiant leur `created_at` :
- Si `created_at` est dans le passé et que le ticket a été créé récemment, il a probablement été créé en mode différé
- Les rapports et l'historique affichent la date `created_at` de chaque ticket

## Bonnes Pratiques

1. **Un cahier = Un poste** : Ouvrez un nouveau poste pour chaque cahier à saisir
2. **Vérifiez la date** : Avant de créer des tickets, vérifiez que l'indicateur "Saisie différée" affiche la bonne date
3. **Fermez après saisie** : Fermez le poste après avoir saisi tous les tickets d'un cahier pour éviter les confusions
4. **Documentation** : Notez la date du cahier avant de commencer la saisie pour éviter les erreurs

## Support

Si vous rencontrez des problèmes avec la saisie différée :
1. Vérifiez que vous avez les permissions ADMIN ou SUPER_ADMIN
2. Vérifiez que la date sélectionnée n'est pas dans le futur
3. Contactez l'équipe technique si le problème persiste

## Références Techniques

- **Story** : B44-P2 - Saisie différée de tickets de réception
- **Endpoint API** : `POST /api/v1/reception/postes/open` avec paramètre `opened_at`
- **Permissions** : Requiert ADMIN ou SUPER_ADMIN pour `opened_at`
- **Validation** : `opened_at <= now()` (pas de futur)














