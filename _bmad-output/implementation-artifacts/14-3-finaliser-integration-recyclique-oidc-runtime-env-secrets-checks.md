# Story 14.3: Finaliser integration RecyClique OIDC runtime (env, secrets, checks)

Status: done

## Story

En tant qu'equipe backend,
je veux finaliser la configuration runtime OIDC de RecyClique (env/secrets/checks),
afin que le flux BFF de login unifie soit operable en conteneur actif, observable, et strictement fail-closed.

## Acceptance Criteria

1. Etant donne un IdP commun operationnel (14.1) et Paheko OIDC configure (14.2), quand un utilisateur lance le login RecyClique via `/v1/auth/sso/start`, alors le parcours nominal `start -> callback -> session` fonctionne en runtime reel dans le conteneur applicatif actif (pas seulement via fichiers `.env`).
2. Et les variables runtime OIDC critiques sont effectivement chargees dans le conteneur actif (issuer, client_id, redirect_uri, secret, timeouts/fail-closed toggles), avec une preuve explicite de lecture runtime et une preuve explicite de comportement "restart vs recreate" Docker.
3. Et toute erreur OIDC critique est traitee en fail-closed strict: IdP indisponible, `iss` invalide, `aud` invalide, `state` invalide, secret manquant ou configuration incomplete entrainent un refus sans fallback permissif.
4. Et les preuves minimales exigibles sont produites et sanitisees: un scenario nominal reussi + au moins deux erreurs controlees (IdP indisponible et mismatch claims `aud/iss`) avec traces exploitables (request_id, code HTTP, motif non sensible).
5. Et les checks de sante et logs auth permettent le diagnostic d'exploitation sans fuite de secrets (health auth/dependances, logs structures, correlation request_id), avec references de reproduction pour reprise incident.

## Prerequisites & Scope Boundaries

- Prerequis:
  - Epic 12 done (base IAM/BFF).
  - Story 14.1 done (IdP commun provisionne).
  - Story 14.2 done/approved (Paheko OIDC + mapping valide).
  - Story 14.0 toujours gate a rejouer en environnement reel preprod/prod pour generalisation complete.
- Hors scope:
  - Pas de campagne E2E complete cross-plateforme (story 14.4).
  - Pas de runbooks finaux d'exploitation/rollback (story 14.5), hors notes minimales necessaires aux preuves 14.3.
  - Pas de refonte IAM/RBAC: on applique les decisions Epic 12 sans ouvrir de nouvelle convention.

## Tasks / Subtasks

- [x] Task 1 - Finaliser la config runtime OIDC RecyClique (AC: 1, 2, 3)
  - [x] Inventorier les variables OIDC runtime requises cote BFF/auth et supprimer toute valeur implicite permissive.
  - [x] Verifier le chargement effectif des variables dans le process du conteneur actif (preuve runtime), distinct de la simple presence dans `.env` ou `.env.example`.
  - [x] Verifier explicitement le comportement Docker "restart vs recreate" pour les variables OIDC et documenter le resultat.

- [x] Task 2 - Durcir le fail-closed strict sur le flux auth (AC: 1, 3)
  - [x] Confirmer les verifications strictes de claims OIDC (`iss`, `aud`, `exp`, `sub` selon politique en vigueur) avant ouverture de session.
  - [x] Confirmer le refus systematique en cas d'IdP indisponible, config incomplete, mismatch claims, ou etat OAuth invalide.
  - [x] Verifier l'absence de fallback implicite (pas de bypass local, pas de mode permissif silencieux).

- [x] Task 3 - Produire les preuves minimales nominal + erreurs controlees (AC: 1, 4)
  - [x] Capturer une preuve nominale runtime RecyClique login (start -> callback -> session active) en conteneur actif.
  - [x] Capturer une preuve d'erreur controlee "IdP indisponible" avec code attendu et motif fail-closed.
  - [x] Capturer une preuve d'erreur controlee "mismatch claims `aud/iss`" avec refus attendu.
  - [x] Sanitiser les artefacts (pas de token brut, pas de secret, pas de donnees perso sensibles).

- [x] Task 4 - Verifier diagnostics exploitation (health/logs) (AC: 5)
  - [x] Verifier les checks de sante auth/dependances utiles au diagnostic runtime.
  - [x] Verifier les logs structures avec `request_id` sur nominal et erreurs.
  - [x] Ajouter les commandes/references minimales de reproduction incident.

