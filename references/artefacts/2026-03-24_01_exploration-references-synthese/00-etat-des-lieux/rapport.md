# Etat des lieux references/

## Structure et conventions

- **`references/index.md`** : point d'entree unique pour les agents — abstracts par ressource, liens vers chaque `references/<dossier>/index.md`, distinction **references/** (construction interne) vs **`doc/`** (communication publique).
- **`references/INSTRUCTIONS-PROJET.md`** : regles pour **creer ou modifier** sous `references/` — tableau des usages par dossier, nommage artefacts (`YYYY-MM-DD_NN_titre-court.md`) et recherche (`YYYY-MM-DD_titre_[IA]_prompt|reponse.md`), maintenance des index (une entree = abstract actionnable avec « Charger si : … »), formats `ou-on-en-est.md` et `todo.md`, Kanban gere par le skill idees-kanban.
- **Regle transverse** : eviter les fichiers a la racine de `references/` sans raison ; preferer le sous-dossier adapte ; documents ecosysteme **references**, pas copies ailleurs.

## Table des dossiers (tableau : dossier | gitignore? | resume)

| Dossier | gitignore? | Resume |
|---------|------------|--------|
| `artefacts/` | Non (sous-chemins `*-nested-git-backup/` oui) | Artefacts temporaires de handoff entre agents ; convention datee ; sous-dossier `archive/` pour artefacts historiques (plan Git) ; index detaille des missions, decisions architecture Paheko/Recyclique, grilles de confrontation, checklists v0.1. |
| `idees-kanban/` | Non | Kanban d'idees (un fichier par idee, stades a-conceptualiser / a-rechercher / a-creuser / a-faire / archive) ; vue globale tabulaire dans `idees-kanban/index.md` ; gestion par skill idees-kanban. |
| `recherche/` | Non | Prompts et reponses de recherches externes (Perplexity, etc.) + `contexte-pour-recherche-externe.md` pour aligner les IA ; index thematique (modules Python, hooks, API caisse, poids, auth, catalogue Paheko). |
| `consolidation-1.4.5/` | Non | Referentiel durable audit brownfield et assainissement de `recyclique-1.4.4/` vers 1.4.5 : synthese, backlog, journal, protocole de journalisation, rapports dates backend/frontend. |
| `ecosysteme/` | **Oui** (dossier entier) | References confidentielles JARVOS ecosysteme / fondations ; index avec apercu court et document long ; chargement sur demande explicite uniquement. |
| `ancien-repo/` | `repo/` **Oui** | Documentation brownfield referentielle Recyclique 1.4.4 (apercu, stack, API, modeles, UI, integration, checklist import) ; clone source dans `repo/` ignore par Git. |
| `migration-paeco/` | Non | Guides Paheko/RecyClique, TODO, CR reunion, declarations eco-organismes ; sous-dossier `audits/` (correspondances caisse/poids, matrice) avec son propre index. |
| `paheko/` | `repo/` **Oui** | Guide Paheko, analyse brownfield, liste endpoints API ; schema BDD decrit sous `references/dumps/` ; code distribution clone dans `repo/` (ignore). |
| `vision-projet/` | Non | Matiere vision / Brief / PRD / presentations (RAG, nano-mini, module decla eco-organismes) ; regle de ne pas dupliquer ecosysteme. |
| `_depot/` | Contenu (`*`) **Oui** (sauf `.gitkeep`) | Depot de fichiers en attente de ventilation ; skill traiter-depot / agent depot-specialist. |
| `dumps/` | **Oui** | Dumps BDD sensibles et schemas extraits pour analyse locale ; pas d'index dedie dans l'index principal. |
| `vrac/` | **Oui** | Fichiers non classes / sensibles ; pas d'index. |
| `archive/` (ex. `refonte-jarvos-v0.1/`) | `references/archive/refonte-jarvos-v0.1/` **Oui** | Mentionne dans `.gitignore` pour archive refonte ; non detaille dans `references/index.md` (hors liste principale des sous-dossiers indexes). |

**Fichiers notables a la racine de `references/`** (hors dossiers) : `ou-on-en-est.md`, `todo.md`, `procedure-git-cursor.md`, `versioning.md`, `INSTRUCTIONS-PROJET.md`, `index.md`.

## Fichiers pivots a charger selon le sujet

- **Arrivee sans contexte / planification** : `references/ou-on-en-est.md`, `references/index.md`.
- **Ideation, recherche, synthese hors BMAD** : `references/todo.md`.
- **Idees Kanban** : `references/idees-kanban/index.md` + skill idees-kanban.
- **Creation ou modification dans `references/`** : `references/INSTRUCTIONS-PROJET.md`.
- **Git / delegation @git-specialist** : `references/procedure-git-cursor.md`.
- **Release, tags, perimetre par version** : `references/versioning.md`.
- **Handoff ou decision recente** : `references/artefacts/index.md` puis l'artefact vise (souvent cite dans `ou-on-en-est.md`).
- **Recherche externe** : `references/recherche/index.md` + `contexte-pour-recherche-externe.md` si nouveau prompt.
- **Audit / consolidation 1.4.5** : `references/consolidation-1.4.5/index.md` (synthese, backlog, journal selon le besoin).
- **Brownfield 1.4.4 referentiel** : `references/ancien-repo/index.md`.
- **Paheko / migration** : `references/migration-paeco/index.md`, `references/paheko/index.md`, `audits/index.md` si correspondances caisse/poids.
- **Vision produit / Brief** : `references/vision-projet/index.md`.
- **Ecosysteme confidentiel** : `references/ecosysteme/index.md` (sur demande explicite).
- **Ventilation inbox** : skill traiter-depot ; `_depot/` (contenu non versionne sauf `.gitkeep`).

## Limites de cette passe (ce qui n'a pas ete lu en detail)

- Contenu des fichiers individuels (artefacts, audits, rapports d'audit, idees, prompts) : **non parcouru** — uniquement les **index** et **INSTRUCTIONS-PROJET.md** (extrait principal).
- Dossiers **gitignore** (`vrac/`, `dumps/` hors fichiers eventuellement suivis, contenu de `_depot/*`, `ecosysteme/` hors index, `ancien-repo/repo/`, `paheko/repo/`, `archive/refonte-jarvos-v0.1/`, sauvegardes `*-nested-git-backup/`) : **non inventories** en profondeur (pas d'exploration des clones ou dumps massifs) — voir rapport `04-vrac-ecosysteme-depot/`.
- Sous-dossiers specialises (ex. stades du Kanban, chaque rapport `2026-03-23_*` de consolidation) : resumes **via** leur index parent ou rapports paralleles de cette exploration.

## Meta

Rapport produit par sous-agent explore (2026-03-24) ; fichier materialise par l'orchestrateur (le sous-agent etait en lecture seule).
