# Story 19.1 : Porter les vues de `reception-stats` et de supervision réception nominative

Status: done

## Alignement sprint (CS 2026-04-12 — sans régression)

Référence canonique : `_bmad-output/implementation-artifacts/sprint-status.yaml`. À la passe **CS** (`resume_at: CS`, skill `bmad-create-story`), l’épique **19** est déjà **in-progress** et cette story est déjà **review** (implémentation DS amorcée puis terminée côté périmètre décrit dans le *Dev Agent Record*). **Aucune** remise arbitraire à `ready-for-dev` ni l’épique en `backlog` : l’état YAML actuel fait foi pour le Story Runner parent.

<!-- Note : validation optionnelle — `validate-create-story` avant `dev-story` si besoin. -->

**Story key :** `19-1-porter-les-vues-de-reception-stats-et-de-supervision-reception-nominative`  
**Epic :** 19 (rail **U** — surfaces supervision réception classe **A** sous `Peintre_nano` ; stats permissives / exports classe **B** hors scope tant non contractualisés — voir note Epic 19 dans `epics.md`)

## Story

As a reception pilotage team,  
I want the main reception supervision stats and visible context blocks available in Peintre from explicit CREOS manifests and OpenAPI-backed widgets,  
So that the reception admin domain regains its first monitoring surface inside the canonical runtime **without** masking contract gaps or inventing a second métier truth.

## Acceptance Criteria

**Bloc A — Rail U, gaps K et hors-scope classe B**

1. **Given** l'Epic 19 reste un rail **U** strict et exclut exports / mutations sensibles classe **B** non contractualisés (dont exports bulk réception — `recyclique_admin_reports_receptionTicketsExportBulk`, step-up)  
   **When** une métrique, un agrégat ou un classement nominatif (ex. par opérateur, par session) n'est pas couvert par un `operation_id` stabilisé dans `contracts/openapi/recyclique-api.yaml` consommé via la chaîne générée  
   **Then** le gap est **nommé et visible** (placeholder honnete, renvoi rail **K** / **Epic 16** si pertinent) — **sans** données métier simulées, **sans** client HTTP parallèle hors contrat, **sans** daemon ni job background pour « combler » l'absence de contrat.

2. **Given** la story **19.2** portera les listes / détails **`reception-sessions`** et **`reception-tickets/:id`** avec shell liste admin mutualisé  
   **When** la story **19.1** est livrée  
   **Then** le périmètre **19.1** se limite aux vues **stats / supervision nominative** (blocs KPI contextuels, cadrage stable, garde-fous de contexte admin) — **sans** implémenter le parcours liste+détail sessions/tickets réservé à **19.2**.

**Bloc B — Hiérarchie de vérité et prefs**

3. **Given** la hiérarchie : **OpenAPI** → **ContextEnvelope** → **NavigationManifest** → **PageManifest** → **UserRuntimePrefs** (prefs **non métier** uniquement ; [Source : `peintre-nano/docs/03-contrats-creos-et-donnees.md`])  
   **When** les pages admin réception stats / supervision sont composées  
   **Then** **aucune** seconde vérité métier n'est introduite dans le runtime, les prefs, ni dans des règles d'affichage qui recalculent seules une autorisation ou un agrégat backend.

**Bloc C — Contrats OpenAPI réception stats (post–16.4)**

4. **Given** le YAML reviewable expose au minimum pour l'axe stats admin réception :  
   - `recyclique_stats_receptionSummary` — `GET /v1/stats/reception/summary` (ADMIN / SUPER_ADMIN, audit `log_admin_access`)  
   - `recyclique_stats_receptionByCategory` — `GET /v1/stats/reception/by-category`  
   - `recyclique_stats_unifiedLive` — `GET /v1/stats/live` (KPIs live unifiés ; paramètres `period_type`, `site_id` optionnel)  
   - `recyclique_reception_statsLiveDeprecated` — `GET /v1/reception/stats/live` (**déprécié** au profit de `recyclique_stats_unifiedLive`)  
   **When** les widgets consomment des données  
   **Then** chaque fetch affiché est **rattaché** à l'un de ces `operation_id` (préférence successeur pour le live) via `data_contract` / adaptateur existant — pas de schéma JSON inventé côté front au-delà des types générés.

