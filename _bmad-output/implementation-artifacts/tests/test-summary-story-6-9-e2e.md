# Test Automation Summary — Story 6.9

## Générés / étendus (Vitest jsdom)

### Tests unitaires

- [x] `peintre-nano/tests/unit/recyclique-api-error.test.ts` — parsing AR21, retryable 429, FR24 (existant)
- [x] `peintre-nano/tests/unit/cashflow-api-error-no-false-success-6-9.test.tsx` — erreur non retryable + absence de faux succès ; **+** scénario **retryable** (message « Nouvel essai possible »)
- [x] `peintre-nano/tests/unit/cashflow-stale-blocks-payment.test.tsx` — DATA_STALE bloque paiement nominal (existant, 6.1 / AC4)
- [x] `peintre-nano/tests/unit/cashflow-operational-sync-notice-6-9.test.tsx` — **nouveau** : bandeau `a_reessayer`, `en_quarantaine`, GET live-snapshot en échec (dégradé)
- [x] `peintre-nano/tests/unit/cashflow-stale-close-6-9.test.tsx` — **nouveau** : DATA_STALE transverse, clôture (alerte + submit désactivé)

### Tests e2e (intégration UI)

- [x] `peintre-nano/tests/e2e/cashflow-defensive-6-9.e2e.test.tsx` — **nouveau** : bandeau sync différée sur `/caisse`, bandeau dégradé si live-snapshot KO, POST vente 429 retryable + pas de ticket succès
- [x] `peintre-nano/tests/e2e/cashflow-nominal-6-1.e2e.test.tsx` — DATA_STALE widget ticket, erreurs API POST (existant, complément AC 6.9)

## Couverture vs AC 8 (story 6.9)

| Exigence | Couverture |
|----------|------------|
| Erreurs API (`retryable` / non) | Unit + e2e (409/503, 429) |
| Blocage DATA_STALE parcours critiques | Nominal (paiement) + **clôture** (nouveau) |
| Pas de faux succès | `cashflow-api-error-no-false-success-6-9` + e2e défensive |
| Bandeau sync (FR24 / live-snapshot) | Unit (3 états) + e2e (différée + dégradé) |

## Support test : cache bandeau sync

- `resetCashflowOperationalSyncNoticeCacheForTests()` dans `cashflow-operational-sync-notice.tsx` (no-op hors `VITEST`) pour isoler les scénarios e2e sur le même worker.

## Preuve UI manuelle

- Vérification navigateur sur `http://localhost:4444` : **session identifiée** requise pour un parcours caisse réaliste.
- **NEEDS_HITL** : uniquement pour cette preuve visuelle terrain ; les tests auto ci-dessus sont la preuve d’acceptation automatisée.

## Commande

```bash
cd peintre-nano && npm run test
```

**Résultat attendu** : suite verte (281 tests au dernier run).

## Prochaines étapes

- CI : conserver `npm run test` sur `peintre-nano`.
- Optionnel : scénarios e2e supplémentaires sur remboursement / spécial / social si le mock `fetch` + navigation devient trop lourd (déjà couverts en partie par les garde-fous unitaires des gates).
