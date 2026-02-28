## Story
13-1-1-socle-visuel-shell-global-bandeau-menu-layout

## Objectif AC4

Fournir une preuve minimale avant/apres sur le socle shell global, avec ecarts residuels explicites.

## Avant (constat QA changes-requested)

- Source: `_bmad-output/implementation-artifacts/13-1-1-socle-visuel-shell-global-bandeau-menu-layout.md` section "Senior Developer Review (AI)".
- Constats bloquants:
  - Shell global applique aussi aux ecrans exclus `pin login` et `permissions`.
  - Visibilite permissive par defaut des liens avec `permissionCode` si permissions vides.
  - Etat actif de menu non robuste sur sous-routes.

## Apres (corrections implementees)

- Exclusions shell appliquees en routage:
  - `frontend/src/App.tsx` (`isShellExcludedPath`) exclut `CAISSE_PIN_PATH` et `/admin/permissions` du shell corrige.
- Navigation durcie:
  - `frontend/src/shared/layout/AppShellNav.tsx` n'affiche plus un item `permissionCode` quand les permissions sont vides/non hydratees.
- Etat actif robuste:
  - `frontend/src/shared/layout/AppShellNav.tsx` active un item sur route exacte et sous-routes (`/prefix/...`).

## Preuves de verification (apres)

- Tests cibles:
  - `npm run test:run -- src/App.test.ts src/shared/layout/AppShellNav.test.tsx src/shared/layout/AppShell.test.tsx src/caisse/AppNav.test.tsx`
  - Resultat: 5 fichiers / 15 tests passes.
- Build frontend:
  - `npm run build`
  - Resultat: succes.

## Ecrans representatifs (support de reprise Story 13.2.x)

- Auth: `_bmad-output/implementation-artifacts/screenshots/11-0/auth/auth-01-login.png`
- Caisse: `_bmad-output/implementation-artifacts/screenshots/11-0/caisse/caisse-02-ouverture-session.png`
- Reception: `_bmad-output/implementation-artifacts/screenshots/11-0/reception/reception-04-detail-ticket-lignes.png`
- Admin: `_bmad-output/implementation-artifacts/screenshots/11-0/admin-1/admin1-01-dashboard-admin.png`

## Ecarts residuels (13-1-1)

- Aucun ecart critique/majeur restant sur le scope shell global corrige de cette story.
- Hors scope conserve (non corrige dans 13-1-1): `pin login`, `users pending`, `permissions`.
- Verification visuelle pixel-perfect completee ecran par ecran a finaliser dans les stories 13.2.x.
