# Story 17.2 : Porter `cash-registers` et `sites` sur une meme ossature admin stable

Status: done

<!-- Note : validation optionnelle — `validate-create-story` avant `dev-story` si besoin. -->

**Story key :** `17-2-porter-cash-registers-et-sites-sur-une-meme-ossature-admin-stable`  
**Epic :** 17 (rail **U** — portage UI admin classe **A**, sans remediation backend de fond)

## Story

As an architecture team maximizing reuse,  
I want `cash-registers` and `sites` assembled from the same stable admin patterns,  
So that two nearby configuration surfaces validate the shared list/detail/form conventions without business duplication.

## Acceptance Criteria

**Bloc A — Rail U, gap K et Epic 16**

1. **Given** l’Epic 17 est un rail **U** et exclut toute remediation backend de fond  
   **When** un ecart contractuel nouveau est identifie pendant l’implementation  
   **Then** il est documente (correct course ou renvoi explicite vers **Epic 16** / rail **K**) sans masquer le gap ni inventer des operations ou schemas hors **OpenAPI canon** (`contracts/openapi/recyclique-api.yaml`).

2. **Given** la cartographie **15.2** et le gap **G-OA-02** (`sites`, `cash-registers` : ressources **absentes** ou incompletes dans l’OpenAPI canon)  
   **When** on evalue un binding live (`data_contract`, client genere)  
   **Then** le constat reste **explicite** dans le livrable (story / notes / slots CREOS) ; si le YAML canon ne porte toujours pas les operations necessaires, la story se borne a **manifests + shell + widgets placeholder honnetes** (comme 17.1 sur pending) avec renvoi **Epic 16** — **sans** types ou URLs inventes dans Peintre.

**Bloc B — Hierarchie de verite et prefs**

3. **Given** la hierarchie documentee (OpenAPI → ContextEnvelope → NavigationManifest → PageManifest → UserRuntimePrefs borne non metier, `peintre-nano/docs/03-contrats-creos-et-donnees.md`)  
   **When** les pages sont servies  
   **Then** la composition reste pilotee par les **manifests CREOS** servis et le runtime Peintre ; **aucune** seconde verite metier dans `UserRuntimePrefs` ni dans le moteur.

**Bloc C — Shell admin transverse (meme ossature que 17.1)**

4. **Given** le shell admin transverse (Epic 14.1, Story 17.1)  
   **When** l’utilisateur authentifie ouvre **`/admin/cash-registers`** ou **`/admin/sites`** (chemins **legacy observables**, `App.jsx` sous layout `adminOnly`)  
   **Then** les deux routes restent sous le prefixe **`/admin`** avec **`LiveAdminPerimeterStrip`**, **`TransverseHubLayout`** en variante **`shellAdmin`**, et la logique **`isTransverseAdminShellPath`** dans `RuntimeDemoApp.tsx` — meme famille d’experience que **`/admin/pending`**, **`/admin/access`**, **`/admin/site`**.

5. **Given** la convention Story 17.1 / `resolve-transverse-main-layout.ts`  
   **When** les `page_key` des nouveaux `PageManifest` sont choisis  
   **Then** ils **commencent par `transverse-admin`** pour le mode hub admin (pas de fork ad hoc du resolveur).

**Bloc D — Navigation et pages CREOS**

6. **Given** `navigation-transverse-served.json` contient deja **`/admin/site`** (hub leger Story **14.2**, `page-transverse-admin-site-overview`) mais **pas** les chemins legacy **`/admin/cash-registers`** ni **`/admin/sites`**  
   **When** la story est livree  
   **Then** deux **nouvelles** entrees de navigation (ids stables, `path` **`/admin/cash-registers`** et **`/admin/sites`**, `page_key` dedies, `shortcut_id`, `label_key` i18n, visibilite alignee admin) sont ajoutees au manifest serveur, avec **deux** `PageManifest` JSON distincts mais **structurellement paralleles** (meme famille de slots / types de widgets / pattern liste + etats chargement / erreur — conventions `page-transverse-admin-pending.json` et `page-transverse-admin-site-overview.json` comme references de forme, pas de duplication metier).

