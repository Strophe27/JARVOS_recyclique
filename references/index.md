# Index — JARVOS Recyclique v0.1.0

**Ligne directrice (2026-03-31) :** évolution **incrémentale** à partir du code **`recyclique-1.4.4`** stabilisé et nettoyé ; pas de réécriture « from scratch » comme plan conducteur. Les sorties BMAD actives ont été réinitialisées ; l’historique PRD/epics est sous `_bmad-output/archive/2026-03-31_pivot-brownfield-recyclique-1.4.4/`. Solo dev : Strophe. **Module BMM** : version **installateur 6.2.1** (voir `_bmad/bmm/config.yaml`) — ne pas se fier à d'éventuelles mentions d'une version BMAD plus ancienne dans les archives ou résumés datés.

**Audit du dossier `references/` (2026-03-31) :** pack en trois volets — [synthèse globale](artefacts/2026-03-31_02_audit-references-00-synthese-globale.md), [zones principales](artefacts/2026-03-31_03_audit-references-01-zones-principales.md), [ancien-repo / vision / paheko / tri / racine](artefacts/2026-03-31_04_audit-references-02-ancien-vision-paheko-tri-racine.md). À utiliser pour tri, reclassement et mise à jour des index.

> **Agents — point d’entrée unique.** Ne charge pas `references/` en entier.
> Lis cet index : il contient un abstract de chaque ressource.
> Charge uniquement ce que ta session nécessite — les indications « (Charger si : …) » sont là pour ça.

