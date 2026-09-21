# Smoke test : Task dans Task

`last_verified: 2026-05-21` (re-QA3 refactor qa3-agent ; smoke nested Task non re-exécuté — disclaimers inchangés)

**Ne pas extrapoler** : ce fichier décrit **une** session et **un** résultat observé. **Ne pas** en déduire que Task imbriqué fonctionne partout, ni qu’il remplace le flux recommandé **parent qa3 → workers** ; le skill traite l’imbrication worker → Task comme **expérimentale** (voir `workflow.md` § imbrication).

## Portée

Constat **ponctuel** sur un environnement Cursor (session 2026-04-01, machine utilisateur Strophe). **Non garanti** sur toutes les versions / tous les modes Agent ; à revérifier après mise à jour majeure de Cursor.

## Résultat observé

```
nested_task_available: yes
nested_result: NESTED_OK
```

Un sous-agent `generalPurpose` (paramètre `readonly: true`) a invoqué l’outil **Task** et a reçu la réponse d’un second sous-agent `explore` (readonly) dont le brief imposait une sortie unique `NESTED_OK`.

## Repro minimale (à retenter si besoin)

1. Agent **parent** : lancer **Task** avec `subagent_type: generalPurpose`, `readonly: true`.
2. Brief enfant : « Invoque Task une fois : sous-agent `explore`, readonly, brief = répondre exactement `NESTED_OK` une ligne. Puis rapporte nested_task_available (yes/no) et nested_result. »
3. Vérifier la sortie structurée de l’enfant.

## Usage pour qa3-agent

Informationnel : le flux **recommandé** reste planner (série, `run_in_background: false`) → **schedule R11** (`compute_worker_schedule.py`) → **parent** qui lance les workers **par batch validé**. Task imbriqué = option avancée (coût, profondeur) — **interdit** spawn parallèle nested sur passes `shard` (R11).

**Gouvernance** : revérifier ce smoke après changement majeur Cursor (Task imbriqué) ; noter `last_verified: YYYY-MM-DD` en tête de fichier lors d’une nouvelle session de test.
