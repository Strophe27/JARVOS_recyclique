# Story 17.1: Verrouillage RBAC super-admin phase 1 (front + back)

Status: done

## Story

As a responsable securite,
I want imposer un verrouillage role-based coherent des routes super-admin phase 1 sur front et back,
so that aucun role admin non autorise ne puisse acceder aux surfaces sensibles.

## Contexte et scope strict

- Epic cible: `epic-17` (remediation post-audit 16-0, sans nouveau scope).
- Story source: `17.1` dans `_bmad-output/planning-artifacts/epics.md`.
- Dependance obligatoire: story `17.0` terminee et validee.
- Mapping E16 autorise uniquement: `E16-A-001`, `E16-C-004`.
- Interdiction d'etendre le scope vers `E16-*` hors des 2 IDs ci-dessus.
- Execution obligatoire story par story (ne pas lancer `17.2+` en parallele).

## Acceptance Criteria

1. **Given** les routes super-admin phase 1 actuellement exposees de maniere non conforme  
   **When** la politique d'acces est appliquee et alignee front/back  
   **Then** les routes sensibles super-admin phase 1 ne sont accessibles qu'aux roles autorises  
   **And** les cas interdits sont bloques explicitement et traces dans les tests.

2. **Given** la matrice role x route issue de l'audit 16.1  
   **When** la remediation 17.1 est livree  
   **Then** la matrice est mise a jour avec statut conforme pour les cibles phase 1  
   **And** les evidences front/back pointent vers les routes et guards corriges.

3. **Given** la fermeture de la story 17.1  
   **When** les preuves sont collectees  
   **Then** les tests front/back autorise/interdit sont verts sur les cibles phase 1  
   **And** les preuves incluent explicitement `/admin/health`, `/admin/settings`, `/admin/sites` et les guards associes.

## Taches / Sous-taches

- [x] Task 1 - Verrouiller la surface front super-admin phase 1 (AC: 1, 2, 3)
  - [x] Introduire un guard dedie super-admin (ou equivalent explicite) pour les routes front cibles.
  - [x] Aligner `frontend/src/App.tsx` pour proteger explicitement `/admin/health`, `/admin/settings`, `/admin/sites` avec la politique cible.
  - [x] Conserver le comportement login/non-authentifie coherent (redirection ou refus explicite selon convention existante).
  - [x] Verifier que les autres routes admin hors scope 17.1 ne sont pas remaniees sans justification directe E16-A-001/E16-C-004.

- [x] Task 2 - Verrouiller la surface back super-admin phase 1 (AC: 1, 2, 3)
  - [x] Appliquer la meme politique RBAC cible sur les endpoints backend sensibles relies a la phase 1.
  - [x] Corriger au minimum les points identifies par l'audit: `api/routers/v1/admin/health.py` et endpoints relies a la surface `sites`/`settings` si necessaire pour l'alignement front/back.
  - [x] S'appuyer sur `api/core/deps.py` (role implicits + `require_permissions`) sans dupliquer la logique de permission.
  - [x] Garantir des reponses d'interdiction explicites (403) pour les roles non autorises.

- [x] Task 3 - Couverture tests autorise/interdit (AC: 1, 3)
  - [x] Ajouter/adapter tests frontend des guards/routes cibles (`*.test.tsx` co-loces) pour verifier super_admin autorise et admin non super_admin interdit.
  - [x] Ajouter/adapter tests backend API pour les endpoints cibles: cas super_admin autorise, admin non super_admin interdit, non-authentifie refuse selon contrat.
  - [x] Verifier l'execution des suites ciblees sans regressions sur la base fiabilisee de 17.0.

- [x] Task 4 - Preuves et tracabilite de fermeture (AC: 2, 3)
  - [x] Mettre a jour la matrice role x route: `_bmad-output/implementation-artifacts/16-1-matrice-acces-role-route.md`.
  - [x] Capturer les sorties de tests front/back et les lier explicitement a `E16-A-001` et `E16-C-004`.
  - [x] Mettre a jour les artefacts de preuve/journal existants sans ouvrir de nouveau perimetre.

