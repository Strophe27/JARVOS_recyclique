# Story 25.13 : Journalisation — identité opérateur versus poste ou kiosque (tranche minimale)

Status: done

**Story key :** `25-13-journalisation-identite-operateur-versus-poste-ou-kiosque-tranche-minimale`  
**Epic :** 25 — phase 2 (impl)  
**Implementation artifact :** `_bmad-output/implementation-artifacts/25-13-journalisation-identite-operateur-versus-poste-ou-kiosque-tranche-minimale.md`

## Dépendances (prérequis)

- **ADR 25-2** — **acceptée** (`status: accepted`) : séparation **PIN opérateur** / **PIN kiosque** / **secret de poste** ; ne pas fusionner les modèles de confiance dans les traces. Fichier : `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md`.
- **Spec 25.4 §2.4** — invariant : ne jamais confondre **identité opérateur** et **identité de poste** dans les journaux et payloads sortants. Fichier : `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md`.
- **Checklist 25.7** — ligne normative **`CTX-INV-2-4-OPERATOR-VS-POSTE-IDENTITY-LOGS`** (§2.4). Fichier : `_bmad-output/implementation-artifacts/checklists/25-7-checklist-spec-25-4-sections-2-3.md`.
- **25.8** — **done** : erreurs explicites / `CONTEXT_STALE` ; le chemin critique choisi doit rester cohérent avec les garde-fous existants (pas de continuation sur contexte stale). *(Contrainte transverse ; le DAG phase 2 ne liste pas 25-8 dans `depends_on` de 25-13, mais le comportement terrain reste aligné spec / Story 25.14.)*
- **25.11** — **done** : dépendance **machine** explicite dans `epic-25-phase2-dag-2026-04-21.yaml` (`depends_on` : **25-11**). Si les **payloads** d’enveloppe de contexte, d’en-têtes ou d’événements structurés **changent** (nouveaux champs « poste / kiosque »), citer et aligner les artefacts **25.11** (spike, fragment OpenAPI, types Peintre) pour éviter la dérive contractuelle. Référence : `_bmad-output/implementation-artifacts/2026-04-20-spike-25-11-contrats-enveloppe-contexte.md`, `contracts/openapi/fragments/context-envelope-examples-25-11.yaml`, `peintre-nano/src/types/context-envelope.ts`.
- Graphe machine : `_bmad-output/planning-artifacts/architecture/epic-25-phase2-dag-2026-04-21.yaml` — **25-13** `depends_on` : **25-11** ; **25-14** `depends_on` : **25-8** + **25-13** (la story 25.13 prépare les preuves de logs pour la suite).

## Contraintes brief Story Runner

- **Tranche minimale** : **un** chemin **cashflow critique** (preuve bout-en-bout sur **journal structuré** et/ou **événement d’audit** persistant).
- **Test auto** : au moins **un** test (pytest API) qui valide la présence et la **non-confusion** sémantique des champs (opérateur vs ancrage poste/kiosque) sur ce chemin — **nom de fichier normatif (gate parent)** : `recyclique/api/tests/test_story_25_13_journalisation_identite_operateur_poste_kiosque.py`.
- **Hors scope explicite** : UI complète de **step-up kiosque**, réglage fin **SuperAdmin lockout**, **tolérance PIN offline** — sauf **consommation** de comportements serveur déjà existants sans les étendre dans cette story.

## Story (BDD)

As a security and audit stakeholder,  
I want operator identity distinguished from poste or kiosk identity in logs for at least one critical cashflow path,  
So that audits stay explainable per spec **2.4** and ADR **25-2**.

## Acceptance criteria

Source normative : `_bmad-output/planning-artifacts/epics.md` — **Story 25.13** (reprise **mot pour mot** ; titre epic sans accents « identite / operateur » — contenu fonctionnel identique).

**Given** ADR **25-2** is `accepted`  
**When** this story is delivered  
**Then** field names and logging policy are documented and at least one automated test covers the chosen path end-to-end at log or structured event level  
**And** full kiosk step-up UI, SuperAdmin lockout tuning, and offline PIN tolerance stay out of scope except where this story only consumes existing server behaviour  
**And** if payloads change, coordination note references **25.11** artefacts

