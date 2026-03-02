# Story 17-HF-2 — Cookie session sur login legacy (AT-004)

**Epic:** epic-17 (vague Hotfix Terrain)  
**Source:** 17-HF-plan-hotfix-terrain.md, 17-z-registre-anomalies-terrain.md  
**Statut:** done

## Problème

POST /v1/auth/login retourne un JWT dans le body JSON mais ne pose PAS de cookie `recyclique_session`. Le cookie n'est posé que dans le flux OIDC callback (ligne 316 de auth.py). Résultat : au refresh (F5) ou nouvel onglet, GET /v1/auth/session ne trouve pas de cookie → session perdue.

## Objectif

Dans l'endpoint POST /v1/auth/login, après authentification réussie, créer une session BFF (`create_bff_session`) et poser le cookie `recyclique_session` (httponly, samesite) dans la Response — exactement comme le fait le flux OIDC callback. Le body JSON (access_token) continue d'être retourné pour compatibilité.

## Code existant confirmé

- `api/routers/v1/auth.py` lignes 117-174 : endpoint login, retourne `LoginResponse` avec access_token mais ne pose PAS de cookie.
- `api/routers/v1/auth.py` lignes 314-325 : flux OIDC callback — `create_bff_session(user.id)` puis `response.set_cookie(...)` ; **utiliser ce bloc comme modèle exact**.
- `api/routers/v1/auth.py` : GET `/v1/auth/session` lit le cookie (l.520), appelle `rotate_bff_session` et repose le cookie (l.575-584).
- AuthService : `create_bff_session(user_id) -> tuple[UserSession, str]` ; paramètres cookie dans `auth.settings`.
- Pattern test Set-Cookie : `test_auth.py` l.514-518 (test OIDC) vérifie `headers.get("set-cookie", "")` avec `recyclique_session=` et `httponly`.

## Acceptance Criteria

1. Given un login legacy réussi, When la réponse est reçue, Then un cookie `recyclique_session` httponly est présent dans Set-Cookie.
2. Given un utilisateur connecté via legacy, When il fait F5, Then GET /v1/auth/session retourne `authenticated: true` grâce au cookie.
3. Given un nouvel onglet ouvert sur la même origine, When GET /v1/auth/session est appelé, Then la session est partagée via le cookie.

## Implémentation

### 1. Modifier POST /v1/auth/login (api/routers/v1/auth.py)

- Après authentification réussie (après `auth.create_session`), appeler `session_row, session_token = auth.create_bff_session(user.id)`.
- Au lieu de `return _make_login_response(...)`, construire une réponse avec cookie :
  - `login_response = _make_login_response(auth, user, access_token, refresh_token, db)`
  - Créer `JSONResponse` (from `fastapi.responses`) avec `content=login_response.model_dump(mode="json")` pour le body (compatibilité JWT).
  - Appeler `response.set_cookie(...)` avec les mêmes paramètres que OIDC callback (l.316-324) : `key`, `value=session_token`, `httponly`, `secure`, `samesite`, `max_age`, `expires`, `path="/"`.
  - Retourner cette response. Adapter le décorateur : `response_model=None` (ou retirer) car on retourne une Response, pas un LoginResponse direct.
- Conserver l'appel à `create_session` pour le flux refresh token existant.

### 2. Tests obligatoires (api/tests/routers/test_auth.py)

- **Test 1** : POST `/v1/auth/login` avec identifiants valides → `assert "recyclique_session=" in resp.headers.get("set-cookie", "").lower()` et `assert "httponly" in resp.headers.get("set-cookie", "").lower()` (même pattern que test OIDC l.514-518).
- **Test 2** : `client.post("/v1/auth/login", json={...})` puis `client.get("/v1/auth/session")` → le TestClient conserve les cookies entre les requêtes ; vérifier `resp.json()["authenticated"] is True`.

## Contraintes

- Scope strict : uniquement le cookie sur login legacy. Pas de modif front.
- Pas de run massif.
- **Ne pas** réinventer : copier le bloc `set_cookie` du callback OIDC (l.316-324) tel quel, en changeant seulement `value=session_token`.

## File List

- api/routers/v1/auth.py (modifié)
- api/tests/routers/test_auth.py (modifié)

## Dev Agent Record

**Implementation Plan (2026-03-02):** Après `auth.create_session`, appel `create_bff_session(user.id)`, construction `JSONResponse` avec body login_response, `set_cookie` avec paramètres identiques au callback OIDC.

**Completion Notes:** Implémentation livrée. POST /v1/auth/login pose désormais le cookie `recyclique_session` (httponly, samesite) en plus du body JSON. Tests `test_login_success_sets_bff_cookie` et `test_login_then_get_session_authenticated` ajoutés. 39/39 tests auth passent.

## Change Log

- 2026-03-02 : Cookie BFF posé sur login legacy (17-HF-2). AT-004 corrigé.
- 2026-03-02 : Code review (bmad-qa) — approved. AC 1-3 validés, 39/39 tests auth passent.

## Senior Developer Review (AI)

**Date:** 2026-03-02

**Validation AC:**
- AC1 (cookie recyclique_session httponly dans Set-Cookie) : IMPLEMENTED — test_login_success_sets_bff_cookie
- AC2 (F5 → GET /session authenticated: true) : IMPLEMENTED — test_login_then_get_session_authenticated
- AC3 (nouvel onglet même origine → session partagée) : IMPLEMENTED — même mécanisme, cookies conservés par TestClient

**Findings:**
- Aucun CRITICAL ou HIGH.
- LOW : paramètre `expires` redondant avec `max_age` (identique au bloc OIDC, cohérent).
- LOW : test hardcodé "recyclique_session" — acceptable, nom stable.

**Résultat:** approved. Implémentation conforme, tests réels, AT-004 marqué corrigé dans registre.

## Preuves obligatoires

- Test pytest : POST `/v1/auth/login` → Set-Cookie contient `recyclique_session` et `httponly` ✅
- Test pytest : POST login puis GET `/v1/auth/session` (même client) → `authenticated: true` ✅

## Mise à jour post-Done

- `_bmad-output/implementation-artifacts/17-z-registre-anomalies-terrain.md` : AT-004 → corrigé
