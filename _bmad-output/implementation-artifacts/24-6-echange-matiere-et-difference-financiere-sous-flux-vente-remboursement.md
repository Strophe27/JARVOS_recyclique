# Story 24.6 : Échange matière et différence financière (sous-flux vente / remboursement)

Status: done

**Story key :** `24-6-echange-matiere-et-difference-financiere-sous-flux-vente-remboursement`  
**Epic :** 24 — Opérations spéciales de caisse, tags métier et extension Paheko terrain  
**Branche de travail attendue :** `epic/24-operations-speciales-orchestration`  
**Implementation artifact :** `_bmad-output/implementation-artifacts/24-6-echange-matiere-et-difference-financiere-sous-flux-vente-remboursement.md`

> **P1 (post-socle P0).** Le paquet audit P0 classe l’**échange** comme **manquant** : pas de route ni modèle « échange » dédié ; cette story le conçoit en s’appuyant sur **vente** + **remboursement** (PRD §11), sans troisième moteur monétaire (ADR D2).

## Contexte produit

Un **échange** est un **conteneur métier** (PRD §10.7) : il y a **toujours** un mouvement matière ; un mouvement **financier** seulement si la **différence** n’est pas nulle. Les cas sont :

1. **Échange pur** — différence 0 € → matière seule (ADR D2 : matière seule).
2. **Complément à la charge du client** — différence **positive pour la structure** → réutiliser le **sous-flux vente** standard (complément).
3. **Différence remboursée** — différence **négative pour la structure** → réutiliser le **sous-flux remboursement** standard.

La chaîne comptable Paheko reste **une seule** (ADR D1) : journal / snapshot / builder / outbox — pas de wallet parallèle ni d’export ad hoc.

## Story (BDD)

As a **caissière**,  
I want **des échanges avec delta non nul qui réemploient les mécanismes canoniques de vente et de remboursement**,  
So that **les stocks et la caisse restent cohérents sans inventer une logique financière parallèle**.

## Acceptance criteria (source epics.md + PRD §10.7 / §11)

1. **Conteneur métier** — *Given* PRD §10.7 ; *When* une opération d’échange est enregistrée ; *Then* le système trace explicitement **retour(s)** et **sortie(s)** matière (références ticket ou saisie minimale selon règles retenues) et conserve l’**échange** comme enveloppe de sens métier, distincte d’une vente ou d’un remboursement isolés lorsque le PRD exige cette sémantique.
2. **Pas de flux monétaire si delta nul** — *Given* un échange pur (cas 1) ; *When* la différence financière est 0 € ; *Then* **aucun** `PaymentTransaction` de nature vente/remboursement n’est créé **pour couvrir la différence** (le mouvement matière peut rester journalisé selon le modèle réception/stock existant).
3. **Delta positif structure → sous-flux vente** — *Given* ADR D2 et PRD §11 ; *When* le client paie un complément ; *Then* le complément est enregistré via les **mécanismes de vente encaissement** déjà canoniques (ex. finalisation de vente `Sale` / lignes / moyens de paiement existants) et apparaît dans les agrégats session comme une vente normale du point de vue financier, **rattachée** à l’échange au niveau métier ou corrélée (audit).
4. **Delta négatif structure → sous-flux remboursement** — *Given* les Stories 24.3 / 22.5 (reversal, moyen effectif, chaîne Paheko) ; *When* une somme doit être restituée au client ; *Then* le flux financier passe par le **parcours remboursement canonique** (`SaleReversal` / `POST /v1/sales/reversals` ou équivalent documenté), avec **même niveau de preuve** que le remboursement standard pour ce montant (sauf règle produit plus stricite documentée), **sans** schéma « échange » qui dupliquerait les champs reversal.
5. **Permission PRD** — *Given* PRD §10.7 (`caisse.exchange`) ; *When* un utilisateur tente l’opération ; *Then* l’habilitation est **vérifiée côté API** (migration permission + rattachement rôles / jeux de démo alignés `permission_keys`) et reflétée dans Peintre (masquage carte hub / garde route — pattern **24.2**).
6. **Paheko / sync** — *Given* ADR D1 et D7 ; *When* des écritures financières existent (cas 2–3) ; *Then* elles suivent la **chaîne snapshot → builder → outbox** comme le reste des flux caisse ; la **visibilité** terrain réemploie les patterns Story **24.3** (pas de promesse d’écriture instantanée si la chaîne reste clôture → outbox).
7. **Tests** — *Given* l’exigence P0 du prompt opérationnel (nominal + dégradé) ; *When* la story est livrée ; *Then* au moins **un scénario nominal** (ex. complément **ou** remboursement d’échange) et **un cas limite** (delta 0, ou rejet / règle métier documentée) sont couverts par **pytest** et/ou **vitest/e2e** selon le périmètre réel (UI + API).

