# Story 17.4: Guard explicite `/admin` + tests d'intégration routeur global

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a administrateur légitime,
I want une protection explicite de la route `/admin` et une couverture d'intégration du routeur global,
So that les régressions de guard/routage critiques soient détectées automatiquement.

## Acceptance Criteria

1. **Given** la route front `/admin` et le routeur global critique  
   **When** les guards et tests d'intégration sont mis en place  
   **Then** l'accès non autorisé à `/admin` est bloqué explicitement  
   **And** les parcours de routage critiques ne reposent plus sur un test placeholder.

## Mapping E16 / dépendances

- **Mapping E16:** `E16-A-002` (route `/admin` sans guard — non conforme audit 16.1), `E16-C-005` (tests intégration routeur global placeholder)
- **Dépendances:** Story 17.1 (done)
- **Source matrice:** `_bmad-output/implementation-artifacts/16-1-matrice-acces-role-route.md` — ligne 38 : route `/admin` (front) marquée « non conforme » car non enveloppée par `AdminGuard`

## Tasks / Subtasks

- [x] Task 1 — Protéger la route `/admin` par AdminGuard (AC: 1)
  - [x] Modifier `frontend/src/App.tsx` ligne 69 : remplacer  
    `<Route path="/admin" element={<AdminDashboardPage />} />`  
    par  
    `<Route path="/admin" element={<AdminGuard><AdminDashboardPage /></AdminGuard>} />`
  - [x] Mettre à jour le commentaire d'en-tête d'App.tsx pour refléter que la route `/admin` racine est désormais protégée par AdminGuard.

- [x] Task 2 — Remplacer le placeholder App.test.tsx par des tests d'intégration routeur (AC: 1)
  - [x] Supprimer le test placeholder `expect(true).toBe(true)` dans `frontend/src/App.test.tsx`.
  - [x] Rendre une structure minimale `MemoryRouter` + `Routes` mimant la route `/admin` (pattern SuperAdminGuard.test.tsx). Inclure une `Route path="/login"` rendant `<div data-testid="login-page">` pour pouvoir vérifier la redirection.
  - [x] Ajouter des tests d'intégration :
    - [x] Parcours non authentifié vers `/admin` → présence de `data-testid="login-page"` (AdminGuard redirige si `!user`).
    - [x] Parcours utilisateur sans permission admin vers `/admin` → présence de `data-testid="admin-forbidden"`.
    - [x] Parcours utilisateur avec permission admin vers `/admin` → présence de `data-testid="page-admin"` (AdminDashboardPage) et absence de `admin-forbidden` / `login-page`.
  - [x] Mocker `useAuth` et, pour le test admin autorisé, mocker `getDashboardStats` et `getPahekoAccessDecision` (AdminDashboardPage les appelle au montage).
  - [x] Pattern : `MemoryRouter` initialEntries=`['/admin']`, `MantineProvider`, `vi.mock('../auth/AuthContext', ...)`. Référence : `AdminGuard.test.tsx`, `SuperAdminGuard.test.tsx`.

- [x] Task 3 — Preuves et vérification manuelle (AC: 1)
  - [x] Exécuter `cd frontend && npm run test:run -- src/App.test.tsx src/admin/AdminGuard.test.tsx` — tous les tests verts (test:run = exécution unique, sortie exploitable).
  - [x] Vérification manuelle : accès autorisé (admin connecté) et interdit (non authentifié / sans admin) sur `/admin`.
  - [x] Documenter dans la story ou un artefact les liens vers : `frontend/src/App.tsx`, `frontend/src/App.test.tsx`, `frontend/src/admin/AdminGuard.tsx`, `frontend/src/admin/AdminGuard.test.tsx`.

## Preuves obligatoires de fermeture

- Tests d'intégration `App`/guards verts (plus de placeholder).
- Vérification manuelle autorisé/interdit sur `/admin`.
- Lien explicite vers les fichiers de tests et routeur modifiés.

## Dev Notes

