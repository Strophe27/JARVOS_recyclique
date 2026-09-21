# QA3 Agent — workflow parent (detail)

**Public** : agent qui **exécute** le rôle **parent qa3** (chat discipliné, ou sous-agent Task « parent qa3 »). Le fichier [`SKILL.md`](SKILL.md) sert au **déclenchement** et au **routage** uniquement — **lire ce `workflow.md` en entier** avant d’invoquer planner / workers.

---

## Entrée chat — QA simple

Si tu es le **chat** (pas un Task parent qa3) et que l'utilisateur demande un QA3 **sans** boucle gate : suivre [`references/chat-delegation.md`](references/chat-delegation.md) — **1** Task parent, pas d'inline.

**Boucle gate 95+** depuis le chat : skill **`orchestrateur-qa-95`** (pas ce fichier).

## Discipline parent — **non négociable**

Réflexes interdits (table STOP) : [`references/parent-reflexes-interdits.md`](references/parent-reflexes-interdits.md).

Les modèles ont un réflexe : « ouvrir les fichiers pour comprendre ». **Ici ce réflexe casse le skill.** Tu dois te comporter comme un **routeur**, pas comme un **lecteur**.

## Modèle imposé

**SoT :** [`references/model-routing.md`](references/model-routing.md) — matrice **plateforme × rôle**.

Résumé :

| Rôle | Cursor | Codex | Claude |
|------|--------|-------|--------|
| Chat wrapper | `composer-2.5` | `gpt-5.6-luna-max` | `claude-sonnet-5-thinking-medium` |
| Parent qa3 | `composer-2.5` | `gpt-5.6-luna-max` | `claude-sonnet-5-thinking-medium` |
| **Planner** | `cursor-grok-4.6-xhigh` | `gpt-5.6-luna-max` | `claude-sonnet-5-thinking-medium` |
| Workers | `composer-2.5` | `gpt-5.6-luna-max` | `claude-sonnet-5-thinking-medium` |
| Clôture intégrale | `composer-2.5` | `gpt-5.6-luna-max` | `claude-sonnet-5-thinking-medium` |
| Worker `pipeline: light` | `composer-2.5-fast` | `gpt-5.6-luna-max` | Haiku (optionnel) |

Application pratique :

- **Planner un cran au-dessus** des workers (Grok 4.6 sur Cursor — pas le même modèle que les workers).
- Fixer `model:` **explicite** sur chaque Task — pas d'héritage du chat.
- Override utilisateur (ex. KExpress) : prime sur ce tableau.

**Avant le retour du premier worker (ou du planner puis workers), tu NE DOIS PAS :**

- utiliser **read_file**, grep, recherche sémantique, ni ouvrir dans l’IDE les chemins listés dans **`scope_paths`** (sources du projet, YAML du repo, markdown livrable, etc.) — **aucune** « lecture rapide » ou « coup d’œil » ;
- lire quoi que ce soit sous **`heavy_refs_root`** (`references/rubrics/`) : `layers/*`, `domains/*`, `modes/*`, `passes/*`, `formulas.md`, `schema.md`, `sortie-json.md` ;
- « préparer » le QA en ingérant le contenu du livrable : tout le contenu à auditer passe **uniquement** par les **Task** workers.

**Tu PEUX (léger, orchestration seule) :**

- t’appuyer sur ce **`workflow.md`** (et [`SKILL.md`](SKILL.md) pour le routage initial) ;
- ouvrir **une seule fois** [`references/qabrief-template.md`](references/qabrief-template.md) **du skill qa3-agent** si tu dois copier le gabarit (pas les fichiers du livrable) ;
- donner au **Task planificateur** le **chemin absolu** vers `{skill_root}/references/planner-prompt.md` pour qu’il **lise** ce fichier en premier ; **éviter** que le parent lise tout le planner pour le « résumer » : si tu dois absolument résumer (contrainte extrême de taille), **résumé structurel uniquement** (rôle planificateur, sortie = **un seul** YAML, `planner_done`, pas de prose hors bloc, pas de placeholders de chemins) — **pas** un copier-coller quasi intégral. Le parent **ne** sert **pas** le planner pour remplacer le worker.

