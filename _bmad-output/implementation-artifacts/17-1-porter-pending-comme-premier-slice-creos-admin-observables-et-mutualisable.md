# Story 17.1 : Porter `pending` comme premier slice CREOS admin observables et mutualisable

Status: done

<!-- Note: Validation optionnelle — `validate-create-story` avant `dev-story` si besoin. -->

**Story key :** `17-1-porter-pending-comme-premier-slice-creos-admin-observables-et-mutualisable`  
**Epic :** 17 (rail **U** — portage UI admin classe **A**, sans remediation backend de fond)

## Story

As a migration team validating the admin UI rail,  
I want a first `pending` admin page rendered through manifests and shared widgets,  
So that the contract-driven shell can prove parity on a contained yet representative admin list flow.

## Acceptance Criteria

**Bloc A — Rail U et garde-fous epic**

1. **Given** l’Epic 17 est le premier rail **U** et exclut toute remediation backend de fond  
   **When** un ecart contractuel nouveau est identifie pendant l’implementation  
   **Then** il est documente (correct course ou renvoi explicite vers **Epic 16** / rail **K**) sans « colmater » le front par des types ou URLs inventes hors OpenAPI canon monorepo.

2. **Given** la story vise la famille **A** (`pending`) deja suffisamment contractualisee cote intention epic  
   **When** la livraison est revue  
   **Then** aucune evolution backend profonde (nouveaux endpoints, changement de modele persistance) n’est requise dans le perimetre de cette story — seulement branchement sur contrats deja alignes ou volet contractuel prealable clos.

**Bloc B — Manifests officiels et shell admin partage**

3. **Given** la hierarchie de verite documentee (OpenAPI → ContextEnvelope → NavigationManifest → PageManifest → UserRuntimePrefs)  
   **When** l’utilisateur authentifie ouvre **`/admin/pending`** (chemin aligne legacy observable)  
   **Then** la page est entierement pilotee par le **NavigationManifest** servi (`contracts/creos/manifests/navigation-transverse-served.json`) et un **PageManifest** dedie (nouvelle entree + fichier manifest), sans seconde verite metier runtime dans les prefs ou le moteur.

4. **Given** le shell admin transverse (Epic 14.1)  
   **When** la route est sous **`/admin`** (y compris `/admin/pending`)  
   **Then** le comportement **`LiveAdminPerimeterStrip`**, **`TransverseHubLayout`** en variante **`shellAdmin`**, et la logique **`isTransverseAdminShellPath`** dans `RuntimeDemoApp.tsx` restent coherents (meme famille d’experience que `/admin`, `/admin/access`, `/admin/site`).

**Bloc C — Guards et permissions explicites**

5. **Given** les pages admin transverses existantes utilisent `transverse.admin.view` et des regles de visibilite manifestees  
   **When** la nouvelle entree nav et le `PageManifest` sont definis  
   **Then** les **guards** (cles `required_permission_keys`, `visibility` / contextes site, coherents avec le legacy observable) sont **explicites** dans CREOS et respectes par le runtime (pas de re-calcul d’autorisation metier invente cote UI).

**Bloc D — Donnees et gap contractuel OpenAPI**

6. **Given** le legacy appelle **`GET /v1/admin/users/pending`** (`PendingUsers.tsx` via `adminService.getPendingUsers`, `recyclique-1.4.4/frontend/src/generated/api.ts`) et le backend monorepo expose la route dans `recyclique/api/.../admin_users_read.py`  
   **When** on verifie **`contracts/openapi/recyclique-api.yaml`** (source canonique monorepo)  
   **Then** constat documente dans la story d’implementation : **l’operation `GET /v1/admin/users/pending` n’y figure pas** au moment de la redaction (recherche `users/pending` vide dans `recyclique-api.yaml`) ; sous le prefixe chemin **`/v1/admin/users`**, seul **`/v1/admin/users/{user_id}/groups`** est materialise — pas de `GET /v1/admin/users` ni `.../pending` dans le contrat canon monorepo.  
   **And** avant tout **binding live** type `data_contract` / client genere a partir du YAML, l’equipe doit soit :  
   - **(Chemin prefere contractuel)** livrer l’operation dans **OpenAPI** + regeneration **`contracts/openapi/generated/`** (story **Epic 16** / rail **K**), puis brancher le widget ; soit  
   - **(Blocage documente)** arreter le binding live, documenter le blocage avec renvoi **Epic 16**, et limiter la story a manifests + shell + widgets **demo / placeholder** honnetes sur le gap — **sans** inventer le contrat dans Peintre.

