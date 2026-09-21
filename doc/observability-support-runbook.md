# Runbook support — observabilité flux critiques (Story 10.5)

Manifeste machine-readable : [`observability-critical-flows.yaml`](./observability-critical-flows.yaml).  
Guide de pilotage (Epic 10) : [`guide-pilotage-v2.md`](../_bmad-output/planning-artifacts/guide-pilotage-v2.md).  
Peloton métier **10.4** (inchangé) : [`critical-core-peloton.yaml`](./critical-core-peloton.yaml).  
Corrélation sync **8.5** : timeline `recyclique_pahekoOutbox_getCorrelationTimeline`.

Référence tableau opérationnel : `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md` (ligne **10.5**).  
Stack locale : `references/artefacts/2026-04-07_01_validation-stack-locale-peintre-nano.md`.  
Champs événements : `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`.

## Tableau des quatre piliers

| Pilier | Intention | Surfaces principales |
|--------|-----------|----------------------|
| `health_readiness` | Santé stack / readiness admin | `GET /health`, admin `/v1/admin/health/*`, widget `admin.system.health` |
| `http_correlation` | `X-Request-Id` → erreur JSON → « Réf. support » Peintre | Middleware, peloton API, `recyclique-api-error.ts` |
| `sync_support_trail` | Incident sync Paheko sans reconstitution manuelle | Outbox, `by-correlation`, journaux transaction/audit |
| `admin_journals` | Consultation journaux admin filtrés | `/v1/admin/transaction-logs`, `/audit-log`, `/email-logs` |

Captures de référence (chemins cibles, PNG optionnels en clone léger) : voir `screenshot_refs[]` dans le YAML — pack [`references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md`](../references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md).

## Santé — URLs canoniques (AC2)

| Rôle | URL | Auth | Usage |
|------|-----|------|--------|
| **Liveness (orchestration)** | `GET http://localhost:8000/health` | Non | **Canonique Docker** — aligné `docker-compose.yml` (`healthcheck` API) |
| **Readiness admin (monitoring externe)** | `GET /v1/admin/health/public` | Non | Statut nominal service ; préféré pour LB sans compte admin |
| **Readiness métier (panneau admin)** | `GET /v1/admin/health` | Admin (Bearer/cookie) | Synthèse anomalies + scheduler |
| **Alias documentés** | `GET /v1/health/` | Non | Historique ; même famille que liveness racine |
| **Alias DB** | `GET /v1/admin/health/database` | Non | `SELECT 1` — peut être `unhealthy` dans le corps avec HTTP 200 |

**Sémantique :** `/health` (racine) vérifie la disponibilité API + dépendances légères utilisées par le compose. Les routes `/v1/admin/health/*` exposent l’état **métier** (scheduler, anomalies) pour le support dans Peintre (`AdminSystemHealthWidget`). Ne pas confondre une liveness verte avec un scheduler arrêté : consulter la readiness admin.

```bash
# Liveness (compose / ops)
curl -fsS http://localhost:8000/health

# Readiness publique
curl -fsS http://localhost:8000/v1/admin/health/public

# Synthèse admin (token super-admin)
export ADMIN_TOKEN="<jwt>"
curl -fsS -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8000/v1/admin/health
```

## Distinction `X-Request-Id` vs `X-Correlation-ID` (FM4)

| Identifiant | Portée | Exemple |
|-------------|--------|---------|
| **`X-Request-Id`** | Une requête HTTP API | Erreur 4xx sur `POST /v1/sales/` → `correlation_id` JSON = valeur du header |
| **`X-Correlation-ID` / `sync_correlation_id`** | Fil sync clôture caisse → outbox → Paheko | Clôture caisse ; champ `correlation_id` sur lignes outbox ; **`GET .../by-correlation/{id}`** |

Le support ne doit **pas** passer un `X-Request-Id` d’une requête admin isolée à `by-correlation` : utiliser le **`correlation_id` sync** remonté à la clôture (`paheko_sync_correlation_id` dans la réponse de clôture quand applicable) ou la valeur stockée sur l’item outbox.

## Scénarios incident (5)

### 1 — `module_chain` (contexte / navigation)

**Symptôme :** dashboard ou nav transverse dégradés, `runtime_state` incohérent.

