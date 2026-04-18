# Dossier `tests/e2e/` (Peintre_nano)

## Ce que c'est (et ce que ce n'est pas)

Les fichiers `*.e2e.test.tsx` de ce dossier sont des **tests d'intégration UI** lancés par **Vitest** avec l’environnement **jsdom** (pragma `// @vitest-environment jsdom` en tête de fichier quand nécessaire).

Ce ne sont **pas** des tests bout-en-bout dans un navigateur réel (pas de Playwright, pas de chargement réseau HTTP complet du bundle servi par Vite en prod).

## Pourquoi le nom « e2e »

Le workflow BMAD (`bmad-qa-generate-e2e-tests`) et les stories Epic 3 utilisent la convention de nom **e2e** pour désigner des scénarios qui enchaînent **plusieurs composants** (shell, providers, manifests) comme le ferait un utilisateur, tout en restant dans un runtime de test headless.

## Interprétation des résultats

- Une suite verte ici **ne remplace pas** une future couche E2E navigateur (Epic 10 / CI) pour `fetch` réel, CORS, ou régression visuelle.
- Les **mocks** (ex. `reportRuntimeFallback`, `fetch`) isolent des chemins : lire le fichier de test pour savoir ce qui est prouvé.

## Références

- `vitest.config.ts` — `environment: node` par défaut ; les fichiers e2e basculent en jsdom par fichier.
- `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — arborescence package.
