Excellent. Toutes les informations nécessaires sont maintenant consolidées. Voici la réponse technique complète et actionnable.

***

## 1. Invocation des subagents par un agent parent

### Le tool `Task` — mécanisme exact

Quand tu crées des fichiers dans `.cursor/agents/`, Cursor injecte automatiquement dans le prompt de l'orchestrateur un bloc `<subagent_delegation_context>` qui lui explique qu'il peut déléguer via le tool `Task`. C'est le seul mécanisme natif.[^1]

**Signature du tool :**

```
Task(
  subagent_type: "agent-name",   // nom exact du fichier sans .md
  prompt: "instruction complète",
  is_background: true | false    // async (2.5) ou sync (2.4)
)
```

**Passage d'entrées au subagent :** tout se passe dans le `prompt` — il n'y a pas de paramètre fichier séparé. Tu passes les chemins et le contexte textuellement dans le prompt  :[^1]

```
Task(
  subagent_type: "bmad-sm",
  prompt: "Crée la story pour l'epic epic-03, story 3-1.
           Fichier epic source : bmad-output/planning-artifacts/epic-03.md
           Fichier sprint status : bmad-output/sprint-status.yaml
           Écris le résultat dans : bmad-output/stories/story-03-01.md",
  is_background: false
)
```


### Bug connu et contournement ⚠️

Il existe un bug confirmé en 2.4/2.5 : le tool `Task` **ne reconnaît pas les custom agents** définis dans `.cursor/agents/` lorsque le plan usage-based est utilisé, même si `<subagent_delegation_context>` est bien injecté. Le tool est injecté dans le système mais pas disponible dans le toolset de l'agent.[^1]

**Piste de test :** lance un agent parent avec un custom agent dans `.cursor/agents/bmad-sm.md`, tape `use the task tool to invoke bmad-sm`, et vérifie dans les logs si `Task` est listé dans les tools disponibles. Si non, le contournement est d'utiliser un **MCP server custom** comme proxy de dispatch.

***

## 2. Slash commands

### Emplacement et convention

Depuis Cursor 1.6 (officiel) : un fichier `.md` par commande dans `.cursor/commands/`  :[^2]

```
.cursor/
  commands/
    run-epic.md
    run-story.md
    bmad-status.md
```

Le nom du fichier (sans `.md`) devient le nom de la commande. `/run-epic` → `.cursor/commands/run-epic.md`.[^2]

### Format du fichier

**Pas de frontmatter YAML** pour les commands — c'est du Markdown pur, chargé comme prompt directement dans le chat  :[^3]

```markdown
# Run Epic

Tu es l'orchestrateur BMAD Autopilot.

Lis le fichier `bmad-output/sprint-status.yaml` pour identifier toutes les
stories `status: pending` de l'epic **$ARGUMENTS**.

Pour chaque story pending, dans l'ordre :
1. Utilise le tool Task pour déléguer au subagent `bmad-sm` la création de la story
2. Attends la complétion, puis délègue au subagent `bmad-dev`
3. Après code-review, mets à jour le statut dans sprint-status.yaml

En cas de blocage ou d'ambiguïté, écris dans `bmad-output/agent-state.json`
le champ `escalation: true` avec le motif, et arrête-toi.
```


### Référencer un agent précis depuis une command

Il n'y a **pas de directive YAML** pour lier une command à un agent — c'est géré via le **contenu du prompt** : tu mentionnes explicitement dans le fichier command quel agent charger ou quels subagents appeler. Le fichier command est juste un prompt enrichi, pas un manifeste.[^3]

Pour forcer Cursor à utiliser l'orchestrateur comme contexte : ajoute `@bmad-orchestrator.md` dans le corps de la command (Cursor résoudra le fichier `.cursor/agents/bmad-orchestrator.md` comme contexte).

***

## 3. Fichiers agents (`.cursor/agents/`)

### Format exact

Frontmatter YAML + corps Markdown  :[^4][^5]

```markdown
---
name: bmad-sm
description: >
  Scrum Master BMAD. Invoque-moi pour créer un fichier story depuis un epic,
  valider une story existante, ou lancer une rétrospective d'epic.
  Utilise-moi via Task(subagent_type="bmad-sm").
model: inherit
readonly: false
is_background: false
---

Tu es Bob, Scrum Master BMAD (workflow bmad-bmm-create-story).

## Ton rôle
Quand tu reçois une instruction de création de story :
1. Lis le fichier epic indiqué dans le prompt
2. Lis bmad-output/sprint-status.yaml pour connaître la story suivante
3. Génère le fichier story selon le template BMAD (bmad/bmm/templates/story-template.md)
4. Écris le résultat dans bmad-output/stories/[story-slug].md
5. Mets à jour sprint-status.yaml : story status → "ready-for-dev"
6. Si une information est manquante ou ambiguë : écris dans bmad-output/agent-state.json
   { "escalation": true, "agent": "bmad-sm", "reason": "..." } et arrête-toi.
```

