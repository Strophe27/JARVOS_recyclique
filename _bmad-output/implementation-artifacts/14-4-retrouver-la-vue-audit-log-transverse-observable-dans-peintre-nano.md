# Story 14.4 : Retrouver la vue audit-log transverse observable dans Peintre_nano

Status: review

**Story key :** `14-4-retrouver-la-vue-audit-log-transverse-observable-dans-peintre-nano`  
**Epic :** 14 — Étendre la parité UI legacy de l'administration dans `Peintre_nano` (rail **U** ; contrats rail **K** déjà clos en **16.2**)

## Story

As an authorized admin user,  
I want the audit log consultation surface to match the legacy intent in `Peintre_nano` using served CREOS manifests and the canonical OpenAPI contract,  
So that read-only transverse supervision is credible without inventing reporting features or undocumented fetches.

## Objectif

Vue de **consultation** branchée sur **`GET /v1/admin/audit-log`** (`operationId` **adminAuditLogList**, schéma **adminSessionStrict**), avec filtres / pagination / états vides alignés sur le **legacy** dans les limites du contrat publié ; patterns admin (guards, manifests) cohérents avec l’Epic 14.

## Périmètre (ferme)

- **Inclus :** `PageManifest` reviewable `contracts/creos/manifests/page-transverse-admin-audit-log.json` ; widget registre **`admin.audit-log.demo`** → **`AdminAuditLogWidget`** ; client typé `peintre-nano/src/api/admin-audit-log-client.ts` ; résolution route démo / bundle ; tests contrat / e2e navigation ; doc `peintre-nano/docs/03-contrats-creos-et-donnees.md` (sous-section dédiée).
- **Exclus :** **`email-logs`**, **`transaction-logs`** (autres stories) ; toute écriture ou mutation ; contournement auth (cookies / ContextEnvelope inchangés côté règles) ; réplication de la logique métier hors réponses OpenAPI.

## Acceptance Criteria

**Given** la famille **audit-log** est stabilisée côté contrat et permissions (**16.2**, `contracts/openapi/recyclique-api.yaml`)  
**When** la story est livrée  
**Then** la page `/admin/audit-log` affiche une liste (ou équivalent) alimentée par le client canon vers **`/v1/admin/audit-log`** avec filtres/query alignés sur le contrat (pas de paramètres inventés)  
**And** les états chargement / vide / erreur / 401 / 403 / rate limit sont honnêtes et testés au minimum par tests existants étendus ou équivalent reproductible

**Given** l'Epic 14 impose la hiérarchie OpenAPI → ContextEnvelope → manifests  
**When** la vue est composée  
**Then** aucune seconde source de vérité permission n'est ajoutée côté UI ; les guards transverses admin restent cohérents avec **17.3**  
**And** le `page_key` **`transverse-admin-audit-log`** reste aligné avec `RuntimeDemoApp.tsx` / `resolve-transverse-main-layout.ts`

**Given** la matrice de parité admin (**15.4** / pilotes UI)  
**When** la story est revue  
**Then** la ligne ou note pilote pour **audit-log** est citée ou mise à jour avec ce qui est prouvé vs reporté

## Tasks / Subtasks

- [x] Cartographier le legacy `AuditLog` / routes admin associées dans `recyclique-1.4.4` (champs visibles, filtres) vs champs exposés par l'OpenAPI actuel — écarts documentés en notes de livraison / doc 03.
- [x] Implémenter la vue liste (pagination, champs principaux) via `getAdminAuditLogList` ; widget **`AdminAuditLogWidget`** (plus de placeholder démo bloquant).
- [x] Manifest CREOS + enregistrement widget + résolution `RuntimeDemoApp` / bundle démo ; tests navigation / unitaires étendus.
- [ ] Gates **`peintre-nano`** : `npm run lint`, `npm run test`, `npm run build` — à confirmer au moment du passage **`review` → `done`** (non rejoués dans cette passe BMAD).

## Références

- `_bmad-output/planning-artifacts/epics.md` — Epic 14, Story 14.4
- `_bmad-output/implementation-artifacts/16-2-stabiliser-les-contrats-et-permissions-pour-groups-audit-log-et-email-logs.md`
- `contracts/openapi/recyclique-api.yaml` — paths `/v1/admin/audit-log`
- `contracts/creos/manifests/page-transverse-admin-audit-log.json`
- `peintre-nano/src/api/admin-audit-log-client.ts`
- `peintre-nano/src/domains/admin-config/AdminAuditLogWidget.tsx`
- `peintre-nano/src/domains/admin-config/AdminListPageShell.tsx`
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`

## Dev Agent Record

### Agent Model Used

Portage incrémental (sessions antérieures) ; **reconciliation BMAD 2026-04-13** (lecture dépôt uniquement).

### Completion Notes List

- Surface **`AdminAuditLogWidget`** + **`admin-audit-log-client.ts`** — `GET /v1/admin/audit-log` (`adminAuditLogList`), états chargement / vide / erreur, onglets consultation dans le périmètre contrat.
- **`page-transverse-admin-audit-log.json`**, type CREOS **`admin.audit-log.demo`** (id historique), routing **`/admin/audit-log`** dans **`RuntimeDemoApp`**.
- Tests : **`peintre-nano/tests/unit/admin-audit-log-widget.test.tsx`**, e2e **`navigation-transverse-5-1.e2e.test.tsx`** (navigation depuis le hub).

### File List

- `peintre-nano/src/domains/admin-config/AdminAuditLogWidget.tsx`
- `peintre-nano/src/api/admin-audit-log-client.ts`
- `contracts/creos/manifests/page-transverse-admin-audit-log.json`
- `peintre-nano/src/registry/register-admin-config-widgets.ts`
- `peintre-nano/tests/unit/admin-audit-log-widget.test.tsx`
