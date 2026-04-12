# Story 17.3 : Consolider les briques mutualisees de shell liste admin, guards et detail simple

Status: done

<!-- Note : validation optionnelle — `validate-create-story` avant `dev-story` si besoin. -->

**Story key :** `17-3-consolider-les-briques-mutualisees-de-shell-liste-admin-guards-et-detail-simple`  
**Epic :** 17 (rail **U** — portage UI admin classe **A**, sans remediation backend de fond)

## Story

As a senior UI architecture team,  
I want the first wave (Stories **17.1** / **17.2**) to leave behind reusable admin building blocks rather than page-specific code,  
So that later admin epics start from hardened primitives (shell liste admin, guards, detail simple) instead of another ad hoc layer.

## Acceptance Criteria

**Bloc A — Rail U, ecarts OpenAPI (gap K) et Epic 16**

1. **Given** l’Epic 17 est un rail **U** et exclut toute remediation backend de fond  
   **When** un ecart contractuel ou un gap **K** est touche pendant la consolidation  
   **Then** il reste **nomme et visible** (correct course ou renvoi **Epic 16** / rail **K**) — **sans** masquer l’absence d’operations dans **`contracts/openapi/recyclique-api.yaml`** ni inventer URLs, schemas ou clients hors canon.

2. **Given** les dettes deja tracees : **pending** sans `GET /v1/admin/users/pending` dans le YAML canon ; **G-OA-02** (Registers / Sites) pour **`/admin/cash-registers`** et **`/admin/sites`**  
   **When** la mutualisation factorise l’UI  
   **Then** les placeholders et messages d’ecart **restent honnetes** (pas de donnees metier simulees comme si le contrat existait) et les references **Epic 16** restent **explicites** dans les composants mutualises ou leurs props documentees.

**Bloc B — Hierarchie de verite et prefs**

3. **Given** la hierarchie documentee (OpenAPI → ContextEnvelope → NavigationManifest → PageManifest → **UserRuntimePrefs** borne non metier, `peintre-nano/docs/03-contrats-creos-et-donnees.md`)  
   **When** les briques mutualisees sont introduites ou refactorisees  
   **Then** **aucune** seconde verite metier n’est introduite dans le runtime, les prefs utilisateur, ni dans des « regles d’affichage » qui dupliquent l’autorisation backend.

**Bloc C — Shell liste admin (primitives partagees)**

4. **Given** les pages livrees en **17.1** / **17.2** partagent une structure observable : shell transverse admin (**`LiveAdminPerimeterStrip`**, **`TransverseHubLayout`** `family='admin'`, `page_key` prefixe **`transverse-admin`**) et, dans les `PageManifest`, une famille de **slots** (en-tete contextuel, bloc **ecart contrat**, zone liste / placeholder)  
   **When** cette story est livree  
   **Then** au moins **une** primitive reutilisable documentee et **consommee** par les trois slices (`pending`, `cash-registers`, `sites`) couvre la **coquille liste admin** (structure visuelle + zones semantiques stables, ex. composant React mutualise et/ou convention de `slot_id` + `widget_props` minimale partagee) — **sans** dupliquer trois fois la meme structure JSX hors domaine admin.

5. **Given** `resolve-transverse-main-layout.ts` et **`isTransverseAdminShellPath`** (`RuntimeDemoApp.tsx`)  
   **When** la consolidation est revue  
   **Then** **aucune** regression sur le routage **`/admin/pending`**, **`/admin/cash-registers`**, **`/admin/sites`** (et coexistence documentee **`/admin/site`** vs **`/admin/sites`** inchangee au sens produit).

**Bloc D — Guards (cablage manifeste + runtime)**

6. **Given** les `PageManifest` actuels utilisent **`required_permission_keys`** (ex. **`transverse.admin.view`**), **`requires_site`**, et la navigation servie porte la visibilite / contextes  
   **When** la story factorise le « cablage » des guards  
   **Then** une **convention** claire (doc + eventuellement helper ou schema partage **lecture seule** des champs CREOS) garantit que les trois pages **restent alignees** avec le legacy observable (**`adminOnly`** sans roles supplementaires inventes) et qu’**aucune** permission fantome n’est ajoutee.