5. **Given** le legacy `recyclique-1.4.4/frontend/src/pages/Admin/ReceptionDashboard.tsx` (filtres période, résumé, par catégorie, live optionnel via `useLiveReceptionStats` / feature flag)  
   **When** on porte la surface observable  
   **Then** les **intentions** équivalentes sont restituées **dans la limite** des contrats ci-dessus ; tout écart (champs legacy absents du schéma OpenAPI, graphiques Recharts non reflétés par un contrat, etc.) reste **dette nommée** (carte gap ou fallback manifeste), pas une approximation silencieuse.

**Bloc D — CREOS, navigation, shell admin (réutilisation Epic 17 / 18)**

6. **Given** les primitives **17.3** : `AdminListPageShell`, slots homogènes (`admin-transverse-list-shell-slots.ts`), `ADMIN_TRANSVERSE_LIST_PAGE_MANIFEST_GUARDS`, `TransverseHubLayout` `family='admin'`, `LiveAdminPerimeterStrip`, préfixe `page_key` `transverse-admin*`, `isTransverseAdminShellPath` (`RuntimeDemoApp.tsx`)  
   **When** une route **`/admin/reception-stats`** (ou chemin **exactement** aligné sur le `NavigationManifest` servi) est ajoutée  
   **Then** le rendu **réutilise** ces patterns pour le **framing** (en-tête, bandeau contexte admin, grille de blocs) — pas de fork parallèle du shell admin.

7. **Given** `contracts/creos/manifests/navigation-transverse-served.json` (et copie bundle / `peintre-nano/public/manifests/navigation.json` si le workflow du repo l'exige) est la source reviewable des entrées transverses  
   **When** l'entrée « Stats / supervision réception » est ajoutée (sous-groupe cohérent avec le hub `/admin` / rapports si applicable)  
   **Then** elle est déclarée **uniquement** dans ces manifestes (`label_key` + fallbacks `nav-label-presentation-fallbacks.ts` si besoin) ; le runtime **ne** crée **pas** de routes SPA hors manifeste servi.

8. **Given** le hub **18.1** (`AdminReportsSupervisionHubWidget`, `page-transverse-admin-reports-hub`) structure les entrées de supervision caisse  
   **When** la supervision réception est exposée depuis le hub admin  
   **Then** ajouter au minimum un **point d'entrée manifesté** vers la nouvelle route réception-stats (bouton ou tuile), **sans** dépendre de données live absentes du YAML pour libeller l'entrée.

**Bloc E — Parité / matrice / documentation**

9. **Given** la matrice `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` (ligne **`ui-admin-15-4-reception-stats`**) et la cartographie **15.2** (`references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md`, ligne `/admin/reception-stats`)  
   **When** la story est close côté implémentation  
   **Then** la matrice / notes de story **reflètent** ce qui est branché vs reporté (19.2, gaps **K**) ; pas de marquage « parité OK » si des blocs legacy restent non couverts par contrat.

10. **Given** `peintre-nano/docs/03-contrats-creos-et-donnees.md`  
    **When** les manifests et routes réception admin stats sont stabilisés  
    **Then** une sous-section **Réception admin — stats et supervision nominative (Story 19.1)** documente : route canonique CREOS, `page_key`, `operation_id` utilisés, écarts vs legacy, et rappel **pas de masquage gap K**.

**Bloc F — Qualité**

11. **Given** les tests existants de navigation / contrats transverse (`navigation-transverse-served-5-1.test.ts`, `navigation-transverse-5-1.e2e.test.tsx`, et tout test admin hub **18.1** pertinent)  
    **When** la navigation ou les `PageManifest` admin réception changent  
    **Then** les tests **passent** et des **assertions** couvrent la **présence** de l'entrée nav et du chemin profond `/admin/reception-stats` (sans dépendre de données métier live pour l'assert principal).

12. **Given** les gates `peintre-nano` du Story Runner  
    **When** la story est livrée  
    **Then** `npm run lint`, `npm test`, `npm run build` restent **verts** sur `peintre-nano`.

## Tasks / Subtasks

