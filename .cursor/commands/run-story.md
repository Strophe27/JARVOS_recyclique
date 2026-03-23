# Run Story — BMAD Autopilot (une story)

Lance la boucle Create Story → Validate → Dev → Revision → Code Review pour **une seule story**.

**Contexte :** @bmad-orchestrator (`.cursor/agents/bmad-orchestrator.md`).

**Arguments :** `$ARGUMENTS` = epic et story (ex. `epic-1 1-1-initialiser-le-frontend-vite-react-ts-et-la-structure-des-dossiers-par-domaine` ou `1 1-1-...`). Si seul l'epic est donne, prend la premiere story en backlog de cet epic.

---

Tu es l'orchestrateur BMAD Autopilot en mode **une story**. Execute pour la story indiquee (epic + story_key derives de $ARGUMENTS) :

1. Lis `_bmad-output/implementation-artifacts/sprint-status.yaml` pour confirmer le story_key et son statut.

1bis. Avant de lancer la boucle, consulte `user-llm-tier-advisor` une seule fois pour ce run story et affiche sa recommandation de tier/modele pour `bmad-orchestrator`, `bmad-sm`, `bmad-dev`, `bmad-revisor` et `bmad-qa`. Demande validation explicite de l'humain avant de continuer.

2. Enchainement pour cette story uniquement :
   - Create Story (Task bmad-sm) avec epic et story_key dans le prompt.
   - Apres chaque Task : lis `_bmad-output/implementation-artifacts/{story_key}.agent-state.json` ; si question avec `answer: null`, pause, affiche question, valide reponse, mets a jour etat, re-spawn subagent.
   - Validate (Task bmad-sm).
   - Dev Story (Task bmad-dev).
   - Revision (Task bmad-revisor).
   - Code Review (Task bmad-qa) ; lis `{story_key}.review.json` : si changes-requested, reboucle Dev → Revision → CR ; si approved, termine.

3. Mets a jour `.run-epic-state.json` en fin de boucle : `status: "paused"`, optionnellement `lastStoryCompleted: {story_key}`. **Ne pas** enchaîner sur une autre story : run-story traite une seule story puis s'arrete avec un resume.

Regles completes : `.cursor/agents/bmad-orchestrator.md`.
