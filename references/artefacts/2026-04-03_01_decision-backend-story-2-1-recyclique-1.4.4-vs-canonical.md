# Décision backend — Story 2.1 (Epic 2)

**Date :** 2026-04-03  
**Contexte :** poser le socle session web v2 et l'autorité d'authentification sans dupliquer un second backend non tracé.

## Décision

- **Évolution du code dans `recyclique-1.4.4/api/`** (brownfield FastAPI existant) pour Epic 2.1 et les gates pytest actuels.
- **Pas de création ni de peuplement parallèle du dossier canonique `recyclique/` à la racine du mono-repo** tant qu'une story de migration dédiée n'a pas déplacé le code et les tests.

## Justification

- Les tests et la CI ciblent déjà `recyclique-1.4.4/api` ; éviter deux arborescences backend actives sans plan de migration.
- L'architecture (`project-structure-boundaries.md`) nomme le backend nominal **`recyclique/`** : cette décision est **transitoire** ; la bascule vers le dossier canonique fera l'objet d'une story ultérieure explicite (migration + mise à jour des chemins CI).

## Transition v2 documentée

- **Legacy :** `Authorization: Bearer` + corps JSON login/refresh inchangés par défaut.
- **Web v2 same-origin :** `use_web_session_cookies: true` au login pose des cookies httpOnly ; `get_current_user` accepte JWT depuis l'en-tête **ou** le cookie d'accès ; refresh depuis corps **ou** cookie refresh.

## Révision

Revoir ce document lors de la création effective de `recyclique/` ou du déplacement du package API.

**Suite (2026-04-03) :** Correct Course approuvé — story **`2-2b-migrer-le-backend-vers-recyclique-racine-mono-repo`** dans `epics.md` et `sprint-status.yaml` ; fichier story `_bmad-output/implementation-artifacts/2-2b-migrer-le-backend-vers-recyclique-racine-mono-repo.md`. Mettre à jour ce paragraphe quand la migration sera **done**.
