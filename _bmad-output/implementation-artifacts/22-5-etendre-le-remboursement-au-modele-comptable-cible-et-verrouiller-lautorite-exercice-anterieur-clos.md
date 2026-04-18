# Story 22.5 : Etendre le remboursement au modele comptable cible et verrouiller l'autorite exercice anterieur clos

Status: done

**Story key :** `22-5-etendre-le-remboursement-au-modele-comptable-cible-et-verrouiller-lautorite-exercice-anterieur-clos`  
**Epic :** 22 - Rebaseliner la caisse/compta/`Paheko` sur un modele comptable canonique

## Prerequisites (livres avant ou en parallele selon phasage)

- **6.4** — Parcours remboursement terrain (`SaleReversal`, permission `caisse.refund`, memes regles session/site) : **fondation non réécrite** ; cette story ajoute la couche canonique et l'autorite N-1 clos.
- **22.1** — Schema `payment_transactions` / natures / directions ; champs d'extension remboursement (ex. `REFUND_PAYMENT`, `original_*`, `is_prior_year_special_case`) alignes sur le journal comme **source de verite comptable locale**.
- **22.3** — Referentiel `payment_methods` + gouvernance expert ; revision comptable session (`accounting_config_revision_id`) pour tracabilite des regles appliquees.
- **22.4** — Parcours caisse nominal (mix, don, gratuite) stabilise dans le journal ; pas de regression sur les invariants 22.4 en etendant le remboursement.

## Decisions figees (ne pas redemander validation produit)

