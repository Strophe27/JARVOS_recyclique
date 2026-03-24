# Guide Administrateur - Tableau de Bord Recyclic

## Introduction

Ce guide détaille l'utilisation du tableau de bord d'administration Recyclic. L'interface admin permet de gérer les utilisateurs, configurer les sites, consulter les rapports et surveiller l'activité du système.

## Prérequis et Accès

### Rôles Requis
- ✅ **Super Admin** : Accès complet à toutes les fonctionnalités
- ✅ **Admin** : Accès aux fonctionnalités principales (gestion utilisateurs, rapports)
- ❌ **Manager** : Accès en lecture seule aux rapports

### URL d'Accès
- **Production :** `https://admin.recyclic.org`
- **Développement :** `http://localhost:4444/admin`

### Connexion
1. Rendez-vous sur l'URL d'administration
2. Saisissez vos identifiants Recyclic
3. Votre rôle détermine automatiquement les fonctionnalités disponibles

## Interface d'Administration

### Navigation Principale

```
┌─────────────────────────────────────────┐
│ 🏠 Accueil | 👥 Utilisateurs | 📊 Sites │ ← Menu principal
│ 🏢 Gestion | 📈 Rapports | ⚙️ Config    │
└─────────────────────────────────────────┘
```

### Tableau de Bord Principal

L'accueil affiche les métriques clés :
- 📦 **Dépôts du jour** : Nombre et valeur estimée
- 💰 **Ventes du jour** : Chiffre d'affaires et nombre de transactions
- 👥 **Utilisateurs actifs** : Connectés aujourd'hui
- 🚨 **Alertes actives** : Seuils dépassés ou problèmes détectés

### Mode Live KPI (B38-P3)

Le tableau de bord réception dispose d'un **mode Live** pour suivre l'activité en temps réel :

#### Activation du Mode Live

```
🔄 Mode Live KPI
├── 🔴 Désactivé → 🟢 Activé
├── 📊 Badge "Live" + timestamp
└── 🔄 Mise à jour automatique toutes les 10s
```

**Contrôles disponibles :**
- **Switch "Mode Live"** : Active/désactive le rafraîchissement automatique
- **Badge "Live"** : Indique que les données sont en temps réel
- **Timestamp** : "Mis à jour à HH:mm:ss" - dernière synchronisation

#### Fonctionnement

**Quand activé :**
- 🔄 **Polling automatique** : Mise à jour toutes les 10 secondes minimum
- 📊 **Données temps réel** : Statistiques frais depuis l'API `/reception/stats/live`
- 🟢 **Badge Live** : Confirmation visuelle du mode actif
- ⏰ **Timestamp** : Heure exacte de la dernière mise à jour

**Quand désactivé :**
- 📊 **Données statiques** : Dernières valeurs connues conservées
- ❌ **Pas de polling** : Économie de bande passante
- 🔄 **Reprise possible** : Les données live sont conservées

#### Gestion des Erreurs

**En cas de problème réseau :**
- ⚠️ **Bannière d'avertissement** : "Connexion perdue, polling suspendu"
- 🔄 **Reprise automatique** : Quand la connexion revient
- 📊 **Données préservées** : Derniers chiffres valides conservés

**En cas d'erreur API :**
- 🚨 **Message d'erreur** : "Erreur serveur, stats live indisponibles"
- 🔄 **Fallback** : Retour aux statistiques classiques
- 📝 **Logging** : Erreur tracée dans Sentry/Datadog

#### Configuration Technique

**Variables d'environnement :**
```bash
VITE_FEATURE_LIVE_RECEPTION_STATS=true  # Active la fonctionnalité
```

**Paramètres par défaut :**
- **Interval** : 10 secondes minimum
- **Timeout** : 5 secondes par requête
- **Retry** : 3 tentatives en cas d'échec

#### Recommandations d'Usage

**Cas d'usage idéal :**
- ✅ **Supervision temps réel** : Pendant les heures d'ouverture
- ✅ **Monitoring d'événement** : Ventes spéciales, pics d'activité
- ✅ **Dépannage** : Identification rapide de problèmes

**Quand désactiver :**
- ❌ **Connexion faible** : Évite la surcharge réseau
- ❌ **Écran inactif** : Économie de ressources
- ❌ **Debugging** : Simplifie l'analyse des logs

**Performance :**
- 📊 **Impact minimal** : ~1KB par requête toutes les 10s
- 🔋 **Batterie** : Compatible avec les appareils mobiles
- 📱 **Offline-ready** : Suspension automatique hors ligne

## Gestion des Utilisateurs

### Vue d'Ensemble
```
👥 Gestion des Utilisateurs
├─ 🔍 Recherche et filtres
├─ 👤 Liste des utilisateurs (25)
├─ ➕ Nouveau utilisateur
└─ 📊 Statistiques d'usage
```

