# Point de situation Kanban — où trouver les instantanés

Les **photographies détaillées** (cartes par stade, croisement repo, synthèses) sont des **artefacts datés** sous `references/artefacts/`, pas des fiches Kanban : elles suivent la convention projet `YYYY-MM-DD_NN_...`.

| Instantané | Date fichier | Rôle |
|------------|--------------|------|
| **Repère post–Epic 26** | 2026-04-23 | **[index Kanban](index.md)** : refactor API **archivé**, **aucune** fiche dans **`a-faire/`** ; rétro **`epic-26-retro-2026-04-23.md`**. |
| [**2026-04-19_02_point-situation-kanban-idees-jarvos**](../artefacts/2026-04-19_02_point-situation-kanban-idees-jarvos.md) | 2026-04-19 | Photo d’inventaire : **23** cartes ; **note 2026-04-21** dans l’artefact (passages en **archive** : outbox, opérations spéciales, workflow événements ; **à faire** actifs = 3 fiches + bandeau refactor API). |
| [**2026-04-18_02_point-situation-kanban-idees-jarvos**](../artefacts/2026-04-18_02_point-situation-kanban-idees-jarvos.md) | 2026-04-18 | Analyse longue (21 cartes) par stade ; conserve sa valeur tant que les fiches n’ont pas bougé de fond. |

**Vue tabulaire** des idées : [index.md](index.md) — repère chantier qualité API (Epic 26 clos) en tête de page du même fichier.

**Pour une nouvelle photographie complète** : créer un nouvel artefact `references/artefacts/YYYY-MM-DD_NN_point-situation-kanban-idees-jarvos.md`, mettre à jour la table ci-dessus et l’entrée dans `references/artefacts/index.md`.
