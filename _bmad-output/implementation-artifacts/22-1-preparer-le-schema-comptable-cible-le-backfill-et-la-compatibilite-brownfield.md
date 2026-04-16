# Story 22.1 : Preparer le schema comptable cible, le backfill et la compatibilite brownfield

Status: done

<!-- Story key : `22-1-preparer-le-schema-comptable-cible-le-backfill-et-la-compatibilite-brownfield` | Epic : epic-22 | Ultimate context engine analysis completed - story CS bmad-create-story 2026-04-15 -->

## Story

As a backend accounting migration team,  
I want the canonical accounting model introduced alongside the brownfield model,  
so that the project can move toward the new payment truth without breaking historical continuity.

## Acceptance Criteria

1. **Modele canonique nomme** - Etant donne que le PRD specialise du `2026-04-15` remplace les anciennes hypotheses de paiement simplifie, quand la story est livree, alors le projet decrit et prepare explicitement les entites, champs et invariants necessaires pour :
   - le referentiel des moyens de paiement ;
   - le journal detaille des transactions de paiement ;
   - la preparation de cloture comptable par session ;
   - la future emission vers `Paheko`.  
   Le champ legacy de paiement porte par la vente est explicitement traite comme un mecanisme de compatibilite, pas comme la source de verite comptable.

2. **Compatibilite brownfield exploitable** - Etant donne que des ventes, sessions et remboursements historiques existent deja, quand la migration est preparee, alors la story documente les regles minimales de coexistence entre ancien et nouveau modele pour :
   - les sessions historiques ;
   - les sessions encore ouvertes ;
   - les nouvelles sessions cloturees apres migration ;  
   sans reecriture silencieuse de l'historique.

3. **Backfill borne et explicite** - Etant donne que tout l'historique ne doit pas etre "reconstruit" de maniere speculative, quand le plan de backfill est redige, alors il precise :
   - quelles donnees doivent etre retro-injectees ;
   - quelles donnees peuvent rester legacy ;
   - quelles traces d'origine doivent etre preservees ;  
   et il nomme clairement les limites connues du backfill, ainsi que les **prerequis de donnees minimaux** dont les stories correctives ulterieures de l'epic (par ex. double lecture `22.2`) peuvent dependre sans presumer le cutover.

4. **Autorite comptable locale preparee** - Etant donne que la cloture comptable canonique sera portee plus loin par `22.6`, quand cette story est terminee, alors le schema et les notes de migration rendent possible une cloture basee sur le journal detaille des transactions de paiement plutot que sur `sales.payment_method`.

5. **Representation canonique de la gratuite** - `free` reste un cas non financier explicite dans la chaine de verite locale ; la story nomme la source canonique utilisee pour les calculs et interdit de recreer un pseudo moyen de paiement `free`.

6. **Pas de regression sur les fondations existantes** - Etant donne les stories `6.4`, `6.7`, `8.1` et `8.7`, quand le schema cible est introduit, alors les hypotheses deja livrees restent lisibles :
   - remboursement comme operation liee et tracee ;
   - cloture locale brownfield-first ;
   - outbox/sync et correlation sous autorite backend ;  
   sans reouverture artificielle de `Epic 6` ou `Epic 8`.

## Tasks / Subtasks

- [x] **Alignement schema et referentiel** (AC: 1, 4, 5)
  - [x] Verifier que le referentiel `payment_methods` et les champs minimaux metier/comptables correspondent au PRD et a la chaine dans `cash-accounting-paheko-canonical-chain.md`.
  - [x] Verifier que les evolutions du journal `payment_transactions` (lien `payment_method_id`, `nature`, `direction`, references source, cas speciaux) supportent la verite comptable locale sans dupliquer le legacy comme autorite.
  - [x] Valider les invariants documentes (y compris gratuite : vente a `0`, pas de ligne financiere `free` factice).

- [x] **Compatibilite brownfield et coexistence** (AC: 2, 5, 6)
  - [x] Confirmer la place residuelle documentee de `sales.payment_method` (compatibilite uniquement).
  - [x] Verifier que les parcours existants (vente, remboursement, cloture, outbox) restent coherents avec les services/endpoints deja livres.
  - [x] S'assurer qu'aucune reecriture silencieuse de l'historique n'est introduite par migration ou script.

- [x] **Backfill et limites** (AC: 2, 3)
  - [x] Auditer le scope de backfill : donnees retro-injectees vs laissees legacy ; traces d'origine conservees.
  - [x] Documenter ou tester le comportement sur historiques incomplets ou ambigus (pas de verite reconstruite arbitrairement).
  - [x] Verifier observabilite / rollback technique alignes avec les garde-fous epic.