- [x] Task 5 - Tracabilite et handoff vers 14.4/14.5 (AC: 4, 5)
  - [x] Consolider un artefact de preuves 14.3 (nominal + erreurs controlees + restart vs recreate).
  - [x] Lister explicitement ce qui est transfere a 14.4 (E2E non-regression) et 14.5 (runbooks complets).

## Dev Notes

- Objectif 14.3: rendre l'integration OIDC RecyClique exploitable en runtime reel, sans ambiguite de chargement de configuration ni compromis fail-closed.
- Exigence non negociable: verifier les variables OIDC dans le conteneur actif et prouver le comportement Docker "restart vs recreate"; une lecture `.env` seule est insuffisante.
- Les scenarios d'erreur doivent etre des refus attendus et explicites, pas des ecrans gris ni des timeouts non qualifies.
- S'appuyer sur les decisions IAM deja validees en Epic 12/14.2; ne pas introduire une logique parallele d'auth.
- Toutes les preuves doivent etre sanitisees et rejouables.

### Technical Requirements

- Runtime OIDC:
  - Parametres critiques charges via environnement runtime (BFF/auth) et verifiables depuis le conteneur actif.
  - Flux BFF `start -> callback -> session` operationnel dans l'environnement courant.
- Fail-closed:
  - Rejet obligatoire sur `iss`/`aud` invalides, IdP indisponible, config manquante, `state` invalide.
  - Aucun fallback permissif implicite.
- Securite/observabilite:
  - Secrets hors code source.
  - Logs sans fuite sensible, correlation par `request_id`.
  - Checks de sante utiles au diagnostic auth runtime.

### Architecture Compliance

- Respecter `_bmad-output/planning-artifacts/architecture.md`:
  - Authentication & Security (claims, secrets, fail-closed).
  - Infrastructure & Deployment (config env runtime, docker).
  - Logging/Monitoring (logs structures, request_id, health checks).
- Respecter `references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md`:
  - pas de contournement ad hoc;
  - tracabilite des decisions techniques et des preuves de verification.
- Respecter FR/NFR de l'epic:
  - FR17 principal (identite unifiee), FR16 transition sans regression;
  - NFR-S1 a NFR-S4, NFR-I1 (resilience et hygiene securite).

### Library & Framework Requirements

- Runtime backend:
  - Python 3.12.
  - FastAPI + Pydantic Settings pour le chargement configuration.
- Runtime plateforme:
  - Docker Compose (preuve explicite restart vs recreate).
- Frontend/tests (si adaptation UI mineure liee au flux login):
  - Node 20 LTS.
  - Vitest + React Testing Library + jsdom (pas de Jest).

### File Structure Requirements

- Story file:
  - `_bmad-output/implementation-artifacts/14-3-finaliser-integration-recyclique-oidc-runtime-env-secrets-checks.md`
- Artefacts attendus pendant implementation (indicatifs):
  - `_bmad-output/implementation-artifacts/14-3-*-preuves*.md`
  - `_bmad-output/implementation-artifacts/14-3-*.log`
  - eventuelles mises a jour de `doc/deployment.md` et `.env.example` si necessaire.

### Project Structure Notes

- Centraliser les preuves et decisions dans `_bmad-output/implementation-artifacts/`.
- Reutiliser les conventions de 14.1/14.2 pour garder une continuite IAM/OIDC.
- Eviter toute duplication de convention config: un seul point de verite runtime par variable OIDC.

### Testing Requirements

- Minimum obligatoire pour accepter 14.3:
  - Test nominal login RecyClique en runtime conteneur actif.
  - Test IdP indisponible -> refus fail-closed attendu.
  - Test mismatch claims `aud/iss` -> refus attendu.
  - Preuve explicite "restart vs recreate" Docker sur prise en compte des variables OIDC runtime.
- Chaque test doit inclure resultat attendu/observe et trace sanitisee.

### Previous Story Intelligence (14.2 -> 14.3)

- Reutiliser la strategie de mapping utilisateur validee en 14.2 (`email`/`sub`) sans introduire de variante locale implicite.
- Conserver la meme logique OIDC BFF (pas de stockage token navigateur, pas de bypass local de session).
- En cas de divergence constatee entre 14.2 et runtime 14.3, documenter explicitement l'ecart et la raison avant correction.

### Validation Scenarios (minimum)

