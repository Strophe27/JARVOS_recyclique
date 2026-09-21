# Story 10.1 : Outiller la CI minimale pour Recyclique, Peintre_nano et les contrats

Status: review

**Story ID :** 10.1  
**Story key :** `10-1-outiller-la-ci-minimale-pour-recyclique-peintre-nano-et-les-contrats`  
**Epic :** epic-10 — Industrialiser, valider et rendre la v2 deployable  

<!-- Ultimate context engine analysis completed — BMAD create-story (CS) 2026-09-21. -->

## Story

En tant qu'**équipe plateforme livraison**,  
je veux une **pipeline CI minimale mais contraignante** sur le mono-repo canonique,  
afin que la **qualité** et la **gouvernance contractuelle** ne dépendent plus de la discipline manuelle seule.

## Décisions Ombre / pilotage (2026-09-21)

- **Séquence ship L0** : **10.1 → 10.2 → 10.3** avant tout module métier **D** ou **9.7+** (aligné sprint-change § L1 et HITL Ombre).
- **D2/D7** (ouvert) : **après** **10.1–10.3**, le PO tranche **un** module **D** — ne pas confondre avec l’ordre des stories Epic 10 ci-dessus.
- **C2b / tag `v2.0.0`** : hors scope **10.1** (gate terrain) — ne pas bloquer la CI sur C2b.
- **D10** : Epic **12** gelé — ne pas y rattacher des jobs CI « parité legacy ».
- **L0** : exécution autorisée sans HITL supplémentaire (levée partielle D1).

## Acceptance Criteria

Source normative : `_bmad-output/planning-artifacts/epics.md` — **Story 10.1** (traduction exécutable ci-dessous).

1. **Gouvernance exécutable** — Étant donné que l'architecture exige une gouvernance **exécutable** (`core-architectural-decisions.md` § CI/CD ; inventaire **`epics.md` AR18**, **FR73** jalon CI — AR18 complet = Epic **10** au-delà de **10.1**), quand la baseline CI est en place, alors **chaque PR** vers la branche d'intégration canonique (**`master`**) et **chaque push** sur cette branche déclenchent un workflow GitHub Actions qui exécute, sans intervention humaine, au minimum :
   - **Recyclique API** : installation deps + **pytest** sur `recyclique/api/tests/` avec marqueur **`-m "not performance"`** (services **PostgreSQL 17** + **Redis** alignés **10.6d**).
   - **Peintre_nano** : `npm ci` + **`npm run lint`** (`tsc -b`) + **`npm run test`** (Vitest, **incluant** `peintre-nano/tests/contract/`).
   - **Contrats** : au minimum les **tests contractuels Vitest** déjà présents ; plus un **contrôle de régénération** OpenAPI TypeScript (`contracts/openapi` : `npm ci` + `npm run generate` puis **working tree propre** sur `generated/recyclique-api.ts` — politique par défaut **obligatoire** ; toute variante doit être **écrite** dans `doc/ci-minimal.md` **avant** merge, pas en silence) — **sans** maintenir deux snapshots divergents en silence.
   - Le résultat devient la **baseline partagée** documentée (README racine ou `doc/ci-minimal.md` court) pour les contributeurs et le Story Runner.

2. **Dérive contractuelle visible** — Étant donné que le projet dépend d'une évolution **gouvernée** des contrats, **en complément de l'exécution systématique des jobs contrats + Peintre sur chaque PR (AC1)** : quand une PR touche `contracts/**`, `peintre-nano/tests/contract/**`, ou les chemins OpenAPI/CREOS consommés par Peintre, alors la CI **échoue** si les tests contractuels échouent ou si la régénération OpenAPI TS laisse un diff non commité (selon la politique fixée en AC1). **Interdit** : `paths:` / filtres qui n'exécutent les jobs contrats **que** sur ces chemins (contournement AC1). **Ne pas** implémenter ici la preuve bout-en-bout « FastAPI export → YAML reviewable → codegen » (**Story 10.2**) ni la validation **CREOS ↔ operationId** sur tous les manifests (**Story 10.3**).

