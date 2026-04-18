# Story 22.4 : Rebaseliner les parcours caisse pour paiements mixtes, don en surplus et gratuite

Status: done

**Story key :** `22-4-rebaseliner-les-parcours-caisse-pour-paiements-mixtes-don-en-surplus-et-gratuite`  
**Epic :** 22 - Rebaseliner la caisse/compta/`Paheko` sur un modele comptable canonique

## Prerequisites (livres avant dev)

- **22.1** — `payment_transactions` comme verite comptable locale ; `sales.payment_method` brownfield uniquement ; gratuite non financiere (`free` pas une ligne `payments[]` factice).
- **22.3** — referentiel `payment_methods` gouverne ; revision comptable figee a l’ouverture de session (`accounting_config_revision_id`).

## Decisions figees (ne pas re-ouvrir)

| Sujet | Decision |
|--------|----------|
| Verite locale encaissements | `payment_transactions` ; pas le champ legacy vente pour le calcul cible. |
| `sales.payment_method` | Compatibilite / brownfield uniquement. |
| `free` | Non financier : jamais un « moyen de paiement » dans le referentiel ni une ligne financiere simulee. |
| Paiements mixtes | Supportes comme plusieurs lignes metier coherentes avec le journal. |
| Don surplus | Distinct du reglement de vente ; jamais implicite. |
| Parcours | Operable clavier ; donnees compatibles avec la cloture (`22.6`) et les ecritures (`22.7`). |

## Story

As a cashflow product team,  
I want the sale finalization flow aligned with the canonical accounting model,  
So that mixed payments, extra donations, and zero-value sales become first-class and traceable behaviors.

## Acceptance Criteria

1. **Paiements mixtes natifs** — Le parcours caisse supporte nativement plusieurs lignes de paiement pour une meme vente sans les aplatir dans une seule valeur legacy ; le corps de requete et la persistance produisent plusieurs entrees coherentes dans `payment_transactions` (nature `sale_payment` pour le reglement).

2. **Don distinct du paiement** — Un surplus laisse en don est trace comme **mouvement distinct** du reglement de vente : au minimum une ligne `payment_transactions` avec `nature = donation_surplus` (ou equivalent valide dans le modele 22.1), separee des lignes `sale_payment`, et alignee sur le referentiel `payment_methods` / comptes expert (`22.3`) cote serveur.

3. **Gratuite explicite** — `free` est traite comme une vente a `0`, avec ticket et trace metier, **sans** encaissement ni ligne `payments[]` financiere ; `payment_method=free` au niveau vente uniquement quand le total est nul.

4. **Arbitrages terrain (serveur + UI)**  
   - Sous-paiement : **pas de finalisation** tant que le montant encaisse + **don explicite** ne couvre pas le montant du ticket (meme regle pour vente directe et ticket tenu puis finalise).  
   - Surpaiement non-don : **interdit par defaut** ; tout excedent doit etre corrige ou bascule **explicitement** en don en surplus (ligne/etat visible).  
   - Don : **jamais implicite** ; libelle ou etat distinct cote UI.  
   - Passage a `free` : **efface** les lignes financieres du brouillon courant et **interdit** `free` + encaissement.  
   - Pas de trace comptable « finale » avant finalisation reussie ; annulation / retour arriere sans ecriture figee.

5. **UX terrain preservee** — Parcours **clavier-first** (ajout/suppression ligne, validation, annulation, confirmation) ; libelles **metier** simples en caisse (pas de vocabulaire comptable expert inutile).

6. **Pas de logique comptable canonique finale cote front** — Peintre envoie des **intentions metier** (lignes, montants, choix gratuit/don) et affiche les reponses serveur ; pas de calcul « Paheko » ou d’invariants comptables finaux dans le client.

7. **Compatibilite avec la suite** — Les donnees produites restent exploitables par **22.6** (snapshot) et **22.7** (ecritures) : journal detaille coherent, natures de lignes discriminant reglement vs don surplus, gratuite sans lignes financieres parasites.

8. **Alignement BDD (epics)** — Etant donne l’ancien flux caisse insuffisant pour le modele comptable cible, quand la story est livree, les cas mixtes, don surplus et gratuite ne sont pas reduits a une seule valeur legacy, et tout cas volontairement differe est **nomme** plutot que refuse silencieusement. Etant donne l’exigence terrain, le flux preserve l’operabilite clavier et un retour operateur explicite sur les nouveaux cas.

