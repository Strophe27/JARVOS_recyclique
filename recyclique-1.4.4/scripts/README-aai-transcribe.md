# Script de Transcription AssemblyAI

## Description

Script Python pour transcrire des fichiers audio via l'API AssemblyAI dans le cadre du workflow de transcription de réunions BMAD.

## Installation

### Dépendances

Installer les dépendances Python nécessaires :

```bash
pip install -r scripts/requirements.txt
```

Ou manuellement :

```bash
pip install requests python-dotenv unidecode
```

### Configuration

Ajouter votre clé API AssemblyAI dans le fichier `.env` à la racine du projet :

```bash
ASSEMBLYAI_API_KEY=your_api_key_here
```

Vous pouvez obtenir votre clé API sur le [dashboard AssemblyAI](https://www.assemblyai.com/app/api-keys).

## Utilisation

### Commande de base

```bash
python scripts/aai_transcribe.py --meeting-id "2025-01-27-reunion-x"
```

### Options disponibles

| Option | Description | Défaut |
|--------|-------------|--------|
| `--meeting-id` | ID de la réunion (obligatoire) | - |
| `--concurrency` | Nombre de fichiers traités en parallèle | 2 |
| `--language` | Code langue (`fr` ou `auto`) | `fr` |
| `--diarization` | Activer identification speakers | `true` |
| `--iab` | Activer topics IAB | `true` |
| `--timeout-seconds` | Timeout par fichier (secondes) | 7200 (2h) |
| `--consolidate` | Générer `full-transcript.json` | `true` |
| `--force` | Forcer ré-exécution même si déjà transcrit | `false` |
| `--verbose` | Logs détaillés | `false` |
| `--eu` | Utiliser serveurs EU | `false` |

### Exemple complet

```bash
python scripts/aai_transcribe.py \
  --meeting-id "2025-01-27-reunion-x" \
  --concurrency 2 \
  --language fr \
  --diarization true \
  --iab true \
  --timeout-seconds 7200 \
  --consolidate true \
  --force \
  --verbose
```

## Structure des dossiers

Le script attend la structure suivante :

```
meetings/
└── <meeting-id>/
    ├── audio/                    # Fichiers audio à transcrire
    │   ├── speaker1.mp3
    │   └── speaker2.mp3
    ├── transcriptions/            # Transcripts générés
    │   ├── speaker1.json
    │   ├── speaker2.json
    │   └── full-transcript.json   # Transcription consolidée
    ├── logs/                      # Logs d'exécution
    │   ├── run-YYYYMMDD.log
    │   └── summary.json
    └── state.json                 # État des transcriptions (idempotence)
```

## Formats audio supportés

- `.mp3`
- `.wav`
- `.m4a`
- `.flac`
- `.ogg`

Les fichiers non audio sont automatiquement ignorés avec un avertissement dans les logs.

## Fonctionnalités

### Idempotence

Le script est idempotent : si un fichier est déjà transcrit, il est ignoré (sauf avec `--force`).

### Reprise après interruption

Le script peut reprendre après une interruption grâce au fichier `state.json` :
- Si un `job_id` existe sans résultat, le script reprend au polling
- Les fichiers déjà complétés sont ignorés

### Consolidation

Si `--consolidate true` (défaut), le script génère `full-transcript.json` qui :
- Fusionne toutes les utterances de tous les fichiers
- Trie strictement par timestamp (`start` en millisecondes)
- Ajoute `source_file` et `file_index` à chaque utterance

### Gestion d'erreurs

- **Retries réseau** : 5 tentatives avec backoff exponentiel (1s, 2s, 4s, 8s, 16s)
- **Erreurs définitives** (400, 401, 404) : Arrêt immédiat avec message clair
- **Erreurs transitoires** (429, 5xx) : Retries automatiques
- **Timeout** : Respecte `--timeout-seconds` (défaut: 2h)

### Logging

- Logs vers fichier : `meetings/<meeting-id>/logs/run-YYYYMMDD.log`
- Logs console : Affichage en temps réel de la progression
- Résumé JSON : Dernière ligne du log + fichier `summary.json`

## Résumé JSON

Le script génère un résumé JSON avec les métriques suivantes :

```json
{
  "meeting_id": "2025-01-27-reunion-x",
  "files_total": 4,
  "completed": 3,
  "failed": 1,
  "skipped": 0,
  "duration_seconds": 1250,
  "timestamp": "2025-01-27T10:30:00Z"
}
```

Ce résumé est :
- Imprimé en dernière ligne du log (format JSON compact pour parsing automatique)
- Sauvegardé dans `meetings/<meeting-id>/logs/summary.json`

## Codes de sortie

- `0` : Succès (tous les fichiers traités)
- `1` : Erreur (au moins un fichier a échoué)

## Dépannage

### Erreur : "ASSEMBLYAI_API_KEY non trouvée"

Vérifier que la clé API est bien dans le fichier `.env` à la racine du projet.

### Erreur : "Dossier audio introuvable"

Vérifier que le dossier `meetings/<meeting-id>/audio/` existe et contient des fichiers audio.

### Timeout

Si un fichier dépasse le timeout, augmenter `--timeout-seconds` ou vérifier la taille du fichier audio.

### Fichiers ignorés

Les fichiers non audio sont automatiquement ignorés. Vérifier les logs pour voir quels fichiers ont été ignorés et pourquoi.

## Références

- [Documentation API AssemblyAI](https://www.assemblyai.com/docs)
- [Story S2-DEV](../docs/stories/meeting-transcription/S2-DEV-script-assemblyai.md)





