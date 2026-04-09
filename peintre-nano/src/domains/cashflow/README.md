# Domaine — cashflow

Parcours caisse — Epic 6.

## Story 6.1 (nominal)

- **Manifests CREOS** : `contracts/creos/manifests/page-cashflow-nominal.json`, `widgets-catalog-cashflow-nominal.json` ; navigation servie : `/caisse`, `page_key` `cashflow-nominal`, permission `caisse.access`.
- **Widgets** : `caisse-current-ticket` (ticket courant, `data_contract.critical: true`, `operation_id` `recyclique_sales_getSale`) ; `cashflow-nominal-wizard` (`FlowRenderer` + POST via `src/api/sales-client.ts`, `recyclique_sales_createSale`).
- **État brouillon** : `cashflow-draft-store.ts` (hors vérité métier) ; `DATA_STALE` bloque le bouton d’enregistrement jusqu’à retour NOMINAL.
- **Story 6.2** : garde dans `CashflowNominalWizard` (`runtimeStatus`, `siteId`, `caisse.access` dans l’enveloppe) — pas de wizard nominal si le serveur signale un contexte bloquant.
