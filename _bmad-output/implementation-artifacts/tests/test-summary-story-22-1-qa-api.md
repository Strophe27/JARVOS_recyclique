# Resume QA automatisee - Story 22.1 (backend / pytest)



**Story :** `22-1-preparer-le-schema-comptable-cible-le-backfill-et-la-compatibilite-brownfield`  

**Date (session QA initiale) :** 2026-04-15  

**Date (re-validation apres correctif DS PaymentTransaction / correction sensible) :** 2026-04-15  

**Date (re-validation Story Runner BMAD, `force_full_graph`) :** 2026-04-16  

**Skill :** `bmad-qa-generate-e2e-tests`



## Verdict



**PASS** — La story 22.1 reste un perimetre **backend/schema/migration/contrat**. Aucun E2E UI n'a ete ajoute pendant cette passe QA, car la story ne livre pas de parcours `peintre-nano` et le brief indique explicitement : "pas d'exiger peintre-nano sauf regression detectee".



L'alternative retenue est une **QA ciblee backend** :



- relecture du perimetre story (`models`, `schemas`, `services`, migration Alembic, OpenAPI) ;

- verification des tests dedies story `22.1` (fichier unique, **8** tests pytest) ;

- re-execution des regressions cash-session / outbox liees au freeze Epic 22 ;

- **non-regression Story 6.8** : `test_sale_correction_story_68.py` (API correction sensible, alignee avec l'alignement `PaymentTransaction` en correction).



### Correctif associe a cette re-validation (garde-fou canonique)



- Rejet du moyen `free` dans la **repartition explicite** `payments` (creation vente et finalisation ticket en attente), pour eviter des lignes `PaymentTransaction` incoherentes ; le gratuit nominal reste le flux dedie (total 0 / special encaissement sans `payments` explicites avec `free`). Implementation : `SaleService._resolve_payments` et `_resolve_payments_for_finalize` dans `recyclique/api/src/recyclic_api/services/sale_service.py`.



## Couverture revue



### Tests Story 22.1 (`test_story_22_1_payment_canonical_schema.py`) — **8 tests**



1. `test_create_sale_returns_canonical_payment_fields` — champs canoniques `payment_method_id`, `payment_method_code`, `nature`, `direction` sur paiements mixtes.

2. `test_free_zero_special_sale_stays_non_financial` — `free` + total 0 : aucune `payment_transactions`.

3. `test_create_sale_rejects_free_in_explicit_payments` — `free` interdit dans `payments` explicites (422).

4. `test_finalize_held_sale_rejects_free_in_explicit_payments` — idem sur `finalize-held`.

5. `test_sale_correction_payment_method_aligns_single_payment_transaction` — correction moyen : ligne unique alignee (CR B1).

6. `test_sale_correction_payment_method_and_total_align_payment_transaction` — correction total + moyen.

7. `test_sale_correction_payment_method_rejects_multiple_payment_rows` — plusieurs lignes : rejet correction moyen.

8. `test_sale_correction_payment_method_zero_rows_only_updates_legacy_sale_column` — legacy sans lignes : pas de creation de ligne PT.



Les points **5 a 8** couvrent le **correctif DS** (alignement `PaymentTransaction` sur `apply_sensitive_sale_correction`). Les points **3 a 4** sont des garde-fous coherents avec le modele canonique.



### Non-regression Story 6.8 (correction vente sensible)



- `recyclique/api/tests/test_sale_correction_story_68.py` — whitelist, super-admin, step-up PIN, audit, session ouverte ; a executer avec le lot 22.1 pour verifier qu'aucune regression API n'apparait sur le meme service de vente.



### Regressions backend relancees en QA



- `recyclique/api/tests/test_cash_session_close_arch02.py` — cloture de session et garde-fous de variance.

- `recyclique/api/tests/test_cash_session_report_workflow.py` — rapport de session et restrictions de site.

- `recyclique/api/tests/test_story_8_1_paheko_outbox_slice.py` — lot outbox, idempotence/retry, admin outbox, contrat OpenAPI.



## Execution



```bash

cd recyclique/api

python -m pytest tests/test_story_22_1_payment_canonical_schema.py tests/test_cash_session_close_arch02.py tests/test_cash_session_report_workflow.py tests/test_story_8_1_paheko_outbox_slice.py tests/test_sale_correction_story_68.py -q

```



Resultat (re-execution QA Story Runner, 2026-04-15) : **PASS** — `33 passed`, exit code `0`. Avertissements connus (Pydantic `config`, `utcfromtimestamp` dans `export_service`) sans echec de test.

Resultat (re-execution QA worker `bmad-qa-generate-e2e-tests`, 2026-04-16, story `22-1`, `force_full_graph`) :

- Lot story + regressions citees dans la story (`test_story_22_1_payment_canonical_schema`, `test_cash_session_close_arch02`, `test_cash_session_report_workflow`, `test_story_8_1_paheko_outbox_slice`) : **26 passed** en ~20 s, exit code `0`.
- Lot elargi incluant non-regression Story 6.8 (`test_sale_correction_story_68.py`) : **33 passed**, exit code `0` (memes avertissements sans echec).



## Couverture vs nouveaux tests



- **Nouveaux tests E2E/UI :** aucun

- **Nouveaux tests API :** evolution du fichier `test_story_22_1_payment_canonical_schema.py` (8 tests au total, dont alignement correction + rejet `free` explicite)

- **Tests existants verifies en QA :** 5 fichiers pytest, **33** tests passes



Cette decision reste volontaire et conforme au brief : la story 22.1 prepare la chaine canonique locale sans exposition UI autonome. Les E2E de bout en bout restent prioritaires sur `22.2`, `22.6`, `22.7`, `22.8`.



## Fichiers inspectes dans le perimetre story



- `recyclique/api/src/recyclic_api/models/payment_method.py`

- `recyclique/api/src/recyclic_api/models/payment_transaction.py`

- `recyclique/api/src/recyclic_api/services/sale_service.py`

- `recyclique/api/src/recyclic_api/schemas/sale.py`

- `recyclique/api/migrations/versions/s22_1_payment_canonical_preparation.py`

- `contracts/openapi/recyclique-api.yaml`



## Livrables QA de cette passe



- **Mis a jour :** `_bmad-output/implementation-artifacts/tests/test-summary-story-22-1-qa-api.md`

- **Code applicatif touche (garde-fou) :** `recyclique/api/src/recyclic_api/services/sale_service.py`



## Checklist workflow Quinn



- [x] Tests API applicables verifies

- [ ] E2E UI generes

- [x] Happy path + erreurs/regressions critiques verifies

- [x] Tests executes avec succes

- [x] Resume cree



## Conclusion



QA **PASS** en mode backend cible + non-reg 6.8. Les tests 22.1 couvrent le schema canonique, les corrections sensibles sur `PaymentTransaction`, et le rejet de `free` dans les paiements explicites.

