# Smoke checklist — QA3 regression

Manual smoke tests before declaring qa-regression complete.

| Test | Pass criteria | Fail criteria |
|------|---------------|---------------|
| document mono-fichier (`path`) | JSON 0-100, 3 scores, gate A4 | crash / confidence-only score |
| `inline_text` source | treated as complete source, coverage OK | ignored or crash |
| `diff` source | delta audited, audit_confidence adjusted if no context | ignored |
| prompt_skill SKILL.md | domain resolved, F19 examples applicable | missing grid |
| boucle `loop qa3` | orchestrateur → qa3, gate quality+P0+coverage≥80 | qa2 ref or incomplete gate |
| `gate qa3` / `QA3 95+` | orchestrateur → qa3 | routes to qa2 |
| `loop qa2` compat | orchestrateur → qa3 + compat note | crash |
| archives qa2 | `~/.cursor/skills/.archives/qa2-agent/` ou `qa/archives/qa2-agent/` ; absent de sync actif | qa2 encore sync actif |
| model-routing | `references/model-routing.md` cite dans workflow, orchestrateur, strophe-review, qabrief | vieux « Composer 2.5 seul » sans Grok planner |
| télémétrie `technique_pass` | `worker_complete` avec `technique_pass` non vide sur passe planifiée | append rejeté |
| schedule R11 | `compute_worker_schedule.py` exit 0 + `schedule_complete` si `pass_count >= 2` | workers avant schedule |
| clôture run | `verify_run_closure.py --run-id` exit 0 | séquence incomplète |

## Verify sync (Numastria)

SoT Git : `{racine-repo}/.cursor/skills/qa3-agent/`. Pont Codex : `link-codex-skills.py` (voir `NUMASTRIA.md`).

```powershell
cd d:\users\Strophe\Documents\1-IA\Numastria
# Vérifier présence grilles
Test-Path .cursor\skills\qa3-agent\references\rubrics\layers\universal.md
```

Expected : `True` ; scripts télémétrie depuis `{skill_root}` : `uv run scripts/skill_paths.py` exit 0.

**Legacy poste Skills** (hors monorepo Numastria) : `d:\users\Strophe\Documents\1-IA\Skills\qa\scripts\sync-to-cursor-skills.ps1` — ne pas confondre avec le chemin Git ci-dessus.

## Worker smoke output

Fixture document must produce JSON with integer scores:

```yaml
quality_score: 0-100
audit_confidence: 0-100
coverage_score: 0-100
```

Gate fixture : quality≥95 + no P0 + coverage≥80 on known-good document.

## Examples F19

Confirm `references/rubrics/examples/{prompt_skill,document,system}.md` match plan Annexe F19.

## schema.md

Confirm aliases + dedicated_when present (diff vs plan Annexe schema).
