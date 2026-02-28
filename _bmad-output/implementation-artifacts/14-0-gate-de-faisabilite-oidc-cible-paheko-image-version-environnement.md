# Story 14.0: Gate de faisabilite OIDC cible Paheko image version environnement

Status: blocked / no-go-provisoire

## Story

En tant qu'admin technique,
je veux valider officiellement la faisabilite OIDC sur l'image/version Paheko cible,
afin de lever toute ambiguite avant la generalisation.

## Acceptance Criteria

1. Etant donne l'image Paheko cible dev/prod, quand un test controle active OIDC (config minimale + verification login), alors la capacite est confirmee ou invalidee avec preuves techniques.
2. Et les limites/contraintes (version, mode hebergement, prerequis) sont documentees dans un runbook exploitable.

## Prerequisites & Scope Boundaries

- Prerequis amont:
  - Epic 12 done (socle IAM/SSO et garde-fous).
  - Epic 13 stable (pas de bruit visuel bloquant sur les parcours auth).
- Hors scope explicite de la story 14.0:
  - Pas de mise en service generale OIDC en production.
  - Pas de refonte fonctionnelle auth/RBAC.
  - Pas d'implementation E2E complete cross-plateforme (traitee en 14.4).

## Tasks / Subtasks

- [x] Etablir le perimetre exact du gate OIDC (AC: 1, 2)
  - [x] Identifier les cibles de test: image/tag Paheko, mode hebergement (dev local, preprod, prod cible), methode d'auth actuelle.
  - [x] Verifier les prerequis techniques minimaux: HTTPS, variables d'environnement, secret management hors code, connectivite IdP.
  - [x] Definir les criteres de decision explicites: GO, GO avec contraintes, NO-GO.

- [ ] Executer un test OIDC minimal et reproductible sur la cible Paheko (AC: 1)
  - [x] Activer une configuration OIDC minimale sur un environnement controle.
  - [ ] Realiser au moins un parcours de login nominal (initiation, callback, session ouverte) et un parcours d'echec attendu.
  - [x] Verifier les signaux techniques minimaux: endpoint de login disponible, redirection valide, claims essentiels presentes, echec propre si prerequis manquant.

- [x] Produire les preuves techniques du gate (AC: 1)
  - [x] Capturer les preuves de configuration (sans exposer de secrets): image/version, variables non sensibles, mode d'hebergement.
  - [x] Capturer les preuves d'execution: journaux applicatifs, traces de redirection/callback, resultat final par scenario.
  - [x] Consolider un verdict binaire par environnement cible: confirme, invalide, ou confirme avec restrictions.
  - [x] Produire un artefact de preuve dedie (ex: `_bmad-output/implementation-artifacts/14-0-oidc-gate-preuves.md`) avec matrice scenario -> resultat -> evidence.

- [x] Rediger le runbook de contraintes et conditions d'activation (AC: 2)
  - [x] Documenter les limites connues: compatibilite image/version, contraintes d'hebergement, prerequis reseau/TLS, impact plugin/eventuel.
  - [x] Documenter le mode operatoire de verification et les checks de diagnostic rapide.
  - [x] Documenter la conduite a tenir en cas de NO-GO (fallback FR16) et les preconditions d'entree pour les stories 14.1 et 14.2.
  - [x] Produire un runbook dedie (ex: `_bmad-output/implementation-artifacts/14-0-oidc-gate-runbook.md`) avec sections "preflight", "test nominal", "test echec", "GO/NO-GO", "rollback decisionnel".

- [x] Valider la qualite et la tracabilite du gate (AC: 1, 2)
  - [x] Relecture croisee des resultats avec les exigences IAM Epic 12 et les NFR securite/integration.
  - [x] Confirmer que les artefacts sont exploitables par dev/ops sans interpretation implicite.
  - [x] Publier une decision finale claire et actionnable (GO/NO-GO + conditions).

