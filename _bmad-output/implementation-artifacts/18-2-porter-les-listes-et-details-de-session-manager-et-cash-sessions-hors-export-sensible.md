# Story 18.2 : Porter les listes et details de `session-manager` et `cash-sessions` hors export sensible

Status: done

<!-- Note : validation optionnelle — `validate-create-story` avant `dev-story` si besoin. -->

**Story key :** `18-2-porter-les-listes-et-details-de-session-manager-et-cash-sessions-hors-export-sensible`  
**Epic :** 18 (rail **U** — supervision caisse / rapports admin classe **A** ; exports et rapports sensibles classes **B** = hors perimetre tant que l'autorite contractuelle / step-up n'est pas stabilisee — **Epic 16** / rail **K**)

## Story

As an admin supervision team,  
I want the **session manager** list surface and the **cash session** detail flow rendered in Peintre_nano from CREOS manifests and the **canonical** OpenAPI-driven clients,  
So that operational supervision regains its **core list + drill-down** experience **without** reintroducing sensitive per-session or bulk exports, and **without** masking contract gaps (**K**) or inventing a second business truth in the runtime.

## Acceptance Criteria

**Bloc A — Perimetre fonctionnel (legacy observable)**

1. **Given** le brownfield `recyclique-1.4.4/frontend/src/App.jsx` — routes admin **`/admin/session-manager`** (`SessionManager.tsx`) et **`/admin/cash-sessions/:id`** (`CashSessionDetail.tsx`) sous **`adminOnly`**  
   **When** la story est livree  
   **Then** Peintre expose des **chemins SPA alignes** (`/admin/session-manager`, `/admin/cash-sessions/:id`) **declares dans** `contracts/creos/manifests/navigation-transverse-served.json` (ids stables, `label_key`, `shortcut_id`, visibilite admin) et consommes par le runtime (**`syncSelectionFromPath`**, **`isTransverseAdminShellPath`**) — **plus** de navigation « uniquement texte » dans un widget sans entree manifestee (ecart documente **18.1** / `03-contrats-creos-et-donnees.md`).

2. **Given** le legacy **SessionManager** consomme notamment `GET /v1/cash-sessions/` (liste paginee), `GET /v1/cash-sessions/stats/summary` (KPIs) via `cashSessionsService` / `cashSessionsService.ts`  
   **When** on verifie **`contracts/openapi/recyclique-api.yaml`** au moment du DS  
   **Then** ces operations **ne sont pas** dans le YAML canon (seuls **`/v1/cash-sessions/current`**, **`/v1/cash-sessions/{session_id}`**, **`/v1/cash-sessions/{session_id}/close`**, plus **`/v1/admin/reports/cash-sessions/export-bulk`** classe **B**) — le gap **K** sur **liste + KPIs** reste **nomme a l'ecran** (slots **17.3** + message honnete + renvoi **Epic 16** / rail **K**) ; **aucune** donnee liste / agregat simule comme si le contrat existait.

3. **Given** **`GET /v1/cash-sessions/{session_id}`** est documente (journal session, Story **6.8**) avec `operationId` **`recyclique_cashSessions_getSessionDetail`**  
   **When** l'utilisateur ouvre **`/admin/cash-sessions/:id`** en demo live  
   **Then** le widget existant **`admin-cash-session-detail`** (`AdminCashSessionDetailWidget.tsx`, client **`peintre-nano/src/api/cash-session-client.ts`**) reste la **source UI** du detail — ameliorations de parite **bornees** au contrat (libelles, etats vides, erreurs, accessibilite) **sans** elargir le perimetre sensible hors operations deja dans le YAML.

**Bloc B — Exports sensibles explicitement exclus**

4. **Given** le legacy declenche des exports par ligne via `GET /v1/admin/reports/cash-sessions/by-session/:id` (blob) et le hub rapports expose **`recyclique_admin_reports_cashSessionsExportBulk`** (POST, step-up, classe **B**)  
   **When** la story **18.2** est implementee  
   **Then** **aucun** bouton / lien / widget n'appelle ces flux tant qu'ils ne sont **pas** stabilises cote **Epic 16** + autorite reviewable — l'exclusion est **visible** (texte ou lien vers dette contractuelle), **pas** une simple absence silencieuse.

**Bloc C — Rail U, hierarchie de verite, prefs**

5. **Given** la hierarchie : **OpenAPI** → **ContextEnvelope** → **NavigationManifest** → **PageManifest** → **UserRuntimePrefs** (prefs **non metier** uniquement ; `peintre-nano/docs/03-contrats-creos-et-donnees.md`)  
   **When** les pages session-manager / detail session sont composees  
   **Then** **aucune** seconde verite metier dans le runtime ni dans les prefs ; pas de client axios « parallele » vers des URLs absentes du YAML canon pour simuler liste / stats.

**Bloc D — Reutilisation Epic 17.3 et 18.1**

