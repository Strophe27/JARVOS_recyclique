<!-- Powered by BMAD™ Core -->

# Generate Meeting Stories

**Agent:** Orchestrator  
**Workflow:** meeting-transcription  
**Stage:** generate_stories

## Description

Génère les 7 stories spécifiques à une réunion à partir des templates génériques. Remplace automatiquement les placeholders dans chaque template avec les informations concrètes de la réunion.

## Process

1. **Récupérer les inputs**
   - `meeting_id` (string, requis) : ID de la réunion (ex: `2025-01-27-reunion-strategique`)
   - `participants` (list, saisis manuellement) : Liste des participants (ex: "Alice, Bob, Chloé")
   - `workflow_name` (string, par défaut "meeting-transcription")

2. **Extraire la date du meeting_id**
   - Format attendu : `YYYY-MM-DD-nom-reunion`
   - Extraire la partie `YYYY-MM-DD` pour `${date}`

3. **Détecter les fichiers audio automatiquement**
   - Lire la liste des fichiers dans `meetings/${meeting_id}/audio/`
   - Filtrer sur extensions : `.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg`
   - Formater en liste Markdown pour `${audio_files}` :
     ```markdown
     - fichier1.mp3
     - fichier2.mp3
     ...
     ```

4. **Construire les chemins**
   - `working_dir` : `meetings/${meeting_id}/working/`
   - `transcriptions_dir` : `meetings/${meeting_id}/transcriptions/`
   - `final_dir` : `meetings/${meeting_id}/final/`

5. **Construire l'epic_ref**
   - `epic_ref` : `docs/epics/${meeting_id}.md`

6. **Préparer le dictionnaire de remplacement**
   ```python
   replacements = {
       "meeting_id": meeting_id,
       "date": extracted_date,
       "audio_files": formatted_audio_list,
       "participants": participants,
       "working_dir": working_dir,
       "transcriptions_dir": transcriptions_dir,
       "final_dir": final_dir,
       "workflow_name": workflow_name,
       "epic_ref": epic_ref
   }
   ```

7. **Pour chaque template (S1 à S7)**
   - Lire le fichier template depuis `docs/templates/stories/meeting-transcription/template-S{x}-{nom}.md`
   - Remplacer tous les placeholders `${...}` par les valeurs du dictionnaire
   - Créer le dossier de destination : `docs/stories/meeting-transcription/${meeting_id}/`
   - Écrire la story instanciée dans `docs/stories/meeting-transcription/${meeting_id}/S{x}-{nom}.md`

8. **Générer le log**
   - Créer fichier `logs/generate_meeting_stories_${meeting_id}.log`
   - Contenu :
     ```
     Génération stories pour réunion : ${meeting_id}
     Date : ${date}
     Participants : ${participants}
     Fichiers audio détectés : ${nombre} fichiers
     - ${liste_fichiers}
     Stories générées : 7
     - S1-setup.md
     - S2-transcription.md
     - S3-prepare-lots.md
     - S4-analysis.md
     - S5-validation.md
     - S6-synthesis.md
     - S7-closure.md
     ```

9. **Confirmer la génération**
   - Afficher résumé : nombre de fichiers créés, liste des audios, date, participants
   - Confirmer que toutes les stories sont prêtes pour exécution

## Inputs

- `meeting_id` (string, requis) : ID de la réunion
- `participants` (list, saisis manuellement) : Liste des participants
- `workflow_name` (string, optionnel) : Nom du workflow (défaut: "meeting-transcription")

## Output

- 7 stories concrètes dans `docs/stories/meeting-transcription/${meeting_id}/`
- Log dans `logs/generate_meeting_stories_${meeting_id}.log`
- Message de confirmation avec résumé

## Acceptance Criteria

- Tous les placeholders remplacés correctement dans toutes les stories
- Dossier `docs/stories/meeting-transcription/${meeting_id}/` créé avec 7 fichiers
- Log valide et sans erreur
- Tous les chemins relatifs corrects
- Format Markdown valide pour chaque story

## Notes

- Les fichiers audio peuvent ne pas exister encore (détection se fera dans S1)
- Si aucun fichier audio détecté, `${audio_files}` sera vide (sera rempli dans S1)
- Les participants doivent être fournis manuellement par l'utilisateur
- Le meeting_id doit respecter le format `YYYY-MM-DD-nom-reunion`





