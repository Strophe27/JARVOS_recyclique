# Story 24.8 : Mouvement interne caisse — distinct charge et remboursement client

Status: done

**Story key :** `24-8-mouvement-interne-caisse-distinct-charge-et-remboursement-client`  
**Epic :** 24 — Opérations spéciales de caisse, tags métier et extension Paheko terrain  
**Branche de travail attendue :** `epic/24-operations-speciales-orchestration`  
**Implementation artifact :** `_bmad-output/implementation-artifacts/24-8-mouvement-interne-caisse-distinct-charge-et-remboursement-client.md`

> **P1 (post-socle P0).** Le paquet audit P0 classe le **mouvement interne** (`cash.transfer`) comme **manquant** : permission absente du dépôt. Le PRD §10.6 le distingue explicitement du **décaissement** (charge de fonctionnement, story **24.7**) et de tout **remboursement client**. Cette story livre un parcours et une sémantique **finance seule** (ADR **D2**) branchée sur la **chaîne canonique** (ADR **D1**), sans réutiliser le vocabulaire ni les schémas « remboursement » pour un transfert pur.

## Contexte produit

**Définition PRD §10.6 :** mouvement de trésorerie qui n’est ni une vente, ni un remboursement client, ni une charge de fonctionnement (donc **pas** un décaissement au sens §10.5).

**Exemples PRD :** appoint de caisse ; apport de fond de caisse ; dépôt banque ; retrait banque ; transfert entre caisses ; régularisation d’écart selon politique.

**Champs minimaux PRD :** type de mouvement ; sens ; montant ; origine/destination ; motif ; opérateur ; justificatif ou référence.

**Permission PRD §16 :** `cash.transfer` (à créer / câbler comme les autres permissions caisse Epic 24).

**Validations PRD :** type obligatoire ; **jamais** classé comme décaissement de dépense ; justification renforcée pour mouvements sensibles ou élevés.

**Niveau de preuve :** N2 ou N3 selon montant / type — réutiliser **step-up**, audit, **initiateur / validateur** (ADR **D6**) là où N3 s’applique.

**Visibilité sync Paheko :** alignement **D7** avec les patterns Epic 8 (état cohérent avec l’outbox sur les opérations financières exposées au terrain).

## Story (BDD)

As a **responsable des opérations**,  
I want **que les mouvements internes de caisse soient séparés des remboursements client**,  
So that **les indicateurs et exports ne mélangent pas transferts internes et flux client** (epics.md Story 24.8).

## Acceptance criteria (source epics.md + PRD §10.6 / §16 / §17 + ADR)

1. **Sémantique distincte remboursement** — *Given* PRD §10.6 et epics (AC : pas de vocabulaire « remboursement » pour des transferts internes purs) ; *When* le flux mouvement interne est utilisé ; *Then* l’UX et les libellés métier / comptables **ne présentent pas** cette opération comme un remboursement client, et les données persistées portent un **type de parcours** explicite « mouvement interne » / équivalent stable (pas de réutilisation du schéma `sale_reversal` ou libellés remboursement pour ce seul besoin).
2. **Distinct du décaissement (24.7)** — *Given* PRD (mouvement interne **≠** charge de fonctionnement) ; *When* un enregistrement est créé ; *Then* il **ne passe pas** par l’énumération / le modèle **décaissement** story 24.7 (`cash.disbursement`, sous-types dépense) — chemins API, natures de transaction et libellés Paheko **séparés** et documentés.
3. **Permission `cash.transfer`** — *Given* PRD §16 et paquet audit P0 (permission manquante) ; *When* un utilisateur sans droit tente l’opération ; *Then* **403** (ou équivalent projet) ; *And* le hub Peintre (`CashflowSpecialOpsHub`, carte `cashflow-special-ops-card-mouvement-interne`) et la route livrée respectent le masquage (**`caisse.access`** + **`cash.transfer`**, pattern migrations + `permission_keys` + CREOS comme 24.6 / 24.7).
4. **Type de mouvement obligatoire (serveur)** — *Given* PRD §10.6 validations ; *When* l’API reçoit une requête ; *Then* le **type** (énumération / référentiel fermé **contrôlé serveur**) est validé et toute valeur inconnue ou requête sans type produit une **erreur de validation explicite** (4xx avec détail métier).
5. **Champs minimaux et cohérence** — *Given* §10.6 champs minimaux ; *When* le contrat est implémenté ; *Then* OpenAPI + schémas incluent au minimum : type, sens, montant, origine/destination (selon modèle retenu : caisse/session/site), motif, opérateur, référence/justificatif ; validations **serveur** pour plafonds / preuves selon matrice N2/N3.
6. **Chaîne financière canonique** — *Given* ADR **D1** ; *When* l’opération impacte le journal et la clôture ; *Then* elle alimente **`PaymentTransaction`** (ou extension cohérente du journal session) → snapshot → builder Paheko → outbox **sans second rail** ; les libellés builder reflètent le **mouvement interne** (pas « remboursement », pas libellé décaissement dépense).
7. **Tests** — *Given* exigence projet ; *When* la story est livrée ; *Then* **pytest** : happy path + refus sans permission + refus type manquant/invalide + séparation sémantique vérifiable (pas de confusion avec disbursement) ; **vitest/e2e** : hub → parcours (carte mouvement interne) au minimum navigation + garde permission alignée sur les cartes 24.6/24.7.

