# Story 25.9 : Projection Paheko — mapping obligatoire avant succès outbox (delta Epic 8)

Status: done

**Story key :** `25-9-projection-paheko-mapping-obligatoire-avant-succes-outbox-delta-epic-8`  
**Epic :** 25 — Socle d'alignement PRD vision kiosque / multisite / permissions, brownfield et ADR  
**Implementation artifact :** `_bmad-output/implementation-artifacts/25-9-projection-paheko-mapping-obligatoire-avant-succes-outbox-delta-epic-8.md`

## Contexte produit (obligatoire)

La **spec 25.4** §**4** (_Projection Recyclique → Paheko — fermeture sans silence_) impose que, **avant** toute écriture comptable ou **émission / succès** perçu côté outbox pour une session clôturée, les **axes de mapping** (site, caisse, emplacements / entités Paheko requises par le builder, révision de paramètres comptables) soient **résolus sans ambiguïté**. En l’absence ou l’ambiguïté : **aucun** marquage « envoyé avec succès » pour le périmètre concerné ; état **visible** (échec de préparation, quarantaine, corrélation) — **pas** de substitution silencieuse d’axe analytique ou d’emplacement.

Les fondations **Epic 8** (stories **8-3** à **8-6**) ont déjà livré la **chaîne** mapping, quarantaine, corrélation, blocage sélectif. Cette story est un **delta** : elle **renforce l’alignement** avec la spec §4 et les AC **25.9** sur le **chemin outbox** (batch session, sous-écritures), en **réutilisant** les comportements et tests existants plutôt que de « reposséder » Epic 8.

L’**ADR 25-3** (*accepted*) fixe la **vérité durable** : **outbox PostgreSQL** transactionnelle, livraison at-least-once, idempotence ; **Redis** uniquement **auxiliaire** — ne pas faire de Redis une cause de « succès » comptable ni masquer l’état outbox. La chaîne canonique reste : référentiel → journal → **snapshot figé** → **builder** → **outbox** (`cash-accounting-paheko-canonical-chain.md`).

**Gate API P0** : toute évolution de codes d’erreur, statuts exposés ou schémas sur les routes caisse / clôture / outbox / supervision doit rester **cohérente OpenAPI** (`contracts/openapi/recyclique-api.yaml`) — prudence sur les promotions Paheko / caisse : pas de divergence contrat / Peintre / tests de contrat.

**Nouvelle ADR** : **non requise** tant que l’implémentation **applique** spec **25.4** §4 et ADR **25-3** sans changer les décisions structurantes ; toute évolution substantielle → **correct course** ou ADR dédiée.

**Prérequis** : **25.8** **done** (refus contexte stale, erreurs explicites) ; **25.7** **done** (checklist §2–3). La checklist **25.7** ne couvre pas la §4 ; les **ancres normatives** pour cette story sont la **spec §4** et les AC **epics** §25.9.

## Story (BDD)

As a Paheko integration owner,  
I want no outbox success marking for a closed session batch unless mandatory Recyclique-to-Paheko mapping is resolved,  
So that we never silently substitute site, emplacement, or analytical axis per spec 25.4 section 4.

## Acceptance criteria

Source normative (texte aligné sur epics) : `_bmad-output/planning-artifacts/epics.md` — **Story 25.9**.

**Given** Epic **8** stories **8-3** through **8-6** already delivered the baseline mapping and supervision chain  
**When** this story is delivered  
**Then** the change is framed as a **delta** on top of Epic **8** (references to existing behaviour and tests), not a duplicate ownership epic  
**And** missing or ambiguous mapping yields quarantine or visible failed preparation state — never silent success for Paheko sub-writes  
**And** supervision can correlate failures with mapping vs builder vs outbox at least at log or status field level required for **25.10**

### Lecture côté spec 25.4 §4

