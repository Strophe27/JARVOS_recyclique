# Synthèse automatisation des tests — suivi BMAD

**Cadre** : `bmad-qa-generate-e2e-tests` (pytest API ; pas d’UI E2E sur ce périmètre backend).

---

## Story 2.7 — `GET /v2/exploitation/live-snapshot` (signaux bandeau live minimal)

**Date** : 2026-04-03  
**Objectif QA** : garde-fous API sur le snapshot exploitation (auth, enveloppes erreur Recyclique, schéma 200, corrélation, 503 agrégation, utilisateur rejeté sans KPIs).

### Tests générés / complétés

| Fichier | Rôle |
|---------|------|
| `recyclique/api/tests/test_exploitation_live_snapshot.py` | 401 sans auth ; 403 avec enveloppe erreur ; 200 utilisateur non admin + champs `observed_at`, `effective_open_state`, `cash_session_effectiveness`, `daily_kpis_aggregate` (clés agrégat) ; option `sync_operational_summary` si présent ; **200 site actif affecté** : `effective_open_state` = `open`, `context.site_id`, F4 `sync_operational_summary` = `resolu` / `source_reachable`, caisse `not_applicable` ; en-tête `X-Correlation-ID` / réponse `X-Request-Id` ; 503 si agrégation lève (retryable) ; utilisateur `REJECTED` : pas de contexte / KPIs / sync summary, `cash_session_effectiveness` = `unknown`. |

### Résultat d’exécution (fichier ciblé)

```text
7 passed, 5 warnings (Pydantic), ~2s — exit 0
```

Commande :

```powershell
Set-Location 'D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api'
$env:TESTING = 'true'
python -m pytest tests/test_exploitation_live_snapshot.py -v --tb=short
```

### E2E UI

Non applicable (endpoint API backend ; bandeau consommateur hors pytest ici).

### Note

Complément QA : cas **runtime OK + site actif** (projection `context`, F1 `open`, F4 nominal) en plus du happy path utilisateur minimal et du garde-fou `REJECTED`.

---

## Story 2.6 — `2-6-exposer-les-premiers-contrats-backend-versionnes-pour-les-slices-v2`

**Date** : 2026-04-03  
**Objectif QA** : tests API alignés contrat OpenAPI dynamique, enveloppe AR21, `ContextEnvelope` (runtime `ContextEnvelopeResponse`).

### Tests générés / complétés

| Fichier | Rôle |
|---------|------|
| `recyclique/api/tests/test_openapi_validation.py` | Présence des schémas Pydantic `ContextEnvelopeResponse` / `ContextRuntimeState` dans `app.openapi()` ; `GET …/users/me/context` 200 validé contre le schéma OpenAPI ; sans auth : 401/403 avec corps conforme à `_RECYCLIQUE_API_ERROR_SCHEMA` (codes `UNAUTHORIZED` / `FORBIDDEN`). |

### Résultat d’exécution (fichier ciblé)

```text
11 passed, 5 warnings (Pydantic), ~1s — exit 0
```

Commande :

```powershell
Set-Location 'D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api'
$env:TESTING = 'true'
python -m pytest tests/test_openapi_validation.py -v --tb=short
```

### E2E UI

Non applicable (contrats / API ; codegen TS hors pytest).

### Note

Le writer reviewable `contracts/openapi/recyclique-api.yaml` nomme `ContextEnvelope` / `RecycliqueApiError` ; le OpenAPI FastAPI expose `ContextEnvelopeResponse` et n’inscrit pas `RecycliqueApiError` en composant nommé — la forme JSON erreur est couverte par validation runtime (`_RECYCLIQUE_API_ERROR_SCHEMA` + cas 404/422 existants).

---

## Story 2.2b — `2-2b-migrer-le-backend-vers-recyclique-racine-mono-repo`

**Date** : 2026-04-03  
**Objectif QA** : invariants de migration chemins (mono-repo) sans régression auth / context envelope.

### Tests générés / complétés

| Fichier | Rôle |
|---------|------|
| `recyclique/api/tests/test_monorepo_backend_layout.py` | Story 2.2b : `recyclic_api` résolu sous `recyclique/api` et pas sous `recyclique-1.4.4` ; `pyproject.toml` à la racine package canonique (`recyclique/api`) alignée avec `tests/`. |

