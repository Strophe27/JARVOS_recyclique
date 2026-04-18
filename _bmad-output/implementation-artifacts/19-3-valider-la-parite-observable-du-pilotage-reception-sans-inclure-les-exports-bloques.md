# Story 19.3 : Valider la parité observable du pilotage réception sans inclure les exports bloqués

Status: done

<!-- Note : validation optionnelle — `validate-create-story` (mode validate / VS) avant `dev-story` si besoin. -->

**Story key :** `19-3-valider-la-parite-observable-du-pilotage-reception-sans-inclure-les-exports-bloques`  
**Epic :** 19 (rail **U** — preuve observable ; **aucune** extension de périmètre sensible classe **B** / rail **K** ; exports bulk / CSV / jetons hors contrat step-up **Epic 16** = **hors** critères de « parité atteinte » mais **obligatoirement** référencés comme bloqués par le rail contrat ; **ne pas** masquer les branches legacy différées derrière une UI silencieuse)

## Alignement sprint (CS 2026-04-12)

Référence canonique : `_bmad-output/implementation-artifacts/sprint-status.yaml`. À la passe **CS** (`resume_at: CS`, skill `bmad-create-story`), l'épique **19** est déjà **in-progress** (stories **19.1** et **19.2** terminées) : **ne pas** remettre l'épique en `backlog`. Cette story passe **backlog** → **ready-for-dev** à la création du fichier.

## Story

As a strict migration team,  
I want **matrix rows**, **automated tests**, and **browser-backed evidence** (or an explicit **NEEDS_HITL** record) aligned for the **reception admin pilotage** surfaces delivered in **19.1** and **19.2**,  
So that the reception wave is **validated** against user-observable parity and **residual derogations** stay explicit, dated, and traceable — **without** counting blocked exports or deferred sensitive branches as « done », **without** masking contract gaps, and **without** inventing a second business truth.

## Acceptance Criteria

**Bloc A — Périmètre surfaces (preuve ciblée)**

1. **Given** les livrables **19.1** (`/admin/reception-stats`, `page_key` **`transverse-admin-reception-stats`**, widget **`admin.reception.stats.supervision`**, lectures stats OpenAPI documentées) et **19.2** (`/admin/reception-sessions`, **`transverse-admin-reception-sessions`**, widget **`admin.reception.tickets.list`** ; `/admin/reception-tickets/:id`, **`admin-reception-ticket-detail`**, lecture **`recyclique_reception_getTicketDetail`**) tels que documentés dans `peintre-nano/docs/03-contrats-creos-et-donnees.md` (§ Story **19.1**, § Story **19.2**)  
   **When** la story **19.3** est clôturée  
   **Then** la **preuve** couvre **explicitement** ces intentions utilisateur : stats réception (KPIs branchés + dettes nommées + gap nominatif **K** visible), liste sessions tickets (shell + colonnes **`ReceptionTicketSummary`** + gap **K** honnête si KPI legacy hors schéma), détail ticket (données **uniquement** via `operation_id` déjà dans `contracts/openapi/recyclique-api.yaml`) — **sans** élargir le scope aux exports **B** (`recyclique_admin_reports_receptionTicketsExportBulk`, `recyclique_reception_createTicketDownloadToken`, `recyclique_reception_exportTicketCsv`, etc.) ni aux mutations sensibles (`recyclique_reception_closeTicket`, `recyclique_reception_patchLigneWeight`) tant qu'elles ne sont pas couvertes par une preuve d'autorité **Epic 16** dans le périmètre story.

2. **Given** la matrice normative `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` (règles 5–7 dont colonne **Equiv. utilisateur / dérogation PO** obligatoire pour toute ligne **nouvelle ou révisée** après le **2026-04-12**)  
   **When** la preuve est stabilisée  
   **Then** les lignes au minimum suivantes sont **relues et mises à jour dans le même livrable** que le reste de la story : **`ui-admin-15-4-reception-stats`**, **`ui-admin-15-4-reception-sessions`**, **`ui-admin-15-4-reception-ticket-detail`** — statut **Preuve / validation**, **Equiv.**, et **Ecarts / décisions** **cohérents** avec l'état réel du code et des tests ; la ligne **`ui-admin-15-4-reception-reports`** (exports legacy) reste explicitement **hors** critère de succès de parité pilotage **19.x** mais **doit** rester traçable comme surface sensible / backlog (pas de « fusion » silencieuse dans une ligne stats ou sessions).

