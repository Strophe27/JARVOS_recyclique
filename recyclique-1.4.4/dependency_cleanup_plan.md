# Plan de Nettoyage des Dépendances

Ce document suit l'avancement du nettoyage des fichiers `requirements.txt`.

## Service API (`api/requirements.txt`)

### Bibliothèques à Supprimer

- **python-dotenv**: Redondant. `pydantic-settings` gère déjà les fichiers `.env`.
- **typer**: Inutilisé. L'interface CLI (`cli.py`) utilise `argparse`.
- **python-multipart**: Utilisation non détectée pour les formulaires/téléversements.
- **jsonschema**, **referencing**: Dépendances transitives, pas des dépendances directes du projet.

### Bibliothèques à Déplacer (vers `api/requirements-dev.txt`)

- **pytest**: Outil de test.
- **pytest-asyncio**: Outil de test.

## ~~Service Bot~~ (retiré, 2026-03-26)

Le dossier `bot/` et le service Docker associé ont été supprimés (paquet assainissement 1.4.5). Cette section historique n'est plus applicable.

## Investigation en cours (demandé par l'utilisateur) - TERMINÉE

- **langchain-google-genai**: **À CONSERVER**. Essentiel pour la classification des objets via l'IA Gemini, comme défini dans le PRD.
- **google-cloud-speech**: **À SUPPRIMER**. Le PRD spécifie l'utilisation directe des capacités multimodales de Gemini (audio-en-entrée), rendant un service de transcription séparé obsolète.

**NOTE DE DETTE TECHNIQUE :** Le service `api/src/recyclic_api/services/classification_service.py` doit être refactorisé pour s'aligner sur le PRD. L'implémentation actuelle ne correspond pas à l'architecture cible (multimodal Gemini + fallback OpenRouter/Whisper).
