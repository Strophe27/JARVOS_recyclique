# Story 22.7 : Generer les ecritures avancees multi-lignes `Paheko` et adapter la sync Epic 8

Status: done

**Story key :** `22-7-generer-les-ecritures-avancees-multi-lignes-paheko-et-adapter-la-sync-epic-8`  
**Epic :** 22 - Rebaseliner la caisse/compta/`Paheko` sur un modele comptable canonique

## Prerequis et gel epic-22

- **22.6 est `done` dans le sprint** : le snapshot fige existe comme input unique du builder ; pas de recalcul live ni relecture « verite » depuis ecrans ou legacy (alignement PRD delta § snapshot + § entry builder).
- **Decisions freeze a respecter** : 1 batch idempotent par session cloturee ; N sous-ecritures deterministes (ventes+dons, remb. courant, remb. clos) ; 1 correlation de batch ; index stable par sous-ecriture ; identifiants distants multiples + succes partiel explicite ; politique de retry tranchee sans doublon distant ; fondation `Epic 8` (transport / retry / quarantaine / correlation) preservee.

## Story

As a sync and accounting integration team,  
I want the existing sync foundation to consume the canonical session snapshot,  
So that `Paheko` receives deterministic multi-line balanced entries without losing idempotence or observability.

## Acceptance Criteria

1. **Fondation Epic 8 preservee** - `Epic 8` reste la fondation transport/sync/retry/quarantaine/correlation ; cette story rebase le payload comptable, pas l'architecture de fiabilite.
2. **Batch canonique par session** - L'unite canonique de sync devient un batch idempotent par session cloturee.
3. **Sous-ecritures deterministes** - Le batch contient les sous-ecritures equilibrees necessaires selon le modele retenu (par ex. ventes+dons, remboursements exercice courant, remboursements exercice clos).
4. **Statut fin multiple explicite** - Le systeme persiste correlation de batch, etat par sous-ecriture, identifiants distants multiples et succes partiel explicite si necessaire.
5. **Retry et idempotence tranches** - La story tranche explicitement si un retry rejoue le batch entier ou uniquement les sous-ecritures en echec, avec cle stable de batch, sous-cle stable par sous-ecriture et persistance obligatoire des remote IDs deja recuperees.
6. **Pas de confusion calcul / transport** - Le builder consomme le snapshot fige ; il ne recalcul pas la verite comptable depuis les ecrans ou le legacy.

## Alignement epics.md (Story 22.7, BDD source)

Couverture explicite de `_bmad-output/planning-artifacts/epics.md` (bloc Story 22.7) :

- **Scenario 1 (batch unique, sous-ecritures indexees, persistance correlation / statuts / IDs distants)** — *Given* une session closee peut exiger plusieurs sous-ecritures comptables deterministes ; *When* le builder et l'integration outbox sont en place ; *Then* l'unite canonique de sync est **un batch idempotent par session** contenant les sous-ecritures indexees requises ; *And* correlation de batch, statut par sous-ecriture, identifiants distants `Paheko` multiples persistes → **AC 2, 3, 4**.
- **Scenario 2 (succes partiel, principes Epic 8 intacts)** — *Given* un succes partiel cote `Paheko` ; *When* seules certaines sous-ecritures sont acceptees ; *Then* le modele d'etat local expose le succes partiel sans binaire tout-reussi / tout-echec fictif ; *And* retry, quarantaine et blocage selectifs restent alignes sur les principes existants → **AC 1, 4, 5** et tache « Preserver les invariants… ».

## Tasks / Subtasks

- [x] Definir le builder d'ecritures `Paheko` a partir du snapshot `22.6`. (AC: 3, 5)
- [x] Adapter le modele outbox d'`Epic 8` au batch canonique par session. (AC: 1, 2, 4)
- [x] Definir les identifiants, indices stables et etats explicites de succes partiel. (AC: 4, 5)
- [x] Trancher la politique de retry sous succes partiel et la persistance des remote IDs deja obtenues. (AC: 5)
- [x] Aligner OpenAPI / observabilite / API admin outbox si necessaire. (AC: 1, 4)
- [x] Preserver les invariants retries / quarantaine / selective blocking. (AC: 1, 4)

## Dev Notes

### Stories precedentes critiques

- `8-1-implementer-un-premier-slice-syncable-de-bout-en-bout-recyclique-paheko.md`
- `8-7-valider-la-reconciliation-reelle-avec-paheko.md`
- `22-6-construire-le-snapshot-comptable-fige-de-cloture-de-session.md`

### Regle d'architecture cle

Le delta d'architecture fixe :

- 1 batch outbox idempotent par session cloturee ;
- N sous-ecritures deterministes ;
- 1 correlation commune ;
- 1 index stable par sous-ecriture ;
- persistence des identifiants `Paheko` multiples et du succes partiel.

### Politique de reprise a figer

La story doit choisir explicitement :

- si le retry porte sur le batch entier ou sur les seules sous-ecritures en echec ;
- quelle cle d'idempotence est portee par le batch ;
- quelle sous-cle stable est portee par chaque sous-ecriture ;
- comment un remote ID deja obtenu bloque une reemission dangereuse ;
- a partir de quel seuil un succes partiel bascule en quarantaine / blocage selectif.

### Guardrails

