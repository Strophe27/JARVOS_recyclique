# Story 24.7 : Décaissement — sous-types obligatoires sans catégorie poubelle

Status: done

**Story key :** `24-7-decaissement-sous-types-obligatoires-sans-categorie-poubelle`  
**Epic :** 24 — Opérations spéciales de caisse, tags métier et extension Paheko terrain  
**Branche de travail attendue :** `epic/24-operations-speciales-orchestration`  
**Implementation artifact :** `_bmad-output/implementation-artifacts/24-7-decaissement-sous-types-obligatoires-sans-categorie-poubelle.md`

> **P1 (post-socle P0).** Le paquet audit P0 classe le **décaissement** comme **manquant** : permission PRD `cash.disbursement` absente du dépôt ; seul un **appui comptable partiel** existe dans `paheko_close_batch_builder.py` (libellés moyen). Cette story impose la **classification structurée** (énumération serveur + erreurs de validation) **avant** que le parcours ne devienne une zone grise exploitable comme fourre-tout (PRD §10.5, §22 critère 7, §23 interdiction).

## Contexte produit

Un **décaissement** est une **sortie de trésorerie hors ticket client** (PRD §10.5). Il ne doit **jamais** servir de catégorie poubelle : chaque enregistrement doit porter un **sous-type obligatoire** issu d’un **ensemble fermé** (MVP PRD + éventuel « autre » **uniquement** s’il est **codifié administrativement**, pas un champ libre seul).

**Permission PRD :** `cash.disbursement` (PRD §10.5, §16). Niveaux de preuve cibles : N2 minimum selon sous-type (frais bénévole, dépense fonctionnement) ; N3 recommandé pour sortie exceptionnelle — réutiliser **step-up / audit / initiateur–validateur** (ADR D6) comme pour les autres opérations sensibles Epic 24.

**Chaîne financière :** ADR **D1** — une seule autorité : référentiel moyens → journal (`PaymentTransaction` ou modèle aligné) → snapshot session → builder → outbox Paheko. **Ne pas** inventer un second export Paheko. Le détail d’implémentation (nouvelle nature `PaymentTransaction`, table dédiée session comme `MaterialExchange`, etc.) est à trancher en cohérence avec le schéma existant (notamment `sale_id` actuellement **non nul** sur `payment_transactions` : voir Dev Notes).

**Distinction story 24.8 :** le **mouvement interne** (`cash.transfer`, PRD §10.6) n’est **pas** un décaissement de dépense ; ne pas fusionner les parcours ni les enums. Le contrat OpenAPI (`POST /v1/cash-sessions/{session_id}/disbursements`) et la description d’opération le rappellent.

## Story (BDD)

As a **finance reviewer**,  
I want **chaque décaissement typé avec des catégories structurées**,  
So that **les exports et la supervision restent analysables** (epics.md Story 24.7).

## Acceptance criteria (source epics.md + PRD §10.5 / §16 / §22)

1. **Énumération serveur obligatoire** — *Given* PRD §10.5 (sous-types MVP : remboursement de frais bénévole ; petite dépense de fonctionnement ; sortie exceptionnelle validée ; autre **seulement** si codifié administrativement) ; *When* une API d’enregistrement de décaissement reçoit une requête ; *Then* le **sous-type** est validé contre une **liste fermée** connue du serveur (enum / table de référence versionnée) et toute valeur hors ensemble produit une **erreur de validation explicite** (4xx avec détail métier), **sans** accepter un libellé fourre-tout anonyme à la place du sous-type.
2. **Pas de « poubelle » implicite** — *Given* PRD §23 (ne pas traiter le décaissement comme champ libre fourre-tout) ; *When* l’UI ou un client envoie un décaissement ; *Then* il est **impossible** de valider avec uniquement un commentaire libre ou une catégorie générique non listée — le sous-type reste **obligatoire** et **contrôlé**.
3. **Permission** — *Given* PRD §10.5 / §16 ; *When* un utilisateur sans droit tente l’opération ; *Then* l’API répond **403** (ou équivalent cohérent projet) et la carte hub / route Peintre respecte le masquage (pattern **24.2** / **24.6** : permission dans migrations + `permission_keys` + CREOS).
4. **Champs minimaux PRD** — *Given* §10.5 champs minimaux ; *When* le parcours est implémenté ; *Then* le contrat (OpenAPI + schémas) inclut au minimum : sous-type, bénéficiaire ou fournisseur, montant, moyen utilisé, motif codifié, commentaire libre, opérateur, date réelle, référence justificative — avec validations **serveur** alignées (obligatoires / conditionnels selon sous-type et niveau de preuve).
5. **Cohérence Paheko** — *Given* ADR D1 et D7 ; *When* le décaissement produit une écriture attendue dans la chaîne de clôture ; *Then* les montants et libellés restent **traçables** jusqu’au builder / snapshot (réutiliser ou étendre proprement `_paheko_pm_decaissement_label_fr` et voisins — **pas** de libellé unique « divers » masquant le sous-type métier si le PRD exige l’analysabilité).
6. **Tests** — *Given* l’exigence projet (nominal + rejet) ; *When* la story est livrée ; *Then* des tests **pytest** couvrent **acceptation** avec sous-type valide et **rejet** sans sous-type / sous-type inconnu / tentative de contournement ; des tests **vitest/e2e** pertinents couvrent le hub → parcours (`cashflow-special-ops-card-decaisser` + route `/caisse/decaissement` livrée).

