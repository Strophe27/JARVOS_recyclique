# Story 13.1.2: Socle visuel - tokens et composants UI cles

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

En tant qu'equipe produit,  
je veux un jeu de tokens visuels et des composants UI cles normalises,  
afin d'eviter les variations de couleurs/typo/spacing et les patchs repetitifs.

## Acceptance Criteria

1. **Etant donne** le shell global stabilise (Story 13.1.1), **quand** les tokens et composants cles (boutons, champs, tables, alertes, modales) sont harmonises, **alors** les ecrans Epic 11 reutilisent les memes briques visuelles partagees avec un rendu homogene aligne 1.4.4.
2. **Et** les styles inline opportunistes sont elimines du perimetre traite, avec centralisation des valeurs de couleurs, typo, spacing, radius, bordures et ombres dans le theme/shared.
3. **Et** la refonte respecte `copy + consolidate + security` (tracabilite sources 1.4.4, pas de duplication de logique, aucun secret/hack introduit).
4. **Et** la definition de done visuelle est respectee pour le scope story: build frontend OK, tests UI co-loces des composants touches OK, preuves avant/apres preparables, aucun ecart critique/majeur restant sur le perimetre cible.

## Tasks / Subtasks

- [x] Task 1 - Cadrer les tokens cibles et l'inventaire des ecarts (AC: 1, 2)
  - [x] Identifier les tokens de reference 1.4.4 (couleurs, typographie, espacements, radius, bordures, ombres).
  - [x] Comparer les tokens existants et formaliser les deltas prioritaires dans `shared/theme`.
  - [x] Verifier que les exclusions validees (`pin login`, `users pending`, `permissions`) restent hors scope correctif prioritaire.
- [x] Task 2 - Normaliser les tokens dans la couche partagee (AC: 1, 2)
  - [x] Centraliser les constantes visuelles dans le theme/shared sans multiplier les variantes locales.
  - [x] Supprimer/remplacer les valeurs hardcodees recurrentes dans le perimetre traite.
  - [x] Prioriser les points d'entree `frontend/src/shared/theme` et `frontend/src/shared/styles` (ou equivalent existant) avant toute modification domaine.
  - [x] Garantir la compatibilite avec le shell 13.1.1 et les domaines Epic 11 (Auth, Caisse, Reception, Admin).
- [x] Task 3 - Unifier les composants UI cles reutilisables (AC: 1, 2)
  - [x] Harmoniser les variantes de boutons (primaire/secondaire/danger/disabled) sur les memes regles de style.
  - [x] Harmoniser champs de formulaire (normal/focus/erreur), tables (header/lignes/hover/pagination), alertes/messages et modales/drawers.
  - [x] Refactorer en priorite les composants deja partages (`frontend/src/shared/ui` ou equivalent) avant de creer toute nouvelle abstraction.
  - [x] Prioriser la reutilisation de composants partages plutot que des duplications par domaine.
- [x] Task 4 - Appliquer la discipline import/refactor propre (AC: 3)
  - [x] **Copy**: tracer les sources legacy 1.4.4 utilisees pour tokens/composants.
  - [x] **Consolidate**: verifier l'absence de doublons et l'alignement architecture frontend existante.
  - [x] **Security**: verifier absence de secrets, URL sensibles ou contournements temporaires.
- [x] Task 5 - Verifier qualite, preuves et handoff (AC: 4)
  - [x] Executer `npm run build` dans `frontend/` et corriger les erreurs avant handoff.
  - [x] Ajouter/mettre a jour les tests co-loces `*.test.tsx` (Vitest + RTL + jsdom) sur les composants tokenises touches.
  - [x] Preparer les preuves avant/apres pour ecrans representatifs et noter explicitement les ecarts residuels s'il y en a.

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Ajouter une harmonisation explicite `Drawer` dans le theme partage.
- [x] [AI-Review][HIGH] Harmoniser explicitement les variantes de boutons primaire/secondaire/danger/disabled dans `mantineTheme`.
- [x] [AI-Review][MEDIUM] Supprimer les duplications hardcodees de tokens entre `tokens.ts`, `global.css` et `mantineTheme.ts`.
- [x] [AI-Review][MEDIUM] Completer la `File List` pour refleter tous les fichiers reellement modifies (incluant `frontend/src/shared/layout/index.ts`).

## Dev Notes

