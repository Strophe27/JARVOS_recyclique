# Story 14.2: Configurer Paheko OIDC et strategie de mapping utilisateur

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

En tant qu'admin technique,
je veux configurer Paheko en client OIDC avec une strategie de mapping claire,
afin de garantir la continuite d'identite sans ambiguite entre IdP, RecyClique et Paheko.

## Acceptance Criteria

1. Etant donne un IdP commun operationnel (story 14.1), quand Paheko est configure en client OIDC avec les endpoints/metadata attendus, alors un login OIDC Paheko nominal fonctionne pour les utilisateurs autorises en scope dev/local.
2. Et la regle de mapping utilisateur est explicite, testee et tracable: priorite de matching (`email` vs `sub`) definie, fallback interdit sans decision explicite, et comportement documente pour les cas ambigus (collision, compte introuvable, claims incomplets).
3. Et les claims OIDC requis cote Paheko sont verifies et alignes avec la gouvernance IAM deja etablie (Epic 12): `iss`, `aud`, `exp`, identifiant principal (`sub` et/ou `email`), role/tenant si utilises.
4. Et la configuration est securisee et operable: secrets hors depot, valeurs runtime centralisees, procedure de rotation/deverrouillage connue, logs exploitables sans fuite de secrets.
5. Et les limites de scope sont explicites: 14.2 valide le mapping et le login OIDC Paheko en dev/local; la preuve de generalisation preprod/prod reste conditionnee par la reprise de 14.0 (NO-GO provisoire).

## Prerequisites & Scope Boundaries

- Prerequis:
  - Epic 12 done (12.1 a 12.6).
  - Story 14.1 done en scope dev/local (IdP + clients OIDC provisionnes, checklist/inventaire sanitises).
  - Story 14.0 encore NO-GO provisoire pour la generalisation preprod/prod (a rejouer plus tard avec preuves).
- Hors scope:
  - Pas de finalisation runtime BFF RecyClique (story 14.3).
  - Pas de campagne E2E complete cross-plateforme (story 14.4).
  - Pas de runbooks d'exploitation finaux (story 14.5), sauf notes minimales de mapping necessaires a 14.2.

## Tasks / Subtasks

- [x] Task 1 - Configurer Paheko en client OIDC sur base IdP 14.1 (AC: 1, 4)
  - [x] Verifier/aligner metadata OIDC cote Paheko (`issuer`, `authorization_endpoint`, `token_endpoint`, `jwks_uri`, `end_session_endpoint` si disponible).
  - [x] Configurer les redirect URIs et post-logout URIs Paheko sans placeholder ambigu en scope dev/local.
  - [x] Valider le login nominal OIDC Paheko avec au moins un utilisateur autorise.

- [x] Task 2 - Definir et appliquer la strategie de mapping utilisateur (AC: 2, 3)
  - [x] Choisir et documenter la priorite de mapping (ex. `sub` prioritaire puis `email`, ou inverse) avec rationale explicite.
  - [x] Definir le comportement en cas d'ambiguite (collision `email`, `sub` absent, mismatch entre claims et compte local).
  - [x] Implementer/parametrer le mapping sans fallback implicite non documente.

- [x] Task 3 - Aligner claims et gouvernance IAM (AC: 2, 3)
  - [x] Verifier que les claims utilises par Paheko restent coherents avec la matrice IAM Epic 12 (roles, exceptions, deny-by-default).
  - [x] Ajouter une verification explicite des claims critiques avant ouverture de session.
  - [x] Tracer les refus de mapping/auth (`claim manquant`, `compte inconnu`, `collision`) avec `request_id` et raison non sensible.

- [x] Task 4 - Securiser la configuration et l'operabilite (AC: 4, 5)
  - [x] Confirmer que tous les secrets/configs OIDC Paheko sont hors code source (`.env`/secret manager), sans fuite dans les artefacts.
  - [x] Produire un mini-guide d'operations pour 14.2 (checks preflight et checks post-config) avec sortie sanitisee.
  - [x] Documenter explicitement ce qui reste a rejouer en preprod/prod via 14.0 (gate nominal + fail-closed).

