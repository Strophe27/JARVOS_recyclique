# Story 13.3.2: QA visuelle continue - enforcement et non-regression

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

En tant qu'organisation,  
je veux un mecanisme d'enforcement systematique avant validation finale,  
afin de bloquer les regressions visuelles et maintenir la parite dans le temps.

## Acceptance Criteria

1. **Etant donne** le process QA visuelle defini (story 13.3.1), **quand** un lot visuel est propose en `done`, **alors** la validation est refusee automatiquement si un ecart `critique` ou `majeur` non accepte subsiste dans le scope traite.
2. **Et** toute regression detectee est tracee avec un plan d'action correctif explicite avant cloture du lot (owner, action, statut, preuve cible).
3. **Et** le gate d'enforcement applique strictement les preconditions techniques minimales (`npm run build` OK, tests UI co-loces OK, preuves AVANT/APRES completes et resolubles).
4. **Et** les decisions de cloture restent homogenes via le schema normalise 13.3.1 (`conforme`, `conforme-avec-residuel-accepte`, `non-conforme-bloquant` + `go-review|blocked`).
5. **Et** les exclusions Epic 11 (`pin login`, `users pending`, `permissions`) sont preservees et verifiees explicitement dans les artefacts QA.
6. **Et** les artefacts d'enforcement imposent les chemins canoniques de preuves (`_bmad-output/implementation-artifacts/screenshots/11-0/...` pour AVANT, `_bmad-output/implementation-artifacts/screenshots/<story_key>/...` pour APRES), sans chemins relatifs courts.

## Tasks / Subtasks

- [x] Task 1 - Formaliser la regle d'enforcement finale du gate QA visuelle (AC: 1, 3, 4)
  - [x] Declarer les conditions bloquantes minimales (build, tests, preuves, ecarts severes non acceptes).
  - [x] Definir le moment exact de controle (avant passage `review`, avant passage `done`).
  - [x] Verrouiller la decision finale via les statuts normalises (`go-review|blocked`).
- [x] Task 2 - Imposer la non-regression comme condition de cloture (AC: 1, 2)
  - [x] Definir le protocole de detection de regression visuelle par lot.
  - [x] Exiger une trace corrective pour toute regression (description, severite, action, responsable, preuve attendue).
  - [x] Interdire la cloture tant qu'une regression critique/majeure reste ouverte sans acceptation explicite.
- [x] Task 3 - Aligner les artefacts preuves/annexe avec enforcement (AC: 2, 4, 5)
  - [x] Mettre a jour le schema de preuve pour porter le statut de blocage et l'action corrective.
  - [x] Verifier la presence explicite de `scope_inclus`, `scope_exclu`, et `verification_exclusions`.
  - [x] Garantir la coherence des chemins canoniques AVANT/APRES dans les manifests et annexes.
  - [x] Imposer le mapping legacy vers schema cible (`ok|pass|partiel|ok-hitl|pass_with_accepted_residuals|blocked`) pour les rejoues historiques.
- [x] Task 4 - Integrer l'enforcement dans le flux story (AC: 1, 3, 4)
  - [x] Ajouter une checklist d'entree en `review` et de sortie en `done` basee sur le gate.
  - [x] Definir le comportement attendu en cas de KO (story reste `in-progress` + blocage documente).
  - [x] Ajouter un canevas de completion notes orientee enforcement et non-regression.
  - [x] Exiger que les completion notes tracent au minimum `Commande`, `Resultat`, `Perimetre`, `Preuves`, `Decision`.
- [x] Task 5 - Verifier l'applicabilite sur les lots visuels recents (AC: 1, 2, 3, 4)
  - [x] Rejouer le gate sur un lot deja livre (13.2.x ou 13.3.1) pour confirmer la faisabilite.
  - [x] Confirmer que le mecanisme empeche effectivement les faux positifs de cloture.
  - [x] Lister les ajustements restants avant generalisation et tracer leur statut de traitement.

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Outiller un mecanisme executable de refus automatique review/done.
- [x] [AI-Review][HIGH] Fournir un rejeu 13-2-3 avec manifest enforcement complet et chemins APRES resolubles ecran par ecran.
- [x] [AI-Review][MEDIUM] Aligner la coherence taches done vs ajustements restants (statuts explicites).
- [x] [AI-Review][MEDIUM] Completer la tracabilite Story/File List avec les artefacts reels.

## Dev Notes

