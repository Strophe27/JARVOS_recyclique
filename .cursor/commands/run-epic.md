# Run Epic — BMAD Autopilot

Charge le contexte de l'orchestrateur et lance la boucle pour l'epic indique.

**Contexte :** @bmad-orchestrator (fichier `.cursor/agents/bmad-orchestrator.md`).

**Arguments :** `$ARGUMENTS` = identifiant de l'epic (ex. `epic-1` ou `1`). Si vide, utilise le premier epic ayant des stories en backlog dans `_bmad-output/implementation-artifacts/sprint-status.yaml`.

---

Tu es l'orchestrateur BMAD Autopilot. Execute la boucle suivante :

1. Lis `_bmad-output/implementation-artifacts/.run-epic-state.json`. Si present et `status: "running"`, demande a l'utilisateur : reprendre cet epic/story ou arreter (mettre status paused).

2. Lis `_bmad-output/implementation-artifacts/sprint-status.yaml`. Determine l'epic cible : si `$ARGUMENTS` est fourni (ex. epic-1), filtre sur cet epic ; sinon prend le premier epic avec au moins une story en `backlog`. Identifie la prochaine story a traiter (premiere story en backlog pour cet epic, en lisant development_status dans l'ordre).

2bis. Avant de lancer la cascade, consulte `user-llm-tier-advisor` une seule fois pour ce run complet et affiche sa recommandation de tier/modele pour `bmad-orchestrator`, `bmad-sm`, `bmad-dev`, `bmad-revisor` et `bmad-qa`. Demande validation explicite de l'humain avant de continuer.

3. Pour chaque story de l'epic (dans l'ordre), enchainement :
   - Create Story (Task bmad-sm) → apres chaque Task, lis `_bmad-output/implementation-artifacts/{story_key}.agent-state.json` : si existe et une question a `answer: null`, **pause** la cascade, affiche cette question a l'humain, valide la reponse (regles fixes : non vide, option valide si proposee), mets a jour l'etat, re-spawn le subagent concerne ; sinon continue.
   - Validate (Task bmad-sm) → meme controle agent-state.
   - Dev Story (Task bmad-dev) → meme controle ; en cas d'echec subagent, retry une fois puis ecris lastFailure et status paused dans `.run-epic-state.json`, arrete-toi.
   - Revision (Task bmad-revisor) → meme controle agent-state.
   - Code Review (Task bmad-qa) → apres CR, lis `_bmad-output/implementation-artifacts/{story_key}.review.json` : si `reviewResult: "changes-requested"`, relance Task(bmad-dev) avec instruction de corriger puis Revision puis CR ; si `approved`, passe a la story suivante ou fin d'epic.

4. Mets a jour `.run-epic-state.json` a chaque changement de story (`currentStoryKey`, `status: running`). En fin d'epic ou sur arret, mets `status: paused` et affiche un resume.

Reference complete des etapes et des regles HITL : `.cursor/agents/bmad-orchestrator.md`.
