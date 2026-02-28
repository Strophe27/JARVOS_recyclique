# 14-5 - Runbook incident auth fail-closed

Date: 2026-03-01  
Story: `14-5-runbooks-d-exploitation-onboarding-incident-auth-rollback`  
Scope: incidents OIDC RecyClique + Paheko, sans bypass permissif

## 0) Hygiene secrets runtime

- Interdit: secret en litteral dans la CLI (`--password "..."`).
- Standard runbook: charger `OIDC_TEST_USERNAME` et `OIDC_TEST_PASSWORD` via prompt interactif ou fichier secret local non versionne, puis effacer `OIDC_TEST_PASSWORD` en fin d'intervention.
- Les scripts de verification exploitent `OIDC_TEST_PASSWORD` si `--password` est omis.

## 1) Regles non negociables

- Interdit: desactiver verification `iss`/`aud`.
- Interdit: fallback permissif "temporaire" non approuve.
- Interdit: exposer secrets, id_token, client secret dans les traces.
- Obligatoire: tracer `request_id`, endpoint, code HTTP, motif.

## 2) Triage guide par symptome

| Symptom | Causes probables | Verification prioritaire | Action immediate |
|---|---|---|---|
| Login KO (RecyClique) | IdP down, secret invalide, clocks desynchronisees | `/health`, `/v1/admin/health`, logs auth BFF, test `idp_unavailable` | Confinement (bloquer ouverture), escalade IAM |
| Callback KO | `state_invalid`, callback URL mismatch, cookie/session perdue | logs callback, query params `state/code`, cookie session | Isoler la release/config fautive, rollback config |
| Session absente apres callback | claims mismatch, mapping user absent, cookie non persiste | `/v1/auth/session`, logs deny, mapping user | Refus controle, corriger mapping/config |
| Deny inattendu | `invalid_iss`, `invalid_aud`, config client drift | logs fail-closed, metadata IdP/client settings | Conserver deny, corriger source de derive |
| Paheko login boucle | mapping email, patch local absent, config Paheko OIDC incoherente | trace callback Paheko, cookie `pko`, script nominal Paheko | Evaluer hotfix local encadre ou rollback patch |

## 3) Arbre de decision operable (cas critiques)

1. Capturer contexte:
   - `request_id`
   - code HTTP final
   - endpoint impacte
   - timestamp UTC
2. Identifier le cas:
   - `invalid_iss`
   - `invalid_aud`
   - `idp_unavailable`
   - `state_invalid`
   - mismatch mapping utilisateur
3. Appliquer branche correspondante.

### 3.1 Branche `invalid_iss` / `invalid_aud`

Observations obligatoires:
- logs auth avec motif exact
- config client/issuer active
- metadata OIDC actuelle

Verification:

```bash
python -m pytest "api/tests/routers/test_auth.py" -k "sso_callback_rejects_claims_mismatch" -vv
```

Confinement:
- garder deny actif (aucune exception locale).
- suspendre go-live si incident en onboarding.

### 3.2 Branche `idp_unavailable`

Observations obligatoires:
- indisponibilite IdP confirmee (health ou timeout reseau)
- logs 503 cote callback

Verification runtime/logs (prioritaire en astreinte):

```bash
docker compose ps
curl.exe -s -o NUL -w "%{http_code}" "http://localhost:8000/v1/auth/sso/start?next=%2Fadmin"
docker compose logs recyclic --since 15m | rg "idp|oidc|503|timeout|unavailable"
docker compose logs paheko --since 15m | rg "oidc|error|timeout|callback"
```

Confinement:
- basculer systeme en mode attente authentification.
- communication incident immediate aux equipes terrain.

Verification complementaire (non prioritaire, environnement de test seulement):

```bash
python -m pytest "api/tests/routers/test_auth.py" -k "sso_callback_returns_503_when_idp_dependency_unavailable" -vv
```

### 3.3 Branche `state_invalid`

Observations obligatoires:
- correlation start -> callback absente ou invalide
- cookie/session state introuvable

Verification:

```bash
curl.exe -s -D - "http://localhost:8000/v1/auth/sso/callback?code=dummy&state=missing" -o -
```

Confinement:
- invalider tentative en cours.
- verifier reverse proxy/cookies/same-site avant reprise.

### 3.4 Branche mismatch mapping utilisateur

Observations obligatoires:
- user OIDC recu (`sub`/`email`) vs user attendu local
- existence mapping local (RecyClique / Paheko)

Verification:
- executer scripts nominaux avec utilisateur de reference.
- valider mapping email Paheko sans contourner controle identite.

Confinement:
- verrouiller acces utilisateur incoherent.
- corriger mapping puis relancer tests nominaux.

## 4) Procedures de reprise (sans bypass permissif)

Ordre de reprise:
1. Corriger config OIDC/client/redirect.
2. Redemarrer service cible si necessaire.
3. Rejouer scenario nominal RecyClique.
4. Rejouer scenario nominal Paheko.
5. Rejouer continuity cross-plateforme.
6. Rejouer deny fail-closed.

Commandes de reprise:

```bash
python "paheko-config/check_recyclique_oidc_runtime.py" --username "$env:OIDC_TEST_USERNAME" --request-id "rbk-14-5-incident-recovery-recyclique"
python "paheko-config/check_paheko_oidc_nominal.py" --username "$env:OIDC_TEST_USERNAME" --expect nominal
python "paheko-config/check_cross_platform_session_continuity.py" --username "$env:OIDC_TEST_USERNAME" --expected-email "<email_user>" --request-id "rbk-14-5-incident-recovery-continuite"
python -m pytest "api/tests/routers/test_auth.py" -k "sso_callback_returns_503_when_idp_dependency_unavailable or sso_callback_rejects_claims_mismatch" -vv
```

## 5) Communication et journal incident

Checklist communication:
- ouverture incident (gravite, impact, scope).
- point toutes les 15 min tant que P1/P2.
- message de retour a la normale avec preuve.

Journal minimal:
- `incident_id`
- timeline UTC
- request_ids relies
- commandes executees (sanitisees)
- decision IC (contain / rollback / fix-forward)

## 6) Criteres retour a la normale

- nominals RecyClique + Paheko PASS.
- continuite session PASS.
- deny fail-closed PASS.
- plus aucun symptome actif sur 2 checks consecutifs.
- journal incident complet et sanitise.
