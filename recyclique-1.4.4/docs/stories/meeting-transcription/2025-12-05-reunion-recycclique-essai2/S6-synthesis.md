# Story S6: Synthèse Finale

**Statut:** Draft  
**Épopée:** [docs/epics/2025-12-05-reunion-recycclique-essai2.md](../../../epics/2025-12-05-reunion-recycclique-essai2.md)  
**Module:** BMAD Workflow - PM  
**Priorité:** Haute  
**Meeting ID:** 2025-12-05-reunion-recycclique-essai2  
**Date:** 2025-12-05  
**Participants:** Christophe, Christel/Germaine, Olivier/Olive, Caro, Gaby (distanciel)

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
- **Meeting ID :** 2025-12-05-reunion-recycclique-essai2
- **Date :** 2025-12-05
- **Participants :** Christophe, Christel/Germaine, Olivier/Olive, Caro, Gaby (distanciel)

---

## 2. User Story

En tant que **PM BMAD**,  
je veux **consolider les résumés et threads en compte-rendu final**,  
afin de **produire un document structuré et exploitable pour les participants**.

---

## 3. Critères d'acceptation

### 3.1. Génération compte-rendu final

1. **Task `generate_meeting_report`**
   - Lit résumés dans `meetings/2025-12-05-reunion-recycclique-essai2/working/summaries/`
   - Lit threads dans `meetings/2025-12-05-reunion-recycclique-essai2/working/threads.md`
   - Lit index dans `meetings/2025-12-05-reunion-recycclique-essai2/working/index.json`
   - Extrait métadonnées (date, participants, durée)
   - Détecte ordre du jour (depuis threads ou résumés)
   - Consolide décisions, actions, questions, chantiers
   - Utilise prompt PM standard (voir `docs/prompts/pm-synthesis.md`)
   - Génère `meetings/2025-12-05-reunion-recycclique-essai2/final/compte-rendu.md` avec structure complète
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

- Compte-rendu final dans `meetings/2025-12-05-reunion-recycclique-essai2/final/compte-rendu.md`
- Document structuré et exploitable

---

## 7. Chemins de travail

- **Dossier working :** `meetings/2025-12-05-reunion-recycclique-essai2/working/`
- **Dossier final :** `meetings/2025-12-05-reunion-recycclique-essai2/final/`

---

**Fin de la story**





