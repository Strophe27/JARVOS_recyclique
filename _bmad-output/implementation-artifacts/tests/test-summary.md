# Synthèse automatisation des tests — suivi BMAD

**Cadre** : `bmad-qa-generate-e2e-tests` (pytest API ; E2E UI Vitest + Testing Library sous `peintre-nano/tests/e2e/`).

---

## Story 4.5 — `4-5-ajouter-un-toggle-admin-minimal-borne-au-module-bandeau-live`

**Date** : 2026-04-07  
**Objectif QA** : vérifier la couverture automatisée vs AC (toggle admin / vérité backend, `BANDEAU_LIVE_MODULE_DISABLED`, pas de poll si slice off, contrats B4 sur le GET, composition bac à sable).

### Revue de couverture vs AC

| AC | Preuve existante | Complément QA (ce passage) |
|----|------------------|----------------------------|
| 1 — Chemin admin borné | `test_exploitation_live_snapshot.py` : `test_patch_bandeau_live_slice_*` (403 non-admin, 400 sans site, 200 persistance + GET reflète l’état) | Aucun trou critique — **aucun test ajouté** |
| 2 — Vérité backend + runtime | Même fichier (`test_live_snapshot_slice_disabled_skips_kpi_aggregate`) ; front : fetch mock + `bandeau_live_slice_enabled: false` | — |
| 5 — Fallback `BANDEAU_LIVE_*` + `reportRuntimeFallback` | `bandeau-live-widget.test.tsx` (snapshot statique) ; `bandeau-live-live-source.test.tsx` ; `bandeau-live-sandbox-compose.e2e.test.tsx` (« live + slice désactivé ») | — |
| Pas de poll si off | `bandeau-live-live-source.test.tsx` : **un seul** `fetch`, attente 400 ms sans second appel | L’E2E compose ne refait pas cette attente temporelle : **acceptable** (même logique couverte au niveau widget + source live) |
| 6 — Contrat reviewable (GET `operationId` inchangé) | `creos-bandeau-live-manifests-4-1.test.ts` + `recyclique-openapi-governance.test.ts` sur `recyclique_exploitation_getLiveSnapshot` | PATCH documenté dans OpenAPI / types générés ; pas d’exigence de test Vitest supplémentaire pour rester vert |

### Fichiers de preuve (inchangés)

| Fichier | Rôle |
|---------|------|
| `recyclique/api/tests/test_exploitation_live_snapshot.py` | Toggle PATCH, slice off côté GET, pas d’agrégats KPI si désactivé |
| `peintre-nano/tests/unit/bandeau-live-live-source.test.tsx` | Un fetch, pas de polling, `reportRuntimeFallback` |
| `peintre-nano/tests/unit/bandeau-live-widget.test.tsx` | `module_disabled` + codes `data-*` |
| `peintre-nano/tests/e2e/bandeau-live-sandbox-compose.e2e.test.tsx` | Scénario slice off en composition manifests |

### Résultat d’exécution (2026-04-07)

Vitest (`peintre-nano`) :

```text
129 passed (27 fichiers) — exit 0
```

Pytest (`recyclique/api`, fichier ciblé) :

```text
12 passed, 5 warnings (Pydantic) — exit 0
```

### qa_loop (sous-agent Task)

**0** — couverture jugée suffisante pour les AC testables en automate ; **aucune modification** des fichiers de test applicatifs.

---

## Story 4.4 — `4-4-rendre-visibles-les-fallbacks-et-rejets-du-slice-bandeau-live`

**Date** : 2026-04-07  
**Objectif QA** : vérifier la couverture Vitest/jsdom vs AC (fallback / rejet visibles, `reportRuntimeFallback`, corrélation `fetchLiveSnapshot` ↔ DOM, reste de page intact).

### Revue de couverture vs AC

| AC | Preuve existante | Complément QA (ce passage) |
|----|------------------|----------------------------|
| 1 — Fallback visible + page intacte | `bandeau-live-sandbox-compose.e2e.test.tsx` : bandeau `unavailable` + widget voisin `demo.text.block` ; widget inconnu + bandeau nominal ; `reportRuntimeFallback` sur `UNAVAILABLE_STATIC` et `UNKNOWN_WIDGET_TYPE` | Inchangé (déjà bloquant couvert) |
| 2 / 4 — Corrélation traçable | 503 HTTP, corps 200 dégradé vide : `data-correlation-id` + `reportRuntimeFallback` avec `correlationId` (UUID mocké) | **Renfort** : JSON invalide (`PARSE_ERROR`) et `fetch` rejeté (`NETWORK_ERROR`) — même lien DOM + charge reporter |
| 3 — Preuve epic | Composition bac à sable + chemins erreur ci-dessus | — |

### Tests concernés

| Fichier | Rôle |
|---------|------|
| `peintre-nano/tests/unit/bandeau-live-live-source.test.tsx` | Parse 200 + réseau : `data-runtime-code`, `data-correlation-id`, `reportRuntimeFallback` (en plus de 503, dégradé vide, catch inattendu). |
| `peintre-nano/tests/e2e/bandeau-live-sandbox-compose.e2e.test.tsx` | Inchangé : indisponible + voisin, unknown widget, rejet lot. |
| `peintre-nano/tests/unit/bandeau-live-widget.test.tsx` | Chemin statique / `unavailable` (`data-runtime-*`). |

### Résultat d’exécution

```text
126 passed (27 fichiers) — exit 0
```

