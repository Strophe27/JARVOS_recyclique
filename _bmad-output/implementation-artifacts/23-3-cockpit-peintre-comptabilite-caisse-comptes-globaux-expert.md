# Story 23.3 : Cockpit Peintre — comptabilité caisse (comptes globaux expert)

Status: done

**Story key :** `23-3-cockpit-peintre-comptabilite-caisse-comptes-globaux-expert`  
**Epic :** 23 — Alignement produit post-Epic 22  
**Dépendance :** story **`23-2-cockpit-peintre-moyens-paiement-expert-step-up-et-revision`** **optionnelle** pour l’ordonnancement (même hub, mêmes garde-fous, réutilisation du flux step-up) ; **Peintre peut travailler en parallèle** dès que le contrat OpenAPI des comptes globaux est stable. Le PRD §**5.2** impose un **écran « Comptabilité caisse » distinct** du paramétrage des **moyens de paiement** (story 23-2) : navigation et libellés ne doivent pas fusionner les deux sujets.

## Contexte

- L’API expert expose déjà **`GET`** et **`PATCH`** sur **`/v1/admin/accounting-expert/global-accounts`** (super-admin, validation format compte Paheko côté serveur).
- Le hub Peintre **`/admin/compta`** doit offrir une surface dédiée aux **comptes globaux**, alignée produit sur le PRD §5.2, sans dupliquer le cockpit moyens de paiement (23-2).

## Story

As a **super-admin** terrain,  
I want consulter et modifier les **comptes globaux** de comptabilité caisse depuis Peintre, avec les mêmes exigences de sécurité que le reste de l’admin expert,  
So that je configure le référentiel global sans Postman et sans confondre cet écran avec les moyens de paiement.

## Acceptance Criteria

1. **Navigation** — *Given* un utilisateur avec les mêmes garde-fous que le hub comptable existant (**`transverse.admin.view`**, contexte **site**, proxy super-admin UI aligné sur `ADMIN_SUPER_PAGE_MANIFEST_GUARDS` si inchangé) ; *When* il ouvre la section comptabilité caisse ; *Then* l’entrée est accessible depuis **`/admin/compta`** ou une **sous-route dédiée** (à documenter dans le manifest / navigation) avec un libellé en français clair, distinct de « Moyens de paiement (expert) » — par ex. **« Comptabilité caisse (comptes globaux) »** ou libellé validé produit.
2. **Lecture (GET)** — *When* la surface charge ; *Then* elle appelle **`GET {API_V1_STR}/admin/accounting-expert/global-accounts`** (chemin complet typiquement **`/v1/admin/accounting-expert/global-accounts`** ; segment **`accounting-expert` avec tiret**) et affiche les champs retournés par l’API avec **libellés français** compréhensibles pour un terrain (mapping libellé ↔ clé API documenté dans le code ou l’i18n).
3. **Écriture (PATCH)** — *When* l’utilisateur enregistre des modifications ; *Then* le client envoie **`PATCH`** sur la même ressource avec un corps JSON conforme à **`GlobalAccountsPayload`** (`recyclic_api/schemas/accounting_expert.py`) ; *And* l’en-tête **`X-Step-Up-Pin`** est présent (aligné sur **`STEP_UP_PIN_HEADER`** dans `step_up.py`), comme pour les autres opérations sensibles accounting-expert.
4. **Champs (parité backend vérifiée)** — *Then* le formulaire couvre **uniquement** les propriétés exposées aujourd’hui par l’API et le modèle `GlobalAccountingSettings` (`global_accounting_settings`) : **`default_sales_account`**, **`default_donation_account`**, **`prior_year_refund_account`** ; *And* la réponse affiche **`updated_at`** en lecture seule.  
   **Écart PRD §5.2 :** le PRD mentionne aussi **`cash_journal_code`**, **`default_entry_label_prefix`**, **`special_case_admin_validation`** — ces champs **n’existent pas** encore en base / schéma / OpenAPI ; ils sont **hors périmètre** de la 23-3 tant qu’une **story backend** (migration + API + contrat) ne les ajoute pas ; la 23-3 doit nommer cet écart dans les Dev Notes lors de l’implémentation (pas de champs fantômes côté UI).
5. **Validation / erreurs** — *Then* les erreurs **401 / 403 / 422** (y compris validation format compte Paheko) sont relayées en messages **non techniques** ; *And* l’absence ou l’invalidité du step-up sur **PATCH** est gérée comme sur les autres surfaces expert.
6. **Tests** — *Then* au minimum tests unitaires sur le client API + composant (Vitest), et scénario manuel documenté dans la story (e2e admin si le projet en a déjà pour `/admin/compta`).

## Hors périmètre

- **Builder Paheko**, ventilation par moyen, outbox : story **23-1** uniquement.
- **CRUD moyens de paiement**, publication de révision liée aux moyens : story **23-2** uniquement (pas de duplication de cette UI dans 23-3).
- Champs PRD §5.2 **non présents** dans l’API actuelle : **story backend dédiée** requise avant toute case à cocher ou champ correspondant dans Peintre.

