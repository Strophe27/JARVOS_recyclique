<!-- Powered by BMAD™ Core -->

# Validate Audio Presence

**Agent:** Orchestrator  
**Workflow:** meeting-transcription  
**Stage:** setup

## Description

Vérifie la présence d'au moins un fichier audio dans le dossier `audio/` de la réunion.

## Process

1. **Lister les fichiers dans `./meetings/<meeting-id>/audio/`**
   - Utiliser `os.listdir()` ou `glob.glob()`
   - Filtrer sur extensions: `.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg`

2. **Vérifier qu'il y a au moins 1 fichier**
   - Si aucun fichier: Erreur + retour à `prompt_copy_audio`
   - Si fichiers présents: Continuer

3. **Afficher la liste des fichiers trouvés**
   ```
   ✅ Fichiers audio détectés ({nombre}) :
   - {fichier1}
   - {fichier2}
   ...
   ```

4. **Valider les tailles de fichiers**
   - Vérifier que les fichiers ne sont pas vides (taille > 0)
   - Avertir si un fichier semble vide

5. **Confirmer validation**
   - Message: "Validation OK. Prêt pour transcription."

## Output

- Liste des fichiers audio détectés
- Confirmation de validation
- Erreur si aucun fichier (avec retour à prompt_copy_audio)

## Notes

- Accepter au minimum 1 fichier (peut être plus)
- Vérifier que les fichiers ne sont pas corrompus (taille > 0)
- Format de sortie: liste claire pour l'utilisateur





