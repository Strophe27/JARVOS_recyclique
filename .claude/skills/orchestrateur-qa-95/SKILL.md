---
name: orchestrateur-qa-95
description: >
  Wrapper chat-only pour boucle QA gate 95+ ; delegue OBLIGATOIREMENT vers qa3-agent via un Task parent
  (jamais QA inline). Declenchement : @orchestrateur-qa-95, QA 95+, QA 95, QA95, loop qa3,
  boucle qa3, gate qa3, QA3 95+, boucle QA, qa loop, loop qa2, iteration qa, gate 95, boucle jusqu'a 95,
  relecture jusqu'a 95, ameliorer jusqu'a 95, boucle QA auto ameliorative, qa auto ameliorative,
  boucle qa ameliorative, qualite 95, gate qualite 95. Modèles : qa3-agent/references/model-routing.md.
  Legacy qa2 : archive qa/archives/qa2-agent. Pas qa3/QA3 simple (voir qa3-agent chat-delegation).
---

# Orchestrateur QA 95+

**Wrapper leger** autour de [`qa3-agent`](../qa3-agent/SKILL.md) — pas un second QA.

**Numastria :** SoT Git `.cursor/skills/orchestrateur-qa-95/` + `qa3-agent/` · pont Codex `link-codex-skills.py` · voir [`../qa3-agent/NUMASTRIA.md`](../qa3-agent/NUMASTRIA.md). `{USER_SKILLS_DIR}` = `{racine-repo}/.cursor/skills`.

| Role | Fait quoi | Ne fait pas |
|------|-----------|-------------|
| **Chat** (ce skill) | Lire regles → trancher bloquant vs fond → lancer **1** Task parent → restituer | Lire le livrable, workflows, planner/workers, QA inline |
| **Task parent** | Charger `qa3-agent`, lire workflows en entier, executer boucle (planner → workers → fusion → correctifs) | Remplacer qa3-agent par analyse classique |

## Fiabilite (lire avant d'agir)

**Cette chaine ne reussit pas tout le temps** : dilution du chat parent, oubli de `model:` explicite, absorption du QA inline, ou parent qui n'invoque pas Task sont les causes frequentes.

**Loi non negociable** : des que ce skill est declenche, le **chat** lance **immediatement** un Task parent (`subagent_type: generalPurpose`) — **sans** ouvrir les livrables ni faire la boucle dans le fil courant.

**Modele Task parent (chat → parent)** : voir [`../qa3-agent/references/model-routing.md`](../qa3-agent/references/model-routing.md) — alias **`parent`** (rôle 2) ; **même slug** que le chat wrapper (rôle 1) sur chaque plateforme — le wrapper n'est pas un Task, le parent oui. Cursor `composer-2.5` · Codex `gpt-5.6-luna-max` · Claude `claude-sonnet-5-thinking-medium`.

## Regles a lire avant le premier Task (chat)

| Ordre | Fichier |
|-------|---------|
| 1 | Ce skill (`SKILL.md`) en entier |
| 2 | [`references/parent-brief-loop.md`](references/parent-brief-loop.md) |
| 3 | [`references/wait-vs-background.md`](references/wait-vs-background.md) |
| 4 | [`../qa3-agent/references/model-routing.md`](../qa3-agent/references/model-routing.md) + rule **Numastria** `.cursor/rules/collab-orchestration-agents.mdc` |
| 5 | Si chantier orchestration JARMES hors repo : `JARMES/.cursor/rules/orchestration-doc-routing.mdc` — **skip** dans Numastria |

Le **Task parent** doit lire en entier `qa3-agent/workflow.md` + `workflow-loop.md` avant tout worker enfant.

## Declenchement — matrice routage (E17)

| Declencheur | Destination |
|-------------|-------------|
| `@orchestrateur-qa-95`, `QA 95+`, `QA 95`, `QA95` | orchestrateur → **Task parent** → qa3-agent |
| `loop qa3`, `boucle qa3`, `gate qa3`, `QA3 95+`, `gate 95`, `gate qualite 95`, `qualite 95` | idem |
| `boucle QA`, `qa loop`, `iteration qa`, `boucle jusqu'a 95`, `relecture jusqu'a 95`, `ameliorer jusqu'a 95` | idem |
| `boucle QA auto ameliorative`, `qa auto ameliorative`, `boucle qa ameliorative` | idem |
| `loop qa2` | idem + note compat |
| `qa2 fige`, `legacy qa2` | Archive `~/.cursor/skills/.archives/qa2-agent` |