| § | Exigence (rappel) | Implication implémentation |
|---|-------------------|----------------------------|
| **4.1** | Axes de mapping obligatoires avant écriture / batch outbox session clôturée | Le pipeline **ne doit pas** avancer des sous-écritures à un état **delivered** / succès terminal si la résolution mapping / builder a échoué. |
| **4.2** | Échec visible si mapping absent ou ambigu | Statuts / payloads / logs exploitables (pas 500 générique seul) ; alignement **8-4** quarantaine. |
| **4.3** | Interdiction substitution silencieuse | Pas de « meilleur effort » site / emplacement / axe analytique. |
| **4.4** | Blocage sélectif, quarantaine, supervision causes | Points d’accrochage pour **25.10** (taxonomie mapping / builder / outbox). |

### Delta Epic 8 — ce que cette story ne refait pas

- **8-3** : vérité configuration mapping site / caisse / Paheko — **référencer** tables / services existants ; cette story **serre** les transitions d’état outbox.  
- **8-4** : quarantaine — **réutiliser** les mécanismes existants pour les échecs de préparation.  
- **8-5** : corrélation — **garantir** que les IDs / champs nécessaires à la corrélation « mapping vs builder vs outbox » sont présents ou complétés sans casser l’existant.  
- **8-6** : blocage sélectif — le défaut de mapping Paheko reste une **cause légitime** de blocage ou report (spec §4.4).

## Definition of Done

- [x] Comportement **25.9** documenté dans le code (docstring / commentaire ciblé) aux points de décision **succès partiel / total** batch et sous-écritures.  
- [x] Aucun chemin ne marque une sous-écriture **delivered** (ou équivalent succès) lorsque `resolve_enriched_payload` / builder a signalé **échec de mapping ou de construction** — comportement vérifiable par tests.  
- [x] États d’échec **visibles** (champs `payload` outbox, statut item, ou logs structurés) utilisables par la supervision **25.10** (au minimum un **code** ou **statut** discriminant mapping / builder / transport HTTP).  
- [x] Tests : extension ou nouveaux cas **pytest** sur le processeur outbox / builder (références : `test_story_8_1_paheko_outbox_slice.py`, `test_story_22_7_outbox_processor_batch.py`, ou fichiers voisins) — **pas** de duplication massive de la suite Epic 8.  
- [x] Si contrats HTTP / schémas d’erreur changent : **OpenAPI** + `pnpm run generate` si types TS impactés ; respect **gate API P0**. *(Non requis — aucun changement de contrat HTTP.)*  
- [x] Trace brève dans `_bmad-output/implementation-artifacts/tests/` : `test-summary-story-25-9-paheko-mapping-outbox.md` (chemins pytest et fichiers réels) reliant AC ↔ chemins de test.

## Tasks / Subtasks

- [x] **Cartographier le delta** (AC **Given** Epic 8)  
  - [x] Lister les points de code où un **succès** outbox / sous-écriture peut être enregistré (`paheko_outbox_processor.py`, builder batch, merge état).  
  - [x] Vérifier la cohérence avec `_apply_mapping_resolution_failure` / `resolve_enriched_payload_for_item` (ou équivalents).

- [x] **Renforcer §4.2 / §4.3** (AC **And** missing mapping)  
  - [x] Garantir **pas de succès silencieux** pour sous-écritures si mapping / payload enrichi invalide.  
  - [x] Quarantaine ou état préparation échouée **explicite**.

- [x] **Préparer 25.10** (AC **And** supervision)  
  - [x] Au moins un champ log ou JSON d’état permettant de distinguer **mapping** vs **builder** vs **outbox/HTTP** (sans livrer la taxonomie UI complète — réservée **25.10**).

- [x] **Tests & contrats**  
  - [x] Pytest ciblés + mise à jour OpenAPI si nécessaire.  
  - [x] Pas de régression sur idempotence / batch **22.7**.

- [x] **Hors scope explicite** : taxonomie supervision opérateur complète et dashboards (**25.10**) ; **nouvelle ADR** sans besoin réel.

## Dev Notes

### Architecture et fichiers probables

