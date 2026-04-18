# Runbook Admin - Monitoring des Sessions

**Date:** 2025-11-26  
**Version:** 1.0  
**Story:** B42-P4 - UX, Alertes & Observabilité des sessions

---

## 📋 Vue d'ensemble

Ce runbook décrit comment surveiller, diagnostiquer et ajuster les paramètres de session dans l'application Recyclic.

---

## 🎯 Tableau de bord Admin

### Accès au Dashboard

**URL :** `/admin/health` ou `/admin/dashboard`

**Permissions requises :** Rôle Admin ou Super Admin

### Section "Métriques de Sessions"

Le dashboard affiche les métriques suivantes :

#### 1. **Sessions Actives**
- Nombre estimé de sessions actives (basé sur les refresh réussis dans la dernière heure)
- Mise à jour : Temps réel

#### 2. **Taux de Réussite**
- **Refresh réussis :** Nombre de renouvellements de session réussis
- **Refresh échoués :** Nombre de renouvellements échoués
- **Taux de réussite :** Pourcentage de refresh réussis
- **Période :** Configurable (1-168 heures, par défaut 24h)

#### 3. **Erreurs par Type**
- **invalid_token :** Token de refresh invalide ou expiré
- **network_error :** Erreur de connexion réseau
- **server_error :** Erreur serveur (500, 503, etc.)
- **rate_limit :** Limite de taux dépassée

#### 4. **Erreurs par IP**
- Top 10 des adresses IP avec le plus d'erreurs
- Utile pour identifier des problèmes réseau ou des attaques

#### 5. **Latence**
- **Moyenne :** Temps moyen de traitement d'un refresh
- **P50, P95, P99 :** Percentiles de latence
- **Max :** Latence maximale observée

---

## 🔧 Endpoints API

### 1. Métriques de Sessions (Admin)

**Endpoint :** `GET /v1/admin/sessions/metrics`

**Paramètres :**
- `hours` (optionnel) : Nombre d'heures à inclure (1-168, défaut: 24)

**Exemple :**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/v1/admin/sessions/metrics?hours=24"
```

**Réponse :**
```json
{
  "success": true,
  "metrics": {
    "total_operations": 1250,
    "refresh_success_count": 1200,
    "refresh_failure_count": 50,
    "refresh_success_rate_percent": 96.0,
    "logout_forced_count": 10,
    "logout_manual_count": 5,
    "active_sessions_estimate": 45,
    "latency_metrics": {
      "avg_ms": 45.2,
      "p50_ms": 42.0,
      "p95_ms": 78.5,
      "p99_ms": 120.0,
      "max_ms": 250.0
    },
    "error_breakdown": {
      "invalid_token": 30,
      "network_error": 15,
      "server_error": 5
    },
    "ip_breakdown": {
      "192.168.1.100": 10,
      "10.0.0.50": 8
    },
    "time_period_hours": 24,
    "timestamp": 1701000000
  }
}
```

### 2. Métriques Prometheus

**Endpoint :** `GET /v1/monitoring/sessions/metrics/prometheus`

**Format :** Texte Prometheus

**Exemple :**
```bash
curl "http://localhost:8000/v1/monitoring/sessions/metrics/prometheus"
```

**Réponse :**
```
# TYPE session_refresh_success counter
session_refresh_success 1200

# TYPE session_refresh_failure counter
session_refresh_failure 50

# TYPE session_refresh_failure_invalid_token counter
session_refresh_failure_invalid_token 30

# TYPE session_logout_forced counter
session_logout_forced 10

# TYPE session_refresh_success_rate gauge
session_refresh_success_rate 96.0
```

---

## ⚙️ Paramètres configurables

### 1. Durée de vie du token (`token_expiration_minutes`)

**Fichier :** `.env` ou variables d'environnement

**Paramètre :** `TOKEN_EXPIRATION_MINUTES`

**Valeur par défaut :** 240 minutes (4 heures)

**Description :** Durée de vie du token d'accès JWT. Après cette durée, le token expire et doit être renouvelé.

**Ajustement :**
```bash
# Dans .env
TOKEN_EXPIRATION_MINUTES=240  # 4 heures
```

**Impact :**
- **Valeur plus basse :** Sessions plus courtes, plus de refresh, meilleure sécurité
- **Valeur plus haute :** Sessions plus longues, moins de refresh, moins de sécurité

**Recommandation :** 240 minutes (4h) pour un bon équilibre sécurité/UX

### 2. Seuil d'activité (`activity_threshold_minutes`)

**Fichier :** `.env` ou variables d'environnement

**Paramètre :** `ACTIVITY_THRESHOLD_MINUTES`

**Valeur par défaut :** 30 minutes

**Description :** Période d'inactivité après laquelle l'utilisateur est considéré comme inactif et déconnecté.

**Différence avec `token_expiration_minutes` :**
- **`token_expiration_minutes` :** Durée de vie du token (renouvelable automatiquement)
- **`activity_threshold_minutes` :** Période d'inactivité avant déconnexion forcée

**Exemple :**
- Token expire après 4h, mais si inactif 30min → déconnexion immédiate

**Ajustement :**
```bash
# Dans .env
ACTIVITY_THRESHOLD_MINUTES=30  # 30 minutes d'inactivité
```

### 3. Seuil d'alerte (Alerting)

**Configuration :** Grafana (voir section Alerting)

**Seuil :** >5% de refresh échouent sur 15 minutes

**Action :** Alerte email/Slack si seuil dépassé

---

## 🚨 Alerting et Monitoring

### Configuration Grafana

#### 1. Scraper Prometheus

**Configuration Prometheus :**
```yaml
scrape_configs:
  - job_name: 'recyclic-sessions'
    scrape_interval: 15s
    metrics_path: '/v1/monitoring/sessions/metrics/prometheus'
    static_configs:
      - targets: ['api:8000']
