# Story 19.2 : Porter `reception-sessions` et `reception-tickets/:id` avec détail ressource mutualisé

Status: done

<!-- Note : validation optionnelle — `validate-create-story` avant `dev-story` si besoin. -->

**Story key :** `19-2-porter-reception-sessions-et-reception-tickets-id-avec-detail-ressource-mutualise`  
**Epic :** 19 (rail **U** — pilotage admin réception classe **A** ; exports / agrégats sensibles classe **B** hors epic tant non contractualisés — voir note Epic 19 dans `epics.md`)

## Alignement sprint (CS 2026-04-12)

Référence canonique : `_bmad-output/implementation-artifacts/sprint-status.yaml`. À la passe **CS** (`resume_at: CS`, skill `bmad-create-story`), l’épique **19** est déjà **in-progress** (story **19.1** terminée) : **ne pas** remettre l’épique en `backlog`. Cette story passe **backlog** → **ready-for-dev** à la création du fichier.

## Story

As an admin UX team,  
I want the **reception sessions** list surface and the **reception ticket** detail route built from the shared admin list/detail conventions and canonical OpenAPI-backed clients,  
So that reception pilotage reuses the same contract-driven shell as the other admin rails **without** masking gap **K**, **without** a second métier truth in the runtime or prefs, and **without** background jobs to paper over missing contracts.

## Acceptance Criteria

**Bloc A — Périmètre routes legacy observables**

1. **Given** l’inventaire **15.1** / cartographie **15.2** : legacy **`/admin/reception-sessions`** → `ReceptionSessionManager.tsx`, **`/admin/reception-tickets/:id`** → `ReceptionTicketDetail.tsx` sous **`adminOnly`**  
   **When** la story est livrée  
   **Then** Peintre expose des chemins SPA **alignés** sur ces intentions (`/admin/reception-sessions`, `/admin/reception-tickets/:id` avec `:id` UUID ticket) **déclarés** dans `contracts/creos/manifests/navigation-transverse-served.json` (ids stables, `label_key`, visibilité admin) et consommés par le runtime (`syncSelectionFromPath`, `isTransverseAdminShellPath`, résolution `page_key` cohérente avec **`resolve-transverse-main-layout.ts`**).

**Bloc B — Contrats lecture (liste + détail)**

2. **Given** le YAML reviewable `contracts/openapi/recyclique-api.yaml` expose au minimum :  
   - **`recyclique_reception_listTickets`** — `GET /v1/reception/tickets` (liste paginée, filtres query documentés)  
   - **`recyclique_reception_getTicketDetail`** — `GET /v1/reception/tickets/{ticket_id}` (détail + lignes)  
   **When** la liste admin « sessions » et le détail ticket sont rendus  
   **Then** chaque fetch métier affiché est **rattaché** à l’un de ces `operation_id` via le client **`peintre-nano/src/api/reception-client.ts`** (ou extension **strictement** calquée sur les types / schémas générés) — **pas** de schéma JSON inventé, **pas** de client HTTP parallèle hors OpenAPI canon.

3. **Given** la cartographie **15.2** signale des KPIs / agrégats **calculés côté client** sur l’ancienne page sessions si le legacy allait au-delà des champs de `ReceptionTicketSummary` / réponses stabilisées  
   **When** une métrique ou un bloc n’est **pas** justifié par un champ de réponse OpenAPI (ou par un second `operation_id` listé explicitement dans cette story)  
   **Then** le gap est **nommé et visible** (slot **`admin.transverse-list.contract-gap`** ou équivalent **17.3**) — **sans** simulation de données, **sans** worker ni polling « magique » pour compenser l’absence de contrat.

**Bloc C — Actions sensibles hors scope (explicite)**

