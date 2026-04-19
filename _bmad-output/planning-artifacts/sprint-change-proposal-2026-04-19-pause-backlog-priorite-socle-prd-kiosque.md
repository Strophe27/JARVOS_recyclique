---
workflow: bmad-correct-course
date: 2026-04-19
project: JARVOS_recyclique
approval: delegated
approved_by: Strophe (delegation explicite chat 2026-04-19 — pas de cycle de validation interactif requis)
scope_classification: moderate
---

# Sprint Change Proposal — gel backlog BMAD + priorité socle PRD vision / kiosque

**Date :** 2026-04-19  
**Auteur (workflow) :** Bob / Scrum Master (exécution agent)  
**Statut :** **Approuvé pour exécution** (délégation utilisateur : correct course valide ; relectures PRD / QA / readiness déjà effectuées).

---

## 1. Synthèse du problème / déclencheur

**Constat :** le travail récent (recherche technique alignement brownfield, edits `prd.md`, readiness 2026-04-19) constitue un **socle directeur** pour tout le reste du produit (kiosque PWA, multisite, permissions, ADR). Poursuivre en parallèle des **epics historiques** (admin, parité UI, etc.) **dilue** la priorité et risque d’implémenter sans les **guidelines** stabilisées.

**Décision produit :** **mettre en pause** l’exécution BMAD sur les epics non clos **hors** le fil « socle alignement », et **router** l’énergie vers la **formalisation epic + stories** puis développement ciblé sur ce socle.

**Ce n’est pas un échec de sprint :** c’est un **pivot de priorisation** documenté.

---

## 2. Analyse d’impact (checklist Correct Course — synthèse)

### Section 1 — Déclencheur et contexte

| ID | Item | Statut | Notes |
|----|------|--------|-------|
| 1.1 | Story déclenchante | **N/A** | Pas une anomalie de story ; décision stratégique de gel. |
| 1.2 | Problème précis | **Done** | Catégorie : **pivot stratégique** — besoin de figer le socle documentaire avant exécution large. |
| 1.3 | Preuves | **Done** | `technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md`, `implementation-readiness-report-2026-04-19.md`, `prd.md` (révision 2026-04-19). |

### Section 2 — Epics

| ID | Item | Statut | Notes |
|----|------|--------|-------|
| 2.1 | Epic « trigger » | **N/A** | — |
| 2.2 | Changements epic | **Done** | **Ajouter Epic 25** (nouveau) — socle alignement PRD vision / brownfield / ADR ; contenu détaillé par **`bmad-create-epics-and-stories`**. |
| 2.3 | Epics futurs | **Done** | Epics 1–24 et suites **non annulés** ; **gel de l’exécution** (pas de nouveau DS / Story Runner implicite) jusqu’à levée explicite. |
| 2.4 | Obsolescence | **N/A** | Aucun epic rendu obsolete. |
| 2.5 | Réordonnancement | **Done** | **Epic 25** devient la **priorité #1** opérationnelle pour la suite BMAD ; le reste **en attente**. |

### Section 3 — Artefacts

| ID | Item | Statut | Notes |
|----|------|--------|-------|
| 3.1 | PRD | **Done** | `prd.md` à jour ; pas de modification supplémentaire requise par ce correct course. |
| 3.2 | Architecture | **Done** | Index cohérent ; **ADR kiosque / PIN / Redis** à produire **dans** le périmètre Epic 25 (stories ou sous-livrables). |
| 3.3 | UX | **N/A** | Pas de livrable UX `planning_artifacts` ; reste couvert par stories + PRD. |
| 3.4 | Autres | **Done** | `sprint-status.yaml` : commentaire de gel + entrée `epic-25` ; référence croisée ce fichier. |

### Section 4 — Piste retenue

| Option | Viable | Commentaire |
|--------|--------|---------------|
| 1 Ajustement direct | **Oui** | Ajout **Epic 25** + gel explicite ; pas de rollback code. |
| 2 Rollback | **Non** | Inutile ; le socle documentaire est une avancée. |
| 3 Révision MVP PRD | **Non** | Le MVP v2 n’est pas remis en cause ; on **cadre** une extension. |

