# Guide Epic Runner — enchaînement autonome Epic 3 (`peintre-nano`)

**Date :** 2026-04-02  
**Public :** nouvelle session Cursor avec l’agent **`@bmad-epic-runner`** (ou équivalent chargé depuis `.cursor/agents/bmad-epic-runner.md`).  
**Objectif :** enchaîner les stories **3.1 → 3.7** après la **3.0** déjà `done`, avec **maximum d’autonomie** (Task Story Runner, sous-agents, QA optionnel), en s’arrêtant proprement sur **HITL** si besoin.

---

## 1. Réalité plateforme (à ne pas sur-promettre)

- Il n’existe **pas** de daemon BMAD qui tourne sur le disque sans l’IDE : chaque étape reste une **invocation** LLM + Cursor (recueil §15, spec runners).
- **Absence prolongée** : si Cursor ne propose pas d’exécution en arrière-plan continue, l’enchaînement **s’interrompt** jusqu’à la prochaine action dans l’UI. Ce guide maximise ce qui peut se faire **dans une session active** ou **agent background** selon ton mode Cursor.
- **Git push** : souvent **HITL** (credentials) — prévoir `NEEDS_HITL` + délégation `@git-specialist` si besoin.
- **Spawn Task** : l’imbrication ou la disponibilité des **Task** n’est **pas garantie** sur toutes les versions Cursor — en cas d’échec, **NEEDS_HITL** + plan B (session unique / spec runners §1).

---

## 1 bis. Lexique (graphe story — à relire une fois)

| Sigle / terme | Signification |
|-----------------|----------------|
| **CS** | *create-story* — skill `bmad-create-story` en mode **create** |
| **VS** | *validate story* — même skill en mode **validate** |
| **DS** | *dev-story* — skill `bmad-dev-story` |
| **CR** | *code-review* — skill `bmad-code-review` |
| **GATE** | Commandes shell (lint / build / test) du brief |
| **QA** (BMAD) | `bmad-qa-generate-e2e-tests` dans le Story Runner |
| **CREOS** | Contrats UI / manifests côté dépôt (`contracts/creos/`) |
| **SDUI** | Server-driven UI (phases 0–3 dans les fondations Peintre) |

---

## 2. Fichiers à charger en priorité (contexte « riche » comme le plan 3.0)

Ordre recommandé pour le **premier agent** (Epic Runner) — **chemins relatifs au repo** ; sous Windows, convertir en absolus pour les **briefs YAML Task**.

| Priorité | Fichier | Rôle |
|----------|---------|------|
| 1 | `.cursor/agents/bmad-epic-runner.md` | Rôle Epic Runner. |
| 2 | `.cursor/agents/bmad-story-runner.md` | Graphe CS→…→CR, obligation Task par étape. |
| 3 | `references/automatisation-bmad/epic-story-runner-spec.md` | Brief §6.1 / §6.2, §7.1, gates, `skill_paths`. |
| 4 | `references/automatisation-bmad/2026-04-02_recueil-technique-orchestration-bmad.md` | CSV → skills, §15 Cursor. |
| 5 | `_bmad-output/implementation-artifacts/sprint-status.yaml` | Statuts ; **une seule session writer** par story. |
| 6 | `_bmad-output/planning-artifacts/epics.md` | Ordre des stories Epic 3. |
| 7 | `_bmad-output/planning-artifacts/guide-pilotage-v2.md` | Jalons Piste A / Convergence. |
| 8 | `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` | Arborescence normative `peintre-nano/`. |
| 9 | `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md` | **Primauté** P1/P2. |
| 10 | `references/peintre/2026-04-01_instruction-cursor-p1-p2.md` | Garde-fous layout Mantine / tokens. |
| 11 | `references/peintre/2026-04-01_fondations-concept-peintre-nano-extraits.md` | Phases SDUI, cashflow (a)/(b). |
| 12 | `references/vision-projet/2026-03-31_peintre-nano-concept-architectural.md` | Nano → mini → macro (sans implémenter mini/macro). |
| 13 | `contracts/README.md` + `contracts/creos/schemas/` | Contrats CREOS. |
| 14 | Story **3.0** (référence socle) : `_bmad-output/implementation-artifacts/3-0-initialiser-peintre-nano-et-ses-quatre-artefacts-minimaux.md` | Preuve de forme des sections / clôture. |

**Plan Cursor « Epic 3 Story 3.0 orchestration »** : s’il est encore dans `.cursor/plans/` sur ta machine, il reste une **bonne référence de forme** (annexe Context pack, anti-dilution, qa2). **Ce guide reprend les mêmes principes** pour **3.1+** sans exiger le fichier plan.

---

## 3. Méga-feuille de route — ordre des stories (clés `sprint-status`)