3. **Industrialisation, pas refonte produit** — Étant donné qu'Epic 10 **industrialise** plutôt qu'il refait le métier, quand **10.1** est fermée, alors le dépôt dispose d'**un** chemin reproductible local **équivalent** aux jobs CI (script shell ou section README avec commandes copiables), et les stories **10.2+** peuvent **s'appuyer** sur cette ossature au lieu de scripts ad hoc.

4. **Branche canonique** — Étant donné que la branche par défaut du dépôt est **`master`** (`origin/HEAD` → `master`) et qu’**aucune** branche `main` / `develop` n’existe sur `origin` (seuls déclencheurs **historiques** dans `deploy.yaml`), quand les workflows sont alignés, alors les déclencheurs `on.push` / `on.pull_request` de la **baseline 10.1** **incluent `master`** ; ne pas laisser `master` sans CI. Ajuster ou retirer les triggers morts `main` / `develop` dans `deploy.yaml` **uniquement** si nécessaire pour éviter une fausse impression de couverture (hors scope deploy prod legacy sauf régression tests — AC5).

5. **Périmètre legacy** — Aucune obligation d'étendre cette baseline à **`recyclique-1.4.4/`** (compose, frontend legacy, scripts historiques). Le job de **déploiement production** legacy dans `deploy.yaml` peut rester **inchangé** sauf si nécessaire pour faire passer les **tests** (hors scope sauf régression évidente).

6. **Qualité API minimale** — En plus du peloton pytest, la CI **10.1** exécute **`python -m compileall src/recyclic_api -q`** et **`python -m ruff check src/recyclic_api`** (jeu **E9** — `pyproject.toml` / story **26.5**) depuis `recyclique/api/`, pour éviter un vert pytest avec syntaxe cassée. **`ruff` n’est pas dans `requirements.txt`** : le job installe au minimum `pip install ruff` (ou `pip install -e ".[dev]"` en local) en plus de `requirements.txt` (+ `requirements-dev.txt` pour pytest).

## Matrice de traçabilité (C12)

| AC | Tâches | Fichiers / artefacts | Gate Story Runner (DS / review) |
|----|--------|----------------------|----------------------------------|
| **1** Gouvernance exécutable | Audit écart CI ; Workflow CI minimale ; Job API ; Job Peintre_nano ; Job contrats ; Doc contributeur | `.github/workflows/ci-minimal.yml` (ou équivalent) ; jobs alignés **10.6d** (PG17, Redis) | Bloc **Gates Story Runner** ci-dessous (API + Peintre + contrats) |
| **2** Dérive contractuelle | Job Peintre_nano (`peintre-nano/tests/contract/`) ; Job contrats (régénération TS) ; Workflow (même pipeline sur **chaque** PR — pas de filtre qui saute les contrats) | `contracts/**` ; `peintre-nano/tests/contract/**` ; `contracts/openapi/generated/recyclique-api.ts` | `npm run test` (Peintre) + `npm run generate` + `git diff --exit-code` |
| **3** Industrialisation locale | Doc contributeur | `README.md` racine **ou** `doc/ci-minimal.md` | Commandes copiables = parité avec le bloc Gates |
| **4** Branche `master` | Audit écart CI ; Workflow CI minimale ; Smoke infra (optionnel) | `.github/workflows/*.yml` déclencheurs ; `tests/infra/test_story_10_1_ci_minimal_smoke.py` (indicatif) | Smoke pytest optionnel ; vérif manuelle triggers `master` |
| **5** Périmètre legacy | Audit écart CI (checklist hors scope) | **Ne pas** étendre la baseline à `recyclique-1.4.4/` ; `deploy.yaml` prod inchangé sauf régression tests | Checklist audit : aucun job 10.1 ne cible le legacy |
| **6** Qualité API minimale | Job API | `recyclique/api/` — `compileall` + `ruff check` (`src/recyclic_api`) | `compileall` + `ruff` + `pytest -m "not performance"` |

**Epic `epics.md` §10.1 (3 AC normatives)** → traduction exécutable : AC epic « pipeline automatisé » = **1+4+6** ; « dérive contrats » = **2** ; « gate reproductible » = **3**.

