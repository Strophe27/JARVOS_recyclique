# Décision backend — Story 2.1 (Epic 2)

**Date :** 2026-04-03  
**Contexte :** poser le socle session web v2 et l'autorité d'authentification sans dupliquer un second backend non tracé.

## Décision (historique — avant story 2.2b)

- **Évolution du code dans `recyclique-1.4.4/api/`** (brownfield FastAPI existant) pour Epic 2.1 et les gates pytest **jusqu'à la migration 2.2b**.
- **Pas de création ni de peuplement parallèle du dossier canonique `recyclique/`** sans story de migration dédiée — **résolu** par la story **2.2b** (voir ci-dessous).

## Décision actuelle (post story 2.2b, 2026-04-03)

- **Package vivant** : `recyclic_api`, tests, migrations et outillage Python sous **`recyclique/api/`** à la racine du mono-repo JARVOS_recyclique.
- **CI** : workflows sous **`.github/workflows/`** (racine dépôt), chemins mis à jour vers `recyclique/api/`.
- **`recyclique-1.4.4/api/`** : **n'existe plus** ; le dossier `recyclique-1.4.4/` conserve le frontend legacy, les compose et une bannière README pointant vers `recyclique/api/`.

## Justification (historique)

- Les tests et la CI ciblaient `recyclique-1.4.4/api` pour éviter deux arborescences actives sans plan — la story **2.2b** a effectué le déplacement unique et la mise à jour des chemins.
- L'architecture (`project-structure-boundaries.md`) nomme le backend nominal **`recyclique/`** : alignement réalisé avec **`recyclique/api/`** comme racine du package (voir `recyclique/README.md` pour l'écart documenté vs schéma `pyproject` à la racine `recyclique/`).

## Transition v2 documentée

- **Legacy :** `Authorization: Bearer` + corps JSON login/refresh inchangés par défaut.
- **Web v2 same-origin :** `use_web_session_cookies: true` au login pose des cookies httpOnly ; `get_current_user` accepte JWT depuis l'en-tête **ou** le cookie d'accès ; refresh depuis corps **ou** cookie refresh.

## Révision

**2026-04-03 — Migration effectuée (story 2.2b, clôture DS) :** code et tests déplacés de `recyclique-1.4.4/api/` vers **`recyclique/api/`** ; compose mis à jour (`build.context` / volumes `../recyclique/api/...`) ; CI racine `.github/workflows/` ; `recyclique/README.md` et bannière `recyclique-1.4.4/README.md`. Traçabilité : `_bmad-output/implementation-artifacts/2-2b-migrer-le-backend-vers-recyclique-racine-mono-repo.md`, `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-03.md`.
