# Story 13.2.2: Remediation visuelle - lot Reception + Admin1 (hors exclusions)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

En tant qu'equipe produit,  
je veux corriger les ecarts visuels du lot Reception + Admin1 (hors exclusions),  
afin de maintenir des stories courtes tout en couvrant les parcours metiers cles.

## Acceptance Criteria

1. **Etant donne** les ecrans des stories 11.3 (Reception) et 11.4 (Admin1), **quand** le lot est corrige selon la charte visuelle operatoire et la checklist `copy + consolidate + security`, **alors** les ecarts critiques/majeurs sont fermes sur tout le perimetre inclus.
2. **Et** le perimetre respecte strictement les exclusions validees: `pin login`, `users pending`, `permissions` restent hors scope correctif prioritaire.
3. **Et** chaque ecran modifie dispose de preuves avant/apres tracables (captures + manifest), avec mini audit visuel rejoue pour les domaines Reception et Admin1.
4. **Et** les composants partages issus des stories 13.1.1 et 13.1.2 sont reutilises (shell, tokens, composants UI), sans patch CSS opportuniste local ni duplication de logique UI.
5. **Et** la definition de done technique du lot est respectee: `npm run build` OK, tests UI co-loces des ecrans/composants touches OK, aucun secret/hack introduit.

## Tasks / Subtasks

- [x] Task 1 - Cadrer le perimetre exact du lot Reception + Admin1 (AC: 1, 2)
  - [x] Lister les ecrans Reception inclus (story 11.3) et les ecrans Admin1 inclus (story 11.4).
  - [x] Verifier qu'aucun ecran exclu (`pin login`, `users pending`, `permissions`) n'est impacte directement ou indirectement.
  - [x] Definir l'ordre de traitement et les jalons de controle (Reception puis Admin1, avec verification de non-regression entre lots).
- [x] Task 2 - Corriger les ecarts visuels du domaine Reception (AC: 1, 4)
  - [x] Aligner accueil/poste, ouverture poste, liste tickets, detail ticket + lignes, export CSV/stats live sur le rendu 1.4.4.
  - [x] Harmoniser densite, alignements, tables, formulaires et actions selon la charte operatoire.
  - [x] Reutiliser les briques partagees avant toute adaptation locale.
- [x] Task 3 - Corriger les ecarts visuels du domaine Admin1 (AC: 1, 4)
  - [x] Aligner dashboard admin, users (liste/detail), sites, postes, gestionnaire de sessions et rapports caisse sur 1.4.4.
  - [x] Verifier coherence de navigation shell/menu/layout entre ecrans admin du lot.
  - [x] Eviter toute derive de perimetre global (pas de refactor routing/layout hors besoin strict du lot).
- [x] Task 4 - Appliquer la discipline import/refactor propre (AC: 1, 2, 4, 5)
  - [x] **Copy**: tracer pour chaque ecran les sources 1.4.4 utilisees (fichiers/chemins legacy).
  - [x] **Consolidate**: verifier absence de doublons, alignement architecture, et reutilisation des composants `shared`.
  - [x] **Security**: verifier absence de secret en dur, URL sensible, contournement temporaire, et lancer un audit dependances pertinent (`npm audit` ou equivalent).
- [x] Task 5 - Produire les preuves et passer le gate qualite (AC: 3, 5)
  - [x] Capturer AVANT/APRES pour chaque ecran modifie et publier le manifest de preuves du lot.
  - [x] Rejouer un mini audit visuel Reception + Admin1 et documenter les ecarts residuels acceptes.
  - [x] Executer `npm run build` dans `frontend/` et corriger les erreurs.
  - [x] Executer les tests co-loces touches (`*.test.tsx`) avec Vitest + RTL + jsdom.
- [x] Review Follow-ups (AI)
  - [x] [AI-Review][HIGH] Isoler explicitement le perimetre story dans les artefacts pour rendre AC1/AC2 verifiables malgre un git tree sale.
  - [x] [AI-Review][MEDIUM] Corriger les warnings React `act(...)` persistants dans les tests cibles AdminDashboard/AdminUsersList/AdminUserDetail.

## Dev Notes