### Lot gate (régression + context envelope + layout)

- `tests/test_infrastructure.py`
- `tests/test_auth_login_endpoint.py`
- `tests/test_auth_logging.py`
- `tests/test_auth_inactive_user_middleware.py`
- `tests/test_auth_login_username_password.py`
- `tests/test_admin_user_status_endpoint.py`
- `tests/api/test_admin_user_management.py`
- `tests/test_refresh_token_service.py`
- `tests/test_refresh_token_endpoint.py`
- `tests/test_context_envelope.py`
- `tests/test_monorepo_backend_layout.py`

### Couverture (indicative)

- **Layout mono-repo** : chemin d’import du package et cohérence `recyclique/api` + `pyproject.toml`.
- **Auth / admin / refresh / context** : inchangé (gate story 2.2 étendu).

### Résultat d’exécution

```text
91 passed, 5 warnings (Pydantic), ~37s — exit 0
```

Commande (depuis `recyclique/api`) — **inclure** `test_monorepo_backend_layout.py` dans les briefs gate Epic 2 :

```powershell
Set-Location 'D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api'
$env:TESTING = 'true'
python -m pytest tests/test_infrastructure.py tests/test_auth_login_endpoint.py tests/test_auth_logging.py tests/test_auth_inactive_user_middleware.py tests/test_auth_login_username_password.py tests/test_admin_user_status_endpoint.py tests/api/test_admin_user_management.py tests/test_refresh_token_service.py tests/test_refresh_token_endpoint.py tests/test_context_envelope.py tests/test_monorepo_backend_layout.py -v --tb=short
```

### E2E UI

Non applicable (backend uniquement).

---

## Story 2.1 — `2-1-poser-le-socle-de-session-web-v2-et-lautorite-dauthentification-backend`

**Date** : 2026-04-03 (historique)

### Tests générés / complétés

| Fichier | Rôle |
|---------|------|
| `recyclique/api/tests/test_web_session_v2_cookies.py` | Session web v2 : cookies httpOnly, cookie vs Bearer, logout, strict admin, refresh vide, PIN sans cookies, login legacy sans cookies ; refresh cookie + rotation (skip si Redis absent). |

### Lot gate story (chemins historiques — migrés vers `recyclique/api`)

- Fichiers pytest listés section 2.2b ci-dessus, plus selon story 2.1 : `tests/test_auth_cache_behavior.py`, `tests/test_web_session_v2_cookies.py` quand le gate session v2 est requis.

### Couverture (indicative)

- **Transport session v2** : login avec `use_web_session_cookies`, accès route protégée via cookie, priorité Bearer sur cookie invalide, absence de cookies en mode legacy, effacement post-logout.
- **Cohabitation** : `/auth/pin` ne pose pas les cookies de session web.
- **Erreurs** : refresh sans token corps ni cookie → 422 ; route `require_admin_role_strict` sans credentials → 403.
- **Refresh par cookie** : happy path sous Redis (skip si indisponible).

### Prochaines étapes (général)

- CI : aligner les jobs pytest sur `recyclique/api` et la commande gate à jour.
- Frontend Epic 3 : E2E consommant le contrat hors périmètre de ce résumé.

---

## Story 2.3 — `2-3-mettre-en-place-le-calcul-additif-des-roles-groupes-et-permissions-effectives`

**Date** : 2026-04-03  
**Objectif QA** : renforcer pytest API sur permissions effectives (union, périmètre site, cohérence `user_has_effective_permission` / `compute`, helper `group_in_active_scope`, raccourci ADMIN).

### Tests générés / complétés

| Fichier | Rôle |
|---------|------|
| `recyclique/api/tests/test_effective_permissions.py` | Cas positif site-scoped (même `site_id` utilisateur/groupe) ; dédup même permission sur deux groupes ; USER sans groupes ; alignement booléen vs liste de clés ; `group_in_active_scope` (global) ; ADMIN accepte toute clé pour le booléen (documenté). |

### Lot gate (commande story 2.3)

- Liste identique à la story (incl. `test_monorepo_backend_layout.py`, `test_user_permissions.py`, `test_effective_permissions.py`, `test_groups_and_permissions.py`).

### Résultat d’exécution

