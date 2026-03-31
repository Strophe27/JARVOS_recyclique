# Audit global — dossier `references/` (synthèse orchestrateur)

**Date :** 2026-03-31  
**Méthode :** exploration parallèle (6 passages agents) sur les sous-arbres principaux ; comparaison index ↔ disque ; pas de déplacement ni suppression de fichiers sources (hors index).

---

## 1. Objectif de ce pack

Fournir une base pour **re-modéliser** `references/` : que garder, archiver, renommer, déplacer ; quelles idées sont **fondamentales** vs **complémentaires** ; quels index **réparer** en priorité.

**Fichiers du pack (même date) :**

| Fichier | Contenu |
|---------|---------|
| `2026-03-31_02_audit-references-00-synthese-globale.md` | Ce fichier : carte globale, tensions narratives, plan de tri, index modifiés. |
| `2026-03-31_03_audit-references-01-zones-principales.md` | Artefacts, recherche, consolidation 1.4.5, migration-paeco (détail). |
| `2026-03-31_04_audit-references-02-ancien-vision-paheko-tri-racine.md` | Ancien-repo, vision-projet, paheko, temporaire-pour-tri, racine, dépôt, vrac, ecosysteme, Kanban. |

---

## 2. Carte des zones (rôle + fraîcheur)

| Zone | Rôle principal | Alignement « maintenant » (1.4.4 stabilisé, BMAD reset, v2 incrémental) |
|------|----------------|---------------------------------------------------------------------------|
| **`consolidation-1.4.5/`** | Audit code, backlog technique, DB locale, journal | **Canon actuel** pour l’état du repo et la dette technique. |
| **`artefacts/`** | Handoffs, décisions spirale Paheko/BMAD, paquets consolidation, blueprint | **Mars 2026** = très pertinent ; **fév. 2026** = historique décisionnel / vision long terme. |
| **`migration-paeco/`** | Interop RecyClique ↔ Paheko, audits caisse/poids, matrice, REP | **Toujours central** pour sync, mapping, futur module décla. |
| **`recherche/`** | Perplexity 2026-02-24 (plugins, Paheko API, SSO…) | **Utile** mais figé ; `contexte-pour-recherche-externe.md` probablement **dépassé** (« pas de code »). |
| **`ancien-repo/`** | Document-project 1.4.4, checklist import | **Référence brownfield** ; narratif « nouveau backend v0.1 » à **réconcilier** avec « on évolue sur 1.4.4 ». |
| **`vision-projet/`** | RAG, Nano/Mini, décla, présentations | **Direction produit** ; orthogonal au détail implémentation. |
| **`paheko/`** | Clone + analyse brownfield Paheko | **Stable** ; index cohérent avec le disque. |
| **`temporaire-pour-tri/`** | Import autopilot non canonique | **Dette de tri** : 10 artefacts + 7 recherches à ventiler ou supprimer. |
| **`idees-kanban/`** | Idées par stade | **16 fiches** ; `index.md` **désynchronisé** (une fiche `a-faire` absente du tableau) — **régénérer via skill idees-kanban**, pas à l’édition manuelle selon les règles projet. |
| **`_depot/`** | Inbox ventilation | **Vide** (0 fichier). |
| **`dumps/`** | Schémas BDD (sans index) | **Opérationnel** pour croiser audits. |
| **`vrac/`** | Non classé (ex. `bmad.md`) | **À trier** ultérieurement. |
| **`ecosysteme/`** | Docs confidentiels écosystème | Index à jour ; chargement sur demande. |
| **Racine `references/`** | `index.md`, `ou-on-en-est`, `todo`, `versioning`, etc. | **`index.md`** : mojibake + narratif « refonte complète » **obsolète** ; **`ou-on-en-est`** : section bascule BMAD OK, corps historique encore partiellement faux (« aucun code »). |

---

## 3. Tensions narratives à trancher (hors index)

Trois « vérités » possibles dans les docs :

1. **Refonte / nouveau backend / v0.1 greenfield** — surtout `references/index.md`, `versioning.md`, `ancien-repo/index.md`, ancien PRD archivé.  
2. **Consolidation & stabilisation 1.4.4** — `consolidation-1.4.5/`, handoff 2026-03-31.  
3. **Évolution incrémentale vers v2** — décision récente (chat + `_bmad-output` archivé).

**Recommandation :** une phrase de **principe** dans le futur PRD et dans `ou-on-en-est` / `versioning` pour éviter que les agents ne mélangent (1) et (2)(3).

---

## 4. Idées fondamentales vs complémentaires (lecture transversale)

**Fondamentales pour la suite proche**

- Stabilité **multi-sites / multi-caisses** (métier + données) — voir audits, TODO Christophe, backlog consolidation.  
- **Matrice caisse/poids** + audits `migration-paeco/audits/` pour toute évolution Paheko.  
- **Modularité** (recherche Perplexity + artefact design modules + blueprint mars) — convergence à cadrer dans un seul doc de synthèse plus tard.  
- **Chaîne DB Alembic** (notes mars 2026 dans consolidation).

**Complémentaires / horizon plus long**

- SSO détaillé, autopilot BMAD, open core, RAG Nano/Mini complet, présentations financeurs.  
- Guides Paheko **2025-11** (valider version cible instance réelle).

---

## 5. Index — actions réalisées (2026-03-31)

Modifications **autorisées** par Strophe : **fichiers `index.md` uniquement** (+ création des présents rapports dans `artefacts/`).

| Fichier | Action |
|---------|--------|
| `references/index.md` | Réécriture UTF-8 propre, narratif aligné post-pivot, lien vers ce pack d’audit, mention `_bmad-output` archivé. |
| `references/artefacts/index.md` | Lignes pour les 3 fichiers `2026-03-31_0*_audit-references-*.md`. |
| `references/recherche/index.md` | Section « hors tableau » pour artefacts `normalize_*` (outil). |
| `references/temporaire-pour-tri/index.md` | Correction : pas de dossier `idees-kanban/` sur disque. |
| `references/ancien-repo/index.md` | Lien `README.md` + note courte sur double narratif v0.1 vs évolution 1.4.4. |
| `references/migration-paeco/index.md` | Renvoi vers consolidation + pack audit. |
| `references/consolidation-1.4.5/index.md` | Renvoi vers migration-paeco + pack audit. |

**Non modifié (règle projet) :** `references/idees-kanban/index.md` — à resynchroniser via **skill idees-kanban** (fiche `2026-03-01_workflow-evenements-caisse-recyclique-paheko.md` manquante au tableau).

---

## 6. Prochaines étapes suggérées (hors périmètre de cet audit)

1. Ventiler `temporaire-pour-tri/` vers `artefacts/` et `recherche/` (puis mettre à jour les index).  
2. Mettre à jour `contexte-pour-recherche-externe.md` (contenu, pas seulement l’index).  
3. Réconcilier `ou-on-en-est.md`, `versioning.md` avec l’état réel du dépôt (nécessite édition hors index — session dédiée).  
4. Lancer skill **idees-kanban** pour régénérer l’index du Kanban.  
5. Option : un distillé unique « principes v2 » dans `vision-projet/` ou futur PRD.

---

*Explorations sources : agents explore sur `artefacts/`, `recherche/`, `consolidation-1.4.5` + `migration-paeco`, `ancien-repo` + `vision-projet`, `paheko` + `temporaire-pour-tri`, racine + Kanban + `_depot` + ecosysteme.*
