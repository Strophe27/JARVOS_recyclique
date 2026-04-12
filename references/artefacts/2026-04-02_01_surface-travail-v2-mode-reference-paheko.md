# Surface de travail v2 — mode de référence Paheko (note de décision)

**Date :** 2026-04-02  
**Epic :** 1 — Piste B (prérequis backend / Paheko)  
**Story :** 1.1 — Cadrer la surface de travail v2 et le mode de référence Paheko  

---

## 1. Décision (mode par défaut)

**Référence par défaut pour le travail quotidien (dev, relecture d’intégration, alignement avec la stack cible) :**  
**Paheko comme service vivant sous Docker** (conteneur avec API HTTP accessible), cohérent avec l’architecture cible où Paheko est un service explicite de la stack (`infra/docker/paheko`, fichiers compose) et avec l’extraction documentaire du schéma de référence issue d’une instance Docker dev (voir `references/dumps/schema-paheko-dev.md`, cité depuis `references/paheko/index.md`).

**Pourquoi ce choix :**

- Évite l’ambiguïté « fichier SQLite seul » vs « comportement HTTP réel » pour tout ce qui touche extensions, plugins et chemins API.
- S’aligne sur `project-structure-boundaries.md` : Paheko branché dans Docker/déploiement ; intégration métier dans `recyclique/.../integrations/paheko/`.
- Permet des **tests d’intégration** contre une API réelle sans présumer d’une sync bout-en-bout Recyclique ↔ Paheko (hors périmètre à ce stade, voir §5).

**Obtenir le code / l’image :** le dépôt produit ne suppose pas un chemin magique. Références à suivre selon le contexte :

- **Index Paheko :** `references/paheko/index.md` — archive dans `references/paheko/repo/` (souvent gitignore), procédure **locale** mentionnée sous `dev-tampon/paheko/` (racine projet ; **`dev-tampon/` est gitignore** : absent sur un clone nu — dans ce cas, utiliser une procédure Docker / image équivalente documentée par l’équipe ou les guides `references/migration-paheko/`, par ex. `2025-11_paheko-recyclique-integration-first-search.md`).
- **Guides brownfield :** `references/migration-paheko/index.md` pour le contexte d’intégration historique.

---

## 2. Modes — usages et classification

| Mode | Développement | Tests d’intégration | Rétro-ingénierie | Dépannage | Statut |
|------|---------------|---------------------|------------------|-----------|--------|
| **Paheko sous Docker (service vivant, API HTTP)** | **Principal** — implémentation et debug contre comportement réel | **Principal** — appels HTTP, plugins, scénarios réalistes | Possible (logs, BDD dans le volume conteneur) | **Principal** — reproduire erreurs API / extensions | **Défaut** |
| **Instance Paheko standalone** (hors Docker : install locale depuis archive / Fossil) | Optionnel — préférence contributeur ou contrainte machine | Optionnel — valider parité avec Docker | Utile pour parcourir le code hors conteneur | Optionnel — isoler problème réseau Docker | **Optionnel** |
| **SQLite récupéré seul** (copie de fichier `.sqlite`, sans serveur Paheko) | Non recommandé comme boucle quotidienne | Insuffisant pour intégration HTTP | **Très utile** — schéma tables, contraintes, jointures (`schema-paheko-dev.md`) | Limité — pas de reproduction des endpoints | **Analyse seulement** |
| **Stack legacy `recyclique-1.4.4` + compose existant** | **Transitoire** — audits brownfield, comparaison avec 1.4.x | Transitoire — ne pas confondre avec cible v2 | Utile pour comprendre l’existant | Transitoire | **Transitoire** |

---

## 3. Opérationnel (prérequis, services, démarrage, données)

### 3.1 Prérequis machine (indicatif)

- **Docker** (ou runtime compatible) pour le **chemin par défaut**.
- Espace disque pour image + volume Paheko ; accès réseau si pull d’image ou dépôts externes.
- Pour les stories qui **codent déjà** contre `recyclique` : Python/toolchain backend + éventuellement PostgreSQL / Redis selon le compose utilisé (voir structure cible dans `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`).

### 3.2 Services requis (selon le périmètre de la story en cours)

| Niveau | Services | Quand |
|--------|----------|--------|
| **Minimal Paheko** | Conteneur / stack **Paheko** seul(e) | Travail focalisé API Paheko, schéma plugins, matrice d’intégration sans backend Recyclique v2 local. |
| **Développement Recyclique + Paheko** | **recyclique** (backend) + dépendances déclarées dans le projet (ex. PostgreSQL, Redis) + **Paheko** | Stories Piste B qui implémentent `integrations/paheko` ou endpoints consommant l’API Paheko depuis le backend. |

*(Le détail exact des noms de services et des fichiers compose peut évoluer ; la source structurelle reste `project-structure-boundaries.md` et les README `infra/` lorsqu’ils sont présents.)*

### 3.3 Séquence minimale de démarrage (chemin par défaut)

