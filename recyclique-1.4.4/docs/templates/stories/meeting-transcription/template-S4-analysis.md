# Story S4: Analyse & Résumés

**Statut:** Draft  
**Épopée:** [${epic_ref}](../../../epics/${meeting_id}.md)  
**Module:** BMAD Workflow - Analyst  
**Priorité:** Haute  
**Meeting ID:** ${meeting_id}  
**Date:** ${date}  
**Participants:** ${participants}

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
- **Meeting ID :** ${meeting_id}
- **Date :** ${date}
- **Participants :** ${participants}

---

## 2. User Story

En tant qu'**Analyst BMAD**,  
je veux **résumer chaque segment et agréger les sujets récurrents**,  
afin de **extraire les informations structurées nécessaires au compte-rendu final**.

---

## 3. Critères d'acceptation

### 3.1. Résumé des segments

1. **Task `summarize_segments`**
   - Lit l'index `${working_dir}index.json`
   - Pour chaque segment : résume avec prompt Analyst standard
   - Génère résumé structuré (points, décisions, actions RACI, risques, questions, tags, tableau)
   - Sauvegarde dans `${working_dir}summaries/summary-{num}.md`

### 3.2. Agrégation des threads

1. **Task `build_threads`**
   - Lit tous les résumés dans `${working_dir}summaries/`
   - Identifie threads (sujets récurrents) par tags similaires
   - Crée fichier `${working_dir}threads.md` avec threads agrégés

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

- Résumés dans `${working_dir}summaries/summary-{num}.md`
- Threads agrégés dans `${working_dir}threads.md`

---

## 7. Chemins de travail

- **Dossier working :** `${working_dir}`
- **Dossier final :** `${final_dir}`

---

**Fin de la story**