4. **Given** le YAML porte aussi des mutations / flux sensibles : **`recyclique_reception_closeTicket`**, **`recyclique_reception_createTicketDownloadToken`** + **`recyclique_reception_exportTicketCsv`**, **`recyclique_reception_patchLigneWeight`**, et côté admin rapports **`recyclique_admin_reports_receptionTicketsExportBulk`** (classe **B**, step-up **Epic 16**)  
   **When** la story **19.2** est bornée au rail **U** consultation  
   **Then** **aucun** bouton ou enchaînement UI n’active ces `operation_id` **tant que** la story ne documente pas une preuve d’autorité + UX step-up alignée **Epic 16** — l’exclusion reste **visible** (texte / placeholder honnête), **pas** une simple absence silencieuse.

**Bloc D — Réutilisation Epic 15 / 17.3 / 18.x (shell liste + détail mutualisé)**

5. **Given** les primitives **17.3** : `AdminListPageShell`, `admin-transverse-list-shell-slots.ts`, `ADMIN_TRANSVERSE_LIST_PAGE_MANIFEST_GUARDS`, `TransverseHubLayout` `family='admin'`, préfixe `page_key` **`transverse-admin*`** pour la liste, convention « détail ressource » alignée sur **18.2** (`ADMIN_CASH_SESSION_PATH` + page manifest dédié + widget détail) et **`AdminDetailSimpleDemoStrip`** / patterns documentés **19.1** si applicables au ticket  
   **When** les pages **`/admin/reception-sessions`** et **`/admin/reception-tickets/:id`** sont composées  
   **Then** elles **réutilisent** cette ossature (PageManifest JSON + widgets enregistrés sous `register-admin-config-widgets.ts`) — **pas** de fork parallèle du shell admin ni de logique d’autorisation recalculée côté front.

6. **Given** la hiérarchie : **OpenAPI** → **ContextEnvelope** → **NavigationManifest** → **PageManifest** → **UserRuntimePrefs** (prefs **non métier** uniquement ; `peintre-nano/docs/03-contrats-creos-et-donnees.md`)  
   **When** le runtime compose ces pages  
   **Then** **aucune** seconde vérité métier dans les prefs ou les règles d’affichage ; navigation **uniquement** depuis manifestes servis (pas de routes SPA « fantômes »).

**Bloc E — Hub et entrées transverses**

7. **Given** le hub **18.1** (`AdminReportsSupervisionHubWidget`) relie déjà la supervision réception-stats (**19.1**)  
   **When** les parcours **19.2** existent  
   **Then** ajouter au minimum un **point d’entrée manifesté** (tuile / lien `spaNavigateTo`) vers **`/admin/reception-sessions`**, cohérent avec les chemins CREOS — **sans** dépendre de données live absentes du YAML pour libeller l’entrée.

**Bloc F — Parité matrice et documentation**

8. **Given** la matrice `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` — lignes **`ui-admin-15-4-reception-sessions`**, **`ui-admin-15-4-reception-ticket-detail`** et la cartographie **`references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md`** (lignes `/admin/reception-sessions`, `/admin/reception-tickets/:id`)  
   **When** la story est prête pour **DS**  
   **Then** les lignes / notes reflètent l’état réel (branché vs gap **K**, actions **B** exclues visibles) ; pas de marquage « parité OK » si des branches legacy restent hors contrat.

9. **Given** `peintre-nano/docs/03-contrats-creos-et-donnees.md` (section réception admin **19.1** existante)  
   **When** **19.2** est cadrée  
   **Then** une sous-section **Réception admin — sessions liste + détail ticket (Story 19.2)** décrit : routes canoniques, `page_key`, `operation_id` de lecture utilisés, drill-down liste → détail, écarts vs legacy, rappel **pas de masquage gap K** et mutations/export hors scope.

**Bloc G — Qualité**