7. **Given** la cartographie 15.2 signale deja l’absence OpenAPI pour le bloc pending / approve / reject  
   **When** la story est consideree « prete terrain »  
   **Then** la ligne matrice **Epic 15** pour `/admin/pending` est citee et mise a jour ou referencee comme preuve de parite (pas seulement des captures ad hoc).

**Bloc E — CREOS : navigation + page + widgets**

8. **Given** `navigation-transverse-served.json` contient aujourd’hui `/admin`, `/admin/access`, `/admin/site` mais **pas** `/admin/pending`  
   **When** la story est implementee  
   **Then** une nouvelle entree de navigation (id stable, `path` **`/admin/pending`**, `page_key` dedie, `shortcut_id`, `label_key` i18n, visibilite alignee admin) est ajoutee au manifest serveur, plus un **PageManifest** JSON suivant les patterns des pages `page-transverse-admin-*.json` (slots, widgets enregistres dans le **registre** Peintre).

9. **Given** les patterns des stories **14.x** et placeholders admin  
   **When** des widgets liste / etat chargement / erreur sont introduits  
   **Then** ils s’appuient sur les conventions existantes (types de widgets allowlistes, fallbacks runtime documentes dans `peintre-nano/docs/03-contrats-creos-et-donnees.md`) et le domaine cible **`peintre-nano/src/domains/admin-config/`** pour le code metier UI admin mutualisable lorsque pertinent.

**Bloc F — Parite observable et preuves**

10. **Given** le legacy observable : `recyclique-1.4.4/frontend/src/App.jsx` route **`pending`** sous layout admin ; `Dashboard.tsx` lien **`/admin/pending`** ; composant **`PendingUsers.tsx`**  
    **When** on valide la parite stricte  
    **Then** la preuve inclut au minimum une **reference explicite a la matrice** tenue dans le corpus Epic 15 (`_bmad-output/implementation-artifacts/15-4-...` et fichier matrice `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` pour la ligne « pending users » / pilote associe), completee par tests automatisables (e2e ou unitaires) dans la lignee **`navigation-transverse`** / admin 14.1 — **les captures seules ne suffisent pas**.

11. **Given** les tests backend de non-regression sur l’endpoint pending  
    **When** le contrat OpenAPI est etendu plus tard  
    **Then** les chemins de verification restent tracables (`recyclique/api/tests/test_pending_endpoints_simple.py` comme reference comportementale serveur, sans elargir le perimetre de cette story).

## Tasks / Subtasks

- [x] **AC 6, 7** — Verifier / documenter l’etat **OpenAPI** pour `GET /v1/admin/users/pending` ; si toujours absent, ouvrir ou rattacher le travail **Epic 16** (ajout path + schemas + generation types) **ou** borner explicitement la story en mode placeholder jusqu’a fermeture contractuelle.
  - [x] Synchroniser la ligne matrice / cartographie (`15-4`, `2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md`) sur la decision.

- [x] **AC 8, 9** — CREOS : ajouter l’entree **`/admin/pending`** dans `contracts/creos/manifests/navigation-transverse-served.json` ; creer `page-transverse-admin-pending.json` (nom exact a harmoniser avec la convention `page_key` existante) ; valider chargement via la chaine manifests existante.

- [x] **AC 3, 4, 5** — Peintre : brancher la route vers le `page_key` ; respecter **`isTransverseAdminShellPath`** ; reutiliser **`TransverseHubLayout`** `family='admin'` et bandeau **`LiveAdminPerimeterStrip`** en auth live ; enregistrer les widgets necessaires dans le **registre** (`peintre-nano`).

- [x] **AC 5, 10** — Guards : aligner `required_permission_keys` / visibilite avec le comportement legacy observable et les permissions deja utilisees pour les autres entrees `/admin/*` (ne pas introduire de permission fantome non documentee).

