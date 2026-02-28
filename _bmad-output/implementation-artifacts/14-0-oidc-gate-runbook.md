# 14.0 - Runbook gate OIDC (cible Paheko)

Date: 2026-02-28  
Portee: gate de faisabilite OIDC (pas de generalisation production)

## 1) Preflight

1. Verifier la version/image cible Paheko:
   - `docker compose config --images`
   - Exiger une reference image immutable (`tag` fige ou digest) pour dev/preprod/prod.
   - Exemple valide: `paheko/paheko@sha256:...` (epingle par digest).
2. Verifier l'etat des services:
   - `docker compose ps`
   - Attendu: `recyclic`, `paheko`, `postgres`, `redis` UP.
3. Verifier prerequis OIDC minimum (sans exposer de secrets):
   - `OIDC_ENABLED=true`
   - `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI`
4. Verifier hygiene securite:
   - secrets uniquement via env/secrets manager
   - aucun secret dans logs/artefacts
5. Verifier connectivite applicative:
   - `curl.exe -s -o NUL -w "%{http_code}" "http://localhost:8000/health"` -> attendu `200`

## 2) Test nominal

Objectif: valider initiation OIDC, callback et ouverture de session BFF.

### Option A (controlee, reproductible CI locale)

Commande:

`python -m pytest "api/tests/routers/test_auth.py" -k "sso_callback_nominal_sets_bff_cookie_and_redirects"`

Attendus:

- Redirection de `/v1/auth/sso/start` vers l'endpoint `authorize`.
- Callback nominal -> `302`.
- Cookie `recyclique_session` present et `HttpOnly`.

### Option B (environnement reel preprod/prod cible)

1. Ouvrir `/v1/auth/sso/start?next=%2Fadmin`.
2. Completer login IdP reel.
3. Verifier callback `/v1/auth/sso/callback` et redirection vers `next`.
4. Verifier session ouverte via `/v1/auth/session`.

Attendus:

- Session BFF active.
- Claims essentiels traites: `iss`, `aud`, `exp`, `sub`, `role`, `tenant`.
- Aucun secret en clair dans logs.

## 3) Test echec

### Echec 1 - State invalide (fail-closed)

Commande:

`curl.exe -s -D - "http://localhost:8000/v1/auth/sso/callback?code=dummy&state=missing" -o -`

Attendu:

- `HTTP 400` avec `{"detail":"Invalid state"}`.

### Echec 2 - IdP indisponible

Commande:

`python -m pytest "api/tests/routers/test_auth.py" -k "sso_callback_returns_503_when_idp_dependency_unavailable"`

Attendu:

- `HTTP 503` et message degrade explicite.

## 4) Regle GO/NO-GO

## GO

Tous les points suivants sont vrais:

1. Image/tag Paheko explicitement figes pour l'environnement cible.
2. Test nominal OIDC valide en environnement reel cible (pas uniquement simulation).
3. Test echec state invalide et test IdP indisponible valides.
4. Preuves exploitables et sans secret.
5. HTTPS bout-en-bout actif sur cible (hors exception locale de dev).

## GO avec contraintes

- Les tests controles (simulation IdP) sont valides, mais la preuve nominale IdP reel manque encore sur preprod/prod.
- Decision possible uniquement pour poursuivre les stories preparatoires, pas pour generalisation.

## NO-GO

Un des points suivants est vrai:

- Pas de tag/version Paheko cible.
- Pas de preuve nominale IdP reel sur environnement cible.
- Echec fail-closed non conforme.
- Fuite de secret dans preuves/logs.

## 5) Rollback decisionnel (FR16 fallback)

Si NO-GO ou incident pendant gate:

1. Garder le mode d'authentification actuel operationnel (fallback FR16).
2. Desactiver l'activation OIDC sur environnement impacte.
3. Ouvrir un ticket blocant avec:
   - cause racine
   - environnement impacte
   - preuves techniques
   - action corrective et date cible.
4. Rejouer gate complet apres correction (preflight + nominal + echec).

## 6) Artefacts de sortie obligatoires

- `_bmad-output/implementation-artifacts/14-0-oidc-gate-preuves.md`
- `_bmad-output/implementation-artifacts/14-0-oidc-gate-runbook.md`

Ces deux artefacts sont la base de decision pour l'entree des stories `14.1` et `14.2`.
