# Story 25.6 : Lever le gel process (correct course) — documenter la levée et le pilotage observable

Status: done

**Story key :** `25-6-lever-le-gel-process-correct-course-documenter-la-levee-et-le-pilotage-observable`  
**Epic :** 25 — Socle d'alignement PRD vision kiosque / multisite / permissions, brownfield et ADR  
**Implementation artifact :** `_bmad-output/implementation-artifacts/25-6-lever-le-gel-process-correct-course-documenter-la-levee-et-le-pilotage-observable.md`

## Contexte produit

Le **Sprint Change Proposal** du **2026-04-19** (`sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md`) impose un **gel d'exécution BMAD** : pas de nouveau `bmad-dev-story` (DS) **hors** les clés **`25-*`** tant que la levée n'est pas **explicite et traçable**. Les stories **25.1 à 25.5** ont fermé le cadrage documentaire ; la **phase 2** (**25.6–25.15**) est dans le YAML en **`backlog`** / promotion pilotée, avec **`epic-25`** en **`in-progress`**.

Cette story **25.6** est la **première brique** de la phase 2 : elle ne « débloque » pas le produit par un simple paragraphe narratif — elle exige un **addendum daté** (ou document lié) + **réplication de la vérité** là où l'automation et les humains lisent le statut (**chemins de fichiers**, clés **`sprint-status.yaml`**, commentaires de gel). Le **DAG** machine place **25.6** en **racine** (`depends_on: []`) : toute la suite **25.7+** suppose que la levée / le cadrage du gel est **observable**.

**Hors périmètre explicite (epics §25.6) :** livraison PWA kiosque ; **ne pas** clore seule la story **13.8** comme substitut à cette story.

## Story (BDD)

As a **BMAD pilot**,  
I want **the execution freeze from the 2026-04-19 correct course explicitly lifted or scoped in writing with observable tracking artefacts**,  
So that **`bmad-dev-story` and related DS work outside `25-*` keys is only allowed under clear rules and nobody confuses a narrative note with an actual YAML unlock**.

## Acceptance criteria

Source normative : `_bmad-output/planning-artifacts/epics.md` — **Story 25.6**.

**Given** `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md` définit encore le gel sauf levée documentée  
**When** cette story est livrée (DS + validation pilotage)  
**Then** un **addendum daté** ou un **document lié** (Markdown sous `_bmad-output/planning-artifacts/` ou `_bmad-output/implementation-artifacts/` — chemin explicite dans le livrable) énonce : **ce qui est levé**, **ce qui reste gelé ou conditionnel**, et **liste des artefacts touchés** (chemins de fichiers et/ou clés `development_status` dans `sprint-status.yaml`) qu'un relecteur peut **vérifier en quelques minutes**  
**And** la **même vérité** apparaît où le pilotage et les scripts lisent l'état (**pas de unlock « papier seul »**) : au minimum **mise à jour** des **commentaires** et/ou entrées pertinentes dans `_bmad-output/implementation-artifacts/sprint-status.yaml` (y compris lignes `# last_updated` en tête de fichier si la politique projet exige une trace)  
**And** cette story **n'implémente pas** seule la livraison kiosque PWA et **ne ferme pas** la story **13.8** par elle-même

**Alignements obligatoires (brief Story Runner, non contradictoire avec les AC epics) :**

- Croiser **`epics.md`** §25 (règle directrice gel **25.6–25.15**, NOT READY PWA, gate API P0 quand applicable) et la note **`2026-04-20-note-readiness-cible-post-epic25-decisions.md`** (§ gates gel / levée ; encadré **2026-04-21** sur phase 2).  
- Respecter le **DAG** `_bmad-output/planning-artifacts/architecture/epic-25-phase2-dag-2026-04-21.yaml` : **25.6** sans prérequis ; ne pas promouvoir **25.7+** avant **25.6** **done** si la politique projet lie la levée à cette clôture.  
- **Ne pas** rouvrir **ADR 25-2** / **ADR 25-3** sauf **incohérence bloquante** ; le code et les futurs DS doivent **respecter** les ADR **acceptés**.

## Checklist validation (criteres VS — `bmad-create-story` **validate**, Epic 25.6)

Contrôle explicite contre `_bmad-output/planning-artifacts/epics.md` **Story 25.6** (pas de PASS sur liste vide). **CS** = création du fichier story ; **VS** = validation de complétude — les cases ci-dessous matérialisent le contrôle **VS** ; la cochure finale suit **DS** et la chaîne Story Runner.