## Definition of Done (testable)

- **API** : nouveaux ou etendus tests pytest sur la vente et la finalisation (`recyclique/api/tests/test_b52_p1_payments.py` et/ou `recyclique/api/tests/test_story_22_4_*.py` si crees) couvrant : sous-paiement refuse ; surpaiement sans don explicite refuse ; mix valide ; don surplus avec ligne `donation_surplus` ; gratuite sans `payments[]` financier ; non-regression sur sessions / agrégats session pour les parcours touches.
- **OpenAPI** : `contracts/openapi/recyclique-api.yaml` aligne avec les champs et codes d’erreur effectivement servis pour les memes regles (description ou schemas `SaleCreateV1`, `SaleFinalizeHeldV1`, `PaymentCreateV1` / reponses `PaymentResponseV1`).
- **Peintre** : tests e2e ou unitaires ciblés dans `peintre-nano/tests/e2e/cashflow-nominal-6-1.e2e.test.tsx` et/ou voisins `cashflow-held-6-3`, plus tests unitaires widgets caisse si touches ; pas de regression sur les autres parcours caisse du manifeste.

## Perimetre technique par couche

| Couche | Fichiers / contrats (point d’entree) |
|--------|--------------------------------------|
| Backend | `recyclique/api/src/recyclic_api/services/sale_service.py` (`_resolve_payments`, `_resolve_payments_for_finalize`, `finalize_held_sale`, `create_sale`, `_build_payment_transaction`) ; `recyclique/api/src/recyclic_api/schemas/sale.py` ; modele `recyclic_api/models/payment_transaction.py`. |
| API HTTP | `recyclique/api/src/recyclic_api/api/api_v1/endpoints/` (routes `sales`). |
| OpenAPI | `contracts/openapi/recyclique-api.yaml` — `POST /v1/sales/`, `POST /v1/sales/{sale_id}/finalize-held`, `GET /v1/sales/{sale_id}` ; schemas `SaleCreateV1`, `SaleFinalizeHeldV1`, `PaymentCreateV1`, `SaleResponseV1`, `PaymentResponseV1` (sortie deja enrichie `payment_method_id`, `nature`, etc.). |
| Peintre | `peintre-nano/src/domains/cashflow/` (wizard nominal, finalize dock, etat panier) ; manifests `contracts/creos/manifests/` si navigation liee. |

## Etat code connu au moment de la validation story

- Paiements multiples enum-based (`cash` / `card` / `check`) sont deja valides cote `_resolve_payments*` avec `sum(payments) >= total` ; **la ligne `donation_surplus` et le blocage surpaiement non explicite peuvent etre incomplets** — c’est le ceur de la story.
- Les reponses exposent deja des champs canoniques sur `PaymentResponse` ; les **regles metier** (decoupage surplus, blocages) doivent etre **serveur-autoritaires** et reflétées dans l’UI.

## Tasks / Subtasks

- [x] Rebaseliner le flux de finalisation caisse avec lignes de paiement multiples et validations arbitrage (AC: 1, 4, 6, 8).
- [x] Implementer don surplus comme lignes journal distinctes + UX explicite (AC: 2, 4, 7).
- [x] Introduire / renforcer la gratuite comme cas explicite sans lignes financieres (AC: 3, 4, 7).
- [x] Aligner OpenAPI, schemas Pydantic et messages d’erreur (AC: 4, 6, Definition of Done).
- [x] Proteger les parcours nominals existants contre regression (AC: 5, 8, Definition of Done).
- [x] Remplir la Definition of Done (pytest + vitest + OpenAPI).

## Dev Notes

### Continuite avec Epic 6

- `6.1` : parcours nominal caisse.
- `6.3` : tickets tenus / `finalize-held`.
- `6.4` : remboursement (hors perimetre fonctionnel 22.4 sauf non-regression).
- `6.7` : cloture locale.

### Sources produit

- PRD / delta : `_bmad-output/planning-artifacts/prd.md` ; `references/migration-paheko/2026-04-15_prd-recyclique-caisse-compta-paheko.md` (sections caisse, paiements mixtes, don, gratuite).

