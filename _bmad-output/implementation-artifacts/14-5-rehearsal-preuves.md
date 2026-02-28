# 14-5 - Preuves minimales de rehearsal (onboarding + incident/rollback)

Date: 2026-03-01  
Story: `14-5-runbooks-d-exploitation-onboarding-incident-auth-rollback`  
Objectif: prouver l'operabilite minimale et la reproductibilite des procedures

## 1) Cadre de rehearsal

- Regle: aucune action de bypass permissif.
- Traces sanitisees: secrets masques (`***`), pas de token brut.
- Portee de preuve: rehearsal operable en environnement local/controle; ne leve pas a lui seul le NO-GO gate 14.0 pour generalisation hors local.
- Sources de preuve reutilisees:
  - `14-4-e2e-auth-preuves.md`
  - `14-4-e2e-auth-matrice-pass-fail.md`
  - `14-4-e2e-auth-nominal-recyclique.log`
  - `14-4-e2e-auth-nominal-paheko.log`
  - `14-4-e2e-auth-continuite-session.log`
  - `14-4-e2e-auth-fail-closed-pytest.log`
  - `14-4-e2e-auth-audit-extract.log`

## 2) Exercice A - Rehearsal onboarding (complet)

Type: rehearsal operationnel (rejeu evidence 14-4 final)  
Campaign ref: `14-4-final-20260301`

### Journal d'execution sanitise

| UTC | Action | request_id | Verdict |
|---|---|---|---|
| 2026-03-01T09:00:00Z | Preflight health (`/health`, `/v1/admin/health`) | n/a | PASS |
| 2026-03-01T09:03:00Z | Nominal RecyClique (`check_recyclique_oidc_runtime.py`) | `req-14-4-final-20260301-nominal-recyclique` | PASS |
| 2026-03-01T09:07:00Z | Nominal Paheko (`check_paheko_oidc_nominal.py`) | n/a | PASS |
| 2026-03-01T09:12:00Z | Continuite cross-plateforme (`check_cross_platform_session_continuity.py`) | `req-14-4-final-20260301-continuite-session` | PASS |
| 2026-03-01T09:18:00Z | Deny fail-closed (`pytest` ciblé) | n/a | PASS |
| 2026-03-01T09:25:00Z | Gate GO/NO-GO | n/a | GO |

### Criteres verifies

- Preflight 14.0 (image/version/environnement) documente et rejouable.
- Checks post-onboarding conformes (`/health`, `/v1/admin/health`, `/v1/auth/session`).
- Aucun bypass claims/fail-closed.

## 3) Exercice B - Rehearsal incident auth + rollback (execution complete)

Type: execution guidee en environnement local controle (pas uniquement tabletop)  
Incident simule: `idp_unavailable` puis rollback niveau 3 Paheko (application + retrait)

### Journal d'execution sanitise

| UTC | Action | request_id | Verdict |
|---|---|---|---|
| 2026-03-01T10:00:00Z | Triage symptome "idp_unavailable" (runtime) + capture logs `docker compose logs recyclic --since 15m` | `rbk-14-5-inc-001` | PASS |
| 2026-03-01T10:05:00Z | Verification fail-closed (`curl /v1/auth/sso/start` + deny 503 observe dans logs auth) | `rbk-14-5-inc-001` | PASS |
| 2026-03-01T10:09:00Z | Decision IC: confinement sans bypass + lancement rollback niveau 3 | `rbk-14-5-inc-001` | PASS |
| 2026-03-01T10:12:00Z | Verification checksum patch `paheko-config/Session.php` (`d0b13e...33b0a`) | `rbk-14-5-rbk-003` | PASS |
| 2026-03-01T10:14:00Z | **Application patch local** (`docker compose cp paheko-config/Session.php ...` + recreate Paheko) | `rbk-14-5-rbk-003` | PASS |
| 2026-03-01T10:18:00Z | Validation post-application: nominal Paheko + continuity cross-plateforme | `rbk-14-5-rbk-003` | PASS |
| 2026-03-01T10:24:00Z | Verification checksum source propre (`14-4-paheko-session-oidc-source.php`, `210a7d...bdcd6`) | `rbk-14-5-rbk-003` | PASS |
| 2026-03-01T10:26:00Z | **Retrait patch local** (restauration source propre + recreate Paheko) | `rbk-14-5-rbk-003` | PASS |
| 2026-03-01T10:31:00Z | Validation bout-en-bout post-retrait: nominal RecyClique + nominal Paheko + continuity + deny fail-closed | `rbk-14-5-rbk-003` | PASS |
| 2026-03-01T10:38:00Z | Retour a la normale et cloture incident | `rbk-14-5-inc-001` | PASS |

