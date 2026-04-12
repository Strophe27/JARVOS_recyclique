# Story 18.3 : Stabiliser la preuve de parité admin pour les surfaces caisse supervisées

Status: done

<!-- Note : validation optionnelle — `validate-create-story` (mode validate / VS) avant `dev-story` si besoin. -->

**Story key :** `18-3-stabiliser-la-preuve-de-parite-admin-pour-les-surfaces-caisse-supervisees`  
**Epic :** 18 (rail **U** — preuve observable ; **aucune** extension de périmètre sensible classe **B** / rail **K** ; pas d'optimisme d'implémentation ni de données simulées pour combler les gaps **K**)

## Story

As a strict parity team,  
I want **matrix rows**, **automated tests**, and **browser-backed evidence** (or an explicit **NEEDS_HITL** record) aligned for the admin supervision surfaces delivered in **18.1** and **18.2**,  
So that the second admin UI wave is **validated** against user-observable parity and **residual derogations** stay explicit, dated, and traceable — **without** masking contract gaps or inventing a second business truth.

## Acceptance Criteria

**Bloc A — Périmètre surfaces (preuve ciblée)**

1. **Given** les livrables **18.1** (hub rapports admin sur **`/admin`**, `page_key` **`transverse-admin-reports-hub`**, widget **`admin.reports.supervision.hub`**) et **18.2** (**`/admin/session-manager`**, **`transverse-admin-session-manager`**, widget **`admin.session-manager.demo`** ; **`/admin/cash-sessions/:id`**, **`admin-cash-session-detail`**) tels que documentés dans `peintre-nano/docs/03-contrats-creos-et-donnees.md` (§ Hub 18.1, § Story 18.2)  
   **When** la story **18.3** est clôturée  
   **Then** la **preuve** couvre **explicitement** ces trois intentions utilisateur : hub (structure + liens manifestés), liste session-manager (shell + état gap **K** honnête), détail session caisse (données **uniquement** via opérations déjà dans `contracts/openapi/recyclique-api.yaml`) — **sans** élargir le scope aux exports **B** ni aux lectures liste/KPIs absentes du YAML.

2. **Given** la matrice normative `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` (extension Epic 15, règles 5–7 dont colonne **Equiv. utilisateur / dérogation PO** obligatoire pour toute ligne **nouvelle ou révisée** après le **2026-04-12**)  
   **When** la preuve est stabilisée  
   **Then** les lignes au minimum suivantes sont **relues et mises à jour dans le même commit / livrable** que le reste de la story : **`ui-admin-15-4-reports-hub`**, **`ui-admin-15-4-session-manager`**, **`ui-admin-15-4-cash-session-detail`** (et **`ui-admin-15-4-home-index-dashboard`** si le chemin **`/admin`** vs legacy est impacté par la preuve) — statut **Preuve / validation**, **Equiv.**, et **Ecarts / décisions** **cohérents** avec l'état réel du code et des tests (pas de « Valide » sans preuve renseignée, conformément aux règles du fichier matrice).

**Bloc B — Preuve navigateur (MCP) vs repli NEEDS_HITL**

3. **Given** le guide de pilotage (règle caisse / admin : comparaison **legacy** `http://localhost:4445` vs **Peintre** `http://localhost:4444`, compte autorisé, MCP **`user-chrome-devtools`** quand disponible)  
   **When** une preuve visuelle est **exigée** pour une ligne matrice ou un AC qui porte sur l'équivalence **observable** (chrome, libellés majeurs, navigation secondaire hub → session-manager → retour, état vide / erreur / gap **K** visible)  
   **Then** soit des **captures / séquence DevTools** (chemins URL, snapshots accessibilité ou équivalent reproductible) sont **archivées** sous `references/artefacts/` avec un nom daté **`2026-04-12_NN_…`** (ou date du jour du DS) **et** référencées depuis la matrice et `03-contrats-creos-et-donnees.md`, soit un bloc **NEEDS_HITL** est ajouté dans le **Dev Agent Record** de cette story avec **cause** (ex. MCP indisponible, instance Chrome occupée, pas de compte recette) et **liste minimale** de ce qu'un humain doit rejouer — **sans** prétendre à une équivalence navigateur non exécutée.

