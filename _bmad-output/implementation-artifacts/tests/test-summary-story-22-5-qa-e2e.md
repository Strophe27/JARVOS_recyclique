# Résumé QA — tests automatisés story 22.5

## Générés / complétés (session BMAD bmad-qa-generate-e2e-tests)

### UI (Vitest e2e jsdom)

- `peintre-nano/tests/e2e/cashflow-refund-22-5.e2e.test.tsx` (nouveau)
  - **Happy path déjà couvert** par `cashflow-refund-6-4.e2e.test.tsx` (Story 6.4) — pas dupliqué.
  - **Complément Story 22.5** : après GET vente `completed`, POST `/v1/sales/reversals` mocké en **409** avec corps JSON `detail` aligné serveur — vérification que le wizard affiche l’alerte `cashflow-refund-error` + lignes `cashflow-error-http-status` / `cashflow-error-primary` avec les **codes stables** dans le message :
    - `[PRIOR_YEAR_REFUND_REQUIRES_EXPERT_PATH]` (parcours expert requis)
    - `[ACCOUNTING_PERIOD_AUTHORITY_UNAVAILABLE]` (autorité indisponible — blocage)
    - `[ACCOUNTING_PERIOD_AUTHORITY_STALE]` (autorité périmée)
  - Assertion absence d’écran succès lors des cas autorité indisponible.

### API (pytest)

- Déjà livré : `recyclique/api/tests/test_story_22_5_refund_canonical_authority.py` — **non relancé** dans cette tâche (gates parent OK).

## Couverture checklist skill (workflow)

| Critère | Statut |
|--------|--------|
| E2E si UI existe | Oui — parcours remboursement étendu erreurs 409 |
| Happy path | Couvert par fichier 6.4 existant |
| 1–2 erreurs critiques | Trois variantes 409 métier Story 22.5 (tokens stables) |
| Tests exécutés et verts | Oui (voir commande) |

## Commande de vérification

```text
# Depuis peintre-nano
npx vitest run tests/e2e/cashflow-refund-22-5.e2e.test.tsx
# Résultat : 3 tests passed — exit 0
```

## Métriques (indicatives)

- Fichiers e2e Story remboursement : 2 (`cashflow-refund-6-4`, `cashflow-refund-22-5`)
