# R11 — partition fichiers et ordonnancement workers (file shard schedule)

**Public** : parent qa3, planner, orchestrateur QA95.

**Objectif** : réduire les collisions LSP Pylance (`Received redundant open text document command`) quand plusieurs workers ouvrent les mêmes `scope_paths` en parallèle — sans sérialiser toute la chaîne QA.

---

## Modèle en 2 phases

| Phase | `execution_tier` | Parallèle ? | Règle fichiers |
|-------|------------------|-------------|----------------|
| **1 — shard** | `shard` | Oui (intra-batch) | **Aucun chemin en commun** entre workers du même batch |
| **2 — cross_cutting** | `cross_cutting` | Non (série) | Peut croiser plusieurs fichiers (contradiction, traceability, …) |

---

## Champs planner (YAML `passes[]`)

| Champ | Valeurs | Règle |
|-------|---------|-------|
| `execution_tier` | `shard` \| `cross_cutting` | Obligatoire sur chaque passe multi-worker |
| `technique_pass` | nom technique | Si ∈ liste fermée ci-dessous → **force** `cross_cutting` |
| `scope_paths` | chemins absolus | `shard` : un dossier ou fichier homogène ; pas de chemin partagé avec une autre passe `shard` |
| `cross_cutting_order` | int optionnel | Surcharge l'ordre série (défaut via `technique_pass`) |

**Liste fermée `technique_pass` → cross_cutting auto** : `contradiction`, `traceability`, `fmea`, `premortem`, `assumption-audit`, `abuse-misuse`.

**Ordre série défaut (cross_cutting)** : contradiction → traceability → fmea → premortem → assumption-audit → abuse-misuse.

---

## Script obligatoire (fail-closed)

Après `planner_complete`, **avant tout worker** :

```bash
uv run scripts/compute_worker_schedule.py --passes chemin/planner.yaml
```

- **Exit 0** : exécuter les `batches` retournés dans l'ordre ; parallèle **uniquement** si `parallel_in_batch[i] == true`.
- **Exit ≠ 0** : relancer **un** planner (« corrige overlaps shard / execution_tier ») ou HITL.
- **Override debug** : `--allow-overlap` **uniquement** si `QA3_SCHEDULE_ALLOW_OVERLAP=1` — interdit en gate 95+ sans HITL documenté.

Normalisation chemins : `resolve()` + `normcase` (Windows/Syncthing) ; chevauchement dossier ⊃ fichier détecté.

---

## Caps (R9 / R11)

| Cap | Défaut | Qui alerte |
|-----|--------|------------|
| `pass_count` (R9) | 6 | planner + parent si > 6 |
| `max_concurrent_workers` (R11) | 6 | script `--max-concurrent` |
| `max_shard_passes` (R11) | 4 | script `--max-shard-passes` |

---

## Télémétrie

Append `schedule_complete` (`agent_role: parent_qa3`) entre `planner_complete` et le premier `worker_complete` **si** `pass_count >= 2` et routage `planner*`.

Payload minimal : `batches`, `parallel_in_batch`, `overlaps_blocked`, `max_concurrent_workers`, `pass_count`, `shard_count`, `cross_cutting_count`, `rationale`.

---

## Nested Task (P1)

Task imbriqué worker → sous-worker : **interdit** sur passes `shard` tant que le batch n'est pas terminé. Les passes `cross_cutting` ne doivent pas spawner de sous-agents parallèles sur `scope_paths` déjà ouverts.

---

## Prérequis opérateur (non bloquants)

- Workspace sur **Syncthing** : facteur aggravant LSP — attendu, pas échec QA.
- Message Pylance **redundant open** : cosmétique IDE ; workaround : Restart Language Server / Reload Window.
