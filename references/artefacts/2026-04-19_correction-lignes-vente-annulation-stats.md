# Extension 6.8 — correction par ligne + cohérence stats / annulation (avril 2026)

## Périmètre livré

- **API** : `PATCH /v1/sales/{id}/corrections` accepte `items[]` (`SaleCorrectionItemPatch`) pour mettre à jour des lignes `sale_items` (catégorie, poids, qté, PU, montant ligne, notes, preset, tags métier ligne) sous les mêmes garde-fous Story 6.8 (super-admin, session ouverte, pas de reversal préalable sur la vente).
- **Audit** : le cliché avant/après inclut désormais les lignes article dans `details.before/after.items`.
- **Reporting / KPI agrégés** : les agrégats basés sur les ventes (`StatsService.get_sales_by_category`, `get_sales_by_business_tag_and_category`) et les stats réception live unifiées (`ReceptionLiveStatsService` : CA, dons, `weight_out`, sous-requêtes tickets) **excluent les ventes ayant un remboursement total** (`sale_reversals.source_sale_id`). La vente source reste `completed` en base ; l’« annulation » métier passe par **reversal** (Story 6.4 / 22.5).
- **UI Peintre** : `CashflowSaleCorrectionWizard` permet d’éditer les lignes article et rappelle que l’annulation monétaire complète est le flux `POST /v1/sales/reversals`.

## Limites connues (NEEDS_HITL / suite)

- **Rollups session caisse** (`cash_sessions.total_sales`, etc.) : `recompute_cash_session_completed_rollups` somme encore les `sales.total_amount` sans exclure les ventes ayant un reversal ; le **solde caisse** (`current_amount`) intègre bien la sortie reversal. Harmoniser rollups vs reversal si le métier affiche ces champs comme « CA net session ».
- **Caches / exports Paheko / batch nocturnes** : non traités ici ; invalider ou recalculer selon les pipelines existants si des tables matérialisées dépendent des anciennes lignes.

## Tests manuels rapides

1. **Ligne** : corriger poids/catégorie via wizard ou PATCH avec `items` ; vérifier `GET /v1/sales/{id}` puis endpoint stats catégories sur la période.
2. **Annulation** : `POST /v1/sales/reversals` sur la vente ; constater que les agrégats matière / CA live ne comptent plus ce ticket (pour la période concernée).
