# Exploration references/ — 2026-03-24

Mission : cartographier `references/` (y compris zones **gitignore** : vrac, ecosysteme, dumps, _depot, clones exclus du suivi Git) pour extraire **idees**, **TODO** (actions ouvertes sur mise a jour Recyclique + integration Paheko), et **decisions**.

> **Correction STT (2026-03-24)** : l'intention vocale etait **TODO**, pas « tout doux ». Les rapports ont ete alignes sur cette lecture.

| Dossier | Contenu attendu |
|---------|-----------------|
| `00-etat-des-lieux/` | Structure, index, fichiers pivots |
| `01-idees-suivi/` | Kanban, todo, ou-on-en-est |
| `02-migration-paheko/` | migration-paeco/, paheko/ (hors repo) |
| `03-vision-consolidation-recherche/` | vision-projet, consolidation-1.4.5, recherche/, ancien-repo (docs) |
| `04-vrac-ecosysteme-depot/` | vrac/, ecosysteme/, _depot/, dumps/ (metadonnees si BDD) |
| `99-synthese-orchestrateur/` | Synthese transversale (agent principal) |

Les rapports par agent : `rapport.md` dans chaque sous-dossier numerote.

**Note technique** : les sous-agents « explore » ont ete executes en **lecture seule** ; le contenu des `rapport.md` a ete **materialise** par l'agent orchestrateur a partir de leurs sorties.