**Hors AC 10.1 (ne pas tracer comme livrable)** : tâche **Sprint / story** (process BMAD) ; `alembic-check.yml` (existant, migrations seulement).

## Tasks / Subtasks

- [x] **Audit écart CI** — Lister l'état actuel : `.github/workflows/deploy.yaml`, `.github/workflows/alembic-check.yml`, branches déclenchées, étapes manquantes (contrats, ruff, `master`). **Checklist AC5** : confirmer que la baseline **10.1** ne cible pas `recyclique-1.4.4/` et que le deploy prod legacy reste hors refactor sauf régression tests. (AC : 1, 4, 5)
- [x] **Workflow « CI minimale »** — Créer ou refactoriser un workflow dédié (nom explicite, ex. `ci-minimal.yml`) **ou** corriger `deploy.yaml` pour séparer **test** vs **deploy** si cela simplifie la maintenance (**refactor prod `deploy.yaml` limité** : pas de changement des étapes de déploiement legacy hors régression tests). Déclencheurs **`master`** + PR vers **`master`** ; jobs contrats + API + Peintre **obligatoires sur chaque PR** (AC2 satisfait sans path-filter silencieux). **Anti-patte FMEA** : ne pas se limiter à ajouter `master` aux triggers de `deploy.yaml` sans jobs **contrats** + **ruff/compileall** (état actuel = Peintre+pytest seulement). **Anti-abus CI** : sur les trois jobs, **interdit** `continue-on-error: true`, `if:` qui saute le job sur PR/push normaux (dont `[skip ci]` / draft utilisé pour contourner), et commandes alternatives (`vitest … --exclude tests/contract`, pytest sans `-m "not performance"`) — le job Peintre appelle **`npm run test`** tel que défini dans `peintre-nano/package.json` (même entrée que le bloc Gates). Les trois jobs doivent être **requis** pour merge (checks GitHub / doc `doc/ci-minimal.md`). (AC : 1, 2, 4)
- [x] **Job API** — Postgres **17** + Redis ; `pip install -r requirements.txt -r requirements-dev.txt` **et** `pip install ruff` (ou `pip install -e ".[dev]"`) ; `compileall` + `ruff check` + `pytest -m "not performance"`. Réutiliser variables d'env déjà présentes dans `deploy.yaml` (`DATABASE_URL`, `TEST_DATABASE_URL`, `REDIS_URL`). (AC : 1, 6)
- [x] **Job Peintre_nano** — Cache `package-lock.json` ; `npm ci` ; `lint` + **`npm run test`** (**incl.** `peintre-nano/tests/contract/` via `vitest.config.ts` — ne pas ajouter de script CI parallèle qui exclut `tests/contract/` ; gouvernance OpenAPI/CREOS déjà couverte par Vitest, pas la validation manifest ↔ `operationId` **10.3**). (AC : 1, 2)
- [x] **Job contrats** — `cd contracts/openapi && npm ci && npm run generate` ; vérifier que `generated/recyclique-api.ts` est à jour (`git diff --exit-code` ou équivalent). Les tests Vitest contractuels restent dans le job Peintre. (AC : 1, 2)
- [x] **Doc contributeur** — Section courte : prérequis, commandes locales identiques à la CI, lien vers `recyclique/api/tests/README.md` et `peintre-nano/tests/contract/README.md` ; documenter la **baseline partagée** exigée par AC1 ; checklist **protection branche `master`** (reviews + statuts requis = jobs `ci-minimal`) et rappel séquence **10.1→10.2→10.3** avant module **D** (D2/D7 — pas de gate CI pour D dans cette story). (AC : 1, 3)
- [x] **Smoke verrou infra (optionnel mais recommandé)** — Ajouter `tests/infra/test_story_10_1_ci_minimal_smoke.py` (pattern **10.6d**, voir `test_story_10_6c_pg17_doc_smoke.py`) : assert workflow **10.1** référence `master` et chemins canoniques. (AC : 4)
- [x] **Sprint / story** — Après DS : mettre à jour ce fichier (Dev Agent Record, File List) et `sprint-status.yaml` (**review** → **done** via Story Runner). (process BMAD)

