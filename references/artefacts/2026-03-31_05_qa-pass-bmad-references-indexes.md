# QA — reset BMAD, audit `references/`, index (2026-03-31)

**Périmètre :** vérification post-travail (sous-agents explore + corrections immédiates).

## BMAD `_bmad-output/`

| Contrôle | Résultat |
|----------|----------|
| `planning-artifacts/` actif | Contient uniquement `.gitkeep` — OK |
| `implementation-artifacts/` actif | Idem — OK |
| Archive `archive/2026-03-31_pivot-brownfield-recyclique-1.4.4/` | Contient ancien planning + sprint-status — OK |
| `config.yaml` | Pointe vers chemins actifs — OK |
| README vs disque | Cohérent ; **ajout** d’une note « onglets IDE pointant vers prd.md actif » |

## Liens Markdown (`references/` index et dérivés)

| Contrôle | Résultat |
|----------|----------|
| Liens relatifs dans index migration/consolidation/vision/paheko/ancien-repo | **PASS** (workspace actuel) |
| `paheko/index.md` → `dev-tampon/paheko/README.md` | Cible **gitignore** — attendu cassé sur clone sans tampon ; texte déjà explicite |
| `references/index.md` | Audit en **backticks** seulement → **corrigé** en liens cliquables vers les 3 rapports |
| `temporaire-pour-tri/index.md` | `besoins-terrains` en backticks → **corrigé** en lien `[besoins-terrains.md](../besoins-terrains.md)` |

## `references/ou-on-en-est.md`

| Contrôle | Résultat |
|----------|----------|
| Sections historiques avec `_bmad-output/planning-artifacts/...` | Risque de confusion avec dossier actif vide — **ajout** d’un **raccourci** avec préfixe `archive/...` explicite |

## Non traité ici (rappel)

- **`idees-kanban/index.md`** : resynchronisation via skill **idees-kanban** (fiche 2026-03-01 absente du tableau).
- **`contexte-pour-recherche-externe.md`**, **`versioning.md`** (narratif), corps **`ou-on-en-est`** au-delà de la bascule : révision contenu — session dédiée.

## Fichiers modifiés lors du correctif QA

- `references/index.md`
- `references/temporaire-pour-tri/index.md`
- `references/ou-on-en-est.md`
- `_bmad-output/README.md`