- Nominal runtime:
  - `GET/POST /v1/auth/sso/start` puis callback OIDC valide -> session ouverte.
- Erreurs controlees (fail-closed):
  - IdP indisponible -> refus explicite (ex. 503/4xx selon contrat) sans session.
  - `aud` invalide -> refus explicite sans session.
  - `iss` invalide -> refus explicite sans session.
- Runtime env verification:
  - Preuve que les valeurs runtime lues par le service correspondent au conteneur actif.
  - Preuve de comportement distinct entre `docker compose restart` et `docker compose up -d --force-recreate` (ou equivalent) sur prise en compte des changements env.

### Done Criteria Guardrail

- La story 14.3 n'est pas acceptable sans:
  - preuves nominal + erreurs controlees;
  - verification runtime conteneur actif des variables OIDC;
  - preuve explicite "restart vs recreate" Docker;
  - maintien fail-closed strict sans fallback permissif.
- Le gate global de generalisation reste consolide en 14.4/14.5 et reprise 14.0 en environnement reel.

### References

- `_bmad-output/planning-artifacts/epics.md` (Epic 14, Story 14.3)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/14-0-gate-de-faisabilite-oidc-cible-paheko-image-version-environnement.md`
- `_bmad-output/implementation-artifacts/14-0-oidc-gate-preuves.md`
- `_bmad-output/implementation-artifacts/14-0-oidc-gate-runbook.md`
- `_bmad-output/implementation-artifacts/14-1-provisionner-idp-commun-dev-prod-et-clients-oidc.md`
- `_bmad-output/implementation-artifacts/14-2-configurer-paheko-oidc-et-strategie-de-mapping-utilisateur.md`
- `_bmad-output/planning-artifacts/architecture.md` (Gap Analysis Results, Implementation Readiness Validation, Implementation Handoff)
- `references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md`

## Dev Agent Record

### Agent Model Used

gpt-5.3-codex (bmad-dev)

### Debug Log References

- Workflow applique: `_bmad/bmm/workflows/4-implementation/dev-story/`
- Validation appliquee: `_bmad/bmm/workflows/4-implementation/dev-story/checklist.md`
- Sources lues:
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`
  - `_bmad-output/planning-artifacts/architecture.md`
  - `references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md`
  - `_bmad-output/implementation-artifacts/14-1-provisionner-idp-commun-dev-prod-et-clients-oidc.md`
  - `_bmad-output/implementation-artifacts/14-2-configurer-paheko-oidc-et-strategie-de-mapping-utilisateur.md`
  - `api/config/settings.py`
  - `api/services/auth.py`
  - `api/routers/v1/auth.py`
  - `api/services/health_checks.py`
  - `api/routers/admin/health.py`
  - `api/routers/v1/admin/health.py`
  - `api/tests/routers/test_auth.py`
  - `api/tests/routers/test_admin_health_audit.py`
  - `doc/deployment.md`
  - `.env.example`
- Commandes executees:
  - `python -m pytest "api/tests/routers/test_auth.py" -k "sso_callback_nominal_sets_bff_cookie_and_redirects or sso_callback_returns_503_when_idp_dependency_unavailable or sso_callback_rejects_claims_mismatch or sso_start_fail_closed_when_runtime_config_incomplete or validate_oidc_claims_rejects_invalid_issuer or validate_oidc_claims_rejects_invalid_audience"`
  - `python -m pytest "api/tests/routers/test_admin_health_audit.py" -k "admin_health_returns_200_and_status or admin_health_auth_runtime_returns_200"`
  - `docker compose up -d recyclic keycloak`
  - `docker compose up -d --build recyclic`
  - `docker compose ps`
  - `curl.exe -s "http://localhost:8000/health"`
  - `curl.exe -s -D - "http://localhost:8000/v1/auth/sso/start?next=%2Fadmin" -o NUL`
  - `curl.exe -s -H "X-Request-Id: req-14-3-invalid-state" "http://localhost:8000/v1/auth/sso/callback?code=dummy&state=invalid"`
  - `docker compose exec recyclic python -c "from api.services.health_checks import check_oidc_runtime; import json; print(json.dumps(check_oidc_runtime(), ensure_ascii=True))"`
  - `docker compose exec recyclic python -m pytest "api/tests/routers/test_auth.py" -k "test_sso_callback_nominal_sets_bff_cookie_and_redirects or test_sso_callback_returns_503_when_idp_dependency_unavailable or test_sso_callback_rejects_claims_mismatch" -vv`
  - `docker compose restart recyclic`
  - `docker compose up -d --force-recreate recyclic`