- [ ] Review Follow-ups (AI)
  - [ ] [AI-Review][HIGH] Fournir une preuve nominale OIDC avec IdP reel sur un environnement cible (au minimum preprod), incluant initiation -> callback -> session ouverte (`/v1/auth/session`) avec traces sanitisees.
  - [x] [AI-Review][HIGH] Epingler explicitement l'image Paheko (tag/version) sur la cible de gate et mettre a jour les preuves avec cette version.
  - [x] [AI-Review][MEDIUM] Completer la File List avec les fichiers applicatifs effectivement touches pour le scope de la story, ou documenter explicitement pourquoi ils sont hors perimetre.

## Dev Notes

- Objectif de cette story: produire un gate de faisabilite, pas une mise en service complete OIDC. L'implementation generale arrive dans les stories 14.1 a 14.5.
- Respecter la separation des responsabilites de l'architecture: RecyClique orchestre, Paheko reste service separe; aucune decision de bypass BDD n'est introduite ici.
- Exiger des preuves reproductibles et non ambigues, car ce gate conditionne les stories suivantes de l'epic.
- Toute preuve doit exclure les secrets (tokens, client secrets, mots de passe, valeurs sensibles).

### Technical Requirements

- Auth/Securite:
  - Aligner le gate sur la trajectoire IAM: FR17 principal, FR16 fallback/transition.
  - Verifier les invariants de securite minimum: HTTPS, secrets hors code, echec fail-closed sur prerequis manquant.
- Observabilite:
  - Tracer les tests avec logs structures et correlation request_id quand applicable.
  - Fournir des traces suffisantes pour diagnostiquer un echec (sans fuite de donnees sensibles).
- Integration:
  - Considerer RecyClique et Paheko comme deux clients/acteurs d'un meme dispositif identite; ne pas valider partiellement sans expliciter les ecarts.

### Architecture Compliance

- Stack et conventions a respecter:
  - Node 20 LTS, Python 3.12, conventions de config par variables d'environnement.
  - API et echanges en contrats explicites, pas de comportement implicite non documente.
- Gouvernance technique:
  - La story doit conclure avec un verdict actionnable pour la suite (14.1 puis 14.2).
  - Si une limitation critique est detectee, la documenter comme condition bloquante formelle.

### File Structure Requirements

- Story de sortie (ce fichier): `_bmad-output/implementation-artifacts/14-0-gate-de-faisabilite-oidc-cible-paheko-image-version-environnement.md`
- Evidence/rendus conseilles:
  - Annexes techniques dans `_bmad-output/implementation-artifacts/` (nommage prefixe `14-0-...`).
  - Si captures necessaires, les placer dans un sous-dossier dedie de `screenshots/` pour tracabilite.

### Project Structure Notes