- Ne pas refaire `Epic 8` comme si rien n'existait.
- Ne pas laisser un payload singulier "transaction unique" quand le modele demande plusieurs sous-ecritures.
- Ne pas reabsorber la logique comptable dans l'outbox transport.
- Ne pas laisser un retry implicite recreer des doublons distants en cas de succes partiel.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Epic 22, Story 22.7]
- [Source: `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`]
- [Source: `references/migration-paheko/2026-04-15_prd-recyclique-caisse-compta-paheko.md` - sections 8.3, 9.2, 9.3]
- [Source: `_bmad-output/implementation-artifacts/8-1-implementer-un-premier-slice-syncable-de-bout-en-bout-recyclique-paheko.md`]
- [Source: `_bmad-output/implementation-artifacts/8-7-valider-la-reconciliation-reelle-avec-paheko.md`]
- [Source: `_bmad-output/implementation-artifacts/22-6-construire-le-snapshot-comptable-fige-de-cloture-de-session.md`]

### Points d'ancrage code (brownfield, a etendre sans reecrire Epic 8)

- Transport / outbox existants : `recyclique/api/src/recyclic_api/services/paheko_outbox_service.py`, `paheko_outbox_processor.py`, `api/api_v1/endpoints/admin_paheko_outbox.py`, `schemas/paheko_outbox.py`.
- Client ecritures : `services/paheko_accounting_client.py`.
- Contrat snapshot cloture (entree builder) : `schemas/cash_session_close_snapshot.py` et flux lies dans `services/cash_session_service.py` selon evolution du modele.

### Testing / preuves minimales

- Tests unitaires sur le builder : decomposition N lignes, equilibre, determinisme (meme snapshot -> meme ordre / memes cles).
- Tests d'integration ou API sur le batch : idempotence de cle de batch, sous-cles stables, etat partiel simule (IDs distants partiels) sans doublon au retry.
- **API admin** : GET `/admin/paheko-outbox/items/{id}` expose `close_batch_state` (structure `PahekoCloseBatchStatePublic`) une fois le processor ayant persisté l'etat — couvert par `test_admin_get_item_exposes_close_batch_state_json` dans `test_story_22_7_outbox_processor_batch.py`.
- Mise a jour `contracts/openapi/recyclique-api.yaml` et tests OpenAPI/contrat si le payload admin ou l'observabilite outbox evoluent (alignement Epic 1).

## Dev Agent Record

### Agent Model Used

composer-2-fast (Story Runner Task) — DS implémentation 22.7.

### Debug Log References

### Completion Notes List

- **Builder** `paheko_close_batch_builder` : 3 sous-écritures déterministes (index 0..2) depuis `accounting_close_snapshot_frozen` uniquement ; montants `sales_donations = sum(by_pm)+Rc+Rp`, remboursements courant / N-1 clos ; corps HTTP via `build_close_transaction_line_payload` (swap débit/crédit pour les remboursements).
- **Politique retry (AC5)** : `resume_failed_sub_writes_v1` — à chaque passage processor, reprise **uniquement** des sous-écritures non `delivered` / non `skipped_zero` ; sous-clés `Idempotency-Key` stables `{batch_ikey}:sub:{index}:{kind}` ; états + `remote_transaction_id` dans `payload.paheko_close_batch_state_v1`.
- **Transport Epic 8** : une ligne `paheko_outbox_items` inchangée ; pas de refonte scheduler/quarantaine ; succès global `delivered` + `sync_state_core=resolu` seulement si toutes les sous-écritures terminées ; échec retryable sur sous-ensemble → `pending` + backoff ; échec non retryable sur une sous-écriture → quarantaine batch.
- **API admin / OpenAPI** : `close_batch_state` sur les vues outbox ; schémas `PahekoCloseBatchStatePublic` / sous-entrées.
- **Tests** : `test_story_22_7_*.py` (dont assertion GET admin `close_batch_state` après livraison) ; ajustement `test_story_8_1` (journal + preview montant 1re sous-écriture depuis snapshot). **Story Runner (gate)** : `test_story_8_2` enrichi vente+journal pour montants snapshot non nuls ; assertion `Idempotency-Key` = sous-clé batch ; `paheko_outbox_processor` propage le dernier HTTP réel (ex. 409) à la ligne outbox en fin de batch ; OpenAPI `PahekoOutboxItemPublic` doc idempotence batch vs clé ligne.

### File List

- `recyclique/api/src/recyclic_api/services/paheko_close_batch_builder.py` (créé)
- `recyclique/api/src/recyclic_api/services/paheko_transaction_payload_builder.py`
- `recyclique/api/src/recyclic_api/services/paheko_outbox_processor.py`
- `recyclique/api/src/recyclic_api/schemas/paheko_outbox.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_paheko_outbox.py`
- `recyclique/api/tests/test_story_22_7_paheko_close_batch_builder.py` (créé)
- `recyclique/api/tests/test_story_22_7_outbox_processor_batch.py` (créé)
- `recyclique/api/tests/test_story_8_1_paheko_outbox_slice.py`
- `recyclique/api/tests/test_story_8_2_paheko_outbox_retry_idempotence.py`
- `contracts/openapi/recyclique-api.yaml`
- `_bmad-output/implementation-artifacts/22-7-generer-les-ecritures-avancees-multi-lignes-paheko-et-adapter-la-sync-epic-8.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-04-16 — Implémentation batch multi-sous-écritures Paheko depuis snapshot 22.6 + état payload + OpenAPI + tests.