## Définition of Done (mesurable)

- [x] Permission `caisse.exchange` (ou clé alignée grep/migrations) **existe** en base et est **cohérente** avec les manifests Peintre et les tests de non-régression permission.
- [x] Aucune **nouvelle** table « wallet » ni moteur de paiement parallèle ; les écritures financières réutilisent **Sale** / **SaleReversal** + journal existant.
- [x] OpenAPI (`contracts/openapi/recyclique-api.yaml`) et clients TypeScript **à jour** si nouveaux endpoints ou champs.
- [x] Carte **« Échanger »** du hub `CashflowSpecialOpsHub` : passage de **« à venir »** à **navigation réelle** vers le parcours livré (route + `page_key` + tests d’accès).
- [x] Pas de régression sur remboursement standard, N-1, remboursement exceptionnel (stories **24.3–24.5**) — non-régression attendue via parcours canoniques + tests hub/OpenAPI ; gate complet réservé Story Runner parent.

## Tasks / Subtasks

- [x] Cartographier le modèle matière (réception, lignes ticket, stock) : où enregistrer **entrée/sortie** d’objets pour un échange sans dupliquer la compta.
- [x] Trancher le **contrat API** : endpoint dédié orchestré (recommandé pour atomicité métier) **ou** enchaînement documenté vente + reversal avec **ID de corrélation** (`idempotency` / champ métier) — documenter la décision dans les Dev Notes finales.
- [x] Implémenter backend : validation montants, permission `caisse.exchange`, corrélation avec ventes/remboursements existants, audit.
- [x] Implémenter UI Peintre : parcours depuis le hub (manifest CREOS, widget, i18n), guidage caissière (delta, moyen encaissement ou remboursement).
- [x] Aligner **PRD §11** et **ADR D2** ; mettre à jour le paquet audit ou une note de fermeture d’écart si la ligne « Échange = Manquant » doit passer à « Implémenté / Partiel ».
- [x] Tests : pytest services + intégration API ; vitest/e2e hub → parcours (cf. `cashflow-special-ops-hub-24-2.e2e.test.tsx`).

## Dev Notes — Garde-fous techniques

### Périmètre story 24.6

- **Inclus :** parcours **échange** avec sous-flux financiers **canoniques** ; permission `caisse.exchange` ; branchement hub **24.2** ; cohérence matière + caisse.
- **Hors périmètre explicite :** décaissement (**24.7**), mouvement interne (**24.8**), tags métier liste riche (**24.9**), preuves PJ avancées P3 (**24.10**).

### Ancres code et réutilisation (ne pas réinventer)

| Sujet | Chemins / repères |
|--------|-------------------|
| Hub « à venir » échange | `peintre-nano/src/domains/cashflow/CashflowSpecialOpsHub.tsx` (`cashflow-special-ops-card-echanger`) |
| Remboursement standard | `CashflowRefundWizard.tsx`, `POST /v1/sales/reversals`, `sale_service.py` — `create_sale_reversal` |
| Réponse / sync hint | `SaleReversalResponse`, `build_sale_reversal_response` (Story **24.3**) |
| Vente nominale / session | endpoints `sales.py`, `SaleService`, modèles `Sale`, `PaymentTransaction` |
| Chaîne Paheko | `cash-accounting-paheko-canonical-chain.md`, `paheko_close_batch_builder.py` |
| Permissions caisse | migrations `permission`, adaptateurs démo `default-demo-auth-adapter.ts` |

### Anti-patterns à éviter

