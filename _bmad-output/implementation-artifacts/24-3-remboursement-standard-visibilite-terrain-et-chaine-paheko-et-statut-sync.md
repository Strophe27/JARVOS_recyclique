# Story 24.3 : Remboursement standard — visibilité terrain et chaîne Paheko + statut sync

Status: done

**Story key :** `24-3-remboursement-standard-visibilite-terrain-et-chaine-paheko-et-statut-sync`  
**Epic :** 24 — Opérations spéciales de caisse, tags métier et extension Paheko terrain  
**Branche de travail attendue :** `epic/24-operations-speciales-orchestration`  
**Implementation artifact :** `_bmad-output/implementation-artifacts/24-3-remboursement-standard-visibilite-terrain-et-chaine-paheko-et-statut-sync.md`

> Note create-story : analyse exhaustive epics.md §24.3, PRD §7 (principes 7 et 12), ADR D7, paquet audit 24.1 §3 (écart visibilité sync), chaîne canonique `cash-accounting-paheko-canonical-chain.md`, code existant `CashflowRefundWizard` + `CashflowOperationalSyncNotice`.

## Contexte produit

Le **remboursement standard** est déjà **implémenté** (API `POST /v1/sales/reversals`, wizard Peintre `/caisse/remboursement`, journal `PaymentTransaction` `REFUND_PAYMENT` avec `refund_payment_method` effectif — Story 22.5). En revanche, le **trésorier / superviseur** doit pouvoir **reconnaître sans ambiguïté** :

1. **L’impact comptable par moyen effectif de remboursement** (ventilation alignée Epic 23 — pas les seuls libellés legacy de la vente source).
2. **Un état de synchronisation Paheko cohérent** avec les patterns Epic 8 / outbox, **sans inventer** d’état par opération si la chaîne canonique ne l’expose pas encore au grain fin.

Le paquet d’audit **24.1** classe la visibilité sync « par opération terrain » en **partiel** : à **lever** dans cette story dans les limites de l’ADR D1 (pas de second rail Paheko).

## Story (BDD)

As a **trésorier / responsable de caisse**,  
I want **que les remboursements standards affichent le canal de remboursement effectif et un état de sync Paheko compréhensible de bout en bout**,  
So that **le rapprochement avec les lignes comptables exportées par moyen de paiement reste traçable sans interprétation des libellés legacy**.

## Acceptance criteria (source epics.md + cadrage)

1. **Moyen effectif visible** — *Given* la ventilation canonique post Epic 23 et un `PaymentTransaction` `REFUND_PAYMENT` créé à l’enregistrement du reversal ; *When* un remboursement standard est enregistré ou consulté ; *Then* l’interface terrain (et idéalement la réponse API de lecture) **reflète explicitement** le **moyen effectif de remboursement** choisi (`refund_payment_method` / journal), **distinct** du moyen de paiement historique de la vente source lorsque les deux diffèrent — **sans** se contenter d’un libellé ambigu « comme la vente ».
2. **Sync Paheko — honnêteté chaîne** — *Given* ADR D7 et le fait que l’export Paheko des remboursements suit la **chaîne snapshot → builder → outbox** à la **clôture de session** (cf. `cash-accounting-paheko-canonical-chain.md`) ; *When* l’opérateur consulte le parcours remboursement ou l’écran de succès ; *Then* les textes et indicateurs **n’impliquent pas** une écriture Paheko instantanée si ce n’est pas le cas, et **réutilisent** les patterns d’observabilité Epic 8 (ex. `sync_operational_summary` / états `a_reessayer`, `en_quarantaine`, etc.) là où c’est pertinent — avec une **phrase métier** qui relie remboursement enregistré → inclusion dans snapshot de clôture → outbox (sans nouveau rail).
3. **Supervision** — *Given* un utilisateur avec droits de supervision caisse ; *When* il inspecte une session ou un remboursement ; *Then* les informations nécessaires au rapprochement (moyen + branche fiscale courant / N-1 si applicable) sont **accessibles** sans fouiller les seuls logs techniques (référence reversal + champs métier ou lien vers écran déjà existant type détail session admin si c’est le pattern retenu).
4. **Tests** — *Given* l’alignement Epic 8 ; *When* les tests sont ajoutés ou étendus ; *Then* au moins **un chemin nominal** et **un chemin dégradé** « Paheko / sync » (ex. snapshot agrégat indisponible, `worst_state` non résolu, ou erreur réseau live-snapshot) sont couverts au niveau **UI ou contrat** (vitest sur `CashflowOperationalSyncNotice` / wizard, et/ou pytest si extension API).

## Définition of Done (suggestions mesurables)

