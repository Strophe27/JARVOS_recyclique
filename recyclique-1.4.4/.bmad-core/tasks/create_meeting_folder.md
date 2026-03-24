<!-- Powered by BMAD™ Core -->

# Create Meeting Folder

**Agent:** Orchestrator  
**Workflow:** meeting-transcription  
**Stage:** setup

## Description

Crée la structure de dossiers pour une nouvelle réunion dans `./meetings/<meeting-id>/`.

## Process

1. **Déterminer le meeting-id**
   - Format: `YYYY-MM-DD-nom-reunion` (ex: `2025-01-27-brainstorming-epic`)
   - Demander à l'utilisateur si non fourni

2. **Créer la structure**
   ```
   ./meetings/<meeting-id>/
   ├── audio/
   ├── transcriptions/
   ├── working/
   │   ├── segments/
   │   └── summaries/
   └── final/
   ```

3. **Vérifier que le dossier n'existe pas déjà**
   - Si existe, demander confirmation pour réutiliser ou créer nouveau

4. **Créer les dossiers**
   - Utiliser `os.makedirs()` avec `exist_ok=True`
   - Créer tous les sous-dossiers nécessaires

5. **Créer fichier `.gitkeep` dans chaque dossier vide** (pour Git)

6. **Confirmer la création**
   - Afficher le chemin complet créé
   - Confirmer que la structure est prête

## Output

- Structure de dossiers créée dans `./meetings/<meeting-id>/`
- Message de confirmation avec chemin complet

## Notes

- Le dossier `meetings/` doit être dans `.gitignore` (déjà configuré)
- Format meeting-id doit être valide (pas de caractères spéciaux sauf `-`)





