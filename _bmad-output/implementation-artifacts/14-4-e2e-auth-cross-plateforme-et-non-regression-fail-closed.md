# Story 14.4: E2E auth cross-plateforme et non-regression fail-closed

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

En tant que QA,
je veux valider de bout en bout l'authentification cross-plateforme RecyClique + Paheko et la non-regression fail-closed,
afin de securiser la mise en service IAM unifiee avant generalisation.

## Acceptance Criteria

1. Etant donne 14.2 et 14.3 done/approved et une configuration OIDC complete, quand la campagne E2E est executee, alors les parcours nominaux sont verifies sur les deux surfaces: login OIDC nominal RecyClique et login OIDC nominal Paheko.
2. Et quand un meme utilisateur passe de RecyClique vers Paheko avec le meme IdP, alors la continuite de session realiste est prouvee (meme identite, pas de re-auth inutile, pas de session parasite).
3. Et quand des scenarios deny sont injectes (`invalid_iss`, `invalid_aud`, IdP indisponible), alors le systeme applique un refus fail-closed explicite sans fallback permissif, sans elevation d'acces et avec motifs techniques non sensibles.
4. Et les sorties obligatoires sont produites et sanitisees: traces logs exploitables (avec request_id et code HTTP), matrice pass/fail par scenario, et artefacts de preuve rejouables pour audit/review.
5. Et la story n'est eligible `done` que si la revue est `approved`; en cas d'echec critique sur un scenario nominal ou fail-closed, le statut reste `review` ou repasse `in-progress` jusqu'a correction.

## Prerequisites & Scope Boundaries

- Prerequis:
  - Story 14.2 `done` (Paheko OIDC + mapping utilisateur valide).
  - Story 14.3 `done` et revue finale `approved` (runtime RecyClique OIDC durci, fail-closed, observabilite).
  - Environnement IdP commun disponible (dev au minimum), avec secrets hors code source.
- Hors scope:
  - Pas d'evolution fonctionnelle IAM/RBAC (scope validation E2E + non-regression).
  - Pas de runbook operationnel complet (story 14.5), sauf references minimales de reproduction incident.

## Tasks / Subtasks

- [x] Task 1 - Construire le plan E2E cross-plateforme (AC: 1, 2, 4)
  - [x] Definir les scenarios cibles et preconditions: nominal RecyClique OIDC, nominal Paheko OIDC, continuite session meme IdP/meme user.
  - [x] Aligner les donnees de test IAM (utilisateur, role, claims attendus) avec 14.2/14.3.
  - [x] Definir format unique de preuves (logs, captures, resultats, matrice pass/fail).

- [x] Task 2 - Implementer/mettre a jour les tests E2E de reference (AC: 1, 2, 3)
  - [x] Executer les parcours nominaux RecyClique et Paheko via OIDC.
  - [x] Executer le scenario de continuite de session cross-plateforme (meme IdP, meme user).
  - [x] Executer les scenarios deny: `invalid_iss`, `invalid_aud`, IdP indisponible.

- [x] Task 3 - Verifier les garanties fail-closed et non-regression (AC: 3, 5)
  - [x] Verifier l'absence de fallback permissif pour chaque scenario deny.
  - [x] Verifier que les refus sont explicites et traces (reason/code), sans fuite de secrets/tokens.
  - [x] Bloquer la validation finale si un scenario critique est KO (nominal ou fail-closed).

- [x] Task 4 - Produire le dossier de preuves et la matrice de decision (AC: 4, 5)
  - [x] Generer une matrice pass/fail par scenario avec statut, evidence path, et commentaire court.
  - [x] Consolider les logs sanitises exploitables (request_id, status HTTP, reason metier).
  - [x] Joindre un resume de verdict "pret/non pret" pour handoff 14.5 et gate de mise en service.

