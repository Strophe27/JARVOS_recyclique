# Story 17.2: Correction controle d'acces `/v1/users/me` en etat deconnecte

Status: done

## Story

As a utilisateur non authentifie,
I want recevoir un refus 401 sur `/v1/users/me`,
so that le controle d'acces utilisateur courant respecte le contrat de securite.

## Acceptance Criteria

1. **Given** une requete sur `/v1/users/me` sans session/token valide  
   **When** l'endpoint est appele  
   **Then** la reponse est 401 (et non 200)  
   **And** le test automatique correspondant passe dans la campagne standard.

## Tasks / Subtasks

- [x] Verifier le contrat non-authentifie de `/v1/users/me` (AC: 1)
  - [x] Rejouer le test cible `test_get_me_unauthorized`.
  - [x] Verifier le code de statut de la reponse (`401`) et l'absence de retour `200`.
- [x] Fiabiliser la couverture de tests en scope strict story 17.2 (AC: 1)
  - [x] Rejouer la campagne standard de reference `api/tests/routers/test_auth.py`.
  - [x] Confirmer qu'aucune story `17.3+` n'est lancee en parallele.
- [x] Tracer la fermeture de l'ecart `E16-C-001` (AC: 1)
  - [x] Mettre a jour `_bmad-output/implementation-artifacts/16-0-tableau-unique-ecarts.md` avec la preuve liee.
  - [x] Renseigner la justification de fermeture basee sur les tests executes.
- [x] Capturer les preuves minimales de fermeture (AC: 1)
  - [x] Archiver la sortie pytest ciblee dans `_bmad-output/implementation-artifacts/17-2-preuve-pytest-users-me-non-auth.txt`.
  - [x] Referencer explicitement le diff backend concerne (fichiers touches + extrait de changement), avec ancrage minimum sur `api/core/deps.py` ou `api/routers/v1/auth.py`.

## Dev Notes

### Contexte et guardrails de scope

- Epic cible: `epic-17`, execution strictement limitee a la story `17.2`.
- Mapping E16 autorise uniquement: `E16-C-001`.
- Dependance obligatoire: story `17.0` terminee et validee (harness/tests stabilises).
- Interdiction d'elargir vers `17.3+` ou vers d'autres ecarts `E16-*`.

### Contraintes architecture et qualite

- Reutiliser les mecanismes d'auth existants (`get_current_user`) sans introduire de logique parallele.
- Limiter les changements au flux `/v1/users/me` et a ses tests cibles; pas de refactor RBAC global.
- Validation backend via pytest uniquement sur la surface auth/session concernee.
- Aucun changement frontend attendu pour cette story.

### Project Structure Notes

- Endpoint cible: route `/v1/users/me` dans le domaine auth API (`api/routers/v1/auth.py`).
- Dependances de securite centralisees dans `api/core/deps.py`.
- Tests cibles dans `api/tests/routers/test_auth.py`.
- Artefacts de preuve dans `_bmad-output/implementation-artifacts/`.

### Intelligence story precedente (17.1)

- La story 17.1 a verrouille les surfaces super-admin phase 1 avec preuves front/back.
- La story 17.2 reste strictement sur le contrat non-authentifie de `/v1/users/me` (pas de reprise du scope RBAC phase 1).
- Le mode d'execution reste story par story avec preuves explicites par ID E16.

### Testing Requirements

- Commande cible: `PYTHONPATH=. pytest api/tests/routers/test_auth.py -k test_get_me_unauthorized -q`
- Commande de verification de campagne: `PYTHONPATH=. pytest api/tests/routers/test_auth.py -q`
- Resultat attendu minimal: test `test_get_me_unauthorized` vert et retour `401` confirme.
- Trace de preuve attendue: sortie pytest ciblee + reference explicite au diff backend corrigeant le controle d'acces `/v1/users/me`.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Epic 17, Story 17.2]
- [Source: `_bmad-output/implementation-artifacts/16-0-tableau-unique-ecarts.md` - `E16-C-001`]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - Gap Analysis Results, Implementation Readiness Validation, Implementation Handoff]
- [Source: `references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md`]
- [Source: `_bmad-output/implementation-artifacts/17-1-verrouillage-rbac-super-admin-phase-1-front-back.md`]
- [Source: `api/core/deps.py`]
- [Source: `api/routers/v1/auth.py`]
- [Source: `api/tests/routers/test_auth.py`]

## Dev Agent Record

### Agent Model Used

gpt-5.3-codex (subagent `bmad-dev`)

### Debug Log References

- `PYTHONPATH=. pytest api/tests/routers/test_auth.py -k test_get_me_unauthorized -q` -> `1 passed, 36 deselected`
- `PYTHONPATH=. pytest api/tests/routers/test_auth.py -q` -> `37 passed`
- `git diff --name-only -- api/core/deps.py api/routers/v1/auth.py` -> `(aucune sortie)`
- `git diff -- api/core/deps.py api/routers/v1/auth.py` -> `(aucun diff)`
- `rg "def get_current_user|if user is None|WWW-Authenticate|Not authenticated" api/core/deps.py` -> ancrage present sur la logique fail-closed (401)

### Completion Notes List

