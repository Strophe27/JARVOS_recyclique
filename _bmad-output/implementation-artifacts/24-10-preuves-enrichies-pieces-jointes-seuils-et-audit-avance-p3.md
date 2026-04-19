# Story 24.10 : Preuves enrichies — pièces jointes, seuils, audit avancé (P3)

Status: done

**Story key :** `24-10-preuves-enrichies-pieces-jointes-seuils-et-audit-avance-p3`  
**Epic :** 24 — Opérations spéciales de caisse, tags métier et extension Paheko terrain  
**Branche de travail attendue :** `epic/24-operations-speciales-orchestration`  
**Implementation artifact :** `_bmad-output/implementation-artifacts/24-10-preuves-enrichies-pieces-jointes-seuils-et-audit-avance-p3.md`

## Contexte produit

Le **PRD opérations spéciales** définit des **niveaux de preuve** N0–N3 (§14), une **gouvernance des validations sensibles** avec champs conceptuels incluant `approval_evidence_ref` et distinction initiateur / validateur (§15), et prévoit un **phasage** : P3 couvre **pièces jointes natives**, **seuils de validation plus riches** et **matrice / audit avancé** lorsque l’organisation est prête.

L’**ADR D8** fixe que, **tant que les PJ natives ne sont pas disponibles**, toute exigence de preuve repose **au minimum** sur une **référence structurée** (référence externe, identifiant, texte) jusqu’à livraison PJ — sans contourner la chaîne financière canonique.

L’**ADR D6** impose de conserver la distinction **initiateur / validateur** (niveaux N2/N3, step-up) dans les journaux et charges utiles pour les opérations sensibles.

L’**ADR D1** impose qu’**aucun enrichissement de preuve** ne casse l’**idempotence** ni ne duplique un second rail Paheko : stockage et corrélation des preuves restent côté domaine Recyclique / audit ; l’**outbox** vers Paheko continue de porter uniquement ce que la chaîne canonique (snapshot → builder → batch idempotent) autorise déjà (cf. Epic 8, Epics 22–23).

La **story 24.9** a explicitement laissé hors périmètre **PJ natives, seuils N3 riches, audit avancé transversal** — c’est le cœur de **24.10 (P3)**.

## Story (BDD)

As a **responsable conformité ou gouvernance caisse**,  
I want **des preuves renforcées sur les opérations sensibles lorsque l’organisation active le niveau P3**,  
So that **les escalades sont traçables, les seuils métier respectés et la supervision peut s’appuyer sur un audit exploitable sans briser la synchro Paheko**.

## Acceptance criteria (source `epics.md` §24.10 + PRD §14–§15 + ADR D6 / D8 + D1 idempotence)

1. **Modèle de preuve ADR D8 + PRD §14** — *Given* les niveaux N0–N3 du PRD (table §14) et le phasage P3 ; *When* la story est livrée ; *Then* le produit permet soit des **pièces jointes** conformes au choix d’implémentation, soit — à défaut de PJ natives — des **références structurées obligatoires** (texte / identifiant / référence externe) **au moins** pour les parcours où le PRD exige N2+ ou N3, de façon **vérifiable** (présence, consultation ou export selon permissions) ; *And* la transition P2 → P3 est **documentée** (feature flag, config métier, ou paramètre super-admin — à trancher en DS sans ambiguïté).

2. **Champs conceptuels §15** — *Given* le PRD liste `initiator_user_id`, `approver_user_id`, `approver_step_up_at`, `approval_reason_code`, `approval_comment`, `approval_evidence_ref` ; *When* une opération sensible du périmètre Epic 24 est concernée ; *Then* les champs **déjà présents** en base / API sont **réconciliés** avec cette liste (mapping explicite dans la story de clôture) et les **lacunes** sont comblées ou documentées avec **NEEDS_HITL** ciblé ; *And* pour N3, si pas de PJ natives, `approval_evidence_ref` est **obligatoire** là où le PRD le prescrit (§15).

3. **Seuils riches (P3)** — *Given* le paquet audit P0 a signalé une question ouverte sur la formalisation N1–N3 (`references/operations-speciales-recyclique/2026-04-18_paquet-audit-p0-operations-speciales-recyclique.md`) ; *When* P3 est implémenté ; *Then* au minimum **une** règle serveur de **seuil** alignée PRD (ex. montant, sous-type de décaissement, combinaison permission + niveau de preuve) est **appliquée** avec erreurs 422 claires — sans prétendre fermer tout l’arbitrage métier si un reste **NEEDS_HITL** léger est nécessaire (documenté).

