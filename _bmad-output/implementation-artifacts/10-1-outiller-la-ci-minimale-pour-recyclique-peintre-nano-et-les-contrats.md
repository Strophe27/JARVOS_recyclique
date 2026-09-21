# Story 10.1 : Outiller la CI minimale pour Recyclique, Peintre_nano et les contrats

Status: ready-for-dev

**Story ID :** 10.1  
**Story key :** `10-1-outiller-la-ci-minimale-pour-recyclique-peintre-nano-et-les-contrats`  
**Epic :** epic-10 — Industrialiser, valider et rendre la v2 deployable  

<!-- Ultimate context engine analysis completed — BMAD create-story (CS) 2026-09-21. -->

## Story

En tant qu'**équipe plateforme livraison**,  
je veux une **pipeline CI minimale mais contraignante** sur le mono-repo canonique,  
afin que la **qualité** et la **gouvernance contractuelle** ne dépendent plus de la discipline manuelle seule.

## Décisions Ombre / pilotage (2026-09-21)

- **D2/D7** : cette story ouvre le plancher ship **10.1 → 10.2 → 10.3** avant tout module métier **D** ou **9.7+**.
- **C2b / tag `v2.0.0`** : hors scope **10.1** (gate terrain) — ne pas bloquer la CI sur C2b.
- **D10** : Epic **12** gelé — ne pas y rattacher des jobs CI « parité legacy ».
- **L0** : exécution autorisée sans HITL supplémentaire (levée partielle D1).

## Acceptance Criteria

Source normative : `_bmad-output/planning-artifacts/epics.md` — **Story 10.1** (traduction exécutable ci-dessous).

1. **Gouvernance exécutable** — Étant donné que l'architecture exige une gouvernance **exécutable** (`core-architectural-decisions.md`, **AR18**, FR73), quand la baseline CI est en place, alors **chaque PR** vers la branche d'intégration canonique (**`master`**) et **chaque push** sur cette branche déclenchent un workflow GitHub Actions qui exécute, sans intervention humaine, au minimum :
   - **Recyclique API** : installation deps + **pytest** sur `recyclique/api/tests/` avec marqueur **`-m "not performance"`** (services **PostgreSQL 17** + **Redis** alignés **10.6d**).
   - **Peintre_nano** : `npm ci` + **`npm run lint`** (`tsc -b`) + **`npm run test`** (Vitest, **incluant** `peintre-nano/tests/contract/`).
   - **Contrats** : au minimum les **tests contractuels Vitest** déjà présents ; plus un **contrôle de régénération** OpenAPI TypeScript (`contracts/openapi`: `npm ci` + `npm run generate` puis **working tree propre** sur `generated/recyclique-api.ts` **ou** échec explicite documenté si la politique choisie diffère — **sans** maintenir deux snapshots divergents en silence).
   - Le résultat devient la **baseline partagée** documentée (README racine ou `doc/ci-minimal.md` court) pour les contributeurs et le Story Runner.

2. **Dérive contractuelle visible** — Étant donné que le projet dépend d'une évolution **gouvernée** des contrats, quand une PR touche `contracts/**`, `peintre-nano/tests/contract/**`, ou les chemins OpenAPI/CREOS consommés par Peintre, alors la CI **échoue** si les tests contractuels échouent ou si la régénération OpenAPI TS laisse un diff non commité (selon la politique fixée en AC1). **Ne pas** implémenter ici la preuve bout-en-bout « FastAPI export → YAML reviewable → codegen » (**Story 10.2**) ni la validation **CREOS ↔ operationId** sur tous les manifests (**Story 10.3**).

3. **Industrialisation, pas refonte produit** — Étant donné qu'Epic 10 **industrialise** plutôt qu'il refait le métier, quand **10.1** est fermée, alors le dépôt dispose d'**un** chemin reproductible local **équivalent** aux jobs CI (script shell ou section README avec commandes copiables), et les stories **10.2+** peuvent **s'appuyer** sur cette ossature au lieu de scripts ad hoc.