**Ancre checklist 25.7 (spec 25.4 §2.4)** — exigence directe pour cette story : **`CTX-INV-2-4-OPERATOR-VS-POSTE-IDENTITY-LOGS`** (« Ne jamais confondre **identité opérateur** et **identité de poste** dans journaux et payloads sortants »). Les lignes sœurs **`CTX-INV-2-4-SERVER-AUTHORITY-PIN-PERM`** et **`CTX-INV-2-4-KIOSQUE-INVARIANTS-ADR-25-2`** cadrent le reste du §2.4 mais ne sont **pas** à « rouvrir » ici hors besoin de citation dans la politique de champs.

### Interprétation exécutable (livrables minimaux)

1. **Chemin critique retenu (défaut recommandé)** : **enregistrement d’une vente caisse** — enchaînement déjà présent :
   - `log_transaction_event("PAYMENT_VALIDATED", …)` dans `recyclique/api/src/recyclic_api/services/sale_service.py` (`core/logging.py`, fichier `logs/transactions.log` en JSON) ;
   - `log_cash_sale(…)` → `AuditActionType.CASH_SALE_RECORDED` dans `recyclique/api/src/recyclic_api/core/audit.py` (`details_json` via `merge_critical_audit_fields`).
   - Le dev peut proposer un autre chemin cashflow **aussi critique** (ex. clôture session) **uniquement** s’il justifie l’équivalence « cashflow critique » et garde **un** test pytest unique ciblant ce chemin — la story reste **une** tranche minimale.

2. **Politique de journalisation (document courte)** : un fichier markdown sous `_bmad-output/implementation-artifacts/` ou `references/artefacts/` (nom daté) qui :
   - cite **spec 25.4 §2.4**, **ADR 25-2**, **CTX-INV-2-4-OPERATOR-VS-POSTE-IDENTITY-LOGS** ;
   - liste les **noms de champs stables** (snake_case côté JSON backend / audit) pour :
     - **identité opérateur** (ex. `operator_user_id`, éventuellement `operator_username` masqué ou normalisé comme aujourd’hui via `username_for_audit`) ;
     - **ancrage poste / kiosque** (ex. identifiant de **liaison** terminal ou poste **distinct** de l’UUID utilisateur — peut être `null` en brownfield tant que le **contrat** précise que « absent » ≠ « même chose que l’opérateur »).
   - interdit de réutiliser **un seul** champ ambigu pour les deux sens (pas de `user_id` qui mélangerait opérateur et jeton poste sans légende).

3. **Implémentation minimale** : étendre **uniquement** les événements du chemin choisi pour refléter la politique (audit et/ou `PAYMENT_VALIDATED`) — **sans** secrets en clair (respect `sanitize_audit_details` / sous-chaînes sensibles dans `core/audit.py`).

4. **Coordination 25.11** : si introduction de champs dans l’**OpenAPI**, l’**enveloppe de contexte** ou les en-têtes de liaison contexte, mettre à jour ou référencer explicitement les livrables **25.11** et noter l’écart dans le doc de politique.

5. **Test pytest** : au moins un scénario **end-to-end** sur le chemin (API test client → assertion sur **dernière** entrée audit pertinente et/ou **événement** `PAYMENT_VALIDATED` capturable en tests — pattern existant : `TESTING=true` pour logging synchrone si déjà utilisé dans le repo) qui échoue si les champs requis ne sont pas distingués.

## Definition of Done

- [x] Document de **politique de champs** + références **25.4 §2.4**, **ADR 25-2**, **25.7** / **CTX-INV-2-4-*** publié avec chemins repo.
- [x] **Noms de champs** opérateur vs poste/kiosque appliqués sur le **chemin cashflow** choisi (audit structuré et/ou `transactions.log`).
- [x] **Pytest** `recyclique/api/tests/test_story_25_13_journalisation_identite_operateur_poste_kiosque.py` vert ; **test-summary** QA si exigé par le gate parent (même pattern que **25-12** : `_bmad-output/implementation-artifacts/tests/test-summary-story-25-13-….md` ou `tests/` selon convention Story Runner).
- [x] Mention explicite **hors scope** : step-up UI kiosque, tuning lockout SuperAdmin, tolérance offline PIN (sauf consommation passive).
- [x] Si payloads modifiés : note de **coordination 25.11** (fichiers touchés listés).

