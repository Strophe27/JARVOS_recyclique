---
name: bmad-epic-runner
description: Point d'entrée session BMAD implémentation — charge l'agent Epic Runner et la spec epic/story. Utiliser quand l'utilisateur démarre une session sur un epic (ex. epic-3), veut enchaîner les stories avec sprint-status, ou dit « epic runner », « enchaîner les stories BMAD ».
---

## Rôle

Ce skill **ne remplace pas** les workflows BMAD : il oriente vers le **coordinateur** documenté dans le dépôt.

## Actions

1. Demander à l'utilisateur (ou lire le contexte) l'**epic-id** cible si inconnu (ex. `epic-3`).
2. Charger et suivre l'agent Cursor **`.cursor/agents/bmad-epic-runner.md`** (`@bmad-epic-runner`).
3. Tenir sous les yeux la spec **`references/automatisation-bmad/epic-story-runner-spec.md`** (§1 limites Task, §6 briefs, §7.1 rapport Story→Epic).
4. Pour le détail d'une story, l'Epic Runner délègue à **`.cursor/agents/bmad-story-runner.md`** via Task — brief YAML avec chemins **absolus** (spec §6, §10).

## Références

- Recueil : `references/automatisation-bmad/2026-04-02_recueil-technique-orchestration-bmad.md` (§15 cadre Cursor).
- Navigation méta BMAD : **BMad Master** ou **`bmad-help`** — ne pas dupliquer leur catalogue.

## Langue

Français avec l'utilisateur (projet).
