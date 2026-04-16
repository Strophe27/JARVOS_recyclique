# Story 22.1 : Préparer le schéma comptable cible, le backfill et la compatibilité brownfield

Status: done

<!-- Story key : `22-1-preparer-le-schema-comptable-cible-le-backfill-et-la-compatibilite-brownfield` | Epic : epic-22 | CS bmad-create-story régénéré 2026-04-16 (force_full_graph) — contenu réaligné epics + chaîne canonique + ancres code ; sprint `22-1` = done inchangé -->

## Story

As a backend accounting migration team,  
I want the canonical accounting model introduced alongside the brownfield model,  
so that the project can move toward the new payment truth without breaking historical continuity.

## Acceptance Criteria

### Source epics (BDD)

**Given** the current brownfield still carries legacy payment assumptions  
**When** this story is completed  
**Then** the canonical accounting entities, fields, and invariants needed for payment methods, detailed payment transactions, session accounting, and `Paheko` export preparation are explicitly defined  
**And** the legacy payment field carried by the sale is downgraded to a compatibility concern rather than the accounting source of truth  

**Given** historical data and open sessions cannot be discarded  
**When** the migration path is documented  
**Then** the expected backfill scope, cutover constraints, and rollback-safe compatibility rules are written for historical sessions, open sessions, and newly closed sessions  
**And** the story names the minimum data that must exist before later corrective stories can rely on the new model  

### Critères détaillés (implémentation / preuve)

1. **Modèle canonique nommé** — Étant donné le PRD spécialisé du `2026-04-15`, quand la story est livrée, alors le projet décrit et prépare explicitement les entités, champs et invariants nécessaires pour :
   - le référentiel des moyens de paiement ;
   - le journal détaillé des transactions de paiement ;
   - la préparation de clôture comptable par session ;
   - la future émission vers `Paheko`.  
   Le champ legacy de paiement porté par la vente est explicitement traité comme un mécanisme de compatibilité, pas comme la source de vérité comptable.

2. **Compatibilité brownfield exploitable** — Étant donné que des ventes, sessions et remboursements historiques existent déjà, quand la migration est préparée, alors la story documente les règles minimales de coexistence entre ancien et nouveau modèle pour :
   - les sessions historiques ;
   - les sessions encore ouvertes ;
   - les nouvelles sessions clôturées après migration ;  
   sans réécriture silencieuse de l’historique.

3. **Backfill borné et explicite** — Étant donné que tout l’historique ne doit pas être « reconstruit » de manière spéculative, quand le plan de backfill est rédigé, alors il précise :
   - quelles données doivent être rétro-injectées ;
   - quelles données peuvent rester legacy ;
   - quelles traces d’origine doivent être préservées ;  
   et il nomme clairement les limites connues du backfill, ainsi que les **prérequis de données minimaux** dont les stories correctives ultérieures de l’epic (par ex. double lecture `22.2`) peuvent dépendre sans présumer le cutover.

4. **Autorité comptable locale préparée** — Étant donné que la clôture comptable canonique sera portée plus loin par `22.6`, quand cette story est terminée, alors le schéma et les notes de migration rendent possible une clôture basée sur le journal détaillé des transactions de paiement plutôt que sur `sales.payment_method`.

5. **Représentation canonique de la gratuité** — `free` reste un cas non financier explicite dans la chaîne de vérité locale ; la story nomme la source canonique utilisée pour les calculs et interdit de recréer un pseudo moyen de paiement `free`.

6. **Pas de régression sur les fondations existantes** — Étant donné les stories `6.4`, `6.7`, `8.1` et `8.7`, quand le schéma cible est introduit, alors les hypothèses déjà livrées restent lisibles :
   - remboursement comme opération liée et tracée ;
   - clôture locale brownfield-first ;
   - outbox/sync et corrélation sous autorité backend ;  
   sans réouverture artificielle d’`Epic 6` ou d’`Epic 8`.

## Phasage Epic 22 (gel — contexte pour le dev / VS)

- **Phase A (cette story)** : référentiel `payment_methods`, journal `payment_transactions` enrichi, compatibilité historique, backfill minimal utile — voir `cash-accounting-paheko-canonical-chain.md` § Brownfield migration.
- **Phase B (`22.2`)** : double lecture / agrégats / écarts avant cutover.
- **Phase C (stories ultérieures)** : bascule d’autorité, snapshot figé (`22.6`), builder multi-lignes (`22.7`), preuves bout-en-bout (`22.8`).  
- **Gel sync** : une session clôturée → **1 batch outbox idempotent**, N sous-écritures, **1 corrélation de batch commune** (ne pas introduire plusieurs messages concurrents par session).