**Epic :** `epic-3` (déjà `in-progress` après 3.0).  
**Prochaine story par défaut :** première clé cohérente avec l’**ordre dans `epics.md`**, croisée avec `sprint-status.yaml` (spec §4, recueil §15.3) — **pas** le seul tableau ci-dessous si `epics.md` diverge.

**Primauté :** en cas d’écart entre ce tableau et **`epics.md`**, c’est **`epics.md` + YAML** qui font foi. Le tableau est un **miroir** des clés usuelles au moment de la rédaction.

| # | `story_key` (exact) | Thème court |
|---|---------------------|-------------|
| 3.1 | `3-1-mettre-en-place-le-shell-initial-et-le-layout-css-grid` | Shell + CSS Grid |
| 3.2 | `3-2-implementer-le-chargement-et-la-validation-minimale-des-manifests-de-navigation-et-de-page` | Manifests nav + page |
| 3.3 | `3-3-implementer-le-registre-minimal-de-widgets-slots-et-rendu-declaratif` | Registre widgets / slots |
| 3.4 | `3-4-integrer-ladaptateur-authsession-et-la-resolution-par-contextenvelope` | Auth / ContextEnvelope |
| 3.5 | `3-5-borner-userruntimeprefs-a-la-personnalisation-locale-non-metier` | UserRuntimePrefs borné |
| 3.6 | `3-6-rendre-visibles-les-fallbacks-et-rejets-de-runtime` | Fallbacks / rejets |
| 3.7 | `3-7-produire-la-page-de-demonstration-du-runtime-compose` | Page démo runtime |

---

## 4. Boucle mécanique Epic Runner (une story par itération)

Pour **chaque** story `N` :

1. **Lire** `sprint-status.yaml` + ordre **`epics.md`** → choisir la **prochaine** clé Epic 3 pas `done` (cohérence YAML + epics ; voir §3 primauté).
2. **Construire** un brief YAML conforme **`epic-story-runner-spec.md` §6.2** — **reprendre la structure complète** de l’exemple de la spec, pas seulement un sous-ensemble. Champs à ne **pas** omettre (sinon NEEDS_HITL côté Story Runner) :
   - `story_key`, `epic_id`, `project_root`
   - `paths` (min. `sprint_status` ; `story_file` si connue)
   - `skill_paths` : clés **exactes** `create_story`, `dev_story`, `qa_e2e`, `code_review` (chemins absolus vers les `SKILL.md`)
   - `mode_create_story` (`create` ou `validate` selon reprise)
   - `gates` **non vides** **ou** `gates_skipped_with_hitl: true` explicite
   - `gates_skipped_with_hitl`, compteurs `vs_loop` / `qa_loop` / `cr_loop` à 0, `max_*_loop`
   - `policy` (dont `retry_chain`, `fresh_context_for_cr`, `if_cr_task_unavailable`)
   - `resume_at` si reprise milieu de cycle (CS | VS | DS | GATE | QA | CR)
   - **YAML en ASCII** : guillemets droits `"` ou `'` uniquement (pas de typographie courbe) ; indentation cohérente — spec §6.2 fin.
3. **Coller** après le YAML l’**annexe Context pack** (§5) + **phrase anti-dilution** : le Story Runner ne doit pas résumer l’annexe au point de perdre les contraintes.
4. **Lancer un seul** `Task` **`bmad-story-runner`** avec ce message. **Par défaut** : ne **pas** lancer **deux** Task Story Runner **en parallèle** sur le même dépôt ; **exception** uniquement si une **règle d’écriture** sur `sprint-status.yaml` est explicitement définie (spec §11).
5. Si l’outil **refuse** le Task ou la chaîne de spawns : **NEEDS_HITL** + plan B (session unique, pas d’enchaînement forcé) — spec §1, recueil §15.1.
6. **Exiger** le rapport **§7.1** : `status_final`, compteurs, fichiers touchés, prochaine action.
7. Si **`PASS`** : optionnel **QA2** (§7) selon politique ; puis **story suivante**.
8. Si **`NEEDS_HITL` / `FAIL`** : **HALT** avec cause et brief de reprise (`resume_at`) — ne pas enchaîner la suivante en silence.

---

## 5. Annexe type « Context pack » (à recoller après chaque YAML story)

Adapter le **numéro de story** et le **périmètre** (3.1 = grille visible, etc.) ; le **socle** reste identique à la campagne 3.0.