**Bloc B — Preuve navigateur (MCP) vs repli NEEDS_HITL**

3. **Given** le guide de pilotage (règle admin : comparaison **legacy** `http://localhost:4445` vs **Peintre** `http://localhost:4444`, compte autorisé, MCP **`user-chrome-devtools`** quand disponible)  
   **When** une preuve visuelle est **exigée** pour une ligne matrice ou un AC qui porte sur l'équivalence **observable** (chemins URL, libellés majeurs, hub **18.1** → stats réception → sessions → détail ticket, état vide / erreur / gap **K** / exclusions **B** visibles)  
   **Then** soit des **captures / séquence DevTools** reproductibles sont **archivées** sous `references/artefacts/` avec un nom daté **`2026-04-12_NN_…`** (ou date du jour du **DS**) **et** référencées depuis la matrice et `03-contrats-creos-et-donnees.md`, soit un bloc **NEEDS_HITL** est ajouté dans le **Dev Agent Record** avec **cause** et **liste minimale** de ce qu'un humain doit rejouer — **sans** prétendre à une équivalence navigateur non exécutée.

4. **Given** les tests automatisés existants : `navigation-transverse-served-5-1.test.ts`, `navigation-transverse-5-1.e2e.test.tsx`, tests des widgets **`admin.reception.stats.supervision`**, **`admin.reception.tickets.list`**, **`admin-reception-ticket-detail`** / clients **`dashboard-legacy-stats-client.ts`**, **`reception-client.ts`** si touchés par la stabilisation de preuve  
   **When** la story est prête pour review  
   **Then** les tests **verts** restent une **preuve obligatoire** (exécution en phase **DS** / **GATE**, pas en **CS**) ; toute **nouvelle** assertion documente ce qu'elle prouve (présence nav, URL profondes réception, marqueurs gap **K**, absence d'appel aux `operation_id` exports **B**, etc.) — **pas** de test qui simule des `operation_id` absents du YAML.

**Bloc C — Documentation runtime et branches différées**

5. **Given** `peintre-nano/docs/03-contrats-creos-et-donnees.md`  
   **When** **19.3** est livrée  
   **Then** une sous-section **Story 19.3 — preuve de parité observable (pilotage réception)** décrit : paquet de preuve (matrice + tests + chemins MCP ou **NEEDS_HITL**), liens vers artefacts datés, **liste explicite** des exports / mutations **bloqués** par le rail contrat (références **16.4** / **Epic 16** / placeholders widgets **19.2**), et **dettes résiduelles** (branches legacy différées, **reception-reports**, etc.) avec **rationale** — **jamais** comme simple absence UI sans mention du rail.

6. **Given** la cartographie **15.2** (`references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md` ou successeur daté) pour les familles réception admin  
   **When** une différence legacy ↔ Peintre reste ouverte  
   **Then** elle est **nommée** soit comme **gap contrat** (rail **K** / **Epic 16**), soit comme **dérogation PO** datée dans la matrice — **pas** de masquage des branches différées (ex. rapports CSV, actions ticket) : elles restent visibles dans la doc de preuve comme **hors périmètre prouvé** mais **connues**.

**Bloc D — Anti-régressions et rail U**

7. **Given** la hiérarchie de vérité : **OpenAPI** → **ContextEnvelope** → **NavigationManifest** → **PageManifest** → **UserRuntimePrefs**  
   **When** la preuve est consolidée  
   **Then** **aucune** « correction » de parité ne réintroduit de client parallèle, de mock métier, ni ne masque les placeholders **K** / exclusions **B** établis en **19.1** / **19.2** ; les exports bloqués ne deviennent **pas** des critères verts implicites.

## Tasks / Subtasks

- [x] **AC 1, 2, 6** — Inventaire legacy ciblé : `ReceptionDashboard.tsx`, `ReceptionSessionManager.tsx`, `ReceptionTicketDetail.tsx`, `ReceptionReports.tsx` (`recyclique-1.4.4/frontend/…`) — uniquement pour **cadrer** les critères observables, les écarts et les **branches différées** ; croiser **15.2** et les lignes matrice listées en **AC 2**.

