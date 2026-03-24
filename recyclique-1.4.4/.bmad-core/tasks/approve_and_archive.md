<!-- Powered by BMAD™ Core -->

# Approve and Archive

**Agent:** PO  
**Workflow:** meeting-transcription  
**Stage:** closure

## Description

Clôture la réunion, demande validation finale à l'utilisateur, et archive si nécessaire.

## Process

1. **Afficher résumé final**
   - Afficher tous les artefacts produits
   - Chemin du compte-rendu final
   - Statut de validation

2. **Demander validation utilisateur**
   ```
   ✅ Workflow terminé avec succès !
   
   📄 Compte-rendu final : meetings/<meeting-id>/final/compte-rendu.md
   
   Tous les artefacts sont disponibles dans : meetings/<meeting-id>/
   
   Souhaitez-vous archiver cette réunion ? (oui/non)
   ```

3. **Si archivage demandé :**
   - Créer dossier `archives/` si n'existe pas
   - Déplacer ou copier `meetings/<meeting-id>/` vers `archives/`
   - Ou créer archive ZIP (optionnel)

4. **Confirmer clôture**
   - Message de confirmation
   - Chemin final des artefacts

## Output

- Message de clôture avec chemin des artefacts
- Archivage (si demandé)
- Confirmation finale

## Notes

- Archivage optionnel (peut être fait manuellement)
- Tous les fichiers restent accessibles dans `meetings/`
- Workflow terminé avec succès