## Tasks / Subtasks

- [x] **Alignement schéma et référentiel** (AC: 1, 4, 5)
  - [x] Vérifier que le référentiel `payment_methods` et les champs minimaux métier/comptables correspondent au PRD et à la chaîne dans `cash-accounting-paheko-canonical-chain.md`.
  - [x] Vérifier que les évolutions du journal `payment_transactions` (lien `payment_method_id`, `nature`, `direction`, références source, cas spéciaux) supportent la vérité comptable locale sans dupliquer le legacy comme autorité.
  - [x] Valider les invariants documentés (y compris gratuité : vente à `0`, pas de ligne financière `free` factice).

- [x] **Compatibilité brownfield et coexistence** (AC: 2, 5, 6)
  - [x] Confirmer la place résiduelle documentée de `sales.payment_method` (compatibilité uniquement).
  - [x] Vérifier que les parcours existants (vente, remboursement, clôture, outbox) restent cohérents avec les services/endpoints déjà livrés.
  - [x] S’assurer qu’aucune réécriture silencieuse de l’historique n’est introduite par migration ou script.

- [x] **Backfill et limites** (AC: 2, 3)
  - [x] Auditer le scope de backfill : données rétro-injectées vs laissées legacy ; traces d’origine conservées.
  - [x] Documenter ou tester le comportement sur historiques incomplets ou ambigus (pas de vérité reconstruite arbitrairement).
  - [x] Vérifier observabilité / rollback technique alignés avec les garde-fous epic.

- [x] **Contrats, migrations, tests** (AC: 1, 4, 6)
  - [x] Aligner OpenAPI / schémas API avec les champs canoniques attendus (compat ascendante).
  - [x] Exécuter et passer les tests dédiés (`test_story_22_1_payment_canonical_schema` et non-régression caisse / clôture / outbox listés en Références).
  - [x] Confirmer que les prérequis données pour `22.2` (section Dev Notes) sont satisfaits ou explicitement cartographiés en écart.

## Dev Notes

### Contexte

Poser la base de données et les invariants qui permettent de sortir du champ legacy `sales.payment_method` comme autorité comptable, sans casser les parcours terrain déjà livrés par `Epic 6` ni la fondation sync/outbox d’`Epic 8`. Cette story pose : le référentiel `payment_methods` ; l’évolution du journal `payment_transactions` ; les règles minimales de backfill et de coexistence brownfield ; les contraintes de cutover ultérieur vers le snapshot comptable canonique (sans réaliser le cutover ici).

### Schéma canonique — entités, champs clés, invariants (densité vérifiable)

| Élément | Rôle | Invariants / règles |
|--------|------|---------------------|
| `payment_methods` | Référentiel administrable des moyens de paiement | Identité métier stable ; informations comptables associées ; distinct du code legacy sur la vente. |
| `payment_transactions` | **Vérité comptable locale** des paiements (journal détaillé) | Supporte paiements mixtes, don en surplus, gratuité (`0`), remboursements y compris N-1 clos ; pas d’autorité comptable portée par seul `sales.payment_method`. |
| `sales.payment_method` (legacy) | Compatibilité brownfield | Maintenu pour compatibilité lecture / anciens flux ; ne définit pas le calcul comptable cible. |
| Gratuite (`free`) | Cas non financier | Vente à montant nul ; **pas** de pseudo moyen de paiement `free` dans le référentiel pour fabriquer une ligne financière. |
| Snapshot / clôture session (prép.) | Base pour `22.6`+ | Clôture future basée sur agrégats issus du journal détaillé, pas sur le seul champ legacy. |
| Outbox `Paheko` (contrainte epic) | Sync | **1 batch outbox idempotent par session clôturée**, N sous-écritures dans le lot, **1 corrélation de batch commune** ; pas plusieurs messages concurrents par session. |

### Ancres code (post-livraison — VS / audit)

| Artefact | Chemin indicatif |
|----------|------------------|
| Migration Alembic 22.1 | `recyclique/api/migrations/versions/s22_1_payment_canonical_preparation.py` (révision `s22_1_payment_canonical_prep`, seed `cash` / `check` / `card`) |
| Modèle journal | `recyclique/api/src/recyclic_api/models/payment_transaction.py` (`PaymentTransactionNature`, `PaymentTransactionDirection`, `payment_method_id`, `original_*`, `is_prior_year_special_case`) |
| Tests story | `recyclique/api/tests/test_story_22_1_payment_canonical_schema.py` |
| Contrat HTTP | `contracts/openapi/recyclique-api.yaml` |

