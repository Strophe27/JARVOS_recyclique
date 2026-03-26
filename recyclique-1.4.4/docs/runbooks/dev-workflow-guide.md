## 🔍 **Pourquoi les routes n'étaient pas dans le conteneur ?**

### Le problème principal : **Cache Docker**

Quand vous faites `docker-compose build api`, Docker utilise un système de cache en couches. Voici ce qui s'est passé :

1. **Première construction** : L'image a été créée avec l'ancien code (sans les routes de monitoring)
2. **Modifications du code** : Vous avez ajouté les routes dans `admin.py` 
3. **Reconstruction** : Docker a vu que le fichier `admin.py` avait changé, mais...
4. **Cache Docker** : Docker a utilisé des couches en cache et n'a pas pris en compte toutes les modifications

### Pourquoi le cache a échoué ?

```bash
# Docker Compose utilise le cache par défaut
docker-compose build api  # Utilise le cache

# Pour forcer la reconstruction complète :
docker-compose build --no-cache api  # Reconstruit tout
```

##  **L'approche du montage de volume**

### Qu'est-ce que c'est ?

```bash
# Au lieu de copier le code dans l'image :
docker run -v "$(pwd)/api/src:/app/src" ...

# Le code local est "monté" directement dans le conteneur
# Les modifications sont immédiatement visibles
```

### Avantages :
- ✅ **Développement rapide** : Pas besoin de reconstruire l'image
- ✅ **Modifications instantanées** : Le code change en temps réel
- ✅ **Debugging facile** : Vous pouvez modifier le code et voir le résultat immédiatement

### Inconvénients :
- ❌ **Performance** : Plus lent en production
- ❌ **Sécurité** : Le code local est exposé
- ❌ **Dépendances** : Nécessite que le code soit sur la machine hôte

##  **Déploiement sur VPS - Y aura-t-il ce problème ?**

### **NON, pas le même problème !** Voici pourquoi :

#### En développement (local) :
```bash
# Vous modifiez le code
# Vous reconstruisez l'image
# Le cache peut poser problème
```

#### En production (VPS) :
```bash
# Vous poussez le code sur Git
# Le VPS télécharge le code frais
# L'image est reconstruite avec le code à jour
# Pas de cache local problématique
```

### **Bonnes pratiques pour le déploiement :**

1. **Toujours reconstruire sans cache** :
```bash
docker-compose build --no-cache
```

2. **Utiliser des tags de version** :
```bash
docker build -t recyclic-api:v1.2.3 .
```

3. **Pipeline CI/CD** :
```yaml
# .github/workflows/deploy.yml
- name: Build and push
  run: |
    docker build --no-cache -t recyclic-api:${{ github.sha }} .
    docker push recyclic-api:${{ github.sha }}
```

## 🛠️ **Comment éviter ce problème à l'avenir ?**

### 1. **Utiliser le cache Docker intelligemment**
```bash
# Pour les modifications de code (rapide)
docker-compose build api

# Pour les changements de dépendances (complet)
docker-compose build --no-cache api
```

### 2. **Vérifier que les modifications sont dans l'image**
```bash
# Vérifier le contenu du conteneur
docker-compose exec api ls -la /app/src/recyclic_api/api/api_v1/endpoints/
```

### 3. **Utiliser des .dockerignore appropriés**
```dockerignore
# .dockerignore
node_modules/
.git/
*.log
```

### 4. **Stratégie de développement recommandée**

#### Pour le développement local :
```bash
# Utiliser le montage de volume (comme on a fait)
docker run -v "$(pwd)/api/src:/app/src" ...
```

#### Pour tester avant déploiement :
```bash
# Reconstruire sans cache
docker-compose build --no-cache
# Tester
docker-compose up
```

## 🔧 **Le problème du BOM - D'où vient-il ?**

### **Causes courantes :**
1. **Éditeurs Windows** : Notepad, certains éditeurs ajoutent un BOM
2. **Copier-coller** : Depuis des documents Word ou autres
3. **Encodage UTF-8 avec BOM** : Certains éditeurs sauvegardent avec BOM par défaut

### **Comment l'éviter :**
1. **Utiliser VS Code** avec `"files.autoGuessEncoding": true`
2. **Toujours sauvegarder en UTF-8 sans BOM**
3. **Vérifier les fichiers** :
```bash
# Détecter le BOM
file .env
hexdump -C .env | head -1
```

