# Synthèse automatisation des tests — Story 6.4 (remboursement contrôlé)

## Tests générés

### Tests E2E (Vitest + Testing Library + jsdom)

- [x] `peintre-nano/tests/e2e/cashflow-refund-6-4.e2e.test.tsx`
  - Navigation depuis `/` : entrée `nav-entry-cashflow-refund` → `/caisse/remboursement`, wizard étape 1, libellé reversal / non vente nominale.
  - Sans `caisse.refund` : entrée nav absente ; URL profonde `/caisse/remboursement` ne monte pas le wizard (résolution nav filtrée runtime démo — pas de contournement par simple URL).
  - Flux heureux : GET `recyclique_sales_getSale` (vente `completed`) → étape confirmation → POST `/v1/sales/reversals` (corps `source_sale_id` / `reason_code`) → écran succès avec id reversal.
  - Vente source `held` : message d'erreur côté UI (politique `completed`).
  - Motif `AUTRE` sans détail : validation locale, aucun POST reversal.
  - POST reversal 403 : message d'erreur affiché.

### Tests existants (complément, non dupliqué)

- [x] `peintre-nano/tests/unit/cashflow-refund-gate-6-4.test.tsx` — garde enveloppe `caisse.refund` sur le widget isolé.

## Couverture (indicatif)

- Parcours dédié Remboursement dans le runtime servi + mocks alignés sur `sales-client` (6.1–6.3).
- Garde permission : nav + absence de wizard sans droit ; garde widget détaillée en unitaire.

## Prochaines étapes

- `npm run test` dans `peintre-nano` (CI).
- Vérification manuelle servie sur `http://127.0.0.1:4444` : enchaînement vente nominale → remboursement (policy parent `ui_proof_required`).