4. **ADR D6 — initiateur / validateur** — *Given* les opérations sensibles ; *When* preuve ou validation est enregistrée ; *Then* les journaux / payloads métier **distinguent** toujours initiateur et validateur (pas de validateur implicite) ; *And* l’UI supervision rend cette distinction **lisible** là où l’Epic 24 expose déjà ces flux (hub / wizards / listes admin concernées).

5. **Paheko — idempotence et pas de second rail (D1)** — *Given* la chaîne snapshot → builder → outbox ; *When* des PJ ou références de preuve sont ajoutées ; *Then* elles **ne modifient pas** la sémantique d’**idempotence** des lots / clés déjà garantie (pas de nouveau « hash » métier dans le payload Paheko qui recrée des doublons) ; *And* la corrélation reste portée par les mécanismes existants (journal métier, audit, métadonnées hors corps d’écriture Paheko si nécessaire), en cohérence avec **Epic 8** et `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`.

6. **Audit avancé (supervision)** — *Given* la demande Epic « audit exploitable pour supervision » ; *When* P3 est actif ; *Then* au moins une **vue ou export** (liste filtrée, endpoint admin, ou prolongation d’`audit_log` / journal métier existant) permet de retrouver **par période** les opérations avec **preuve requise** / **niveau N2–N3** avec les métadonnées initiateur/validateur ; *And* des **tests** (pytest et/ou vitest) couvrent un **happy path** et un **rejet validation** (422 ou refus métier).

7. **Contrats** — *Given* toute nouvelle surface API ou schéma ; *When* la story est fermée ; *Then* **OpenAPI** + clients consommateurs **Peintre** (si UI touchée) sont alignés ; *And* la documentation interne de la story liste les **fichiers** modifiés.

## Définition of Done (mesurable)

- [x] Alignement PRD §14–§15 et ADR D6 / D8 / D1 explicité dans les Dev Notes avec **table de correspondance** champs ↔ implémentation.
- [x] Preuve structurée minimale (D8) **ou** PJ stockées de façon traçable ; pas de régression idempotence Paheko (tests ou analyse documentée + test ciblé outbox).
- [x] Au moins une règle de **seuil** serveur vérifiable + tests.
- [x] Supervision / audit : livrable nommé (route, page, requête) + tests.
- [x] Gates : pytest / vitest / lint / build selon périmètre du diff (Story Runner : peloton brief + tests ciblés 24-10 / observabilité).

## Tasks / Subtasks

- [x] Relire PRD §14–§15 et ADR ; cartographier champs existants vs manquants (`sale_reversal`, décaissement, transfert, remboursement exceptionnel, etc.).
- [x] Trancher stockage PJ (nouvelle table + fichier disk, ou pré signé, ou report NEEDS_HITL) vs **référence textuelle** seule — **dans la limite D8**.
- [x] Spécifier validation serveur : N2/N3, `approval_evidence_ref`, cohérence avec step-up existant (`X-Step-Up-Pin`, `step_up.py`).
- [x] Implémenter règle(s) de seuil PRD-aligned (montant, sous-type, permission).
- [x] Étendre UI Peintre / admin pour saisie consultation preuve et affichage initiateur/validateur où pertinent.
- [x] Vérifier **non-régression** outbox / builders Paheko (tests existants Epic 8 / 23 + nouveaux si besoin).
- [x] Mettre à jour `contracts/openapi/recyclique-api.yaml` + clients ; ajouter tests.

## Dev Notes — Garde-fous techniques

### Périmètre story 24.10 (P3)

- **Inclus :** preuves enrichies (PJ ou références structurées D8), seuils riches au sens « au moins une règle serveur explicite », audit / supervision pour exploitation conformité, respect D6/D1.
- **Hors périmètre implicite :** refonte globale du module audit transverse Epic 14 si non nécessaire au critère — **préférer extension** des journeaux déjà utilisés par Epic 24 ; tout élargissement majeur = **NEEDS_HITL** avec arbitrage produit.

### Idempotence Paheko (non négociable)