- Processeur outbox : `recyclique/api/src/recyclic_api/services/paheko_outbox_processor.py` (`process_next_paheko_outbox_item`, `_process_cash_session_close_batch`, `_apply_mapping_resolution_failure`).  
- Enqueue / payload : `recyclique/api/src/recyclic_api/services/paheko_outbox_service.py`, `enqueue_cash_session_close_outbox`.  
- Builder / batch : `recyclique/api/src/recyclic_api/services/paheko_close_batch_builder.py` (et modules builder payload Paheko référencés).  
- Chaîne canonique : `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`.  
- Contrats : `contracts/openapi/recyclique-api.yaml`.

### ADR 25-3 — rappels opérationnels

- Outbox **PostgreSQL** = vérité durable des jobs ; pas de double vérité **Redis**.  
- Idempotence, corrélation, quarantaine : alignés AR11 / AR12 et doc chaîne canonique.

### Dépendances Epic 25 (DAG)

- Amont : **25-8** **done**.  
- Aval : **25.10** (supervision causes racines) — cette story fournit les **champs / statuts minimum** pour corrélation.

### Anti-patterns

- Marquer **delivered** sur une sous-écriture alors que le mapping n’était pas résolu.  
- Mélanger cause **Redis** et cause **mapping** dans les messages d’erreur sans code discriminant.  
- Contourner OpenAPI sur les routes touchées.

### References

- `_bmad-output/planning-artifacts/epics.md` — **Story 25.9** ; **Stories 8.3–8.6** (Epic 8).  
- `_bmad-output/implementation-artifacts/checklists/25-7-checklist-spec-25-4-sections-2-3.md` — checklist **25.7** (spec **25.4** §2–§3 exécutables ; **ne couvre pas** §4 — périmètre de cette story).  
- `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` — **§4** (4.1–4.4).  
- `_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md` — **ADR 25-3**.  
- `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`.  
- `_bmad-output/planning-artifacts/architecture/epic-25-phase2-dag-2026-04-21.yaml`.  
- `_bmad-output/implementation-artifacts/25-8-refus-par-defaut-et-erreurs-explicites-apres-bascule-site-ou-caisse.md` (contexte **25.8**).  
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Trace Epic 25 — ADR

| Élément | Valeur |
|--------|--------|
| Nouvelle ADR structurante requise par cette story ? | **ADR N/A** — delta comportemental sous **spec 25.4** §4 et **ADR 25-3** *accepted*. |
| ADR **25-3** | `_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md` |
| Justification **N/A** | Pas de nouveau choix async / transport ; renforcement des garde-fous mapping → outbox. |

## Alignement sprint / YAML

- Clé `25-9-projection-paheko-mapping-obligatoire-avant-succes-outbox-delta-epic-8` : **`done`** dans `_bmad-output/implementation-artifacts/sprint-status.yaml` ; **`epic-25`** inchangé **`in-progress`**.

## Dev Agent Record

### Agent Model Used

Composer (bmad-dev-story Task / sprint Epic 25)

### Debug Log References

### Completion Notes List

- Renforcement **25.4 §4** : échecs préparation HTTP **sans** succès outbox ; payload **`preparation_trace_v1`** (`failure_domain`, `code`, `message`) ; transition **`auto_quarantine_builder_preparation`** pour échecs builder vs **`auto_quarantine_mapping_resolution`** pour mapping ; logs `outcome=preparation_failed` avec `failure_domain` ; sous-écritures livrées taguées **`delivery_domain=outbox_http`** ; purge trace à **delivered** réussi.
- OpenAPI inchangé (gate P0 respecté).

### File List

- `recyclique/api/src/recyclic_api/services/paheko_outbox_processor.py`
- `recyclique/api/src/recyclic_api/services/paheko_outbox_transition_audit.py`
- `recyclique/api/tests/test_story_25_9_paheko_mapping_before_outbox_success.py`
- `_bmad-output/implementation-artifacts/tests/test-summary-story-25-9-paheko-mapping-outbox.md`

### Change Log

- 2026-04-20 — DS story 25.9 : trace préparation + domaines mapping / builder / transport ; tests pytest + test-summary ; sprint `25-9` → **review**.
- 2026-04-20 — QA2 P2 : prose sprint alignée **done** ; pas de mention **ready-for-dev** résiduelle dans l’alignement YAML.
