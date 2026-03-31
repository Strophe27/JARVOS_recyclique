# Sortie BMAD (`_bmad-output`)

## Bascule 2026-03-31

À partir de cette date, la **ligne de planification BMAD repart à zéro** : évolution incrémentale à partir du code **`recyclique-1.4.4`** stabilisé (plus de récit « refonte / un seul container / import couche par couche » comme fil conducteur).

- **`planning-artifacts/`** — livrables actifs : PRD, architecture, epics, UX, recherche, etc. (à produire via les workflows BMAD).
- **`implementation-artifacts/`** — sprint, stories, statuts d’implémentation.

## Archive

Tout le contenu précédent (PRD, epics, architecture, sprint-status, brief, recherche, sous-dossiers) a été déplacé ici, **sans suppression** :

`archive/2026-03-31_pivot-brownfield-recyclique-1.4.4/`

- `planning-artifacts/` — ancien planning (réécriture / consolidation).
- `implementation-artifacts/` — ancien suivi sprint.

Pour le contexte métier et les décisions hors BMAD, continuer à utiliser **`references/`** (dont `references/artefacts/`).

Les chemins configurés dans `_bmad/bmm/config.yaml` (`planning_artifacts`, `implementation_artifacts`) pointent toujours vers les dossiers **actifs** à la racine de `_bmad-output`, pas vers l’archive.

**Note QA :** si l’éditeur ou un onglet ouvert pointe encore vers `_bmad-output/planning-artifacts/prd.md` (ou epics, architecture, etc.) sans le préfixe `archive/...`, ce chemin **actif** ne contient plus ces fichiers — utiliser `archive/2026-03-31_pivot-brownfield-recyclique-1.4.4/planning-artifacts/`.
