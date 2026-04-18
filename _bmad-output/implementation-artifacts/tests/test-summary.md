# Synthèse tests automatisés (bmad-qa-generate-e2e-tests)

## Tests générés / étendus

### E2E (Vitest + Testing Library)

- [x] `peintre-nano/tests/e2e/cashflow-refund-24-4-prior-year-expert.e2e.test.tsx` — Story 24.4 : hub carte expert N-1, visibilité proactive GET `prior_closed`, permission `accounting.prior_year_refund`, happy path POST `expert_prior_year_refund`.

### Tests unitaires (déjà livrés DS)

- `peintre-nano/tests/unit/cashflow-refund-24-4-prior-year-ux.test.tsx` — wizard isolé (non relancé dans cette passe si inchangé).

## Commande de validation

```bash
cd peintre-nano
node ./node_modules/vitest/vitest.mjs run tests/e2e/cashflow-refund-24-4-prior-year-expert.e2e.test.tsx
```

## Couverture visée (AC story)

- Visibilité parcours expert N-1 avant validation finale (hub + encart wizard).
- Permission : blocage bouton sans droit ; libellé `accounting.prior_year_refund` sur la carte hub.
- Happy path : confirmation case + POST avec flag expert.

## Prochaines étapes

- Intégrer le fichier dans la CI avec les autres e2e caisse si besoin.
