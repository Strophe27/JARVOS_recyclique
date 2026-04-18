<!-- Powered by BMAD™ Core -->

# Prompt Copy Audio

**Agent:** Orchestrator  
**Workflow:** meeting-transcription  
**Stage:** setup

## Description

Invite l'utilisateur à copier ses fichiers audio dans le dossier `audio/` de la réunion.

## Process

1. **Vérifier le chemin du dossier audio**
   - Chemin: `./meetings/<meeting-id>/audio/`
   - Afficher le chemin complet à l'utilisateur

2. **Afficher l'invite**
   ```
   📁 Veuillez copier vos fichiers audio dans le dossier suivant :
   
   {chemin_complet}
   
   Format accepté : .mp3, .wav, .m4a, .flac
   Une fois les fichiers copiés, dites "fichiers copiés" ou "done".
   ```

3. **Attendre confirmation utilisateur**
   - Attendre que l'utilisateur confirme avoir copié les fichiers
   - Ne pas vérifier automatiquement (la task suivante le fera)

4. **Confirmer réception**
   - Message: "Merci. Passage à la validation des fichiers..."

## Output

- Message d'invite affiché
- Confirmation utilisateur reçue

## Notes

- Ne pas vérifier la présence des fichiers ici (task suivante)
- Accepter tous les formats audio courants
- L'utilisateur peut copier plusieurs fichiers





