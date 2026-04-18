# Recueil technique — orchestration BMAD et fabrication de workflows (Cursor)

**Date :** 2026-04-02 · **Version document :** v5 (§16 : livrables orchestrateurs + historique v5)  
**Public :** agents et humains qui conçoivent des skills, slash commands ou **guidages** pour enchaîner le cycle BMAD **sans remplacer** la méthode ni promettre d'exécution automatique headless.  
**Portée :** dépôt `JARVOS_recyclique`, module BMM installé sous `_bmad/`, skills Cursor sous `.cursor/skills/`.

---

## 1. Objectif du document

Fournir une **synthèse d'intégration** (manuel pour orchestrateurs Cursor) afin de :

- mapper **fichiers réels** (config, workflows markdown, YAML de sprint) ;
- savoir **quel skill invoquer** côté Cursor (voir **§4** : la colonne `command` du CSV **n'est pas** toujours le nom du skill) ;
- comprendre la **machine d'état documentée** (`sprint-status.yaml`) et ses **limites** pour l'automatisation ;
- placer **HITL** (human-in-the-loop) et **contexte frais** là où BMAD les exige ;
- identifier les **trous** à combler par une fabrique maison (contrat d'exécution, runner, gates shell/Docker/navigateur).

**Vérité opérationnelle** : les fichiers versionnés sous `_bmad/`, `_bmad-output/` et `.cursor/skills/` priment ; ce document est une **vue maintenue** — en cas de divergence, mettre à jour le recueil ou se fier aux sources.

Ce n'est pas un tutoriel BMAD utilisateur : c'est un **manuel d'intégration**.

**Navigation rapide** : §2 [Configuration](#2-configuration-et-résolution-de-chemins) · §3 [Routing BMM](#3-routing-bmm--phase-4-anytime-et-catalogue-complet) · §4 [Carte skills](#4-carte-didentité-colonne-command-bmad-help--skill-cursor-réel) · §5 [Sprint Status](#5-priorité-du-workflow-sprint-status-routeur-bmad) · §11 [Limites BMAD](#11-ce-que-bmad-ne-fournit-pas-à-implémenter-côté-fabrique) · §12 [Graphe v0](#12-schéma-de-graphe-minimal-recommandé-fabrique-v0) · §15 [Cadre Cursor](#15-cadre-cursor-et-conventions-dorchestration-post-qa2) · §16 [Historique](#16-historique-du-recueil)

---

## 2. Configuration et résolution de chemins

### 2.1 Fichier principal BMM

| Cle | Fichier | Contenu utile |
|-----|---------|----------------|
| Config module | `_bmad/bmm/config.yaml` | `project_name`, `user_name`, `user_skill_level`, `communication_language`, `document_output_language`, `planning_artifacts`, `implementation_artifacts`, `project_knowledge`, `output_folder` |

**Projet actuel (extrait typique) :**

- `planning_artifacts` → `{project-root}/_bmad-output/planning-artifacts`
- `implementation_artifacts` → `{project-root}/_bmad-output/implementation-artifacts`
- `project_knowledge` → `{project-root}/references`
- `output_folder` → `{project-root}/_bmad-output`

**Note :** `user_skill_level` (ex. `expert`) influence le ton des workflows BMAD ; un orchestrateur peut le lire pour adapter les prompts.

Tout orchestrateur doit **lire cette config** ou dupliquer explicitement ces chemins (moins maintenable).

### 2.2 Fichier sprint (état d'exécution)

| Ressource | Chemin résolu |
|-----------|----------------|
| Statut sprint | `{implementation_artifacts}/sprint-status.yaml` |
| Fichiers story | Racine de `story_location` déclaré **dans** `sprint-status.yaml` (ex. `_bmad-output/implementation-artifacts`), fichiers `{story-key}.md` — **pas** un sous-dossier `stories/` |

Le template et les définitions de statuts : `_bmad/bmm/4-implementation/bmad-sprint-planning/sprint-status-template.yaml` et le workflow `bmad-sprint-planning/workflow.md`.

---

## 3. Routing BMM : phase 4, anytime, et catalogue complet

**Source canonique du routing** : `_bmad/_config/bmad-help.csv`.

**Catalogue complet** : toutes les phases (`1-analysis`, `2-planning`, `3-solutioning`, `4-implementation`, `anytime`) et codes (BP, MR, CP, CA, CE, IR, …) sont dans ce CSV. **Ce recueil ne détaille pas** analyse / planning / solutioning ; pour **Create PRD**, **Create Architecture**, **Create Epics**, **Check Implementation Readiness**, etc., lire directement le CSV (colonnes `phase`, `code`, `workflow-file`, `command`, `required`) et appliquer la **même règle d'invocation** qu'en **§4** (skill réel = `skill-manifest.csv` + dossiers `.cursor/skills/`).

Colonnes utiles du CSV : `module`, `phase`, `name`, `code`, `sequence`, `command`, `required`, `agent-display-name`, `description`, `workflow-file` (souvent `skill:...`).

**Parseurs** : certaines lignes BMM **anytime** ont **`command` vide** (workflows agent tech writer : WD, US, MG, VD, EC) — l'invocation passe par **chargement de l'agent** Paige (`bmad-agent-tech-writer`), pas par un identifiant `bmad-bmm-*`. Ne pas supposer `command` toujours renseigné.

### 3.1 Table synthèse — phase `4-implementation` uniquement

| Code | Nom CSV | Colonne `command` (CSV, alias doc) | Agent (persona) | Required | Notes |
|------|---------|--------------------------------------|-----------------|----------|--------|
| SP | Sprint Planning | `bmad-bmm-sprint-planning` | Bob (SM) | true | Génère / met à jour `sprint-status.yaml` |
| SS | Sprint Status | `bmad-bmm-sprint-status` | Bob | false | **Routeur documenté** : lit YAML, recommande `next_workflow_id` |
| CS | Create Story | `bmad-bmm-create-story` | Bob | true | Crée `{story-key}.md` |
| VS | Validate Story | `bmad-bmm-create-story` | Bob | false | **Même skill** que CS — distinction par **mode / prompt** (procédure), pas une commande CSV séparée |
| DS | Dev Story | `bmad-bmm-dev-story` | Amelia | true | |
| QA | QA Automation Test | `bmad-bmm-qa-automate` | Quinn | false | Voir **§4.2** : skill Cursor réel différent |
| CR | Code Review | `bmad-bmm-code-review` | Amelia | false | Boucle vers DS si correctifs |
| ER | Retrospective | `bmad-bmm-retrospective` | Bob | false | Fin d'épique |

**Hors de ce tableau :** **Correct Course (CC)** n'est **pas** en phase `4-implementation` dans le CSV — il est en **`anytime`** (voir §3.2). Ne pas l'exclure d'un routeur « cycle sprint » par erreur de classification.

### 3.2 Workflows BMM `phase: anytime` (sélection actionnable)

| Code | Nom | Colonne `command` (CSV) | `workflow-file` (extrait) | Notes |
|------|-----|---------------------------|----------------------------|--------|
| CC | Correct Course | `bmad-bmm-correct-course` | `skill:bmad-correct-course` | Changement majeur de cap ; **pas** réservé à la phase 4 |
| DP | Document Project | `bmad-bmm-document-project` | `skill:bmad-document-project` | |
| GPC | Generate Project Context | `bmad-bmm-generate-project-context` | `skill:bmad-generate-project-context` | |
| QQ | Quick Dev | `bmad-bmm-quick-dev` | `skill:bmad-quick-dev` | Barry ; hors cérémonie complète |
| WD, US, MG, VD, EC | (Tech Writer) | *(vide)* | `skill:bmad-agent-tech-writer` | Invoquer l'**agent** Paige ; pas de `bmad-bmm-*` dans le CSV |

### 3.3 Chaîne narrative officielle (extrait CSV)

Le champ `description` de **Create Story** indique explicitement le cycle : préparer story → puis **VS** → **DS** → **CR** → retour **DS** si besoin → **CS** suivante ou **ER**.

### 3.4 Workflows core « anytime » utiles à l'orchestration (module `core`)

| Skill Cursor (`skill-manifest`) | Rôle |
|--------------------------------|------|
| `bmad-help` | Routage « prochaine étape » ; rappelle **contexte frais** et qualité LLM pour validations |
| `bmad-party-mode` | Discussion multi-agents — pas un exécuteur de cycle fichier |

---

## 4. Carte d'identité : colonne `command` (bmad-help) → skill Cursor réel

Dans ce dépôt, pour les lignes **`module=bmm`** du CSV, la colonne **`command`** utilise souvent le préfixe **`bmad-bmm-`**. (Les lignes **`module=core`** peuvent avoir `command` déjà en **`bmad-*`** sans `-bmm-`, ex. `bmad-brainstorming`.) Le fichier **`_bmad/_config/skill-manifest.csv`** n'emploie **pas** `bmad-bmm-` dans les identifiants de skills ; les dossiers **`.cursor/skills/`** suivent ces identifiants (ex. `bmad-sprint-planning`, `bmad-code-review`).

**Règle pour les orchestrateurs :**

1. **Priorité** : `workflow-file` (`skill:…`) aligné sur `skill-manifest.csv` et le `name:` du `SKILL.md` sous `.cursor/skills/`.
2. La colonne **`command`** du CSV sert surtout à l'affichage **bmad-help** / docs BMAD — **ne pas** la copier-coller comme identifiant Cursor sans vérification.

### 4.1 Correspondance phase 4 (invocation Cursor)

| Code | `command` CSV (alias) | Skill Cursor à invoquer (`skill-manifest`) |
|------|----------------------|---------------------------------------------|
| SP | `bmad-bmm-sprint-planning` | `bmad-sprint-planning` |
| SS | `bmad-bmm-sprint-status` | `bmad-sprint-status` |
| CS / VS | `bmad-bmm-create-story` | `bmad-create-story` |
| DS | `bmad-bmm-dev-story` | `bmad-dev-story` |
| CR | `bmad-bmm-code-review` | `bmad-code-review` |
| ER | `bmad-bmm-retrospective` | `bmad-retrospective` |
| CC | `bmad-bmm-correct-course` | `bmad-correct-course` |
| DP | `bmad-bmm-document-project` | `bmad-document-project` |
| GPC | `bmad-bmm-generate-project-context` | `bmad-generate-project-context` |
| QQ | `bmad-bmm-quick-dev` | `bmad-quick-dev` |

**QA (code QA)** : pas dans ce tableau — voir **§4.2** (`bmad-qa-generate-e2e-tests`).

*(Pour les phases 1–3, appliquer la même méthode : lire `workflow-file` et `skill-manifest.csv`.)*

### 4.2 Cas particulier QA

- **bmad-help.csv** : `command` = **`bmad-bmm-qa-automate`**, `workflow-file` = **`skill:bmad-qa-generate-e2e-tests`**.
- **skill-manifest.csv** et **`.cursor/skills/bmad-qa-generate-e2e-tests/`** : identifiant réel **`bmad-qa-generate-e2e-tests`**.

**Recommandation :** invoquer **`bmad-qa-generate-e2e-tests`** ; traiter **`bmad-bmm-qa-automate`** comme **alias documentaire** du CSV uniquement.

---

## 5. Priorité du workflow Sprint Status (routeur BMAD)

Fichier : `_bmad/bmm/4-implementation/bmad-sprint-status/workflow.md`.

**Step 3 — ordre de recommandation `next_workflow_id` :**

1. Story `in-progress` → **`dev-story`** (première dans l'ordre trié epic/story)
2. Sinon story `review` → **`code-review`**
3. Sinon story `ready-for-dev` → **`dev-story`**
4. Sinon story `backlog` → **`create-story`**
5. Sinon rétro `optional` → **`retrospective`**
6. Sinon → fin / félicitations

**Modes d'exécution :** `interactive` (défaut), `data` (step 20 : sortie structurée pour un appelant), `validate` (step 30 : validation du fichier).

**Limites pour une fabrique « intelligente » :**

- **QA** n'apparaît **pas** dans cette priorité — à ajouter manuellement dans ton contrat (ex. gate après DS, avant CR ou après CR selon politique d'équipe).
- **Validate Story (VS)** n'est **pas** un état dans `sprint-status.yaml` ; le fichier utilise `backlog | ready-for-dev | in-progress | review | done`. La validation de story est une **étape de process** entre CS et passage en dev, pas un statut YAML standard dans ce template.

**Risques codés dans le workflow (extraits) :** story en `review` → signaler code-review ; `last_updated` vieux → avertissement stale ; story orpheline (préfixe epic inexistant) ; epic `in-progress` sans stories.

**Mapping `next_workflow_id` → skill Cursor :** les IDs du Step 3 (`dev-story`, `code-review`, …) sont des **noms de workflow** BMAD ; pour l'outil Cursor, résoudre vers **`bmad-dev-story`**, **`bmad-code-review`**, **`bmad-create-story`**, **`bmad-retrospective`** (et non vers la colonne `command` du CSV sans vérification).

---

## 6. Statuts YAML (référence rapide)

**Stories :** `backlog`, `ready-for-dev`, `in-progress`, `review`, `done` (legacy : `drafted` → traiter comme `ready-for-dev`).  
**Epics :** `backlog`, `in-progress`, `done` (legacy : `contexted` → `in-progress`).  
**Rétrospectives :** `optional`, `done`.

Clés : epics `epic-N` ; stories `N-M-slug...` ; `epic-N-retrospective`.

---

## 7. Sources markdown des workflows (chemins réels)

L'implémentation lue par les skills Cursor est sous :

`_bmad/bmm/4-implementation/bmad-<workflow>/workflow.md`

Exemples :

- `bmad-sprint-planning`, `bmad-sprint-status`, `bmad-create-story`, `bmad-dev-story`, `bmad-code-review`, `bmad-qa-generate-e2e-tests`, `bmad-retrospective`, `bmad-correct-course`

**Attention :** `_bmad/_config/workflow-manifest.csv` peut référencer des chemins **non présents** dans ce workspace (ex. arborescence `bmm/workflows/4-implementation/*.yaml`). Pour l'automatisation, se fier aux dossiers **`bmad-*`** ci-dessus et aux skills `.cursor/skills/`.

---

## 8. Agents Cursor (miroir BMAD)

Les tables dans `.cursor/skills/bmad-agent-sm/SKILL.md` et `.cursor/skills/bmad-agent-dev/SKILL.md` mappent codes **SP, CS, DS, CR, ...** vers les noms de skills — utile pour générer des prompts stables ; **valider** chaque nom contre **§4.1** avant génération de pipeline.

**BMad Master** (`_bmad/core/agents/bmad-master.md`, manifest : `_bmad/_config/agent-manifest.csv`) : titre long incluant « Workflow Orchestrator » ; en pratique **menu interactif** (tâches, workflows, party mode), **pas** un enchaîneur autonome CS→DS→CR.

---

## 9. Human-in-the-loop et contexte frais (obligations méthode)

- **`_bmad/core/bmad-help/SKILL.md`** (et procédure bmad-help) : exécuter les workflows dans une **fenêtre de contexte fraîche** quand possible ; validations avec **LLM de meilleure qualité** si disponible.
- **`bmad-code-review`** : checkpoints avec **HALT** / entrée humaine ; étapes prévues pour revues parallèles **sans** tout l'historique de conversation (`step-02-review.md`, etc.).
- **`bmad-sprint-planning`** / template sprint-status : note sur code-review en **contexte frais** ou autre LLM.

**Implication fabrique :** le contrat d'exécution doit nommer les **nœuds HITL** (merge, arbitrage produit, validation sécurité) et les **sous-sessions** (nouveau chat, Task en lecture seule, etc.).

---

## 10. Skills core complémentaires

| Skill | Fichier | Usage |
|-------|---------|--------|
| `bmad-help` | `_bmad/core/bmad-help/SKILL.md` | Routage et règles d'affichage catalogue |
| `bmad-party-mode` | `_bmad/core/bmad-party-mode/workflow.md` | Orchestration **conversationnelle** multi-agents |
| `bmad-index-docs`, `bmad-shard-doc`, revues éditoriales | `bmad-help.csv` lignes `module` core | Doc et qualité de contenu, pas cycle sprint |

---

## 11. Ce que BMAD ne fournit pas (à implémenter côté fabrique)

1. **Aucun exécutable** dans le dépôt qui enchaîne SP→SS→CS→VS→DS→QA→CR sans LLM : tout est **instruction** pour modèle.
2. **Pas de persistance automatique** du YAML : les workflows **disent** de mettre à jour `sprint-status.yaml` ; ce n'est pas un moteur transactionnel.
3. **Sprint Status** ne couvre pas **QA** ni **VS** dans la priorité à 6 branches.
4. **Validate Story** : même skill que CS — l'orchestrateur doit passer un **mode explicite** dans le prompt utilisateur.
5. **Orchestration multi-étapes Cursor** : à base de **skill maison** (graphe d'états + gates shell/tests + HITL), **Task** / sous-agents optionnels ; **pas** de chaîne autonome hors session LLM (voir §15).
6. **Dérive de version BMAD** : `_bmad/bmm/config.yaml` indique une version installateur (ex. **6.2.1**) — après upgrade, revérifier CSV, chemins et ce recueil.

---

## 12. Schéma de graphe minimal recommandé (fabrique v0)

Pour un premier contrat d'exécution (pseudo-code). **Noms = skills Cursor** (§4.1), pas seuls les alias `bmad-bmm-*` du CSV.

1. Lire `_bmad/bmm/config.yaml` → chemins.
2. Lire `sprint-status.yaml` → `development_status`.
3. Option A : déléguer la décision à la logique **Step 3** de `bmad-sprint-status` (reproduction fidèle), puis résoudre `next_workflow_id` vers les skills **§4.1** / **§5** (dernier paragraphe).
4. Option B : insérer **entre** `ready-for-dev` et `in-progress` une étape **VS** (prompt **`bmad-create-story`** en mode validation) si politique équipe.
5. Après DS : gate **tests** (terminal / Docker) puis **`bmad-qa-generate-e2e-tests`** si pertinent, puis **`bmad-code-review`** en session fraîche.
6. Sur échec CR → retour DS ; sur succès → mettre à jour statut story et boucler SS ou CS.

---

## 13. Documents projet à croiser (hors `_bmad`)

| Document | Rôle |
|----------|------|
| `_bmad-output/planning-artifacts/epics.md` | Découpage stories ; dépendances epic (ex. Epic 3) |
| `_bmad-output/planning-artifacts/guide-pilotage-v2.md` | Rythme Piste A/B, convergences, jalons |
| `references/index.md` | Point d'entrée `references/` |
| Ce dossier `references/automatisation-bmad/` | Évolution de la fabrique |

---

## 14. Checklist — agent qui « fabrique » un workflow à la volée

- [ ] Chemins résolus depuis `config.yaml` du module bmm.
- [ ] `sprint-status.yaml` : clés et statuts reconnus ; pas d'orphelin epic/story.
- [ ] Prochaine action : soit **reproduction Step 3** sprint-status, soit graphe étendu (VS, QA).
- [ ] Invocations : utiliser **§4.1** / `skill-manifest` — **pas** seulement la colonne `command` du CSV.
- [ ] Skill QA : **`bmad-qa-generate-e2e-tests`** (alias CSV : `bmad-bmm-qa-automate`).
- [ ] CR (et validations lourdes) : **nouveau contexte** / meilleur modèle.
- [ ] Points HITL documentés (merge, sécurité, arbitrage métier).
- [ ] Gates objectifs (lint, test, build, e2e) **avant** de marquer `done`.
- [ ] **CC** et autres **anytime** : ne pas les traiter comme « phase 4 » dans un routeur à phases séquentielles strictes.

---

## 15. Cadre Cursor et conventions d'orchestration (post-QA2)

Cette section **cadre** les agents coordinateurs Epic/Story dans les **limites réelles** de BMAD + Cursor : pas de moteur d'exécution magique, pas de promesse de réduction globale des tokens.

### 15.1 Pas d'exécution automatique (hors Cursor / hors LLM)

- Il n'existe **pas** dans ce dépôt de **daemon**, de **CI headless** ni de script qui enchaîne seul SP→CR : chaque workflow BMAD reste une **invocation** (skill, agent, conversation) sous **contrôle humain**.
- Les **Task** Cursor sont des **contextes LLM séparés** : utiles pour alléger le chat principal, **pas** un orchestrateur garanti par la plateforme (imbrication Task **non** garantie selon version / mode).
- Toute « automatisation » visée par la fabrique = **discipline documentée** + **briefs** + **HITL** aux nœuds sensibles (merge, YAML, sécurité).

### 15.2 Coût contexte (tokens)

- Déléguer en sous-agents peut **réduire** la taille du fil du coordinateur Epic ; le **total** de tokens peut **augmenter** (re-lecture des `SKILL.md`, briefs répétés). Formuler l'objectif comme **fenêtre Epic lisible** et **reprises possibles**, pas comme loi de baisse globale des coûts.

### 15.3 Préséance : `bmad-sprint-status` (Step 3) vs file d'attente epic

- Le **Step 3** de `bmad-sprint-status` **ne encode ni QA ni VS** et ne remplace pas le graphe CS→VS→DS→(gates)→QA→CR choisi par l'équipe.
- **Règle recommandée** : pour **quelle story** traiter au sein d'un epic cible, suivre l'**ordre des stories** dans `epics.md` (ex. 3.0 puis 3.1…) croisé avec `sprint-status.yaml` ; utiliser **bmad-sprint-status** pour **synthèse**, alertes (stale, orphelins) et **cohérence** avec le YAML, pas comme seule vérité du graphe interne story.

### 15.4 Écritures `sprint-status.yaml`

- Éviter **plusieurs writers** concurrents (Epic Runner + Story Runner + humain) sans règle : préférer **un** rôle autorisé à muter le YAML pour une story donnée, ou **patch proposé + validation humaine** avant application.

### 15.5 Reprise et artefacts d'état (convention documentaire)

- Fichiers optionnels du type `story_run` / `epic_run` (phase courante, compteurs de boucles, `story_key`) sont des **aides à la reprise manuelle** après coupure de session — **pas** une persistance transactionnelle fournie par BMAD.
- Après chaque étape, un worker peut annoncer **`PASS` | `FAIL` | `NEEDS_HITL`** + compteurs (`cr_loop`, `qa_loop`, …) pour limiter les **échecs silencieux** et les interprétations ambiguës.

### 15.6 Gates shell / Docker / navigateur

- En l'absence d'automate, l'**humain** ou l'agent dans Cursor **lance** les commandes. Prévoir **timeouts** et politique de **code de retour** (échec explicite) ; en cas de blocage prolongé → **HALT** / HITL.

### 15.7 Create Story vs Validate Story

- Même skill **`bmad-create-story`** : tout brief doit inclure un **`mode` explicite** (`create` | `validate`) et des critères de sortie VS avant passage en dev.

### 15.8 Code review et contexte frais

- Une **Task** « code-review » **ne garantit pas** une session isolée ni un modèle « haut de gamme ». Préférer un **chat ou Task dédié** avec historique minimal, ou documenter le **risque accepté** (voir §9).

### 15.9 Jalons produit (ex. Convergence 1, mocks Epic 3)

- Pour **Piste A**, **Convergence 1**, **Story 3.4** (mocks `ContextEnvelope`), se référer à **`_bmad-output/planning-artifacts/guide-pilotage-v2.md`** et au PRD / `epics.md` — ne pas résumer ces jalons uniquement dans un plan d'agents sans lien.

---

## 16. Historique du recueil

| Version | Date | Changement |
|---------|------|------------|
| 1 | 2026-04-02 | Création initiale après audit `_bmad/`, `bmad-help.csv`, workflows sprint-status / sprint-planning, skills Cursor. |
| 2 | 2026-04-02 | Corrections post-QA2 : synthèse vs « source de vérité », `user_skill_level`, CC en `anytime`, carte CSV→skill Cursor (§4), QA §4.2, phase 4 vs catalogue complet, `command` vide tech writer, graphe §12 en noms Cursor, mapping Step 3→skills, dérive version BMAD, checklist. |
| 3 | 2026-04-02 | QA finale : précision `module=bmm` vs `core` pour la colonne `command` ; renvoi QA sous tableau §4.1 ; confirmation `skill-manifest` sans préfixe `bmad-bmm-`. |
| 4 | 2026-04-02 | §15 cadre Cursor (pas d'exécution auto, tokens, SS vs epics, writers YAML, reprise, gates, mode CS/VS, CR, jalons guide-pilotage) ; sommaire ; §11 point 5 sans CI implicite ; historique en §16. |
| 5 | 2026-04-02 | Livrables orchestrateurs : `epic-story-runner-spec.md`, agents `bmad-epic-runner` / `bmad-story-runner`, skill `bmad-epic-runner` ; index dossier + `references/index.md` (version BMM alignée `config.yaml`) ; passes QA / consolidation spec (§5.4, §7.1, §11, gates, limites Task). |