- Les **métadonnées de preuve** doivent être attachées à l’**opération métier** et/ou tables d’audit **sans** introduire une variante du **payload** d’écriture Paheko qui contredise les clés d’idempotence déjà définies (référencer `idempotency_support`, services outbox, tests Story 24.5 / Epic 8 selon le diff).

### Ancres code (point de départ — à affiner en DS)

| Sujet | Chemins probables |
|------|-------------------|
| Step-up / PIN | `recyclique/api/src/recyclic_api/core/step_up.py`, headers `X-Step-Up-Pin` |
| Opérations spéciales caisse | services/endpoints créés pour 24.5–24.9 (remboursement exceptionnel, décaissement, transfert, échange, tags) |
| Outbox / sync | modules Epic 8, builders Paheko Epic 22–23 |
| Peintre caisse | `peintre-nano/src/domains/cashflow/` (wizards, hub) |
| Chaîne canonique | `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` |

### Intelligence story précédente (24.9)

- Les **tags métier** et la résolution `business_tag_*` sont stabilisés ; 24.10 ne duplique pas le tagging — mais les **preuves** peuvent concerner les **mêmes tickets/lignes** si l’organisation impose preuve + tag (composer les validations sans conflit de schéma).
- Fichiers et patterns listés en 24.9 (`sale_service`, schémas `sale`, stats) servent de **continuité** ; étendre plutôt que bifurquer.

### Git récent (contexte)

- Derniers incréments Epic 24 : 24-5 (remboursement exceptionnel / idempotence), 24-6 à 24-9 (échange, décaissement, transfert, tags métier) — réutiliser **styles de tests** et **conventions OpenAPI** de ces livrables.

### Risques / arbitrages

- **Stockage PJ :** absence d’un service de fichiers métier dédié dans l’API hors exports — une **phase 1** peut être **référence uniquement** (D8) avec chemin documenté vers PJ futures ; noter l’arbitrage dans le File List.
- **Seuils métier :** le paquet P0 mentionnait un **NEEDS_HITL léger** sur seuils ; 24.10 doit livrer un **minimum** tout en laissant des seuils paramétrables en backlog si hors temps.

### Correspondance PRD §15 / ADR — implémentation (clôture DS)

| Concept PRD / ADR | Implémentation livrée |
|-------------------|------------------------|
| Transition P2 → P3 | `cash_registers.workflow_options.features.operations_specials_p3.enabled` (bool) |
| `approval_evidence_ref` (N3) | Colonne + champ API `approval_evidence_ref` sur remboursement exceptionnel ; obligatoire si P3 actif |
| `initiator_user_id` / `approver_user_id` | Déjà sur `exceptional_refunds` ; audit enrichi + `approver_step_up_at` (horodatage step-up) |
| `approver_step_up_at` | Colonne + passage depuis la route après `X-Step-Up-Pin` validé |
| `approval_reason_code` | Mappé sur `reason_code` existant (RefundReasonCode) |
| `approval_comment` | Mappé sur `justification` (+ `detail` si AUTRE) — pas de duplication schéma |
| ADR D1 idempotence Paheko | Aucun changement aux empreintes Redis / corps outbox ; preuves en colonnes métier + `audit_logs.details` uniquement |

### Idempotence Paheko (story 24.10)

- Aucune modification de `body_fingerprint_exceptional_refund_json` hors corps JSON client : l’ajout optionnel de `approval_evidence_ref` reste dans le même objet idempotent (comportement attendu : même `Idempotency-Key` + corps différent → 409).
- Pas de variante builder Paheko : les écritures restent sur la chaîne snapshot → clôture existante.

## Références

- Epic 24 — `_bmad-output/planning-artifacts/epics.md` (Story **24.10**, objectifs Epic, découpage **P3**).
- PRD — `references/operations-speciales-recyclique/2026-04-18_prd-recyclique-operations-speciales-sorties-matiere-paheko_v1-1.md` (**§14** niveaux de preuve, **§15** gouvernance, sections **§10.x** niveaux par parcours, fin de doc **backlog P3** pièces jointes / seuils / audit).
- ADR — `_bmad-output/planning-artifacts/architecture/2026-04-18-adr-operations-speciales-caisse-paheko-v1.md` (**D6**, **D8** ; **D1** pour idempotence / un seul rail).
- Paquet audit P0 — `references/operations-speciales-recyclique/2026-04-18_paquet-audit-p0-operations-speciales-recyclique.md` (§4 permissions / preuves ; question seuils N1–N3).
- Prompt ultra opérationnel — `references/operations-speciales-recyclique/2026-04-18_prompt-ultra-operationnel-operations-speciales-recyclique_v1-1.md` (livrables P3, matrice preuves).
- Chaîne canonique — `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`.
- Readiness — `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-18-operations-speciales.md`.
- Story 24.9 (prérequis fonctionnel adjacent) — `_bmad-output/implementation-artifacts/24-9-tags-metier-ticket-et-ligne-reporting-matiere-associe.md`.

