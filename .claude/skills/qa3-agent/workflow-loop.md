# QA3 — boucle iterative (qa loop)

**Public** : agent qui execute une demande **boucle qa3**, **loop qa3**, **gate qa3**, **QA3 95+**, ou equivalent avec gate (defaut quality **95** + coverage **80**).

**Prerequis** : maitriser [`workflow.md`](workflow.md) et [`references/model-routing.md`](references/model-routing.md). Ce fichier decrit **uniquement** la boucle QA3 → correctifs → re-QA3.

**Compat `loop qa2`** : route vers qa3-agent via orchestrateur ; afficher la note compat du SKILL.

---

## Declenchement

Mots-cles : `boucle qa3`, `loop qa3`, `gate qa3`, `QA3 95+`, `boucle qa`, `qa loop`, `loop qa2` (compat), `iteration qa`, `gate 95`, `boucle jusqu'a 95`, `relecture jusqu'a 95`, `ameliorer jusqu'a 95`.

| Parametre | Defaut |
|-----------|--------|
| Gate score (`quality_score`) | **95** |
| `minimum_coverage` | **80** |
| Max iterations | **3** |
| `exploratory_blocks_gate` | **true** en boucle |
| `readonly` correctifs | `false` sauf demande explicite |

---

## Definition : une iteration

**Une iteration** = **1** run QA3 (fusion + scores) **+** correctifs eventuels **+** au plus **1** re-QA3 avant iteration suivante.

Sur la **derniere** iteration (`iteration == max_cycles`) : si la gate n'est pas atteinte apres l'etape D (correctifs), l'etape E declenche HITL **sans** re-QA (l'etape F est sautee).

**Gate (A4)** : `fused_quality >= gate_score` **ET** aucun P0 **ET** `fused_coverage >= minimum_coverage`. P0 ouvert → gate non atteint. Si `fused_audit_confidence < 60` : alerte informative.

---

## Roles

| Role | Qui | Fait quoi |
|------|-----|-----------|
| Orchestrateur boucle | Chat ou Task parent qa3 | Enchaine iterations ; ne prelit pas les sources |
| QA3 | parent qa3 via workflow.md | Planner → workers → fusion triple score |
| Correcteur | Orchestrateur ou Task | Correctifs P0/P1 uniquement |

---

## Algorithme

```
gate_score = brief / user_intent  # defaut 95
minimum_coverage = brief / user_intent  # defaut 80
max_cycles = brief / user_intent  # defaut 3
exploratory_blocks_gate = true
iteration = 0

TANT QUE iteration < max_cycles :
  iteration += 1
  A. QA3 delegue → rapport + fused_quality + fused_coverage + fused_audit_confidence
  B. SI fused_quality >= gate_score ET aucun P0 ET fused_coverage >= minimum_coverage
       → SORTIR boucle (succes iterationnel)
  C. Extraire P0/P1
  D. Correctifs (Lot P0 puis P1)
  E. SI iteration == max_cycles ET gate non atteint → HITL ; STOP
  F. Re-QA3 cible ou complet (meme iteration)
  G. SI fused_quality >= gate_score ET aucun P0 ET fused_coverage >= minimum_coverage
       → SORTIR boucle (succes iterationnel)
  Gbis. Stagnation — SI 2 loop_cycle consecutifs avec score_delta=0
       (logique canon : analyze_cycles.detect_stagnation)
       → append loop_cycle avec hitl:true si pas deja pose
       → HITL stagnation ; STOP (interdit iteration 3)

FIN TANT QUE

# Apres succes iterationnel (B ou G) — avant rapport final et run_finished
H. Cloture integrale (obligatoire si dettes non bloquantes ouvertes) — voir section dediee
I. (optionnel) micro re-QA3 cible si H a modifie la coherence documentaire
J. Gate pre-run_finished — 0 P1 ouverts ET 0 dette non bloquante (voir section Cloture integrale)
K. run_finished + --summary (loop_iterations obligatoire si loop_enabled)
L. verify_run_closure.py --run-id — gate livrable avant retour chat
```

**run_in_background** : planificateur toujours `false` ; **schedule R11** = exécution **shell synchrone bloquante** par le parent (`compute_worker_schedule.py`, pas un Task) ; workers selon `workflow.md` point 5 (par batch validé uniquement — `true` autorisé **intra-batch** parallèle, parent attend tous les retours).

---

## Telemetrie boucle

Apres chaque iteration (etape G, ou gate atteinte en B sans correctifs) : append `loop_cycle` via Shell (`workflow.md` § Telemetrie parent). Exemple payload : [`references/telemetry-examples.md`](references/telemetry-examples.md) § `loop_cycle`.

`qa_fusion` : une fois apres QA initial (`qa_pass_in_iteration: initial`), une fois apres re-QA (`re_qa`) si correctifs dans la meme iteration.

`run_finished` + `--summary` : une seule fois a la toute fin du run (pas par iteration).

### Checklist append (boucle)

Avant de clore l'iteration ou le run :

1. `run_id` a la **racine** uniquement (brief `telemetry.run_id`, jamais dans `payload`)
2. `agent_role` = `parent_qa3` pour parent / `loop_cycle` / `qa_fusion` / `run_finished`
3. Pas de `timestamp` dans le JSON fichier — le script l'ajoute a l'append
4. Si `loop_enabled: true` dans `run_finished` → `loop_iterations` **obligatoire** (derive depuis le nombre de `loop_cycle` si legacy)
5. Chaque `worker_complete` planifie → `technique_pass` non vide (`integrated` \| `none` \| nom technique ; **interdit** `unknown` ou absent)

### Stagnation (score_delta=0 x2)

Apres chaque append `loop_cycle` (etape G), evaluer la stagnation **avant** l'iteration suivante :

