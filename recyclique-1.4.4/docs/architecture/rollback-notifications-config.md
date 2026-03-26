# Configuration des Notifications de Rollback

**Version :** 1.1  
**Date :** 2026-03-26  
**Objectif :** Guide de configuration des notifications automatiques pour la procédure de rollback

> **Changement produit (2026-03)** : les notifications **Telegram** (API rollback, sync, anomalies) ont été retirées. Le script `scripts/rollback.sh` journalise sur la console et peut envoyer un **email** si `NOTIFICATION_EMAIL` est défini.

---

## 1. Variables d'environnement

### 1.1 Notifications email (optionnel)

```bash
NOTIFICATION_EMAIL=admin@recyclic.com
```

Nécessite une commande `mail` fonctionnelle sur l'hôte qui exécute le script.

---

## 2. Configuration dans `.env`

```bash
# === NOTIFICATIONS ROLLBACK ===
NOTIFICATION_EMAIL=admin@recyclic.com
```

---

## 3. Vérification

- Consulter la sortie console du script (chaque étape est loguée).
- Si `NOTIFICATION_EMAIL` est défini, vérifier la réception après un rollback de test en environnement non production.

---

## 4. Types de Notifications

### 4.1 Notifications de Succès ✅

**Déclenchement :** Rollback réussi  
**Contenu :**
- Version de destination
- Timestamp
- Hostname
- Utilisateur
- Métriques de performance

### 4.2 Notifications d'Échec ❌

**Déclenchement :** Rollback échoué  
**Contenu :**
- Version cible
- Message d'erreur
- Timestamp
- Actions requises

### 4.3 Notifications d'Annulation ⚠️

**Déclenchement :** Rollback annulé par l'utilisateur  
**Contenu :**
- Version cible
- Utilisateur qui a annulé
- Timestamp

### 4.4 Alertes d'Urgence 🚨

**Déclenchement :** Échec critique du rollback  
**Contenu :**
- Message d'urgence
- Erreur détaillée
- Actions immédiates requises
- Lien vers les logs

---

## 5. Métriques Collectées

### 5.1 Métriques Système

```json
{
  "system_metrics": {
    "cpu_usage_percent": "45.2",
    "memory_usage_percent": "67.8",
    "disk_usage_percent": "23.1",
    "docker_containers_running": "6",
    "docker_images_count": "12"
  }
}
```

### 5.2 Métriques de Performance

```json
{
  "performance": {
    "rollback_speed": "fast",
    "efficiency_score": "100"
  }
}
```

---

## 6. Exemple de sortie console

Le script affiche des lignes préfixées (succès / échec / annulation) ; les détails restent dans `logs/rollback-metrics.json` selon la configuration du script.

---

## 7. Dépannage

### 7.1 Notifications email ne fonctionnent pas

**Vérifications :**
1. Serveur mail configuré (`mail` command disponible)
2. Variable `NOTIFICATION_EMAIL` définie
3. Permissions d'envoi d'email

---

## 8. Sécurité

### 8.1 Secrets et `.env`

- **Ne jamais** commiter mots de passe, clés API ou secrets dans le code
- Utiliser des variables d'environnement
- Restreindre l'accès au fichier `.env`

### 8.2 Destinataires

- Limiter `NOTIFICATION_EMAIL` aux adresses autorisées
- Ne pas commiter d'adresses personnelles dans le dépôt

---

## 9. Monitoring et maintenance

### 9.1 Surveillance

- Relire les logs du script après chaque rollback
- Vérifier `logs/rollback-metrics.json` en cas d'incident

### 9.2 Maintenance

- Mettre à jour `NOTIFICATION_EMAIL` si l'équipe change
- Nettoyer les anciens logs de métriques

---

**Dernière mise à jour :** 2026-03-26  
**Responsable :** Équipe DevOps Recyclic
