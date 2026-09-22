# CI minimale (baseline Epic 10 — stories 10.1 + 10.2 + 10.3 + 10.4 + 10.5 + 10.6 doc)

Pipeline GitHub Actions : [`.github/workflows/ci-minimal.yml`](../.github/workflows/ci-minimal.yml).

**Branche d'intégration canonique :** `master` (`origin/HEAD`). Chaque **pull request** vers `master` et chaque **push** sur `master` déclenchent **trois jobs obligatoires** (sans filtre `paths:`) :

| Job workflow | Rôle |
|--------------|------|
| `api-minimal` | PostgreSQL **17** + Redis ; `compileall` + `ruff check` ; **`pytest critical core peloton`** (10.4) ; **smokes observabilité 10.5** ; guard manifeste 10.5 ; `pytest -m "not performance"` |
| `peintre-nano-minimal` | `npm ci` ; `npm run lint` ; gates **10.3** (governance CREOS + smoke rendu) ; **`npm run test:critical-core`** (10.4) ; `npm run test` intégral (**non bloquant** — dette bandeau-live **10.1**) |
| `contracts-openapi` | Export FastAPI (`generate_openapi.py --emit-contracts`) ; `npm ci` + `npm run generate` ; working tree propre sur `generated/openapi-snapshot.json`, `recyclique-api.yaml`, `generated/recyclique-api.ts` |

Politique par défaut : tout changement d’API backend doit régénérer et **committer** la chaîne complète (snapshot JSON, YAML reviewable aligné, types TS). Détail : [`contracts/README.md`](../contracts/README.md) § chaîne OpenAPI.

**Story 10.2 (intégrée) :** le job `contracts-openapi` ci-dessus exécute la chaîne FastAPI → `generated/openapi-snapshot.json` → `recyclique-api.yaml` → `generated/recyclique-api.ts` (voir [`contracts/README.md`](../contracts/README.md)).

**Hors périmètre Epic 10 :** `recyclique-1.4.4/` ; déploiement prod legacy ([`deploy.yaml`](../.github/workflows/deploy.yaml)).

## Story 10.3 — manifests CREOS + smoke rendu (intégrée)

Le job **`peintre-nano-minimal`** exécute en étapes **bloquantes** nommées (avant le peloton métier **10.4**) :

- **Gate globale CREOS** : `peintre-nano/tests/contract/creos-manifests-governance-10-3.test.ts` (structure, schéma widget sur les catalogues, bundle servi `navigation-transverse-served.json`, crosswalk `operation_id` ↔ `recyclique-api.yaml`).
- **Smoke rendu jsdom (NFR28)** : `peintre-nano/tests/smoke/creos-critical-render-paths-10-3.test.tsx` (login public, dashboard, bandeau live, caisse nominale, réception nominale).

`npm run test` intégral reste lancé en fin de job pour couvrir le reste de la suite Vitest, mais avec **`continue-on-error: true`** tant que la dette **bandeau-live** (**10.1**) n’est pas résolue (voir §10.4).

Périmètre manifests reviewables : [`contracts/creos/manifests/README.md`](../contracts/creos/manifests/README.md).

Commandes locales (parité gates Story Runner 10.3) :

```bash
cd peintre-nano && npm ci
npx vitest run tests/contract/creos-manifests-governance-10-3.test.ts
npx vitest run tests/contract/
npx vitest run tests/smoke/creos-critical-render-paths-10-3.test.tsx
```

Smoke infra optionnel (verrou YAML workflow + doc) :

```bash
python -m pytest tests/infra/test_story_10_3_ci_minimal_creos_smoke.py -q
```

**Dette connue (hors smoke / contract 10.3)** : certains tests legacy Peintre (ex. **bandeau-live** sous `tests/e2e/` ou `tests/unit/`, parfois `live-activity-presence-bridge`) peuvent rester rouges — defer stories **10.1** / correctifs dédiés.

- **Revue story 10.3 / gates CREOS** : les commandes ciblées ci-dessus (governance 10.3 + smoke 10.3) suffisent pour valider le périmètre 10.3.
- **Merge sur `master` via CI** : les gates **10.3** + **`test:critical-core` (10.4)** sont **bloquantes** ; l’échec de `npm run test` intégral **ne bloque plus** le job tant que l’arbitrage §10.4 est en vigueur.

**Séquence plancher L0 :** **10.1 → 10.2 → 10.3 → 10.4** avant tout module métier **D** (pilotage PO D2/D7).

## Story 10.4 — peloton critical core (intégrée)

Manifeste et doc humaine : [`doc/critical-core-peloton.yaml`](../critical-core-peloton.yaml), [`doc/critical-core-peloton.md`](../critical-core-peloton.md).

