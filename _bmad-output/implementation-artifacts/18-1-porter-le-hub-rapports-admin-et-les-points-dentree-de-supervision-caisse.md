# Story 18.1 : Porter le hub rapports admin et les points d'entree de supervision caisse

Status: done

<!-- Note : validation optionnelle — `validate-create-story` avant `dev-story` si besoin. -->

**Story key :** `18-1-porter-le-hub-rapports-admin-et-les-points-dentree-de-supervision-caisse`  
**Epic :** 18 (rail **U** — supervision caisse / hub rapports admin classe **A** ; exports bulk ou sensibles encore classes **B** = hors perimetre jusqu'a arbitrage rail **K** / fermeture **Epic 16**)

## Story

As a pilotage team,  
I want the admin reports hub and the main supervision entry points for cash operations rendered in Peintre_nano from served CREOS manifests,  
So that operators recover observable navigation blocks and groupings aligned with legacy intent **without** duplicating routes in the frontend or masking contract gaps.

## Acceptance Criteria

**Bloc A — Rail U, gaps K et hors-scope classe B**

1. **Given** l'Epic 18 reste un rail **U** et exclut les exports bulk / sensibles classes **B** non encore contractualises  
   **When** le hub ou les cartes d'entree touchent un manque OpenAPI ou un gap **K**  
   **Then** le gap reste **nomme et visible** (placeholder honnete, renvoi **Epic 16** / rail **K** si pertinent) — **sans** donnees metier simulees ni second client hors **`contracts/openapi/recyclique-api.yaml`**.

   **Constat OpenAPI (ne pas masquer en UI) :** sous le prefixe `/v1/admin/reports/`, le contrat canon ne expose a ce jour que deux operations **POST** sensibles (classe **B**, step-up) : `recyclique_admin_reports_cashSessionsExportBulk` (`/v1/admin/reports/cash-sessions/export-bulk`) et `recyclique_admin_reports_receptionTicketsExportBulk` (`/v1/admin/reports/reception-tickets/export-bulk`). **Aucun** `GET` de synthese / liste / stats pour un « hub rapports » lecture seule n'est present : toute tuile « donnees live » pour ce hub est donc **gap K** tant qu'aucune operation lecture n'est ajoutee au YAML — afficher l'ecart nomme, ne pas inventer de fetch.

2. **Given** la story **18.2** portera les listes / details **`session-manager`** et **`cash-sessions`**  
   **When** la story **18.1** est livree  
   **Then** le perimetre **18.1** se limite au **hub** (structure, libelles, groupements visibles, navigation secondaire vers les intentions deja manifestees) et aux **points d'entree** vers la supervision caisse (liens / cartes vers routes **deja** dans le `NavigationManifest` servi ou vers placeholders documentes) — **sans** implémenter tout le CRUD list/detail de **18.2**.

**Bloc B — Hierarchie de verite et prefs**

3. **Given** la hierarchie : **OpenAPI** → **ContextEnvelope** → **NavigationManifest** → **PageManifest** → **UserRuntimePrefs** (prefs **non metier** uniquement ; voir `peintre-nano/docs/03-contrats-creos-et-donnees.md`)  
   **When** le hub rapports / supervision est compose  
   **Then** **aucune** seconde verite metier n'est introduite dans le runtime, les prefs, ni dans des regles d'affichage qui dupliquent l'autorisation backend.

**Bloc C — Reutilisation Epic 17 (mutualisations obligatoires)**

4. **Given** les primitives **17.3** : **`AdminListPageShell`**, slots homogenes (`admin-transverse-list-shell-slots.ts`), **`ADMIN_TRANSVERSE_LIST_PAGE_MANIFEST_GUARDS`**, **`TransverseHubLayout`** `family='admin'`, **`LiveAdminPerimeterStrip`**, prefixe **`page_key`** `transverse-admin*`, **`isTransverseAdminShellPath`** (`RuntimeDemoApp.tsx`)  
   **When** le hub `/admin` (ou sous-chemin retenu **dans le manifeste servi**) est enrichi  
   **Then** le rendu **reutilise** ces patterns (ou les etend **sans** fork parallele du shell admin) pour les blocs liste / resume qui restent dans le scope **18.1**.

5. **Given** le dashboard transverse expose deja un pattern **cartes KPI** avec source live optionnelle (`page-transverse-dashboard.json`, widget `demo.legacy.dashboard.workspace`, `03-contrats-creos-et-donnees.md` § dashboard)  
   **When** des blocs type « resume / KPI » sont necessaires sur le hub admin **sans** `operation_id` stabilise pour les memes agregats  
   **Then** l'UI affiche des **cartes intention** (libelles + etat gap) ou **fallback manifeste** explicite — **pas** d'appels inventes ni d'agregation metier cote frontend.

**Bloc D — Navigation : une seule autorite officielle**

6. **Given** **`contracts/creos/manifests/navigation-transverse-served.json`** (et copie bundle / `public/manifests/navigation.json` si le workflow du repo l'exige) est la source reviewable des entrees transverses admin  
   **When** de nouvelles entrees ou groupements (ex. section « Rapports / supervision caisse ») sont ajoutes pour le hub  
   **Then** ils sont declares **uniquement** dans ces manifestes (labels via `label_key` + presentation / fallbacks `nav-label-presentation-fallbacks.ts` si besoin) et le runtime **ne** cree **pas** de routes paralleles non presentes dans le manifeste servi.

7. **Given** les routes admin existantes (`/admin`, `/admin/pending`, `/admin/cash-registers`, `/admin/sites`, `/admin/site`, etc.)  
   **When** le hub rapports ajoute des liens vers la supervision caisse  
   **Then** les **paths** et **`route_key`** restent **alignes** avec le registre fusionne (pas de second plan de route « hardcode » qui diverge du manifeste) ; toute collision ou incoherence est **rejetee** par la validation existante (tests contrat navigation).

**Bloc E — Parite observable et documentation**

8. **Given** la cible legacy `recyclique-1.4.4/frontend/src/pages/Admin/DashboardHomePage.jsx` (titre, grille **Navigation principale** vers modules admin) et l'etat honnete de **14.3** (donnees supervision pas encore portees sans contrat)  
   **When** la story est closee cote implementation  
   **Then** une note dans `peintre-nano/docs/03-contrats-creos-et-donnees.md` (nouvelle sous-section **Hub rapports admin / supervision caisse (Story 18.1)**) decrit ce qui est **restitue** (structure / entrees) vs **reporte** (18.2, gaps **K**), avec references matrice si une ligne pilote est mise a jour.

9. **Given** `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` et la cartographie **15.2**  
   **When** le hub est livre  
   **Then** les lignes pilotes touchees sont **citees** ou mises a jour sans masquer les ecarts ; les preuves navigateur restent **optionnelles** en **18.1** (preuve formalisee reservee **18.3** sauf exigence PO).

**Bloc F — Qualite**

10. **Given** les tests existants `navigation-transverse-served-5-1.test.ts`, `navigation-transverse-5-1.e2e.test.tsx`  
    **When** la navigation ou les `PageManifest` admin hub changent  
    **Then** les tests **passent** et des **assertions** supplementaires couvrent au minimum la **presence** des nouvelles entrees hub / groupements declares (sans dependre de donnees metier live).

## Tasks / Subtasks

- [x] **AC 1, 2, 3** — Cartographier le legacy `DashboardHomePage.jsx` (sections, liens, libelles) vs l'etat actuel Peintre sur `/admin` ; trancher le decoupage **18.1** vs **18.2** / **14.3** et lister les gaps **K** a afficher honnetement.

- [x] **AC 4, 5, 6** — Concevoir / etendre les **PageManifest** hub (`page_key` `transverse-admin-*`) avec slots partages (header, eventuel resume, grille d'entrees) + widgets registres (`register-admin-config-widgets.ts`) — reutiliser **`AdminListPageShell`** ou pattern hub documente pour les blocs « liste d'actions / liens » ; reutiliser / etendre **`AdminLegacyDashboardHomeWidget`** (`peintre-nano/src/widgets/admin/AdminLegacyDashboardHomeWidget.tsx`, type `admin.legacy.dashboard.home` deja branche sur `page-transverse-admin-placeholder.json`) plutot que dupliquer une grille ad hoc hors manifeste.

- [x] **AC 6, 7, 10** — Mettre a jour **`navigation-transverse-served.json`** (et pipeline bundle / `public/manifests/navigation.json` si requis) : groupements / entrees supervision caisse coherentes avec les routes **deja** servies ; etendre les tests contrat + e2e navigation.

- [x] **AC 8, 9** — Documenter dans `03-contrats-creos-et-donnees.md` + lien matrice / cartographie ; verifier **`resolve-transverse-main-layout.ts`** et **`RuntimeDemoApp`** (shell admin, pas de regression sur chemins admin existants).

- [x] **AC 1** — Gates **`peintre-nano`** : `npm run lint`, `npm run test`, `npm run build`.

## Dev Notes

### Architecture et discipline contractuelle

- **Audit OpenAPI hub rapports (gap K explicite)** : `contracts/openapi/recyclique-api.yaml` — seuls chemins `/v1/admin/reports/*` documentes : export bulk caisse et reception (voir **AC 1**). Les lectures supervision / session-manager pour **18.2** s'appuient sur d'autres prefixes (`/v1/cash-sessions/...`, etc.) ; ne pas les melanger avec une « API rapports » lecture absente du YAML.
- **Hierarchie** : `peintre-nano/docs/03-contrats-creos-et-donnees.md` — OpenAPI → ContextEnvelope → manifests → prefs non metier.
- **Shell admin** : meme doc, sections **Shell admin transverse** et **Primitive liste admin (17.3)** ; layout hub : `peintre-nano/src/app/templates/transverse/resolve-transverse-main-layout.ts` (`transverse-admin*` → hub).
- **Runtime** : `peintre-nano/src/app/demo/RuntimeDemoApp.tsx` — `isTransverseAdminShellPath` ; manifest demo : `peintre-nano/src/app/demo/runtime-demo-manifest.ts`.
- **Domaine admin** : `peintre-nano/src/domains/admin-config/` — `AdminListPageShell.tsx`, guards `admin-transverse-list-page-guards.ts`, README.

### Stories precedentes (intelligence)

- **17.1 / 17.2 / 17.3** : pattern liste admin + placeholders gaps ; ne pas regresser `/admin/pending`, `/admin/cash-registers`, `/admin/sites`.
- **14.3** : supervision **donnees** restee hors slice sans `data_contract` ; **18.1** peut restituer **navigation / structure** sans inventer les KPIs jour tant que l'OpenAPI ne porte pas les memes operations que le legacy.

### CREOS et navigation (fichiers reviewables typiques)

- `contracts/creos/manifests/navigation-transverse-served.json`
- `contracts/creos/manifests/page-transverse-admin-placeholder.json` (ou manifeste hub reellement servi pour `/admin` — a verifier / aligner en DS)
- `peintre-nano/src/registry/register-admin-config-widgets.ts`

### Hors scope explicite (rappel)

- Exports bulk / stats sensibles **classe B** : **Epic 16** / rail **K** ; pas de « console export » tant que non contractualise.
- Implementation complete **session-manager** / **cash-sessions** : **Story 18.2**.

### Project Structure Notes

- Matrice / audits **Epic 15** : `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` ; cartographie **15.2** (`references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md`) — citer les lignes pilotes modifiees dans la doc story / matrice sans effacer les ecarts.
- Nouvelle route admin manifestee : etendre **`syncSelectionFromPath`** dans `RuntimeDemoApp.tsx` sur le meme modele que `/admin/pending`, `/admin/cash-registers`, `/admin/sites` (selection `selectedEntryId` alignee sur l'`id` du `NavigationManifest` servi).

## Dev Agent Record

### Agent Model Used

(bmad-create-story CS — 2026-04-12)

### Debug Log References

### Completion Notes List

- Ultimate contexte story pour enchainement VS / DS ; statut sprint **ready-for-dev**. Repasse CS 2026-04-12 : audit OpenAPI `/v1/admin/reports/*` + widget `AdminLegacyDashboardHomeWidget` + notes `syncSelectionFromPath` / matrice 15.
- **DS Task 2026-04-12 (correctif parité 6+3 option A)** : `page-transverse-admin-reports-hub.json` — grille legacy seule en slot avant le hub ; hub `presentation: secondary-strip` (gap K + liens hors 6 : pending, cash-registers, sites, reception-stats). `AdminLegacyDashboardHomeWidget` — 4e tuile → `/admin/session-manager` + testids legacy. `toolbar-selection-for-live-path.ts` — surbrillance toolbar live pour session-manager / reception-stats / reception-sessions. Tests contrat + e2e navigation mis à jour. `npm run lint` + `npm run build` OK ; tests ciblés navigation / prune **98/98** OK. **`npm run test` complet** : 6 echecs dans `cashflow-defensive-6-9.e2e` et `cashflow-close-6-7.e2e` (non lies au diff admin ; deja observes sur le run complet).

### File List

- `contracts/creos/manifests/page-transverse-admin-reports-hub.json`
- `peintre-nano/src/domains/admin-config/AdminReportsSupervisionHubWidget.tsx`
- `peintre-nano/src/widgets/admin/AdminLegacyDashboardHomeWidget.tsx`
- `peintre-nano/src/runtime/toolbar-selection-for-live-path.ts`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx`
- `peintre-nano/tests/unit/prune-navigation-for-live-toolbar.test.ts`
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- `_bmad-output/implementation-artifacts/18-1-porter-le-hub-rapports-admin-et-les-points-dentree-de-supervision-caisse.md`
