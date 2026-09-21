# Adaptation Grok Bot / tous les gros bots

Ce package vient de Numastria (`qa3-agent`) et est **partagé** entre assistants.

## Remplacements runtime
| Numastria / Cursor IDE | Ici (Grok Bot) |
|------------------------|----------------|
| `Task` `generalPurpose` | `Task` `subagent_type: executor` (effort `high` défaut) |
| `model:` composer / grok / sonnet | `model: high` ou `low` sur executor |
| `run_in_background` | `run_in_background: true` sur Task ; restitution via notification |
| `{USER_SKILLS_DIR}/qa3-agent` | `/home/box/agent-data/workflows/qa3-agent` |
| Prélecture interdite des sources par le chat | Oui — le chat ne lit pas le livrable ; workers oui |
| Telemetrie `uv run scripts/…` | Optionnelle ; si scripts absents, journaliser dans le rapport + `log.md` du livrable |
| SendToUser | Obligatoire pour parler à l’utilisateur |

## Portée
Livrable **quelconque** passé en brief : vault Obsidian, repo, dossier docs, PR…  
**Aucun** chemin Jarvos/Numastria en dur dans le brief — le bot appelant fournit `object_under_review`.

## Anti-dilution
Le chat n’absorbe pas le QA. Un seul parent executor pour la boucle. Workers = autres executors (ou même stream si mono-pass).
