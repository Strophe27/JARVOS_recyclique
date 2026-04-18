# Story S3: Préparation Lots & Segmentation

**Statut:** Draft  
**Épopée:** [${epic_ref}](../../../epics/${meeting_id}.md)  
**Module:** BMAD Workflow - SM/Dev  
**Priorité:** Haute  
**Meeting ID:** ${meeting_id}  
**Date:** ${date}  
**Participants:** ${participants}

---

## 1. Contexte

Les transcriptions brutes doivent être découpées en segments exploitables pour traitement par lots (résumés LLM). Cette story prépare les segments et calcule les métriques nécessaires.

**Prérequis :**
- Story S2 complétée (transcriptions JSON disponibles)

**Problème :**
- Transcripts bruts trop longs pour traitement direct
- Pas de découpage en segments exploitables
- Pas de métriques pour optimiser traitement

**Informations de la réunion :**
- **Meeting ID :** ${meeting_id}
- **Date :** ${date}
- **Participants :** ${participants}

---

## 2. User Story

En tant que **SM/Dev BMAD**,  
je veux **découper les transcriptions en segments et calculer les métriques**,  
afin de **préparer le traitement par lots pour l'analyse LLM**.

---

## 3. Critères d'acceptation

### 3.1. Découpage en segments

1. **Task `prepare_segments`**
   - Lit tous les fichiers JSON dans `${transcriptions_dir}*.json`
   - Parse structure AssemblyAI (`utterances`, `speakers`, `text`)
   - Consolide toutes les transcriptions en une liste chronologique
   - Découpe en segments de 5 minutes avec overlap de 30 secondes
   - Crée fichiers `${working_dir}segments/segment-{num:03d}.md`
   - Sauvegarde transcription consolidée dans `${transcriptions_dir}full-transcript.json`

2. **Task `compute_metrics`**
   - Lit tous les segments créés
   - Calcule métriques par segment (tokens, taille, durée, speakers, overlap)
   - Crée fichier `${working_dir}index.json` avec métadonnées complètes

---

## 4. Tâches

- [ ] **T1 – Découpage segments**
  - Implémenter `prepare_segments` task
  - Consolidation transcriptions
  - Découpage avec overlap

- [ ] **T2 – Calcul métriques**
  - Implémenter `compute_metrics` task
  - Calcul métriques par segment
  - Création index.json

---

## 5. Dépendances

- **Pré-requis :** Story S2 (transcriptions disponibles)
- **Bloque :** Story S4 (Analyse)

---

## 6. Livrables

- Segments dans `${working_dir}segments/segment-{num}.md`
- Index dans `${working_dir}index.json` avec métadonnées
- Transcription consolidée dans `${transcriptions_dir}full-transcript.json`

---

## 7. Chemins de travail

- **Dossier transcriptions :** `${transcriptions_dir}`
- **Dossier working :** `${working_dir}`
- **Dossier final :** `${final_dir}`

---

**Fin de la story**





