# Spec — Epic Runner & Story Runner (BMAD × Cursor)

**Date :** 2026-04-02  
**Public :** humains et agents qui orchestrent le cycle d'implémentation BMAD dans Cursor.  
**Cadre :** pas d'exécution automatique headless ; tout passe par invocation LLM + IDE. Voir [2026-04-02_recueil-technique-orchestration-bmad.md](2026-04-02_recueil-technique-orchestration-bmad.md) §11, §15.

**Agents associés :** `.cursor/agents/bmad-epic-runner.md`, `.cursor/agents/bmad-story-runner.md`.

---

## 1. Objectifs

- **Epic Runner** : garder une **fenêtre de chat légère** sur un epic cible ; choisir la prochaine story (règle §15.3) ; déléguer le détail à un **Story Runner** (Task ou session dédiée) ; proposer fin d'epic (rétro, correct course).
- **Story Runner** : exécuter le **graphe story** documenté ici (CS → VS → DS → gates → QA → CR) avec **plafonds** de boucle et sorties explicites ; respecter les **noms de skills Cursor** du recueil §4.1 / §4.2.
- **Story Runner — orchestration** : en pratique Cursor, le Story Runner doit se comporter comme **parent orchestrateur** : **un Task (sous-agent) par étape** correspondant à un skill BMAD (create-story create/validate, dev-story, qa-generate-e2e-tests, code-review), en **transmettant** le brief reçu à chaque enfant ; **ne pas** absorber tout le workflow dans un seul contexte sauf **Plan B** (spawn impossible → NEEDS_HITL). Détail : `.cursor/agents/bmad-story-runner.md` § Rôle parent.

**Limite plateforme (Cursor)** : enchaîner plusieurs **Task** ou **Task dans Task** n'est **pas** garanti selon version / mode. Les séquences ci-dessous sont une **discipline documentée** ; si un spawn échoue, appliquer le **plan B** (session unique, chat principal, **NEEDS_HITL**) — aligné recueil **§15.1**.

---

## 2. Chemins (depuis `_bmad/bmm/config.yaml`)

Résoudre `{project-root}` puis :

| Ressource | Chemin type |
|-----------|-------------|
| Config BMM | `_bmad/bmm/config.yaml` |
| Artefacts planning | `planning_artifacts` → ex. `_bmad-output/planning-artifacts` |
| Artefacts implémentation | `implementation_artifacts` → ex. `_bmad-output/implementation-artifacts` |
| `sprint-status.yaml` | `{implementation_artifacts}/sprint-status.yaml` |
| `epics.md` | `{planning_artifacts}/epics.md` |
| Stories `.md` | racine déclarée dans `sprint-status.yaml` (`story_location`), clés `N-M-slug` |
| Guide pilotage | `{planning_artifacts}/guide-pilotage-v2.md` |

---

## 3. Skills Cursor à invoquer (phase 4 + QA)

Ne pas utiliser seuls les alias `bmad-bmm-*` du CSV sans vérification.

| Étape | Skill Cursor | Notes |
|-------|--------------|--------|
| Synthèse sprint / reco | `bmad-sprint-status` | Step 3 **ne** couvre **ni** QA **ni** VS ; croiser `epics.md` |
| Plan sprint manquant | `bmad-sprint-planning` | Souvent HITL |
| Create story | `bmad-create-story` | `mode: create` |
| Validate story | `bmad-create-story` | `mode: validate` (même skill) |
| Dev | `bmad-dev-story` | |
| QA auto / e2e | `bmad-qa-generate-e2e-tests` | **Pas** `bmad-bmm-qa-automate` comme id Cursor |
| Code review | `bmad-code-review` | Préférer **contexte frais** (chat ou Task dédié) |
| Fin epic | `bmad-retrospective` | Code ER |
| Changement de cap | `bmad-correct-course` | Anytime CC |
| Aide catalogue | `bmad-help` | Ne pas dupliquer BMad Master |

Chemins des `SKILL.md` : `.cursor/skills/<skill-name>/SKILL.md` (à citer en **absolu** dans les briefs Task).

**Workflows BMAD sources (markdown)** : pour le détail procédural des étapes internes d'un workflow, voir recueil **§7** : `_bmad/bmm/4-implementation/bmad-<workflow>/workflow.md` (ex. `bmad-sprint-status`, `bmad-code-review`).

---

## 4. Choix de la prochaine story (Epic Runner)

1. Lire `development_status` dans `sprint-status.yaml` pour l'epic cible (ex. `epic-3` et stories `3-*`).
2. Lire l'**ordre des stories** dans `epics.md` pour cet epic (ex. 3.0 → 3.1 → …).
3. **Règle de préséance (recueil §15.3)** : la première story de `epics.md` qui n'est pas `done` et qui est cohérente avec le YAML est le **candidat par défaut**. Utiliser `bmad-sprint-status` pour **synthèse**, alertes (stale, orphelins), pas comme unique source du graphe interne.
4. Si `sprint-status.yaml` absent : proposer `bmad-sprint-planning` avant d'inventer un état.