### Completion Notes List

- Story 14.3 implementee en `dev-story` avec statut passe de `ready-for-dev` a `in-progress` puis `review`.
- Durcissement runtime OIDC implemente:
  - nouveaux settings `OIDC_HTTP_TIMEOUT_SECONDS` et `OIDC_FAIL_CLOSED_STRICT`;
  - verification runtime stricte (issuer/client_id/client_secret/redirect_uri + timeout > 0 + fail-closed strict obligatoire);
  - refus explicite `503` et audit fail-closed si config runtime incomplete.
- Durcissement fail-closed claims confirme:
  - rejets explicites `invalid_iss` et `invalid_aud`;
  - rejet IdP indisponible (`503`) conserve.
- Diagnostics exploitation renforces:
  - `/health` inclut `auth_runtime`;
  - `/v1/admin/health` inclut `auth_runtime`;
  - nouveau `/v1/admin/health/auth` pour diagnostic runtime OIDC sanitise.
- Preuves runtime conteneur actif produites:
  - `_bmad-output/implementation-artifacts/14-3-oidc-runtime-http-checks.log`
  - `_bmad-output/implementation-artifacts/14-3-oidc-tests-runtime-container.log`
  - `_bmad-output/implementation-artifacts/14-3-oidc-runtime-restart-vs-recreate.log`
  - `_bmad-output/implementation-artifacts/14-3-oidc-runtime-preuves-validation-dev-local.md`
- Demonstration explicite `restart` vs `force-recreate`:
  - `restart` ne recharge pas la variation `.env` (timeout reste `10.0`);
  - `force-recreate` recharge la variation `.env` (timeout passe `77.0`);
  - restauration ensuite a `10.0`.
- Handoff:
  - 14.4: etendre ces scenarios en E2E navigateur cross-plateforme + non-regression.
  - 14.5: formaliser runbooks complets incident/rollback (operations IAM/OIDC).
- Correctifs QA `changes-requested` appliques:
  - liaison `state` -> contexte client via cookie HTTP-only de binding (`recyclique_session_oidc_state`) + verification server-side stricte;
  - scenario anti-login-CSRF/session-swap ajoute (`test_sso_callback_rejects_state_without_browser_binding_cookie`);
  - observabilite fail-closed completee sur mismatch claims (`record_dependency_result`, `record_fail_closed_counter`, `write_resilience_audit_event`) avec motifs metier `invalid_iss`/`invalid_aud` et code HTTP;
  - preuves runtime AC1/AC4 completees avec traces sanitisees request_id + status + reason:
    - nominal: `req-14-3-nominal-local-idp`
    - idp indisponible: `req-14-3-idp-unavailable` (503 / `oidc_dependency_unavailable`)
    - invalid_iss: `req-14-3-invalid-iss` (401 / `invalid_iss`)
    - invalid_aud: `req-14-3-invalid-aud` (401 / `invalid_aud`)
- ✅ Resolved review finding [HIGH]: preuve nominale runtime reel complete `start -> callback -> /v1/auth/session` avec IdP local actif.
- ✅ Resolved review finding [HIGH]: liaison state OIDC au contexte client + test anti-session-swap.
- ✅ Resolved review finding [HIGH]: traces runtime explicites AC4 pour `idp_unavailable`, `invalid_iss`, `invalid_aud`.
- ✅ Resolved review finding [MEDIUM]: mismatch claims maintenant audite en fail-closed (compteur + resilience audit + motif metier).
- ✅ Resolved review finding [MEDIUM]: File List story alignee avec les fichiers applicatifs/story modifies pour la correction QA.

### File List

