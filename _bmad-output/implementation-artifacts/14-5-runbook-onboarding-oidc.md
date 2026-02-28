# 14-5 - Runbook onboarding IAM/OIDC (RecyClique + Paheko)

Date: 2026-03-01  
Story: `14-5-runbooks-d-exploitation-onboarding-incident-auth-rollback`  
Owners: Exploitation (astreinte), Tech lead IAM, referent securite

## 0) Hygiene secrets (obligatoire avant execution)

- Interdit: passer un secret en litteral CLI (`--password "..."`).
- Autorise: variable d'environnement ephemere (`OIDC_TEST_PASSWORD`) alimentee via prompt ou fichier secret local non versionne.
- Nettoyage obligatoire en fin d'execution: suppression des variables d'environnement sensibles.

Option A - Prompt interactif (PowerShell):

```powershell
$env:OIDC_TEST_USERNAME = "<oidc_user>"
$secure = Read-Host "Mot de passe OIDC" -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$env:OIDC_TEST_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
Remove-Variable secure,bstr
```

Option B - Fichier secret local (`.secrets/oidc_test_password.txt`, gitignore + ACL locale):

```powershell
$env:OIDC_TEST_USERNAME = "<oidc_user>"
$env:OIDC_TEST_PASSWORD = (Get-Content ".secrets/oidc_test_password.txt" -Raw).Trim()
```

## 1) Objectif et principes

- Objectif: mettre en service un environnement OIDC unifie RecyClique + Paheko avec verification explicite et rejouable.
- Principe securite: fail-closed obligatoire (deny-by-default), aucun bypass claims (`iss`, `aud`) autorise.
- Hygiene traces: jamais de secret/token brut dans les artefacts.

## 2) Gouvernance d'exploitation

- Incident Commander (IC): decide GO/NO-GO et rollback.
- Operateur IAM: execute checks IdP/OIDC/claims.
- Operateur plateforme: execute checks Docker/env/health.
- Scribe: journal d'execution (horodatage, commande, verdict, request_id).
- Escalade:
  - Majeur securite (auth bypass, deny non strict) -> IC + referent securite immediat.
  - Incident bloquant > 15 min -> escalation technique niveau 2.

## 3) Preconditions d'entree

- Stories 14.1 -> 14.4 en `done`.
- Gate 14.0 pris en compte: la generalisation hors environnement local reste NO-GO tant que la preuve nominale IdP reel en HTTPS (preprod/prod) n'est pas disponible.
- Secrets provisionnes hors git (`OIDC_CLIENT_SECRET`, secrets Keycloak, etc.).
- Horloge hote et conteneurs synchronisee (derive <= 30s).
- Endpoints attendus joignables:
  - RecyClique: `http://localhost:8000`
  - Paheko: `http://localhost:8080`
  - IdP (ex. Keycloak): endpoint metadata/health disponible.

## 4) Preflight standard (inclut contraintes gate 14.0)

## 4.1 Inventaire image/version/environnement (14.0)

1. Verifier image Paheko effectivement epinglee (tag ou digest immuable) dans l'environnement cible.
2. Verifier mode hebergement (dev/preprod/prod) et TLS conforme policy.
3. Verifier qu'aucune instruction ne depend d'un prerequis implicite non documente.

Commandes de controle (adapter hote):

```bash
docker compose config --images
docker compose ps
docker image ls paheko/paheko --format "{{.Repository}}:{{.Tag}}|{{.ID}}"
```

Critere succes:
- Version/image cible identifiee sans ambiguite.
- Aucune derive entre inventaire runtime et documentation.

## 4.2 Preflight connectivite et metadata OIDC

```bash
curl.exe -s -o NUL -w "%{http_code}" "http://localhost:8000/health"
curl.exe -s -o NUL -w "%{http_code}" "http://localhost:8000/v1/admin/health"
curl.exe -s -D - "http://localhost:8000/v1/auth/sso/start?next=%2Fadmin" -o NUL
curl.exe -s -o NUL -w "%{http_code}" "http://localhost:8080/admin/login.php"
```