1. **Primauté ADR** : `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md` prime sur la vision si contradiction P1/P2 / CSS.
2. **Nano → mini → macro** : pas de bus / agent dans le périmètre immédiat sauf story qui le dit explicitement.
3. **Piste A** : mocks jusqu’à Convergence 1 ; **aucun import runtime** depuis `references/`.
4. **Boundaries** : `project-structure-boundaries.md` — ne pas fusionner `registry/` et `runtime/` sans mise à jour story + ADR.
5. **Quatre artefacts** : `NavigationManifest`, `PageManifest`, `ContextEnvelope`, `UserRuntimePrefs` — pas de routes / permissions métier en dur comme substitut aux contrats.
6. **Cashflow (a)/(b)** : pas de tranchement silencieux ; renvoi fondations / pipeline §16 si la story touche le sujet.
7. **P1 layout** : structure spatiale = CSS Modules + tokens ; pas `Stack`/`Group` Mantine comme layout shell (instruction Cursor).
8. **Checklist sections story** (sortie CS) : identité story + clé fichier, primauté ADR, périmètre vs stories adjacentes, critères done **testables** avec commandes depuis `peintre-nano/`.

---

## 6. Gates standard (`peintre-nano/` — après 3.0)

Tant que `package.json` existe à la racine du package :

- Proposer des gates **non vides** ; exemples (voir aussi spec §5.2 — **PowerShell** sur Windows) :
  - **CMD** : `cd /d "<project_root>\peintre-nano" && npm ci && npm run lint && npm run build && npm run test`
  - **PowerShell** : `Set-Location "<project_root>\peintre-nano"; npm ci; npm run lint; npm run build; npm run test` (adapter `project_root` absolu ; `;` comme séparateur).
- Découper en plusieurs entrées `gates` avec `timeout_sec` si plus clair.
- Si environnement interdit `npm ci` : documenter **NEEDS_HITL** ou `gates_skipped_with_hitl: true` **une fois** avec phrase d’acceptation (spec §6.2).

---

## 7. QA approfondi (optionnel mais recommandé)

- **Orthogonal** au `bmad-qa-generate-e2e-tests` du Story Runner : audit multi-passes via **`@qa2-orchestrator`** + skill **qa2-agent** (session ou Task **parent** dédié).
- **Jalons (opérationnels)** :
  - Après **VS** : passe **prd/arch** sur le fichier story + ADR + boundaries (story « riche » ou risque de dilution).
  - Après **DS** : passe **code** si le diff touche **`peintre-nano/src/`** sur **plus de ~5 fichiers** ou ajoute une **nouvelle zone** (routing, runtime, validation) ; sinon au minimum après les stories **3.2 / 3.3 / 3.4** (surface contrats / auth).
  - Avant **`done`** : si le **CR** laisse un doute ou si une passe précédente était **tronquée**.
- **Ne pas** faire le parent qa2 **et** pré-lire les `scope_paths` dans le même fil Epic : ouvrir un **chat / Task** dédié (discipline skill).
- Gabarit : `%USERPROFILE%\.cursor\skills\qa2-agent\references\qabrief-template.md` (chemins absolus, `brief_version` identique par run).

---

## 8. Prompt d’amorçage — nouveau chat (à coller tel quel, puis ajuster `project_root`)

```text
Tu es l’agent défini dans .cursor/agents/bmad-epic-runner.md (Epic Runner BMAD).

Objectif : enchaîner l’Epic 3 sur peintre-nano après la story 3.0 (déjà done). Une story à la fois. Maximum d’autonomie : pour chaque story, un seul Task vers bmad-story-runner avec brief YAML spec §6.2 + annexe Context pack.

Charge et suis :
- references/automatisation-bmad/epic-story-runner-spec.md
- references/automatisation-bmad/2026-04-02_guide-epic-runner-epic-3-peintre-nano-enchainement-autonome.md
- sprint-status.yaml + epics.md (Epic 3)

project_root Windows (à vérifier sur cette machine) :
D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique

Règles :
- skill_paths YAML : create_story, dev_story, qa_e2e, code_review (chemins absolus vers .cursor/skills/.../SKILL.md).
- Par défaut : un seul Task Story Runner à la fois sur ce dépôt ; exception seulement si règle d’écriture `sprint-status` explicite (spec §11).
- Sur NEEDS_HITL ou FAIL : arrêter et résumer ce qui manque pour Strophe.
- Sur PASS : enchaîner la story suivante (3.1 puis 3.2, …) jusqu’à blocage ou fin d’epic.

Commence par confirmer la prochaine story depuis sprint-status + epics.md, puis lance le Task Story Runner pour cette clé uniquement.
```

---

## 9. Fin d’epic

Quand **toutes** les clés `3-0` … `3-7` sont `done` : proposer **`bmad-retrospective`** puis si besoin **`bmad-correct-course`** (spec + agent Epic Runner).

---

## 10. Synthèse

Ce fichier fait office de **méga-plan structurel** pour la suite d’Epic 3 **et** de **guide** pour le premier agent : mêmes exigences de contexte que le plan d’orchestration 3.0 (ADR, boundaries, P1, pas d’import `references/`, un spawn Story Runner par story, QA2 en parallèle de fil si besoin). L’autonomie est **maximale dans les limites Cursor** ; tout blocage **humain ou plateforme** doit sortir en **NEEDS_HITL** explicite plutôt qu’en chaîne cassée silencieuse.
