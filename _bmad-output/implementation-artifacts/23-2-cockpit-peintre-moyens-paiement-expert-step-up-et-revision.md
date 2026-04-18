# Story 23.2 : Cockpit Peintre — moyens de paiement expert (step-up, révision)

Status: done

**Story key :** `23-2-cockpit-peintre-moyens-paiement-expert-step-up-et-revision`  
**Epic :** 23 — Alignement produit post-Epic 22  
**Dépendance :** story **`23-1-ventiler-paheko-par-moyen-de-paiement-builder-migration-et-outbox`** en `done` (ou au minimum API stable) avant de marquer 23-2 `done` — pas de logique comptable Paheko dans 23-2 ; uniquement consommation des **endpoints** existants et UX admin. **Peintre peut démarrer en parallèle** dès que les contrats OpenAPI des moyens sont stables (pas besoin d’attendre la ventilation Paheko pour coder l’UI), mais la **Definition of Done** produit bout-en-bout peut exiger 23-1 `done`.

## Contexte

- L’API expert (22-3) permet déjà CRUD moyens, activation, ordre, comptes par moyen, publication de révision, step-up PIN.
- Peintre expose aujourd’hui surtout un **bandeau lecture seule** sur le hub comptable ; Strophe a besoin d’un **cockpit** pour gérer les moyens sans Postman.

## Story

As a super-admin terrain,  
I want gérer les moyens de paiement (liste, création, édition, activation, ordre) et être guidé pour **publier une révision** quand la compta l’exige,  
So that je n’ai pas à passer par des outils API externes pour le référentiel courant.

## Acceptance Criteria

1. **Navigation** — *Given* un utilisateur avec les mêmes garde-fous que le hub comptable existant (**`transverse.admin.view`**, contexte **site**, et proxy super-admin UI **`caisse.sale_correct`** aligné sur `ADMIN_SUPER_PAGE_MANIFEST_GUARDS` si inchangé) ; *When* il ouvre le cockpit ; *Then* l’entrée est accessible depuis le hub **`/admin/compta`** (ou sous-route dédiée documentée) avec libellé clair (« Moyens de paiement (expert) » ou équivalent validé produit).
2. **Lecture** — *When* le cockpit charge ; *Then* la liste des moyens reflète l’API (codes, libellés, actif/inactif, ordre, comptes Paheko affichés en lecture) sans recalcul métier côté client.
3. **Mutations** — *When* l’utilisateur crée, modifie, active/désactive ou réordonne ; *Then* chaque action appelle les routes existantes sous **`{API_V1_STR}/admin/accounting-expert/...`** (typiquement **`/v1/admin/accounting-expert/...`** ; segment **`accounting-expert` avec tiret**) : `GET/POST /payment-methods`, `PATCH /payment-methods/{id}`, `POST /payment-methods/{id}/active?active=true|false`, `POST /revisions/publish` ; *And* **pas de `DELETE`** HTTP sur le moyen (désactivation = route `active`) ; *And* l’**ordre** passe par le champ **`display_order`** en `POST` / `PATCH` (plusieurs PATCH si besoin, pas d’endpoint magique « reorder batch ») ; *And* les mutations sensibles envoient l’en-tête **`X-Step-Up-Pin`** aligné sur le backend (`STEP_UP_PIN_HEADER`) comme le reste de l’admin expert.
4. **Révision** — *When* une modification rend une publication nécessaire selon les règles 22-3 ; *Then* l’UI **bloque** ou **avertit** avec message explicite et lien ou action vers **publier la révision** (pas de contournement des erreurs 4xx métier).
5. **Sécurité / audit (minimal)** — *Then* les échecs step-up ou refus serveur sont affichés de façon **non technique** (pas de fuite de stack) ; *And* le client ne **invente** pas de nouvelles clés de permission : l’accès effectif reste **`require_super_admin_role()`** côté routes expert (OpenAPI = descriptions + `security` ; aligner les textes d’erreur UX sur les **401/403/422** réels).
6. **Tests** — *Then* au minimum tests unitaires ou tests de contrat sur les clients API + un scénario manuel documenté dans la story (ou e2e si déjà en place pour l’admin).