- [x] **Given sprint-change-proposal 2026-04-19** : rappel du gel et de l'exigence de **levée explicite** (citation ou chemin court).  
- [x] **Then addendum daté** : fichier ou section **datée**, **chemins complets** ou clés YAML, distinction **levé** / **encore gelé** / **conditionnel** (ex. PWA massif NOT READY, gate API P0).  
- [x] **Vérification minutes** : liste d'artefacts **vérifiables** (ouvrir le fichier / grep clé YAML) — pas seulement une intention.  
- [x] **Pas papier seul** : au moins une modification **sprint-status.yaml** (ou artefact explicitement désigné comme source automation) **alignée** sur le texte de l'addendum.  
- [x] **Hors scope** : phrase explicite — **pas** livraison PWA seule ; **pas** clôture **13.8** comme substitut.  
- [x] **DAG / sprint-status** : cohérence **25.6** racine ; pas de contresens avec **`epic-25`** (ne **pas** marquer **`epic-25: done`** dans le cadre de cette story si l'epic reste en phase impl).  
- [x] **ADR** : section **Trace Epic 25 — ADR** complétée (**ADR N/A** ou renvoi respect **25-2** / **25-3** sans rouvrir le fond).

## Définition of Done (documentaire + pilotage observable)

- [x] **Addendum** (ou doc lié) publié in-repo avec **date**, **périmètre levé / gelé**, **liste artefacts** (paths + clés).  
- [x] **`sprint-status.yaml`** : traces **`# last_updated`** + cle racine **`last_updated`** cohérentes avec la levée / le cadrage ; statut story **25-6** → **`done`** après chaîne Story Runner (QA / CR / correctifs traceabilité si applicable).  
- [x] **Commentaires de gel** sous **epic-10 / 13 / 14 / 15** : mis à jour **seulement** si l'addendum tranche une règle opérationnelle nouvelle (sinon : documenter « inchangé mais gel process levé pour… »).  
- [x] Fichier **story** (ce document) : **Checklist VS** cochée post-validation ; **File List** complété post-DS.

## Tasks / Subtasks

- [x] Rédiger l'**addendum daté** de levée / cadrage du gel (AC: Given/Then/And)  
  - [x] Citer `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md` (§ levée, § gel hors `25-*`).  
  - [x] Croiser `_bmad-output/planning-artifacts/2026-04-20-note-readiness-cible-post-epic25-decisions.md` (gates gel, NOT READY PWA, instantané post-2026-04-21).  
  - [x] Lister les **artefacts touchés** : chemins + clés `25-*` / epics commentés ; indiquer quels **DS hors `25-*`** deviennent **autorisés** sous quelles **conditions** (si levée partielle).  
  - [x] Exclure explicitement : **fermeture seule 13.8**, **livraison PWA** comme scope de **25.6**.

- [x] **Aligner le pilotage observable**  
  - [x] Mettre à jour `_bmad-output/implementation-artifacts/sprint-status.yaml` (commentaires `# last_updated` + tout champ `development_status` pertinent selon la décision).  
  - [x] Vérifier cohérence avec `_bmad-output/planning-artifacts/architecture/epic-25-phase2-dag-2026-04-21.yaml` (nœud **25-6**).  
  - [x] **Ne pas** positionner **`epic-25: done`** tant que la phase **25.6–25.15** n'est pas close (sauf instruction correct course contraire).

- [x] **Contrôle « pas papier seul »**  
  - [x] Preuve : un relecteur ouvre **deux** sources (ex. addendum + YAML) et voit la **même** règle en **< 5 minutes**.

## Dev Notes

- **Nature du travail :** pilotage documentaire + mises à jour **traçables** dans les artefacts de statut ; pas de code métier requis sauf si le Story Runner impose un hook (ex. script qui lit le YAML — hors scope par défaut).  
- **Piège à éviter :** une **note** dans le chat ou un **fichier orphelin** non référencé par `sprint-status` / index pilotage — les AC exigent **observabilité**.  
- **Suite logique :** après **25.6** **done**, enchaîner **25.7** (checklist spec 25.4 §2–3) et/ou **25.12** en parallèle serré si ressource (DAG).

### Project Structure Notes

- Livrables typiques : `_bmad-output/planning-artifacts/` (addendum) et `_bmad-output/implementation-artifacts/sprint-status.yaml`.  
- Réutiliser le style de trace des lignes `# last_updated` existantes en tête de `sprint-status.yaml`.

### References

- `_bmad-output/planning-artifacts/epics.md` (Epic 25, Story **25.6**, règle directrice gel **25.6–25.15**)  
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md`  
- `_bmad-output/planning-artifacts/2026-04-20-note-readiness-cible-post-epic25-decisions.md`  
- `_bmad-output/implementation-artifacts/sprint-status.yaml`  
- `_bmad-output/planning-artifacts/architecture/epic-25-phase2-dag-2026-04-21.yaml`  
- `_bmad-output/implementation-artifacts/25-5-rejouer-le-gate-readiness-cible-et-rebaseliner-le-backlog-25-apres-fermeture-des-decisions.md` (intelligence **25.5**, candidat **13-8**, conditions de promotion)  
- `references/automatisation-bmad/epic-story-runner-spec.md`  
- `.cursor/agents/bmad-story-runner.md`

## Trace Epic 25 — ADR

| Élément | Valeur |
|--------|--------|
| Nouvelle ADR structurante requise par cette story ? | **ADR N/A** — levée de gel et pilotage observable ; pas de nouveau choix d'architecture. |
| ADR **25-2** (PIN kiosque / opérateur / secret de poste) | `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md` — **respecter** ; **ne pas rouvrir** sans incohérence bloquante. |
| ADR **25-3** (async Paheko / outbox / Redis auxiliaire) | `_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md` — **respecter** ; **ne pas rouvrir** sans incohérence bloquante. |
| Justification **N/A** | La levée du gel est un **acte de pilotage** ; les ADR restent la **norme** pour les implémentations aval. |

## Alignement sprint / YAML

- **Post-CS :** clé `25-6-lever-le-gel-process-correct-course-documenter-la-levee-et-le-pilotage-observable` était passée en **`ready-for-dev`** ; fichier story à la racine de `_bmad-output/implementation-artifacts/`.  
- **Post-DS (2026-04-20) :** `25-6` → **`review`** puis chaîne gates/QA/CR ; **`# last_updated`** + harmonisation cle racine **`last_updated`** dans `sprint-status.yaml` ; commentaires **epic-10 / 13–15** alignés sur l'addendum de levée ; **`epic-25`** reste **`in-progress`**.  
- **Post–Story Runner + correctifs doc (2026-04-21) :** `epics.md` §25 **Pilotage YAML** / **Règle directrice** alignés sur le YAML ; `25-6` → **`done`**.

## Dev Agent Record

### Agent Model Used

Sous-agent **Task** (bmad-dev-story / DS) — modèle **Composer** (session Story Runner BMAD).

### Debug Log References

_(N/A — livrable documentaire, pas de debug code.)_

### Completion Notes List

- Addendum **2026-04-20** publié : levée **process** du gel correct course (DS hors `25-*`) avec conditions (NOT READY PWA massif, gate API P0 Paheko/caisse, ADR **25-2** / **25-3** non rouvertes) ; croisement **sprint-change-proposal 2026-04-19** + **note readiness 2026-04-20**.
- **`sprint-status.yaml`** : trace `# last_updated` + cle racine **`last_updated`** (harmonisation **2026-04-21**) ; `development_status` **25-6** → **`done`** ; **`epic-25`** reste **`in-progress`** ; commentaires **epic-10 / 13 / 14 / 15** alignés sur la levée documentée.
- **`epics.md` §25** : **Pilotage YAML** et **Règle directrice** alignés sur la vérité YAML post-**25.6** (25-7…25-15 **backlog**).
- **13-8** non modifiée par cette story ; pas de livraison PWA comme périmètre **25.6**.
- Pas de suite de tests repo requise pour ce lot (hors code) ; synthèse QA doc : `tests/test-summary-story-25-6-doc-qa.md`.

### File List

- `_bmad-output/planning-artifacts/2026-04-20-addendum-levee-gel-process-correct-course-story-25-6.md` (créé ; complément §5 / fin — **2026-04-21** post-QA2)
- `_bmad-output/planning-artifacts/epics.md` (§25 **Règle directrice** + **Pilotage YAML** — alignement YAML **2026-04-21**)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modifié — `# last_updated`, cle racine `last_updated`, `25-6` → `done`, commentaires epic-10/13/14/15 et bloc epic-25 phase 2)
- `_bmad-output/implementation-artifacts/tests/test-summary-story-25-6-doc-qa.md` (créé — QA doc, aligné 25-5 ; lignes 9–10 **2026-04-21**)
- `_bmad-output/implementation-artifacts/25-6-lever-le-gel-process-correct-course-documenter-la-levee-et-le-pilotage-observable.md` (modifié — statut, checklists, Dev Agent Record)

### Change Log

- **2026-04-20** — DS **25-6** : addendum de levée + alignement `sprint-status.yaml` + story en **`review`**.
- **2026-04-21** — DS post-QA2 doc : `epics.md` §25 + harmonisation `last_updated` racine / addendum §5 + test-summary + story (terminologie VS/CS, File List).