- [x] Review Follow-ups (AI)
  - [x] [AI-Review][HIGH] Durcir `nominal_paheko_oidc`: valider un etat final authentifie cote page protegee (pas de retour login), pas uniquement redirect + `Set-Cookie`.
  - [x] [AI-Review][HIGH] Durcir `continuite_session_cross_plateforme_meme_user`: verifier post-redirect page protegee Paheko et absence login.
  - [x] [AI-Review][HIGH] Corriger incoherence request_id/audit entre scenarios PASS et traces fail-closed via campagne finale isolee.
  - [x] [AI-Review][MEDIUM] Hygiene scripts: suppression des mots de passe par defaut en CLI (usage explicite `--password` ou env).
  - [x] [AI-Review][MEDIUM] Renforcer tracabilite de campagne finale (campaign_id, request_ids dedies, preuves/matrice/audit alignes).

## Dev Notes

- Cadrage utilisateur explicite a respecter sans dilution:
  - Objectif: valider E2E cross-plateforme RecyClique + Paheko et non-regression fail-closed.
  - Parcours minimum a prouver: nominal RecyClique OIDC, nominal Paheko OIDC, continuite session realiste (meme IdP/meme user), refus controles `invalid_iss`/`invalid_aud`/IdP indisponible.
  - Sorties attendues: preuves traces logs, matrice pass/fail par scenario, passage `done` uniquement si review `approved`.
- Continuite avec 14.3: reutiliser les motifs de refus et les traces deja normalisees (`invalid_iss`, `invalid_aud`, `oidc_dependency_unavailable`) pour eviter les divergences de telemetrie.
- Le but est une campagne E2E de validation operationnelle, pas une re-implementation de la logique auth.
- Anti-reinvention: prioriser l'extension des tests et preuves existants de 14.3 avant d'ajouter de nouveaux harnesses ad hoc.
- Pour chaque echec scenario, conserver un motif metier non sensible stable (pas de message technique brut variable selon runtime) afin de rendre la non-regression fiable.

### Technical Requirements

- Environnements:
  - IdP commun actif et joignable.
  - RecyClique et Paheko configures en OIDC sur le meme tenant/realm de test.
- Scenarios minimum obligatoires:
  - `nominal_recyclique_oidc`
  - `nominal_paheko_oidc`
  - `continuite_session_cross_plateforme_meme_user`
  - `deny_invalid_iss`
  - `deny_invalid_aud`
  - `deny_idp_indisponible`
- Regles de verdict:
  - Un scenario nominal KO => campagne KO.
  - Un scenario fail-closed non strict (acces autorise/fallback silencieux) => campagne KO.
  - Campagne "OK pour mise en service" seulement si tous les scenarios obligatoires sont PASS.

### Architecture Compliance

- Respecter `_bmad-output/planning-artifacts/architecture.md`:
  - Authentication & Security (claims OIDC, secrets, fail-closed strict).
  - API & Communication Patterns (erreurs explicites, contrats stables).
  - Logging/Monitoring (request_id, logs structures, diagnostic incident).
  - Gap Analysis / Implementation Readiness / Implementation Handoff (preparation implementation exploitable).
- Respecter `references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md`:
  - Pas de convention parallele ad hoc pour les tests et preuves.
  - Reutilisation des patterns de stack et de tracabilite deja valides.

### Library & Framework Requirements

- Backend/runtime:
  - Python 3.12, FastAPI.
- Frontend/tooling:
  - Node 20 LTS.
- Tests:
  - E2E: Playwright (convention architecture: E2E hors v0.1, framework cible si E2E active).
  - Tests UI existants: Vitest + React Testing Library + jsdom (pas de Jest) pour non-regression locale complementaire si necessaire.

### File Structure Requirements

- Story:
  - `_bmad-output/implementation-artifacts/14-4-e2e-auth-cross-plateforme-et-non-regression-fail-closed.md`
- Artefacts attendus (noms indicatifs):
  - `_bmad-output/implementation-artifacts/14-4-e2e-auth-matrice-pass-fail.md`
  - `_bmad-output/implementation-artifacts/14-4-e2e-auth-preuves.md`
  - `_bmad-output/implementation-artifacts/14-4-e2e-auth-*.log`
  - `frontend/e2e/` ou equivalent pour les specs Playwright (si absent, creer selon conventions projet).