## Définition of Done (mesurable)

- [x] Permission `cash.disbursement` présente en base, documentée OpenAPI si exposée, cohérente Peintre (démo + garde route).
- [x] Validation **sous-type** impossible à court-circuiter côté client seul (contrats et erreurs **serveur**).
- [x] Aucune valeur de sous-type du type « Autre » **non codifiée** qui absorbe toute saisie sans discipline (si « autre » existe : mécanisme admin / enum étendue **tracé**, pas champ seul).
- [x] OpenAPI (`contracts/openapi/recyclique-api.yaml`) + client TS généré à jour si nouveaux endpoints ou enums.
- [x] Hub : passage de l’état **« à venir »** à **navigation réelle** vers le parcours livré **ou** décision documentée en Dev Notes si incrément API-only (dans ce cas, critères d’affichage honnêtes — pas de bouton factice).

## Tasks / Subtasks

- [x] Cartographier le modèle financier cible : comment une sortie **hors ticket** alimente le journal de session et le snapshot sans casser les FK existantes (`PaymentTransaction`, `Sale`, session).
- [x] Définir l’**enum / table** des sous-types MVP + règle « autre codifié » (migration + seeds si besoin).
- [x] Implémenter endpoint(s) et service : validation sous-type, permission `cash.disbursement`, montants, moyen, preuves selon matrice N2/N3, audit (initiateur/validateur si N3).
- [x] Brancher **Peintre** : route CREOS, wizard ou formulaire, i18n, alignement `default-demo-auth-adapter` / registre widgets comme **24.5 / 24.6**.
- [x] Mettre à jour builder Paheko / agrégats session si nouveaux codes ou natures — **sans** second rail.
- [x] Tests pytest + vitest/e2e selon périmètre réel ; mettre à jour paquet audit ou note de fermeture d’écart (ligne Décaissement « Manquant » → Implémenté / Partiel).

## Dev Notes — Garde-fous techniques

### Périmètre story 24.7

- **Inclus :** décaissement avec **sous-types obligatoires** ; permission `cash.disbursement` ; validation serveur ; branchement hub honnête ; chaîne financière ADR D1.
- **Hors périmètre explicite :** mouvement interne typé (**24.8**), tags métier (**24.9**), PJ natives P3 (**24.10**), échange matière (**24.6** — déjà livré).

### Ancres code et réutilisation

| Sujet | Chemins / repères |
|--------|-------------------|
| Hub placeholder décaissement | `peintre-nano/src/domains/cashflow/CashflowSpecialOpsHub.tsx` (`cashflow-special-ops-card-decaisser`) |
| Opération session sans vente (pattern récent) | `recyclique/api/.../models/material_exchange.py`, `material_exchange_service.py`, endpoints `cash_sessions.py` |
| Remboursement expert / step-up | Story **24.5** — motifs codifiés, PIN, `refund.exceptional` |
| Journal / transactions | `recyclique/api/.../models/payment_transaction.py` (`PaymentTransactionNature`, FK `sale_id`) |
| Libellés Paheko décaissement partiels | `recyclique/api/.../services/paheko_close_batch_builder.py` (`_paheko_pm_decaissement_label_fr`) |
| Chaîne canonique | `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` |
| Permissions caisse | migrations `permission`, adaptateurs démo |

### Anti-patterns à éviter

- Accepter un **seul** champ texte « motif » comme substitut du sous-type structuré (interdit PRD).
- Confondre décaissement et **remboursement client** ou **mouvement interne** (PRD §10.5 vs §10.6).
- Dupliquer une chaîne Paheko parallèle (interdit ADR D1).

### Intelligence story 24.6 (continuité)

- Même hub CREOS / patterns de permission que l’échange : carte conditionnée par `caisse.access` + droit métier.
- Les commits récents Epic 24 suivent le préfixe `feat(caisse): epic-24 story 24-x …` — garder la cohérence release.

### Intelligence git (aperçu)

- Travail récent Epic 24 : stories **24-2 → 24-6** sur hub, remboursements, échange matière — réemployer les mêmes conventions OpenAPI, migrations Alembic, tests d’intégration `recyclique/api/tests/`, e2e `peintre-nano/tests/e2e/`.

### Recherche « versions » externes

- Pas de nouvelle dépendance majeure attendue : **FastAPI / SQLAlchemy / React** tels que versions du repo ; suivre `recyclique/api/requirements*.txt` et `peintre-nano/package.json` existants.

## Références

