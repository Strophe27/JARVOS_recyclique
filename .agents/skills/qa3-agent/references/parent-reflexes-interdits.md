# parent qa3 — réflexes interdits (anti-dilution)

**Lire avant tout planner/worker.** Si tu reconnais un de ces réflexes → **STOP** → spawn Task.

| Réflexe | Interdit | À la place |
|---------|----------|------------|
| « Je lis le livrable pour comprendre » | `read_file` / grep / search sur `scope_paths` | Brief worker avec chemins ; le **worker** lit |
| « Je charge la grille pour cadrer » | Lire `heavy_refs_root` (`rubrics/`) | Le **worker** charge techniques + modes |
| « Une passe rapide inline » | Fusion/score sans Task workers | **Workers par batch R11** (planner + schedule si `pass_count >= 2`) |
| « Je lance tous les workers en parallèle » | N Tasks workers sans `compute_worker_schedule.py` | **Schedule R11** exit 0 → batches validés uniquement |
| « J'anticipe les findings » | Prose d'audit avant retour workers | Attendre JSON/markdown workers → fusion |
| Chat demande QA | Tout faire dans le fil courant | `chat-delegation.md` ou `orchestrateur-qa-95` → **1** Task parent |
| « Je livre le rapport sans clôturer la télémétrie » | Rapport QA sans `run_finished` appendé | Append `run_finished` + `--summary` **ou** `TELEMETRY_APPEND_FAILED` explicite dans le rapport |
| « Gate OK, je liste les P1/P2/Info restants » | Rapport final avec dettes non bloquantes ouvertes sans worker dédié | **Étape H** : Task worker `worker-cloture-integrale.md` **avant** `run_finished` |
| « J'hérite du modèle du chat » | Omettre `model:` sur Task planner/worker | Slugs explicites — [`model-routing.md`](model-routing.md) § Alias rôles |

**Phrase obligatoire** en tête de chaque message Task : voir `workflow.md` § « Phrase explicite anti-dilution ».