```text
129 passed, 5 warnings (Pydantic), ~49s — exit 0
```

Commande (depuis `recyclique/api`) :

```powershell
Set-Location 'D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api'
$env:TESTING = 'true'
python -m pytest tests/test_infrastructure.py tests/test_auth_login_endpoint.py tests/test_auth_logging.py tests/test_auth_inactive_user_middleware.py tests/test_auth_login_username_password.py tests/test_admin_user_status_endpoint.py tests/api/test_admin_user_management.py tests/test_refresh_token_service.py tests/test_refresh_token_endpoint.py tests/test_context_envelope.py tests/test_monorepo_backend_layout.py tests/test_user_permissions.py tests/test_effective_permissions.py tests/test_groups_and_permissions.py -v --tb=short
```

### E2E UI

Non applicable (backend uniquement).

---

## Story 2.4 — `2-4-encadrer-les-actions-sensibles-avec-step-up-security-pin-et-idempotence`

**Date** : 2026-04-03  
**Objectif QA** : pytest API sur POST `/v1/cash-sessions/{id}/close` — en-têtes `X-Step-Up-Pin`, `Idempotency-Key`, `X-Request-Id` (step-up, idempotence Redis, corrélation middleware).

### Tests générés / complétés

| Fichier | Rôle |
|---------|------|
| `recyclique/api/tests/test_step_up_cash_session_close.py` | Step-up : PIN requis / invalide / non configuré ; lockout simulé (`STEP_UP_LOCKED`) ; idempotence rejouer corps identique / conflit corps différent (`IDEMPOTENCY_KEY_CONFLICT`) ; `X-Request-Id` sur `/health` et sur fermeture session (cette dernière + idempotence **skip SQLite**, exécuter sous PostgreSQL). |

### Couverture (indicative)

- **Step-up** : `403` `STEP_UP_PIN_REQUIRED`, `STEP_UP_PIN_INVALID`, `STEP_UP_PIN_NOT_CONFIGURED` ; `429` `STEP_UP_LOCKED` (mock `_is_locked_out`).
- **Idempotence** : même clé + même corps → même JSON ; même clé + corps différent → `409`.
- **Corrélation** : `X-Request-Id` répercuté sur la réponse (middleware).

### Résultat d’exécution (SQLite local, 2026-04-03)

```text
5 passed, 3 skipped, 5 warnings (Pydantic) — exit 0
```

Les 3 skips : fermeture complète + idempotence + `X-Request-Id` sur close nécessitent PostgreSQL (`TEST_DATABASE_URL` non SQLite).

Commande (depuis `recyclique/api`) :

```powershell
Set-Location 'D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api'
$env:TESTING = 'true'
python -m pytest tests/test_step_up_cash_session_close.py -v --tb=short
```

### E2E UI

Non applicable (backend uniquement).

---

## Story 2.5 — `2-5-stabiliser-la-persistance-terrain-locale-laudit-et-les-journaux-critiques`

**Date** : 2026-04-03  
**Objectif QA** : pytest sur audit (masquage `details_json`, schéma critique, type fermeture caisse, logger structuré sur échec persistance) + gate Epic 2 aligné story (hors dette URL PIN).

### Tests générés / complétés

| Fichier | Rôle |
|---------|------|
| `recyclique/api/tests/test_audit_story_25.py` | Story 2.5 : `sanitize_audit_details` / `merge_critical_audit_fields` ; `log_cash_session_closing` typé + contexte + `request_id` ; `log_audit` échec DB → `audit_persist_failed` + rollback (pas de `print`). **Complément QA** : cas explicites `step_up_pin`, `access_token`, `session_cookie` (AC2). |
| `recyclique/api/tests/test_request_correlation_story_25.py` | **QA étape skill** : `TestClient` sur `/` — réponse avec `X-Request-Id` identique à l’en-tête client, trim, génération UUID si absent / vide / blanc uniquement. (Pas d’insert `audit_logs` ici : harness SQLite sans table + autouse neutralise `log_audit`.) |

### Lot gate (commande story 2.5 — sans fichiers PIN)

Les tests `tests/api/test_pin_endpoints.py` et `tests/test_pin_management.py` échouent encore avec **404** (client sur `/api/v1/...` ou `/auth/...` sans préfixe `/v1` vs montage actuel — aligné note stories **2.4** / **2.5**). Gate **vert** sur le sous-ensemble ci-dessous :

