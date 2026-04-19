# Story 25.5 : Rejouer le gate readiness cible et rebaseliner le backlog `25-*` après fermeture des decisions

Status: done

**Story key :** `25-5-rejouer-le-gate-readiness-cible-et-rebaseliner-le-backlog-25-apres-fermeture-des-decisions`  
**Epic :** 25 — Socle d'alignement PRD vision kiosque / multisite / permissions, brownfield et ADR  
**Implementation artifact :** `_bmad-output/implementation-artifacts/25-5-rejouer-le-gate-readiness-cible-et-rebaseliner-le-backlog-25-apres-fermeture-des-decisions.md`

## Contexte produit

Le rapport de readiness du **2026-04-19** classe l'extension **PWA / kiosque** comme **NON PRÊTE** / **NOT READY** tout en laissant un **GO conditionnel** sur le cœur v2. Les stories **25.1 à 25.4** ont livré la matrice d'alignement, deux **ADR** (*proposed*), et la **spec convergée** multisite / permissions / projection Paheko. Cette story **rejoue** le raisonnement de readiness **de façon ciblée** (pas un rerun complet du workflow readiness global sans lecture des livrables Epic 25) et **rebaselinne** la séquence **`25-*`** et les dépendances pour le pilotage (`sprint-status`, prochaine story impl).

## Story (BDD)

As a **BMAD pilot**,  
I want **a targeted readiness rerun and a rebased `25-*` sequence once the alignment artifacts are closed**,  
So that **sprint planning can schedule only executable stories instead of mixing blocked assumptions with dev-ready work**.

## Acceptance criteria

Source normative : `_bmad-output/planning-artifacts/epics.md` — **Story 25.5** ; compléments ci-dessous alignés brief Story Runner.

