# Configuration Alerting Grafana - Sessions

**Date:** 2025-11-26  
**Version:** 1.0  
**Story:** B42-P4 - AC4: Alerting Ops

---

## 📋 Vue d'ensemble

Ce document décrit la configuration complète de l'alerting Grafana pour les métriques de sessions, conformément à l'AC4 de la story B42-P4.

**Objectif :** Créer une alerte si >5% des refresh échouent sur 15 minutes.

---

## 🔧 Prérequis

1. **Prometheus** configuré et scrappant les métriques
2. **Grafana** connecté à Prometheus
3. **Endpoint métriques** accessible : `/v1/monitoring/sessions/metrics/prometheus`

---

## 📊 Configuration Prometheus

### Scrape Config

Ajouter dans `prometheus.yml` :

```yaml
scrape_configs:
  - job_name: 'recyclic-sessions'
    scrape_interval: 15s
    metrics_path: '/v1/monitoring/sessions/metrics/prometheus'
    static_configs:
      - targets: ['api:8000']  # Adapter selon votre configuration
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'recyclic-api'
```

### Vérification

```bash
# Vérifier que Prometheus scrappe les métriques
curl http://prometheus:9090/api/v1/targets | jq '.data.activeTargets[] | select(.job=="recyclic-sessions")'

# Vérifier les métriques disponibles
curl http://prometheus:9090/api/v1/label/__name__/values | grep session
```

**Métriques attendues :**
- `session_refresh_success`
- `session_refresh_failure`
- `session_refresh_failure_invalid_token`
- `session_refresh_failure_network_error`
- `session_refresh_failure_server_error`
- `session_logout_forced`
- `session_logout_manual`
- `session_refresh_success_rate`

---

## 🚨 Configuration Grafana Alert

### 1. Créer l'Alerte

**Dans Grafana :** Alerting → Alert Rules → New Alert Rule

#### Configuration de base

**Name :** `High Session Refresh Failure Rate`

**Folder :** `Recyclic / Sessions`

**Evaluation group :** `recyclic-sessions` (créer si nécessaire)

**Evaluation interval :** `15s` (ou selon votre configuration)

#### Query A : Taux d'échec sur 15 minutes

```promql
(
  rate(session_refresh_failure[15m])
  /
  (
    rate(session_refresh_success[15m]) 
    + 
    rate(session_refresh_failure[15m])
  )
) * 100
```

**Legend :** `Failure Rate %`

**Ref ID :** `A`

#### Condition

**When :** `last() of A`

**Is above :** `5`

**For :** `5m` (alerte si condition vraie pendant 5 minutes)

#### Labels

```yaml
severity: warning
component: sessions
environment: production
team: ops
```

#### Annotations

**Summary :**
```
High Session Refresh Failure Rate
```

**Description :**
```
Session refresh failure rate is {{ $values.A }}%, exceeding the 5% threshold.

Current metrics:
- Success rate: {{ $values.A | humanizePercentage }}
- Total failures (15m): {{ $values.A }}
- Check dashboard: /d/sessions-overview
```

---

### 2. Notification Channels

#### Email

**Type :** Email

**Name :** `recyclic-ops-email`

**Addresses :**
- `ops@recyclic.fr`
- `admin@recyclic.fr`
- `oncall@recyclic.fr`

**Subject :**
```
[Recyclic Alert] High Session Refresh Failure Rate
```

**Message :**
```
Alert: High Session Refresh Failure Rate

The session refresh failure rate has exceeded 5% for the last 15 minutes.

Current failure rate: {{ $values.A }}%

Dashboard: http://grafana.example.com/d/sessions-overview
Prometheus: http://prometheus.example.com/graph?g0.expr={{ $values.A }}

Time: {{ $time }}
```

#### Slack (optionnel)

**Type :** Slack

**Name :** `recyclic-ops-slack`

**Webhook URL :** `https://hooks.slack.com/services/YOUR/WEBHOOK/URL`

**Channel :** `#ops-alerts`

**Title :** `High Session Refresh Failure Rate`

**Text :**
```
🚨 *Alert: High Session Refresh Failure Rate*

Failure rate: *{{ $values.A }}%* (threshold: 5%)

Dashboard: <http://grafana.example.com/d/sessions-overview|View Dashboard>
```

#### PagerDuty (optionnel)

**Type :** PagerDuty

**Name :** `recyclic-ops-pagerduty`