## Dev Notes

### Frontières avec 10.2 et 10.3 (ne pas déborder)

| Sujet | **10.1 (cette story)** | **10.2** | **10.3** |
|--------|-------------------------|----------|----------|
| OpenAPI | Régénération TS + tests Vitest gouvernance ; pas de double snapshot silencieux | Preuve **chaîne unique** FastAPI → `generated/` → `recyclique-api.yaml` → codegen Peintre | — |
| CREOS | Tests schéma / gouvernance déjà dans Vitest | — | Validation manifests + **operation_id** ↔ OpenAPI + smoke rendu |
| Perf API | Exclure `performance` du job PR | — | — |
| e2e navigateur | Non requis (Vitest e2e existants suffisent pour la baseline) | — | Smoke rendu modules critiques |

### Modes de défaillance ciblés (FMEA — CI & contrats)

| ID | Composant | Mode de défaillance | Effet | S | Détection | Mitigation testable (cette story) |
|----|-----------|---------------------|-------|---|-----------|-----------------------------------|
| FM1 | Branche `master` | Merge/push sur `master` sans workflow (écart actuel `deploy.yaml`) | Régression non détectée sur intégration canonique | 9 | Smoke infra optionnel ; revue triggers YAML | AC4 + tâche Workflow ; smoke `test_story_10_1_ci_minimal_smoke.py` |
| FM2 | Workflow | Seuls `main`/`develop` testés ; équipe habituée au vert legacy | Fausse confiance ; `master` rouge en silence | 8 | Audit écart CI | Workflow dédié + triggers `master` ; doc protection branche |
| FM3 | Contrats | `paths:` limité à `contracts/**` — jobs contrats absents sur PR doc-only | Dérive OpenAPI/TS non vue | 8 | Review workflow YAML | AC2 interdit filtres ; jobs **chaque** PR |
| FM4 | Peintre vs contrats | Job `generate` vert, Vitest `tests/contract/` non exécuté (job Peintre sauté/cassé) | Divergence gouvernance Peintre / snapshot TS | 7 | Échec job Peintre en CI | AC1 : `npm run test` inclut contrats ; 3 jobs requis merge |
| FM5 | AR18 (`epics.md`) | Scope creep : e2e navigateur, CREOS manifest, smoke rendu livrés en 10.1 | Surcharge story ; 10.2/10.3 vidées | 6 | Revue AC vs inventaire AR18 | Table ci-dessus + AC1 (AR18 **complet** = Epic 10 au-delà de 10.1) |
| FM6 | Pilotage D2/D7 | Module **D** ou **9.7+** avant fermeture **10.3** | Plancher L0 contourné | 7 | `sprint-status.yaml` / PO | Décisions Ombre § séquence ; checklist doc (pas job CI D) |
| FM7 | Peintre / contrats | Script CI ou `package.json` qui exclut `tests/contract/` ; `vitest.config.ts` retirant `tests/contract/**` | Vert CI sans gouvernance OpenAPI/CREOS | 8 | Échec job Peintre ; revue diff workflow + scripts npm | Job Peintre = `npm run test` ; config Vitest inclut `tests/contract/**` (état repo) |
| FM8 | Scope creep Epic 10 | Lecture `epics.md` note agents → Spectral, CREOS `operationId`, e2e navigateur ou lint hooks métier livrés en **10.1** | Surcharge ; 10.2/10.3 vidées | 6 | Revue AC vs tableau frontières | Hors scope explicite + garde-fous Peintre ; FM5 |

**Découpage AR18 (inventaire `epics.md` L180)** — couverture **10.1** uniquement : `recyclique` pytest+ruff+compileall ; `peintre-nano` lint+tests (dont contrats Vitest) ; contrats = régénération TS + diff + tests existants. **Reporté** : chaîne OpenAPI reviewable (**10.2**), validation CREOS/`operationId` + smoke rendu (**10.3**), e2e navigateur dédié hors baseline PR.

### État actuel du dépôt (intelligence CS)

