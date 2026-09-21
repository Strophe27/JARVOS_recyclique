# Télémétrie QA3

**Journal canonique (prod)** : `{skill_root}/telemetry/events.jsonl` où `{skill_root}` = chemin **absolu** vers `~/.cursor/skills/qa3-agent` (install Cursor), **pas** le dépôt dev `Skills/qa/qa3-agent` sauf miroir explicite.

CSV synthèse : `{skill_root}/telemetry/runs_summary.csv` (1 ligne / `run_finished`)  
Échecs de validation : `{skill_root}/telemetry/append_failures.jsonl` (rejets `schema_violation`)

### Résoudre les chemins (bootstrap parent)

Avant tout Task, le parent **doit** résoudre `telemetry.events_path` en chemin absolu install :

```bash
uv run scripts/skill_paths.py
```

Stdout JSON : `skill_root`, `events_path`, `runs_summary_csv`, etc. Copier `events_path` dans le QABrief (`telemetry.events_path`).

Override ponctuel : variable d'environnement `QA3_TELEMETRY_EVENTS` ou `QA3_SKILL_ROOT`.

**Exemples canoniques** (8 `event_type`, enveloppe complète) : [`telemetry-examples.md`](telemetry-examples.md).

**Règle timestamp** : ne **jamais** inclure `timestamp` dans les fichiers JSON passés à `--event` — `append_event.py` le pose à l'append.

Format CSV : **séparateur `;`** (Excel locale FR) · encodage **UTF-8 avec BOM**. Les listes (`kinds`, `orchestration_flags`) restent jointes par `|` dans une cellule.

Migration one-shot (ancien fichier en virgules) :

```bash
cd qa/qa3-agent
uv run scripts/migrate_runs_summary_csv.py
```

```powershell
.\qa\scripts\migrate-runs-summary-csv.ps1
```

Convertit le CSV du dépôt **et** celui installé sous `~/.cursor/skills/qa3-agent/telemetry/` (idempotent).

**Qui lit ce fichier** : parent qa3, planner, worker — **en fin de rôle uniquement**.

Standards scripts : [`script-standards.md`](script-standards.md) (pattern BMAD `uv run`).

---

## Logger une action (obligatoire — fin de role)

Chaque acteur **invoque Shell** depuis `{skill_root}` :

```bash
uv run scripts/append_event.py --event chemin/event.json
```

`--events` est **optionnel** : défaut = journal install (`skill_paths.py`). En brief Task, passer le chemin absolu `events_path` si le cwd diffère.

- **`run_finished`** : ajouter `--summary`
- **Lire le JSON stdout** : `{"ok": true, "event_id": "...", ...}`
- JSON volumineux → fichier `.json` temporaire sous `telemetry/.tmp/`, passer le chemin a `--event`

### Fallback si `uv` absent

```bash
python scripts/append_event.py --event chemin/event.json
```

Si les deux echouent : 1 tentative, ligne `TELEMETRY_APPEND_FAILED` dans le rapport, le QA continue.

**Interdit** : ecrire dans `events.jsonl` a la main.

### `append_failures.jsonl`

Quand `append_event.py` rejette un événement (`schema_violation`, code ≠ 0), une ligne est ajoutée ici :

```json
{"timestamp":"…","run_id":"…","event_id":"…","event_type":"…","violations":[{"path":"…","message":"…"}]}
```

L'événement **n'est pas** écrit dans `events.jsonl`. Consulter ce fichier pour diagnostiquer les appends ratés (ex. `run_id` dans `payload`, `agent_role` hors enum, `parent_event_id_invalid`).

### Validation `parent_event_id` à l'append

`append_event.py` charge les événements déjà présents pour le même `run_id` (`qa_stats.load_run_events`) et les passe à `validate_event(..., run_events=...)`.

Si `parent_event_id` n'est pas `null`, il doit référencer un `event_id` **déjà appendé** pour ce `run_id`. Sinon : rejet `schema_violation` avec code `parent_event_id_invalid`, ligne dans `append_failures.jsonl`, exit ≠ 0.