7. **Given** le runtime ne doit pas recalculer seul une autorisation metier (`03-contrats-creos-et-donnees.md`)  
   **When** les guards sont documentes pour les futures listes admin  
   **Then** la story precise que la **source** des refus / masquages reste **ContextEnvelope** + manifests ; l’UI ne fait qu’**interpreter** les signaux deja portes par le contrat.

**Bloc E — Detail simple (convention sans seconde verite)**

8. **Given** les epics suivants (ex. **18**, **19**) auront besoin d’un **detail ressource** minimal apres liste  
   **When** cette story pose la convention « detail simple »  
   **Then** une section **doc + artefact leger** (ex. dans `peintre-nano/docs/03-contrats-creos-et-donnees.md` et/ou `peintre-nano/src/domains/admin-config/README.md`) decrit le pattern : **liste** dans slots principaux ; **detail** = soit **deuxieme page manifeste** sous **`transverse-admin-*`**, soit **panel lateral / expansion** **uniquement** alimente par donnees **deja** contractuelles (pas de cache metier dans **UserRuntimePrefs**) ; **tant que** l’OpenAPI ne porte pas la ressource, **placeholder honnete** ou absence de drill-down — **sans** simuler un CRUD complet.

9. **Given** les trois slices actuels n’exigent pas encore un drill-down live (gaps **K**)  
   **When** la convention « detail simple » est illustree  
   **Then** au moins **un** exemple **minimal** et **sans fetch** est integre (ex. ligne ou carte « detail fictif » **clairement etiquete demo** dans un widget mutualise, ou page manifeste demo desactivee en prod via manifest — **sans** `data_contract` invente).

**Bloc F — CREOS, registre et qualite**

10. **Given** `contracts/creos/manifests/page-transverse-admin-pending.json`, `page-transverse-admin-cash-registers.json`, `page-transverse-admin-sites.json`  
    **When** la consolidation est appliquee  
    **Then** les trois fichiers **refletent** la convention de slots / `widget_type` partagee (refactor **structurel** si besoin, contenu **gap** preserve) et **`navigation-transverse-served.json`** ne duplique pas d’entrees incoherentes.

11. **Given** `peintre-nano/src/registry/register-admin-config-widgets.ts` enregistre **`admin.pending-users.demo`**, **`admin.cash-registers.demo`**, **`admin.sites.demo`**  
    **When** des widgets internes sont factorises  
    **Then** les cles **publiques** CREOS **stables** restent documentees (refactor interne autorise : wrapper mutualise derriere les memes `widget_type` ou migration **documentee** avec mise a jour des manifests dans le **meme** commit).

**Bloc G — Parite matrice Epic 15 et tests**

12. **Given** la matrice `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` et la cartographie `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md`  
    **When** la story est closee cote implementation  
    **Then** une note ou mise a jour **explicite** relie la **mutualisation** aux lignes pilotes **17.1** / **17.2** (aucune regression de preuve : gaps **K** toujours visibles).

13. **Given** les tests existants navigation / admin (`navigation-transverse-served-5-1.test.ts`, e2e `navigation-transverse-5-1.e2e.test.tsx`, unites transverse)  
    **When** le refactor est livre  
    **Then** les tests **passent** et, si pertinent, **nouveaux** tests ciblent la **primitive mutualisee** (rendu stable, `data-testid` de non-regression sur le shell liste admin).

## Tasks / Subtasks

- [x] **AC 1, 2, 3** — Cartographier la duplication actuelle entre **`PendingUsersDemoPlaceholder`**, **`CashRegistersAdminDemoPlaceholder`**, **`SitesAdminDemoPlaceholder`** et les patterns de slots CREOS ; lister les gaps **K** a conserver visibles dans la doc / UI.