- **Workflows** : `deploy.yaml` (tests rapides + deploy legacy sur `main` uniquement pour tests complets perf) ; `alembic-check.yml` (PR migrations seulement).
- **Branche** : **`master`** = intégration (`origin/HEAD`) ; **`main` / `develop`** = absents sur `origin` — triggers `deploy.yaml` = dette YAML, pas branches actives ; baseline **`ci-minimal.yml`** déclenche API + Peintre + contrats sur **`master`** (livraison DS 2026-09-21).
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
- **Anti-abus hooks / Nano (10.1)** : cette story **n’ajoute pas** de nouveaux tests `peintre-nano/tests/unit/**` ou `tests/e2e/**` sur permissions, parcours métier ou hooks `src/domains/**` (signaux rouges checklist §2–3, §8) ; la baseline PR reste **lint + Vitest existant** (dont `tests/contract/`). Pas de gate CI nouvelle type ESLint « hooks métier » ni Spectral/CREOS manifest complet (**10.2–10.3**).
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

Couverture AC : **1–4, 6** via commandes ci-dessous ; **AC5** = checklist audit (pas de commande legacy canonique).

```bash
# Racine dépôt — adapter si script unique ajouté
cd peintre-nano && npm ci && npm run lint && npm run test
cd ../contracts/openapi && npm ci && npm run generate && git diff --exit-code generated/recyclique-api.ts
cd ../../recyclique/api && pip install -r requirements.txt -r requirements-dev.txt && pip install ruff
python -m compileall src/recyclic_api -q
python -m ruff check src/recyclic_api
python -m pytest tests/ -m "not performance" --tb=short
# Optionnel : pytest tests/infra/test_story_10_6c_pg17_doc_smoke.py -q
```

**Services locaux :** suivre `recyclique/api/tests/README.md` (Postgres **17**, base `recyclic_test`, Redis) — **ne pas** documenter `recyclique-1.4.4/api/run_tests.sh` comme chemin canonique v2.

### Intelligence git récente

- Livraison **10.1** (DS 2026-09-21) : workflow **`ci-minimal.yml`** + `doc/ci-minimal.md` + smoke infra — comble l'écart **master** + **contrats** + **ruff/compileall** (après spikes **10.6d** PG17).

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

Composer 2.5 (Amelia · bmad-dev-story)

### Debug Log References

- Audit : `deploy.yaml` = Peintre+pytest sur `main`/`develop` uniquement ; pas de contrats/ruff/`master`. `alembic-check.yml` = PG17, hors baseline PR complète.
- Livraison : workflow dédié `ci-minimal.yml` (3 jobs parallèles, sans `paths:`) ; note 10.1 dans `deploy.yaml` (prod inchangé).

### Completion Notes List

- ✅ AC1–4, 6 : `.github/workflows/ci-minimal.yml` + `doc/ci-minimal.md` + lien README ; smoke `tests/infra/test_story_10_1_ci_minimal_smoke.py` (4 tests verts). **Note cohérence** : le job Peintre exécute `npm run test` complet — échecs **bandeau-live** préexistants (CR defer) rendent la baseline **rouge** tant qu'ils ne sont pas corrigés (**hors scope 10.1**), sans invalider la définition du workflow.
- ✅ AC5 : aucun job 10.1 sur `recyclique-1.4.4/` ; étapes deploy prod intactes.
- Tests locaux DS : contrats OpenAPI `generate` + diff OK ; Peintre `lint` OK ; Vitest `tests/contract/` 97/97 ; `compileall` + `ruff` OK ; peloton API pytest non exécuté ici (pas de Postgres/Redis sur l’agent cloud). `npm run test` complet Peintre : 3 échecs bandeau-live (fetch count) — préexistants, hors diff 10.1.
- `sprint-status.yaml` : story **review**.

### File List

