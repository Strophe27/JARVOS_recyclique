# Story 24.5 : Remboursement exceptionnel sans ticket — PIN, motifs et justification

Status: done

**Story key :** `24-5-remboursement-exceptionnel-sans-ticket-pin-motifs-et-justification`  
**Epic :** 24 — Opérations spéciales de caisse, tags métier et extension Paheko terrain  
**Branche de travail attendue :** `epic/24-operations-speciales-orchestration`  
**Implementation artifact :** `_bmad-output/implementation-artifacts/24-5-remboursement-exceptionnel-sans-ticket-pin-motifs-et-justification.md`

> Note create-story : source `epics.md` §24.5 (BDD + AC), ADR D4 (parcours expert distinct, permission dédiée, PIN step-up, motifs codifiés, justification obligatoire, pas de collapse dans le schéma reversal standard), PRD opérations spéciales §10.4 + §14–15 (N3 / initiateur-validateur), paquet audit P0 (ligne « remboursement sans ticket » absent + contraintes repo-aware : `X-Step-Up-Pin`, `Idempotency-Key`, `PaymentTransaction` canonique). Continuité : patterns hub/wizard de 24.4 (`CashflowSpecialOpsHub`, `CashflowRefundWizard`), mais **24.5 doit rester un flux distinct du remboursement standard**.

## Contexte produit

Le remboursement standard existe déjà et impose une **vente source** (`POST /v1/sales/reversals`, schéma `SaleReversalCreate`, contrainte `SaleReversal.source_sale_id` non nullable, et duplication interdite par `uq_sale_reversals_source_sale_id`). Or le PRD (§10.4) et l’ADR D4 demandent un **remboursement exceptionnel sans ticket** : c’est un cas rare, très sensible, et il ne doit pas être déguisé en « variante » du nominal.

Cette story introduit donc un **parcours expert séparé**, gouverné par :

- **Permission dédiée** (PRD : `refund.exceptional`).
- **Step-up PIN obligatoire** côté serveur (`X-Step-Up-Pin`, mécanisme existant Story 2.4).
- **Motifs codifiés** (enum fermée) + **justification texte obligatoire**.
- **Traçabilité/audit exploitable** (corrélation `request_id`, `Idempotency-Key`, initiateur/validateur si possible).
- **Chaîne Paheko canonique** : journal `PaymentTransaction` → snapshot clôture → builder → outbox (ADR D1), **sans second rail** et **sans « collapse »** du contrat reversal standard (ADR D4).

## Story (BDD)

As an **auditor**,  
I want **orphan refunds to be impossible without structured proof**,  
So that **only governed expert actors can move money without a source ticket**.

## Acceptance criteria (source epics.md §24.5 + ADR D4 + PRD §10.4/§14–15)

Les points ci-dessous déclinent les **Given / When / Then / And** de `_bmad-output/planning-artifacts/epics.md` (Story 24.5) et les contraintes ADR/PRD repo-aware.

1. **Parcours expert distinct (UI + API)** — *Given* le remboursement standard exige une vente source (`POST /v1/sales/reversals`, `SaleReversalCreate.source_sale_id` non nullable) ; *When* la story 24.5 est livrée ; *Then* un **flux expert séparé** existe (page/CTA dédiés depuis le hub opérations spéciales), clairement nommé « remboursement exceptionnel sans ticket » ; *And* ce flux n’est **pas** un simple mode dans `CashflowRefundWizard` et ne réutilise pas le contrat `SaleReversalCreate` en rendant `source_sale_id` optionnel (ADR D4 : pas de collapse du schéma reversal standard).

2. **Permission dédiée** — *Given* une permission canonique de remboursement standard existe déjà (`caisse.refund`) ; *When* un utilisateur ouvre ou tente l’opération exceptionnelle ; *Then* l’accès est conditionné à une permission dédiée (PRD : **`refund.exceptional`**) ; *And* l’UI affiche un blocage explicite si la permission est absente (pas de « bouton qui échoue silencieusement »).