- Story precedente dependante: `13-3-1-qa-visuelle-continue-process-et-livrables` (done), qui fixe le process standard, les statuts normalises et les canevas.
- Cette story renforce le **controle de passage** (`review` puis `done`), elle n'a pas pour but principal de corriger des ecrans metier.
- Le gate d'enforcement doit rester aligne avec la doctrine Epic 11: parite 1.4.4, pas de redesign libre, pas de patch opportuniste.
- La preuve APRES par ecran du `scope_inclus` reste obligatoire; toute absence = blocage.
- Les regressions doivent etre traitees comme des ecarts de qualite avec action corrective planifiee avant cloture.
- Les exclusions officielles (`pin login`, `users pending`, `permissions`) restent hors scope correctif prioritaire, mais leur verification explicite est obligatoire dans les artefacts.
- Traces techniques minimales attendues dans la story de livraison: commande executee, resultat (`OK`/`KO`), perimetre couvert, decision finale.
- Reutiliser strictement les standards 13.3.1 (process standard + canevas preuves/annexe) et ne pas introduire un format parallele d'artefacts QA.

### Project Structure Notes

- Story et artefacts QA: `_bmad-output/implementation-artifacts/`.
- Statut sprint: `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- Process de reference: `_bmad-output/implementation-artifacts/13-3-1-qa-visuelle-process-standard.md`.
- Canevas de preuves: `_bmad-output/implementation-artifacts/13-3-1-qa-visuelle-canevas-preuves.json`.
- Canevas d'annexe: `_bmad-output/implementation-artifacts/13-3-1-qa-visuelle-canevas-annexe.md`.
- Captures AVANT baseline: `_bmad-output/implementation-artifacts/screenshots/11-0/<domaine>/`.
- Captures APRES lot: `_bmad-output/implementation-artifacts/screenshots/<story_key>/<domaine>/`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#story-13-3-2-qa-visuelle-continue-enforcement-et-non-regression]
- [Source: _bmad-output/planning-artifacts/epics.md#epic-13-remediation-visuelle-pixel-perfect-1-4-4]
- [Source: _bmad-output/implementation-artifacts/13-3-1-qa-visuelle-continue-process-et-livrables.md]
- [Source: _bmad-output/implementation-artifacts/13-3-1-qa-visuelle-process-standard.md]
- [Source: _bmad-output/implementation-artifacts/13-3-1-qa-visuelle-canevas-preuves.json]
- [Source: _bmad-output/implementation-artifacts/13-3-1-qa-visuelle-canevas-annexe.md]
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

- Workflow create-story: `_bmad/bmm/workflows/4-implementation/create-story/`
- Validation appliquee: `_bmad/bmm/workflows/4-implementation/create-story/checklist.md`
- Inputs principaux: `epics.md`, `sprint-status.yaml`, artefacts Epic 11, process 13.3.1
- Workflow dev-story: `_bmad/bmm/workflows/4-implementation/dev-story/`
- Validation technique executee:
  - `npm run build` (`frontend/`) -> OK
  - `npm run test:run -- src/admin/AdminReceptionPage.test.tsx src/admin/AdminHealthPage.test.tsx src/admin/AdminAuditLogPage.test.tsx src/admin/AdminEmailLogsPage.test.tsx src/admin/AdminSettingsPage.test.tsx src/admin/AdminDbPage.test.tsx src/admin/AdminImportLegacyPage.test.tsx src/admin/AdminGroupsPage.test.tsx src/admin/AdminCategoriesPage.test.tsx src/admin/AdminQuickAnalysisPage.test.tsx` -> 30/30 OK
  - `python _bmad-output/implementation-artifacts/tools/qa_visuelle_enforcement_gate.py --manifest _bmad-output/implementation-artifacts/13-3-2-qa-visuelle-rejeu-enforcement-lot-13-2-3-preuves.json --stage review` -> KO attendu (exit 2, `decision=blocked`)
  - `python _bmad-output/implementation-artifacts/tools/qa_visuelle_enforcement_gate.py --manifest _bmad-output/implementation-artifacts/13-3-2-qa-visuelle-rejeu-enforcement-lot-13-2-3-preuves.json --stage done` -> KO attendu (exit 2, `decision=blocked`)

### Completion Notes List

- 2026-02-28 - Story creee via workflow create-story BMAD pour Epic 13, prete pour implementation (`ready-for-dev`).
- 2026-02-28 - Validation create-story appliquee: AC d'enforcement completes (chemins canoniques), taches renforcees (mapping legacy + traces minimales), dev notes alignees sur les standards 13.3.1.
- 2026-02-28 - Process d'enforcement formalise dans `_bmad-output/implementation-artifacts/13-3-2-qa-visuelle-enforcement-standard.md` (conditions bloquantes, timing review/done, checklist gate, comportement KO).
- 2026-02-28 - Canevas enforcement publies et alignes 13.3.1: `_bmad-output/implementation-artifacts/13-3-2-qa-visuelle-canevas-preuves-enforcement.json` et `_bmad-output/implementation-artifacts/13-3-2-qa-visuelle-canevas-annexe-enforcement.md`.
- 2026-02-28 - Non-regression imposee avec plan d'action correctif obligatoire par regression (owner/action/statut/preuve cible) et blocage automatique en cas de regression critique/majeure ouverte.
- 2026-02-28 - Rejeu enforcement effectue sur lot `13-2-3` dans `_bmad-output/implementation-artifacts/13-3-2-qa-visuelle-rejeu-enforcement-lot-13-2-3.md`; faux positif de cloture correctement bloque (regression majeure ouverte avec correctif non cloture).
- 2026-02-28 - Preconditions techniques gate tracees sur cette story: build frontend OK + suite de tests UI co-loces admin OK (10 fichiers, 30 tests).
- 2026-02-28 - [AI-Review][HIGH] Mecanisme executable ajoute via `qa_visuelle_enforcement_gate.py` avec refus automatique machine (`exit 2`) quand le gate calcule `blocked`.
- 2026-02-28 - [AI-Review][HIGH] Rejeu 13-2-3 complete avec manifest enforcement normalise (`13-3-2-qa-visuelle-rejeu-enforcement-lot-13-2-3-preuves.json`) et chemins APRES resolubles ecran par ecran.
- 2026-02-28 - [AI-Review][MEDIUM] Ajustements restants convertis en statut explicite (fait/open/accepted) dans le rejeu 13-2-3.
- 2026-02-28 - [AI-Review][MEDIUM] Traçabilite completee: mise a jour File List et etat agent.

### File List

- _bmad-output/implementation-artifacts/13-3-2-qa-visuelle-continue-enforcement-et-non-regression.md
- _bmad-output/implementation-artifacts/13-3-2-qa-visuelle-enforcement-standard.md
- _bmad-output/implementation-artifacts/13-3-2-qa-visuelle-canevas-preuves-enforcement.json
- _bmad-output/implementation-artifacts/13-3-2-qa-visuelle-canevas-annexe-enforcement.md
- _bmad-output/implementation-artifacts/13-3-2-qa-visuelle-rejeu-enforcement-lot-13-2-3.md
- _bmad-output/implementation-artifacts/13-3-2-qa-visuelle-rejeu-enforcement-lot-13-2-3-preuves.json
- _bmad-output/implementation-artifacts/tools/qa_visuelle_enforcement_gate.py
- _bmad-output/implementation-artifacts/13-3-2-qa-visuelle-continue-enforcement-et-non-regression.agent-state.json
- _bmad-output/implementation-artifacts/screenshots/13-2-3-remediation-visuelle-lot-admin2-admin3-categories-hors-exclusions/admin-2/admin2-after-01-reception-sessions.png
- _bmad-output/implementation-artifacts/screenshots/13-2-3-remediation-visuelle-lot-admin2-admin3-categories-hors-exclusions/admin-2/admin2-after-02-health.png
- _bmad-output/implementation-artifacts/screenshots/13-2-3-remediation-visuelle-lot-admin2-admin3-categories-hors-exclusions/admin-2/admin2-after-03-audit-log.png
- _bmad-output/implementation-artifacts/screenshots/13-2-3-remediation-visuelle-lot-admin2-admin3-categories-hors-exclusions/admin-2/admin2-after-04-email-logs.png
- _bmad-output/implementation-artifacts/screenshots/13-2-3-remediation-visuelle-lot-admin2-admin3-categories-hors-exclusions/admin-2/admin2-after-05-settings.png
- _bmad-output/implementation-artifacts/screenshots/13-2-3-remediation-visuelle-lot-admin2-admin3-categories-hors-exclusions/admin-3-categories/admin3-after-01-groupes.png
- _bmad-output/implementation-artifacts/screenshots/13-2-3-remediation-visuelle-lot-admin2-admin3-categories-hors-exclusions/admin-3-categories/admin3-after-02-bdd.png
- _bmad-output/implementation-artifacts/screenshots/13-2-3-remediation-visuelle-lot-admin2-admin3-categories-hors-exclusions/admin-3-categories/admin3-after-03-bdd-route.png
- _bmad-output/implementation-artifacts/screenshots/13-2-3-remediation-visuelle-lot-admin2-admin3-categories-hors-exclusions/admin-3-categories/admin3-after-04-import-legacy.png
- _bmad-output/implementation-artifacts/screenshots/13-2-3-remediation-visuelle-lot-admin2-admin3-categories-hors-exclusions/admin-3-categories/admin3-after-05-categories.png
- _bmad-output/implementation-artifacts/screenshots/13-2-3-remediation-visuelle-lot-admin2-admin3-categories-hors-exclusions/admin-3-categories/admin3-after-06-quick-analysis.png
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Senior Developer Review (AI)

Date: 2026-02-28  
Reviewer: bmad-qa
Decision: **Changes Requested**

### Findings

1. **[HIGH] AC1 partiellement couvert - refus "automatique" non implemente**
   - Les livrables 13.3.2 decrivent un process d'enforcement et des checklists, mais aucun mecanisme executable (script, validation machine, ou gate CI) n'est fourni pour "refuser automatiquement" un passage en `done`/`review`.
   - Preuve: `_bmad-output/implementation-artifacts/13-3-2-qa-visuelle-enforcement-standard.md` (checklists et regles documentaires uniquement).

2. **[HIGH] AC2/AC6 non demontrés sur un artefact rejoue complet**
   - Le rejeu 13-2-3 conclut `blocked`, mais ne produit pas de manifest rejoue complet conforme au schema enforcement avec chemins APRES resolubles ecran-par-ecran; la preuve reste narrative.
   - Preuve: `_bmad-output/implementation-artifacts/13-3-2-qa-visuelle-rejeu-enforcement-lot-13-2-3.md` (absence de fichier preuves enforcement rempli pour le rejeu).

3. **[MEDIUM] Tache marquee done sans preuve de fermeture effective des ajustements restants**
   - `Task 5` est cochee complete, alors que le rejeu liste encore 4 ajustements "avant generalisation" sans statut de traitement ni owner rattache dans la story.
   - Preuve: section "Ajustements restants avant generalisation" dans `_bmad-output/implementation-artifacts/13-3-2-qa-visuelle-rejeu-enforcement-lot-13-2-3.md`.

4. **[MEDIUM] Ecart de tracabilite story vs changements reellement presents**
   - Le fichier agent-state de cette story existe mais n'est pas reference dans la File List, ce qui reduit la transparence des artefacts de workflow.
   - Preuve: `_bmad-output/implementation-artifacts/13-3-2-qa-visuelle-continue-enforcement-et-non-regression.agent-state.json`.

### AC Coverage Review

- AC1: **PARTIAL** (regle de blocage documentee, automatisation manquante)
- AC2: **PARTIAL** (plan correctif defini, preuve rejouee incomplete)
- AC3: **IMPLEMENTED** (preconditions formalisees)
- AC4: **IMPLEMENTED** (schema normalise aligne 13.3.1)
- AC5: **IMPLEMENTED** (exclusions explicites dans canevas et rejeu)
- AC6: **PARTIAL** (chemins canoniques definis, enforcement complet non demontre sur rejet/rejeu normalise)

---

Date: 2026-02-28  
Reviewer: bmad-qa
Decision: **Approved**

### Findings

Aucun finding HIGH/MEDIUM restant sur le scope 13.3.2 apres corrections.

### Validation finale (AC)

- AC1: **IMPLEMENTED** (refus automatique executable confirme, `decision=blocked`, exit non-zero en `review`/`done`).
- AC2: **IMPLEMENTED** (regressions tracees avec plan correctif complet `owner/action/statut/preuve_cible`).
- AC3: **IMPLEMENTED** (preconditions techniques minimales tracees et enforcees par le gate).
- AC4: **IMPLEMENTED** (schema de decision normalise applique dans les artefacts de rejeu).
- AC5: **IMPLEMENTED** (exclusions Epic 11 preservees et verifiees explicitement).
- AC6: **IMPLEMENTED** (chemins canoniques AVANT/APRES imposes et resolubles, sans chemins relatifs courts).

### Notes de risque residuel

- Risque operationnel faible: la qualite finale depend toujours de la discipline de mise a jour des manifests de preuves avant execution du gate.

## Change Log

- 2026-02-28: Implementation dev-story completee pour 13.3.2 (enforcement gate final + non-regression + canevas artefacts QA + rejeu lot 13.2.3).
- 2026-02-28: Validation technique tracee (`npm run build` + tests UI co-loces admin 30/30 OK) et story passee en `review`.
- 2026-02-28: Code review adversarial BMAD (bmad-qa) - **changes requested**, story repassee `in-progress`.
- 2026-02-28: Correctifs review implementes - gate executable (refus automatique), rejeu 13-2-3 complet avec manifest enforcement resoluble, coherence taches/ajustements restauree, tracabilite story/file list completee; story repassee `review`.
- 2026-02-28: Code review adversarial final BMAD (bmad-qa) - **approved**, AC valides, story passee `done`.
