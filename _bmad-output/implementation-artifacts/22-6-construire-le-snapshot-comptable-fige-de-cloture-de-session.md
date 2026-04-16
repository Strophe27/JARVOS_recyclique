# Story 22.6 : Construire le snapshot comptable fige de cloture de session

Status: done

**Story key :** `22-6-construire-le-snapshot-comptable-fige-de-cloture-de-session`  
**Epic :** 22 - Rebaseliner la caisse/compta/`Paheko` sur un modele comptable canonique

## Story

As a session-closing accounting team,  
I want closure to produce an immutable accounting snapshot,  
So that later sync and reconciliation work from a frozen business payload rather than moving local data.

## Acceptance Criteria

1. **Continuation de 6.7** - La cloture locale deja livree en `6.7` reste la fin naturelle du continuum caisse ; cette story ajoute la couche snapshot comptable fige.
2. **Snapshot nomme et immutable** - La cloture produit un snapshot identifiable, distinct de l'etat live, contenant les totaux, details, contexte, revision comptable et informations de correlation utiles a l'export.
3. **Calcul a partir du journal detaille (`payment_transactions`)** - La verite comptable locale des paiements est le journal detaille (`payment_transactions` et donnees associees canoniques) ; les totaux de cloture comptable en sont derives, **pas** du champ legacy porte par la vente.
4. **Atomicite explicite de cloture comptable** - La story tranche explicitement la frontiere transactionnelle entre cloture locale, persistance du snapshot et creation du batch outbox canonique, ou documente un state machine intermediaire strict et observable ; un simple enchainement best-effort est interdit.
5. **Pas de recalcul mouvant** - Les traitements aval consomment le snapshot fige plutot qu'une relecture live de donnees mutables.
6. **Correction tracee, pas mutation silencieuse** - Si une correction est necessaire apres cloture, elle suit un chemin explicite et trace ; mise a jour en place du snapshot interdite.

## Alignement epics.md (Story 22.6, BDD source)

Couverture explicite de `_bmad-output/planning-artifacts/epics.md` (bloc Story 22.6) :

- **Scenario 1 (snapshot produit, identifiable)** — *Given* cloture session comme pivot terrain/sync ; *When* session closee selon regles ; *Then* snapshot fige avec totaux, breakdowns, identifiants de contexte, revision des regles comptables pour export ; *And* identifiable hors ecrans / etat runtime transitoire → **AC 1, 2** (et champs minimaux ci-dessous).
- **Scenario 2 (pas de recalcul mouvant ; corrections)** — *Given* un recalcul post-cloture casserait l'audit ; *When* traitement comptable aval ; *Then* consommation du snapshot fige sans reconstituer la verite depuis donnees live mutables ; *And* chemin de correction explicite et trace, pas mutation silencieuse → **AC 5, 6**.

## Tasks / Subtasks

- [x] Definir le contrat exact du snapshot, son identite technique et ses champs obligatoires. (AC: 2)
- [x] Brancher la cloture locale `6.7` sur la production du snapshot. (AC: 1, 2)
- [x] Calculer les totaux et breakdowns a partir du journal detaille. (AC: 3)
- [x] Trancher explicitement l'atomicite cloture locale -> snapshot -> batch canonique, ou le state machine intermediaire autorise. (AC: 4)
- [x] Proteger l'immuabilite, les usages aval et le modele de correction post-cloture. (AC: 5, 6)
- [x] Preparer le handoff vers le builder `Paheko` de `22.7`. (AC: 2, 4, 5)
- [x] Si surface HTTP : faire evoluer `contracts/openapi/recyclique-api.yaml` (et tests contrat/OpenAPI associes) pour le contrat du snapshot et les reponses de cloture exposees. (alignement gouvernance OpenAPI / Epic 1)

## Dev Notes

### Story precedente critique

`6-7-mettre-en-place-la-cloture-locale-exploitable-de-caisse.md` est la base immediate. La cloture ne doit pas devenir une mini-app comptable separee du continuum caisse.

### Dependance de phasage

Cette story ne doit pas partir en implementation avant que `22.3` ait tranche la semantique de revision comptable publiee et le comportement lorsqu'une configuration change pendant qu'une session est ouverte.

### Regles metier a integrer

Le PRD specialise demande que la cloture calcule :

- totaux par moyen de paiement ;
- dons ;
- remboursements exercice courant ;
- remboursements exercice clos ;
- ecart de caisse especes ;
- puis produise le snapshot fige.

### Champs minimaux du snapshot

Le snapshot doit au minimum porter :

