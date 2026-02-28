# Story 14.1: Provisionner IdP commun dev/prod et clients OIDC

Status: done

## Story

En tant qu'equipe technique,
je veux provisionner un IdP commun et declarer les clients OIDC RecyClique/Paheko,
afin d'avoir un socle d'identite unique exploitable en environnement reel.

## Acceptance Criteria

1. Etant donne un environnement dev puis prod cible, quand l'IdP est provisionne avec HTTPS et durcissement minimal, alors les metadata OIDC (issuer, authorization_endpoint, token_endpoint, jwks_uri, end_session_endpoint) sont disponibles et verifiables.
2. Etant donne les applications RecyClique et Paheko, quand les clients OIDC sont declares dans l'IdP, alors les redirect URIs, post-logout redirect URIs, scopes et types de grant requis sont configures sans ambiguite.
3. Et les secrets OIDC (client secrets, clefs de signature, credentials d'admin IdP) sont geres hors code source (variables d'environnement, coffre de secrets ou equivalent) avec procedure de rotation documentee.
4. Et le provisionnement inclut la preparation operationnelle dev/prod (naming, tenants/realms, DNS/TLS, variables runtime, preflight checks), avec une checklist rejouable et un inventaire de configuration sanitise.
5. Et obligation explicite de reprise gate 14.0: des qu'un environnement reel OIDC HTTPS (au moins preprod ou equivalent) est disponible, executer la preuve nominale complete `14-0` (start -> callback -> session ouverte `/v1/auth/session`) et mettre a jour les artefacts `14-0-oidc-gate-preuves.md` et `14-0-oidc-gate-runbook.md` avant de considerer la generalisation OIDC.

## Prerequisites & Scope Boundaries

- Prerequis:
  - Epic 12 done (12.1 a 12.6).
  - Epic 13 stable.
  - Story 14.0 disponible comme gate precedent; tant qu'aucun environnement reel OIDC HTTPS n'est disponible, conserver le statut `NO-GO provisoire` et ne pas considerer la generalisation OIDC comme acquise.
- Hors scope:
  - Pas de finalisation du mapping utilisateur Paheko (traitee en 14.2).
  - Pas de finalisation runtime BFF RecyClique (traitee en 14.3).
  - Pas de campagne E2E complete auth (traitee en 14.4).

## Tasks / Subtasks

- [x] Concevoir le plan de provisionnement IdP commun dev/prod (AC: 1, 4)
  - [x] Definir la topologie cible (realm/tenant, clients, environnements, conventions de nommage).
  - [x] Definir les prerequis infra (DNS, certificats TLS, acces reseau, endpoints sortants).
  - [x] Definir les garde-fous de securite minimaux (MFA admin IdP, comptes techniques dedies, moindre privilege).

- [ ] Provisionner l'IdP et verifier les endpoints OIDC (AC: 1)
  - [x] Valide maintenant (dev/local): deployer/configurer l'IdP en dev local avec HTTPS de dev (certificat auto-signe acceptable).
  - [x] Valide maintenant (dev/local): verifier la disponibilite des metadata OIDC et la coherence de l'issuer en dev/local.
  - [x] Valide maintenant (dev/local): capturer des preuves sanitisees de disponibilite dev/local (sans secrets).
  - [ ] Valide plus tard (preprod/prod): reproduire la verification metadata + issuer sur environnement reel preprod/prod.

- [ ] Declarer les clients OIDC RecyClique et Paheko (AC: 2)
  - [x] Valide maintenant (dev/local): configurer client RecyClique (BFF Authorization Code + PKCE, redirect/callback/logout) pour `dev`.
  - [x] Valide maintenant (dev/local): configurer client Paheko avec les URIs de redirection attendues pour `dev`.
  - [x] Valide maintenant (dev/local): verifier que scopes/claims requis IAM (role, tenant, sub/email selon strategie cible) sont disponibles en `dev/local`.
  - [ ] Valide plus tard (preprod/prod): decliner et verifier les deux clients sur cibles preprod/prod.

- [x] Mettre en place la gestion des secrets et la rotation (AC: 3)
  - [x] Externaliser tous les secrets OIDC hors depot git.
  - [x] Documenter qui peut lire/rotater les secrets et la frequence minimale de rotation.
  - [x] Verifier qu'aucune valeur sensible n'apparait dans les artefacts produits.

- [x] Produire la checklist operationnelle dev/prod et l'inventaire de configuration (AC: 4)
  - [x] Ecrire un preflight standardise (connectivite, DNS/TLS, variables, metadata, horloge systeme).
  - [x] Ecrire les commandes/checks de validation post-provisionnement.
  - [x] Lister les ecarts acceptes temporairement entre dev et prod avec plan de convergence.