### Création d'un Utilisateur

1. **Cliquez sur "➕ Nouveau utilisateur"**
2. Remplissez le formulaire :
   - **Nom complet** : Prénom et nom
   - **Email** : Adresse email (devient l'identifiant)
   - **Rôle** : Sélectionnez parmi la liste
   - **Site principal** : Site d'affectation (optionnel)

3. **Configuration avancée** (onglet "Avancé") :
   - Activer/désactiver le compte
   - Définir des permissions spéciales
   - Associer à des groupes

### Modification d'un Utilisateur

**Actions disponibles par utilisateur :**
- ✏️ **Modifier** : Changer les informations de base
- 🔑 **Réinitialiser mot de passe** : Génère un nouveau mot de passe temporaire
- 🚫 **Désactiver** : Suspend l'accès (sans supprimer)
- 🗑️ **Supprimer** : Suppression définitive (avec confirmation)

**Audit et Historique :**
- 📋 Voir l'historique complet des actions
- 🔍 Consulter les sessions actives
- 📊 Statistiques d'utilisation personnelle

## Configuration Multi-Sites

### Gestion des Sites

```
🏢 Configuration des Sites
├─ 📍 Liste des sites (3 actifs)
├─ ➕ Nouveau site
├─ ⚙️ Paramètres généraux
└─ 🔄 Synchronisation
```

### Création d'un Site

1. **Informations de base :**
   - **Nom du site** : Nom commercial (ex: "Recyclic Centre-Ville")
   - **Adresse** : Adresse complète
   - **Téléphone** : Numéro de contact
   - **Responsable** : Administrateur local

2. **Paramètres opérationnels :**
   - **Horaires d'ouverture** : Lundi-Dimanche
   - **Types d'objets acceptés** : Catégories EEE autorisées
   - **Capacité de stockage** : Limites de volume
   - **Équipement disponible** : Imprimante, terminal de paiement, etc.

3. **Configuration technique :**
   - **URL d'accès** : Pour l'interface de caisse locale
   - **Périphériques connectés** : Imprimantes, tiroirs-caisse
   - **Réseau local** : Configuration WiFi/internet

### Paramètres par Site

**Seuils d'Alerte :**
- 🟢 **Vert** : Niveaux normaux (80% de capacité)
- 🟡 **Jaune** : Attention requise (90% de capacité)
- 🔴 **Rouge** : Action urgente (95% de capacité)

**Notifications :**
- 📧 Email aux administrateurs
- 📱 Notification push sur l'app mobile
- 💬 Message sur le canal de communication interne

## Gestion des Tickets de Caisse (B40-P4)

### Visualisation des Détails de Ticket

Dans le **Gestionnaire de Sessions** (`/admin/session-manager`), chaque session de caisse affiche la liste des ventes associées.

**Pour consulter un ticket :**
1. Cliquez sur une ligne de session pour accéder aux détails
2. Dans la section "Journal des Ventes", cliquez sur **"Voir le ticket"**
3. Une modal s'ouvre avec tous les détails de la vente

**Informations affichées :**
- ⏰ Heure de vente
- 👤 Opérateur qui a effectué la vente
- 💳 Méthode de paiement
- 🎁 Don associé (si applicable)
- 💰 Total de la vente
- 📝 **Note de caisse** (si saisie par le caissier)
- 📦 Liste détaillée des articles vendus

### Édition des Notes de Ticket

**Fonctionnalité :** Les administrateurs peuvent modifier les notes associées aux tickets de caisse pour ajouter des précisions ou corriger les saisies.

#### Qui peut éditer ?
- ✅ **Super Administrateur** : Accès complet
- ✅ **Administrateur** : Peut modifier toutes les notes
- ❌ **Utilisateur standard** : Aucun accès à l'édition

#### Comment éditer une note ?
1. Ouvrez le détail d'un ticket (voir ci-dessus)
2. Si vous avez les droits, un bouton **"Modifier la note"** apparaît
3. Cliquez sur le bouton pour entrer en mode édition
4. Saisissez ou modifiez la note dans le champ texte
5. Cliquez sur **"Sauvegarder"** pour valider
6. Ou **"Annuler"** pour revenir sans sauvegarder

#### Règles métier :
- 📝 **Notes optionnelles** : Les tickets peuvent ne pas avoir de note
- 🔒 **Traçabilité** : Les modifications sont automatiquement journalisées
- ⏰ **Historique** : Console admin affiche timestamp et utilisateur des modifications
- 🚫 **Sécurité** : Contrôle RBAC strict (Admin/SuperAdmin uniquement)

#### Gestion des erreurs :
- **Connexion perdue** : Modifications sauvegardées localement et synchronisées à la reconnexion
- **Conflit de modification** : Système de résolution automatique des conflits
- **Droits insuffisants** : Message d'erreur clair et bouton masqué

---

## Consultation des Rapports

### Types de Rapports Disponibles

#### 📊 Rapports de Vente
- **Période** : Journalier, hebdomadaire, mensuel, annuel
- **Granularité** : Par site, par catégorie, par caissier
- **Métriques** : Quantités, valeurs, marges, tendances

#### 📦 Rapports de Dépôt
- **Analyse des flux** : Origine des objets, catégories
- **Taux de validation** : IA vs correction manuelle
- **Temps de traitement** : Délais de classification

#### 👥 Rapports d'Activité Utilisateur
- **Connexions** : Fréquence et durée des sessions
- **Productivité** : Nombre d'actions par utilisateur
- **Formations** : Besoins identifiés

### Génération et Export

1. **Sélectionnez le type de rapport**
2. **Définissez les filtres :**
   - Période (dates début/fin)
   - Sites spécifiques
   - Utilisateurs ou équipes
   - Catégories d'objets

3. **Formats d'export :**
   - 📄 **PDF** : Pour consultation et archivage
   - 📊 **CSV** : Pour analyse dans Excel/Google Sheets
   - 📈 **JSON** : Pour intégration API

4. **Automatisation :**
   - 📧 Export automatique par email
   - 📅 Programmation hebdomadaire/mensuelle
   - 🎯 Filtres prédéfinis

## Exports et Intégrations

### Export CSV Manuel

**Procédure :**
1. Allez dans **Rapports > Exports**
2. Sélectionnez le type de données
3. Choisissez la période
4. Cliquez sur **"Générer CSV"**
5. Téléchargez le fichier

**Contenu typique d'un export :**
```csv
Date,Site,Type,Valeur,Quantité,Caissier
2025-01-25, Centre-Ville,Vente,15.00,1,marie.dubois@recyclic.org
2025-01-25, Centre-Ville,Vente,8.50,2,marie.dubois@recyclic.org
```

### Export Automatique par Email

**Configuration :**
1. **Destinataires** : Liste des emails à inclure
2. **Fréquence** : Quotidienne (6h), Hebdomadaire (Lundi 7h)
3. **Contenu** : Rapport détaillé + résumé exécutif
4. **Format** : PDF pour lisibilité

### Intégration Comptable

**Exports compatibles :**
- ✅ Logiciels de comptabilité standards
- ✅ Plateformes de gestion d'entreprise
- ✅ Outils de business intelligence

## Surveillance et Alertes

### Tableau de Bord des Alertes

**Alertes en Temps Réel :**
- 🚨 **Capacité de stockage** : Sites proches de la saturation
- 📦 **Accumulation d'objets** : Catégories avec rotation lente
- 💰 **Écart de caisse** : Sessions avec différences inexpliquées
- 👤 **Utilisateurs inactifs** : Comptes non utilisés depuis 30+ jours

### Configuration des Seuils

**Pour chaque type d'alerte :**
1. Définir le seuil d'avertissement (ex: 80% de capacité)
2. Définir le seuil critique (ex: 95% de capacité)
3. Choisir les destinataires des notifications
4. Définir la fréquence des rappels

### Actions sur les Alertes

**Pour chaque alerte :**
- 📋 **Accuser réception** : Confirmer avoir vu l'alerte
- 🔧 **Traiter** : Ouvrir l'interface de résolution
- ⏰ **Reporter** : Décaler la gestion (avec justification)
- 📝 **Commenter** : Ajouter des notes pour l'équipe

## Sécurité et Audit

### Gestion des Sessions

**Surveillance des Connexions :**
- 👀 Sessions actuellement actives
- 📊 Historique des connexions par utilisateur
- 🚫 Déconnexion forcée si nécessaire
- ⏱️ Durée maximale des sessions (paramétrable)

### Journal d'Audit

**Traçabilité complète :**
- 🔍 Toutes les actions administratives
- 👤 Qui a fait quoi et quand
- 📝 Modifications de configuration
- ⚡ Actions sur les utilisateurs (création, modification, suppression)

### Conformité RGPD

**Protection des Données :**
- 🔒 Chiffrement des données sensibles
- 📅 Conservation limitée des logs
- 🗑️ Suppression automatique des données obsolètes
- 📋 Respect du droit d'accès et de rectification

## Maintenance et Support

### Nettoyage Automatique

**Tâches planifiées :**
- 🧹 Purge des logs anciens (> 90 jours)
- 📦 Archivage des rapports (> 1 an)
- 👤 Désactivation des comptes inactifs (> 90 jours)
- 💾 Optimisation de la base de données (hebdomadaire)

### Sauvegarde et Restauration

**Procédures de sauvegarde :**
- 💾 Sauvegarde quotidienne automatique
- 📍 Stockage multi-sites (redondance)
- 🔄 Test de restauration mensuel
- 📞 Plan de continuité d'activité

### Support Technique

**En cas de problème :**
- 🚨 **Urgence** : Contactez immédiatement l'équipe technique
- 📧 **Email** : admin-support@recyclic.org
- 📱 **Téléphone** : Numéro d'assistance 24/7
- 📚 **Documentation** : Consultez les guides de dépannage

## Raccourcis et Astuces

### Raccourcis Clavier
- **Ctrl + R** : Actualiser les données
- **Ctrl + F** : Rechercher dans la page
- **Ctrl + E** : Exporter les données courantes
- **Échap** : Fermer les modales

### Filtres Rapides
- **"urgent"** : Voir seulement les alertes critiques
- **"inactive"** : Lister les utilisateurs inactifs
- **"full"** : Sites proches de la saturation

### Widgets Personnalisables
- 📊 Réorganisez les widgets selon vos besoins
- 🎨 Ajustez les périodes d'affichage
- 💾 Sauvegardez vos configurations favorites

## Monitoring et Observabilité

### Événements Mode Live KPI

Le système de statistiques live génère des événements de monitoring trackés dans Sentry et Datadog :

#### Événements Sentry

**Erreurs applicatives :**
- `live_stats_api_error` : Échec d'appel à `/reception/stats/live`
  - Context : URL, status code, response time
  - Severity : Warning (4xx) / Error (5xx)
- `live_stats_network_error` : Erreur réseau (timeout, connexion)
  - Context : Error type, duration
  - Severity : Warning
- `live_stats_parsing_error` : Données API malformées
  - Context : Response preview, expected schema
  - Severity : Error

**Erreurs utilisateur :**
- `live_stats_user_disabled` : Utilisateur désactive manuellement
  - Context : Session duration, reason (if provided)
  - Severity : Info
- `live_stats_offline_detected` : Perte de connectivité détectée
  - Context : navigator.onLine status, last successful call
  - Severity : Info

#### Métriques Datadog

**Performance :**
- `recyclic.live_stats.response_time` : Latence des appels API
  - Tags : `endpoint:/reception/stats/live`, `status:success|error`
- `recyclic.live_stats.request_count` : Nombre d'appels par minute
  - Tags : `status:success|error|timeout`
- `recyclic.live_stats.data_freshness` : Âge des données affichées (secondes)
  - Tags : `mode:live|cached`, `user_enabled:true|false`

**Fiabilité :**
- `recyclic.live_stats.error_rate` : Taux d'erreur des appels (%)
  - Alert : >5% sur 5 minutes = Warning, >15% = Critical
- `recyclic.live_stats.offline_duration` : Durée des périodes offline (secondes)
  - Alert : >300s consécutifs = Warning
- `recyclic.live_stats.user_adoption` : % d'utilisateurs avec mode live activé
  - Target : >70% des sessions admin

#### Dashboards Recommandés

**Dashboard "Live Stats Health" :**
```
┌─────────────────────────────────────────┐
│ 🟢 Live Stats - Health Overview         │
├─────────────────────────────────────────┤
│ Response Time: 250ms (avg)             │
│ Error Rate: 0.1%                       │
│ Active Users: 85%                      │
│ Offline Incidents: 0 (last 24h)        │
└─────────────────────────────────────────┘
```

**Dashboard "Live Stats Performance" :**
```
┌─────────────────────────────────────────┐
│ 📊 Live Stats - Performance            │
├─────────────────────────────────────────┤
│ API Calls/min: 42                      │
│ Cache Hit Rate: 95%                    │
│ Data Freshness: <5s                     │
│ Bandwidth Usage: 2.1KB/min             │
└─────────────────────────────────────────┘
```

### Alertes et Notifications

**Alertes critiques :**
- 🔴 **API Down** : >95% error rate pendant 5 minutes
- 🔴 **High Latency** : >2s average response time pendant 10 minutes
- 🟡 **Offline Users** : >50% des sessions admin offline simultanément

**Alertes de performance :**
- 🟡 **High Error Rate** : >10% error rate pendant 15 minutes
- 🟡 **Stale Data** : Données >60s pendant 20 minutes
- 🟢 **Low Adoption** : <50% des utilisateurs actifs utilisent le mode live

### Debugging et Support

**Outils de diagnostic :**
- **Console logs** : `live_stats:*` pour tracing détaillé
- **Network tab** : Vérifier les appels `/reception/stats/live`
- **Local storage** : `liveStatsEnabled` pour préférence utilisateur

**Procédures de troubleshooting :**
1. Vérifier la connectivité réseau
2. Confirmer que l'API backend répond
3. Vérifier les feature flags côté frontend
4. Consulter les logs Sentry pour erreurs détaillées

---

**Version :** 1.0 - Janvier 2025
**Support :** admin-support@recyclic.org

*Ce guide sera mis à jour régulièrement. Dernière modification : Janvier 2025*
