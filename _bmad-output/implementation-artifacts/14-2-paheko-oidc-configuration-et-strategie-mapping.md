# 14-2 - Configuration Paheko OIDC et strategie de mapping utilisateur

Date: 2026-02-28  
Story source: `14-2-configurer-paheko-oidc-et-strategie-de-mapping-utilisateur`

## 1) Portee de validation 14.2

### Valide maintenant (dev/local)

- [x] Configuration client OIDC `paheko-web-dev` alignee avec l'IdP 14.1.
- [x] Strategie de mapping utilisateur explicite et deterministe (pas de fallback implicite).
- [x] Regles fail-closed documentees pour cas ambigus/incomplets.
- [x] Claims critiques IAM verifies et traces sanitisees en preuve.

### Valide plus tard (preprod/prod)

- [ ] Rejouer le nominal OIDC sur cibles preprod/prod.
- [ ] Rejouer les rejets critiques et collecter les preuves runtime cible.
- [ ] Rejouer la reprise gate `14-0` complete avant generalisation.

## 2) Parametres OIDC Paheko attendus (dev/local)

| Cle | Valeur attendue (sanitisee) | Commentaire |
|---|---|---|
| `oidc_client_url` | via `PAHEKO_OIDC_CLIENT_URL` | Aucune valeur par defaut en code (fail-closed) |
| `client_id` | via `PAHEKO_OIDC_CLIENT_ID` | Aucune valeur par defaut en code (fail-closed) |
| `redirect_uri` | `http://localhost:8080/admin/login.php?oidc` | Callback exact impose en HITL |
| `match_email` | via `PAHEKO_OIDC_CLIENT_MATCH_EMAIL` -> `OIDC_CLIENT_MATCH_EMAIL` | Mapping email pilote au runtime (bool strict) |
| `config_path` | `/var/www/paheko/config.local.php` | Activation OIDC par fichier de config |
| `response_type` | `code` | Authorization Code |

### Configuration locale effectivement provisionnee (reprise HITL)

- IdP local: Keycloak Docker `http://localhost:8081`
- Realm: `recyclique-dev`
- Discovery: `http://localhost:8081/realms/recyclique-dev/.well-known/openid-configuration`
- Client: `paheko-web-dev`
- Secret client: injecte via env `PAHEKO_OIDC_CLIENT_SECRET` (non expose)
- Callback exact: `http://localhost:8080/admin/login.php?oidc`
- Activation Paheko: `/var/www/paheko/config.local.php`

## 3) Strategie de mapping utilisateur retenue

Decision: **matching principal par email** (`OIDC_CLIENT_MATCH_EMAIL`) avec controle strict et sans fallback implicite.

### Regle de matching

1. `email` est l'identifiant de mapping actif cote Paheko (compte local et utilisateur IdP doivent partager le meme email).
2. Si `email` est absent, vide ou non resolu: **refus immediat** (fail-closed).
3. Les cas ambigus (`email` duplique, compte local introuvable, claims critiques invalides) sont refuses sans fallback silencieux.
4. Toute creation implicite de compte est interdite en 14.2.

### Rationale

- La methode HITL impose le mapping par email, mais la valeur est maintenant centralisee en env (`PAHEKO_OIDC_CLIENT_MATCH_EMAIL`) au lieu d'un hardcode.
- Le mapping email est compatible avec le pre-requis operationnel 14.2 (membre Paheko + utilisateur IdP sur la meme adresse).
- Le risque de collision email est traite en fail-closed et doit rester trace.

## 3bis) Jeu de test standard provisionne

- Utilisateur IdP:
  - username: `oidc.test`
  - email: `oidc.test@local.dev`
- Membre Paheko:
  - email: `oidc.test@local.dev`
- Resultat attendu AC1:
  - initiation `login.php?oidc` -> redirection IdP -> callback -> `/admin/`
  - session ouverte et membre reconnu par email

## 4) Cas ambigus et comportement obligatoire (fail-closed)

| Cas | Regle | Code raison (log) |
|---|---|---|
| `email` manquant | Refus authentification | `missing_email` |
| Collision `email` (>=2 comptes) | Refus authentification | `email_collision` |
| Compte local introuvable | Refus authentification | `account_not_found` |
| Claims critiques invalides (`iss`, `aud`, `exp`) | Refus authentification | `invalid_claims` |

## 5) Claims OIDC minimaux controles

Claims obligatoires pour ouvrir une session:

- `iss` (egal a l'issuer configure)
- `aud` (contient `paheko-web-dev`)
- `exp` (strictement dans le futur)
- `email` (identifiant de mapping actif)

Claims conditionnels (selon usage IAM):

- `sub` (tracabilite federative complementaire)
- `role` et `tenant` si le controle d'acces Paheko s'appuie dessus

## 6) Logging, securite et operabilite

- Correlation obligatoire par `request_id` sur succes/refus.
- Traces autorisees: motif, code raison, environnement, horodatage.
- Traces interdites: token brut, secret client, payload complet non sanitise.
- Secrets OIDC hors depot:
  - dev/local: `.env` local non versionne acceptable;
  - preprod/prod: secret manager obligatoire.
- Rotation:
  - secret client OIDC tous les 90 jours minimum;
  - rotation immediate apres incident.

## 6bis) Mitigation A appliquee (scope OAuth)

- Scope exact demande par Paheko capture:
  - `openid offline_access phone basic acr profile email address microprofile-jwt roles organization service_account web-origins`
- Ajustement Keycloak applique:
  - activation `serviceAccountsEnabled=true` sur le client `paheko-web-dev`;
  - scopes realm/client verifies pour couvrir la demande Paheko.
- Resultat:
  - erreur `invalid_scope` levee;
  - callback OAuth nominal retourne bien vers `http://localhost:8080/admin/login.php?oidc` avec `code` et `state`.

## 7) Mini-checklist preflight/post-config (14.2)

### Preflight

- [x] Metadata IdP disponibles (`issuer`, `auth`, `token`, `jwks`, `logout`).
- [x] Client `paheko-web-dev` declare avec URIs exactes.
- [x] Secret client injecte hors depot.
- [x] Horloge systeme synchronisee (eviter rejets `exp`).
- [x] Activation Paheko OIDC via `/var/www/paheko/config.local.php`.
- [x] Callback exact configure: `http://localhost:8080/admin/login.php?oidc`.

### Post-config

- [x] Nominal dev/local execute (voir preuves 14.2).
- [x] Deux rejets critiques minimum verifies (claims invalides, mapping ambigu).
- [x] Logs consultables avec `request_id` sans fuite sensible.
- [x] Restes a rejouer preprod/prod explicitement listes (gate `14-0` non leve).

## 8) Restes a rejouer avant generalisation

- Rejouer nominal + rejets sur preprod/prod reel HTTPS.
- Mettre a jour:
  - `_bmad-output/implementation-artifacts/14-0-oidc-gate-preuves.md`
  - `_bmad-output/implementation-artifacts/14-0-oidc-gate-runbook.md`
- Maintenir le statut `NO-GO provisoire` de 14.0 tant que ces preuves n'existent pas.
