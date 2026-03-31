# Audit `references/` — ancien-repo, vision, paheko, tri temporaire, racine, Kanban

**Date :** 2026-03-31 · Synthèse : `2026-03-31_02_audit-references-00-synthese-globale.md`

---

## A. `references/ancien-repo/`

### Documents majeurs (hors `repo/` gitignore)

- Sorties **document-project** : overview, structure, stack, patterns, inventaire doc, source-tree, `project-scan-report.json`.  
- Guides brownfield : architecture-brownfield, fonctionnalités actuelles, development, deployment, integration, **checklist-import-1.4.4**.  
- API / données / UI : api-contracts, data-models, component-inventory, liste endpoints v1.4.4.  
- **`README.md`** : clone, workflow document-project — **utile** ; était absent du tableau de `index.md` (corrigé dans l’index).  
- **`ref_navigation.md`** : URLs / identifiants — **sensible** ; volontairement non listé dans l’index public.

### Index ↔ disque

- **Écart corrigé** : lien explicite vers `README.md` dans `ancien-repo/index.md`.  
- **`ref_navigation.md`** : décision documentaire (hors index ou mention générique secrets).

### Narratif

- Index parle encore de migration vers **JARVOS v0.1.0** avec **nouveau backend**.  
- Compatible avec **brownfield** mais en tension avec la ligne « **évolution sur 1.4.4 stabilisé** » : à harmoniser dans une session **hors index** (PRD / versioning) ou note d’orientation dans README.

---

## B. `references/vision-projet/`

- **4 fichiers** de contenu + `index.md` — **alignement complet** index ↔ disque.  
- Thèmes : RAG / Nano-Mini, présentation plateforme, **vision module décla éco-organismes**, archive RAG.  
- **Fondamental** pour storytelling et modules long terme ; **complémentaire** au backlog technique consolidation.

---

## C. `references/paheko/`

- Racine : `index.md`, `README.md`, `analyse-brownfield-paheko.md`, `liste-endpoints-api-paheko.md` + **`repo/`** (archive volumineuse).  
- **Index** : cohérent avec les fichiers listés et le lien vers `references/dumps/schema-paheko-dev.md`.  
- Aucune action critique sur l’index au-delà d’éventuelle mention de date/version archive.

---

## D. `references/temporaire-pour-tri/`

### Contenu réel

- **`artefacts/`** : 10 fichiers (audits BMAD/LLM, API v1, SSO, Docker stories, traçabilité écrans, etc.).  
- **`recherche/`** : 7 fichiers (Perplexity autopilot, Paheko SSL/SQLite Docker, `*_good-reponse.md` sans prompt jumelé).  
- **Pas de sous-dossier `idees-kanban/`** sur disque alors que l’index le mentionnait — **index corrigé**.

### Nature

- **Backlog de tri** : rien n’est canonique tant que non déplacé vers `artefacts/` ou `recherche/` avec mise à jour des index cibles.  
- Risque de **doublons** avec fichiers déjà dans `references/artefacts/` ou recherche — comparer avant déplacement.

---

## E. Racine `references/` (fichiers `.md`)

| Fichier | Observation |
|---------|-------------|
| **`index.md`** | Mojibake + « refonte complète » : **corrigé** (réécriture UTF-8 + pivot). |
| **`ou-on-en-est.md`** | Bascule BMAD OK en tête ; corps encore partiellement obsolète (« aucun code », sessions fév.) — **édition ultérieure recommandée** (hors périmètre « index only » de la demande initiale sauf si on étend). |
| **`todo.md`** | Mix mars/fév. ; toujours utilisable. |
| **`versioning.md`** | Encore « refonte / nouveau backend » — **à aligner** avec la stratégie v2 incrémentale (session dédiée). |
| **`INSTRUCTIONS-PROJET.md`**, **`procedure-git-cursor.md`** | Stables. |
| **`besoins-terrains.md`** | Pertinent pour priorités terrain. |

---

## F. `references/_depot/`

- **0 fichier** — inbox vide.

---

## G. `references/dumps/` & `references/vrac/`

- **dumps/** : au moins `README.md`, `schema-paheko-dev.md`, `schema-recyclic-dev.md` — pas d’index (convention projet).  
- **vrac/** : ex. `bmad.md` — **à classer** plus tard.

---

## H. `references/ecosysteme/`

- Accessible en workspace ; `ecosysteme/index.md` UTF-8 correct.  
- Rester sur chargement **sur demande** (confidentiel / gitignore selon politique).

---

## I. `references/idees-kanban/`

- **16 fiches** `.md` hors `index.md` ; répartition : 7 a-conceptualiser, 3 a-rechercher, 5 a-creuser, 1 a-faire, 0 archive.  
- **Écart** : fiche `2026-03-01_workflow-evenements-caisse-recyclique-paheko.md` (**a-faire**) **absente du tableau** de `idees-kanban/index.md`.  
- **Action** : régénérer l’index via **skill idees-kanban** (ne pas éditer `idees-kanban/index.md` à la main — règle projet).

---

*Fin du pack d’audit références (3 fichiers + synthèse).*