- [x] **AC 4, 5, 10, 11** — Introduire la **primitive shell liste admin** (composant(s) sous `peintre-nano/src/domains/admin-config/` + harmonisation des `PageManifest` + README) ; refactoriser les trois pages pour en etre des **consommateurs** sans changer l’intention produit ni masquer les ecarts OpenAPI.

- [x] **AC 6, 7** — Formaliser la **convention guards** (alignement `required_permission_keys`, `requires_site`, visibilite nav) ; verifier la coherence avec **`RuntimeDemoApp`** / chargement manifeste — pas de permission inventee.

- [x] **AC 8, 9** — Rediger / etendre la convention **detail simple** dans `peintre-nano/docs/03-contrats-creos-et-donnees.md` (section Shell admin / admin liste) et illustrer un **exemple minimal sans fetch** (demo clairement bornee).

- [x] **AC 12, 13** — Mettre a jour les references matrice / cartographie si la structure de preuve change ; ajouter ou etendre les tests ; gates **`peintre-nano`** : `npm run lint`, `npm run test`, `npm run build`.

- [x] **AC 1** — Notes finales : rail **U** ; tout nouveau gap contractuel → **Epic 16** ou correct course.

## Dev Notes

### Architecture et discipline contractuelle

- **Hierarchie** : `peintre-nano/docs/03-contrats-creos-et-donnees.md` — OpenAPI → ContextEnvelope → manifests → prefs non metier.
- **Shell admin** : meme doc, section **Shell admin transverse** (Epic **14.1**) et sous-section **Admin legacy `/admin/cash-registers`, `/admin/sites` vs hub `/admin/site` (Story 17.2)** — a etendre pour la **primitive liste + detail simple** si la story modifie la doc.
- **Runtime** : `peintre-nano/src/app/demo/RuntimeDemoApp.tsx` — **`isTransverseAdminShellPath`** ; selection nav profonde / toolbar : `peintre-nano/src/runtime/toolbar-selection-for-live-path.ts`, fallbacks labels `peintre-nano/src/runtime/nav-label-presentation-fallbacks.ts`.
- **Layout hub admin** : `peintre-nano/src/app/templates/transverse/resolve-transverse-main-layout.ts` — prefixe **`transverse-admin*`** → mode hub.
- **Manifest demo bundle** : `peintre-nano/src/app/demo/runtime-demo-manifest.ts` ; copie locale nav : `peintre-nano/public/manifests/navigation.json` (si le workflow du repo l’exige pour les tests).

### Stories precedentes (intelligence 17.1 / 17.2)

- **17.1** : slice **`/admin/pending`**, `page-transverse-admin-pending.json`, widget **`admin.pending-users.demo`**, gap **GET /v1/admin/users/pending** absent du YAML canon.
- **17.2** : **`/admin/cash-registers`**, **`/admin/sites`**, manifests dedies, widgets **`admin.cash-registers.demo`** / **`admin.sites.demo`**, gap **G-OA-02** ; coexistence **`/admin/site`** vs **`/admin/sites`** documentee.

### Domaine code cible

- **Dossier** : `peintre-nano/src/domains/admin-config/` — README, placeholders existants, **nouveaux** modules mutualises (noms a trancher en DS : ex. `AdminListPageShell.tsx`, `AdminContractGapAlert.tsx`, etc.).
- **Registre** : `peintre-nano/src/registry/register-admin-config-widgets.ts` ; entree globale registre `peintre-nano/src/registry/index.ts` si nouveau wiring.

### CREOS (fichiers reviewables)

- `contracts/creos/manifests/navigation-transverse-served.json`
- `contracts/creos/manifests/page-transverse-admin-pending.json`
- `contracts/creos/manifests/page-transverse-admin-cash-registers.json`
- `contracts/creos/manifests/page-transverse-admin-sites.json`
- Reference forme : `contracts/creos/manifests/page-transverse-admin-site-overview.json`

### OpenAPI canon et gaps **K** (ne pas masquer)

- `contracts/openapi/recyclique-api.yaml` — etat a re-verifier en tete de **DS** (`users/pending`, `cash-registers`, `sites`).
- Cartographie : `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md`
- Matrice : `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`