3. **Step-up PIN obligatoire (serveur)** — *Given* le mécanisme step-up serveur existe (`recyclique/api/src/recyclic_api/core/step_up.py`, en-tête `X-Step-Up-Pin`) ; *When* la mutation « remboursement exceptionnel » est déclenchée ; *Then* le serveur exige `X-Step-Up-Pin` (erreurs explicites `STEP_UP_PIN_REQUIRED` / `STEP_UP_PIN_INVALID` / `STEP_UP_LOCKED`) ; *And* l’UI propose un champ PIN step-up avant la validation finale, sans jamais journaliser la valeur côté client.

4. **Motifs codifiés + justification obligatoire** — *Given* le PRD impose motif codifié et justification texte (N3) ; *When* l’utilisateur valide un remboursement exceptionnel ; *Then* un **reason_code** (enum fermée) est obligatoire ; *And* une **justification texte** est obligatoire (validation serveur, message d’erreur explicite) ; *And* si un motif de type `AUTRE` existe, un détail est obligatoire (pattern déjà présent sur `SaleReversalCreate`).

5. **Idempotence et corrélation d’audit** — *Given* l’opération est sensible et ne doit pas être rejouée par erreur ; *When* le client appelle l’API ; *Then* un en-tête `Idempotency-Key` est **obligatoire** (erreur explicite `IDEMPOTENCY_KEY_REQUIRED` si absent) ; *And* la réponse rejoue strictement le même résultat pour une même clé ; *And* la réponse expose un identifiant d’opération stable ; *And* l’audit enregistre `X-Request-Id` (ou identifiant de requête équivalent) / `Idempotency-Key` / montant / moyen / motif / justification (corrélation supervision).

6. **Chaîne Paheko canonique (pas de second rail)** — *Given* la chaîne canonique passe par `PaymentTransaction` et le builder/outbox ; *When* un remboursement exceptionnel est enregistré ; *Then* il est journalisé en tant que flux financier sortant canonique (nature `refund_payment`, direction `outflow`, moyen effectif) ; *And* la clôture de session + builder Paheko restent le point d’export (ADR D1/D4), sans export ad hoc.

## Définition of Done (mesurable)

- [x] Le flux est **distinct** du remboursement standard : nouvelle surface UI + nouvel endpoint, pas de mutation du schéma `SaleReversalCreate` pour supporter « sans ticket ».
- [x] Permission `refund.exceptional` créée (migration) et utilisée **côté serveur** + surface UI de blocage si absente.
- [x] Step-up PIN (`X-Step-Up-Pin`) requis par le serveur pour la mutation, et géré proprement dans l’UI (champ + erreurs).
- [x] Motifs codifiés + justification texte validés serveur ; payload/response OpenAPI + client TS alignés.
- [x] Journal financier canonique : écriture `PaymentTransaction` cohérente ; impact session (montants) correct ; aucun « second rail » Paheko.
- [x] Audit : événement auditable (nouvel `AuditActionType` dédié ou équivalent), avec détails et corrélation (`X-Request-Id`, `Idempotency-Key`).
- [x] Tests : au moins (a) refus sans permission, (b) refus sans step-up, (c) happy path, (d) idempotence, (e) vérif journal `PaymentTransaction`.

## Tasks / Subtasks

- [x] Cartographier l’existant (ne pas réinventer) (AC: 1–6)
  - [x] Step-up serveur : `verify_step_up_pin_header`, codes erreurs, opérations sensibles existantes.
  - [x] Remboursement standard : endpoint `POST /v1/sales/reversals` + `SaleService.create_sale_reversal` + journal `PaymentTransaction` REFUND_PAYMENT.
  - [x] Hub + route : `CashflowSpecialOpsHub` + manifest navigation `/caisse/remboursement`.

