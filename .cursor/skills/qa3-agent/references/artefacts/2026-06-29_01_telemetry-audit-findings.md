# Audit télémétrie QA3 — findings pour codeurs & concepteurs

**Date** : 2026-06-29  
**Périmètre** : instrumentation télémétrie (`events.jsonl`, `runs_summary.csv`, `append_event.py`, `qa_stats.py`, spec `telemetry.md`) — **pas** le moteur QA ni les grilles d'audit.  
**Sources lues** : `~/.cursor/skills/qa3-agent/telemetry/` (19 lignes au moment de l'audit), dépôt `Skills/qa/qa3-agent/`, spec et scripts.  
**Méthode** : lecture externe des logs + comparaison au schéma documenté + vérifs `qa_stats.py`.

---

## Synthèse exécutive

La télémétrie est **bien conçue sur le papier** (7 `event_type`, chaîne `parent_event_id`, CSV de synthèse, drapeaux d'orchestration). En pratique, le journal montre :

- **Peu de runs complets** (1 seul run réel terminé de bout en bout : `20260629_onboarding_bmad-bootstrap`).
- **Des QA opérationnels confirmés par l'opérateur sans trace pendant des heures**, puis des appends **partiels et non conformes** (5 lignes ajoutées récemment, runs incomplets).
- **`append_event.py` n'a aucune validation de schéma** : tout JSON passe, ce qui pollue les stats (`run_id: unknown`).

**Priorité équipe** : fiabiliser l'instrumentation avant d'utiliser les stats pour optimiser le QA.

| Sévérité | Count |
|----------|-------|
| P0 | 6 |
| P1 | 12 |
| P2 | 10 |

---

## P0 — Bloquants (signal inutilisable ou corrompu)

### TEL-P0-01 — L'append télémétrie n'est pas exécuté de façon fiable en prod

**Constat** : plusieurs QA lancés par des workers n'ont produit **aucune ligne** dans `events.jsonl` pendant plusieurs heures (vérifs répétées : 14 lignes stables, mtime figé ~06:25). Des appends sont apparus ensuite (lignes 15–19) mais **sans `run_finished`**, donc invisibles dans le CSV.

**Impact** : les stats et le retour d'expérience produit sont **non représentatifs** ; on ne peut pas mesurer l'usage réel ni la qualité des décisions d'orchestration.

**Recommandation concepteurs** :
- Rendre l'append **non optionnel** dans le workflow (checklist de clôture parent/planner/worker).
- Envisager un **gate de fin de run** : pas de rapport QA livré sans `run_finished` appendé (ou mention explicite `TELEMETRY_APPEND_FAILED`).
- Traquer le taux d'échec append dans un futur KPI.

**Evidence** : comparaison opérateur « +3 QA » vs journal inchangé ; lignes 15–19 sans clôture.

---

### TEL-P0-02 — `append_event.py` accepte tout JSON sans validation

**Constat** : `normalize_event()` ne fait qu'ajouter `timestamp` et `schema_version`. Aucun contrôle sur `run_id`, `event_id`, `event_type`, champs payload obligatoires.

**Impact** : données invalides en production ; `qa_stats.py` agrège du bruit ; confiance nulle dans les métriques.

**Recommandation codeurs** :
- Ajouter un validateur par `event_type` (JSON Schema ou dict de champs requis).
- Refuser l'append avec `{"ok": false, "error": "schema_violation", ...}` et code ≠ 0.
- Tests unitaires : rejeter les payloads des lignes 17–18 ci-dessous.

**Evidence** : `scripts/append_event.py` L116–121.

---

### TEL-P0-03 — `run_id` placé dans le `payload` au lieu de l'enveloppe

**Constat** : lignes 17–18 du journal :

```json
{"event_type":"run_context","agent_role":"parent",...,"payload":{"run_id":"20260629_064702_bmad-cockpit-bootstrap",...}}
```

Pas de `run_id` au niveau racine. `qa_stats.py` classe ces événements sous **`unknown`** (8 runs dont 1 bucket orphelin).

**Impact** : impossible de corréler les événements d'un run ; chaîne causale et agrégats cassés.

**Recommandation** :
- Validation stricte : `run_id` **obligatoire à la racine**, interdit dans `payload`.
- Mettre à jour prompts parent/worker/planner avec **exemple JSON complet** (enveloppe d'abord).

**Evidence** : `events.jsonl` L17–18 ; `qa_stats` → `"unknown": []`.

---

### TEL-P0-04 — Deux `run_id` différents pour un même QA logique

**Constat** : run partiel récent mélange :
- `20260629_qa_bmad-cockpit-bootstrap` (L15–16, L19 — enveloppe correcte)
- `20260629_064702_bmad-cockpit-bootstrap` (L17–18 — dans le payload seulement)

Même projet, même fenêtre temporelle, même intention (`boucle qa3 gate 95+`).

**Impact** : un run éclaté en deux identifiants ; stats et CSV futurs incohérents.

**Recommandation concepteurs** :
- Rappeler la règle : **`run_id` généré une fois** par le parent, propagé tel quel dans le QABrief à planner et workers.
- Interdire la régénération locale de `run_id` par un sous-agent.

**Evidence** : L15–19.

---

### TEL-P0-05 — `agent_role` hors spec (`parent` au lieu de `parent_qa3`)

**Constat** : L17–18 utilisent `"agent_role":"parent"`. La spec exige `parent_qa3` pour le parent, `planner` pour le planner, `worker` pour les workers.

**Impact** : filtres et dashboards par rôle faussés ; ambiguïté avec d'autres skills « parent ».

**Recommandation** : enum strict dans le validateur ; corriger les prompts `workflow.md`, `worker-qa.md`, `planner-prompt.md`.

**Evidence** : `telemetry.md` tableau enveloppe ; L17–18.

---

### TEL-P0-06 — Champs payload inventés / types incorrects (hors schéma)

**Constat** sur L18 (`routing_decision`) :
- `"kind":"hybride"` — non documenté (spec : `kinds` string[]).
- `"kinds_mixtes":["document","code",...]` — spec : **bool**, pas un array.
- `"planner_required":true` — champ absent de la spec.
- Manque : `routing`, `source_count`, `kinds` (array), `loop_iteration`.

**Constat** sur L17 (`run_context`) :
- Manque : `kinds`, `loop_enabled`, `loop_iteration` (obligatoires spec).
- Ajout non spec : `scope_summary`.

**Impact** : `routing_gate_rates`, drapeaux `planner_overkill` / `light_underkill` et exports CSV **silencieusement faux**.

**Recommandation** : validateur strict + exemples canoniques par `event_type` dans chaque prompt de rôle.

**Evidence** : L17–18 vs `telemetry.md` § run_context / routing_decision.

---

## P1 — Importants (dette data / trous de chaîne)

### TEL-P1-01 — Runs orphelins sans `run_finished`

**Constat** : 4 `run_id` n'ont qu'un événement isolé (`uv_smoke`, `test_run`, `partial_fail`) ou une séquence sans clôture (`20260629_qa_bmad-cockpit-bootstrap` : contexte + routing + planner, pas de workers/fusion/fin).

**Impact** : CSV sous-représente l'activité ; `qa_stats` compte des runs « fantômes ».

**Recommandation** : job de réconciliation JSONL ↔ CSV ; alerte run ouvert > N heures.

---

### TEL-P1-02 — `planner_complete` absent sur le run onboarding complet

**Constat** : `20260629_onboarding_bmad-bootstrap` a `routing: planner_multi_pass` mais **aucun** `planner_complete` entre routing et workers (L7 → L8).

**Impact** : impossible de mesurer `parse_retries`, `pass_count` planifié vs réel, ROI planner.

**Recommandation** : assert workflow — si `routing` ∈ `{planner, planner_multi_pass}` → `planner_complete` obligatoire avant premier `worker_complete`.

---

### TEL-P1-03 — `worker_complete` avec payload vide ou minimal

**Constat** :
- `partial_fail` : `payload: {}`
- `uv_smoke` / `test_run` : seulement `pass_id`
- Champs obligatoires spec absents : `quality_score`, `coverage_score`, `audit_confidence`, `open_findings`, `pass_added_value`, `findings_actionable`

**Impact** : drapeaux `pass_added_value`, `technique_pass_roi`, fusion — non calculables sur ces lignes.

**Recommandation** : tests de non-régression append ; séparer données test (`run_id` préfixe `test_`) du journal prod.

---

### TEL-P1-04 — `run_finished` sans enveloppe complète (`csv_test`)

**Constat** : L4 — pas de `agent_role`, `skill`, `qa_variant`, `project`, `model` ; CSV en déduit des colonnes vides (`project`, `qa_variant`).

**Impact** : exports Excel trompeurs ; segmentation par projet impossible.

**Recommandation** : validateur exige l'enveloppe complète sur `run_finished` ; `summary_row()` ne doit pas compenser silencieusement.

---

### TEL-P1-05 — Données smoke/test mélangées au journal opérationnel

**Constat** : même `events.jsonl` contient `smoke_run_finished_001`, `csv_test`, `uv_smoke`, runs réels onboarding et bmad-cockpit.

**Impact** : agrégats globaux faussés ; difficile de filtrer sans convention.

**Recommandation** : préfixe `run_id` (`test_`, `smoke_`) + filtre par défaut dans `qa_stats.py --json` ; ou fichier `events.test.jsonl` séparé.

---

### TEL-P1-06 — Timestamps artificiels / non monotones

**Constat** :
- L15–16 : `2026-06-29T12:00:00Z` / `12:00:01Z` (arrondis)
- L17–19 : `04:47:18Z`–`04:47:57Z` (plus crédibles)
- Run onboarding : workers espacés de 1 min pile (12:05, 12:06, 12:07)

**Impact** : métriques de durée (run, worker, boucle) **non fiables**.

**Recommandation** : laisser `append_event.py` seul poser le timestamp (déjà le fallback si absent — ne pas le surcharger manuellement dans les JSON temp).

---

### TEL-P1-07 — `orchestration_flags` vides sur `run_finished` alors que calculables

**Constat** : L1 `20260629_smoke_skills` a `"orchestration_flags":[]` ; `qa_stats` pourrait calculer des flags mais ne les réinjecte pas à l'append.

**Impact** : CSV et JSONL divergent de la vérité analytique ; double source de vérité.

**Recommandation** : soit calculer les flags dans `append_event.py --summary`, soit documenter que seul `qa_stats` est source et retirer le champ du payload agent.

---

### TEL-P1-08 — Chaîne `parent_event_id` incohérente sur le run partiel récent

**Constat** : L19 `planner_complete` a `parent_event_id: routing_decision_001` (run `20260629_qa_bmad-cockpit-bootstrap`) mais L17–18 appartiennent logiquement à un **autre** `run_id` (`064702`) inséré entre les deux sans lien.

**Impact** : graphe causal menteur pour debug et audit.

**Recommandation** : validation : tous les événements d'un run partagent le même `run_id` ; `parent_event_id` doit référencer un `event_id` du même run.

---

### TEL-P1-09 — Divergence dépôt git vs installation Cursor

**Constat** : journal prod = `~/.cursor/skills/qa3-agent/telemetry/` (19 lignes) ; dépôt = 6 lignes smoke figées. Spec rappelle le risque d'écrasement au sync.

**Impact** : perte de données prod si sync naïf ; confusion sur « la » source de vérité.

**Recommandation** : sync **ne doit jamais écraser** `telemetry/` installé ; script de merge ou exclusion explicite (vérifier `sync-to-cursor-skills.ps1`).

---

### TEL-P1-10 — Fichiers `tmp_*.json` laissés dans `telemetry/`

**Constat** : `tmp_run_context.json`, `tmp_worker1.json`, etc. (~06:23–06:30) aux côtés du journal.

**Impact** : confusion opérateur ; risque d'append accidentel du mauvais fichier ; fuite de chemins locaux.

**Recommandation** : écrire les temporaires hors `telemetry/` (ex. `telemetry/.tmp/` gitignoré) ou supprimer après append réussi.

---

### TEL-P1-11 — `routing_decision` L16 : champs spec manquants

**Constat** : pas de `source_count`, `kinds_mixtes` (bool), `loop_iteration` ; présence de `pass_count_planned: null` (non documenté).

**Impact** : drapeau `planner_overkill` et stats par taille de périmètre inopérants.

---

### TEL-P1-12 — Politique « 1 tentative puis continue » masque les échecs

**Constat** : spec (`telemetry.md`, `script-standards.md`) : si append échoue → `TELEMETRY_APPEND_FAILED` dans le rapport, QA continue. Aucune trace centralisée de ces échecs dans le journal.

**Impact** : on ne sait pas **combien** de runs ont tourné sans télémétrie.

**Recommandation** : append minimal `telemetry_failed` ou log séparé `append_failures.jsonl`.

---

## P2 — Améliorations structurantes (quand P0/P1 stabilisés)

### TEL-P2-01 — Pas de métrique de durée

**Constat** : aucun `duration_ms`, `started_at`/`ended_at` par événement.

**Recommandation** : timestamp auto à l'append + champ optionnel `duration_ms` côté agent si mesurable.

---

### TEL-P2-02 — Pas de contrôle de complétude de run

**Constat** : aucun script ne vérifie qu'un run a la séquence attendue (context → routing → … → run_finished).

**Recommandation** : `uv run scripts/telemetry_audit.py` listant runs incomplets, payloads invalides, orphelins CSV.

---

### TEL-P2-03 — `planner_overkill` ignore `planner_multi_pass`

**Constat** : `qa_stats.py` L121 — teste seulement `routing == "planner"`.

**Recommandation** : étendre au family planner* ou documenter l'exclusion.

---

### TEL-P2-04 — `summary_row()` masque les erreurs d'enveloppe

**Constat** : fallback `payload.get("run_id")`, `payload.get("project")` (L135–138).

**Recommandation** : retirer les fallbacks une fois validation stricte en place.

---

### TEL-P2-05 — `technique_pass_roi` toujours vide

**Constat** : planner prévoit `assumption-audit` (L19) mais aucun `worker_complete` avec `technique_pass` encore appendé.

**Recommandation** : normal tant que runs incomplets ; surveiller une fois P0/P1 corrigés.

---

### TEL-P2-06 — Volume insuffisant pour analytics produit

**Constat** : 1 run complet réel, 1 run partiel, reste = test. **Hors scope optimisation moteur QA** — mais bloquant pour toute roadmap stats.

**Recommandation** : objectif ops : N runs/semaine **avec journal complet** avant toute itération sur routing/gate.

---

### TEL-P2-07 — Échantillon smoke versionné dans le dépôt

**Constat** : `telemetry/.gitignore` ignore `events.jsonl` mais le dépôt en contient un (6 lignes) — diverge de l'install.

**Recommandation** : fixtures uniquement sous `scripts/fixtures/` pour les tests ; prod jamais commitée.

---

### TEL-P2-08 — CSV : pas de colonne `wrapper_skill` / `entry_trigger`

**Constat** : champs riches dans `run_context` absents du CSV de synthèse.

**Recommandation** : extension CSV v2 ou export Parquet pour analytics.

---

### TEL-P2-09 — Pas de `schema_version` migration path

**Constat** : tout est `schema_version: 1` ; pas de stratégie si le schéma évolue.

**Recommandation** : documenter politique de migration JSONL + validateur versionné.

---

### TEL-P2-10 — Gate « passée avec dette » non tracée explicitement

**Constat** : `20260629_smoke_skills` : `gate_passed: true`, `final_p1: 1`, `findings_actionable: 1`.

**Recommandation** : drapeau `gate_passed_with_open_p1` ou clarifier spec gate A4 vs payload run_finished smoke.

---

## État du journal au moment de l'audit

| Métrique | Valeur |
|----------|--------|
| Lignes `events.jsonl` (install) | 19 |
| `run_id` distincts | 8 (dont 1 `unknown`) |
| Lignes CSV (`run_finished`) | 3 |
| Runs complets exploitables | 1 (`20260629_onboarding_bmad-bootstrap`) |
| Runs partiels récents | 1 (`20260629_qa_bmad-cockpit-bootstrap` + events `unknown`) |
| Drapeaux `qa_stats` | `loop_effective: 1` |

### Séquence run partiel récent (à corriger en priorité)

```
20260629_qa_bmad-cockpit-bootstrap
  run_context (L15) ✓ enveloppe OK
  routing_decision (L16) ⚠ champs manquants
  [INSERT] run_context/routing unknown run_id (L17–18) ✗ P0
  planner_complete (L19) ✓ mais chaîne parent cassée
  → pas de worker_complete, qa_fusion, loop_cycle, run_finished
```

---

## Actions suggérées (ordre)

1. **Validateur schéma** dans `append_event.py` (P0-02, P0-03, P0-05, P0-06).
2. **Durcir prompts** parent/planner/worker — exemple JSON canonique par `event_type` (P0-04, P0-05, P0-06).
3. **Gate de clôture** : `run_finished` + `--summary` obligatoire (P0-01).
4. **Script audit** complétude + séparation test/prod (P1-01, P1-05, P2-02).
5. **Sync** : ne jamais écraser telemetry installée (P1-09).
6. **Ensuite seulement** : enrichir CSV, durées, dashboards (P2).

---

## Hors scope (explicitement)

- Optimisation routing / gate / grilles QA — **volume stats insuffisant**.
- Findings métier sur les livrables audités (bmad-cockpit, Skills, etc.).
- Comparaison qualité des modèles.

---

*Artefact généré par audit externe des logs — à remettre aux auteurs de `telemetry.md`, `append_event.py`, `workflow.md`, prompts rôles et scripts de sync.*