- [x] **AC 1–2, 4–5** — Cartographier `ReceptionDashboard.tsx` + services legacy (`getReceptionSummary`, `getReceptionByCategory`, live) vs `operation_id` OpenAPI ; lister les gaps **K** par bloc UI.

- [x] **AC 3, 6** — Créer / étendre le **PageManifest** `transverse-admin*` pour `/admin/reception-stats` (slots + widgets registre `register-admin-config-widgets.ts`) avec garde contexte admin alignée sur les patterns **17.3**.

- [x] **AC 7, 8, 11** — Mettre à jour `navigation-transverse-served.json` (+ bundle `public/manifests/navigation.json` si requis), `RuntimeDemoApp.tsx` / `syncSelectionFromPath` sur le modèle des autres entrées `transverse-admin-*` ; étendre le widget hub **18.1** pour lien réception.

- [x] **AC 4–5** — Brancher les widgets KPI / tableaux sur les **types générés** et le client OpenAPI unique ; gérer erreurs **403/401** avec fallbacks défensifs existants (pas de contournement permission).

- [x] **AC 9–10** — Mettre à jour la matrice pilote et `03-contrats-creos-et-donnees.md`.

- [x] **AC 11–12** — Gates `peintre-nano` ; ajouter tests ciblés (contrat nav + e2e chemin admin réception-stats).

## Dev Notes

### Architecture et discipline contractuelle

- **OpenAPI canon** : `contracts/openapi/recyclique-api.yaml` — chemins stats réception et live (section `/v1/stats/reception/*`, `/v1/stats/live`, dépréciation `/v1/reception/stats/live`). Ne pas réintroduire un accès USER sur ces agrégats : côté **16.4** le contrat est **ADMIN / SUPER_ADMIN** ; le front ne doit pas « rouvrir » un périmètre plus large que le backend.
- **Hiérarchie** : `peintre-nano/docs/03-contrats-creos-et-donnees.md`.
- **Shell admin** : `peintre-nano/src/domains/admin-config/` — `AdminListPageShell.tsx`, `admin-transverse-list-page-guards.ts`, README.
- **Layout transverse** : `peintre-nano/src/app/templates/transverse/resolve-transverse-main-layout.ts` ; **Runtime** : `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`.
- **Supervision nominative** : interprétation produit de l'Epic 19 — blocs de contexte **nommés** (période, site via `site_id` quand le contrat le permet, bandeau périmètre admin) **tant que** chaque donnée affichée est **justifiée** par un champ de réponse OpenAPI ou un libellé statique ; toute liste nominative d'opérateurs / sessions **sans** endpoint dédié = **gap K** visible (pas de tableau fictif).

### Stories liées (intelligence)

- **18.1 / 18.2 / 18.3** : même rail **U** ; réutiliser le style « gap K explicite » du hub rapports et des listes admin caisse.
- **19.2** : sessions réception + détail ticket — **hors** périmètre **19.1**.
- **19.3** : preuve parité observable — peut rester partielle après **19.1** ; ne pas bloquer **19.1** sur une exigence MCP complète si non demandée ici.

### CREOS et navigation (fichiers reviewables typiques)

- `contracts/creos/manifests/navigation-transverse-served.json`
- Nouveau manifeste page : ex. `page-transverse-admin-reception-stats.json` (nom exact à trancher en DS — rester cohérent avec `transverse-admin-*`)
- `peintre-nano/src/registry/register-admin-config-widgets.ts`
- `peintre-nano/src/domains/admin-config/AdminReportsSupervisionHubWidget.tsx`

### Hors scope explicite

- **Exports** bulk réception, CSV ticket, rapports **reception-reports** si non couverts par contrats step-up / classe **B** : **Epic 16** / rail **K** ; pas d'action sensible « en douce ».
- **Polling** : autorisé **uniquement** comme consommation **HTTP normale** des `operation_id` documentés (pas de worker séparé, pas de queue pour compenser un gap).

### References

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 19, Story 19.1] : rail UI **A** ; stats / exports classe **B** non contractualisés hors périmètre epic.
- [Source : `peintre-nano/docs/03-contrats-creos-et-donnees.md`] : hiérarchie OpenAPI → ContextEnvelope → manifests → prefs non métier ; sous-section Story 19.1 si présente.
- [Source : `contracts/openapi/recyclique-api.yaml`] : `operation_id` stats réception et live (ADMIN / SUPER_ADMIN selon contrat).
- [Source : `_bmad-output/implementation-artifacts/sprint-status.yaml`] : clé `19-1-porter-les-vues-de-reception-stats-et-de-supervision-reception-nominative` — état de développement courant pour l’orchestration BMAD.