| Couche | Commande locale | CI (`ci-minimal.yml`) |
|--------|-----------------|------------------------|
| Garde-fou manifeste | `python3 -m pytest tests/infra/test_story_10_4_critical_core_peloton_guard.py -q` | (maintenance dépôt) |
| API peloton | `cd recyclique/api && bash scripts/run_critical_core_peloton.sh` | `api-minimal` → **pytest critical core peloton** (avant pytest complet) |
| Peintre peloton | `cd peintre-nano && npm run test:critical-core` | `peintre-nano-minimal` → étape **Peloton métier critical core (10.4)** |

**Arbitrage dette 10.1 (bandeau-live)** : `npm run test` dans `peintre-nano-minimal` utilise `continue-on-error: true`. Les étapes **bloquantes** restent : lint ; governance CREOS **10.3** ; smoke rendu **10.3** ; **`npm run test:critical-core`**. Ne pas retirer les gates **10.3** au profit du seul peloton métier.

Smoke infra recommandé :

```bash
python3 -m pytest tests/infra/test_story_10_4_ci_minimal_critical_core_smoke.py -q
```

## Story 10.5 — observabilité support (intégrée)

Manifeste et runbook : [`doc/observability-critical-flows.yaml`](./observability-critical-flows.yaml), [`doc/observability-support-runbook.md`](./observability-support-runbook.md).

| Ordre CI | Couche | Commande locale | CI (`ci-minimal.yml` → `api-minimal`) |
|----------|--------|-----------------|----------------------------------------|
| 1 (après peloton **10.4**) | Corrélation HTTP peloton | `cd recyclique/api && python3 -m pytest tests/test_story_10_5_http_correlation_peloton.py -q` | étape **pytest observability smokes (10.5)** |
| 2 | Fil sync support | `cd recyclique/api && python3 -m pytest tests/test_story_10_5_sync_support_trail_smoke.py -q` | idem (même étape, séquence HTTP puis sync) |
| 3 | Guard manifeste | `python3 -m pytest tests/infra/test_story_10_5_observability_manifest_guard.py -q` | étape **observability manifest guard (10.5)** |

**Frontière FM3 :** ne pas enregistrer les tests **10.5** dans `doc/critical-core-peloton.yaml` ni `scripts/run_critical_core_peloton.sh` — le peloton **10.4** reste la barrière métier.

Smoke infra recommandé :

```bash
python3 -m pytest tests/infra/test_story_10_5_ci_minimal_observability_smoke.py -q
```

## Story 10.6 — documentation install stack officielle

Manifeste et guide humain : [`doc/supported-stack-official.yaml`](./supported-stack-official.yaml), [`doc/installation-stack-officielle.md`](./installation-stack-officielle.md).

| Couche | Commande locale | CI (`ci-minimal.yml`) |
|--------|-----------------|------------------------|
| Smoke doc install | `python3 -m pytest tests/infra/test_story_10_6_installation_doc_smoke.py -q` | (maintenance dépôt — non enregistré dans le peloton **10.4**) |
| Smoke §10.6 ci-minimal | `python3 -m pytest tests/infra/test_story_10_6_installation_ci_minimal_smoke.py -q` | idem |

**Frontière FM3 :** ne pas modifier les smokes **10.6c** / **10.6e** existants sauf lien cassé ; ne pas ajouter les smokes **10.6** dans `doc/critical-core-peloton.yaml` ni `run_critical_core_peloton.sh`.

Régression PG17 (inchangée) :

```bash
python3 -m pytest tests/infra/test_story_10_6c_pg17_doc_smoke.py -q
python3 -m pytest tests/infra/test_story_10_6e_pg17_backend_smoke.py -q
```

## Story 10.7 — gates release beta / G-plancher / G-vendable

Manifeste et guide humain : [`doc/release-gates-official.yaml`](./release-gates-official.yaml), [`doc/release-gates-beta-et-vendable.md`](./release-gates-beta-et-vendable.md) (critères figés : [`doc/release-gates-criterion-ids.yaml`](./release-gates-criterion-ids.yaml)).

| Couche | Commande locale | CI (`ci-minimal.yml`) |
|--------|-----------------|------------------------|
| Smoke doc gates | `python3 -m pytest tests/infra/test_story_10_7_release_gates_doc_smoke.py -q` | (maintenance dépôt — non enregistré dans le peloton **10.4**, même pattern que **10.6**) |
| Smoke §10.7 ci-minimal | `python3 -m pytest tests/infra/test_story_10_7_release_gates_ci_minimal_smoke.py -q` | idem |

**Frontière FM3 :** ne pas ajouter les smokes **10.7** dans `doc/critical-core-peloton.yaml` ni `run_critical_core_peloton.sh`. **C2b** reste `not_signed` dans le manifeste — pas de tag **`v2.0.0`** ni essai prod dans cette story.

