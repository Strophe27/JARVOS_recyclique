# Sortie BMAD (`_bmad-output`)

## Bascule 2026-03-31

À partir de cette date, la **ligne de planification BMAD repart à zéro** : évolution incrémentale à partir du code **`recyclique-1.4.4`** stabilisé (plus de récit « refonte / un seul container / import couche par couche » comme fil conducteur).

- **`planning-artifacts/`** — livrables actifs : PRD, architecture, epics, UX, recherche, etc. (à produire via les workflows BMAD).
- **`planning-artifacts/guide-pilotage-v2.md`** — pilotage d’**exécution** v2 (deux récits de rythme, convergences, jalons à cocher, carte des emplacements documentaires, frictions, prompt superviseur). **Abstract canonique** : [references/index.md](../references/index.md) (section État et suivi).
- **`implementation-artifacts/`** — sprint, stories, statuts d’implémentation ; **source de vérité du statut** : `sprint-status.yaml` — **cle racine** `last_updated` + **`development_status`** (les lignes `# last_updated:` en tête de fichier sont un **journal** opérationnel, pas l’état normatif ; détail : [`guide-pilotage-v2.md`](planning-artifacts/guide-pilotage-v2.md) §1 — ordre de chargement agent).
- **Repères Epics 6 a 10** — point d’entrée documentaire pour les flows critiques, la sync `Paheko`, les modules complémentaires et la readiness : [references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md](../references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md) puis [references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md](../references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md).

## Archive

Tout le contenu précédent (PRD, epics, architecture, sprint-status, brief, recherche, sous-dossiers) a été déplacé ici, **sans suppression** :

`archive/2026-03-31_pivot-brownfield-recyclique-1.4.4/`

- `planning-artifacts/` — ancien planning (réécriture / consolidation).
- `implementation-artifacts/` — ancien suivi sprint.

Pour le contexte métier et les décisions hors BMAD, continuer à utiliser **`references/`** (dont `references/artefacts/`).

Les chemins configurés dans `_bmad/bmm/config.yaml` (`planning_artifacts`, `implementation_artifacts`) pointent toujours vers les dossiers **actifs** à la racine de `_bmad-output`, pas vers l’archive.

**Note (chemins / onglets)** : la chaîne **v2 actuelle** (PRD, epics, architecture shardée, `guide-pilotage-v2.md`, sprint-status, etc.) vit sous `_bmad-output/planning-artifacts/` et `_bmad-output/implementation-artifacts/` **sans** passer par `archive/`. Utiliser `archive/2026-03-31_pivot-brownfield-recyclique-1.4.4/` **uniquement** pour lire l’**ancienne** ligne de planification (pré-pivot) ; un onglet ouvert sur un fichier **sous** ce préfixe d’archive ne remplace pas les artefacts actifs à la racine de `_bmad-output/`.
