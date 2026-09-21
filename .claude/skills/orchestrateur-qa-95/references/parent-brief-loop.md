# Brief parent — boucle gate 95+ (chat → Task)

Template pour le **seul** Task parent lance par le chat (`orchestrateur-qa-95`).

Remplacer `{USER_SKILLS_DIR}` par le chemin skills réel.

**Numastria (Git) :** `{USER_SKILLS_DIR}` = `{racine-repo}/.cursor/skills` (dossier qui contient `qa3-agent/` et `orchestrateur-qa-95/`).  
Sinon : `C:\Users\…\.cursor\skills` (install user hors repo).

Règle workers : `.cursor/rules/collab-orchestration-agents.mdc` dans ce repo (fallback user `~/.cursor/rules/cursor-orchestration-agents.mdc`).

```text
Tu es le parent QA3 pour une boucle QA gate 95+.

**Obligation parent** : tu es le **seul** parent qa3 pour cette boucle. Lis en entier :
1. {USER_SKILLS_DIR}/qa3-agent/workflow.md
2. {USER_SKILLS_DIR}/qa3-agent/workflow-loop.md
3. {USER_SKILLS_DIR}/orchestrateur-qa-95/SKILL.md (section Fiabilite)
4. {racine-repo}/.cursor/rules/collab-orchestration-agents.mdc
   (sinon ~/.cursor/rules/cursor-orchestration-agents.mdc)

Puis execute workflow-loop.md :
- gate quality defaut 95, coverage defaut 80, max 3 iterations, HITL si echec
- Invoque **Task** pour planner (si routage qa3-agent) puis **workers par batch R11** (`compute_worker_schedule.py` exit 0 si pass_count >= 2) — n'absorbe pas le QA dans ce contexte
- **Modeles** : lis {USER_SKILLS_DIR}/qa3-agent/references/model-routing.md § Alias rôles — `parent` (Task chat→parent) · `planner` · `workers` · `cloture`. Cursor : Grok planner ≠ C2.5 workers ; Codex : LUNA max **même slug** tous rôles ; Claude : Sonnet
- `model:` **explicite** sur chaque Task enfant (jamais d'heritage implicite)

**Stagnation (R2 — obligatoire)** : apres chaque `loop_cycle`, si **2 cycles consecutifs** avec `score_delta = 0` — stopper la boucle **avant** l'iteration 3, append `loop_cycle` avec `hitl: true`, et retourner HITL au chat (causes + remedes humains). Ne pas consommer un 3e cycle inutile (ex. 94→94→94).

**Cap workers soft (R9)** : si le planner prevoit **> 6 workers** (`pass_count > 6`), alerter dans le retour chat et exiger une justification explicite dans `routing_rationale` du `routing_decision` — sinon reduire le plan avant execution.

**Planner ROI (R10)** : ne pas doubler `code` ni `process` si la **1re passe** atteint Q≥95 **et** 0 findings — privilegier `prd` + passes adversariales (`contradiction`, `fmea`) sur gros docs avant tout correctif `code`/`process` redondant.

Construis le QABrief racine selon {USER_SKILLS_DIR}/qa3-agent/references/qabrief-template.md
(skill_root, heavy_refs_root, gate_score, minimum_coverage, exploratory_blocks_gate: true, readonly: false sauf revue sans edition)

**R11 schedule (obligatoire si planner et pass_count >= 2)** : apres planner_complete, depuis `{USER_SKILLS_DIR}/qa3-agent/` :
  uv run scripts/compute_worker_schedule.py --passes chemin/planner.yaml
Append `schedule_complete` ; executer workers **uniquement** selon `batches` retournes. Voir `references/r11-file-shard-schedule.md`.

Inclure dans le QABrief racine le bloc telemetry :
  entry_trigger: "[mot-cle utilisateur ex. boucle qa3]"
  wrapper_skill: orchestrateur-qa-95
  run_in_background: [true|false selon mode choisi par le chat]

Livrable(s) : [chemins absolus dans object_under_review.sources ou scope_paths]
Intention : [user_intent + conversation_brief si pertinent]
Contraintes edition : modifier uniquement le(s) livrable(s) vise(s) sauf demande contraire.

**Cloture integrale (obligatoire)** : apres gate (etape B ou G), si P1/P2/Info encore ouverts — workflow-loop.md § Cloture integrale :
- construire debt_closure_list depuis la fusion
- un Task worker (slug **cloture** dans model-routing.md) avec references/worker-cloture-integrale.md
- ne pas run_finished tant que dettes non bloquantes ouvertes sans HITL documente

**Gate clôture télémétrie (R4 — obligatoire)** : avant tout retour au chat, depuis `{USER_SKILLS_DIR}/qa3-agent/` :
  uv run scripts/verify_run_closure.py --run-id $RUN_ID

**Interdit** `end_turn` sans **exit 0** (`sequence_ok: true`) ni mention explicite `TELEMETRY_APPEND_FAILED` dans le rapport. Aligné `workflow.md` etapes 7–8.

Retour attendu vers le chat :
- quality_score, audit_confidence, coverage_score /100 et verdict gate
- **format cycles obligatoire (R8)** — une ligne par `loop_cycle` executé :
  `Cycle N : détecté {findings_count} findings → corrigé → +{score_delta} pts`
  (`findings_count` et `score_delta` depuis le payload `loop_cycle` ; si stagnation R2, indiquer `→ stagnation, HITL`)
- resume des ameliorations
- confirmation livraison integrale (0 P0, 0 P1/P2/Info ouverts) OU bloc HITL par item restant
- confirmation `verify_run_closure` exit 0 OU `TELEMETRY_APPEND_FAILED` documente
- confirmation des fichiers modifies
- si HITL (echec gate ou stagnation R2) : 1-3 causes + 1-3 remedes humains
- si `pass_count > 6` : alerte R9 + copie de la justification `routing_rationale`
- note : « La chaine QA deleguee ne reussit pas toujours si le chat a absorbe le QA inline »
```

**Prefixe obligatoire** (anti-dilution) — avant le bloc ci-dessus :

> **Obligation parent** : tu es le **seul** parent qa3 pour cette boucle. Invoque **Task** pour planner (si routage qa3-agent) puis **workers par batch R11** (`compute_worker_schedule.py` exit 0 si `pass_count >= 2`) — n'absorbe pas le QA dans ce contexte.

**Mode fond** : ajouter apres le prefixe :

> **Mode execution** : tache de fond — le chat peut continuer ; restituer scores/verdict/correctifs a la notification.

**Compat loop qa2** : si l'utilisateur a dit `loop qa2`, mentionner en tete du retour :
« Compat : loop qa2 route vers QA3 (identique loop qa3). »

### Exemple — strophe-review phase 2 → orchestrateur

```text
$strophe-review sur apps/vitrine/atelier-seo/mon-article.md
→ phase 1 : relire + corriger dans le fil
→ phase 2 (bloquante) : $orchestrateur-qa-95 boucle gate 95 sur le même chemin
→ retour : scores + Cycle N + fichiers modifiés
```
