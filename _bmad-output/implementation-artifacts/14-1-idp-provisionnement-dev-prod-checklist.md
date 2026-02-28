# 14-1 - Checklist de provisionnement IdP commun dev/prod

Date: 2026-02-28  
Story source: `14-1-provisionner-idp-commun-dev-prod-et-clients-oidc`

## Statut de validation par environnement

### Valide maintenant (dev/local)

- [x] IdP operationnel en dev/local.
- [x] HTTPS de dev en place (certificat auto-signe acceptable).
- [x] Metadata OIDC dev/local verifiees (`issuer`, `authorization_endpoint`, `token_endpoint`, `jwks_uri`, `end_session_endpoint`).
- [x] Clients OIDC `recyclique-bff-dev` et `paheko-web-dev` declares.
- [x] Methode de gestion/rotation des secrets documentee sans fuite de secret.

### Valide plus tard en preprod/prod

- [ ] IdP operationnel en preprod/prod avec TLS de confiance.
- [ ] Verification metadata OIDC + coherence `issuer` sur preprod/prod.
- [ ] Declaration et verification clients OIDC preprod/prod.
- [ ] Replay gate 14-0 nominal + fail-closed avec preuves sanitisees.

## 1) Topologie cible et conventions

- IdP cible: realm commun IAM avec variantes d'environnement
  - `recyclique-dev`
  - `recyclique-preprod`
  - `recyclique-prod`
- Clients OIDC:
  - `recyclique-bff-<env>`
  - `paheko-web-<env>`
- Naming endpoints:
  - `https://idp-<env>.example.org/realms/recyclique-<env>`
  - `https://recyclique-<env>.example.org`
  - `https://paheko-<env>.example.org`

## 2) Prerequis infra obligatoires

- [x] DNS resolvable pour `idp-dev.example.org` (dev/local).
- [x] TLS disponible pour dev/local (auto-signe acceptable).
- [x] Connectivite sortante RecyClique -> IdP en dev/local (authorize/token/jwks/end_session).
- [x] Horloges synchronisees en dev/local (NTP, derive max <= 60s).
- [x] Methode provisoire de stockage secret hors code (fichier `.env` local non versionne ou equivalent) documentee pour dev/local.
- [ ] DNS resolvable pour `idp-preprod.example.org` et `idp-prod.example.org`.
- [ ] TLS de confiance valide pour preprod/prod.
- [ ] Secret manager/canal securise disponible pour preprod/prod:
  - credentials admin IdP
  - `OIDC_CLIENT_SECRET` RecyClique
  - secret client Paheko

## 3) Garde-fous securite minimaux

- [ ] Comptes techniques dedies (pas de compte personnel) pour l'administration IdP.
- [ ] MFA obligatoire sur les comptes admin IdP.
- [ ] Principe de moindre privilege applique aux administrateurs et automation.
- [ ] Journaux de provisionnement sans fuite de secret.
- [ ] Rotation documentee (90 jours max, ou immediate apres incident).

## 4) Provisionnement IdP par environnement

### Dev

- [x] Creer/mettre a jour le realm `recyclique-dev`.
- [x] Configurer metadata OIDC standard.
- [x] Declarer clients `recyclique-bff-dev` et `paheko-web-dev`.
- [x] Configurer scopes/claims IAM requis (`sub`, `role`, `tenant`, `exp`, `aud`, `iss`).
- [x] Verifier les endpoints metadata:

```bash
curl -fsS "https://idp-dev.example.org/realms/recyclique-dev/.well-known/openid-configuration"
```

#### Preuve technique dev/local (sanitisee, verifiable)

- Date d'execution: `2026-02-28`
- Commande de verification structurelle (rejouable):

```bash
curl -fsS "https://idp-dev.example.org/realms/recyclique-dev/.well-known/openid-configuration" \
  | jq '{issuer, authorization_endpoint, token_endpoint, jwks_uri, end_session_endpoint}'
```

- Extrait de sortie sanitisee constatee:

```json
{
  "issuer": "https://idp-dev.example.org/realms/recyclique-dev",
  "authorization_endpoint": "https://idp-dev.example.org/realms/recyclique-dev/protocol/openid-connect/auth",
  "token_endpoint": "https://idp-dev.example.org/realms/recyclique-dev/protocol/openid-connect/token",
  "jwks_uri": "https://idp-dev.example.org/realms/recyclique-dev/protocol/openid-connect/certs",
  "end_session_endpoint": "https://idp-dev.example.org/realms/recyclique-dev/protocol/openid-connect/logout"
}
```

### Preprod/Prod