- `.github/workflows/ci-minimal.yml` (nouveau)
- `.github/workflows/deploy.yaml` (commentaire 10.1)
- `doc/ci-minimal.md` (nouveau)
- `README.md` (section CI minimale)
- `tests/infra/test_story_10_1_ci_minimal_smoke.py` (nouveau)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/10-1-outiller-la-ci-minimale-pour-recyclique-peintre-nano-et-les-contrats.md`

### Risques résiduels et notes VS (QA3 · run `20260921_161439_jarvos_recyclique`)

Dettes **Info** non bloquantes — clôture intégrale par documentation (aucun P0/P1 ouvert). Le **DS** ne doit pas rouvrir ces points comme scope obligatoire sauf décision PO explicite.

| Sujet | Clôture QA3 | Mitigation / report |
|--------|-------------|---------------------|
| Smoke infra **`tests/infra/test_story_10_1_ci_minimal_smoke.py`** | **Fermé** (livrée) | Verrou YAML optionnel livré (AC4 / FM1) ; durcissement asserts (Redis, deps API) = amélioration continue, pas blocage VS |
| **`deploy.yaml`** triggers **`main`/`develop`** vs **`master`** | **Fermé** (doc) | AC4 + Dev Notes : dette YAML historique ; livraison **10.1** = workflow **`ci-minimal`** sur **`master`** ; ajuster triggers legacy **uniquement** si fausse couverture (AC4), sans refonte deploy prod (AC5) |
| **AR18** / **FR73** (inventaire epic complet) | **Fermé** (doc) | AC1 : jalon CI **10.1** seulement ; FM5 + découpage AR18 — chaîne OpenAPI reviewable (**10.2**), CREOS/`operationId` + smoke rendu (**10.3**), e2e navigateur dédié |
| **Branch protection** GitHub (required checks) | **Reporté** (HITL org) | Tâche Doc : checklist protection **`master`** (reviews + jobs `ci-minimal`) — réglage **hors repo** |
| PR **fork** / **`workflow_dispatch`** seul | **Fermé** (doc) | AC1 : PR/push branche d'intégration canonique ; contournements org (secrets, politique fork) = gouvernance GitHub, pas AC story |
| **`alembic-check.yml`** (path migrations) | **Fermé** (doc) | Matrice C12 : hors périmètre AC **10.1** ; compatible si **`ci-minimal`** exécute API + Peintre + contrats sur **chaque** PR (AC2) |
| **Hooks métier** Peintre (`src/domains/**`, tests unit/e2e métier) | **Fermé** (doc) | Garde-fous Peintre + FM7/FM8 : CI **10.1** = lint + Vitest existant (dont `tests/contract/`) ; audit hooks / ESLint métier = **10.3** + checklist PR humaine |

**VS (validate-create-story)** : structure, AC, traçabilité C12, FMEA et garde-fous anti-abus CI validés QA3 adversarial — **quality ≥ 95**, **0 P0 / 0 P1** post-boucle. Prochaine étape BMAD : **DS** (`bmad-dev-story`) — pas de re-pass CS sans changement de périmètre epic.

## Story completion status

- **CS :** fichier story créé — **ready-for-dev** (2026-09-21)
- **VS :** validate-create-story (Bob SM) — **PASS** (2026-09-21) ; checklist sans écart bloquant ; QA3 gate **96** — risques résiduels documentés ci-dessus
- **DS :** Amelia — **review** (2026-09-21) ; workflow `ci-minimal.yml` + doc + smoke infra
- **Prochaine étape BMAD :** **code-review** puis **QA3** (coordinateur) ; `sprint-status` **done** via Story Runner après gates

### Review Findings (CR Amelia · 2026-09-21)

- [x] [Review][Patch] Postgres CI : ajouter `POSTGRES_DB: recyclic_test` au service du job `api-minimal` [`.github/workflows/ci-minimal.yml`] — **corrigé en CR** (+ assert smoke)
- [x] [Review][Defer] Peloton Peintre `npm run test` : 3 échecs + erreurs mock/fetch (bandeau-live, presence) — **préexistant**, hors diff `ab9dfff` ; baseline CI rouge tant que non corrigé — deferred, pre-existing
- [x] [Review][Defer] Triggers `main`/`develop` dans `deploy.yaml` — dette historique ; couverture `master` via `ci-minimal` — deferred, pre-existing
