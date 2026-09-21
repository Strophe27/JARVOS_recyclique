# Peloton critical core (Story 10.4)

Manifeste machine : [`critical-core-peloton.yaml`](./critical-core-peloton.yaml).

Couverture **ciblée** sur quatre parcours critiques (Epic 10 — Story 10.4). Objectif : signaler les régressions sur la colonne vertébrale produit **sans** exécuter tout le backlog de tests ni dupliquer les gates **10.3** (CREOS structure + smoke rendu).

Référence opérationnelle : [`references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md`](../references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md) (ligne **10.4**).

Audit utile (pas de gate % couverture) : [`references/consolidation-1.4.5/2026-03-23_audit-backend-tests-1.4.4.md`](../references/consolidation-1.4.5/2026-03-23_audit-backend-tests-1.4.4.md).

## Quatre cibles (Story Preparation Gate)

| Clé `targets` | Parcours | Profondeur 10.4 | Peintre (Vitest) | API (pytest `path::test`) |
|---------------|----------|-----------------|------------------|---------------------------|
| `module_chain` | Chaîne module / shell servi | Contrat CREOS bundle + e2e montage `App` ; enveloppe contexte nav | `navigation-transverse-served-5-1.test.ts`, `runtime-demo-compose.e2e.test.tsx` | `test_context_envelope` (2 tests fermés) |
| `caisse_nominal` | Vente bornée 6.1 | e2e jsdom + intégration API création vente | `cashflow-nominal-6-1.e2e.test.tsx` | `TestSalesIntegration::test_create_sale_success` |
| `reception_nominal` | Ticket borné 7.1 | e2e jsdom + happy path API | `reception-nominal-7-1.e2e.test.tsx` | `test_reception_happy_path` |
| `sync_sensitive` | Clôture / outbox / Paheko 8.1 | Intégration API (mock HTTP) — pas de navigateur réel | — | 4 sélecteurs nommés dans le YAML (`test_story_8_1_paheko_outbox_slice.py`) |

Stories d’origine : **5.1** / **3.7** (chaîne module), **6.1** (caisse), **7.1** (réception), **8.1** (sync).

## Frontière 10.3 ↔ 10.4

| Couche | Story | Exemples |
|--------|-------|----------|
| Gouvernance CREOS + smoke rendu jsdom (NFR28) | **10.3** | `creos-manifests-governance-10-3.test.ts`, `creos-critical-render-paths-10-3.test.tsx` |
| Parcours métier e2e/contract + API nommés ci-dessus | **10.4** | `npm run test:critical-core`, script API peloton |

Ne pas traiter les smokes **10.3** comme « couverture métier » du peloton 10.4.

## Commandes locales (gates Story Runner 10.4)

Prérequis API : PostgreSQL + Redis, variables `DATABASE_URL` / `TEST_DATABASE_URL` / `REDIS_URL` (voir [`recyclique/api/tests/README.md`](../recyclique/api/tests/README.md)).

```bash
# 1) Garde-fou manifeste (racine dépôt)
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recyclic_test
export TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recyclic_test
export REDIS_URL=redis://localhost:6379
python3 -m pytest tests/infra/test_story_10_4_critical_core_peloton_guard.py -q

# 2) Peloton API
cd recyclique/api && bash scripts/run_critical_core_peloton.sh

# 3) Peloton Peintre
cd ../../peintre-nano && npm ci && npm run test:critical-core
```

Filtre optionnel (marqueur déclaré, peloton piloté par le manifeste) :

```bash
cd recyclique/api && python3 -m pytest -m critical_core --tb=short
```

## CI

Parité documentée dans [`doc/ci-minimal.md`](./ci-minimal.md) §10.4.

Smoke infra (workflow + doc) :

```bash
python3 -m pytest tests/infra/test_story_10_4_ci_minimal_critical_core_smoke.py -q
```

## Hors scope

Pourcentage de couverture / `pytest-cov` seuil ; Spectral OpenAPI ; Puppeteer nouveau ; `recyclique-1.4.4/` ; parité legacy Epic 12 ; tests `-m performance` ; correction globale dette **bandeau-live** (reste **10.1**).
