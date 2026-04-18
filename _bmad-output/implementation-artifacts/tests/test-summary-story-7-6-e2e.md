# Synthèse tests — story 7.6 (validation exploitabilité réception v2)

**Date du run :** 2026-04-09  
**Agent :** DS story 7.6 (`bmad-dev-story`)

## Peintre_nano (`npm run lint`, `npm run build`, `npm test`)

| Commande | Résultat |
|----------|----------|
| `npm run lint` | **PASS** (`tsc -b`) |
| `npm run build` | **PASS** (Vite build) |
| `npm test` (Vitest) | **PASS** — **65** fichiers, **323** tests |

### Suites Epic 7 (rejeu explicite)

- `tests/e2e/reception-nominal-7-1.e2e.test.tsx`
- `tests/e2e/reception-context-gate-7-2.e2e.test.tsx`
- `tests/e2e/reception-lignes-7-3.e2e.test.tsx`
- `tests/unit/reception-context-gate-7-2.test.tsx`
- `tests/unit/reception-history-7-4.test.tsx`
- `tests/unit/reception-defensive-7-5.test.tsx`
- `tests/contract/creos-reception-nominal-manifests-7-1.test.ts`
- `tests/contract/navigation-transverse-served-5-1.test.ts` (shell / entrée réception)

## Backend `recyclique/api` (pytest)

### Sous-ensemble ciblé stories 7.x (PASS)

Fichiers passés en une seule commande :

- `tests/test_reception_story72_context.py`
- `tests/test_reception_lines_endpoints.py`
- `tests/test_reception_tickets_history.py`
- `tests/test_reception_user_access.py`
- `tests/test_reception_transaction_policy.py`
- `tests/test_reception_arch03_domain_errors.py`

**Résultat :** **PASS** (64 tests dans la sortie du run).

### Ensemble `test_reception*.py` (hors périmètre 7.6)

Exécution de **tous** les fichiers `tests/test_reception*.py` : **échecs multiples** (exports, rapports, migrations, filtres, B48, etc.) — **non** traités dans 7.6 (pas de correctif backend demandé). Documenté comme **dette / hors baseline** dans le registre `2026-04-09_01_…`.