## QA Gate (story — avant review)

| # | Vérification |
|---|----------------|
| Q1 | Chaque AC ci-dessus est traçable vers une tâche ou une sous-section Dev Notes. |
| Q2 | D6 / D8 / D1 traduits en exigences testables (pas seulement rappel ADR). |
| Q3 | Au moins un chemin **PJ ou référence structurée** + un chemin **rejet** couverts par tests. |
| Q4 | Section « idempotence Paheko » explicitement adressée (test ou analyse signée dans le fichier story si pas de test auto). |

## Alignement sprint

- **development_status** : après **DS (bmad-dev-story)**, la clé `24-10-preuves-enrichies-pieces-jointes-seuils-et-audit-avance-p3` est **`review`** dans `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- **epic-24** : **`in-progress`** (inchangé jusqu’à clôture de l’epic).

## Dev Agent Record

### Agent Model Used

Task — **bmad-dev-story** (DS), 2026-04-19 — Story Runner BMAD.

### Debug Log References

### Completion Notes List

- **DS** : P3 via `workflow_options` ; validation `approval_evidence_ref` + seuil montant × motif ERREUR_SAISIE ; `GET /v1/admin/audit-log?cash_sensitive_operations=true` ; tests `test_story_24_10_operations_specials_p3.py` ; migration `s24_10_exceptional_refund_p3_proof`.
- **Correctif revue (CHANGES_REQUESTED, cr_loop 1)** : wizard remboursement exceptionnel — champ **Référence de preuve (ADR D8)** + payload `approval_evidence_ref` / garde-fous P3 après `GET /v1/cash-registers/{id}` ; pytest `test_audit_log_cash_sensitive_operations_filter_epic24` dans `test_admin_observability_endpoints.py` ; décorateur route `exceptional-refunds` documente **422** P3.
- **CS create** : story générée depuis `epics.md` §24.10, PRD §14–§15, ADR D6/D8/D1, paquet audit P0, story 24.9 (périmètre P3 exclu de 24.9).

### File List

- `D:/users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/_bmad-output/implementation-artifacts/24-10-preuves-enrichies-pieces-jointes-seuils-et-audit-avance-p3.md` (ce fichier)
- `D:/users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/_bmad-output/implementation-artifacts/sprint-status.yaml`
- `D:/users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/recyclique/api/src/recyclic_api/models/exceptional_refund.py`
- `D:/users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/recyclique/api/src/recyclic_api/schemas/exceptional_refund.py`
- `D:/users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/recyclique/api/src/recyclic_api/services/operations_specials_p3.py`
- `D:/users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/recyclique/api/src/recyclic_api/services/exceptional_refund_service.py`
- `D:/users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/recyclique/api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py`
- `D:/users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_observability.py`
- `D:/users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/recyclique/api/migrations/versions/s24_10_exceptional_refund_p3_proof.py`
- `D:/users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/recyclique/api/tests/test_story_24_10_operations_specials_p3.py`
- `D:/users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/recyclique/api/tests/test_admin_observability_endpoints.py` (filtre `cash_sensitive_operations`)
- `D:/users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/contracts/openapi/recyclique-api.yaml`
- `D:/users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/peintre-nano/src/api/cash-session-client.ts`
- `D:/users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/peintre-nano/src/api/admin-cash-registers-client.ts` (`getCashRegisterById`, détection P3)
- `D:/users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/peintre-nano/src/api/admin-audit-log-client.ts`
- `D:/users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/peintre-nano/src/domains/cashflow/CashflowSpecialOpsHub.tsx`
- `D:/users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/peintre-nano/src/domains/cashflow/CashflowExceptionalRefundWizard.tsx` (saisie `approval_evidence_ref` + envoi POST)
