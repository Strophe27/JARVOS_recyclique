# Story 17-HF-3 — Redirection post-login vers /dashboard (AT-003)

**Epic:** epic-17 (vague Hotfix Terrain)  
**Source:** 17-HF-plan-hotfix-terrain.md, 17-z-registre-anomalies-terrain.md  
**Statut:** done

## Problème

Dans `frontend/src/auth/LoginPage.tsx` ligne 19, le fallback post-login est `/caisse`. Après connexion, l'utilisateur est redirigé vers la sélection du poste de caisse au lieu du dashboard principal.

## Objectif

Changer le fallback de redirection de `/caisse` à `/dashboard` pour correspondre au comportement attendu (AT-003).

## Code existant

- `frontend/src/auth/LoginPage.tsx` ligne 19 : `const redirectTo = from || '/caisse';`
- `location.state.from.pathname` : si présent, on redirige vers cette URL (comportement à préserver).

## Fix minimal

```ts
const redirectTo = from || '/dashboard';
```

## Acceptance Criteria

1. Given un login réussi sans `from` dans location.state, When la connexion aboutit, Then redirection vers `/dashboard`.
2. Given un login réussi avec `from: /admin/users`, When la connexion aboutit, Then redirection vers `/admin/users` (préservation du from).

## Preuves obligatoires

- Test Vitest LoginPage : redirection par défaut vers `/dashboard`
- Test Vitest LoginPage : redirection vers `from` si présent

## Implémentation

### 1. Modifier LoginPage.tsx

- Ligne 19 : `const redirectTo = from || '/dashboard';`

### 2. Tests LoginPage.test.tsx

Stratégie : mocker `useAuth` et `useNavigate` (pattern AuthGuard.test.tsx). Avec `user` truthy, le `useEffect` appelle `navigate(redirectTo, { replace: true })`.

- Mock `vi.mock('./AuthContext', ...)` et `useNavigate` (vi.fn). Référence : `AuthGuard.test.tsx`.
- Préserver le smoke existant : `mockUseAuth` par défaut retourne `{ user: null, login: vi.fn() }` pour le test "affiche le titre Connexion".
- Test redirection défaut : `mockUseAuth` retourne `{ user: { id: '1', username: 't' } }`, pas de state → `expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })`.
- Test redirection `from` : `MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/admin/users' } } }]}`, user truthy → `expect(mockNavigate).toHaveBeenCalledWith('/admin/users', { replace: true })`.

## Contraintes

- Scope strict : uniquement le fallback redirect. 1 ligne + tests.
- Pas de run massif.
- Tests co-locés (LoginPage.test.tsx).

## File List

- frontend/src/auth/LoginPage.tsx (modifié)
- frontend/src/auth/LoginPage.test.tsx (modifié)

## Dev Agent Record

**Implementation Plan:** Fix minimal (1 ligne). Tests co-locés avec mocks useAuth/useNavigate, pattern AuthGuard.test.tsx.

**Completion Notes:** Fallback `/caisse` → `/dashboard` (ligne 19). LoginPage.test.tsx : smoke préservé + 2 tests redirection (défaut /dashboard, from /admin/users). Tous les tests auth passent.

## Senior Developer Review (AI)

**Date :** 2026-03-02  
**Outcome :** Approved

- AC1 (redirection défaut /dashboard) : ✓ LoginPage.tsx:19, test couvert
- AC2 (préservation from) : ✓ Test "redirige vers from si présent"
- File List vs git : aligné
- Tests Vitest : 3/3 passent
- Amélioration mineure : commentaire en-tête LoginPage.tsx mentionne 17-HF-3

## Change Log

- 2026-03-02 : Code review approuvé (bmad-qa). Fix AT-003 validé.
- 2026-03-02 : Implémenté par bmad-dev. Fix AT-003, tests redirection.
- 2026-03-02 : Story créée. Fix AT-003.
- 2026-03-02 : Validation checklist. Stratégie de test précisée (mocks, préservation smoke).