Commande :

```powershell
Set-Location 'D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\peintre-nano'
npm run test
```

### qa_loop (sous-agent Task)

**0** — suite verte avant modification ; renfort assertions sans cycle d’échec.

---

## Story 4.3 — `4-3-brancher-la-source-backend-reelle-et-les-cas-douverture-decalee`

**Date** : 2026-04-07  
**Objectif QA** : confirmer la couverture Vitest des AC 4.3 (source HTTP, états décalés, dégradé, polling 30 s, `X-Correlation-ID`, erreurs HTTP / parse / réseau) sans élargir le périmètre.

### Tests concernés

| Fichier | Rôle |
|---------|------|
| `peintre-nano/tests/unit/bandeau-live-live-source.test.tsx` | Corrélation UUID + Bearer ; `delayed_open` / `delayed_close` ; 401 / **403** / 503 ; JSON invalide ; corps vide dégradé ; **échec réseau** (`fetch` rejeté) ; **intervalle `setInterval` = 30 s** par défaut (`DEFAULT_LIVE_SNAPSHOT_POLLING_INTERVAL_S`). |
| `peintre-nano/tests/e2e/bandeau-live-sandbox-compose.e2e.test.tsx` | Composition manifests + chemin snapshot statique (héritage 4.2, inchangé). |
| `peintre-nano/tests/unit/bandeau-live-widget.test.tsx` | Chemin statique sans fetch (4.2). |

### Tests API

Déjà couverts côté backend : `recyclique/api/tests/test_exploitation_live_snapshot.py` (dont 403, corrélation) — hors re-run dans ce passage QA front.

### Résultat d’exécution

```text
123 passed (27 fichiers) — exit 0
```

Commande :

```powershell
Set-Location 'D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\peintre-nano'
npm run test
```

---

## Story 4.2 — `4-2-implementer-le-widget-bandeau-live-dans-le-registre-peintre-nano`

**Date** : 2026-04-07  
**Objectif QA** : parcours intégré **manifests CREOS reviewables** (`navigation-bandeau-live-slice.json` + `page-bandeau-live-sandbox.json`) → `loadManifestBundle` → `buildPageManifestRegions` → shell + widget `bandeau-live` ; état dégradé sans snapshot ; rejet lot si `widgetType` inconnu.

### Tests générés

| Fichier | Rôle |
|---------|------|
| `peintre-nano/tests/e2e/bandeau-live-sandbox-compose.e2e.test.tsx` | Chemin nominal : bandeau `data-bandeau-state="live"`, signaux snapshot (champs + sync) visibles dans la zone main ; sans `widget_props` sur le slot bandeau → `unavailable` ; type fictif → alerte manifests `UNKNOWN_WIDGET_TYPE` / `manifest_bundle_invalid`. |

### Correctif associé (comportement runtime)

| Fichier | Rôle |
|---------|------|
| `peintre-nano/src/domains/bandeau-live/BandeauLive.tsx` | `snapshotFromWidgetProps` accepte les clés **snake_case** (tests / JSON brut) et **camelCase** (après `deepMapKeysToCamelCase` à l’ingest du PageManifest), pour que le snapshot du manifest sandbox soit bien affiché en composition réelle. |

### Tests API

Non applicable (story front registre + rendu ; pas de nouvel endpoint).

### Résultat d’exécution

```text
113 passed (26 fichiers) — exit 0
```

Commande :

```powershell
Set-Location 'D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\peintre-nano'
npm run test
npm run lint
```

### Couverture (indicative)

- **UI E2E (Vitest jsdom)** : composition déclarative bandeau live + 2 chemins d’erreur (données absentes, type hors allowlist).
- **API** : inchangé.

### Prochaines étapes

- Story **4.6** : E2E navigateur réel / chaîne complète si prévu.
- CI : job `peintre-nano` `npm run test` inchangé (inclut déjà `tests/e2e/**`).

---

## Story 10.6b — `10-6b-clarifier-le-point-dentree-docker-local-du-mono-repo`

**Date** : 2026-04-07  
**Objectif QA** : smoke infra + doc vérifiable — point d’entrée Docker unique (`docker-compose.yml` racine), include legacy `recyclique-1.4.4/`, sans `docker compose up` (pas de conteneurs).

### Tests générés

| Fichier | Rôle |
|---------|------|
| `tests/infra/test_docker_compose_entrypoint.py` | Présence `docker-compose.yml` racine ; `docker compose config --quiet` depuis la racine et depuis `recyclique-1.4.4/` ; `recyclique-1.4.4/docker-compose.yml` contient `include` + `../docker-compose.yml` ; `README.md` mentionne `docker-compose.yml` et la racine ; `docker compose config --format json` liste les services `postgres`, `redis`, `api`, `api-migrations`, `frontend`. |

### Résultat d’exécution

```text
6 passed — exit 0
```

Commande :

```powershell
Set-Location 'D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique'
python -m pytest tests/infra/test_docker_compose_entrypoint.py -v --tb=short
```

**Prérequis** : CLI `docker` disponible (sinon les tests qui invoquent Compose sont ignorés avec `pytest.mark.skipif`).

### E2E UI (Playwright)

Non applicable (story doc / orchestration ; E2E front inchangé sous `recyclique-1.4.4/frontend/tests/e2e/`).

### Couverture (indicative)

- **Infra** : résolution YAML et services attendus.
- **Documentation** : chaînes minimales dans `README.md` racine.

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
