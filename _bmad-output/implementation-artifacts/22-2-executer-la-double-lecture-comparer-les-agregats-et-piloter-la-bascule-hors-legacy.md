# Story 22.2 : Executer la double lecture, comparer les agregats et piloter la bascule hors legacy



Status: done



**Story key :** `22-2-executer-la-double-lecture-comparer-les-agregats-et-piloter-la-bascule-hors-legacy`  

**Epic :** 22 - Rebaseliner la caisse/compta/`Paheko` sur un modele comptable canonique



## Story



As a migration safety team,  

I want the legacy and canonical accounting views compared during transition,  

So that the cutover decision is evidence-based instead of assumed.



## Alignement planning (epics.md — Story 22.2)



Les critères numérotés ci-dessous **détaillent et opérationnalisent** les deux blocs BDD du fichier de planning. Toute évolution du wording BDD dans `epics.md` doit être reflétée ici lors d’un passage create-story / validate.



**Acceptance Criteria (source planning, BDD)**



**Given** the canonical model may diverge from the legacy aggregation logic  

**When** the dual-read phase is active  

**Then** the team can compare legacy and canonical totals on a named sample of sessions  

**And** mismatches are traceable, reviewable, and classed before any full cutover claim  



**Given** cutover changes the accounting authority  

**When** the transition rule is approved  

**Then** the exit criteria from legacy are explicit, measurable, and tied to a named validation package  

**And** no downstream story assumes the cutover happened silently  



## Acceptance Criteria



1. **Double lecture explicite** — Etant donne que le legacy et le modele canonique peuvent diverger, quand la story est livree, alors le projet dispose d'un mecanisme explicite permettant de comparer les agregats legacy et les agregats canoniques sur un echantillon nomme de sessions.

2. **Comparaison exploitable** — Les ecarts observes sont tracables par session, classes et expliquables ; ils ne sont pas resumes a un simple « different / pareil ».

3. **Cutover non silencieux** — La bascule hors legacy possede des criteres de sortie explicites, mesurables et relies a un package de validation nomme.

4. **Protection des parcours existants** — Les stories `6.x` et `8.x` restent operables pendant la phase de comparaison ; aucun ecran ne pretend deja etre sur la verite canonique si la comparaison n'est pas close.

5. **Matrice minimale obligatoire** — La comparaison couvre au minimum des sessions nommees pour chacun des cas suivants : paiement simple, paiements mixtes, don en surplus, gratuite, remboursement exercice courant, remboursement exercice anterieur clos.

6. **Taxonomie des ecarts et seuils** — Le livrable definit une taxonomie minimale des ecarts (modele, donnees historiques, arrondi, bug, contrat manquant, hors-scope) et les seuils de sortie ou de blocage du cutover ; une simple liste d'ecarts brute ne suffit pas.



## Definition of Done (mesurable)



Le dev peut demontrer les points suivants (preuves dans le depot ou script/API documente) :



- **Double lecture materialisee** : pour chaque session de la matrice minimale (AC5), un artefact de comparaison (JSON structure, rapport admin, ou rapport pytest/export) contient cote a cote au moins : totaux / agregats issus du **referentiel legacy encore expose** (vente / champs brownfield) et les agregats **canoniques** issus du journal `payment_transactions` et du chemin cloture (snapshot 22.6 / builder 22.7 lorsque pertinent pour la « fin de chaine »).

- **Classification** : chaque ecart significatif entre les deux colonnes est etiquete avec **une** etiquette de la taxonomie (AC6) ; les ecarts non classables restent dans une ligne « non classe — a analyser » et **interdisent** un verdict global « vert ».

- **Pas de faux vert** : aucun indicateur global unique n'affirme « OK » si une session de la matrice presente un ecart non revu ou une classification bloquante pour le cutover.

- **Cutover** : un bloc nomme (section doc story + ou fichier de parametre versionne) liste les **criteres de sortie** (seuils numeriques ou booleens explicites), le **package de validation** (tests pytest nommes, parcours admin, ou les deux) et les **conditions de rollback** ; pas de bascule implicite du seul code.