---

## 5. Graphe d'états — Story Runner

États logiques (pas nécessairement des clés YAML pour VS) :

```text
CS_create → VS_validate → DS_dev → GATE → QA_tests → CR_review → YAML_update → (fin story)
```

- **VS** : si story incomplète → retour **CS** (ou réédition), incrémenter `vs_loop`.
- **Après CR** : si correctifs requis → **DS**, incrémenter `cr_loop`, puis **obligatoirement** : `GATE → QA → CR` (pas de saut de QA si la politique projet impose revalidation auto avant merge).
- **Après QA** : si échec bloquant → **DS**, incrémenter `qa_loop`, puis même chaîne `GATE → QA → CR`.

### 5.1 Plafonds (configurables dans le brief story)

- **Brief Epic (§6.1)** : champs `max_vs_loop`, `max_qa_loop`, `max_cr_loop` = **plafonds** cibles pour le run.
- **Brief Story (§6.2)** : champs `vs_loop`, `qa_loop`, `cr_loop` = **compteurs courants** (initialiser à 0 ; incrémenter à chaque retry du type concerné).
- Valeurs par défaut recommandées : **2 à 3** pour chaque plafond. Si plafond atteint → **HALT** + **NEEDS_HITL** (merge, skip, arbitrage).
- **Discipline compteurs** : à chaque tour, **recopier** les compteurs depuis le brief / message entrant ; si incohérence (ex. `qa_loop` qui diminue sans justification) → **STOP** + **NEEDS_HITL** (évite boucles « oubliées » par le LLM).

### 5.2 Gates (shell)

- **Humain ou agent** lance les commandes ; pas de daemon.
- Définir dans le brief : commandes (lint, test, build, e2e optionnel), **timeout**, code de retour interprété comme échec.
- **Windows / PowerShell** : chemins avec espaces → **guillemets** ou forme adaptée (`& '...'`) ; éviter les chaînes copiées-collées cassées.
- **Interprétation échec** : échec **reproductible en local** (code / tests) → piste **DS** + retry ; **environnement** (credentials, réseau flaky, service indisponible) → **NEEDS_HITL** avec cause ; ambiguïté → **FAIL** + cause + prochaine étape explicite (pas de boucle DS silencieuse).
- **Optionnel v1** : Docker, MCP navigateur, Playwright — selon epic (ex. Epic 3) ; documenter dans le brief si requis par `guide-pilotage-v2.md`.

### 5.3 Mise à jour YAML

- **Un seul writer** à la fois pour une story donnée (§15.4) : en pratique le Story Runner **applique** les changements **ou** produit un **patch / instructions** pour validation humaine avant écriture.
- **Avant toute écriture** sur `sprint-status.yaml` : confirmer qu'**aucune autre session** (autre chat, autre Task, autre humain) ne modifie la **même story / epic** en parallèle ; sinon **NEEDS_HITL** + relecture fichier.
- Statuts reconnus : voir recueil §6 (`backlog`, `ready-for-dev`, `in-progress`, `review`, `done` ; legacy `drafted` / `contexted`).

### 5.4 Synchronisation statuts YAML ↔ graphe (guide minimal)

| Phase logique | Statut YAML typique après PASS | Notes |
|---------------|----------------------------------|--------|
| Avant CS ou story à créer | `backlog` | |
| Après CS + VS validés, prêt pour dev | `ready-for-dev` ou `in-progress` selon équipe | VS n'est pas une clé YAML ; la transition est **décision process** |
| DS en cours | `in-progress` | |
| Après gates + QA, avant CR | souvent `in-progress` ou `review` selon politique | Passer en `review` quand le code est figé pour revue |
| Après CR OK + gates finaux | `done` | |

Adapter au template réel du projet ; l'important est d'**éviter deux interprétations contradictoires** sur « quand passer en review / done ».

---

## 6. Formats de brief (YAML minimal)

### 6.1 Brief Epic (`epic_run` — optionnel, convention documentaire)

```yaml
epic_id: epic-3
epic_label: "Epic 3 — …"
project_root: "<abs>"
paths:
  config_bmm: "<abs>/_bmad/bmm/config.yaml"
  sprint_status: "<abs>/_bmad-output/implementation-artifacts/sprint-status.yaml"
  epics_md: "<abs>/_bmad-output/planning-artifacts/epics.md"
  guide_pilotage: "<abs>/_bmad-output/planning-artifacts/guide-pilotage-v2.md"
story_order_hint: "ordre epics.md pour epic-3"
current_story_key: "3-2-example-slug"  # ou null au démarrage
max_vs_loop: 3
max_qa_loop: 3
max_cr_loop: 3
notes: "Jalons produit : voir guide_pilotage"
story_runner_final_report_required: true  # Epic Runner exige le format §7.1 en fin de Task Story
```

### 6.2 Brief Story (`story_run` — optionnel)

