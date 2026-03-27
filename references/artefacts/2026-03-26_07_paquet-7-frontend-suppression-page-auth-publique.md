# Paquet 7 (frontend) — page d’auth publique historique (route messager) retirée

Date : 2026-03-26  
Périmètre : `recyclique-1.4.4/frontend/` — pas de commit demandé.

## Fait

- Suppression de `src/pages/` composant auth messager (fichier JSX historique) et de son test associé sous `src/test/pages/`.
- `App.jsx` : retrait du lazy import et de la route publique dédiée dans `publicRoutes` ; cette URL ne charge plus de page dédiée, redirection `Navigate` vers `/inscription` en conservant la query (équivalent de l’ancien CTA « S’inscrire »). Le segment de chemin historique reste accepté une fois pour compat liens profonds.
- `src/test/integration/public-routes.test.tsx` : scénarios remplacés par la redirection + préservation des paramètres.

## Validation

- `npx vitest run src/test/integration/public-routes.test.tsx` — 14 tests OK.
- Linter IDE sur fichiers touchés : pas d’alerte.

## Reliquats

- Build `frontend/dist/` non régénéré dans ce lot (artefacts obsolètes jusqu’au prochain `npm run build`).
- Pas de migration large des identifiants messager dans l’UI : formulaire `/inscription`, `authStore`, admin inchangés.
