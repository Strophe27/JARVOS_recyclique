# Story 17.0: Stabilisation QA/Harness critique (clusters Auth Harness + Vitest Runtime)

Status: done

## Story

As a equipe produit/QA,
I want stabiliser d'abord la base de preuve backend et frontend,
so that toutes les remediations suivantes puissent etre validees de facon fiable, sans faux positifs ni faux negatifs.

## Acceptance Criteria

1. **Given** la campagne actuelle invalidee sur auth/session et les runs Vitest groupes instables  
   **When** la story de stabilisation est executee en tete de vague 1  
   **Then** le cluster Auth Harness est fiabilise sans doublon d'implementation pour `E16-A-003` + `E16-C-002`  
   **And** le cluster Vitest Runtime est fiabilise sans doublon d'implementation pour `E16-A-004` + `E16-C-003`.

2. **Given** la fermeture de la story  
   **When** les preuves sont collectees  
   **Then** la sortie `pytest` montre une suite auth/session exploitable (sans erreur de setup bloquante)  
   **And** la sortie Vitest multi-fichiers se termine sans blocage de process  
   **And** le journal de preuves est mis a jour avec liens vers commandes et fichiers.

3. **Given** l'execution de la story 17.0  
   **When** une action de remediation est envisagee hors `E16-A-003`, `E16-C-002`, `E16-A-004`, `E16-C-003`  
   **Then** cette action est exclue de l'implementation de la story  
   **And** aucune autre story Epic 17 n'est lancee en parallele.

## Scope strict (obligatoire)