7. **Given** l’ecart documente matrice **14-02** / **15-4** : hub CREOS **`/admin/site`** (singulier) vs legacy **`/admin/sites`** (pluriel, CRUD)  
   **When** la livraison est revue  
   **Then** la relation **`/admin/site`** ↔ **`/admin/sites`** est **explicite** dans la story d’implementation ou dans `peintre-nano/docs/03-contrats-creos-et-donnees.md` (alias runtime, coexistence, ou decision produit) — **sans** fusion silencieuse qui masquerait l’intention legacy.

**Bloc E — Guards**

8. **Given** le legacy : `cash-registers` et `sites` sont sous **`ProtectedRoute adminOnly`** sans `requiredRoles` supplementaires (`App.jsx`)  
   **When** les entrees nav et `PageManifest` definissent les guards  
   **Then** les cles **`required_permission_keys`** et la **visibilite** (`contexts_any`, etc.) restent **alignees** avec les autres pages admin transverses (ex. **`transverse.admin.view`**, contexte **site**) et **aucune** permission fantome non documentee n’est introduite.

**Bloc F — Widgets et domaine code**

9. **Given** les patterns Story **17.1** (`PendingUsersDemoPlaceholder`, registre admin-config)  
   **When** des widgets liste / formulaire / actions sont necessaires avant fermeture OpenAPI  
   **Then** ils sont enregistres dans le **registre** Peintre, localises de preference sous **`peintre-nano/src/domains/admin-config/`**, avec libelles **honnetes** sur la dette contractuelle (pas de donnees metier simulees comme si le contrat existait).

**Bloc G — Parite et preuves Epic 15**

10. **Given** la matrice `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` (lignes **`ui-admin-15-4-cash-registers`**, **`ui-admin-15-4-sites`**)  
    **When** on valide la story  
    **Then** la preuve cite et met a jour (ou reference explicitement) ces lignes **plus** la cartographie `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md` (tableaux `/admin/cash-registers`, `/admin/sites`) — **pas** seulement des captures ad hoc.

11. **Given** les tests existants legacy `CashRegisters.test.tsx` (comportement reference, hors binding Peintre)  
    **When** la chaine Peintre est testee  
    **Then** des tests automatisables (Vitest / Playwright, lignee navigation transverse / admin 14.1) couvrent au minimum la **presence** des routes, des libelles nav, du shell admin, et du comportement **placeholder** ou degrade coherent avec le gap OpenAPI.

## Tasks / Subtasks

- [x] **AC 2, 6, 9** — Verifier l’etat **OpenAPI canon** pour operations `cash-registers` / `sites` (recherche ciblee dans `recyclique-api.yaml` ; comparer au legacy `recyclique-1.4.4/frontend/src/generated/api.ts` **en reference seulement**). Documenter le gap **G-OA-02** ; si toujours absent, placeholders + renvoi **Epic 16** (pas de binding live invente).

- [x] **AC 6, 7** — CREOS : ajouter **`/admin/cash-registers`** et **`/admin/sites`** dans `contracts/creos/manifests/navigation-transverse-served.json` ; creer deux `PageManifest` (`page_key` **`transverse-admin-*`**) ; documenter la coexistence avec **`/admin/site`**.

- [x] **AC 3, 4, 5, 8** — Peintre : brancher les routes (manifest routing / `RuntimeDemoApp` / `runtime-demo-manifest` selon patterns 17.1) ; respecter **`isTransverseAdminShellPath`** ; **`TransverseHubLayout`** `family='admin'` + **`LiveAdminPerimeterStrip`** en auth live.

- [x] **AC 9** — Registre : widgets dedies (ex. demo / placeholder nommes) pour caisses enregistrees et sites, messages de gap explicites ; i18n nav (`nav.transverse.admin.*` ou nouvelles cles coherentes).

- [x] **AC 10, 11** — Mettre a jour la matrice / cartographie si decisions de chemins ou de dette ; ajouter tests navigation + shell.