## Tasks / Subtasks

- [x] Lire **ADR 25-2**, **spec 25.4 §2.4**, **checklist 25.7** (ligne **CTX-INV-2-4-OPERATOR-VS-POSTE-IDENTITY-LOGS**) et **spike 25.11** (AC: **Given** / **Then**)
- [x] Tracer le **chemin nominal vente** : `SaleService.create_sale` → `log_transaction_event` + `log_cash_sale` ; relever champs actuels (`user_id` dans payload transaction = opérateur) (AC: **Then**)
- [x] Rédiger la **politique de nommage** (markdown daté) + exemples JSON **avant/après** (AC: **Then** documented)
- [x] Implémenter champs distincts **opérateur** / **poste|kiosque** sur ce chemin uniquement ; éviter toute fuite de secrets (AC: **Then**)
- [x] Ajouter **pytest** story **25-13** + exécuter gate ciblé (AC: **Then** automated test)
- [x] Si évolution contrat : synchroniser **OpenAPI** / types **25.11** et noter dans la doc (AC: **And** coordination **25.11**)

## Dev Notes

### Ancres code (point de départ)

- Vente : `recyclique/api/src/recyclic_api/services/sale_service.py` (`log_transaction_event`, `log_cash_sale`).
- Audit caisse : `recyclique/api/src/recyclic_api/core/audit.py` (`log_cash_sale`, `merge_critical_audit_fields`, `sanitize_audit_details`).
- Logs structurés transaction : `recyclique/api/src/recyclic_api/core/logging.py` (`log_transaction_event`, `JSONFormatter`).
- Modèle audit : `recyclique/api/src/recyclic_api/models/audit_log.py` (`CASH_SALE_RECORDED`, …).
- Enveloppe contexte (si extension IDs poste) : `recyclique/api/src/recyclic_api/services/context_envelope_service.py`, schémas `recyclique/api/src/recyclic_api/schemas/context_envelope.py`, `contracts/openapi/recyclique-api.yaml`.

### Anti-patterns

- Utiliser le **même** champ JSON pour « utilisateur connecté » et « jeton poste » sans suffixe ni doc → viole **spec 2.4** et **CTX-INV-2-4-***.
- Logger **PIN**, secrets de poste ou **tokens** en clair → interdit (**§11.2**, `sanitize_audit_details`).
- Élargir le scope à **25.14** (step-up / revalidation) : **hors** de cette story ; préparer seulement des **logs** exploitables pour la story suivante.

### Intelligence story précédente (25-12)

- Même epic phase 2 : livrables sous `_bmad-output/implementation-artifacts/` + **test-summary** canonique sous `_bmad-output/implementation-artifacts/tests/test-summary-story-25-12-doc-qa.md` (à imiter pour **25-13** si le gate parent l’exige).
- Séparation périmètre / hors périmètre documentée dans le fichier story + **trace** sprint-status en tête de fichier YAML.

### Testing / gates (rappel parent)

- **Pytest** ciblé story **25-13** obligatoire pour clôture ; pas d’e2e Peintre requis pour la tranche minimale sauf arbitrage gate.
- **`git status`** propre en fin de livraison.

### Project Structure Notes

- Backend : `recyclique/api/src/recyclic_api/`, tests `recyclique/api/tests/`.
- Artefacts BMAD : `_bmad-output/implementation-artifacts/`, `_bmad-output/planning-artifacts/architecture/`.

### References

- `_bmad-output/planning-artifacts/epics.md` — **Story 25.13** ; **NFR10** (journaux critiques : `correlation_id`, contexte, opérateur, type d’opération — epics.md)
- `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` — **§2.4**
- `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md` — **ADR 25-2**
- `_bmad-output/implementation-artifacts/checklists/25-7-checklist-spec-25-4-sections-2-3.md`
- `_bmad-output/implementation-artifacts/2026-04-20-spike-25-11-contrats-enveloppe-contexte.md` — coordination payloads **25.11**
- `_bmad-output/planning-artifacts/architecture/epic-25-phase2-dag-2026-04-21.yaml`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Trace Epic 25 — ADR