**Integration Key :** `YOUR_INTEGRATION_KEY`

**Severity :** `warning`

---

### 3. Lier l'Alerte aux Notifications

Dans la configuration de l'alerte, ajouter les notification channels :

- `recyclic-ops-email` (toujours)
- `recyclic-ops-slack` (optionnel)
- `recyclic-ops-pagerduty` (optionnel, pour escalade)

---

## 📈 Dashboard Grafana

### Créer un Dashboard "Sessions Overview"

**URL :** `/d/sessions-overview`

#### Panel 1: Taux de réussite (Gauge)

**Query :**
```promql
(
  rate(session_refresh_success[15m])
  /
  (
    rate(session_refresh_success[15m]) 
    + 
    rate(session_refresh_failure[15m])
  )
) * 100
```

**Visualization :** Gauge

**Thresholds :**
- Green: 95-100
- Yellow: 90-95
- Red: 0-90

#### Panel 2: Refresh par minute (Graph)

**Query A (Success):**
```promql
rate(session_refresh_success[1m]) * 60
```

**Query B (Failure):**
```promql
rate(session_refresh_failure[1m]) * 60
```

**Visualization :** Time series

**Legend :** `Success`, `Failure`

#### Panel 3: Erreurs par type (Pie Chart)

**Query :**
```promql
sum by (error_type) (
  rate(session_refresh_failure{error_type!=""}[15m])
)
```

**Visualization :** Pie chart

#### Panel 4: Latence moyenne (Graph)

**Query :**
```promql
avg(session_refresh_latency_ms)
```

**Visualization :** Time series

**Unit :** `ms`

#### Panel 5: Sessions actives (Stat)

**Query :**
```promql
session_active_sessions_estimate
```

**Visualization :** Stat

**Unit :** `short`

---

## 🧪 Test de l'Alerte

### Méthode 1: Simulation via API

```bash
# Enregistrer plusieurs échecs pour dépasser le seuil
for i in {1..20}; do
  curl -X POST http://api:8000/v1/auth/refresh \
    -H "Cookie: refresh_token=invalid_token" \
    -w "\n"
done
```

### Méthode 2: Test Grafana

Dans Grafana, utiliser "Test Rule" pour simuler l'alerte.

### Vérification

1. Vérifier que l'alerte se déclenche après 5 minutes
2. Vérifier que les notifications sont envoyées
3. Vérifier que l'alerte se résout automatiquement quand le taux redescend

---

## 🔍 Dépannage

### L'alerte ne se déclenche pas

**Vérifications :**
1. Prometheus scrappe-t-il les métriques ?
   ```bash
   curl http://prometheus:9090/api/v1/query?query=session_refresh_failure
   ```

2. La requête PromQL est-elle correcte ?
   - Tester dans Prometheus UI : `http://prometheus:9090/graph`

3. Les métriques sont-elles présentes ?
   ```bash
   curl http://api:8000/v1/monitoring/sessions/metrics/prometheus | grep session_refresh
   ```

### Les notifications ne sont pas envoyées

**Vérifications :**
1. Le notification channel est-il configuré correctement ?
2. Les adresses email sont-elles valides ?
3. Le webhook Slack est-il actif ?

### Faux positifs

**Ajustements possibles :**
- Augmenter le seuil (5% → 10%)
- Augmenter la durée "For" (5m → 10m)
- Ajuster la fenêtre de temps (15m → 30m)

---

## 📝 Checklist de déploiement

- [ ] Prometheus configuré et scrappant les métriques
- [ ] Métriques disponibles dans Prometheus
- [ ] Alerte Grafana créée
- [ ] Notification channels configurés
- [ ] Dashboard créé
- [ ] Test de l'alerte effectué
- [ ] Documentation mise à jour
- [ ] Équipe Ops informée

---

## 🔗 Références

- **Story B42-P4 :** `docs/stories/story-b42-p4-ux-alertes-observabilite.md`
- **Runbook Monitoring :** `docs/runbooks/monitoring-sessions.md`
- **Documentation Prometheus :** https://prometheus.io/docs/
- **Documentation Grafana Alerting :** https://grafana.com/docs/grafana/latest/alerting/

---

## 📞 Support

Pour toute question sur la configuration :
- **Équipe Ops :** ops@recyclic.fr
- **Documentation technique :** Voir `docs/runbooks/monitoring-sessions.md`

---

**Dernière mise à jour :** 2025-11-26  
**Version du document :** 1.0
















