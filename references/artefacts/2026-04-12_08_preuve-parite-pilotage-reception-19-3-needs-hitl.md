# Paquet de preuve — pilotage réception admin (Story 19.3) — NEEDS_HITL navigateur

Date : 2026-04-12  
Story : **19.3** (`19-3-valider-la-parite-observable-du-pilotage-reception-sans-inclure-les-exports-bloques`)  
Epic : **19** (rail **U**)

## Objet

Consigner le **repli NEEDS_HITL** lorsque la preuve **legacy 4445 vs Peintre 4444** sous **Chrome DevTools MCP** (`user-chrome-devtools`) **n’a pas été exécutée** dans le contexte DS (sous-agent Task sans MCP navigateur). Les preuves **automatisées** (contrat bundle + e2e) et la **documentation** (`03-contrats-creos-et-donnees.md` § **Story 19.3**, matrice **15.4**) restent la base reviewable.

## Cause NEEDS_HITL

- **MCP `user-chrome-devtools`** : non invocable depuis l’agent DS (environnement isolé).

## Checklist minimale — rejouer par un humain / orchestrateur parent

Compte : **admin** recette (cf. guide pilotage), **legacy** `http://localhost:4445`, **Peintre** `http://localhost:4444`.

1. **Hub `/admin`** (Peintre) : widget `admin-reports-supervision-hub` ; présence textuelle **`recyclique_admin_reports_receptionTicketsExportBulk`** comme **dette / rail K** (pas comme action activée) ; liens **Stats réception** et **Sessions réception (tickets)** manifestés (`admin-hub-link-reception-stats`, `admin-hub-link-reception-sessions`).
2. **Hub → `/admin/reception-stats`** : shell **17.3** ; widget stats ; ancrages **`recyclique_stats_receptionSummary`** (ou équivalents visibles) ; carte **gap K** nominatif **`admin-reception-nominative-gap-k`** visible — **sans** graphiques Recharts legacy revendiqués comme parité.
3. **Hub → `/admin/reception-sessions`** : liste / état vide ; slot **gap** manifeste mentionnant exports **B** / **Epic 16** ; alerte widget **`admin-reception-tickets-scope-note`** (actions hors périmètre lecture).
4. **Drill-down** : depuis une ligne ticket (données réelles ou jeu de test), **`/admin/reception-tickets/<uuid>`** — **`recyclique_reception_getTicketDetail`** seul ancrage de données live ; bloc **`admin-reception-ticket-excluded-actions`** visible (close / export / patch / bulk **non** branchés).
5. **Absence nav CREOS** : confirmer qu’il **n’existe pas** d’entrée manifestée **`/admin/reception-reports`** (ligne matrice **`ui-admin-15-4-reception-reports`** = backlog **hors** critère succès **19.x** — pas fusionné dans stats/sessions).
6. **Legacy** `http://localhost:4445/admin/reception-stats`, `…/reception-sessions`, `…/reception-tickets/:id`, `…/reception-reports` : comparer **intentions** (libellés majeurs, ordre macro) — les branches **exports / mutations** restent **hors périmètre prouvé** côté Peintre mais **nommées** (pas silencieuses).

## Artefacts liés (preuve déjà reviewable sans MCP)

- Matrice : `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` — lignes **`ui-admin-15-4-reception-stats`**, **`ui-admin-15-4-reception-sessions`**, **`ui-admin-15-4-reception-ticket-detail`**, **`ui-admin-15-4-reception-reports`** (hors critère **19.x**, traçable).
- Tests : `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts` (bloc **Story 19.3**), `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx` (parcours **19.3**).
- Doc runtime : `peintre-nano/docs/03-contrats-creos-et-donnees.md` — **Story 19.3**.
- Cartographie : `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md` (familles réception / exports sensibles).

## Dettes résiduelles (nommées)

- **`/admin/reception-reports`** (`ReceptionReports.tsx`) : **Gap CREOS** ; exports CSV / bulk = classe **B** — **Epic 16** / **16.4**, rail **K** ; **non** comptabilisé comme « parité pilotage **19.x** atteinte ».
- **Mutations ticket** (`recyclique_reception_closeTicket`, `recyclique_reception_patchLigneWeight`, jetons / CSV ticket) : **hors** stories **19.1–19.2** tant que step-up **Epic 16** non intégré au périmètre slice — visibles dans les widgets comme **exclus**.
