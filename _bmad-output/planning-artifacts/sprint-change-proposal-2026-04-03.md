# Sprint Change Proposal — JARVOS_recyclique

**Date :** 2026-04-03  
**Workflow :** Correct Course (`bmad-correct-course`)  
**Destinataire :** Strophe  
**Statut :** **Approuvé par Strophe (2026-04-03)** — implémenté : encadré `epics.md`, story **2.2b**, clé `sprint-status.yaml`, fichier `_bmad-output/implementation-artifacts/2-2b-migrer-le-backend-vers-recyclique-racine-mono-repo.md`.

---

## 1. Résumé du problème

### Énoncé

L’architecture cible (`_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`) place le backend nominal dans un dossier **`recyclique/`** à la racine du mono-repo. L’implémentation Epic 2 (stories 2.1 en cours, 2.2 en cours) **évolue dans le brownfield** `recyclique-1.4.4/api/`, conformément à la décision explicite :

- `references/artefacts/2026-04-03_01_decision-backend-story-2-1-recyclique-1.4.4-vs-canonical.md`

Il n’y a pas de contradiction fonctionnelle immédiate, mais une **double lecture possible** pour humains et agents : « où est le backend v2 ? » — **canon documentaire** vs **chemin réel** tant que la migration n’est pas faite.

### Type de déclencheur (checklist §1)

- **Limitation / contrainte technique découverte en implémentation** : le dépôt n’avait pas encore `recyclique/` peuplé ; faire tourner pytest et le compose sur `recyclique-1.4.4/api/` est le chemin **minimal**.
- Ce n’est **pas** un pivot métier ni une invalidation du PRD ; c’est un **ajustement de trajectoire de livraison** (où vit le code pendant la transition).

### Preuves

- Absence de `recyclique/` à la racine (état au lancement Epic 2).
- Décision 2.1 documentée (artefact ci-dessus).
- Alignement avec l’artefact Story 1.1 : `recyclique-1.4.4` classé **transitoire** pour le travail quotidien.

---

## 2. Analyse d’impact

### Epic 2 — peut-il se terminer comme prévu ?

**Oui**, sous réserve d’**explicitation** : l’epic reste valide si l’on considère que « poser le socle backend v2 » signifie **d’abord** stabiliser le code au seul endroit où il existe, puis **basculer** vers l’arborescence canonique via une **story (ou lot) de migration** planifiée.

### Stories impactées

| Zone | Impact |
|------|--------|
| **2.1 – 2.5** (déjà planifiées) | Développement **OK** dans `recyclique-1.4.4/api/` tant que la proposition de migration est acceptée et datée. |
| **2.6** (contrats backend versionnés) | **Sensibilité plus forte** : chemins de publication, CI, scripts — **intérêt fort** à avoir **terminé** ou **clarifié** la migration **avant** ou **pendant** 2.6 pour éviter de figer les mauvais chemins dans la chaîne de contrats. |
| **2.7** (signaux bandeau) | Même logique que 2.6 pour l’outillage ; pas d’invalidation fonctionnelle. |

### Epics futurs (3, 4, …)

- **Pas d’invalidation** : le frontend et les contrats consomment toujours l’API Recyclique ; seul le **chemin dans le repo** change après migration.
- **Dépendance** : documenter la **racine backend unique** dans les briefs Epic Runner après migration.

### Conflits d’artefacts

| Artefact | Conflit / action |
|----------|------------------|
| **project-structure-boundaries.md** | Déjà cohérent sur la **cible** ; ajouter une **note d’état** (optionnel) : « jusqu’au [jalon], le code vivant peut résider sous `recyclique-1.4.4/api/` » — **ou** seulement renvoyer à ce Sprint Change Proposal / artefact 2.1 pour éviter duplication. |
| **epics.md** (Epic 2) | **Recommandé** : encadré 3–5 lignes sous l’intro Epic 2 — *exécution brownfield sous `recyclique-1.4.4/api/` ; migration vers `recyclique/` = story dédiée [référence]*. |
| **PRD** | Aucun changement de périmètre MVP attendu ; pas de révision obligatoire si les exigences restent « backend Recyclique ». |
| **sprint-status.yaml** | **Option** : ajouter une clé story pour **migration** (ex. `2-x-migrer-le-backend-vers-recyclique-racine`) en `backlog` ou `ready-for-dev` après création du fichier story. |

