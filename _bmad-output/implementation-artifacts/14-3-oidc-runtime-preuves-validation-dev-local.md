# 14-3 - Preuves runtime OIDC RecyClique (env, fail-closed, restart vs recreate)

Date: 2026-02-28  
Story source: `14-3-finaliser-integration-recyclique-oidc-runtime-env-secrets-checks`

## 1) Contexte d'execution

- Stack Docker active: `recyclic`, `keycloak`, `paheko`, `postgres`, `redis`.
- Verification runtime faite dans le **conteneur actif** `recyclic` (pas uniquement via `.env`).
- Toutes les sorties sont sanitisees (pas de token/secret brut dans les artefacts).

## 2) Preuves runtime configuration OIDC dans le conteneur actif

### 2.1 Health runtime OIDC expose

Source: `_bmad-output/implementation-artifacts/14-3-oidc-runtime-http-checks.log`

- `/health` contient `auth_runtime` avec:
  - `enabled=true`
  - `strict_fail_closed=true`
  - `http_timeout_seconds=10.0`
  - `issuer_configured=true`
  - `client_id_configured=true`
  - `client_secret_configured=true`
  - `redirect_uri_configured=true`
  - `missing_required=[]`

### 2.2 Lecture runtime directe dans le process applicatif

Source: `_bmad-output/implementation-artifacts/14-3-oidc-runtime-restart-vs-recreate.log`

- `docker compose exec recyclic python -c "...check_oidc_runtime()..."` retourne un snapshot runtime coherent.
- Cette lecture prouve l'etat charge par le process Python du conteneur en cours.

## 3) Preuve explicite Docker: restart vs recreate

Source: `_bmad-output/implementation-artifacts/14-3-oidc-runtime-restart-vs-recreate.log`

Demonstration realisee sur `OIDC_HTTP_TIMEOUT_SECONDS`:

1. Snapshot initial: `http_timeout_seconds=10.0`
2. Modification `.env` locale a `OIDC_HTTP_TIMEOUT_SECONDS=77`
3. `docker compose restart recyclic`
   - Snapshot runtime apres restart: `http_timeout_seconds=10.0` (inchange)
4. `docker compose up -d --force-recreate recyclic`
   - Snapshot runtime apres recreate: `http_timeout_seconds=77.0` (nouvelle valeur prise en compte)
5. Restauration `.env` initial + recreate
   - Snapshot final: `http_timeout_seconds=10.0`

Conclusion: **restart ne recharge pas l'env**, **recreate recharge l'env**.

## 4) AC1 - Parcours nominal runtime reel (IdP local actif)

Source: `_bmad-output/implementation-artifacts/14-3-oidc-runtime-nominal-local-idp.log`

Parcours execute depuis le conteneur actif `recyclic`, avec IdP local joignable:

1. `GET /v1/auth/sso/start` -> `302`
2. Login IdP (realm `recyclique-dev`, client `recyclique-bff-dev`) -> `302` callback
3. `GET /v1/auth/sso/callback` -> `302` vers `/admin` + cookie `recyclique_session`
4. `GET /v1/auth/session` -> `200` avec `authenticated=true`

Extrait sanitise:

- `start_status 302`
- `callback_status 302`
- `callback_location /admin`
- `session_status 200`
- `session_body {"authenticated": true, ... "email": "test@reception.local", ...}`

## 5) AC4 - Erreurs controlees avec traces exploitables (request_id + HTTP + reason)

### 5.1 IdP indisponible (fail-closed degrade)

- Scenario runtime: callback force avec code dummy pendant indisponibilite IdP.
- Traces HTTP: `_bmad-output/implementation-artifacts/14-3-oidc-runtime-idp-unavailable.log`
- Trace audit resilience: `_bmad-output/implementation-artifacts/14-3-oidc-runtime-idp-unavailable-audit.log`

Resultat:

- `request_id=req-14-3-idp-unavailable`
- `callback_status=503`
- `reason=oidc_dependency_unavailable`
- `decision=degraded`

### 5.2 Claims mismatch `iss` (fail-closed deny)

- Scenario runtime: `OIDC_ISSUER` volontairement incoherent, puis callback OIDC reel.
- Traces HTTP: `_bmad-output/implementation-artifacts/14-3-oidc-runtime-invalid-iss.log`
- Trace audit resilience: `_bmad-output/implementation-artifacts/14-3-oidc-runtime-invalid-iss-audit.log`

Resultat:

- `request_id=req-14-3-invalid-iss`
- `callback_status=401`
- `reason=invalid_iss`
- `decision=deny`

### 5.3 Claims mismatch `aud` (fail-closed deny)

- Scenario runtime: `OIDC_AUDIENCE` volontairement incoherent, puis callback OIDC reel.
- Traces HTTP: `_bmad-output/implementation-artifacts/14-3-oidc-runtime-invalid-aud.log`
- Trace audit resilience: `_bmad-output/implementation-artifacts/14-3-oidc-runtime-invalid-aud-audit.log`

Resultat:

- `request_id=req-14-3-invalid-aud`
- `callback_status=401`
- `reason=invalid_aud`
- `decision=deny`

## 6) Complements fail-closed et tests cibles

- Tests API cibles executes localement:
  - `python -m pytest "api/tests/routers/test_auth.py" -k "sso_callback_nominal_sets_bff_cookie_and_redirects or sso_callback_returns_503_when_idp_dependency_unavailable or sso_callback_rejects_claims_mismatch or sso_callback_rejects_state_without_browser_binding_cookie"`
- Resultat: PASS (8 tests cibles) avec verification des audits fail-closed sur scenarios claims/idp.

## 7) Reproduction rapide

1. `docker compose up -d --build recyclic keycloak`
2. `docker compose exec recyclic python /tmp/check_recyclique_oidc_runtime.py --request-id req-14-3-nominal-local-idp`
3. (IdP indisponible) `docker compose stop keycloak` puis `docker compose exec recyclic python /tmp/check_recyclique_oidc_runtime.py --dummy-callback --request-id req-14-3-idp-unavailable`
4. Restaurer `keycloak`, puis rejouer invalid_iss / invalid_aud avec overrides runtime et `--request-id` dedie.