### Prérequis données minimaux pour la story 22.2 (double lecture)

Vérifier explicitement (sans supposer le cutover ni imposer une bascule d’autorité) :

- [ ] **Couverture** : pour les sessions et ventes concernées par la comparaison, présence de lignes `payment_transactions` là où le modèle canonique exige une trace financière (hors gratuité pure non ligne).
- [ ] **Intégrité** : `payment_method_id` résolvable vers `payment_methods` lorsque le canonique est utilisé ; pas d’incohérence bloquante entre total vente et somme des lignes canoniques sur les cas tests.
- [ ] **Agrégats comparables** : mêmes périmètres de session / site / caisse pour calcul legacy vs canonique ; règles de tolérance ou d’écart documentées pour la phase B (double lecture).
- [ ] **Traçabilité** : possibilité d’identifier l’origine (backfill vs écriture live) pour interpréter les écarts.
- [ ] **Pas de présupposé cutover** : `22.2` peut démarrer dès que la double lecture est techniquement possible, même si le legacy reste affiché ou utilisé pour certains écrans.

### Intelligence stories dépendantes (Epic 22 — hors scope implémentation 22.1)

- `22.2` : comparaison agrégats, critères de cutover mesurables — ne pas présumer la bascule dans 22.1.
- `22.3` : paramétrage expert (step-up, surfaces séparées du « config admin simple »).
- `22.4`–`22.5` : parcours caisse et remboursements alignés modèle cible.
- `22.6`–`22.7` : snapshot figé et builder Paheko ; unité de sync = batch par session.
- `22.8` : rebaseline des preuves qualité / gates pour le rail canonique.

### Intelligence stories antérieures (fondations à ne pas casser)

- `6-4-ajouter-le-parcours-remboursement-sous-controle.md` : remboursement déjà borné localement ; ne pas réécrire son histoire, seulement préparer son extension comptable.
- `6-7-mettre-en-place-la-cloture-locale-exploitable-de-caisse.md` : la clôture locale existe déjà et doit rester la fin naturelle du continuum caisse.
- `8-1-implementer-un-premier-slice-syncable-de-bout-en-bout-recyclique-paheko.md` et `8-7-valider-la-reconciliation-reelle-avec-paheko.md` : l’outbox et la sync restent sous autorité backend ; ne pas absorber leur logique ici.

### Zones code probables

- `recyclique/api/src/recyclic_api/models/`
- `recyclique/api/src/recyclic_api/schemas/`
- `recyclique/api/src/recyclic_api/services/`
- `recyclique/api/migrations/versions/`
- `contracts/openapi/recyclique-api.yaml`
- `recyclique/api/tests/`

### Testing standards summary

- Tests dédiés story : `recyclique/api/tests/test_story_22_1_payment_canonical_schema.py`.
- Non-régression en DS : étendre aux modules `test_b52_p1_payments.py`, `test_sales_integration.py`, `test_cash_session_close_arch02.py`, `test_cash_session_report_workflow.py`, `test_story_8_1_paheko_outbox_slice.py` selon le périmètre touché.

### Project Structure Notes

- Racine technique API : `recyclique/api/` ; modèles et services sous `src/recyclic_api/` ; migrations Alembic sous `migrations/versions/`.
- Contrat HTTP canon : `contracts/openapi/recyclique-api.yaml` (aligner Pydantic / routes sans second client front métier).

### Guardrails d’implémentation

- Pas de seconde source de vérité comptable côté front.
- Vérité comptable locale des paiements : **`payment_transactions`** (alignement PRD / architecture) ; le schéma et les migrations ne doivent pas réintroduire `sales.payment_method` comme autorité pour les calculs cibles.
- **Gel Epic 22 (sync)** : ne pas introduire plusieurs messages outbox concurrents pour une même session clôturée ; préparer les artefacts (snapshot, corrélation, index sous-écritures) pour respecter **1 batch outbox idempotent par session clôturée** tel que fixé dans la chaîne canonique.
- Pas de migration qui « reconstruit » des vérités historiques non justifiables.
- Pas de cutover silencieux : la phase de double lecture est réservée à `22.2`.
- Pas de dérive UI ici : cette story est d’abord backend / schéma / contrat.