## Hors périmètre

- Builder Paheko, outbox, snapshot : story **23-1** uniquement.
- Édition des **comptes globaux** « comptabilité caisse » : story **23-3** (`23-3-cockpit-peintre-comptabilite-caisse-comptes-globaux-expert`).

## Tasks / Subtasks

- [x] Étendre `admin-accounting-expert-client.ts` (ou créer un module dédié moyens) pour tous les verbes nécessaires.
- [x] Nouveau widget ou page sous hub comptable + manifest CREOS si requis.
- [x] Formulaires, validation locale alignée sur les schémas OpenAPI (messages d’erreur API relayés).
- [x] Flux step-up réutilisé (même pattern que les autres surfaces admin sensibles).
- [x] Tests Peintre (Vitest) + mise à jour i18n / fallbacks navigation.

## Dev Notes

### Contrat HTTP (référence unique pour l’impl UI)

- Base : `{origin}{API_V1_STR}` (voir config client Peintre / env) + **`/admin/accounting-expert`**.
- Step-up (cette story uniquement) : en-tête **`X-Step-Up-Pin`** sur **`POST/PATCH payment-methods`**, **`POST …/active`**, **`POST revisions/publish`**. Le **`PATCH global-accounts`** est hors périmètre ici → story **23-3** (même en-tête, autre écran).
- **GET** (liste moyens, `revisions/latest`, etc.) : pas de step-up côté route.

### Fichiers indicatifs

- `peintre-nano/src/domains/admin-config/AdminAccountingHubWidget.tsx`
- `peintre-nano/src/api/admin-accounting-expert-client.ts`
- `contracts/openapi/recyclique-api.yaml` (chemins `accounting-expert`)
- `contracts/creos/manifests/page-transverse-admin-accounting.json`
- `peintre-nano/public/manifests/navigation.json`
- `peintre-nano/src/domains/admin-config/admin-super-page-guards.ts`
- Backend : `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_accounting_expert.py`, `recyclique/api/src/recyclic_api/core/step_up.py` (`STEP_UP_PIN_HEADER`, `SENSITIVE_OPERATION_ACCOUNTING_EXPERT`)

### Références

- PRD : `references/migration-paheko/2026-04-15_prd-recyclique-caisse-compta-paheko.md` — **§5.1** (écran moyens de paiement).
- [Source: `_bmad-output/implementation-artifacts/22-3-livrer-le-parametrage-expert-des-moyens-de-paiement-et-des-comptes-globaux.md`]
- [Source: `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_accounting_expert.py`]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Cockpit `/admin/compta/payment-methods` : liste, création, édition (dont ordre `display_order`), activation/désactivation, publication de révision ; en-tête `X-Step-Up-Pin` sur mutations sensibles ; comparaison liste courante vs snapshot dernière révision pour bandeau « publier » ; garde-fous `ADMIN_SUPER_PAGE_MANIFEST_GUARDS` ; pas d’appel API si profil non super-admin.
- Manuel : depuis `/admin/compta`, bouton « Moyens de paiement (expert) » vers la sous-route.

### File List

- `peintre-nano/src/api/admin-accounting-expert-client.ts`
- `peintre-nano/src/domains/admin-config/AdminAccountingPaymentMethodsWidget.tsx`
- `peintre-nano/src/domains/admin-config/AdminAccountingHubWidget.tsx`
- `peintre-nano/src/registry/register-admin-config-widgets.ts`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `peintre-nano/src/runtime/nav-label-presentation-fallbacks.ts`
- `peintre-nano/src/runtime/toolbar-selection-for-live-path.ts`
- `contracts/creos/manifests/page-transverse-admin-accounting-payment-methods.json`
- `contracts/creos/manifests/navigation-transverse-served.json`
- `peintre-nano/public/manifests/navigation.json`
- `peintre-nano/tests/unit/admin-accounting-expert-client.test.ts`
- `peintre-nano/tests/unit/admin-accounting-payment-methods-widget.test.tsx`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`

