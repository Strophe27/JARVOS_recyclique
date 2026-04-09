# Test Automation Summary — Story 6.10 (validation exploitabilité terrain)

## Nature de la story

Story **documentaire / validation** : pas de nouveaux tests imposés par l’AC 8 si les garde-fous `cashflow-*` existants couvrent déjà la cohérence 6.1–6.9. Ce fichier **inventorie** les suites à reprendre pour la clôture ; **il ne substitue pas** à une exécution réelle ni à la preuve UI humaine.

**Registre brownfield-first honnête :** `references/artefacts/2026-04-08_07_caisse-v2-exploitabilite-terrain-epic6.md` (le fichier `2026-04-08_04_...` reste **historique intermédiaire** pré–correct course).

## Résultats d’exécution (Vitest / lint / build)

**Statut :** **PASS** — Story Runner, **2026-04-08**, `peintre-nano` : `npm run lint` (exit 0), `npm run build` (exit 0), `npm run test` (exit 0) — **56** fichiers de test, **284** tests Vitest passés (~58 s). **Complément ciblé 2026-04-09** pour le bloc **§7 variantes brownfield** : front `npx vitest run tests/unit/resolve-page-access.test.ts tests/unit/cashflow-context-gate-6-2.test.tsx tests/unit/caisse-brownfield-dashboard-6-7.test.tsx tests/contract/navigation-transverse-served-5-1.test.ts` → **32 tests PASS** ; API `pytest tests/test_sale_service_story62_context.py tests/test_sale_held_story63_integration.py` → **8 tests PASS**. Détail dans `references/artefacts/2026-04-08_07_caisse-v2-exploitabilite-terrain-epic6.md` §6.

Les suites listées ci-dessous sont **incluses** dans ce run global (pas de sélection fichier par fichier) ; la preuve est la suite **entière** verte.

## Suites ciblées (Vitest — `peintre-nano`)

### E2E (intégration UI jsdom)

- [x] `tests/e2e/cashflow-nominal-6-1.e2e.test.tsx` *(inclus run global 2026-04-08)*
- [x] `tests/e2e/cashflow-context-gate-6-2.e2e.test.tsx`
- [x] `tests/e2e/cashflow-held-6-3.e2e.test.tsx`
- [x] `tests/e2e/cashflow-refund-6-4.e2e.test.tsx`
- [x] `tests/e2e/cashflow-special-6-5.e2e.test.tsx`
- [x] `tests/e2e/cashflow-social-6-6.e2e.test.tsx`
- [x] `tests/e2e/cashflow-close-6-7.e2e.test.tsx`
- [x] `tests/e2e/cashflow-sale-correction-6-8.e2e.test.tsx`
- [x] `tests/e2e/cashflow-defensive-6-9.e2e.test.tsx`
- [x] `tests/e2e/navigation-transverse-5-1.e2e.test.tsx` (accès caisse depuis nav servie — cohérence Epic 5 / 6.10 AC 5)

### Unitaires / contrats (extraits alignés caisse + shell)

- [x] `tests/unit/cashflow-stale-blocks-payment.test.tsx` (6.1 — DATA_STALE / paiement)
- [x] `tests/unit/cashflow-context-gate-6-2.test.tsx`
- [x] `tests/unit/cashflow-held-finalize-6-3.test.tsx`
- [x] `tests/unit/cashflow-refund-gate-6-4.test.tsx`
- [x] `tests/unit/cashflow-special-gate-6-5.test.tsx`
- [x] `tests/unit/cashflow-social-gate-6-6.test.tsx`
- [x] `tests/unit/cashflow-close-6-7.test.tsx`
- [x] `tests/unit/cashflow-api-error-no-false-success-6-9.test.tsx`
- [x] `tests/unit/cashflow-operational-sync-notice-6-9.test.tsx`
- [x] `tests/unit/cashflow-stale-close-6-9.test.tsx`
- [x] `tests/contract/navigation-transverse-served-5-1.test.ts`

## Couverture attendue vs AC 8 (story 6.10)

| Exigence | Preuve attendue |
|----------|-----------------|
| Cohérence 6.1–6.9 | Exécution documentée des suites `cashflow-*` 6.1–6.9 + nav transverse |
| Pas de nouvelle batterie massive | Aucun nouveau fichier test requis pour 6.10 si les suites existantes suffisent |
| Trace écrite | Registre `references/artefacts/2026-04-08_07_caisse-v2-exploitabilite-terrain-epic6.md` + complément Gate |

## Preuve UI manuelle

- **HITL obligatoire** pour **done** : parcours sur `http://localhost:4444` ou `http://127.0.0.1:4444` avec session réelle / profils (dont super-admin ou droits `caisse.sale_correct` pour 6.8 selon besoin). Non réalisable par un agent sans navigateur.

## Commande (à exécuter pour preuve)

```powershell
cd peintre-nano
npm test
```

**Rappel :** consigner tout **re-run** ultérieur (date, compteurs) dans le registre `_07_` §6 si la suite change.

## Prochaines étapes

- **Humain (HITL) :** passe navigateur sur `http://localhost:4444` / `127.0.0.1:4444` pour cocher la validation terrain checklist §1–§7 et documenter profils / session dans le registre `_07_` — **bloquant** pour « done » 6.10.
- **Optionnel :** re-lancer les gates après changements de code sur `peintre-nano`.