## Plan de tests (obligatoire)

- Frontend (Vitest + RTL + jsdom, tests co-loces):
  - Route `/admin/health`: admin non super_admin bloque, super_admin autorise.
  - Route `/admin/settings`: admin non super_admin bloque, super_admin autorise.
  - Route `/admin/sites`: admin non super_admin bloque, super_admin autorise.
  - Guard dedie: comportement non-authentifie conforme (redirection login ou refus explicite).

- Backend (pytest):
  - Endpoint health admin: admin non super_admin interdit (403), super_admin autorise.
  - Endpoint settings admin: admin non super_admin interdit (403), super_admin autorise.
  - Endpoint sites cible: admin non super_admin interdit (403), super_admin autorise.
  - Cas non-authentifie sur endpoints cibles: refus conforme au contrat (`401` si non authentifie, sinon `403` si authentifie sans role).

- Commandes de verification recommandees:
  - Frontend: `cd frontend && npm run test -- src/admin`
  - Backend: `cd api && pytest tests/routers -k "admin and (health or settings or sites)"`

## Preuves obligatoires de fermeture

- Matrice role x route mise a jour et conforme:
  - `_bmad-output/implementation-artifacts/16-1-matrice-acces-role-route.md`
- Preuves de tests front/back verts sur routes sensibles:
  - sorties de commandes (pytest + vitest) liees a la story 17.1
- Preuve code des cibles:
  - `frontend/src/App.tsx`
  - guard(s) front associes
  - `api/routers/v1/admin/health.py`
  - `api/routers/v1/admin/settings.py`
  - `api/routers/sites.py` (si impacte pour alignement phase 1)

## Dev Notes

### Contraintes architecture et qualite

- Conserver la structure par domaine, sans refactor global hors perimetre E16 cible.
- Frontend tests: Vitest + React Testing Library + jsdom; tests co-loces `*.test.tsx`; pas de Jest.
- UI/styling: rester aligne Mantine, pas d'introduction de nouvelle lib UI.
- Reutiliser les dependances RBAC existantes (`require_permissions`) et eviter toute duplication de logique d'autorisation.

### Project Structure Notes

- Frontend: limiter les changements aux guards et declarations de routes admin cibles; ne pas deplacer les composants hors `frontend/src/admin/`.
- Backend: appliquer la politique RBAC dans les routeurs admin existants et la couche dependances (`api/core/deps.py`) sans creer de nouveau mecanisme RBAC parallele.

### Intelligence story precedente (17.0)

- La story 17.0 a stabilise le harness auth/session et le runtime Vitest groupe.
- Utiliser cette base de preuve stable pour les nouveaux tests 17.1 (pas de contournement ad hoc).
- Conserver la discipline de scope: uniquement les IDs E16 autorises par la story.

### Fichiers probables a toucher (a confirmer par implementation)

- Front:
  - `frontend/src/App.tsx`
  - `frontend/src/admin/AdminGuard.tsx` (ou nouveau guard dedie super-admin)
  - `frontend/src/admin/AdminGuard.test.tsx` (et/ou nouveaux tests guard dedie)
- Back:
  - `api/core/deps.py` (si ajustement central requis, sans casser usages existants)
  - `api/routers/v1/admin/health.py`
  - `api/routers/v1/admin/settings.py`
  - `api/routers/sites.py`
  - `api/tests/routers/` (tests routes sensibles cibles)

### Non-scope explicite

- Pas de correction de `/v1/users/me` deconnecte (story 17.2).
- Pas de guard explicite de la route front `/admin` globale (story 17.4).
- Pas de completion metier des pages admin technique (stories 17.3+).

### References

- `_bmad-output/planning-artifacts/epics.md` (Epic 17, Story 17.1)
- `_bmad-output/implementation-artifacts/16-0-tableau-unique-ecarts.md` (E16-A-001, E16-C-004)
- `_bmad-output/implementation-artifacts/16-1-matrice-acces-role-route.md`
- `_bmad-output/implementation-artifacts/17-0-stabilisation-qa-harness-critique-clusters-auth-harness-vitest-runtime.md`
- `_bmad-output/planning-artifacts/architecture.md` (Gap Analysis Results, Implementation Readiness Validation, Implementation Handoff)
- `references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md`

