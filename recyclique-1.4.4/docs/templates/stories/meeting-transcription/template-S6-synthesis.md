# Story S6: Synthèse Finale

**Statut:** Draft  
**Épopée:** [${epic_ref}](../../../epics/${meeting_id}.md)  
**Module:** BMAD Workflow - PM  
**Priorité:** Haute  
**Meeting ID:** ${meeting_id}  
**Date:** ${date}  
**Participants:** ${participants}

---

## 1. Contexte

Les résumés et threads doivent être consolidés en un compte-rendu final structuré et exploitable.

**Prérequis :**
- Story S5 complétée (validation OK)

**Problème :**
- Résumés et threads dispersés
- Pas de document final consolidé
- Pas de structure standardisée pour exploitation

**Informations de la réunion :**
- **Meeting ID :** ${meeting_id}
- **Date :** ${date}
- **Participants :** ${participants}

---

## 2. User Story

En tant que **PM BMAD**,  
je veux **consolider les résumés et threads en compte-rendu final**,  
afin de **produire un document structuré et exploitable pour les participants**.

---

## 3. Critères d'acceptation

### 3.1. Génération compte-rendu final

1. **Task `generate_meeting_report`**
   - Lit résumés dans `${working_dir}summaries/`
   - Lit threads dans `${working_dir}threads.md`
   - Lit index dans `${working_dir}index.json`
   - Extrait métadonnées (date, participants, durée)
   - Détecte ordre du jour (depuis threads ou résumés)
   - Consolide décisions, actions, questions, chantiers
   - Utilise prompt PM standard (voir `docs/prompts/pm-synthesis.md`)
   - Génère `${final_dir}compte-rendu.md` avec structure complète
   - Élimine redites, ordonne chronologiquement, garde cohérence tags

---

## 4. Tâches

- [ ] **T1 – Génération CR final**
  - Implémenter `generate_meeting_report` task
  - Consolidation résumés + threads
  - Utilisation prompt PM
  - Génération compte-rendu structuré

---

## 5. Dépendances

- **Pré-requis :** Story S5 (validation OK)
- **Bloque :** Story S7 (Clôture)

---

## 6. Livrables

- Compte-rendu final dans `${final_dir}compte-rendu.md`
- Document structuré et exploitable

---

## 7. Chemins de travail

- **Dossier working :** `${working_dir}`
- **Dossier final :** `${final_dir}`

---

**Fin de la story**