### Références

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 22, Story 22.1]
- [Source: `references/migration-paheko/2026-04-15_prd-recyclique-caisse-compta-paheko.md` — sections 2.2, 6, 7, 8.3, 12]
- [Source: `_bmad-output/planning-artifacts/prd.md` — delta canonique caisse/compta/Paheko]
- [Source: `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`]
- [Source: `_bmad-output/implementation-artifacts/6-4-ajouter-le-parcours-remboursement-sous-controle.md`]
- [Source: `_bmad-output/implementation-artifacts/6-7-mettre-en-place-la-cloture-locale-exploitable-de-caisse.md`]
- [Source: `_bmad-output/implementation-artifacts/8-1-implementer-un-premier-slice-syncable-de-bout-en-bout-recyclique-paheko.md`]
- [Source: `_bmad-output/implementation-artifacts/8-7-valider-la-reconciliation-reelle-avec-paheko.md`]

## Dev Agent Record

### Agent Model Used

GPT-5.4 (livraison initiale) ; régénération CS 2026-04-16 (alignement spec).

### Debug Log References

- `python -m pytest tests/test_story_22_1_payment_canonical_schema.py tests/test_cash_session_close_arch02.py tests/test_cash_session_report_workflow.py tests/test_story_8_1_paheko_outbox_slice.py`
- `python -m pytest`
- **2026-04-16 (DS)** : `python -m pytest tests/test_story_22_1_payment_canonical_schema.py -v` → 8 passed (Windows, Python 3.13)

### Completion Notes List

- Référentiel canonique `payment_methods` introduit avec seed brownfield minimal (`cash`, `check`, `card`) et comptes comptables associés.
- `payment_transactions` expose des champs canoniques préparatoires (`payment_method_id`, `nature`, `direction`, références source, cas prior-year) sans re-promouvoir `sales.payment_method` comme autorité comptable.
- La gratuité reste non financière : une vente `free` à `0` ne produit aucune ligne financière dans `payment_transactions`.
- Le backfill est borné aux cas legacy qualifiables et préserve l’historique sans reconstruction spéculative.
- Les prérequis techniques de `22.2` sont couverts : lignes résolvables vers le référentiel, traçabilité live/backfill et compatibilité brownfield maintenue avant cutover.
- Validation exécutée : suite ciblée Story 22.1 verte puis régression API complète verte (`1568 passed`, `68 skipped`).
- **2026-04-16** : Fichier story régénéré (CS `force_full_graph`) — ajout critères BDD epics, phasage Epic 22, ancres migration/tests/modèle, dépendances 22.2–22.8 ; statut sprint `done` non modifié.
- **2026-04-16 (DS bmad-dev-story)** : Revue implémentation vs AC (migration `s22_1_payment_canonical_prep`, modèles `payment_methods` / `payment_transactions`, tests dédiés, OpenAPI `payment_method_id`) ; aucun écart correctif requis ; pytest story 22-1 vert.

### File List

- `contracts/openapi/recyclique-api.yaml`
- `recyclique/api/migrations/versions/s22_1_payment_canonical_preparation.py`
- `recyclique/api/src/recyclic_api/models/__init__.py`
- `recyclique/api/src/recyclic_api/models/payment_method.py`
- `recyclique/api/src/recyclic_api/models/payment_transaction.py`
- `recyclique/api/src/recyclic_api/models/sale.py`
- `recyclique/api/src/recyclic_api/schemas/sale.py`
- `recyclique/api/src/recyclic_api/services/sale_service.py`
- `recyclique/api/tests/conftest.py`
- `recyclique/api/tests/test_cash_session_close_arch02.py`
- `recyclique/api/tests/test_cash_session_report_workflow.py`
- `recyclique/api/tests/test_story_8_1_paheko_outbox_slice.py`
- `recyclique/api/tests/test_story_22_1_payment_canonical_schema.py`
- `_bmad-output/implementation-artifacts/22-1-preparer-le-schema-comptable-cible-le-backfill-et-la-compatibilite-brownfield.md`

### Change Log

- 2026-04-15 : Story passée en `review` après validation du schéma canonique, du backfill borné, des contrats/OpenAPI et de la régression API complète.
- 2026-04-16 : Régénération **CS** (`bmad-create-story`, `force_full_graph`) — réalignement sur `epics.md`, chaîne canonique, ancres code et phasage Epic 22 ; `Status: done` conservé ; `sprint-status.yaml` non régressé.
- 2026-04-16 : Passage **DS** (`bmad-dev-story`, `force_full_graph`) — contrôle implémentation vs AC, pytest ciblé `test_story_22_1_payment_canonical_schema.py` vert ; trace Debug Log / Completion Notes.
