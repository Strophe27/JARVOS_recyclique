# Delegation chat — QA3 simple (sans boucle)

**Qui** : le **chat** qui a recu une demande `qa3`, `QA3` ou `QA delegue` et **n'est pas deja** le Task parent qa3.

**Objectif** : spawn **1** Task parent — ne pas lire le livrable ni executer planner/workers dans ce fil.

## Ne pas faire ici

- Lire les sources, `references/rubrics/`, ni `workflow.md` (le parent Task le fera).
- Enchainer planner + workers inline.

## Faire

1. Noter chemins absolus du livrable + intention (sans ouvrir les fichiers).
2. Lancer **1** Task `generalPurpose` — `model:` = slug alias **`parent`** (rôle **2. Parent qa3**, [`model-routing.md`](model-routing.md) § Alias rôles), `run_in_background: false`.
3. Message Task — phrase d'ouverture obligatoire :

> **Obligation parent** : tu es le parent qa3. Invoque **Task** pour planner (si routage) puis **workers par batch R11** (`compute_worker_schedule.py` si `pass_count >= 2`) — n'absorbe pas le QA ici. Lors du spawn worker, appliquer `workflow.md` § « Phrase explicite anti-dilution » (lecture locale + spawn).

4. Puis brief :

```text
Parent QA3 — QA simple (pas de boucle gate).

Charge qa3-agent :
1. Lis {USER_SKILLS_DIR}/qa3-agent/workflow.md en entier
2. Lis {USER_SKILLS_DIR}/qa3-agent/references/model-routing.md — model: explicite (planner / workers / cloture)
3. Applique {USER_SKILLS_DIR}/qa3-agent/references/qabrief-template.md

skill_root: "{USER_SKILLS_DIR}/qa3-agent"
heavy_refs_root: "{USER_SKILLS_DIR}/qa3-agent/references/rubrics"
telemetry:
  entry_trigger: "qa3 simple"
  wrapper_skill: null
Livrable(s): [chemins absolus]
Intention: [resume]
```

Le parent bootstrap `run_id` et telemetrie si absent — voir [`references/telemetry.md`](references/telemetry.md) et [`references/script-standards.md`](references/script-standards.md).

5. Attendre le retour ; restituer le rapport fusionne (quality_score, audit_confidence, coverage_score).

**Boucle gate 95+** : skill **`orchestrateur-qa-95`**.

**Legacy qa2** : archive `qa/archives/qa2-agent` — non installe par defaut.
