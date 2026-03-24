# Synthese orchestrateur — exploration references/ (2026-03-24)

## Methode

- **Objectif utilisateur** : rassembler idees, **TODO** (actions ouvertes Paheko/Recyclique), et decisions documentees dans `references/`, y compris zones **gitignore** (vrac, ecosysteme, dumps, contenu `_depot`, clones exclus). *(Correction : la voix disait « TODO », pas « tout doux » — STT.)*
- **Execution** : cinq sous-agents **explore** lances en parallele (categories : etat des lieux, idees/suivi, migration Paheko, vision/consolidation/recherche, zones sensibles). Les sous-agents ont tourne en **lecture seule** (pas d'ecriture disque) : l'orchestrateur a **materialise** les fichiers `rapport.md` dans chaque sous-dossier.
- **Emplacement** : `references/artefacts/2026-03-24_01_exploration-references-synthese/` (convention artefacts du projet). Entree ajoutee dans `references/artefacts/index.md`.

## Synthese executive (lecture 5 minutes)

1. **Refonte v0.1.0** : Recyclique 1.4.4 est documente en brownfield ; la cible est un **dual-backend** FastAPI + **Paheko 1.3.19.x**, un Compose, **Redis Streams**, **plugin PHP** cote Paheko, **push caisse par ticket**, **RecyClique** comme source de verite pour reception/poids et donnees declaratives eco-organismes (module decla dedie, distinct de la saisie au poids Paheko).
2. **TODO terrain (dec. 2025)** : fichier `2025-12-05_todo-christophe-recyclique-paheko.md` — fil Discord / collecte correspondances Recyclic vers Paheko, reunion Paheko **apres** routine stabilisee, connexion auto et push **long terme**. **Separément**, le CR terrain a **reporte** l'automatisation poussee apres **2–3 mois** de routine comptable manuelle (c'est du **pacing** documente, pas le mot « todo » de la requete).
3. **TODO / travail encore ouvert** (voir aussi `references/todo.md` + Kanban) : module **correspondance**, **chantier fichiers**, **SSO v0.2**, **presets caisse**, parcours **PIN/postes**, strategie **LLM** post-brief, checklist **v0.1 architecture**, et **assainissement 1.4.5** (mars 2026) sur `recyclique-1.4.4/`.
4. **Gitignore** : `ecosysteme/` apporte le **cadre JARVOS** (Recyclique standalone branchable) ; `dumps/` + schemas markdown = levier **mapping** ; `vrac/` contient surtout du **BMAD generique** (`bmad.md`) sans contenu migration ; `_depot/` vide au moment du scan.

## Decisions deja actees (liste courte)

| Theme | Decision |
|-------|----------|
| Stack cible | Paheko **1.3.19.x**, mono-repo Docker, Postgres + Redis |
| Caisse | Push **par ticket**, cloture + `syncAccounting` ; categories creees/matchees par plugin |
| Resilience | **Redis Streams** si Paheko indisponible |
| Poids | Source **RecyClique** ; extension poids Paheko conservee ; copie optionnelle |
| Auth v0.1 | Separee (JWT Recyclic + acces API Paheko) ; SSO plus tard |
| Eco-organismes | Donnees et referentiel **dans RecyClique** ; mapping vers filieres |
| Terrain dec. 2025 | Categories EEE, filieres, tarif 0 par defaut, Paheko = backend partage ; **pacing** : ne pas tout automatiser immediatement (fenetre routine manuelle avant reunion Paheko poussee) |

## Idees et fils non clos (Kanban + todo)

- **a-conceptualiser** : README ancien repo, i18n README, UI/workflows Paheko, store modules, Le Fil, **module correspondance** (affinage), parcours caisse/PIN.
- **a-rechercher / a-creuser** : integration core (historique), sync financiere (riche en decisions deja), calendrier/fichiers, framework plugins, UI modulaire, ports Nano/Mini, IA/LLM, **chantier fichiers**.
- **todo ouvert** : checklist **v0.1 architecture**, politique fichiers, presets, correspondance, strategie LLM.

## Ou aller ensuite

1. **Lire** les rapports detailles par zone : `00-` a `04-*/rapport.md`.
2. **Pour une synthese PRD-ready** : croiser `02-migration-paheko` avec instance dev + `schema-*-dev.md` + matrice caisse/poids.
3. **Pour implementation 1.4.5** : suivre `references/consolidation-1.4.5/` et `03-vision-consolidation-recherche/rapport.md`.
4. **Mettre a jour** `ou-on-en-est.md` si l'activite depuis fev. 2026 (ex. assainissement, stats API) doit etre refletee.

## Fichiers de cette livraison

| Chemin | Contenu |
|--------|---------|
| `README.md` | Mission et tableau des dossiers |
| `00-etat-des-lieux/rapport.md` | Carte `references/` et pivots |
| `01-idees-suivi/rapport.md` | Kanban, todo, ou-on-en-est |
| `02-migration-paheko/rapport.md` | Decisions + TODO Christophe + pacing terrain + sources |
| `03-vision-consolidation-recherche/rapport.md` | Vision RAG, audit 1.4.5, Perplexity, ancien repo |
| `04-vrac-ecosysteme-depot/rapport.md` | Zones gitignore |
| `99-synthese-orchestrateur/rapport.md` | Ce fichier |