### Tests / qualite

- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx`
- `peintre-nano/tests/unit/transverse-templates-5-6.test.tsx` (si impact layout transverse)

### Project Structure Notes

- Contrats dans `contracts/` ; Peintre **consomme** — pas de second OpenAPI dans `peintre-nano`.
- La mutualisation **ne doit pas** deplacer la verite metier dans le moteur : seulement **presentation**, **structure de page**, et **messages** alignes sur l’etat contractuel reel.

### References

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 17, Story **17.3**]
- [Source : `_bmad-output/implementation-artifacts/17-1-porter-pending-comme-premier-slice-creos-admin-observables-et-mutualisable.md`]
- [Source : `_bmad-output/implementation-artifacts/17-2-porter-cash-registers-et-sites-sur-une-meme-ossature-admin-stable.md`]
- [Source : `peintre-nano/docs/03-contrats-creos-et-donnees.md`]
- [Source : `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`]
- [Source : `peintre-nano/src/app/templates/transverse/resolve-transverse-main-layout.ts`]

## Dev Agent Record

### Agent Model Used

Composer (agent Task **DS** bmad-dev-story), 2026-04-12.

### Debug Log References

_(aucun blocage — tests verts apres mock `matchMedia` sur le test shell.)_

### Completion Notes List

- Primitive **`AdminListPageShell`** + bandeau **`admin-detail-simple-demo-strip`** (demo statique sans fetch) ; trois placeholders 17.1/17.2 refactorises en consommateurs.
- Slots CREOS homogenises : **`admin.transverse-list.header`**, **`.contract-gap`**, **`.main`** sur les trois `PageManifest` ; textes d’ecart OpenAPI / Epic 16 conserves dans les `demo.text.block`.
- **`admin-transverse-list-page-guards.ts`** : convention `transverse.admin.view` + `requires_site` documentee (source refus = ContextEnvelope + manifestes).
- Doc **`03-contrats-creos-et-donnees.md`** etendue (sous-section Story 17.3) ; matrice **2026-04-10_03** et cartographie **2026-04-12_01** mises a jour pour la preuve mutualisation.
- Gates : `npm run lint`, `npm run test` (411), `npm run build` sous **`peintre-nano/`** OK.

### File List

- `peintre-nano/src/domains/admin-config/AdminListPageShell.tsx`
- `peintre-nano/src/domains/admin-config/admin-transverse-list-shell-slots.ts`
- `peintre-nano/src/domains/admin-config/admin-transverse-list-page-guards.ts`
- `peintre-nano/src/domains/admin-config/PendingUsersDemoPlaceholder.tsx`
- `peintre-nano/src/domains/admin-config/CashRegistersAdminDemoPlaceholder.tsx`
- `peintre-nano/src/domains/admin-config/SitesAdminDemoPlaceholder.tsx`
- `peintre-nano/src/domains/admin-config/README.md`
- `peintre-nano/src/registry/register-admin-config-widgets.ts`
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/unit/admin-list-page-shell-17-3.test.tsx`
- `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx`
- `contracts/creos/manifests/page-transverse-admin-pending.json`
- `contracts/creos/manifests/page-transverse-admin-cash-registers.json`
- `contracts/creos/manifests/page-transverse-admin-sites.json`
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/17-3-consolider-les-briques-mutualisees-de-shell-liste-admin-guards-et-detail-simple.md`

## Change Log

- **2026-04-12** — **DS** bmad-dev-story (Task) : mutualisation shell liste admin + slots CREOS + guards + doc/tests ; statut **review** ; sprint **17-3** **in-progress** → **review**.
- **2026-04-12** — **CS** bmad-create-story : fichier story cree ; statut **ready-for-dev** ; `sprint-status` **17-3** backlog → **ready-for-dev** ; epic-17 reste **in-progress**.

---

_Analyse contexte story (phase **create**) : guide developpeur pour consolidation des briques admin (shell liste, guards, detail simple) apres **17.1** / **17.2**._
