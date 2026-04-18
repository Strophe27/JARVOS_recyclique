# Sprint Change Proposal — Clarifier l'emplacement de l'orchestration Docker

**Date :** 2026-04-07  
**Workflow :** Correct Course (`bmad-correct-course`)  
**Destinataire :** Strophe  
**Statut :** Proposition a valider

---

## 1. Résumé du problème

### Énoncé

Le backend vivant a bien été migré vers **`recyclique/api/`** par la story **2.2b**.  
En revanche, la stack Docker locale **`recyclic-local`** se lance encore depuis **`recyclique-1.4.4/docker-compose.yml`**, qui construit l'API avec le contexte `../recyclique/api`.

Techniquement, cela fonctionne.  
Humainement, cela crée une **confusion de structure** :

- où se trouve la “vraie” racine backend ?
- faut-il lancer Docker depuis `recyclique/`, la racine du mono-repo, ou `recyclique-1.4.4/` ?
- `recyclique-1.4.4/` est-il encore actif, ou seulement un conteneur de compatibilité / transition ?

### Type de déclencheur

- **Limitation / dette de clarté découverte après implémentation**
- Ce n'est **pas** un conflit produit ni un bug bloquant
- C'est un **écart entre structure cible et ergonomie réelle de travail**

### Preuves

- `epics.md` indique maintenant explicitement : backend vivant sous `recyclique/api`, mais stack Docker locale encore lancée depuis `recyclique-1.4.4/docker-compose.yml`.
- `guide-pilotage-v2.md` documente la même situation.
- `project-structure-boundaries.md` décrit une cible où les `docker-compose*.yml` sont à la racine du mono-repo.
- Il n'existe actuellement **aucun** `docker-compose.yml` à la racine du mono-repo ni sous `recyclique/`.

---

## 2. Analyse d'impact

### Epic impact

| Epic | Impact |
|------|--------|
| **Epic 2** | Déjà terminé. Pas de réouverture fonctionnelle nécessaire. Le sujet restant est documentaire / infra / ergonomie. |
| **Epic 3** | Aucun impact direct : déjà terminé. |
| **Epic 4** | Impact modéré : avant de brancher plus fort le backend et le frontend ensemble, une structure Docker plus claire réduirait la confusion de démarrage local. |
| **Epic 10.6** | Impact direct : cette epic parle justement d'installation, stack cible et environnement officiellement supporté. Le sujet y a naturellement sa place si on le diffère. |

### Story impact

- **2.2b** a bien fait le principal : migration du code vivant et mise à jour des chemins de build / volumes.
- Il reste une **question non tranchée explicitement** :
  faut-il **laisser durablement** le compose dans `recyclique-1.4.4/`, ou faut-il **finir le rangement** ?

### Conflits d'artefacts

| Artefact | Situation |
|----------|-----------|
| `epics.md` | Documente l'état transitoire actuel, mais ne dit pas explicitement si cet état est final ou temporaire. |
| `guide-pilotage-v2.md` | Même constat : l'état est documenté, mais pas arbitré comme destination finale. |
| `project-structure-boundaries.md` | Cible plus propre que la réalité actuelle ; écart résiduel. |
| `2-2b-...md` | Traite la migration du code, mais n'impose pas un déplacement physique final du compose à la racine. |
| README / docs de démarrage | Peuvent encore prêter à confusion pour un humain qui découvre le repo. |

### Impact technique

- **Faible à moyen** si on se contente de documenter
- **Moyen** si on déplace réellement `docker-compose*.yml`
- Pas de rollback code nécessaire
- Risque principal : casser des habitudes locales ou des chemins scripts si on déplace trop vite sans petite passe de nettoyage

---

## 3. Approche recommandée

### Option 1 — Ne rien changer, seulement assumer l'état actuel

**Verdict :** viable, mais peu satisfaisant.

Avantage :
- aucun travail immédiat

Inconvénient :
- la confusion reviendra
- coût cognitif inutile pour les prochaines reprises

### Option 2 — Finir le rangement maintenant par une petite story dédiée

**Verdict :** recommandé.

Idée :
- ne **pas** rouvrir Epic 2 au fond
- ajouter une **petite story technique / infra** dédiée à la clarification de l'orchestration Docker du mono-repo
- objectif : une seule façon évidente de lancer la stack locale

### Option 3 — Différer explicitement à Epic 10.6

**Verdict :** viable, mais tardif.

Avantage :
- cohérent avec le thème “installation / environnement supporté”

Inconvénient :
- laisse la confusion en place pendant plusieurs epics

### Recommandation retenue

**Option 2 — Ajustement direct par petite story dédiée, sans rouvrir le fond d'Epic 2.**

Pourquoi :
- le sujet est réel mais **petit**
- il touche l'ergonomie de travail quotidienne
- il ne justifie ni rollback ni refonte
- le traiter avant d'avancer davantage évite de consolider des docs ambiguës

---

## 4. Propositions de changement

### 4.1 Ajouter une nouvelle story dédiée

**Titre proposé :**  
`Ranger l'orchestration Docker locale du mono-repo et clarifier le point d'entrée de démarrage`

### 4.2 Positionnement recommandé

Deux variantes possibles :

#### Variante A — Story transversale technique, à faire prochainement

- hors flux métier strict
- réalisée avant d'aller trop loin dans les prochains epics dépendants du backend réel

#### Variante B — Rattacher explicitement le sujet à Epic 10.6

- possible si tu préfères ne rien toucher maintenant
- mais il faut alors **écrire noir sur blanc** que l'état actuel est **transitoire assumé**

### 4.3 Contenu recommandé de la story

Objectif simple :

- décider **où** doit vivre le `docker-compose.yml` de dev local :
  - racine mono-repo
  - ou `infra/compose/`
  - ou maintien dans `recyclique-1.4.4/` mais avec renommage / bannière très explicite
- mettre à jour :
  - README de démarrage
  - chemins scripts
  - docs d'installation
  - éventuels workflows / commandes de handoff

### 4.4 Proposition de critères d'acceptation

- Une personne qui arrive sur le repo comprend en moins d'une minute **d'où lancer la stack locale**
- Le point d'entrée Docker local est **unique** et documenté
- `recyclique/api` reste clairement identifié comme le backend vivant
- Les anciens chemins transitoires sont soit supprimés, soit marqués comme **compatibilité / historique**

---

## 5. Impact sur MVP / planning

- **MVP produit :** inchangé
- **Backend / frontend :** inchangés fonctionnellement
- **Effort :** faible à moyen
- **Risque :** faible si fait comme petit chantier de clarification

Ce changement améliore surtout :

- la lisibilité
- l'onboarding futur
- la réduction d'erreurs de démarrage local

---

## 6. Handoff recommandé

| Rôle | Responsabilité |
|------|----------------|
| **Strophe** | Valider l'approche : faire maintenant ou différer explicitement |
| **Scrum / backlog** | Ajouter la petite story au bon endroit |
| **Dev / agent** | Implémenter le déplacement / renommage / clarification Docker si approuvé |

### Recommandation finale

Ne pas rouvrir Epic 2 sur le fond.  
Créer une **petite story dédiée de clarification Docker** et la traiter prochainement, avant que l'ambiguïté ne se propage davantage.

---

## 7. Checklist Correct Course — synthèse

| Section | Statut |
|---------|--------|
| 1 — Déclencheur clair | Fait |
| 2 — Impact epics / stories | Fait |
| 3 — Conflits artefacts | Fait |
| 4 — Évaluation des options | Fait |
| 5 — Proposition structurée | Fait |
| 6 — Approbation utilisateur | En attente |