- `_bmad-output/implementation-artifacts/14-3-finaliser-integration-recyclique-oidc-runtime-env-secrets-checks.md`
- `api/core/deps.py`
- `api/main.py`
- `api/models/__init__.py`
- `api/schemas/auth.py`
- `api/config/settings.py`
- `api/services/auth.py`
- `api/routers/v1/auth.py`
- `api/services/health_checks.py`
- `api/routers/admin/health.py`
- `api/routers/v1/admin/health.py`
- `api/tests/routers/test_auth.py`
- `api/tests/routers/test_admin_health_audit.py`
- `docker-compose.yml`
- `.env.example`
- `doc/deployment.md`
- `_bmad-output/implementation-artifacts/14-3-oidc-runtime-preuves-validation-dev-local.md`
- `_bmad-output/implementation-artifacts/14-3-oidc-tests-runtime-container.log`
- `_bmad-output/implementation-artifacts/14-3-oidc-runtime-restart-vs-recreate.log`
- `_bmad-output/implementation-artifacts/14-3-oidc-runtime-http-checks.log`
- `_bmad-output/implementation-artifacts/14-3-oidc-runtime-nominal-local-idp.log`
- `_bmad-output/implementation-artifacts/14-3-oidc-runtime-idp-unavailable.log`
- `_bmad-output/implementation-artifacts/14-3-oidc-runtime-idp-unavailable-audit.log`
- `_bmad-output/implementation-artifacts/14-3-oidc-runtime-invalid-iss.log`
- `_bmad-output/implementation-artifacts/14-3-oidc-runtime-invalid-iss-audit.log`
- `_bmad-output/implementation-artifacts/14-3-oidc-runtime-invalid-aud.log`
- `_bmad-output/implementation-artifacts/14-3-oidc-runtime-invalid-aud-audit.log`
- `paheko-config/check_recyclique_oidc_runtime.py`
- `paheko-config/keycloak-client-recyclique-bff-dev.json`
- `paheko-config/keycloak-mapper-role.json`
- `paheko-config/keycloak-mapper-tenant.json`
- `paheko-config/keycloak-mapper-role-hardcoded.json`
- `paheko-config/keycloak-mapper-tenant-hardcoded.json`
- `paheko-config/keycloak-user-oidc-recyclique.json`

## Change Log

- 2026-02-28: Story 14.3 prise en charge en implementation `dev-story`; statut passe `ready-for-dev` -> `in-progress`.
- 2026-02-28: Durcissement fail-closed runtime OIDC ajoute (settings timeout/strict toggle, validation config runtime stricte, refus `503` explicite si config incomplete).
- 2026-02-28: Health auth runtime ajoute pour exploitation (`/health` + `/v1/admin/health` enrichis, nouveau `/v1/admin/health/auth`).
- 2026-02-28: Tests OIDC renforces (`nominal`, `IdP indisponible`, `mismatch aud/iss`, config runtime incomplete) et verifies localement + dans conteneur actif.
- 2026-02-28: Preuves runtime sanitisees produites (lecture runtime conteneur actif, scenarios auth, demonstration Docker `restart` vs `force-recreate`).
- 2026-02-28: Handoff explicite vers 14.4 (E2E non-regression) et 14.5 (runbooks complets), story passee en `review`.
- 2026-02-28: Revue adversariale BMAD (bmad-qa) -> `changes-requested`; statut repasse `in-progress` (preuves AC1/AC4 incompletes + ecarts fail-closed et securite state OIDC).
- 2026-02-28: Correction post-qa appliquee (state-cookie binding anti-CSRF/session-swap, observabilite fail-closed claims mismatch, preuves runtime AC1/AC4 completees avec request_id + HTTP + reason), statut repasse a `review`.
- 2026-02-28: Revue adversariale finale post-corrections (bmad-qa) -> `approved`; story passee a `done` apres verification complete des findings precedents.

## Senior Developer Review (AI)

Date: 2026-02-28  
Reviewer: bmad-qa  
Decision: **Changes Requested**

### Findings (adversarial)

1. **[HIGH][AC1] Preuve nominale runtime reel insuffisante**
   - Les artefacts montrent un nominal surtout via tests monkeypatches (`test_sso_callback_nominal_sets_bff_cookie_and_redirects`) dans conteneur, mais pas une chaine complete **IdP reel -> callback reel -> session hydratee** avec verification `/v1/auth/session`.
   - La preuve HTTP fournie couvre `302` sur `/v1/auth/sso/start` et un `state` invalide, mais pas un callback nominal reel.
   - References: `api/tests/routers/test_auth.py`, `_bmad-output/implementation-artifacts/14-3-oidc-runtime-http-checks.log`, `_bmad-output/implementation-artifacts/14-3-oidc-tests-runtime-container.log`.