- Story de lot visuel anti-dette: parite 1.4.4 quasi pixel perfect sans redesign libre.
- Prerequis direct: stories 13.1.1 (shell global) et 13.1.2 (tokens/composants UI) deja stabilisees.
- Sources fonctionnelles du lot: stories 11.3 (Reception) et 11.4 (Admin1) de l'epic de conformite visuelle.
- Exclusions non negociables a conserver hors scope: `pin login`, `users pending`, `permissions`.
- Lecon integree de 13.2.1: eviter la derive de perimetre (pas de refactor transversal global non necessaire au lot).
- Garde-fou de perimetre: toute modification de routage global (`frontend/src/App.tsx`) ou du shell doit rester exceptionnelle, strictement motivee, et prouver qu'elle n'impacte pas les ecrans exclus.
- Methode obligatoire par ecran: `copy + consolidate + security` avec trace exploitable en completion notes.
- Gate qualite obligatoire: build OK, tests UI co-loces OK, preuves visuelles completes, mini audit rejoue.
- UI/styling: rester sur Mantine et la charte/tokens du projet, sans nouvelle librairie UI.

### Project Structure Notes

- Domaines cibles: `frontend/src/reception` et `frontend/src/admin`.
- Couche partagee obligatoire: `frontend/src/shared` (layout, theme, ui, slots).
- Convention tests frontend: tests co-loces `*.test.tsx` (Vitest + React Testing Library + jsdom), pas de dossier `__tests__` module.
- Frontiere de lot: toute modification de `frontend/src/App.tsx` ou du shell global doit etre strictement justifiee par le lot et verifiee contre les exclusions.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#story-13-2-2-remediation-visuelle-lot-reception-admin1]
- [Source: _bmad-output/planning-artifacts/epics.md#epic-13-remediation-visuelle-pixel-perfect-1-4-4]
- [Source: _bmad-output/planning-artifacts/epics.md#story-11-3-conformite-visuelle-reception]
- [Source: _bmad-output/planning-artifacts/epics.md#story-11-4-conformite-visuelle-admin-1]
- [Source: _bmad-output/implementation-artifacts/13-2-1-remediation-visuelle-lot-auth-caisse-hors-exclusions.md]
- [Source: _bmad-output/implementation-artifacts/13-1-1-socle-visuel-shell-global-bandeau-menu-layout.md]
- [Source: _bmad-output/implementation-artifacts/13-1-2-socle-visuel-tokens-et-composants-ui-cles.md]
- [Source: _bmad-output/implementation-artifacts/13-0-sprint-plan-remediation-visuelle-epic-11.md]
- [Source: _bmad-output/implementation-artifacts/11-x-point-de-verite-parite-v1.4.4.md]
- [Source: _bmad-output/implementation-artifacts/11-x-charte-visuelle-operatoire.md]
- [Source: _bmad-output/implementation-artifacts/11-x-guide-refactor-propre.md]
- [Source: _bmad-output/implementation-artifacts/11-x-gate-qualite-epic11.md]
- [Source: references/ancien-repo/checklist-import-1.4.4.md]
- [Source: references/artefacts/2026-02-26_10_tracabilite-ecran-donnees-appels-api.md]
- [Source: _bmad-output/planning-artifacts/architecture.md#gap-analysis-results]
- [Source: _bmad-output/planning-artifacts/architecture.md#implementation-readiness-validation]
- [Source: _bmad-output/planning-artifacts/architecture.md#implementation-handoff]
- [Source: references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md]
- [Source: .cursor/rules/epic11-parite-et-refactor-propre.mdc]

## Dev Agent Record

### Agent Model Used

GPT-5.3 Codex (bmad-dev)

### Debug Log References

- Workflow create-story: `_bmad/bmm/workflows/4-implementation/create-story/`
- Sources chargees: `epics.md`, `sprint-status.yaml`, story precedente 13.2.1, artefacts Epic 11/13, architecture (gap/readiness/handoff), checklist import 1.4.4.
- Workflow dev-story: `_bmad/bmm/workflows/4-implementation/dev-story/`.
- Validation technique executee:
  - `npm run test:run -- src/reception/ReceptionAccueilPage.test.tsx src/reception/ReceptionTicketDetailPage.test.tsx src/admin/AdminDashboardPage.test.tsx src/admin/AdminUsersListPage.test.tsx src/admin/AdminUserDetailPage.test.tsx src/admin/AdminSitesPage.test.tsx src/admin/AdminCashRegistersPage.test.tsx src/admin/AdminSessionManagerPage.test.tsx src/admin/AdminReportsPage.test.tsx src/shared/layout/AppShell.test.tsx src/shared/layout/AppShellNav.test.tsx`
  - `npm run build`
  - `npm audit --audit-level=high`
- Rework review `changes-requested` (2026-02-28):
  - `npm run test:run -- src/admin/AdminDashboardPage.test.tsx src/admin/AdminUsersListPage.test.tsx src/admin/AdminUserDetailPage.test.tsx` (avant correction: warnings React `act(...)` reproduits)
  - ajustement des tests RTL pour attendre les updates async (`findBy*`/`waitFor`)
  - `npm run test:run -- src/admin/AdminDashboardPage.test.tsx src/admin/AdminUsersListPage.test.tsx src/admin/AdminUserDetailPage.test.tsx` (apres correction: 13/13 OK, 0 warning `act(...)`)
  - tracabilite scope renforcee dans cette story (File List + notes de perimetre explicites)

### Completion Notes List

- 2026-02-28 - Story creee via workflow create-story BMAD pour Epic 13.
- 2026-02-28 - Story 13.2.2 preparee avec perimetre strict Reception + Admin1 hors exclusions.
- 2026-02-28 - Checklist create-story appliquee: AC actionnables, taches detaillees, garde-fous anti-regression, references obligatoires.
- 2026-02-28 - Statut cible confirme: `ready-for-dev`.
- 2026-02-28 - Validation create-story (checklist) reappliquee: garde-fous de perimetre renforces et references completees pour execution dev.
- 2026-02-28 - Refactor visuel lot Reception + Admin1: adoption du shell partage (`AppShell` + `AppShellNav`) dans `frontend/src/App.tsx` et harmonisation layout via `PageContainer` sur les ecrans Reception/Admin1 cibles.
- 2026-02-28 - Copy: alignement sur les stories 11.3/11.4 et la charte Epic 11 (densite, hiarchie, surfaces, tables/actions) sans toucher aux exclusions `pin login`, `users pending`, `permissions`.
- 2026-02-28 - Consolidate: suppression d'approches locales ad hoc au profit des briques partagees `shared/layout` sur Reception/Admin1.
- 2026-02-28 - Security: aucun secret/hack/URL sensible ajoute dans les fichiers modifies; audit dependances frontend execute (`npm audit --audit-level=high`: 0 vulnerability).
- 2026-02-28 - Blocage HITL: preuves visuelles AVANT/APRES et mini audit visuel Reception + Admin1 a produire/rejouer sur environnement navigateur.
- 2026-02-28 - Reprise HITL (Task 5): publication du manifest de preuves `_bmad-output/implementation-artifacts/13-2-2-audit-reception-admin1-preuves.json` et annexe `_bmad-output/implementation-artifacts/13-2-2-audit-reception-admin1-annexe.md`.
- 2026-02-28 - Mini audit visuel Reception + Admin1 valide (HITL) avec ecarts residuels mineurs acceptes; aucun ecart critique/majeur restant dans le scope inclus.
- 2026-02-28 - ✅ Resolved review finding [HIGH]: perimetre story explicitement certifie dans les artefacts de la story pour audit AC1/AC2 malgre un git tree global melange.
- 2026-02-28 - Preuve de perimetre (scope story uniquement) documentee: lot limite a `frontend/src/reception/*` et ecrans Admin1 (`AdminDashboard`, `AdminUsersList`, `AdminUserDetail`, `AdminSites`, `AdminCashRegisters`, `AdminSessionManager`, `AdminReports`) + preuves audit associees.
- 2026-02-28 - Hors scope explicitement maintenu: `pin login`, `users pending`, `permissions`; et changements git hors lot (ex: `frontend/src/auth/*`, `frontend/src/caisse/*`, `frontend/src/admin/AdminCategoriesPage.tsx`, `api/*`) non pris en compte pour la validation AC de cette story.
- 2026-02-28 - ✅ Resolved review finding [MEDIUM]: warnings React `act(...)` supprimes sur les tests cibles via attentes async explicites (`waitFor`/`findBy*`) dans `AdminDashboardPage.test.tsx`, `AdminUsersListPage.test.tsx`, `AdminUserDetailPage.test.tsx`.

### File List

- _bmad-output/implementation-artifacts/13-2-2-remediation-visuelle-lot-reception-admin1-hors-exclusions.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/13-2-2-audit-reception-admin1-preuves.json
- _bmad-output/implementation-artifacts/13-2-2-audit-reception-admin1-annexe.md
- frontend/src/App.tsx
- frontend/src/reception/ReceptionAccueilPage.tsx
- frontend/src/reception/ReceptionTicketDetailPage.tsx
- frontend/src/admin/AdminDashboardPage.tsx
- frontend/src/admin/AdminUsersListPage.tsx
- frontend/src/admin/AdminUserDetailPage.tsx
- frontend/src/admin/AdminSitesPage.tsx
- frontend/src/admin/AdminCashRegistersPage.tsx
- frontend/src/admin/AdminSessionManagerPage.tsx
- frontend/src/admin/AdminReportsPage.tsx
- frontend/src/admin/AdminDashboardPage.test.tsx
- frontend/src/admin/AdminUsersListPage.test.tsx
- frontend/src/admin/AdminUserDetailPage.test.tsx

### Change Log

- 2026-02-28 - Validation SM: story revue contre la checklist create-story; contexte dev clarifie (garde-fou App.tsx/shell) et references completees.
- 2026-02-28 - Execution dev-story: scope Reception + Admin1 implemente (shell partage + harmonisation layout), tests cibles/build/audit dependances executes; statut passe a `in-progress` en attente de preuves visuelles et mini audit (HITL).
- 2026-02-28 - Reprise HITL Task 5: preuves visuelles (manifest + annexe mini audit) completees pour Reception + Admin1, AC3 validee, statut passe a `review`.
- 2026-02-28 - Code review adversarial BMAD (QA): verdict `changes-requested`; statut repasse a `in-progress` en attente de correction des ecarts de tracabilite/scope et stabilisation des tests (warnings React act).
- 2026-02-28 - Addressed code review findings - 2 items resolved (HIGH perimetre/tracabilite, MEDIUM stabilite tests React act), statut repasse a `review`.
- 2026-02-28 - Code review adversarial BMAD final (QA): corrections verifiees (tests admin cibles, build, audit, preuves lot), verdict `approved`, statut passe a `done`.

## Senior Developer Review (AI)

### Reviewer

- Reviewer: bmad-qa
- Date: 2026-02-28
- Outcome: Changes Requested

### Findings

#### HIGH

1. **Derive de perimetre non prouvable (AC2/perimetre strict non verifiable)**
   - Le lot est annonce strictement "Reception + Admin1 (hors exclusions)", mais l'etat git contient de nombreux changements hors perimetre de la story (`frontend/src/auth/*`, `frontend/src/caisse/*`, `frontend/src/admin/AdminCategoriesPage.tsx`, `api/*`), sans isolation explicite.
   - Impact: impossible de verifier de facon fiable que la story respecte strictement son scope.
   - Action requise: isoler le diff de la story (branch/commit propre ou liste de fichiers de lot exhaustive et justifiee), puis rejouer la revue.

2. **Traçabilite story vs realite git insuffisante**
   - La `File List` de la story ne reflete pas l'ensemble des fichiers modifies visibles dans git pour la branche de travail.
   - Impact: audit incomplet et difficulte a certifier AC1/AC2/AC4 sans ambiguite.
   - Action requise: mettre a jour la `File List` avec un perimetre exact de la story (ou expliciter clairement les changements hors story a ignorer).

#### MEDIUM

3. **Warnings tests React (`act(...)`) sur la batterie cible**
   - Les tests cibles passent, mais plusieurs warnings `An update ... was not wrapped in act(...)` apparaissent (notamment `AdminDashboardPage`, `AdminUsersListPage`, `AdminUserDetailPage`).
   - Impact: fiabilite de test perfectible et risque de faux positifs/flakiness.
   - Action requise: envelopper les updates async attendues via helpers RTL (`findBy*`, `waitFor`, interactions user-event correctement attendues), pour obtenir une sortie de tests propre.

### Validation AC

- AC1: **Partiel** (corrections visuelles observees sur les fichiers cibles, mais non certifiables globalement a cause de la derive/perimetre git non isole).
- AC2: **Partiel** (exclusions declarees dans les preuves, mais verification stricte de scope bloquee par l'etat git melange).
- AC3: **OK** (manifest + annexe de mini audit presents).
- AC4: **OK** (reutilisation `AppShell` / `PageContainer` constatee).
- AC5: **Partiel** (build/tests/audit OK, mais warnings React tests a corriger pour gate qualite robuste).

### Re-review final apres corrections

- Reviewer: bmad-qa
- Date: 2026-02-28
- Outcome: Approved

#### Validation de correction

1. **Perimetre et tracabilite de lot explicites**  
   - Story et artefacts de preuves explicitent le perimetre valide de cette story (Reception + Admin1) et les exclusions (`pin login`, `users pending`, `permissions`), avec mention claire des changements hors lot a ignorer pour l'audit AC.
2. **Stabilisation des tests admin corrigee**  
   - Verification executee sur la batterie cible: `AdminDashboardPage.test.tsx`, `AdminUsersListPage.test.tsx`, `AdminUserDetailPage.test.tsx` -> **13/13 tests OK**, sans warning React `act(...)`.
3. **Gate technique lot valide**  
   - `npm run build` frontend: OK.
   - `npm audit --audit-level=high` frontend: 0 vulnerabilite.

#### Validation AC finale

- AC1: **OK**
- AC2: **OK**
- AC3: **OK**
- AC4: **OK**
- AC5: **OK**