### Project Structure Notes

- **Clé sprint canonique** : `19-1-porter-les-vues-de-reception-stats-et-de-supervision-reception-nominative` — l’état d’orchestration est celui du **Status** en tête de fichier et de `development_status` dans `_bmad-output/implementation-artifacts/sprint-status.yaml` (ici **review** après DS), pas une inférence depuis la seule présence du fichier.
- Matrice / cartographie : mettre à jour les colonnes preuve / story sans effacer les écarts résiduels.

## Dev Agent Record

### Agent Model Used

(bmad-create-story CS — 2026-04-12)

### Debug Log References

### Completion Notes List

- **CS initial (2026-04-12)** : fichier story + passage **epic-19** `backlog` → **in-progress** et story **backlog** → **ready-for-dev** (première story de l’épique).
- **CS reprise (2026-04-12, Task Story Runner, `resume_at: CS`)** : contenu story complété / aligné checklist `bmad-create-story` ; **pas** de régression des statuts sprint (story déjà **review** après DS — voir section *Alignement sprint*).
- **DS 2026-04-12** : route **`/admin/reception-stats`** + nav **`transverse-admin-reception-stats`** + manifeste **`page-transverse-admin-reception-stats.json`** ; widget **`admin.reception.stats.supervision`** (`recyclique_stats_receptionSummary`, `recyclique_stats_receptionByCategory`, `recyclique_stats_unifiedLive` via `dashboard-legacy-stats-client` + types générés) ; gap **K** nominatif explicite ; hub **18.1** lien **`admin-hub-link-reception-stats`** ; matrice **`ui-admin-15-4-reception-stats`** + cartographie **15.2** ligne réception-stats + § **Story 19.1** dans `03-contrats-creos-et-donnees.md` ; **`AdminDetailSimpleDemoStrip`** exporté depuis `AdminListPageShell` ; tests contrat / e2e / unitaire widget ; `npm run lint` / `npm run build` non rejoués dans ce Task ; `npm test` : 428/429 verts — 1 timeout flaky **`cashflow-nominal-6-1`** (hors périmètre 19.1), repasse fichier isolée OK.
- **DS 2026-04-12 (Task Story Runner, reprise `resume_at: DS`)** : relecture périmètre 19.1 dans le dépôt (manifestes CREOS, widget, client OpenAPI, hub 18.1, tests référencés, doc § 19.1) — **PASS** ; **aucun** gate `npm` exécuté ici (délégation **GATE** parent) ; **`sprint-status.yaml`** et **Status** story inchangés (**review**).

### File List

- `contracts/creos/manifests/navigation-transverse-served.json`
- `contracts/creos/manifests/page-transverse-admin-reception-stats.json`
- `peintre-nano/public/manifests/navigation.json`
- `peintre-nano/src/api/dashboard-legacy-stats-client.ts`
- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/src/domains/admin-config/AdminListPageShell.tsx`
- `peintre-nano/src/domains/admin-config/AdminReceptionStatsSupervisionWidget.tsx`
- `peintre-nano/src/domains/admin-config/AdminReportsSupervisionHubWidget.tsx`
- `peintre-nano/src/registry/register-admin-config-widgets.ts`
- `peintre-nano/src/runtime/nav-label-presentation-fallbacks.ts`
- `peintre-nano/src/widgets/demo/LegacyDashboardWorkspaceWidget.tsx`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx`
- `peintre-nano/tests/unit/admin-reception-stats-supervision-widget.test.tsx`
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/19-1-porter-les-vues-de-reception-stats-et-de-supervision-reception-nominative.md`

## Change Log

- **2026-04-12** — DS (Task, reprise) : trace Dev Agent Record — vérification statique sans gates npm ; statut **review** inchangé.
- **2026-04-12** — DS : surface CREOS admin stats réception + widget branché OpenAPI + documentation matrice/carto/03 + tests ; statut **review**.