**references/** = construction du projet (contexte interne, specs, matière pour Brief/PRD).  
**doc/** (racine) = communication publique (modes d’emploi, présentations, supports à partager).

---

## État et suivi

- **`ou-on-en-est.md`** — État actuel du projet, résumé des sessions, prochaine étape logique (inclut la **bascule BMAD** 2026-03-31).
  _(Charger si : tu arrives sans contexte, session de planification, ou début d’une conversation importante.)_

- **Porte d’entrée agent BMAD vierge** — [artefacts/2026-03-31_06_porte-entree-agent-bmad-vierge.md](artefacts/2026-03-31_06_porte-entree-agent-bmad-vierge.md) : ordre de chargement des docs (état, audit `references/`, idées, recherches) + prompt prêt à coller pour brainstorming.
  _(Charger si : nouvelle session BMAD sans historique de chat.)_

- **`todo.md`** — To-do de réflexion, recherche et agrégations hors flux BMAD (hors epics/stories).
  _(Charger si : session d’idéation, de recherche ou de synthèse conceptuelle.)_

- **`idees-kanban/`** — Kanban d’idées (un fichier par idée, stades a-conceptualiser, a-rechercher, a-creuser, a-faire, archive). Vue globale : **idees-kanban/index.md**. Gestion : skill **idees-kanban** (`.cursor/skills/idees-kanban/`). *Ne pas éditer l’index Kanban à la main.*
  _(Charger si : Strophe donne une idée à noter, note / transition / archivage, ou session d’idéation / priorisation.)_

- **`guide-pilotage-v2.md`** (BMAD) — [_bmad-output/planning-artifacts/guide-pilotage-v2.md](../_bmad-output/planning-artifacts/guide-pilotage-v2.md) : document maître d’**exécution** v2 — réconciliation des deux récits de rythme (séquence PRD / décision directrice vs Pistes A/B et convergences), **jalons à cocher** (Convergence 1–3, Epics 1–10) synchronisés aux grands jalons avec `sprint-status.yaml` pour le grain fin, **carte des emplacements** pour audits, données, rapports de tests et handoffs, frictions connues, **prompt type** agent superviseur, lien **correct course**. Ne remplace pas le PRD ni l’index `references/` pour le détail métier.
  _(Charger si : pilotage multi-chantiers, agent superviseur, reprise après branches ou écrans multiples, besoin de savoir où ranger un livrable documentaire.)_

---

## Conventions et règles

- **`INSTRUCTIONS-PROJET.md`** — Conventions complètes : nommage des fichiers, structure des sous-dossiers, règles de maintenance de l’index, format de `ou-on-en-est.md` et `todo.md`.
  _(Charger uniquement si : tu dois créer ou modifier un fichier dans `references/`.)_

- **`procedure-git-cursor.md`** — Procédure Git dans Cursor : ce que l’agent peut faire, ce que l’utilisateur fait, credentials, workflow et dépannage.
  _(Charger si : opérations Git, configuration, ou délégation au subagent Git.)_

- **`versioning.md`** — Convention de versions et tags (v0.1.0 → v1.0.0). Ancien repo 1.4.4. **Source de vérité pour le périmètre par version** (à réaligner au fil du pivot produit si besoin).
  _(Charger si : release, tag Git, planification de version.)_

- **Subagent @git-specialist** — Expert Git du projet. Workflow et limites : voir `procedure-git-cursor.md`. Fichier : `.cursor/agents/git-specialist.md`.
  _(Charger si : délégation d’opérations Git à l’agent spécialisé.)_

---

## Sous-dossiers

Chaque dossier liste son contenu dans son propre **index** : `references/<dossier>/index.md`. Le détail ne figure pas ici.

- **`artefacts/`** — Artefacts temporaires de handoff entre agents ; **audit références 2026-03-31** (`2026-03-31_0*_audit-references-*.md`). Sous-dossier `artefacts/archive/` pour artefacts historiques (ex. plan Git exécuté). Détail : **artefacts/index.md**.
  _(Charger : si un artefact est mentionné dans `ou-on-en-est.md`, pour l’audit références, ou selon le besoin de la session.)_

- **`idees-kanban/`** — Kanban d’idées. Vue globale : **idees-kanban/index.md**. Gestion : skill idees-kanban.
  _(Charger : idée à capturer, note / transition / archivage, ou session d’idéation.)_

- **`recherche/`** — Prompts et réponses de recherche externe (Perplexity, Claude.ai, GPT, etc.). Détail : **recherche/index.md**.
  _(Charger : fichiers mentionnés dans ou-on-en-est ou sur demande explicite.)_

- **`consolidation-1.4.5/`** — Référentiel pour l’audit brownfield et l’assainissement de la base active `recyclique-1.4.4/`. Croiser avec **migration-paeco/** pour l’interop Paheko. Détail : **consolidation-1.4.5/index.md**.
  _(Charger : audit qualité/cohérence, priorisation technique, assainissement brownfield, DB/migrations locales.)_

- **`ecosysteme/`** — Références JARVOS_ecosysteme et JARVOS_fondations. Confidentiel. Gitignore. Détail : **ecosysteme/index.md**. Les documents écosystème sont **références** (liens, index), jamais **copies** ailleurs.
  _(Charger : sur demande explicite uniquement.)_

- **`ancien-repo/`** — Instructions git clone + analyse brownfield Recyclique 1.4.4. `repo/` gitignore. Sortie **document-project** : **ancien-repo/index.md** et docs associées. Point d’entrée dossier : **ancien-repo/README.md**.
  _(Charger : historique, analyse brownfield, checklist import depuis 1.4.4.)_

- **`automatisation-bmad/`** — Recueil technique pour **orchestrer** le cycle BMAD dans Cursor (chemins, `sprint-status`, **mapping colonne CSV → skills Cursor**, anytime vs phase 4, HITL, graphe minimal, **§15 cadre : pas d'exécution automatique headless**). Spec runners : **automatisation-bmad/epic-story-runner-spec.md** ; agents **`.cursor/agents/bmad-epic-runner.md`** / **`bmad-story-runner.md`** ; skill **`bmad-epic-runner`**. Index : **automatisation-bmad/index.md**.
  _(Charger : skill orchestrateur, pipeline story par story, gates tests/CI, contrat d'exécution au-dessus de BMAD.)_

- **`migration-paeco/`** — Guides Paheko/RecyClique, TODO, comptes-rendus, décla éco-organismes. Croiser avec **consolidation-1.4.5/** pour le code. Détail : **migration-paeco/index.md**.
  _(Charger : intégration Paheko, décla éco-organismes, historique décisions.)_

- **`paheko/`** — Guide et référence Paheko : clone, doc officielle (Fossil). Code source dans **paheko/repo/** (gitignore). Détail : **paheko/index.md**.
  _(Charger : intégration Paheko, analyse API/extensions ou croisement avec migration-paeco.)_

- **`peintre/`** — Travail et synthèses sur JARVOS Peintre (pipeline nano → macro, layout, commandes, widgets) ; complète **recherche/** (allers-retours IA externes) sans la remplacer. Détail : **peintre/index.md**.
  _(Charger : cadrage Peintre, macro affichage / agents, alignement `peintre-nano/` avec la vision long terme.)_

- **`vision-projet/`** — Matière pour la vision projet (Brief, roadmap, présentations, contexte RAG/JARVOS nano-mini). Détail : **vision-projet/index.md**.
  _(Charger : vision projet, Brief BMAD, ou contexte « où on va ».)_

- **`temporaire-pour-tri/`** — Zone non canonique (imports à ventiler vers artefacts/recherche). Détail : **temporaire-pour-tri/index.md**.
  _(Charger : tri avant déplacement vers les dossiers canoniques.)_

- **`_depot/`** — Dépôt de fichiers en attente de ventilation vers les bons dossiers. Gestion : skill **traiter-depot** (`.cursor/skills/traiter-depot/`). Pour exécution en contexte isolé : déléguer à **@depot-specialist** (`.cursor/agents/depot-specialist.md`). Peut rester vide.
  _(Charger : session de tri / ventilation du dépôt.)_

- **`dumps/`** — Dumps BDD sensibles pour analyse locale. Gitignore. Pas d’index. Déposer ici les sauvegardes SQLite/PostgreSQL ; 2e passe = monter les bases et cartographier les correspondances.
  _(Charger : session analyse BDD ou 2e passe correspondances.)_

- **`vrac/`** — Fichiers non classés. Sensible. Gitignore. Pas d’index.
  _(Charger : sur demande explicite uniquement.)_

---

## Hors references (racine projet)

- **`doc/`** — Communication publique : modes d’emploi, présentations (financeurs, partenaires), supports à partager. Index : **doc/index.md**.
  _(Utiliser pour tout document destiné à être publié ou partagé en l’état.)_

- **`_bmad-output/`** — Sorties BMAD actives (`planning-artifacts/`, `implementation-artifacts/`) + **README** ; archive pivot : **`_bmad-output/archive/2026-03-31_pivot-brownfield-recyclique-1.4.4/`**. Pilotage d’exécution v2 : **`planning-artifacts/guide-pilotage-v2.md`** (abstract sous **État et suivi** ci-dessus).
