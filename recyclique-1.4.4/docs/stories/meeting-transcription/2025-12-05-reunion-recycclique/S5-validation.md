# Story S5: Validation Inverse

**Statut:** Draft  
**Épopée:** [docs/epics/2025-12-05-reunion-recycclique.md](../../../epics/2025-12-05-reunion-recycclique.md)  
**Module:** BMAD Workflow - QA  
**Priorité:** Moyenne  
**Meeting ID:** 2025-12-05-reunion-recycclique  
**Date:** 2025-12-05  
**Participants:** Christophe, Christel/Germaine, Olivier/Olive, Caro, Gaby

---

## 1. Contexte

Les documents finaux (résumés, threads) doivent être validés en comparant avec les transcriptions brutes pour détecter incohérences, oublis, divergences.

**Prérequis :**
- Story S4 complétée (résumés et threads disponibles)

**Problème :**
- Pas de validation de cohérence entre documents finaux et transcriptions
- Risque d'incohérences ou d'oublis non détectés

**Informations de la réunion :**
- **Meeting ID :** 2025-12-05-reunion-recycclique
- **Date :** 2025-12-05
- **Participants :** Christophe, Christel/Germaine, Olivier/Olive, Caro, Gaby

---

## 2. User Story

En tant que **QA BMAD**,  
je veux **valider la cohérence des documents finaux avec les transcriptions**,  
afin de **garantir la qualité et l'exactitude du compte-rendu final**.

---

## 3. Critères d'acceptation

### 3.1. Validation inverse

1. **Task `inverse_validation`**
   - Lit résumés dans `meetings/2025-12-05-reunion-recycclique/working/summaries/`
   - Lit threads dans `meetings/2025-12-05-reunion-recycclique/working/threads.md`
   - Lit transcription complète dans `meetings/2025-12-05-reunion-recycclique/transcriptions/full-transcript.json`
   - Compare documents ↔ transcriptions
   - Détecte incohérences, oublis, divergences
   - Génère rapport dans `meetings/2025-12-05-reunion-recycclique/working/validation-report.md`

---

## 4. Tâches

- [ ] **T1 – Validation inverse**
  - Implémenter `inverse_validation` task
  - Comparaison documents ↔ transcriptions
  - Détection incohérences/oublis
  - Génération rapport validation

---

## 5. Dépendances

- **Pré-requis :** Story S4 (résumés et threads disponibles)
- **Bloque :** Story S6 (Synthèse)

---

## 6. Livrables

- Rapport de validation dans `meetings/2025-12-05-reunion-recycclique/working/validation-report.md`
- Liste des incohérences/oublis/divergences détectés

---

## 7. Chemins de travail

- **Dossier working :** `meetings/2025-12-05-reunion-recycclique/working/`
- **Dossier transcriptions :** `meetings/2025-12-05-reunion-recycclique/transcriptions/`
- **Dossier final :** `meetings/2025-12-05-reunion-recycclique/final/`

---

**Fin de la story**