4. **Branche canonique** — Étant donné que la branche par défaut du dépôt est **`master`** (`origin/HEAD` → `master`), quand les workflows sont alignés, alors les déclencheurs `on.push` / `on.pull_request` **incluent `master`** (conserver `main` / `develop` si déjà utilisés par l'équipe, mais **ne pas** laisser `master` sans CI — constat actuel : `.github/workflows/deploy.yaml` ne cible que `main` / `develop`).

5. **Périmètre legacy** — Aucune obligation d'étendre cette baseline à **`recyclique-1.4.4/`** (compose, frontend legacy, scripts historiques). Le job de **déploiement production** legacy dans `deploy.yaml` peut rester **inchangé** sauf si nécessaire pour faire passer les **tests** (hors scope sauf régression évidente).

6. **Qualité API minimale** — En plus du peloton pytest, la CI **10.1** exécute **`python -m compileall src/recyclic_api -q`** et **`python -m ruff check src/recyclic_api`** (jeu **E9** — config **26.5**) depuis `recyclique/api/`, pour éviter un vert pytest avec syntaxe cassée.

## Tasks / Subtasks

- [ ] **Audit écart CI** — Lister l'état actuel : `.github/workflows/deploy.yaml`, `.github/workflows/alembic-check.yml`, branches déclenchées, étapes manquantes (contrats, ruff, `master`). (AC : 1, 4)
- [ ] **Workflow « CI minimale »** — Créer ou refactoriser un workflow dédié (nom explicite, ex. `ci-minimal.yml`) **ou** corriger `deploy.yaml` pour séparer **test** vs **deploy** si cela simplifie la maintenance ; déclencheurs **`master`** + PR vers **`master`**. (AC : 1, 4)
- [ ] **Job API** — Postgres **17** + Redis ; `pip install -r requirements.txt` ; `compileall` + `ruff check` + `pytest -m "not performance"`. Réutiliser variables d'env déjà présentes dans `deploy.yaml` (`DATABASE_URL`, `TEST_DATABASE_URL`, `REDIS_URL`). (AC : 1, 6)
- [ ] **Job Peintre_nano** — Cache `package-lock.json` ; `npm ci` ; `lint` + `test`. (AC : 1)
- [ ] **Job contrats** — `cd contracts/openapi && npm ci && npm run generate` ; vérifier que `generated/recyclique-api.ts` est à jour (`git diff --exit-code` ou équivalent). Les tests Vitest contractuels restent dans le job Peintre. (AC : 1, 2)
- [ ] **Doc contributeur** — Section courte : prérequis, commandes locales identiques à la CI, lien vers `recyclique/api/tests/README.md` et `peintre-nano/tests/contract/README.md`. (AC : 3)
- [ ] **Smoke verrou infra (optionnel mais recommandé)** — Étendre ou ajouter un test pytest léger qui asserte que le workflow **10.1** référence bien `master` et les chemins canoniques (pattern **10.6d** : `tests/infra/test_story_10_6c_pg17_doc_smoke.py`). (AC : 4)
- [ ] **Sprint / story** — Après DS : mettre à jour ce fichier (Dev Agent Record, File List) et `sprint-status.yaml` (**review** → **done** via Story Runner). (process BMAD)

## Dev Notes

### Frontières avec 10.2 et 10.3 (ne pas déborder)

| Sujet | **10.1 (cette story)** | **10.2** | **10.3** |
|--------|-------------------------|----------|----------|
| OpenAPI | Régénération TS + tests Vitest gouvernance ; pas de double snapshot silencieux | Preuve **chaîne unique** FastAPI → `generated/` → `recyclique-api.yaml` → codegen Peintre | — |
| CREOS | Tests schéma / gouvernance déjà dans Vitest | — | Validation manifests + **operation_id** ↔ OpenAPI + smoke rendu |
| Perf API | Exclure `performance` du job PR | — | — |
| e2e navigateur | Non requis (Vitest e2e existants suffisent pour la baseline) | — | Smoke rendu modules critiques |

### État actuel du dépôt (intelligence CS)

- **Workflows** : `deploy.yaml` (tests rapides + deploy legacy sur `main` uniquement pour tests complets perf) ; `alembic-check.yml` (PR migrations seulement).
- **Branche** : **`master`** = intégration ; **écart connu** = CI non déclenchée sur `master` aujourd'hui.
- **PostgreSQL** : **17** sur compose racine + CI (**10.6d** done) — ne pas repasser à 15.
- **Tests contrats** : `peintre-nano/tests/contract/*.test.ts` (README liste stories 1.4–1.7, 4.1, 5.1, 6.x, 7.x, etc.) — **doivent tourner en CI**.
- **Codegen** : `contracts/openapi/package.json` → `npm run generate` → `generated/recyclique-api.ts` (versionné).
- **Gouvernance** : pivot `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` ; `contracts/README.md` renvoie la **CI Epic 10** pour `data_contract.source` (règle complète **10.3** / jalons `implementation-patterns-consistency-rules.md`).

### Stories Epic 10 déjà livrées (contexte, pas prérequis numériques)

- **10.6b** : compose racine + CI frontend `peintre-nano` dans `deploy.yaml`.
- **10.6c–10.6e** : PG17, runbook, smoke infra pytest.
- **Numérotation** : **10.1** est la première story « ship gate » du plancher L0 ; les **10.6x** sont des spikes infra **done** — **réutiliser** leurs conventions (smoke infra, hors `recyclique-1.4.4/`).

### Garde-fous architecture & Peintre

- Checklist : `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` — la CI ne doit **pas** introduire de tests qui figent de la logique métier dans le front ; les tests **contract** / **infra** restent sur artefacts déclarés.
- Pack lecture Epic 10 : `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md` + tableau `2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md` (ligne **10.1**).

### Fichiers cibles probables

| Fichier | Action attendue |
|---------|-----------------|
| `.github/workflows/ci-minimal.yml` (ou équivalent) | **Créer / refactor** — jobs API + Peintre + contrats |
| `.github/workflows/deploy.yaml` | **Ajuster** déclencheurs `master` ; éventuellement `needs` / séparation deploy |
| `README.md` (racine) ou `doc/ci-minimal.md` | Documenter baseline |
| `tests/infra/test_story_10_1_ci_minimal_smoke.py` (nom indicative) | Verrou doc/workflow (optionnel) |
| `contracts/openapi/generated/recyclique-api.ts` | Uniquement si régénération légitime |

**Hors scope :** `recyclique-1.4.4/**`, refonte deploy production, Spectral OpenAPI complet, smoke Puppeteer nouveau, gate **10.7** beta.

### Gates Story Runner (référence — à rejouer en DS)

```bash
# Racine dépôt — adapter si script unique ajouté
cd peintre-nano && npm ci && npm run lint && npm run test
cd ../contracts/openapi && npm ci && npm run generate && git diff --exit-code generated/recyclique-api.ts
cd ../../recyclique/api && pip install -r requirements.txt
python -m compileall src/recyclic_api -q
python -m ruff check src/recyclic_api
python -m pytest tests/ -m "not performance" --tb=short
# Optionnel : pytest tests/infra/test_story_10_6c_pg17_doc_smoke.py -q
```

**Services locaux :** suivre `recyclique/api/tests/README.md` (Postgres **17**, base `recyclic_test`, Redis) — **ne pas** documenter `recyclique-1.4.4/api/run_tests.sh` comme chemin canonique v2.

### Intelligence git récente

- Commits récents = **docs pilotage L0/L1** (D1, guide v2) — pas de changement CI depuis **10.6d** ; **10.1** comble l'écart **master** + **contrats** + **ruff/compileall**.

### Latest tech (2026-09)

- **GitHub Actions** : `actions/checkout@v4`, `setup-python@v5`, `setup-node@v4` déjà utilisés dans `alembic-check.yml` — **aligner** les versions des nouveaux jobs sur ce fichier plutôt que `deploy.yaml` (@v3) si touché.
- **openapi-typescript** ^7.4.4 (déjà dans `contracts/openapi/package.json`) — pas de montée de version hors nécessité.

### Project context

- `_bmad-output/project-context.md` — chemins canoniques `peintre-nano/`, `recyclique/api/`, `contracts/` ; pytest config unique `pyproject.toml`.

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 10, Story 10.1]
- [Source: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md` — CI/CD, chaîne OpenAPI]
- [Source: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md` — Pattern Enforcement CI]
- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-09-21-recadrage-plancher-option-c.md` — L0 Epic 10]
- [Source: `_bmad-output/implementation-artifacts/1-4-fermer-la-gouvernance-contractuelle-openapi-creos-contextenvelope.md`]
- [Source: `_bmad-output/implementation-artifacts/10-6d-aligner-le-compose-racine-et-la-ci-non-legacy-sur-postgresql-17.md`]
- [Source: `contracts/README.md`, `peintre-nano/tests/contract/README.md`]

## Dev Agent Record

### Agent Model Used

_(à remplir en DS)_

### Debug Log References

### Completion Notes List

### File List

## Story completion status

- **CS :** fichier story créé — **ready-for-dev** (2026-09-21)
- **Prochaine étape BMAD :** **VS** (validate-create-story) puis **DS** (`bmad-dev-story`) — **pas** dans le périmètre de ce livrable CS