- [x] **AC 2, 5** — Mettre à jour `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` + `references/artefacts/index.md` si nouveau fichier de preuve ; respecter les règles de colonne **Equiv.** (post-2026-04-12).

- [x] **AC 3** — Exécuter ou documenter : parcours MCP (4445 vs 4444) **ou** **NEEDS_HITL** complet dans le **Dev Agent Record** ; archiver preuves sous `references/artefacts/…` si MCP **OK**.

- [x] **AC 4** — Renforcer / ajuster les tests Peintre listés pour ancrer la preuve **répétable** (sans élargir les appels réseau hors OpenAPI canon ; **pas** d'activation des exports **B** dans les tests pour simuler la parité).

- [x] **AC 5, 7** — PR doc `peintre-nano/docs/03-contrats-creos-et-donnees.md` ; vérifier cohérence avec manifestes `page-transverse-admin-reception-stats.json`, `page-transverse-admin-reception-sessions.json`, `page-admin-reception-ticket-detail.json`, `navigation-transverse-served.json`, hub `page-transverse-admin-reports-hub.json`.

- [x] **Qualité** — Gates **`peintre-nano`** : `npm run lint`, `npm test`, `npm run build` (phase **DS** / **GATE**, pas **CS**) — **exécution déléguée au parent** ; DS : tests ciblés `navigation-transverse-served-5-1` + `navigation-transverse-5-1` **verts** (88 tests).

## Dev Notes

### Architecture et discipline contractuelle

- **OpenAPI canon** : `contracts/openapi/recyclique-api.yaml` — toute preuve « données live » sur stats, liste tickets ou détail doit **refléter** la présence ou l'absence réelle des `operation_id` ; pas de contournement pour « embellir » la parité.
- **CREOS** : `page_key` et chemins **19.1** / **19.2** inchangés sauf **incohérence bloquante** documentée ; priorité à la **preuve** et à la **matrice**, pas à une refonte UI.
- **Rail U** : rester strictement sur pilotage réception **A** ; exports bulk / opérations **B** : renvoi explicite **Epic 16** / **16.4** / rail **K** (comme **19.2** AC4).

### Stories précédentes (intelligence)

- **19.1** : stats + gap nominatif **`admin-reception-nominative-gap-k`** ; graphiques / filtres hors contrat = dette nommée.
- **19.2** : liste + détail ticket ; mutations export close patch = **exclus visibles**, pas silencieux.
- **18.3** : modèle de story **preuve observable** (matrice + tests + doc § + NEEDS_HITL MCP) — **réutiliser la même discipline** pour **19.3** sans mélanger périmètre caisse.

### Fichiers et artefacts typiques

- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `references/artefacts/index.md` (si nouveau fichier de preuve)
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- `contracts/creos/manifests/navigation-transverse-served.json`
- `contracts/creos/manifests/page-transverse-admin-reception-stats.json`
- `contracts/creos/manifests/page-transverse-admin-reception-sessions.json`
- `contracts/creos/manifests/page-admin-reception-ticket-detail.json`
- `contracts/creos/manifests/page-transverse-admin-reports-hub.json`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx`
- Widgets : `peintre-nano/src/domains/admin-config/` (stats réception, hub liens), widgets liste / détail réception (registre `register-admin-config-widgets.ts`)
- Clients : `peintre-nano/src/api/reception-client.ts`, adaptateur stats admin si concerné

### Hors scope explicite (reste tracé, pas « gagné » en parité)

- Implémentation des exports **`recyclique_admin_reports_receptionTicketsExportBulk`**, **`recyclique_reception_exportTicketCsv`**, jetons téléchargement, ou mutations ticket tant que non couverts par story **Epic 16** / step-up reviewable.
- Parité de **`/admin/reception-reports`** (ligne matrice **`ui-admin-15-4-reception-reports`**) : hors critère succès **19.3** ; doit rester citée comme surface sensible / backlog aligné **15.2**.

### Project Structure Notes

- Conventions `references/artefacts/` (`YYYY-MM-DD_NN_titre.md`) et mise à jour `references/artefacts/index.md` lors de l'ajout d'un artefact de preuve.
- Alignement `references/INSTRUCTIONS-PROJET.md` pour toute nouvelle ressource indexée.

### References

- Stories même epic : `_bmad-output/implementation-artifacts/19-1-porter-les-vues-de-reception-stats-et-de-supervision-reception-nominative.md`, `_bmad-output/implementation-artifacts/19-2-porter-reception-sessions-et-reception-tickets-id-avec-detail-ressource-mutualise.md`.
- Story miroir preuve : `_bmad-output/implementation-artifacts/18-3-stabiliser-la-preuve-de-parite-admin-pour-les-surfaces-caisse-supervisees.md`.
- Epic 19 : `_bmad-output/planning-artifacts/epics.md` (section « Epic 19 »).
- Architecture active : `_bmad-output/planning-artifacts/architecture/index.md`.
- Matrice : `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`.
- Cartographie : `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md`.
- Doc runtime : `peintre-nano/docs/03-contrats-creos-et-donnees.md`.
- OpenAPI : `contracts/openapi/recyclique-api.yaml`.
- Workflows BMAD : `.cursor/skills/bmad-dev-story/SKILL.md`, `.cursor/skills/bmad-qa-generate-e2e-tests/SKILL.md`, `.cursor/skills/bmad-code-review/SKILL.md`.

## Dev Agent Record

### Agent Model Used

Composer (sous-agent Task DS **bmad-dev-story**), 2026-04-12.

### Debug Log References

### NEEDS_HITL (preuve navigateur MCP)

- **Cause** : MCP **`user-chrome-devtools`** non disponible dans le contexte DS (sous-agent Task).
- **Artefact** : `references/artefacts/2026-04-12_08_preuve-parite-pilotage-reception-19-3-needs-hitl.md` (checklist minimale 4445 / 4444 : hub → stats → sessions → détail ticket ; confirmer absence nav `/admin/reception-reports` ; comparer branches legacy **reception-reports** / exports).

### Completion Notes List

- Matrice **15.4** : lignes réception stats / sessions / ticket-detail + ligne **reception-reports** (Equiv. **Hors scope** pilotage **19.x**) ; artefact **NEEDS_HITL** `2026-04-12_08_…`.
- Doc **03** : § **Story 19.3** (paquet de preuve, exports **B** listés, dettes branches différées, lien **15.2**).
- Tests : `describe` **Story 19.3** dans contrat bundle (pas de nav `/admin/reception-reports`, texte gap manifeste) + e2e chaîne hub → stats → hub → sessions (`admin-reception-tickets-scope-note`, marqueur export **B**).
- **NEEDS_HITL** : pas de MCP `user-chrome-devtools` au DS — checklist dans `references/artefacts/2026-04-12_08_preuve-parite-pilotage-reception-19-3-needs-hitl.md`.

### File List

- `references/artefacts/2026-04-12_08_preuve-parite-pilotage-reception-19-3-needs-hitl.md`
- `references/artefacts/index.md`
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx`
- `_bmad-output/implementation-artifacts/19-3-valider-la-parite-observable-du-pilotage-reception-sans-inclure-les-exports-bloques.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- **2026-04-12** — **CR** (`bmad-code-review`, Task Story Runner, `resume_at: CR`) : verdict **APPROVE** ; preuve auto + doc + **NEEDS_HITL** `08` conformes AC **19.3** ; statut **review** → **done** ; sprint **19-3** → **done** ; **epic-19** → **done** ; `cr_loop` = 0.
- **2026-04-12** — **DS** (`bmad-dev-story`, Task) : matrice + doc **03** § **19.3** + artefact **NEEDS_HITL** `08` + tests contrat/e2e ; statut **ready-for-dev** → **review** ; sprint **19-3** → **review** ; gates npm complets **GATE** (parent).
- **2026-04-12** — **CS** (`bmad-create-story`, Task Story Runner) : fichier story créé, statut **ready-for-dev** ; alignement sprint **19-3** **backlog** → **ready-for-dev** ; epic-19 inchangé **in-progress**.