- [x] **AC 1** — Notes finales : rail **U** ; tout ecart contractuel → **Epic 16** ou correct course.

## Dev Notes

### Architecture et discipline contractuelle

- **Hierarchie** : `peintre-nano/docs/03-contrats-creos-et-donnees.md` — ordre OpenAPI → ContextEnvelope → manifests → prefs non metier.
- **Shell admin** : meme doc, section **Shell admin transverse** (Epic 14.1) — routes sous **`/admin`**, **`LiveAdminPerimeterStrip`**, **`TransverseHubLayout`** / **`shellAdmin`**.
- **Runtime** : `peintre-nano/src/app/demo/RuntimeDemoApp.tsx` — **`isTransverseAdminShellPath`**.
- **Layout hub admin** : `peintre-nano/src/app/templates/transverse/resolve-transverse-main-layout.ts` — prefixe **`transverse-admin*`** pour mode hub.
- **Domaine code** : `peintre-nano/src/domains/admin-config/` (patterns 17.1).

### Legacy observable (chemins et composants)

- Routage : `recyclique-1.4.4/frontend/src/App.jsx` — `path="cash-registers"` / `path="sites"` sous **`/admin`** → URLs **`/admin/cash-registers`**, **`/admin/sites`**.
- Pages : `recyclique-1.4.4/frontend/src/pages/Admin/CashRegisters.tsx` ; `recyclique-1.4.4/frontend/src/pages/Admin/Sites.tsx`.
- API legacy generee (non canon) : `getCashRegisters`, CRUD `/v1/cash-registers/…` ; sites via services (`getSites`, etc.) — **correler** au YAML canon en tete d’implementation.

### OpenAPI canon et gap K

- Cartographie : `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md` — lignes **`/admin/cash-registers`**, **`/admin/sites`** ; gap **Registers** / **Sites** : **absent** OpenAPI.
- A la redaction CS : recherche `cash-registers` / chemins `/v1/cash-registers` dans `contracts/openapi/recyclique-api.yaml` **sans** match operationnel aligne legacy admin — **confirmer en DS** avant tout binding.

### CREOS existant (reference)

- Nav : `contracts/creos/manifests/navigation-transverse-served.json` — hub **`transverse-admin-site`** sur **`/admin/site`**.
- Page hub site : `contracts/creos/manifests/page-transverse-admin-site-overview.json`.
- Reference forme slice admin : `contracts/creos/manifests/page-transverse-admin-pending.json` (Story **17.1**).

### Story precedente (intelligence 17.1)

- Slice **`/admin/pending`** : placeholder demo tant qu’OpenAPI ne porte pas `GET /v1/admin/users/pending` ; pas de remediation backend dans le rail **U**.
- Reutiliser la meme discipline pour **cash-registers** / **sites** : manifests + shell + widgets honnetes ; dette nommee vers **Epic 16**.

### Tests / qualite

- S’aligner sur `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts` et e2e admin / transverse post-17.1.

### Project Structure Notes

- Contrats dans `contracts/` ; Peintre **consomme** — pas de second OpenAPI dans `peintre-nano`.
- Dupliquer le minimum de structure entre les deux pages : **ossature** partagee (meme famille de slots / composants enregistres), variations **explicites** dans `widget_props` ou props manifestees, pas deux generateurs de pages divergents.