- **Non-regression Epic 6 / 8** : les tests ou smoke existants des parcours caisse et outbox ne sont pas retires au profit d'un message unique ; les ajustements sont compatibles avec la coexistence legacy/canonique pendant la phase B.



## Tasks / Subtasks



- [x] Cartographier les deux colonnes « legacy » vs « canonique » pour ce double-read (quels champs / quelles fonctions par agregat). (AC: 1, 2)

- [x] Definir ou implementer le mecanisme de comparaison (endpoint admin restreint, fixture pytest, ou script operateur documente) sur l'echantillon nomme. (AC: 1, 2, 5)

- [x] Appliquer la matrice minimale AC5 sur des sessions identifiees (IDs ou jeux de donnees de test). (AC: 5)

- [x] Formaliser la taxonomie et les seuils de cutover / blocage dans un livrable unique (section « Taxonomie et cutover » ci-dessous + references). (AC: 3, 6)

- [x] Verifier les garde-fous UX / messaging : pas d'affirmation d'autorite canonique avant cloture de la comparaison. (AC: 4)

- [x] Ajouter ou etendre les tests automatises (`recyclique/api/tests/test_story_22_2_*.py` ou extension ciblee des tests 22.x) pour figer le comportement attendu de la double lecture. (DoD)



## Taxonomie et cutover (gel livrable 22.2)



### Cartographie des deux colonnes



| Colonne | Source principale | Role |

|--------|-------------------|------|

| **Legacy brownfield** | `cash_sessions.total_sales` (denormalise), `sum(sales.total_amount)`, `sum(sales.donation)` | Reflecte encore les champs vente/session exposes historiquement ; la ligne `donation` n'est pas equivalente au flux `donation_surplus` du journal. |

| **Canonique (journal strict)** | `compute_payment_journal_aggregates(..., use_legacy_preview_if_no_journal=False)` | Totaux `CashSessionJournalTotalsV1` + absence de repli preview ; chaine figee session close via `accounting_close_snapshot.totals` si present. |

| **Derivations controlees** | `sale_payment` INFLOW, `settlement_inflow_sum` = SALE_PAYMENT+DONATION_SURPLUS INFLOW, sommes REFUND derivees des lignes | Comparaisons d'integrite sans dupliquer la logique metier de cloture. |



### Parametrage versionne



- Fichier : `recyclique/api/src/recyclic_api/data/epic22_cutover_criteria_v1.json` (version, epsilon numerique, taxonomie, `exit_criteria`, `validation_package`, `rollback_conditions`).

- API (super-admin) : `GET /v1/admin/accounting-expert/cash-sessions/{cash_session_id}/dual-read-compare` — rapport `DualReadCompareReport` avec `cutover_indicator_ok` (faux « pret » si ecart bloquant ou non revu — conforme DoD).



### Matrice minimale AC5 (UUID deterministes pytest)



Namespace `uuid5` DNS : identifiants stables par cas — voir `test_story_22_2_dual_read_aggregate_compare.py` : `MATRIX_SIMPLE`, `MATRIX_MIXED`, `MATRIX_DONATION_SURPLUS`, `MATRIX_GRATUITY`, `MATRIX_REFUND_CURRENT`, `MATRIX_REFUND_PRIOR`, `MATRIX_HISTORICAL_GAP`, plus cas auxiliaires `MATRIX_ADMIN_HTTP`, `MATRIX_DENORM`.



### Garde-fou AC4 (UX)



- Aucune modification `peintre-nano` dans ce livrable : pas d'affichage qui affirmerait l'autorite canonique cote UI ; la preuve est backend (API + pytest).



## Taxonomie minimale des ecarts (gel epic-22)



Chaque ecart doit etre classe dans **exactement une** categorie principale (sinon « non classe » explicite) :



| Code | Signification |

|------|----------------|

| `MODEL` | Divergence de modele / regle metier intentionnelle ou a arbitrer entre legacy et canonique |

| `HISTORICAL_DATA` | Donnees historiques incompletees, backfill partiel, sessions ouvertes avant 22.1 |

