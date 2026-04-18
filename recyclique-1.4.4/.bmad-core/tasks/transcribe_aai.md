<!-- Powered by BMAD™ Core -->

# Transcribe AssemblyAI

**Agent:** Dev  
**Workflow:** meeting-transcription  
**Stage:** transcription

## Description

Lance le script `aai_transcribe.py` pour uploader les fichiers audio vers AssemblyAI et récupérer les transcriptions diarisées.

## Process

1. **Vérifier les prérequis**
   - Clé API AssemblyAI dans `.env` : `ASSEMBLYAI_API_KEY`
   - Fichiers audio présents dans `audio/`
   - Script `scripts/meeting-transcription/aai_transcribe.py` existe

2. **Exécuter le script**
   ```bash
   python scripts/meeting-transcription/aai_transcribe.py --meeting-id <meeting-id>
   ```

3. **Le script doit :**
   - Uploader chaque fichier audio vers AssemblyAI
   - Créer un job de transcription avec paramètres:
     - `language_code: fr` (Français)
     - `speaker_labels: true` (Diarisation)
     - `iab_categories: true` (Topics IAB)
   - Poller le status avec retries (max 3, backoff exponentiel)
   - Récupérer le JSON de transcription
   - Sauvegarder dans `transcriptions/<filename>.json`

4. **Vérifier les résultats**
   - Vérifier que tous les fichiers ont été transcrits
   - Vérifier que les JSON sont valides
   - Afficher le nombre de fichiers transcrits

5. **Gérer les erreurs**
   - Si erreur API: Log + notification utilisateur
   - Si timeout: Retry automatique (max 3)
   - Si échec définitif: Arrêter workflow avec état sauvegardé

## Output

- Fichiers JSON dans `transcriptions/` (un par fichier audio)
- Log d'exécution dans `logs/run-YYYYMMDD.log`
- Message de confirmation avec nombre de fichiers transcrits

## Notes

- Le script `aai_transcribe.py` sera fourni par l'agent Dev séparément
- Format JSON: Structure AssemblyAI avec `utterances`, `speakers`, `text`
- Gestion d'erreurs robuste avec retries et notifications





