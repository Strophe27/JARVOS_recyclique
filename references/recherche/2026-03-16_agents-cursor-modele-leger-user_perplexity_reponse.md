<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Voilà un prompt de recherche d'un de mes agents Cursor pour commencer à paramétrer tout ça. Je vais créer toutes ces données que tu m'as données. Je les ai croisées aussi avec Notebook.lm, etc. pour les affiner encore, les structurer. Du coup, j'ai créé des fichiers JSON, fichiers texte d'instruction, etc. pour pouvoir donner à des agents qui puissent retrouver très facilement toutes ces informations-là que tu es allé chercher. Voici un prompt de recherche d'un de ces agents, le constructeur de ça. Et tu peux l'augmenter de recherches complémentaires que tu joues le nécessaire et pouvoir mettre tout ça dans une belle réponse que je vais vous donner.

# Recherche Perplexity Pro — Cursor : agents niveau user, modèle le plus léger, orchestrateur

**Objectif** : Obtenir une synthèse documentée et à jour sur la création d’agents Cursor au niveau utilisateur (global), l’imposition du modèle le plus léger à un agent, et la façon dont un orchestrateur peut définir ou vérifier le modèle des sous-agents. Réponses en français, avec sources officielles ou communautaires (2024–2026) quand tu les connais.

---

## 1. Agents et règles au niveau user (global) dans Cursor

- Où sont stockés les agents et les rules au niveau utilisateur (global), par opposition au niveau projet (.cursor/ dans le repo) ? Chemins sous Windows si possible.
- Comment créer un agent (ou une rule) qui s’applique à tous les projets ? Format des fichiers, frontmatter, éventuelle priorité projet vs user.
- Les skills Cursor peuvent-ils être définis au niveau user et réutilisés dans n’importe quel projet ?

---

## 2. Forcer le modèle le plus léger pour un agent

- Comment configurer un agent Cursor pour qu’à chaque invocation (par l’utilisateur ou par un autre agent via Task) il utilise toujours le modèle le plus léger / le plus rapide (équivalent “Tier 1”, ex. Haiku, Flash, ou option “fast” / “compte auto”) ?
- Le frontmatter `model: fast` dans le fichier .md de l’agent suffit-il pour toutes les invocations (chat direct, Task depuis un orchestrateur) ? Y a-t-il des cas où le modèle global ou le Max Mode override ce réglage ?
- Existe-t-il un paramètre de l’outil Task (ou de l’API Cursor) pour passer le modèle souhaité au moment du spawn, indépendamment du fichier agent ?

---

## 3. Orchestrateur qui spawn des sous-agents : choix du modèle

- Quand un agent de type “orchestrator” invoque un sous-agent via l’outil Task (subagent_type, prompt), comment le modèle du sous-agent est-il déterminé ? Uniquement par le frontmatter du fichier du sous-agent, ou l’orchestrateur peut-il spécifier le modèle pour cette invocation ?
- Si la doc ou l’API permet de passer un paramètre “model” lors du Task, décris le mécanisme et les valeurs possibles (fast, inherit, model-id).

---

## 4. Vérifier que le bon modèle a été appliqué (monitoring)

- Comment vérifier ou monitorer, après une réponse d’un agent (ou d’un sous-agent), quel modèle a effectivement été utilisé pour cette réponse ? (interface Cursor, logs, métadonnées de réponse, usage / crédits.)
- Y a-t-il une façon pour un agent de “déclarer” ou d’afficher son identité (nom de l’agent, modèle utilisé) en début ou en fin de réponse, pour traçabilité ?

---

## 5. Déclaration d’identité par l’agent

- Est-il possible (par convention, par instruction dans le prompt de l’agent, ou par une fonctionnalité Cursor) de demander à chaque agent de décliner son identité en début ou en fin de travail (ex. “Agent : git-specialist | Modèle : fast”) ? Bonnes pratiques communautaires ou recommandations officielles pour la traçabilité des runs.

---

## 6. Points complémentaires utiles

