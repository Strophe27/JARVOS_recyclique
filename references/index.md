# Index — JARVOS Recyclique v0.1.0

Refonte complete de Recyclique 1.4.4. Nouveau backend. Solo dev : Strophe. BMAD 6.0.3.

> **Agents — point d'entree unique.** Ne charge pas `references/` en entier.
> Lis cet index : il contient un abstract de chaque ressource.
> Charge uniquement ce que ta session necessite — les indications "(Charger si : …)" sont la pour ca.

**references/** = construction du projet (contexte interne, specs, matière pour Brief/PRD).  
**doc/** (racine) = communication publique (modes d'emploi, présentations, supports à partager).

---

## Etat et suivi

- **`ou-on-en-est.md`** — Etat actuel du projet, resume de la derniere session, prochaine etape logique.
  _(Charger si : tu arrives sans contexte, session de planification, ou debut d'une nouvelle conversation importante.)_

- **`todo.md`** — To-do de reflexion, recherche et agregations hors flux BMAD (hors epics/stories).
  _(Charger si : session d'ideation, de recherche ou de synthese conceptuelle.)_

- **`idees-kanban/`** — Kanban d'idees (un fichier par idee, stades a-conceptualiser, a-rechercher, a-creuser, a-faire, archive). Vue globale : **idees-kanban/index.md**. Gestion : skill **idees-kanban** (`.cursor/skills/idees-kanban/`).
  _(Charger si : Strophe donne une idee a noter, ajout de note / transition / archivage, ou session d'ideation / priorisation.)_

- **`besoins-terrains.md`** — Liste des besoins remontes du terrain (v1.4.4, Discord / ressourcerie). Dynamique, pour priorisation et brainstorm brownfield.
  _(Charger si : priorisation, brainstorm brownfield, ou ajout de remontees terrain.)_

---

## Conventions et regles

- **`INSTRUCTIONS-PROJET.md`** — Conventions completes : nommage des fichiers, structure des sous-dossiers, regles de maintenance de l'index, format de `ou-on-en-est.md` et `todo.md`.
  _(Charger uniquement si : tu dois creer ou modifier un fichier dans `references/`.)_

- **`procedure-git-cursor.md`** — Procedure Git dans Cursor : ce que l'agent peut faire, ce que l'utilisateur fait, credentials, workflow et depannage.
  _(Charger si : operations Git, configuration, ou delegation au subagent Git.)_

- **`versioning.md`** — Statuts de maturité produit (alpha interne, beta terrain, v1.0 prod) et règles de tags. Ancien repo 1.4.4.
  _(Charger si : cadrage de statut produit, release, tag Git.)_

- **Décisions architecturales (v0.1)** — Checklist : `references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md` ; architecture : `_bmad-output/planning-artifacts/architecture.md` (sections Gap Analysis, Implementation Readiness, Implementation Handoff). Résumé aussi en tête de `_bmad-output/planning-artifacts/epics.md`. À charger pour toute session sur epics, stories ou implémentation socle/modules.
  _(Charger si : travail sur epics, stories, code socle, loader, slots, tests frontend, ou alignement agents.)_

- **Subagent @git-specialist** — Expert Git du projet. Workflow et limites : voir `procedure-git-cursor.md`. Fichier : `.cursor/agents/git-specialist.md`.
  _(Charger si : delegation d'operations Git a l'agent specialise.)_

---

## Sous-dossiers

Chaque dossier liste son contenu dans son propre **index** : `references/<dossier>/index.md`. Le detail ne figure pas ici.

- **`artefacts/`** — Artefacts temporaires de handoff entre agents. Sous-dossier `artefacts/archive/` pour artefacts historiques (ex. plan Git execute). Detail : **artefacts/index.md**.
  _(Charger : si un artefact est mentionne dans `ou-on-en-est.md` ou selon le besoin de la session.)_

- **`idees-kanban/`** — Kanban d'idees. Vue globale : **idees-kanban/index.md**. Gestion : skill idees-kanban.
  _(Charger : idee a capturer, note / transition / archivage, ou session d'ideation.)_

- **`recherche/`** — Prompts et reponses de recherche externe (Perplexity, Claude.ai, GPT, etc.). Detail : **recherche/index.md**.
  _(Charger : fichiers mentionnes dans ou-on-en-est ou sur demande explicite.)_

- **`ecosysteme/`** — References JARVOS_ecosysteme et JARVOS_fondations. Confidentiel. Gitignore. Detail : **ecosysteme/index.md**. Les documents ecosysteme sont **references** (liens, index), jamais **copies** ailleurs.
  _(Charger : sur demande explicite uniquement.)_

- **`ancien-repo/`** — Instructions git clone + guide analyse brownfield Recyclique 1.4.4. `repo/` gitignore. Sortie du workflow **document-project** (analyse referentielle pour migration) : **ancien-repo/index.md** et docs associees (overview, API, modeles, composants, integration, liste endpoints, architecture brownfield).
  _(Charger : si la session porte sur l'historique, l'analyse brownfield ou l'import de decisions.)_

- **`migration-paeco/`** — Guides Paheko/RecyClique, TODO, comptes-rendus, decla eco-organismes. Detail : **migration-paeco/index.md**.
  _(Charger : session sur integration Paheko, decla eco-organismes ou historique decisions.)_

- **`paheko/`** — Guide et reference Paheko : instructions de clone, lien doc officielle (Fossil). Clone du code source dans **paheko/repo/** (gitignore). Detail : **paheko/index.md**.
  _(Charger : session sur integration Paheko, analyse API/extensions ou croisement avec migration-paeco.)_

- **`vision-projet/`** — Matière pour la vision projet (Brief, roadmap, présentations, contexte RAG/JARVOS nano-mini). Detail : **vision-projet/index.md**.
  _(Charger : session sur vision projet, Brief BMAD, ou contexte "ou on va".)_

- **`_depot/`** — Dépôt de fichiers en attente de ventilation vers les bons dossiers. Gestion : skill **traiter-depot** (`.cursor/skills/traiter-depot/`). Pour exécution en contexte isolé : déléguer à **@depot-specialist** (`.cursor/agents/depot-specialist.md`). Peut rester vide.
  _(Charger : session de tri / ventilation du depot.)_

- **`dumps/`** — Dumps BDD sensibles (Paheko prod, Recyclic prod) pour analyse locale. Gitignore. Pas d'index. Déposer ici les sauvegardes SQLite/PostgreSQL ; 2e passe = monter les bases et cartographier les correspondances.
  _(Charger : session analyse BDD ou 2e passe correspondances.)_

- **`vrac/`** — Fichiers non classes. Sensible. Gitignore. Pas d'index.
  _(Charger : sur demande explicite uniquement.)_

---

## Hors references (racine projet)

- **`doc/`** — Communication publique : modes d'emploi, presentations (financeurs, partenaires), supports a partager. Index : **doc/index.md**.
  _(Utiliser pour tout document destine a etre publie ou partage en l'etat.)_