Le premier événement d'un run (`run_context`) a `parent_event_id: null`. Les suivants pointent vers l'`event_id` du parent logique (ex. `routing_decision` → `run_context_001`).

`telemetry_audit.py` recoupe aussi la chaîne sur tout le journal (`parent_run_mismatch`, `parent_missing`) — complément post-hoc, pas substitut à la validation à l'append.

---

## Journal legacy (pre-2026-06-29)

Les lignes antérieures au durcissement validateur (avant 2026-06-29) peuvent être **historiques** et non conformes à la spec actuelle :

- `run_id` dans `payload` au lieu de la racine
- `agent_role: "parent"` au lieu de `parent_qa3`
- champs payload inventés (`scope_summary`, `planner_required`, `kind` au lieu de `kinds[]`)
- payloads vides ou minimaux sur `worker_complete`
- timestamps artificiels (arrondis manuels)

Ces lignes restent dans le journal pour traçabilité ; **ne pas** les prendre comme modèle. Utiliser [`telemetry-examples.md`](telemetry-examples.md) et `scripts/fixtures/telemetry/valid_*.json`.

> **Note fixtures** : les fichiers `valid_*.json` peuvent inclure un `timestamp` pour les tests unitaires (post-normalisation). Pour un append réel via `--event`, **ne pas** inclure `timestamp` — copier depuis `telemetry-examples.md`, pas depuis les fixtures brutes.

---

## Consolidation multi-journaux

Si des runs ont été écrits dans le dépôt dev **et** dans l'install (`~/.cursor/skills/`), fusionner vers le journal canonique install :

```bash
cd qa/qa3-agent
uv run scripts/telemetry_consolidate.py --mirror-repo
```

- Déduplique par `(run_id, event_id)` (garde la copie la plus valide)
- Backup automatique `events.backup-YYYYMMDD-HHMMSS.jsonl`
- Reconstruit `runs_summary.csv` depuis les `run_finished`
- `--mirror-repo` : copie le résultat dans `qa/qa3-agent/telemetry/` (miroir dev)
- `--dry-run --json` : rapport sans écriture
- Sources par défaut : install + dépôt + backups `.archives/**/telemetry/events.jsonl`

Après consolidation, tous les scripts (`append_event`, `qa_stats`, `telemetry_audit`, `verify_run_closure`) pointent par défaut sur l'install.

---

## Audit

Vérifier complétude des runs, payloads invalides, chaîne `parent_event_id` et dérive journal ↔ CSV :

```bash
cd qa/qa3-agent
uv run scripts/telemetry_audit.py
```

Sortie JSON stdout (`--json`) : runs incomplets (sans `run_finished`), violations par `run_id`, écarts journal ↔ CSV. Voir aussi l'artefact [`artefacts/2026-06-29_01_telemetry-audit-findings.md`](artefacts/2026-06-29_01_telemetry-audit-findings.md).

### Dérive journal ↔ CSV (`csv_jsonl_drift`)

`telemetry_audit.py` croise `events.jsonl` et `runs_summary.csv` (même répertoire `telemetry/`) :

| Situation | Code finding | Sévérité |
|-----------|--------------|----------|
| `run_id` dans le CSV sans `run_finished` dans le JSONL | `csv_jsonl_drift` | P1 |
| `run_finished` dans le JSONL (run non-legacy) sans ligne CSV | `csv_jsonl_drift` | P1 |