4. **Given** les tests automatisés existants et attendus : `navigation-transverse-served-5-1.test.ts`, `navigation-transverse-5-1.e2e.test.tsx`, tests du widget **`AdminCashSessionDetailWidget`** / client **`cash-session-client.ts`** si touchés par la stabilisation de preuve  
   **When** la story est prête pour review  
   **Then** les tests **verts** restent une **preuve obligatoire** (exécution en phase **DS** / **GATE**, pas en **CS**) ; toute **nouvelle** assertion doit **documenter** ce qu'elle prouve (présence nav, absence d'appel export **B**, libellé gap **K**, etc.) — **pas** de test qui simule des `operationId` absents du YAML.

**Bloc C — Documentation runtime et dettes explicites**

5. **Given** `peintre-nano/docs/03-contrats-creos-et-donnees.md`  
   **When** **18.3** est livrée  
   **Then** une sous-section **Story 18.3 — preuve de parité admin (surfaces caisse supervisées)** décrit : paquet de preuve (matrice + tests + chemins MCP ou **NEEDS_HITL**), liens vers artefacts datés, et **dettes résiduelles** non résolues avec **rationale** (référence **15.2** / **15.4** si API implicite legacy).

6. **Given** la cartographie **15.2** (`references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md` ou successeur daté) pour les familles **`cash-sessions`** / rapports admin  
   **When** une différence legacy ↔ Peintre reste ouverte  
   **Then** elle est **nommée** soit comme **gap contrat** (rail **K** / **Epic 16**), soit comme **dérogation PO** datée dans la matrice — **jamais** comme silence ou donnée inventée côté UI.

**Bloc D — Anti-régressions et rail U**

7. **Given** la hiérarchie de vérité : **OpenAPI** → **ContextEnvelope** → **NavigationManifest** → **PageManifest** → **UserRuntimePrefs**  
   **When** la preuve est consolidée  
   **Then** **aucune** « correction » de parité ne réintroduit de client parallèle, de mock métier, ou de masquage des placeholders **K** / **G-OA-02** établis en **18.1** / **18.2**.

## Tasks / Subtasks

- [x] **AC 1, 2, 6** — Inventaire legacy ciblé : `DashboardHomePage.jsx` / hub admin, `SessionManager.tsx`, `CashSessionDetail.tsx` (`recyclique-1.4.4/frontend/…`) — uniquement pour **cadrer** les critères observables et les écarts ; croiser **15.2** et les lignes matrice listées en **AC 2**.

- [x] **AC 2, 5** — Mettre à jour `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` + `references/artefacts/index.md` si nouveau fichier de preuve ; respecter les règles de colonne **Equiv.** (post-2026-04-12).

- [x] **AC 3** — Exécuter ou documenter : parcours MCP (4445 vs 4444) **ou** **NEEDS_HITL** complet dans le **Dev Agent Record** ; archiver preuves sous `references/artefacts/…` si MCP **OK**.

- [x] **AC 4** — Renforcer / ajuster les tests Peintre listés pour ancrer la preuve **répétable** (sans élargir les appels réseau hors OpenAPI canon).

- [x] **AC 5, 7** — PR doc `03-contrats-creos-et-donnees.md` ; vérifier cohérence avec manifestes `contracts/creos/manifests/page-transverse-admin-reports-hub.json`, `page-transverse-admin-session-manager.json`, `page-admin-cash-session-detail.json`, `navigation-transverse-served.json`.

- [x] **Qualité** — Gates **`peintre-nano`** : `npm run lint`, `npm test`, `npm run build` (phase **DS** / **GATE**, pas **CS**) — **lint/build** en **GATE** parent ; **npm test** exécuté en DS sur `peintre-nano` (voir Completion Notes).

## Dev Notes

### Architecture et discipline contractuelle

- **OpenAPI canon** : `contracts/openapi/recyclique-api.yaml` — toute preuve « données live » liste/KPIs hub ou session-manager doit **refléter** l'absence ou la présence réelle des `operationId` ; pas de contournement pour « embellir » la parité.
- **CREOS** : chemins et `page_key` inchangés sauf **incohérence bloquante** documentée ; priorité à la **preuve** et à la **matrice**, pas à une refonte UI.
- **Rail U** : rester strictement sur supervision **A** ; exports bulk / opérations **B** : renvoi explicite **Epic 16** / **K** (comme **18.1** / **18.2**).

