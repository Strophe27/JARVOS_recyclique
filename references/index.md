# Index â€” JARVOS Recyclique v0.1.0

Refonte complete de Recyclique 1.4.4. Nouveau backend. Solo dev : Strophe. BMAD 6.0.3.

> **Agents â€” point d'entree unique.** Ne charge pas `references/` en entier.
> Lis cet index : il contient un abstract de chaque ressource.
> Charge uniquement ce que ta session necessite â€” les indications "(Charger si : â€¦)" sont la pour ca.

**references/** = construction du projet (contexte interne, specs, matiÃ¨re pour Brief/PRD).  
**doc/** (racine) = communication publique (modes d'emploi, prÃ©sentations, supports Ã  partager).

---

## Etat et suivi

- **`ou-on-en-est.md`** â€” Etat actuel du projet, resume de la derniere session, prochaine etape logique.
  _(Charger si : tu arrives sans contexte, session de planification, ou debut d'une nouvelle conversation importante.)_

- **`todo.md`** â€” To-do de reflexion, recherche et agregations hors flux BMAD (hors epics/stories).
  _(Charger si : session d'ideation, de recherche ou de synthese conceptuelle.)_

- **`idees-kanban/`** â€” Kanban d'idees (un fichier par idee, stades a-conceptualiser, a-rechercher, a-creuser, a-faire, archive). Vue globale : **idees-kanban/index.md**. Gestion : skill **idees-kanban** (`.cursor/skills/idees-kanban/`).
  _(Charger si : Strophe donne une idee a noter, ajout de note / transition / archivage, ou session d'ideation / priorisation.)_

---

## Conventions et regles

- **`INSTRUCTIONS-PROJET.md`** â€” Conventions completes : nommage des fichiers, structure des sous-dossiers, regles de maintenance de l'index, format de `ou-on-en-est.md` et `todo.md`.
  _(Charger uniquement si : tu dois creer ou modifier un fichier dans `references/`.)_

- **`procedure-git-cursor.md`** â€” Procedure Git dans Cursor : ce que l'agent peut faire, ce que l'utilisateur fait, credentials, workflow et depannage.
  _(Charger si : operations Git, configuration, ou delegation au subagent Git.)_

- **`versioning.md`** â€” Convention de versions et tags (v0.1.0 â†’ v1.0.0). Ancien repo 1.4.4. **Source de vÃ©ritÃ© pour le pÃ©rimÃ¨tre par version.**
  _(Charger si : release, tag Git, planification de version.)_

- **Subagent @git-specialist** â€” Expert Git du projet. Workflow et limites : voir `procedure-git-cursor.md`. Fichier : `.cursor/agents/git-specialist.md`.
  _(Charger si : delegation d'operations Git a l'agent specialise.)_

---

## Sous-dossiers

Chaque dossier liste son contenu dans son propre **index** : `references/<dossier>/index.md`. Le detail ne figure pas ici.

- **`artefacts/`** â€” Artefacts temporaires de handoff entre agents. Sous-dossier `artefacts/archive/` pour artefacts historiques (ex. plan Git execute). Detail : **artefacts/index.md**.
  _(Charger : si un artefact est mentionne dans `ou-on-en-est.md` ou selon le besoin de la session.)_

- **`idees-kanban/`** â€” Kanban d'idees. Vue globale : **idees-kanban/index.md**. Gestion : skill idees-kanban.
  _(Charger : idee a capturer, note / transition / archivage, ou session d'ideation.)_

- **`recherche/`** â€” Prompts et reponses de recherche externe (Perplexity, Claude.ai, GPT, etc.). Detail : **recherche/index.md**.
  _(Charger : fichiers mentionnes dans ou-on-en-est ou sur demande explicite.)_

- **`consolidation-1.4.5/`** â€” RÃ©fÃ©rentiel durable pour l'audit brownfield et le backlog d'assainissement de la base active `recyclique-1.4.4/`. Detail : **consolidation-1.4.5/index.md**.
  _(Charger : session d'audit qualitÃ©/cohÃ©rence, priorisation technique, assainissement brownfield ou prÃ©paration d'une refonte fondÃ©e sur l'existant.)_

- **`ecosysteme/`** â€” References JARVOS_ecosysteme et JARVOS_fondations. Confidentiel. Gitignore. Detail : **ecosysteme/index.md**. Les documents ecosysteme sont **references** (liens, index), jamais **copies** ailleurs.
  _(Charger : sur demande explicite uniquement.)_

- **`ancien-repo/`** â€” Instructions git clone + guide analyse brownfield Recyclique 1.4.4. `repo/` gitignore. Sortie du workflow **document-project** (analyse referentielle pour migration) : **ancien-repo/index.md** et docs associees (overview, API, modeles, composants, integration, liste endpoints, architecture brownfield).
  _(Charger : si la session porte sur l'historique, l'analyse brownfield ou l'import de decisions.)_

- **`migration-paeco/`** â€” Guides Paheko/RecyClique, TODO, comptes-rendus, decla eco-organismes. Detail : **migration-paeco/index.md**.
  _(Charger : session sur integration Paheko, decla eco-organismes ou historique decisions.)_

- **`paheko/`** â€” Guide et reference Paheko : instructions de clone, lien doc officielle (Fossil). Clone du code source dans **paheko/repo/** (gitignore). Detail : **paheko/index.md**.
  _(Charger : session sur integration Paheko, analyse API/extensions ou croisement avec migration-paeco.)_

- **`vision-projet/`** â€” MatiÃ¨re pour la vision projet (Brief, roadmap, prÃ©sentations, contexte RAG/JARVOS nano-mini). Detail : **vision-projet/index.md**.
  _(Charger : session sur vision projet, Brief BMAD, ou contexte "ou on va".)_

- **`_depot/`** â€” DÃ©pÃ´t de fichiers en attente de ventilation vers les bons dossiers. Gestion : skill **traiter-depot** (`.cursor/skills/traiter-depot/`). Pour exÃ©cution en contexte isolÃ© : dÃ©lÃ©guer Ã  **@depot-specialist** (`.cursor/agents/depot-specialist.md`). Peut rester vide.
  _(Charger : session de tri / ventilation du depot.)_

- **`dumps/`** â€” Dumps BDD sensibles (Paheko prod, Recyclic prod) pour analyse locale. Gitignore. Pas d'index. DÃ©poser ici les sauvegardes SQLite/PostgreSQL ; 2e passe = monter les bases et cartographier les correspondances.
  _(Charger : session analyse BDD ou 2e passe correspondances.)_

- **`vrac/`** â€” Fichiers non classes. Sensible. Gitignore. Pas d'index.
  _(Charger : sur demande explicite uniquement.)_

---

## Hors references (racine projet)

- **`doc/`** â€” Communication publique : modes d'emploi, presentations (financeurs, partenaires), supports a partager. Index : **doc/index.md**.
  _(Utiliser pour tout document destine a etre publie ou partage en l'etat.)_