10. **Given** les tests existants `navigation-transverse-served-5-1.test.ts`, `navigation-transverse-5-1.e2e.test.tsx`  
    **When** la navigation ou les manifestes admin réception **19.2** sont ajoutés  
    **Then** les tests **passent** et des assertions couvrent au minimum la **présence** des entrées et des chemins profonds `/admin/reception-sessions` et `/admin/reception-tickets/<uuid>` (assertion principale **sans** dépendre de données métier live si possible, mocks / stub auth comme le reste du socle).

11. **Given** les gates **Peintre_nano** du Story Runner  
    **When** l’implémentation **DS** est livrée  
    **Then** `npm run lint`, `npm test`, `npm run build` restent **verts** (exécution en phase **DS** / **GATE**, pas exigée en **CS**).

## Tasks / Subtasks

- [x] **AC 1, 5, 6, 7, 10** — CREOS : entrées nav + `PageManifest` pour **`/admin/reception-sessions`** (`page_key` **`transverse-admin-reception-sessions`** ou nom cohérent avec le registre) et pour le détail **`/admin/reception-tickets/:id`** (manifeste dédié type **`page-admin-reception-ticket-detail`** — nom exact à trancher en **DS**) ; étendre **`RuntimeDemoApp.tsx`** avec une constante de chemin type **`ADMIN_RECEPTION_TICKET_PATH`** (modèle **18.2**) ; **`navigation-transverse-served.json`** + bundle `peintre-nano/public/manifests/navigation.json` si le workflow du repo l’exige ; **`runtime-demo-manifest.ts`** si nécessaire.

- [x] **AC 2, 3, 5** — Widget liste : consommer **`getReceptionTicketsList`** / types existants ; table ou liste **bornée** aux champs `ReceptionTicketSummary` ; navigation vers détail via **UUID** dans l’URL canonique ; tout KPI legacy non couvert = placeholder gap **K** (pas de calcul métier fantôme).

- [x] **AC 2, 4, 5** — Widget détail : consommer **`getReceptionTicketDetail`** ; sections lecture seule alignées schéma **`ReceptionTicketDetailResponse`** ; **exclure** explicitement de l’UI les actions **AC 4** tant que hors périmètre stabilisé.

- [x] **AC 4** — Audit UI : vérifier qu’aucun chemin n’appelle bulk export, CSV token, close, patch poids **sans** story **Epic 16** / preuve step-up.

- [x] **AC 8, 9** — Mettre à jour matrice **15.4**, cartographie **15.2** si besoin, et **`03-contrats-creos-et-donnees.md`**.

- [x] **AC 10–11** — Tests + gates (phase **DS**).

## Dev Notes

### Architecture et discipline contractuelle