## 📋 **Résumé des bonnes pratiques**

### **Développement :**
- Utiliser le cache Docker (`docker-compose build api`) pour les modifications de code
- Utiliser `--no-cache` seulement pour les changements de dépendances
- Tester avec montage de volume pour le développement rapide
- Vérifier que les modifications sont dans le conteneur

### **Production :**
- Toujours reconstruire sans cache
- Utiliser des tags de version
- Automatiser avec CI/CD
- Tester l'image finale avant déploiement

### **Éviter le BOM :**
- Utiliser des éditeurs qui respectent UTF-8 sans BOM
- Vérifier les fichiers de configuration
- Nettoyer les fichiers si nécessaire

**En résumé :** Le problème était un mélange de cache Docker et de BOM. En production, vous n'aurez pas ce problème car le code sera frais et l'image sera reconstruite proprement ! 🚀

---

## 🛡️ **Système de Sauvegarde et Récupération**

### Vue d'ensemble

Le système de sauvegarde automatique garantit la disponibilité et l'intégrité des données PostgreSQL. Cette section couvre les procédures essentielles pour les développeurs.

### Sauvegarde Automatique

#### Configuration
- **Fréquence** : Quotidienne à 02h00
- **Rétention** : 7 jours quotidiens, 4 semaines hebdomadaires, 12 mois mensuels
- **Compression** : Activée par défaut
- **Chiffrement** : Optionnel (configurable via `BACKUP_ENCRYPTION_KEY`)

#### Scripts Disponibles
```bash
# Sauvegarde manuelle PostgreSQL
./scripts/backup-postgres.sh

# Configuration cron job (Linux)
./scripts/setup-postgres-backup-cron.sh

# Services Docker dédiés
docker-compose -f docker-compose.backup.yml up -d postgres-backup
```

#### Variables d'Environnement
```bash
# Configuration obligatoire
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=localhost
POSTGRES_DB=recyclic

# Configuration optionnelle
BACKUP_COMPRESSION=true
BACKUP_ENCRYPTION=false
BACKUP_RETENTION_DAYS=7
NOTIFICATION_EMAIL=admin@example.com
NOTIFICATION_TELEGRAM_TOKEN=your_token
NOTIFICATION_TELEGRAM_CHAT_ID=your_chat_id
```

### Monitoring et Alertes

#### Métriques Collectées
- Âge de la dernière sauvegarde
- Taille totale des sauvegardes
- Espace disque disponible
- État de santé du système

#### Seuils d'Alerte
- **Critique** : Sauvegarde > 25h, Disque < 1GB
- **Warning** : Sauvegarde > 6h, Disque < 5GB

#### Commandes de Monitoring
```bash
# Collecte des métriques
./scripts/backup-monitoring.sh

# Vérification des sauvegardes
./scripts/verify-backup.sh

# Test du système d'alertes
./scripts/backup-alerting.sh test
```

### Procédures de Récupération

#### Scénarios Courants

##### 1. Récupération Simple (Test/Développement)
```bash
# Arrêter les services
docker-compose stop api frontend

# Restaurer la base
docker-compose exec -T postgres psql -U recyclic -d recyclic < /path/to/backup.sql

# Redémarrer les services
docker-compose start api frontend
```

##### 2. Récupération d'Urgence (Production)
```bash
# Arrêter tout
docker-compose down

# Supprimer le volume corrompu
docker volume rm recyclic_postgres_data

# Recréer et restaurer
docker-compose up -d postgres
docker-compose exec postgres psql -U recyclic -c "CREATE DATABASE recyclic;"
docker-compose exec -T postgres psql -U recyclic -d recyclic < /path/to/backup.sql
docker-compose up -d
```

#### Tests de Récupération
```bash
# Tests automatisés complets
./scripts/test-recovery.sh

# Validation RTO/RPO (< 4h restauration, < 1h données perdues)
```

### Documentation Complète

📖 **Guide de Récupération Détaillé** : [`docs/runbooks/database-recovery.md`](../runbooks/database-recovery.md)
- Procédures complètes pour tous les scénarios
- Tests automatisés et validation
- Métriques RTO/RPO

📖 **Architecture Infrastructure** : [`docs/architecture/9-infrastructure-et-dploiement.md`](../architecture/9-infrastructure-et-dploiement.md)
- Configuration détaillée des services de sauvegarde
- Intégration avec l'orchestration Docker

### Bonnes Pratiques

