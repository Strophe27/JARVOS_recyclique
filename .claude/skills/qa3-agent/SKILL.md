---
name: qa3-agent
description: >
  Orchestre un QA delegue : parent routeur (Task planner puis workers) sans prelecture des sources ;
  workers lisent le livrable et grilles sous heavy_refs_root (references/rubrics). Declenchement : qa3, QA3, QA delegue.
  Boucle iterative : boucle qa3, loop qa3, gate qa3, QA3 95+, boucle jusqu'a 95 → workflow-loop.md (gate quality+P0+coverage, max 3 cycles, puis HITL).
  Compat : loop qa2 route vers orchestrateur-qa-95 → qa3-agent. QA2 legacy archive : qa/archives/qa2-agent (non installe par defaut).
  Parent lit workflow.md ; boucle lit aussi workflow-loop.md. Modèles par plateforme/rôle : references/model-routing.md.
  Chat qui delegue (QA simple) : references/chat-delegation.md.
---

# QA3 Agent

Parent **leger** : orchestrer **Task** (planificateur si besoin → workers → fusion), **pas** auditer le livrable soi-meme.

## Declenchement

| Demande | Fichier a lire (en entier) |
|---------|------------------------------|
| qa3, QA3, QA delegue | [`workflow.md`](workflow.md) — **si tu es deja parent Task**, applique directement |
| **Chat** doit deleguer (pas parent Task) | [`references/chat-delegation.md`](references/chat-delegation.md) |
| **boucle qa3**, `loop qa3`, `gate qa3`, `QA3 95+`, `boucle jusqu'a 95` | skill **`orchestrateur-qa-95`** (chat) ou `workflow.md` + `workflow-loop.md` (si parent Task) |
| **loop qa2** (compat) | skill **`orchestrateur-qa-95`** → qa3-agent + note compat |
| **gate 95** (sans version) | skill **`orchestrateur-qa-95`** → qa3-agent (**boucle** max 3 cycles — pas QA mono-passe) |
| **qa2 fige**, `legacy qa2` | Archive `~/.cursor/skills/.archives/qa2-agent` — restauration manuelle (voir `qa/archives/README.md`) |

**Compat `loop qa2`** : route vers QA3. `loop qa2` = meme flux que `loop qa3`.

## Obligation apres declenchement

**Parent qa3** : lire le(s) workflow(s) ci-dessus **avant** tout `Task` planner/worker. Brief Task parent : chemins absolus `{skill_root}/workflow.md` (+ `{skill_root}/workflow-loop.md` si boucle) + « applique qabrief-template » — `{skill_root}` = `{USER_SKILLS_DIR}/qa3-agent` (resolu en chemin absolu avant envoi).

**Checklist avant chaque Task** : lire [`references/parent-reflexes-interdits.md`](references/parent-reflexes-interdits.md) si dilution suspectee ; phrase anti-dilution explicite (Task / spawn / role) **+** brief racine complet **+** passe courante si planner — voir `workflow.md` § « Phrase explicite anti-dilution » et `references/qabrief-template.md` § Checklist parent.

## Modele par defaut

**SoT :** [`references/model-routing.md`](references/model-routing.md).

- **Cursor** : parent/workers `composer-2.5` · **planner** `cursor-grok-4.6-xhigh`
- **Codex** : tout `gpt-5.6-luna-max`
- **Claude** : **Sonnet** (`claude-sonnet-5-thinking-medium`) — pas Haiku sauf `pipeline: light`
- **Alias Task** (`parent`, `planner`, `workers`, `cloture`) : voir `references/model-routing.md` § Alias rôles

## Routage rapide (detail : `workflow.md` point 5)

| Situation | Action |
|-----------|--------|
| Mixte / volumineux / multi-axes | 1 Task planner **readonly**, `run_in_background: false` → YAML `passes` → **`compute_worker_schedule.py`** (R11) → workers **par batch validé** |
| Mono-kind, perimetre clair | 1 Task worker direct |
| `low`, check rapide | 1 Task worker, `pipeline: light` |
| **boucle qa3 / loop qa3** | Algorithme **`workflow-loop.md`** (QA3 → correctifs → re-QA3, max **3**, gate defaut **95** + coverage **80**) |
| Chat delegue la boucle | Skill **`orchestrateur-qa-95`** — tranche **bloquant vs fond** (`run_in_background` sur le Task chat→parent uniquement) |

**Planner** : bloquant ; **aucun** worker avant `passes` parse + **schedule R11** si `pass_count >= 2`. Detail : `workflow.md` point 5, § *Execution Task* ; spec [`references/r11-file-shard-schedule.md`](references/r11-file-shard-schedule.md).

## Telemetrie (fin de chaque role)

`uv run scripts/append_event.py` depuis `{skill_root}` — lire JSON stdout. Detail : [`references/telemetry.md`](references/telemetry.md), [`references/script-standards.md`](references/script-standards.md).

## Fichiers du skill

| Fichier | Qui le lit |
|---------|------------|
| **`workflow.md`** | Parent qa3 (orchestration) |
| **`workflow-loop.md`** | Parent qa3 (boucle iterative) |
| **`references/model-routing.md`** | Parent, orchestrateur, strophe-review (slugs Task) |
| `references/qabrief-template.md` | Parent (gabarit brief) |
| `references/planner-prompt.md` | Task planificateur |
| `references/worker-qa.md` | Task worker |
| `references/worker-cloture-integrale.md` | Dernier worker boucle — fermeture P1/P2/Info avant rapport |
| [`references/r11-file-shard-schedule.md`](references/r11-file-shard-schedule.md) | Parent + planner — partition fichiers / ordonnancement workers (R11) |
| `scripts/compute_worker_schedule.py` | Parent — batches parallèles disjoints (fail-closed) |
| `references/rubrics/` | Grilles (`layers/`, `domains/`, `modes/`, `passes/`, `formulas.md`, `schema.md`, `sortie-json.md`) — workers uniquement |
| [`references/telemetry.md`](references/telemetry.md) | Parent, planner, worker — fin de role |
| [`references/script-standards.md`](references/script-standards.md) | `uv run` scripts telemetrie |
| `references/chat-delegation.md` | Chat qui spawn le parent (QA simple) |
| `references/parent-reflexes-interdits.md` | Parent — table STOP anti-dilution |
| `references/nested-task-smoke.md` | Smoke Task imbrique |
| `references/smoke-checklist.md` | Smoke regression QA3 |
| `references/alignment-create-skill.md` | Alignement create-skill |

**Chemins portables** : le parent **résout** `{USER_SKILLS_DIR}` en chemin absolu avant tout Task.  
**Numastria (Git) :** `{USER_SKILLS_DIR}` = `{racine-repo}/.cursor/skills` — voir [`NUMASTRIA.md`](NUMASTRIA.md). `uv run scripts/skill_paths.py` depuis ce dossier.  
Sinon (install user) : `~/.cursor/skills`. **`skill_root`** = `{USER_SKILLS_DIR}/qa3-agent` ; **`heavy_refs_root`** = `{skill_root}/references/rubrics` (grilles workers — le parent ne lit pas ce dossier).