- [x] Backend — permission + endpoint expert (AC: 1–6)
  - [x] Créer la permission `refund.exceptional` (migration Alembic, seed tests).
  - [x] Ajouter un endpoint dédié (nouveau routeur ou `endpoints/sales.py` selon conventions) avec schémas OpenAPI dédiés (pas `SaleReversalCreate`).
  - [x] Appliquer **permission + step-up** serveur (`X-Step-Up-Pin`) + **idempotence obligatoire** (`Idempotency-Key`, support Redis `idempotency_support.py`).
  - [x] Implémenter la persistance métier : opération « remboursement exceptionnel » (table dédiée recommandée) avec : `amount`, `refund_payment_method`, `reason_code`, `justification`, `initiator_user_id`, `approver_user_id` (peut être identique), `approved_at`, `idempotency_key`, `request_id` (valeur de `X-Request-Id` si fournie, sinon générée côté serveur).
  - [x] Journaliser un flux canonique `PaymentTransaction` (nature `REFUND_PAYMENT`, direction `OUTFLOW`) avec moyen effectif.
  - [x] Ajouter l’audit (`log_audit`) avec un `AuditActionType` dédié.

- [x] Front — surface dédiée et sûre (AC: 1–5)
  - [x] Ajouter une carte « remboursement exceptionnel sans ticket » dans `CashflowSpecialOpsHub` (CTA vers une nouvelle page).
  - [x] Créer une nouvelle page/manifest CREOS + widget dédié (ex. `page-cashflow-exceptional-refund.json`) ; ajouter une entrée nav si besoin.
  - [x] Implémenter un wizard minimal : montant, moyen, motif, justification, champ PIN step-up, confirmation finale.
  - [x] Gérer les erreurs step-up (`STEP_UP_PIN_REQUIRED`, `STEP_UP_PIN_INVALID`, `STEP_UP_LOCKED`) et permission (403).
  - [x] Générer/porter une `Idempotency-Key` stable pour la tentative (pattern `crypto.randomUUID()` déjà utilisé par `CashflowRefundWizard`) et l’envoyer en en-tête `Idempotency-Key`.

- [x] Tests (AC: 2–6)
  - [x] Pytest : refus sans permission ; refus sans PIN ; happy path ; idempotence.
  - [x] Vitest/Unit : blocage UI sans permission ; validation justification ; affichage erreurs step-up.
  - [ ] Option e2e (si aligné Story Runner) : parcours expert depuis hub → succès → affichage récap.

## Dev Notes — Garde-fous techniques

### Périmètre story 24.5

- **Inclus :** remboursement **sans ticket source** (pas de `source_sale_id`), permission dédiée, step-up PIN, motifs + justification, audit corrélé, écriture `PaymentTransaction` canonique.
- **Hors périmètre :** annulation PRD (`caisse.cancel`), échange/décaissement/mouvement interne (24.6–24.8), pièces jointes natives (P3, story 24.10).

### Contrat et modèle — point d’attention repo-aware (à traiter explicitement)

- Le journal canonique actuel `PaymentTransaction` impose `sale_id` **non nullable** (`recyclique/api/src/recyclic_api/models/payment_transaction.py`). Un remboursement « sans ticket source » nécessite donc :
  - **Option A (recommandée P0)** : introduire un document métier dédié (ex. `ExceptionalRefund`) **et** une représentation minimale « porteuse » pour satisfaire la chaîne (ex. un enregistrement `Sale` technique/finance-only dans la session), de façon à pouvoir écrire `PaymentTransaction` sans casser le modèle existant.
  - **Option B (plus invasive)** : rendre `PaymentTransaction.sale_id` nullable et adapter la chaîne snapshot/builder + `GET /v1/cash-sessions/{id}` (risque de régression large).
- Quel que soit le choix, **ne pas** étendre `SaleReversal` / `SaleReversalCreate` avec `source_sale_id` nullable : interdit par ADR D4 (pas de collapse du schéma reversal standard).

### Ancres code (réutiliser, ne pas réinventer)