## Dev Agent Record

### Agent Model Used

bmad-dev

### Debug Log References

- 2026-03-01 - Front RBAC cible:
  - `cd frontend && npm run test -- src/admin/SuperAdminGuard.test.tsx src/admin/AdminHealthPage.test.tsx src/admin/AdminSettingsPage.test.tsx src/admin/AdminSitesPage.test.tsx`
  - Resultat: `4` fichiers / `18` tests passes.
- 2026-03-01 - Front RBAC cible (revalidation finale mission 17.1):
  - `cd frontend && npm run test -- src/admin/SuperAdminGuard.test.tsx src/admin/AdminHealthPage.test.tsx src/admin/AdminSettingsPage.test.tsx src/admin/AdminSitesPage.test.tsx`
  - Resultat: `4` fichiers / `18` tests passes.
  - Preuve: `_bmad-output/implementation-artifacts/17-1-preuve-vitest-rbac-super-admin.txt`
- 2026-03-01 - Back RBAC cible:
  - `PYTHONPATH=. pytest api/tests/routers/test_admin_phase1_super_admin_rbac.py`
  - Resultat: `9` tests passes (super_admin 200, admin 403, non-authentifie 401 sur `/v1/admin/health`, `/v1/admin/settings`, `/v1/sites`).
- 2026-03-01 - Back RBAC cible (revalidation finale mission 17.1):
  - `PYTHONPATH=. pytest api/tests/routers/test_admin_phase1_super_admin_rbac.py`
  - Resultat: `9` tests passes (super_admin 200, admin 403, non-authentifie 401 sur `/v1/admin/health`, `/v1/admin/settings`, `/v1/sites`).
  - Preuve: `_bmad-output/implementation-artifacts/17-1-preuve-pytest-rbac-super-admin.txt`

### Completion Notes List

- Verrouillage front applique uniquement aux routes cibles 17.1: `/admin/health`, `/admin/settings`, `/admin/sites` via `SuperAdminGuard`.
- Comportement non-authentifie conserve: redirection `/login`; admin non super_admin bloque explicitement.
- Verrouillage back applique uniquement aux surfaces cibles 17.1: `/v1/admin/health*`, `/v1/admin/settings*`, `/v1/sites*` en `require_permissions("super_admin")`.
- Tests front/back autorise-interdit-non-authentifie ajoutes/adaptes et executes en scope restreint.
- Mise a jour traçabilite E16: matrice role-route (`16-1`) et tableau unique ecarts (`16-0`) avec preuves liees a 17.1.
- Scope respecte: aucun lancement de story 17.2+.

### File List

- _bmad-output/implementation-artifacts/17-1-verrouillage-rbac-super-admin-phase-1-front-back.md
- _bmad-output/implementation-artifacts/17-1-preuve-vitest-rbac-super-admin.txt
- _bmad-output/implementation-artifacts/17-1-preuve-pytest-rbac-super-admin.txt
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/16-0-tableau-unique-ecarts.md
- _bmad-output/implementation-artifacts/16-1-matrice-acces-role-route.md
- frontend/src/App.tsx
- frontend/src/admin/SuperAdminGuard.tsx
- frontend/src/admin/SuperAdminGuard.test.tsx
- frontend/src/admin/AdminHealthPage.tsx
- frontend/src/admin/AdminHealthPage.test.tsx
- frontend/src/admin/AdminSettingsPage.tsx
- frontend/src/admin/AdminSettingsPage.test.tsx
- frontend/src/admin/AdminSitesPage.tsx
- frontend/src/admin/AdminSitesPage.test.tsx
- api/routers/v1/admin/health.py
- api/routers/v1/admin/settings.py
- api/routers/sites.py
- api/tests/routers/test_admin_phase1_super_admin_rbac.py

## Change Log

- 2026-03-01: Story 17.1 implementee (verrouillage RBAC super_admin phase 1 front/back) + preuves tests ciblees + maj matrice/registre ecarts E16-A-001 et E16-C-004.