**Après** les retours workers : tu **fusionnes** à partir des **textes** qu’ils renvoient. **Exception** minuscule — **anti-abus** : une seule lecture ciblée d’un fichier du `scope_paths` **uniquement si** (a) deux workers donnent des extraits **citables** **mutuellement exclusifs** sur un **fait vérifiable** à cette `[LOC]` (pas un simple désaccord de formulation, de sévérité ou d’interprétation) ; (b) la règle de fusion habituelle (sévérité max, deux avis en sous-points, phrase de synthèse) **ne suffit pas** à trancher le fait. **Interdit** d’invoquer cette exception pour gagner du temps ou pour refaire un QA « classique » côté parent. Dans le rapport : « lecture de vérification ponctuelle » **et** résumé des **deux** citations contradictoires.

Si tu enfreins cette section, tu n’exécutes **pas** qa3-agent : tu refais un QA « classique » et tu gaspilles l’objectif du skill.

---

## Rôle du parent (workflow + QABrief)

1. **Ne pas lire** sous `heavy_refs_root` (`{skill_root}/references/rubrics`) : `layers/*`, `domains/*`, `modes/*`, `passes/*`, `formulas.md`, `schema.md`, `sortie-json.md` — toute cette charge va dans les **Task**. Si tu as **deja** viole la regle, resume ce que tu as vu dans `conversation_brief` / sources pour limiter la contradiction avec les workers.
2. **Collecter** le livrable : chemins absolus, `object_under_review.sources`, intention utilisateur, criticite, fil de conversation — **sans** rouvrir les fichiers tant que les workers n'ont pas tourne. **Normaliser** les champs legacy selon `schema.md` (`type` → `kind`, `scope_paths` → `sources`, `conversation_brief` → `conversation_excerpt`, `types_mixtes` → `kinds_mixtes`) ; propager `requirements_exist` / `expected_outputs_exist` si presents (C12 traceability). **Inferer** les champs manquants selon `qabrief-template.md` § Inference ; ne questionner l'utilisateur que si sources **et** `conversation_brief` sont vides.
3. **Classifier** `kind` / criticite / mode / pipeline / `review_mode` (P2) — voir memo ci-dessous.
4. **Remplir** [`references/qabrief-template.md`](references/qabrief-template.md) (adapter `heavy_refs_root` et `skill_root` si chemins différents sur ta machine). Si **plusieurs** workers reçoivent la même racine : utiliser le même contenu YAML racine et, si tu actives le champ optionnel **`brief_version`** du gabarit, la **même** valeur pour tous — repère anti-dérive copier-coller.

### Quand tu es toi-même un sous-agent Task (parent qa3)

Même si l’utilisateur t’a lancé via **Task** pour incarner le parent, tu **restes** le parent léger :

- Tu **dois** utiliser l’outil **Task** pour (a) le **planificateur** lorsque le routage ci-dessous l’exige, (b) **chaque** worker de passe. **Interdit** de remplacer ces appels par `read_file`, grep ou une analyse directe sur `scope_paths` / sous `heavy_refs_root` dans **ton** contexte — tu ne « fais pas le worker toi-même » pour économiser des sous-agents.
- La chaîne **Chat → Task(parent qa3) → (Task planner *si* le routage du point 5 l’exige) → Task(workers)** est le flux **normal** quand l’orchestration QA3 est déléguée à un sous-agent ; ce n’est pas un contournement optionnel.
- **À ne pas confondre** : un *worker* qui relance **Task** pour sous-découper une passe reste **optionnel** et **non garanti** selon l’environnement (voir [`references/nested-task-smoke.md`](references/nested-task-smoke.md)). En revanche, le *parent qa3* qui lance **Task** pour planner et workers est **obligatoire** dès que ce skill s’applique et que le routage (point 5) le requiert.