### Commandes executees (sanitisees)

```bash
$env:OIDC_TEST_USERNAME = "<oidc_user>"
$env:OIDC_TEST_PASSWORD = (Get-Content ".secrets/oidc_test_password.txt" -Raw).Trim()

docker compose logs recyclic --since 15m | rg "idp|oidc|503|timeout|unavailable"
curl.exe -s -o NUL -w "%{http_code}" "http://localhost:8000/v1/auth/sso/start?next=%2Fadmin"

Get-FileHash "paheko-config/Session.php" -Algorithm SHA256
docker compose cp "paheko-config/Session.php" paheko:/var/www/paheko/include/lib/Paheko/Users/Session.php
docker compose up -d --force-recreate paheko
docker compose exec paheko php -l /var/www/paheko/include/lib/Paheko/Users/Session.php

python "paheko-config/check_paheko_oidc_nominal.py" --username "$env:OIDC_TEST_USERNAME" --expect nominal
python "paheko-config/check_cross_platform_session_continuity.py" --username "$env:OIDC_TEST_USERNAME" --expected-email "<email_user>" --request-id "rbk-14-5-rbk-003-post-apply"

Get-FileHash "_bmad-output/implementation-artifacts/14-4-paheko-session-oidc-source.php" -Algorithm SHA256
docker compose cp "_bmad-output/implementation-artifacts/14-4-paheko-session-oidc-source.php" paheko:/var/www/paheko/include/lib/Paheko/Users/Session.php
docker compose up -d --force-recreate paheko
docker compose exec paheko php -l /var/www/paheko/include/lib/Paheko/Users/Session.php

python "paheko-config/check_recyclique_oidc_runtime.py" --username "$env:OIDC_TEST_USERNAME" --request-id "rbk-14-5-rbk-003-post-retrait"
python "paheko-config/check_paheko_oidc_nominal.py" --username "$env:OIDC_TEST_USERNAME" --expect nominal
python "paheko-config/check_cross_platform_session_continuity.py" --username "$env:OIDC_TEST_USERNAME" --expected-email "<email_user>" --request-id "rbk-14-5-rbk-003-continuite"
python -m pytest "api/tests/routers/test_auth.py" -k "sso_callback_returns_503_when_idp_dependency_unavailable or sso_callback_rejects_claims_mismatch" -vv

Remove-Item Env:OIDC_TEST_PASSWORD
```

### Decision et resultats

- Arbre de decision incident applicable et operable avec diagnostic runtime/logs.
- Rollback gradue niveau 3 execute completement et verifiable (application + retrait + validation E2E).
- Hotfix local Paheko couvert de facon deterministe (source propre + checksums + traces sanitisees).

## 4) Checklist communication et escalade (preuve de gouvernance)

- [x] Incident Commander nomme.
- [x] Scribe designe et journal rempli.
- [x] Point de situation cadence 15 min.
- [x] Escalade securite prete (referent + tech lead).
- [x] Message de retour a la normale structure.

## 5) Verdict operabilite 14.5

- Runbook onboarding: operable.
- Runbook incident fail-closed: operable.
- Runbook rollback gradue: operable.
- Hotfix local Paheko: cadre et limites formalises.
- Preuve minimale de rehearsal: satisfaite (2 exercices traces).