- **AdminGuard existant** : `frontend/src/admin/AdminGuard.tsx` — vérifie `user` (redirige `/login` si absent) et `permissions.includes('admin')` (affiche « Accès réservé aux administrateurs » sinon). Réutiliser tel quel, pas de nouveau guard.
- **Tests co-locés** : convention projet Vitest + React Testing Library + jsdom ; fichiers `*.test.tsx` à côté des composants. Voir `.cursor/rules/architecture-et-checklist-v01.mdc`.
- **Pattern de test** : mocker `useAuth` via `vi.mock('../auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))` ; wrapper avec `MantineProvider` et `MemoryRouter`. Référence : `frontend/src/admin/AdminGuard.test.tsx`, `frontend/src/admin/SuperAdminGuard.test.tsx`.
- **AdminDashboardPage et APIs** : le dashboard appelle `getDashboardStats` et `getPahekoAccessDecision` au montage. Pour le test admin autorisé, mocker ces modules (`vi.mock('../api/adminDashboard')`, `vi.mock('../api/adminPahekoCompta')`) pour éviter erreurs réseau. Le dashboard expose `data-testid="page-admin"` pour les assertions.
- **Contexte 17.1** : SuperAdminGuard et AdminGuard sont déjà en place pour les sous-routes `/admin/*`. La route `/admin` racine est la seule sans guard — correction ciblée E16-A-002.
- **Non-régression** : ne pas modifier les autres routes déjà protégées. Ne pas toucher SuperAdminGuard ni VieAssociativeGuard.

### Project Structure Notes

- `frontend/src/App.tsx` : routeur principal, modification minimale (ligne 69).
- `frontend/src/App.test.tsx` : tests d'intégration du routeur global (remplacement complet du placeholder).
- `frontend/src/admin/AdminGuard.tsx` : inchangé (réutilisation).
- `frontend/src/admin/AdminGuard.test.tsx` : inchangé (tests unitaires du guard restent valides).

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 17.4 ~ligne 1812]
- [Source: _bmad-output/implementation-artifacts/16-1-matrice-acces-role-route.md — ligne 38]
- [Source: frontend/src/admin/AdminGuard.test.tsx — pattern mock useAuth]
- [Source: frontend/src/admin/SuperAdminGuard.test.tsx — pattern test route protégée, Routes minimal avec /login]
- [Source: frontend/src/admin/AdminDashboardPage.tsx — data-testid="page-admin", appels getDashboardStats / getPahekoAccessDecision à mocker]

## Dev Agent Record

### Agent Model Used

bmad-dev (Story 17.4 — 2026-03-01)

### Debug Log References

- `_bmad-output/implementation-artifacts/17-4-preuve-vitest-app-guards.txt` (sortie tests)

### Completion Notes List

- Task 1 : route `/admin` enveloppée par AdminGuard dans App.tsx.
- Task 2 : App.test.tsx remplacé par 3 tests d'intégration (non auth → login, sans admin → forbidden, avec admin → page-admin). Mocks useAuth, adminPahekoCompta, adminDashboard.
- Task 3 : tests App + AdminGuard verts.

### File List

- `frontend/src/App.tsx` — modifié (route `/admin` enveloppée par AdminGuard)
- `frontend/src/App.test.tsx` — remplacé par tests d'intégration routeur
- `frontend/src/admin/AdminGuard.tsx` — lecture seule (référence)
- `frontend/src/admin/AdminGuard.test.tsx` — lecture seule (pattern de test)
- `frontend/src/admin/AdminDashboardPage.tsx` — lecture seule (rendu dans test, APIs mockées)

## Senior Developer Review (AI)

**Date:** 2026-03-01  
**Verdict:** Approved

**Validation:**
- AC1 : Route `/admin` protegee par AdminGuard (App.tsx:69), acces non autorise bloque (redirect login ou admin-forbidden). Tests integration 3 parcours reels, plus de placeholder.
- Task 1 : Route enveloppee, commentaire en-tete mis a jour.
- Task 2 : App.test.tsx remplace par tests integration (MemoryRouter, MantineProvider, mocks useAuth/adminPahekoCompta/adminDashboard). Parcours non-auth, sans-admin, avec-admin valides.
- Task 3 : Preuve tests verts (17-4-preuve-vitest-app-guards.txt).

**Findings mineurs (non bloquants):**
- Task 2 subtask « Pattern : MemoryRouter initialEntries=... » marquee [ ] alors que le pattern est applique dans renderAt.
- Tests App.test.tsx testent une structure mimant le routeur, pas le composant App exporte (accepte pour scope « tests integration routeur »).
