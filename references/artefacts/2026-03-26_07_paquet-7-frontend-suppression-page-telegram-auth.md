# Paquet 7 (frontend) — page `/telegram-auth` retirée

Date : 2026-03-26  
Périmètre : `recyclique-1.4.4/frontend/` — pas de commit demandé.

## Fait

- Suppression de `src/pages/TelegramAuth.jsx` et de `src/test/pages/TelegramAuth.test.tsx`.
- `App.jsx` : retrait du lazy import et de `/telegram-auth` dans `publicRoutes` ; la route `/telegram-auth` ne charge plus de page dédiée, redirection `Navigate` vers `/inscription` en conservant la query (équivalent de l’ancien CTA « S’inscrire »).
- `src/test/integration/public-routes.test.tsx` : scénarios remplacés par la redirection + préservation des paramètres.

## Validation

- `npx vitest run src/test/integration/public-routes.test.tsx` — 14 tests OK.
- Linter IDE sur fichiers touchés : pas d’alerte.

## Reliquats

- Build `frontend/dist/` non régénéré dans ce lot (artefacts obsolètes jusqu’au prochain `npm run build`).
- Pas de migration large `telegram_id` dans l’UI : formulaire `/inscription`, `authStore`, admin inchangés.
- La chaîne de chemin `/telegram-auth` subsiste une fois dans `App.jsx` (compat liens profonds).