**Given** le rapport de readiness courant marque l'extension **PWA** ou **kiosque** comme **NON PRÊTE** / **NOT READY** (cf. synthèse exécutive du rapport du 2026-04-19)  
**When** les livrables décisionnels des stories **25.1** à **25.4** sont considérés comme **complets** pour le pilotage (matrice 25.1, ADR 25-2 / 25-3 rédigés, spec **25.4** publiée)  
**Then** une **note de readiness ciblée** (Markdown, emplacement proposé ci-dessous) indique explicitement : **quels gates sont désormais fermés**, **lesquels restent ouverts**, et **si la première story d'implémentation pertinente peut légalement passer en `ready-for-dev`** (au sens gel Epic 25 + ADR + readiness — pas une promesse de code)  
**And** le **rebaselining** cite au minimum :  
  - `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md`  
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`  
  - les **livrables Epic 25 approuvés** (chemins vers matrice 25.1, ADR 25-2, ADR 25-3, spec 25.4 — voir § Références)  
**And** le livrable **identifie explicitement** le **premier candidat post-ADR** pour une future passe **`bmad-create-story`** (création de story d'impl), avec **références de fichiers** (`epics.md`, clés YAML, chemins story si existants) et **DoD** pour le **Story Runner** aligné sur `references/automatisation-bmad/epic-story-runner-spec.md` (brief `story_run` §6.2, graphe §5, sorties §7 / §7.1, plafonds de boucles).

## Checklist validation (VS — `bmad-create-story`, Epic 25.5)

Contrôle explicite contre `_bmad-output/planning-artifacts/epics.md` **Story 25.5** (pas de PASS sur liste vide).

- [x] **Given readiness** : rappel explicite de l'état **PWA/kiosk NOT READY** dans le rapport **2026-04-19** — reflété dans la note § Synthèse / écart.  
- [x] **When 25.1–25.4** : liste courte des livrables et chemins (au moins un chemin par story).  
- [x] **Then note ciblée** : tableau ou listes **gates fermés** / **ouverts** / **première impl autorisée ou non** (`ready-for-dev` **conditionnel** au gel + *accepted* ADR si applicable).  
- [x] **Rebaselining** : les trois citations exigées (readiness report, `sprint-status.yaml`, livrables 25.x) sont **dans le corps** de la note, pas seulement en en-tête.  
- [x] **Candidat `bmad-create-story`** : une clé story **nommée** + chemins + **DoD** Story Runner (§6.2 brief YAML minimal, compteurs `vs_loop` / `qa_loop` / `cr_loop`, chaîne **DS → gates → QA → CR** après correctif).  
- [x] **ADR** : section **Trace Epic 25 — ADR** avec **ADR N/A** et liens vers ADR **25-2** et **25-3** (chemins absolus brief — § Trace).  
- [x] **Alignement sprint** : après DS, `sprint-status.yaml` reflète la clôture documentaire **25.5** et toute mise à jour de commentaires / backlog **`25-*`** décrite dans la note.

## Définition of Done (Epic 25 — documentaire)

- [x] **Note de readiness ciblée** publiée sous `_bmad-output/planning-artifacts/` — nom proposé : `2026-04-20-note-readiness-cible-post-epic25-decisions.md` (ajuster la date si le DS valide un autre jour).  
- [x] Contenu minimal de la note : (1) **synthèse** de l'état vs le rapport **2026-04-19** ; (2) **gates** fermés / ouverts ; (3) **rebaselining** avec les trois sources obligatoires + liste des livrables Epic 25 ; (4) **candidat première story impl** + **DoD** Story Runner / `epic-story-runner-spec.md` ; (5) phrase explicite sur la **légalité** de promouvoir une story kiosque/PWA en `ready-for-dev` (oui/non + conditions).  
- [x] **Mise à jour** de `_bmad-output/implementation-artifacts/sprint-status.yaml` : commentaire `last_updated` + alignement `development_status` pour **25.5** (post-DS : `review` ou `done` selon Story Runner ; après CS : au minimum **`ready-for-dev`** pour la story fichier).  
- [x] Fichier **story** (ce document) : sections **Trace ADR**, **Alignement sprint**, **File List** complétées post-DS ; **Checklist VS** cochée ou écart documenté.

## Tasks / Subtasks

- [x] Rédiger la **note de readiness ciblée** (AC: Given/When/Then + rebaselining)  
  - [x] Citer `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` (sections « Extension PWA offline-first », « Synthèse finale », verdict GO/NO-GO).  
  - [x] Croiser avec `_bmad-output/implementation-artifacts/sprint-status.yaml` (`epic-25`, clés `25-*`, gel hors `25-*` rappelé dans le correct course).  
  - [x] Lister les **livrables approuvés** Epic 25 : matrice **25.1**, ADR **25-2**, ADR **25-3**, spec **25.4** (chemins ci-dessous).  
  - [x] **Gates** : ex. ADR *proposed* vs *accepted*, gel process, gate qualité API (readiness), PWA **NOT READY** jusqu'à levée explicite — **ne pas** affirmer « prêt prod PWA » sans ces éléments.

- [x] **Rebaselining backlog `25-*`** : une sous-section qui dit ce qui change pour le pilotage (ordre, dépendances, prochaine story hors Epic 25 si gel levé — **sans** modifier `epics.md` sauf instruction Story Runner / correct course).

- [x] **Premier candidat post-ADR pour `bmad-create-story`** (proposition par défaut alignée spec **25.4** §5 — à **confirmer** dans la note si le produit tranche autrement) :  
  - **Candidat recommandé :** `13-8-implementer-la-traduction-kiosque-legacy-retenue-dans-peintre-nano` — première story **impl kiosque Peintre** explicite dans la trajectoire documentée ; références :  
    - `_bmad-output/planning-artifacts/epics.md` (Epic 13, Story 13.8)  
    - `_bmad-output/implementation-artifacts/sprint-status.yaml` (clé `13-8-implementer-la-traduction-kiosque-legacy-retenue-dans-peintre-nano`)  
    - `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` §5 (ligne « Gated — extension PWA / kiosque delivery »)  
  - **Conditions** avant **CS** sur ce candidat : ADR **25-2** et **25-3** **acceptés** (ou équivalent documenté), **25.5** close, **levée du gel** `sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md` tracée si requise.  
  - **DoD Story Runner** (pour le futur brief) : reprendre `references/automatisation-bmad/epic-story-runner-spec.md` — **§6.2** `story_run` (`story_key`, `project_root`, `resume_at`, `paths`, `mode_create_story`, compteurs, `gates` ou `gates_skipped_with_hitl`) ; **§5** graphe CS→VS→DS→GATE→QA→CR ; **§7** sorties PASS/FAIL/NEEDS_HITL ; **§7.1** rapport final.

- [x] Mettre à jour **ce fichier story** + **`sprint-status.yaml`** après exécution DS (statuts, traces).

## Dev Notes

- **Nature du travail :** documentaire ; pas de code applicatif sauf si le Story Runner exige une cohérence de liens / index.  
- **Ne pas confondre** : **readiness globale 2026-04-19** (déjà émis) vs **note ciblée post-25.4** (nouveau livrable 25.5) — la note **met à jour le raisonnement** à la lumière des décisions **fermées** en doc Epic 25.  
- **Première story impl** : si le produit choisit un autre ordre (ex. **12-1** réception avant **13-8**), la note doit **justifier** le choix en croisant `epics.md` et le guide de pilotage — tout en gardant **un** candidat principal explicite pour le brief `bmad-create-story`.

### Project Structure Notes

- Livrable principal : `_bmad-output/planning-artifacts/` (note) + mises à jour YAML / story.  
- Les ADR **25-2** / **25-3** restent la référence pour PIN / async Paheko ; cette story **ne** produit **pas** de nouvelle ADR.

### References

- `_bmad-output/planning-artifacts/epics.md` (Epic 25, Story 25.5)  
- `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md`  
- `_bmad-output/implementation-artifacts/sprint-status.yaml`  
- `references/vision-projet/2026-04-19_matrice-alignement-vision-canonical-epic25-25-1.md` (25.1)  
- `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md` (ADR 25-2)  
- `_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md` (ADR 25-3)  
- `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` (25.4)  
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md` (gel hors `25-*`)  
- `_bmad-output/planning-artifacts/2026-04-20-note-readiness-cible-post-epic25-decisions.md` (note readiness ciblée post-DS 25.5)  
- `references/automatisation-bmad/epic-story-runner-spec.md`  
- `.cursor/agents/bmad-story-runner.md` (orchestration parent / Tasks)