- Plan Ultra / crédits API : impact du choix “fast” vs “inherit” vs modèle spécifique sur la consommation.
- Max Mode : est-ce qu’il affecte les sous-agents invoqués via Task ou seulement le chat principal ?
- Documentation officielle Cursor (docs.cursor.com ou équivalent) sur : Agents, Task tool, Model picker, User-level vs project-level configuration. Donne les liens ou les sections pertinents si tu les connais.

---

## 7. Synthèse demandée

En fin de réponse, fournir une section **“Recommandations concrètes”** : comment créer un agent user-level, comment lui imposer le modèle le plus léger, et comment un orchestrateur peut s’assurer que les sous-agents utilisent bien le modèle prévu (et comment le vérifier).

Voici la synthèse que tu pourras donner à ton agent “chercheur / constructeur Cursor”, structurée point par point, en intégrant les infos officielles récentes (2024–2026).

***

## 1. Agents \& règles niveau user (global)

- Les **sous‑agents utilisateur** sont stockés dans `~/.cursor/agents/` (et compatibilité `~/.claude/agents/`, `~/.codex/agents/`).[^1]
- Les **sous‑agents projet** sont dans `.cursor/agents/` (ou `.claude/agents/`, `.codex/agents/`) à la racine du repo, avec priorité au projet en cas de conflit de nom.[^1]
- Les **skills** peuvent être définies au niveau projet (`.cursor/skills/` ou `.agents/skills/`) ou **au niveau user** via `~/.cursor/skills/` et sont automatiquement chargées au démarrage de Cursor.[^2][^3]
- Les règles globales (user‑level) sont gérées dans **Cursor Settings → Rules for AI**, stockées localement (profil Cursor, pas dans le repo).[^4][^5]

**Créer un agent / sous‑agent global :**

- Créer un fichier Markdown dans `~/.cursor/agents/mon-agent.md` avec un frontmatter YAML minimal (`name`, `description`, `model` éventuel), puis le prompt dans le corps du fichier.[^1]
- La **priorité** est : sous‑agent projet (`.cursor/agents/`) > sous‑agent user (`~/.cursor/agents/`) > compat Claude/Codex.[^1]

***

## 2. Forcer le modèle le plus léger pour un agent

- Chaque sous‑agent est défini par un fichier `.md` avec un champ `model` dans le frontmatter :
`model: fast`, `model: inherit` ou un **ID de modèle** spécifique.[^1]
- Si tu veux qu’un agent utilise *toujours* le modèle le plus léger, mets `model: fast` dans son frontmatter (exemple officiel `verifier` avec `model: fast`).[^1]
- `inherit` signifie que le sous‑agent se cale sur le **modèle de l’agent parent / contexte courant** (sélection modèle global ou Max Mode).[^1]

**Overrides possibles :**

- Le champ `model` du sous‑agent est la source principale de vérité pour ce sous‑agent, mais si tu laisses `inherit`, c’est le **sélecteur de modèle global** / Max Mode qui décide derrière.[^1]
- Il n’y a pas, dans la doc subagents, de mention d’un override systématique du champ `model` par Max Mode si tu as explicitement mis `model: fast`.[^1]

***

## 3. Orchestrateur qui spawn des sous‑agents

- Conceptuellement, l’“orchestrateur” n’est qu’un agent parent qui délègue via l’outil **Task** aux sous‑agents définis dans `.cursor/agents/` ou `~/.cursor/agents/`.[^6][^1]
- Le **modèle du sous‑agent** est déterminé par :

1. Son frontmatter `model` (`fast`, `inherit` ou `model-id`).[^1]
2. S’il est en `inherit`, par le modèle courant de l’agent parent (incluant Max Mode / modèle choisi).[^1]

La doc subagents décrit bien `model` comme champ de configuration central du sous‑agent, mais ne décrit pas, à ce jour, de paramètre `model` passé directement dans l’appel Task dans l’UI/IDE ; le contrôle se fait via le fichier et `inherit`.[^1]

***

## 4. Vérifier quel modèle a été utilisé (monitoring)