- Cette story est la suite directe de `13-1-1`: le shell etant stabilise, on verrouille maintenant les tokens et primitives UI pour eviter les regressions visuelles en cascade dans `13-2-x`.
- Reutiliser le socle shell existant (layout/navigation) sans le reouvrir: le scope ici est tokens + composants UI cles, pas une nouvelle iteration structurelle du shell.
- Objectif strict: parite 1.4.4 quasi pixel perfect, sans redesign libre.
- Regle anti-dette: pas de patch CSS opportuniste local; centraliser dans les briques partagees et reutiliser.
- UI/styling: rester sur Mantine + theme du projet; ne pas introduire de nouvelle librairie UI.
- Tests frontend: convention co-locee `*.test.tsx` avec Vitest + React Testing Library + jsdom.
- Build/gate: build frontend obligatoire avant passage en review/done; verifier aussi les preuves visuelles.
- Lecons 13.1.1 a preserver pendant les refactors UI: ne pas reintroduire les ecrans exclus (`pin login`, `users pending`, `permissions`) dans le scope correctif, maintenir le filtrage strict des items soumis a permissions, et conserver un etat actif de navigation stable sur sous-routes.

### Project Structure Notes

- Dossiers domaines: `frontend/src/auth`, `frontend/src/caisse`, `frontend/src/reception`, `frontend/src/admin`.
- Couche partagee a privilegier: `frontend/src/shared` (theme, composants UI communs, layout).
- Les tokens et composants normalises doivent etre exposes depuis `shared` pour consommation uniforme par les domaines Epic 11.
- Points d'entree preferentiels pour implementation: `frontend/src/shared/theme`, `frontend/src/shared/ui`, `frontend/src/shared/layout`, puis adaptation minimale dans les domaines consommateurs.
- Eviter toute duplication de composants quasi identiques entre domaines.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#story-13-1-2-socle-visuel-tokens-et-composants-ui-cles]
- [Source: _bmad-output/planning-artifacts/epics.md#epic-13-remediation-visuelle-pixel-perfect-1-4-4]
- [Source: _bmad-output/implementation-artifacts/13-1-1-socle-visuel-shell-global-bandeau-menu-layout.md]
- [Source: _bmad-output/implementation-artifacts/13-1-1-preuves-minimales-shell.md]
- [Source: _bmad-output/implementation-artifacts/11-x-point-de-verite-parite-v1.4.4.md]
- [Source: _bmad-output/implementation-artifacts/11-x-charte-visuelle-operatoire.md]
- [Source: _bmad-output/implementation-artifacts/11-x-guide-refactor-propre.md]
- [Source: _bmad-output/implementation-artifacts/11-x-gate-qualite-epic11.md]
- [Source: references/ancien-repo/checklist-import-1.4.4.md]
- [Source: _bmad-output/planning-artifacts/architecture.md#gap-analysis-results]
- [Source: _bmad-output/planning-artifacts/architecture.md#implementation-readiness-validation]
- [Source: _bmad-output/planning-artifacts/architecture.md#implementation-handoff]
- [Source: references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md]

## Dev Agent Record

### Agent Model Used

GPT-5.3 Codex (bmad-dev)

### Debug Log References

- Workflow cible: `_bmad/bmm/workflows/4-implementation/dev-story/`
- Sources lues: `sprint-status.yaml`, story `13-1-2`, references Epic 11 (point de verite, charte, gate, guide refactor), checklist import 1.4.4, architecture v0.1.
- Validations executees: `npm run test:run -- src/shared/theme/tokens.test.tsx src/shared/theme/mantineTheme.test.tsx src/admin/AdminCategoriesPage.test.tsx`, `npm run build` (frontend).
- Follow-up review execute: `npm run test:run -- src/shared/theme/tokens.test.tsx src/shared/theme/mantineTheme.test.tsx`, `npm run build` (frontend) + verification lints fichiers touches.

### Completion Notes List

- 2026-02-28 - Story creee via workflow create-story BMAD pour Epic 13.
- 2026-02-28 - Story structuree pour execution `dev-story` (tokens + composants UI cles) avec garde-fous de non-regression visuelle.
- 2026-02-28 - Statut cible: `ready-for-dev`.
- 2026-02-28 - Validation create-story appliquee: garde-fous anti-regression 13.1.1 explicites, points d'entree `shared` priorises, references de preuves shell ajoutees.
- 2026-02-28 - Ajout d'une couche `frontend/src/shared/theme` avec tokens centralises (couleurs, typo, espacements, radius, bordures, ombres), theme Mantine et variables CSS globales.
- 2026-02-28 - Harmonisation des composants UI critiques via `mantineTheme` (Button, TextInput, PasswordInput, Table, Alert, Modal, Card, Paper) applique globalement dans `main.tsx`.
- 2026-02-28 - Suppression d'un style inline opportuniste dans `AdminCategoriesPage` (indentation hierarchique maintenant basee sur token partage `getHierarchyIndentPx`).
- 2026-02-28 - Tests co-loces ajoutes pour les tokens/theme (`tokens.test.ts`, `mantineTheme.test.ts`) + build frontend valide.
- 2026-02-28 - Copy + Consolidate + Security verifies: alignement ref 1.4.4 trace dans les tokens, mutualisation sharee sans duplication de logique, aucun secret/URL sensible/hack introduit.
- 2026-02-28 - Preuves visuelles avant/apres: preparables sur les ecrans consommant AppShell/navigation et tables admin via la nouvelle base de tokens partagee; aucun ecart critique/majeur constate dans le perimetre technique touche.
- 2026-02-28 - ✅ Resolved review finding [HIGH]: harmonisation explicite `Drawer` ajoutee dans `mantineTheme` (parite modales/drawers).
- 2026-02-28 - ✅ Resolved review finding [HIGH]: variantes bouton explicites (primaire/secondaire/outline + danger + disabled) configurees au niveau theme partage.
- 2026-02-28 - ✅ Resolved review finding [MEDIUM]: centralisation tokens renforcee via `cssVariablesResolver` (source unique TS), retrait des duplications de `global.css`.
- 2026-02-28 - ✅ Resolved review finding [MEDIUM]: `File List` completee avec les fichiers reels du perimetre (dont `frontend/src/shared/layout/index.ts`) et alignement story/implementation.
- 2026-02-28 - Follow-up code-review termine: tests theme passes, build frontend OK, aucun lint sur fichiers modifies.

### File List

- _bmad-output/implementation-artifacts/13-1-2-socle-visuel-tokens-et-composants-ui-cles.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- frontend/src/main.tsx
- frontend/src/admin/AdminCategoriesPage.tsx
- frontend/src/shared/index.ts
- frontend/src/shared/layout/index.ts
- frontend/src/shared/layout/app-shell.css
- frontend/src/shared/theme/index.ts
- frontend/src/shared/theme/global.css
- frontend/src/shared/theme/mantineTheme.ts
- frontend/src/shared/theme/mantineTheme.test.tsx
- frontend/src/shared/theme/tokens.ts
- frontend/src/shared/theme/tokens.test.tsx

## Change Log

- 2026-02-28 - Story 13.1.2 implementee: centralisation des tokens et theme Mantine partage, harmonisation de composants UI critiques, suppression de style inline cible, et ajout de tests de non-regression pour la couche theme.
- 2026-02-28 - Code review adversarial BMAD: changements demandes (AC partiellement couverts + ecarts de tracabilite Story/Git).
- 2026-02-28 - Addressed code review findings - 4 items resolved (Drawer, variantes bouton explicites, centralisation tokens sans hardcode duplique, File List complete).
- 2026-02-28 - Re-review BMAD apres corrections: AC valides, tests theme passes, build frontend OK, verdict approuve.

## Senior Developer Review (AI)

### Decision

Approved

### Findings

Aucun point HIGH/MEDIUM restant sur le scope story apres verification adversariale des corrections precedentes.

Points verifies:

1. Harmonisation `Drawer` explicite ajoutee dans le theme partage (`frontend/src/shared/theme/mantineTheme.ts`).
2. Variantes bouton primaire/secondaire/outline + danger + disabled explicites dans le theme partage (`frontend/src/shared/theme/mantineTheme.ts`).
3. Centralisation tokens consolidee via `cssVariablesResolver` et `global.css` basee sur variables CSS partagees (`frontend/src/shared/theme/mantineTheme.ts`, `frontend/src/shared/theme/global.css`, `frontend/src/shared/theme/tokens.ts`).
4. Tracabilite story/file list alignee sur les fichiers du perimetre frontend modifies.

### Validation Notes

- Tests verifies pendant review:
  - `npm run test:run -- src/shared/theme/tokens.test.tsx src/shared/theme/mantineTheme.test.tsx` ✅
- Build verifie:
  - `npm run build` ✅ (warning bundle size > 500 kB, non bloquant pour cette story)