```

#### 2. Requête Prometheus pour Alerting

**Alerte : Taux d'échec > 5% sur 15 minutes**

```promql
# Calcul du taux d'échec sur 15 minutes
(
  rate(session_refresh_failure[15m]) 
  / 
  (rate(session_refresh_success[15m]) + rate(session_refresh_failure[15m]))
) * 100 > 5
```

**Configuration Grafana Alert :**
```yaml
alert:
  name: High Session Refresh Failure Rate
  message: "Session refresh failure rate is {{ $value }}%, exceeding 5% threshold"
  condition: |
    (
      rate(session_refresh_failure[15m]) 
      / 
      (rate(session_refresh_success[15m]) + rate(session_refresh_failure[15m]))
    ) * 100 > 5
  for: 5m
  annotations:
    summary: "High session refresh failure rate detected"
    description: "{{ $value }}% of session refreshes are failing over the last 15 minutes"
  labels:
    severity: warning
    component: sessions
```

#### 3. Notification Email

**Configuration Grafana Notification Channel :**
- **Type :** Email
- **Destinataires :** ops@recyclic.fr, admin@recyclic.fr
- **Sujet :** `[Recyclic Alert] High Session Refresh Failure Rate`

#### 4. Dashboard Grafana

**Panels recommandés :**
1. **Taux de réussite des refresh** (gauge)
2. **Nombre de refresh par minute** (graph)
3. **Erreurs par type** (pie chart)
4. **Latence moyenne** (graph)
5. **Sessions actives** (stat)

---

## 🔍 Diagnostic des problèmes

### Problème 1 : Taux d'échec élevé (>5%)

**Symptômes :**
- Beaucoup d'utilisateurs se plaignent de déconnexions
- Métriques montrent >5% d'échecs

**Diagnostic :**
1. Vérifier les erreurs par type dans le dashboard
2. Vérifier les erreurs par IP (problème réseau localisé ?)
3. Vérifier les logs serveur pour les erreurs 500/503

**Actions :**
- Si `invalid_token` élevé : Vérifier la configuration JWT/refresh tokens
- Si `network_error` élevé : Vérifier la connectivité réseau
- Si `server_error` élevé : Vérifier la santé du serveur (CPU, mémoire, DB)

### Problème 2 : Latence élevée

**Symptômes :**
- P95 > 200ms
- Utilisateurs se plaignent de lenteur

**Diagnostic :**
1. Vérifier la charge du serveur
2. Vérifier la latence de la base de données
3. Vérifier les requêtes lentes dans les logs

**Actions :**
- Optimiser les requêtes DB
- Augmenter les ressources serveur
- Vérifier les connexions Redis

### Problème 3 : Sessions actives anormalement basses

**Symptômes :**
- `active_sessions_estimate` très bas par rapport au nombre d'utilisateurs attendus

**Diagnostic :**
1. Vérifier si les refresh sont enregistrés
2. Vérifier la fenêtre de temps (dernière heure)
3. Vérifier les logs pour erreurs silencieuses

**Actions :**
- Vérifier que le service `SessionMetricsCollector` fonctionne
- Vérifier les logs d'instrumentation

---

## 📊 Métriques clés à surveiller

### Métriques critiques (à surveiller quotidiennement)

1. **Taux de réussite des refresh**
   - **Seuil d'alerte :** < 95%
   - **Action :** Investiguer immédiatement

2. **Taux d'échec sur 15 minutes**
   - **Seuil d'alerte :** > 5%
   - **Action :** Alerte automatique

3. **Latence P95**
   - **Seuil d'alerte :** > 200ms
   - **Action :** Optimiser ou augmenter ressources

### Métriques de tendance (à surveiller hebdomadairement)

1. **Nombre de sessions actives**
2. **Erreurs par type** (évolution)
3. **Erreurs par IP** (identifier patterns)

---

## 🛠️ Maintenance

### Réinitialisation des métriques

**Endpoint :** `POST /v1/monitoring/sessions/metrics/reset` (si implémenté)

**Note :** Les métriques sont stockées en mémoire avec une limite de 10000 événements. Les métriques anciennes sont automatiquement purgées.

### Rotation des logs

Les logs de session sont intégrés dans les logs applicatifs standards. Configurer la rotation selon les pratiques de l'infrastructure.

---

## 📝 Checklist de surveillance quotidienne

- [ ] Vérifier le taux de réussite des refresh (> 95%)
- [ ] Vérifier les alertes Grafana (aucune alerte active)
- [ ] Vérifier les erreurs par type (pas d'augmentation anormale)
- [ ] Vérifier la latence moyenne (< 100ms)
- [ ] Vérifier les sessions actives (cohérent avec l'usage)

---

## 🔗 Références

- **Story B42-P4 :** `docs/stories/story-b42-p4-ux-alertes-observabilite.md`
- **RFC Sliding Session :** `docs/architecture/sliding-session-rfc.md`
- **Guide utilisateur :** `docs/guides/guide-utilisateur-session-banniere.md`

---

**Dernière mise à jour :** 2025-11-26  
**Version du document :** 1.0
















