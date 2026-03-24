# Guide Utilisateur - Bannière de Session

**Date:** 2025-11-26  
**Version:** 1.0  
**Story:** B42-P4 - UX, Alertes & Observabilité des sessions

---

## 📋 Vue d'ensemble

La bannière de session vous informe en temps réel de l'état de votre session de connexion. Elle apparaît automatiquement en haut de l'écran lorsque votre session approche de son expiration ou en cas de problème de connexion.

---

## 🎯 Quand la bannière apparaît-elle ?

La bannière s'affiche dans les situations suivantes :

### 1. **Session en bonne santé** (Bannière verte)
- Votre session est active et fonctionne normalement
- Aucune action requise

### 2. **Session expirant bientôt** (Bannière jaune/orange)
- Votre session expire dans moins de 5 minutes
- Un compte à rebours indique le temps restant
- **Action recommandée :** Cliquez sur "Actualiser" pour renouveler votre session

### 3. **Problème de connexion** (Bannière rouge)
- La connexion au serveur est perdue
- Les tentatives de rafraîchissement automatique échouent
- **Action requise :** Cliquez sur "Se reconnecter" pour vous reconnecter

### 4. **Actualisation en cours** (Bannière bleue)
- Le système est en train de renouveler votre session automatiquement
- Aucune action requise, attendez quelques secondes

---

## 🔧 Actions disponibles

### Bouton "Actualiser" (🔄)
- **Quand l'utiliser :** Lorsque la bannière indique que votre session expire bientôt
- **Effet :** Renouvelle immédiatement votre session
- **Temps :** Quelques secondes

### Bouton "Sauvegarder" (💾)
- **Quand l'utiliser :** Avant de perdre votre connexion, pour sauvegarder votre travail en cours
- **Effet :** Sauvegarde vos données localement (si l'application le supporte)
- **Important :** Utilisez cette option si vous travaillez sur un formulaire ou des données importantes

### Bouton "Se reconnecter" (🔌)
- **Quand l'utiliser :** Lorsque la connexion est perdue ou que les tentatives automatiques échouent
- **Effet :** Vous redirige vers la page de connexion
- **Note :** Vous devrez vous reconnecter avec vos identifiants

---

## ⏱️ Compte à rebours

La bannière affiche un compte à rebours indiquant le temps restant avant expiration :

- **Format :** "Votre session expire dans X min Y s"
- **Mise à jour :** Toutes les secondes
- **Action automatique :** Le système tente de renouveler votre session automatiquement avant expiration

---

## 💡 Bonnes pratiques

### ✅ À faire
- **Ne pas fermer l'onglet** pendant une session active
- **Cliquer sur "Actualiser"** si la bannière devient jaune/orange
- **Sauvegarder votre travail** régulièrement, surtout avant une pause
- **Vérifier votre connexion internet** si la bannière devient rouge

### ❌ À éviter
- **Ignorer la bannière** lorsqu'elle devient rouge
- **Fermer l'onglet** sans sauvegarder en cas de problème
- **Attendre la dernière seconde** avant d'actualiser

---

## 🆘 Problèmes courants

### La bannière reste rouge
**Cause possible :** Problème de connexion internet ou serveur indisponible

**Solution :**
1. Vérifiez votre connexion internet
2. Cliquez sur "Se reconnecter"
3. Si le problème persiste, contactez le support

### Le compte à rebours ne se met pas à jour
**Cause possible :** Problème de synchronisation

**Solution :**
1. Actualisez la page (F5)
2. Si le problème persiste, reconnectez-vous

### La session expire trop rapidement
**Cause possible :** Inactivité prolongée

**Solution :**
- Le système renouvelle automatiquement votre session si vous êtes actif
- Si vous êtes inactif plus de 30 minutes, vous devrez vous reconnecter

---

## 📱 Support multi-appareils

La bannière fonctionne sur tous les appareils :
- **Ordinateur de bureau** : Bannière en haut de l'écran
- **Tablette** : Bannière adaptée à l'écran tactile
- **Mobile** : Bannière compacte avec icônes

---

## 🔐 Sécurité

- **Sessions sécurisées :** Votre session est automatiquement renouvelée pour maintenir la sécurité
- **Déconnexion automatique :** Après 30 minutes d'inactivité, vous serez déconnecté automatiquement
- **Protection des données :** Vos données sont protégées même en cas de perte de connexion

---

## ❓ Questions fréquentes

### Pourquoi ma session expire-t-elle ?
Pour des raisons de sécurité, les sessions expirent après une période d'inactivité ou après un certain temps.

### Puis-je désactiver la bannière ?
Non, la bannière est essentielle pour votre sécurité et l'intégrité de votre session.

### Que se passe-t-il si je perds ma connexion ?
Vos données non sauvegardées peuvent être perdues. Utilisez le bouton "Sauvegarder" régulièrement.

### La bannière apparaît trop souvent
Si la bannière apparaît fréquemment, cela peut indiquer un problème de connexion réseau. Contactez le support.

---

## 📞 Support

Pour toute question ou problème :
- **Email :** support@recyclic.fr
- **Documentation technique :** Voir le runbook admin pour plus de détails

---

**Dernière mise à jour :** 2025-11-26  
**Version du document :** 1.0
















