# QA2 agrégé — Epic 25 phase 2 (25.6 → 25.15)

**Date :** 2026-04-21  
**Demandeur :** orchestration QA2 déléguée (`qa2-orchestrator` + skill `qa2-agent`) — planner → passes parallèles → fusion.  
**Périmètre `scope_paths` :** stories phase 2, DAG, `epics.md`, `sprint-status.yaml`, récap planning, artefacts spikes/politiques 25.13–25.15, modules `audit.py`, `step_up.py`, `sale_service.py`, pytest `test_story_25_*` et `test_audit_story_25.py`.

---

## Synthèse

La revue fusionnée conclut à une **cohérence globale** entre pilotage, stories et implémentations récentes, avec des **écarts documentaires** et **contrat OpenAPI** à traiter en priorité moyenne, et des **assertions de tests** parfois légères sur les zones sensibles (AR12, step-up, spike 25.15).

**Score indicatif (fusion) :** ~78 / 100.

---

## Findings par sévérité

### P0 — Bloquant immédiat

- Aucun signalé dans la fusion.

### P1 — Haute priorité

1. **`recyclique/api/openapi.json` (export FastAPI)** — Écart possible avec les **headers** attendus sur chemins sensibles (`X-Step-Up-Pin`, `Idempotency-Key`, en-têtes de contexte `X-Recyclique-Context-*`) et avec le **schéma d’auth** (ex. cookie vs bearer) par rapport au comportement réel / contrat canon. **Risque :** clients générés ou doc API incomplète. *À confirmer par passe ciblée + `generate_openapi.py` / alignement `contracts/openapi`.*
2. **Grille technique QA « tests »** — Le skill `qa-agent` expose `references/techniques/{code,doc,prd,arch,concept}.md` ; il **n’existe pas** de `tests.md` sous `…/techniques/`. La passe « tests » s’appuie donc sur une grille **implicite** ou sur **`code.md`** : le protocole worker doit le **stipuler** pour les prochains QA2.

### P2 — Amélioration / dette

1. **Story 25.7** — En-tête fichier : `Status: ready-for-dev` alors que `sprint-status.yaml` porte **`25-7` → `done`** → risque de lecture contradictoire pour un humain ou un script.
2. **Story 25.14** — Possible ambiguïté entre **Status: done** et une mention « review » dans une section « File List » (si présente) → harmoniser la prose.
3. **`test_story_25_12_ar12_paheko_async_path_no_redis.py`** — Heuristique `_FORBIDDEN` / chemins : risque de **faux négatif** si refactor modules.
4. **`test_story_25_14_step_up_revalidation_…`** — Renforcer les **assertions métier** sur les réponses de succès si les tests restent surtout structurels.
5. **`test_story_25_15_spike_faisabilite_indexeddb_…`** — Assertions parfois **superficielles** par rapport au livrable spike (go/no-go / citations readiness) — renforcer si la barre « preuve » doit monter.

---

## Risques transverses

- **Dérive contrat** : double pipeline **YAML canon** vs **`openapi.json`** export — déjà historique sur le projet ; à surveiller après changements FastAPI.
- **Qualité du protocole QA** : sans grille `tests.md` dédiée, caler explicitement les passes pytest sur **`code.md`** + critères story.

---

## Passes exécutées (rapport orchestrateur)

| `pass_id` (typique) | Statut | Commentaire |
|---------------------|--------|----------------|
| `pass-doc-epic25-phase2` | Terminé | Stories, epics, sprint, DAG, récap |
| `pass-code-epic25-phase2` | Terminé | Modules API listés |
| `pass-tests-epic25-phase2` | Terminé avec **limitation** | Grille `tests.md` absente du skill |

---

## Limitations de cette fusion

- Les workers **n’ont pas fourni de citations `[LOC]`** systématiques dans le retour agrégé — les findings ci-dessus sont à **recoller** aux fichiers par une passe **ciblée** (grep / lecture) avant correction.
- Aucun sous-spawn worker **signalé** ; le découpage est resté au niveau **3 passes** principales.

---

## Prochaines étapes recommandées

1. **Passe QA2 ou audit manuel ciblé** sur `openapi.json` vs routes réelles (headers step-up / contexte / auth).
2. **Corriger** le fichier story **25-7** (`Status` → **`done`** aligné YAML) si la livraison est bien figée.
3. **Option skill `qa-agent`** : ajouter `references/techniques/tests.md` ou documenter dans `worker-qa.md` l’usage de **`code.md`** pour pytest.
4. **Durcissement tests** 25.12 / 25.14 / 25.15 selon priorités produit.

---

*Document produit à partir de la fusion QA2 orchestrée ; à versionner avec le dépôt.*
