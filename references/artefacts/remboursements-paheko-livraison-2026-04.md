# Remboursements, snapshot clôture et Paheko — livraison transversale (avril 2026)

Note de consolidation **P4** : synthèse livré / reste à faire, migration, idempotence et non-régression API remboursements.

## Livré (passe chantier)

| Phase | Contenu | Emplacements principaux |
|--------|---------|-------------------------|
| **P0** | Toolbar live : navigation élaguée pour le contexte caisse live, sélection d’entrée toolbar alignée sur le chemin live. | `peintre-nano/src/runtime/prune-navigation-for-live-toolbar.ts`, `peintre-nano/src/runtime/toolbar-selection-for-live-path.ts` ; test unitaire `peintre-nano/tests/unit/prune-navigation-for-live-toolbar.test.ts`. |
| **P1** | Wizard remboursement caisse aligné sur le contrat API (options expert, erreurs client, flux POST remboursement). | `peintre-nano/src/domains/cashflow/CashflowRefundWizard.tsx`, `cashflow-refund-payment-method-options.ts`, `peintre-nano/src/api/sales-client.ts`, `peintre-nano/src/api/recyclique-client-error-alert.tsx`. |
| **Post QA2** | Idempotence **corps** `idempotency_key` + en-tête HTTP `Idempotency-Key` sur `POST /v1/sales/reversals` ; `expert_prior_year_refund` envoyé **uniquement** à `true` après confirmation explicite ; garde-fou Paheko v1/v2 unifié sur l’alignement dict/scalaires. | Mêmes fichiers wizard/client ; `paheko_close_batch_builder.py` ; e2e `cashflow-refund-6-4.e2e.test.tsx`. |
| **P2** | Ventilation Paheko **par moyen de paiement** pour les remboursements (sous-écritures ADVANCED) lorsque le snapshot le permet ; snapshot figé avec **`schema_version`** (1 ou 2) et champs de ventilation par moyen. | `recyclique/api/src/recyclic_api/services/paheko_close_batch_builder.py`, `recyclique/api/src/recyclic_api/schemas/cash_session_close_snapshot.py`, génération journal `recyclique/api/src/recyclic_api/services/cash_session_journal_snapshot.py`. Tests : `recyclique/api/tests/test_story_23_1_paheko_per_method_close_batch.py`, `test_story_22_6_accounting_close_snapshot.py`, `test_story_22_7_paheko_close_batch_builder.py`, `test_journal_aggregate_dual_bank_fk.py`. |
| **P3** | Recherche assistée **session caisse** / récap dans le wizard (chargement liste, filtre, sélection de vente candidate). | `peintre-nano/src/domains/cashflow/cashflow-refund-session-candidates.ts` ; tests `peintre-nano/tests/unit/cashflow-refund-session-candidates.test.ts`, e2e `peintre-nano/tests/e2e/cashflow-refund-6-4.e2e.test.tsx`, `peintre-nano/tests/e2e/cashflow-refund-22-5.e2e.test.tsx` ; unitaire options `peintre-nano/tests/unit/cashflow-refund-payment-method-options.test.ts`. |

## Non livré / extensions possibles

- **Scan code-barres** pour saisir un identifiant de vente si absent de l’UX.
- **Régénération OpenAPI** (`recyclique/api/openapi.json`) si la CI ou la gouvernance contrat l’exige — le chantier P2 a pu livrer le code sans mettre à jour le fichier généré dans le même commit.
- **APIs de recherche des ventes `completed` hors session** (ou hors périmètre session courante) : pas posées comme livrable de cette passe ; le wizard s’appuie sur les endpoints existants et sur le panneau session.
- Poursuite **codes expert** sur le champ métier `refund_payment_method` au-delà de l’enum legacy (hors périmètre hotfix documenté ailleurs).

## Migration données et compatibilité snapshot

- **`schema_version` 1 ou 2** : la règle d’activation de la ventilation Paheko **ADVANCED** par moyen est la même : les dicts `refunds_*_by_payment_method` doivent **recouvrir** les totaux scalaires (tolérance d’arrondi) ; sinon **repli** mono-ligne **REVENUE** (`SUB_KIND_REFUNDS_CURRENT` / `SUB_KIND_REFUNDS_PRIOR_CLOSED`). Le champ `schema_version` reste utile pour la forme du snapshot stocké et la traçabilité, pas pour assouplir ce garde-fou.
- **Dicts de remboursement vides** ou incohérents avec les totaux : repli sur le chemin **REVENUE** legacy, pour ne pas bloquer l’outbox sur des snapshots incomplets.

## Idempotence sous-écritures Paheko

- Kinds **par moyen** : `refunds_current_fiscal_per_pm_v1`, `refunds_prior_closed_fiscal_per_pm_v1` (ventilation détaillée) — distincts des kinds **legacy** `refunds_current_fiscal` et `refunds_prior_closed_fiscal`.
- Ventes/dons : `sales_donations_per_pm_v1` vs `sales_donations` selon la politique de détail du batch.
- Clé stable par sous-écriture : fonction **`sub_write_idempotency_key(batch_idempotency_key, index, kind)`** → `{batch_key}:sub:{index}:{kind}` ; stockée côté charge utile outbox comme **`idempotency_sub_key`** pour les retries **resume_failed_sub_writes** sans dupliquer une sous-écriture déjà acceptée.

## Écart décision produit vs anciennes stories

- **Cible produit** : ventilation **par moyen obligatoire** lorsque le snapshot est complet et valide ; le comportement final **n’est plus** « deux blocs remboursement sans ventilation » comme seule représentation Paheko lorsque les données permettent la ventilation.
- **Repli** : si le snapshot ne permet pas une ventilation sûre (v1 sans dicts, dicts vides, sommes non alignées), le système conserve le **chemin REVENUE legacy** pour ne pas casser l’historique ni la clôture.

## Non-régression métier remboursements vente

- Le cœur métier de **`POST /v1/sales/reversals`** et de **`SaleService.create_sale_reversal`** reste la référence pour créer un remboursement ; cette passe se concentre sur **agrégats journal**, **snapshot de clôture**, **builder Paheko** et **UX caisse**, sans changer le contrat fonctionnel principal de l’endpoint reversal.
- **Idempotence côté client** : le wizard génère une clé UUID par chargement de ticket (étape 2) et l’envoie dans le corps (`idempotency_key`) ; `postCreateSaleReversal` répercute la même valeur en en-tête **`Idempotency-Key`** pour alignement avec les autres appels sensibles du client (le serveur continue de lire la clé dans le corps pour ce endpoint).
- Tests de garde côté API (mot-clé `reversal`) : entre autres `recyclique/api/tests/test_sale_reversal_story64_integration.py`, `test_story_22_5_refund_canonical_authority.py`, scénarios matrix dans `test_story_22_2_dual_read_aggregate_compare.py`.