- **OpenAPI canon** : `contracts/openapi/recyclique-api.yaml` — tickets réception (`/v1/reception/tickets`, `/v1/reception/tickets/{ticket_id}`, sous-ressources weight, export, close). Respecter les descriptions de périmètre **USER** vs **ADMIN**/**SUPER_ADMIN** dans le YAML ; le front ne doit pas élargir implicitement un périmètre plus large que le backend.
- **Client existant** : `peintre-nano/src/api/reception-client.ts` — réutiliser / étendre plutôt que dupliquer ; le flux nominal réception (`ReceptionNominalWizard`, `ReceptionHistoryPanel`) illustre déjà des appels conformes pour d’autres contextes. Le schéma OpenAPI `ReceptionTicketDetailResponse` correspond au type exporté **`ReceptionTicketDetail`** dans ce fichier ; en **DS**, suivre les types générés depuis le YAML si la codegen diverge.
- **Hiérarchie** : `peintre-nano/docs/03-contrats-creos-et-donnees.md`.
- **Shell admin** : `peintre-nano/src/domains/admin-config/` — `AdminListPageShell.tsx`, `admin-transverse-list-page-guards.ts`, README **admin-config**.
- **Layout transverse** : `peintre-nano/src/app/templates/transverse/resolve-transverse-main-layout.ts` ; **Runtime** : `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`.

### Stories précédentes (intelligence)

- **19.1** (`_bmad-output/implementation-artifacts/19-1-porter-les-vues-de-reception-stats-et-de-supervision-reception-nominative.md`) : stats réception ; **ne pas** redéployer ici les blocs KPI stats — se concentrer liste tickets « sessions » + détail ticket.
- **18.2** : modèle **liste admin + détail ressource** avec chemin regex **`ADMIN_CASH_SESSION_PATH`** ; même discipline **gap K** pour tout ce qui n’est pas dans le YAML.
- **17.3** (`_bmad-output/implementation-artifacts/17-3-consolider-les-briques-mutualisees-de-shell-liste-admin-guards-et-detail-simple.md`) : slots homogènes ; garder l’ordre des `slot_id` documenté dans **03** pour les pages `transverse-admin*`.

### Legacy (cartographie uniquement)

- `recyclique-1.4.4/frontend/src/pages/Admin/ReceptionSessionManager.tsx`, `ReceptionTicketDetail.tsx` — sert à **comparer** champs visibles et actions ; **ne pas** porter la logique métier legacy si elle contredit le contrat ou masque un gap.

### Fichiers reviewables typiques

- `contracts/creos/manifests/navigation-transverse-served.json`
- `contracts/creos/manifests/page-transverse-admin-reception-sessions.json` (à créer)
- `contracts/creos/manifests/page-admin-reception-ticket-detail.json` (à créer — nom ajustable)
- `peintre-nano/src/registry/register-admin-config-widgets.ts`
- `peintre-nano/src/domains/admin-config/AdminReportsSupervisionHubWidget.tsx`
- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `peintre-nano/src/runtime/nav-label-presentation-fallbacks.ts`

### Hors scope explicite (rappel)

- **Exports** CSV ticket, jetons download, **bulk** `receptionTicketsExportBulk` : classe **B** / **Epic 16** tant que non intégrés avec step-up et preuve dans une story dédiée.
- **Mutations** close ticket, patch poids ligne : **hors 19.2** sauf arbitrage produit + autorité reviewable explicite dans une story ultérieure ; si présentes dans le legacy, rester en **exclusion visible**.
- **Background** : interdit pour combler l’absence de contrat (alignement brief parent).

### References

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 19, Story 19.2]
- [Source : `contracts/openapi/recyclique-api.yaml` — `recyclique_reception_listTickets`, `recyclique_reception_getTicketDetail`, voisins sensibles]
- [Source : `peintre-nano/docs/03-contrats-creos-et-donnees.md`]
- [Source : `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md` — lignes réception-sessions / réception-tickets]
- [Source : `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` — `ui-admin-15-4-reception-sessions`, `ui-admin-15-4-reception-ticket-detail`]
- [Source : `_bmad-output/implementation-artifacts/18-2-porter-les-listes-et-details-de-session-manager-et-cash-sessions-hors-export-sensible.md` — patterns liste + détail admin]
- [Source : `_bmad-output/implementation-artifacts/19-1-porter-les-vues-de-reception-stats-et-de-supervision-reception-nominative.md` — périmètre 19.1, éviter duplication KPI]
- [Source : `_bmad-output/implementation-artifacts/17-3-consolider-les-briques-mutualisees-de-shell-liste-admin-guards-et-detail-simple.md` — shell liste / slots / guards]
- [Source : `_bmad-output/implementation-artifacts/sprint-status.yaml` — clé `19-2-porter-reception-sessions-et-reception-tickets-id-avec-detail-ressource-mutualise`]

### Project Structure Notes

- **Clé sprint canonique** : `19-2-porter-reception-sessions-et-reception-tickets-id-avec-detail-ressource-mutualise` — l’état d’orchestration est celui du **Status** en tête de fichier et de `development_status` dans `sprint-status.yaml`.
- Le libellé produit « sessions » recouvre historiquement une **liste de tickets** côté legacy ; l’implémentation doit suivre le **contrat** `listTickets`, pas un endpoint « sessions » inexistant, sauf si le YAML est étendu ultérieurement (rail **K**).

## Dev Agent Record

### Agent Model Used

(bmad-create-story CS — Task Story Runner — 2026-04-12) ; **DS** — Task `bmad-dev-story` — 2026-04-12.

### Debug Log References

### Completion Notes List

- **CS (2026-04-12)** : fichier story créé ; `sprint-status.yaml` : story **19-2** **backlog** → **ready-for-dev** ; épique **19** reste **in-progress**.
- **VS (2026-04-12)** : validation `bmad-create-story` / `checklist.md` — références 19.1 / 17.3 explicites + mapping `ReceptionTicketDetailResponse` ↔ `ReceptionTicketDetail` ; statut **ready-for-dev** conservé.
- **DS (2026-04-12)** : CREOS liste + détail ticket (`page-transverse-admin-reception-sessions`, `page-admin-reception-ticket-detail`), widgets `admin.reception.tickets.list` / `admin-reception-ticket-detail`, `RuntimeDemoApp` (`ADMIN_RECEPTION_TICKET_PATH`, sync nav + `resolvedPageKey`), hub `admin-hub-link-reception-sessions`, tests contrat + e2e avec mock `fetch` (ancrage `admin-reception-tickets-operation-anchor`, détail `admin-reception-ticket-detail-operation-anchor` + `admin-reception-ticket-excluded-actions`) ; `widget-registry.test.ts` étendu aux types **19.2** ; doc **03** § **19.2** ; matrice **15.4** et cartographie **15.2** alignées **19.2** ; `nav.transverse.admin.receptionSessions` dans `nav-label-presentation-fallbacks.ts`. Gates : `npm run lint`, `npm test` (437 tests), `npm run build` : **verts** (Task 2026-04-12).
- **Story Runner (2026-04-12)** : chaîne **VS → DS → GATE → QA → CR** ; **QA** renforce AC 10 (contrat + pathname) ; **CR** PASS ; correctif post-CR : liste tickets — remplacement du bandeau `AdminDetailSimpleDemoStrip` (message contradictoire avec le drill-down manifesté) par `admin-reception-tickets-drilldown-note` ; gates relancés : **439** tests verts.

### File List

- `_bmad-output/implementation-artifacts/19-2-porter-reception-sessions-et-reception-tickets-id-avec-detail-ressource-mutualise.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `contracts/creos/manifests/page-transverse-admin-reception-sessions.json`
- `contracts/creos/manifests/page-admin-reception-ticket-detail.json`
- `contracts/creos/manifests/navigation-transverse-served.json`
- `peintre-nano/public/manifests/navigation.json`
- `peintre-nano/src/domains/admin-config/AdminReceptionTicketsListWidget.tsx`
- `peintre-nano/src/domains/admin-config/AdminReceptionTicketDetailWidget.tsx`
- `peintre-nano/src/domains/admin-config/AdminReportsSupervisionHubWidget.tsx`
- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/src/registry/register-admin-config-widgets.ts`
- `peintre-nano/src/runtime/nav-label-presentation-fallbacks.ts`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx`
- `peintre-nano/tests/unit/widget-registry.test.ts`
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md`

## Change Log

- **2026-04-12** — **CS** (`bmad-create-story`, Task) : création story **19.2** + synchronisation sprint.
- **2026-04-12** — **DS** (`bmad-dev-story`, Task) : implémentation **19.2** (CREOS + widgets + runtime + tests + doc) ; statut **review**.
- **2026-04-12** — **DS** (Task, passe finale) : harmonisation `data-testid` liste/détail + exécution `npm run lint`, suite complète `npm test`, `npm run build` : OK.
- **2026-04-12** — **Story Runner** : QA (AC 10) + CR PASS + correctif bandeau drill-down liste (`AdminReceptionTicketsListWidget.tsx`) ; sprint **19-2** : **done**.
