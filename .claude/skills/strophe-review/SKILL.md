---
name: strophe-review
description: >
  Review Strophe en deux temps : l'agent en cours relit ce qu'il vient de faire
  (dernière sortie / dernier livrable) à la recherche de trous, d'oubli, de manque
  et d'incohérence, puis révise le document ; une fois le document entièrement révisé,
  lance une boucle QA3 améliorative (max 3 cycles workflow-loop, pas passes planner) jusqu'au gate 95, ferme tous les
  findings, laisse 0 dettes. Use when the user asks for strophe-review, @strophe-review,
  $strophe-review, review Strophe, relecture Strophe, or this two-step self-review then QA3 loop.
---

# Strophe-review

**Pour qui :** Cursor (Strophe) et **Codex (Yo)** — même recette.  
SoT Numastria : `.cursor/skills/strophe-review/` (Git). Codex : après pont `.agents/skills/` (`link-codex-skills.py`).

Review **après livrable**, dans **ce fil**. Ne pas déléguer la phase 1.

## Déclenchement

`@strophe-review` · `$strophe-review` · `strophe-review` · `review Strophe` · `relecture Strophe`

## Phase 1 — Relire puis réviser (agent en cours)

**En premier lieu**, dans ce fil, l'agent en cours fait **deux points**, dans cet ordre. Pas de Task. Pas de QA3.

1. **Relire** sa dernière sortie ou son dernier livrable — relire ce qu'il vient de faire — à la recherche de **trous**, d'**oubli**, de **manque** et d'**incohérence**.
2. **Puis réviser** le document (corriger dans les fichiers du livrable, pas seulement commenter).

Cible = ce qui vient d'être produit (fichier(s) écrits ou dernière sortie structurée). Si plusieurs fichiers : tous.

**Stop** : ne pas lancer la phase 2 tant que le document n'est **pas entièrement révisé**.

Sortie courte avant phase 2 : ce qui manquait / ce qui a été corrigé / chemins révisés.

## Phase 2 — Boucle QA3 améliorative

**Une fois que le document est entièrement révisé**, lancez une boucle QA3 avec ce conseil :

- **`max_cycles: 3`** (itérations boucle `workflow-loop.md` — pas le nombre de passes planner)
- gate **95**, coverage **80**, correctifs entre cycles
- **fermez tous les findings**
- **laissez 0 dettes**

Appliquer le skill **`orchestrateur-qa-95`** : lire son `SKILL.md`, puis `references/parent-brief-loop.md`, `references/wait-vs-background.md`, et `{USER_SKILLS_DIR}/qa3-agent/references/model-routing.md`. Lancer **1** Task parent (alias **`parent`**, `model:` explicite) — ne pas absorber le QA dans ce chat. Ne pas réinventer planner / workers.

**`run_in_background`** : par défaut **bloquant** (`false`) — l'utilisateur attend le verdict gate après review ; passer en **fond** (`true`) seulement si consigne explicite (« ne bloque pas », autre tâche en parallèle) — voir arbre `wait-vs-background.md`.

**Chemins Numastria** : `{USER_SKILLS_DIR}` = `{racine-repo}/.cursor/skills` (pas `~/.cursor/skills` sauf si le skill n'est pas dans le repo).

Dans le brief parent, en plus du template `parent-brief-loop.md` :

```yaml
mode: validation
max_cycles: 3
gate_score: 95
minimum_coverage: 80
readonly: false
telemetry:
  entry_trigger: strophe-review
  wrapper_skill: orchestrateur-qa-95
  run_in_background: false
# Clôture intégrale obligatoire : 0 P0/P1/P2/Info ouverts (worker-cloture-integrale.md)
# Livrable(s) : [chemins absolus révisés en phase 1]
```

**Modèles** : lire `{USER_SKILLS_DIR}/qa3-agent/references/model-routing.md` — `model:` explicite sur chaque Task (Cursor : Grok 4.6 planner · C2.5 workers · Codex : LUNA max · Claude : Sonnet).

## Interdits

- QA3 avant révision complète de la phase 1
- Déléguer la phase 1 (relire / réviser) à un sous-agent
- QA inline à la place d'`orchestrateur-qa-95`
- Livrer avec findings ou dettes encore ouverts
- 4e passe auto si le gate 95 échoue après 3 — HITL, comme `workflow-loop.md`

## Succès

Phase 1 faite dans ce fil + boucle QA3 : gate **95**, **0 findings** ouverts, **0 dettes**.
