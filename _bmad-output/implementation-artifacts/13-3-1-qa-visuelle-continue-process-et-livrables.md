# Story 13.3.1: QA visuelle continue - process et livrables

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

En tant qu'organisation,  
je veux un process QA visuelle standardise pour chaque livraison UI,  
afin que chaque story produise les memes preuves et soit reprise facilement.

## Acceptance Criteria

1. **Etant donne** le gate qualite Epic 11 defini, **quand** une story visuelle est livree, **alors** `npm run build`, les tests UI co-loces, les captures avant/apres et un mini audit visuel de domaine sont executes.
2. **Et** les livrables QA sont complets, verifiables et homogenes d'une story a l'autre: manifest de preuves, annexe d'audit, traces de verification technique et decision de cloture explicite.
3. **Et** la structure de preuves est standardisee (nomenclature, emplacements, perimetre par domaine/ecran) pour permettre une reprise rapide par un autre agent sans ambiguite.
4. **Et** le process QA conserve les exclusions validees Epic 11 (`pin login`, `users pending`, `permissions`) et exige la declaration explicite des ecarts residuels acceptes.
5. **Et** la definition de done d'une story visuelle inclut le gate complet (build/tests/preuves/audit), avec blocage tant qu'un ecart critique/majeur non accepte reste ouvert dans le scope traite.

## Tasks / Subtasks

- [x] Task 1 - Formaliser le process QA visuelle standard pour les stories UI (AC: 1, 2, 5)
  - [x] Definir la sequence unique d'execution (build, tests co-loces, captures avant/apres, mini audit, cloture).
  - [x] Definir les points de blocage et les conditions de passage a `review` puis `done`.
  - [x] Aligner la definition de done avec le gate qualite Epic 11.
- [x] Task 2 - Standardiser les livrables et la tracabilite de preuves (AC: 2, 3)
  - [x] Definir le format minimal du manifest de preuves (`*.json`) par domaine/ecran (`story`, `domaine`, `ecran`, `route`, `captures.avant`, `captures.apres`, `ecarts`, `decision`).
  - [x] Definir le format minimal de l'annexe d'audit (`*-annexe.md`) avec au minimum: perimetre, ecarts classes (critique/majeur/mineur), justification des ecarts acceptes, decision de cloture.
  - [x] Definir la nomenclature des captures et l'arborescence de stockage dans `_bmad-output/implementation-artifacts/screenshots/11-0/`.
- [x] Task 3 - Integrer les garde-fous de scope Epic 11 dans le process (AC: 3, 4, 5)
  - [x] Rendre obligatoire la declaration du scope inclus/exclu pour chaque lot visuel.
  - [x] Verifier explicitement le respect des exclusions (`pin login`, `users pending`, `permissions`).
  - [x] Exiger la trace des ecarts residuels (critique/majeur/mineur) et leur statut d'acceptation.