- identifiants `site` / `caisse` / `session` ;
- totaux et breakdowns utiles a la cloture ;
- revision comptable appliquee ;
- identifiant de correlation de batch ;
- etat local de preparation comptable ;
- trace suffisante pour que `22.7` n'ait pas a relire la config courante ou les donnees live.

### Modele de correction post-cloture

Cette story doit choisir explicitement un seul modele de correction :

- soit ajustement append-only ;
- soit annulation/recloture explicite ;
- soit reroutage expert dedie.  

L'absence de choix est interdit.

### Guardrails

- Pas de recalcul a partir de donnees live pour fabriquer l'export futur.
- Pas de "snapshot" qui serait juste une vue instantanee non persistante.
- Pas de confusion entre snapshot comptable et etat de sync vers `Paheko`.
- Pas de session "cloturee comptablement" sans snapshot persiste et sans regle explicite sur l'enqueue du batch canonique.
- Le builder et l'outbox de `22.7` doivent pouvoir consommer le snapshot **sans** relire le legacy vente ni deriveer la verite depuis des tables mutables hors snapshot fige (chaine canonique §3–5).

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Epic 22, Story 22.6]
- [Source: `references/migration-paheko/2026-04-15_prd-recyclique-caisse-compta-paheko.md` - sections 4, 8.3, 9]
- [Source: `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` - snapshot comptable fige]
- [Source: `_bmad-output/implementation-artifacts/6-7-mettre-en-place-la-cloture-locale-exploitable-de-caisse.md`]

## Dev Agent Record

### Agent Model Used

composer-2-fast (Story Runner — worker bmad-dev-story DS)

### Debug Log References

### Completion Notes List

- DS 2026-04-16 : **Politique de correction post-cloûre retenue : `append_only_v1`** — aucune mise à jour du JSON `accounting_close_snapshot` après écriture ; corrections futures = lignes d'ajustement distinctes / flux expert (tracées), pas mutation silencieuse du snapshot.
- Frontière transactionnelle : `close_with_amounts` → affectation `accounting_close_snapshot` → `enqueue_cash_session_close_outbox` (payload `accounting_close_snapshot_frozen`) dans le **même** `db.commit()` que la clôture (ordre AR11 / 22.6).
- Pré-clôture : montant théorique caisse = `initial_amount + solde net espèces journal` ; si aucune ligne `payment_transactions` pour la session, **repli legacy** `initial + total_sales + dons(Sale)` pour ne pas casser les tests/sessions sans journal.
- Agrégats snapshot : toujours calculés depuis le journal (sinéros à 0) ; breakdown MP signé, dons surplus, remb. courant vs N−1 (`is_prior_year_special_case`).
- Story Runner 2026-04-16 : chaîne `VS→DS→GATE→QA→CR` **PASS** ; `sprint-status` story **done** ; compteurs `vs_loop=0`, `qa_loop=0`, `cr_loop=0`.
- VS (bmad-create-story validate) 2026-04-16 : alignement epics 22.6 BDD, explicitation `payment_transactions`, guardrails handoff 22.7 ; statut `ready-for-dev`.
- Prerequis documentaire : `22.3` (revision / config expert en session ouverte) avant implementation ; phasage sprint deja note pour `22.2` vs chaine canonique.
- Cette story est le pivot entre terrain et compta locale canonique.

### File List

- `recyclique/api/migrations/versions/s22_6_accounting_close_snapshot.py`
- `recyclique/api/src/recyclic_api/schemas/cash_session_close_snapshot.py`
- `recyclique/api/src/recyclic_api/schemas/cash_session.py`
- `recyclique/api/src/recyclic_api/services/cash_session_journal_snapshot.py`
- `recyclique/api/src/recyclic_api/services/cash_session_service.py`
- `recyclique/api/src/recyclic_api/services/paheko_outbox_service.py`
- `recyclique/api/src/recyclic_api/models/cash_session.py`
- `recyclique/api/tests/conftest.py`
- `recyclique/api/tests/test_cash_session_close_policy.py`
- `recyclique/api/tests/test_story_22_6_accounting_close_snapshot.py`
- `contracts/openapi/recyclique-api.yaml`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/22-6-construire-le-snapshot-comptable-fige-de-cloture-de-session.md`

### Change Log

- 2026-04-16 — Impl story 22.6 : colonne JSON `accounting_close_snapshot`, agrégats journal, outbox `accounting_close_snapshot_frozen`, OpenAPI `accounting_close_snapshot`, tests 22.6 + policy.