Critere succes:
- `/health` -> `200`
- `/v1/admin/health` -> `200`
- `/v1/auth/sso/start` -> redirection `302` vers IdP.
- `http://localhost:8080/admin/login.php` -> `200` (Paheko disponible avant GO).

## 4.3 Preflight clients, redirect URIs, claims critiques

Checklist:
- Client RecyClique OIDC present et actif.
- Client Paheko OIDC present et actif.
- Redirect URIs exactes (pas de wildcard permissif).
- Claims critiques attendus disponibles: `sub`, `email`, `iss`, `aud`.
- Compte de test OIDC actif et email verifie.

Commande de controle deny (fail-closed):

```bash
python -m pytest "api/tests/routers/test_auth.py" -k "sso_callback_rejects_claims_mismatch or sso_callback_returns_503_when_idp_dependency_unavailable" -vv
```

Critere succes:
- Tests deny PASS.
- Aucun fallback permissif detecte.

## 5) Sequence go-live et gate GO/NO-GO

## 5.1 Sequence go-live

1. Preflight 4.1 -> 4.3 complet et journalise.
2. Charger les secrets runtime via section 0 (sans secret en argument CLI litteral).
3. Verification nominal RecyClique:

```bash
python "paheko-config/check_recyclique_oidc_runtime.py" --username "$env:OIDC_TEST_USERNAME" --request-id "rbk-14-5-onboarding-nominal-recyclique"
```

4. Verification nominal Paheko:

```bash
python "paheko-config/check_paheko_oidc_nominal.py" --username "$env:OIDC_TEST_USERNAME" --expect nominal
```

5. Verification continuite cross-plateforme:

```bash
python "paheko-config/check_cross_platform_session_continuity.py" --username "$env:OIDC_TEST_USERNAME" --expected-email "<email_user>" --request-id "rbk-14-5-onboarding-continuite"
```

6. Validation finale IC + scribe + referent securite.

## 5.2 Decision GO/NO-GO

GO seulement si:
- Tous les checks preflight passent.
- Nominal RecyClique PASS.
- Nominal Paheko PASS (page protegee, pas retour login).
- Continuite session PASS.
- Deny fail-closed PASS (`invalid_iss`, `invalid_aud`, `idp_unavailable`).

NO-GO si au moins un point critique KO.

## 6) Checks post-onboarding et seuils de succes

Commandes:

```bash
curl.exe -s -o NUL -w "%{http_code}" "http://localhost:8000/health"
curl.exe -s -o NUL -w "%{http_code}" "http://localhost:8000/v1/admin/health"
curl.exe -s "http://localhost:8000/v1/auth/session"
```

Seuils:
- `/health` et `/v1/admin/health` = `200`.
- `/v1/auth/session` renvoie `authenticated: true` pour l'utilisateur de test post-login.
- 0 secret/token en clair dans le journal.

## 7) Journal d'execution minimum (template)

- Horodatage UTC.
- Operateur.
- Commande (sanitisee).
- request_id (si applicable).
- HTTP code / verdict.
- Action suivante.

Exemple:
- `2026-03-01T10:12:00Z | ops-iam | check_recyclique_oidc_runtime | request_id=rbk-14-5-onboarding-nominal-recyclique | PASS`

## 8) Conditions de sortie

- Runbook execute avec verdict GO/NO-GO explicite.
- Artefact de preuve mis a jour: `14-5-rehearsal-preuves.md`.
- Si environnement cible != local: exiger la fermeture explicite des conditions bloquantes du gate 14.0 avant declaration GO.
- Si NO-GO: ouvrir incident et basculer vers runbook incident/rollback.
- Hygiene secrets: supprimer les variables ephemeres apres usage (`Remove-Item Env:OIDC_TEST_PASSWORD`).