5. **Router** (chemins prompts : `{skill_root}/references/planner-prompt.md` et `{skill_root}/references/worker-qa.md`) :
   - **Planner** (1 Task `generalPurpose` **readonly**) si **au moins un** critère :
     - livrable **mixte** (`kinds_mixtes` non vide, alias legacy `types_mixtes`, plusieurs extensions/types, ou intention multi-axes dans `user_intent`) ;
     - **très volumineux** (≥3 fichiers, dossier entier, ou volume estimé « long ») ;
     - **plusieurs axes orthogonaux** (`axes` explicites, ou périmètres sans recouvrement logique).
     → lire le planner, recevoir le YAML `passes`, exécuter **`compute_worker_schedule.py`** (R11 — voir [`references/r11-file-shard-schedule.md`](references/r11-file-shard-schedule.md)), puis **un Task worker par passe** **selon les batches validés** avec QABrief ajusté + « lis puis suis `{skill_root}/references/worker-qa.md` ».
   - **Mono-type** (un seul `kind`, 1–2 fichiers, périmètre homogène, pas d'axes orthogonaux) → **1** Task worker direct : « lis puis suis `{skill_root}/references/worker-qa.md` » + QABrief.
   - **low** + check rapide → 1 Task worker, `pipeline: light` (même critère mono-type).

   **Exécution Task (planificateur → schedule → workers)** :
   - **Modèles** : slugs explicites selon [`references/model-routing.md`](references/model-routing.md) — alias **`planner`** pour le planificateur, **`workers`** pour chaque passe, **`cloture`** pour clôture intégrale (jamais d'héritage du chat).
   - **Planificateur** : **série, bloquant** — `run_in_background: false` ; **interdit** de lancer un worker tant que le YAML `passes` n’est pas reçu et parsé ; **un seul** planner actif à la fois.
   - **Schedule R11** (si planner et `pass_count >= 2`) : **série, bloquant** — depuis `{skill_root}` :

```bash
uv run scripts/compute_worker_schedule.py --passes chemin/planner.yaml
```

     - **Exit 0 obligatoire** avant tout worker ; append `schedule_complete` (télémétrie) avec le JSON stdout.
     - **Interdit** de lancer des workers en parallèle **sans** schedule validé ou en dehors des `batches` retournés.
     - Parallèle **uniquement** intra-batch quand `parallel_in_batch[i] == true` (passes `shard` à `scope_paths` disjoints).
     - Passes `cross_cutting` : **série** (une passe à la fois), après les batches shard.
   - **Workers** : **après** planner + schedule (ou directement si pas de planner / mono worker) — `run_in_background: true` **autorisé** **uniquement** entre workers **du même batch parallèle** si le parent **attend** tous les retours du batch avant le batch suivant. **Interdit** de lancer workers en parallèle **avec** le planner ou le schedule (pas de chevauchement planner ↔ schedule ↔ workers).

### Phrase explicite anti-dilution (chaque message Task)

Une pile **YAML + chemins vers `worker-qa.md` / `planner-prompt.md`** peut faire **oublier** qu’il faut **spawner** d’autres sous-agents via l’outil **Task**. Le parent **doit** préfixer **chaque** message envoyé à un sous-agent Task par **une à deux phrases en clair** qui **nomment explicitement** **Task** (ou « sous-agent » / « spawn ») et le **rôle** — **avant** le bloc « Lis puis suis … » et le YAML :

- **Task planificateur** : ex. « **Rôle planificateur** : tu ne fais **pas** le QA fichier par fichier ; tu produis **uniquement** le YAML `passes`. **C’est le parent** qui invoquera ensuite **Task** (un sous-agent par passe). Ne remplace pas ces workers. »
- **Task worker** : **deux signaux obligatoires dans la phrase** (même si une seule passe suffit et que tu n’as **pas** besoin de spawner tout de suite) : (1) **lecture locale** — tu charges `scope_paths` et les grilles sous `heavy_refs_root` dans **ton** contexte ; (2) **multi-agents** — tu **peux** à tout moment **invoquer Task** pour **spawner** des sous-agents et sous-découper la passe (§8 de `worker-qa.md`) si le volume ou la complexité l’exige. **Ne pas** réserver le mot **Task** / **spawn** à un cas « si trop lourd » dans une demi-phrase : le modèle doit voir **spawn** dès l’en-tête, pas seulement « charge les fichiers » — sinon l’anti-dilution ne porte que sur le YAML et pas sur la **chaîne d’agents**.
- **Task qui incarne le parent qa3** (orchestration déléguée depuis le chat) : ex. « **Obligation parent** : invoquer **Task** pour le planner (*si* le routage point 5) puis **un Task par passe worker** — ne pas absorber le QA dans ce seul contexte. »

**Piège** : un `user_intent` ou un `pass_id` qui parle d’« anti-dilution » **thématique** (doc, YAML, checklist) **ne remplace pas** cette phrase **opérationnelle** sur **Task / spawn** — sans quoi le worker reçoit le thème « anti-dilution » partout **sauf** sur l’outillage multi-agents.

Ces phrases **complètent** le gabarit ; elles ne le remplacent pas.

**Si tu utilises le planner** (sinon, passe cette section) : le YAML `passes` ne contient **pas** à lui seul un QABrief exploitable. Pour **chaque** entrée de `passes`, le parent envoie au worker :

- le **QABrief racine complet** (tous les champs du gabarit : `skill_root`, `heavy_refs_root`, `criticality`, `pipeline`, `output`, `markdown_only`, `readonly`, `user_intent`, `conversation_brief`, `axes`, etc.) ;
- en **surcharge** pour cette passe : `kind`, `mode`, `scope_paths`, et l’`objective` de la passe (bloc `--- Passe courante ---` séparé — **ne pas** concaténer à `user_intent`). Le champ YAML `passes[i].id` correspond au **`pass_id`** transmis au worker (même identifiant, deux libellés possibles selon le contexte).

**Héritage** : pour un worker, les champs `kind`, `mode`, `scope_paths` viennent de la **passe** ; tout le reste est **hérité du brief racine** sauf **overrides** listés sous un titre **exact** en fin de message : `Overrides explicites :` (une ligne de titre, puis la liste des champs modifiés). Legacy : si la passe n’émet que `type`, le parent normalise en `kind` selon `schema.md`.

**Parse du YAML planner** : si la sortie du planner contient du texte hors YAML, extraire le **premier bloc YAML** valide ; vérifier la présence d’une clé **`passes`** non vide — sinon relancer **un** Task planificateur (« sortie YAML seule, clé passes obligatoire ») ou réparer manuellement ; en cas d’échec de parse, même remède. L’extraction du premier bloc **ne dispense pas** de **relancer** le planificateur si ses sorties sont **systématiquement** entachées de prose hors YAML (ne pas normaliser l’échec comme routine).

6. **Fusionner** les retours workers selon `formulas.md` (A3) : dedoublonner par `[LOC]`, unifier severites, produire **un** rapport utilisateur.

**Mapping severites** : *Critiques* worker → **P0** ; *Warnings* → **P1** ; *Info* → note informative. **P2** (si nommé dans un rapport ou la clôture intégrale) → traiter comme **P1** en fusion et compteurs gate (`open_findings`) — pas de tier séparé en télémétrie Phase 1.

**Scores fusionnes (0-100 entiers)** :
- `fused_quality` = moyenne ponderee `quality_score` avec `worker_weight = pass_weight × coverage_score × criticality_weight`
- `fused_coverage` = union globale sources/axes ; fallback moyenne ponderee
- `fused_audit_confidence` = moyenne ponderee ; cap 75 si worker obligatoire < 60
- Reporter : `lowest_worker_quality`, `lowest_worker_coverage`, `lowest_worker_audit_confidence`

**Caps parent** : P0 ouvert → min(69) ; P1 materiel → min(94) ; passe obligatoire echouee/illisible → min(89).

**Gate (A4)** : `quality_score >= gate_score` (defaut 95) **et** `no_open_P0` **et** `coverage_score >= minimum_coverage` (defaut 80). Si `audit_confidence < 60` : afficher « Gate atteint sous confiance faible : audit a revalider humainement ou par passe dediee. » (n'bloque pas Phase 1).

Option P2 : `minimum_audit_confidence: 70` si present dans le brief.

**Politique de sortie finale** : celle du brief racine pour JSON vs Markdown. Si passe echouee ou **Limites de la passe**, le resume doit le mentionner. Recommandations contradictoires : severite max + phrase de synthese ; conserver angle adversarial en sous-point si pertinent.

**Apres fusion (etape 6)** : append `qa_fusion` via Shell — voir § Telemetrie parent ci-dessous.

7. **Imbrication Task (deux cas distincts)** :
   - **parent qa3** (chat principal **ou** sous-agent Task qui incarne ce skill) : invoquer **Task** pour le planificateur si le routage l’impose, exécuter **schedule R11** si `pass_count >= 2`, puis **un Task worker par passe** **selon les batches validés** — **requis** ; ne pas absorber planner + schedule + workers dans un seul contexte. Le planificateur reste **bloquant** (voir point 5, § exécution Task) : pas de workers tant que `passes` n’est pas prêt **ni** schedule validé.
   - **Worker** : *peut* tenter **Task** pour sous-découper une passe lourde — **observé** sur au moins un environnement Cursor ([`references/nested-task-smoke.md`](references/nested-task-smoke.md)), **non garanti** sur toutes les versions / modes Agent ; traiter comme **avancé / expérimental**. **R11** : **interdit** nested Task parallèle sur passes `shard` ; flux **recommandé** : planner (série) → schedule R11 → workers par batch validé.

## Telemetrie parent (obligatoire)

Lire [`references/telemetry.md`](references/telemetry.md), [`references/telemetry-examples.md`](references/telemetry-examples.md) et [`references/script-standards.md`](references/script-standards.md). **Append via Shell** avec `uv run scripts/append_event.py` (fallback `python`). Lire le JSON stdout (`ok: true`).

**`run_id`** : généré **une fois** par le parent si vide dans le brief (`YYYYMMDD_HHMMSS_<project_slug>`), puis propagé **identique** dans le bloc `telemetry` du QABrief envoyé à planner et workers — **interdit** de régénérer localement côté sous-agent.

**Assert planner** : si `routing_decision.routing` ∈ `{planner, planner_multi_pass}` → `planner_complete` **obligatoire** avant le premier `worker_complete`.

**Assert schedule R11** : si routage `planner*` **et** `pass_count >= 2` (depuis `planner_complete`) → `compute_worker_schedule.py` exit 0 **et** `schedule_complete` **obligatoire** avant le premier `worker_complete`.

| Moment | `event_type` |
|--------|----------------|
| `run_id` genere (si vide dans brief) | `run_context` |
| Apres classification + routage, **avant** Task planner/workers | `routing_decision` |
| Apres YAML planner valide (planner) | `planner_complete` |
| Apres `compute_worker_schedule.py` exit 0 (`pass_count >= 2`, routage planner*) | `schedule_complete` |
| Fin de chaque passe worker | `worker_complete` |
| Apres chaque fusion workers | `qa_fusion` |
| Boucle gate — fin de chaque iteration (voir [`workflow-loop.md`](workflow-loop.md)) | `loop_cycle` |
| Fin du run (toujours) | `run_finished` + `--summary` |

Detail payloads (`qa_pass_in_iteration`, `loop_iteration`, `pass_added_value`, etc.) : [`references/telemetry.md`](references/telemetry.md) et [`references/telemetry-examples.md`](references/telemetry-examples.md).

**Bootstrap** : inclure bloc `telemetry` du gabarit dans chaque brief Task ; résoudre `events_path` en chemin absolu via `uv run scripts/skill_paths.py` (install `~/.cursor/skills/qa3-agent/telemetry/events.jsonl`).

**Avant Task enfants** : `routing_decision` avec `routing_rationale` obligatoire.

**Fin de run** : `run_finished` avec `total_workers` cumule sur toutes les fusions du run.

Echec append : 1 tentative, `TELEMETRY_APPEND_FAILED`, le rapport QA prime.

### Checklist télémétrie clôture parent

**`agent_role`** : `parent_qa3` pour tous les events parent (`run_context`, `routing_decision`, `schedule_complete`, `qa_fusion`, `loop_cycle`, `run_finished`) ; `planner` pour `planner_complete` ; `worker` pour `worker_complete`. **Interdit** : legacy `"parent"` (rejet `append_event.py`).

Avant de livrer le rapport utilisateur, vérifier la séquence (exemples : [`telemetry-examples.md`](references/telemetry-examples.md)) :

1. `run_context` — si `run_id` généré
2. `routing_decision` — avant tout Task planner/worker
3. `planner_complete` — **obligatoire** si routage `planner` ou `planner_multi_pass`
4. `schedule_complete` — **obligatoire** si routage `planner*` et `pass_count >= 2` (R11)
5. `worker_complete` — une ligne par passe worker
6. `qa_fusion` — après chaque fusion
7. `loop_cycle` — si boucle gate (voir [`workflow-loop.md`](workflow-loop.md))
8. **`run_finished` + `--summary`** — append tenté
9. **Vérification clôture** — depuis `{skill_root}` :

```bash
uv run scripts/verify_run_closure.py --run-id $RUN_ID
```

**Gate livrable** : étape 9 avec **exit 0** (`sequence_ok: true` dans le JSON) **ou** mention explicite `TELEMETRY_APPEND_FAILED` dans le rapport.

**Enforcement code** : `append_event.py` refuse un `worker_complete` sans `planner_complete` préalable si routage `planner*` ; refuse `worker_complete` sans `schedule_complete` si `pass_count >= 2` (R11) ; refuse un `run_finished` si la séquence du run est incomplète dans le journal.

**Interdit** : livrer le rapport QA sans étape 8 (`run_finished`) tentée ni étape 9 (`verify_run_closure`) — ou `TELEMETRY_APPEND_FAILED` documenté.

Fichiers JSON temporaires : `telemetry/.tmp/` (gitignoré), supprimer après append réussi.

## Memo classification

**Kind canonique (B6)** — le planner emet **uniquement `kind`** ; convertir `type` legacy cote parent :

| kind | Signaux | Fichier domain |
|------|---------|----------------|
| `code` | sources, scripts, diffs, PR | code.md |
| `document` | README, guides, SKILL.md | document.md |
| `prd` | stories, specs, briefs | prd.md |
| `system` | ADR, schemas, pipelines | system.md |
| `idea` | idees / plans non figes | idea.md |
| `text` | prose longue, articles | text.md |
| `prompt_skill` | skills, prompts agent | prompt_skill.md |
| `process` | SOP, runbooks | process.md |
| `research` | etudes, analyses | research.md |
| `decision` | ADR decision, choix | decision.md |
| `dataset` | jeux de donnees | dataset.md |
| `llm_ai` | pipelines LLM, RAG | llm_ai.md |
| *hybride* | hors taxonomie → **`custom_grid`** |

Legacy : `doc`→`document`, `arch`→`system`, `concept`→`idea`.

**Criticité → pipeline**

| Criticité | Critères (rappel) | Pipeline |
|-----------|-------------------|----------|
| `low` | rapide, check, brouillon | Light |
| `medium` | défaut si non précisé | Standard |
| `high` | prod, client, sécu, données, paiement | Full |

**Mode**

| Mode | Quand |
|------|--------|
| `validation` | défaut |
| `adversarial` | `high`, ou **demande explicite** de stress test (même si criticité non `high`) |
| `exploratory` | idea / system amont ; si boucle gate → `exploratory_blocks_gate: true` |

## review_mode (P2)

`mode` reste : `validation | adversarial | exploratory`. **`review_mode`** ne surcharge pas `mode`.

| review_mode | Entree / sortie |
|-------------|-----------------|
| `standard` | defaut — audit simple |
| `comparative` | `comparison_sources` baseline/candidate + `comparison_criteria` → tableau differences, regressions, gagnant par critere, recommandation |
| `synthesis` | `qa_reports_to_synthesize` → findings dedupliques, conflits entre QA, severite finale, reco consolidees |
| `decision_review` | `decision_statement`, `options_considered`, `constraints`, `success_criteria`, `reversibility` → hypothèses, trade-offs, conditions d'invalidation, reco confirmer/modifier/reporter |

Pas de fichiers mode dedies — logique dans ce workflow + planner + worker selon `review_mode`.

## Fichiers de ce skill

| Fichier | Usage |
|---------|--------|
| [`workflow.md`](workflow.md) | **Ce fichier** — orchestration parent (détail) |
| [`workflow-loop.md`](workflow-loop.md) | Boucle QA3 → correctifs → re-QA3 (gate, max 3, HITL) |
| [`SKILL.md`](SKILL.md) | Déclenchement + routage (léger) |
| `references/qabrief-template.md` | Contrat à coller dans les briefs Task |
| `references/worker-qa.md` | **Première** lecture du worker |
| `references/planner-prompt.md` | **Première** lecture du Task planificateur |
| [`references/chat-delegation.md`](references/chat-delegation.md) | Chat → spawn parent (QA simple) |
| [`references/telemetry.md`](references/telemetry.md) | Parent, planner, worker — append Shell fin de role |
| [`references/telemetry-examples.md`](references/telemetry-examples.md) | 8 exemples JSON canoniques par `event_type` |
| `scripts/compute_worker_schedule.py` | Parent — ordonnancement batches R11 (fail-closed) |
| [`references/r11-file-shard-schedule.md`](references/r11-file-shard-schedule.md) | Spec partition fichiers / schedule |
| `scripts/verify_run_closure.py` | Gate clôture run avant livraison rapport |
| [`references/script-standards.md`](references/script-standards.md) | Standards `uv run` + JSON stdout (BMAD) |
| `references/alignment-create-skill.md` | Alignement create-skill |
| `references/rubrics/` | Grilles workers |
| `references/nested-task-smoke.md` | Smoke Task imbriqué |

**`heavy_refs_root`** = `{skill_root}/references/rubrics` — **workers uniquement**.

## Anti-patterns parent

- **Pré-lire** le livrable (`scope_paths`) ou les grilles sous `references/rubrics/` « pour aller plus vite » — c’est l’erreur la plus fréquente.
- Être invoqué comme **Task parent qa3** et **absorber** le rôle planificateur ou des workers au lieu de **chaîner des Task** (point 5).
- Ouvrir `references/rubrics/domains/*.md`, `layers/*.md`, `modes/*.md` ou `passes/*.md` soi-meme avant les workers.
- Lancer le **planificateur** en **background** ou lancer des **workers** avant d’avoir un YAML `passes` valide — le planner est un **jalon bloquant** (point 5).
- Lancer des **workers** en parallèle **sans** `compute_worker_schedule.py` exit 0 quand `pass_count >= 2` (R11).
- Ignorer les `batches` du schedule et lancer « un Task par passe » en parallèle naïf.
- Lancer un worker avec **seul** le fragment YAML d’une passe planner **sans** le brief racine complet (`heavy_refs_root`, `readonly`, `markdown_only`, etc.).
- Envoyer un message Task **sans** phrase explicite **Task / spawn / rôle** en tête — risque que l’instruction soit diluée par le YAML et les chemins (voir § « Phrase explicite anti-dilution »).
- Lancer un worker sans chemins **absolus** exploitables dans `scope_paths` (ou sans `conversation_brief` quand il n’y a aucun fichier).
- Rédiger le rapport final en **ignorant** les sorties workers et en s’appuyant sur ta propre relecture préalable du code — le rapport doit refléter la **synthèse des workers** (sauf la micro-exception « lecture de vérification » ci-dessus).
- Invoquer l’exception « **lecture de vérification ponctuelle** » sans **deux citations worker** mutuellement exclusives sur un **fait** à la `[LOC]`, ou pour un simple désaccord de ton — **interdit** (contournement du rôle routeur).