- Conserver le gate comme livrable documentaire et operatoire dans `_bmad-output/implementation-artifacts/`; ne pas disperser des preuves dans des dossiers metier non lies.
- Toute configuration manipulee pour les tests OIDC doit rester externalisee (variables d'environnement / secrets manager), conforme aux conventions architecture.
- Si des scripts de verification sont ajoutes, les placer dans les emplacements standards du projet (pas de nouveau dossier ad hoc).

### Testing Requirements

- Minimum attendu pour valider le gate:
  - 1 scenario nominal OIDC valide.
  - 1 scenario d'echec controle (prerequis absent/invalide) avec comportement explicite.
  - 1 verification de non-regression de securite (absence de secret expose dans logs/artefacts).
- Le gate est valide seulement si les tests sont rejouables et mappes a un verdict clair.

### References

- Epic source:
  - `_bmad-output/planning-artifacts/epics.md` (Epic 14, Story 14.0, FR17/FR16/NFR-S*)
- Sprint tracking:
  - `_bmad-output/implementation-artifacts/sprint-status.yaml` (development_status epic-14)
- Architecture:
  - `_bmad-output/planning-artifacts/architecture.md` (sections "Implementation Readiness Validation", "Gap Analysis Results", "Implementation Handoff", plus contraintes securite/integration RecyClique <-> Paheko)
- Checklist architecture v0.1:
  - `references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md` (tests frontend, stack, conventions structurelles)

## Dev Agent Record

### Agent Model Used

gpt-5.3-codex

### Debug Log References

- Workflow applique: `_bmad/bmm/workflows/4-implementation/dev-story/`.
- Sources lues: `docker-compose.yml`, `.env`, `.env.example`, `api/config/settings.py`, `api/routers/v1/auth.py`, `api/tests/routers/test_auth.py`, `doc/deployment.md`.
- Commandes de verification executees:
  - `docker compose version`
  - `docker image inspect paheko/paheko --format "{{json .RepoDigests}}"`
  - `docker image ls paheko/paheko --format "{{.Repository}}:{{.Tag}}|{{.ID}}"`
  - `docker compose config --images`
  - `docker compose ps`
  - `curl.exe -s -o NUL -w "%{http_code}" "http://localhost:8000/health"`
  - `curl.exe -s -D - "http://localhost:8000/v1/auth/sso/start?next=%2Fadmin" -o NUL`
  - `curl.exe -s -D - "http://localhost:8000/v1/auth/sso/callback?code=dummy&state=missing" -o -`
  - `python -m pytest "api/tests/routers/test_auth.py" -k "sso_callback_nominal_sets_bff_cookie_and_redirects or sso_callback_invalid_state_returns_400 or sso_callback_returns_503_when_idp_dependency_unavailable"`

### Completion Notes List

- Gate OIDC execute sur `dev-local` avec preuves techniques reproductibles (stack Docker active, endpoint start OIDC disponible, callback fail-closed valide, tests OIDC cibles passes).
- Artefact de preuves livre: `_bmad-output/implementation-artifacts/14-0-oidc-gate-preuves.md` avec matrice scenario -> resultat -> evidence et verdict par environnement.
- Runbook operationnel livre: `_bmad-output/implementation-artifacts/14-0-oidc-gate-runbook.md` avec sections `preflight`, `test nominal`, `test echec`, `GO/NO-GO`, `rollback decisionnel`.
- Relecture croisee IAM Epic 12/NFR securite-integration effectuee; conditions fail-closed et claims OIDC essentiels explicites.
- Decision finale publiee: **NO-GO pour generalisation OIDC** tant que la preuve nominale IdP reel en HTTPS (preprod/prod) n'est pas fournie.
- Correction post-review appliquee: image Paheko epinglee par digest dans `docker-compose.yml`, preuves et runbook mis a jour en coherence.
- Tracabilite completee: la story 14.0 ne modifie pas de fichiers applicatifs `api/*` ou `frontend/*` dans ce lot; les changements applicatifs visibles dans le worktree appartiennent a d'autres stories/epics.

### File List

- `_bmad-output/implementation-artifacts/14-0-gate-de-faisabilite-oidc-cible-paheko-image-version-environnement.md`
- `_bmad-output/implementation-artifacts/14-0-oidc-gate-preuves.md`
- `_bmad-output/implementation-artifacts/14-0-oidc-gate-runbook.md`
- `docker-compose.yml`
- `_bmad-output/implementation-artifacts/14-0-gate-de-faisabilite-oidc-cible-paheko-image-version-environnement.agent-state.json`

## Senior Developer Review (AI)

Date: 2026-02-28  
Reviewer: BMAD QA (adversarial code review)
Outcome: **changes-requested**

### Findings

- **HIGH** - Tache marquee complete mais preuve nominale reelle absente.
  - Tache cochee: `Realiser au moins un parcours de login nominal (initiation, callback, session ouverte)`.
  - Preuve actuelle: le nominal repose sur un test controle/mocks (`api/tests/routers/test_auth.py`) et pas sur un parcours IdP reel sur cible preprod/prod.
  - Impact: la tache est surevaluee; le gate ne demontre pas un nominal reel rejouable sur cible.

- **HIGH** - Tache marquee complete sur image/version alors que la version cible n'est pas figee.
  - Tache cochee: `Capturer les preuves de configuration ... image/version`.
  - Preuve actuelle: `docker-compose.yml` utilise `image: paheko/paheko` sans tag explicite, et l'artefact confirme `tag non epingle`.
  - Impact: absence de reproductibilite stricte du gate; impossible de certifier la faisabilite sur une cible immutable.

- **MEDIUM** - Incoherence de tracabilite entre File List de story et changements git reels.
  - La File List recense uniquement des artefacts `_bmad-output`, alors que l'etat git contient de nombreux changements source (`api/*`, `frontend/*`) potentiellement relies au scope IAM/OIDC.
  - Impact: audit incomplet et risque de faux positif en review si les fichiers applicatifs modifies ne sont pas explicitement relies a la story.

### Review Follow-ups (AI)

- [ ] [AI-Review][HIGH] Fournir une preuve nominale OIDC avec IdP reel sur un environnement cible (au minimum preprod), incluant initiation -> callback -> session ouverte (`/v1/auth/session`) avec traces sanitisees.
- [x] [AI-Review][HIGH] Epingler explicitement l'image Paheko (tag/version) sur la cible de gate et mettre a jour les preuves avec cette version.
- [x] [AI-Review][MEDIUM] Completer la File List avec les fichiers applicatifs effectivement touches pour le scope de la story, ou documenter explicitement pourquoi ils sont hors perimetre.

## Change Log

- 2026-02-28: Story 14.0 implementee (gate de faisabilite OIDC), production des artefacts de preuves et runbook, decision gate publiee (NO-GO avec conditions), statut passe a `review`.
- 2026-02-28: Revue adversariale BMAD QA terminee, ecarts HIGH/MEDIUM identifies, statut repasse a `in-progress` pour corrections.
- 2026-02-28: Corrections post-review appliquees (image Paheko epinglee par digest + preuves/runbook/story realignes), 2/3 follow-ups resolus; blocage residuel sur preuve nominale IdP reel en environnement cible.
- 2026-02-28: Cloture provisoire en `blocked / NO-GO provisoire` (pas done) sur decision utilisateur: absence de preprod OIDC HTTPS disponible pour produire la preuve nominale reelle.

## Cloture provisoire 14.0 (blocked / NO-GO)

### 1) Valide dans 14.0

- Image Paheko epinglee par digest (preuve et config alignees, reproductibilite locale retablie).
- Tracabilite story completee (File List et Change Log alignes sur le lot reel).
- Gate documentaire et operatoire publie (preuves + runbook) avec verdict explicite par environnement.

### 2) Blocage restant

- Absence d'environnement OIDC reel en HTTPS (au moins preprod) pour rejouer le nominal complet (`/v1/auth/sso/start` -> callback -> `/v1/auth/session`).
- En consequence, la preuve nominale hors simulation n'est pas disponible; la story ne peut pas passer `done`.

### 3) Checklist minimale de reprise

- [ ] Disposer d'un environnement preprod (ou equivalent) avec IdP OIDC reel et HTTPS.
- [ ] Rejouer le nominal complet et capturer les preuves sanitisees (initiation, callback, session ouverte).
- [ ] Verifier que l'image Paheko est epinglee sur l'environnement cible avec preuve d'inventaire.
- [ ] Revalider les scenarios fail-closed (`400/503`) sur la cible.
- [ ] Mettre a jour `14-0-oidc-gate-preuves.md`, `14-0-oidc-gate-runbook.md`, puis repasser en review QA.

Rappel de suite: execution prevue en `14-1` pour creer cet environnement, puis retour sur la preuve nominale 14.0 a la fin de 14-1.