- [x] Les libellés et données affichés pour le remboursement standard sont **alignés** sur le schéma OpenAPI courant ou une **révision versionnée** documentée (pas de divergence frontend / contrat sans mise à jour `contracts/openapi/recyclique-api.yaml` + génération Peintre si applicable).
- [x] **Aucune régression** sur les garde-fous `caisse.refund`, N-1 expert (`accounting.prior_year_refund`), idempotence reversal.
- [x] Tests **verts** (pytest ciblés API + vitest/e2e caisse selon périmètre réel du diff).
- [x] Si l’API expose de nouveaux champs (`refund_payment_method`, `fiscal_branch`, `sync_hint`…), **migration / rétrocompat** ou champs optionnels explicités dans la story de review.

## Tasks / Subtasks

- [x] Cartographier l’état actuel : `SaleReversalResponse` (champs manquants vs journal), `get_sale_reversal` / `get_sale_reversal_readable`, `sales-client.ts` (`getSaleReversal`, `postCreateSaleReversal`).
- [x] Trancher avec le code existant : **enrichissement GET reversal** (recommandé pour cohérence terrain) vs **agrégation uniquement côté UI** à partir d’une vente / session déjà chargée — documenter la décision dans les Dev Notes finales.
- [x] Mettre à jour **Peintre** : `CashflowRefundWizard` — étape récap + **écran succès** : afficher moyen effectif, montant, branche fiscale si utile, et bloc sync **non trompeur** (réutiliser `CashflowOperationalSyncNotice` ou message structuré + lien conceptuel clôture).
- [x] Aligner **PRD §7** principes 7 et 12 et **ADR D7** — pas de contournement outbox.
- [x] Ajouter / étendre les tests : `peintre-nano/tests/unit/cashflow-refund-gate-6-4.test.tsx`, `tests/e2e/cashflow-special-6-5.e2e.test.tsx` ou fichier dédié `cashflow-*24-3*` si le projet le préfère ; pytest `recyclique/api/tests/` si API modifiée.

## Dev Notes — Garde-fous techniques

### Périmètre story 24.3

- **Inclus :** visibilité **moyen effectif** + **statut / message sync** cohérents avec Epic 8 et la chaîne canonique ; amélioration UX et éventuellement **contrat HTTP** pour lecture reversal.
- **Hors périmètre explicite :** parcours expert N-1 dédié (story **24.4**), remboursement sans ticket (**24.5**), nouveaux flux P1.

### Ancres code (réutiliser, ne pas dupliquer)

| Sujet | Chemins |
|------|---------|
| Wizard remboursement | `peintre-nano/src/domains/cashflow/CashflowRefundWizard.tsx` |
| Options moyens remboursement | `peintre-nano/src/domains/cashflow/cashflow-refund-payment-method-options.ts` |
| Bandeau sync agrégé (live-snapshot) | `peintre-nano/src/domains/cashflow/cashflow-operational-sync-notice.tsx`, `fetchLiveSnapshot` |
| Client API sales | `peintre-nano/src/api/sales-client.ts` (`postCreateSaleReversal`, `getSaleReversal`) |
| Création reversal + journal | `recyclique/api/src/recyclic_api/services/sale_service.py` (`create_sale_reversal`, `PaymentTransaction` `REFUND_PAYMENT`) |
| Schéma réponse reversal | `recyclique/api/src/recyclic_api/schemas/sale.py` — `SaleReversalResponse` (champs actuels : id, source_sale_id, cash_session_id, operator_id, amount_signed, reason_code, detail, idempotency_key, created_at) |
| Modèle reversal | `recyclique/api/src/recyclic_api/models/sale_reversal.py` |
| OpenAPI | `contracts/openapi/recyclique-api.yaml` — `SaleReversalResponseV1`, `recyclique_sales_getSaleReversal` |
| Endpoints | `recyclique/api/src/recyclic_api/api/api_v1/endpoints/sales.py` |

### Risques / arbitrages

- **Décision 24.3 (implémentée) :** enrichissement **POST et GET** `/v1/sales/reversals` via `SaleService.build_sale_reversal_response` (journal `REFUND_PAYMENT`, vente source, autorité fiscale, hint chaîne Paheko). Pas d’agrégat UI seule sur le wizard : le contrat HTTP porte la vérité terrain + supervision.

- **Grain sync :** la sync Paheko « financière » pour les remboursements est **canoniquement** portée par le **batch de clôture** ; une story terrain doit **réconcilier** la promesse PRD « état de sync Paheko » avec **l’architecture** (message explicite + agrégat site / session, ou extension future si un lien outbox par transaction devient disponible — hors scope sauf découverte en implémentation documentée).
- **OpenAPI :** toute extension de `SaleReversalResponse` implique **mise à jour contrat** + client TypeScript généré ou manuel aligné projet.
- **Répétition 6.9 / bandeau défensif :** ne pas multiplier les bandeaux contradictoires ; **une** source de vérité utilisateur pour l’état sync « site ».

### Intelligence story 24.2 (continuité)

- Hub **opérations spéciales** (`/caisse/operations-speciales`, `CashflowSpecialOpsHub`) pointe vers `/caisse/remboursement` ; cette story **enrichit** le parcours cible sans casser la navigation ni les permissions manifestées.
- Discipline manifests : si nouveaux libellés i18n, aligner `nav.*` / `runtime-demo-manifest.ts` / `public/manifests/` comme en 24.2.

