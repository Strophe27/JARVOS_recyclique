# Story S5: Validation Inverse

**Statut:** Draft  
**Épopée:** [${epic_ref}](../../../epics/${meeting_id}.md)  
**Module:** BMAD Workflow - QA  
**Priorité:** Moyenne  
**Meeting ID:** ${meeting_id}  
**Date:** ${date}  
**Participants:** ${participants}

---

## 1. Contexte

Les documents finaux (résumés, threads) doivent être validés en comparant avec les transcriptions brutes pour détecter incohérences, oublis, divergences.

**Prérequis :**
- Story S4 complétée (résumés et threads disponibles)

**Problème :**
- Pas de validation de cohérence entre documents finaux et transcriptions
- Risque d'incohérences ou d'oublis non détectés

**Informations de la réunion :**
- **Meeting ID :** ${meeting_id}
- **Date :** ${date}
- **Participants :** ${participants}

---

## 2. User Story

En tant que **QA BMAD**,  
je veux **valider la cohérence des documents finaux avec les transcriptions**,  
afin de **garantir la qualité et l'exactitude du compte-rendu final**.

---

## 3. Critères d'acceptation

### 3.1. Validation inverse

1. **Task `inverse_validation`**
   - Lit résumés dans `${working_dir}summaries/`
   - Lit threads dans `${working_dir}threads.md`
   - Lit transcription complète dans `${transcriptions_dir}full-transcript.json`
   - Compare documents ↔ transcriptions
   - Détecte incohérences, oublis, divergences
   - Génère rapport dans `${working_dir}validation-report.md`

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

- Rapport de validation dans `${working_dir}validation-report.md`
- Liste des incohérences/oublis/divergences détectés

---

## 7. Chemins de travail

- **Dossier working :** `${working_dir}`
- **Dossier transcriptions :** `${transcriptions_dir}`
- **Dossier final :** `${final_dir}`

---

**Fin de la story**





