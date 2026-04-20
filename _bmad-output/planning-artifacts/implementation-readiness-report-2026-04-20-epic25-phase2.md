---
type: implementation-readiness-snapshot
date: 2026-04-20
scope: epic-25-phase-2-post-25-6
sources:
  - implementation-readiness-report-2026-04-19.md
  - 2026-04-20-note-readiness-cible-post-epic25-decisions.md
  - 2026-04-20-addendum-levee-gel-process-correct-course-story-25-6.md
---

# Readiness — Epic 25 phase 2 (post–story 25.6 livrée)

**But :** figer l’état **réalisé** après la **story 25.6** (levée **process** du gel hors `25-*` documentée) et la **suite** pilotée (**25.7+**), **sans** contredire le **GO conditionnel** du rapport **2026-04-19** sur le **cœur v2** ni inventer un **GO** pour un **programme PWA massif**.

## 1. Ce qui n’était plus une attente (état réalisé)

| Sujet | Avant (formulation « en attente du premier 25.6 ») | Maintenant |
|--------|-----------------------------------------------------|------------|
| **ADR PIN / async Paheko** | Fermeture documentaire Epic 25 tranche 25.1–25.5 | **25-2** / **25-3** **acceptés** ; inchangé |
| **Spec socle 25.4** | Livrée | **Done** ; norme pour poste / projection |
| **Note readiness + rebaselining 25.5** | À clôturer | **Done** |
| **Gel process** (`bmad-dev-story` hors `25-*`) | Ouvert tant que non levé par écrit | **Levé (doc)** : addendum **`2026-04-20-addendum-levee-gel-process-correct-course-story-25-6.md`** + **`sprint-status.yaml`** |
| **Story 25.6** | Backlog / à livrer pour la levée traçable | **`development_status` → `done`** ; suite **25.7+** en **`backlog`** selon YAML |

## 2. Verdicts inchangés (cohérence avec le GO conditionnel)

- **Cœur v2** (`prd.md`, epics, index architecture) : **GO conditionnel** (tel que **2026-04-19**) — cette phase **ne** transforme **pas** ce verdict en **GO aveugle** sur tout le produit.
- **Programme PWA / kiosque massif** : **NOT READY** tant que les mécanismes du rapport **2026-04-19** (FR/epics vision, preuves, gate API P0 où applicable) ne sont pas satisfaits — **orthogonal** à la seule levée **process** **25.6**.
- **Gate qualité API** (touches Paheko / caisse sensibles) : **condition** de promotion / merge selon la politique projet — **non levée** par la story **25.6** seule.

## 3. Suite (pilotage)

- **Source de vérité** : **`_bmad-output/implementation-artifacts/sprint-status.yaml`** + **`_bmad-output/planning-artifacts/epics.md`** §25.
- **Enchaînement logique** (DAG machine) : **`_bmad-output/planning-artifacts/architecture/epic-25-phase2-dag-2026-04-21.yaml`** — entrée **25-7** (checklist spec 25.4 §2–3) et stories suivantes selon dépendances ; **`epic-25`** reste **`in-progress`** jusqu’à clôture de la phase **25.6–25.15**.

## 4. Références croisées

- Rapport baseline : `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md`
- Note ciblée : `_bmad-output/planning-artifacts/2026-04-20-note-readiness-cible-post-epic25-decisions.md`
- Levée gel : `_bmad-output/planning-artifacts/2026-04-20-addendum-levee-gel-process-correct-course-story-25-6.md`
