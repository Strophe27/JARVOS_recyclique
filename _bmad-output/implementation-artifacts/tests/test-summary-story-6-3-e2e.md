# Synthèse automatisation des tests — Story 6.3 (ticket en attente)

## Story

`6-3-ajouter-le-parcours-ticket-en-attente`

## Tests générés ou étendus

### Tests E2E (Vitest + Testing Library + jsdom)

- [x] `peintre-nano/tests/e2e/cashflow-held-6-3.e2e.test.tsx`
  - **Happy path** : depuis `/caisse`, enveloppe avec `cashSessionId` → synchro brouillon (PaymentStep monté via `keepMounted`) → ligne → POST `/v1/sales/hold` → message local + liste GET `/v1/sales/held` → bouton Reprendre → GET `getSale` → bandeau ticket en attente + finalisation onglet Paiement → POST `…/finalize-held` (pas `POST /v1/sales/` seul).
  - **Erreur métier** : reprise alors que `lifecycle_status` n'est plus `held` → `submitError` dans le store (traçabilité côté logique).
  - **Abandon** : POST `…/abandon-held` puis liste vide après rafraîchissement.

### Tests unitaires front (déjà livrés DS, inchangés)

- [x] `peintre-nano/tests/unit/cashflow-held-finalize-6-3.test.tsx` — `finalize-held` au submit paiement avec `activeHeldSaleId`.

### Tests API (pytest — existants story 6.3)

- [x] `recyclique/api/tests/test_sale_held_story63_integration.py` — non relancés dans cette passe ; à exécuter avec la suite API habituelle.

## Couverture (indicatif)

- Chaîne **App** + mocks `fetch` : hold, liste, reprise (`getSale`), finalisation, abandon — alignés sur les `operationId` OpenAPI côté client.
- La preuve **navigateur réel** (CORS, bundle Vite servi) reste complémentaire (voir README `tests/e2e/`).

## Preuve UI servie (`http://127.0.0.1:4444`)

- **Sonde agent** : HTTP **200** sur la racine au moment de la passe QA (stack locale joignable).
- Scénario manuel complet (lignes → attente → autre action → reprise → paiement) reste la validation terrain détaillée décrite dans la story.

## Exécution

```bash
cd peintre-nano && npm run test -- tests/e2e/cashflow-held-6-3.e2e.test.tsx
cd peintre-nano && npm run test -- tests/e2e/
```

## Prochaines étapes

- Conserver ce fichier dans la CI `peintre-nano` avec les autres `*.e2e.test.tsx`.
- Playwright / smoke réseau réel si le périmètre Epic 10 l'exige.

## Checklist skill `bmad-qa-generate-e2e-tests`

- [x] Tests E2E générés (UI)
- [x] Happy path + erreurs critiques (reprise invalide, abandon)
- [x] Tests exécutés avec succès
- [x] Locators : rôles (`tab` Paiement) + `data-testid` produit
- [x] Synthèse enregistrée sous ce fichier