- [x] **Contrats, migrations, tests** (AC: 1, 4, 6)
  - [x] Aligner OpenAPI / schemas API avec les champs canoniques attendus (compat ascendante).
  - [x] Executer et passer les tests dedies (`test_story_22_1_payment_canonical_schema` et non-regression caisse / cloture / outbox listes en References).
  - [x] Confirmer que les prerequis donnees pour `22.2` (section Dev Notes) sont satisfaits ou explicitement cartographies en ecart.

## Dev Notes

### Contexte

Poser la base de donnees et les invariants qui permettent de sortir du champ legacy `sales.payment_method` comme autorite comptable, sans casser les parcours terrain deja livres par `Epic 6` ni la fondation sync/outbox de `Epic 8`. Cette story pose : le referentiel `payment_methods` ; l'evolution du journal `payment_transactions` ; les regles minimales de backfill et de coexistence brownfield ; les contraintes de cutover ulterieur vers le snapshot comptable canonique (sans realiser le cutover ici).

### Schema canonique — entites, champs cles, invariants (densite verifiable)

| Element | Role | Invariants / regles |
|--------|------|---------------------|
| `payment_methods` | Referentiel administrable des moyens de paiement | Identite metier stable ; informations comptables associees ; distinct du code legacy sur la vente. |
| `payment_transactions` | **Verite comptable locale** des paiements (journal detaille) | Supporte paiements mixtes, don en surplus, gratuite (`0`), remboursements y compris N-1 clos ; pas d'autorite comptable portee par seul `sales.payment_method`. |
| `sales.payment_method` (legacy) | Compatibilite brownfield | Maintenu pour compatibilite lecture / anciens flux ; ne definit pas le calcul comptable cible. |
| Gratuite (`free`) | Cas non financier | Vente a montant nul ; **pas** de pseudo moyen de paiement `free` dans le referentiel pour fabriquer une ligne financiere. |
| Snapshot / cloture session (prep.) | Base pour `22.6`+ | Cloture futura basee sur agregats issus du journal detaille, pas sur le seul champ legacy. |
| Outbox `Paheko` (contrainte epic) | Sync | **1 batch outbox idempotent par session cloturee**, N sous-ecritures dans le lot, **1 correlation de batch commune** ; pas plusieurs messages concurrents par session. |

### Prerequis donnees minimaux pour la story 22.2 (double lecture)