| Sujet | Chemins |
|------|---------|
| Hub opérations spéciales (ajouter une carte dédiée) | `peintre-nano/src/domains/cashflow/CashflowSpecialOpsHub.tsx` |
| Wizard remboursement standard (pattern idempotence & erreurs) | `peintre-nano/src/domains/cashflow/CashflowRefundWizard.tsx` |
| Client API (headers step-up / idempotency) | `peintre-nano/src/api/sales-client.ts`, `peintre-nano/src/api/cash-session-client.ts`, `peintre-nano/src/api/admin-cash-sessions-client.ts` |
| Manifests pages/nav | `contracts/creos/manifests/page-cashflow-special-ops-hub.json`, `contracts/creos/manifests/page-cashflow-refund.json`, `peintre-nano/public/manifests/navigation.json` |
| Step-up serveur (PIN + erreurs) | `recyclique/api/src/recyclic_api/core/step_up.py` (`STEP_UP_PIN_HEADER`, `verify_step_up_pin_header`) |
| Support idempotence côté backend | `recyclique/api/src/recyclic_api/services/idempotency_support.py` (empreintes + conflits) |
| Reversal standard (à ne pas détourner) | `recyclique/api/src/recyclic_api/api/api_v1/endpoints/sales.py` (`POST /reversals`), `recyclique/api/src/recyclic_api/services/sale_service.py` (`create_sale_reversal`) |
| Journal canonique transactions | `recyclique/api/src/recyclic_api/models/payment_transaction.py` |
| Audit central (ajouter action dédiée) | `recyclique/api/src/recyclic_api/models/audit_log.py`, `recyclique/api/src/recyclic_api/core/audit.py` |
| Exemple migration permission refund | `recyclique/api/migrations/versions/d7f1_story_6_4_sale_reversals_and_refund_perm.py` (pattern `INSERT INTO permissions ...`) |

### Motifs codifiés — garde-fou

- Le remboursement standard utilise `RefundReasonCode` (Story 6.4) : `ERREUR_SAISIE`, `RETOUR_ARTICLE`, `ANNULATION_CLIENT`, `AUTRE` (`detail` obligatoire).  
- Pour 24.5, exiger une enum fermée **spécifique** ou explicitement réutiliser `RefundReasonCode` (décision à documenter). Dans tous les cas : **justification texte obligatoire** (PRD §10.4) et validation serveur.

### Audit — initiateur / validateur

- PRD §15 et ADR D6 demandent de distinguer initiateur et validateur. MVP acceptable :
  - `initiator_user_id` = utilisateur qui remplit/démarre le wizard (même session).
  - `approver_user_id` = utilisateur courant au moment de l’appel API (celui dont le PIN step-up est vérifié), pouvant être identique.
  - Tracer `approved_at`, `Idempotency-Key`, `request_id`.

### Intelligence story 24.4 (continuité)

- 24.4 a établi un pattern : **hub catalogue** + **wizard** + garde-fous serveur (permission) + visibilité terrain **avant** l’échec. 24.5 doit suivre le même niveau d’explicitation, mais en restant **strictement séparée** du remboursement standard.

## Références

- Epic 24 — `_bmad-output/planning-artifacts/epics.md` (Story 24.5).
- ADR — `_bmad-output/planning-artifacts/architecture/2026-04-18-adr-operations-speciales-caisse-paheko-v1.md` (D4).
- Audit P0 — `references/operations-speciales-recyclique/2026-04-18_paquet-audit-p0-operations-speciales-recyclique.md` (ligne « remboursement sans ticket » manquant + step-up/permission).
- PRD — `references/operations-speciales-recyclique/2026-04-18_prd-recyclique-operations-speciales-sorties-matiere-paheko_v1-1.md` (§10.4, §14–15, §16).
- Continuité 24.4 — `_bmad-output/implementation-artifacts/24-4-parcours-expert-remboursement-exercice-anterieur-clos-n-1.md` (patterns hub/wizard + section Ancres).

## QA Gate (story — avant dev-story)

