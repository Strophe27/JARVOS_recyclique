# 14-1 - Inventaire de configuration IdP/clients (sanitise)

Date: 2026-02-28  
Story source: `14-1-provisionner-idp-commun-dev-prod-et-clients-oidc`

## 1) Inventaire IdP par environnement

| Environnement | Issuer cible | Realm/Tenant | DNS | TLS | Statut metadata | Statut 14.1 |
|---|---|---|---|---|---|---|
| dev | `https://idp-dev.example.org/realms/recyclique-dev` | `recyclique-dev` | `idp-dev.example.org` | HTTPS de dev (auto-signe acceptable) | valide en dev/local | valide maintenant |
| preprod | `https://idp-preprod.example.org/realms/recyclique-preprod` | `recyclique-preprod` | `idp-preprod.example.org` | TLS de confiance requis | a valider | valide plus tard |
| prod | `https://idp-prod.example.org/realms/recyclique-prod` | `recyclique-prod` | `idp-prod.example.org` | TLS de confiance requis | a valider | valide plus tard |

## 2) Endpoints OIDC attendus

Pour chaque environnement, la metadata `.well-known/openid-configuration` doit exposer:

- `issuer`
- `authorization_endpoint`
- `token_endpoint`
- `jwks_uri`
- `end_session_endpoint`

## 3) Clients OIDC attendus

| Client | Env | Flow | PKCE | Redirect URI | Post-logout URI | Scopes | Statut 14.1 |
|---|---|---|---|---|---|---|---|
| `recyclique-bff-dev` | dev | authorization_code | S256 obligatoire | `https://recyclique-dev.example.org/v1/auth/sso/callback` | `https://recyclique-dev.example.org/` | `openid profile email` | valide maintenant |
| `recyclique-bff-preprod` | preprod | authorization_code | S256 obligatoire | `https://recyclique-preprod.example.org/v1/auth/sso/callback` | `https://recyclique-preprod.example.org/` | `openid profile email` | valide plus tard |
| `recyclique-bff-prod` | prod | authorization_code | S256 obligatoire | `https://recyclique-prod.example.org/v1/auth/sso/callback` | `https://recyclique-prod.example.org/` | `openid profile email` | valide plus tard |
| `paheko-web-dev` | dev | authorization_code | selon support client | `https://paheko-dev.example.org/auth/oidc/callback` | `https://paheko-dev.example.org/` | `openid profile email` | valide maintenant |
| `paheko-web-preprod` | preprod | authorization_code | selon support client | `https://paheko-preprod.example.org/auth/oidc/callback` | `https://paheko-preprod.example.org/` | `openid profile email` | valide plus tard |
| `paheko-web-prod` | prod | authorization_code | selon support client | `https://paheko-prod.example.org/auth/oidc/callback` | `https://paheko-prod.example.org/` | `openid profile email` | valide plus tard |

## 4) Claims IAM minimums

| Claim | Obligation | Usage |
|---|---|---|
| `sub` | obligatoire | identifiant federatif stable |
| `role` | obligatoire | autorisation metier RecyClique |
| `tenant` | obligatoire | segmentation structure |
| `iss` | obligatoire | validation emetteur |
| `aud` | obligatoire | validation cible client |
| `exp` | obligatoire | expiration session/token |

## 5) Variables runtime (cles sanitisees)

| Cle | Dev | Preprod | Prod | Secret |
|---|---|---|---|---|
| `OIDC_ENABLED` | `true` | `true` | `true` | non |
| `OIDC_ISSUER` | renseigne | renseigne | renseigne | non |
| `OIDC_CLIENT_ID` | renseigne | renseigne | renseigne | non |
| `OIDC_CLIENT_SECRET` | injecte runtime | injecte runtime | injecte runtime | oui |
| `OIDC_REDIRECT_URI` | renseigne | renseigne | renseigne | non |
| `OIDC_AUDIENCE` | optionnel | optionnel | optionnel | non |
| `OIDC_END_SESSION_ENDPOINT` | renseigne/derive | renseigne/derive | renseigne/derive | non |
| `AUTH_SESSION_COOKIE_SECURE` | `false/true` selon TLS | `true` | `true` | non |

## 6) Gestion des secrets et rotation

- Stockage:
  - dev/local: stockage hors code via `.env` local non versionne ou equivalent provisoire acceptable.
  - preprod/prod: secret manager (ou equivalent) obligatoire pour secrets OIDC et credentials IdP.
- Rotation minimum:
  - tous les 90 jours.
  - immediate apres incident securite.
- Gouvernance:
  - lecture: roles ops secures nominativement autorises.
  - rotation: binome DevOps/SecOps avec trace datee.
- Trace obligatoire:
  - horodatage
  - porteur
  - environnement
  - identifiant de lot (sans secret)

## 7) Preuves a produire (sanitisees)

- Preuve metadata OIDC dev/local (executee le `2026-02-28`, sanitisee):

```json
{
  "issuer": "https://idp-dev.example.org/realms/recyclique-dev",
  "authorization_endpoint": "https://idp-dev.example.org/realms/recyclique-dev/protocol/openid-connect/auth",
  "token_endpoint": "https://idp-dev.example.org/realms/recyclique-dev/protocol/openid-connect/token",
  "jwks_uri": "https://idp-dev.example.org/realms/recyclique-dev/protocol/openid-connect/certs",
  "end_session_endpoint": "https://idp-dev.example.org/realms/recyclique-dev/protocol/openid-connect/logout"
}
```

- Export metadata OIDC (sans jetons, sans secrets)
- Tableau de correspondance clients/redirect URIs
- Verification des claims minimums
- Journal rotation sans valeurs secretes

## 8) Trigger de reprise gate 14-0

Etat: non-bloquant pour 14.1 dev/local; en attente des preuves preprod/prod.

A l'activation:
1. Executer le nominal complet `/v1/auth/sso/start` -> callback -> `/v1/auth/session`.
2. Executer les checks fail-closed (`400` state invalide, `503` IdP indisponible).
3. Mettre a jour les artefacts:
   - `_bmad-output/implementation-artifacts/14-0-oidc-gate-preuves.md`
   - `_bmad-output/implementation-artifacts/14-0-oidc-gate-runbook.md`

## 9) Valide plus tard en preprod/prod (preuves attendues)

- Metadata OIDC preprod/prod capturees et sanitisees.
- Coherence `issuer`/`aud` confirmee pour chaque client preprod/prod.
- Rotation de secret executee au moins une fois en preprod (trace sanitisee).
- Replay gate 14-0 nominal + fail-closed avec evidences exploitables.
