# Story S2: Transcription AssemblyAI

**Statut:** Draft  
**Épopée:** [${epic_ref}](../../../epics/${meeting_id}.md)  
**Module:** BMAD Workflow - Dev  
**Priorité:** Haute (bloquant pour tout le reste)  
**Meeting ID:** ${meeting_id}  
**Date:** ${date}  
**Participants:** ${participants}

---

## 1. Contexte

Les fichiers audio doivent être transcrits via l'API AssemblyAI pour obtenir des transcriptions diarisées (speakers identifiés) avec timestamps. Cette story implémente l'intégration avec AssemblyAI.

**Prérequis :**
- Story S1 complétée (fichiers audio présents)

**Problème :**
- Pas d'intégration avec AssemblyAI
- Pas de récupération des transcriptions diarisées

**Informations de la réunion :**
- **Meeting ID :** ${meeting_id}
- **Date :** ${date}
- **Participants :** ${participants}
- **Fichiers audio à transcrire :**
${audio_files}

---

## 2. User Story

En tant que **Dev BMAD**,  
je veux **transcrire les fichiers audio via AssemblyAI**,  
afin de **récupérer les transcriptions diarisées avec timestamps pour analyse ultérieure**.

---

## 3. Critères d'acceptation

### 3.1. Script de transcription AssemblyAI

1. **Script `scripts/aai_transcribe.py`**
   - Prend en paramètre `--meeting-id ${meeting_id}`
   - Lit tous les fichiers audio dans `meetings/${meeting_id}/audio/`
   - Pour chaque fichier :
     - Upload vers AssemblyAI via `POST /upload`
     - Crée job transcription avec paramètres :
       - `language_code: fr` (Français)
       - `speaker_labels: true` (Diarisation)
       - `iab_categories: true` (Topics IAB)
     - Poll status via `GET /transcript/{id}` avec retries (max 3, backoff exponentiel)
     - Récupère JSON de transcription complète
     - Sauvegarde dans `${transcriptions_dir}<filename>.json`

2. **Gestion d'erreurs**
   - Erreurs temporaires (429, 503, timeout) : Retry automatique
   - Erreurs définitives (400, 401, 404) : Log + notification utilisateur
   - Logs dans `logs/run-${date}.log`

3. **Task `transcribe_aai`**
   - Vérifie clé API dans `.env` : `ASSEMBLYAI_API_KEY`
   - Exécute le script `aai_transcribe.py --meeting-id ${meeting_id}`
   - Vérifie que tous les fichiers ont été transcrits
   - Affiche confirmation avec nombre de fichiers transcrits

---

## 4. Tâches

- [ ] **T1 – Script AssemblyAI**
  - Créer `scripts/aai_transcribe.py`
  - Intégration API AssemblyAI (upload, poll, récupération)
  - Gestion retries et erreurs

- [ ] **T2 – Task transcription**
  - Implémenter `transcribe_aai` task
  - Vérification prérequis
  - Exécution script + validation résultats

---

## 5. Dépendances

- **Pré-requis :** Story S1 (fichiers audio présents)
- **Bloque :** Story S3 (Préparation lots)

---

## 6. Livrables

- Script `scripts/aai_transcribe.py` fonctionnel
- Fichiers JSON dans `${transcriptions_dir}` (un par fichier audio)
- Logs d'exécution dans `logs/run-${date}.log`

---

## 7. Chemins de travail

- **Dossier audio :** `./meetings/${meeting_id}/audio/`
- **Dossier transcriptions :** `${transcriptions_dir}`
- **Dossier working :** `${working_dir}`
- **Dossier final :** `${final_dir}`

---

**Fin de la story**