### Stories précédentes (intelligence)

- **18.1** : hub + gaps **K** nommés ; pas de données agrégées inventées.
- **18.2** : routes manifestées, placeholder liste sessions, détail **`getSessionDetail`** ; exports exclus visuellement.
- **17.3** : `AdminListPageShell`, slots `admin.transverse-list.*`, guards — la preuve **18.3** doit montrer que le **shell** et les **messages de gap** restent visibles et honnêtes face au legacy.

### Fichiers et artefacts typiques

- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `references/artefacts/index.md` (si nouveau fichier de preuve)
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- `contracts/creos/manifests/navigation-transverse-served.json`
- `contracts/creos/manifests/page-transverse-admin-reports-hub.json`
- `contracts/creos/manifests/page-transverse-admin-session-manager.json`
- `contracts/creos/manifests/page-admin-cash-session-detail.json`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx`
- Widgets **hub + session-manager** : `peintre-nano/src/domains/admin-config/` (`AdminReportsSupervisionHubWidget.tsx`, `SessionManagerAdminDemoPlaceholder.tsx`), registre `peintre-nano/src/registry/register-admin-config-widgets.ts`
- Widget **détail session caisse** : `peintre-nano/src/domains/cashflow/AdminCashSessionDetailWidget.tsx`, registre `peintre-nano/src/registry/register-cashflow-widgets.ts` (`registerWidget('admin-cash-session-detail', ...)`)

### Hors scope explicite

- Publication d'**nouveaux** endpoints OpenAPI pour liste sessions / stats hub (**Epic 16** / rail **K**).
- Implémentation des exports **`cashSessionsExportBulk`** ou par-session tant que non contractualisés (**B**).
- Parité **réception** admin (**Epic 19**) — seulement croiser la matrice si une ligne partagée est touchée sans élargir le périmètre.

### Project Structure Notes

- Respecter les conventions de nommage `references/artefacts/` (`YYYY-MM-DD_NN_titre.md`) et mettre à jour `references/artefacts/index.md` lors de l'ajout d'un artefact de preuve.
- Alignement avec `references/INSTRUCTIONS-PROJET.md` pour toute nouvelle ressource indexée.

### References

- Stories précédentes même epic (contexte livré **18.1** / **18.2**) : `_bmad-output/implementation-artifacts/18-1-porter-le-hub-rapports-admin-et-les-points-dentree-de-supervision-caisse.md`, `_bmad-output/implementation-artifacts/18-2-porter-les-listes-et-details-de-session-manager-et-cash-sessions-hors-export-sensible.md`.
- Epic 18 et story 18.3 : `_bmad-output/planning-artifacts/epics.md` (section « Epic 18 », rail **U**).
- Architecture active (index, garde-fous transverses) : `_bmad-output/planning-artifacts/architecture/index.md`.
- Matrice parité UI pilotes (lignes **AC 2**) : `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`.
- Cartographie API / permissions / contextes (**AC 6**) : `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md`.
- Doc runtime CREOS / story 18.1–18.3 (**AC 5**) : `peintre-nano/docs/03-contrats-creos-et-donnees.md`.
- OpenAPI canon : `contracts/openapi/recyclique-api.yaml`.
- Manifests : `contracts/creos/manifests/navigation-transverse-served.json`, `contracts/creos/manifests/page-transverse-admin-reports-hub.json`, `contracts/creos/manifests/page-transverse-admin-session-manager.json`, `contracts/creos/manifests/page-admin-cash-session-detail.json`.
- Workflows BMAD (chemins projet) : `.cursor/skills/bmad-dev-story/SKILL.md`, `.cursor/skills/bmad-qa-generate-e2e-tests/SKILL.md`, `.cursor/skills/bmad-code-review/SKILL.md`.

## Change Log

- **2026-04-12** — Story Runner (Plan B même contexte, `resume_at: DS`) : **GATE** `npm run lint` / `npm run build` / `npm run test` sur `peintre-nano` — **PASS** (425 tests) ; **QA** skill : pas de nouveaux e2e hors besoin (couverture **18.3** déjà présente) ; **CR** skill : **APPROVED** ; **18-3** → **done**, **epic-18** → **done** dans `sprint-status.yaml`.
- **2026-04-12** — DS (reprise) : `describe` **Story 18.3** dans `navigation-transverse-served-5-1.test.ts` (triple `page_key` + pas de nav `/admin/reports`) ; e2e hub → lien **Sessions caisse** → retour **Administration** ; doc § **18.3** (typo parenthèse) ; artefact **07** (liste tests) ; gates **peintre-nano** relancés.
- **2026-04-12** — DS : matrice (lignes admin 15.4 ciblées), artefact NEEDS_HITL `2026-04-12_07_…`, doc `03-contrats` § 18.3 enrichi, tests contrat `admin-cash-session-detail` + e2e assertion dette export **B** ; sprint **18-3** → `review`.

## Dev Agent Record

### Agent Model Used

Composer (agent Task DS BMAD), 2026-04-12 ; clôture **Story Runner** (GATE + QA + CR) même date, même workspace (Plan B — pas de spawn Task enfant).

### Debug Log References

_(aucun)_

### NEEDS_HITL — preuve navigateur (AC 3)

**Cause** : le sous-agent **Task** n’a pas accès au MCP **`user-chrome-devtools`** ; aucune capture 4445/4444 ni séquence DevTools n’a été produite dans ce run.

**Paquet de repli** : `references/artefacts/2026-04-12_07_preuve-parite-admin-surfaces-caisse-18-3-needs-hitl.md` (checklist minimale pour humain / orchestrateur : hub `/admin`, lien session-manager, gap **K**, retour Administration, détail `/admin/cash-sessions/:id`, comparaison legacy).

**À rejouer par un humain** : même compte recette que les pilotes matrice ; hôtes `http://localhost:4445` vs `http://localhost:4444` ; archiver captures datées `YYYY-MM-DD_NN_…` sous `references/artefacts/` et mettre à jour la colonne *Preuve / validation* des lignes matrice quand MCP **OK**.