**Compat `loop qa2`** : route vers QA3 (identique `loop qa3`).

**Ne pas confondre** :
- Deja Task parent qa3 → applique directement `qa3-agent` (pas ce skill).
- **`qa3` / `QA3` / `QA delegue` sans mot boucle ou gate** → **pas** ce skill : `qa3-agent` + [`references/chat-delegation.md`](../qa3-agent/references/chat-delegation.md) (QA simple, pas de boucle 95).

## Etape 0 — Attendre ou tache de fond ?

Arbre : [`references/wait-vs-background.md`](references/wait-vs-background.md).

| Mode | `run_in_background` sur Task **chat→parent** | Quand |
|------|-----------------------------------------------|-------|
| **Tache de fond** | `true` | **Defaut** — boucle longue, ≥3 fichiers, handoff, travail parallele, ou aucun signal bloquant explicite (voir arbre) |
| **Bloquant** | `false` | Score/verdict **exige dans ce fil** : « dis-moi quand c'est bon », commit/push juste apres, 1–2 petits fichiers + verdict immediat |

Le parent qa3 **delegue** planner et workers via Task ; planner **toujours** `run_in_background: false`. Workers par batches R11 selon `workflow.md` point 5 (schedule `compute_worker_schedule.py`). **`run_in_background` workers** (par batch, parent attend chaque batch) : voir [`../qa3-agent/workflow.md`](../qa3-agent/workflow.md) point 5, § exécution Task.

## R11 — LSP / Syncthing (non bloquant)

Pendant une boucle QA95, Cursor peut afficher **« Received redundant open text document command »** (Pylance) quand plusieurs workers ouvrent les mêmes fichiers. **Ce n'est pas un échec QA** — impact IDE (IntelliSense gelé sur le fichier).

| Facteur | Note |
|---------|------|
| **Syncthing** | Aggrave les races LSP — attendu sur le workspace JARMES |
| **Mitigation skill** | R11 partition + `compute_worker_schedule.py` (qa3-agent) |
| **Workaround opérateur** | Command Palette → Restart Language Server ou Reload Window |

Ne pas annuler ni relancer la boucle pour ce seul message.

## Regle principale (chat)

1. Chemins absolus livrable + intention (sans ouvrir les fichiers sources du livrable).
2. Lire les regles § ci-dessus.
3. Trancher bloquant vs fond.
4. Lancer **exactement un** Task parent (slug **parent** dans `model-routing.md`) avec brief [`parent-brief-loop.md`](references/parent-brief-loop.md).
5. **Ne pas** absorber le QA dans le chat — meme si le livrable semble petit.

## Delegation Task

Parametres Task **chat→parent** (obligatoires) :

```text
subagent_type: generalPurpose
model: [slug parent — voir ../qa3-agent/references/model-routing.md]
run_in_background: [true par defaut | false si bloquant — voir wait-vs-background.md]
readonly: false  # sauf revue sans edition
```

**Phrase d'ouverture obligatoire** dans le message Task :

> **Obligation parent** : tu es le **seul** parent qa3 pour cette boucle. Lis `workflow.md` et `workflow-loop.md` en entier. Invoque **Task** pour planner puis **workers par batch R11** (`compute_worker_schedule.py` si `pass_count >= 2`) — n'absorbe pas le QA dans ce contexte. `model:` **explicite** sur chaque Task enfant (jamais d'heritage implicite).

Template complet : [`references/parent-brief-loop.md`](references/parent-brief-loop.md).

Gate defaut : `quality_score >= 95`, `no_open_P0`, `coverage_score >= 80`.

## Cloture integrale · R4 · R8 · R9 · R10

Avant retour chat : cloture integrale (dettes P1/P2/Info), gate `verify_run_closure.py`, format cycles R8, stagnation R2, cap workers R9, planner ROI R10 — **detail complet** : [`references/parent-brief-loop.md`](references/parent-brief-loop.md) (sections Stagnation, Cap workers, Planner ROI, Cloture integrale, Gate clôture, Retour attendu).

## Contraintes

- Ne pas modifier qa3-agent ni dupliquer planner/workers/fusion dans le chat.
- Un seul parent concurrent par boucle.
- Correcteur : `readonly: false` par defaut si edition autorisee.