2. **[HIGH][SECURITY] Liaison `state` OIDC non attachee au navigateur/session**
   - Le flux pending OIDC est stocke en memoire globale `_pending_oidc_flows` et consomme uniquement via `state` sans ancrage navigateur (cookie/session serveur).
   - Risque de login CSRF/session swap (acceptation potentielle d'un callback valide emis depuis un autre contexte client).
   - References: `api/services/auth.py` (`_pending_oidc_flows`, `build_oidc_authorization_redirect`, `consume_oidc_flow`), `api/routers/v1/auth.py` (`sso_callback`).

3. **[HIGH][AC4] Traces d'erreurs controlees incompletes pour exploitation incident**
   - AC4 demande des traces exploitables avec `request_id`, code HTTP et motif non sensible pour au moins deux erreurs controlees.
   - Les preuves 14.3 montrent surtout des statuts pytest PASSED; elles ne documentent pas explicitement des traces runtime exploitables `request_id + code + reason` pour mismatch `aud/iss` et IdP indisponible.
   - References: `_bmad-output/implementation-artifacts/14-3-oidc-tests-runtime-container.log`, `_bmad-output/implementation-artifacts/14-3-oidc-runtime-preuves-validation-dev-local.md`.

4. **[MEDIUM][FAIL-CLOSED OBSERVABILITY] Rejets claims mismatch non comptes comme fail-closed auditable**
   - Dans `sso_callback`, les exceptions de validation claims tombent dans `except Exception`, loggent `OIDC_CLAIMS_VALIDATION_FAILED` puis `LOGIN_FAILED`, mais sans `record_fail_closed_counter`, sans `write_resilience_audit_event`, et sans `record_dependency_result(..., ok=False, ...)`.
   - Le refus HTTP est bien fail-closed (`401`), mais la telemetry de resilience est partielle.
   - Reference: `api/routers/v1/auth.py` (`except Exception as exc`).

5. **[MEDIUM][TRACEABILITY] Ecart story File List vs realite git**
   - Des fichiers applicatifs modifies apparaissent hors File List de la story (`api/core/deps.py`, `api/main.py`, `api/models/__init__.py`, `api/schemas/auth.py`, `docker-compose.yml`, etc.).
   - Cela reduit la tracabilite du scope exact reel de 14.3 pendant la revue.
   - References: `git status --porcelain`, `git diff --name-only`.

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Produire une preuve nominale **runtime reel** (conteneur actif, IdP reel joignable) couvrant `start -> callback nominal -> /v1/auth/session` avec traces sanitisees.
- [x] [AI-Review][HIGH] Lier `state` OIDC a un contexte client (cookie nonce/state serveur ou session) et ajouter tests anti-login-CSRF.
- [x] [AI-Review][HIGH] Completer artefacts AC4 avec traces runtime explicites (`request_id`, HTTP status, raison non sensible) pour `idp_unavailable` et `invalid_aud/invalid_iss`.
- [x] [AI-Review][MEDIUM] Sur rejet claims mismatch, incrementer compteur fail-closed + audit resilience et tracer le motif metier (`invalid_iss`, `invalid_aud`) sans fuite sensible.
- [x] [AI-Review][MEDIUM] Aligner la File List de story avec les fichiers applicatifs reellement modifies pour revue future fiable.

### Revue finale post-corrections

Date: 2026-02-28  
Reviewer: bmad-qa  
Decision: **Approved**

- Verification finding [HIGH][AC1]: preuve nominale runtime reel presente (`start -> callback -> /v1/auth/session`) avec traces sanitisees dans `_bmad-output/implementation-artifacts/14-3-oidc-runtime-nominal-local-idp.log`.
- Verification finding [HIGH][SECURITY]: liaison `state` navigateur active (cookie HTTP-only `*_oidc_state` + hash compare server-side) et test anti-session-swap present (`test_sso_callback_rejects_state_without_browser_binding_cookie`).
- Verification finding [HIGH][AC4]: erreurs controlees `idp_unavailable`, `invalid_iss`, `invalid_aud` documentees avec `request_id`, `status_code`, `reason` dans les logs runtime et audits resiliences dedies.
- Verification finding [MEDIUM][FAIL-CLOSED OBSERVABILITY]: mismatch claims audite en fail-closed (`record_dependency_result`, `record_fail_closed_counter`, `write_resilience_audit_event`) avec motifs metier `invalid_iss`/`invalid_aud`.
- Verification finding [MEDIUM][TRACEABILITY]: File List story alignee avec les fichiers applicatifs de la correction 14.3 mentionnes dans le Dev Agent Record.

