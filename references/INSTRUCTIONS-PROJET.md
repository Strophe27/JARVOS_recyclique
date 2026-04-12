# Instructions projet — references/

> Ce fichier est destine aux agents qui doivent creer ou modifier des fichiers dans `references/`.
> Ne le charge pas sans raison — l'index principal (`references/index.md`) et les index de dossier (`references/artefacts/index.md`, etc.) suffisent pour la navigation.

---

## Structure des sous-dossiers

| Dossier | Usage |
|---------|-------|
| `recherche/` | Prompts et reponses de recherche externe (Perplexity, Claude.ai, GPT, etc.) |
| `artefacts/` | Artefacts temporaires de handoff entre agents |
| `idees-kanban/` | Kanban d'idees (un fichier par idee) — gere par le skill **idees-kanban** |
| `ancien-repo/` | Guide et clone local du repo Recyclique 1.4.4 (`repo/` gitignore) + doc brownfield |
| `migration-paheko/` | Guides Paheko/RecyClique, TODO, CR, decla eco-organismes |
| `paheko/` | Guide et clone local du code source Paheko (`repo/` gitignore) — reference pour integration |
| `peintre/` | Travail et synthese sur JARVOS Peintre (nano → macro, DSL layout, orchestration UI) ; pas les prompts/reponses Perplexity (voir `recherche/`) |
| `vision-projet/` | Matière pour vision projet (Brief, roadmap, présentations, contexte RAG / JARVOS nano-mini) |
| `_depot/` | Dépôt de fichiers en attente de ventilation vers les bons dossiers |
| `dumps/` | Dumps BDD sensibles (Paheko, Recyclic prod) pour analyse locale — gitignore |
| `vrac/` | Fichiers non classes ou sensibles (gitignore) |
| `ecosysteme/` | References ecosysteme JARVOS Recyclique (gitignore). **Referencer, ne pas copier** : les docs ecosysteme ont un seul emplacement canonique. |

**Regle** : ne pas deposer de fichiers directement a la racine de `references/` sans raison justifiee. Toujours utiliser le bon sous-dossier.

**Hors references :** Le dossier **`doc/`** (a la racine du projet) est reserve a la **communication publique** (modes d'emploi, presentations, supports a partager). Ne pas y mettre de matiere de construction interne.

---

## Conventions de nommage

### Artefacts de handoff entre agents

```
YYYY-MM-DD_NN_titre-court.md
```

NN = ordre d'execution (01, 02, …), optionnel. Exemples : `2026-02-24_01_mission-…`, `2026-02-24_brief-pour-architecte.md`.
Emplacement : `references/artefacts/`. Mettre a jour `references/artefacts/index.md` a chaque ajout.

### Fichiers de recherche

Ordre : **date** → **titre court** → **IA** → **type** (prompt / reponse).

```
YYYY-MM-DD_titre-court_[IA-name]_prompt.md    (avant envoi a l'IA)
YYYY-MM-DD_titre-court_[IA-name]_reponse.md   (apres reception de la reponse)
```

Exemples :
- `2026-02-24_choix-backend_perplexity_prompt.md`
- `2026-02-24_choix-backend_perplexity_reponse.md`
- `2026-02-24_analyse-marche-ressourceries_claude_prompt.md`

Emplacement : `references/recherche/`. Mettre a jour `references/recherche/index.md` a chaque ajout.

---

## Maintenance des index

**Index principal** (`references/index.md`) : a jour quand un sous-dossier est ajoute ou supprime, ou quand le role d'un dossier change. Ne pas y lister le contenu de chaque dossier — le detail est dans chaque `references/<dossier>/index.md`.

**Index par dossier** (`references/artefacts/index.md`, `references/recherche/index.md`, `references/peintre/index.md`, `references/ecosysteme/index.md`, `references/migration-paheko/index.md`, `references/vision-projet/index.md`, `references/ancien-repo/index.md`, `references/paheko/index.md`) : mettre a jour a chaque ajout (ou theme significatif) dans ce dossier. Une ligne ou une entree par fichier ou par groupe.

**Format d'une entree dans l'index** :

```
- **`nom-fichier-ou-dossier`** — Description concise (ce que c'est, ce que ca contient).
  _(Charger si : condition explicite de chargement.)_
```

**Regle fondamentale** : chaque entree doit permettre a un agent de decider de charger ou non le fichier SANS avoir a l'ouvrir. L'index est un abstract, pas une liste.

---

## Regles pour ou-on-en-est.md

**Format** :

```markdown
# Ou on en est — JARVOS Recyclique

Mis a jour : YYYY-MM-DD | Agent/Session : …

## Etat actuel
[Description courte de l'etat du projet]

## Derniere session
[Date, quoi a ete fait, decisions prises]

## Prochaine etape
[Action concrete suivante]
```

**Quand mettre a jour** : en fin de session importante (planification, analyse, decision majeure). L'agent peut proposer une mise a jour ; Strophe valide et sauvegarde.

---

## Regles pour todo.md

**Usage** : taches de reflexion, recherche, agregations, questions a trancher — hors flux BMAD (epics/stories). Ne pas dupliquer ce qui est deja dans les stories BMAD.

**Format** : une seule liste, pas de sections. Marqueurs uniquement :
- `[ ]` — a faire
- `[~]` — en cours
- `[x]` — fait

Ordre : a faire en premier, puis en cours, puis fait. Pour changer le statut d'une tache, modifier uniquement le marqueur (pas de deplacement de ligne). Organiser par themes en commentaire si le fichier grossit.

---

## Idees (Kanban)

**Gestion** : utiliser le skill **idees-kanban** (`.cursor/skills/idees-kanban/`). Ne pas creer ni deplacer de fichiers dans `references/idees-kanban/` sans suivre ce skill — il assure le format, les stades et la mise a jour de `references/idees-kanban/index.md`.