| `ROUNDING` | Ecart d'arrondi ou de representation flottante dans les tolerance definies |

| `BUG` | Defaut de code identifie dans le chemin canonique ou legacy |

| `MISSING_CONTRACT` | Contrat OpenAPI / schema / endpoint manquant pour comparer proprement |

| `OUT_OF_SCOPE` | Comportement volontairement hors perimetre de la phase B |



**Cutover** : documenter par categorie si l'ecart **bloque** le cutover, est **tolere** sous plafond, ou **reporte** avec ID de dette.



## Dev Notes



### Phasage freeze (epic-22)



- **Dependances livrees** : `22.1`, `22.3`, `22.4`, `22.5`, `22.6`, `22.7` sont **done** ; la chaine canonique va au minimum jusqu'au **batch outbox** (snapshot fige + builder multi-sous-ecritures + sync epic 8).

- **Ordre stories** : cette story est **apres 22.7** et **avant 22.8** dans le sequencement fonctionnel : la double lecture compare honnetement une chaine de bout en bout jusqu'a l'outbox, sans pretendre finaliser la rebaselining des preuves qualite (reserve a `22.8`).

- **Objectif** : la Phase B (architecture `cash-accounting-paheko-canonical-chain.md`) — coexistence et comparaison — pas la Phase C (bascule d'autorite) tant que les criteres de cutover ne sont pas remplis.



### Continuite avec 22.1 a 22.7



- `22.1` : schema + journal `payment_transactions` + compatibilite brownfield.

- `22.3` : referentiel expert des moyens de paiement et comptes globaux.

- `22.4` / `22.5` : parcours caisse et remboursements alignes modele cible.

- `22.6` : snapshot comptable fige de cloture.

- `22.7` : builder Paheko multi-lignes + adaptation sync / outbox.

- `22.2` : **ne supprime pas** le legacy comme mecanisme de compatibilite ; elle **compare** et **pilote** la decision de bascule ulterieure.



### Ancres code backend (points d'ancrage)



Fichiers et modules ou la « colonne canonique » et le repli legacy sont deja materialises ou voisins — le dev etend ou s'appuie sur eux plutot que de dupliquer la logique metier :



- `recyclique/api/src/recyclic_api/services/cash_session_journal_snapshot.py` — `compute_payment_journal_aggregates` (agregats depuis `payment_transactions` ; flag `preview_fallback_legacy_totals`).

- `recyclique/api/src/recyclic_api/services/cash_session_service.py` — pre-cloture / theorique caisse et usage du journal vs legacy.

- `recyclique/api/src/recyclic_api/schemas/cash_session_close_snapshot.py` — payload snapshot (dont `preview_fallback_legacy_totals`).

- `recyclique/api/src/recyclic_api/services/sale_service.py` — journal canonique vs referentiel legacy (lignes `SALE_PAYMENT`).

- `recyclique/api/src/recyclic_api/services/paheko_close_batch_builder.py` — entree builder depuis snapshot fige (chaine 22.7).

- `recyclique/api/src/recyclic_api/services/paheko_outbox_service.py` — chargement snapshot fige pour processor (hors legacy vente direct).

- `recyclique/api/src/recyclic_api/models/payment_transaction.py` — natures (don surplus, remboursement courant / N-1 clos, etc.).



### Tests existants (extension probable)



Tests deja dedicaces epic-22 — base pour assertions de non-regression et patterns de fixtures :



- `recyclique/api/tests/test_story_22_1_payment_canonical_schema.py`

- `recyclique/api/tests/test_story_22_3_expert_accounting.py`

- `recyclique/api/tests/test_story_22_4_cash_sale_arbitrage.py`

- `recyclique/api/tests/test_story_22_5_refund_canonical_authority.py`

- `recyclique/api/tests/test_story_22_6_accounting_close_snapshot.py`

- `recyclique/api/tests/test_story_22_7_paheko_close_batch_builder.py`

- `recyclique/api/tests/test_story_22_7_outbox_processor_batch.py`



**Nouveau fichier attendu** (nom indicatif) : `recyclique/api/tests/test_story_22_2_dual_read_aggregate_compare.py` (ou equivalent) couvrant la matrice AC5 et la structure de rapport de comparaison.



### Guardrails



- Pas de suppression prematuree du champ legacy ou des mecanismes brownfield comme seule source de compatibilite.

- Pas de « tout vert » global si des ecarts persistent non classes ou hors seuils.

- Les ecarts doivent etre relies a des **cas metier nommes** (mixte, don, gratuite, remboursements).



### References



- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 22, Story 22.2, lignes ~3277–3293 (BDD + énoncé utilisateur)]