- Les docs subagents insistent sur les **considérations de coûts** et indiquent que chaque subagent a sa propre fenêtre de contexte et sa propre consommation de tokens, mais ne documentent pas un “log modèle par run” dans l’UI.[^1]
- La partie “Performances et coûts” explique que chaque subagent consomme des tokens **indépendamment** et que lancer plusieurs sous‑agents en parallèle multiplie la consommation (et donc l’usage / crédits API), mais ne donne pas un endroit précis dans l’interface où voir “model=haiku/sonnet/etc.”.[^1]
- Côté facturation, la communauté confirme que les plans (Pro, Ultra) facturent à **prix API des modèles**, avec crédit global (\$20 / \$70 / \$400) consommé quelle que soit la source (agent principal ou subagents).[^7][^8]

En pratique, aujourd’hui, la vérification du modèle est surtout indirecte (sélecteur de modèle dans la barre Cursor, configuration `model` dans le fichier agent, et dashboard d’usage Crédit/plan).

***

## 5. Déclaration d’identité par l’agent

- Les docs officielles Cursor (subagents, skills) ne décrivent pas de champ standard “identity” qui serait automatiquement affiché en début/fin de réponse.[^3][^1]
- Par contre, tu peux imposer cela **par convention** dans le prompt de ton agent / sous‑agent, par exemple en ajoutant dans le corps :

> “Commence chaque réponse par : `Agent : {{name}} | Modèle : {{model}} (si connu)`.”
- Les guides communautaires d’orchestration subagents insistent davantage sur une bonne description (`description`) pour que l’agent sache quand déléguer, que sur des conventions d’affichage, mais tu peux parfaitement institutionnaliser cette pratique dans ton écosystème.[^9]

***

## 6. Points complémentaires utiles

- **Skills user‑level réutilisables** :
    - Dossiers supportés : `.agents/skills/`, `.cursor/skills/` pour le projet, `~/.cursor/skills/` pour l’utilisateur global.[^3]
    - Elles sont détectées automatiquement au démarrage, et peuvent inclure scripts, références, assets, avec un `SKILL.md` décrivant quand les utiliser.[^3]
- **Ultra / crédits API** : plan Ultra ≈ abonnement mensuel + pool de crédits facturés au prix API des modèles, avec bonus (ex. \$400 de crédits pour \$200 sur certaines périodes), et blocage ou downgrade automatique du modèle quand tu approches du plafond.[^8][^7]
- **Max Mode** : agit au niveau du modèle global de l’agent principal (et donc de tout ce qui est en `inherit`). Les sous‑agents ayant `model: fast` restent explicitement en fast, ceux en `inherit` suivent.[^1]
- **Docs Cursor utiles** :
    - Subagents : structure, répertoires, champ `model`, coûts.[^1]
    - Skills : répertoires user/projet, format `SKILL.md`.[^3]
    - Rules \& config : règles globales vs projet, AGENTS.md, etc.[^5][^2][^4]

***

## 7. Recommandations concrètes (pour ton orchestrateur \& tes agents)

### a. Créer un agent user‑level global

1. Crée un fichier dans `~/.cursor/agents/mon-orchestrateur.md`.[^1]
2. Frontmatter minimal :

```yaml
---
name: orchestrator
description: >
  Orchestrateur principal. Planifie et délègue aux sous-agents
  spécialisés pour l’architecture, le code, les tests, la doc, etc.
model: inherit
---
```

3. Dans le corps, définis clairement son rôle (planification, découpe en tâches, délégation via subagents) et ajoute une convention d’identité en début de réponse.

### b. Imposer le modèle le plus léger

1. Pour chaque sous‑agent “cheap/rapide”, mets explicitement :

```yaml
---
name: verifier
description: >
  Valide le travail terminé. Utiliser pour vérifier que les
  implémentations sont fonctionnelles et bien testées.
model: fast
---
```

