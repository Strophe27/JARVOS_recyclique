# QABrief — gabarit (qa3-agent)

**Si tu es l'agent parent (orchestrateur)** : construire le brief Task. **Ne pas** ouvrir les sources du livrable — reserve aux workers.

**Point d'entree chat** : [`chat-delegation.md`](chat-delegation.md). Boucle gate → **`orchestrateur-qa-95`**.

**Modèles Task** : [`model-routing.md`](model-routing.md) — slugs explicites par plateforme et rôle (Cursor : Grok planner · C2.5 workers ; Codex : LUNA max ; Claude : Sonnet). Override utilisateur (ex. KExpress) prime.

```yaml
skill_root: "{USER_SKILLS_DIR}/qa3-agent"
heavy_refs_root: "{USER_SKILLS_DIR}/qa3-agent/references/rubrics"

# Objet audite (QA3)
object_under_review:
  kind: document              # canonique B6 ; legacy type converti cote parent
  sources:
    - type: path
      value: "D:/chemin/vers/fichier.md"
    # - type: inline_text
    #   value: "..."
    # - type: conversation_excerpt
    #   value: "..."
    # - type: diff
    #   value: "..."

# Legacy (converti selon schema.md)
type: document               # alias → kind
scope_paths: []                # alias → sources type path
conversation_brief: ""         # alias → conversation_excerpt ; conserve pour compat QA2

kinds_mixtes: []               # optionnel ex. [code, document] — planner
requirements_exist: false      # optionnel — active passe traceability dédiée (C12)
expected_outputs_exist: false  # optionnel — avec requirements_exist pour traceability
criticality: medium            # low | medium | high
mode: validation               # validation | adversarial | exploratory
pipeline: standard             # light | standard | full
review_mode: standard          # P2 : comparative | synthesis | decision_review

user_intent: "Une ligne : ce que l'utilisateur veut du QA"
objective: ""
output: markdown               # markdown | markdown+json
markdown_only: false
readonly: true
axes: ""
custom_grid: ""                # remplace domains/{kind}.md uniquement (C13)
severity_anchors: ""
brief_version: 1               # optionnel — supprimer si inutile

# Scoring / gate (A4)
gate_score: 95
minimum_coverage: 80           # coverage_score fusionne
minimum_audit_confidence: 70   # option P2 — absent en Phase 1
max_cycles: 3
exploratory_blocks_gate: true  # true en boucle gate (workflow-loop) ; si mode exploratory + gate actif

rubric_layers:
  - universal
  - domain
  - mode
  # - pass              # si passe technique dediee

system_subkind: ""             # ex. software_architecture pour kind: system

# Telemetrie (obligatoire — herite par planner et workers)
telemetry:
  run_id: ""                   # parent genere si vide : YYYYMMDD_HHMMSS_<project>
  events_path: ""              # parent resout via skill_paths.py (absolu install)
  parent_event_id: null
  entry_trigger: ""            # ex. boucle qa3, qa3 simple, loop qa2 compat
  wrapper_skill: null          # ex. orchestrateur-qa-95 si lance depuis cet orchestrateur
  run_in_background: null      # optionnel — orchestrateur-qa-95 uniquement (chat→parent)
```

**Normalisation parent** : voir `references/rubrics/schema.md` pour aliases (`type`, `scope_paths`, `conversation_brief`, `confidence` legacy).

**Inférence** : bloquant si sources vides **et** `conversation_brief` vide. Defauts : `criticality` medium, `mode` validation, `kind` deduit, `minimum_coverage` 80.

**Checklist parent** : phrase anti-dilution Task/spawn ; brief racine complet ; planner bloquant ; **schedule R11** (`compute_worker_schedule.py` + `schedule_complete` si `pass_count >= 2`) ; resync apres planner — voir `workflow.md` et `references/r11-file-shard-schedule.md`. Chaque passe worker : champ **`technique_pass`** obligatoire (`none` | `integrated` | nom technique) — voir `telemetry.md`.

**Exemple message worker** :

```text
**Tu es le worker QA3 (multi-agents)** : tu charges sources et grilles sous heavy_refs_root. Tu **peux invoquer Task** pour spawner des sous-agents (§8 worker-qa.md).

Lis puis suis {USER_SKILLS_DIR}/qa3-agent/references/worker-qa.md

--- QABrief racine ---
[YAML ci-dessus]

--- Passe courante ---
pass_id: pass-1
kind: document
mode: validation
technique_pass: none
objective: "Verifier clarte installation"
```

**Chemins** : `{USER_SKILLS_DIR}` → chemin absolu avant envoi Task.
