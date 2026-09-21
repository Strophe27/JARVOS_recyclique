# Alignement avec create-skill (Cursor)

Référence : skill **create-skill** (`~/.cursor/skills-cursor/create-skill`) — frontmatter et bonnes pratiques.

## Frontmatter `description`

- **Non vide**, **≤ 1024 caractères**.
- **WHAT + WHEN** : capacités + mots-clés de déclenchement.

## Délégation chat (sans agent séparé)

- QA simple depuis le chat : `references/chat-delegation.md` (dans qa3-agent).
- Boucle gate 95+ : skill `orchestrateur-qa-95`.

## Progressive disclosure

| Fichier | Rôle |
|---------|------|
| `SKILL.md` | Déclenchement + routage |
| `workflow.md` | Orchestration parent |
| `workflow-loop.md` | Boucle gate 95 |
| `references/model-routing.md` | Slugs modèle par plateforme et rôle (alias `parent`/`planner`/`workers`/`cloture`) |
| `references/qabrief-template.md` | Contrat brief Task |
| `references/planner-prompt.md` | Task planificateur |
| `references/worker-qa.md` | Task worker |
| `references/worker-cloture-integrale.md` | Clôture intégrale (alias `cloture`) |
| `references/chat-delegation.md` | Chat → parent QA simple |
| `references/parent-reflexes-interdits.md` | Table STOP anti-dilution |
| `references/telemetry.md` | Contrat télémétrie append |
| `references/r11-file-shard-schedule.md` | Partition fichiers / schedule R11 |
| `references/smoke-checklist.md` | Smoke regression |
| `references/rubrics/` | Grilles workers — index `rubrics/README.md` |
| `references/artefacts/` | Rapports boucle optionnels |

## Stack distribuée (Numastria — 3 skills QA)

| Dossier | Invocable | Rôle |
|---------|-----------|------|
| `qa3-agent` | Oui | Parent routeur + grilles (`references/rubrics/`) + `model-routing.md` |
| `orchestrateur-qa-95` | Oui | Wrapper chat boucle gate 95 |
| `strophe-review` | Oui | Phase 1 relire/réviser (fil) → phase 2 orchestrateur |

## Sync (Numastria)

SoT Git : `{racine-repo}/.cursor/skills/`. Voir `NUMASTRIA.md` pour pont Codex (`link-codex-skills.py`).

```powershell
cd d:\users\Strophe\Documents\1-IA\Numastria
uv run .cursor\skills\qa3-agent\scripts\skill_paths.py
```

**Post-edit** : vérifier chemins absolus via `skill_paths.py` ; smoke : `references/smoke-checklist.md`.