- [Source: `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` — Phases B et C, chaine canonique §1–5]

- [Source: `_bmad-output/implementation-artifacts/22-1-preparer-le-schema-comptable-cible-le-backfill-et-la-compatibilite-brownfield.md`]

- [Source: `_bmad-output/implementation-artifacts/22-7-generer-les-ecritures-avancees-multi-lignes-paheko-et-adapter-la-sync-epic-8.md` — handoff outbox]



## Dev Agent Record



### Agent Model Used



Task bmad-dev-story (DS) — composer-2-fast — 2026-04-16



### Debug Log References



### Completion Notes List



- Service `build_dual_read_compare_report` + endpoint super-admin `GET .../dual-read-compare` ; critères JSON `epic22_cutover_criteria_v1.json` ; pytest matrice AC5 (`uuid5` deterministes) + preuve acces HTTP admin.

- Alignement ticket vs journal : comparaison `settlement_inflow_sum` (SALE_PAYMENT + DONATION_SURPLUS INFLOW) vs `sum(sales.total_amount)` pour eviter faux BUG sur don surplus.

- **DS (2026-04-16)** : revérification conformité AC/DoD — fichiers présents (`cash_session_dual_read_service.py`, `accounting_dual_read.py`, `epic22_cutover_criteria_v1.json`, endpoint `admin_accounting_expert` dual-read, OpenAPI `accountingExpertDualReadCompare`) ; `pytest tests/test_story_22_2_dual_read_aggregate_compare.py` : 14 passed ; aucun correctif code nécessaire.

- Story Runner 2026-04-16 : VS→DS→GATE→QA→CR1 **CHANGES_REQUESTED** (snapshot présent mais `totals` illisibles → risque faux vert) → gap `frozen_snapshot_present_but_totals_unreadable` + test `MATRIX_FROZEN_UNREADABLE_TOTALS` → GATE→**CR2 APPROVE** ; QA : tests HTTP 404/403 + résumé `test-summary-story-22-2-qa-dual-read.md`.



### File List



- `recyclique/api/src/recyclic_api/services/cash_session_dual_read_service.py`

- `recyclique/api/src/recyclic_api/schemas/accounting_dual_read.py`

- `recyclique/api/src/recyclic_api/data/__init__.py`

- `recyclique/api/src/recyclic_api/data/epic22_cutover_criteria_v1.json`

- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_accounting_expert.py`

- `recyclique/api/tests/test_story_22_2_dual_read_aggregate_compare.py`

- `contracts/openapi/recyclique-api.yaml`

- `_bmad-output/implementation-artifacts/22-2-executer-la-double-lecture-comparer-les-agregats-et-piloter-la-bascule-hors-legacy.md`

- `_bmad-output/implementation-artifacts/sprint-status.yaml`

- `_bmad-output/implementation-artifacts/tests/test-summary-story-22-2-qa-dual-read.md`



### Change Log



- 2026-04-16 — DS story 22.2 : contrôle AC/DoD + exécution pytest 22.2 (vert) ; correction typo DoD (« n'affirme »).

- 2026-04-16 — Story 22.2 : double lecture legacy/canonique, JSON critères cutover v1, OpenAPI + tests matrice AC5.

- 2026-04-16 — Story Runner : après CR1, correctif **P1** — gap bloquant si snapshot figé sans `totals` désérialisables (`frozen_snapshot_present_but_totals_unreadable`) + pytest dédié.

- 2026-04-16 — CR2 : correctifs dual-read (findings snapshot, sync_correlation_id UUID, suppression reclassement ROUNDING inatteignable).