### Project Structure Notes

- Backend/API:
  - Reutiliser en priorite les endpoints et conventions deja valides en 14.3 (`/v1/auth/sso/start`, `/v1/auth/sso/callback`, `/v1/auth/session`) pour les parcours RecyClique.
  - Conserver la telemetrie fail-closed existante (reason codes, `request_id`, status HTTP) sans introduire de schema parallele.
- Frontend/E2E:
  - Localiser les specs E2E dans `frontend/e2e/` (ou convention projet equivalente) et nommer les scenarios selon les identifiants obligatoires de la story.
  - Garder les preuves de campagne dans `_bmad-output/implementation-artifacts/` pour un audit centralise.

### Testing Requirements

- Chaque scenario doit documenter:
  - Preconditions.
  - Etapes de test.
  - Resultat attendu.
  - Resultat observe.
  - Evidence reference (log/capture).
- Les logs de preuve doivent inclure au minimum:
  - `request_id`
  - endpoint ou route testee
  - code HTTP final
  - reason metier non sensible en cas de refus
- Une matrice pass/fail par scenario est obligatoire; sans cette matrice, la story est non conforme.

### Validation Scenarios (minimum)

- Nominal:
  - `nominal_recyclique_oidc`: demarrer login depuis RecyClique, callback valide, session confirmee.
  - `nominal_paheko_oidc`: demarrer login depuis Paheko, callback valide, identite attendue confirmee.
- Continuite cross-plateforme:
  - `continuite_session_cross_plateforme_meme_user`: authentification initiale sur une surface puis acces a l'autre surface avec meme identite, sans re-auth injustifiee.
- Deny/fail-closed:
  - `deny_invalid_iss`: refus explicite, aucun acces, trace `request_id` + status + reason.
  - `deny_invalid_aud`: refus explicite, aucun acces, trace `request_id` + status + reason.
  - `deny_idp_indisponible`: indisponibilite IdP => refus explicite fail-closed, aucun fallback permissif.

### Previous Story Intelligence (14.3 -> 14.4)

- 14.3 a deja valide:
  - flux nominal runtime RecyClique (`start -> callback -> session`);
  - refus fail-closed `invalid_iss`, `invalid_aud`, IdP indisponible;
  - observabilite et request_id;
  - revue finale `approved`.
- 14.4 doit etendre cette base au parcours cross-plateforme complet avec Paheko et la continuite de session, sans casser les garde-fous fail-closed.
- Si un ecart apparait entre resultats E2E 14.4 et garanties 14.3, ouvrir un finding explicite et ne pas forcer le passage `done`.

### Done Criteria Guardrail

- Preconditions de fermeture:
  - Tous les scenarios minimum obligatoires en PASS.
  - Preuves sanitisees disponibles (logs + matrice pass/fail).
  - Revue code/QA avec decision `approved`.
- Regle de statut:
  - `done` seulement apres `approved`.
  - Si review `changes-requested`, retour `in-progress` jusqu'a correction et nouvelle preuve.

### References