| Sujet | Decision |
|--------|----------|
| Fondation 6.4 | Le remboursement deja livre en **6.4** reste la base terrain ; pas de « revisionnisme » produit (réécriture de l'histoire ou des regles figees 6.4). |
| Verite comptable locale | **`payment_transactions`** = source de verite pour encaissements et flux financiers lies vente/remboursement ; **`sales.payment_method`** = **brownfield / compatibilite** seulement. |
| Double contexte | Distinguer **paiement d'origine** (vente source / lignes originales) vs **moyen de remboursement reel** (cash, carte, etc.) dans les lignes de journal et schemas API ; pas de melange implicite dans un seul enum legacy vente. |
| Exercice | Distinguer **exercice courant** vs **exercice anterieur clos** pour la branche metier et la compta cible (cf. sous-ecritures 2 vs 3 dans `cash-accounting-paheko-canonical-chain.md`). |
| `accounting_period_closed` | Si l'autorite est **indisponible**, **stale** ou **ambigue** : **ne jamais supposer** ; **bloquer** ou **rerouter** vers un chemin expert explicite (voir AC 4–5). |
| Second parcours | Si le cas N-1 clos **ne tient pas** dans les bornes terrain de 6.4 : **parcours admin/expert nomme** (droits, surface, methode de recherche vente source) — **interdiction** d'elargir implicitement le wizard terrain. |

## Story

As a refund governance team,  
I want refunds aligned with the canonical accounting rules and fiscal-period authority,  
So that current-period and prior-period refunds are handled safely and traceably.

## Acceptance Criteria

1. **Extension de 6.4 sans revisionnisme** — Le remboursement deja livre en `6.4` reste la fondation terrain ; cette story ajoute la couche comptable canonique **sans** réécrire l'histoire de `6.4` ni les invariants session/site/permission/anti-doublon deja livres.

2. **Alignement BDD (epics.md)** — **Etant donne** que la compta de remboursement differe selon exercice courant vs exercice anterieur clos, **quand** la story est livree, **alors** le modele distingue le **contexte de paiement d'origine** et le **contexte de remboursement** (paiement reel), **et** les consequences comptables de chaque branche sont **explicites** pour preparation snapshot/export (**22.6**).

3. **Alignement BDD (epics.md)** — **Etant donne** que les decisions sur periode closee dependent d'une connaissance comptable autoritaire, **quand** la source d'autorite est **indisponible** ou **stale**, **alors** le systeme **ne devine pas** si le remboursement touche un exercice anterieur clos, **et** le fallback est un **blocage** ou un **chemin expert explicite** avec visibilite audit.

4. **Double contexte de paiement** — Schemas et persistance distinguent **origine** (vente / lignes sources, references `original_sale_id` / `original_payment_method_id` ou equivalent coherent) et **moyen effectif de remboursement** ; le journal reflete des lignes `payment_transactions` avec `nature` / `direction` coherentes (ex. sortie, `REFUND_PAYMENT`), pas une simple inversion du champ legacy `sale.payment_method`.

5. **Cas exercice courant vs exercice clos** — La branche **exercice courant** vs **N-1 clos** est tranchee **uniquement** sur une autorite **non devinable** (voir ci-dessous) ; le drapeau metier du journal (ex. `is_prior_year_special_case`) n'est positionne qu'apres cette tranche — **jamais** par defaut UI ou config stale seule.

6. **Autorite `accounting_period_closed` (non guessable)** — Trancher noir sur blanc : **source** (ex. lecture structuree `Paheko` si disponible, **ou** etat local **versionne et rafraichi** conformement a `cash-accounting-paheko-canonical-chain.md` §7), **fraicheur** acceptable, **ordre de fallback** ; si aucune source ne satisfait les criteres au moment du remboursement : **blocage** avec message exploitable **ou** **reroutage** vers le second parcours expert — **pas** d'heuristique silencieuse ni de lecture opportuniste d'un flag.

7. **Second parcours explicite si besoin** — Si le cas exercice anterieur clos **ne peut pas** vivre dans les bornes terrain de 6.4 : introduction d'un **second parcours nomme** (`admin` / **expert-only**), avec **surface produit**, **droits**, **UX** et **methode de recherche** de la vente source (hors session courante si applicable) ; **interdit** : elargissement implicite du wizard caisse.

8. **Trace et aide operateur** — Messages et etats **explicites** pour l'operatrice ; trace **audit / journal** exploitable pour comptabilite et **22.6** / **22.7** (correlation, natures distinguees).

## Definition of Done (testable)

- **API** : tests pytest sur remboursement : exercice courant — lignes `payment_transactions` attendues, respect des garde-fous 6.4 + nouveaux garde-fous autorite ; cas autorite indisponible / stale — **blocage** ou **branche** expert sans supposition sur N-1 ; pas d'usage de `sales.payment_method` comme autorite comptable pour le journal cible.
- **OpenAPI** : `contracts/openapi/recyclique-api.yaml` aligne sur les champs payloads/reponses du reversal et du journal (codes d'erreur stables pour « autorite indisponible », « reroutage expert requis » si retenus).
- **Peintre** : au minimum tests unitaires ou e2e sur le flux remboursement etendu ou parcours expert si ajoute ; pas de regle d'autorite N-1 **simulee** uniquement cote front.
- **Alignement backlog** : les livrables restent **compatibles** avec la decomposition snapshot/ecritures (remboursements courant vs N-1 clos comme sous-flux identifiables).

## Perimetre technique par couche

| Couche | Fichiers / zones (point d'entree) |
|--------|-----------------------------------|
| Journal / modele | `recyclic_api/models/payment_transaction.py` (`PaymentTransactionNature.REFUND_PAYMENT`, `direction`, `original_sale_id`, `original_payment_method_id`, `is_prior_year_special_case`) ; `sale_reversal` / `sale_service.create_sale_reversal` pour lien avec **22.1** + extension canonique. |
| Autorite exercice | A formaliser : lecture **Paheko** (`paheko_accounting_client` ou service dedie) **et/ou** persistance locale **versionnee** ; **pas** de champ `accounting_period_closed` sur `Sale` a ce stade dans le depot — la story porte la **spec d'implementation** et les contrats. |
| Expert / admin | Sur reroutage : surfaces existantes ou a etendre type `admin_accounting_expert` / hubs admin (`peintre-nano/src/domains/admin-config/`) — a cadrer dans les taches sans dupliquer la gouvernance 22.3. |
| API HTTP | `api/api_v1/endpoints` (sales / remboursements), schemas `schemas/sale.py`. |
| Peintre | `peintre-nano/src/domains/cashflow/` (wizard remboursement 6.4) ; branchement message bloquant / lien expert si applicable. |

## Tasks / Subtasks

- [x] Cartographier l'etat **`create_sale_reversal`** + journal actuel ; definir les complements **payment_transactions** pour remboursement canon (AC: 2, 4, 8 ; DoD).
- [x] Specifier la source d'autorite, la fraicheur et la hierarchie de fallback pour **exercice clos** ; erreurs API stables si indisponible (AC: 3, 5, 6 ; DoD).
- [x] Arbitrer et documenter : N-1 clos **dans** 6.4 etendu **vs** second parcours expert ; si second parcours : PR minimal (routes, droits, recherche vente) (AC: 1, 5, 7).
- [x] Aligner OpenAPI, Pydantic et messages operateur (AC: 6, 8 ; DoD).
- [x] Couvrir pytest + tests front minimaux (DoD).

## Dev Notes

### Story precedente critique

`6-4-ajouter-le-parcours-remboursement-sous-controle.md` reste la base. Cette story **etend** vers le modele comptable cible et l'autorite fiscal-period ; elle **ne remplace pas** les arbitrages terrain figés (total, meme session, etc.) sauf **correct-course** explicite.

### Frontiere produit

- `6.4` = remboursement terrain dans ses bornes historiques.
- Remboursement **exercice anterieur clos** + recherche vente hors session + arbitrage comptable = **second parcours** nomme si les bornes 6.4 ne suffisent pas.

### Guardrails

- Pas de supposition si la cloture d'exercice n'est pas **fiable et tranchee**.
- Pas de confusion entre parcours terrain et **arbitrage expert**.
- Blocage ou reroutage d'un cas N-1 **ambigu** acceptable ; automatisme **faux** interdit.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 22, Story 22.5]
- [Source: `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` — journal, sous-ecritures remboursements, §7 `accounting_period_closed`]
- [Source: `references/migration-paheko/2026-04-15_prd-recyclique-caisse-compta-paheko.md` — sections 6.5, 6.6, 6.7, 10, 11, 14.5, 14.6]
- [Source: `_bmad-output/implementation-artifacts/6-4-ajouter-le-parcours-remboursement-sous-controle.md`]
- [Source: `_bmad-output/implementation-artifacts/22-1-preparer-le-schema-comptable-cible-le-backfill-et-la-compatibilite-brownfield.md`]
- [Source: `_bmad-output/implementation-artifacts/22-3-livrer-le-parametrage-expert-des-moyens-de-paiement-et-des-comptes-globaux.md`]
- [Source: `_bmad-output/implementation-artifacts/22-4-rebaseliner-les-parcours-caisse-pour-paiements-mixtes-don-en-surplus-et-gratuite.md`]

## Dev Agent Record

### Agent Model Used

Story Runner BMAD — Task `bmad-create-story` mode **validate (VS)** ; validation checklist + alignement epics + enrichissement technique (2026-04-16).

### Debug Log References

### Completion Notes List

- Story passee de **backlog** a **ready-for-dev** apres validation VS : prerequis, decisions figees, AC fusion epics + spec locale, DoD testable, perimetre fichier.
- L'autorite N-1 clos et le branchement Paheko/local restent le coeur du risque ; le depot n'expose pas encore `accounting_period_closed` sur `Sale` — la story impose de **livrer** la spec d'autorite sans ambiguite pour le DS.
- **DS 2026-04-16** : journal `payment_transactions` pour reversals (`REFUND_PAYMENT` / `OUTFLOW`, origine vs moyen effectif) ; snapshot `accounting_period_authority_snapshots` + service `AccountingPeriodAuthorityService` (fraicheur `ACCOUNTING_PERIOD_AUTHORITY_MAX_AGE_SECONDS`, année fiscale = année civile documentée) ; codes 409 stables `[ACCOUNTING_PERIOD_AUTHORITY_UNAVAILABLE|STALE|PRIOR_YEAR_REFUND_REQUIRES_EXPERT_PATH]` ; parcours expert avec permission `accounting.prior_year_refund` + payload `expert_prior_year_refund` ; migration Alembic `s22_5_refund_canonical_period_auth` ; pytest `test_story_22_5_refund_canonical_authority.py` ; OpenAPI + type client Peintre alignes.
- **Story Runner 2026-04-16** : chaine VS→DS→GATE→QA→CR **PASS** ; CR **APPROVE** ; gates pytest (31+1 skip) + npm (brief + e2e 22-5) verts ; `review`→`done`. `vs_loop=0`, `qa_loop=0`, `cr_loop=0`.

### File List

- `_bmad-output/implementation-artifacts/22-5-etendre-le-remboursement-au-modele-comptable-cible-et-verrouiller-lautorite-exercice-anterieur-clos.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `recyclique/api/migrations/versions/s22_5_refund_canonical_accounting_period_authority.py`
- `recyclique/api/src/recyclic_api/models/accounting_period_authority.py`
- `recyclique/api/src/recyclic_api/services/accounting_period_authority_service.py`
- `recyclique/api/src/recyclic_api/services/sale_service.py`
- `recyclique/api/src/recyclic_api/schemas/sale.py`
- `recyclique/api/src/recyclic_api/core/config.py`
- `recyclique/api/tests/test_story_22_5_refund_canonical_authority.py`
- `recyclique/api/tests/conftest.py`
- `recyclique/api/tests/caisse_sale_eligibility.py`
- `contracts/openapi/recyclique-api.yaml`
- `peintre-nano/src/api/sales-client.ts`
- `peintre-nano/tests/e2e/cashflow-refund-22-5.e2e.test.tsx`
- `_bmad-output/implementation-artifacts/tests/test-summary-story-22-5-qa-e2e.md`