- **Regle** : 2 `loop_cycle` consecutifs avec `score_delta=0` → **stop boucle** + HITL (avant iteration 3).
- **Canon code** : `scripts/analyze_cycles.py` → `detect_stagnation(cycles)` (meme logique que monitoring post-hoc).
- **Telemetrie** : dernier `loop_cycle` avec `hitl: true` + rapport HITL stagnation (≤ 15 lignes).
- **Interdit** : lancer une 3e iteration si stagnation detectee.

Exemple cas 94→94→94 : stop apres le 2e `score_delta=0`, pas de 3e cycle.

**Enforcement runtime (`append_event.py`)** : avant append, le script refuse un `loop_cycle` supplementaire si 2 `score_delta=0` consecutifs existent deja pour le `run_id` (`error: runtime_enforcement`, code `stagnation_blocked`, exit 1) — override `--allow-stagnation`. Meme script refuse `run_finished` avec `gate_passed=true` si `final_p1 > 0` (`gate_p1_blocked`, override `--allow-gate-p1-open`). JSON sur stdout et stderr.

---

## HITL apres max_cycles

Stopper. **≤ 15 lignes** : score / gate / coverage / iterations ; blocage ; remede humain.

**Interdit** : iteration 4 auto, re-QA3 apres HITL iteration 3.

---

## Cloture integrale (dettes non bloquantes)

**Objectif** : livraison **integrale** — le rapport final ne doit **pas** se terminer par « il reste X P1/P2/Info non bloquants » sans passage par ce worker.

**Quand** : **obligatoire** apres succes iterationnel (etape B ou G) si la fusion ou le dernier rapport QA liste encore des dettes non bloquantes ouvertes.

**Dettes non bloquantes** (alias historique **L**) = findings encore **ouverts** en **P1**, **P2** (si nommes dans le rapport), ou **Info** — pas les P0 (deja traites en boucle). En fusion (`workflow.md` §6), **P2** compte comme **P1** pour gate et `open_findings` — pas de compteur télémétrie séparé Phase 1.

**Qui** : le **parent qa3** (pas le chat orchestrateur sauf s'il est deja parent).

```
SI dettes_non_bloquantes_ouvertes non vide :
  1. Construire debt_closure_list (id, severity, path, description, fix attendu) depuis la fusion
  2. Task worker cloture integrale (alias **`cloture`** = rôle **5. Clôture intégrale** — slugs dans [`references/model-routing.md`](references/model-routing.md) § Alias rôles ; readonly: false, run_in_background: false)
     - brief : references/worker-cloture-integrale.md
     - corriger uniquement les entrees listees
     - ne pas rouvrir P0 deja clos
  3. SI worker laisse des Reporte sans HITL → STOP ; ne pas presenter comme livraison integrale
  4. (optionnel) micro re-QA3 cible si edits doc sensibles
FIN SI
```

**Gate bloquante pre-`run_finished` (etape J)** :

| Condition | Action |
|-----------|--------|
| `final_p1 > 0` | **STOP** — ne pas append `run_finished` avec `outcome: gate_passed` ; relancer etape H ou HITL |
| Dettes non bloquantes ouvertes post-cloture | **STOP** — meme regle |
| `final_p0 > 0` | **STOP** — retour boucle ou HITL |
| Tout clos | Autoriser `run_finished` coherent (`gate_passed` ↔ `outcome`) |

Le validateur et `qa_stats` exposent le drapeau `gate_passed_with_open_p1` si incoherence.

**Anti-pattern** : livrer le rapport avec une section « risques residuels P1/P2 » sans avoir lance l'etape H · `loop_cycle` gate OK mais `run_finished` FAIL.

---

## Gate clôture avant retour chat (R4)

Avant **tout** retour utilisateur / `end_turn` (apres etape K `run_finished` + `--summary`) :

```bash
uv run scripts/verify_run_closure.py --run-id $RUN_ID
```

| Resultat | Action |
|----------|--------|
| **Exit 0** (`sequence_ok: true`) | Livraison autorisee |
| **Exit ≠ 0** | **Interdit** `end_turn` sans mention explicite `TELEMETRY_APPEND_FAILED` dans le rapport |

Meme gate que [`workflow.md`](workflow.md) etapes 7–8 — obligatoire en boucle, pas seulement en run simple.

---

## Retour chat — format cycles (R8)

Si le parent remonte au chat (wrapper [`orchestrateur-qa-95`](../orchestrateur-qa-95/SKILL.md) ou parent Task direct), inclure **une ligne par `loop_cycle` execute** :

`Cycle N : détecté {findings_count} findings → corrigé → +{score_delta} pts`

- `findings_count` et `score_delta` depuis le payload `loop_cycle` (remplir `findings_count` depuis `qa_fusion.findings_actionable` de l'itération courante si absent).
- Si stagnation R2 (2× `score_delta=0`) : indiquer `→ stagnation, HITL` sur la derniere ligne.

Detail brief : [`orchestrateur-qa-95/references/parent-brief-loop.md`](../orchestrateur-qa-95/references/parent-brief-loop.md) § Retour attendu.

---

## Fichiers lies

| Fichier | Role |
|---------|------|
| [`SKILL.md`](SKILL.md) | Trigger + routage |
| [`workflow.md`](workflow.md) | QA3 simple + fusion A3 |
| [`references/telemetry-examples.md`](references/telemetry-examples.md) | Exemple `loop_cycle` et autres `event_type` |
| [`references/qabrief-template.md`](references/qabrief-template.md) | Brief |
| [`references/rubrics/formulas.md`](references/rubrics/formulas.md) | Formules gate |
| [`../orchestrateur-qa-95/SKILL.md`](../orchestrateur-qa-95/SKILL.md) | Wrapper chat |