```yaml
story_key: "3-2-example-slug"
epic_id: epic-3
project_root: "<abs>"
resume_at: CS            # CS | VS | DS | GATE | QA | CR — point d'entrée si reprise milieu de cycle
paths:
  sprint_status: "<abs>/.../sprint-status.yaml"
  story_file: "<abs>/.../{story_key}.md"  # si applicable
skill_paths:
  create_story: "<abs>/.cursor/skills/bmad-create-story/SKILL.md"
  dev_story: "<abs>/.cursor/skills/bmad-dev-story/SKILL.md"
  qa_e2e: "<abs>/.cursor/skills/bmad-qa-generate-e2e-tests/SKILL.md"
  code_review: "<abs>/.cursor/skills/bmad-code-review/SKILL.md"
mode_create_story: create   # puis validate pour VS ; si resume_at: VS, passer directement en validate
gates:                      # liste non vide OU gates_skipped_with_hitl: true (explicite)
  - cmd: "npm test"        # exemple ; adapter au repo ; guillemets si espaces (Windows)
    timeout_sec: 300
gates_skipped_with_hitl: false   # si true : gates vides acceptés seulement avec validation humaine explicite
max_vs_loop: 3                   # optionnel : rappel plafond (doit matcher brief epic si présent)
max_qa_loop: 3
max_cr_loop: 3
vs_loop: 0
qa_loop: 0
cr_loop: 0
policy:
  retry_chain: "DS → gates → QA → CR"
  fresh_context_for_cr: true
  if_cr_task_unavailable: NEEDS_HITL  # pas de CR « dans le fil » sans accord ; ouvrir chat/Task dédié avec brief CR seul
```

**YAML mal formé** (indentation, guillemets typographiques) : ne pas deviner — **NEEDS_HITL** + redemander un brief valide.

---

## 7. Sortie standard d'une étape (worker / Task)

Après chaque phase, annoncer clairement :

- **`PASS`** | **`FAIL`** | **`NEEDS_HITL`**
- Compteurs : `vs_loop`, `qa_loop`, `cr_loop`
- Prochaine action en une phrase (ex. « Ouvrir Task bmad-code-review avec brief ci-joint »).

### 7.1 Rapport final Story Runner → Epic Runner

En fin de délégation Task (ou session Story), produire un bloc structuré :

- **`status_final`** : `PASS` | `FAIL` | `NEEDS_HITL`
- **Compteurs** : `vs_loop`, `qa_loop`, `cr_loop` (valeurs finales)
- **Fichiers touchés** (liste courte) ou « aucun »
- **Prochaine action** pour l'Epic Runner (story suivante, HALT, ou reprise avec brief mis à jour)

Si **skill** introuvable ou invocation impossible : **NEEDS_HITL** + action corrective (installer skill, chemin absolu, `@skill`).

---

## 8. Fin d'epic (Epic Runner)

Quand **toutes** les stories de l'epic cible sont `done` :

1. Proposer **`bmad-retrospective`** (ER).
2. Si choc de périmètre / cap : proposer **`bmad-correct-course`** (CC, anytime).

---

## 9. BMad Master et bmad-help

- **Ne pas remplacer** BMad Master (`_bmad/core/agents/bmad-master.md`) : menu méta, party mode, liste workflows.
- Pour navigation catalogue ou doute sur la prochaine étape BMAD hors cycle story : renvoyer vers **`bmad-help`** ou **BMad Master**.

---

## 10. Checklist rapide avant délégation Task

- [ ] Chemins absolus dans le brief.
- [ ] `mode` explicite pour `bmad-create-story` (create vs validate).
- [ ] Skill QA = `bmad-qa-generate-e2e-tests`.
- [ ] Chaîne retry après correctif = DS → gates → QA → CR.
- [ ] HITL documentés (merge, YAML, sécurité).
- [ ] `gates` non vide **ou** `gates_skipped_with_hitl: true` explicite.
- [ ] `resume_at` renseigné **si** reprise milieu de cycle (sinon nouvelle story → `CS` ou omis).

---

## 11. Critères d'acceptation (vérifiables)

- **Epic Runner** : la prochaine story suit **epics.md** croisé avec YAML ; `bmad-sprint-status` n'est pas la seule vérité du graphe interne.
- **Epic Runner** : ne lance **pas** deux Task Story Runner **en parallèle** sur le même dépôt sans règle d'écriture YAML.
- **Story Runner** : invoque les skills par **noms Cursor** §4 (dont QA = `bmad-qa-generate-e2e-tests`).
- **Story Runner** : après correctif CR ou QA, enchaîne **DS → gates → QA → CR** (pas de saut arbitraire de QA si la politique l'exige).
- **Sorties** : chaque phase annonce **PASS / FAIL / NEEDS_HITL** ; le rapport final respecte **§7.1**.
- **Plafonds** : si un compteur **atteint ou dépasse** le plafond du brief (`max_vs_loop`, `max_qa_loop`, `max_cr_loop`) → **HALT** + **NEEDS_HITL**.
- **YAML** : une seule session writer par story ; conflit détecté → **NEEDS_HITL**.