Les runs `test_` / `smoke_` et les orphelins legacy sont exclus par défaut (comme le reste de l'audit). Utiliser `--include-legacy` pour tout auditer.

---

## Clôture de run (`verify_run_closure.py`)

Avant de livrer le rapport QA, le **parent** exécute :

```bash
uv run scripts/verify_run_closure.py --run-id $RUN_ID
```

- **Exit 0** + stdout `{"ok": true, "sequence_ok": true, "has_run_finished": true}` → séquence complète dans le journal.
- **Exit 1** + `violations[]` → séquence incomplète (`run_context`, `routing_decision`, `planner_complete` si planner*, `schedule_complete` si planner* et `pass_count >= 2`, `worker_complete`, `qa_fusion`, `run_finished`, `loop_cycle` si boucle).

**Enforcement à l'append** : `append_event.py` applique les mêmes règles via `validate_event(..., run_events=...)` — un `worker_complete` sans `planner_complete` préalable ou un `run_finished` sans séquence complète est **refusé** (`schema_violation`).

Complète la checklist parent (`workflow.md`) : gate livrable = `verify_run_closure` exit 0 **ou** mention explicite `TELEMETRY_APPEND_FAILED` dans le rapport.

---

## Stats (hors run QA — operateur ou script)

```bash
uv run scripts/qa_stats.py --json
```

Lire le JSON stdout (`run_flags`, `flag_totals`, `routing_gate_rates`, etc.). Lecture **en flux** (une passe, champs minimaux par run — pas de chargement integral du fichier en memoire).

---

## Bloc QABrief (hérité par tous les Task)

```yaml
telemetry:
  run_id: ""
  events_path: "{skill_root}/telemetry/events.jsonl"
  parent_event_id: null
  entry_trigger: ""
  wrapper_skill: null   # ex. orchestrateur-qa-95
```

- Parent : si `run_id` vide → `YYYYMMDD_HHMMSS_<project_slug>` + `run_context`
- Propager le bloc **identique** à planner et workers

**`project`** : dernier segment du plus long préfixe commun des chemins `scope_paths` ; sinon `unknown` + `project_hint` dans `run_context`.

---

## Enveloppe (tous les événements)

Voir [`telemetry-examples.md`](telemetry-examples.md) pour les 8 exemples complets. Schéma minimal :

```json
{
  "schema_version": 1,
  "run_id": "EXAMPLE_RUN_ID",
  "event_id": "worker_pass-1_001",
  "parent_event_id": null,
  "event_type": "worker_complete",
  "agent_role": "worker",
  "skill": "qa3-agent",
  "qa_variant": "qa3_loop",
  "model": "composer-2.5",
  "project": "Skills",
  "payload": {}
}
```

**Champ `model`** : slug **réel** du Task — voir [`model-routing.md`](model-routing.md) (ex. planner Cursor = `cursor-grok-4.6-xhigh`, workers = `composer-2.5`).

(`timestamp` ajouté par le script — ne pas le mettre dans le fichier `--event`.)

| `event_type` | Émetteur | Quand |
|--------------|----------|-------|
| `run_context` | parent_qa3 | 1× si `run_id` généré |
| `routing_decision` | parent_qa3 | 1× avant Task enfants |
| `planner_complete` | planner | 0–1× |
| `schedule_complete` | parent_qa3 | 0–1× si routage `planner*` et `pass_count >= 2` (R11) |
| `worker_complete` | worker | N× (obligatoire même `markdown_only`) |
| `qa_fusion` | parent_qa3 | 1–2× / itération boucle |
| `loop_cycle` | parent_qa3 | 0–3× (boucle gate) |
| `run_finished` | parent_qa3 | 1× toujours + `--summary` |

---

## `run_context` — payload (parent_qa3)

Émis **une fois** si le parent génère `run_id` (vide dans le brief). `agent_role` : `parent_qa3`.

| Champ | Type | Oblig. | Description |
|-------|------|--------|-------------|
| `entry_trigger` | string | oui | Mot-clé ou intention (`qa3 simple`, `boucle qa3`, …) — copie brief `telemetry.entry_trigger` |
| `wrapper_skill` | string \| null | oui | Skill wrapper (`orchestrateur-qa-95`) ou `null` |
| `kinds` | string[] | oui | Kinds classifiés (B6) sur le périmètre |
| `gate_score` | int | oui | Seuil gate quality (défaut 95) |
| `minimum_coverage` | int | oui | Seuil coverage fusionné (défaut 80) |
| `loop_enabled` | bool | oui | `true` si boucle gate (`workflow-loop.md`) |
| `max_cycles` | int | si boucle | Max itérations (défaut 3) ; absent ou `1` si run simple |
| `loop_iteration` | int | oui | `0` run simple ; `1` au bootstrap boucle |
| `project_hint` | string | si `project` inconnu | Indice chemin ou libellé quand `project` = `unknown` |

---

## `routing_decision` — payload (parent_qa3)

Émis **avant** tout Task planner/worker. `routing_rationale` **obligatoire**.

| Champ | Type | Oblig. | Description |
|-------|------|--------|-------------|
| `routing` | string | oui | `mono` \| `direct_worker` \| `planner` \| `planner_multi_pass` |
| `routing_rationale` | string | oui | Phrase courte justifiant le découpage (reproductibilité) |
| `kinds` | string[] | oui | Kinds retenus après classification |
| `kinds_mixtes` | bool | oui | `true` si plusieurs kinds / axes orthogonaux |
| `source_count` | int | oui | Nombre de fichiers ou sources `path` |
| `mode` | string | oui | `validation` \| `adversarial` \| `exploratory` |
| `pipeline` | string | oui | `light` \| `standard` \| `full` |
| `criticality` | string | oui | `low` \| `medium` \| `high` |
| `loop_iteration` | int | si boucle | Itération courante (`0` run simple) |

---

## `planner_complete` — payload (planner)

Émis **après** YAML `passes` valide. `agent_role` : `planner`. Absent si routage direct sans planner.

| Champ | Type | Oblig. | Description |
|-------|------|--------|-------------|
| `pass_count` | int | oui | `passes.length` |
| `passes` | object[] | oui | Résumé par passe : `id`, `kind` ; optionnel `technique_pass`, `mode` |
| `parse_retries` | int | oui | Relances planner pour YAML invalide (`0` si premier coup) |
| `routing_rationale` | string | oui | Copie du champ YAML planner |

---

## `schedule_complete` — payload (parent_qa3 — R11)

Émis **après** `uv run scripts/compute_worker_schedule.py` exit 0 quand routage `planner*` et `pass_count >= 2`. `agent_role` : `parent_qa3`.

| Champ | Type | Oblig. | Description |
|-------|------|--------|-------------|
| `batches` | string[][] | oui | Liste ordonnée de batches ; chaque batch = liste de `pass_id` |
| `parallel_in_batch` | bool[] | oui | `true` si workers du batch peuvent tourner en parallèle |
| `overlaps_blocked` | object[] | oui | Chevauchements détectés (peut être `[]`) |
| `max_concurrent_workers` | int | oui | Cap R11 (défaut 6) |
| `pass_count` | int | oui | Nombre total de passes |
| `shard_count` | int | oui | Passes `execution_tier: shard` |
| `cross_cutting_count` | int | oui | Passes `cross_cutting` |
| `allow_overlap_debug` | bool | oui | `true` seulement si override `QA3_SCHEDULE_ALLOW_OVERLAP=1` |
| `rationale` | string | oui | Résumé machine du plan |

---

## `pass_added_value` (worker)

| Valeur | Règle |
|--------|-------|
| `none` | 0 finding actionable (P0+P1) |
| `low` | Info seulement |
| `medium` | 1–2 P1, ou `coverage_score` < 70 avec findings |
| `high` | ≥1 P0, ou ≥3 P1, ou `technique_pass` avec finding matériel |

Sévérités : **P0 / P1 / Info** uniquement (pas P2/P3).

---

## `worker_complete` — payload (worker)

Champs **obligatoires** dans `payload` (en plus de l'enveloppe) :

| Champ | Type | Description |
|-------|------|-------------|
| `pass_id` | string | Identifiant de la passe (`passes[i].id` ou `pass-{kind}`) |
| `pass_kind` | string | `kind` de la passe |
| `quality_score` | int 0-100 | Selon `formulas.md` |
| `audit_confidence` | int 0-100 | Fiabilite de l'audit |
| `coverage_score` | int 0-100 | Couverture perimetre |
| `open_findings` | object | `{ P0, P1, Info }` compteurs |
| `pass_added_value` | string | `none` \| `low` \| `medium` \| `high` (regles ci-dessus) |
| `findings_actionable` | int | `P0 + P1` |

**`technique_pass`** (obligatoire sur passes **planifiées** par `planner_complete`) :

| Valeur | Usage |
|--------|-------|
| `none` | Passe domaine/mode sans technique dédiée |
| `integrated` | Checklist technique intégrée dans l'objective (sans passe `passes/*.md` dédiée) |
| `<nom>` | Passe technique nommée (`premortem`, `fmea`, …) |

**Interdit** : absent, vide, ou `unknown` sur un `pass_id` listé dans `planner_complete.passes[]`. Le validateur rejette l'append (`technique_pass_required` / `technique_pass_forbidden`).

Optionnels restants : `axis_scores`, `files_analyzed[]`.

---

## `qa_fusion` — payload (parent_qa3)

Émis **après chaque fusion** workers. En boucle : 1× `initial`, +1× `re_qa` si correctifs dans la même itération.

| Champ | Type | Oblig. | Description |
|-------|------|--------|-------------|
| `loop_iteration` | int | oui | `0` run simple ; `1..3` boucle |
| `qa_pass_in_iteration` | string | oui | `single` \| `initial` \| `re_qa` |
| `total_workers` | int | oui | Workers fusionnés sur cette passe QA |
| `fused_quality` | int 0-100 | oui | Quality fusionné (`formulas.md` A3) |
| `fused_coverage` | int 0-100 | oui | Coverage fusionné |
| `fused_audit_confidence` | int 0-100 | oui | Confiance fusionnée |
| `lowest_worker_quality` | int 0-100 | oui | Min `quality_score` workers |
| `lowest_worker_coverage` | int 0-100 | oui | Min `coverage_score` workers |
| `lowest_worker_audit_confidence` | int 0-100 | oui | Min `audit_confidence` workers |
| `open_findings` | object | oui | `{ P0, P1, Info }` — alias acceptés : `open_P0`, `open_P1` |
| `gate_passed` | bool | oui | Gate A4 sur scores fusionnés |
| `gate_score` | int | oui | Seuil appliqué |
| `minimum_coverage` | int | oui | Seuil coverage appliqué |
| `findings_actionable` | int | oui | `P0 + P1` ouverts |
| `worker_scores` | object[] | non | `{ pass_id, quality, coverage, confidence }` par worker |

> **Métrique succès** : `qa_fusion.gate_passed` est un état **intermédiaire** par fusion (initial / re_qa). Ne pas l'utiliser pour le taux de succès global — seul `run_finished.outcome == gate_passed` (ou `run_finished.gate_passed` final) compte. Voir `cycle_metrics` dans `qa_stats.py --json`.

---

## `loop_cycle` — payload (parent_qa3)

Émis en **fin d'itération** boucle (étape G, ou gate atteinte en B sans correctifs). `0` en run simple.

| Champ | Type | Oblig. | Description |
|-------|------|--------|-------------|
| `loop_iteration` | int | oui | `1..3` |
| `gate_passed` | bool | oui | Gate atteinte à la fin de l'itération |
| `fused_quality` | int 0-100 | oui | Quality fusionné final de l'itération |
| `fused_coverage` | int 0-100 | oui | Coverage fusionné final de l'itération |
| `fused_audit_confidence` | int 0-100 | non | Confiance fusionnée finale |
| `corrections_applied` | bool | oui | `true` si correctifs P0/P1 entre QA initial et re-QA |
| `hitl` | bool | oui | `true` si arrêt HITL (`iteration == max_cycles` sans gate) |
| `score_delta` | int | non | Gain `fused_quality` vs fusion précédente (drapeau `loop_effective`) |
| `findings_count` | int | non | Findings actionnables détectés en fin d'itération (`qa_fusion.findings_actionable` de la fusion courante) — alimente le format retour R8 |

---

## `run_finished` — payload (parent_qa3)

Émis **une fois** en fin de run. Toujours `--summary` → ligne `runs_summary.csv`.

| Champ | Type | Oblig. | Description |
|-------|------|--------|-------------|
| `outcome` | string | oui | `gate_passed` \| `gate_failed` \| `hitl` \| `aborted` |
| `kinds` | string[] | oui | Kinds audités sur le run |
| `routing` | string | oui | Copie `routing_decision.routing` |
| `mode` | string | oui | Mode brief |
| `pipeline` | string | oui | Pipeline brief |
| `loop_enabled` | bool | oui | Boucle gate active |
| `total_workers` | int | oui | **Cumul** workers sur toutes fusions du run |
| `final_quality` | int 0-100 | oui | Dernier `fused_quality` |
| `final_coverage` | int 0-100 | oui | Dernier `fused_coverage` |
| `final_audit_confidence` | int 0-100 | non | Dernier `fused_audit_confidence` |
| `final_p0` | int | oui | P0 ouverts en fin de run |
| `final_p1` | int | oui | P1 ouverts en fin de run |
| `gate_passed` | bool | oui | État gate final |
| `findings_actionable` | int | oui | Alias accepté : `total_findings_actionable` |
| `loop_iterations` | int | **oui si `loop_enabled`** | Itérations boucle exécutées (`0` si run simple). **Migration** : si absent mais `loop_cycle` présents dans le journal, le validateur dérive `max(loop_iteration)` ou le count |
| `orchestration_flags` | string[] | oui | Drapeaux calculés (`qa_stats.py`) ; `[]` si aucun dans le JSON `--event` |

**Injection au `--summary`** : lors de l'append `run_finished` avec `--summary`, `append_event.py` recalcule et **écrase** `payload.orchestration_flags` à partir du journal du `run_id` (via `inject_orchestration_flags()`). L'agent peut passer `[]` ou omettre le champ ; la valeur finale CSV reflète le calcul `qa_stats.py`.

**Colonnes CSV enrichies** : au `--summary`, `entry_trigger` et `wrapper_skill` sont lus depuis le `run_context` du même `run_id` dans le journal (pas recopiés depuis le payload `run_finished`). Colonnes définies dans `append_event.py` `CSV_COLUMNS` :

| Colonne | Source |
|---------|--------|
| `entry_trigger` | `run_context.payload.entry_trigger` |
| `wrapper_skill` | `run_context.payload.wrapper_skill` (`""` si `null`) |

**CSV** : `kinds` et `orchestration_flags` séparés par `|` ; colonnes = `append_event.py` `CSV_COLUMNS`.

---

## Drapeaux et agregats (`qa_stats.py`)

`uv run scripts/qa_stats.py --json` retourne :

**Drapeaux par run** (`run_flags[run_id][]`) :

`planner_overkill`, `light_underkill`, `silent_pass`, `low_confidence_gate`, `loop_effective`, `gate_passed_with_open_p1`

**Agregats globaux** (pas des drapeaux par run) :

- `technique_pass_roi` — ROI des passes techniques nommees
- `routing_gate_rates` — taux `gate_passed` par mode de routage (`mono`, `planner`, …) — basé sur **`run_finished.outcome`**
- `cycle_metrics` — trajectoires `loop_cycle` (`fused_quality`, `score_delta`, `gate_passed` par itération) + `gate_final` (succès/fail) + `stagnation_runs` (via `analyze_cycles.detect_stagnation`). **Pas** `qa_fusion.gate_passed` intermédiaire
- `flag_totals` — comptage transversal des drapeaux
