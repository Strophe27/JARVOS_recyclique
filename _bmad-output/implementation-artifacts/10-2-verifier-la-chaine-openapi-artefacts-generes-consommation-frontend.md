# Story 10.2 : Vérifier la chaîne OpenAPI → artefacts générés → consommation frontend

Status: review

**Story ID :** 10.2  
**Story key :** `10-2-verifier-la-chaine-openapi-artefacts-generes-consommation-frontend`  
**Epic :** epic-10 — Industrialiser, valider et rendre la v2 deployable  

<!-- Ultimate context engine analysis completed — BMAD create-story (CS) 2026-09-21. -->

## Story

En tant qu'**équipe produit pilotée par les contrats**,  
je veux une **chaîne OpenAPI testable et reviewable de bout en bout**,  
afin que le **backend** et le **frontend** restent alignés à mesure que le produit évolue.

## Décisions Ombre / pilotage (2026-09-21)

- **Séquence L0** : **10.1** (CI minimale, statut **`review`** — CR+QA3 OK, ne pas forcer **`done`** depuis cette story) → **10.2** (cette story) → **10.3** avant module métier **D** (**D2/D7**).
- **Prérequis technique** : s'appuyer sur **`.github/workflows/ci-minimal.yml`** et **`doc/ci-minimal.md`** (job `contracts-openapi` : `npm run generate` + diff `recyclique-api.ts`) — **10.2** ajoute la preuve **FastAPI → snapshot reviewable → codegen**, pas un second workflow parallèle silencieux.
- **Bandeau-live Peintre** : échecs Vitest bandeau-live **préexistants** (CR 10.1 defer) — **hors scope** ; ne pas bloquer la chaîne OpenAPI sur leur correction.
- **C2b / `v2.0.0`** : hors scope.
- **D10** : Epic **12** gelé — pas de jobs « parité legacy » dans la chaîne OpenAPI.

## Acceptance Criteria

Source normative : `_bmad-output/planning-artifacts/epics.md` — **Story 10.2** (traduction exécutable ci-dessous).

1. **Writer canonique FastAPI** — Étant donné que le backend est le **writer canonique** d'OpenAPI (`core-architectural-decisions.md` § API, Piste B), quand le chemin de génération est exercé (local **et** CI), alors le dépôt expose **un pipeline documenté et reproductible** qui part de `app.openapi()` (via `recyclique/api/generate_openapi.py` ou script successeur **sans** dupliquer la logique métier) et produit un **snapshot versionné** sous `contracts/openapi/generated/` (fichier(s) nommé(s) explicitement dans la doc — ex. JSON normalisé et/ou YAML intermédiaire) **avant** la régénération TypeScript ; **interdit** de maintenir en parallèle une « seconde vérité » non reliée au pipeline (édition manuelle des `paths` du YAML reviewable sans passer par l'export FastAPI + commit du snapshot).