## Tasks / Subtasks

- [x] Étendre **`admin-accounting-expert-client.ts`** : **`getGlobalAccounts`**, **`patchGlobalAccounts`** (PATCH avec step-up), types alignés sur **`GlobalAccountsPayload`** / **`GlobalAccountsResponse`** dans `contracts/openapi/recyclique-api.yaml`.
- [x] Nouveau widget ou page sous le hub **`AdminAccountingHubWidget`** : entrée **« Comptabilité caisse »** séparée du cockpit moyens (23-2) ; mise à jour manifest CREOS / navigation si nécessaire.
- [x] Formulaire trois champs + affichage **`updated_at`** ; validation locale minimale cohérente avec le serveur (regex compte Paheko côté API).
- [x] Réutiliser le **flux step-up** existant (même pattern que les autres routes `SENSITIVE_OPERATION_ACCOUNTING_EXPERT`).
- [x] Tests Peintre + libellés FR (i18n ou constantes centralisées).

## Dev Notes

### Contrat HTTP

- Base : `{origin}{API_V1_STR}` + **`/admin/accounting-expert`**.
- **`GET /global-accounts`** : pas de step-up requis côté route.
- **`PATCH /global-accounts`** : **`X-Step-Up-Pin`** obligatoire.

### Fichiers indicatifs

- Backend : `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_accounting_expert.py` (`get_global_accounts`, `patch_global_accounts`)
- Schémas : `recyclique/api/src/recyclic_api/schemas/accounting_expert.py` (`GlobalAccountsPayload`, `GlobalAccountsResponse`)
- Modèle : `recyclique/api/src/recyclic_api/models/accounting_config.py` (`GlobalAccountingSettings`)
- Step-up : `recyclique/api/src/recyclic_api/core/step_up.py` (`STEP_UP_PIN_HEADER`, `SENSITIVE_OPERATION_ACCOUNTING_EXPERT`)
- Peintre : `peintre-nano/src/api/admin-accounting-expert-client.ts`, `peintre-nano/src/domains/admin-config/AdminAccountingHubWidget.tsx`
- Contrat : `contracts/openapi/recyclique-api.yaml`

### Références

- PRD : `references/migration-paheko/2026-04-15_prd-recyclique-caisse-compta-paheko.md` — **§5.2**
- Stories voisines : `23-2-cockpit-peintre-moyens-paiement-expert-step-up-et-revision.md`, `23-1-ventiler-paheko-par-moyen-de-paiement-builder-migration-et-outbox.md`
- Fondation API : `22-3-livrer-le-parametrage-expert-des-moyens-de-paiement-et-des-comptes-globaux.md`

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- 2026-04-16 — Story Runner (`resume_at: CR`) : **CR1** CHANGES_REQUESTED (asymétrie CREOS `caisse.sale_correct` page comptes globaux vs 23-2) → **DS** (manifest + nav + contrat + doc 03) → **gates** vitest ciblé 48/48 → **CR2** APPROVE ; `cr_loop=1`.
- Scénario manuel : ouvrir **`/admin/compta/comptes-globaux`** avec session super-admin (proxy **`caisse.sale_correct`** + **`transverse.admin.view`**, site actif) ; vérifier chargement GET, saisie PIN, PATCH ; comparer avec Postman sur la même ressource si besoin.
- Pytest API : **omis** (aucune modification sous `recyclique/api/` dans ce run).

### File List

- `peintre-nano/src/api/admin-accounting-expert-client.ts` — `getGlobalAccounts`, `patchGlobalAccounts`, types OpenAPI.
- `peintre-nano/src/domains/admin-config/AdminAccountingGlobalAccountsWidget.tsx` — surface formulaire + step-up.
- `peintre-nano/src/domains/admin-config/AdminAccountingHubWidget.tsx` — lien vers comptes globaux (distinct 23-2).
- `peintre-nano/src/registry/register-admin-config-widgets.ts` — `admin.accounting.global.accounts`.
- `contracts/creos/manifests/page-transverse-admin-accounting-global-accounts.json`, `navigation-transverse-served.json`, `peintre-nano/public/manifests/navigation.json`.
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`, `RuntimeDemoApp.tsx` — route `/admin/compta/comptes-globaux`.
- `peintre-nano/src/runtime/nav-label-presentation-fallbacks.ts` — `nav.transverse.admin.accountingGlobalAccounts`.
- `peintre-nano/docs/03-contrats-creos-et-donnees.md` — Story 23-3.
- Tests : `admin-accounting-expert-global-accounts-client.test.ts`, `admin-accounting-global-accounts-widget.test.tsx`, `navigation-transverse-served-5-1.test.ts`, `admin-accounting-hub-widget.test.tsx`.

