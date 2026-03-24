#!/usr/bin/env python3
"""Test de détection des fichiers audio."""

import sys
from pathlib import Path

# Ajouter le répertoire parent au path pour importer le script
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.aai_transcribe import is_audio_file, validate_audio_file, slugify_filename

meeting_id = "2025-01-27-test-transcription"
audio_dir = Path("meetings") / meeting_id / "audio"

print(f"Vérification du dossier: {audio_dir}")
print(f"Existe: {audio_dir.exists()}")

if audio_dir.exists():
    print(f"\nTous les fichiers dans le dossier:")
    for item in audio_dir.iterdir():
        print(f"  - {item.name} (is_file: {item.is_file()}, suffix: {item.suffix})")
    
    print(f"\nFichiers audio détectés:")
    audio_files = [f for f in audio_dir.iterdir() if f.is_file() and is_audio_file(f)]
    print(f"Nombre: {len(audio_files)}")
    
    for f in audio_files:
        is_valid, error = validate_audio_file(f)
        normalized = slugify_filename(f.name)
        print(f"  - {f.name}")
        print(f"    Normalisé: {normalized}")
        print(f"    Valide: {is_valid}")
        if not is_valid:
            print(f"    Erreur: {error}")
        print(f"    Taille: {f.stat().st_size / 1024 / 1024:.2f} MB")
else:
    print(f"❌ Le dossier n'existe pas!")