- [ ] Executer la reprise obligatoire du gate 14.0 des que l'environnement reel HTTPS existe (AC: 5)
  - [ ] Valide plus tard (preprod/prod): rejouer le nominal complet: `/v1/auth/sso/start` -> callback -> `/v1/auth/session`.
  - [ ] Valide plus tard (preprod/prod): rejouer les checks fail-closed critiques (`400` state invalide, `503` dependance IdP indisponible).
  - [ ] Valide plus tard (preprod/prod): mettre a jour `14-0-oidc-gate-preuves.md` et `14-0-oidc-gate-runbook.md` avec preuves sanitisees.

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Ajouter une preuve technique explicite pour la verification metadata OIDC en dev/local (sortie sanitisee ou extrait structurel) au lieu de cases cochees sans evidence verifiable.
- [x] [AI-Review][HIGH] Remplacer les placeholders ambigus `https://paheko-<env>.example.org/...` par des redirect URIs et post-logout URIs exactes pour `paheko-web-dev` (et le format attendu preprod/prod), afin de satisfaire AC2 "sans ambiguite".
- [x] [AI-Review][MEDIUM] Aligner le `Dev Agent Record -> File List` avec la realite git en ajoutant les artefacts modifies `14-0-oidc-gate-preuves.md` et `14-0-oidc-gate-runbook.md`.

## Dev Notes

- Cette story est une story de socle operationnel IAM: elle prepare les environnements et les clients OIDC, sans clore la mise en service applicative complete.
- Le statut `blocked / NO-GO provisoire` de 14.0 est un verrou de qualite: 14.1 doit fournir l'environnement reel qui permet de lever ce verrou par preuve nominale.
- Garder un decoupage clair des responsabilites:
  - 14.1 = provisionnement IdP + clients + secrets + preflight.
  - 14.2 = mapping utilisateur cote Paheko.
  - 14.3 = runtime BFF RecyClique.
  - 14.4 = E2E et non-regression.
  - 14.5 = runbooks exploitation.

### Technical Requirements

- OIDC:
  - Authorization Code + PKCE pour les parcours utilisateurs.
  - Endpoints metadata standards exposes et verifiables.
  - Claims minimums coherents avec IAM cible (sub, role, tenant, exp, aud, iss).
- Securite:
  - HTTPS obligatoire sur environnement reel (au moins preprod/prod cible).
  - Secrets hors code source et rotation tracee.
  - Journaux sans fuite de secrets.
- Operabilite:
  - Checklist preflight rejouable.
  - Inventaire de configuration sanitise par environnement.
  - Procedure explicite de reprise gate 14.0.

### Architecture Compliance

- Respecter les conventions d'architecture projet:
  - Configuration via variables d'environnement/secrets manager.
  - Fail-closed sur prerequis IAM manquants.
  - Pas de contournement ad hoc des flux BFF IAM deja poses en Epic 12.