## Définition of Done (mesurable)

- [x] Permission `cash.transfer` en base, documentée OpenAPI si exposée, cohérente Peintre (démo + garde route).
- [x] Aucun libellé produit/API qui assimile le mouvement interne à un **remboursement client** ou à un **décaissement** §10.5.
- [x] Validation **type** et règles PRD **impossibles à court-circuiter** côté client seul.
- [x] OpenAPI (`contracts/openapi/recyclique-api.yaml`) + client TS (`cash-session-client.ts`) à jour.
- [x] Hub : carte **« Mouvement interne de caisse »** avec CTA réel vers `/caisse/mouvement-interne` (wizard manifesté).

## Tasks / Subtasks

- [x] Cartographier le modèle cible : comment un **mouvement interne** s’inscrit dans le journal de session et le snapshot (réutiliser patterns **24.7** / **24.6** / `MaterialExchange` comme inspiration, **sans** fusionner les concepts métier).
- [x] Définir l’**énumération / référentiel** des types de mouvement interne MVP + règles sens/origine/destination (migration + seeds si besoin).
- [x] Implémenter permission `cash.transfer`, endpoint(s), service : validation, montants, step-up si N3, audit initiateur/validateur si applicable.
- [x] Brancher **Peintre** : manifest CREOS, route dédiée (ex. `/caisse/mouvement-interne` — à figer dans l’impl), wizard ou formulaire, i18n, alignement `default-demo-auth-adapter` / registre widgets comme **24.5–24.7**.
- [x] Étendre snapshot / `paheko_close_batch_builder` pour lignes **mouvement interne** — libellés distincts remboursement et décaissement.
- [x] Mettre à jour hub `CashflowSpecialOpsHub.tsx` (carte `cashflow-special-ops-card-mouvement-interne`) : CTA conditionné + tests unitaires / e2e hub.
- [x] Tests pytest + vitest/e2e ; mettre à jour paquet audit ou note de fermeture d’écart (ligne Mouvement interne « Manquant » → Implémenté / Partiel).

## Dev Notes — Garde-fous techniques

### Périmètre story 24.8

- **Inclus :** mouvement interne typé ; permission `cash.transfer` ; séparation sémantique **remboursement client** et **décaissement charge** ; chaîne ADR D1.
- **Hors périmètre explicite :** tags métier (**24.9**), preuves enrichies P3 (**24.10**), **échange matière** (**24.6** — déjà livré), améliorations non liées au flux interne.

### Distinctions obligatoires (ne pas fusionner)

| Concept | Story / permission | Risque si confondu |
|--------|---------------------|---------------------|
| Décaissement charge | **24.7** — `cash.disbursement` | Mouvement interne traité comme dépense structurelle |
| Remboursement client | Epic 6 / 24.3–24.5 | Pollution métriques « remboursements » |
| Mouvement interne | **24.8** — `cash.transfer` | Double comptage ou mauvais libellés Paheko |