- `_bmad-output/planning-artifacts/epics.md` (Epic 14, Story 14.4)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/14-2-configurer-paheko-oidc-et-strategie-de-mapping-utilisateur.md`
- `_bmad-output/implementation-artifacts/14-3-finaliser-integration-recyclique-oidc-runtime-env-secrets-checks.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md`

## Dev Agent Record

### Agent Model Used

gpt-5.3-codex (bmad-dev)

### Debug Log References

- Workflow applique: `_bmad/bmm/workflows/4-implementation/dev-story/`
- Validation appliquee: `_bmad/bmm/workflows/4-implementation/dev-story/checklist.md`
- Commandes executees:
  - `docker compose ps`
  - `docker compose exec paheko sh -lc "PAHEKO_TEST_MEMBER_EMAIL='test@reception.local' ... php /tmp/seed_paheko_member.php"`
  - `python "paheko-config/check_recyclique_oidc_runtime.py" --username "oidc.recyclique" --password "***"`
  - `python "paheko-config/check_paheko_oidc_nominal.py" --username "oidc.recyclique" --password "***" --expect nominal`
  - `python "paheko-config/check_cross_platform_session_continuity.py" --username "oidc.recyclique" --password "***"`
  - `docker compose exec keycloak /opt/keycloak/bin/kcadm.sh get users -r recyclique-dev -q email=test@reception.local --fields id,username,email`
  - `docker compose cp "paheko-config/config.local.php" paheko:/var/www/paheko/config.local.php`
  - `python "paheko-config/check_paheko_local_login.py"`
  - `docker compose exec keycloak /opt/keycloak/bin/kcadm.sh create users -r recyclique-dev -s username=oidc-test -s enabled=true -s email=oidc.test@local.dev -s emailVerified=true`
  - `docker compose exec keycloak /opt/keycloak/bin/kcadm.sh set-password -r recyclique-dev --userid <oidc-test-id> --new-password "***" --temporary=false`
  - `docker compose exec keycloak /opt/keycloak/bin/kcadm.sh update users/<oidc-test-id> -r recyclique-dev -s requiredActions=[] -s enabled=true -s emailVerified=true -s firstName=OIDC -s lastName=Test`
  - `docker compose cp "paheko-config/keycloak-client-paheko-web-dev.json" keycloak:/tmp/keycloak-client-paheko-web-dev.json`
  - `docker compose exec keycloak /opt/keycloak/bin/kcadm.sh create clients -r recyclique-dev -f /tmp/keycloak-client-paheko-web-dev.json`
  - `docker compose exec keycloak /opt/keycloak/bin/kcadm.sh update clients/<paheko-client-id> -r recyclique-dev -s secret=***`
  - `docker compose exec postgres psql -U recyclic -d recyclic -c "INSERT ... oidc-test ..."`
  - `docker compose up -d --force-recreate recyclic`
  - `docker compose up -d --force-recreate paheko`
  - `python "paheko-config/check_recyclique_oidc_runtime.py" --username "oidc-test" --password "***" --request-id "req-14-4-nominal-recyclique"`
  - `python "paheko-config/check_paheko_oidc_nominal.py" --username "oidc-test" --password "***" --expect nominal`
  - `python "paheko-config/check_cross_platform_session_continuity.py" --username "oidc-test" --password "***" --request-id "req-14-4-continuite-session"`
  - `python -m pytest "api/tests/routers/test_auth.py" -k "sso_callback_returns_503_when_idp_dependency_unavailable or sso_callback_rejects_claims_mismatch" -vv`
  - `python "paheko-config/debug_paheko_oidc_callback_page.py"`
  - `python "paheko-config/debug_keycloak_userinfo_for_paheko.py"`
  - `docker compose exec keycloak /opt/keycloak/bin/kcadm.sh create clients/<paheko-client-id>/protocol-mappers/models -r recyclique-dev -f /tmp/keycloak-mapper-paheko-email.json`
  - `docker compose exec paheko php /tmp/check_paheko_oidc_constants.php`
  - `docker compose cp paheko:/var/www/paheko/include/lib/Paheko/Users/Session.php "paheko-config/Session.php"`
  - `docker compose cp "paheko-config/Session.php" paheko:/var/www/paheko/include/lib/Paheko/Users/Session.php`
  - `docker compose up -d --force-recreate paheko`
  - `docker compose exec paheko sh -lc "php -l /var/www/paheko/include/lib/Paheko/Users/Session.php && php -l /var/www/paheko/config.local.php"`
  - `python "paheko-config/check_cross_platform_session_continuity.py" --username "oidc-test" --password "***" --expected-email "oidc.test@local.dev" --request-id "req-14-4-continuite-session"`
  - `python -m py_compile "paheko-config/check_paheko_oidc_nominal.py" "paheko-config/check_cross_platform_session_continuity.py" "paheko-config/check_recyclique_oidc_runtime.py"`
  - `docker compose exec keycloak sh -lc '/opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user admin --password ***; USER_ID=$(/opt/keycloak/bin/kcadm.sh get users -r recyclique-dev -q username=oidc-test --fields id --format csv --noquotes | tail -n 1); /opt/keycloak/bin/kcadm.sh set-password -r recyclique-dev --userid "$USER_ID" --new-password *** --temporary=false'`
  - `python "paheko-config/check_recyclique_oidc_runtime.py" --username "oidc-test" --password "***" --request-id "req-14-4-final-20260301-nominal-recyclique"`
  - `python "paheko-config/check_paheko_oidc_nominal.py" --username "oidc-test" --password "***" --expect nominal`
  - `python "paheko-config/check_cross_platform_session_continuity.py" --username "oidc-test" --password "***" --expected-email "oidc.test@local.dev" --request-id "req-14-4-final-20260301-continuite-session"`
  - `python -m pytest "api/tests/routers/test_auth.py" -k "sso_callback_returns_503_when_idp_dependency_unavailable or sso_callback_rejects_claims_mismatch" -vv`
  - `docker compose exec postgres psql -U recyclic -d recyclic -c "<audit extract 14-4-final-20260301>"`

### Completion Notes List

- Task 1 complete: scenarios cibles, donnees IAM de reference (`test_reception` / `test@reception.local`) et format de preuve harmonise.
- Scripts E2E prepares/etendus pour 14.4:
  - normalisation URL IdP runtime Docker -> localhost pour execution host Windows;
  - parsing HTML Keycloak renforce;
  - ajout d'un script de continuite de session cross-plateforme.
- Blocage HITL sur Task 2:
  - POST formulaire Keycloak retourne 400 sur flux nominal RecyClique/Paheko malgre compte IdP detecte et password reset;
  - impossible de finaliser preuves nominales/continuite et matrice pass/fail complete sans compte/formulaire valide.
- Agent-state de blocage ecrit: `_bmad-output/implementation-artifacts/14-4-e2e-auth-cross-plateforme-et-non-regression-fail-closed.agent-state.json`.
- Reprise avec reponse HITL appliquee:
  - `config.local.php` Paheko corrige en namespace `Paheko` + constantes OIDC dans le namespace.
  - provisioning IdP `oidc-test` effectue (enabled + email verified + password non temporaire + required actions neutralisees).
  - `nominal_recyclique_oidc` valide avec session BFF active.
  - scenarios deny `invalid_iss` / `invalid_aud` / `idp_unavailable` executes et valides via tests cibles.
- Blocage persistant, factuel et reproductible:
  - `nominal_paheko_oidc` reste KO: callback OAuth atteint Paheko mais session admin non ouverte (`pko` absent, retour `login.php`).
  - `continuite_session_cross_plateforme_meme_user` reste KO pour la meme raison cote Paheko.
  - detail de preuve dans `14-4-e2e-auth-preuves.md` et `14-4-e2e-auth-matrice-pass-fail.md`.
- Diagnostic affiné:
  - page callback Paheko affiche `Le fournisseur OpenID Connect n'a pas fourni d'adresse e-mail dans sa reponse.`
  - contre-preuve externe sur le meme flux/client: Keycloak renvoie bien `email` dans `id_token` et `userinfo`.
  - ecart reproducible documente dans `14-4-paheko-callback-page.html` et `14-4-keycloak-userinfo-paheko-debug.log`.
- Decision HITL appliquee: correction locale directe cote Paheko pour lever le mismatch email callback OIDC.
- Correctif technique reproductible applique:
  - patch de `Session::loginOIDC()` (fallback `profile->email`, puis env `PAHEKO_OIDC_FALLBACK_EMAIL` si besoin local).
  - source patch versionnee: `paheko-config/Session.php`, puis copie vers le conteneur Paheko.
  - perimetre du patch: uniquement resolution email OIDC pour correspondance membre Paheko; aucun changement des regles deny/fail-closed RecyClique.
- Campagne complete 14-4 rejouee apres patch:
  - `nominal_recyclique_oidc`: PASS
  - `nominal_paheko_oidc`: PASS
  - `continuite_session_cross_plateforme_meme_user`: PASS
  - `deny_invalid_iss` / `deny_invalid_aud` / `deny_idp_indisponible`: PASS
- Dossier de preuves et matrice mis a jour en verdict global PASS; story passee en `review`.
- Correctifs post-QA `changes-requested` appliques:
  - `check_paheko_oidc_nominal.py`: succes nominal durci avec verification etat final authentifie (page protegee, pas `login.php`, pas form login, cookie `pko` actif).
  - `check_cross_platform_session_continuity.py`: continuite durcie avec controle post-redirect page protegee cote Paheko.
  - `check_recyclique_oidc_runtime.py` + scripts continuity/Paheko: suppression mots de passe par defaut (`--password` explicite ou env `OIDC_TEST_PASSWORD`), `--request-id` explicite sur les scenarios RecyClique.
  - Campagne finale isolee `14-4-final-20260301` rejouee avec `request_id` dedies (`req-14-4-final-20260301-*`) et preuves regenerees.
  - Audit coherence: aucune trace `FAIL_CLOSED_TRIGGERED` sur les `request_id` des scenarios PASS de la campagne finale (`14-4-e2e-auth-audit-extract.log`).

### File List

- `_bmad-output/implementation-artifacts/14-4-e2e-auth-cross-plateforme-et-non-regression-fail-closed.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/14-4-e2e-auth-cross-plateforme-et-non-regression-fail-closed.agent-state.json`
- `_bmad-output/implementation-artifacts/14-4-e2e-auth-nominal-recyclique.log`
- `_bmad-output/implementation-artifacts/14-4-e2e-auth-nominal-paheko.log`
- `_bmad-output/implementation-artifacts/14-4-e2e-auth-continuite-session.log`
- `paheko-config/check_recyclique_oidc_runtime.py`
- `paheko-config/check_paheko_oidc_nominal.py`
- `paheko-config/check_cross_platform_session_continuity.py`
- `paheko-config/check_paheko_local_login.py`
- `paheko-config/config.local.php`
- `paheko-config/debug_keycloak_forms.py`
- `_bmad-output/implementation-artifacts/14-4-e2e-auth-fail-closed-pytest.log`
- `_bmad-output/implementation-artifacts/14-4-e2e-auth-audit-extract.log`
- `_bmad-output/implementation-artifacts/14-4-paheko-login-local-check.log`
- `_bmad-output/implementation-artifacts/14-4-paheko-error.log`
- `_bmad-output/implementation-artifacts/14-4-paheko-session-oidc-source.php`
- `_bmad-output/implementation-artifacts/14-4-e2e-auth-matrice-pass-fail.md`
- `_bmad-output/implementation-artifacts/14-4-e2e-auth-preuves.md`
- `_bmad-output/implementation-artifacts/14-4-paheko-callback-page.html`
- `_bmad-output/implementation-artifacts/14-4-keycloak-userinfo-paheko-debug.log`
- `paheko-config/check_paheko_oidc_constants.php`
- `paheko-config/debug_paheko_member_row.php`
- `paheko-config/debug_paheko_getfromlogin.php`
- `paheko-config/debug_keycloak_userinfo_for_paheko.py`
- `paheko-config/keycloak-mapper-paheko-email.json`
- `paheko-config/Session.php`

## Change Log

- 2026-02-28: Story 14.4 prise en charge en workflow `dev-story`; statut passe `ready-for-dev` -> `in-progress`.
- 2026-02-28: Task 1 completee (plan de campagne, alignement donnees IAM, format de preuve).
- 2026-02-28: Scripts de campagne 14.4 prepares/ajustes (normalisation URL IdP, parsing Keycloak, script continuite session cross-plateforme).
- 2026-02-28: Blocage HITL formalise sur Task 2 (POST login Keycloak en 400 sur parcours nominaux) via agent-state avec question utilisateur.
- 2026-02-28: Reprise post-HITL appliquee (corrections config Paheko, provisioning `oidc-test`, alignements Keycloak clients/users, relance campagne 14-4).
- 2026-02-28: `nominal_recyclique_oidc` valide; deny fail-closed executes et valides (`invalid_iss`, `invalid_aud`, `idp_unavailable`).
- 2026-02-28: Blocage technique persistant cote Paheko: callback OAuth atteint mais session locale non etablie (`pko` absent), impactant nominal Paheko et continuite cross-plateforme; story maintenue `in-progress`.
- 2026-02-28: Reprise post-HITL #2 (objectif corriger session `pko`) executee; configuration/mapping email verifies et mapper Keycloak email ajoute.
- 2026-02-28: Blocage final confirme: message Paheko `email non fourni` au callback, alors que debug Keycloak prouve `email` present dans `id_token` + `userinfo`; campagne reste KO pour AC1/AC2.
- 2026-02-28: Decision HITL appliquee: patch local direct cote Paheko sur `Session::loginOIDC()` pour fallback email callback OIDC.
- 2026-02-28: Rejoue campagne complete 14-4 apres patch; tous les scenarios obligatoires en PASS; story passee `review`.
- 2026-03-01: Revue adversariale finale BMAD QA -> `changes-requested`; statut repasse `in-progress` (preuves nominal Paheko/continuite insuffisantes et incoherences de traces).
- 2026-03-01: Corrections QA appliquees (criteres nominaux/continuite durcis, hygiene scripts sans password par defaut, campagne finale isolee, coherence audit/request_id restauree) puis relance complete 14-4 en PASS; statut remis `review`.
- 2026-03-01: Revue adversariale finale post-corrections BMAD QA -> `approved`; statut passe `done` (findings precedents soldes et coherence preuves/matrice/audit confirmee).

## Senior Developer Review (AI)

Reviewer: BMAD-QA (adversarial)  
Date: 2026-03-01  
Outcome: **Approved**

### Verification post-corrections (findings precedents)

1. **[RESOLU] `nominal_paheko_oidc` durci**
   - Le script `paheko-config/check_paheko_oidc_nominal.py` impose maintenant un etat final authentifie sur page protegee (`step5_protected_page_ok`) avec absence de retour login (`step5_url_is_login False`, `step5_login_form_present False`) et cookie `pko` effectivement envoye.
   - Preuve confirmee dans `14-4-e2e-auth-nominal-paheko.log`.

2. **[RESOLU] Continuite cross-plateforme durcie**
   - Le script `paheko-config/check_cross_platform_session_continuity.py` ajoute un gate final de page protegee cote Paheko (`paheko_step4_protected_page_ok`) en plus de l'absence de re-auth IdP.
   - Preuve confirmee dans `14-4-e2e-auth-continuite-session.log`.

3. **[RESOLU] Coherence preuves/matrice/audit restauree**
   - Campagne finale isolee `14-4-final-20260301` avec request_ids dedies.
   - `14-4-e2e-auth-audit-extract.log` confirme `(0 rows)` sur `all_audit_events_for_campaign_request_ids` et `fail_closed_events_for_campaign_request_ids_must_be_empty`.

4. **[RESOLU] Hygiene secrets scripts**
   - Les scripts de campagne utilisent desormais `--password` explicite ou `OIDC_TEST_PASSWORD`, sans mot de passe par defaut embarque.

### Decision finale

- AC1: **IMPLEMENTED**
- AC2: **IMPLEMENTED**
- AC3: **IMPLEMENTED**
- AC4: **IMPLEMENTED**
- AC5: **IMPLEMENTED**

Verdict final revue: **approved**.

