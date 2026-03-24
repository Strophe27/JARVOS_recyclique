#!/bin/bash
# Script pour exécuter la transcription via WSL

# Aller à la racine du projet
cd "/mnt/d/Users/Strophe/Documents/1-IA/La Clique Qui Recycle/Recyclic"

echo "=== Démarrage de la transcription dans WSL ===" > transcription_debug.log
date >> transcription_debug.log

# Vérifier python
echo "Python version:" >> transcription_debug.log
python3 --version >> transcription_debug.log 2>&1

# Installer les dépendances
echo "Installation des dépendances..." >> transcription_debug.log
pip3 install requests python-dotenv unidecode >> transcription_debug.log 2>&1

# Vérifier le fichier audio
AUDIO_FILE="meetings/2025-01-27-test-transcription/audio/Reu recyclique 3.m4a"
if [ -f "$AUDIO_FILE" ]; then
    echo "Fichier audio trouvé: $AUDIO_FILE" >> transcription_debug.log
else
    echo "Fichier audio NON trouvé: $AUDIO_FILE" >> transcription_debug.log
    ls -la "meetings/2025-01-27-test-transcription/audio/" >> transcription_debug.log 2>&1
fi

# Lancer la transcription
echo "Lancement du script de transcription..." >> transcription_debug.log
python3 scripts/aai_transcribe.py --meeting-id "2025-01-27-test-transcription" --verbose --concurrency 1 >> transcription_debug.log 2>&1

echo "=== Fin de l'exécution ===" >> transcription_debug.log
date >> transcription_debug.log