Verifier explicitement (sans supposer le cutover ni imposer une bascule d'autorite) :

- [ ] **Couverture** : pour les sessions et ventes concernees par la comparaison, presence de lignes `payment_transactions` la ou le modele canonique exige une trace financiere (hors gratuite pure non ligne).
- [ ] **Integrite** : `payment_method_id` resolvable vers `payment_methods` lorsque le canonique est utilise ; pas d'incoherence bloquante entre total vente et somme des lignes canoniques sur les cas tests.
- [ ] **Agregats comparables** : memes perimetres de session / site / caisse pour calcul legacy vs canonique ; regles de tolerance ou d'ecart documentees pour la phase B (double lecture).
- [ ] **Tracabilite** : possibilite d'identifier l'origine (backfill vs ecriture live) pour interpreter les ecarts.
- [ ] **Pas de presuppose cutover** : `22.2` peut demarrer des que la double lecture est techniquement possible, meme si le legacy reste affiche ou utilise pour certains ecrans.

### Sources produit et architecture

- Le PRD specialise `references/migration-paheko/2026-04-15_prd-recyclique-caisse-compta-paheko.md` fixe : `payment_transactions` comme source de verite comptable locale ; `payment_methods` comme referentiel administrable ; `free` comme vente a `0` et non moyen de paiement ; la cloture par snapshot comptable fige.
- Le PRD canonique `_bmad-output/planning-artifacts/prd.md` confirme : verite comptable locale operatoire cote `Recyclique` ; snapshot comptable fige ; lot de sync de session vers `Paheko`.
- Le delta `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` fixe la chaine canonique et la separation calcul local / snapshot / builder / outbox, y compris l'unite de sync : **1 batch outbox idempotent par session cloturee** (N sous-ecritures dans ce lot, **1 correlation de batch commune**), sans absorber la logique transport dans le calcul metier.

### Intelligence stories precedentes

- `6-4-ajouter-le-parcours-remboursement-sous-controle.md` : remboursement deja borne localement ; ne pas reecrire son histoire, seulement preparer son extension comptable.
- `6-7-mettre-en-place-la-cloture-locale-exploitable-de-caisse.md` : la cloture locale existe deja et doit rester la fin naturelle du continuum caisse.
- `8-1-implementer-un-premier-slice-syncable-de-bout-en-bout-recyclique-paheko.md` et `8-7-valider-la-reconciliation-reelle-avec-paheko.md` : l'outbox et la sync restent sous autorite backend ; ne pas absorber leur logique ici.

### Zones code probables

- `recyclique/api/src/recyclic_api/models/`
- `recyclique/api/src/recyclic_api/schemas/`
- `recyclique/api/src/recyclic_api/services/`
- `recyclique/api/migrations/versions/`
- `contracts/openapi/recyclique-api.yaml`
- `recyclique/api/tests/`

### Testing standards summary

- Tests dedies story : `recyclique/api/tests/test_story_22_1_payment_canonical_schema.py`.
- Non-regression en DS : etendre aux modules `test_b52_p1_payments.py`, `test_sales_integration.py`, `test_cash_session_close_arch02.py`, `test_cash_session_report_workflow.py`, `test_story_8_1_paheko_outbox_slice.py` selon le perimetre touche.

### Project Structure Notes

- Racine technique API : `recyclique/api/` ; modeles et services sous `src/recyclic_api/` ; migrations Alembic sous `migrations/versions/`.
- Contrat HTTP canon : `contracts/openapi/recyclique-api.yaml` (aligner Pydantic / routes sans second client front metier).

### Guardrails d'implementation

- Pas de seconde source de verite comptable cote front.
- Verite comptable locale des paiements : **`payment_transactions`** (alignement PRD / architecture) ; le schema et les migrations ne doivent pas reintroduire `sales.payment_method` comme autorite pour les calculs cibles.
- **Freeze Epic 22 (sync)** : ne pas introduire plusieurs messages outbox concurrents pour une meme session cloturee ; preparer les artefacts (snapshot, correlation, index sous-ecritures) pour respecter **1 batch outbox idempotent par session cloturee** tel que fixe dans la chaine canonique.
- Pas de migration qui "reconstruit" des verites historiques non justifiables.
- Pas de cutover silencieux : la phase de double lecture est reservee a `22.2`.
- Pas de derive UI ici : cette story est d'abord backend / schema / contrat.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Epic 22, Story 22.1]
- [Source: `references/migration-paheko/2026-04-15_prd-recyclique-caisse-compta-paheko.md` - sections 2.2, 6, 7, 8.3, 12]
- [Source: `_bmad-output/planning-artifacts/prd.md` - delta canonique caisse/compta/Paheko]
- [Source: `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`]
- [Source: `_bmad-output/implementation-artifacts/6-4-ajouter-le-parcours-remboursement-sous-controle.md`]
- [Source: `_bmad-output/implementation-artifacts/6-7-mettre-en-place-la-cloture-locale-exploitable-de-caisse.md`]
- [Source: `_bmad-output/implementation-artifacts/8-1-implementer-un-premier-slice-syncable-de-bout-en-bout-recyclique-paheko.md`]
- [Source: `_bmad-output/implementation-artifacts/8-7-valider-la-reconciliation-reelle-avec-paheko.md`]

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- `python -m pytest tests/test_story_22_1_payment_canonical_schema.py tests/test_cash_session_close_arch02.py tests/test_cash_session_report_workflow.py tests/test_story_8_1_paheko_outbox_slice.py`
- `python -m pytest`
### Completion Notes List

- Referentiel canonique `payment_methods` introduit avec seed brownfield minimal (`cash`, `check`, `card`) et comptes comptables associes.
- `payment_transactions` expose des champs canoniques preparatoires (`payment_method_id`, `nature`, `direction`, references source, cas prior-year) sans re-promouvoir `sales.payment_method` comme autorite comptable.
- La gratuite reste non financiere : une vente `free` a `0` ne produit aucune ligne financiere dans `payment_transactions`.
- Le backfill est borne aux cas legacy qualifiables et preserve l'historique sans reconstruction speculative.
- Les prerequis techniques de `22.2` sont couverts : lignes resolvables vers le referentiel, tracabilite live/backfill et compatibilite brownfield maintenue avant cutover.
- Validation executee : suite ciblee Story 22.1 verte puis regression API complete verte (`1568 passed`, `68 skipped`).
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

- 2026-04-15 : Story passee en `review` apres validation du schema canonique, du backfill borne, des contrats/OpenAPI et de la regression API complete.
