# Scripts QA3 — standards (alignes BMAD)

Pattern d'execution : **`uv run`** (equivalent `npx` pour Python). Voir [uv](https://docs.astral.sh/uv/).

## Regles

| Regle | Detail |
|-------|--------|
| PEP 723 | Bloc `# /// script` en tete de chaque `.py` sous `scripts/` |
| Stdlib seule | Pas de deps externes sauf besoin explicite |
| stdout | JSON pour l'agent (`{"ok": true, ...}`) |
| stderr | Diagnostics (`TELEMETRY_APPEND_FAILED`, etc.) |
| Exit codes | `0` OK · `1` echec metier · `2` arguments invalides |
| argparse | `--help` obligatoire |
| Fallback | Si `uv` absent → `python scripts/xxx.py` ; si les deux echouent → `TELEMETRY_APPEND_FAILED` dans le rapport (pas d'ecriture manuelle JSONL) |

## Commandes canoniques

Depuis `{skill_root}` :

```bash
uv run scripts/append_event.py --event chemin/event.json
uv run scripts/append_event.py --event chemin/event.json --summary
uv run scripts/skill_paths.py
uv run scripts/qa_stats.py --json
uv run scripts/analyze_cycles.py --json
uv run scripts/analyze_pass_roi.py --json
uv run scripts/analyze_snapshot.py --write --compare-previous
uv run scripts/analyze_export_improvements.py --dry-run --cycles-json cycles.json --roi-json roi.json
uv run scripts/telemetry_consolidate.py --mirror-repo
```

`--events` optionnel sur `append_event` / `qa_stats` / `telemetry_audit` / `verify_run_closure` / `analyze_cycles` / `analyze_pass_roi` — défaut = install (`skill_paths.py`).

**Agents** : invoquer via **Shell**, lire le JSON stdout, verifier `"ok": true`.

## Fallback (ordre)

1. `uv run scripts/append_event.py ...`
2. `python scripts/append_event.py ...` (memes args)
3. Echec → 1 ligne `TELEMETRY_APPEND_FAILED` dans le rapport QA ; le QA continue

## Prerequis

`uv` sur le PATH : https://docs.astral.sh/uv/getting-started/installation/

## Scripts

| Script | Role |
|--------|------|
| `append_event.py` | Append JSONL + option CSV summary |
| `skill_paths.py` | Chemins canoniques install (stdout JSON) |
| `telemetry_consolidate.py` | Fusion journaux install + dépôt + archives |
| `qa_stats.py` | Agregats et drapeaux orchestration (lecture JSONL en flux) |
| `analyze_cycles.py` | Trajectoires `loop_cycle`, gate finale, stagnation, epuisement |
| `analyze_pass_roi.py` | ROI par `pass_kind` / `technique_pass`, cosmétique, redondance intra-run |
| `analyze_snapshot.py` | Snapshot session (métriques + watermark) → artefacts JSON + MD |
| `analyze_export_improvements.py` | Pont R-AI-01 draft : JSONL `improvement_event` (`--dry-run` seul) |
| `telemetry_audit.py` | Audit schema, completude runs, chaine parent, runs stale |
| `verify_run_closure.py` | Verifie clôture d'un `run_id` (sequence + `run_finished`) |
| `compute_worker_schedule.py` | Ordonnancement batches R11 (`--passes` planner YAML/JSON) |
| `test_telemetry_scripts.py` | Tests unitaires (`uv run python -m unittest scripts.test_telemetry_scripts`) |

Reference BMAD proche : `memlog.py` (append-only), `wake.py` (uv run + JSON stdout).