### References

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 17, Story 17.2]
- [Source : `_bmad-output/implementation-artifacts/17-1-porter-pending-comme-premier-slice-creos-admin-observables-et-mutualisable.md` — forme rail U + placeholder + matrice]
- [Source : `peintre-nano/docs/03-contrats-creos-et-donnees.md` — hierarchie ; shell admin § 14.1]
- [Source : `contracts/creos/manifests/navigation-transverse-served.json`]
- [Source : `contracts/creos/manifests/page-transverse-admin-site-overview.json`]
- [Source : `recyclique-1.4.4/frontend/src/App.jsx` — routes admin cash-registers / sites]
- [Source : `recyclique-1.4.4/frontend/src/pages/Admin/CashRegisters.tsx`, `Sites.tsx`]
- [Source : `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md` — G-OA-02, tableaux admin]
- [Source : `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` — `ui-admin-15-4-cash-registers`, `ui-admin-15-4-sites`, `ui-pilote-14-02-admin-parametres-simples`]
- [Source : `contracts/openapi/recyclique-api.yaml` — etat canon a verifier]
- [Source : `peintre-nano/src/app/demo/RuntimeDemoApp.tsx` — `isTransverseAdminShellPath`]
- [Source : `peintre-nano/src/app/templates/transverse/resolve-transverse-main-layout.ts`]

## Dev Agent Record

### Agent Model Used

Composer (sous-agent Task DS Story Runner), 2026-04-12.

### Debug Log References

_(aucun blocage — OpenAPI canon sans operations `cash-registers` / `sites` alignees ; grep `recyclique-api.yaml`.)_

### Completion Notes List

- **OpenAPI** : pas d’operations admin Registers/Sites exploitables dans `contracts/openapi/recyclique-api.yaml` au DS ; placeholders + textes CREOS explicites **G-OA-02** → **Epic 16** (rail **K**), rail **U** respecté (aucune remediation backend).
- **CREOS** : nav + `page-transverse-admin-cash-registers.json` / `page-transverse-admin-sites.json` ; coexistence **`/admin/site`** vs **`/admin/sites`** documentée dans `peintre-nano/docs/03-contrats-creos-et-donnees.md` et slot header sites.
- **Peintre** : bundle `runtime-demo-manifest.ts`, `RuntimeDemoApp` (selection nav profonde), `toolbar-selection-for-live-path.ts`, widgets `admin.cash-registers.demo` / `admin.sites.demo`, fallbacks `nav-label-presentation-fallbacks.ts`, copie `public/manifests/navigation.json`.
- **Preuves** : matrice `2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` (lignes `ui-admin-15-4-cash-registers`, `ui-admin-15-4-sites`) ; cartographie `2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md` ; tests Vitest `navigation-transverse-served-5-1.test.ts` + e2e `navigation-transverse-5-1.e2e.test.tsx` ; **gates Story Runner** : `npm run lint` + `npm run build` + `npm run test` dans `peintre-nano` — tous OK (410 tests).

### File List

- `contracts/creos/manifests/navigation-transverse-served.json`
- `contracts/creos/manifests/page-transverse-admin-cash-registers.json`
- `contracts/creos/manifests/page-transverse-admin-sites.json`
- `peintre-nano/public/manifests/navigation.json`
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `peintre-nano/src/domains/admin-config/CashRegistersAdminDemoPlaceholder.tsx`
- `peintre-nano/src/domains/admin-config/SitesAdminDemoPlaceholder.tsx`
- `peintre-nano/src/domains/admin-config/README.md`
- `peintre-nano/src/registry/register-admin-config-widgets.ts`
- `peintre-nano/src/runtime/nav-label-presentation-fallbacks.ts`
- `peintre-nano/src/runtime/toolbar-selection-for-live-path.ts`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx`
- `peintre-nano/tests/unit/prune-navigation-for-live-toolbar.test.ts`
- `peintre-nano/tests/unit/transverse-templates-5-6.test.tsx`
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- **2026-04-12** — Story Runner (CS→VS→DS→GATE→QA→CR, Tasks) : gates lint/build/test OK ; QA e2e + `test-summary-story-17-2-e2e.md` ; code-review PASS ; `sprint-status` 17-2 → **done** ; story **done**.
- **2026-04-12** — DS (Task) : CREOS + Peintre + registre + doc + matrice/cartographie + tests ; `sprint-status` 17-2 → **in-progress** ; story **in-progress** (gates lint/build du brief à faire par le parent).
- **2026-04-12** — CS bmad-create-story : fichier story cree, statut **ready-for-dev**.

---

_Analyse contexte story (phase create) : guide developpeur pour ossature admin partagee cash-registers + sites._