- Mapping E16 autorise uniquement: `E16-A-003`, `E16-C-002`, `E16-A-004`, `E16-C-003`.
- Interdiction d'etendre le scope vers d'autres IDs `E16-*`.
- Execution strictement story par story (ne pas lancer d'autres stories Epic 17).

## Tasks / Subtasks

- [x] Task 1 - Stabiliser le cluster Auth Harness (AC: 1, 2)
  - [x] Identifier et corriger les causes de non-fiabilite de la campagne auth/session.
  - [x] Eliminer tout doublon d'implementation ou de setup cible `E16-A-003` et `E16-C-002`.
  - [x] Verifier une execution `pytest` exploitable sur la cible auth/session.

- [x] Task 2 - Stabiliser le cluster Vitest Runtime (AC: 1, 2)
  - [x] Identifier et corriger les causes de blocage de run Vitest multi-fichiers.
  - [x] Eliminer tout doublon d'implementation ou de setup cible `E16-A-004` et `E16-C-003`.
  - [x] Verifier la fin de process propre sur run Vitest groupe.

- [x] Task 3 - Produire les preuves de fermeture (AC: 2)
  - [x] Capturer les sorties de commandes `pytest` et Vitest ciblees.
  - [x] Mettre a jour le journal de preuves avec references de commandes/fichiers.
  - [x] Lier explicitement chaque preuve aux IDs E16 autorises.

- [x] Task 4 - Verrouiller le non-scope (AC: 3)
  - [x] Verifier qu'aucun correctif hors `E16-A-003`, `E16-C-002`, `E16-A-004`, `E16-C-003` n'est inclus.
  - [x] Verifier qu'aucune autre story Epic 17 n'est activee pendant cette implementation.

## Dev Notes

### Contraintes d'architecture et qualite

- Respecter la structure par domaine et eviter les modifications hors zones auth/session et runtime de test.  
  [Source: `_bmad-output/planning-artifacts/architecture.md` - sections "Architectural Boundaries" et "Requirements to Structure Mapping"]
- Stack et conventions de tests frontend: Vitest + React Testing Library + jsdom, tests co-loces `*.test.tsx`, pas de Jest.  
  [Source: `_bmad-output/planning-artifacts/architecture.md` - "Gap Analysis Results"; `references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md`]
- Priorite Epic 17: remediation post-audit 16-0, pas de nouveau perimetre, preuves obligatoires par ID.  
  [Source: `_bmad-output/planning-artifacts/epics.md` - "Epic 17", "Story 17.0", regle d'execution transversale]

### Pistes de zones a toucher (a confirmer pendant implementation)

- Backend auth/tests: `api/routers/auth/`, `api/core/`, `api/tests/routers/` (focus auth/session harness).
- Frontend runtime tests: `frontend/src/**/**.test.tsx`, config Vitest (`frontend/vitest.config.*` si present).
- Aucun changement de fonctionnalite metier hors stabilisation harness/runtime.

### Project Structure Notes

- Aucun nouveau module ou dossier transverse: limiter aux zones backend auth/session et runtime de tests frontend.
- Pas de deplacement de fichiers ni refactor global; uniquement corrections de stabilisation harness/runtime.
- Dependances story: aucune (story de depart Vague 1 Epic 17), execution isolee obligatoire.

### Definition of Done locale (story 17.0)

- Cluster Auth Harness stable sur cible `E16-A-003` + `E16-C-002`.
- Cluster Vitest Runtime stable sur cible `E16-A-004` + `E16-C-003`.
- Preuves de run et journal de preuves mis a jour.
- Aucune extension de scope hors 4 IDs autorises.

### References

- `_bmad-output/planning-artifacts/epics.md` (Epic 17, Story 17.0)
- `_bmad-output/implementation-artifacts/16-0-tableau-unique-ecarts.md`
- `_bmad-output/planning-artifacts/architecture.md` (Gap Analysis Results, Implementation Readiness Validation, Implementation Handoff)
- `references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md`

## Dev Agent Record

### Agent Model Used

bmad-sm (create-story)

### Debug Log References

- `_bmad-output/implementation-artifacts/17-0-preuve-pytest-auth-session.txt`
- `_bmad-output/implementation-artifacts/17-0-preuve-vitest-runtime.txt`
- `_bmad-output/implementation-artifacts/16-1-journal-tests-manuels.md` (addendum 17.0)
- `_bmad-output/implementation-artifacts/16-0-tableau-unique-ecarts.md` (statuts des 4 IDs cibles)

### Completion Notes List

- Story creee avec scope verrouille sur 4 IDs E16.
- Story prete pour `dev-story` sans dependance precedente.
- Validation checklist create-story appliquee; criteres, taches et garde-fous de scope completes.
- Harness auth/session fiabilise via `api/tests/conftest.py` (`db_session`, `auth_client`, reset DB) et alignement OIDC de test dans `test_auth.py`.
- Preuve backend capturee: `python -m pytest api/tests/routers/test_auth.py` -> `37 passed` (fichier `17-0-preuve-pytest-auth-session.txt`).
- Runtime Vitest multi-fichiers fiabilise via ajustements de tests React (`CashRegisterGuard.test.tsx`, `LoginPage.test.tsx`) avec fin de process propre.
- Preuve frontend capturee: `npm run test:run -- ...` -> `5 files passed / 12 tests passed` (fichier `17-0-preuve-vitest-runtime.txt`).
- Tableau `16-0` mis a jour strictement pour `E16-A-003`, `E16-C-002`, `E16-A-004`, `E16-C-003` avec statuts justifies.
- Non-scope confirme: aucun correctif applique hors des 4 IDs autorises, aucune autre story Epic 17 activee.

### File List

- _bmad-output/implementation-artifacts/17-0-stabilisation-qa-harness-critique-clusters-auth-harness-vitest-runtime.md
- api/tests/conftest.py
- api/tests/routers/test_auth.py
- frontend/src/caisse/CashRegisterGuard.test.tsx
- frontend/src/auth/LoginPage.test.tsx
- _bmad-output/implementation-artifacts/17-0-preuve-pytest-auth-session.txt
- _bmad-output/implementation-artifacts/17-0-preuve-vitest-runtime.txt
- _bmad-output/implementation-artifacts/16-1-journal-tests-manuels.md
- _bmad-output/implementation-artifacts/16-0-tableau-unique-ecarts.md

## Senior Developer Review (AI)

Date: 2026-03-01
Reviewer: bmad-qa
Outcome: approved

### Portee de review

- Workflow applique: `_bmad/bmm/workflows/4-implementation/code-review/`.
- Verification croisee story vs git: les fichiers source modifies annonces sont bien presents (`api/tests/conftest.py`, `api/tests/routers/test_auth.py`, `frontend/src/caisse/CashRegisterGuard.test.tsx`, `frontend/src/auth/LoginPage.test.tsx`).
- Verification de preuves executees pendant review:
  - `python -m pytest api/tests/routers/test_auth.py` -> `37 passed`
  - `npm run test:run -- src/caisse/CashRegisterGuard.test.tsx src/auth/AuthContext.test.tsx src/auth/LoginPage.test.tsx src/auth/LoginForm.test.tsx src/App.test.tsx` -> `5 files passed`, `12 tests passed`, fin de process propre

### Validation AC

- AC1: IMPLEMENTED. Stabilisation auth harness et runtime Vitest constatee dans les diffs et les executions.
- AC2: IMPLEMENTED. Preuves exploitables presentes (fichiers de preuve + addendum `16-1` avec commandes/resultats/liens).
- AC3: IMPLEMENTED. Scope code reste borne aux 4 IDs autorises, sans extension de remediations applicatives hors cible.

### Findings

- Aucun finding HIGH/MEDIUM.
- Residuel LOW: plusieurs fichiers de pilotage BMAD modifies en parallele (`epics.md`, `next-action.json`, `.run-epic-state.json`, `sprint-status.yaml`) ne sont pas listes dans la File List de la story; impact faible sur la tracabilite car ils ne font pas partie du scope applicatif evalue.

### Decision

- Story approuvee: criteres d'acceptation satisfaits avec preuves reproductibles.
- Statut story passe a `done` et synchro sprint appliquee.

## Change Log

- 2026-03-01 | bmad-qa | Code review adversarial execute, AC verifies, story approved, status set to done.
