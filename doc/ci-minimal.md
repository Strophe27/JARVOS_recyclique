# CI minimale (baseline Epic 10 — story 10.1)

Pipeline GitHub Actions : [`.github/workflows/ci-minimal.yml`](../.github/workflows/ci-minimal.yml).

**Branche d'intégration canonique :** `master` (`origin/HEAD`). Chaque **pull request** vers `master` et chaque **push** sur `master` déclenchent **trois jobs obligatoires** (sans filtre `paths:`) :

| Job workflow | Rôle |
|--------------|------|
| `api-minimal` | PostgreSQL **17** + Redis ; `compileall` + `ruff check` + `pytest -m "not performance"` |
| `peintre-nano-minimal` | `npm ci` ; `npm run lint` ; `npm run test` (inclut `peintre-nano/tests/contract/`) |
| `contracts-openapi` | `npm ci` + `npm run generate` ; working tree propre sur `generated/recyclique-api.ts` |

Politique par défaut : tout changement OpenAPI doit régénérer et **committer** `contracts/openapi/generated/recyclique-api.ts`. Toute variante doit être documentée **ici** avant merge.

**Hors périmètre 10.1 :** `recyclique-1.4.4/` ; déploiement prod legacy ([`deploy.yaml`](../.github/workflows/deploy.yaml)) ; chaîne FastAPI → YAML reviewable (**10.2**) ; validation CREOS `operationId` complète (**10.3**).

**Séquence plancher L0 :** **10.1 → 10.2 → 10.3** avant tout module métier **D** (pilotage PO D2/D7).

## Prérequis locaux

- **Node.js 20** + npm (Peintre_nano, contrats OpenAPI)
- **Python** (version `recyclique/api/.python-version`)
- **PostgreSQL 17** et **Redis** pour les tests API — voir [`recyclique/api/tests/README.md`](../recyclique/api/tests/README.md) (base `recyclic_test`, pas le script legacy `recyclique-1.4.4/api/run_tests.sh`)

Installer `ruff` en local : `pip install ruff` (non listé dans `requirements.txt` ; la CI l'installe explicitement).

## Commandes locales (parité gates Story Runner)

Depuis la racine du dépôt :

```bash
cd peintre-nano && npm ci && npm run lint && npm run test
cd ../contracts/openapi && npm ci && npm run generate && git diff --exit-code generated/recyclique-api.ts
cd ../../recyclique/api && pip install -r requirements.txt -r requirements-dev.txt && pip install ruff
python -m compileall src/recyclic_api -q
python -m ruff check src/recyclic_api
python -m pytest tests/ -m "not performance" --tb=short
```

Tests contractuels Peintre (détail) : [`peintre-nano/tests/contract/README.md`](../peintre-nano/tests/contract/README.md).

Smoke infra optionnel (verrou YAML) :

```bash
python -m pytest tests/infra/test_story_10_1_ci_minimal_smoke.py -q
```

## Protection de branche `master` (organisation GitHub)

Réglage **hors dépôt** : activer les reviews et exiger le succès des jobs **`CI minimale (Recyclique · Peintre_nano · contrats)`** (`api-minimal`, `peintre-nano-minimal`, `contracts-openapi`) avant merge.

Workflow migrations Alembic (chemins `migrations/` uniquement) : [`.github/workflows/alembic-check.yml`](../.github/workflows/alembic-check.yml) — complémentaire, pas substitut à la baseline 10.1.
