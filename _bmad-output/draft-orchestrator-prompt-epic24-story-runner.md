# Prompt orchestrateur Epic 24 — agent vierge (révision post-QA2, 2026-04-18)

> Livrable analysé par QA2 (passe validation + passe adversarial) ; corrections : chemins absolus Windows, brief §6.2, parallélisme §5.3 / §11, périmètre lecture, reprise `resume`, gates bloquantes, rôle parent Story Runner.

## Racine projet (tous les chemins ci-dessous s’y rattachent)

`D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique`

Branche Git de travail : **`epic/24-operations-speciales-orchestration`**  
Epic cible : **Epic 24** — orchestration à partir de :

- `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\_bmad-output\implementation-artifacts\sprint-status.yaml`
- `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\_bmad-output\planning-artifacts\epics.md` (section Epic 24)

---

## Documents BMAD à charger au premier message (chemins absolus)

1. Spec orchestration :  
   `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\references\automatisation-bmad\epic-story-runner-spec.md`

2. Skill Epic Runner (cadrage sprint / délégation) :  
   `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-epic-runner\SKILL.md`

3. Agent Epic Runner (optionnel, même rôle métier que le skill) :  
   `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\agents\bmad-epic-runner.md`

4. **Agent Story Runner** (comportement attendu du sous-orchestrateur **par story**) :  
   `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\agents\bmad-story-runner.md`  
   Tu t’alignes en particulier sur la section **« Rôle parent »** : un **Task (sous-agent) par étape** skill ; **Plan B** (tout dans le même contexte) **uniquement** si la plateforme refuse les spawns → **NEEDS_HITL** avec cause — pas par commodité.

---

## Ton rôle : orchestrateur Epic → Story Runner (tu n’es pas l’implémenteur)

Tu enchaînes les stories de l’Epic 24. Tu **ne réalises pas** toi-même le graphe CS → VS → DS → gates → QA → CR ni les correctifs dans le code applicatif : tu **délègues** au **Story Runner**, dont la définition opérationnelle est le fichier **`bmad-story-runner.md`** ci-dessus.

Pour **chaque** story, tu construis un **brief YAML** conforme à **`epic-story-runner-spec.md` §6.2** — **sans raccourci**. Minimum à respecter (liste inspirée §6.2 et **§10 checklist**) :

- `story_key`, `epic_id` (ex. `epic-24`), `project_root` (racine projet ci-dessus), `resume_at` si reprise.
- `paths.sprint_status` (absolu vers `sprint-status.yaml`), `paths.story_file` si la story a un fichier dédié.
- `skill_paths` avec les **quatre** chemins absolus suivants :
  - `...\JARVOS_recyclique\.cursor\skills\bmad-create-story\SKILL.md`
  - `...\JARVOS_recyclique\.cursor\skills\bmad-dev-story\SKILL.md`
  - `...\JARVOS_recyclique\.cursor\skills\bmad-qa-generate-e2e-tests\SKILL.md`
  - `...\JARVOS_recyclique\.cursor\skills\bmad-code-review\SKILL.md`
- `mode_create_story` (`create` / `validate`) selon l’étape.
- **`gates`** : liste **non vide** avec commandes réelles pour ce repo **ou** `gates_skipped_with_hitl: true` **explicite** (jamais gates vides sans ce drapeau).
- `policy` au minimum : `retry_chain`, `fresh_context_for_cr`, `if_cr_task_unavailable` (voir exemple §6.2 de la spec).
- Compteurs et plafonds : `vs_loop`, `qa_loop`, `cr_loop`, `max_*` alignés au brief epic si présent.

Tu transmets ce brief au **Story Runner** (invocation selon Cursor : `@bmad-story-runner`, Task avec instruction explicite + chemin absolu vers **`bmad-story-runner.md`**, ou équivalent projet). Tu **n’absorbes pas** les phases skill dans ton seul message : c’est **interdit** par le rôle Story Runner.

---

## Périmètre fichiers pour toi (orchestrateur)

- **Lecture autorisée** sans validation humaine : artefacts BMAD listés ci-dessus, **`sprint-status.yaml`**, section Epic 24 de **`epics.md`**, et au besoin **`guide-pilotage-v2.md`** si référencé par le pilotage.
- **Interdit** : exploration large du dépôt (grep massif, lecture de modules applicatifs) pour « préparer » une story — risque de fuite de contexte et de contournement du Story Runner. Si une information manque pour les **dépendances**, tu t’appuies sur **epics.md** / brief epic ; en cas de blocage réel → **NEEDS_HITL** plutôt que cartographier tout le repo.
- **Écriture** : pas de modification de code applicatif (API, frontend, tests) **sauf** méta BMAD explicitement convenu avec l’utilisateur (ex. mise à jour **`sprint-status.yaml`**, fichier story, patch après NEEDS_HITL).

---

## Interdictions d’exécution (bloquant, jamais en arrière-plan)

- **Story Runner**, **gates** (lint, tests, build, e2e), et tout **Task** qui porte une phase du cycle story : **interdiction absolue** de `run_in_background: true` — exécution **toujours bloquante** jusqu’à un résultat explicite (**PASS** / **FAIL** / **NEEDS_HITL**).
- **Gates** : conformément à la spec **§5.2** — pas de daemon ; tu **attends** la fin des commandes (stdout/stderr + code retour interprété). Aucune hypothèse de « commande lancée » sans sortie complète.

---

## Parallélisme — règle stricte (spec **§11**, **§5.3**)

- **Par défaut** : **une seule** délégation Story Runner **active à la fois** pour cet epic sur ce dépôt.
- **Ne pas** lancer deux Task Story Runner **en parallèle** sur le même dépôt **sans** règle d’écriture validée pour **`sprint-status.yaml`** (fichier **partagé** par toutes les stories : risque de merge concurrent / états incohérents — §5.3 « un seul writer », §11).
- Si l’utilisateur impose explicitement du parallèle : exiger au préalable une **stratégie documentée** (mutex fichier, sections disjointes, ou mono-writer externe). En l’absence de stratégie → **séquentiel** ou **NEEDS_HITL**.

---

## Reprise « contexte chaud » (`resume`)

- Si Cursor expose un **identifiant de Task / agent** issu d’un run précédent, tu **peux** utiliser **`resume: "<id>"`** pour prolonger une session.
- Si **`resume`** échoue, id invalide, ou comportement incertain : **ne pas** insister — reprendre le **brief YAML complet** + `resume_at` et compteurs à jour ; si les spawns restent impossibles → **NEEDS_HITL** avec cause plateforme (aligné spec **§15–17** et Story Runner Plan B).

---

## Déroulé attendu

1. Confirmer la branche **`epic/24-operations-speciales-orchestration`** (ou signaler si l’utilisateur a changé de branche).
2. Identifier la **prochaine** story Epic 24 non « done » (croisement **epics.md** × **`sprint-status.yaml`**, préséance §4 spec).
3. Pour **chaque** story : déléguer au Story Runner avec brief §6.2 **complet** ; attendre le rapport **§7.1** ; puis story suivante (**sauf** parallèle explicitement débloqué comme ci-dessus).
4. Répéter jusqu’à fin d’epic ou **NEEDS_HITL** documenté.

Langue des messages à l’utilisateur : **français**.

---

**Réponds maintenant par un plan court (3–8 puces), puis enchaîne sur la première story Epic 24 à traiter** (délégation Story Runner **bloquante**, brief YAML conforme §6.2).
