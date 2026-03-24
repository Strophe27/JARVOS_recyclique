# Scripts Meeting Transcription

Scripts Python réutilisables pour le workflow de transcription de réunions.

## 📁 Structure

Tous les scripts sont dans `scripts/meeting-transcription/` :

- `aai_transcribe.py` - Transcription audio via AssemblyAI
- `prepare_segments.py` - Découpe en segments temporels
- `summarize_segments.py` - Résumé de chaque segment
- `build_threads.py` - Agrégation des sujets récurrents
- `inverse_validation.py` - Validation inverse des documents
- `generate_meeting_report.py` - Génération du compte-rendu final
- `verify_and_close.py` - Vérification finale et clôture
- `config_loader.py` - Module utilitaire pour charger config.json

## 🔧 Configuration

Tous les scripts utilisent un fichier `config.json` dans le dossier de la réunion :

```json
{
  "meeting_id": "2025-01-27-test-transcription",
  "date": "2025-01-27",
  "participants": ["Alice", "Bob", "Chloé"],
  "speaker_mapping": {
    "A": "Alice",
    "B": "Bob",
    "C": "Chloé"
  },
  "agenda": [
    "Sujet 1",
    "Sujet 2"
  ]
}
```

Si `config.json` n'existe pas, les scripts utilisent des valeurs par défaut :
- `date` : extraite du meeting_id (format: YYYY-MM-DD-nom)
- `participants` : liste vide
- `speaker_mapping` : dictionnaire vide
- `agenda` : liste vide

## 📋 Usage

Tous les scripts prennent le `meeting_id` en argument :

```bash
# Depuis la racine du projet
python scripts/meeting-transcription/prepare_segments.py "2025-01-27-test-transcription"
```

### Ordre d'exécution

1. **Transcription** : `aai_transcribe.py`
2. **Préparation segments** : `prepare_segments.py`
3. **Résumé segments** : `summarize_segments.py`
4. **Construction threads** : `build_threads.py`
5. **Validation inverse** : `inverse_validation.py`
6. **Génération compte-rendu** : `generate_meeting_report.py`
7. **Vérification finale** : `verify_and_close.py`

## ✅ Validations

- **Meeting ID requis** : Tous les scripts valident que le meeting_id est fourni
- **Fichiers requis** : Vérification de l'existence des fichiers nécessaires
- **Config.json** : Chargement avec valeurs par défaut si absent

## 🐛 Corrections apportées

### Bugs corrigés
- ✅ Bug f-string dans `inverse_validation.py` (lignes 78, 81, 84)
- ✅ Dates hardcodées remplacées par extraction depuis config.json
- ✅ Mapping speakers hardcodé remplacé par lecture depuis config.json
- ✅ Participants hardcodés remplacés par lecture depuis config.json
- ✅ Ordre du jour hardcodé remplacé par lecture depuis config.json
- ✅ Meeting-id par défaut supprimé (validation obligatoire)

### Améliorations
- ✅ Module `config_loader.py` pour centraliser la gestion de config.json
- ✅ Extraction automatique de la date depuis le meeting_id
- ✅ Gestion d'erreurs améliorée (vérification fichiers existants)
- ✅ Messages d'erreur clairs avec instructions

## 📝 Notes

- Les scripts sont **100% réutilisables** pour toutes les réunions
- Le fichier `config.json` est créé automatiquement lors de la génération des stories
- Les scripts fonctionnent même si `config.json` n'existe pas (valeurs par défaut)

## 🔗 Références

- Workflow BMAD : `.bmad-core/workflows/meeting-transcription.yaml`
- Tasks BMAD : `.bmad-core/tasks/`
- Prompts standards : `docs/prompts/`