**Choix :** **Option 1 — Ajustement direct** + **priorité unique** sur Epic 25.

---

## 3. Approche recommandée

1. **Immédiat (fait ou à faire dans la foulée)**  
   - Enregistrer ce **Sprint Change Proposal**.  
   - Mettre à jour **`sprint-status.yaml`** : commentaire de gel + **`epic-25: backlog`**.

2. **`bmad-create-epics-and-stories`** (nouvelle session)  
   - Brief : **un seul epic (25)** — titre provisoire du type *« Socle alignement PRD vision kiosque multisite, brownfield et ADR »* ;  
   - Stories : prédécoupe (spikes ADR PIN / async Paheko, mises à jour doc, critères de done pour guidelines, éventuellement mini-readiness ciblé).

3. **`bmad-sprint-planning`**  
   - Après rédaction des stories 25.x : ne planifier **que** le chemin Epic 25 (ou marquer explicitement les autres epics « gelés » dans les commentaires YAML).

4. **Boucle implémentation**  
   - **`bmad-create-story`** → **`bmad-dev-story`** … **uniquement** sur les clés `25-*`.

**Levée de gel :** décision explicite (nouveau correct course ou note dans `guide-pilotage-v2.md` / sprint) avant de relancer DS sur epics 13–15 ou tout autre epic « en suspens ».

---

## 4. Propositions de modification détaillées

### 4.1 `sprint-status.yaml`

- **Ajouter** en tête de journal (commentaire) : référence à ce fichier + règle de gel.  
- **Ajouter** sous `development_status` :  
  - `epic-25: backlog`  
  - `epic-25-retrospective: optional`  
- **Ne pas** modifier rétroactivement les statuts `review` / `in-progress` des stories 13.x–15.x (preuve historique inchangée) ; le **gel** est **process** (ne pas lancer de nouveau travail BMAD dessus).

### 4.2 `epics.md`

- **Aucune édition mécanique dans ce correct course** — réservé au workflow **`bmad-create-epics-and-stories`** pour éviter les divergences de format.

### 4.3 `prd.md` / architecture

- **Aucun diff requis** ici ; le PRD pointe déjà vers le PRD vision et la recherche technique.

---

## 5. Handoff implémentation

| Rôle | Responsabilité |
|------|------------------|
| **PM (John)** | Exécuter **`bmad-create-epics-and-stories`** avec brief Epic 25 + stories. |
| **SM (Bob)** | **`bmad-sprint-planning`** ciblé ; respect du gel sur les autres epics. |
| **Architecte (Winston)** | ADR produits dans le cadre des stories 25.x si prévu. |
| **Dev (Amelia)** | **`bmad-dev-story`** seulement sur stories `25-*` tant que le gel est actif. |

**Niveau de changement :** **modéré** — réorganisation de backlog et règles de pilotage, sans rollback technique.

**Critères de succès :**

- Epic 25 présent dans `epics.md` avec stories traçables vers `prd.md`, PRD vision 2026-04-19, rapport de recherche, readiness 2026-04-19.  
- Aucun nouveau développement BMAD « hors 25 » sans levée de gel documentée.

---

## 6. Checklist finale (section 6 du gabarit)

| ID | Item | Statut |
|----|------|--------|
| 6.1 | Sections applicables | **Done** |
| 6.2 | Cohérence de la proposition | **Done** |
| 6.3 | Approbation utilisateur | **Done** (délégation) |
| 6.4 | `sprint-status.yaml` | **Done** — aligné sur le dépôt au 2026-04-19 : en-tête YAML de traçabilité (gel hors Epic 25), clé `epic-25` en **backlog**, stories 13.x–15.x inchangées comme preuve d’état ; pas de dépendance à un hash Git pour relire la preuve. |
| 6.5 | Prochaines étapes | **Done** (section 3) |

---

**Fin du document — Correct Course complété pour Strophe.**