- **Moteur financier « exchange » séparé** qui ne réutilise pas vente/remboursement pour la partie monétaire (interdit PRD §11 / ADR D2).
- **Remboursement « free » comme canal** pour la différence (ADR D3) — le remboursement réel reste ventilé par **moyen effectif**.
- Oublier **step-up / preuves** si le scénario est équivalent à un remboursement N2/N3 (s’aligner sur matrices PRD §14 et stories **24.4 / 24.5** si le ticket source manque).

### Intelligence stories 24.2–24.5 (continuité)

- Le hub et les routes `/caisse/remboursement`, `/caisse/remboursement-exceptionnel` sont déjà là : l’échange doit **composer** ou **router** vers ces briques sans casser les garde-fous.
- Visibilité Paheko : réemployer `CashflowOperationalSyncNotice` / hints **24.3** sur les parties financières affichées.

### Tests — repères

- Hub : `peintre-nano/tests/unit/cashflow-special-ops-hub-24-2.test.tsx`, `peintre-nano/tests/e2e/cashflow-special-ops-hub-24-2.e2e.test.tsx`
- Remboursement : `peintre-nano/tests/unit/cashflow-refund-gate-6-4.test.tsx`, `recyclique/api/tests/test_sale_reversal_story64_integration.py` (naming historique)

## Références

- Epic 24 — `_bmad-output/planning-artifacts/epics.md` (Story 24.6).
- PRD — `references/operations-speciales-recyclique/2026-04-18_prd-recyclique-operations-speciales-sorties-matiere-paheko_v1-1.md` (§10.7 Échange, §11 Règle d’implémentation).
- ADR — `_bmad-output/planning-artifacts/architecture/2026-04-18-adr-operations-speciales-caisse-paheko-v1.md` (D1 rail unique, D2 matière/finance/mixte, D3, D7).
- Paquet audit P0 — `references/operations-speciales-recyclique/2026-04-18_paquet-audit-p0-operations-speciales-recyclique.md` (ligne Échange « Manquant » ; permission `caisse.exchange`).
- Chaîne canonique — `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`.
- Readiness — `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-18-operations-speciales.md`.

## QA Gate (story — avant review)

| # | Vérification |
|---|----------------|
| Q1 | Chaque AC epics §24.6 + PRD §10.7–§11 est tracé par une tâche ou une section Dev Notes. |
| Q2 | La partie financière delta ≠ 0 est explicitement ventilée en **vente** et/ou **reversal** canoniques. |
| Q3 | Permission `caisse.exchange` cohérente backend + UI (pas de carte accessible sans droit). |
| Q4 | Tests minimal nominal + limite présents ou justification HITL documentée. |

## Alignement sprint

- **development_status** : lors du **premier** **bmad-create-story (CS) create** réussi, la clé `24-6-echange-matiere-et-difference-financiere-sous-flux-vente-remboursement` est passée de **`backlog` à `ready-for-dev`** dans `_bmad-output/implementation-artifacts/sprint-status.yaml`, puis en **`review`** après **bmad-dev-story (DS)** — état YAML à jour : **`review`** (ne pas régresser).
- **epic-24** : **`in-progress`** (inchangé).

## Dev Agent Record

### Agent Model Used

Task — bmad-dev-story (DS), 2026-04-19

### Debug Log References

- Correction chargement session caisse : `_load_cash_session_operator_user` attend un `UUID` pour l’identifiant session — passer l’UUID session, pas la chaîne sérialisée.

### Completion Notes List