- [x] Task 5 - Couvrir les tests de validation story (AC: 1, 2, 3, 5)
  - [x] Tester le parcours nominal login OIDC Paheko en dev/local.
  - [x] Tester au moins 2 cas de rejet (ex. claim invalide, mapping ambigu) avec comportement fail-closed.
  - [x] Capturer les preuves minimales sanitisees dans les artefacts de story.

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Ajouter des preuves de rejets executes sur le flux OIDC Paheko lui-meme (pas seulement via tests API RecyClique) pour couvrir explicitement AC2/AC5.
- [x] [AI-Review][HIGH] Rendre le parametre `OIDC_CLIENT_MATCH_EMAIL` pilote par variable runtime (`PAHEKO_OIDC_CLIENT_MATCH_EMAIL`) ou documenter explicitement la decision de hardcode et ses garde-fous.
- [x] [AI-Review][MEDIUM] Supprimer les defaults implicites non vides de `OIDC_CLIENT_URL` et `OIDC_CLIENT_ID` dans `paheko-config/config.local.php` pour un comportement fail-closed en cas d'env incomplet.
- [x] [AI-Review][MEDIUM] Aligner la File List avec la realite git et retirer la mention `.env` comme fichier modifie sans evidence de changement versionne.

## Dev Notes

- Cette story transforme le socle IdP 14.1 en configuration OIDC Paheko exploitable, mais ne clot pas la generalisation environnement reel tant que 14.0 n'est pas rejoue.
- Eviter toute divergence IAM entre Paheko et RecyClique: les decisions Epic 12 restent la source de verite (matrice d'acces, exceptions, deny-by-default).
- Le risque principal de 14.2 est l'ambiguite de mapping utilisateur. Toute heuristique implicite doit etre remplacee par une regle explicite, testee et documentee.
- Ne pas creer de second flux auth parallele: etendre la configuration OIDC existante de Paheko/IdP au lieu d'ajouter une convention ad hoc.
- Les preuves de story doivent rester sanitisees et rejouables (pas de secret, pas de token brut, pas de dump sensible).

### Technical Requirements

- OIDC:
  - Paheko configure en Authorization Code (avec PKCE si supporte par la cible) en tant que client IdP.
  - Validation des metadata et des claims critiques (`iss`, `aud`, `exp`, identifiant de mapping).
  - Strategie de mapping explicite et deterministe (`email`/`sub`) sans fallback cache.
- Securite:
  - Secrets hors code source; rotation possible sans modifier le code.
  - Logs auth/mapping correles par `request_id`, sans fuite de secrets.
  - Comportement fail-closed en cas d'incoherence claims/mapping.
- Operabilite:
  - Checklist preflight/post-config minimum pour rejouer la configuration dev/local.
  - Tracabilite claire des ecarts restant a valider en preprod/prod (reprise gate 14.0).

### Architecture Compliance

- Respecter les patterns architecture projet:
  - Configuration centralisee via env/settings.
  - Aucune fuite de secret dans logs, docs ou artefacts.
  - Validation explicite des claims avant ouverture de session.
- Respecter les exigences transverses:
  - FR17 (identite unifiee) en priorite.
  - FR16 (transition/fallback) sans casser les parcours existants.
  - NFR-S1 a NFR-S4 et NFR-I1 (securite, hygiene, resilience operationnelle).

### File Structure Requirements

- Story file:
  - `_bmad-output/implementation-artifacts/14-2-configurer-paheko-oidc-et-strategie-de-mapping-utilisateur.md`
- Artefacts attendus pendant implementation (indicatifs):
  - `_bmad-output/implementation-artifacts/14-2-*.md`
  - Eventuelles mises a jour de preuves/gate OIDC en lien avec 14.0, sans marquer 14.0 comme leve tant que la reprise preprod/prod n'est pas faite.

### Project Structure Notes

- Conserver les decisions IAM/OIDC dans les artefacts BMAD `_bmad-output/implementation-artifacts/` pour garantir la tracabilite.
- Privilegier les chemins et conventions deja utilises dans 14.1 (checklist/inventaire) pour eviter les documents disperses.
- Tout choix de mapping non trivial doit etre trace avec rationale et exemples de cas limites.
- Reutiliser les variables/runtime OIDC deja posees en 14.1 (et completees en 14.3) plutot que creer une convention parallele cote Paheko.

### Testing Requirements

- Minimum pour accepter 14.2 en implementation:
  - Login OIDC Paheko nominal valide (dev/local).
  - Cas de rejet mapping/claims verifies (fail-closed).
  - Preuves sanitisees associees aux tests executes.
- Verification differee obligatoire:
  - Rejouer le gate 14.0 sur environnement preprod/prod quand disponible avant generalisation.

### Validation Scenarios (minimum)

- Nominal:
  - Utilisateur autorise avec claims complets (`iss`, `aud`, `exp`, identifiant de mapping) -> login OIDC Paheko reussi.
- Rejets obligatoires (fail-closed):
  - Claim critique manquant/invalide (`aud` ou `iss` incoherent, `exp` expire) -> refus d'auth.
  - Mapping ambigu (collision `email` ou incoherence `sub`<->compte local) -> refus + trace non sensible.
  - Compte introuvable pour la regle de mapping retenue -> refus explicite sans creation implicite de compte.
- Tracabilite:
  - Chaque tentative de rejet contient `request_id`, motif non sensible, et preuve sanitisee dans les artefacts 14.2.

### Done Criteria Guardrail

- 14.2 peut etre marquee `done` en perimetre dev/local si:
  - la strategie de mapping est explicite, testee et documentee;
  - les rejets fail-closed critiques sont verifies avec preuves sanitisees;
  - aucun secret/token brut n'apparait dans les logs/artefacts.
- 14.2 ne leve pas le `NO-GO provisoire` de 14.0 pour la generalisation preprod/prod.
- La generalisation reste conditionnee a la reprise nominale complete 14.0 sur environnement reel.

### References

- Epic source:
  - `_bmad-output/planning-artifacts/epics.md` (Epic 14, Story 14.2)
- Sprint tracking:
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Story precedente:
  - `_bmad-output/implementation-artifacts/14-1-provisionner-idp-commun-dev-prod-et-clients-oidc.md`
  - `_bmad-output/implementation-artifacts/14-1-idp-provisionnement-dev-prod-checklist.md`
  - `_bmad-output/implementation-artifacts/14-1-idp-inventaire-configuration-sanitise.md`
- Gate OIDC:
  - `_bmad-output/implementation-artifacts/14-0-gate-de-faisabilite-oidc-cible-paheko-image-version-environnement.md`
  - `_bmad-output/implementation-artifacts/14-0-oidc-gate-preuves.md`
  - `_bmad-output/implementation-artifacts/14-0-oidc-gate-runbook.md`
- Architecture:
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
  - `_bmad-output/planning-artifacts/epics.md`
  - `_bmad-output/planning-artifacts/architecture.md`
  - `references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md`
  - `_bmad-output/implementation-artifacts/14-0-gate-de-faisabilite-oidc-cible-paheko-image-version-environnement.md`
  - `_bmad-output/implementation-artifacts/14-0-oidc-gate-preuves.md`
  - `_bmad-output/implementation-artifacts/14-0-oidc-gate-runbook.md`
  - `_bmad-output/implementation-artifacts/14-1-provisionner-idp-commun-dev-prod-et-clients-oidc.md`
  - `_bmad-output/implementation-artifacts/14-1-idp-provisionnement-dev-prod-checklist.md`
  - `_bmad-output/implementation-artifacts/14-1-idp-inventaire-configuration-sanitise.md`
  - `api/config/settings.py`
  - `api/services/auth.py`
  - `api/routers/v1/auth.py`
  - `api/tests/routers/test_auth.py`
  - `doc/deployment.md`
  - `.env.example`
- Commandes executees:
  - `python -m pytest "api/tests/routers/test_auth.py" -k "sso_callback_nominal_sets_bff_cookie_and_redirects or sso_callback_user_mapping_failed_writes_fail_closed_audit or sso_callback_invalid_state_returns_400"`
  - `docker compose ps`
  - `curl.exe -s -o NUL -w "%{http_code}" "http://localhost:8080/"`
  - `curl.exe -s -o NUL -w "%{http_code}" "http://localhost:8080/auth/oidc/callback"`
  - `docker compose up -d paheko`
  - `docker compose up -d keycloak paheko`
  - `docker compose logs --tail 200 keycloak`
  - `curl.exe -v "http://localhost:8081/realms/master/.well-known/openid-configuration"`
  - `docker compose exec keycloak /opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user admin --password admin`
  - `docker compose exec keycloak /opt/keycloak/bin/kcadm.sh create realms -s realm=recyclique-dev -s enabled=true`
  - `docker compose exec keycloak /opt/keycloak/bin/kcadm.sh create clients -r recyclique-dev -f /tmp/keycloak-client-paheko-web-dev.json`
  - `docker compose exec keycloak /opt/keycloak/bin/kcadm.sh update clients/<client_id> -r recyclique-dev -s secret=***`
  - `docker compose exec keycloak /opt/keycloak/bin/kcadm.sh create users -r recyclique-dev -s username=oidc.test -s enabled=true -s email=oidc.test@local.dev`
  - `docker compose exec keycloak /opt/keycloak/bin/kcadm.sh set-password -r recyclique-dev --userid <user_id> --new-password ***`
  - `docker compose cp "paheko-config/seed_paheko_member.php" paheko:/tmp/seed_paheko_member.php`
  - `docker compose exec paheko php /tmp/seed_paheko_member.php`
  - `python "paheko-config/check_paheko_oidc_nominal.py"`
  - `python "paheko-config/check_paheko_oidc_nominal.py" > "_bmad-output/implementation-artifacts/14-2-paheko-oidc-nominal-run.log"`
  - `python "paheko-config/check_paheko_oidc_nominal.py" --username oidc.nomap --password *** --expect reject > "_bmad-output/implementation-artifacts/14-2-paheko-oidc-rejet-account-not-found.log"`
  - `python "paheko-config/check_paheko_oidc_nominal.py" --username oidc.noemail --password *** --expect reject > "_bmad-output/implementation-artifacts/14-2-paheko-oidc-rejet-missing-email.log"`
  - `docker compose exec keycloak /opt/keycloak/bin/kcadm.sh update clients/<client_id> -r recyclique-dev -s serviceAccountsEnabled=true`
  - `docker compose cp "paheko-config/config.local.php" paheko:/var/www/paheko/config.local.php`
  - `curl.exe -s -D - "http://localhost:8080/admin/login.php" -o NUL`
  - `curl.exe -s -D - "http://localhost:8080/admin/login.php?oidc" -o NUL`
  - `curl.exe -s -D - "http://localhost:8081/realms/recyclique-dev/.well-known/openid-configuration" -o NUL`

### Completion Notes List

- Story 14.2 prise en charge en `dev-story`; statut passe a `in-progress`.
- Artefact de configuration/mapping produit:
  - `_bmad-output/implementation-artifacts/14-2-paheko-oidc-configuration-et-strategie-mapping.md`
- Artefact de preuves dev/local produit:
  - `_bmad-output/implementation-artifacts/14-2-paheko-oidc-preuves-validation-dev-local.md`
- Strategie de mapping formalisee: matching principal par `email` (`OIDC_CLIENT_MATCH_EMAIL`) avec comportement fail-closed documente.
- Reprise HITL appliquee strictement:
  - activation OIDC Paheko par fichier `/var/www/paheko/config.local.php`;
  - callback exact `http://localhost:8080/admin/login.php?oidc`.
- Provisionnement local standard effectue:
  - IdP local Keycloak Docker deploie;
  - realm/client OIDC Paheko crees;
  - utilisateur test IdP cree (`oidc.test@local.dev`);
  - membre Paheko correspondant cree (`oidc.test@local.dev`).
- Decision HITL appliquee: **mitigation A**.
  - URL `/authorize` et `scope` exact demandes par Paheko captures;
  - ajustement Keycloak effectue pour accepter le scope demande (dont `service_account`).
- Mapping effectivement parametre cote Paheko via `PAHEKO_OIDC_CLIENT_MATCH_EMAIL` -> `OIDC_CLIENT_MATCH_EMAIL` (matching email explicite, sans fallback implicite documente).
- Cas fail-closed documentes et traces par `request_id` sans fuite sensible (codes raisons explicites).
- Variables runtime Paheko OIDC centralisees dans `.env.example` (section `PAHEKO_OIDC_*`) et mini-guide ops aligne dans `doc/deployment.md`.
- Nominal OIDC rejoue apres mitigation:
  - callback OAuth recu avec `code` + `state`;
  - redirection `/admin/` et cookie de session `pko` emis;
  - preuve tracee dans `_bmad-output/implementation-artifacts/14-2-paheko-oidc-nominal-run.log`.
- Durcification additionnelle explicitement **hors scope 14.2** (reportee a une story de hardening), sans reblocage de la progression.
- ✅ Resolved review finding [HIGH]: preuves de rejet executees directement sur le flux OIDC Paheko (`account_not_found`, `missing_email`) avec traces sanitisees dediees.
- ✅ Resolved review finding [HIGH]: `OIDC_CLIENT_MATCH_EMAIL` pilote au runtime via `PAHEKO_OIDC_CLIENT_MATCH_EMAIL` (plus de hardcode).
- ✅ Resolved review finding [MEDIUM]: suppression des defaults implicites non vides pour `OIDC_CLIENT_URL` et `OIDC_CLIENT_ID` dans `paheko-config/config.local.php`.
- ✅ Resolved review finding [MEDIUM]: File List alignee avec la realite versionnee; suppression de `.env` non versionne.

### File List

- `_bmad-output/implementation-artifacts/14-2-configurer-paheko-oidc-et-strategie-de-mapping-utilisateur.md`
- `_bmad-output/implementation-artifacts/14-2-paheko-oidc-configuration-et-strategie-mapping.md`
- `_bmad-output/implementation-artifacts/14-2-paheko-oidc-preuves-validation-dev-local.md`
- `doc/deployment.md`
- `.env.example`
- `docker-compose.yml`
- `paheko-config/config.local.php`
- `paheko-config/keycloak-client-paheko-web-dev.json`
- `paheko-config/seed_paheko_member.php`
- `paheko-config/check_paheko_oidc_nominal.py`
- `_bmad-output/implementation-artifacts/14-2-paheko-oidc-nominal-run.log`
- `_bmad-output/implementation-artifacts/14-2-paheko-oidc-rejet-account-not-found.log`
- `_bmad-output/implementation-artifacts/14-2-paheko-oidc-rejet-missing-email.log`

## Senior Developer Review (AI)

Date: 2026-02-28
Reviewer: bmad-qa
Decision: changes-requested

### Findings

1. [HIGH] Couverture AC2/AC5 insuffisante sur le flux Paheko: les "2 rejets critiques" annonces reposent sur des tests API RecyClique, pas sur des rejets verifies directement sur le login OIDC Paheko.
2. [HIGH] Parametre de mapping non centralise: `paheko-config/config.local.php` force `OIDC_CLIENT_MATCH_EMAIL=true` et n'utilise pas `PAHEKO_OIDC_CLIENT_MATCH_EMAIL`, alors que la story revendique une configuration runtime centralisee.
3. [MEDIUM] Fallback implicite de configuration OIDC Paheko: `OIDC_CLIENT_URL` et `OIDC_CLIENT_ID` ont des valeurs par defaut non vides dans le code, ce qui masque les erreurs de config et contredit l'objectif "pas de fallback implicite".
4. [MEDIUM] Incoherence de tracabilite git/story: la File List declare `.env` comme modifie, mais aucune modification `.env` n'apparait dans les changements git examines.

### AC Assessment

- AC1: PARTIAL (nominal dev/local demontre, mais preuve outillee finale fragile sur maintien de session).
- AC2: PARTIAL (strategie documentee, mais execution des rejets sur flux Paheko non suffisamment prouvee).
- AC3: PARTIAL (claims documentes, verification appliquee cote API; preuve directe cote Paheko a renforcer).
- AC4: PARTIAL (secrets hors depot globalement respectes, mais configuration runtime pas totalement centralisee).
- AC5: PARTIAL (limites de scope explicites, mais validation dev/local incomplete sur rejets Paheko).

### Re-review final (post-corrections)

Date: 2026-02-28
Reviewer: bmad-qa
Decision: approved

Verification des findings precedents:

1. [RESOLU] Preuves de rejets executes sur flux OIDC Paheko: logs dedies ajoutes (`14-2-paheko-oidc-rejet-account-not-found.log`, `14-2-paheko-oidc-rejet-missing-email.log`) avec traces de refus fail-closed.
2. [RESOLU] Runtime centralise pour le mapping: `PAHEKO_OIDC_CLIENT_MATCH_EMAIL` pilote `OIDC_CLIENT_MATCH_EMAIL` dans `paheko-config/config.local.php`.
3. [RESOLU] Fail-closed de configuration: suppression des defaults implicites non vides pour URL/client_id dans `paheko-config/config.local.php`.
4. [RESOLU] Coherence story/git: File List alignee et `.env` retire des fichiers modifies.

Points de hardening supplementaire (non bloquants hors 14.2):

- Le script de preuve `paheko-config/check_paheko_oidc_nominal.py` reste un harnais dev/local (heuristiques de validation HTML/cookies); un durcissement outillage peut etre traite dans une story dediee sans reouvrir 14.2.
- La generalisation preprod/prod reste strictement conditionnee a la reprise du gate 14.0.

## Change Log

- 2026-02-28: Creation de la story 14.2 et preparation au dev (`ready-for-dev`).
- 2026-02-28: Validation checklist create-story appliquee et story renforcee (scenarios de validation, guardrail done/no-go 14.0, references 14.1 completees).
- 2026-02-28: Demarrage implementation `dev-story` (`in-progress`) avec production des artefacts 14.2 de configuration/mapping, preuves sanitisees dev/local, et centralisation runtime (`.env.example`, `doc/deployment.md`).
- 2026-02-28: Blocage residual sur AC1 (nominal OIDC Paheko): route callback candidate non disponible en local (`404`), en attente d'activation/configuration OIDC effective cote Paheko.
- 2026-02-28: Reprise HITL appliquee (activation OIDC via `/var/www/paheko/config.local.php` + callback exact `http://localhost:8080/admin/login.php?oidc`), puis provisionnement IdP local standard (Keycloak Docker + realm/client/user + membre Paheko de test).
- 2026-02-28: Nominal AC1 toujours bloque: erreur OAuth observable `invalid_scope` lors du retour IdP vers Paheko, malgre callback/redirect et jeu de test aligns.
- 2026-02-28: Mitigation A appliquee via HITL: capture `authorize` + `scope` exact Paheko, ajustement Keycloak (`serviceAccountsEnabled=true`), rejeu nominal sans `invalid_scope`, preuves AC1 mises a jour; story passee en `review`.
- 2026-02-28: Revue adversariale BMAD (bmad-qa) terminee avec decision `changes-requested`; story repassee `in-progress` et follow-ups AI ajoutes.
- 2026-02-28: Corrections post-review appliquees: preuves de rejets sur flux OIDC Paheko ajoutees (logs `account_not_found` et `missing_email`), runtime `PAHEKO_OIDC_CLIENT_MATCH_EMAIL` centralise, defaults implicites URL/client_id supprimes dans `config.local.php`, File List corrigee; story repassee `review`.
- 2026-02-28: Code review adversarial final (bmad-qa) valide: findings precedents verifies comme resolus, hardening complementaire classe hors scope 14.2 non bloquant, story passee `done`.