6. **Given** les primitives **17.3** : **`AdminListPageShell`**, slots **`admin-transverse-list-shell-slots.ts`**, **`ADMIN_TRANSVERSE_LIST_PAGE_MANIFEST_GUARDS`**, **`TransverseHubLayout`** `family='admin'`, **`LiveAdminPerimeterStrip`**, prefixe **`page_key`** `transverse-admin*` pour le liste admin, convention « detail simple » (doc § **Primitive liste admin**)  
   **When** la page **`/admin/session-manager`** est livree  
   **Then** elle **reutilise** cette ossature (manifeste JSON + widget(s) enregistre(s) sous `peintre-nano/src/domains/admin-config/` ou domaine aligne) ; le detail **`admin-cash-session-detail`** reste coherent avec le **shell admin** (deja route « hors selectedEntry » via **`ADMIN_CASH_SESSION_PATH`** dans **`RuntimeDemoApp.tsx`**).

7. **Given** le hub **18.1** (`page-transverse-admin-reports-hub.json`, widget **`admin.reports.supervision.hub`**) pointe vers des intentions deja manifestees  
   **When** les entrees **session-manager** existent dans le manifeste servi  
   **Then** les liens **`spaNavigateTo`** (ou equivalents) du hub **ciblent** les **paths** officiels **sans** second plan de routes.

**Bloc E — Parite matrice et documentation**

8. **Given** la matrice `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` — lignes **`ui-admin-15-4-session-manager`**, **`ui-admin-15-4-cash-session-detail`** (et voisinage **`ui-admin-15-4-reports-cash-sessions`** si impact navigation)  
   **When** la story est closee  
   **Then** les lignes concernees sont **citees ou mises a jour** avec l'etat reel (placeholders **K**, detail branche, exports **B** exclus) ; la cartographie **15.2** reste referencee pour les familles API.

9. **Given** `peintre-nano/docs/03-contrats-creos-et-donnees.md` — section **Hub rapports admin / supervision caisse (Story 18.1)**  
   **When** **18.2** est livree  
   **Then** une sous-section **Story 18.2** decrit : routes manifestees, binding detail vs gaps liste/KPIs, exports exclus — en coherence avec le template **detail simple** (pas de drill-down metier factice).

**Bloc F — Qualite**

10. **Given** les tests existants `navigation-transverse-served-5-1.test.ts`, `navigation-transverse-5-1.e2e.test.tsx`, unites liees au widget **`admin-cash-session-detail`**  
    **When** la navigation ou les manifestes admin session changent  
    **Then** les tests **passent** et des assertions **couvrent** au minimum la **presence** des nouvelles entrees **`/admin/session-manager`** et la **non-regression** du chemin **`/admin/cash-sessions/:id`**.

11. **Given** les gates projet **Peintre_nano**  
    **When** la story est prete pour review  
    **Then** `npm run lint`, `npm test`, `npm run build` sont **verts** (execution en phase **DS**, pas en **CS**).

## Tasks / Subtasks

- [x] **AC 1, 2, 6, 7, 10** — CREOS : ajouter l'entree nav et le **`PageManifest`** pour **`/admin/session-manager`** (`page_key` **`transverse-admin-session-manager`** ou nom coherent avec le registre) ; harmoniser les slots **17.3** ; mettre a jour **`navigation-transverse-served.json`** + bundle / **`runtime-demo-manifest.ts`** si le workflow du repo l'exige ; etendre **`syncSelectionFromPath`** / selection nav comme pour les autres routes **`/admin/*`**.

- [x] **AC 2, 5** — Implementer le widget liste (ex. **`admin.session-manager.*`**) : etat **gap K** explicite pour **`GET /v1/cash-sessions/`** et **`GET /v1/cash-sessions/stats/summary`** absents du YAML ; **pas** d'appel **`dashboard-legacy-stats-client`** ou autre helper vers des operations non canoniques tant que le YAML ne les porte pas — enregistrer le widget dans **`register-admin-config-widgets.ts`** (ou fichier d'enregistrement admin existant).

- [x] **AC 3, 6** — Detail : verifier **`page-admin-cash-session-detail.json`**, **`AdminCashSessionDetailWidget`**, **`cash-session-client.ts`** ; ajuster uniquement dans la limite du contrat (UX, tests, libelles manifeste) ; confirmer que **`ADMIN_CASH_SESSION_PATH`** + **`resolvedPageKey`** `admin-cash-session-detail` restent coherents avec la nav.

- [x] **AC 4** — Audit UI : supprimer ou masquer toute trace d'export par session / bulk **non** couverte par l'autorite **B** stabilisee ; documenter la dette si le legacy affichait un bouton visible.

- [x] **AC 8, 9** — Matrice + doc **03-contrats-creos-et-donnees.md** ; lier le hub **18.1** aux routes **18.2** une fois manifestees.

- [x] **AC 11** — Gates (phase **DS** — execution **phase GATE** orchestrateur parent ; implementation DS terminee).

## Dev Notes

### Architecture et discipline contractuelle