| # | Vérification |
|---|----------------|
| Q1 | Le flux est clairement distinct du remboursement standard (UI + API) et ne force pas `SaleReversalCreate` à accepter un « sans ticket ». |
| Q2 | Permission `refund.exceptional` + step-up PIN (`X-Step-Up-Pin`) sont explicitement exigés et testables. |
| Q3 | Motifs codifiés + justification obligatoire (validation serveur + UI). |
| Q4 | Journal canonique `PaymentTransaction` utilisé, et l’export Paheko reste via snapshot/builder/outbox (pas de second rail). |
| Q5 | Audit corrélé (`request_id`, `Idempotency-Key`, details) et initiateur/validateur explicités (au moins MVP). |

## Alignement sprint

- **development_status** : la clé `24-5-remboursement-exceptionnel-sans-ticket-pin-motifs-et-justification` est **`done`** (Story Runner BMAD 2026-04-19).
- **epic-24** : reste **`in-progress`** (prochaine story **24-6** — P1 après socle P0 24.1–24.5).

## Dev Agent Record

### Agent Model Used

Codex 5.2

### Debug Log References

- N/A

### Completion Notes List

- Modèle `ExceptionalRefund`, migrations `s24_5_exceptional_refunds` + `s24_5b_exceptional_refunds_session_idempotency` (idempotence scopée session) et permission `refund.exceptional`.
- Endpoint `/v1/cash-sessions/{session_id}/exceptional-refunds` + idempotence Redis + journal canonique `PaymentTransaction` ; validation solde **avant** écritures vente/transaction.
- UI dédiée : carte hub, manifest page, wizard minimal (montant/moyen/motif/justification/PIN) + navigation.
- OpenAPI (`refund.exceptional`, 403) + client TS régénéré ; pytest `test_exceptional_refund_endpoint.py` + vitest `cashflow-exceptional-refund-gate-24-5` ; SQLite `conftest` + patch `log_audit` sur `exceptional_refund_service`.
- Correctifs post-CR : contrainte idempotence composite ; TS `NumberInput` onChange ; import tests `caisse_sale_eligibility`.

### File List

- `contracts/creos/manifests/navigation-transverse-served.json`
- `contracts/creos/manifests/page-cashflow-exceptional-refund.json`
- `contracts/creos/manifests/widgets-catalog-cashflow-nominal.json`
- `contracts/openapi/generated/recyclique-api.ts`
- `contracts/openapi/recyclique-api.yaml`
- `peintre-nano/public/manifests/navigation.json`
- `peintre-nano/src/api/cash-session-client.ts`
- `peintre-nano/src/app/auth/default-demo-auth-adapter.ts`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/src/domains/cashflow/CashflowExceptionalRefundWizard.tsx`
- `peintre-nano/src/domains/cashflow/CashflowSpecialOpsHub.tsx`
- `peintre-nano/src/registry/register-cashflow-widgets.ts`
- `peintre-nano/tests/unit/cashflow-exceptional-refund-gate-24-5.test.tsx`
- `recyclique/api/migrations/versions/s24_5_exceptional_refunds.py`
- `recyclique/api/migrations/versions/s24_5b_exceptional_refunds_session_idempotency.py`
- `recyclique/api/tests/conftest.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py`
- `recyclique/api/src/recyclic_api/core/step_up.py`
- `recyclique/api/src/recyclic_api/models/__init__.py`
- `recyclique/api/src/recyclic_api/models/audit_log.py`
- `recyclique/api/src/recyclic_api/models/exceptional_refund.py`
- `recyclique/api/src/recyclic_api/schemas/exceptional_refund.py`
- `recyclique/api/src/recyclic_api/services/cash_session_response_enrichment.py`
- `recyclique/api/src/recyclic_api/services/exceptional_refund_service.py`
- `recyclique/api/src/recyclic_api/services/idempotency_support.py`
- `recyclique/api/tests/caisse_sale_eligibility.py`
- `recyclique/api/tests/test_exceptional_refund_endpoint.py`

### Change Log

- 2026-04-19 — Story 24.5 créée (CS create-story).
- 2026-04-19 — Implémentation DS + Story Runner (gates ciblés) + correctifs CR (idempotence, OpenAPI, solde, tests SQLite).