### Tests — repères existants

- Garde refund : `peintre-nano/tests/unit/cashflow-refund-gate-6-4.test.tsx`
- E2E caisse spéciaux / refund : `peintre-nano/tests/e2e/cashflow-special-*.e2e.test.tsx`, `cashflow-special-ops-hub-24-2.e2e.test.tsx`
- Backend reversal / 22.5 : `recyclique/api/tests/test_story_22_5*.py`, `caisse_sale_eligibility.py` (selon pertinence)

## Références

- Epic 24 — `_bmad-output/planning-artifacts/epics.md` (Story 24.3).
- PRD — `references/operations-speciales-recyclique/2026-04-18_prd-recyclique-operations-speciales-sorties-matiere-paheko_v1-1.md` (§7 principes 7, 12 ; §10.2 remboursement standard).
- ADR — `_bmad-output/planning-artifacts/architecture/2026-04-18-adr-operations-speciales-caisse-paheko-v1.md` (D7 visibilité sync).
- Chaîne canonique — `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`.
- Paquet audit P0 — `references/operations-speciales-recyclique/2026-04-18_paquet-audit-p0-operations-speciales-recyclique.md` (§3 matrice, §6 plan P0-R1 / dégradé).
- Readiness — `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-18-operations-speciales.md`.

## QA Gate (story — avant review)

| # | Vérification |
|---|----------------|
| Q1 | Chaque AC epics §24.3 est couvert par une tâche ou une section Dev Notes. |
| Q2 | Aucune promesse UI d’écriture Paheko « instantanée » si la chaîne reste clôture → outbox. |
| Q3 | Moyen effectif de remboursement distingué du legacy vente quand pertinent. |
| Q4 | Tests nominal + dégradé sync présents ou explicitement justifiés (HITL). |

## Alignement sprint

- **development_status** : la clé `24-3-remboursement-standard-visibilite-terrain-et-chaine-paheko-et-statut-sync` est **`review`** dans `_bmad-output/implementation-artifacts/sprint-status.yaml` (implémentation DS déjà poussée). Un passage **bmad-create-story (CS) idempotent** ne doit **pas** régresser ce statut vers `ready-for-dev` ni effacer les notes DS ci-dessous.
- **epic-24** : **`in-progress`**.

## Dev Agent Record

### Agent Model Used

Task — bmad-create-story (CS create), 2026-04-18 ; Task — bmad-create-story (VS validate), 2026-04-18

### Debug Log References

N/A — création de story uniquement.

### Completion Notes List

- Story prête pour `bmad-dev-story` : contexte AC, ancres code, risques sync, tests, dépendances 24.2 / Epic 8 / 22–23.
- **Implémentation DS (2026-04-18) :** `SaleReversalResponse` enrichi (moyen effectif, moyen vente source, branche fiscale optionnelle, `paheko_accounting_sync_hint`) ; `build_sale_reversal_response` ; Peintre écran succès + `CashflowOperationalSyncNotice` ; tests pytest `test_story_24_3_*` dans `test_sale_reversal_story64_integration.py` (fichier historique 6.4) ; couverture UI : e2e remboursement existants + garde `cashflow-refund-gate-6-4` ; OpenAPI YAML + `recyclique/api/openapi.json` régénéré.
- **CS idempotent (2026-04-18) :** revue checklist / `epics.md` §24.3 — aucun changement de statut story↔sprint ; section « Alignement sprint » mise à jour pour refléter `review` post-DS.
- **VS validate (2026-04-18) :** alignement liste de fichiers / notes DS avec le dépôt (pytest 24.3 dans `test_sale_reversal_story64_integration.py` ; pas de vitest dédié `cashflow-refund-wizard-24-3` dans le repo) ; QA gate Q1–Q4 et croisement epics §24.3 OK.

### File List

- `_bmad-output/implementation-artifacts/24-3-remboursement-standard-visibilite-terrain-et-chaine-paheko-et-statut-sync.md` (ce fichier)
- `recyclique/api/src/recyclic_api/schemas/sale.py`
- `recyclique/api/src/recyclic_api/services/sale_service.py`
- `recyclique/api/openapi.json`
- `contracts/openapi/recyclique-api.yaml`
- `recyclique/api/tests/test_sale_reversal_story64_integration.py` (dont `test_story_24_3_*` — fichier nommé « story64 » pour l’historique 6.4)
- `peintre-nano/src/api/sales-client.ts`
- `peintre-nano/src/domains/cashflow/CashflowRefundWizard.tsx`
- `peintre-nano/tests/unit/cashflow-refund-gate-6-4.test.tsx` ; `peintre-nano/tests/e2e/cashflow-refund-6-4.e2e.test.tsx` / `cashflow-refund-22-5.e2e.test.tsx` (périmètre remboursement + succès)

### Change Log

- 2026-04-18 — Story 24.3 : visibilité moyen effectif + hint Paheko + tests (DS).
