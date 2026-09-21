# CI minimale (baseline Epic 10 — stories 10.1 + 10.2 + 10.3)

Pipeline GitHub Actions : [`.github/workflows/ci-minimal.yml`](../.github/workflows/ci-minimal.yml).

**Branche d'intégration canonique :** `master` (`origin/HEAD`). Chaque **pull request** vers `master` et chaque **push** sur `master` déclenchent **trois jobs obligatoires** (sans filtre `paths:`) :

| Job workflow | Rôle |
|--------------|------|
| `api-minimal` | PostgreSQL **17** + Redis ; `compileall` + `ruff check` + `pytest -m "not performance"` |
| `peintre-nano-minimal` | `npm ci` ; `npm run lint` ; `npm run test` (inclut `peintre-nano/tests/contract/`) |
| `contracts-openapi` | Export FastAPI (`generate_openapi.py --emit-contracts`) ; `npm ci` + `npm run generate` ; working tree propre sur `generated/openapi-snapshot.json`, `recyclique-api.yaml`, `generated/recyclique-api.ts` |

Politique par défaut : tout changement d’API backend doit régénérer et **committer** la chaîne complète (snapshot JSON, YAML reviewable aligné, types TS). Détail : [`contracts/README.md`](../contracts/README.md) § chaîne OpenAPI.

**Story 10.2 (intégrée) :** le job `contracts-openapi` ci-dessus exécute la chaîne FastAPI → `generated/openapi-snapshot.json` → `recyclique-api.yaml` → `generated/recyclique-api.ts` (voir [`contracts/README.md`](../contracts/README.md)).

**Hors périmètre Epic 10 :** `recyclique-1.4.4/` ; déploiement prod legacy ([`deploy.yaml`](../.github/workflows/deploy.yaml)).

## Story 10.3 — manifests CREOS + smoke rendu (intégrée)

Le job **`peintre-nano-minimal`** exécute `npm run test`, qui inclut désormais :

- **Gate globale CREOS** : `peintre-nano/tests/contract/creos-manifests-governance-10-3.test.ts` (structure, schéma widget sur les catalogues, bundle servi `navigation-transverse-served.json`, crosswalk `operation_id` ↔ `recyclique-api.yaml`).
- **Smoke rendu jsdom (NFR28)** : `peintre-nano/tests/smoke/creos-critical-render-paths-10-3.test.tsx` (login public, dashboard, bandeau live, caisse nominale, réception nominale).

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

**Dette connue (hors smoke / contract 10.3)** : certains tests **bandeau-live** legacy sous `tests/e2e/` ou `tests/unit/` peuvent rester rouges — defer stories **10.1** / correctifs dédiés ; ne pas bloquer la livraison 10.3 sur `npm run test` global si les gates ci-dessus sont verts.

**Séquence plancher L0 :** **10.1 → 10.2 → 10.3** avant tout module métier **D** (pilotage PO D2/D7).

## Prérequis locaux

- **Node.js 20** + npm (Peintre_nano, contrats OpenAPI)
- **Python** (version `recyclique/api/.python-version`)
- **PostgreSQL 17** et **Redis** pour les tests API — voir [`recyclique/api/tests/README.md`](../recyclique/api/tests/README.md) (base `recyclic_test`, pas le script legacy `recyclique-1.4.4/api/run_tests.sh`)

Installer `ruff` en local : `pip install ruff` (non listé dans `requirements.txt` ; la CI l'installe explicitement).

## Commandes locales (parité gates Story Runner)

Depuis la racine du dépôt :

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