### Ancres code et réutilisation

| Sujet | Chemins / repères |
|--------|-------------------|
| Hub carte « à venir » | `peintre-nano/src/domains/cashflow/CashflowSpecialOpsHub.tsx` (`cashflow-special-ops-card-mouvement-interne`) |
| Pattern sortie hors ticket récent | Story **24.7** — `cash_disbursement_service.py`, `CashflowDisbursementWizard.tsx`, `POST .../disbursements` |
| Journal / transactions | `recyclique/api/.../models/payment_transaction.py`, natures existantes |
| Builder Paheko | `recyclique/api/.../services/paheko_close_batch_builder.py` |
| Chaîne canonique | `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` |
| Permissions caisse | Migrations `permission`, adaptateurs démo, `default-demo-auth-adapter.ts` |

### Anti-patterns à éviter

- Réutiliser les **écrans ou schémas remboursement** pour un simple transfert interne (interdit produit + AC1).
- Enregistrer un mouvement interne comme **`disbursement`** ou sous-type dépense (interdit PRD §10.6).
- Dupliquer une chaîne Paheko parallèle (interdit ADR D1).

### Intelligence story 24.7 (continuité)

- Lire d’abord le livrable story **24.7** : `_bmad-output/implementation-artifacts/24-7-decaissement-sous-types-obligatoires-sans-categorie-poubelle.md` (permission, hub, pytest/vitest, chaîne D1).
- Même discipline : permission métier + `caisse.access`, OpenAPI, snapshot, tests de rejet serveur, hub honnête.
- Le module **décaissement** (`cash_disbursement_*`, `POST .../disbursements`) documente un pattern récent — **ne pas** l’étendre pour « faire » le 24.8 sans décision de modèle explicite dans les Dev Notes / PR (mouvement interne = `cash.transfer`, chemins séparés).

### Intelligence git (aperçu)

- Travail récent Epic 24 : **24-2 → 24-7** (hub, remboursements, échange matière, décaissement) — réemployer conventions OpenAPI, migrations Alembic, tests `recyclique/api/tests/`, e2e hub `peintre-nano/tests/e2e/cashflow-special-ops-hub-24-2.e2e.test.tsx` et voisins.

### Recherche « versions » externes

- Pas de nouvelle dépendance majeure attendue : stack existante (`recyclique/api/requirements*.txt`, `peintre-nano/package.json`).

## Références

- Epic 24 — `_bmad-output/planning-artifacts/epics.md` (Story 24.8).
- Story 24.7 (référence impl voisin) — `_bmad-output/implementation-artifacts/24-7-decaissement-sous-types-obligatoires-sans-categorie-poubelle.md`.
- PRD — `references/operations-speciales-recyclique/2026-04-18_prd-recyclique-operations-speciales-sorties-matiere-paheko_v1-1.md` (§10.6, §16, §17).
- ADR — `_bmad-output/planning-artifacts/architecture/2026-04-18-adr-operations-speciales-caisse-paheko-v1.md` (D1, D2, D6, D7).
- Paquet audit P0 — `references/operations-speciales-recyclique/2026-04-18_paquet-audit-p0-operations-speciales-recyclique.md` (ligne Mouvement interne / `cash.transfer`).
- Prompt ultra opérationnel — `references/operations-speciales-recyclique/2026-04-18_prompt-ultra-operationnel-operations-speciales-recyclique_v1-1.md` (P1 : mouvement interne).
- Readiness — `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-18-operations-speciales.md`.

## QA Gate (story — avant review)

| # | Vérification |
|---|----------------|
| Q1 | Chaque AC epics §24.8 + PRD §10.6 est tracé par une tâche ou une section Dev Notes. |
| Q2 | Au moins un test serveur prouve le **rejet** sans type valide ou sans permission. |
| Q3 | Aucun parcours UI/API ne qualifie le flux livré de **remboursement client** pour un cas interne pur. |
| Q4 | Distinction explicite avec **décaissement 24.7** dans contrat, libellés et tests. |