- Epic 24 — `_bmad-output/planning-artifacts/epics.md` (Story 24.7).
- PRD — `references/operations-speciales-recyclique/2026-04-18_prd-recyclique-operations-speciales-sorties-matiere-paheko_v1-1.md` (§10.5, §16, §17, §19.5, §22 critère 7, §23).
- ADR — `_bmad-output/planning-artifacts/architecture/2026-04-18-adr-operations-speciales-caisse-paheko-v1.md` (D1, D6, D7).
- Paquet audit P0 — `references/operations-speciales-recyclique/2026-04-18_paquet-audit-p0-operations-speciales-recyclique.md` (ligne Décaissement / `cash.disbursement`).
- Prompt ultra opérationnel — `references/operations-speciales-recyclique/2026-04-18_prompt-ultra-operationnel-operations-speciales-recyclique_v1-1.md` (ligne décaissement : sous-types obligatoires).
- Readiness — `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-18-operations-speciales.md`.

## QA Gate (story — avant review)

| # | Vérification |
|---|----------------|
| Q1 | Chaque AC epics §24.7 + PRD §10.5 est tracé par une tâche ou une section Dev Notes. |
| Q2 | Au moins un test serveur prouve le **rejet** sans sous-type valide. |
| Q3 | Permission `cash.disbursement` cohérente backend + UI (pas d’action accessible sans droit). |
| Q4 | Distinction explicite avec **mouvement interne** (24.8) dans le contrat ou la doc story. |

## Alignement sprint

- **development_status** : pour ce **bmad-create-story (CS) create**, la clé `24-7-decaissement-sous-types-obligatoires-sans-categorie-poubelle` passe de **`backlog` à `ready-for-dev`** dans `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- **epic-24** : **`in-progress`** (inchangé).

## Dev Agent Record

### Agent Model Used

Task — bmad-create-story (CS), 2026-04-19

### Debug Log References

### Completion Notes List

- Implémentation alignée **24.5** : vente technique `Sale` + `PaymentTransaction` nature `disbursement` (OUTFLOW), conteneur `cash_disbursements`, permission `cash.disbursement`, idempotence Redis par session. Step-up PIN pour sous-types N3 (`validated_exceptional_outflow`, `other_admin_coded`) ; clés admin fermées pour `other_admin_coded`. Snapshot : `cash_disbursement_lines` ; Paheko ADVANCED ventile les crédits avec libellés sous-type. UI : `/caisse/decaissement`, hub manifesté, démo `default-demo-auth-adapter`.

### File List

- `recyclique/api/migrations/versions/s24_7_cash_disbursement_story247.py`
- `recyclique/api/src/recyclic_api/models/cash_disbursement.py`
- `recyclique/api/src/recyclic_api/models/payment_transaction.py`
- `recyclique/api/src/recyclic_api/models/audit_log.py`
- `recyclique/api/src/recyclic_api/models/__init__.py`
- `recyclique/api/src/recyclic_api/schemas/cash_disbursement.py`
- `recyclique/api/src/recyclic_api/schemas/cash_session_close_snapshot.py`
- `recyclique/api/src/recyclic_api/services/cash_disbursement_service.py`
- `recyclique/api/src/recyclic_api/services/cash_session_journal_snapshot.py`
- `recyclique/api/src/recyclic_api/services/paheko_close_batch_builder.py`
- `recyclique/api/src/recyclic_api/services/idempotency_support.py`
- `recyclique/api/src/recyclic_api/core/step_up.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py`
- `recyclique/api/tests/test_story_24_7_cash_disbursement.py`
- `recyclique/api/tests/caisse_sale_eligibility.py`
- `recyclique/api/tests/conftest.py`
- `contracts/openapi/recyclique-api.yaml`
- `contracts/openapi/generated/recyclique-api.ts`
- `contracts/creos/manifests/page-cashflow-disbursement.json`
- `contracts/creos/manifests/navigation-transverse-served.json`
- `peintre-nano/public/manifests/navigation.json`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/src/app/auth/default-demo-auth-adapter.ts`
- `peintre-nano/src/api/cash-session-client.ts`
- `peintre-nano/src/domains/cashflow/CashflowDisbursementWizard.tsx`
- `peintre-nano/src/domains/cashflow/CashflowSpecialOpsHub.tsx`
- `peintre-nano/src/registry/register-cashflow-widgets.ts`
- `peintre-nano/src/runtime/toolbar-selection-for-live-path.ts`
- `peintre-nano/tests/unit/cashflow-special-ops-hub-24-2.test.tsx`
- `peintre-nano/tests/e2e/cashflow-special-ops-hub-24-2.e2e.test.tsx`
- `peintre-nano/tests/unit/widget-registry.test.ts`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/24-7-decaissement-sous-types-obligatoires-sans-categorie-poubelle.md` (ce fichier)

### Change Log

- 2026-04-19 — **CS create** : story générée depuis epics §24.7, PRD §10.5, ADR D1/D6/D7, paquet audit P0, intelligence 24.6 + hub `CashflowSpecialOpsHub` ; statut `ready-for-dev`.
- 2026-04-19 — **DS bmad-dev-story** : livraison 24.7 (API + UI + tests + OpenAPI + migration merge Alembic) ; statut `review`.