- **Contrat API** : `POST /v1/cash-sessions/{session_id}/material-exchanges` — orchestration selon `delta_amount_cents` : 0 = trace `MaterialExchange` uniquement ; >0 = vente complément via mécanismes `Sale` existants ; <0 = `SaleReversal` canonique (`caisse.refund` en plus de `caisse.exchange`). Permission `caisse.exchange` en migration + audit `CASH_MATERIAL_EXCHANGE`.
- **Peintre** : permission démo `caisse.exchange`, hub carte « Échanger » vers `/caisse/echange`, CREOS `page-cashflow-exchange` + `CashflowExchangeWizard`, client `postMaterialExchange`, registre widgets + navigation servie.
- **Tests** : `recyclique/api/tests/test_material_exchange_story246_integration.py` (pytest) ; `peintre-nano/tests/unit/cashflow-special-ops-hub-24-2.test.tsx`, `peintre-nano/tests/e2e/cashflow-special-ops-hub-24-2.e2e.test.tsx`, `peintre-nano/tests/unit/widget-registry.test.ts` (vitest) — exécutés verts en DS.
- **Paquet audit P0** : fichier `references/.../paquet-audit-p0-...md` non réédité ; fermeture d’écart livrable = implémentation + cette story (ligne « Manquant » à passer « Implémenté / Partiel » côté processus produit si validé).

### File List

- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/24-6-echange-matiere-et-difference-financiere-sous-flux-vente-remboursement.md` (ce fichier)
- `contracts/openapi/recyclique-api.yaml`
- `contracts/openapi/generated/recyclique-api.ts`
- `contracts/creos/manifests/page-cashflow-exchange.json`
- `contracts/creos/manifests/navigation-transverse-served.json`
- `peintre-nano/public/manifests/navigation.json`
- `peintre-nano/src/api/cash-session-client.ts`
- `peintre-nano/src/app/auth/default-demo-auth-adapter.ts`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/src/domains/cashflow/CashflowExchangeWizard.tsx`
- `peintre-nano/src/domains/cashflow/CashflowSpecialOpsHub.tsx`
- `peintre-nano/src/registry/register-cashflow-widgets.ts`
- `peintre-nano/tests/e2e/cashflow-special-ops-hub-24-2.e2e.test.tsx`
- `peintre-nano/tests/unit/cashflow-special-ops-hub-24-2.test.tsx`
- `peintre-nano/tests/unit/widget-registry.test.ts`
- `peintre-nano/tests/e2e/cashflow-exchange-wizard-24-6.e2e.test.tsx`
- `recyclique/api/migrations/versions/s24_6_material_exchange_story246.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py`
- `recyclique/api/src/recyclic_api/models/__init__.py`
- `recyclique/api/src/recyclic_api/models/audit_log.py`
- `recyclique/api/src/recyclic_api/models/material_exchange.py`
- `recyclique/api/src/recyclic_api/schemas/material_exchange.py`
- `recyclique/api/src/recyclic_api/services/material_exchange_service.py`
- `recyclique/api/tests/caisse_sale_eligibility.py`
- `recyclique/api/tests/conftest.py`
- `recyclique/api/tests/test_material_exchange_story246_integration.py`
- `peintre-nano/tests/e2e/cashflow-defensive-6-9.e2e.test.tsx` (mock GET `/v1/sales/payment-method-options` pour stabilité e2e)
- `peintre-nano/tests/e2e/cashflow-held-6-3.e2e.test.tsx` (idem)
- `peintre-nano/tests/e2e/cashflow-social-6-6.e2e.test.tsx` (idem)
- `peintre-nano/tests/e2e/cashflow-special-6-5.e2e.test.tsx` (idem)
- `peintre-nano/tests/unit/admin-accounting-expert-global-accounts-client.test.ts` (alignement client / génération OpenAPI)

### Change Log

- 2026-04-19 — CS create (idempotent, Task) : story déjà sur disque, sprint `review` inchangé ; section Alignement sprint synchronisée (CS→ready-for-dev déjà fait ; DS→`review`).
- 2026-04-19 — Story 24.6 créée (CS create) : échange matière + sous-flux vente/remboursement, permission `caisse.exchange`, alignement PRD §11 / ADR D2.
- 2026-04-19 — DS `bmad-dev-story` : endpoint matière-échange + UI hub/wizard + OpenAPI/generate ; sprint `24-6` → **review** ; tests pytest story246 + vitest hub/registry.
- 2026-04-19 — Story Runner BMAD : GATE (lint) → correctifs `CashflowExchangeWizard` (`local` / `api`) ; CR1 → handler `ConflictError`/`NotFoundError` sur `create_material_exchange` + test intégration 404 session inconnue ; GATE+QA+CR2 → **done** ; `vs=0` `qa=0` `cr=1`.