(pattern inspiré de l’exemple officiel `verifier`).[^1]
2. Pour les agents qui doivent **suivre** le modèle global (UI / Max Mode), utilise `model: inherit`.
3. Évite de laisser `model` vide si tu veux un comportement déterministe dans un orchestrateur ; spécifie `fast` ou `inherit` selon la criticité / coût souhaité.

### c. Orchestrateur qui s’assure du bon modèle des sous‑agents

1. Définis tous tes sous‑agents dans `.cursor/agents/` (projet) ou `~/.cursor/agents/` (globaux) avec un `model` explicite (`fast` pour cheap, `inherit` pour aligné, `model-id` pour cas premium).[^1]
2. Dans le prompt de l’orchestrateur, ajoute des instructions du type :
    - “Pour les tâches de vérification / exploration massive, utilise uniquement les sous-agents dont `model` est `fast`.”
    - “Ne délègue à des sous-agents premium (model-id spécifique) que si la tâche est critique ou si l’utilisateur l’exige explicitement.”
3. Utilise les **skills** pour encapsuler des workflows techniques, et les combiner avec les sous‑agents : skills globales dans `~/.cursor/skills/` pour tout ton écosystème, skills projet dans `.cursor/skills/` pour le contexte repo.[^3]
4. Vérifie la cohérence des modèles en auditant régulièrement :
    - les fichiers `~/.cursor/agents/*.md`, `.cursor/agents/*.md`,
    - ton usage / crédits sur le dashboard Cursor (surtout pour les runs parallèles de subagents).[^7][^1]

### d. Traçabilité \& identité

1. Dans chaque agent / sous‑agent, ajoute au prompt :
> “Commence chaque réponse par une ligne : `Agent: {{name}} | Scope: user|project | Model: {{model ou "hérité"}}`.”
2. Si tu veux remonter ça dans des logs externes, tu peux coupler ça à un **hook** Cursor qui capture les sorties d’agent et parse cette première ligne pour la stocker avec date, repo, etc.[^10][^3][^1]

***

Pour t’aider à passer à l’implémentation : tu veux que je te génère un squelette complet de fichiers (YAML + prompts) pour un orchestrateur + 3–4 sous‑agents typiques (planner, implementer, verifier, test‑runner) en français, directement copiables dans `~/.cursor/agents/` et `.cursor/agents/` ?
<span style="display:none">[^11][^12][^13][^14][^15][^16][^17]</span>

<div align="center">⁂</div>

[^1]: https://codefinity.com/fr/courses/v2/508f89fc-4a9c-489a-9a42-91a84d72138f/1bcbee06-4cb8-4cd4-a605-e0c11b6d0cbe/2560a257-c20f-4bd7-863e-b3c78aff1929

[^2]: https://cursor.com/docs/skills

[^3]: https://www.reddit.com/r/n8n/comments/1nj0ncl/8_n8n_fundamentals_that_will_make_you_build/

[^4]: https://kirill-markin.com/articles/cursor-ide-rules-for-ai/

[^5]: https://www.digitalapplied.com/blog/cursor-2-0-agent-first-architecture-guide

[^6]: https://cursor.com/docs/subagents

[^7]: https://www.reddit.com/r/cursor/comments/1o5t3gf/question_about_cursors_ultra_plan_200month_and/

[^8]: https://forum.cursor.com/t/running-out-of-ultra-plan-credits-before-renewal/150012

[^9]: https://forum.cursor.com/t/cursor-2-5-async-subagents/152125

[^10]: https://cursor.com/docs/hooks

[^11]: https://forum.cursor.com/t/an-extension-that-helps-manage-your-user-level-ai-configuration/153648

[^12]: https://cursor.com/docs/cloud-agent/setup

[^13]: https://cursor.com/docs/cli/reference/configuration

[^14]: https://forum.cursor.com/t/workspace-or-profile-scoped-cursor-config-rules-skills-subagents-mcp/153068

[^15]: https://frontendmasters.com/blog/choosing-the-right-model-in-cursor/

[^16]: https://forum.cursor.com/t/sub-agents-in-cursor-cli/152453

[^17]: https://www.youtube.com/watch?v=WVeYLlKOWc0