- Scope strict respecte: validation executee uniquement sur la surface `/v1/users/me` non-auth et la campagne auth de reference; aucune action sur `17.3+`.
- Preuve archivee completee: `_bmad-output/implementation-artifacts/17-2-preuve-pytest-users-me-non-auth.txt` contient desormais le test cible et la campagne standard auth.
- Contrat AC confirme: `test_get_me_unauthorized` retourne `401` sans session/token valide, et la campagne standard `api/tests/routers/test_auth.py` est verte (`37 passed`).
- Justification verifiable du diff backend concerne pour ce run: aucun diff backend additionnel n'etait requis ni produit pendant cette correction de tracabilite (`git diff` vide sur `api/core/deps.py` et `api/routers/v1/auth.py`). L'ancrage de la logique effective reste verifiable dans `api/core/deps.py` (`get_current_user` -> `if user is None` -> `HTTPException 401` avec `WWW-Authenticate: Bearer`) et couvre l'acces `/v1/users/me`.

### File List

- `_bmad-output/implementation-artifacts/17-2-correction-controle-acces-users-me-etat-deconnecte.md` (mise a jour story: Dev Agent Record, File List, statut)
- `_bmad-output/implementation-artifacts/17-2-preuve-pytest-users-me-non-auth.txt` (preuve pytest completee: test cible + campagne standard)
- `_bmad-output/implementation-artifacts/16-0-tableau-unique-ecarts.md` (mise a jour tracabilite `E16-C-001`)
- `api/tests/routers/test_auth.py` (fichier modifie present dans l'etat git de la story 17.2)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (story `17-2` passee a `review`)

## Senior Developer Review (AI)

Date: 2026-03-01  
Reviewer: Strophe (bmad-qa)  
Decision: **changes-requested**

### Scope de review

- Scope strict applique: Epic 17 / Story 17.2 uniquement.
- Verification runtime executee:
  - `PYTHONPATH=. pytest api/tests/routers/test_auth.py -k test_get_me_unauthorized -q` -> `1 passed, 36 deselected`
  - `PYTHONPATH=. pytest api/tests/routers/test_auth.py -q` -> `37 passed`

### Findings (adversarial)

1. **HIGH - Task cochee mais preuve de "diff backend" insuffisante**  
   La task "Referencer explicitement le diff backend concerne (fichiers touches + extrait de changement)" est cochee, mais aucun fichier backend modifie n'est liste dans la File List de la story, et aucun extrait de diff backend n'est annexe comme preuve formelle de cette story.

2. **MEDIUM - Incoherence story vs git sur les fichiers modifies**  
   `api/tests/routers/test_auth.py` est modifie dans git, mais absent de la File List. La traçabilite de la story est incomplete.

3. **MEDIUM - Preuve incomplete pour la campagne standard**  
   L'artefact `_bmad-output/implementation-artifacts/17-2-preuve-pytest-users-me-non-auth.txt` contient seulement le run cible (`test_get_me_unauthorized`). La preuve du run complet `37 passed` n'est pas archivee dans un artefact dedie ou un extrait explicitement annexe.

### Actions attendues

- Mettre a jour la File List pour inclure tous les fichiers reellement modifies en scope 17.2 (notamment `api/tests/routers/test_auth.py`).
- Ajouter une preuve exploitable du diff backend "concerne" conforme a la task (fichiers touches + extrait).
- Archiver explicitement la sortie de la campagne standard auth (`37 passed`) dans un artefact de preuve.

### Re-review final (adversarial) - 2026-03-01

Reviewer: Strophe (bmad-qa)  
Decision: **approved**

Points `changes-requested` verifies et resolus (scope strict Epic 17 / 17.2):

1. **Preuve diff backend**: resolu. La story documente explicitement le constat `git diff` vide sur `api/core/deps.py` et `api/routers/v1/auth.py`, avec ancrage de la logique fail-closed (`get_current_user` -> 401 `Not authenticated` + `WWW-Authenticate: Bearer`) dans `api/core/deps.py`.
2. **File List vs git**: resolu. `api/tests/routers/test_auth.py` est present dans la File List de la story.
3. **Preuve campagne standard**: resolu. L'artefact `_bmad-output/implementation-artifacts/17-2-preuve-pytest-users-me-non-auth.txt` archive le test cible (`1 passed, 36 deselected`) et la campagne complete (`37 passed`).

Verification runtime re-executee pendant cette review:
- `pytest api/tests/routers/test_auth.py -k test_get_me_unauthorized -q` -> `1 passed, 36 deselected`
- `pytest api/tests/routers/test_auth.py -q` -> `37 passed`

## Change Log

- 2026-03-01: Validation story 17.2 executee en scope strict (`users/me` non-auth), preuves pytest archivees, tracabilite `E16-C-001` consolidee, statut story passe a `review`.
- 2026-03-01: Code review adversarial BMAD execute (scope strict 17.2), issues de tracabilite/preuves detectees, decision `changes-requested`, statut repasse a `in-progress`.
- 2026-03-01: Corrections changes-requested appliquees (preuve pytest cible + campagne standard archivee, File List completee avec `api/tests/routers/test_auth.py`, justification verifiable du diff backend pour ce run, statut repasse a `review`).
- 2026-03-01: Code review final adversarial BMAD (scope strict 17.2) valide, 3 points changes-requested confirmes resolus, decision `approved`, statut passe a `done`.
