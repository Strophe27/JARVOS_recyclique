# Recherche Perplexity Pro — Cursor : subagents, commands, agents (Phase 0 BMAD Autopilot)

**Contexte** : Tu as déjà le contexte de notre discussion sur les prérequis Cursor 2.5 et BMAD Autopilot (commande slash unique, cascade Create Story → Validate → Dev Story → Revision → Code Review en subagents, HITL par escalade). On passe à l’implémentation et il reste des **zones d’ombre techniques** à trancher avec la doc ou le comportement réel de Cursor.

**Objectif** : Répondre de façon **concrète et actionnable** (noms de tools, format de fichiers, extraits de doc ou de schéma) pour les points ci‑dessous. Cible : Cursor IDE 2.5.x (Windows), usage local (pas Cloud Agents). Réponses en français sauf si la source officielle est en anglais.

---

## 1. Invocation des subagents par un agent parent

- Quel est le **mécanisme exact** pour qu’un agent (orchestrateur) lance un **subagent** avec un prompt et des entrées (ex. chemin du fichier story, instruction « exécute le workflow create-story pour la story 3-1 ») ?
- Y a‑t‑il un **tool** dédié (ex. `mcp_task`, « Task », « Run subagent ») ? Si oui : nom exact, paramètres attendus (prompt, subagent_type, timeout, etc.), format du prompt et des arguments. Si plusieurs mécanismes existent (sync / async), les distinguer.
- Où est-ce documenté officiellement (Cursor Docs, changelog 2.5, forum) ? Donner les liens ou les extraits pertinents.
- **Comportement** : le parent peut‑il passer des **fichiers ou chemins** en entrée au subagent (ex. `story_path`, `sprint_status_path`) ? Comment le subagent reçoit‑il ces entrées (dans le prompt, via un fichier, via un paramètre du tool) ?

---

## 2. Commandes slash et déclenchement de l’orchestrateur

- Où sont définies les **slash commands** dans un projet Cursor (dossier, convention de nom) ? Exemple : pour `/run-epic` ou `/run-story`, quel fichier créer et où (ex. `.cursor/commands/run-epic.md`) ?
- **Format** du fichier : structure attendue (frontmatter YAML ?, titre ?, contenu markdown). Comment Cursor associe le nom de la commande (ex. `run-epic`) au fichier ?
- Comment une commande peut‑elle **déclencher un agent précis** (orchestrateur) ? Faut‑il une référence à un fichier dans `.cursor/agents/` (ex. `bmad-orchestrator.md`) dans le fichier de la commande ? Si oui, quel format exact (lien, directive, champ YAML) ?
- Doc officielle : liens vers la doc Cursor sur les **commands** (et si possible les **agents** dans le même contexte).

---

## 3. Fichiers agents (`.cursor/agents/`)

- **Format** des fichiers dans `.cursor/agents/` : frontmatter (quels champs : name, description, autre ?), corps du fichier (prompt, instructions). Exemple minimal d’un fichier valide.
- Comment un agent est‑il **chargé** quand on invoque une commande ou un subagent ? (Ex. : la commande référence l’agent par nom, et Cursor charge le fichier correspondant.)
- Pour notre cas d’usage (BMAD Autopilot), on prévoit des **personas** : Orchestrateur, SM (Create Story / Validate), DEV (Dev Story), Revisor (Revision), QA (Code Review). Pour chacun, qu’est‑ce qui doit figurer **au minimum** dans le fichier agent (référence aux workflows BMAD, chemins de fichiers, règle d’écriture de `agent-state.json` en cas d’escalade) ? Les agents sont‑ils invoqués par **nom** (ex. `@bmad-sm`) ou par **fichier** ?
- Existe‑t‑il une **liste** ou un **manifeste** des agents du projet (ex. fichier index dans `.cursor/`) que Cursor utilise pour proposer les agents (autocomplétion, choix) ?

---

## 4. Hooks (optionnel mais utile)

- Où se configurent les **hooks** au niveau projet (fichier, chemin) ? Format (ex. `hooks.json` avec événements `subagentStop`, `sessionStart`, etc.).
- Sous **Windows**, les hooks peuvent‑ils appeler des scripts **PowerShell** (`.ps1`) ? Si oui, exemple de chemin et d’entrée dans le fichier de config.
- Doc ou lien vers la doc Cursor sur les hooks (événements disponibles, format d’entrée/sortie des scripts).

---

## 5. Synthèse demandée

En fin de réponse, fournir une **fiche récap** actionnable :
- **Pour lancer un subagent depuis l’orchestrateur** : tool à utiliser, paramètres, exemple de prompt.
- **Pour créer la commande `/run-epic`** : chemin du fichier, format, comment référencer l’orchestrateur.
- **Pour créer un agent (ex. BMAD Runner)** : chemin du fichier, champs obligatoires, exemple minimal.

Si une des questions n’a pas de réponse claire dans la doc ou le produit, l’indiquer explicitement et proposer une **piste de test** (ex. « créer un fichier X et vérifier que Cursor fait Y »).