## Trace Epic 25 — ADR

| Élément | Valeur |
|--------|--------|
| Nouvelle ADR structurante requise par cette story ? | **ADR N/A** — cette story est **documentaire** ; elle **rejoue** readiness et **rebaselinne** le backlog sans trancher un nouvel arbitrage d'architecture. |
| ADR **25-2** (PIN kiosque / opérateur / secret de poste) | `d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\_bmad-output\planning-artifacts\architecture\2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md` |
| ADR **25-3** (async Paheko / outbox / Redis auxiliaire) | `d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\_bmad-output\planning-artifacts\architecture\2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md` |
| Justification **N/A** | Les décisions structurantes attendues pour le périmètre kiosque / async sont portées par les ADR **25-2** et **25-3** ; la story **25.5** agrège l'état **readiness + pilotage** après clôture documentaire **25.1–25.4**, sans produire une troisième ADR. |

## Alignement sprint / YAML

- `_bmad-output/implementation-artifacts/sprint-status.yaml` : clé `25-5-rejouer-le-gate-readiness-cible-et-rebaseliner-le-backlog-25-apres-fermeture-des-decisions` → **`done`** après **Story Runner** (2026-04-20) : CS→VS→DS→GATE→QA→CR **PASS** (`vs_loop=0`, `qa_loop=0`, `cr_loop=0`) ; trace `last_updated` et commentaire d'historique en tête de fichier ; **epic-25** → **`done`** (stories **25-1** … **25-5** toutes **done**).
- Note de readiness ciblée livrée : `_bmad-output/planning-artifacts/2026-04-20-note-readiness-cible-post-epic25-decisions.md`.

## Dev Agent Record

### Agent Model Used

Composer (agent Task DS — `bmad-dev-story`)

### Debug Log References

_(aucun — livrable documentaire, pas d'exécution de suite de tests code)_

### Completion Notes List

- Note de readiness ciblée publiée : synthèse vs rapport 2026-04-19, tableau gates, rebaselining `25-*`, candidat **13-8**, DoD Story Runner §6.2 / §5 / §7–7.1, phrase sur promotion `ready-for-dev` kiosque/PWA, trace ADR N/A + liens 25-2 / 25-3.  
- `sprint-status.yaml` : **25-5** `ready-for-dev` → **`review`** (DS) → **`done`** (Story Runner fin) ; **epic-25** **`done`** ; commentaire `last_updated` actualisé.  
- **CR** `bmad-code-review` : **APPROVE** ; gate shell `git status -sb` : **PASS** (exit 0).

### File List

- `_bmad-output/planning-artifacts/2026-04-20-note-readiness-cible-post-epic25-decisions.md` (créé)  
- `_bmad-output/implementation-artifacts/25-5-rejouer-le-gate-readiness-cible-et-rebaseliner-le-backlog-25-apres-fermeture-des-decisions.md` (mis à jour)  
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (mis à jour)  
- `_bmad-output/implementation-artifacts/tests/test-summary-story-25-5-doc-qa.md` (créé — QA doc / e2e N/A)