1. S’assurer d’avoir une procédure Paheko Docker valide sur la machine : soit **`dev-tampon/paheko/README.md`** si le tampon existe, soit équivalent documenté (migration-paheko / procédure équipe).
2. Démarrer Paheko (compose ou commande documentée).
3. Vérifier que l’**API HTTP** répond (ex. endpoint sous `/api/` selon `references/paheko/liste-endpoints-api-paheko.md`).
4. Si la session implique le backend v2 : démarrer **PostgreSQL / Redis** puis **recyclique** selon l’ordre imposé par le compose ou le README du backend — **après** ou **en parallèle** de Paheko selon la configuration choisie, en gardant les URLs d’intégration cohérentes.

### 3.4 Sources de données attendues

- **Données Paheko :** stockées dans le volume / fichier SQLite **géré par l’instance Paheko** (non versionnées dans ce dépôt).
- **Schéma de référence documenté :** `references/dumps/schema-paheko-dev.md` — décrit des tables observées sur une instance dev ; **ne remplace pas** une instance vivante pour les appels API.
- **`references/dumps/` :** usage **analyse** ; ne pas y committer de secrets ni de dumps sensibles ; respecter `.gitignore`.

### 3.5 Propriété des données de test

- Les **jeux de données** créés sur une instance locale Docker / standalone sont **locaux à l’environnement du développeur ou de l’équipe** ; ils ne sont pas des données de production.
- **Pas de credentials** dans le dépôt Git ; secrets via variables d’environnement ou gestionnaire de secrets hors repo.
- Qui crée un jeu de test : **l’équipe ou le développeur** qui prépare l’instance ; la responsabilité de **ne pas publier** de données réelles dans `references/dumps/` ou ailleurs dans le repo incombe à la même équipe.

---

## 4. Périmètre volontaire **avant** une sync e2e complète avec Paheko

**Dans le périmètre pour l’implémentation locale à ce stade Epic 1 :**

- Faire tourner Paheko en **référence vivante** ; documenter et reproduire les **contrats d’appel** (HTTP) nécessaires aux analyses et aux futures stories (audit API, matrice d’intégration).
- S’appuyer sur la documentation existante : `references/paheko/`, `references/migration-paheko/`, `references/consolidation-1.4.5/` pour le brownfield.
- Respecter les emplacements **contrats** décrits dans `contracts/README.md` sans les dupliquer arbitrairement côté frontend.

**Hors périmètre explicite (rappel story 1.1 / epics) :**

- **Figer ou livrer** `contracts/openapi/recyclique-api.yaml` comme writer canonique — **Story 1.4**.
- **Schémas CREOS détaillés** au-delà de ce qui existe déjà dans `contracts/creos/`.
- **Implémentation d’une sync réelle** Recyclique ↔ Paheko bout-en-bout — **Epic 8** et stories associées.
- **Convergence e2e complète** bandeau / flows critiques — jalons **Convergence 2 / 3** (`guide-pilotage-v2.md`).

**Rappel gouvernance (stories ultérieures, sans la réaliser ici) :** hiérarchie de vérité **OpenAPI > ContextEnvelope > NavigationManifest > PageManifest > UserRuntimePrefs** ; writer OpenAPI = **Recyclique** ; CREOS sous `contracts/creos/` — pas de seconde source de vérité côté frontend généré (cf. brief Epic 1 / Story 1.4).

---

## 5. Verrou pour les stories suivantes

**Les stories Epic 1 suivantes présument, sauf mention contraire documentée dans un artefact daté sous `references/artefacts/`, que la référence Paheko pour le travail quotidien est un service Paheko **vivant sous Docker** avec API HTTP accessible, et que les variantes (standalone, SQLite seul, stack transitoire 1.4.4) sont utilisées selon le tableau §2 sans rouvrir la décision de principe.**

---

## 6. Références croisées (chemins)

| Document | Apport pour cette note |
|----------|-------------------------|
| `_bmad-output/planning-artifacts/epics.md` | Story 1.1, critères d’acceptation. |
| `_bmad-output/planning-artifacts/guide-pilotage-v2.md` | Pistes A/B, jalons, cartographie documentaire (`references/artefacts/`, contrats). |
| `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` | Stack cible, `infra/docker/paheko`, Piste B, `contracts/openapi/recyclique-api.yaml` (cible), frontières Paheko. |
| `contracts/README.md` | Rôles OpenAPI / CREOS ; pas de contradiction avec un second writer. |
| `references/paheko/index.md` | Brownfield, endpoints, `schema-paheko-dev.md`, `repo/`, `dev-tampon/paheko/`. |
| `references/migration-paheko/index.md` | Guides intégration / Docker historiques. |
| `references/dumps/schema-paheko-dev.md` | Rétro-ingénierie schéma ; pas substitut au runtime. |
| `references/INSTRUCTIONS-PROJET.md` | Conventions `references/artefacts/` et index. |

---

## 7. Critère de relecture

Un pair peut reproduire le **chemin par défaut** (§3.3) en s’appuyant sur **cette note** et sur les liens des §1 et §6, sans supposer l’existence de `dev-tampon/` sur disque.
