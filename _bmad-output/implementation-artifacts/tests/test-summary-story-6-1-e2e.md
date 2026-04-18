# Synthèse automatisation des tests — Story 6.1 (parcours caisse nominal)

**Baseline UI** : brownfield-first sur `/caisse` — shell CREOS avec widget `caisse-brownfield-dashboard`, bandeau KPI (`data-testid="caisse-kpi-strip"`), ancre workspace vente `#caisse-sale-workspace` (wizard nominal + ticket latéral).

## Tests générés

### Tests E2E (Vitest + Testing Library + jsdom)

- [x] `peintre-nano/tests/e2e/cashflow-nominal-6-1.e2e.test.tsx`
  - **Entrée `/caisse`** : présence `caisse-brownfield-dashboard`, `cashflow-nominal-wizard`, ancre DOM `caisse-sale-workspace`, `caisse-kpi-strip`.
  - **Parcours nominal** : `FlowRenderer` (`flow-renderer-cashflow-nominal`), widget ticket `data-operation-id` contractuel (`recyclique_sales_getSale`), POST `/v1/sales/` mocké (cohérence `total_price` / `unit_price` × `quantity`), GET `getSale` → état ticket `NOMINAL`, message post-vente local (honnêteté sync Paheko).
  - **Régressions DATA_STALE / GET** : échec HTTP `getSale`, corps 200 invalide (sans `items`), erreur réseau sur `getSale` → `data-widget-data-state="DATA_STALE"` + `caisse-ticket-stale-banner`.
  - **Régression POST** : erreur HTTP sur POST vente → `cashflow-submit-error` (ex. 403).
  - **Navigation** : depuis `/`, entrée manifeste `nav-entry-cashflow-nominal` → `/caisse` + dashboard brownfield + wizard visibles (AC 1).

### Tests existants (non modifiés, couverture AC 4)

- [x] `peintre-nano/tests/unit/cashflow-stale-blocks-payment.test.tsx` — blocage paiement si `DATA_STALE`.
- [x] `recyclique/api/tests/test_sale_service_story61_operator_revalidation.py` — revalidation opérateur côté API.

## Couverture (indicatif)

- Parcours UI caisse v2 dans le runtime servi (manifests CREOS) : scénario nominal sur workspace continu (dashboard + KPI + wizard + ticket), navigation transverse, erreurs API POST, et chemins `getSale` menant à `DATA_STALE`.
- Blocage stale + backend : déjà couverts par tests unitaires / pytest ci-dessus.

## Prochaines étapes

- `npm run test` dans `peintre-nano` (gate CI).
- Smoke clavier navigateur réel sur `/caisse` (AC 2) si besoin hors suite automatisée actuelle.