**Choix DS 10.7 :** pas de step workflow supplémentaire (les smokes **10.6** install ne sont pas dans `ci-minimal.yml` non plus) ; §10.7 + smokes verts localement pour **review**.

## Story 10.8 — readiness globale v2 (go/no-go)

Manifeste et déclaration humaine : [`doc/v2-global-readiness-official.yaml`](./v2-global-readiness-official.yaml), [`doc/v2-global-readiness-go-no-go.md`](./v2-global-readiness-go-no-go.md) (gates **10.7** : [`release-gates-official.yaml`](./release-gates-official.yaml)).

| Couche | Commande locale | CI (`ci-minimal.yml`) |
|--------|-----------------|------------------------|
| Smoke doc readiness | `python3 -m pytest tests/infra/test_story_10_8_global_readiness_doc_smoke.py -q` | (maintenance dépôt — même pattern que **10.7**) |
| Smoke §10.8 ci-minimal | `python3 -m pytest tests/infra/test_story_10_8_global_readiness_ci_minimal_smoke.py -q` | idem |

**Frontière :** ne pas ajouter les smokes **10.8** dans `doc/critical-core-peloton.yaml`. **C2b** reste `not_signed` — pas de tag **`v2.0.0`** ; **`10-1`** reste **`review`** (pas promotion au DS). Verdicts **G-plancher**, **beta interne** et **G-vendable** restent **distincts** dans le manifeste readiness.

**Choix DS 10.8 :** pas de step workflow supplémentaire ; §10.8 + smokes verts localement pour **review**.

## Prérequis locaux

- **Node.js 20** + npm (Peintre_nano, contrats OpenAPI)
- **Python** (version `recyclique/api/.python-version`)
- **PostgreSQL 17** et **Redis** pour les tests API — voir [`recyclique/api/tests/README.md`](../recyclique/api/tests/README.md) (base `recyclic_test`, pas le script legacy `recyclique-1.4.4/api/run_tests.sh`)

Installer `ruff` en local : `pip install ruff` (non listé dans `requirements.txt` ; la CI l'installe explicitement).

## Commandes locales (parité gates Story Runner)

**Peloton merge (10.3 + 10.4, bloquant en CI)** — avant la suite API complète ou `npm run test` intégral (non bloquant si dette **10.1**) :

```bash
cd peintre-nano && npm ci && npm run lint
npx vitest run tests/contract/creos-manifests-governance-10-3.test.ts
npx vitest run tests/smoke/creos-critical-render-paths-10-3.test.tsx
npm run test:critical-core
cd ../recyclique/api && bash scripts/run_critical_core_peloton.sh
```

Depuis la racine du dépôt (chaîne OpenAPI + pytest API complet) :

```bash
cd recyclique/api && pip install -r requirements.txt -r requirements-dev.txt
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recyclic_test
export REDIS_URL=redis://localhost:6379
export SECRET_KEY=local-openapi-export
python generate_openapi.py --emit-contracts
cd ../../contracts/openapi && npm ci && npm run generate
git diff --exit-code generated/openapi-snapshot.json recyclique-api.yaml generated/recyclique-api.ts
cd ../../peintre-nano && npm ci && npm run lint && npm run test
cd ../recyclique/api && pip install ruff
python -m compileall src/recyclic_api -q
python -m ruff check src/recyclic_api
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recyclic_test
export TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recyclic_test
export REDIS_URL=redis://localhost:6379
python -m pytest tests/ -m "not performance" --tb=short
```

Tests contractuels Peintre (détail) : [`peintre-nano/tests/contract/README.md`](../peintre-nano/tests/contract/README.md).

Smoke infra optionnel (verrou YAML) :

```bash
python -m pytest tests/infra/test_story_10_1_ci_minimal_smoke.py tests/infra/test_story_10_2_openapi_chain_ci_smoke.py -q
```

Tests drift chaîne OpenAPI (API) :

```bash
cd recyclique/api && python -m pytest tests/test_story_10_2_openapi_chain_fastapi_vs_reviewable_yaml.py -q
```

## Protection de branche `master` (organisation GitHub)

Réglage **hors dépôt** : activer les reviews et exiger le succès des jobs **`CI minimale (Recyclique · Peintre_nano · contrats)`** (`api-minimal`, `peintre-nano-minimal`, `contracts-openapi`) avant merge.

Workflow migrations Alembic (déclenché sur `recyclique/api/migrations/versions/**`, `recyclique/api/alembic.ini`, `.github/workflows/alembic-check.yml`) : [`.github/workflows/alembic-check.yml`](../.github/workflows/alembic-check.yml) — complémentaire, pas substitut à la baseline Epic 10 (10.1 + 10.2).