### Impact technique

- **CI / gates** : après migration, mettre à jour les chemins des jobs et des commandes documentées dans les briefs Story Runner.
- **Docker / compose** : recâbler les contextes de build si la racine du service API change.
- **Risque** : **deux arborescences actives** en parallèle si la migration est mal cadrée — d’où l’intérêt d’une **story unique** « couper le cordon » plutôt que des copies partielles.

---

## 3. Approche recommandée

**Option retenue : ajustement direct + story (ou lot) de migration explicite** — **pas** de rollback du travail 2.1 / 2.2.

| Option | Verdict |
|--------|---------|
| A. Continuer sans formaliser | **Non** — risque de dette et de confusion pour les prochains runs. |
| B. Rollback vers un état sans brownfield | **Non** — disproportionné. |
| C. Formaliser par correct course + story migration | **Oui** — aligne plan et terrain. |

**Jalon suggéré (révisable par Strophe) :** exécuter la **migration physique** vers `recyclique/` **après** la clôture de la story **2.2** et **avant** la **2.6** (contrats versionnés), sauf contrainte calendaire forte.

**Portée du changement :** **modérée** — réorganisation backlog + une story fichier + mises à jour de chemins ; pas de refonte produit.

---

## 4. Propositions de modification concrètes

### 4.1 `epics.md` — Epic 2 (intro)

**Ajouter** un court encadré après le titre / premier paragraphe de l’Epic 2, par exemple :

```markdown
> **Exécution transitoire (2026-Q2) :** le code backend Epic 2 est développé sous `recyclique-1.4.4/api/` jusqu’à la story de migration vers le dossier canonique `recyclique/` à la racine (voir `references/artefacts/2026-04-03_01_decision-backend-story-2-1-recyclique-1.4.4-vs-canonical.md` et sprint-change-proposal-2026-04-03).
```

*(Texte à ajuster après validation.)*

### 4.2 Nouvelle story BMAD (à créer via `bmad-create-story`)

**Titre proposé :** Migrer le package API vers `recyclique/` (racine mono-repo) et mettre à jour CI / compose / gates.

**Critères d’acceptation (ébauche) :**

- Le code applicatif et les tests vivent sous `recyclique/` (structure alignée `project-structure-boundaries.md`).
- Les chemins des gates Story Runner et de la CI pointent vers la nouvelle racine.
- `recyclique-1.4.4/` est explicitement **référence / archive** ou supprimé du chemin actif — **une seule** racine backend pour le travail neuf.
- README + lien depuis l’ancien emplacement si utile.

### 4.3 `references/artefacts/2026-04-03_01_decision-backend-story-2-1-recyclique-1.4.4-vs-canonical.md`

**Révision** : ajouter en fin de fichier une ligne « **Supersédé pour l’emplacement final** par [story migration] + date » une fois la migration faite.

### 4.4 `sprint-status.yaml`

Après création de la story : ajouter la clé `2-…-migrer-…` en `backlog` (ou statut approprié).

---

## 5. Checklist Correct Course (synthèse)

| Section | Statut |
|---------|--------|
| 1 — Déclencheur (Story 2.1 / 2.2, écart chemins) | Fait |
| 2 — Epic 2 complétable avec ajustement | Fait |
| 3 — PRD : pas de conflit majeur | N/A / mineur |
| 4 — Architecture : note d’état ou renvoi | Action proposée |
| 5 — UX : pas d’impact direct | N/A |

---

## 6. Handoff implémentation

| Champ | Valeur |
|-------|--------|
| **Classification** | **Modérée** — backlog + story + mises à jour doc |
| **Responsable** | Strophe (validation), puis SM / Epic Runner pour `create-story` + enchaînement |
| **Critères de succès** | Une racine backend claire ; `epics.md` et sprint-status alignés ; pas de double maintenance prolongée |

**Prochaines étapes pour Strophe :**

1. Lire cette proposition et répondre **approuvé / révisé** (jalon migration : après 2.2 vs avant 2.6).
2. Si approuvé : créer la **story migration** (ou demander à l’agent SM), puis appliquer le **petit encadré** dans `epics.md` et la clé dans `sprint-status.yaml`.

---

*Document généré selon `.cursor/skills/bmad-correct-course/workflow.md` — pas d’estimations temporelles chiffrées dans le corps.*