- [ ] Repliquer le meme modele sur `recyclique-preprod` et `recyclique-prod`.
- [ ] Verifier `issuer` strictement coherent avec la cible.
- [ ] Verifier endpoints metadata:

```bash
curl -fsS "https://idp-preprod.example.org/realms/recyclique-preprod/.well-known/openid-configuration"
curl -fsS "https://idp-prod.example.org/realms/recyclique-prod/.well-known/openid-configuration"
```

## 5) Configuration clients OIDC

### RecyClique BFF (Authorization Code + PKCE)

- [x] Dev/local (`recyclique-bff-dev`):
  - `client_id`: `recyclique-bff-dev`
  - grant type: `authorization_code` (+ `refresh_token` si active cote IdP)
  - PKCE obligatoire (`S256`)
  - redirect URI: `https://recyclique-dev.example.org/v1/auth/sso/callback`
  - post logout URI: `https://recyclique-dev.example.org/`
  - scopes: `openid profile email`
- [ ] Preprod/prod (`recyclique-bff-preprod`, `recyclique-bff-prod`):
  - meme configuration a decliner avec les URIs `preprod`/`prod`

### Paheko

- [x] Dev/local (`paheko-web-dev`):
  - `client_id`: `paheko-web-dev`
  - redirect URI: `https://paheko-dev.example.org/auth/oidc/callback`
  - post-logout URI: `https://paheko-dev.example.org/`
  - scopes minimaux: `openid profile email`
  - claims IAM valides selon matrice Epic 12
- [ ] Preprod/prod (`paheko-web-preprod`, `paheko-web-prod`):
  - redirect URI attendue: `https://paheko-<env>.example.org/auth/oidc/callback`
  - post-logout URI attendue: `https://paheko-<env>.example.org/`
  - scopes/claims a valider sur cibles reelles

## 6) Variables runtime RecyClique (hors depot)

- [x] Dev/local configure:
  - `OIDC_ENABLED=true`
  - `OIDC_ISSUER=https://idp-dev.example.org/realms/recyclique-dev`
  - `OIDC_CLIENT_ID=recyclique-bff-dev`
  - `OIDC_CLIENT_SECRET` injecte hors code (mode dev/local)
  - `OIDC_REDIRECT_URI=https://recyclique-dev.example.org/v1/auth/sso/callback`
  - `OIDC_END_SESSION_ENDPOINT` present (ou derive de metadata)
- [ ] Preprod/prod a finaliser:
  - `OIDC_CLIENT_SECRET` via secret manager obligatoire
  - `AUTH_SESSION_COOKIE_SECURE=true` en HTTPS reel
  - parite complete des variables sur les cibles reelles

## 7) Validation post-provisionnement

### Metadata

- [x] Dev/local: `issuer`, `authorization_endpoint`, `token_endpoint`, `jwks_uri`, `end_session_endpoint` accessibles.
- [ ] Preprod/prod: verification complete des memes endpoints a rejouer.

### Hygiene securite

- [x] Aucune valeur sensible dans les artefacts 14.1.
- [ ] Aucune valeur sensible dans logs applicatifs.
- [x] Inventaire de configuration publie en version sanitisee.

## 8) Ecarts temporaires acceptes et convergence

- Ecart temporaire accepte: `dev` peut utiliser certificats non publics pour test interne.
- Non acceptable en preprod/prod: certificats auto-signes non geres, cookie non secure, redirect URI non HTTPS.
- Plan de convergence:
  1. aligner TLS de `dev` vers une chaine de confiance de test.
  2. verifier parite des claims/scopes entre `dev` et `preprod`.
  3. figer les clients `prod` avant bascule generale OIDC.

## 9) Etapes explicites de reprise gate 14-0

Des qu'un environnement OIDC HTTPS reel est disponible (au moins preprod/equivalent):

- [ ] Rejouer `/v1/auth/sso/start` -> callback -> `/v1/auth/session` avec preuves sanitisees.
- [ ] Rejouer fail-closed `400` state invalide.
- [ ] Rejouer fail-closed `503` dependance IdP indisponible.
- [ ] Mettre a jour:
  - `_bmad-output/implementation-artifacts/14-0-oidc-gate-preuves.md`
  - `_bmad-output/implementation-artifacts/14-0-oidc-gate-runbook.md`
- [ ] Repasser la verification QA gate 14-0 avant generalisation OIDC.

## Preuves attendues plus tard en preprod/prod

- Export sanitise `.well-known/openid-configuration` pour `preprod` et `prod`.
- Captures/config sanitisee des clients `recyclique-bff-preprod|prod` et `paheko-web-preprod|prod`.
- Traces sanitisees du replay gate 14-0 nominal + fail-closed.
