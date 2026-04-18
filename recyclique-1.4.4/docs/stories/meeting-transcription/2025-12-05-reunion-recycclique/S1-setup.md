# Story S1: Setup Réunion

**Statut:** Draft  
**Épopée:** [docs/epics/2025-12-05-reunion-recycclique.md](../../../epics/2025-12-05-reunion-recycclique.md)  
**Module:** BMAD Workflow - Orchestrator  
**Priorité:** Haute (bloquant pour tout le reste)  
**Meeting ID:** 2025-12-05-reunion-recycclique  
**Date:** 2025-12-05  
**Participants:** Christophe, Christel/Germaine, Olivier/Olive, Caro, Gaby

---

## 1. Contexte

Le workflow de transcription de réunions nécessite une structure de dossiers organisée pour stocker les fichiers audio, transcriptions, documents de travail, et compte-rendu final. Cette story initialise cette structure et valide la présence des fichiers audio.

**Prérequis :**
- Aucun (démarrage du workflow)

**Problème :**
- Pas de structure organisée pour stocker les artefacts d'une réunion
- Pas de validation que les fichiers audio sont présents avant transcription

**Informations de la réunion :**
- **Meeting ID :** 2025-12-05-reunion-recycclique
- **Date :** 2025-12-05
- **Participants :** Christophe, Christel/Germaine, Olivier/Olive, Caro, Gaby
- **Fichiers audio attendus :**


---

## 2. User Story

En tant que **Orchestrator BMAD**,  
je veux **créer la structure de dossiers et valider la présence des fichiers audio**,  
afin de **préparer l'environnement pour le workflow de transcription**.

---

## 3. Critères d'acceptation

### 3.1. Création de la structure de dossiers

1. **Task `create_meeting_folder`**
   - Crée la structure `./meetings/2025-12-05-reunion-recycclique/` avec sous-dossiers :
     - `audio/` : Fichiers audio originaux
     - `transcriptions/` : Transcripts bruts AssemblyAI
     - `working/segments/` : Segments découpés
     - `working/summaries/` : Résumés par segment
     - `final/` : Compte-rendu final
   - Format meeting-id : `2025-12-05-reunion-recycclique`
   - Vérifie que le dossier n'existe pas déjà (demande confirmation si existe)
   - Crée fichier `.gitkeep` dans chaque dossier vide

2. **Task `prompt_copy_audio`**
   - Affiche le chemin complet du dossier `audio/` : `./meetings/2025-12-05-reunion-recycclique/audio/`
   - Invite l'utilisateur à copier ses fichiers audio
   - Accepte formats : `.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg`
   - Attend confirmation utilisateur ("fichiers copiés" ou "done")

3. **Task `validate_audio_presence`**
   - Liste tous les fichiers audio dans `./meetings/2025-12-05-reunion-recycclique/audio/`
   - Vérifie qu'il y a au moins 1 fichier
   - Vérifie que les fichiers ne sont pas vides (taille > 0)
   - Affiche la liste des fichiers détectés
   - Si aucun fichier : retourne à `prompt_copy_audio` avec message d'erreur

---

## 4. Tâches

- [ ] **T1 – Créer structure dossiers**
  - Implémenter `create_meeting_folder` task
  - Gestion format meeting-id : `2025-12-05-reunion-recycclique`
  - Création récursive des dossiers

- [ ] **T2 – Inviter copie fichiers audio**
  - Implémenter `prompt_copy_audio` task
  - Affichage chemin + invite utilisateur
  - Attente confirmation

- [ ] **T3 – Valider présence fichiers**
  - Implémenter `validate_audio_presence` task
  - Détection fichiers audio
  - Validation tailles
  - Gestion erreurs

---

## 5. Dépendances

- **Pré-requis :** Aucun (démarrage workflow)
- **Bloque :** Story S2 (Transcription)

---

## 6. Livrables

- Structure de dossiers créée dans `./meetings/2025-12-05-reunion-recycclique/`
- Fichiers audio présents dans `./meetings/2025-12-05-reunion-recycclique/audio/`
- Validation OK pour passage à Story S2

---

## 7. Chemins de travail

- **Dossier de travail :** `./meetings/2025-12-05-reunion-recycclique/`
- **Dossier audio :** `./meetings/2025-12-05-reunion-recycclique/audio/`
- **Dossier transcriptions :** `meetings/2025-12-05-reunion-recycclique/transcriptions/`
- **Dossier working :** `meetings/2025-12-05-reunion-recycclique/working/`
- **Dossier final :** `meetings/2025-12-05-reunion-recycclique/final/`

---

**Fin de la story**