### Guardrails

- Ne pas introduire de vocabulaire comptable expert dans l’ecran caisse sauf aide courte sur cas speciaux.
- Ne pas traiter `free` comme moyen de paiement dans `payments[]`.
- Ne pas laisser la logique comptable finale s’installer dans le front.
- Pas d’ecriture Paheko ni snapshot dans cette story (22.6 / 22.7).

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 22, Story 22.4]
- [Source: `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` — chaine referentiel → journal → snapshot]
- [Source: `_bmad-output/planning-artifacts/prd.md` — delta canonique caisse/compta/Paheko]
- [Source: `references/migration-paheko/2026-04-15_prd-recyclique-caisse-compta-paheko.md`]
- [Source: `_bmad-output/implementation-artifacts/22-1-preparer-le-schema-comptable-cible-le-backfill-et-la-compatibilite-brownfield.md`]
- [Source: `_bmad-output/implementation-artifacts/22-3-livrer-le-parametrage-expert-des-moyens-de-paiement-et-des-comptes-globaux.md`]
- [Source: `_bmad-output/implementation-artifacts/6-4-ajouter-le-parcours-remboursement-sous-controle.md`]
- [Source: `_bmad-output/implementation-artifacts/6-7-mettre-en-place-la-cloture-locale-exploitable-de-caisse.md`]

## Dev Agent Record

### Agent Model Used

GPT-5.4 — create-story manual pass ; VS validate (bmad-create-story checklist) 2026-04-16

### Debug Log References

### Completion Notes List

- VS : story enrichie avec prerequisites 22.1/22.3, perimetre API/OpenAPI/Peintre, ecart connu backend (don surplus / surpaiement), Definition of Done testable, decisions figees — **ready-for-dev** pour `bmad-dev-story`.
- DS 2026-04-16 : arbitrage **serveur-autoritaire** dans `SaleService` (`_validate_payment_arbitrage_22_4`) : lignes `sale_payment` ne peuvent pas dépasser le total du ticket ; couverture = somme(règlements) + somme(`donation_surplus`) ≥ total ; sous-paiement et sur-règlement implicite refusés avec messages explicites ; gratuite (`free`) = pas de lignes financières ; persistance de `DONATION_SURPLUS` via `_build_payment_transaction` / `PaymentTransactionNature`. Schémas `donation_surplus` sur `SaleCreate` / `SaleFinalizeHeld`. Peintre (`KioskFinalizeSaleDock`) : `total_amount` aligné sur le total à payer (montant + don saisi), découpage surpaiement en `payments` + `donation_surplus`, effacement des lignes encaissées au passage **Gratuit**. Tests API `test_story_22_4_cash_sale_arbitrage.py`, ajustement intégration caisse (`cash_change`), vitest kiosque + e2e cashflow nominal/held. OpenAPI `donation_surplus` documente. Gates complets (pytest/npm) laisses au Story Runner parent.

### File List

- `recyclique/api/src/recyclic_api/services/sale_service.py`
- `recyclique/api/src/recyclic_api/schemas/sale.py`
- `recyclique/api/tests/test_story_22_4_cash_sale_arbitrage.py`
- `recyclique/api/tests/test_sales_integration.py` (parcours surpaiement → don explicite)
- `contracts/openapi/recyclique-api.yaml`
- `peintre-nano/src/api/sales-client.ts`
- `peintre-nano/src/domains/cashflow/KioskFinalizeSaleDock.tsx`
- `peintre-nano/tests/unit/kiosk-finalize-sale-enter-shortcut.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/22-4-rebaseliner-les-parcours-caisse-pour-paiements-mixtes-don-en-surplus-et-gratuite.md`

## Change Log

- 2026-04-16 — Story 22.4 implémentée (arbitrage paiements + don surplus + gratuité + OpenAPI + Peintre kiosque) ; statut **review**.
- 2026-04-16 — QA (tests API + vitest kiosque) ; CR1 **P1** (`PaymentCreate.amount` > 0) ; correctif brownfield **vente 0 €** (`sale_lines` vides si total ≤ ε, plus de `PaymentCreate(0)`) + **CR3 APPROVE** ; gates pytest cash session + story 22.4 + npm brief **verts** ; statut **done**.