1. Vérifier liveness `GET /health`.
2. Avec un compte utilisateur : `GET /v1/users/me/context` (auth Bearer ou cookie session).
3. En cas d’erreur HTTP : noter **`X-Request-Id`** / `correlation_id` dans le JSON (`RecycliqueApiError`).
4. Croiser les journaux admin si action récente : `GET /v1/admin/audit-log` (filtres `action_type`, dates).

### 2 — `caisse_nominal`

**Symptôme :** vente ou session caisse en échec.

1. Confirmer stack API + Postgres + Redis.
2. Rejouer l’appel en échec (ex. vente) et capturer **`correlation_id`**.
3. `GET /v1/admin/transaction-logs` — filtrer `session_id` / type d’événement si connu.
4. Peintre : bandeau « Réf. support » (`recyclique-client-error-alert.tsx`) doit afficher l’id si présent dans l’erreur parsée.

### 3 — `reception_nominal`

**Symptôme :** poste / ticket réception bloqué.

1. Vérifier auth opérateur sur `POST /v1/reception/postes/open` et tickets.
2. Sur 404/409 : relever `correlation_id` dans l’enveloppe d’erreur.
3. Audit : `GET /v1/admin/audit-log` + transaction logs si mouvements liés.

### 4 — `sync_sensitive` (fil outbox Paheko)

**Symptôme :** clôture caisse OK localement, sync Paheko en échec / quarantaine.

**Identifiant à utiliser pour `by-correlation` :** le **`correlation_id` sync** de la clôture (ex. valeur passée comme `sync_correlation_id` / alignée **`X-Correlation-ID`** vers Paheko — **pas** le `X-Request-Id` d’un GET admin ultérieur).

Étapes :

1. `GET /v1/admin/paheko-outbox/items?correlation_id=<SYNC_CORR>` (`recyclique_pahekoOutbox_listItems`).
2. `GET /v1/admin/paheko-outbox/by-correlation/<SYNC_CORR>` (`recyclique_pahekoOutbox_getCorrelationTimeline`) — timeline + transitions.
3. `GET /v1/admin/paheko-outbox/items/{id}` (`recyclique_pahekoOutbox_getItem`) pour le détail item.
4. `GET /v1/admin/transaction-logs` (filtre session / type) et `GET /v1/admin/audit-log`.
5. UI : `AdminPahekoDiagnosticsSection` / client `admin-paheko-outbox-client.ts`.

```bash
curl -fsS -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:8000/v1/admin/paheko-outbox/by-correlation/<SYNC_CORR>"
```

### 5 — `admin_journals` (consultation transverse)

**Symptôme :** besoin de recouper un incident sans rejouer tout le peloton.

1. `GET /v1/admin/transaction-logs` (`adminTransactionLogsList`) — pagination, filtres documentés OpenAPI.
2. `GET /v1/admin/audit-log` (`adminAuditLogList`).
3. `GET /v1/admin/email-logs` (`adminEmailLogsList`) si notification impliquée.
4. Rechercher `correlation_id` ou identifiants session/site dans les entrées.

## Champs minimaux par pilier (NFR10)

| Pilier | Champs minimaux attendus |
|--------|---------------------------|
| `health_readiness` | `status`, composant (DB/Redis/scheduler), horodatage, sévérité anomalie si applicable |
| `http_correlation` | `correlation_id`, `code`, `detail`, `retryable` dans `RecycliqueApiError` |
| `sync_support_trail` | `correlation_id`, `outbox_status`, `sync_state_core`, `cash_session_id`, transitions (`from_state`, `to_state`, motif) |
| `admin_journals` | horodatage, `action_type` / type événement, acteur, site/session si pertinent, `correlation_id` quand présent |

Détail payload événements : `implementation-patterns-consistency-rules.md`.

## Commandes smoke (parité CI §10.5)

```bash
# Racine dépôt
python3 -m pytest tests/infra/test_story_10_5_observability_manifest_guard.py -q

export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recyclic_test
export TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recyclic_test
export REDIS_URL=redis://localhost:6379
cd recyclique/api
python3 -m pytest tests/test_story_10_5_http_correlation_peloton.py -q
python3 -m pytest tests/test_story_10_5_sync_support_trail_smoke.py -q
```

Peloton **10.4** inchangé : `bash scripts/run_critical_core_peloton.sh` puis `cd ../../peintre-nano && npm run test:critical-core`.

## Hors scope 10.5

Pas de Grafana/Prometheus/Sentry nouveaux ; pas d’installation Debian (**10.6**) ; pas gates beta (**10.7**) ; pas correction globale bandeau-live (**10.1**).