| Élément | Valeur |
|--------|--------|
| Nouvelle ADR structurante requise ? | **ADR N/A** — exécution sous **ADR 25-2** déjà **acceptée** et **spec 25.4** ; pas de nouveau choix d’architecture sauf incohérence bloquante (alors escalade, pas scope nominal). |
| Justification | Tranche **implémentation** journalisation + test ; le modèle PIN / kiosque reste celui de l’ADR. |

## Alignement sprint / YAML

- **Post-DS (2026-04-20)** : `development_status` **`25-13-journalisation-…`** → **`review`** ; **epic-25** inchangé **`in-progress`** ; trace DS en tête de `sprint-status.yaml` ; prochaine étape parent **GATE** / QA.
- **Post–Story Runner (2026-04-20)** : **GATE** + **QA** + **CR** PASS ; `development_status` **`25-13-…`** → **`done`** ; **epic-25** inchangé **`in-progress`** (stories **25-14** / **25-15** backlog).
- Un **CS refresh** ne doit **pas** régresser un statut **`review`** / **`done`** vers `ready-for-dev` sans arbitrage explicite.
- Tracer toute passe **CS** / **DS** dans le commentaire `# last_updated` en tête de `sprint-status.yaml` (convention **25-12** / **25-11**).

## Dev Agent Record

### Agent Model Used

Composer (agent Task DS / bmad-dev-story)

### Debug Log References

_(néant)_

### Completion Notes List

- Chemin **vente caisse** : `PAYMENT_VALIDATED` enrichi (`operator_user_id`, `site_id`, `cash_register_id`) + `user_id` conservé comme alias opérateur ; `finalize_held_sale` aligné.
- `merge_critical_audit_fields` : `operator_user_id` explicite (dérivé de `user_id` si besoin) pour `CASH_SALE_RECORDED` et autres événements critiques utilisant le merge.
- Pytest : preuve principale **transactions.log** sous SQLite (patch `log_audit` noop) ; branche PostgreSQL assert en plus la dernière ligne `audit_logs` pour `cash_sale_recorded`.
- Suite complète `pytest tests/` API : **exit 0** (2026-04-20).

### File List

- `_bmad-output/implementation-artifacts/2026-04-20-politique-journalisation-operateur-vs-poste-kiosque-story-25-13.md`
- `_bmad-output/implementation-artifacts/tests/test-summary-story-25-13-journalisation-identite-operateur-poste-kiosque.md`
- `recyclique/api/src/recyclic_api/core/audit.py`
- `recyclique/api/src/recyclic_api/services/sale_service.py`
- `recyclique/api/tests/test_story_25_13_journalisation_identite_operateur_poste_kiosque.py`
- `recyclique/api/tests/test_audit_story_25.py`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/25-13-journalisation-identite-operateur-versus-poste-ou-kiosque-tranche-minimale.md`

## Change Log

- **2026-04-20** — **Story Runner** (fin cycle BMAD) : **review** → **done** après GATE (compileall + pytest `test_story_25_13_journalisation_identite_operateur_poste_kiosque.py`), QA test-summary, CR PASS ; `vs_loop` effectif **1** (CS retry post–VS fail nom pytest).
- **2026-04-20** — **DS** (bmad-dev-story Task) : journalisation `PAYMENT_VALIDATED` + `merge_critical_audit_fields`, politique markdown, pytest + test-summary, **`sprint-status`** → **`review`** ; suite `pytest tests/` API **PASS**.
- **2026-04-20** — **CS** (bmad-create-story, mode create, refresh Task Story Runner) : mise à niveau **epics §25.13** (AC verbatim), **DAG 25-13/25-14**, **checklist 25.7** / **CTX-INV-2-4-*** ; **Status** fichier aligné **`in-progress`** ↔ `sprint-status.yaml` ; section intelligence **25-12** ; règles anti-régression statut YAML.
- **2026-04-20** — **CS** (bmad-create-story, mode create) : fichier story créé ; alignement **epics §25.13**, **spec 25.4 §2.4**, **ADR 25-2**, **25.11** ; chemin par défaut vente caisse ; nom pytest normatif aligné gate parent `test_story_25_13_journalisation_identite_operateur_poste_kiosque.py`.
- **2026-04-20** — **CS** (correction post-VS) : harmonisation du chemin pytest avec le gate parent (`operator_vs_post_identity_logging` → `journalisation_identite_operateur_poste_kiosque`).
