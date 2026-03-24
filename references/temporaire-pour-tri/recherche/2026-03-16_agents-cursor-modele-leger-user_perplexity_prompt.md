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
