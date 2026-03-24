# Story S4: Analyse & Résumés

**Statut:** Draft  
**Épopée:** [docs/epics/2025-12-05-reunion-recycclique.md](../../../epics/2025-12-05-reunion-recycclique.md)  
**Module:** BMAD Workflow - Analyst  
**Priorité:** Haute  
**Meeting ID:** 2025-12-05-reunion-recycclique  
**Date:** 2025-12-05  
**Participants:** Christophe, Christel/Germaine, Olivier/Olive, Caro, Gaby

---

## 1. Contexte

Les segments doivent être résumés intelligemment pour extraire points clés, décisions, actions, risques, questions. Les sujets récurrents doivent être agrégés en threads.

**Prérequis :**
- Story S3 complétée (segments disponibles)

**Problème :**
- Segments bruts non exploitables directement
- Pas d'extraction structurée des informations
- Pas d'agrégation des sujets récurrents

**Informations de la réunion :**
- **Meeting ID :** 2025-12-05-reunion-recycclique
- **Date :** 2025-12-05
- **Participants :** Christophe, Christel/Germaine, Olivier/Olive, Caro, Gaby

---

## 2. User Story

En tant qu'**Analyst BMAD**,  
je veux **résumer chaque segment et agréger les sujets récurrents**,  
afin de **extraire les informations structurées nécessaires au compte-rendu final**.

---

## 3. Critères d'acceptation

### 3.1. Résumé des segments

1. **Task `summarize_segments`**
   - Lit l'index `meetings/2025-12-05-reunion-recycclique/working/index.json`
   - Pour chaque segment : résume avec prompt Analyst standard
   - Génère résumé structuré (points, décisions, actions RACI, risques, questions, tags, tableau)
   - Sauvegarde dans `meetings/2025-12-05-reunion-recycclique/working/summaries/summary-{num}.md`

### 3.2. Agrégation des threads

1. **Task `build_threads`**
   - Lit tous les résumés dans `meetings/2025-12-05-reunion-recycclique/working/summaries/`
   - Identifie threads (sujets récurrents) par tags similaires
   - Crée fichier `meetings/2025-12-05-reunion-recycclique/working/threads.md` avec threads agrégés

---

## 4. Tâches

- [ ] **T1 – Résumé segments**
  - Implémenter `summarize_segments` task
  - Intégration LLM avec prompt Analyst
  - Génération résumés structurés

- [ ] **T2 – Agrégation threads**
  - Implémenter `build_threads` task
  - Détection sujets récurrents
  - Création threads.md

---

## 5. Dépendances

- **Pré-requis :** Story S3 (segments disponibles)
- **Bloque :** Story S5 (Validation)

---

## 6. Livrables

- Résumés dans `meetings/2025-12-05-reunion-recycclique/working/summaries/summary-{num}.md`
- Threads agrégés dans `meetings/2025-12-05-reunion-recycclique/working/threads.md`

---

## 7. Chemins de travail

- **Dossier working :** `meetings/2025-12-05-reunion-recycclique/working/`
- **Dossier final :** `meetings/2025-12-05-reunion-recycclique/final/`

---

**Fin de la story**