- [x] Task 4 - Outiller la reutilisation dans les stories futures (AC: 2, 3)
  - [x] Ajouter un canevas de completion notes QA visuelle reutilisable dans la story.
  - [x] Ajouter un canevas de `File List` orientee preuves (story, manifest, annexe, captures, ecrans touches) avec convention de nommage (`<story_key>-audit-<domaine>-preuves.json`, `<story_key>-audit-<domaine>-annexe.md`).
  - [x] Documenter le protocole de reprise entre agents (ce qui doit exister pour qu'un handoff soit immediat).
- [x] Task 5 - Valider le process sur le lot precedent comme reference (AC: 1, 2, 5)
  - [x] Rejouer le process cible sur les artefacts du lot 13.2.3 pour verifier la couverture complete.
  - [x] Confirmer que les preuves sont exploitables sans contexte implicite (lecture seule des artefacts).
  - [x] Lister les ecarts de process constates et les corrections a appliquer avant 13.3.2.

## Dev Notes

- Cette story ne corrige pas d'ecran UI directement: elle produit un **process operatoire QA visuelle** reutilisable sur les stories de remediation.
- Prerequis directs: stories 13.1.1/13.1.2 (socle visuel) et 13.2.1/13.2.2/13.2.3 (lots corriges) deja terminees.
- Story suivante dependante: 13.3.2 (enforcement et non-regression), qui s'appuie sur le process/livrables definis ici.
- Objectif principal: transformer les pratiques QA ad hoc en protocole stable, reproductible et audit-able.
- Gate qualite a appliquer strictement: build OK, tests co-loces OK, preuves avant/apres, mini audit domaine, aucun ecart critique/majeur ouvert non accepte.
- Conserver la discipline Epic 11: parite 1.4.4, pas de redesign libre, pas de patch opportuniste.
- Exclusions hors scope correctif visuel prioritaire a maintenir: `pin login`, `users pending`, `permissions`.
- Standardisation attendue: reutiliser le schema de preuves deja applique sur les lots 13.2.x (manifest JSON + annexe markdown + captures avant/apres) et ne pas inventer un format parallel.
- Traces techniques minimales attendues dans les completion notes des stories visuelles: commande executee, resultat (`OK`/`KO`), et perimetre couvert pour `npm run build`, tests UI co-loces et verification navigateur.

### Project Structure Notes

- Story et process: `_bmad-output/implementation-artifacts/`.
- Statut sprint: `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- Preuves visuelles: `_bmad-output/implementation-artifacts/screenshots/11-0/<domaine>/`.
- Convention tests frontend: tests co-loces `*.test.tsx` avec Vitest + React Testing Library + jsdom.
- UI/styling: Mantine uniquement (pas d'introduction d'une nouvelle librairie UI).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#story-13-3-1-qa-visuelle-continue-process-et-livrables]
- [Source: _bmad-output/planning-artifacts/epics.md#epic-13-remediation-visuelle-pixel-perfect-1-4-4]
- [Source: _bmad-output/implementation-artifacts/13-2-3-remediation-visuelle-lot-admin2-admin3-categories-hors-exclusions.md]
- [Source: _bmad-output/implementation-artifacts/13-2-1-audit-auth-caisse-preuves.json]
- [Source: _bmad-output/implementation-artifacts/13-2-1-audit-auth-caisse-annexe.md]
- [Source: _bmad-output/implementation-artifacts/13-2-2-audit-reception-admin1-preuves.json]
- [Source: _bmad-output/implementation-artifacts/13-2-2-audit-reception-admin1-annexe.md]
- [Source: _bmad-output/implementation-artifacts/13-2-3-audit-admin2-admin3-preuves.json]
- [Source: _bmad-output/implementation-artifacts/13-2-3-audit-admin2-admin3-annexe.md]
- [Source: _bmad-output/implementation-artifacts/11-x-point-de-verite-parite-v1.4.4.md]
- [Source: _bmad-output/implementation-artifacts/11-x-charte-visuelle-operatoire.md]
- [Source: _bmad-output/implementation-artifacts/11-x-guide-refactor-propre.md]
- [Source: _bmad-output/implementation-artifacts/11-x-gate-qualite-epic11.md]
- [Source: references/ancien-repo/checklist-import-1.4.4.md]
- [Source: _bmad-output/planning-artifacts/architecture.md#implementation-readiness-validation]
- [Source: _bmad-output/planning-artifacts/architecture.md#gap-analysis-results]
- [Source: _bmad-output/planning-artifacts/architecture.md#implementation-handoff]
- [Source: references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md]
- [Source: .cursor/rules/epic11-parite-et-refactor-propre.mdc]

## Dev Agent Record

### Agent Model Used

GPT-5.3 Codex (bmad-dev)

### Debug Log References

- Workflow create-story: `_bmad/bmm/workflows/4-implementation/create-story/`
- Validation appliquee: checklist `create-story/checklist.md` (adaptation BMAD locale non interactive).
- Sources chargees: `epics.md`, `sprint-status.yaml`, stories 13.2.2/13.2.3, artefacts Epic 11, architecture (readiness/gap/handoff), checklist v0.1.
- Workflow dev-story: `_bmad/bmm/workflows/4-implementation/dev-story/`.
- Validation technique executee:
  - `npm run build` (`frontend/`) -> OK
  - `npm run test:run -- src/admin/AdminReceptionPage.test.tsx src/admin/AdminHealthPage.test.tsx src/admin/AdminAuditLogPage.test.tsx src/admin/AdminEmailLogsPage.test.tsx src/admin/AdminSettingsPage.test.tsx src/admin/AdminDbPage.test.tsx src/admin/AdminImportLegacyPage.test.tsx src/admin/AdminGroupsPage.test.tsx src/admin/AdminCategoriesPage.test.tsx src/admin/AdminQuickAnalysisPage.test.tsx` -> 30/30 OK

### Completion Notes List

- 2026-02-28 - Story creee via workflow create-story BMAD pour Epic 13.
- 2026-02-28 - Story 13.3.1 preparee avec focus process QA visuelle et standardisation des livrables.
- 2026-02-28 - Checklist create-story appliquee: AC actionnables, taches detaillees, garde-fous scope/exclusions, references completees.
- 2026-02-28 - Statut cible confirme: `ready-for-dev`.
- 2026-02-28 - Validation checklist create-story rejouee: formats de livrables (manifest/annexe), convention de nommage des preuves et traces techniques minimales explicitees.
- 2026-02-28 - Process operatoire QA visuelle formalise dans `_bmad-output/implementation-artifacts/13-3-1-qa-visuelle-process-standard.md`: sequence unique, gates de passage (`review`/`done`), blocages et definition of done alignee Epic 11.
- 2026-02-28 - Canevas standardises publies: manifest `_bmad-output/implementation-artifacts/13-3-1-qa-visuelle-canevas-preuves.json` et annexe `_bmad-output/implementation-artifacts/13-3-1-qa-visuelle-canevas-annexe.md`.
- 2026-02-28 - Garde-fous de scope integres au process: declaration obligatoire inclus/exclu, verification explicite des exclusions (`pin login`, `users pending`, `permissions`), tracabilite des ecarts residuels avec statut d'acceptation.
- 2026-02-28 - Reutilisation outillee pour stories futures: canevas completion notes QA visuelle, canevas File List orientee preuves et protocole de handoff immediat entre agents.
- 2026-02-28 - Rejeu de reference realise sur le lot 13.2.3 dans `_bmad-output/implementation-artifacts/13-3-1-qa-visuelle-rejeu-lot-13-2-3.md`: couverture gate complete validee, preuves exploitables en lecture seule, ecarts de process identifies avec corrections pre-13.3.2.
- 2026-02-28 - Validation technique gate QA tracee pour cette story: `npm run build` OK et suite de tests UI co-loces Admin (10 fichiers, 30 tests) OK.
- 2026-02-28 - ✅ Resolved review finding [HIGH]: preuve APRES normalisee en regle stricte (obligatoire par ecran du `scope_inclus`, blocage si manquante).
- 2026-02-28 - ✅ Resolved review finding [MEDIUM]: chemins de captures unifies en forme canonique absolue sous `_bmad-output/implementation-artifacts/...` avec separation explicite AVANT (`11-0`) vs APRES (`<story_key>`).
- 2026-02-28 - ✅ Resolved review finding [MEDIUM]: matrice de mapping legacy -> schema cible ajoutee et imposee (`conforme`, `conforme-avec-residuel-accepte`, `non-conforme-bloquant`).

### File List

- _bmad-output/implementation-artifacts/13-3-1-qa-visuelle-continue-process-et-livrables.md
- _bmad-output/implementation-artifacts/13-3-1-qa-visuelle-process-standard.md
- _bmad-output/implementation-artifacts/13-3-1-qa-visuelle-canevas-preuves.json
- _bmad-output/implementation-artifacts/13-3-1-qa-visuelle-canevas-annexe.md
- _bmad-output/implementation-artifacts/13-3-1-qa-visuelle-rejeu-lot-13-2-3.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Senior Developer Review (AI)

### Reviewer

- Reviewer: bmad-qa
- Date: 2026-02-28
- Outcome: Changes Requested

### Findings

1. **HIGH - AC1 est ambigu et non strictement enforceable.** L'AC exige captures avant/apres executees pour toute story visuelle, mais le process autorise un mode alternatif sans captures apres (`before-captures-plus-hitl-replay`). Cette divergence rend la definition de done non deterministe entre stories.
2. **MEDIUM - Nomenclature/emplacements de captures non totalement coherents.** Le process melange `screenshots/<story_key>/<domaine>/` et `_bmad-output/implementation-artifacts/screenshots/<story_key>/<domaine>/`, alors que la task de standardisation cite explicitement `.../screenshots/11-0/`. Ce triple cadrage peut casser une reprise agent sans interpretation.
3. **MEDIUM - Homogeneite inter-story insuffisamment verrouillee sur les statuts de decision.** Le canevas 13.3.1 impose `go-review|blocked`, mais les artefacts de reference 13.2.3 utilisent aussi `ok-hitl`, `pass_with_accepted_residuals`, `ok|partiel|blocked`. Sans table de correspondance obligatoire, l'AC2 "homogene d'une story a l'autre" n'est que partiellement atteint.

### AC Coverage

- AC1: PARTIAL
- AC2: PARTIAL
- AC3: IMPLEMENTED
- AC4: IMPLEMENTED
- AC5: PARTIAL

### Required Follow-ups (AI Review)

- [x] [AI-Review][HIGH] Ajouter une regle normative unique sur la preuve "apres": soit captures apres obligatoires, soit exception formalisee dans l'AC avec conditions strictes et champs obligatoires.
- [x] [AI-Review][MEDIUM] Unifier partout le chemin canonique des captures (forme absolue sous `_bmad-output/implementation-artifacts/...`) et corriger la mention `11-0` pour distinguer clairement AVANT reference vs APRES lot.
- [x] [AI-Review][MEDIUM] Ajouter une matrice de mapping des statuts de decision/resultat (`ok-hitl`, `pass_with_accepted_residuals`, `go-review`, etc.) et imposer le schema cible pour toutes les stories suivantes.

### Reviewer

- Reviewer: bmad-qa
- Date: 2026-02-28
- Outcome: Approved

### Findings

Aucun finding HIGH/MEDIUM restant sur le scope de cette story apres verification des corrections.

### AC Coverage

- AC1: IMPLEMENTED
- AC2: IMPLEMENTED
- AC3: IMPLEMENTED
- AC4: IMPLEMENTED
- AC5: IMPLEMENTED

## Change Log

- 2026-02-28: Implementation dev-story completee pour 13.3.1 (process QA visuelle standard + canevas preuves/annexe + protocole handoff + rejeu de reference 13.2.3).
- 2026-02-28: Story passee en `review` apres validation du gate technique (`npm run build`, tests UI co-loces cibles).
- 2026-02-28: Code review adversarial BMAD (bmad-qa) - outcome `changes-requested`, status repasse `in-progress`, follow-ups QA process ajoutes.
- 2026-02-28: Addressed code review findings - 3 items resolved (preuve APRES stricte, chemins captures canoniques, matrice de mapping statuts inter-stories) et statut repasse `review`.
- 2026-02-28: Code review adversarial de verification apres corrections (bmad-qa) - outcome `approved`, AC1..AC5 valides, statut passe a `done`.