**Champs frontmatter disponibles**  :[^5][^6]


| Champ | Valeur | Obligatoire |
| :-- | :-- | :-- |
| `name` | identifiant court (correspond au `subagent_type`) | ✅ |
| `description` | utilisé par l'orchestrateur pour décider de déléguer | ✅ |
| `model` | `inherit`, `fast`, ou ID modèle spécifique | optionnel |
| `readonly` | `true` interdit les écritures fichiers | optionnel |
| `is_background` | `true` = async en 2.5 | optionnel |

> **Attention bug 2.5** : le `model` spécifié dans le frontmatter est souvent ignoré — les subagents héritent du modèle parent. À tester impérativement.[^6]

### Chargement et invocation

Les agents sont invoqués **par nom** (`subagent_type: "bmad-sm"`) via le tool `Task`, ou manuellement en tapant `@bmad-sm` dans le chat. Il n'y a **pas de fichier manifeste/index** — Cursor scanne automatiquement `.cursor/agents/*.md` et les propose en autocomplétion dans les Settings → Rules, Skills, and Agents.[^7]

### Les 5 agents BMAD Autopilot — contenu minimum

```
.cursor/agents/
  bmad-orchestrator.md   → lit sprint-status.yaml, dispatche via Task(), gère escalades
  bmad-sm.md             → crée story depuis epic, met à jour statuses
  bmad-dev.md            → implémente story, auto-review, écrit status dans le fichier story
  bmad-revisor.md        → applique les corrections du code-review, re-soumet
  bmad-qa.md             → code-review qualité, écrit APPROVED ou CHANGES-REQUESTED
```

Chaque agent doit inclure dans son corps :

1. La référence au workflow BMAD à exécuter (`bmad-bmm-create-story`, `bmad-bmm-dev-story`, etc.)
2. Le chemin exact des fichiers en entrée et en sortie
3. La règle d'écriture de `bmad-output/agent-state.json` en cas d'escalade HITL

***

## 4. Hooks

### Configuration — chemin et format

Fichier : `.cursor/hooks.json` (projet) ou `~/.cursor/hooks.json` (global)[^8][^9]

```json
{
  "version": 1,
  "hooks": {
    "beforeSubmitPrompt": [{ "command": ".cursor/hooks/log-prompt.ps1" }],
    "beforeShellExecution": [{ "command": ".cursor/hooks/gate-shell.ps1" }],
    "afterFileEdit": [{ "command": ".cursor/hooks/detect-story-complete.ps1" }],
    "stop": [{ "command": ".cursor/hooks/route-next-step.ps1" }]
  }
}
```

Les chemins sont **relatifs au fichier `hooks.json`** — un script dans `.cursor/hooks/mon-script.ps1` s'écrit `hooks/mon-script.ps1`.[^9]

### PowerShell sur Windows ✅

Confirmé fonctionnel  :[^10]

```json
{
  "version": 1,
  "hooks": {
    "stop": [{
      "command": "powershell -NoProfile -ExecutionPolicy Bypass -File .cursor/hooks/route-next-step.ps1 stop"
    }],
    "afterFileEdit": [{
      "command": "powershell -NoProfile -ExecutionPolicy Bypass -File .cursor/hooks/detect-story-complete.ps1 afterFileEdit"
    }]
  }
}
```


### Les 6 événements disponibles et leur comportement

| Event | Input via stdin | Output JSON respecté ? | Usage BMAD Autopilot |
| :-- | :-- | :-- | :-- |
| `beforeSubmitPrompt` | prompt, attachments, conversation_id | ❌ informatif seulement | Log des prompts orchestrateur |
| `beforeShellExecution` | command, cwd | ✅ `continue/permission/userMessage/agentMessage` | Bloquer commandes dangereuses |
| `beforeMCPExecution` | server, tool_name, tool_input | ✅ même format | Contrôle accès MCP |
| `beforeReadFile` | file_path, content | ✅ allow/deny | Protéger fichiers sensibles |
| `afterFileEdit` | file_path, edits (old/new strings) | ❌ informatif seulement | Détecter écriture d'une story → déclencher next step |
| `stop` | status (completed/aborted/error) | ❌ informatif seulement | Router vers prochaine story après fin d'agent |

**Limitation importante** : `afterFileEdit` et `stop` sont **informatifs uniquement** — ton script PowerShell peut logger et déclencher un processus externe, mais ne peut pas injecter de contexte ou forcer une action dans Cursor. Pour la boucle automatique, le hook `stop` peut lire `sprint-status.yaml` et **lancer un nouveau chat Cursor via CLI** (`cursor --new-chat "..."`) pour déclencher la story suivante.[^9]