#### Développement
- Tester les sauvegardes après les migrations importantes
- Vérifier l'intégrité avant les déploiements
- Maintenir des sauvegardes manuelles avant les changements risqués

#### Production
- Monitorer quotidiennement les métriques de sauvegarde
- Tester mensuellement les procédures de récupération
- Conserver des sauvegardes hors site pour la sécurité

#### Alertes et Monitoring
- Configurer les notifications pour tous les environnements critiques
- Répondre aux alertes dans les 30 minutes
- Documenter tout incident de sauvegarde

### Contacts d'Urgence

- **Technique** : Équipe Dev (James, Bob)
- **Intervention** : Suivre le guide de récupération
- **Escalade** : Direction technique si RTO dépassé

---

---

## 🚀 **Live Reception Stats Feature (Story B38-P2)**

### Feature Flag Configuration

Le système de statistiques de réception en temps réel peut être activé/désactivé via la variable d'environnement :

```bash
# Activer les stats temps réel (par défaut)
LIVE_RECEPTION_STATS_ENABLED=true

# Désactiver pour revenir à l'ancienne logique
LIVE_RECEPTION_STATS_ENABLED=false
```

### Endpoint API

**Route :** `GET /api/v1/reception/stats/live`

**Permissions :** Admin ou Super Admin uniquement

**Réponse :**
```json
{
  "tickets_open": 5,
  "tickets_closed_24h": 23,
  "turnover_eur": 1247.50,
  "donations_eur": 45.80,
  "weight_in": 1250.75,
  "weight_out": 890.25
}
```

### Métriques Prometheus

Le service expose automatiquement les métriques suivantes :

- `reception_live_stats_requests_total` : Nombre total de requêtes
- `reception_live_stats_duration_seconds` : Temps de calcul des statistiques
- `reception_live_stats_errors_total` : Nombre d'erreurs lors du calcul

### Utilisation en Développement

```bash
# Tester l'endpoint avec un admin
curl -H "Authorization: Bearer <admin_token>" \
     http://localhost:8000/api/v1/reception/stats/live

# Avec feature flag désactivé, retourne des zéros
LIVE_RECEPTION_STATS_ENABLED=false curl -H "Authorization: Bearer <admin_token>" \
     http://localhost:8000/api/v1/reception/stats/live
```

### Performance

- **Latence cible :** < 500ms sur dataset de 5,000 tickets
- **Fréquence d'appel :** Adaptée aux besoins du dashboard (toutes les 30s-1min)
- **Cache :** Non implémenté (calcul en temps réel pour fraîcheur maximale)

### Debug et Monitoring

```bash
# Vérifier les métriques Prometheus
curl http://localhost:8000/metrics | grep reception_live_stats

# Logs structurés dans les conteneurs
docker-compose logs -f api | grep "live.*stats"
```

*Dernière mise à jour : 2025-11-26 | Version : 1.1*

---

## 🔐 **Système d'Authentification et Session Glissante (Story B42-P3)**

### Vue d'Ensemble

Le système d'authentification utilise un mécanisme de **session glissante** avec refresh token automatique pour maintenir les utilisateurs actifs connectés sans intervention manuelle.

### Architecture

#### Composants Principaux

- **`useSessionHeartbeat`** : Hook React qui orchestre le refresh automatique et les pings d'activité
- **`SessionStatusBanner`** : Composant UI affichant l'état de la session (expiration, offline, etc.)
- **`authStore`** : Store Zustand gérant l'état d'authentification et les métadonnées de session
- **`axiosClient`** : Client HTTP avec intercepteurs pour refresh automatique sur 401

#### Flux d'Authentification

1. **Login** : L'utilisateur se connecte, reçoit un access token (JWT) et un refresh token (HTTP-only cookie)
2. **Refresh Proactif** : Le hook `useSessionHeartbeat` détecte l'expiration proche (2 min avant) et déclenche un refresh automatique
3. **Refresh Réactif** : Si une requête API retourne 401, `axiosClient` tente automatiquement un refresh avant de rediriger vers login
4. **Pings d'Activité** : Toutes les 5 minutes, un ping est envoyé pour maintenir l'activité utilisateur

### Configuration

#### Paramètres de Session

- **Durée access token** : 240 minutes (4h) - Configurable via `token_expiration_minutes` dans les settings
- **Durée refresh token** : 24h maximum - Configurable via `refresh_token_max_hours`
- **Seuil d'inactivité** : 15 minutes - Si inactif plus longtemps, le refresh est refusé
- **Buffer de refresh** : 2 minutes avant expiration pour déclencher le refresh proactif