## Alignement sprint

- **development_status** : pour ce **bmad-create-story (CS) create**, la clé `24-8-mouvement-interne-caisse-distinct-charge-et-remboursement-client` passe de **`backlog` à `ready-for-dev`** dans `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- **VS validate** : cohérence **story ↔ `sprint-status.yaml`** — `24-8-mouvement-interne-caisse-distinct-charge-et-remboursement-client` = **`ready-for-dev`** (aucune modification YAML requise).
- **epic-24** : **`in-progress`** (inchangé).

## Dev Agent Record

### Agent Model Used

Task — bmad-create-story (CS), 2026-04-19  
Task — bmad-create-story (VS validate), 2026-04-19

### Debug Log References

### Completion Notes List

- **DS 2026-04-19** : Implémenté flux `cash.transfer` + `POST .../internal-transfers`, modèle `cash_internal_transfers`, nature journal `cash_internal_transfer`, snapshot + Paheko (file `internal_cash_transfer`), wizard Peintre `/caisse/mouvement-interne`, hub CTA, OpenAPI + client TS, pytest + vitest, paquet audit P0 mis à jour.

### File List

- `_bmad-output/implementation-artifacts/24-8-mouvement-interne-caisse-distinct-charge-et-remboursement-client.md` (ce fichier)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `recyclique/api/migrations/versions/s24_8_cash_internal_transfer_story248.py`
- `recyclique/api/src/recyclic_api/models/cash_internal_transfer.py`
- `recyclique/api/src/recyclic_api/models/payment_transaction.py`
- `recyclique/api/src/recyclic_api/models/__init__.py`
- `recyclique/api/src/recyclic_api/models/audit_log.py`
- `recyclique/api/src/recyclic_api/schemas/cash_internal_transfer.py`
- `recyclique/api/src/recyclic_api/schemas/cash_session_close_snapshot.py`
- `recyclique/api/src/recyclic_api/services/cash_internal_transfer_service.py`
- `recyclique/api/src/recyclic_api/services/cash_session_journal_snapshot.py`
- `recyclique/api/src/recyclic_api/services/paheko_close_batch_builder.py`
- `recyclique/api/src/recyclic_api/services/idempotency_support.py`
- `recyclique/api/src/recyclic_api/services/creos_nav_presentation_labels.py`
- `recyclique/api/src/recyclic_api/core/step_up.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py`
- `recyclique/api/tests/conftest.py`
- `recyclique/api/tests/test_story_24_8_cash_internal_transfer.py`
- `contracts/openapi/recyclique-api.yaml`
- `contracts/creos/manifests/page-cashflow-internal-transfer.json`
- `contracts/creos/manifests/navigation-transverse-served.json`
- `peintre-nano/public/manifests/navigation.json`
- `peintre-nano/src/app/auth/default-demo-auth-adapter.ts`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/src/api/cash-session-client.ts`
- `peintre-nano/src/domains/cashflow/CashflowInternalTransferWizard.tsx`
- `peintre-nano/src/domains/cashflow/CashflowSpecialOpsHub.tsx`
- `peintre-nano/src/registry/register-cashflow-widgets.ts`
- `peintre-nano/tests/unit/cashflow-special-ops-hub-24-2.test.tsx`
- `peintre-nano/tests/e2e/cashflow-special-ops-hub-24-2.e2e.test.tsx`
- `references/operations-speciales-recyclique/2026-04-18_paquet-audit-p0-operations-speciales-recyclique.md`

### Change Log

- 2026-04-19 — **CS create** : story générée depuis epics §24.8, PRD §10.6, ADR D1/D2/D6/D7, paquet audit P0, intelligence 24.7 + hub `CashflowSpecialOpsHub` ; statut `ready-for-dev`.
- 2026-04-19 — **VS validate** : renfort intelligence 24.7 (chemin fichier), intelligence git, File List minimal + cibles tests indicatives ; checklist qualité story.
- 2026-04-19 — **DS impl** : livraison technique story 24.8 (permission, API, snapshot, Paheko, Peintre, tests) ; statut `review`.