- **OpenAPI canon** : `contracts/openapi/recyclique-api.yaml` — inventaire **cash-sessions** admin (voir **AC 2**). Toute extension liste / stats = **Epic 16** (rail **K**), pas de contournement silencieux.
- **Hierarchie** : `peintre-nano/docs/03-contrats-creos-et-donnees.md`.
- **Shell admin** : `AdminListPageShell.tsx`, `admin-transverse-list-page-guards.ts`, `resolve-transverse-main-layout.ts`, `RuntimeDemoApp.tsx` (`isTransverseAdminShellPath`, **`ADMIN_CASH_SESSION_PATH`**).
- **Legacy reference** : `recyclique-1.4.4/frontend/src/pages/Admin/SessionManager.tsx`, `CashSessionDetail.tsx`, services `cashSessionsService.ts`, `cashSessionService.ts` (uniquement pour **cartographie** comportement / reseau — pas copie logique metier hors contrat).

### Stories precedentes (intelligence)

- **18.1** : hub rapports ; ne pas re-deplacer le perimetre liste/detail dans le hub seul ; liens vers **18.2**.
- **17.2 / 17.3** : patterns nav + liste admin + placeholders gaps **G-OA-02** — memes regles pour gaps liste sessions.
- **6.8** : corrections sensibles ventes dans le detail admin ; rester aligne **`recyclique_sales_correctSaleSensitive`** et step-up existants.

### Fichiers reviewables typiques

- `contracts/creos/manifests/navigation-transverse-served.json`
- `contracts/creos/manifests/page-transverse-admin-session-manager.json` (a creer)
- `contracts/creos/manifests/page-admin-cash-session-detail.json`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `peintre-nano/src/registry/register-admin-config-widgets.ts`
- `peintre-nano/src/domains/cashflow/AdminCashSessionDetailWidget.tsx`
- `peintre-nano/src/api/cash-session-client.ts`

### Hors scope explicite (rappel)

- **Exports** : `…/cash-sessions/by-session/…`, **`cashSessionsExportBulk`**, toute operation **classe B** non validee pour l'UI — **Epic 16**.
- **Liste / KPIs « live »** sans operations dans le YAML : **pas** dans **18.2** sous forme de donnees factices ; soit **placeholder gap K**, soit sous-story **Epic 16** explicite.

### Project Structure Notes

- Conserver **une seule autorite** de navigation (manifeste servi) ; aligner **`page_key`** avec **`resolve-transverse-main-layout.ts`** (prefixe **`transverse-admin*`** pour la liste admin transverse).
- Tests : etendre **`navigation-transverse-served-5-1.test.ts`** / e2e comme pour **17.2**.

## Dev Agent Record

### Agent Model Used

(bmad-create-story CS — 2026-04-12)

### Debug Log References

### Completion Notes List

- Ultimate contexte story pour enchainement **VS** / **DS** ; statut sprint **ready-for-dev**. Audit OpenAPI : liste + stats **absentes** ; detail **present** ; exports **B** exclus.

- **DS 2026-04-12** : nav + `page-transverse-admin-session-manager.json` ; widget `admin.session-manager.demo` (gaps **K**, exports **B** visibles) ; `syncSelectionFromPath` ; hub **18.1** lien `spaNavigateTo` ; tests contract + e2e etendus ; doc `03-contrats` + matrice **15.4** ; `AdminListPageShell.supplementaryContent` pour alerte exports sans dupliquer la coquille.

- **CR 2026-04-12** (Story Runner, `resume_at: CR`) : **bmad-code-review** → **APPROVED** ; gates **peintre-nano** `npm run lint` + `npm run test` (422) + `npm run build` verts sur la session orchestrateur ; statut sprint **18-2** déjà `done` ; fichier story → **done**.

### File List

- `D:/Users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/contracts/creos/manifests/navigation-transverse-served.json`
- `D:/Users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/contracts/creos/manifests/page-transverse-admin-session-manager.json`
- `D:/Users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/contracts/creos/manifests/page-admin-cash-session-detail.json`
- `D:/Users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `D:/Users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `D:/Users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/peintre-nano/src/domains/admin-config/AdminListPageShell.tsx`
- `D:/Users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/peintre-nano/src/domains/admin-config/AdminReportsSupervisionHubWidget.tsx`
- `D:/Users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/peintre-nano/src/domains/admin-config/SessionManagerAdminDemoPlaceholder.tsx`
- `D:/Users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/peintre-nano/src/domains/cashflow/CashflowCloseWizard.tsx`
- `D:/Users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/peintre-nano/src/registry/register-admin-config-widgets.ts`
- `D:/Users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/peintre-nano/src/runtime/nav-label-presentation-fallbacks.ts`
- `D:/Users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/peintre-nano/public/manifests/navigation.json`
- `D:/Users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `D:/Users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx`
- `D:/Users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/peintre-nano/docs/03-contrats-creos-et-donnees.md`
- `D:/Users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `D:/Users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/_bmad-output/implementation-artifacts/18-2-porter-les-listes-et-details-de-session-manager-et-cash-sessions-hors-export-sensible.md`