- Respecter les invariants NFR de l'epic:
  - NFR-S1 a NFR-S4 (HTTPS, secrets, controle d'acces, hygiene donnees perso).
  - NFR-I1 pour la robustesse operationnelle (diagnostic et reprise sans perte de controle).

### File Structure Requirements

- Story: `_bmad-output/implementation-artifacts/14-1-provisionner-idp-commun-dev-prod-et-clients-oidc.md`
- Evidence/runbook updates attendues:
  - `_bmad-output/implementation-artifacts/14-0-oidc-gate-preuves.md`
  - `_bmad-output/implementation-artifacts/14-0-oidc-gate-runbook.md`
- Eventuels artefacts complementaires de 14.1:
  - `_bmad-output/implementation-artifacts/14-1-*.md`

### Project Structure Notes

- Ne pas disperser les decisions IAM dans des notes hors `_bmad-output/implementation-artifacts/` pour garder la tracabilite BMAD.
- Si des changements d'infra sont scripts, privilegier des emplacements deja etablis du projet (pas de nouveaux dossiers ad hoc).
- Toute preuve doit etre sanitisee et rejouable.

### Testing Requirements

- Minimum pour considerer 14.1 prete a passer en implementation:
  - Verification metadata OIDC disponible sur environnement provisionne.
  - Verification clients RecyClique/Paheko configures selon flux attendus.
  - Verification hygiene securite (secrets hors code, aucune fuite dans preuves).
- Obligation de sortie:
  - Reprise preuve nominale 14.0 sur environnement reel HTTPS des qu'il existe.
  - Mise a jour des artefacts 14.0 avec traces exploitables.

### Done Criteria Guardrail

- La story 14.1 peut avancer en `ready-for-dev` et `in-progress` sans preuve nominale 14.0 uniquement si l'environnement reel OIDC HTTPS n'existe pas encore.
- Des qu'un environnement reel (preprod/prod equivalent) est disponible, la preuve nominale complete `14-0` devient obligatoire avant cloture effective de 14.1:
  - rejouer `/v1/auth/sso/start` -> callback -> `/v1/auth/session`;
  - verifier aussi les cas fail-closed critiques;
  - mettre a jour `14-0-oidc-gate-preuves.md` et `14-0-oidc-gate-runbook.md`.

### References

- Epic source:
  - `_bmad-output/planning-artifacts/epics.md` (Epic 14, Story 14.1, FR17/FR16/NFR-S*/NFR-I1)
- Sprint tracking:
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Contexte gate precedent:
  - `_bmad-output/implementation-artifacts/14-0-gate-de-faisabilite-oidc-cible-paheko-image-version-environnement.md`
  - `_bmad-output/implementation-artifacts/14-0-oidc-gate-preuves.md`
  - `_bmad-output/implementation-artifacts/14-0-oidc-gate-runbook.md`
- Architecture:
  - `_bmad-output/planning-artifacts/architecture.md` (Implementation Readiness Validation, Gap Analysis Results, Implementation Handoff)
  - `references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md`

## Dev Agent Record

### Agent Model Used

gpt-5.3-codex

### Debug Log References

- Workflow applique: `_bmad/bmm/workflows/4-implementation/dev-story/`
- Sources lues:
  - `_bmad-output/planning-artifacts/epics.md`
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`
  - `_bmad-output/implementation-artifacts/14-0-gate-de-faisabilite-oidc-cible-paheko-image-version-environnement.md`
  - `_bmad-output/implementation-artifacts/14-0-oidc-gate-preuves.md`
  - `_bmad-output/implementation-artifacts/14-0-oidc-gate-runbook.md`
  - `_bmad-output/planning-artifacts/architecture.md`
  - `references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md`
- Sources implementation 14.1:
  - `doc/deployment.md`
  - `.env.example`
  - `_bmad-output/implementation-artifacts/14-0-oidc-gate-preuves.md`
  - `_bmad-output/implementation-artifacts/14-0-oidc-gate-runbook.md`

### Completion Notes List

- Story 14.1 remontee en `review` avec scope explicite de livraison immediate limite a `dev/local` (socle IdP, HTTPS dev, secrets/rotation documentes).
- Artefacts produits pour rejouabilite:
  - `_bmad-output/implementation-artifacts/14-1-idp-provisionnement-dev-prod-checklist.md`
  - `_bmad-output/implementation-artifacts/14-1-idp-inventaire-configuration-sanitise.md`
- `doc/deployment.md` complete avec preflight OIDC, verification metadata, rotation secrets et etapes explicites de reprise gate 14.0.
- `.env.example` complete avec variables OIDC/BFF attendues, sans secret en clair.
- Aucun blocage HITL pour la progression immediate 14.1: les validations preprod/prod et la reprise nominale 14-0 sont differes vers 14.4/14.5 (ou sous-story dediee) avec liste de preuves attendues.
- Corrections post-review integrees sur scope officiel 14.1 (dev/local):
  - preuve metadata OIDC dev/local explicite et sanitisee ajoutee dans les artefacts 14.1;
  - URIs Paheko desambiguees pour `paheko-web-dev` et explicitees pour preprod/prod;
  - tracabilite BMAD confirmee avec artefacts 14-0 dans la File List.
- Liste "valide plus tard en preprod":
  - verification metadata OIDC et coherence issuer sur cibles preprod/prod;
  - declaration/verification clients RecyClique + Paheko sur cibles preprod/prod;
  - replay gate 14-0 nominal + fail-closed avec traces sanitisees.

### File List

- `_bmad-output/implementation-artifacts/14-1-provisionner-idp-commun-dev-prod-et-clients-oidc.md`
- `_bmad-output/implementation-artifacts/14-1-idp-provisionnement-dev-prod-checklist.md`
- `_bmad-output/implementation-artifacts/14-1-idp-inventaire-configuration-sanitise.md`
- `_bmad-output/implementation-artifacts/14-1-provisionner-idp-commun-dev-prod-et-clients-oidc.agent-state.json`
- `_bmad-output/implementation-artifacts/14-0-oidc-gate-preuves.md`
- `_bmad-output/implementation-artifacts/14-0-oidc-gate-runbook.md`
- `doc/deployment.md`
- `.env.example`

## Senior Developer Review (AI)

Date: 2026-02-28  
Reviewer: QA code-review adversarial (BMAD)
Outcome: **Changes Requested**

### Findings

1. **HIGH - AC1 preuve insuffisante en dev/local**
   - Les artefacts `14-1-idp-provisionnement-dev-prod-checklist.md` et `doc/deployment.md` decrivent la verification des metadata OIDC, mais ne contiennent pas de preuve technique explicite (sortie sanitisee verifiable) pour l'etat "valide maintenant (dev/local)".
   - Impact: AC1 reste partiellement verifiee (assertion documentaire sans evidence probante).

2. **HIGH - AC2 ambiguite sur les URIs Paheko**
   - Dans `14-1-idp-inventaire-configuration-sanitise.md`, les URIs Paheko sont notees avec `...` pour dev/preprod/prod.
   - Impact: la configuration clients n'est pas "sans ambiguite" au sens de l'AC2.

3. **MEDIUM - incoherence File List vs changements reels**
   - Les fichiers `14-0-oidc-gate-preuves.md` et `14-0-oidc-gate-runbook.md` sont modifies/ajoutes en git mais etaient absents de la `File List` initiale.
   - Impact: tracabilite BMAD incomplete, revue et handoff fragilises.

### AC Coverage (scope officiel 14.1 = dev/local)

- AC1: **PARTIAL** (workflow et checklist presents, preuve technique dev/local insuffisamment explicite)
- AC2: **PARTIAL** (clients declares, mais URIs Paheko documentees de facon ambigue)
- AC3: **IMPLEMENTED** (secrets hors code + rotation documentee)
- AC4: **IMPLEMENTED (dev/local) / DIFFERE (preprod/prod)** selon directive
- AC5: **DIFFERE CONFORMEMENT AU SCOPE** (declenchement conditionnel quand environnement reel HTTPS disponible)

### Revue finale post-corrections

Date: 2026-02-28  
Reviewer: QA code-review adversarial (BMAD)
Outcome: **Approved**

Validation ciblee des 3 points demandes:

1. **Preuve metadata dev/local explicite: RESOLU**
   - Presence d'une preuve technique sanitisee et verifiable dans:
     - `14-1-idp-provisionnement-dev-prod-checklist.md` (commande rejouable + extrait JSON structurel)
     - `14-1-idp-inventaire-configuration-sanitise.md` (extrait metadata dev/local)

2. **URIs Paheko non ambigues en scope dev/local: RESOLU**
   - Les URIs de `paheko-web-dev` sont explicites et completes.
   - Les placeholders `preprod/prod` restent documentes comme "valide plus tard", conformement au scope officiel (non penalise dans cette revue).

3. **File List complete: RESOLU**
   - La `File List` inclut bien les artefacts 14-0 (`14-0-oidc-gate-preuves.md`, `14-0-oidc-gate-runbook.md`) demandes au point precedent.
   - Alignement jugé suffisant pour la tracabilite BMAD de la story 14.1 en perimetre dev/local.

Conclusion revue:
- Aucun HIGH/MEDIUM residuel sur le scope officiel dev/local.
- Story 14.1 approuvee pour passage en `done` dans ce perimetre; validations preprod/prod et reprise gate 14-0 complete restent explicitement differees.

## Change Log

- 2026-02-28: Story 14.1 prise en charge en `dev-story`; statut passe de `ready-for-dev` a `in-progress`.
- 2026-02-28: Production de la checklist operationnelle rejouable et de l'inventaire sanitise (`14-1-idp-provisionnement-dev-prod-checklist.md`, `14-1-idp-inventaire-configuration-sanitise.md`).
- 2026-02-28: Documentation de deploiement et variables `.env.example` enrichies pour l'operabilite OIDC (preflight metadata, rotation secrets, trigger explicite replay gate 14-0).
- 2026-02-28: Blocage HITL ouvert pour execution sur environnement OIDC HTTPS reel (provisionnement effectif IdP/clients + preuves nominales 14-0).
- 2026-02-28: Reprise avec directive utilisateur: 14.1 reste `in-progress` sans prerequis preprod immediat; scope livre maintenant borne a `dev/local`, validations preprod/prod explicitement differees.
- 2026-02-28: Code review adversarial BMAD realise -> **changes-requested** (preuves metadata dev/local a renforcer, URIs Paheko a desambiguiser, File List alignee).
- 2026-02-28: Corrections post-review appliquees: preuve metadata OIDC dev/local explicite ajoutee, URIs Paheko desambiguees, File List confirmee avec artefacts 14-0; story remontee en `review` pour revalidation.
- 2026-02-28: Code review adversarial final post-corrections -> **approved** sur scope officiel `dev/local` (preuves metadata explicites, URIs Paheko dev non ambigues, File List complete) ; statut story passe a `done`.