2. **YAML reviewable aligné** — Étant donné la chaîne documentée (`generated/` + `recyclique-api.yaml` + codegen), quand le pipeline tourne sur une branche propre, alors **`contracts/openapi/recyclique-api.yaml`** est **aligné** sur le **même snapshot** que `contracts/openapi/generated/` (copie, re-export ou étape unique documentée — choix d'outillage **écrit** dans `contracts/README.md` et `doc/ci-minimal.md`) ; la CI **échoue** si l'export FastAPI + synchronisation laisse un `git diff` non commité sur les artefacts de la chaîne (**au minimum** : snapshot `generated/` retenu + `recyclique-api.yaml` + `generated/recyclique-api.ts` selon la politique fixée en tâche « Politique snapshot »).

3. **Consommation Peintre nommée** — Étant donné que `peintre-nano` consomme les types générés, quand la story est livrée, alors la documentation d'équipe nomme **explicitement** le chemin d'import canonique : **`contracts/openapi/generated/recyclique-api.ts`** (déjà utilisé par `peintre-nano/src/api/*` et domaines) ; le script **`contracts/openapi/package.json` → `npm run generate`** prend **une seule entrée** documentée (YAML reviewable aligné sur le snapshot — pas de second fichier d'entrée caché).

4. **Détection d'incohérences avant la UI** — Étant donné que le produit dépend d'enums, `operationId` et DTO stables, quand la chaîne est validée, alors au moins **un test automatisé** (pytest sous `recyclique/api/tests/` **ou** `tests/infra/` pour verrous doc/CI) détecte une **divergence majeure** entre `app.openapi()` et `contracts/openapi/recyclique-api.yaml` (minimum recommandé : ensemble des **`operationId`** + présence des chemins critiques déjà couverts par `tests/test_openapi_validation.py` et les tests Vitest `peintre-nano/tests/contract/recyclique-openapi-governance.test.ts`) ; l'échec est **actionnable** (message indiquant régénérer / committer la chaîne).

5. **Industrialisation sur 10.1** — Étant donné qu'**Epic 10** industrialise sans refaire le métier, quand **10.2** est fermée, alors le pipeline s'intègre à la **baseline CI 10.1** (extension du job `contracts-openapi` **ou** job frère dans le **même** workflow `ci-minimal.yml`, **sans** filtre `paths:` qui contourne AC2 de **10.1**) **et** les commandes locales dans `doc/ci-minimal.md` incluent la **séquence complète** FastAPI → contrats → codegen (parité gates Story Runner).

6. **Hors scope explicite** — Étant donné les frontières Epic 10, quand cette story est revue, alors **ne pas** livrer : validation **CREOS `data_contract.operation_id` ↔ OpenAPI** sur tous les manifests reviewables (**10.3**) ; suite **Spectral** complète ; correction des tests Peintre **bandeau-live** ; extension de la baseline à **`recyclique-1.4.4/`** ; faire de **`recyclique/api/openapi.json`** une seconde source de vérité reviewable (autorisé : export **diagnostic** local/tests **si** documenté comme **dérivé** du même `app.openapi()` et **non** comparé en CI comme contrat canonique distinct du snapshot `contracts/`).

## Matrice de traçabilité (C12)

| AC | Tâches | Fichiers / artefacts (périmètre story + doc chaîne) | Gate Story Runner |
|----|--------|------------------------------------------------------|-------------------|
| **1** Writer FastAPI | Politique snapshot ; Script export/sync ; Intégration CI | `recyclique/api/generate_openapi.py` ; `recyclique/api/src/recyclic_api/openapi_chain.py` ; `contracts/openapi/generated/openapi-snapshot.json` | `python generate_openapi.py --emit-contracts` puis `git diff` triplet chaîne (AC2) |
| **2** YAML aligné | Politique snapshot ; Script export/sync ; Intégration CI ; Doc | `openapi_chain.py` ; `contracts/openapi/recyclique-api.yaml` ; `contracts/openapi/generated/openapi-snapshot.json` ; `contracts/README.md` ; `doc/ci-minimal.md` | `git diff --exit-code generated/openapi-snapshot.json recyclique-api.yaml generated/recyclique-api.ts` (CI + doc) |
| **3** Chemin Peintre | Politique snapshot ; Doc consommation frontend | `contracts/openapi/package.json` (`generate` ← YAML seul) ; `contracts/README.md` ; `peintre-nano/README.md` (import `generated/recyclique-api.ts`) | `npm run generate` ; Vitest `peintre-nano/tests/contract/` (hors bandeau-live defer) |
| **4** Détection drift | Tests détection drift | `recyclique/api/tests/test_story_10_2_openapi_chain_fastapi_vs_reviewable_yaml.py` (4 tests : snapshot, paths, `operationId`, idempotence) ; `tests/infra/test_story_10_2_openapi_chain_ci_smoke.py` (verrou YAML CI) | `pytest` modules ci-dessus **verts** |
| **5** Sur 10.1 | Intégration CI ; Doc | `.github/workflows/ci-minimal.yml` (job `contracts-openapi`) ; `doc/ci-minimal.md` ; smoke `tests/infra/test_story_10_2_openapi_chain_ci_smoke.py` | Même workflow **sans** `paths:` / `continue-on-error` ; parité commandes § Gates |
| **6** Hors scope | Audit écart ; Revue périmètre | Dev Notes § Hors scope ; `recyclique/api/openapi.json` = diagnostic seul | Aucun job Spectral / CREOS manifests / legacy 1.4.4 dans chaîne CI |

## Tasks / Subtasks

- [x] **Audit écart chaîne (état CS 2026-09-21)** — Cartographier : (a) `app.openapi()` via fixture `openapi_schema` ; (b) `recyclique/api/openapi.json` (export historique tests/Docker) ; (c) `contracts/openapi/recyclique-api.yaml` (~13k lignes, enrichi manuellement au fil des epics) ; (d) `contracts/openapi/generated/recyclique-api.ts` (codegen **depuis YAML uniquement** aujourd'hui). Documenter dans les Dev Notes du fichier story les **écarts connus** (préfixes `/v1` vs `/api`, champs `description` reviewables, fragments `contracts/openapi/fragments/`). (AC : 1, 2, 4)

- [x] **Politique snapshot unique** — Trancher et **écrire** (PO technique = équipe, pas HITL supplémentaire Ombre) : format du snapshot sous `contracts/openapi/generated/` (JSON normalisé recommandé pour diff stable ; YAML optionnel si outillage unique) ; règle de mise à jour de **`recyclique-api.yaml`** (écrasement contrôlé vs merge sélectif des `description` — si merge, script **explicite** et testé). Mettre à jour **`contracts/README.md`** § tableau `openapi/` et **`doc/ci-minimal.md`** § hors 10.1 → intégrer **10.2**. (AC : 1, 2, 3)

- [x] **Script export / sync** — Implémenter un chemin **une commande** depuis `recyclique/api/` (ex. `python generate_openapi.py --emit-contracts` ou script shell `scripts/sync-openapi-chain.sh` à la racine) qui : charge l'app FastAPI ; écrit le snapshot dans `contracts/openapi/generated/` ; synchronise `recyclique-api.yaml` selon la politique ; **ne modifie pas** la sémantique métier des routes (pas de refonte API). Préserver **`operationId`** stables (custom OpenAPI route decorators existants — grep `operation_id` / `openapi_extra` avant toute refonte). (AC : 1, 2)

- [x] **Intégration CI** — Étendre le job **`contracts-openapi`** dans `ci-minimal.yml` (préféré) : installer deps Python minimales pour l'export (réutiliser cache/setup du job `api-minimal` **ou** step léger `pip install` ciblé) ; exécuter le script chaîne ; `npm ci && npm run generate` ; `git diff --exit-code` sur **tous** les artefacts déclarés en politique snapshot. **Interdit** : `paths:` sur ce workflow ; `continue-on-error`. (AC : 2, 5)

- [x] **Tests détection drift** — Ajouter `recyclique/api/tests/test_story_10_2_openapi_chain_fastapi_vs_reviewable_yaml.py` (nom indicative) : compare au minimum les ensembles **`operationId`** entre `app.openapi()` et le YAML parse (PyYAML ou `json` si snapshot JSON intermédiaire) ; tolérance documentée pour opérations **volontairement** absentes du YAML (liste vide attendue après audit — sinon faire converger). Ajouter `tests/infra/test_story_10_2_openapi_chain_ci_smoke.py` : assert que `ci-minimal.yml` référence le script/export et les diffs git sur la chaîne (pattern **10.1** smoke). (AC : 4, 5)

- [x] **Doc consommation frontend** — Vérifier / ajuster une seule section dans `peintre-nano/README.md` + `contracts/README.md` : entrée = snapshot aligné → `recyclique-api.yaml` → `npm run generate` → import `../../../contracts/openapi/generated/recyclique-api` (chemins relatifs existants). (AC : 3)

- [x] **Sprint / story** — Après DS : Dev Agent Record, File List, `sprint-status.yaml` → **review** via Story Runner. (process BMAD)

## Dev Notes

### Frontières avec 10.1 et 10.3

| Sujet | **10.1 (review — CR+QA3 OK, pas `done`)** | **10.2 (cette story)** | **10.3** |
|--------|---------------------------|-------------------------|----------|
| CI `master` + 3 jobs | Baseline API + Peintre + `generate` TS depuis YAML | Ajoute export **FastAPI → snapshot + YAML** + diffs git | — |
| OpenAPI | Diff `recyclique-api.ts` seulement | **Alignement YAML ↔ FastAPI** + snapshot `generated/` | — |
| CREOS / manifests | Vitest gouvernance schéma | Inchangé | `operation_id` ↔ `operationId` sur manifests reviewables + smoke rendu |
| Peintre e2e | `npm run test` complet (bandeau-live rouge = defer) | Ne pas conditionner la chaîne au vert bandeau-live | Smoke rendu modules critiques |

### Chaîne normative (architecture)

Ordre **cible** (`core-architectural-decisions.md` § Contrat frontend) :

1. Code **`recyclique/api/src/recyclic_api/`** (FastAPI) — seule source exécutable.
2. Export CI → **`contracts/openapi/generated/`** (snapshot diff).
3. **`contracts/openapi/recyclique-api.yaml`** — fichier **reviewable** (humains, liens doc, Vitest gouvernance).
4. **`npm run generate`** → **`contracts/openapi/generated/recyclique-api.ts`**.
5. **`peintre-nano`** importe les types (clients sous `src/api/`, domaines bandeau-live, etc.).

Références : `project-structure-boundaries.md` (Piste B, Convergence 1), pivot `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` § drift / copies dérivées.

### Audit écart chaîne (DS 2026-09-21)

| Source | Rôle | Écart constaté avant DS |
|--------|------|-------------------------|
| `app.openapi()` | Writer exécutable | ~238 `operationId` auto ; ~35 alignés mot pour mot avec le YAML |
| `recyclique/api/openapi.json` | Export diagnostic tests/Docker | Hors snapshot CI (`contracts/`) — inchangé |
| `contracts/openapi/recyclique-api.yaml` | Reviewable | ~155 ops ; `operationId` stables ; schémas enrichis (`ContextEnvelope`, Story 5.5) ; ping gouvernance **sans** route FastAPI |
| `contracts/openapi/generated/recyclique-api.ts` | Codegen Peintre | Entrée YAML seule ; régénéré après sync |
| `contracts/openapi/fragments/` | Exemples reviewables | Non fusionnés dans le YAML par le script (inchangé) |

**Politique retenue :** snapshot `generated/openapi-snapshot.json` (JSON trié) ; sync YAML = chemins + `components` FastAPI avec **conservation** des `operationId`/descriptions/tags reviewables et des propriétés schéma absentes de FastAPI ; version OpenAPI reviewable **3.1.0** conservée ; seule exception path/méthode hors FastAPI : `GET /v2/_contract-governance/ping`.

### Intelligence story 10.1 (prédécesseur immédiat)

- Workflow **`ci-minimal.yml`** : Postgres **17**, `POSTGRES_DB: recyclic_test`, Redis, ruff + compileall + pytest `-m "not performance"`.
- Job **`contracts-openapi`** (étendu **10.2**) : `generate_openapi.py --emit-contracts` puis `npm run generate` ; `git diff --exit-code` sur snapshot JSON, YAML reviewable et `recyclique-api.ts` — aligné **`doc/ci-minimal.md`** et gates Story Runner § ci-dessous.
- Dette : **`recyclique/api/openapi.json`** généré par `main.py` / `run_tests.sh` — export **diagnostic** (AC6), pas second snapshot CI sous `contracts/`.

### Outils et versions (ne pas upgrader sans nécessité)

- **openapi-typescript** `^7.4.4` (`contracts/openapi/package.json`).
- **FastAPI** `app.openapi()` — fixture `openapi_schema` dans `recyclique/api/tests/conftest.py`.
- Tests Vitest existants : `peintre-nano/tests/contract/recyclique-openapi-governance.test.ts` (parse YAML reviewable — **doit rester verts** après sync).

### Fichiers cibles probables

| Fichier | Action attendue |
|---------|-----------------|
| `recyclique/api/generate_openapi.py` | Étendre ou remplacer par script chaîne documenté |
| `contracts/openapi/generated/` | Ajouter snapshot(s) ; conserver `recyclique-api.ts` |
| `contracts/openapi/recyclique-api.yaml` | Régénéré / synchronisé par pipeline (pas d'édition manuelle des paths en PR normale) |
| `contracts/openapi/package.json` | Entrée `generate` documentée si changement |
| `.github/workflows/ci-minimal.yml` | Étendre job `contracts-openapi` |
| `doc/ci-minimal.md` | Séquence complète 10.2 |
| `contracts/README.md` | Politique snapshot + chaîne unique |
| `recyclique/api/tests/test_story_10_2_*.py` | Gate drift |
| `tests/infra/test_story_10_2_*.py` | Smoke CI YAML |

**Hors scope :** `recyclique-1.4.4/**`, Spectral complet, gate CREOS manifests (**10.3**), fix tests bandeau-live, promotion nouveaux manifests CREOS.

### Modes de défaillance ciblés (FMEA)

| ID | Mode | Effet | Mitigation (10.2) |
|----|------|-------|-------------------|
| FM1 | Édition manuelle YAML sans export FastAPI | Frontend / doc sur contrat fantôme | CI `git diff` après export ; test `operationId` |
| FM2 | Deux snapshots (`openapi.json` racine API vs `contracts/`) | Drift silencieux | Doc AC6 ; un seul snapshot canonique sous `contracts/` |
| FM3 | Job CI export sauté (`paths:` / script optionnel) | Merge casse codegen | Étendre `contracts-openapi` sans `paths:` |
| FM4 | Normalisation JSON instable (ordre clés) | Diff bruyant | Tri/normalisation documentée dans script |
| FM5 | Scope creep Spectral + CREOS + 10.3 | Surcharge | AC6 + tableau frontières |

### Gates Story Runner (référence DS)

```bash
# 1) Chaîne contrats (après implémentation script — chemins exacts = File List DS)
cd recyclique/api && pip install -r requirements.txt -r requirements-dev.txt
python generate_openapi.py --emit-contracts   # ou commande unique documentée (tâche Script export / sync, L58)
cd ../../contracts/openapi && npm ci && npm run generate
git diff --exit-code generated/ recyclique-api.yaml generated/recyclique-api.ts   # aligné AC2 (politique snapshot)

# 2) Tests drift + smoke infra
cd ../../recyclique/api && python -m pytest tests/test_story_10_2_openapi_chain_fastapi_vs_reviewable_yaml.py -q
cd ../.. && python -m pytest tests/infra/test_story_10_2_openapi_chain_ci_smoke.py -q

# 3) Non-régression contrats Peintre (hors bandeau-live si encore rouge — noter dans CR)
cd peintre-nano && npm ci && npm run lint && npx vitest run tests/contract/

# 4) Peloton API (si touché backend) — Postgres 17 + Redis
cd ../recyclique/api && python -m pytest tests/test_openapi_validation.py -q
```

### Project context

- `_bmad-output/project-context.md` — chemins canoniques ; pas de push sans accord (workflow humain).

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 10, Story 10.2]
- [Source: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md` — Chaîne OpenAPI unique]
- [Source: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — Piste B, `contracts/openapi/generated/`]
- [Source: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md` — Jalons CI codegen / CREOS]
- [Source: `_bmad-output/implementation-artifacts/10-1-outiller-la-ci-minimale-pour-recyclique-peintre-nano-et-les-contrats.md` — Frontières 10.2]
- [Source: `_bmad-output/implementation-artifacts/1-4-fermer-la-gouvernance-contractuelle-openapi-creos-contextenvelope.md`]
- [Source: `_bmad-output/implementation-artifacts/2-6-exposer-les-premiers-contrats-backend-versionnes-pour-les-slices-v2.md` — Codegen Peintre]
- [Source: `contracts/README.md`, `doc/ci-minimal.md`, `peintre-nano/tests/contract/README.md`]
- [Source: `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md` — ligne 10.2]

## Dev Agent Record

### Agent Model Used

Composer 2.5 (Amelia / `bmad-dev-story`)

### Debug Log References

- Gates DS : `pytest tests/test_story_10_2_openapi_chain_fastapi_vs_reviewable_yaml.py` (4, dont idempotence YAML/snapshot) ; `pytest tests/infra/test_story_10_2_openapi_chain_ci_smoke.py` (2) ; `npx vitest run tests/contract/` (97 passed).

### Completion Notes List

- Module `recyclic_api.openapi_chain` + `generate_openapi.py --emit-contracts`.
- CI `contracts-openapi` : export Python + diff `openapi-snapshot.json`, `recyclique-api.yaml`, `recyclique-api.ts`.
- **10.1** non passé à `done` ; bandeau-live hors scope.

### File List

- `recyclique/api/src/recyclic_api/openapi_chain.py` (nouveau)
- `recyclique/api/generate_openapi.py`
- `recyclique/api/requirements-dev.txt`
- `recyclique/api/tests/test_story_10_2_openapi_chain_fastapi_vs_reviewable_yaml.py` (nouveau)
- `contracts/openapi/generated/openapi-snapshot.json` (nouveau)
- `contracts/openapi/recyclique-api.yaml`
- `contracts/openapi/generated/recyclique-api.ts`
- `.github/workflows/ci-minimal.yml`
- `doc/ci-minimal.md`
- `contracts/README.md`
- `peintre-nano/README.md`
- `tests/infra/test_story_10_2_openapi_chain_ci_smoke.py` (nouveau)
- `tests/infra/test_story_10_1_ci_minimal_smoke.py`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-09-21 — DS story 10.2 : chaîne OpenAPI testable FastAPI → snapshot → YAML → codegen + gates CI/doc/tests.

## Story completion status

- **DS :** implémentation **review** (2026-09-21) — gates contract Vitest + pytest 10.2 verts ; pas de push.
- **CS :** fichier story créé — **ready-for-dev** (2026-09-21)
- **QA3 :** boucle gate 95+ (2026-09-21) — score **96** ; 0 P0 / 0 P1 ; correctifs intégrés (tableau 10.1 `review`, gates `git diff` + `recyclique-api.ts`, `--emit-contracts` indicatif aligné tâche script) — rapport projet `internal/qa3-story-10-2.md`
- **QA3 :** passe `pass-docs` (2026-09-21, run `20260921_173245_jarvos`) — score **96** ; 0 P0 / 0 P1 après correctifs (`doc/ci-minimal.md` périmètre 10.2 vs tableau jobs ; Dev Notes 10.1 obsolètes)
- **QA3 :** passe `pass-contradiction` (2026-09-21, run `20260921_173245_jarvos`) — alignement story ↔ code ↔ CI ↔ tests smoke (findings CR obsolètes levés dans Review Findings)
- **QA3 :** passe `pass-traceability` (2026-09-21, run `20260921_173245_jarvos`) — matrice C12 AC1–AC6 ↔ artefacts ; 0 orphelin dans périmètre 7 fichiers ; **10.1** inchangé `review`
- **VS :** validate-create-story (Bob SM) — **PASS** (2026-09-21) ; checklist `bmad-create-story` sans écart bloquant ; QA3 **96** préservé ; dettes résiduelles (audit écart chaîne, politique merge `description` YAML, Dev Agent Record) reportées **DS**
- **CR :** **APPROVE** (2026-09-21, commit `3c63744`) — 0 P0 / 0 P1 ; gates CR rejouées (pytest 10.2, smoke infra, Vitest contrats 97) ; rapport projet `internal/code-review-10-2.md`
- **Prochaine étape BMAD :** coordinateur — QA3 si requis epic, puis `done` 10.2 ; **10.1** inchangé `review`

### Review Findings

- [x] [Review][Defer] Variables `DATABASE_URL` / `REDIS_URL` dans `contracts-openapi` sans services — acceptable tant que l’export n’ouvre pas de connexion ; surveiller imports futurs [`.github/workflows/ci-minimal.yml:117-121`] — deferred, risque CI latent
- [x] [Review][Dismiss] Smoke infra : assertion sur le triplet `git diff` (snapshot, YAML, TS) — couvert par `test_ci_contracts_job_runs_openapi_chain_and_full_git_diff` [`tests/infra/test_story_10_2_openapi_chain_ci_smoke.py`]
- [x] [Review][Dismiss] Idempotence double `--emit-contracts` — `test_emit_contracts_chain_idempotent_on_yaml_and_snapshot` [`recyclique/api/tests/test_story_10_2_openapi_chain_fastapi_vs_reviewable_yaml.py`]
- [x] [Review][Dismiss] `load_yaml_spec` lève `ValueError` / `FileNotFoundError` explicites (plus d’`assert` racine) [`recyclique/api/src/recyclic_api/openapi_chain.py`]