#### Stockage des Tokens

- **Access token** : localStorage + mémoire (Zustand store) pour performance
- **Refresh token** : HTTP-only cookie avec `SameSite=Strict` (géré par le backend)
- **CSRF token** : Cookie + header `X-CSRF-Token` pour protection CSRF

### Utilisation en Développement

#### Tester le Refresh Automatique

```typescript
// Dans un composant React
import { useSessionHeartbeat } from '../hooks/useSessionHeartbeat';

function MyComponent() {
  const { 
    timeUntilExpiration, 
    isExpiringSoon, 
    isRefreshing,
    refreshToken 
  } = useSessionHeartbeat();

  // Le hook gère automatiquement le refresh
  // Vous pouvez utiliser les valeurs pour afficher l'état
}
```

#### Tester le Bandeau de Session

Le `SessionStatusBanner` s'affiche automatiquement quand :
- Le token expire bientôt (< 2 min)
- La connexion est perdue (offline)
- Un refresh est en cours

Pour forcer l'affichage en développement :
```typescript
// Simuler expiration proche
const token = useAuthStore.getState().token;
// Modifier le token pour qu'il expire dans 1 minute
```

#### Debug des Problèmes de Session

```bash
# Vérifier les cookies de session
# Dans la console du navigateur (DevTools > Application > Cookies)
# Chercher : refresh_token, csrf_token

# Vérifier l'état du store
# Dans la console du navigateur
window.useAuthStore.getState()

# Logs de refresh dans la console
# Les refresh automatiques sont loggés avec console.debug
```

### FAQ : Pourquoi je vois le bandeau de session ?

#### Le bandeau apparaît quand :

1. **"Session expirant bientôt"** (orange)
   - Le token expire dans moins de 2 minutes
   - **Action** : Le refresh automatique est en cours, attendez quelques secondes
   - **Si persiste** : Vérifiez votre connexion internet

2. **"Connexion perdue"** (rouge)
   - Le navigateur détecte que vous êtes offline
   - **Action** : Vérifiez votre connexion internet
   - **Note** : La session expirera si la connexion n'est pas rétablie rapidement

3. **"Actualisation de la session..."** (bleu)
   - Un refresh est en cours
   - **Action** : Aucune, attendez la fin du refresh
   - **Durée** : Généralement < 1 seconde

#### Le bandeau ne devrait PAS apparaître si :

- Vous êtes connecté normalement
- Le token est valide pour plus de 2 minutes
- Vous êtes en ligne

### Bonnes Pratiques

#### Pour les Développeurs

- **Ne pas stocker le refresh token en localStorage** : Il est géré automatiquement via HTTP-only cookie
- **Utiliser `useSessionHeartbeat`** : Ne pas créer de logique de ping/refresh manuelle
- **Gérer les erreurs 401** : Laisser `axiosClient` gérer le refresh automatique, ne pas rediriger manuellement
- **Tests** : Utiliser les mocks fournis dans `frontend/src/test/hooks/useSessionHeartbeat.test.ts`

#### Pour les Utilisateurs

- **Rester actif** : L'application maintient automatiquement la session si vous êtes actif
- **Ne pas fermer l'onglet** : Si l'onglet est caché, les pings s'arrêtent automatiquement
- **Vérifier la connexion** : Si le bandeau rouge apparaît, vérifiez votre connexion internet

### Troubleshooting

#### Problème : Session expire trop rapidement

**Cause possible** : Inactivité > 15 minutes
**Solution** : L'utilisateur doit se reconnecter (comportement attendu pour sécurité)

#### Problème : Refresh en boucle infinie

**Cause possible** : Token invalide ou backend non disponible
**Solution** : Vérifier les logs backend, vérifier que le refresh token est valide

#### Problème : Bandeau ne disparaît pas

**Cause possible** : Token expiré mais refresh échoue
**Solution** : Se reconnecter manuellement

### Références

- **RFC Sliding Session** : `docs/architecture/sliding-session-rfc.md`
- **Story B42-P3** : `docs/stories/story-b42-p3-frontend-refresh-integration.md`
- **Tests E2E** : `frontend/tests/e2e/session-refresh.spec.ts`

*Dernière mise à jour : 2025-11-26 | Version : 1.2*