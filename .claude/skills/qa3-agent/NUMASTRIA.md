# QA3 dans Numastria (Yo + Strophe)

**Pour qui :** Codex (Yo) et Cursor (Strophe).  
**SoT :** ce dossier `.cursor/skills/qa3-agent/` (Git).

| Skill voisin | Rôle |
|--------------|------|
| `orchestrateur-qa-95` | Chat → boucle gate 95 |
| `strophe-review` | Relire/réviser (fil) → puis orchestrateur |
| `references/model-routing.md` | Slugs modèle (partagé par les 3) |

## Glossaire

| Mot | Sens |
|-----|------|
| **QA3** | Revue déléguée (planner + workers), pas un avis dans le chat. |
| **Boucle** | Relancer jusqu'au score 95, 0 dette. |
| **Pont Codex** | Liens `.agents/skills/` → ces dossiers (gitignoré). |
| **Modèles** | SoT `references/model-routing.md` — Cursor C2.5 + Grok planner · Codex LUNA max · Claude Sonnet. |

## Après un `git pull`

Mentor / Codex :

```powershell
$root = (Get-Location).Path
python (Join-Path $root ".cursor\skills\bmad-mentor\scripts\link-codex-skills.py") $root
```

Relancer Codex. Phrases : `$orchestrateur-qa-95` · `boucle qa3` · `$strophe-review`.

## Chemins

`{USER_SKILLS_DIR}` = `{racine-repo}/.cursor/skills`.  
`skill_paths.py` pointe ici (pas `~/.cursor/skills`) dès que ce dossier contient `SKILL.md`.  
Télémétrie : `telemetry/events.jsonl` — **local**, gitignoré.

## Guide Yo (boucle QA)

Plancher Codex : [`docs/collab/ops/GUIDE_YO_QA_BOUCLE.md`](../../../docs/collab/ops/GUIDE_YO_QA_BOUCLE.md) — phrase minimale, LUNA max, CTA **inscription** (pas chat anonyme).

## Interdit

Upgrade BMAD pour « avoir QA3 ». Ce n'est **pas** un skill vendor BMAD.
