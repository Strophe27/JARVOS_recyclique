# 14.0 - OIDC Gate: preuves techniques cible Paheko

Date: 2026-02-28  
Story source: `14-0-gate-de-faisabilite-oidc-cible-paheko-image-version-environnement`

## 1) Perimetre du gate

- Environnements cibles evalues:
  - `dev-local` (Docker Compose local, actif au moment du gate)
  - `preprod` (non fourni pour ce gate)
  - `prod cible` (non fourni pour ce gate)
- Cible Paheko detectee:
  - Image: `paheko/paheko@sha256:fa2b4a6188802447cc3c43f51d3bac55a73cb203e17e05ed68c8a2d4d29a15ec` (digest epingle)
  - Mode hebergement: Docker Compose local (`jarvos_recyclique`)
- Methode auth actuelle cote RecyClique:
  - BFF OIDC active via variable `OIDC_ENABLED=true` dans `.env`
  - Endpoints verifies: `/v1/auth/sso/start`, `/v1/auth/sso/callback`

## 2) Preflight prerequis minimaux

| Prerequis | Verification | Resultat | Evidence |
|---|---|---|---|
| HTTPS en cible | `OIDC_REDIRECT_URI=http://localhost:8000/...` | Restriction (HTTP local) | `.env` |
| Secrets hors code | `OIDC_CLIENT_SECRET` present en env, non expose en clair dans artefacts | OK | `.env`, `api/config/settings.py` |
| Variables OIDC minimales | `OIDC_ENABLED`, `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI` detectees | OK (dev-local) | `.env`, `api/config/settings.py` |
| Connectivite stack locale | Services `recyclic`, `paheko`, `postgres`, `redis` UP/healthy | OK | `docker compose ps` |
| Image/version Paheko cible | Image epinglee par digest sur la cible `dev-local` | OK (dev-local) | `docker-compose.yml`, `docker image inspect paheko/paheko` |

## 3) Scenarios executes et resultats

### Scenario N1 - Nominal OIDC controle (reproductible)

- Objectif: valider le chemin nominal initiation -> callback -> session BFF ouverte.
- Methode: test automatise de reference avec simulation IdP (controlee, sans secret).
- Commande:
  - `python -m pytest "api/tests/routers/test_auth.py" -k "sso_callback_nominal_sets_bff_cookie_and_redirects or sso_callback_invalid_state_returns_400 or sso_callback_returns_503_when_idp_dependency_unavailable"`
- Resultat:
  - `3 passed, 28 deselected`
  - Le test nominal confirme:
    - redirection OIDC
    - callback valide
    - cookie session HTTP-only pose

### Scenario E1 - Echec controle "state invalide" (fail-closed)

- Objectif: verifier l'echec propre si prerequis de session OIDC manquant/invalide.
- Methode: appel live au callback avec `state=missing`.
- Commande:
  - `curl.exe -s -D - "http://localhost:8000/v1/auth/sso/callback?code=dummy&state=missing" -o -`
- Resultat:
  - `HTTP/1.1 400 Bad Request`
  - body: `{"detail":"Invalid state"}`

### Scenario E2 - Dependance IdP indisponible (degradation explicite)

- Objectif: verifier le comportement deterministe si dependance IdP indisponible.
- Methode: test automatise controle.
- Resultat:
  - dans la commande pytest ci-dessus, test `test_sso_callback_returns_503_when_idp_dependency_unavailable` passe.
  - comportement attendu confirme: `503` + message degrade.

## 4) Signaux techniques minimaux verifies

| Signal | Resultat | Evidence |
|---|---|---|
| Endpoint login OIDC disponible | OK (`302`) | `curl.exe ... /v1/auth/sso/start?next=%2Fadmin` |
| Redirection auth valide | OK (Location `/authorize?...state=...&code_challenge=...`) | entetes HTTP de `/v1/auth/sso/start` |
| Claims essentiels traites (`iss`,`aud`,`exp`,`sub`,`role`,`tenant`) | OK en test nominal controle | `api/tests/routers/test_auth.py` |
| Echec propre prerequis manquant/invalide | OK (`400 Invalid state`) | appel live callback |
| Fuite de secrets dans les preuves | Aucune detectee | artefact present + sorties commandes sanitisees |

## 5) Verdict par environnement cible

| Environnement | Verdict | Decision gate |
|---|---|---|
| dev-local | **Confirme avec restrictions** | Les flux OIDC minimaux sont verifies en test controle + fail-closed live valide; pas de preuve complete avec IdP reel ni TLS bout-en-bout. Image Paheko epinglee par digest sur cet environnement. |
| preprod | **Invalide (preuves absentes)** | Aucun environnement preprod fourni/executable dans ce gate. |
| prod cible | **Invalide (preuves absentes)** | Aucun test execute sur la cible prod. |

## 6) Decision finale gate 14.0

Decision globale: **NO-GO pour generalisation OIDC** tant que les conditions suivantes ne sont pas fermees:

1. Executer le scenario nominal avec IdP reel en HTTPS sur au moins `preprod`.
2. Produire une preuve de callback nominal complete (initiation, callback, session ouverte) hors simulation.
3. Repliquer l'epinglage image/version Paheko sur `preprod` et `prod` avec preuve d'inventaire.
4. Conserver le comportement fail-closed observe (`400/503`) comme garde-fou obligatoire.

## 7) Traçabilite des commandes executees

- `docker compose version` -> `v2.40.3-desktop.1`
- `docker image inspect paheko/paheko --format "{{json .RepoDigests}}"` -> `["paheko/paheko@sha256:fa2b4a6188802447cc3c43f51d3bac55a73cb203e17e05ed68c8a2d4d29a15ec"]`
- `docker image ls paheko/paheko --format "{{.Repository}}:{{.Tag}}|{{.ID}}"` -> `paheko/paheko:latest|69a69419cf93`
- `docker compose config --images` -> `paheko/paheko@sha256:fa2b4a6188802447cc3c43f51d3bac55a73cb203e17e05ed68c8a2d4d29a15ec`, `postgres:16-alpine`, `redis:7-alpine`, `jarvos_recyclique-recyclic`
- `docker compose ps` -> stack locale UP/healthy
- `curl.exe -s -o NUL -w "%{http_code}" "http://localhost:8000/health"` -> `200`
- `curl.exe -s -D - "http://localhost:8000/v1/auth/sso/start?next=%2Fadmin" -o NUL` -> `302 Found`
- `curl.exe -s -D - "http://localhost:8000/v1/auth/sso/callback?code=dummy&state=missing" -o -` -> `400 Bad Request`
- `python -m pytest "api/tests/routers/test_auth.py" -k "...nominal...invalid_state...dependency_unavailable"` -> `3 passed`