### Completion Notes List

- AC 1–2 : lignes matrice **`ui-admin-15-4-home-index-dashboard`**, **`ui-admin-15-4-reports-hub`**, **`ui-admin-15-4-session-manager`**, **`ui-admin-15-4-cash-session-detail`** — colonne *Preuve / validation* alignée sur tests + artefact NEEDS_HITL ; **Equiv.** inchangé (**OK**).
- AC 3 : NEEDS_HITL documenté (artefact + cette section) — pas d’équivalence navigateur prétendue sans exécution MCP.
- AC 4 : test contrat **Story 18.3** (bundle : `transverse-admin-reports-hub` + `transverse-admin-session-manager` + `admin-cash-session-detail`, pas de nav `/admin/reports`) ; e2e **18.3** parcours hub → **Sessions caisse** → gap **K** + **`admin-session-manager-export-debt`** → retour nav **Administration**.
- AC 5–6–7 : § **Story 18.3** dans `03-contrats-creos-et-donnees.md` (paquet + dettes **15.2** / **K** / **16.4**) ; aucun manifeste modifié ; pas de client parallèle ni mock métier.
- Qualité : **`npm run lint`**, **`npm run build`**, **`npm run test`** dans `peintre-nano` (Story Runner **2026-04-12**) — **PASS** (425 tests).
- **QA** (`bmad-qa-generate-e2e-tests`) : revue — pas d’ajout de tests simulant des `operationId` absents du YAML ; scénarios **18.3** déjà couverts.
- **CR** (`bmad-code-review`) : **APPROVED** — discipline OpenAPI → CREOS ; NEEDS_HITL navigateur explicite ; pas de seconde vérité métier.

### File List

- `references/artefacts/2026-04-12_07_preuve-parite-admin-surfaces-caisse-18-3-needs-hitl.md`
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `references/artefacts/index.md`
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/18-3-stabiliser-la-preuve-de-parite-admin-pour-les-surfaces-caisse-supervisees.md`

---

**Note CS (2026-04-12) :** passe **create-story** (CS) — alignement epic **18.3** / rail **U**, références **18.1**/**18.2** + matrice + OpenAPI ; statut fichier **`done`** (implémentation et GATE déjà enregistrés dans le Change Log). Une exécution **VS** (`bmad-create-story` mode validate) reste optionnelle pour relecture qualité hors sprint.