- `tests/test_infrastructure.py`
- `tests/test_auth_login_endpoint.py`
- `tests/test_auth_logging.py`
- `tests/test_auth_inactive_user_middleware.py`
- `tests/test_auth_login_username_password.py`
- `tests/test_admin_user_status_endpoint.py`
- `tests/api/test_admin_user_management.py`
- `tests/test_refresh_token_service.py`
- `tests/test_refresh_token_endpoint.py`
- `tests/test_context_envelope.py`
- `tests/test_monorepo_backend_layout.py`
- `tests/test_user_permissions.py`
- `tests/test_effective_permissions.py`
- `tests/test_groups_and_permissions.py`
- `tests/test_step_up_cash_session_close.py`
- `tests/test_audit_story_25.py`
- `tests/test_cash_session_close_arch04.py`
- `tests/test_request_correlation_story_25.py`

### Couverture (indicative)

- **Audit** : masquage récursif clés sensibles ; schéma minimal `request_id`, `operation`, `outcome`, ids contexte ; type `CASH_SESSION_CLOSED` sur fermeture refusée mockée ; erreur persistance → log ERROR structuré.
- **Corrélation HTTP (gate)** : `test_request_correlation_story_25` complète les checks `X-Request-Id` déjà partiellement dans `test_step_up_cash_session_close` (health / close skip SQLite).
- **Persistance métier (lot)** : `test_cash_session_close_arch04` (application `run_close_cash_session`) ; step-up / idempotence / corrélation : `test_step_up_cash_session_close` (3 skips si SQLite — Postgres pour scénarios complets).
- **Lacune** : pas de test d’intégration DB vérifiant une ligne `audit_logs` après un `TestClient` HTTP réel (hors scope gate rapide) ; `log_audit` utilise `exc_info=True` — à surveiller côté ops si les traces complètes ne doivent pas contenir le message d’exception.
- **Correctif sécu logging (validation Pydantic)** : dans `recyclique/api/src/recyclic_api/main.py`, le handler `RequestValidationError` journalise les erreurs via `_validation_errors_for_log` : la clé Pydantic `input` (valeurs soumises) est omise des logs serveur pour limiter la fuite de secrets ; le JSON HTTP `422` (`detail`) reste le comportement FastAPI standard. Aucun test pytest ne parse ces logs ; le gate story 2.5 ci-dessous reste vert après correctif.

### Résultat d’exécution (2026-04-03, Windows, `recyclique/api`)

**Sous-ensemble sans PIN** :

```text
146 passed, 3 skipped, 5 warnings (Pydantic) — exit 0
```

**Liste complète story (avec PIN)** :

```text
18 failed (PIN / URLs client), 152 passed, 3 skipped — exit 1
```

Commande gate **recommandée** tant que les PIN ne sont pas corrigés :

```powershell
Set-Location 'D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api'
$env:TESTING = 'true'
python -m pytest tests/test_infrastructure.py tests/test_auth_login_endpoint.py tests/test_auth_logging.py tests/test_auth_inactive_user_middleware.py tests/test_auth_login_username_password.py tests/test_admin_user_status_endpoint.py tests/api/test_admin_user_management.py tests/test_refresh_token_service.py tests/test_refresh_token_endpoint.py tests/test_context_envelope.py tests/test_monorepo_backend_layout.py tests/test_user_permissions.py tests/test_effective_permissions.py tests/test_groups_and_permissions.py tests/test_step_up_cash_session_close.py tests/test_audit_story_25.py tests/test_cash_session_close_arch04.py tests/test_request_correlation_story_25.py -v --tb=short
```

### E2E UI

Non applicable (backend uniquement).

### qa_loop (retry DS) suggéré

1. Aligner les `TestClient` / URLs dans `test_pin_endpoints.py` et `test_pin_management.py` sur le préfixe réel (`/v1`, `ROOT_PATH`, etc.) pour réintégrer ces fichiers au gate unique Epic 2.
2. Optionnel : un test d’intégration Postgres marqué `integration_db` qui assert une ligne `audit_logs` avec `details_json.request_id` après fermeture de session (corrélation bout-en-bout).