***

## Fiche récap actionnable

### Lancer un subagent depuis l'orchestrateur

```
Tool : Task
Paramètres : subagent_type="bmad-sm", prompt="[instruction + chemins fichiers]", is_background=false
Exemple :
  Task(subagent_type="bmad-sm",
       prompt="Crée story-03-01 depuis bmad-output/planning-artifacts/epic-03.md.
               Sprint status : bmad-output/sprint-status.yaml.
               Output : bmad-output/stories/story-03-01.md",
       is_background=false)
⚠️ Tester si Task est disponible dans le toolset — bug connu sur certains plans.
```


### Créer la commande `/run-epic`

```
Fichier : .cursor/commands/run-epic.md
Format : Markdown pur, pas de frontmatter
Contenu : prompt complet de l'orchestrateur, avec @bmad-orchestrator.md
          en référence de contexte et $ARGUMENTS pour l'ID de l'epic
```


### Créer un agent (ex. BMAD SM)

```
Fichier : .cursor/agents/bmad-sm.md
Champs obligatoires frontmatter : name, description
Corps : instructions de rôle + référence workflow BMAD + règles I/O fichiers + règle escalade HITL
Invocation : Task(subagent_type="bmad-sm") depuis orchestrateur
             ou @bmad-sm manuellement dans le chat
```


### Hook stop → déclencher story suivante (Windows)

```json
// .cursor/hooks.json
{ "version": 1, "hooks": {
    "stop": [{ "command": "powershell -NoProfile -ExecutionPolicy Bypass -File .cursor/hooks/route-next-step.ps1 stop" }]
}}
```

Le script lit `sprint-status.yaml`, trouve la prochaine story `pending`, et peut relancer via Cursor CLI ou écrire dans un fichier `next-action.json` que l'orchestrateur lit à son prochain démarrage.
<span style="display:none">[^11][^12][^13][^14][^15][^16][^17][^18][^19][^20][^21][^22][^23][^24][^25][^26][^27]</span>

<div align="center">⁂</div>

[^1]: https://forum.cursor.com/t/task-tool-missing-for-custom-agents-in-cursor-agents-documentation-pages-return-errors/149771

[^2]: https://cursor.com/changelog/1-6

[^3]: https://ezablocki.com/posts/cursor-slash-commands/

[^4]: https://forum.cursor.com/t/ide-removing-yaml-frontmatter-of-agents/148797

[^5]: https://lobehub.com/skills/tech-leads-club-agent-skills-cursor-subagent-creator

[^6]: https://forum.cursor.com/t/subagent-task-tool-ignores-model-specific-subagent-type-routing-all-subagents-inherit-parent-model-instead-of-using-their-designated-models-opus-codex/151917

[^7]: https://www.linkedin.com/posts/shreyshahh_cursor-just-added-sub-agents-and-skills-activity-7418044419792273408-XLgD

[^8]: https://forum.cursor.com/t/cursor-cli-doesnt-send-all-events-defined-in-hooks/148316/7

[^9]: https://blog.gitbutler.com/cursor-hooks-deep-dive

[^10]: https://skywork.ai/blog/how-to-cursor-1-7-hooks-guide/

[^11]: https://forum.cursor.com/t/repository-defined-custom-agents/80004

[^12]: https://cursor.com/changelog/2-4

[^13]: https://docs.cursor.com/en/background-agent

[^14]: https://docs.cursor.com/en/context/@-symbols/slash-commands

[^15]: https://forum.cursor.com/t/cursor-sub-agents/145696

[^16]: https://forum.cursor.com/t/local-slash-commands-cursor-commands-not-working-in-cursor-cloud/142997

[^17]: https://forum.cursor.com/t/cursor-hooks-not-detected/135709

[^18]: https://forum.cursor.com/t/does-cursor-support-subagents/127331

[^19]: https://forum.cursor.com/t/generate-cursor-rules-custom-command-workaround/139238

[^20]: https://forum.cursor.com/t/how-do-hooks-work-in-cursor-cli/150201

[^21]: https://forum.cursor.com/t/rule-frontmatter-format/146274

[^22]: https://cursor.com/docs/context/subagents

[^23]: https://skills.rest/skill/cursor-subagent-creator

[^24]: https://www.linkedin.com/posts/david-codina-b7b015230_slash-activity-7372112799109586944-MkIX

[^25]: https://www.youtube.com/watch?v=TAsWoEeqH8o

[^26]: https://www.cursor-cn.org/docs/at-symbols/slash-commands

[^27]: https://www.youtube.com/watch?v=A1wct93Haz4