- [x] **AC 10** — Tests : ajouter ou etendre des tests (Vitest / Playwright selon patterns du repo) pour la presence de la route, du label nav, du shell admin, et du comportement de liste (mock API tant que le contrat YAML n’est pas pret — clairement marque comme dette).

- [x] **AC 1** — Documentation courte dans les notes de PR / story : rail **U**, pas de remediation backend de fond ; tout gap nouveau → **Epic 16** ou correct course.

## Dev Notes

### Architecture et discipline contractuelle

- **Hierarchie** : respecter strictement `peintre-nano/docs/03-contrats-creos-et-donnees.md` — OpenAPI canon monorepo, puis ContextEnvelope, manifests CREOS, puis prefs utilisateur non metier. Pas de schemas metier dupliques dans le front.
- **Shell admin (Epic 14.1)** : section « Shell admin transverse » dans la meme doc — routes sous **`/admin`**, **`LiveAdminPerimeterStrip`**, **`TransverseHubLayout`** / **`shellAdmin`**.
- **Runtime** : `peintre-nano/src/app/demo/RuntimeDemoApp.tsx` — fonction **`isTransverseAdminShellPath`** (tout chemin dont le prefixe normalise est `/admin` ou `/admin/...`).
- **Layout transverse (hub admin)** : le **`page_key`** du `PageManifest` doit **commencer par `transverse-admin`** pour que `resolveTransverseMainLayoutMode` (`peintre-nano/src/app/templates/transverse/resolve-transverse-main-layout.ts`) classe la page en mode **`hub`** ; la famille visuelle admin (`TransverseHubLayout`, classe CSS `shellAdmin`) suit alors pour les cles qui ne sont pas dashboard / listing / consultation.
- **Domaine code** : placer la logique UI admin mutualisable evolutive sous **`peintre-nano/src/domains/admin-config/`** (README actuel minimal — a enrichir si besoin de conventions internes au slice).

### Legacy observable (reference comportement / UX)

- Routage : `recyclique-1.4.4/frontend/src/App.jsx` (`<Route path="pending" element={<PendingUsers />} />` sous layout admin).
- Point d’entree dashboard : `recyclique-1.4.4/frontend/src/pages/Admin/Dashboard.tsx` (navigation vers **`/admin/pending`**).
- Page : `recyclique-1.4.4/frontend/src/pages/Admin/PendingUsers.tsx` ; service : `recyclique-1.4.4/frontend/src/services/adminService.ts` (`getPendingUsers`).
- Contrat genere legacy (reference seulement, **non** canon monorepo) : `recyclique-1.4.4/frontend/openapi.json` contient `/v1/admin/users/pending`.

### Backend (reference implementation, hors scope remediation)

- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_users_read.py` — `GET /users/pending` sur routeur prefixe admin (URL pleine **`/v1/admin/users/pending`** une fois monte).

### CREOS actuel

- `contracts/creos/manifests/navigation-transverse-served.json` — ajouter **`/admin/pending`** (aujourd’hui absent).
- Exemples de structure page admin : `contracts/creos/manifests/page-transverse-admin-placeholder.json`, `page-transverse-admin-access-overview.json`, `page-transverse-admin-site-overview.json`.

### Tests / references qualite

- Backend : `recyclique/api/tests/test_pending_endpoints_simple.py`.
- Patterns tests UI admin / transverse : s’aligner sur les specs existantes post-**14.1** et navigation transverse dans `peintre-nano`.

### Project Structure Notes

- Conserver les **contrats** dans `contracts/` ; le moteur Peintre **consomme** — ne pas creer de second OpenAPI dans `peintre-nano`.
- Toute nouvelle cle i18n nav : suivre le mecanisme deja utilise pour `nav.transverse.admin`, `nav.transverse.admin.site`, etc.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 17, Story 17.1 (rail **U**, note agents)]
- [Source: `peintre-nano/docs/03-contrats-creos-et-donnees.md` — hierarchie de verite ; § Shell admin transverse Epic 14.1]
- [Source: `contracts/openapi/recyclique-api.yaml` — etat **sans** `GET /v1/admin/users/pending` a verifier en tete d’implementation]
- [Source: `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_users_read.py` — endpoint pending reel]
- [Source: `contracts/creos/manifests/navigation-transverse-served.json`]
- [Source: `recyclique-1.4.4/frontend/src/App.jsx`, `.../pages/Admin/PendingUsers.tsx`, `.../pages/Admin/Dashboard.tsx`]
- [Source: `_bmad-output/implementation-artifacts/15-4-etendre-la-matrice-de-parite-admin-stricte-et-la-couverture-des-preuves.md`]
- [Source: `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md` — ligne `/admin/pending` / gap OpenAPI]
- [Source: `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` — preuve parite matrice Epic 15]
- [Source: `_bmad-output/implementation-artifacts/14-1-retrouver-le-shell-et-le-choix-de-contexte-admin-observables-dans-peintre-nano.md`]
- [Source: `peintre-nano/src/app/demo/RuntimeDemoApp.tsx` — `isTransverseAdminShellPath`]
- [Source: `peintre-nano/src/app/templates/transverse/resolve-transverse-main-layout.ts` — préfixe `page_key` `transverse-admin*` → mode hub admin]
- [Source: `peintre-nano/src/domains/admin-config/README.md`]

## Dev Agent Record

### Agent Model Used

Sous-agent Task (bmad-dev-story / DS) — 2026-04-12

### Debug Log References

### Completion Notes List

- **OpenAPI canon** (`contracts/openapi/recyclique-api.yaml`, verification `rg users/pending`) : aucune operation `GET /v1/admin/users/pending` ; sous `/v1/admin/users` seul le chemin `{user_id}/groups` est materialise — aligne AC 6. Pas de binding `data_contract` / client genere : widget **demo** `admin.pending-users.demo` + textes CREOS explicites ; branchement live reporte **Epic 16** (rail K).
- **Rail U** : uniquement manifests CREOS + runtime Peintre ; aucun nouvel endpoint OpenAPI ni remediation backend dans cette story.
- **Shell admin** : `/admin/pending` couvert par `isTransverseAdminShellPath` ; `page_key` `transverse-admin-pending` → hub `TransverseHubLayout` / `shellAdmin` ; `LiveAdminPerimeterStrip` inchange (auth live).
- **Matrice / cartographie Epic 15** : ligne pilote `ui-admin-15-4-pending-users` et tableau 15.2 mis a jour avec preuve slice 17.1 + dette contractuelle nommee.
- **Gates** : `peintre-nano` — `npm run lint`, `npm run test` (403 tests), `npm run build` OK (2026-04-12).
- **Tests annexes** : ajustements mineurs e2e caisse 6.1 (assertion `legacySessionOpenBareForm` vs alerte masquee), e2e nav 17.1 (ciblage texte dans le widget demo), unit 13.3 `waitFor` sur bouton retour vente — robustesse sans changement produit pending.

### File List

- `contracts/creos/manifests/navigation-transverse-served.json`
- `contracts/creos/manifests/page-transverse-admin-pending.json`
- `peintre-nano/public/manifests/navigation.json`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `peintre-nano/src/domains/admin-config/PendingUsersDemoPlaceholder.tsx`
- `peintre-nano/src/domains/admin-config/README.md`
- `peintre-nano/src/registry/index.ts`
- `peintre-nano/src/registry/register-admin-config-widgets.ts`
- `peintre-nano/src/runtime/nav-label-presentation-fallbacks.ts`
- `peintre-nano/src/runtime/toolbar-selection-for-live-path.ts`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/e2e/cashflow-nominal-6-1.e2e.test.tsx`
- `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx`
- `peintre-nano/tests/unit/prune-navigation-for-live-toolbar.test.ts`
- `peintre-nano/tests/unit/runtime-demo-cash-register-session-close-13-3.test.tsx`
- `peintre-nano/tests/unit/transverse-templates-5-6.test.tsx`
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/17-1-porter-pending-comme-premier-slice-creos-admin-observables-et-mutualisable.md`

## Change Log

- **2026-04-12** — Story 17.1 DS : slice CREOS `/admin/pending` (`transverse-admin-pending`), widget placeholder registre, runtime + tests + mises a jour matrice/cartographie 15.x ; statut **review**.

---

_Analyse contexte story (phase create) : guide developpeur ; implementation DS 2026-04-12 — statut **review**._
